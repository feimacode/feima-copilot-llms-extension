/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from 'events';
import { AppServerClient } from './client';
import { ILogService } from '../../../platform/log/common/logService';
import type {
	Thread, Turn,
	ThreadStartParams, ThreadStartResponse,
	ThreadResumeParams, ThreadResumeResponse,
	TurnStartParams, TurnStartResponse,
	TurnInterruptParams, TurnSteerParams,
	DynamicToolCallResponse,
	McpServerToolCallParams, McpServerToolCallResponse,
	McpServerStatusListParams, McpServerStatusListResponse,
} from '../protocol/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConnectionOptions {
	binaryPath: string;
	cwd?: string;
	/** Other open workspace folders (multi-root workspaces) beyond `cwd`.
	 *  Passed to the spawned app-server as a `sandbox_workspace_write.
	 *  writable_roots` config override so codex's workspace-write sandbox
	 *  doesn't block reads/edits in them. Only takes effect for turns
	 *  started with `sandbox: 'workspace-write'`; harmless otherwise. */
	additionalDirectories?: string[];
	proxyBaseUrl?: string;
	proxyApiKey?: string;
	proxyWireApi?: 'responses' | 'messages';
	/** Additional CLI args passed to the codex binary (e.g. MCP server config). */
	extraArgs?: string[];
}

