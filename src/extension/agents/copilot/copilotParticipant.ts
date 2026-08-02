/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import {
	CopilotClient,
	RuntimeConnection,
	type SessionConfig,
	type ResumeSessionConfig,
	type PermissionRequestResult,
	type ExitPlanModeRequest,
	type ExitPlanModeResult,
	type ProviderConfig,
	type CopilotClientOptions,
	type MCPServerConfig,
	type Tool,
	type SystemMessageConfig,
} from '@github/copilot-sdk';
import { createInitialRouterState, routeSessionEvent, type RouterState } from './copilotSessionEventRouter';
import { CopilotPermissionHandler } from './copilotPermissionHandler';
import { toSdkAttachments, type CopilotMessageAttachment } from './copilotAttachments';
import { ProxyManager } from '../common/proxy/proxyManager';
import { resolveBinary } from '../common/appServer/client';
import { resolvePermissionTier } from '../common/permissionTier';
import { requestConfirmation } from '../common/confirmationTool';
import { parseAllowedActions, serializeAllowedActions } from '../common/sessionApprovals';
import { resolveWorkspaceCwd } from '../common/workspaceUtils';
import { ExternalEditTracker } from '../common/externalEditTracker';
import { getEffectiveMcpServers, type VsCodeMcpServerDefinition } from '../common/mcp/vscodeMcpConfig';
import { DynamicToolManager } from '../common/tools/dynamicToolManager';
import type { DynamicToolSpec } from '../common/protocol/types';
import { resolveSystemPrompt } from '../common/systemPrompt';
import { COPILOT_DEFAULT_SYSTEM_PROMPT } from '../common/constants/systemPromptDefaults';
import { ILogService } from '../../platform/log/common/logService';

// ─── Types ────────────────────────────────────────────────────────────────────

type CopilotSession = Awaited<ReturnType<CopilotClient['createSession']>>;

/**
 * Converts one of our VS-Code-native MCP server entries (read from user
 * profile / workspace-folder `mcp.json` — see ../common/mcp/vscodeMcpConfig.ts)
 * into the shape the Copilot SDK's `SessionConfigBase.mcpServers` expects.
 * Discriminated the same way Claude/Codex's converters are: `url` present ⇒
 * remote (http/sse), `command` present ⇒ local stdio server. Entries with
 * neither are dropped (nothing to launch).
 */
function toCopilotMcpServerConfig(def: VsCodeMcpServerDefinition): MCPServerConfig | undefined {
	if (def.url) {
		return {
			type: def.type === 'sse' ? 'sse' : 'http',
			url: def.url,
			...(def.headers ? { headers: def.headers } : {}),
		};
	}
	if (def.command) {
		return {
			type: 'stdio',
			command: def.command,
			...(def.args ? { args: def.args } : {}),
			...(def.env ? { env: def.env } : {}),
			...(def.cwd ? { workingDirectory: def.cwd } : {}),
		};
	}
	return undefined;
}

interface TurnMetadata {
	sessionId: string;
	tokenUsage?: { inputTokens: number; outputTokens: number };
	modelId?: string;
	/** Request keys (see copilotPermissionHandler.ts's keyForPermissionRequest)
	 *  approved "for the session" via the confirmation card's third button. */
	allowedActions?: string[];
}

/** Mutable context for the turn currently executing on a session. */
interface TurnContext {
	stream: vscode.ChatResponseStream;
	permission: CopilotPermissionHandler;
	routerState: RouterState;
	resolveIdle: () => void;
	toolInvocationToken: vscode.ChatRequest['toolInvocationToken'];
	token: vscode.CancellationToken;
	/** Runaway-loop guard: max `assistant.turn_end` events before force-abort. */
	maxApiCallsPerTurn: number;
	/** Set once the loop guard has fired, so it only aborts once per turn. */
	loopGuardTripped: boolean;
}

interface SessionEntry {
	sessionId: string;
	session: CopilotSession;
	/** Promise chain that serializes turns on this session. */
	sequencer: Promise<void>;
	/** Context of the in-flight turn, or null when idle. */
	current: TurnContext | null;
	/** Unsubscribe from the session event stream. */
	unsubscribe: () => void;
	/** See TurnMetadata.allowedActions. Seeded from history metadata when this
	 *  entry is created, then mutated in place by CopilotPermissionHandler. */
	sessionApprovals: Set<string>;
}

