/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { query, startup, getSessionInfo, type Options, type PermissionMode } from '@anthropic-ai/claude-agent-sdk';
import type { WarmQuery } from '@anthropic-ai/claude-agent-sdk';
import { ProxyManager } from '../common/proxy/proxyManager';
import { routeSDKMessage, createInitialState, type RouterState } from './claudeMessageRouter';
import { buildClaudeOptions, mapTierToPermissionMode, type OptionsBuilderInput } from './claudeOptionsBuilder';
import { CLAUDE_PROVIDER_ID } from './claudeModelProvider';
import { ExternalEditTracker } from '../common/externalEditTracker';
import { getEffectiveMcpServers } from '../common/mcp/vscodeMcpConfig';
import { startClientToolMcpServer, stopClientToolMcpServer, type ClientToolMcpServer } from './clientToolMcpServer';
import { resolveBinary } from '../common/appServer/client';
import { resolveWorkspaceCwd } from '../common/workspaceUtils';
import { resolvePermissionTier } from '../common/permissionTier';
import { parseAllowedActions, serializeAllowedActions } from '../common/sessionApprovals';
import { resolveSystemPrompt } from '../common/systemPrompt';
import { CLAUDE_DEFAULT_SYSTEM_PROMPT } from '../common/constants/systemPromptDefaults';
import { ILogService } from '../../platform/log/common/logService';

// ─── Types ────────────────────────────────────────────────────────────────────

type ClaudeRouting = 'native' | 'proxy';

interface TurnMetadata {
	/** Persisted SDK session ID so subsequent turns can resume. */
	sessionId: string;
	/** Routing mode this session actually ran under — native and proxy sessions
	 *  live in separate stores (see buildClaudeOptions), so the next turn needs
	 *  this to notice when the picked model would switch stores and ask first. */
	routing: ClaudeRouting;
	/** vendor/id of the model actually used for this turn — restored verbatim
	 *  when the user chooses to keep the previous session/routing instead of
	 *  switching to the newly picked model (see _confirmRoutingSwitch). */
	modelVendor: string | undefined;
	modelId: string;
	/** Token usage if available */
	tokenUsage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
	/** Tool names approved "for the session" via the confirmation card's third
	 *  button (see common/confirmationTool.ts) — canUseTool skips prompting
	 *  for any of these for the rest of the conversation. */
	allowedActions?: string[];
}

/** Per-session state for WarmQuery sessions (Priority 3c). */
interface SessionEntry {
	warmQuery: WarmQuery;
	mcpServer: ClientToolMcpServer | null;
	lastUsed: number; // timestamp
	idleTimer?: NodeJS.Timeout;
	/**
	 * The stream box `warmQuery`'s PreToolUse/PostToolUse hooks are bound to
	 * (see claudeOptionsBuilder.ts's makeEditTrackingHooks). Hook closures are
	 * fixed at `startup()` time and can't be swapped, but this box's `.current`
	 * can — so each turn that reuses this warm session mutates it to point at
	 * *that turn's* stream before consuming the query. A dedicated box per
	 * session (never a single field shared across sessions) is what keeps this
	 * safe if the user has more than one @claude conversation running at once.
	 */
	streamBox: StreamBox;
	/** See SessionEntry.permissionModeBox. */
	permissionModeBox: PermissionModeBox;
	/** See SessionEntry.sessionApprovalsBox. */
	sessionApprovalsBox: SessionApprovalsBox;
}

/** See SessionEntry.streamBox. */
type StreamBox = { current: vscode.ChatResponseStream | undefined };

/**
 * Same live-accessor problem as StreamBox, for the permission mode instead of
 * the stream: `canUseTool`'s closure is fixed at `startup()` time, bound to
 * this box, but each turn that resumes the WarmQuery may carry its own /ask,
 * /acceptEdits or /fullAuto override — so this box's `.current` is what lets
 * a later turn's choice actually reach the already-built `canUseTool`.
 */
type PermissionModeBox = { current: PermissionMode };

/**
 * Same live-accessor problem as PermissionModeBox, for the "allow for the
 * session" tool-name set: each turn re-parses it fresh from this turn's
 * `context.history` metadata (so it survives an extension host restart, not
 * just WarmQuery reuse), and `.current` is reassigned to that turn's set
 * before consuming the query — mutated in place by `canUseTool` as new
 * approvals come in, then read back to build this turn's own metadata.
 */
