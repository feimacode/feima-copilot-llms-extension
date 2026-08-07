/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Tracks `stream.externalEdit()` windows for file-editing operations that
 * external CLI tools (Claude, Codex, ...) perform by writing directly to disk
 * — VS Code never sees a `TextEdit` for those, so without this the only
 * visible trace is a bare "N files changed" summary (`codeblockUri`), not a
 * real, diffable, git/Working-Set-tracked change.
 *
 * `trackEdit`/`completeEdit` must be correlated with whatever signal in the
 * calling agent's own protocol genuinely brackets "about to write" → "done
 * writing" — for Claude that's the SDK's PreToolUse/PostToolUse hooks (which
 * block the CLI until they resolve); for Codex it's the `fileChange` item's
 * started/completed lifecycle. Anything looser (e.g. correlating against a
 * streamed message's own start/stop) can race the actual write and open the
 * window too late for VS Code's before-snapshot to see the "before" state.
 */
export class ExternalEditTracker {
	private readonly _ongoingEdits = new Map<string, { resolve: () => void; done: Thenable<string> }>();

	/**
	 * Opens an externalEdit tracking window for `uris` and resolves once VS
	 * Code has begun tracking (i.e. once `stream.externalEdit`'s callback has
	 * started) — callers should await this *before* letting the write actually
	 * happen, so the "before" snapshot is taken first.
	 */
	async trackEdit(
		editKey: string,
		uris: vscode.Uri[],
		stream: vscode.ChatResponseStream,
	): Promise<void> {
		if (!uris.length || !editKey) { return; }

		const s = stream as unknown as Partial<{ externalEdit(target: vscode.Uri | vscode.Uri[], callback: () => Thenable<unknown>): Thenable<string> }>;
		if (typeof s.externalEdit !== 'function') { return; } // proposed API unavailable

		return new Promise<void>(proceed => {
			let resolveDone!: () => void;
			const doneWaiter = new Promise<void>(resolve => { resolveDone = resolve; });

			const done = s.externalEdit!(uris, async () => {
				proceed();
				await doneWaiter;
			});

			this._ongoingEdits.set(editKey, { resolve: resolveDone, done });
		});
	}

	/** Closes the tracking window opened by `trackEdit` for the same key. */
	async completeEdit(editKey: string): Promise<void> {
		const ongoing = this._ongoingEdits.get(editKey);
		if (!ongoing) { return; }
		this._ongoingEdits.delete(editKey);
		ongoing.resolve();
		await ongoing.done;
	}

	/** Force-close any windows still open (e.g. turn ended without a matching completion). */
	flush(): void {
		for (const { resolve } of this._ongoingEdits.values()) { resolve(); }
		this._ongoingEdits.clear();
	}
}
