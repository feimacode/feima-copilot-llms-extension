/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AppServerConnection } from '../common/appServer/connection';
import { resolveBinary } from '../common/appServer/client';
import { CODEX_PROVIDER_ID } from './codexModelProvider';
import { ProxyManager } from '../common/proxy/proxyManager';
import { DynamicToolManager } from '../common/tools/dynamicToolManager';
import { VS_CODE_TOOL_INSTRUCTIONS } from '../common/constants/toolInstructions';
import { PendingRequestRegistry } from '../common/util/pendingRequestRegistry';
import { ILogService } from '../../platform/log/common/logService';
import type {
	DynamicToolSpec,
	Thread, DynamicToolCallParams, DynamicToolCallResponse,
	AgentMessageDeltaNotification,
	TurnCompletedNotification,
	ItemStartedNotification,
	ItemCompletedNotification,
	ReasoningSummaryTextDeltaNotification,
	ReasoningTextDeltaNotification,
	CommandExecutionOutputDeltaNotification,
	FileChangePatchUpdatedNotification,
	McpToolCallProgressNotification,
	ThreadTokenUsageUpdatedNotification,
	CommandExecutionRequestApprovalParams,
	FileChangeRequestApprovalParams,
	FileUpdateChange,
	McpServerStatusUpdatedNotification,
	McpServerToolCallParams,
	McpServerToolCallResponse,
	ToolRequestUserInputParams,
	ToolRequestUserInputAnswer,
	ToolRequestUserInputResponse,
	McpServerElicitationRequestParams,
	McpServerElicitationRequestResponse,
	McpInventoryEntry,
	McpServerStatusListParams,
} from '../common/protocol/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TurnMetadata {
	threadId: string;
}

type ApprovalDecision = 'accept' | 'acceptForSession' | 'decline' | 'cancel';

/**
 * Per-session state. Mirrors agent-host's ICodexSession in codexAgent.ts.
 */
interface SessionState {
	/** The active codex Thread for this session. */
	thread: Thread;
	/** The last tool hash used for this session. */
	lastToolsHash: string | null;
	/** The current app-server turn id while a turn is in-flight. */
	currentAppTurnId?: string;
	/** Per-turn file change cache — mirrors agent-host's ICodexSessionMapState.itemToToolCall */
	pendingFileChanges: Map<string, FileUpdateChange[]>;
	/** Parked command-execution approval requests. */
	pendingCommandApprovals: PendingRequestRegistry<ApprovalDecision>;
	/** Parked file-change approval requests. */
	pendingFileChangeApprovals: PendingRequestRegistry<ApprovalDecision>;
	/** Parked dynamic tool call requests. */
	pendingToolCalls: PendingRequestRegistry<DynamicToolCallResponse>;
	/** Parked MCP tool approval requests. */
	pendingMcpApprovals: PendingRequestRegistry<ApprovalDecision>;
	/** Whether a turn is currently active (item stream is being processed). */
	turnActive: boolean;
	/** Resolve when the turn completes (success or failure). */
	turnDone: Promise<void>;
	turnResolve: () => void;
	turnReject: (err: Error) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ChatTurnWithMetadata {
	result?: {
		metadata?: Partial<TurnMetadata>;
	};
}

function findMetaInHistory(history: readonly (vscode.ChatRequestTurn | vscode.ChatResponseTurn)[]): TurnMetadata | null {
	for (let i = history.length - 1; i >= 0; i--) {
		const turn = history[i];
		if (turn instanceof vscode.ChatRequestTurn) {
			const meta = (turn as unknown as ChatTurnWithMetadata).result?.metadata;
			if (meta?.threadId) {
				return { threadId: meta.threadId };
			}
		}
	}
	return null;
}

function hashTools(tools: DynamicToolSpec[]): string {
	const names = tools.map(t => t.name).sort().join(',');
	let hash = 0;
	for (let i = 0; i < names.length; i++) {
		hash = ((hash << 5) - hash) + names.charCodeAt(i);
		hash |= 0;
	}
	return String(Math.abs(hash));
}

/** Build MCP server CLI args from VS Code configuration.
 *  Follows agent-host pattern: -c mcp_servers.<name>.<field>=<value>
 */
function buildMcpConfigArgs(): string[] {
	const mcpServers = vscode.workspace.getConfiguration('feima.agents.codex').get<Record<string, unknown>>('mcpServers');
	if (!mcpServers || typeof mcpServers !== 'object') {
		return [];
	}
	const args: string[] = [];
	for (const [name, config] of Object.entries(mcpServers)) {
		if (!config || typeof config !== 'object') { continue; }
		const cfg = config as Record<string, unknown>;
		if (typeof cfg.command === 'string') {
			args.push('-c', `mcp_servers.${name}.command=${cfg.command}`);
		}
		if (Array.isArray(cfg.args) && cfg.args.length > 0) {
			args.push('-c', `mcp_servers.${name}.args=${JSON.stringify(cfg.args)}`);
		}
		if (cfg.env && typeof cfg.env === 'object') {
			for (const [k, v] of Object.entries(cfg.env as Record<string, unknown>)) {
				args.push('-c', `mcp_servers.${name}.env.${k}=${String(v)}`);
			}
		}
		if (typeof cfg.url === 'string') {
			args.push('-c', `mcp_servers.${name}.url=${cfg.url}`);
		}
	}
	return args;
}

/** Duration-guard timeout for forced cleanup after turn/interrupt. */
const INTERRUPT_TIMEOUT_MS = 5_000;

// ─── Participant ────────────────────────────────────────────────────────────────

export class CodexParticipant {
	private nativeConn: AppServerConnection | null = null;
	private proxyConn: AppServerConnection | null = null;
	/** Per-session state keyed by threadId. */
	private readonly _sessions = new Map<string, SessionState>();
	/** MCP server inventory — mirrors agent-host's _mcpInventory. */
	private _mcpInventory: Map<string, McpInventoryEntry> = new Map();

