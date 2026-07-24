/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Safe wrappers around the `chatParticipantAdditions` proposed API
 * (`thinkingProgress`, `codeblockUri`). These methods only exist when VS Code
 * runs the extension with the proposal enabled (extension development mode or
 * `--enable-proposed-api`). In a normal packaged install they are `undefined`,
 * so calling them directly throws `TypeError`.
 *
 * These helpers detect availability once and fall back to standard stream APIs
 * (`stream.progress` for thinking, no-op for codeblockUri) so participants work
 * in both dev and production.
 */

/** A ChatResponseStream that may carry the proposed additions. */
type AdditionsStream = vscode.ChatResponseStream & {
	thinkingProgress?: (delta: { id: string; text: string | string[] }) => void;
	codeblockUri?: (uri: vscode.Uri, isEdit?: boolean) => void;
};

/** Cached availability of the proposed `thinkingProgress` method. */
let _thinkingAvailable: boolean | null = null;

/**
 * Thinking block ids for which we've already shown a fallback progress
 * indicator. Used to emit a single "Thinking…" line per block instead of one
 * progress line per streamed delta (the router re-emits the full accumulated
 * thinking text on every delta, which would otherwise flood the chat).
 */
const _thinkingShown = new Set<string>();

/**
 * Emit a thinking/reasoning progress update. Falls back to `stream.progress`
 * when the proposed API is unavailable (packaged extension).
 */
export function emitThinkingProgress(
	stream: vscode.ChatResponseStream,
	id: string,
	text: string,
): void {
	const s = stream as AdditionsStream;
	if (_thinkingAvailable === null) {
		_thinkingAvailable = typeof s.thinkingProgress === 'function';
	}
	if (_thinkingAvailable) {
		try {
			s.thinkingProgress!({ id, text });
			return;
		} catch {
			// Method present but threw (e.g. proposal revoked) — disable and fall back.
			_thinkingAvailable = false;
		}
	}
	// Fallback: the proposed API is unavailable (packaged build). Show a single
	// "Thinking…" progress indicator per thinking block. Streaming the full
	// accumulated text on every delta would flood the chat with one line per
	// SSE event, so we only emit once per block id.
	if (_thinkingShown.has(id)) {
		return;
	}
	_thinkingShown.add(id);
	stream.progress('Thinking…');
}

/**
 * Report a file as edited in the chat UI ("N files changed" summary).
 * No-op when the proposed `codeblockUri` API is unavailable.
 */
export function emitCodeblockUri(
	stream: vscode.ChatResponseStream,
	uri: vscode.Uri,
	isEdit = true,
): void {
	const s = stream as AdditionsStream;
	if (typeof s.codeblockUri === 'function') {
		try {
			s.codeblockUri(uri, isEdit);
		} catch {
			// Silently ignore — this is a cosmetic enhancement only.
		}
	}
}
