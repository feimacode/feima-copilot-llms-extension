/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import {
	CopilotClient,
	RuntimeConnection,
	type SessionConfig,
	type ResumeSessionConfig,
	type PermissionRequestResult,
	type ExitPlanModeRequest,
	type ExitPlanModeResult,
} from '@github/copilot-sdk';
import { createInitialRouterState, routeSessionEvent, type RouterState } from './copilotSessionEventRouter';
import { CopilotPermissionHandler } from './copilotPermissionHandler';
import { toSdkAttachments, type CopilotMessageAttachment } from './copilotAttachments';
import { ProxyManager } from '../common/proxy/proxyManager';
import { ILogService } from '../../platform/log/common/logService';

// ─── Types ────────────────────────────────────────────────────────────────────

type CopilotSession = Awaited<ReturnType<CopilotClient['createSession']>>;

interface TurnMetadata {
	sessionId: string;
	tokenUsage?: { inputTokens: number; outputTokens: number };
	modelId?: string;
}

/** Mutable context for the turn currently executing on a session. */
interface TurnContext {
	stream: vscode.ChatResponseStream;
	permission: CopilotPermissionHandler;
	routerState: RouterState;
	resolveIdle: () => void;
	toolInvocationToken: vscode.ChatRequest['toolInvocationToken'];
	token: vscode.CancellationToken;
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