	constructor(
		private readonly proxyManager: ProxyManager,
		private readonly _toolManager: DynamicToolManager,
		private readonly _log: ILogService,
	) {
		this._onConnectionExit = this._onConnectionExit.bind(this);
	}

	private _onConnectionExit(): void {
		for (const session of this._sessions.values()) {
			session.pendingCommandApprovals.denyAll('cancel');
			session.pendingFileChangeApprovals.denyAll('cancel');
			session.pendingToolCalls.rejectAll(new Error('Codex app-server disconnected'));
			session.pendingMcpApprovals.denyAll('cancel');
			if (session.turnActive) {
				session.turnActive = false;
				session.currentAppTurnId = undefined;
				session.turnReject(new Error('Codex app-server disconnected; session must restart.'));
			}
		}
	}

	private _ensureConnection(routing: 'native' | 'proxy', binaryPath: string, cwd?: string): AppServerConnection {
		if (routing === 'native') {
			if (!this.nativeConn) {
				const mcpArgs = buildMcpConfigArgs();
				this.nativeConn = new AppServerConnection({ binaryPath, cwd, extraArgs: mcpArgs }, this._log);
				this.nativeConn.on('exit', this._onConnectionExit);
				this._setupMcpHandlers(this.nativeConn);
			}
			return this.nativeConn;
		}
		if (!this.proxyConn) {
			const info = this.proxyManager.info;
			const mcpArgs = buildMcpConfigArgs();
			this.proxyConn = new AppServerConnection({ binaryPath, cwd, proxyBaseUrl: info.responsesUrl, proxyApiKey: info.responsesNonce, extraArgs: mcpArgs }, this._log);
			this.proxyConn.on('exit', this._onConnectionExit);
			this._setupMcpHandlers(this.proxyConn);
		}
		return this.proxyConn;
	}

	// ── MCP Inventory Management (MCP-02) ──────────────────────────────────

	/**
	 * Register MCP notification handlers on a connection.
	 * Must be called once per connection before the connection is used.
	 */
	private _setupMcpHandlers(conn: AppServerConnection): void {
		// Handle MCP server startup status updates
		conn.onMcpNotification('mcpServer/startupStatus/updated', (...args) => {
			const params = args[0] as McpServerStatusUpdatedNotification;
			const existing = this._mcpInventory.get(params.serverName);
			const entry: McpInventoryEntry = {
				name: params.serverName,
				status: params.status,
				error: params.error,
				tools: existing?.tools,
			};
			this._mcpInventory.set(params.serverName, entry);
			this._log.debug(`mcp server status ${JSON.stringify({ server: params.serverName, status: params.status, error: params.error })}`);

			if (params.status === 'ready') {
				// Refresh inventory to get tools when a server becomes ready
				void this._refreshMcpInventory(conn);
			}
		});
	}

	/**
	 * Poll `mcpServerStatus/list` with cursor pagination to refresh the
	 * full MCP inventory. Mirrors agent-host codexAgent.ts pattern.
	 */
	private async _refreshMcpInventory(conn: AppServerConnection): Promise<void> {
		try {
			let cursor: string | undefined;
			do {
				const params: McpServerStatusListParams = { limit: 50 };
				if (cursor) { params.cursor = cursor; }
				const result = await conn.listMcpServerStatuses(params);
				for (const server of result.data) {
					const existing = this._mcpInventory.get(server.serverName);
					const entry: McpInventoryEntry = {
						name: server.serverName,
						status: server.status,
						tools: server.tools ?? existing?.tools,
						error: server.error,
					};
					this._mcpInventory.set(server.serverName, entry);
					this._log.debug(`mcp inventory ${JSON.stringify({ server: server.serverName, status: server.status, tools: server.tools?.length ?? 0 })}`);
				}
				cursor = result.nextCursor;
			} while (cursor);
		} catch (err) {
			this._log.error(err instanceof Error ? err : String(err), '_refreshMcpInventory failed');
		}
	}

	/**
	 * Poll MCP inventory after connection is established.
	 * Called from handleRequest after connect().
	 */
	private async _initMcpInventory(conn: AppServerConnection): Promise<void> {
		try {
			await this._refreshMcpInventory(conn);
		} catch (err) {
			this._log.error(err instanceof Error ? err : String(err), '_initMcpInventory failed');
		}
	}

