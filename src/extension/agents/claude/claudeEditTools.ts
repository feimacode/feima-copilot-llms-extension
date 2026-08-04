/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { CLAUDE_TOOL_SERVER_NAME } from './clientToolMcpServer';

/**
 * Claude Code's built-in file-editing tool names. `FileWrite`/`FileEdit`/
 * `file_edit` are not real tool names the CLI ever sends — those were
 * guesses; `MultiEdit` and `NotebookEdit` were the ones actually missing.
 *
 * Also includes the MCP-namespaced dynamic tools that edit files via
 * `vscode.lm.invokeTool()` (see clientToolMcpServer.ts) — the SDK prefixes
 * every in-process MCP tool's name with `mcp__<serverName>__` when surfacing
 * it to the model and to `PreToolUse`/`PostToolUse` hooks/`canUseTool`, so
 * both the plain VS Code tool name and its MCP-namespaced form need to be
 * treated the same way here.
 */
export const CLAUDE_EDIT_TOOLS: readonly string[] = [
	'Edit', 'MultiEdit', 'Write', 'NotebookEdit',
	`mcp__${CLAUDE_TOOL_SERVER_NAME}__vscode_editFile_internal`,
	`mcp__${CLAUDE_TOOL_SERVER_NAME}__vscode_editFile`,
];

export function isClaudeEditTool(toolName: string): boolean {
	return CLAUDE_EDIT_TOOLS.includes(toolName);
}

/** Extract the file path a given edit tool's (fully-parsed) input targets. */
export function extractEditToolPath(toolName: string, input: Record<string, unknown>): string {
	if (toolName === 'NotebookEdit' && typeof input.notebook_path === 'string') { return input.notebook_path; }
	if (typeof input.file_path === 'string') { return input.file_path; }
	if (typeof input.path === 'string') { return input.path; }
	if (typeof input.filePath === 'string') { return input.filePath; }
	// vscode_editFile{,_internal} (MCP-routed dynamic tools, see
	// clientToolMcpServer.ts) carry a full URI string rather than a plain fs
	// path — resolve it to a display-friendly fs path where possible.
	if (typeof input.uri === 'string') {
		try { return vscode.Uri.parse(input.uri).fsPath; } catch { return input.uri; }
	}
	return 'unknown';
}

/** Resolve the URI(s) a `PreToolUse`/`PostToolUse` hook call affects, if any. */
export function getAffectedUrisForEditTool(toolName: string, toolInput: unknown): vscode.Uri[] {
	if (!isClaudeEditTool(toolName) || typeof toolInput !== 'object' || toolInput === null) { return []; }
	const input = toolInput as Record<string, unknown>;
	// vscode_editFile{,_internal} inputs carry a full URI — parse it directly
	// instead of routing through extractEditToolPath()+Uri.file(), which
	// would mangle non-file schemes (e.g. untitled:).
	if (typeof input.uri === 'string') {
		try { return [vscode.Uri.parse(input.uri)]; } catch { return []; }
	}
	const path = extractEditToolPath(toolName, input);
	return path === 'unknown' ? [] : [vscode.Uri.file(path)];
}
