/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Builds the SDK `Options` object from VS Code extension context.
 *
 * Central factory for constructing `@anthropic-ai/claude-agent-sdk` Options.
 * Does NOT read VS Code config — all parameters are passed explicitly.
 *
 * @module claudeOptionsBuilder
 */

import * as vscode from 'vscode';
import {
	type Options,
	type PermissionMode,
	type CanUseTool,
} from '@anthropic-ai/claude-agent-sdk';
import type { OnElicitation } from '@anthropic-ai/claude-agent-sdk';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProxyInfo {
	messagesUrl: string;
	messagesNonce: string;
}

export interface OptionsBuilderInput {
	/** Proxy info for routing Anthropic Messages API calls */
	proxyInfo: ProxyInfo;
	/** The VS Code chat request (provides model, toolInvocationToken, etc.) */
	request: vscode.ChatRequest;
	/** The cancellation token (for AbortController) */
	token: vscode.CancellationToken;
	/** Saved session ID for resume, or undefined for new session */
	savedSessionId?: string;
	/** Extension storage path (for CLAUDE_CONFIG_DIR isolation) */
	storagePath: string;
	/** Current working directory (from workspace folders) */
	cwd?: string;
	/** SDK PermissionMode — default is 'default' (prompt user for dangerous tools) */
	permissionMode?: PermissionMode;
	/** MCP server configs to pass to the SDK */
	mcpServers?: Record<string, unknown>;
}

// ─── Options Builder ─────────────────────────────────────────────────────────

/**
 * Build the full SDK `Options` object from VS Code extension context.
 *
 * This is the primary factory — all Options should flow through here to
 * ensure consistent configuration across query() and startup() calls.
 */
export function buildClaudeOptions(input: OptionsBuilderInput): Options {
	const cwd = input.cwd ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	const model = input.request.model.id;
	const vendor = input.request.model.vendor;
	const permissionMode = input.permissionMode ?? 'bypassPermissions';

	const options: Options = {
		cwd,
		abortController: new AbortController(),
		...(input.savedSessionId ? { resume: input.savedSessionId } : {}),
		env: {
			...process.env,
			ANTHROPIC_BASE_URL: input.proxyInfo.messagesUrl,
			ANTHROPIC_AUTH_TOKEN: input.proxyInfo.messagesNonce,
			// Isolate session storage from VS Code's built-in Claude agent (~/.claude)
			CLAUDE_CONFIG_DIR: input.storagePath,
		},
		// ── Enable stream_event processing ──
		includePartialMessages: true,

		// ── Safety: file checkpointing ──
		enableFileCheckpointing: true,

		// ── Model override ──
		// Encode vendor+id for precise proxy-side lookup. Format:
		//   vendor/modelId  (e.g. "copilot/gpt-5.5")
		// Falls back to id-only when vendor is unavailable.
		model: vendor ? `${vendor}/${model}` : model,

		// ── MCP servers (from caller, not config) ──
		...(input.mcpServers ? { mcpServers: input.mcpServers as Options['mcpServers'] } : {}),

		// ── Permissions ──
		// permissionMode configures the SDK's internal permission infrastructure
		// (Zod schemas that validate tool execution). allowDangerouslySkipPermissions
		// delegates ALL actual decisions to canUseTool. Both are needed:
		// permissionMode sets up the right execution path, allowDangerouslySkip...
		// ensures canUseTool is the sole authority for allow/deny.
		permissionMode,
		allowDangerouslySkipPermissions: true,
		canUseTool: makeCanUseTool(input.request, input.token, permissionMode),

		// ── MCP elicitation callback ──
		onElicitation: makeOnElicitation(input.request, input.token),
	};

	return options;
}

// ─── Callback Factories ───────────────────────────────────────────────────────

/**
 * Create the `canUseTool` callback for the SDK.
 *
 * Uses `vscode.lm.invokeTool('vscode_get_confirmation', ...)` to show an
 * inline approval in the chat panel — matching the Codex participant pattern.
 *
 * Permission mode affects behavior:
 *   'default'           → prompt user via native chat confirmation dialog
 *   'bypassPermissions' → auto-allow (no prompt)
 *   'dontAsk'           → auto-deny (no prompt)
 *   'acceptEdits'       → auto-allow file edit tools, prompt for others
 */
function makeCanUseTool(
	request: vscode.ChatRequest,
	token: vscode.CancellationToken,
	mode: PermissionMode,
): CanUseTool {
	return async (toolName, _input, _options) => {
		if (mode === 'bypassPermissions') {
			return { behavior: 'allow' as const };
		}

		if (mode === 'dontAsk') {
			return { behavior: 'deny' as const, message: 'Denied by permission mode (dontAsk)' };
		}

		if (mode === 'acceptEdits' && isFileEditTool(toolName)) {
			return { behavior: 'allow' as const };
		}

		// Default: prompt via native chat confirmation (inline in chat panel)
		try {
			const result = await vscode.lm.invokeTool(
				'vscode_get_confirmation',
				{
					input: {
						title: 'Allow tool execution?',
						message: `Claude wants to use: **${toolName}**`,
						confirmationType: 'basic',
					},
					toolInvocationToken: request.toolInvocationToken,
				},
				token,
			);
			const v = (result.content.at(0) as { value?: unknown } | undefined)?.value;
			return typeof v === 'string' && v.toLowerCase() === 'yes'
				? { behavior: 'allow' as const }
				: { behavior: 'deny' as const, message: 'Denied by user' };
		} catch {
			return { behavior: 'deny' as const, message: 'Approval dialog failed' };
		}
	};
}

/**
 * Create the `onElicitation` callback for MCP server elicitation requests.
 */
function makeOnElicitation(
	_request: vscode.ChatRequest,
	_token: vscode.CancellationToken,
): OnElicitation {
	return async (req) => {
		try {
			const result = await vscode.window.showInformationMessage(
				vscode.l10n.t('MCP Server Elicitation Request'),
				{ modal: true, detail: req.message ?? vscode.l10n.t('An MCP server is requesting user input.') },
				vscode.l10n.t('Accept'),
				vscode.l10n.t('Cancel'),
			);
			return result === vscode.l10n.t('Accept')
				? { action: 'accept' as const }
				: { action: 'cancel' as const };
		} catch {
			return { action: 'cancel' as const };
		}
	};
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isFileEditTool(toolName: string): boolean {
	return ['Edit', 'FileWrite', 'file_edit', 'FileEdit', 'Write'].includes(toolName);
}