	/**
	 * Send `turn/interrupt` to the codex app-server and wait for the
	 * `turn/completed` notification (or a timeout) before cleaning up.
	 * Mirrors agent-host `codexAgent.abortSession`.
	 */
	private async _interruptTurn(
		conn: AppServerConnection,
		session: SessionState,
	): Promise<void> {
		const appTurnId = session.currentAppTurnId;
		const threadId = session.thread.id;
		if (!session.turnActive || !appTurnId) {
			return;
		}
		this._log.debug(`interrupting turn ${JSON.stringify({ threadId, turnId: appTurnId })}`);
		try {
			await conn.interruptTurn({ threadId, turnId: appTurnId });
			// Await the `turn/completed` notification that codex fires after
			// interruption, but cap with a timeout so we never hang.
			await Promise.race([
				session.turnDone,
				new Promise<void>(resolve => setTimeout(resolve, INTERRUPT_TIMEOUT_MS)),
			]);
		} catch (err) {
			this._log.error(err instanceof Error ? err : String(err), 'turn/interrupt failed');
		}
		// Force-cleanup in case the notification never arrived.
		if (session.turnActive) {
			session.turnActive = false;
			session.currentAppTurnId = undefined;
			session.pendingCommandApprovals.denyAll('cancel');
			session.pendingFileChangeApprovals.denyAll('cancel');
			session.pendingMcpApprovals.denyAll('cancel');
			session.pendingToolCalls.rejectAll(new Error('Request cancelled'));
			session.turnResolve();
		}
	}

