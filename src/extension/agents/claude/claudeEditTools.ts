/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Claude Code's built-in file-editing tool names. `FileWrite`/`FileEdit`/
 * `file_edit` are not real tool names the CLI ever sends — those were
 * guesses; `MultiEdit` and `NotebookEdit` were the ones actually missing.
 */
export const CLAUDE_EDIT_TOOLS: readonly string[] = ['Edit', 'MultiEdit', 'Write', 'NotebookEdit'];

export function isClaudeEditTool(toolName: string): boolean {
	return CLAUDE_EDIT_TOOLS.includes(toolName);
}

/** Extract the file path a given edit tool's (fully-parsed) input targets. */
export function extractEditToolPath(toolName: string, input: Record<string, unknown>): string {
	if (toolName === 'NotebookEdit' && typeof input.notebook_path === 'string') { return input.notebook_path; }
	if (typeof input.file_path === 'string') { return input.file_path; }
	if (typeof input.path === 'string') { return input.path; }
	if (typeof input.filePath === 'string') { return input.filePath; }
	return 'unknown';
}

/** Resolve the URI(s) a `PreToolUse`/`PostToolUse` hook call affects, if any. */
export function getAffectedUrisForEditTool(toolName: string, toolInput: unknown): vscode.Uri[] {
	if (!isClaudeEditTool(toolName) || typeof toolInput !== 'object' || toolInput === null) { return []; }
	const path = extractEditToolPath(toolName, toolInput as Record<string, unknown>);
	return path === 'unknown' ? [] : [vscode.Uri.file(path)];
}