type SessionApprovalsBox = { current: Set<string> };

// ─── Constants ────────────────────────────────────────────────────────────────

const WARMQUERY_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ─── Participant ──────────────────────────────────────────────────────────────

/**
 * Chat participant that bridges VS Code Chat to Claude Code via
 * @anthropic-ai/claude-agent-sdk.
 *
 * The SDK spawns the system-installed `claude` binary internally — no binary
 * bundling needed. API routing goes through our messages proxy:
 *
 *   ANTHROPIC_BASE_URL      → local messages proxy (http://127.0.0.1:N)
 *   ANTHROPIC_AUTH_TOKEN    → proxy nonce (sent as Authorization: Bearer)
 *
 * The proxy translates Anthropic Messages API calls to VS Code's LM API,
 * routing to whichever model the user selects in the chat picker.
 *
 * Session design: one SDK session per VS Code chat conversation. The SDK
 * persists session history in ~/.claude/. We pass `resume: sessionId` on
 * subsequent turns so the SDK picks up where it left off.
 *
 * Priority 1-2 features use the simpler `query()` API.
 * Priority 3c features (steering, mid-turn injection) use `startup()`+`WarmQuery`.
 */
export class ClaudeParticipant {
	/** sessionId → abortController for canceling in-flight query() calls */
	private readonly _sessions = new Map<string, AbortController>();
	/** sessionId → WarmQuery session for sessions using startup()+WarmQuery */
	private readonly _warmSessions = new Map<string, SessionEntry>();
	/** Client-tool MCP server for dynamic tools (shared across sessions) */
	private _clientToolServer: ClientToolMcpServer | null = null;
	/** Tracks stream.externalEdit() windows for file-editing tool calls (shared
	 *  across sessions — keyed internally by tool_use id, which Claude already
	 *  guarantees unique). */
	private readonly _editTracker = new ExternalEditTracker();

	/**
	 * @param storagePath  Extension's global storage path (from context.globalStorageUri.fsPath).
	 *                     Passed as CLAUDE_CONFIG_DIR to isolate our sessions from
	 *                     VS Code's built-in Claude agent which uses ~/.claude.
	 */
	constructor(
		private readonly proxyManager: ProxyManager,
		private readonly storagePath: string,
		private readonly _log: ILogService,
	) {}