// ─── Participant ──────────────────────────────────────────────────────────────

/**
 * Chat participant that bridges VS Code Chat to the GitHub Copilot CLI SDK.
 *
 * Maintains one SDK session per VS Code chat conversation (keyed by SDK session
 * id, persisted across turns via `ChatResult.metadata`). Turns are serialized
 * per session; the full session-event stream is routed to the chat UI; and
 * permission requests flow through a tiered auto-approval handler.
 */
export class CopilotParticipant {
	private _client: CopilotClient | null = null;
	private readonly _sessions = new Map<string, SessionEntry>();
	/** Tracks stream.externalEdit() windows for 'write' permission requests
	 *  (shared across turns, flushed at the end of each — see common/externalEditTracker.ts). */
	private readonly _editTracker = new ExternalEditTracker();

	/**
	 * @param storagePath Extension global storage path, used as the Copilot runtime
	 *                    baseDirectory so sessions are isolated from ~/.copilot.
	 * @param proxyManager Shared LM proxy; the runtime's model calls are always
	 *                    routed through it to VS Code LM.
	 * @param toolManager Shared `vscode.lm.tools` discovery/cache, also used by
	 *                    `@codex` — see ../common/tools/dynamicToolManager.ts.
	 * @param _log Logging service.
	 */
	constructor(
		private readonly storagePath: string,
		private readonly proxyManager: ProxyManager,
		private readonly toolManager: DynamicToolManager,
		private readonly _log: ILogService,
	) {}

	async handleRequest(
		request: vscode.ChatRequest,
		context: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken,
	): Promise<vscode.ChatResult> {
		// ── 1. Ensure client ──────────────────────────────────────────────────
		await this._ensureClient(stream);
		const client = this._client!;

		// ── 2. Resolve session (create / resume / reuse) ──────────────────────
		const savedMeta = findMetaInHistory(context.history);
		const savedSessionId = savedMeta?.sessionId;
		this._log.debug(`handleRequest ${JSON.stringify({
			modelId: request.model.id,
			savedSessionId,
			historyLength: context.history.length,
			references: request.references.length,
			activeSessions: this._sessions.size,
		})}`);
		let entry: SessionEntry;
		try {
			entry = await this._getOrCreateSession(client, savedSessionId, savedMeta?.allowedActions, request, stream);
		} catch (err) {
			this._log.error(err instanceof Error ? err : String(err), 'failed to establish session');
			stream.markdown(`> ⚠️ ${vscode.l10n.t('Failed to start the Copilot CLI session.')}\n\n`);
			return {};
		}

		// ── 3. Queue the turn behind the session sequencer ────────────────────
		return this._queueTurn(entry, () => this._runTurn(entry, request, stream, token));
	}

	// ── Turn execution ──────────────────────────────────────────────────────

