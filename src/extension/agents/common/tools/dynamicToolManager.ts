/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import type { DynamicToolSpec } from '../protocol/types';
import { ILogService } from '../../../platform/log/common/logService';
import { getConfiguredExcludePatterns, isToolNameExcluded } from './toolFilters';

// ─── Schema & description overrides ───────────────────────────────────────

/**
 * Some VS Code internal tools register without a usable inputSchema. Provide
 * well-formed schemas for the ones we want Codex to be able to call.
 */
const TOOL_SCHEMA_OVERRIDES: Record<string, DynamicToolSpec['inputSchema']> = {
	'vscode_editFile_internal': {
		type: 'object',
		properties: {
			uri: { type: 'string', description: 'URI of the file to edit' },
			explanation: { type: 'string', description: 'Explanation of the edit' },
			code: { type: 'string', description: 'New code to apply to the file' },
		},
		required: ['uri', 'explanation', 'code'],
	},
	'vscode_editFile': {
		type: 'object',
		properties: {
			uri: { type: 'string', description: 'URI of the file to edit' },
			explanation: { type: 'string', description: 'Explanation of the edit' },
			code: { type: 'string', description: 'New code to apply to the file' },
		},
		required: ['uri', 'explanation', 'code'],
	},
};

/**
 * Steer Codex toward file-editing tools and away from shell commands for file
 * modifications. The model sees these descriptions when choosing tools.
 */
const TOOL_DESCRIPTION_OVERRIDES: Record<string, string> = {
	'exec_command': 'Execute a shell command in a PTY. IMPORTANT: Do NOT use this for creating, writing, or editing files. Use writeFile, replaceInFile, or vscode_editFile_internal for file modifications.',
	'runInTerminal': 'Execute a shell command in the integrated terminal. IMPORTANT: Do NOT use this for creating, writing, or editing files. Use writeFile or replaceInFile for file modifications.',
	'writeFile': 'Create or overwrite a file in the workspace. Prefer this over shell commands for writing file content.',
	'replaceInFile': 'Replace text in a file using exact string matching. Prefer this over shell commands for editing files.',
	'vscode_editFile_internal': 'Apply an edit to a file. Prefer this over shell commands for modifying files.',
	'vscode_editFile': 'Apply an edit to a file. Prefer this over shell commands for modifying files.',
};

// Tool-name exclusion (unsupported manifest-only tools, foreign agent-loop
// control signals, MCP-backed tools now handled natively by the CLI's own
// MCP client — see ../mcp/vscodeMcpConfig.ts) is driven entirely by the
// user-configurable `feima.agents.tools.excludePatterns` setting (see
// ./toolFilters.ts for the shipped default pattern list and rationale for
// each default entry) instead of hardcoded sets, so it's a single,
// consistently-applied source of truth across all participants.

// ─── Schema validation ────────────────────────────────────────────────────────

/**
 * Minimal JSON Schema validation: checks that the schema, if present, declares
 * type: "object" and has a valid properties map. A missing schema is accepted
 * so that callers can supply an override.
 */
function isValidToolSchema(schema: unknown): boolean {
	if (schema === undefined || schema === null) {
		return true;
	}
	if (typeof schema !== 'object') {
		return false;
	}
	const s = schema as Record<string, unknown>;
	// In JSON Schema, omitting `type` is valid — it means "any type".
	// Only reject when `type` is explicitly set to something other than "object".
	if (s.type !== undefined && s.type !== 'object') {
		return false;
	}
	if (s.properties !== undefined && (typeof s.properties !== 'object' || s.properties === null)) {
		return false;
	}
	if (s.required !== undefined) {
		if (!Array.isArray(s.required)) {
			return false;
		}
		if (!s.required.every((item: unknown) => typeof item === 'string')) {
			return false;
		}
	}
	return true;
}

// ─── Manager ──────────────────────────────────────────────────────────────────

/**
 * Discovers registered VS Code language-model tools and converts them into
 * `DynamicToolSpec[]` for the Codex app-server at thread/start time.
 *
 * Primary path: `vscode.lm.tools` (proposed `languageModelTool` API).
 * Fallback path: hardcoded list of VS Code built-in tools that Codex expects.
 */
export class DynamicToolManager {

	private _cache: DynamicToolSpec[] | null = null;
	private _pending: Promise<DynamicToolSpec[]> | null = null;
	/** Tool names confirmed at runtime to be uninvokable — populated by
	 *  `markUninvokable` when `vscode.lm.invokeTool` reports "does not have an
	 *  implementation registered" (VS Code's error for tools whose owning
	 *  extension never registered a runtime implementation, only a manifest
	 *  entry — e.g. GitHub Copilot Chat's own `copilot_*` tools). Evidence-based,
	 *  not a name guess: only tools we've actually observed failing this way
	 *  are excluded. */
	private readonly _uninvokable = new Set<string>();

	constructor(private readonly _log: ILogService) { }

	/**
	 * Build (or return cached) dynamic tools for the current VS Code session.
	 * Safe to call concurrently — in-flight calls share the same promise.
	 */
	async buildDynamicTools(): Promise<DynamicToolSpec[]> {
		if (this._cache) {
			return this._cache;
		}
		if (this._pending) {
			return this._pending;
		}
		this._pending = this._discover();
		try {
			this._cache = await this._pending;
			return this._cache;
		} finally {
			this._pending = null;
		}
	}

	/** Discard the cache so the next call re-discovers tools. */
	clearCache(): void {
		this._cache = null;
		this._pending = null;
	}