	async handleRequest(
		request: vscode.ChatRequest,
		context: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
	): Promise<vscode.ChatResult> {
		// Native routing: the user picked one of their own subscription's models
		// (vendor === CLAUDE_PROVIDER_ID, listed via the CLI's own `claude login`)
		// — talk to the real Anthropic API directly, no proxy involved. Any other
		// vendor (e.g. a Copilot-backed model picked while chatting with @claude)
		// routes through our local proxy into VS Code's LM API.
		const requestedRouting: ClaudeRouting = request.model.vendor === CLAUDE_PROVIDER_ID ? 'native' : 'proxy';
		const cwd = resolveWorkspaceCwd();

		// ── 1. Session management ────────────────────────────────────────────
		const savedMeta = findMetaInHistory(context.history);
		let savedSessionId = savedMeta?.sessionId;

		// Native and proxy sessions live in entirely separate stores (see
		// buildClaudeOptions), so a session created under one routing can never be
		// resumed under the other. If the newly picked model would cross that
		// boundary, ask the user rather than silently dropping the old session:
		// either continue in the previous routing/model (ignoring the new pick for
		// this turn) or deliberately start a fresh session in the new routing.
		let routing = requestedRouting;
		let effectiveVendor: string | undefined = request.model.vendor;
		let effectiveModelId = request.model.id;
		if (savedSessionId && savedMeta?.routing && savedMeta.routing !== requestedRouting) {
			stream.progress('Switching Claude session mode...');
			const startNew = await this._confirmRoutingSwitch(savedMeta.routing, requestedRouting);
			if (startNew) {
				savedSessionId = undefined; // different store — nothing to resume from
				this._log.debug('routing switch confirmed: starting new session ' + JSON.stringify({ from: savedMeta.routing, to: requestedRouting }));
			} else {
				routing = savedMeta.routing;
				effectiveVendor = savedMeta.modelVendor;
				effectiveModelId = savedMeta.modelId ?? request.model.id;
				this._log.debug('routing switch declined: staying on ' + JSON.stringify({ routing, effectiveVendor, effectiveModelId }));
			}
		}

		// The proxy is started once in registerAgents(); only proxy routing needs
		// it, so native requests never block on (or depend on) proxy startup.
		let info: { messagesUrl: string; messagesNonce: string } | undefined;
		if (routing === 'proxy') {
			await this.proxyManager.ready;
			info = this.proxyManager.info;
		}

		// Verify the saved session still exists on disk before attempting resume.
		// Sessions can be lost after extension reload, CLI cleanup, or if the
		// project directory hash changed. Fall back to a fresh session if gone.
		//
		// getSessionInfo() runs in-process (unlike query()/startup(), which only see
		// CLAUDE_CONFIG_DIR via the child-process `env` built in claudeOptionsBuilder)
		// and resolves its root by reading process.env.CLAUDE_CONFIG_DIR directly —
		// which is also where the real `.credentials.json` lives. So we scope the
		// override tightly to this one call: proxy routing points it at our isolated
		// storagePath (matching the child-process env), native routing leaves it
		// untouched so lookups hit the user's real ~/.claude. `dir` itself is just the
		// *project* working directory (same `cwd` passed to query()/startup()).
		if (savedSessionId) {
			const prevConfigDir = process.env.CLAUDE_CONFIG_DIR;
			if (routing === 'proxy') {
				process.env.CLAUDE_CONFIG_DIR = this.storagePath;
			} else {
				delete process.env.CLAUDE_CONFIG_DIR;
			}
			try {
				const sessionInfo = await getSessionInfo(savedSessionId, { dir: cwd });
				if (!sessionInfo) {
					this._log.warn('saved session not found on disk, starting fresh: ' + savedSessionId);
					savedSessionId = undefined;
				}
			} catch (err) {
				this._log.warn('failed to verify session, starting fresh: ' + String(err));
				savedSessionId = undefined;
			} finally {
				if (prevConfigDir === undefined) { delete process.env.CLAUDE_CONFIG_DIR; } else { process.env.CLAUDE_CONFIG_DIR = prevConfigDir; }
			}
		}
		this._log.debug('session lookup: ' + JSON.stringify({ routing, savedSessionId, historyLength: context.history.length }));

		const ac = new AbortController();
		if (savedSessionId) {
			this._sessions.set(savedSessionId, ac);
		}
		const cancellationSub = token.onCancellationRequested(() => ac.abort());

		// Box for this turn's stream, threaded into the edit-tracking hooks (see
		// SessionEntry.streamBox for why this can't just be a class field).
		const streamBox: StreamBox = { current: stream };

		// ── 1b. Resolve this turn's permission tier ──────────────────────────
		// Configured default, overridden for this turn only by a recognized
		// /ask, /acceptEdits or /fullAuto slash command (never persisted).
		const configuredTier = vscode.workspace.getConfiguration('feima.agents.claude').get('permissionMode');
		const permissionTier = resolvePermissionTier(request.command, configuredTier);
		const permissionModeBox: PermissionModeBox = { current: mapTierToPermissionMode(permissionTier) };
		this._log.debug(`final permission in use ${JSON.stringify({
			configuredTier, commandOverride: request.command, tier: permissionTier, permissionMode: permissionModeBox.current,
		})}`);
		const sessionApprovalsBox: SessionApprovalsBox = { current: parseAllowedActions(savedMeta?.allowedActions) };

		// ── 2. Build SDK options via builder ──────────────────────────────────
		// Resolve the user's claude binary so the SDK spawns the local CLI
		// instead of a bundled platform binary (which we don't ship).
		let claudeBinaryPath: string | undefined;
		try {
			const rawBinaryPath = vscode.workspace.getConfiguration('feima.agents.claude').get<string>('binaryPath') ?? '';
			claudeBinaryPath = resolveBinary(rawBinaryPath, 'claude', this._log);
		} catch (err) {
			this._log.warn('claude binary not found; participant will fail until installed: ' + String(err));
		}
		const optionsInput: OptionsBuilderInput = {
			...(info ? { proxyInfo: { messagesUrl: info.messagesUrl, messagesNonce: info.messagesNonce } } : {}),
			request,
			modelOverride: { vendor: effectiveVendor, id: effectiveModelId },
			token,
			savedSessionId,
			storagePath: this.storagePath,
			cwd,
			claudeBinaryPath,
			editTracker: this._editTracker,
			getCurrentStream: () => streamBox.current,
			permissionMode: permissionModeBox.current,
			getCurrentPermissionMode: () => permissionModeBox.current,
			getSessionApprovals: () => sessionApprovalsBox.current,
			log: this._log,
			maxTurns: vscode.workspace.getConfiguration('feima.agents.claude').get<number>('maxApiCallsPerTurn') ?? 50,
			systemPrompt: resolveSystemPrompt('claude', CLAUDE_DEFAULT_SYSTEM_PROMPT, this._log),
		};
		const options = buildClaudeOptions(optionsInput);
		options.abortController = ac;

		// ── 2b. Merge MCP servers from VS Code's own native mcp.json config ──
		// (user profile + every workspace folder's `.vscode/mcp.json`) — no
		// extension-specific setting involved. `strictMcpConfig` is never set
		// on `options`, so this merge is additive on top of whatever the
		// `claude` CLI already discovers natively (project `.mcp.json`, its
		// own user-level `claude mcp add` servers, plugins, etc).
		// Gated by `feima.agents.claude.shareMcpServers` (default: on).
		if (vscode.workspace.getConfiguration('feima.agents.claude').get<boolean>('shareMcpServers', true)) {
			const vsCodeMcpServers = await getEffectiveMcpServers(vscode.Uri.file(this.storagePath), this._log);
			for (const [name, config] of Object.entries(vsCodeMcpServers)) {
				(options.mcpServers ??= {})[name] = config as never;
			}
			if (Object.keys(vsCodeMcpServers).length > 0) {
				this._log.debug(`merged ${Object.keys(vsCodeMcpServers).length} MCP server(s) from VS Code's native mcp.json config into options`);
			}
		}

		// ── 3. Start client-tool MCP server (Priority 3a) ────────────────────
		if (!this._clientToolServer) {
			try {
				this._clientToolServer = await startClientToolMcpServer(this._log);
				this._log.debug('client-tool MCP server started');
			} catch (err) {
				this._log.error(err instanceof Error ? err : String(err), 'failed to start client-tool MCP server');
				// Graceful degradation — continue without dynamic tools
			}
		}
		if (this._clientToolServer) {
			(options.mcpServers ??= {})['vscode-tools'] = this._clientToolServer.getConfig() as Options['mcpServers'] extends Record<string, infer V> ? V : never;
		}

		// ── 4. Check for existing WarmQuery session ─────────────────────
		if (savedSessionId && this._warmSessions.has(savedSessionId)) {
			return this._handleWithWarmQuery(
				request, stream, token, options, savedSessionId, ac, routing, effectiveVendor, effectiveModelId, streamBox, permissionModeBox, sessionApprovalsBox,
			);
		}

		// ── 5. Run SDK query (standard path) ──────────────────────────────────
		this._log.debug('starting query: ' + JSON.stringify({
			prompt: request.prompt.slice(0, 120),
			resume: savedSessionId ?? '(new)',
			routing,
			modelId: effectiveModelId,
			permissionMode: options.permissionMode,
		}));
		stream.progress(savedSessionId ? 'Resuming Claude session...' : 'Starting Claude session...');

		let finalSessionId: string | undefined = savedSessionId;
		let finalUsage: { inputTokens?: number; outputTokens?: number } = {};
		let routerState: RouterState = createInitialState(stream);

		try {
			const q = query({ prompt: request.prompt, options });

			for await (const msg of q) {
				if (token.isCancellationRequested) { break; }
				// Route message through the message router
				routerState = routeSDKMessage(msg, stream, this._log, routerState);
			}

			finalSessionId = routerState.sessionId ?? savedSessionId;
			finalUsage = routerState.usage
				? {
					inputTokens: routerState.usage.input_tokens,
					outputTokens: routerState.usage.output_tokens,
				}
				: {};

			this._log.debug('query finished: ' + JSON.stringify({
				sessionId: finalSessionId,
				usage: finalUsage,
				error: routerState.error,
			}));

			if (routerState.error) {
				stream.markdown(`\n\n> ⚠️ Claude error: ${routerState.error}\n`);
			}

			// Promote to WarmQuery for next turn (deferred, in background)
			if (finalSessionId && !this._warmSessions.has(finalSessionId)) {
				this._promoteToWarmQuery(options, finalSessionId, streamBox, permissionModeBox, sessionApprovalsBox).catch(err => {
					this._log.error(err instanceof Error ? err : String(err), 'WarmQuery promotion failed');
				});
			}
		} catch (err) {
			// Cancellation is expected — suppress noisy errors
			const isCancellation = token.isCancellationRequested
				|| (err instanceof TypeError && (err.message === 'terminated' || err.message.includes('aborted')))
				|| (err instanceof Error && err.name === 'AbortError');
			if (!isCancellation) {
				this._log.error(err instanceof Error ? err : String(err), 'query error');
				stream.markdown(`\n\n> ⚠️ Claude error: ${String(err)}\n`);
			}
		} finally {
			cancellationSub.dispose();
			if (savedSessionId) { this._sessions.delete(savedSessionId); }
			this._editTracker.flush();
		}

		// ── 6. Persist session ID for the next turn ───────────────────────────
		if (finalSessionId) {
			const allowedActions = serializeAllowedActions(sessionApprovalsBox.current);
			const metadata: TurnMetadata = {
				sessionId: finalSessionId,
				routing,
				modelVendor: effectiveVendor,
				modelId: effectiveModelId,
				...(Object.keys(finalUsage).length > 0 ? { tokenUsage: finalUsage } : {}),
				...(allowedActions ? { allowedActions } : {}),
			};
			this._log.debug('returning metadata: ' + JSON.stringify(metadata));
			return { metadata };
		}
		return {};
	}