	private async _runTurn(
		entry: SessionEntry,
		request: vscode.ChatRequest,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken,
	): Promise<vscode.ChatResult> {
		const slash = parseLeadingSlashCommand(request.prompt);

		// Slash command: /compact — compact history and finish the turn.
		if (slash.command === 'compact') {
			this._log.debug(`slash /compact ${JSON.stringify({ sessionId: entry.sessionId })}`);
			try {
				await entry.session.rpc.history.compact();
				stream.markdown(`_${vscode.l10n.t('Compaction completed.')}_`);
				this._log.debug(`compaction done ${JSON.stringify({ sessionId: entry.sessionId })}`);
			} catch (err) {
				this._log.error(err instanceof Error ? err : String(err), 'compaction failed');
				stream.markdown(`> ⚠️ ${vscode.l10n.t('Compaction failed.')}\n`);
			}
			const compactAllowedActions = serializeAllowedActions(entry.sessionApprovals);
			return { metadata: { sessionId: entry.sessionId, ...(compactAllowedActions ? { allowedActions: compactAllowedActions } : {}) } satisfies TurnMetadata };
		}

		const attachments = toSdkAttachments(request);
		const attachedPaths = collectAttachedPaths(attachments);
		// Configured default, overridden for this turn only by a recognized
		// /ask, /acceptEdits or /fullAuto slash command (never persisted).
		const configuredTier = vscode.workspace.getConfiguration('feima.agents.copilot').get('permissionMode');
		const permissionTier = resolvePermissionTier(request.command, configuredTier);
		this._log.debug(`final permission in use ${JSON.stringify({
			configuredTier, commandOverride: request.command, tier: permissionTier,
		})}`);
		const permission = new CopilotPermissionHandler(stream, request.toolInvocationToken, token, attachedPaths, permissionTier, entry.sessionApprovals, this._editTracker, this._log);

		// Establish the mutable turn context read by the shared event/permission callbacks.
		let resolveIdle!: () => void;
		const idle = new Promise<void>(resolve => { resolveIdle = resolve; });
		const routerState = createInitialRouterState(stream);
		const maxApiCallsPerTurn = vscode.workspace.getConfiguration('feima.agents.copilot').get<number>('maxApiCallsPerTurn') ?? 50;
		entry.current = {
			stream, permission, routerState, resolveIdle,
			toolInvocationToken: request.toolInvocationToken, token,
			maxApiCallsPerTurn, loopGuardTripped: false,
		};

		// Cancellation → abort the SDK turn and wait for it to propagate before
		// releasing the idle wait. This ensures the runtime and proxy actually stop.
		const cancelSub = token.onCancellationRequested(() => {
			this._log.debug(`cancellation requested ${JSON.stringify({ sessionId: entry.sessionId })}`);
			this._forceAbort(entry, resolveIdle);
		});

		const agentMode: 'plan' | 'interactive' | 'autopilot' =
			slash.command === 'plan' ? 'plan'
				: slash.command === 'autopilot' ? 'autopilot'
					: 'interactive';
		const prompt = slash.command ? slash.rest : request.prompt;

		this._log.debug(`starting turn ${JSON.stringify({
			sessionId: entry.sessionId,
			agentMode,
			slash: slash.command,
			promptLen: prompt.length,
			attachments: attachments.length,
		})}`);
		try {
			await entry.session.send({
				prompt,
				attachments: attachments.length ? attachments : undefined,
				agentMode,
			});
			this._log.debug(`send() dispatched, awaiting idle ${JSON.stringify({ sessionId: entry.sessionId })}`);
			await idle;
			this._log.debug(`turn idle ${JSON.stringify({
				sessionId: entry.sessionId,
				inputTokens: routerState.usage.inputTokens,
				outputTokens: routerState.usage.outputTokens,
				modelId: routerState.modelId,
			})}`);
		} catch (err) {
			this._log.error(err instanceof Error ? err : String(err), 'turn failed');
			stream.markdown(`\n\n> ⚠️ Copilot error: ${err instanceof Error ? err.message : String(err)}\n`);
		} finally {
			cancelSub.dispose();
			permission.dispose();
			this._editTracker.flush();
			entry.current = null;
		}

		const allowedActions = serializeAllowedActions(entry.sessionApprovals);
		const metadata: TurnMetadata = {
			sessionId: entry.sessionId,
			tokenUsage: { inputTokens: routerState.usage.inputTokens, outputTokens: routerState.usage.outputTokens },
			modelId: routerState.modelId ?? request.model.id,
			...(allowedActions ? { allowedActions } : {}),
		};
		return { metadata };
	}

	/**
	 * Abort the SDK turn and release the idle wait once it propagates (or after
	 * a 5s fallback, so the UI never hangs on a runtime that doesn't stop).
	 * Shared by user cancellation and the runaway-loop guard.
	 */
	private _forceAbort(entry: SessionEntry, resolveIdle: () => void): void {
		const abortTimeout = setTimeout(() => {
			this._log.warn('abort timed out, releasing idle wait');
			resolveIdle();
		}, 5000);
		void entry.session.abort().then(() => {
			clearTimeout(abortTimeout);
			resolveIdle();
		}).catch(() => {
			clearTimeout(abortTimeout);
			resolveIdle();
		});
	}