	/**
	 * @param storagePath Extension global storage path, used as the Copilot runtime
	 *                    baseDirectory so sessions are isolated from ~/.copilot.
	 * @param proxyManager Shared LM proxy; the runtime's model calls are always
	 *                    routed through it to VS Code LM.
	 * @param _log Logging service.
	 */
	constructor(
		private readonly storagePath: string,
		private readonly proxyManager: ProxyManager,
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
		const savedSessionId = findSessionIdInHistory(context.history);
		this._log.debug(`handleRequest ${JSON.stringify({
			modelId: request.model.id,
			savedSessionId,
			historyLength: context.history.length,
			references: request.references.length,
			activeSessions: this._sessions.size,
		})}`);
		let entry: SessionEntry;
		try {
			entry = await this._getOrCreateSession(client, savedSessionId, request, stream);
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
			return { metadata: { sessionId: entry.sessionId } satisfies TurnMetadata };
		}

		const attachments = toSdkAttachments(request);
		const attachedPaths = collectAttachedPaths(attachments);
		const permission = new CopilotPermissionHandler(stream, request.toolInvocationToken, token, attachedPaths, this._log);

		// Establish the mutable turn context read by the shared event/permission callbacks.
		let resolveIdle!: () => void;
		const idle = new Promise<void>(resolve => { resolveIdle = resolve; });
		const routerState = createInitialRouterState();
		entry.current = { stream, permission, routerState, resolveIdle, toolInvocationToken: request.toolInvocationToken, token };

		// Cancellation → abort the SDK turn, then release the wait.
		const cancelSub = token.onCancellationRequested(() => {
			this._log.debug(`cancellation requested ${JSON.stringify({ sessionId: entry.sessionId })}`);
			void entry.session.abort().catch(() => { /* best-effort */ });
			resolveIdle();
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
			entry.current = null;
		}

		const metadata: TurnMetadata = {
			sessionId: entry.sessionId,
			tokenUsage: { inputTokens: routerState.usage.inputTokens, outputTokens: routerState.usage.outputTokens },
			modelId: routerState.modelId ?? request.model.id,
		};
		return { metadata };
	}

	/** Serialize turns per session so a second message waits for the first to finish. */
	private _queueTurn<T>(entry: SessionEntry, fn: () => Promise<T>): Promise<T> {
		const run = entry.sequencer.then(fn, fn);
		entry.sequencer = run.then(() => undefined, () => undefined);
		return run;
	}

	// ── Session management ────────────────────────────────────────────────────

	private async _getOrCreateSession(
		client: CopilotClient,
		savedSessionId: string | undefined,
		request: vscode.ChatRequest,
		stream: vscode.ChatResponseStream,
	): Promise<SessionEntry> {
		if (savedSessionId) {
			const existing = this._sessions.get(savedSessionId);
			if (existing) {
				this._log.debug(`reusing warm session ${JSON.stringify({ sessionId: savedSessionId })}`);
				return existing;
			}
			stream.progress('Resuming Copilot session…');
			this._log.debug(`resuming session from disk ${JSON.stringify({ sessionId: savedSessionId })}`);
			try {
				const entry = this._newEntry();
				const resumeConfig: ResumeSessionConfig = {
					workingDirectory: workspaceCwd(),
					streaming: true,
					onPermissionRequest: this._permissionCallback(entry),
					onExitPlanModeRequest: this._exitPlanModeCallback(entry),
				};
				const session = await client.resumeSession(savedSessionId, resumeConfig);
				return this._attachEntry(entry, session);
			} catch (err) {
				this._log.error(err instanceof Error ? err : String(err), 'resume failed, creating new session');
			}
		}

		stream.progress('Starting Copilot session…');
		this._log.debug(`creating new session ${JSON.stringify({ model: request.model.id })}`);
		const entry = this._newEntry();
		const createConfig: SessionConfig = {
			workingDirectory: workspaceCwd(),
			model: request.model.id,
			streaming: true,
			onPermissionRequest: this._permissionCallback(entry),
			onExitPlanModeRequest: this._exitPlanModeCallback(entry),
		};
		const session = await client.createSession(createConfig);
		return this._attachEntry(entry, session);
	}

	private _newEntry(): SessionEntry {
		return { sessionId: '', session: null as unknown as CopilotSession, sequencer: Promise.resolve(), current: null, unsubscribe: () => { /* set later */ } };
	}

	/** Fill in the session, subscribe to its event stream, and register the entry. */
	private _attachEntry(entry: SessionEntry, session: CopilotSession): SessionEntry {
		entry.session = session;
		entry.sessionId = session.sessionId;
		entry.unsubscribe = session.on((event) => {
			const current = entry.current;
			if (current) {
				routeSessionEvent(event, current.stream, current.routerState, current.resolveIdle, this._log);
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
			try {
				const result = await vscode.lm.invokeTool(
					'vscode_get_confirmation',
					{
						input: {
							title: 'Copilot CLI — Exit plan mode and start executing?',
							message: req.summary || 'The agent has finished planning and wants to begin making changes.',
							confirmationType: 'basic',
						},
						toolInvocationToken: current.toolInvocationToken,
					},
					current.token,
				);
				const firstPart = result.content.at(0);
				const rawValue: unknown = firstPart !== null && typeof firstPart === 'object' && 'value' in firstPart
					? (firstPart as { value: unknown }).value
					: undefined;
				const approved = typeof rawValue === 'string' && rawValue.toLowerCase() === 'yes';
				this._log.debug(`exit plan mode decision ${JSON.stringify({ sessionId: entry.sessionId, approved })}`);
				return { approved };
			} catch {
				return { approved: false };
			}
		};
	}

	private async _ensureClient(stream: vscode.ChatResponseStream): Promise<void> {
		if (!this._client) {
			stream.progress('Connecting to Copilot CLI…');

			// Always route the runtime's model calls through our localhost proxy →
			// VS Code LM. `COPILOT_API_URL` overrides the model endpoint; the picked
			// model flows via the per-session `model` id in the request body; disabling
			// WebSocket keeps all traffic on the HTTP Responses transport the proxy
			// understands.
			// The proxy is started once in registerAgents(); here we only wait for it
			// to be ready before reading its URL/nonce for the subprocess env.
			await this.proxyManager.ready;
			const info = this.proxyManager.info;
			this._log.debug(`model proxy ${JSON.stringify({ responsesUrl: info.responsesUrl })}`);
			const env: Record<string, string | undefined> = {
				...process.env,
				COPILOT_API_URL: info.responsesUrl,
				GITHUB_COPILOT_API_TOKEN: info.responsesNonce,
				COPILOT_CLI_DISABLE_WEBSOCKET_RESPONSES: 'true',
			};

			this._log.debug(`starting CopilotClient ${JSON.stringify({ baseDirectory: this.storagePath })}`);
			this._client = new CopilotClient({
				gitHubToken: '',
				baseDirectory: this.storagePath,
				connection: RuntimeConnection.forStdio(),
				env,
			});
			await this._client.start();
			this._log.debug('CopilotClient started');
		}
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

function workspaceCwd(): string | undefined {
	return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

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

function findSessionIdInHistory(
	history: ReadonlyArray<vscode.ChatRequestTurn | vscode.ChatResponseTurn>,
): string | undefined {
	for (let i = history.length - 1; i >= 0; i--) {
		const turn = history[i];
		if ('result' in turn) {
			const sessionId = (turn as vscode.ChatResponseTurn).result.metadata?.['sessionId'];
			if (typeof sessionId === 'string') { return sessionId; }
		}
	}
	return undefined;
}
