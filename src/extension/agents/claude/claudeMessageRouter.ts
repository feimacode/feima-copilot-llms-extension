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
import * as crypto from 'crypto';
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
	/** Current thinking block being streamed (id → text), null if none active */
	currentThinkingId: string | null;
	/** Accumulated thinking text for the current thinking block */
	thinkingText: string;
	/** Current tool display thinking block id, null if none active */
	currentToolThinkingId: string | null;
	/** Map of active tool call id → tool name */
	activeToolCalls: Map<string, string>;
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

export function createInitialState(): RouterState {
	return {
		currentThinkingId: null,
		thinkingText: '',
		currentToolThinkingId: null,
		reportedFilePaths: new Set(),
		activeToolCalls: new Map(),
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
	state: RouterState = createInitialState(),
): RouterState {
	switch (msg.type) {
		case 'stream_event':
			return handleStreamEvent(msg, stream, state);
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
): RouterState {
	const event = msg.event;

	switch (event.type) {
		case 'content_block_start':
			return handleContentBlockStart(event, stream, state);
		case 'content_block_delta':
			return handleContentBlockDelta(event, stream, state);
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
): RouterState {
	const block = event.content_block;

	switch (block.type) {
		case 'thinking': {
			// Reuse the same thinking block ID across the entire turn to avoid
			// flickering — the model emits many tiny thinking blocks and each
			// new ID resets the display to "Thinking…" visually.
			if (!state.currentThinkingId) {
				state.currentThinkingId = crypto.randomUUID();
				stream.thinkingProgress!({ id: state.currentThinkingId!, text: 'Thinking…' });
			}
			// Reset accumulated text for this new thinking block
			state.thinkingText = '';
			break;
		}

		case 'tool_use': {
			// Tool call started → display as a thinking block in the chat.
			const toolName = block.name;
			const toolId = block.id;
			state.activeToolCalls.set(toolId, toolName);

			// Close any prior tool thinking block before opening a new one
			if (state.currentToolThinkingId) {
				state.currentToolThinkingId = null;
			}
			state.currentToolThinkingId = crypto.randomUUID();
			stream.thinkingProgress!({ id: state.currentToolThinkingId!, text: `🔧 ${toolName}` });

			// Track file changes for VS Code's "N files changed" summary.
			// codeblockUri (chatParticipantAdditions proposal) marks files as
			// edited and triggers the file-changes UI in the chat panel.
			if (isFileEditTool(toolName)) {
				const filePath = extractPathFromToolInput(block.input as Record<string, unknown>);
				state.fileChanges.push({
					path: filePath,
					operation: toolName === 'Edit' ? 'edit' : 'create',
					description: `Editing via ${toolName}`,
				});
				_markFileEdited(stream, state, filePath);
			}
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
	if (state.currentThinkingId === null || state.currentThinkingId !== state.currentThinkingId) {
		// noop
	}

	return state;
}

// ── Content Block Delta ──────────────────────────────────────────────────────

function handleContentBlockDelta(
	event: BetaRawMessageStreamEvent & { type: 'content_block_delta' },
	stream: vscode.ChatResponseStream,
	state: RouterState,
): RouterState {
	const delta = event.delta;

	switch (delta.type) {
		case 'text_delta': {
			// Text content delta → stream as markdown
			if (delta.text) {
				stream.markdown(delta.text);
			}
			break;
		}

		case 'thinking_delta': {
			// Thinking delta → accumulate and re-emit full text so far.
			// VS Code thinkingProgress replaces the displayed text (doesn't append),
			// so we must send the full accumulated string each time.
			if (delta.thinking && state.currentThinkingId) {
				state.thinkingText += delta.thinking;
				stream.thinkingProgress!({ id: state.currentThinkingId, text: state.thinkingText });
			}
			break;
		}

		case 'input_json_delta': {
			// Tool input JSON — silently track; don't stream raw JSON to the user.
			// The tool call progress notification (set on tool_use start) is sufficient.
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
	// Preserve the thinking block ID across blocks — clearing it causes
	// the chat UI to start a fresh "Thinking…" label on the next block,
	// which creates ugly flickering. Only clear on turn completion.
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
	stream: vscode.ChatResponseStream,
	state: RouterState,
): RouterState {
	// User messages carry tool results from the SDK.
	// Update the tool thinking block to show completion status.
	if (state.currentToolThinkingId) {
		const toolNames = Array.from(state.activeToolCalls.values());
		if (toolNames.length > 0) {
			stream.thinkingProgress!({
				id: state.currentToolThinkingId,
				text: `✅ ${toolNames.join(', ')}`,
			});
		}
		state.currentToolThinkingId = null;
	}

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

/** Check if a tool name is a file-editing tool. */
function isFileEditTool(toolName: string): boolean {
	return ['Edit', 'FileWrite', 'file_edit', 'FileEdit', 'Write'].includes(toolName);
}

/** Extract the file path from a tool input object, if present. */
function extractPathFromToolInput(input: Record<string, unknown>): string {
	if (typeof input.file_path === 'string') { return input.file_path; }
	if (typeof input.path === 'string') { return input.path; }
	if (typeof input.filePath === 'string') { return input.filePath; }
	return 'unknown';
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
	try {
		// ChatResponseStream.codeblockUri is from the chatParticipantAdditions proposal
		(stream as unknown as { codeblockUri(uri: vscode.Uri, isEdit?: boolean): void })
			.codeblockUri(vscode.Uri.file(filePath), true);
	} catch {
		// codeblockUri may not be available — silently fall back
	}
}
