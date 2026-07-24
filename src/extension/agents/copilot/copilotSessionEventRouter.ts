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

/** Duck-typed stream with the proposed thinkingProgress method. */
type ThinkingStream = {
	thinkingProgress: (d: { text?: string | string[]; id?: string; metadata?: Record<string, unknown> }) => void;
};

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
	/** Whether a thinking panel is currently active (needs closing). */
	thinkingActive: boolean;
	/** Active tool calls: toolCallId → toolName. */
	activeToolCalls: Map<string, string>;
	/** Number of tool executions this turn. */
	toolCallCount: number;
	/** Files changed this turn: path → operation (create/update). */
	fileChanges: Map<string, string>;
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
		thinkingActive: false,
		activeToolCalls: new Map(),
		toolCallCount: 0,
		fileChanges: new Map(),
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
	// Log every event so we can see exactly what the Copilot runtime emits.
	// For events that might carry reasoning or tool data, log their data shape.
	const ephemeral = (event as { ephemeral?: boolean }).ephemeral;
	const ed = event.data as Record<string, unknown> | undefined;
	log.debug(`event: ${event.type}${ephemeral ? ' (ephemeral)' : ''} keys=${ed ? Object.keys(ed).join(',') : 'none'}`);
	// Duck-type the proposed thinkingProgress API (available with chatParticipantAdditions)
	const thinkingStream = typeof (stream as unknown as ThinkingStream).thinkingProgress === 'function'
		? (stream as unknown as ThinkingStream)
		: undefined;

	switch (event.type) {
		case 'assistant.reasoning': {
			state.currentReasoningId = event.data.reasoningId;
			state.thinkingActive = true;
			if (thinkingStream) {
				thinkingStream.thinkingProgress({ text: 'Thinking…', id: event.data.reasoningId });
			} else {
				stream.progress('Thinking…');
			}
			return state;
		}
		case 'assistant.reasoning_delta': {
			const id = event.data.reasoningId;
			state.currentReasoningId = id;
			const delta = event.data.deltaContent ?? '';
			if (thinkingStream) {
				thinkingStream.thinkingProgress({ text: delta, id });
			}
			// No fallback for individual deltas — the native panel appends
			// internally; the fallback path only shows the initial "Thinking…".
			return state;
		}
		case 'assistant.streaming_delta':
		case 'assistant.turn_end':
		case 'assistant.turn_start':
		case 'permission.requested':
		case 'permission.completed':
		case 'hook.start':
		case 'hook.end':
		case 'tool.execution_partial_result':
		case 'tool.execution_progress':
		case 'session.background_tasks_changed':
		case 'session.compaction_start':
		case 'session.compaction_complete':
		case 'assistant.server_tool_progress':
		case 'assistant.intent':
		case 'auto_mode_switch.requested':
		case 'auto_mode_switch.completed':
		case 'commands.changed':
		case 'model.call_failure':
		case 'assistant.message_start': {
			return state;
		}
		// ── Assistant message ──
		case 'assistant.message_delta': {
			// Close thinking panel when text content starts arriving.
			if (state.thinkingActive && thinkingStream) {
				thinkingStream.thinkingProgress({ id: '', text: '', metadata: { vscodeReasoningDone: true, stopReason: 'text' } });
				state.thinkingActive = false;
			}
			const text = event.data.deltaContent;
			if (text) {
				stream.markdown(text);
			}
			return state;
		}
		case 'assistant.message': {
			if (event.data.model) {
				state.modelId = event.data.model;
			}
			if (typeof event.data.outputTokens === 'number') {
				state.usage.outputTokens = event.data.outputTokens;
			}
			return state;
		}
		case 'tool.execution_start': {
			// Close thinking panel when tool calls start (model switched to action).
			if (state.thinkingActive && thinkingStream) {
				thinkingStream.thinkingProgress({ id: '', text: '', metadata: { vscodeReasoningDone: true, stopReason: 'other' } });
				state.thinkingActive = false;
			}
			state.activeToolCalls.set(event.data.toolCallId, event.data.toolName);
			state.toolCallCount++;
			const label = describeCopilotToolCall(event.data.toolName, event.data.arguments);
			stream.progress(label);
			return state;
		}
		case 'tool.execution_complete': {
			state.activeToolCalls.delete(event.data.toolCallId);
			if (event.data.success === false && event.data.error) {
				const message = typeof event.data.error === 'string'
					? event.data.error
					: (event.data.error as { message?: string }).message ?? 'tool error';
				stream.markdown(`\n\n> ⚠️ ${vscode.l10n.t('Tool failed')}: ${message}\n`);
			} else {
				stream.progress('Continuing…');
			}
			return state;
		}
		case 'session.workspace_file_changed': {
			const op = event.data.operation === 'create' ? 'create' : 'update';
			state.fileChanges.set(event.data.path, op);
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
		case 'session.error': {
			const errData = event.data as { message?: string; error?: string };
			const message = errData.message ?? errData.error ?? 'Unknown Copilot CLI error';
			log.error(`session.error ${JSON.stringify({ message })}`);
			stream.markdown(`\n\n> ⚠️ Copilot error: ${message}\n`);
			return state;
		}
		case 'session.idle': {
			state.completed = true;
			// Emit a summary of the work done this turn (tool calls + files changed).
			const summaryParts: string[] = [];
			if (state.toolCallCount > 0) {
				summaryParts.push(vscode.l10n.t('{0} tool call(s)', state.toolCallCount));
			}
			if (state.fileChanges.size > 0) {
				summaryParts.push(vscode.l10n.t('{0} file(s) changed', state.fileChanges.size));
			}
			if (summaryParts.length > 0) {
				stream.markdown(`\n\n_📊 ${summaryParts.join(' · ')}_\n`);
			}
			log.debug(`session.idle ${JSON.stringify({ inputTokens: state.usage.inputTokens, outputTokens: state.usage.outputTokens, modelId: state.modelId, toolCalls: state.toolCallCount, filesChanged: state.fileChanges.size })}`);
			onIdle();
			return state;
		}
		default:
			// Log unhandled events at info level so they're visible without
			// needing debug level — helps diagnose missing UI features.
			log.info(`unhandled event: ${event.type}`);
			return state;
	}
}

/**
 * Build a descriptive progress label from a Copilot tool call (Codex pattern).
 * Shows the tool name plus a key detail (file path, command, query) so the
 * user knows exactly what the agent is doing.
 */
function describeCopilotToolCall(toolName: string, args?: Record<string, unknown>): string {
	const short = (s: string, max = 60) => (s.length > max ? s.slice(0, max) + '…' : s);
	const a = args ?? {};

	// File operations — show the path
	const filePath = (a.file_path ?? a.path ?? a.filePath ?? a.uri) as string | undefined;
	if (typeof filePath === 'string' && filePath) {
		const isEdit = /edit|write|create|patch|replace/i.test(toolName);
		return `${isEdit ? 'Editing' : 'Reading'} \`${short(filePath)}\``;
	}
	// Shell / command execution — show the command
	if (typeof a.command === 'string') {
		return `Running \`${short(a.command, 80)}\``;
	}
	// Search — show the query
	if (typeof a.query === 'string') {
		return `Searching "${short(a.query)}"`;
	}
	if (typeof a.pattern === 'string') {
		return `Searching "${short(a.pattern)}"`;
	}
	// Fallback — just the tool name
	return `Calling ${toolName}…`;
}
