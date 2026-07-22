/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Routes GitHub Copilot CLI SDK session events to VS Code Chat stream actions.
 *
 * The Copilot SDK emits ~80 structured `SessionEvent` types. This pure function
 * maps the ones we care about — assistant text, reasoning/thinking, tool
 * lifecycle, skills, subagents, and usage — onto `vscode.ChatResponseStream`
 * calls, and resolves the turn on `session.idle`. Unknown event types are
 * ignored so the router stays forward-compatible with the full event union.
 */

import * as vscode from 'vscode';
import type { SessionEvent } from '@github/copilot-sdk';
import { ILogService } from '../../platform/log/common/logService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenUsage {
	inputTokens: number;
	outputTokens: number;
	/** Current context-window token count (from session.usage_info). */
	contextTokens?: number;
	/** Context-window token limit (from session.usage_info). */
	contextLimit?: number;
}

export interface RouterState {
	/** Id of the reasoning block currently being streamed, or null. */
	currentReasoningId: string | null;
	/** Active tool calls: toolCallId → toolName. */
	activeToolCalls: Map<string, string>;
	/** Cumulative token usage for this turn. */
	usage: TokenUsage;
	/** Model id reported by the assistant, if any. */
	modelId: string | null;
	/** Whether the turn reached idle. */
	completed: boolean;
}

export function createInitialRouterState(): RouterState {
	return {
		currentReasoningId: null,
		activeToolCalls: new Map(),
		usage: { inputTokens: 0, outputTokens: 0 },
		modelId: null,
		completed: false,
	};
}

// ─── Router ───────────────────────────────────────────────────────────────────

/**
 * Route a single SDK session event to the chat stream, mutating and returning
 * the router state. `onIdle` is invoked once when the session becomes idle.
 */
export function routeSessionEvent(
	event: SessionEvent,
	stream: vscode.ChatResponseStream,
	state: RouterState,
	onIdle: () => void,
	log: ILogService,
): RouterState {
	switch (event.type) {
		case 'assistant.reasoning': {
			state.currentReasoningId = event.data.reasoningId;
			stream.thinkingProgress?.({ id: event.data.reasoningId, text: event.data.content ?? '' });
			return state;
		}
		case 'assistant.reasoning_delta': {
			state.currentReasoningId = event.data.reasoningId;
			stream.thinkingProgress?.({ id: event.data.reasoningId, text: event.data.deltaContent ?? '' });
			return state;
		}
		case 'assistant.message_delta': {
			const text = event.data.deltaContent;
			if (text) {
				stream.markdown(text);
			}
			return state;
		}
		case 'assistant.message': {
			// The final combined message. When deltas streamed it, avoid double
			// output by only emitting when no deltas were seen for this turn.
			if (event.data.model) {
				state.modelId = event.data.model;
			}
			if (typeof event.data.outputTokens === 'number') {
				state.usage.outputTokens = event.data.outputTokens;
			}
			return state;
		}
		case 'tool.execution_start': {
			state.activeToolCalls.set(event.data.toolCallId, event.data.toolName);
			log.debug(`tool.execution_start ${JSON.stringify({ toolCallId: event.data.toolCallId.slice(0, 13), toolName: event.data.toolName })}`);
			stream.progress(`Running ${event.data.toolName}…`);
			return state;
		}
		case 'tool.execution_complete': {
			state.activeToolCalls.delete(event.data.toolCallId);
			log.debug(`tool.execution_complete ${JSON.stringify({ toolCallId: event.data.toolCallId.slice(0, 13), success: event.data.success })}`);
			if (event.data.success === false && event.data.error) {
				const message = typeof event.data.error === 'string'
					? event.data.error
					: (event.data.error as { message?: string }).message ?? 'tool error';
				stream.markdown(`\n\n> ⚠️ ${vscode.l10n.t('Tool failed')}: ${message}\n`);
			}
			return state;
		}
		case 'skill.invoked': {
			log.debug(`skill.invoked ${JSON.stringify({ name: event.data.name })}`);
			stream.markdown(`\n\n> 🧩 ${vscode.l10n.t('Skill')}: \`${event.data.name}\`\n`);
			return state;
		}
		case 'subagent.started': {
			log.debug(`subagent.started ${JSON.stringify({ agentName: event.data.agentName })}`);
			stream.progress(`Delegating to ${event.data.agentDisplayName}…`);
			return state;
		}
		case 'assistant.usage': {
			if (typeof event.data.inputTokens === 'number') {
				state.usage.inputTokens = event.data.inputTokens;
			}
			if (typeof event.data.outputTokens === 'number') {
				state.usage.outputTokens = event.data.outputTokens;
			}
			if (event.data.model) {
				state.modelId = event.data.model;
			}
			return state;
		}
		case 'session.usage_info': {
			state.usage.contextTokens = event.data.currentTokens;
			state.usage.contextLimit = event.data.tokenLimit;
			return state;
		}
		case 'session.idle': {
			state.completed = true;
			log.debug(`session.idle ${JSON.stringify({ inputTokens: state.usage.inputTokens, outputTokens: state.usage.outputTokens, modelId: state.modelId })}`);
			onIdle();
			return state;
		}
		default:
			// Unknown / unhandled event types are ignored.
			return state;
	}
}
