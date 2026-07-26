/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Routes SDK messages to VS Code Chat stream actions.
 *
 * Maps the five SDK message types (stream_event, assistant, result, user, system)
 * to `vscode.ChatResponseStream` API calls — thinking progress, text markdown,
 * tool call lifecycle, token usage, and error display.
 *
 * The key enabler is `includePartialMessages: true` in Options, which makes the
 * SDK yield `stream_event` messages with raw Anthropic SSE content blocks
 * (thinking, tool_use, text_delta, input_json_delta, etc.).
 */

import * as vscode from 'vscode';
import { emitCodeblockUri } from '../common/streamAdditions';
import { ThinkingPanelHelper } from '../common/thinkingPanelHelper';
import { isClaudeEditTool, extractEditToolPath } from './claudeEditTools';
import {
	type SDKMessage,
	type SDKAssistantMessage,
	type SDKPartialAssistantMessage,
	type SDKResultMessage,
	type SDKResultSuccess,
	type SDKResultError,
} from '@anthropic-ai/claude-agent-sdk';
import type { BetaRawMessageStreamEvent } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs';
import type { NonNullableUsage } from '@anthropic-ai/claude-agent-sdk';
import { ILogService } from '../../platform/log/common/logService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RouterState {
	/** Manages the native thinking panel lifecycle. */
	thinking: ThinkingPanelHelper;
	/** Map of active tool call id → tool name */
	activeToolCalls: Map<string, string>;
	/**
	 * In-progress tool_use blocks, keyed by content-block index. Anthropic
	 * streams a tool call's `input` as a JSON string split across
	 * `input_json_delta` events — the `content_block_start` event always
	 * carries an empty `input`. We buffer the partial JSON here and only
	 * decode it once the block closes (`content_block_stop`), which is the
	 * first point the real arguments (e.g. a file path) actually exist.
	 */
	pendingToolInputs: Map<number, { toolId: string; toolName: string; json: string }>;
	/** Set of file paths already reported via codeblockUri (dedup) */
	reportedFilePaths: Set<string>;
	/** Ordered list of file changes made this turn */
	fileChanges: FileChangeEntry[];
	/** Cumulative usage accumulated across stream events */
	usage: Partial<NonNullableUsage> | null;
	/** The final session ID captured from any message */
	sessionId: string | null;
	/** Whether the turn completed with a terminal result */
	completed: boolean;
	/** Error message if the turn failed */
	error: string | null;
}

export interface FileChangeEntry {
	path: string;
	operation: 'edit' | 'create' | 'rename' | 'delete';
	description: string;
}

export function createInitialState(stream: vscode.ChatResponseStream): RouterState {
	return {
		thinking: new ThinkingPanelHelper(stream, 'claude-reasoning'),
		reportedFilePaths: new Set(),
		activeToolCalls: new Map(),
		pendingToolInputs: new Map(),
		fileChanges: [],
		usage: null,
		sessionId: null,
		completed: false,
		error: null,
	};
}

// ─── Main Router ──────────────────────────────────────────────────────────────

/**
 * Route a single SDK message to the VS Code chat stream.
 * Returns the updated router state.
 */
export function routeSDKMessage(
	msg: SDKMessage,
	stream: vscode.ChatResponseStream,
	log: ILogService,
	state: RouterState = createInitialState(stream),
): RouterState {
	switch (msg.type) {
		case 'stream_event':
			return handleStreamEvent(msg, stream, state, log);
		case 'assistant':
			return handleAssistantMessage(msg, stream, state);
		case 'result':
			return handleResultMessage(msg, stream, state, log);
		case 'user':
			return handleUserMessage(msg, stream, state);
		case 'system':
			return handleSystemMessage(msg, stream, state, log);
		default:
			// Unknown message types are silently ignored
			return state;
	}
}

// ─── Stream Event Handler (Priority 1: thinking, tool_use, etc.) ─────────────

function handleStreamEvent(
	msg: SDKPartialAssistantMessage,
	stream: vscode.ChatResponseStream,
	state: RouterState,
	log: ILogService,
): RouterState {
	const event = msg.event;

	switch (event.type) {
		case 'content_block_start':
			return handleContentBlockStart(event, stream, state, log);
		case 'content_block_delta':
			return handleContentBlockDelta(event, stream, state, log);
		case 'content_block_stop':
			return handleContentBlockStop(event, stream, state);
		case 'message_delta':
			return handleMessageDelta(event, stream, state);
		case 'message_start':
		case 'message_stop':
			// message_start / message_stop are lifecycle markers we track silently
			if (msg.session_id) {
				state.sessionId = msg.session_id;
			}
			return state;
		default:
			return state;
	}
}

// ── Content Block Start ──────────────────────────────────────────────────────