	/** Serialize turns per session so a second message waits for the first to finish. */
	private _queueTurn<T>(entry: SessionEntry, fn: () => Promise<T>): Promise<T> {
		const run = entry.sequencer.then(fn, fn);
		entry.sequencer = run.then(() => undefined, () => undefined);
		return run;
	}

	// ── Session management ────────────────────────────────────────────────────

	/**
	 * Resolves MCP servers from VS Code's own native mcp.json config (user
	 * profile + every workspace folder's `.vscode/mcp.json`) into the shape
	 * the SDK's session config expects — giving @copilot the same MCP-config
	 * source as @claude/@codex (see ../common/mcp/vscodeMcpConfig.ts), no
	 * extension-specific setting involved.
	 */
	private async _resolveMcpServers(): Promise<Record<string, MCPServerConfig>> {
		const effective = await getEffectiveMcpServers(vscode.Uri.file(this.storagePath), this._log);
		const result: Record<string, MCPServerConfig> = {};
		for (const [name, def] of Object.entries(effective)) {
			const config = toCopilotMcpServerConfig(def);
			if (config) {
				result[name] = config;
			}
		}
		if (Object.keys(result).length > 0) {
			this._log.debug(`resolved ${Object.keys(result).length} MCP server(s) from VS Code's native mcp.json config for Copilot session: ${Object.keys(result).join(', ')}`);
		}
		return result;
	}

	/**
	 * Points the SDK at the workspace's `.github/skills` directory — the same
	 * location native Copilot Chat's own Agent Skills feature reads from (see
	 * `docs/.../agent-skills.md`). `SessionConfigBase.skillDirectories` is an
	 * explicit opt-in independent of `enableConfigDiscovery` (which defaults
	 * to `false` and, if flipped instead, would also auto-discover MCP
	 * configs from cwd — redundant with `_resolveMcpServers`'s own VS Code
	 * `mcp.json` merge). Without this, @copilot-cli never looks at
	 * `.github/skills` despite the SDK fully supporting it.
	 */
	private _resolveSkillDirectories(): string[] | undefined {
		const cwd = resolveWorkspaceCwd();
		return cwd ? [path.join(cwd, '.github', 'skills')] : undefined;
	}

	/**
	 * Resolves `feima.agents.copilot.systemPrompt`(+`Mode`) into the SDK's
	 * `SystemMessageConfig` shape. 'append' (default) layers our merged
	 * default + user text after the Copilot CLI's own system message;
	 * 'replace' hands the SDK the user's text as the *entire* system message,
	 * which per the SDK's own docs "removes all SDK guardrails including
	 * security restrictions" — advanced use only.
	 *
	 * `undefined` when there's nothing to say (no built-in default, no user
	 * text) — an unconfigured setup sends no `systemMessage` field at all,
	 * same as before this setting existed.
	 */
	private _resolveSystemMessage(): SystemMessageConfig | undefined {
		const resolved = resolveSystemPrompt('copilot', COPILOT_DEFAULT_SYSTEM_PROMPT, this._log);
		if (resolved.content.length === 0) {
			return undefined;
		}
		return resolved.mode === 'replace'
			? { mode: 'replace', content: resolved.content }
			: { mode: 'append', content: resolved.content };
	}

	/**
	 * Converts VS Code's discovered `vscode.lm.tools` (via the shared
	 * `DynamicToolManager` — see ../common/tools/dynamicToolManager.ts, also
	 * used by @codex) into the Copilot SDK's `Tool<any>[]` shape for
	 * `SessionConfigBase.tools`, giving @copilot the same "call VS Code's own
	 * built-in tools" UX as @codex's dynamicTools bridge.
	 */
	private async _buildDynamicTools(entry: SessionEntry): Promise<Tool<unknown>[]> {
		const specs = await this.toolManager.buildDynamicTools();
		const tools = specs.map(spec => this._toCopilotTool(entry, spec));
		if (tools.length > 0) {
			this._log.debug(`resolved ${tools.length} dynamic tool(s) from vscode.lm.tools for Copilot session: ${tools.map(t => t.name).join(', ')}`);
		}
		return tools;
	}