	/**
	 * Ask the user whether to start a fresh session in the newly picked routing
	 * mode, or keep continuing the existing session under its original routing
	 * (ignoring the newly picked model for this turn).
	 *
	 * Uses a native modal dialog rather than the shared `requestConfirmation`
	 * helper (see common/confirmationTool.ts) — that helper offers a binary
	 * Continue/Cancel, but this needs two *named* choices (start new vs. keep
	 * existing), which only `showWarningMessage`'s custom button labels give.
	 * `showWarningMessage` with `modal: true` is a plain synchronous dialog with
	 * no dependency on an in-flight tool call.
	 *
	 * Defaults to "stay on the existing session" if the dialog is dismissed
	 * without a choice or fails to show — the safe, non-destructive option.
	 */
	private async _confirmRoutingSwitch(
		previousRouting: ClaudeRouting,
		requestedRouting: ClaudeRouting,
	): Promise<boolean> {
		const startNewLabel = `Start new session (${requestedRouting})`;
		const keepExistingLabel = `Keep existing session (${previousRouting})`;
		try {
			const choice = await vscode.window.showWarningMessage(
				`This @claude chat's session is running on ${routingLabel(previousRouting)}. The model you just picked routes through ${routingLabel(requestedRouting)} instead.`,
				{
					modal: true,
					detail: `Native and proxy sessions keep separate histories — one can't resume the other.\n\n`
						+ `"${startNewLabel}" begins a fresh session using the newly picked model.\n`
						+ `"${keepExistingLabel}" continues the current session; the newly picked model is ignored for this turn.`,
				},
				startNewLabel,
				keepExistingLabel,
			);
			return choice === startNewLabel;
		} catch (err) {
			this._log.warn('routing-switch confirmation failed, staying on the existing session: ' + String(err));
			return false;
		}
	}

