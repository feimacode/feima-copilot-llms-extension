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
import { CLAUDE_PROVIDER_ID } from './claudeModelProvider';
import { CLAUDE_EDIT_TOOLS, isClaudeEditTool, getAffectedUrisForEditTool } from './claudeEditTools';
import type { ExternalEditTracker } from '../common/externalEditTracker';
import type { PermissionTier } from '../common/permissionTier';
import { requestConfirmation } from '../common/confirmationTool';
import type { ILogService } from '../../platform/log/common/logService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProxyInfo {
	messagesUrl: string;
	messagesNonce: string;
}

export interface OptionsBuilderInput {
	/** Proxy info for routing Anthropic Messages API calls. Required when
	 *  `request.model.vendor !== CLAUDE_PROVIDER_ID` (proxy routing); omitted
	 *  for native `claude-code` models, which talk to the real Anthropic API
	 *  using the user's own `claude login` subscription. */
	proxyInfo?: ProxyInfo;
	/** The VS Code chat request (provides model, toolInvocationToken, etc.) */
	request: vscode.ChatRequest;
	/** Overrides `request.model.vendor`/`.id` for routing and the `model` field
	 *  sent to the SDK. Used when the caller is continuing an existing session
	 *  under its original routing instead of the model newly picked in the chat
	 *  UI (see ClaudeParticipant's routing-switch confirmation). */
	modelOverride?: { vendor: string | undefined; id: string };
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
	/** Resolved path to the user's `claude` binary. When set, the SDK spawns
	 *  this instead of its bundled platform binary (which we don't ship). */
	claudeBinaryPath?: string;
	/**
	 * Tracks `stream.externalEdit()` windows for file-editing tools via
	 * PreToolUse/PostToolUse hooks (see makeEditTrackingHooks). Optional only so
	 * existing call sites/tests that don't care about edit tracking keep working.
	 */
	editTracker?: ExternalEditTracker;
	/**
	 * Returns whichever `ChatResponseStream` is *currently* active. A live
	 * accessor rather than a captured `stream` because this same `Options`
	 * object (and its hook closures) can outlive the turn it was built for —
	 * `startup()`-promoted WarmQuery sessions reuse it across turns, each with
	 * its own stream.
	 */
	getCurrentStream?: () => vscode.ChatResponseStream | undefined;
	/**
	 * Returns whichever `PermissionMode` is *currently* in effect. A live
	 * accessor for the same reason as `getCurrentStream`: `canUseTool` is
	 * fixed at `startup()` time for WarmQuery-promoted sessions, but each
	 * resumed turn may carry its own `/ask`, `/acceptEdits` or `/fullAuto`
	 * override — see ClaudeParticipant's `permissionModeBox`.
	 */
	getCurrentPermissionMode?: () => PermissionMode;
	/** Logging service — wired into canUseTool so allow/deny/prompt decisions
	 *  (and which permission mode was actually in effect) are traceable. */
	log?: ILogService;
}

/** Map the normalized cross-participant permission tier onto Claude's native `PermissionMode`. */
export function mapTierToPermissionMode(tier: PermissionTier): PermissionMode {
	switch (tier) {
		case 'fullAuto': return 'bypassPermissions';
		case 'acceptEdits': return 'acceptEdits';
		case 'ask': return 'default';
	}
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
	const model = input.modelOverride?.id ?? input.request.model.id;
	const vendor = input.modelOverride ? input.modelOverride.vendor : input.request.model.vendor;
	// Safe-by-default fallback for callers that don't pass a live accessor
	// (e.g. tests) — real turns always supply one via ClaudeParticipant's
	// permissionModeBox, resolved from the feima.agents.claude.permissionMode
	// setting and any per-turn /ask, /acceptEdits, /fullAuto override.
	const permissionMode = input.permissionMode ?? 'default';
	const getCurrentPermissionMode = input.getCurrentPermissionMode ?? (() => permissionMode);

	// Native routing (vendor === CLAUDE_PROVIDER_ID): the user picked one of their
	// own subscription's models (listed via the CLI's own `claude login`), so we
	// talk to the real Anthropic API with the CLI's own credentials — no proxy,
	// no CLAUDE_CONFIG_DIR override (that's exactly where `.credentials.json` and
	// the user's real session history live; isolating it would strand both).
	//
	// Proxy routing (any other vendor, e.g. a Copilot-backed model picked while
	// chatting with @claude): route through our local Anthropic-Messages-shaped
	// proxy into VS Code's LM API, isolated under our own storagePath so it never
	// touches the user's real ~/.claude.
	const isNative = vendor === CLAUDE_PROVIDER_ID;

	const options: Options = {
		cwd,
		abortController: new AbortController(),
		// Use the user's locally-installed claude binary. We don't bundle the
		// platform-specific binary package, so this must resolve from PATH/settings.
		...(input.claudeBinaryPath ? { pathToClaudeCodeExecutable: input.claudeBinaryPath } : {}),
		...(input.savedSessionId ? { resume: input.savedSessionId } : {}),
		env: isNative
			? { ...process.env }
			: (() => {
				if (!input.proxyInfo) { throw new Error('buildClaudeOptions: proxyInfo is required for proxy routing'); }
				return {
					...process.env,
					ANTHROPIC_BASE_URL: input.proxyInfo.messagesUrl,
					ANTHROPIC_AUTH_TOKEN: input.proxyInfo.messagesNonce,
					// Isolate session storage from the user's real ~/.claude.
					CLAUDE_CONFIG_DIR: input.storagePath,
				};
			})(),
		// ── Enable stream_event processing ──
		includePartialMessages: true,

		// ── Safety: file checkpointing ──
		enableFileCheckpointing: true,

		// ── Model override ──
		// Native: pass the bare model id straight through to the real API.
		// Proxy: encode vendor+id for precise proxy-side lookup, e.g. "copilot/gpt-5.5".
		model: isNative ? model : (vendor ? `${vendor}/${model}` : model),

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
		canUseTool: makeCanUseTool(input.request, input.token, getCurrentPermissionMode, input.log),

		// ── MCP elicitation callback ──
		onElicitation: makeOnElicitation(input.request, input.token),

		// ── File-edit tracking (PreToolUse/PostToolUse hooks) ──
		// See common/externalEditTracker.ts for why hooks (not the content-block
		// stream) are what's needed to register edits with VS Code as real,
		// diffable, Working-Set-tracked changes.
		...(input.editTracker && input.getCurrentStream
			? { hooks: makeEditTrackingHooks(input.editTracker, input.getCurrentStream) }
			: {}),
	};

	return options;
}

