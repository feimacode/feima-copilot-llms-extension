/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { query, startup, getSessionInfo, type Options } from '@anthropic-ai/claude-agent-sdk';
import type { WarmQuery } from '@anthropic-ai/claude-agent-sdk';
import { ProxyManager } from '../common/proxy/proxyManager';
import { routeSDKMessage, createInitialState, type RouterState } from './claudeMessageRouter';
import { buildClaudeOptions, type OptionsBuilderInput } from './claudeOptionsBuilder';
import { startClientToolMcpServer, stopClientToolMcpServer, type ClientToolMcpServer } from './clientToolMcpServer';
import { resolveBinary } from '../common/appServer/client';
import { ILogService } from '../../platform/log/common/logService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TurnMetadata {
	/** Persisted SDK session ID so subsequent turns can resume. */
	sessionId: string;
	/** Token usage if available */
	tokenUsage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
}

/** Per-session state for WarmQuery sessions (Priority 3c). */
interface SessionEntry {
	warmQuery: WarmQuery;
	mcpServer: ClientToolMcpServer | null;
	lastUsed: number; // timestamp
	idleTimer?: NodeJS.Timeout;
}

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
		// The proxy is started once in registerAgents(); wait for it to be ready
		// before reading its URL/nonce for the SDK options env.
		await this.proxyManager.ready;
		const info = this.proxyManager.info;
		const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

		// ── 1. Session management ────────────────────────────────────────────
		const savedMeta = findMetaInHistory(context.history);
		let savedSessionId = savedMeta?.sessionId;

		// Verify the saved session still exists on disk before attempting resume.
		// Sessions can be lost after extension reload, CLI cleanup, or if the
		// project directory hash changed. Fall back to a fresh session if gone.
		if (savedSessionId) {
			try {
				const sessionInfo = await getSessionInfo(savedSessionId, { dir: cwd });
				if (!sessionInfo) {
					this._log.warn('saved session not found on disk, starting fresh: ' + savedSessionId);
					savedSessionId = undefined;
				}
			} catch (err) {
				this._log.warn('failed to verify session, starting fresh: ' + String(err));
				savedSessionId = undefined;
			}
		}
		this._log.debug('session lookup: ' + JSON.stringify({ savedSessionId, historyLength: context.history.length }));

		const ac = new AbortController();
		if (savedSessionId) {
			this._sessions.set(savedSessionId, ac);
		}
		const cancellationSub = token.onCancellationRequested(() => ac.abort());

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
			proxyInfo: { messagesUrl: info.messagesUrl, messagesNonce: info.messagesNonce },
			request,
			token,
			savedSessionId,
			storagePath: this.storagePath,
			cwd,
			claudeBinaryPath,
		};
		const options = buildClaudeOptions(optionsInput);
		options.abortController = ac;

		// ── 2b. Merge user-configured MCP servers from settings ─────────────
		const userMcpServers = vscode.workspace.getConfiguration('feima.agents.claude')
			.get<Record<string, unknown>>('mcpServers');
		if (userMcpServers && typeof userMcpServers === 'object') {
			for (const [name, config] of Object.entries(userMcpServers)) {
				(options.mcpServers ??= {})[name] = config as never;
			}
			this._log.debug(`merged ${Object.keys(userMcpServers).length} user MCP server(s) into options`);
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
				request, stream, token, options, savedSessionId, ac,
			);
		}

		// ── 5. Run SDK query (standard path) ──────────────────────────────────
		this._log.debug('starting query: ' + JSON.stringify({
			prompt: request.prompt.slice(0, 120),
			resume: savedSessionId ?? '(new)',
			modelId: request.model.id,
			permissionMode: options.permissionMode,
		}));
		stream.progress(savedSessionId ? 'Resuming Claude session...' : 'Starting Claude session...');

		let finalSessionId: string | undefined = savedSessionId;
		let finalUsage: { inputTokens?: number; outputTokens?: number } = {};
		let routerState: RouterState = createInitialState();

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
				this._promoteToWarmQuery(options, finalSessionId).catch(err => {
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
		}

		// ── 6. Persist session ID for the next turn ───────────────────────────
		if (finalSessionId) {
			const metadata: TurnMetadata = {
				sessionId: finalSessionId,
				...(Object.keys(finalUsage).length > 0 ? { tokenUsage: finalUsage } : {}),
			};
			this._log.debug('returning metadata: ' + JSON.stringify(metadata));
			return { metadata };
		}
		return {};
	}

	// ── WarmQuery Handler (Priority 3c) ────────────────────────────────────

	/**
	 * Handle a request using an existing WarmQuery session.
	 * Supports mid-turn steering via warm.query().
	 */
	private async _handleWithWarmQuery(
		request: vscode.ChatRequest,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken,
		options: Options,
		sessionId: string,
		_ac: AbortController,
	): Promise<vscode.ChatResult> {
		const entry = this._warmSessions.get(sessionId)!;
		entry.lastUsed = Date.now();

		this._log.debug('using WarmQuery: ' + JSON.stringify({ sessionId, model: options.model }));
		stream.progress('Continuing Claude session...');

		let routerState: RouterState = createInitialState();

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

			if (finalSessionId) {
				return {
					metadata: {
						sessionId: finalSessionId,
						...(Object.keys(finalUsage).length > 0 ? { tokenUsage: finalUsage } : {}),
					},
				};
			}
		} catch (err) {
			const isCancellation = token.isCancellationRequested
				|| (err instanceof TypeError && (err.message === 'terminated' || err.message.includes('aborted')))
				|| (err instanceof Error && err.name === 'AbortError');
			if (!isCancellation) {
				this._log.error(err instanceof Error ? err : String(err), 'WarmQuery error');
				stream.markdown(`\n\n> ⚠️ Claude error: ${String(err)}\n`);
			}
		}

		return {};
	}

	/**
	 * Promote a query()-based session to a WarmQuery session.
	 * Called in the background after the first turn completes.
	 */
	private async _promoteToWarmQuery(options: Options, sessionId: string): Promise<void> {
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
		let routerState: RouterState = createInitialState();

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
): TurnMetadata | undefined {
	for (let i = history.length - 1; i >= 0; i--) {
		const turn = history[i];
		if ('result' in turn) {
			const meta = (turn as vscode.ChatResponseTurn).result.metadata;
			const sessionId = meta?.['sessionId'];
			if (typeof sessionId === 'string') { return { sessionId }; }
		}
	}
	return undefined;
}