/** Render a TOML basic-string array literal for a `-c key=value` override. */
function toTomlStringArray(values: string[]): string {
	const escaped = values.map(v => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
	return `[${escaped.join(',')}]`;
}

/** Extra connection-level fields exposed to the participant */
export interface ConnectionInfo {
	/** The base URL of the proxy server, if in proxy mode */
	proxyBaseUrl?: string;
}

// ─── AppServerConnection ──────────────────────────────────────────────────────

/**
 * Transport connection to a codex app-server process. One connection handles
 * MANY threads. Per-thread event dispatch is done by inspecting `threadId`
 * on every notification and routing to a private EventEmitter per thread.
 *
 * Each call to `subscribe(threadId)` returns a private `ThreadSession`
 * EventEmitter that only receives events for that thread. Register all your
 * turn listeners on the ThreadSession, NOT on the connection itself.
 */
export class AppServerConnection extends EventEmitter {
	private readonly _client: AppServerClient;
	private readonly _options: ConnectionOptions;
	private readonly _log: ILogService;
	/** Per-thread private EventEmitters */
	private readonly _threads = new Map<string, EventEmitter>();
	/** Connection-level MCP notification handlers */
	private readonly _mcpHandlers = new Map<string, (...args: unknown[]) => void>();
	private _connected = false;
	/** Diagnostic counter to identify per-thread emitter instances in logs. */
	private _nextEmitterId = 0;

	constructor(options: ConnectionOptions, log: ILogService) {
		super();

		this._options = options;
		this._log = log;

		// Build -c overrides and env for proxy mode
		let clientEnv: NodeJS.ProcessEnv | undefined;
		let extraArgs: string[] = options.extraArgs ? [...options.extraArgs] : [];
		if (options.additionalDirectories && options.additionalDirectories.length > 0) {
			extraArgs = ['-c', `sandbox_workspace_write.writable_roots=${toTomlStringArray(options.additionalDirectories)}`, ...extraArgs];
		}
		if (options.proxyBaseUrl) {
			const wireApi = options.proxyWireApi ?? 'responses';
			const envKey = wireApi === 'messages' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
			clientEnv = { ...process.env, [envKey]: options.proxyApiKey ?? '' };
			const overrides = [
				`model_provider="vscode-proxy"`,
				`model_providers.vscode-proxy.name="VS Code Proxy"`,
				`model_providers.vscode-proxy.base_url="${options.proxyBaseUrl}/v1"`,
				`model_providers.vscode-proxy.wire_api="${wireApi}"`,
				`model_providers.vscode-proxy.env_key="${envKey}"`,
				`model_providers.vscode-proxy.requires_openai_auth=false`,
				`model_providers.vscode-proxy.supports_websockets=false`,
				`features.tool_call_mcp_elicitation=false`,
			];
			extraArgs = [...overrides.flatMap(kv => ['-c', kv]), ...extraArgs];
		} else {
			// Force codex-rs's built-in `openai` provider so a standalone-CLI
			// `model_provider` override in the user's own ~/.codex/config.toml
			// (set up for terminal use) can't hijack this "talk to OpenAI
			// directly" native path and send its models to a backend that
			// doesn't serve them.
			extraArgs = ['-c', `model_provider="openai"`, ...extraArgs];
		}

		this._client = new AppServerClient({
			binaryPath: options.binaryPath,
			cwd: options.cwd,
			env: clientEnv,
			extraArgs: extraArgs.length > 0 ? extraArgs : undefined,
		}, this._log);

		// ── THE KEY: Per-thread notification dispatch ──
		// Instead of broadcasting to all listeners on `this`, inspect the
		// notification's threadId and route to the correct per-thread emitter.
		this._client.on('notification', (notification: unknown) => {
			const n = notification as { method?: string; params?: { threadId?: string; item?: { type?: string } } };
			const threadId = n.params?.threadId;
			// Log item/started and item/completed for fileChange diagnostics
			if (n.method === 'item/started' || n.method === 'item/completed') {
				this._log.debug(`[app-server] notif: ${n.method} type=${n.params?.item?.type} ` + JSON.stringify(n.params).slice(0, 200));
			}

			// ── MCP connection-level notifications (MCP-02) ──
			if (n.method && this._mcpHandlers.has(n.method)) {
				const handler = this._mcpHandlers.get(n.method)!;
				handler(n.params);
			}

			if (threadId) {
				const session = this._threads.get(threadId);
				if (session) {
					const lc = session.listenerCount(n.method!);
					if (lc === 0) {
						this._log.warn(`[app-server] notif dispatch: ZERO listeners for '${n.method}' on threadId ${threadId}, emitterId=${(session as unknown as { __id?: number }).__id} — event will be silently dropped`);
					}
					session.emit(n.method!, n.params);
				} else if (n.method?.startsWith('item/')) {
					this._log.debug(`[app-server] WARN: no session for threadId ${threadId}, event ${n.method}`);
				}
			}

			// Also emit generic notification on connection (for connection-level observers)
			this.emit('notification', notification);
		});

		// ── Server-initiated request dispatch (approvals, tool calls, MCP) ──
		// These also carry threadId in params
		this._client.on('request', (request: unknown) => {
			const r = request as { method?: string; id: string | number; params?: { threadId?: string } };
			const threadId = r.params?.threadId;
			this._log.debug(`[app-server] request dispatch ${JSON.stringify({ method: r.method, id: r.id, threadId, knownThreads: [...this._threads.keys()] })}`);

			// ── MCP connection-level requests ──
			if (r.method && this._mcpHandlers.has(r.method)) {
				const handler = this._mcpHandlers.get(r.method)!;
				handler(r.params);
				return;
			}

			if (threadId) {
				const session = this._threads.get(threadId);
				if (session) {
					this._log.debug(`[app-server] request dispatch → session.emit('request', ...) for threadId ${threadId}, listenerCount=${session.listenerCount('request')}, emitterId=${(session as unknown as { __id?: number }).__id}`);
					session.emit('request', request);
				} else {
					this._log.debug(`[app-server] request dispatch: NO session found for threadId ${threadId}`);
				}
			}
			// Also emit on connection
			this.emit('request', request);
		});

		// Connection-level events
		this._client.on('error', (err: Error) => this.emit('error', err));
		this._client.on('stderr', (text: string) => this.emit('stderr', text));
		this._client.on('exit', (info: unknown) => {
			this._connected = false;
			this._threads.clear();
			this._mcpHandlers.clear();
			this.emit('exit', info);
		});
	}

	// ─── Lifecycle ────────────────────────────────────────────────────────────

	async connect(): Promise<void> {
		await this._client.start();
		await this._client.initialize({
			name: 'codex_vscode_poc',
			title: 'Codex VS Code POC',
			version: '0.0.1',
		});
		this._connected = true;
	}

	isConnected(): boolean { return this._connected; }

	// ─── MCP Notification Registration (MCP-02) ───────────────────────────────

	/**
	 * Register a handler for an MCP-related notification at the connection level.
	 * These fire regardless of threadId, since MCP server lifecycle events are
	 * not scoped to a single thread.
	 */
	onMcpNotification(method: string, handler: (...args: unknown[]) => void): void {
		this._mcpHandlers.set(method, handler);
	}

	// ─── Per-Thread Subscription ──────────────────────────────────────────────

	/**
	 * Get or create a private EventEmitter for a thread. All notifications
	 * and requests carrying this threadId will be routed ONLY to this emitter.
	 * Register your per-turn listeners here.
	 */
	subscribe(threadId: string): EventEmitter {
		let session = this._threads.get(threadId);
		if (!session) {
			session = new EventEmitter();
			(session as unknown as { __id: number }).__id = ++this._nextEmitterId;
			this._log.debug(`[app-server] subscribe: created NEW emitter for threadId ${threadId}, emitterId=${(session as unknown as { __id?: number }).__id}`);
			this._threads.set(threadId, session);
		} else {
			this._log.debug(`[app-server] subscribe: REUSING emitter for threadId ${threadId}, emitterId=${(session as unknown as { __id?: number }).__id}, existingRequestListeners=${session.listenerCount('request')}`);
		}
		return session;
	}

	/** Remove a thread's private emitter and all its listeners. */
	unsubscribe(threadId: string): void {
		const session = this._threads.get(threadId);
		if (session) {
			session.removeAllListeners();
			this._threads.delete(threadId);
		}
	}

	// ─── Thread Management ────────────────────────────────────────────────────

	async startThread(params: ThreadStartParams): Promise<Thread> {
		this._log.debug('[app-server] startThread params: ' + JSON.stringify({
			model: params.model,
			cwd: params.cwd,
			approvalPolicy: params.approvalPolicy,
			sandbox: params.sandbox,
			developerInstructions: params.developerInstructions ? params.developerInstructions.substring(0, 100) + '...' : undefined,
			dynamicToolsCount: params.dynamicTools?.length,
		}));
		const result = await this._client.request('thread/start', params) as ThreadStartResponse;
		return result.thread;
	}

	async resumeThread(params: ThreadResumeParams): Promise<Thread> {
		const result = await this._client.request('thread/resume', params) as ThreadResumeResponse;
		return result.thread;
	}

	// ─── Turn management ──────────────────────────────────────────────────────

	async startTurn(params: TurnStartParams): Promise<Turn> {
		const result = await this._client.request('turn/start', params) as TurnStartResponse;
		return result.turn;
	}

	/**
	 * Interrupt an in-flight turn. Mirrors agent-host `abortSession` /
	 * `codexAgent._abortSession` → `turn/interrupt`.
	 * After interruption codex emits `turn/completed` with status
	 * `interrupted`; the thread stays loaded and can accept new turns.
	 */
	async interruptTurn(params: TurnInterruptParams): Promise<void> {
		this._log.debug('[app-server] interruptTurn ' + JSON.stringify({ threadId: params.threadId, turnId: params.turnId }));
		await this._client.request('turn/interrupt', params);
	}

	/**
	 * Inject user input into a running turn. Mirrors agent-host
	 * `setPendingMessages` → `turn/steer`.
	 * Codex echoes the steered input as a `userMessage` item; the caller
	 * can promote it into a visible turn by intercepting `item/started`.
	 */
	async steerTurn(params: TurnSteerParams): Promise<void> {
		this._log.debug('[app-server] steerTurn ' + JSON.stringify({ threadId: params.threadId, expectedTurnId: params.expectedTurnId, inputLen: params.input.length }));
		await this._client.request('turn/steer', params);
	}

	// ─── Model Discovery ──────────────────────────────────────────────────────

	async listModels(includeHidden = false): Promise<Array<{ id: string; displayName?: string; label?: string; hidden?: boolean }>> {
		const result = await this._client.request('model/list', { includeHidden }) as { data?: Array<{ id: string; displayName?: string; label?: string; hidden?: boolean }> };
		return result.data ?? [];
	}

	// ─── MCP Server Status (MCP-02) ───────────────────────────────────────────

	/**
	 * Poll `mcpServerStatus/list` with cursor pagination.
	 * Used by _refreshMcpInventory to discover MCP servers and their tools.
	 */
	async listMcpServerStatuses(params: McpServerStatusListParams): Promise<McpServerStatusListResponse> {
		const result = await this._client.request('mcpServerStatus/list', params) as McpServerStatusListResponse;
		return result;
	}

	// ─── MCP Tool Call (MCP-03) ───────────────────────────────────────────────

	/**
	 * Forward an MCP tool call to the codex app-server which manages
	 * MCP connections internally. Returns the tool execution result.
	 */
	async mcpToolCall(params: McpServerToolCallParams): Promise<McpServerToolCallResponse> {
		const result = await this._client.request('mcpServer/tool/call', params) as McpServerToolCallResponse;
		return result;
	}

	// ─── Approval ─────────────────────────────────────────────────────────────

	respondToApproval(requestId: string | number, decision: 'accept' | 'acceptForSession' | 'decline' | 'cancel'): void {
		this._client.respond(requestId, { decision });
	}

	/** Respond to a dynamic tool call request. */
	respondToToolCall(requestId: string | number, response: DynamicToolCallResponse): void {
		this._client.respond(requestId, response);
	}

	/** Respond to any server-initiated request with a generic payload. */
	respondToGeneric(requestId: string | number, response: unknown): void {
		this._client.respond(requestId, response);
	}

	// ─── Teardown ─────────────────────────────────────────────────────────────

	disconnect(): void {
		this._client.stop();
		this._threads.clear();
		this._mcpHandlers.clear();
		this._connected = false;
	}
}