	/**
	 * Record that `name` is confirmed uninvokable via `vscode.lm.invokeTool`
	 * (see `_uninvokable` doc) and drop the cache so it's excluded from the
	 * next dynamic tool list built for Codex — otherwise Codex would keep
	 * rediscovering and retrying the same dead-end tool every turn.
	 */
	markUninvokable(name: string): void {
		if (this._uninvokable.has(name)) {
			return;
		}
		this._uninvokable.add(name);
		this._log.warn(`tool "${name}" confirmed uninvokable (no runtime implementation registered) — excluding from future dynamic tool lists`);
		this.clearCache();
	}

	// ── Discovery ──────────────────────────────────────────────────────────

	private async _discover(): Promise<DynamicToolSpec[]> {
		// Primary path: vscode.lm.tools (proposed API, may not be enabled)
		const lm = vscode.lm as { tools?: readonly { name: string; description?: string; inputSchema?: unknown }[] };
		if (lm.tools?.length) {
			this._log.debug(`discovered ${lm.tools.length} tools via vscode.lm.tools`);
			return this._fromLmTools(lm.tools);
		}

		// Fallback: hardcoded VS Code built-in tools
		this._log.debug('vscode.lm.tools not available, using fallback tool list');
		return this._fallbackTools();
	}

	private _fromLmTools(
		tools: readonly { name: string; description?: string; inputSchema?: unknown }[],
	): DynamicToolSpec[] {
		const seen = new Set<string>();
		const result: DynamicToolSpec[] = [];
		const excludePatterns = getConfiguredExcludePatterns();

		for (const t of tools) {
			if (isToolNameExcluded(t.name, excludePatterns)) {
				this._log.debug(`skipping excluded tool "${t.name}" — matches feima.agents.tools.excludePatterns`);
				continue;
			}
			if (this._uninvokable.has(t.name)) {
				continue;
			}

			let schema = t.inputSchema as DynamicToolSpec['inputSchema'] | undefined;
			let schemaSource = 'registered';

			if (!isValidToolSchema(schema)) {
				const override = TOOL_SCHEMA_OVERRIDES[t.name];
				if (override) {
					schema = override;
					schemaSource = 'override';
				} else {
					this._log.warn(`skipping tool "${t.name}" — invalid inputSchema`);
					continue;
				}
			}

			if (seen.has(t.name)) {
				this._log.warn(`duplicate tool name "${t.name}" — using first registration`);
				continue;
			}
			seen.add(t.name);

			const description = TOOL_DESCRIPTION_OVERRIDES[t.name] ?? t.description ?? `VS Code tool: ${t.name}`;

			result.push({
				name: t.name,
				description,
				inputSchema: (schema ?? { type: 'object', properties: {} }) as DynamicToolSpec['inputSchema'],
			});
			if (schemaSource === 'override') {
				this._log.debug(`applied schema override for "${t.name}"`);
			}
		}

		result.sort((a, b) => a.name.localeCompare(b.name));
		this._log.debug(`built ${result.length} dynamic tools from vscode.lm.tools`);
		return result;
	}

	private _fallbackTools(): DynamicToolSpec[] {
		// Built-in VS Code tools that Codex expects.
		// These match the tool names and schemas registered by VS Code's agent-host.
		return [
			{
				name: 'fileSearch',
				description: 'Search for files matching a glob pattern in the workspace',
				inputSchema: {
					type: 'object',
					properties: {
						pattern: { type: 'string', description: 'Glob pattern to match files' },
					},
					required: ['pattern'],
				},
			},
			{
				name: 'readFile',
				description: 'Read the contents of a file in the workspace',
				inputSchema: {
					type: 'object',
					properties: {
						filePath: { type: 'string', description: 'Path to the file to read' },
					},
					required: ['filePath'],
				},
			},
			{
				name: 'replaceInFile',
				description: 'Replace text in a file using exact string matching',
				inputSchema: {
					type: 'object',
					properties: {
						filePath: { type: 'string', description: 'Path to the file' },
						oldString: { type: 'string', description: 'Text to find and replace' },
						newString: { type: 'string', description: 'Replacement text' },
					},
					required: ['filePath', 'oldString', 'newString'],
				},
			},
			{
				name: 'writeFile',
				description: 'Create or overwrite a file in the workspace',
				inputSchema: {
					type: 'object',
					properties: {
						filePath: { type: 'string', description: 'Path to the file' },
						content: { type: 'string', description: 'Content to write' },
					},
					required: ['filePath', 'content'],
				},
			},
			{
				name: 'runInTerminal',
				description: 'Execute a shell command in the integrated terminal',
				inputSchema: {
					type: 'object',
					properties: {
						command: { type: 'string', description: 'Shell command to execute' },
						cwd: { type: 'string', description: 'Working directory (optional)' },
					},
					required: ['command'],
				},
			},
			{
				name: 'searchContent',
				description: 'Search for text patterns across files in the workspace',
				inputSchema: {
					type: 'object',
					properties: {
						pattern: { type: 'string', description: 'Text or regex pattern to search for' },
						directory: { type: 'string', description: 'Directory to search in (optional)' },
						fileTypes: { type: 'string', description: 'File extension filter (optional, e.g. ".ts")' },
					},
					required: ['pattern'],
				},
			},
			{
				name: 'listDirectory',
				description: 'List files and directories in a given path',
				inputSchema: {
					type: 'object',
					properties: {
						directoryPath: { type: 'string', description: 'Path to the directory to list' },
					},
					required: ['directoryPath'],
				},
			},
			{
				name: 'readLints',
				description: 'Read and display linter errors from the workspace',
				inputSchema: {
					type: 'object',
					properties: {
						paths: { type: 'string', description: 'Optional file or directory path to read diagnostics for' },
					},
				},
			},
		];
	}
}