	private _toCopilotTool(entry: SessionEntry, spec: DynamicToolSpec): Tool<unknown> {
		return {
			name: spec.name,
			description: spec.description,
			parameters: spec.inputSchema as Record<string, unknown>,
			handler: async (args) => this._invokeDynamicTool(entry, spec.name, args as Record<string, unknown>),
		};
	}

	/**
	 * Invoke a VS Code tool discovered via `vscode.lm.tools`, mirroring
	 * @codex's `_invokeTool` (see codexParticipant.ts) so both participants
	 * share the same uninvokable-tool bookkeeping via
	 * `DynamicToolManager.markUninvokable`.
	 */
	private async _invokeDynamicTool(entry: SessionEntry, toolName: string, args: Record<string, unknown>): Promise<string> {
		const current = entry.current;
		try {
			const result = await vscode.lm.invokeTool(toolName, {
				input: args,
				toolInvocationToken: current?.toolInvocationToken,
			}, current?.token);
			const text = result.content
				.map(part => (typeof part === 'object' && part !== null && 'value' in part ? String(part.value) : JSON.stringify(part)))
				.join('\n');
			this._log.debug(`vscode.lm.invokeTool("${toolName}") succeeded: contentParts=${result.content.length} textLength=${text.length}`);
			return text;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this._log.warn(`vscode.lm.invokeTool("${toolName}") failed: ${message}`);
			// VS Code throws this specific message when a tool is registered
			// declaratively (so it shows up in vscode.lm.tools) but its owning
			// extension never called vscode.lm.registerTool() for it — e.g.
			// GitHub Copilot Chat's own copilot_* tools. Remember it so we stop
			// advertising it on future turns/sessions (shared with @codex).
			if (message.includes('does not have an implementation registered')) {
				this.toolManager.markUninvokable(toolName);
			}
			throw err instanceof Error ? err : new Error(message);
		}
	}

	private async _getOrCreateSession(
		client: CopilotClient,
		savedSessionId: string | undefined,
		savedAllowedActions: string[] | undefined,
		request: vscode.ChatRequest,
		stream: vscode.ChatResponseStream,
	): Promise<SessionEntry> {
		const mcpServers = await this._resolveMcpServers();
		const systemMessage = this._resolveSystemMessage();
		const skillDirectories = this._resolveSkillDirectories();

		if (savedSessionId) {
			const existing = this._sessions.get(savedSessionId);
			if (existing) {
				this._log.debug(`reusing warm session ${JSON.stringify({ sessionId: savedSessionId })}`);
				return existing;
			}
			stream.progress('Resuming Copilot session…');
			this._log.debug(`resuming session from disk ${JSON.stringify({ sessionId: savedSessionId })}`);
			try {
				const entry = this._newEntry(savedAllowedActions);
				const tools = await this._buildDynamicTools(entry);
				const resumeConfig: ResumeSessionConfig = {
					workingDirectory: resolveWorkspaceCwd(),
					streaming: true,
					reasoningSummary: 'concise',
					provider: await this._proxyProvider(),
					onPermissionRequest: this._permissionCallback(entry),
					onExitPlanModeRequest: this._exitPlanModeCallback(entry),
					...(systemMessage ? { systemMessage } : {}),
					...(skillDirectories ? { skillDirectories } : {}),
					...(Object.keys(mcpServers).length > 0 ? { mcpServers } : {}),
					...(tools.length > 0 ? { tools } : {}),
				};
				const session = await client.resumeSession(savedSessionId, resumeConfig);
				return this._attachEntry(entry, session);
			} catch (err) {
				this._log.error(err instanceof Error ? err : String(err), 'resume failed, creating new session');
			}
		}

		stream.progress('Starting Copilot session…');
		const modelId = request.model.vendor ? `${request.model.vendor}/${request.model.id}` : request.model.id;
		this._log.debug(`creating new session ${JSON.stringify({ model: modelId })}`);
		const entry = this._newEntry(savedAllowedActions);
		const tools = await this._buildDynamicTools(entry);
		const createConfig: SessionConfig = {
			workingDirectory: resolveWorkspaceCwd(),
			model: modelId,
			streaming: true,
			reasoningSummary: 'concise',
			provider: await this._proxyProvider(),
			onPermissionRequest: this._permissionCallback(entry),
			onExitPlanModeRequest: this._exitPlanModeCallback(entry),
			...(systemMessage ? { systemMessage } : {}),
			...(skillDirectories ? { skillDirectories } : {}),
			...(Object.keys(mcpServers).length > 0 ? { mcpServers } : {}),
			...(tools.length > 0 ? { tools } : {}),
		};
		const session = await client.createSession(createConfig);
		return this._attachEntry(entry, session);
	}

