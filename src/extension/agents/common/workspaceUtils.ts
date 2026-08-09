/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export interface ResolvedWorkspaceFolders {
	/** The primary working directory, chosen the same way resolveWorkspaceCwd()
	 *  always has: active editor's folder, else the first workspace folder,
	 *  else the extension host's own cwd. */
	primary: string;
	/** Every other open workspace folder in a multi-root workspace, as
	 *  absolute fs paths, excluding `primary`. Empty for single-root
	 *  workspaces (or when nothing else is open). */
	additional: string[];
}

/**
 * Resolve the working directory (and any sibling folders) for an agent
 * participant in a possibly multi-root workspace.
 *
 * `primary` priority:
 * 1. The workspace folder containing the active text editor (most likely
 *    what the user is working in)
 * 2. The first workspace folder (fallback for no open editors)
 * 3. process.cwd() (last resort — at least points to a valid directory)
 *
 * `additional` is every other workspace folder VS Code has open — relevant
 * for multi-root workspaces/.code-workspace files, where participants would
 * otherwise only ever see the one primary folder.
 */
export function resolveWorkspaceFolders(): ResolvedWorkspaceFolders {
	const folders = vscode.workspace.workspaceFolders ?? [];

	let primary: string | undefined;
	const activeUri = vscode.window.activeTextEditor?.document.uri;
	if (activeUri) {
		primary = vscode.workspace.getWorkspaceFolder(activeUri)?.uri.fsPath;
	}
	primary ??= folders[0]?.uri.fsPath;
	primary ??= process.cwd();

	const additional = folders.map(f => f.uri.fsPath).filter(fsPath => fsPath !== primary);

	return { primary, additional };
}

/**
 * Resolve just the primary working directory for an agent participant. See
 * `resolveWorkspaceFolders()` for the full multi-root picture (used by
 * participants that can pass extra folders to their backend).
 */
export function resolveWorkspaceCwd(): string | undefined {
	return resolveWorkspaceFolders().primary;
}