	async handleRequest(
		request: vscode.ChatRequest,
		context: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken,
	): Promise<vscode.ChatResult> {
		const routing: 'native' | 'proxy' = request.model.vendor === CODEX_PROVIDER_ID ? 'native' : 'proxy';
		this._log.debug(`routing ${JSON.stringify({ modelId: request.model.id, routing })}`);

		if (routing === 'proxy') {
			await this.proxyManager.ready;
		}

		const binaryPath = resolveBinary(vscode.workspace.getConfiguration('feima.agents.codex').get<string>('binaryPath') ?? '');
		const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
		const conn = this._ensureConnection(routing, binaryPath, cwd);

		if (!conn.isConnected()) {
			stream.progress('Connecting to Codex...');
			await conn.connect();
			// Initialize MCP inventory after connection (MCP-02)
			await this._initMcpInventory(conn);
		}

		const savedMeta = findMetaInHistory(context.history);
		const savedThreadId = savedMeta?.threadId;
		this._log.debug(`session lookup ${JSON.stringify({ savedThreadId, routing })}`);

		// ── Dynamic tool discovery ──
		const dynamicTools = await this._toolManager.buildDynamicTools();
		this._log.debug(`dynamic tools built ${JSON.stringify({ count: dynamicTools.length, names: dynamicTools.map(t => t.name).slice(0, 20) })}`);
		const newToolsHash = hashTools(dynamicTools);

		let codexThread: Thread;
		let session = savedThreadId ? this._sessions.get(savedThreadId) : undefined;
		const toolsChanged = session?.lastToolsHash !== null && session?.lastToolsHash !== newToolsHash;

		if (savedThreadId) {
			if (session) {
				if (toolsChanged) {
					stream.progress('Tool set changed; continuing with current session (new tools ignored).');
					this._log.debug(`tools changed for existing session; ignoring new tools ${JSON.stringify({ threadId: session.thread.id, oldHash: session.lastToolsHash, newHash: newToolsHash })}`);
				}
				codexThread = session.thread;
			} else {
				stream.progress('Resuming session...');
				try {
					codexThread = await conn.resumeThread({ threadId: savedThreadId, excludeTurns: true });
				} catch (err) {
					this._log.error(err instanceof Error ? err : String(err), 'resume failed');
					stream.progress('Starting new session...');
					codexThread = await conn.startThread({
						model: request.model.id, cwd,
						approvalPolicy: 'untrusted', sandbox: 'workspace-write',
						dynamicTools, developerInstructions: VS_CODE_TOOL_INSTRUCTIONS,
					});
				}
			}
		} else {
			stream.progress('Starting new session...');
			codexThread = await conn.startThread({
				model: request.model.id, cwd,
				approvalPolicy: 'untrusted', sandbox: 'workspace-write',
				dynamicTools, developerInstructions: VS_CODE_TOOL_INSTRUCTIONS,
			});
		}

		// ── Set up per-session state ──
		session = this._sessions.get(codexThread.id);
		if (!session) {
			let turnResolve!: () => void;
			let turnReject!: (err: Error) => void;
			const turnDone = new Promise<void>((resolve, reject) => { turnResolve = resolve; turnReject = reject; });
			session = {
				thread: codexThread,
				lastToolsHash: newToolsHash,
				pendingFileChanges: new Map(),
				pendingCommandApprovals: new PendingRequestRegistry(),
				pendingFileChangeApprovals: new PendingRequestRegistry(),
				pendingToolCalls: new PendingRequestRegistry(),
				pendingMcpApprovals: new PendingRequestRegistry(),
				turnActive: false,
				turnDone,
				turnResolve,
				turnReject,
			};
			this._sessions.set(codexThread.id, session);
		}

		// Start a new turn
		session.turnActive = true;
		session.pendingFileChanges.clear();

		const ts = conn.subscribe(codexThread.id);

		// ── Agent delta ──
		ts.on('item/agentMessage/delta', (p: AgentMessageDeltaNotification) => { stream.markdown(p.delta); });

		// ── Turn lifecycle ──
		ts.on('turn/completed', (p: TurnCompletedNotification) => {
			session!.turnActive = false;
			session!.currentAppTurnId = undefined;
			if (p.turn.status === 'failed') {
				session!.pendingCommandApprovals.denyAll('cancel');
				session!.pendingFileChangeApprovals.denyAll('cancel');
				session!.pendingMcpApprovals.denyAll('cancel');
				const errMsg = p.turn.error?.message ?? vscode.l10n.t('Turn failed without error details');
				stream.markdown(`\n\n❌ **${vscode.l10n.t('Error')}:** ${errMsg}\n`);
				session!.turnReject(new Error(errMsg));
				return;
			}
			if (p.turn.status === 'interrupted') {
				session!.pendingCommandApprovals.denyAll('cancel');
				session!.pendingFileChangeApprovals.denyAll('cancel');
				session!.pendingMcpApprovals.denyAll('cancel');
				stream.markdown(`\n\n⏹️ *${vscode.l10n.t('Turn was cancelled.')}*\n`);
				session!.turnResolve();
				return;
			}
			if (session!.pendingCommandApprovals.size > 0 || session!.pendingFileChangeApprovals.size > 0 || session!.pendingMcpApprovals.size > 0) {
				this._log.debug(`turn completed with unresolved approvals ${JSON.stringify({
					command: session!.pendingCommandApprovals.size,
					fileChange: session!.pendingFileChangeApprovals.size,
					mcp: session!.pendingMcpApprovals.size,
				})}`);
			}
			session!.turnResolve();
		});

		// ── Reasoning ──
		let thinkingOpen = false;
		ts.on('item/reasoning/summaryPartAdded', () => {
			thinkingOpen = true;
			stream.thinkingProgress!({ id: 'reasoning', text: 'Thinking…' });
		});
		ts.on('item/reasoning/summaryTextDelta', (p: ReasoningSummaryTextDeltaNotification) => {
			if (!thinkingOpen) { stream.thinkingProgress!({ id: 'reasoning', text: 'Thinking…' }); thinkingOpen = true; }
			stream.thinkingProgress!({ id: p.itemId, text: p.delta });
		});
		ts.on('item/reasoning/textDelta', (p: ReasoningTextDeltaNotification) => {
			if (!thinkingOpen) { stream.thinkingProgress!({ id: 'reasoning', text: 'Thinking…' }); thinkingOpen = true; }
			stream.thinkingProgress!({ id: p.itemId, text: p.delta });
		});

		let progressLabel = '';
		const setProgress = (label: string) => {
			if (label !== progressLabel) { progressLabel = label; stream.progress(label); }
		};

		// ── Tool lifecycle ──
		ts.on('item/started', (p: ItemStartedNotification) => {
			const item = p.item;
			this._log.debug(`item/started ${item.type} ${item.id.slice(0, 13)}`);
			if (item.type === 'commandExecution') {
				const cmd = item.command || item.commandActions?.map(a => a.command).join(' | ') || 'command';
				setProgress(`Running ${cmd.slice(0, 80)}`);
			} else if (item.type === 'fileChange') {
				session!.pendingFileChanges.set(item.id, item.changes);
				const diffs = item.changes.map(c => {
					const kind = c.kind.type === 'update' && (c.kind as { move_path?: string }).move_path
						? `rename from ${(c.kind as { move_path?: string }).move_path}`
						: c.kind.type;
					return `### ${kind}: \`${c.path}\`\n\`\`\`diff\n${c.diff}\n\`\`\``;
				});
				stream.markdown(diffs.join('\n\n') + '\n');
				setProgress('Applying file changes…');
			} else if (item.type === 'webSearch') {
				setProgress(`Searching ${item.query || 'web'}…`);
			} else if (item.type === 'mcpToolCall') {
				setProgress(`Calling ${item.server}.${item.tool}…`);
			} else if (item.type === 'dynamicToolCall') {
				const name = item.namespace ? `${item.namespace}.${item.tool}` : item.tool;
				setProgress(`Calling ${name}…`);
			} else if (item.type === 'userMessage') {
				// `userMessage` items are codex's echo of the user turn and are ignored
				// until steering support is implemented in a later phase.
			}
		});

		ts.on('item/completed', (p: ItemCompletedNotification) => {
			const item = p.item;
			if (item.type === 'commandExecution') {
				if (outputBlockOpen) { outputBlockOpen = false; stream.markdown('\n```\n'); }
				const ok = item.status === 'completed' && (item.exitCode === 0 || item.exitCode === null);
				setProgress(ok ? 'Continuing…' : 'Tool failed');
			} else if (item.type === 'fileChange') {
				setProgress('Continuing…');
				session!.pendingFileChanges.delete(item.id);
			} else if (item.type === 'mcpToolCall') {
				setProgress('Continuing…');
			} else if (item.type === 'dynamicToolCall') {
				setProgress('Continuing…');
			} else if (item.type === 'reasoning') {
				thinkingOpen = false;
			} else if (item.type === 'webSearch') {
				setProgress('Continuing…');
			}
		});

		// ── Command output streaming ──
		let outputBlockOpen = false;
		ts.on('item/commandExecution/outputDelta', (p: CommandExecutionOutputDeltaNotification) => {
			if (!outputBlockOpen) { outputBlockOpen = true; stream.markdown('\n```\n'); }
			stream.markdown(p.delta);
		});
		ts.on('item/fileChange/patchUpdated', (p: FileChangePatchUpdatedNotification) => { session!.pendingFileChanges.set(p.itemId, p.changes); });

		// ── MCP tool progress (MCP-07): stream progress messages instead of no-op ──
		ts.on('item/mcpToolCall/progress', (p: McpToolCallProgressNotification) => {
			if (p.message) {
				stream.progress(`MCP: ${p.message}`);
			}
		});

		ts.on('thread/tokenUsage/updated', (p: ThreadTokenUsageUpdatedNotification) => { if (p.tokenUsage.last) { this._log.debug(`token usage ${JSON.stringify(p.tokenUsage.last)}`); } });
		ts.on('error', (err: Error) => {
			session!.turnActive = false;
			session!.currentAppTurnId = undefined;
			session!.pendingCommandApprovals.denyAll('cancel');
			session!.pendingFileChangeApprovals.denyAll('cancel');
			session!.pendingMcpApprovals.denyAll('cancel');
			session!.pendingToolCalls.rejectAll(err);
			session!.turnReject(err);
		});
		conn.on('error', (err: Error) => {
			session!.turnActive = false;
			session!.currentAppTurnId = undefined;
			session!.pendingCommandApprovals.denyAll('cancel');
			session!.pendingFileChangeApprovals.denyAll('cancel');
			session!.pendingMcpApprovals.denyAll('cancel');
			session!.pendingToolCalls.rejectAll(err);
			session!.turnReject(err);
		});

		// ── Requests (approval + dynamic tool calls + MCP) ──
		ts.on('request', (req: unknown) => { void this._onRequest(request, stream, token, conn, session!, req); });

		// ── Turn cancellation (§8): send turn/interrupt BEFORE rejecting ──
		// Mirrors agent-host `codexAgent.abortSession` → `turn/interrupt`.
		const cancelSub = token.onCancellationRequested(() => {
			this._log.debug(`cancellation requested ${JSON.stringify({ threadId: codexThread.id, appTurnId: session!.currentAppTurnId })}`);
			void this._interruptTurn(conn, session!);
		});

		session.lastToolsHash = newToolsHash;
		this._log.debug(`starting turn ${JSON.stringify({ prompt: request.prompt.slice(0, 120), threadId: codexThread.id, modelId: request.model.id })}`);
		try {
			const startResult = await conn.startTurn({ threadId: codexThread.id, input: [{ type: 'text', text: request.prompt }], model: request.model.id, approvalPolicy: 'untrusted' });
			// Store the app-server turn id for cancellation (§8) and steering (§9).
			session.currentAppTurnId = startResult.id;
			await session.turnDone;
		} finally {
			ts.removeAllListeners();
			conn.removeAllListeners('error');
			cancelSub.dispose();
		}

		return { metadata: { threadId: codexThread.id } };
	}