	// ── WarmQuery Handler (Priority 3c) ────────────────────────────────────

	/**
	 * Handle a request using an existing WarmQuery session.
	 *
	 * `WarmQuery.query()` can only be called once per instance (per the SDK's
	 * own contract) — it's a one-shot handle, not a reusable session object. So
	 * we remove `entry` from `_warmSessions` before consuming it (nothing else
	 * can try to reuse this exact handle once we've started), and re-promote a
	 * fresh `WarmQuery` for the *next* turn after this one finishes, exactly
	 * mirroring how the very first warm promotion happens after a cold `query()`.
	 */
	private async _handleWithWarmQuery(
		request: vscode.ChatRequest,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken,
		options: Options,
		sessionId: string,
		_ac: AbortController,
		routing: ClaudeRouting,
		modelVendor: string | undefined,
		modelId: string,
		streamBox: StreamBox,
		permissionModeBox: PermissionModeBox,
		sessionApprovalsBox: SessionApprovalsBox,
	): Promise<vscode.ChatResult> {
		const entry = this._warmSessions.get(sessionId)!;
		clearTimeout(entry.idleTimer);
		this._warmSessions.delete(sessionId);

		// entry.warmQuery's hooks/canUseTool were fixed at startup() time, bound
		// to entry.streamBox/entry.permissionModeBox/entry.sessionApprovalsBox —
		// point them at this turn's stream, resolved permission tier, and
		// history-parsed session approvals before consuming.
		entry.streamBox.current = stream;
		entry.permissionModeBox.current = permissionModeBox.current;
		entry.sessionApprovalsBox.current = sessionApprovalsBox.current;

		this._log.debug('using WarmQuery: ' + JSON.stringify({ sessionId, model: options.model }));
		stream.progress('Continuing Claude session...');

		let routerState: RouterState = createInitialState(stream);

		try {
			const q = await entry.warmQuery.query(request.prompt);

			for await (const msg of q) {
				if (token.isCancellationRequested) { break; }
				routerState = routeSDKMessage(msg, stream, this._log, routerState);
			}

			const finalSessionId = routerState.sessionId ?? sessionId;
			const finalUsage = routerState.usage
				? { inputTokens: routerState.usage.input_tokens, outputTokens: routerState.usage.output_tokens }
				: {};

			this._log.debug('WarmQuery finished: ' + JSON.stringify({ sessionId: finalSessionId, usage: finalUsage }));

			if (routerState.error) {
				stream.markdown(`\n\n> ⚠️ Claude error: ${routerState.error}\n`);
			}

			// Re-promote a fresh WarmQuery for the next turn (deferred, in background) —
			// this one is now spent. Uses this turn's own streamBox/permissionModeBox
			// (not entry's, which belonged to the now-spent warmQuery) as the new
			// entry's boxes.
			if (finalSessionId) {
				this._promoteToWarmQuery(options, finalSessionId, streamBox, permissionModeBox, sessionApprovalsBox).catch(err => {
					this._log.error(err instanceof Error ? err : String(err), 'WarmQuery re-promotion failed');
				});
			}

			if (finalSessionId) {
				const allowedActions = serializeAllowedActions(sessionApprovalsBox.current);
				const metadata: TurnMetadata = {
					sessionId: finalSessionId,
					routing,
					modelVendor,
					modelId,
					...(Object.keys(finalUsage).length > 0 ? { tokenUsage: finalUsage } : {}),
					...(allowedActions ? { allowedActions } : {}),
				};
				return { metadata };
			}
		} catch (err) {
			const isCancellation = token.isCancellationRequested
				|| (err instanceof TypeError && (err.message === 'terminated' || err.message.includes('aborted')))
				|| (err instanceof Error && err.name === 'AbortError');
			if (!isCancellation) {
				this._log.error(err instanceof Error ? err : String(err), 'WarmQuery error');
				stream.markdown(`\n\n> ⚠️ Claude error: ${String(err)}\n`);
			}
		} finally {
			this._editTracker.flush();
		}

		return {};
	}