// ─── Callback Factories ───────────────────────────────────────────────────────

/**
 * Create the `canUseTool` callback for the SDK.
 *
 * Uses the shared `requestConfirmation` helper (common/confirmationTool.ts)
 * to show a real blocking inline approval card in the chat panel.
 *
 * `getMode` is called on every tool call rather than closing over a single
 * mode — see `OptionsBuilderInput.getCurrentPermissionMode` for why.
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
	getMode: () => PermissionMode,
	log?: ILogService,
): CanUseTool {
	return async (toolName, _input, _options) => {
		const mode = getMode();
		log?.debug(`canUseTool invoked ${JSON.stringify({ toolName, mode })}`);

		if (mode === 'bypassPermissions') {
			log?.debug(`canUseTool decision: allow (bypassPermissions) ${JSON.stringify({ toolName })}`);
			return { behavior: 'allow' as const };
		}

		if (mode === 'dontAsk') {
			log?.debug(`canUseTool decision: deny (dontAsk) ${JSON.stringify({ toolName })}`);
			return { behavior: 'deny' as const, message: 'Denied by permission mode (dontAsk)' };
		}

		if (mode === 'acceptEdits' && isClaudeEditTool(toolName)) {
			log?.debug(`canUseTool decision: allow (acceptEdits, edit tool) ${JSON.stringify({ toolName })}`);
			return { behavior: 'allow' as const };
		}

		// Default: prompt via a real blocking confirmation card (inline in chat panel)
		log?.debug(`canUseTool prompting user ${JSON.stringify({ toolName, mode })}`);
		const approved = await requestConfirmation(
			'Allow tool execution?',
			`Claude wants to use: **${toolName}**`,
			request.toolInvocationToken,
			token,
		);
		log?.debug(`canUseTool decision: ${approved ? 'allow' : 'deny'} (user prompt) ${JSON.stringify({ toolName })}`);
		return approved
			? { behavior: 'allow' as const }
			: { behavior: 'deny' as const, message: 'Denied by user' };
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

/**
 * Build `PreToolUse`/`PostToolUse` hooks that bracket each file-editing tool
 * call with an `editTracker` window. Unlike the content-block SSE stream,
 * these genuinely block the CLI until they resolve — `PreToolUse` fires
 * synchronously before the tool executes, `PostToolUse` after it completes —
 * which is what makes the before/after snapshot `stream.externalEdit()` needs
 * actually line up with the real write instead of racing it.
 */
function makeEditTrackingHooks(
	editTracker: ExternalEditTracker,
	getCurrentStream: () => vscode.ChatResponseStream | undefined,
): NonNullable<Options['hooks']> {
	const matcher = CLAUDE_EDIT_TOOLS.join('|');
	return {
		PreToolUse: [{
			matcher,
			hooks: [async (input, toolUseId) => {
				if (input.hook_event_name === 'PreToolUse') {
					const stream = getCurrentStream();
					const uris = getAffectedUrisForEditTool(input.tool_name, input.tool_input);
					if (stream && uris.length > 0) {
						await editTracker.trackEdit(toolUseId ?? '', uris, stream);
					}
				}
				return {};
			}],
		}],
		PostToolUse: [{
			matcher,
			hooks: [async (_input, toolUseId) => {
				await editTracker.completeEdit(toolUseId ?? '');
				return {};
			}],
		}],
	};
}