	// ── Request dispatch (MCP-03, MCP-04, MCP-05, MCP-12) ──────────────────

	private async _onRequest(
		request: vscode.ChatRequest, stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken, conn: AppServerConnection,
		session: SessionState, r: unknown,
	): Promise<void> {
		const msg = r as { method: string; id: string | number; params: Record<string, unknown> };
		if (!msg?.method) { return; }

		if (msg.method.includes('requestApproval')) {
			await new Promise<void>(resolve => setImmediate(resolve));

			if (msg.method === 'item/commandExecution/requestApproval') {
				await this._approveCommand(request, stream, token, conn, msg.id, session, msg.params as unknown as CommandExecutionRequestApprovalParams);
			} else if (msg.method === 'item/fileChange/requestApproval') {
				await this._approveFileChange(request, stream, token, conn, msg.id, session, msg.params as unknown as FileChangeRequestApprovalParams);
			} else {
				conn.respondToApproval(msg.id, 'accept');
			}
		} else if (msg.method === 'item/tool/call') {
			const p = msg.params as unknown as DynamicToolCallParams;
			void this._handleToolCall(request, token, conn, msg.id, session, p);
		// ── MCP Tool Call Routing (MCP-03, MCP-12) ──
		} else if (msg.method === 'mcpServer/tool/call') {
			const p = msg.params as unknown as McpServerToolCallParams;
			await this._handleMcpToolCall(request, token, conn, msg.id, session, p);
		// ── MCP Tool Approval (MCP-04) ──
		} else if (msg.method === 'item/tool/requestUserInput') {
			const p = msg.params as unknown as ToolRequestUserInputParams;
			await this._handleMcpApproval(request, stream, token, conn, msg.id, session, p);
		// ── MCP Elicitation (MCP-05) ──
		} else if (msg.method === 'mcpServer/elicitation/request') {
			const p = msg.params as unknown as McpServerElicitationRequestParams;
			await this._handleMcpElicitation(request, token, conn, msg.id, session, p);
		}
	}