	/**
	 * Promote a query()-based session to a WarmQuery session.
	 * Called in the background after the first turn completes.
	 *
	 * `streamBox` is whatever box `options.hooks` was built against (see
	 * claudeOptionsBuilder.ts) — stored on the new SessionEntry so the next
	 * turn that reuses this WarmQuery can point it at its own stream.
	 */
	private async _promoteToWarmQuery(options: Options, sessionId: string, streamBox: StreamBox, permissionModeBox: PermissionModeBox, sessionApprovalsBox: SessionApprovalsBox): Promise<void> {
		try {
			const warmQuery = await startup({
				options: {
					...options,
					resume: sessionId,
				},
			});
			const entry: SessionEntry = {
				warmQuery,
				mcpServer: this._clientToolServer,
				lastUsed: Date.now(),
				streamBox,
				permissionModeBox,
				sessionApprovalsBox,
			};
			entry.idleTimer = setTimeout(() => {
				this._disposeWarmSession(sessionId).catch(err => {
					this._log.error(err instanceof Error ? err : String(err), 'idle timer dispose error');
				});
			}, WARMQUERY_IDLE_TIMEOUT_MS);
			this._warmSessions.set(sessionId, entry);
			this._log.debug('WarmQuery promoted: ' + JSON.stringify({ sessionId }));
		} catch (err) {
			this._log.error(err instanceof Error ? err : String(err), 'WarmQuery promotion failed (will fallback to query())');
		}
	}