	private _newEntry(seedAllowedActions?: string[]): SessionEntry {
		return {
			sessionId: '',
			session: null as unknown as CopilotSession,
			sequencer: Promise.resolve(),
			current: null,
			unsubscribe: () => { /* set later */ },
			sessionApprovals: parseAllowedActions(seedAllowedActions),
		};
	}

	/** Fill in the session, subscribe to its event stream, and register the entry. */
	private _attachEntry(entry: SessionEntry, session: CopilotSession): SessionEntry {
		entry.session = session;
		entry.sessionId = session.sessionId;
		entry.unsubscribe = session.on((event) => {
			const current = entry.current;
			if (current) {
				routeSessionEvent(event, current.stream, current.routerState, current.resolveIdle, this._editTracker, this._log);
				if (!current.loopGuardTripped && current.routerState.apiCallCount >= current.maxApiCallsPerTurn) {
					current.loopGuardTripped = true;
					this._log.warn(`turn exceeded maxApiCallsPerTurn (${current.routerState.apiCallCount}/${current.maxApiCallsPerTurn}) on session ${entry.sessionId} — force-aborting`);
					current.stream.markdown(`\n\n⚠️ *${vscode.l10n.t('Interrupted: this turn made {0} model calls without completing, which usually means it got stuck in a loop.', current.routerState.apiCallCount)}*\n`);
					this._forceAbort(entry, current.resolveIdle);
				}
			}
		});
		this._sessions.set(entry.sessionId, entry);
		this._log.debug(`session ready ${entry.sessionId}`);
		return entry;
	}

	/** Stable permission callback that delegates to the current turn's handler. */
	private _permissionCallback(entry: SessionEntry): (req: Parameters<CopilotPermissionHandler['handle']>[0]) => Promise<PermissionRequestResult> {
		return (req) => {
			const current = entry.current;
			if (!current) {
				this._log.debug(`permission request dropped (no active turn) ${JSON.stringify({ sessionId: entry.sessionId, kind: (req as { kind?: string }).kind })}`);
				return Promise.resolve({ kind: 'reject' } as PermissionRequestResult);
			}
			return current.permission.handle(req);
		};
	}

	/** Stable exit-plan-mode callback: asks the user to approve leaving plan mode. */
	private _exitPlanModeCallback(entry: SessionEntry): (req: ExitPlanModeRequest) => Promise<ExitPlanModeResult> {
		return async (req) => {
			const current = entry.current;
			if (!current) {
				return { approved: false };
			}
			this._log.debug(`exit plan mode requested ${JSON.stringify({ sessionId: entry.sessionId, summary: req.summary?.slice(0, 120) })}`);
			const outcome = await requestConfirmation(
				'Copilot CLI — Exit plan mode and start executing?',
				req.summary || 'The agent has finished planning and wants to begin making changes.',
				current.toolInvocationToken,
				current.token,
			);
			// "Allow for the session" doesn't have a meaningful repeat here — a plan
			// is only exited once — so it's just treated as an ordinary approval.
			const approved = outcome !== 'denied';
			this._log.debug(`exit plan mode decision ${JSON.stringify({ sessionId: entry.sessionId, outcome, approved })}`);
			return { approved };
		};
	}