	// ── MCP Tool Call Handler (MCP-03, MCP-12) ─────────────────────────────

	/**
	 * Handle an `mcpServer/tool/call` RPC from the Codex app-server.
	 * Forwards the call to the codex app-server which manages MCP server connections.
	 * This is a passthrough — the app-server already has the MCP connection; the host
	 * just needs to acknowledge the call.
	 */
	private async _handleMcpToolCall(
		request: vscode.ChatRequest,
		token: vscode.CancellationToken,
		conn: AppServerConnection,
		requestId: string | number,
		session: SessionState,
		params: McpServerToolCallParams,
	): Promise<void> {
		this._log.debug(`mcp tool call ${JSON.stringify({ server: params.serverName, tool: params.toolName, threadId: params.threadId })}`);

		// Defensive: ensure a thread is materialized (MCP-08)
		if (!session.thread?.id) {
			this._log.error(new Error('No thread'), 'MCP tool call before thread materialized');
			conn.respondToGeneric(requestId, {
				content: [{ type: 'text', text: 'Error: No active thread for MCP tool call.' }],
				isError: true,
			} as McpServerToolCallResponse);
			return;
		}

		try {
			// The codex app-server manages MCP connections internally.
			// Forward the request to the app-server which will execute the tool
			// via its own MCP connection manager.
			const response = await conn.mcpToolCall(params);
			conn.respondToGeneric(requestId, response);
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown MCP tool error';
			this._log.error(err instanceof Error ? err : String(err), `mcp tool call "${params.serverName}.${params.toolName}" failed`);
			conn.respondToGeneric(requestId, {
				content: [{ type: 'text', text: `Error: ${message}` }],
				isError: true,
			} as McpServerToolCallResponse);
		}
	}

	// ── MCP Tool Approval Handler (MCP-04) ─────────────────────────────────

	/**
	 * Handle `item/tool/requestUserInput` for MCP tool approvals.
	 * Codex surfaces MCP approvals with question IDs prefixed `mcp_tool_call_approval_`.
	 * The host intercepts and shows a confirmation dialog, answering `Allow` or `__codex_mcp_decline__`.
	 */
	private async _handleMcpApproval(
		request: vscode.ChatRequest,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken,
		conn: AppServerConnection,
		requestId: string | number,
		session: SessionState,
		params: ToolRequestUserInputParams,
	): Promise<void> {
		// Check if any question is an MCP tool approval
		const mcpApprovalQ = params.questions.find(q => q.id.startsWith('mcp_tool_call_approval_'));
		if (!mcpApprovalQ) {
			// Non-MCP requestUserInput — respond with defaults
			const answers: ToolRequestUserInputAnswer[] = params.questions.map(q => ({
				questionId: q.id,
				value: q.defaultValue ?? '',
			}));
			conn.respondToGeneric(requestId, { answers } as ToolRequestUserInputResponse);
			return;
		}

		stream.progress(`MCP tool approval: ${mcpApprovalQ.label}`);
		const key = String(requestId);
		session.pendingMcpApprovals.register(key);

		try {
			const r = await vscode.lm.invokeTool('vscode_get_confirmation', {
				input: {
					title: `MCP Tool: ${mcpApprovalQ.label}`,
					message: mcpApprovalQ.description ?? 'Codex wants to call an MCP tool. Allow?',
					confirmationType: 'basic',
				},
				toolInvocationToken: request.toolInvocationToken,
			}, token);
			const v = (r.content.at(0) as { value?: unknown } | undefined)?.value;
			const approved = typeof v === 'string' && v.toLowerCase() === 'yes';

			const answers: ToolRequestUserInputAnswer[] = params.questions.map(q => ({
				questionId: q.id,
				value: q.id.startsWith('mcp_tool_call_approval_')
					? (approved ? 'Allow' : '__codex_mcp_decline__')
					: q.defaultValue ?? '',
			}));
			conn.respondToGeneric(requestId, { answers } as ToolRequestUserInputResponse);
			session.pendingMcpApprovals.respond(key, approved ? 'accept' : 'decline');
		} catch {
			try {
				conn.respondToGeneric(requestId, {
					answers: params.questions.map(q => ({
						questionId: q.id,
						value: q.id.startsWith('mcp_tool_call_approval_') ? '__codex_mcp_decline__' : (q.defaultValue ?? ''),
					})),
				} as ToolRequestUserInputResponse);
			} catch { /* connection dead */ }
			session.pendingMcpApprovals.respond(key, 'cancel');
		}
	}

	// ── MCP Elicitation Handler (MCP-05) ───────────────────────────────────

