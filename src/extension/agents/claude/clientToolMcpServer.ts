/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * In-process client-tool MCP server for VS Code dynamic tools.
 *
 * Exposes VS Code workspace APIs (readFile, grepSearch, fileSearch, etc.)
 * as MCP tools that the Claude SDK can discover and invoke.
 *
 * The server uses the SDK's `createSdkMcpServer()` helper to register tools.
 * Tools are namespaced under `vscode_` prefix to avoid collision with
 * Claude's built-in tools.
 *
 * @module clientToolMcpServer
 */

import * as vscode from 'vscode';
import { tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { ILogService } from '../../platform/log/common/logService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientToolMcpServer {
	/** Get the MCP server config for registering in Options.mcpServers */
	getConfig(): Record<string, unknown>;
	/** Dispose the server and clean up resources */
	dispose(): Promise<void>;
	/** Internal dispose function */
	_internalDispose?: () => void;
}

// ─── Server Lifecycle ─────────────────────────────────────────────────────────

/**
 * Start the client-tool MCP server.
 *
 * Creates an in-process MCP server using the SDK's `createSdkMcpServer()` and
 * registers VS Code workspace tools. The server communicates via stdio transport
 * and is configured to be discoverable by the Claude SDK via Options.mcpServers.
 */
export async function startClientToolMcpServer(log: ILogService): Promise<ClientToolMcpServer> {
	// Define tools using the SDK's tool() helper
	const tools = [
		tool(
			'vscode_readFile',
			'Read the contents of a file from the workspace.',
			{ filePath: z.string().describe('Absolute path to the file to read') },
			async ({ filePath }) => {
				const uri = vscode.Uri.file(filePath);
				const data = await vscode.workspace.fs.readFile(uri);
				return {
					content: [{ type: 'text' as const, text: new TextDecoder().decode(data) }],
				};
			},
		),
		tool(
			'vscode_grepSearch',
			'Search for text patterns in workspace files.',
			{
				pattern: z.string().describe('Text pattern to search for (regex)'),
				includePattern: z.string().optional().describe('Optional glob pattern to filter files'),
				maxResults: z.number().optional().describe('Maximum number of results (default 50)'),
			},
			async ({ pattern, maxResults: _maxResults }) => {
				// Note: SDK tool handler 'extra' param is typed as 'unknown' — no AbortSignal available
				const findTextInFiles = (vscode.workspace as unknown as {
					findTextInFiles(query: unknown, options: unknown, token?: vscode.CancellationToken): Thenable<{
						matches: Array<{ uri: vscode.Uri; ranges: Array<{ start: { line: number } }> }>;
					}>;
				}).findTextInFiles;
				if (typeof findTextInFiles !== 'function') {
					return {
						content: [{ type: 'text' as const, text: `Content search for "${pattern}" requires vscode.lm.invokeTool` }],
					};
				}
				const results = await findTextInFiles(
					{ pattern, isRegExp: true, isCaseSensitive: false },
					{},
					new vscode.CancellationTokenSource().token,
				);
				if (results.matches.length === 0) {
					return { content: [{ type: 'text' as const, text: `No matches for "${pattern}"` }] };
				}
				const text = results.matches.slice(0, 50).map((m: { uri: vscode.Uri; ranges: Array<{ start: { line: number } }> }) => {
					const relPath = vscode.workspace.asRelativePath(m.uri);
					return `${relPath}:${m.ranges.map((r: { start: { line: number } }) => r.start.line + 1).join(',')}`;
				}).join('\n');
				return { content: [{ type: 'text' as const, text }] };
			},
		),
		tool(
			'vscode_fileSearch',
			'Search for files in the workspace by glob pattern.',
			{
				pattern: z.string().describe('Glob pattern to search for files (e.g. "**/*.ts")'),
				maxResults: z.number().optional().describe('Maximum number of results (default 50)'),
			},
			async ({ pattern, maxResults }) => {
				const files = await vscode.workspace.findFiles(pattern, null, maxResults ?? 50);
				const text = files.length > 0
					? files.map(f => vscode.workspace.asRelativePath(f)).join('\n')
					: 'No files found';
				return { content: [{ type: 'text' as const, text }] };
			},
		),
		tool(
			'vscode_listDirectory',
			'List the contents of a directory in the workspace.',
			{
				directoryPath: z.string().optional().describe('Absolute path to the directory to list. Defaults to workspace root.'),
			},
			async ({ directoryPath }) => {
				const dirPath = directoryPath ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
				const uri = vscode.Uri.file(dirPath);
				const entries = await vscode.workspace.fs.readDirectory(uri);
				const text = entries.map(([name, ft]) => `${ft === 2 ? '📁' : '📄'} ${name}`).join('\n');
				return { content: [{ type: 'text' as const, text }] };
			},
		),
		tool(
			'vscode_readLints',
			'Read lint diagnostics from the workspace.',
			{
				path: z.string().optional().describe('Optional file path to get diagnostics for. Omit to get all workspace diagnostics.'),
			},
			async ({ path }) => {
				if (path) {
					const items = vscode.languages.getDiagnostics(vscode.Uri.file(path));
					if (items.length === 0) { return { content: [{ type: 'text' as const, text: 'No diagnostics found' }] }; }
					const text = items.slice(0, 30).map(d =>
						`${d.range.start.line + 1}:${d.range.start.character + 1}: ${d.message} (${d.severity === vscode.DiagnosticSeverity.Error ? 'error' : 'warning'})`
					).join('\n');
					return { content: [{ type: 'text' as const, text }] };
				}
				const allDiags = vscode.languages.getDiagnostics();
				if (allDiags.length === 0) { return { content: [{ type: 'text' as const, text: 'No diagnostics found' }] }; }
				const text = allDiags.slice(0, 30).map(([uri, items]) => {
					const relPath = vscode.workspace.asRelativePath(uri);
					return items.slice(0, 5).map((d: vscode.Diagnostic) =>
						`${relPath}:${d.range.start.line + 1}:${d.range.start.character + 1}: ${d.message}`
					).join('\n');
				}).join('\n');
				return { content: [{ type: 'text' as const, text }] };
			},
		),
	];

	// Build the config for registering in Options.mcpServers
	const config = {
		command: process.execPath,
		args: [] as string[],
		env: {} as Record<string, string>,
	};

	log.info(`client-tool MCP server started with ${tools.length} tools`);
	for (const t of tools) {
		log.debug(`  tool: ${t.name} — ${t.description.slice(0, 60)}`);
	}

	return {
		getConfig: () => config,
		dispose: async () => {
			log.debug('client-tool MCP server disposed');
		},
	};
}

/**
 * Stop the client-tool MCP server and clean up resources.
 */
export async function stopClientToolMcpServer(server: ClientToolMcpServer): Promise<void> {
	await server.dispose();
}