	private async _ensureClient(stream: vscode.ChatResponseStream): Promise<void> {
		if (!this._client) {
			stream.progress('Connecting to Copilot CLI…');

			// Resolve the user's copilot binary so the SDK spawns the local CLI
			// instead of the bundled platform runtime (which we don't ship).
			let copilotBinaryPath: string | undefined;
			try {
				const rawBinaryPath = vscode.workspace.getConfiguration('feima.agents.copilot').get<string>('binaryPath') ?? '';
				copilotBinaryPath = resolveBinary(rawBinaryPath, 'copilot', this._log);
			} catch (err) {
				this._log.warn('copilot binary not found; participant will fail until installed: ' + String(err));
			}

			// Optional verbose logging for the SDK + spawned CLI subprocess
			// (`--log-level`), for diagnosing issues in the CLI/runtime itself.
			// The CLI subprocess's stderr is forwarded by the SDK with a
			// "[CLI subprocess]" prefix onto our own process.stderr, which shows
			// up in the "Log (Extension Host)" output channel.
			const rawLogLevel = vscode.workspace.getConfiguration('feima.agents.copilot').get<string>('logLevel') ?? '';
			const logLevel = rawLogLevel ? (rawLogLevel as NonNullable<CopilotClientOptions['logLevel']>) : undefined;

			this._log.debug(`starting CopilotClient ${JSON.stringify({ baseDirectory: this.storagePath, copilotBinaryPath, logLevel })}`);
			this._client = new CopilotClient({
				// No GitHub auth — model calls are routed through our proxy via the
				// per-session BYOK `provider` config (see _proxyProvider()).
				useLoggedInUser: false,
				baseDirectory: this.storagePath,
				connection: copilotBinaryPath
					? RuntimeConnection.forStdio({ path: copilotBinaryPath })
					: RuntimeConnection.forStdio(),
				logLevel,
			});
			await this._client.start();
			this._log.debug('CopilotClient started');
		}
	}

	/**
	 * Build the BYOK provider config that routes the runtime's model calls
	 * through our localhost Responses proxy → VS Code LM. Per the Copilot SDK
	 * docs, a session-level `provider` bypasses GitHub Copilot authentication,
	 * so no GitHub token is required. The picked model flows via the per-session
	 * `model` id in the request body; the proxy authenticates with its nonce.
	 */
	private async _proxyProvider(): Promise<ProviderConfig> {
		// The proxy is started once in registerAgents(); wait for it to be ready
		// before reading its URL/nonce.
		await this.proxyManager.ready;
		const info = this.proxyManager.info;
		this._log.debug(`model proxy ${JSON.stringify({ responsesUrl: info.responsesUrl })}`);
		return {
			type: 'openai',
			baseUrl: info.responsesUrl,
			wireApi: 'responses',
			bearerToken: info.responsesNonce,
			transport: 'http',
		};
	}

	dispose(): void {
		this._log.debug(`dispose ${JSON.stringify({ activeSessions: this._sessions.size })}`);
		for (const entry of this._sessions.values()) {
			entry.current?.permission.dispose();
			try { entry.unsubscribe(); } catch { /* ignore */ }
		}
		this._sessions.clear();
		void this._client?.stop().catch(() => { /* best-effort */ });
		this._client = null;
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function collectAttachedPaths(attachments: readonly CopilotMessageAttachment[]): ReadonlySet<string> {
	const paths = new Set<string>();
	for (const a of attachments) {
		if (a.type === 'file' || a.type === 'directory') {
			paths.add(a.path);
		} else if (a.type === 'selection') {
			paths.add(a.filePath);
		}
	}
	return paths;
}

interface ParsedSlashCommand {
	command?: 'compact' | 'plan' | 'autopilot';
	rest: string;
}

function parseLeadingSlashCommand(prompt: string): ParsedSlashCommand {
	const match = /^\s*\/(compact|plan|autopilot)\b\s*([\s\S]*)$/i.exec(prompt);
	if (match) {
		return { command: match[1].toLowerCase() as 'compact' | 'plan' | 'autopilot', rest: match[2] };
	}
	return { rest: prompt };
}

function findMetaInHistory(
	history: ReadonlyArray<vscode.ChatRequestTurn | vscode.ChatResponseTurn>,
): { sessionId: string; allowedActions?: string[] } | undefined {
	for (let i = history.length - 1; i >= 0; i--) {
		const turn = history[i];
		if ('result' in turn) {
			const meta = (turn as vscode.ChatResponseTurn).result.metadata;
			const sessionId = meta?.['sessionId'];
			if (typeof sessionId === 'string') {
				const allowedActions = meta?.['allowedActions'];
				return { sessionId, ...(Array.isArray(allowedActions) ? { allowedActions } : {}) };
			}
		}
	}
	return undefined;
}