	/**
	 * Handle `mcpServer/elicitation/request` — host-side replacement for MCP
	 * elicitation since `features.tool_call_mcp_elicitation=false` is passed.
	 */
	private async _handleMcpElicitation(
		request: vscode.ChatRequest,
		token: vscode.CancellationToken,
		conn: AppServerConnection,
		requestId: string | number,
		session: SessionState,
		params: McpServerElicitationRequestParams,
	): Promise<void> {
		this._log.debug(`mcp elicitation ${JSON.stringify({ server: params.serverName, message: params.message })}`);

		try {
			const r = await vscode.lm.invokeTool('vscode_get_confirmation', {
				input: {
					title: `MCP Server "${params.serverName}" Requests`,
					message: params.message || 'The MCP server is requesting user input.',
					confirmationType: 'basic',
				},
				toolInvocationToken: request.toolInvocationToken,
			}, token);
			const v = (r.content.at(0) as { value?: unknown } | undefined)?.value;
			const approved = typeof v === 'string' && v.toLowerCase() === 'yes';
			conn.respondToGeneric(requestId, {
				decision: approved ? 'accept' : 'cancel',
			} as McpServerElicitationRequestResponse);
		} catch {
			try {
				conn.respondToGeneric(requestId, {
					decision: 'cancel',
				} as McpServerElicitationRequestResponse);
			} catch { /* connection dead */ }
		}
	}

	// ── Existing approval handlers ─────────────────────────────────────────

	private async _approveCommand(
		request: vscode.ChatRequest, stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken, conn: AppServerConnection,
		id: string | number, session: SessionState, p: CommandExecutionRequestApprovalParams,
	): Promise<void> {
		stream.progress('Waiting for approval...');
		const cmd = p.command ?? p.commandActions?.map(a => a.command).join(' ') ?? null;
		const lines: string[] = [];
		if (cmd) { lines.push(`**Command:** \`${cmd}\``); }
		if (p.cwd) { lines.push(`**Directory:** ${p.cwd}`); }
		if (p.reason) { lines.push(`**Reason:** ${p.reason}`); }

		const key = String(id);
		session.pendingCommandApprovals.register(key);

		try {
			const r = await vscode.lm.invokeTool('vscode_get_confirmation', {
				input: { title: 'Allow command execution?', message: lines.join('\n\n'), confirmationType: 'basic' },
				toolInvocationToken: request.toolInvocationToken,
			}, token);
			const v = (r.content.at(0) as { value?: unknown } | undefined)?.value;
			const decision: ApprovalDecision = typeof v === 'string' && v.toLowerCase() === 'yes' ? 'accept' : 'cancel';
			conn.respondToApproval(id, decision);
			session.pendingCommandApprovals.respond(key, decision);
		} catch {
			try { conn.respondToApproval(id, 'cancel'); } catch { /* connection dead */ }
			session.pendingCommandApprovals.respond(key, 'cancel');
		}
	}

	private async _approveFileChange(
		request: vscode.ChatRequest, stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken, conn: AppServerConnection,
		id: string | number, session: SessionState, p: FileChangeRequestApprovalParams,
	): Promise<void> {
		stream.progress('Waiting for approval...');
		const lines: string[] = [];
		if (p.grantRoot) { lines.push(`**Root:** ${p.grantRoot}`); }
		if (p.reason) { lines.push(`**Reason:** ${p.reason}`); }

		const key = String(id);
		session.pendingFileChangeApprovals.register(key);

		try {
			const r = await vscode.lm.invokeTool('vscode_get_confirmation', {
				input: { title: 'Allow file changes?', message: lines.join('\n\n') || 'Codex wants to modify files.', confirmationType: 'basic' },
				toolInvocationToken: request.toolInvocationToken,
			}, token);
			const v = (r.content.at(0) as { value?: unknown } | undefined)?.value;
			const decision: ApprovalDecision = typeof v === 'string' && v.toLowerCase() === 'yes' ? 'accept' : 'cancel';
			conn.respondToApproval(id, decision);
			session.pendingFileChangeApprovals.respond(key, decision);
		} catch {
			try { conn.respondToApproval(id, 'cancel'); } catch { /* connection dead */ }
			session.pendingFileChangeApprovals.respond(key, 'cancel');
		}
	}

	dispose(): void {
		for (const session of this._sessions.values()) {
			session.pendingCommandApprovals.denyAll('cancel');
			session.pendingFileChangeApprovals.denyAll('cancel');
			session.pendingMcpApprovals.denyAll('cancel');
			session.pendingToolCalls.rejectAll(new Error('Session disposed'));
			if (session.turnActive) {
				session.turnActive = false;
				session.turnReject(new Error('Session disposed'));
			}
		}
		this._sessions.clear();
		this._mcpInventory.clear();
		this.nativeConn?.disconnect(); this.nativeConn = null;
		this.proxyConn?.disconnect(); this.proxyConn = null;
	}

	// ── Dynamic tool call dispatch ─────────────────────────────────────────