function handleContentBlockStart(
	event: BetaRawMessageStreamEvent & { type: 'content_block_start' },
	stream: vscode.ChatResponseStream,
	state: RouterState,
	_log: ILogService,
): RouterState {
	const block = event.content_block;

	switch (block.type) {
		case 'thinking': {
			state.thinking.open();
			break;
		}

		case 'tool_use': {
			// Tool call started → close thinking panel and show progress.
			// NOTE: `block.input` is always empty here — Anthropic streams the
			// real arguments incrementally via `input_json_delta` on
			// content_block_delta, only fully known once the block closes. Buffer
			// it (see pendingToolInputs) and defer the descriptive label / file-
			// change tracking to handleContentBlockStop.
			state.thinking.closeForAction();
			const toolName = block.name;
			const toolId = block.id;
			state.activeToolCalls.set(toolId, toolName);
			state.pendingToolInputs.set(event.index, { toolId, toolName, json: '' });

			stream.progress(`Calling ${toolName}…`);
			break;
		}

		case 'text': {
			// Text block start — no action needed, will get deltas
			break;
		}
	}

	if (event.index !== undefined) {
		// Track session ID from the enclosing partial message
	}

	return state;
}

// ── Content Block Delta ──────────────────────────────────────────────────────

function handleContentBlockDelta(
	event: BetaRawMessageStreamEvent & { type: 'content_block_delta' },
	stream: vscode.ChatResponseStream,
	state: RouterState,
	_log: ILogService,
): RouterState {
	const delta = event.delta;

	switch (delta.type) {
		case 'text_delta': {
			// Text content delta → close thinking panel and stream as markdown
			state.thinking.closeForText();
			if (delta.text) {
				stream.markdown(delta.text);
			}
			break;
		}

		case 'thinking_delta': {
			// Thinking delta → send to the native thinking panel.
			if (delta.thinking) {
				state.thinking.pushDelta(delta.thinking);
			}
			break;
		}

		case 'input_json_delta': {
			// Buffer the tool's input JSON; don't stream raw partial JSON to the
			// user. Decoded and acted on once the block closes (content_block_stop).
			const pending = state.pendingToolInputs.get(event.index);
			if (pending && delta.partial_json) {
				pending.json += delta.partial_json;
			}
			break;
		}
	}

	return state;
}

// ── Content Block Stop ───────────────────────────────────────────────────────

function handleContentBlockStop(
	event: BetaRawMessageStreamEvent & { type: 'content_block_stop' },
	stream: vscode.ChatResponseStream,
	state: RouterState,
): RouterState {
	const pending = state.pendingToolInputs.get(event.index);
	if (pending) {
		state.pendingToolInputs.delete(event.index);

		let input: Record<string, unknown> = {};
		try {
			input = pending.json ? (JSON.parse(pending.json) as Record<string, unknown>) : {};
		} catch {
			// Malformed/incomplete JSON — proceed with an empty input rather than
			// losing the whole tool-call notification.
		}

		// Now that the real arguments are known, show the descriptive label and
		// track file changes for VS Code's "N files changed" summary. The actual
		// diffable/Working-Set-tracked edit is handled separately via the SDK's
		// PreToolUse/PostToolUse hooks (see claudeOptionsBuilder.ts) — those fire
		// right before/after the CLI executes the tool, which this stream event
		// can't guarantee (it only marks when the *model's message* finished
		// transmitting, which can race the CLI's own tool execution).
		stream.progress(describeToolCall(pending.toolName, input));
		if (isClaudeEditTool(pending.toolName)) {
			const filePath = extractEditToolPath(pending.toolName, input);
			state.fileChanges.push({
				path: filePath,
				operation: pending.toolName === 'Write' ? 'create' : 'edit',
				description: `Editing via ${pending.toolName}`,
			});
			_markFileEdited(stream, state, filePath);
		}
		return state;
	}

	// Non-tool_use block finished (text/thinking) — reset progress to
	// "Continuing…" while a tool call is still active (Codex pattern).
	if (state.activeToolCalls.size > 0) {
		stream.progress('Continuing…');
	}
	return state;
}

// ── Message Delta ────────────────────────────────────────────────────────────

function handleMessageDelta(
	event: BetaRawMessageStreamEvent & { type: 'message_delta' },
	stream: vscode.ChatResponseStream,
	state: RouterState,
): RouterState {
	// Track token usage from message_delta usage
	if (event.usage) {
		state.usage = {
			...(state.usage ?? {}),
			input_tokens: (state.usage?.input_tokens ?? 0) + (event.usage.input_tokens ?? 0),
			output_tokens: (state.usage?.output_tokens ?? 0) + (event.usage.output_tokens ?? 0),
		};
	}

	return state;
}

// ── Assistant Message Handler ────────────────────────────────────────────────

