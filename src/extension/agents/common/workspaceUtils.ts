/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Resolve the working directory for an agent participant.
 *
 * Priority:
 * 1. The workspace folder containing the active text editor (most likely
 *    what the user is working in)
 * 2. The first workspace folder (fallback for no open editors)
 * 3. process.cwd() (last resort — at least points to a valid directory)
 */
export function resolveWorkspaceCwd(): string | undefined {
	// Prefer the workspace folder of the active editor
	const activeUri = vscode.window.activeTextEditor?.document.uri;
	if (activeUri) {
		const folder = vscode.workspace.getWorkspaceFolder(activeUri);
		if (folder) {
			return folder.uri.fsPath;
		}
	}
	// Fallback: first workspace folder
	const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (wsFolder) {
		return wsFolder;
	}
	// Last resort: extension host cwd (better than undefined)
	return process.cwd();
}