	private async _handleToolCall(
		request: vscode.ChatRequest,
		token: vscode.CancellationToken,
		conn: AppServerConnection,
		requestId: string | number,
		session: SessionState,
		params: DynamicToolCallParams,
	): Promise<void> {
		const toolName = params.tool;
		const _resultPromise = session.pendingToolCalls.register(String(requestId));

		try {
			const result = await this._invokeTool(toolName, params.arguments as Record<string, unknown>, request, token);
			conn.respondToToolCall(requestId, {
				contentItems: [{ type: 'inputText', text: result }],
				success: true,
			});
			session.pendingToolCalls.respond(String(requestId), {
				contentItems: [{ type: 'inputText', text: result }],
				success: true,
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown tool error';
			this._log.error(err instanceof Error ? err : String(err), `tool call "${toolName}" failed`);
			conn.respondToToolCall(requestId, {
				contentItems: [{ type: 'inputText', text: `Error: ${message}` }],
				success: false,
			});
			session.pendingToolCalls.respond(String(requestId), {
				contentItems: [{ type: 'inputText', text: `Error: ${message}` }],
				success: false,
			});
		}
	}

	private async _invokeTool(
		toolName: string,
		args: Record<string, unknown>,
		request: vscode.ChatRequest,
		token: vscode.CancellationToken,
	): Promise<string> {
		if (typeof (vscode.lm as { invokeTool?: unknown }).invokeTool === 'function') {
			try {
				const result = await vscode.lm.invokeTool(toolName, {
					input: args,
					toolInvocationToken: request.toolInvocationToken,
				}, token);
				const text = result.content
					.map(part => (typeof part === 'object' && part !== null && 'value' in part ? String(part.value) : JSON.stringify(part)))
					.join('\n');
				return text;
			} catch (err) {
				this._log.warn(`vscode.lm.invokeTool("${toolName}") failed, trying fallback: ${err instanceof Error ? err.message : String(err)}`);
			}
		}

		return this._fallbackInvokeTool(toolName, args, token);
	}

	private async _fallbackInvokeTool(toolName: string, args: Record<string, unknown>, token: vscode.CancellationToken): Promise<string> {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		const root = workspaceFolders?.[0]?.uri.fsPath;

		switch (toolName) {
			case 'readFile': {
				const filePath = args.filePath as string;
				if (!filePath) { throw new Error('Missing required parameter: filePath'); }
				const uri = vscode.Uri.file(filePath);
				const data = await vscode.workspace.fs.readFile(uri);
				return new TextDecoder().decode(data);
			}
			case 'fileSearch': {
				const pattern = args.pattern as string;
				if (!pattern) { throw new Error('Missing required parameter: pattern'); }
				const _base = root ?? process.cwd();
				const files = await vscode.workspace.findFiles(pattern, null, 50, token);
				return files.length > 0 ? files.map(f => vscode.workspace.asRelativePath(f)).join('\n') : 'No files found';
			}
			case 'searchContent': {
				const pattern = args.pattern as string;
				if (!pattern) { throw new Error('Missing required parameter: pattern'); }
				const findTextInFiles = (vscode.workspace as unknown as { findTextInFiles(query: unknown, options: unknown, token: vscode.CancellationToken): Thenable<{ matches: Array<{ uri: vscode.Uri; ranges: Array<{ start: { line: number } }> }> }> }).findTextInFiles;
				if (typeof findTextInFiles !== 'function') {
					return `Content search for "${pattern}" requires vscode.lm.invokeTool`;
				}
				const results = await findTextInFiles(
					{ pattern, isRegExp: false, isCaseSensitive: false },
					{},
					token,
				);
				if (results.matches.length === 0) { return `No matches for "${pattern}"`; }
				return results.matches.slice(0, 20).map((m: { uri: vscode.Uri; ranges: Array<{ start: { line: number } }> }) => {
					const relPath = vscode.workspace.asRelativePath(m.uri);
					return `${relPath}:${m.ranges.map((r: { start: { line: number } }) => r.start.line + 1).join(',')}`;
				}).join('\n');
			}
			case 'listDirectory': {
				const dirPath = (args.directoryPath as string) ?? root ?? process.cwd();
				const uri = vscode.Uri.file(dirPath);
				const entries = await vscode.workspace.fs.readDirectory(uri);
				return entries.map(([name, ft]) => `${ft === 2 ? '📁' : '📄'} ${name}`).join('\n');
			}
			case 'readLints': {
				const paths = args.paths as string | undefined;
				if (paths) {
					const items = vscode.languages.getDiagnostics(vscode.Uri.file(paths));
					if (items.length === 0) { return 'No diagnostics found'; }
					return items.slice(0, 30).map(d => {
						return `${d.range.start.line + 1}: ${d.message}`;
					}).join('\n');
				}
				const allDiags = vscode.languages.getDiagnostics();
				if (allDiags.length === 0) { return 'No diagnostics found'; }
				return allDiags.slice(0, 30).map(([uri, items]) => {
					const relPath = vscode.workspace.asRelativePath(uri);
					return items.map((d: vscode.Diagnostic) => `${relPath}:${d.range.start.line + 1}: ${d.message}`).join('\n');
				}).join('\n');
			}
			default:
				throw new Error(`Tool "${toolName}" is not available. Use vscode.lm.invokeTool or register a fallback.`);
		}
	}
}