function handleAssistantMessage(
	msg: SDKAssistantMessage,
	_stream: vscode.ChatResponseStream,
	state: RouterState,
): RouterState {
	// Capture session ID — text already streamed via stream_event{text_delta}.
	// The canonical assistant message duplicates text from streaming deltas
	// and contains tool_use blocks we don't want to serialize as raw text.
	if (msg.session_id) {
		state.sessionId = msg.session_id;
	}
	return state;
}

// ── Result Message Handler ───────────────────────────────────────────────────

function handleResultMessage(
	msg: SDKResultMessage,
	stream: vscode.ChatResponseStream,
	state: RouterState,
	log: ILogService,
): RouterState {
	state.completed = true;

	// Capture session ID
	if (msg.session_id) {
		state.sessionId = msg.session_id;
	}

	if (msg.subtype === 'success') {
		const success = msg as SDKResultSuccess;
		state.usage = success.usage ?? state.usage;
		log.debug('turn completed successfully: ' + JSON.stringify({
			sessionId: state.sessionId,
			usage: state.usage,
			durationMs: success.duration_ms,
			numTurns: success.num_turns,
		}));
	} else {
		// Error result
		const err = msg as SDKResultError;
		state.error = err.errors?.join('; ') ?? 'Unknown error';
		state.usage = err.usage ?? state.usage;
		log.debug('turn completed with error: ' + JSON.stringify({
			subtype: err.subtype,
			errors: err.errors,
			usage: state.usage,
		}));
		stream.markdown(`\n\n> ⚠️ Claude error: ${state.error}\n`);
	}

	return state;
}

// ── User Message Handler ─────────────────────────────────────────────────────

function handleUserMessage(
	msg: SDKMessage & { type: 'user' },
	_stream: vscode.ChatResponseStream,
	state: RouterState,
): RouterState {
	// User messages carry tool results from the SDK — close thinking if still open.
	state.thinking.closeForAction();

	if (msg.session_id) {
		state.sessionId = msg.session_id;
	}

	// Clear active tool calls — they've been resolved
	state.activeToolCalls.clear();

	return state;
}

// ── System Message Handler ───────────────────────────────────────────────────

function handleSystemMessage(
	msg: SDKMessage & { type: 'system' },
	stream: vscode.ChatResponseStream,
	state: RouterState,
	log: ILogService,
): RouterState {
	// Capture session ID from system init messages
	if (msg.session_id) {
		state.sessionId = msg.session_id;
	}

	const sys = msg as SDKMessage & { type: 'system'; subtype?: string };
	if (sys.subtype === 'init') {
		log.debug('session initialized: ' + JSON.stringify({ sessionId: state.sessionId }));
	}

	return state;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract plain text from an SDKAssistantMessage content array. */
function _extractText(msg: SDKAssistantMessage): string {
	const content = msg.message?.content;
	if (!content) { return ''; }
	if (typeof content === 'string') { return content; }
	if (Array.isArray(content)) {
		return content
			.filter(c => typeof c === 'object' && c !== null && (c as { type?: string }).type === 'text')
			.map(c => (c as { type: string; text: string }).text)
			.join('');
	}
	return '';
}

/**
 * Build a descriptive progress label from a tool call (Codex pattern).
 * Shows the tool name plus a key detail (file path, command, query) so the
 * user knows exactly what the agent is doing.
 */
function describeToolCall(toolName: string, input: Record<string, unknown>): string {
	const short = (s: string, max = 60) => (s.length > max ? s.slice(0, max) + '…' : s);
	// File operations — show the path
	const filePath = extractEditToolPath(toolName, input);
	if (filePath !== 'unknown') {
		const verb = isClaudeEditTool(toolName) ? 'Editing' : 'Reading';
		return `${verb} \`${short(filePath)}\``;
	}
	// Shell / command execution — show the command
	if (typeof input.command === 'string') {
		return `Running \`${short(input.command, 80)}\``;
	}
	// Search — show the query
	if (typeof input.query === 'string') {
		return `Searching "${short(input.query)}"`;
	}
	if (typeof input.pattern === 'string') {
		return `Searching "${short(input.pattern)}"`;
	}
	// Fallback — just the tool name
	return `Calling ${toolName}…`;
}

/**
 * Report a file path as edited to the VS Code chat stream.
 * Uses the `codeblockUri` method from the `chatParticipantAdditions` proposal
 * to trigger the "N files changed" summary panel in the chat UI.
 */
function _markFileEdited(
	stream: vscode.ChatResponseStream,
	state: RouterState,
	filePath: string,
): void {
	if (!filePath || filePath === 'unknown') { return; }
	if (state.reportedFilePaths.has(filePath)) { return; }
	state.reportedFilePaths.add(filePath);
	emitCodeblockUri(stream, vscode.Uri.file(filePath), true);
}