	private async _disposeWarmSession(sessionId: string): Promise<void> {
		const entry = this._warmSessions.get(sessionId);
		if (!entry) { return; }
		clearTimeout(entry.idleTimer);
		this._warmSessions.delete(sessionId);
		try {
			await entry.warmQuery[Symbol.asyncDispose]();
		} catch (err) {
			// Subprocess may already be dead; ignore errors during disposal
			this._log.error(err instanceof Error ? err : String(err), 'WarmQuery asyncDispose error (ignored)');
		}
		this._log.debug('WarmQuery session disposed: ' + JSON.stringify({ sessionId }));
	}

	// ── Inject a steering message mid-turn (Priority 3c) ───────────────────

	/**
	 * Inject a message into an active WarmQuery session.
	 * Called externally (e.g., from a command or tool) to guide the active turn.
	 */
	async injectSteeringMessage(
		sessionId: string,
		message: string,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken,
	): Promise<void> {
		const entry = this._warmSessions.get(sessionId);
		if (!entry) {
			throw new Error(`No active WarmQuery session: ${sessionId}`);
		}

		this._log.debug('injecting steering message: ' + JSON.stringify({ sessionId, message: message.slice(0, 80) }));
		let routerState: RouterState = createInitialState(stream);

		try {
			const q = await entry.warmQuery.query(message);
			for await (const msg of q) {
				if (token.isCancellationRequested) { break; }
				routerState = routeSDKMessage(msg, stream, this._log, routerState);
			}
		} catch (err) {
			this._log.error(err instanceof Error ? err : String(err), 'steering message error');
			throw err;
		}
	}

	dispose(): void {
		// Abort any in-flight query() calls
		for (const ac of this._sessions.values()) { ac.abort(); }
		this._sessions.clear();

		// Dispose WarmQuery sessions (fire-and-forget since dispose() is sync)
		for (const [id] of this._warmSessions) {
			this._disposeWarmSession(id).catch(err => {
				this._log.error(err instanceof Error ? err : String(err), 'error disposing WarmQuery session');
			});
		}

		// Stop client-tool MCP server
		if (this._clientToolServer) {
			stopClientToolMcpServer(this._clientToolServer).catch(err => {
				this._log.error(err instanceof Error ? err : String(err), 'error stopping client-tool MCP server');
			});
			this._clientToolServer = null;
		}
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findMetaInHistory(
	history: ReadonlyArray<vscode.ChatRequestTurn | vscode.ChatResponseTurn>
): Partial<TurnMetadata> & { sessionId: string } | undefined {
	for (let i = history.length - 1; i >= 0; i--) {
		const turn = history[i];
		if ('result' in turn) {
			const meta = (turn as vscode.ChatResponseTurn).result.metadata;
			const sessionId = meta?.['sessionId'];
			if (typeof sessionId === 'string') {
				const routing = meta?.['routing'];
				const modelId = meta?.['modelId'];
				const modelVendor = meta?.['modelVendor'];
				const allowedActions = meta?.['allowedActions'];
				return {
					sessionId,
					...(routing === 'native' || routing === 'proxy' ? { routing } : {}),
					...(typeof modelId === 'string' ? { modelId } : {}),
					...(typeof modelVendor === 'string' ? { modelVendor } : {}),
					...(Array.isArray(allowedActions) ? { allowedActions } : {}),
				};
			}
		}
	}
	return undefined;
}

/** User-facing label for a routing mode, for the switch-confirmation prompt. */
function routingLabel(routing: ClaudeRouting): string {
	return routing === 'native' ? 'your Claude subscription (native)' : 'the Copilot-routed proxy';
}
