/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Duck-typed stream with the proposed `thinkingProgress` method from the
 * `chatParticipantAdditions` API. The method only exists when VS Code runs
 * with the proposal enabled.
 */
type ThinkingStream = {
	thinkingProgress: (d: {
		text?: string | string[];
		id?: string;
		metadata?: Record<string, unknown>;
	}) => void;
};

/**
 * Helper that manages the native thinking panel lifecycle across all three
 * agent participants (Codex, Copilot, Claude).
 *
 * Use this instead of calling `thinkingProgress` directly to ensure:
 * - Proper `vscodeReasoningDone` signaling when thinking ends
 * - Graceful fallback to `stream.progress()` when the proposed API is unavailable
 * - Consistent behavior across dev and packaged builds
 *
 * Matches the pattern used by FlowParticipant in the copilot-ai-flow extension.
 *
 * Usage:
 * ```typescript
 * const helper = new ThinkingPanelHelper(stream, 'my-agent');
 *
 * // On reasoning start
 * helper.open();
 *
 * // On each reasoning delta
 * helper.pushDelta(deltaText);
 *
 * // When text content or tool calls start (closes the panel)
 * helper.close('text');  // or 'other'
 *
 * // On turn completion (safety net)
 * helper.close('other');
 * ```
 */
export class ThinkingPanelHelper {
	private readonly _stream: vscode.ChatResponseStream;
	private readonly _thinkingStream: ThinkingStream | undefined;
	private readonly _fallbackId: string;
	private _active = false;
	private _accumulatedText = '';

	constructor(stream: vscode.ChatResponseStream, fallbackId: string) {
		this._stream = stream;
		this._fallbackId = fallbackId;
		this._thinkingStream =
			typeof (stream as unknown as ThinkingStream).thinkingProgress === 'function'
				? (stream as unknown as ThinkingStream)
				: undefined;
	}

	/** Whether a thinking panel is currently open. */
	get isActive(): boolean {
		return this._active;
	}

	/**
	 * Open the thinking panel with an initial header.
	 * Idempotent — only emits the header on the first call.
	 */
	open(): void {
		if (this._active) { return; }
		this._active = true;
		this._accumulatedText = '';
		if (this._thinkingStream) {
			this._thinkingStream.thinkingProgress({ text: 'Thinking…', id: this._fallbackId });
		} else {
			this._stream.progress('Thinking…');
		}
	}

	/**
	 * Push a reasoning delta. The native thinkingProgress panel REPLACES text
	 * on each call (it does not append), so we accumulate internally and resend
	 * the full text each time — matching FlowParticipant's pattern.
	 */
	pushDelta(delta: string): void {
		if (!this._active) { this.open(); }
		this._accumulatedText += delta;
		if (this._thinkingStream) {
			this._thinkingStream.thinkingProgress({
				text: this._accumulatedText,
				id: this._fallbackId,
			});
		}
	}

	/**
	 * Close the thinking panel, signaling that reasoning has ended.
	 *
	 * @param stopReason - 'text' when text content starts streaming,
	 *                     'other' when tool calls start or the block ends.
	 */
	close(stopReason: 'text' | 'other' = 'other'): void {
		if (!this._active) { return; }
		this._active = false;
		this._accumulatedText = '';
		if (this._thinkingStream) {
			this._thinkingStream.thinkingProgress({
				id: '',
				text: '',
				metadata: { vscodeReasoningDone: true, stopReason },
			});
		}
	}

	/**
	 * Alias for `close('text')` — call when the assistant starts streaming
	 * text content, indicating the thinking phase is over.
	 */
	closeForText(): void {
		this.close('text');
	}

	/**
	 * Alias for `close('other')` — call when tool calls start, the reasoning
	 * block completes, or the turn ends.
	 */
	closeForAction(): void {
		this.close('other');
	}
}
