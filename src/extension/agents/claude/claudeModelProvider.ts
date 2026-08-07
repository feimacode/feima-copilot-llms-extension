/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { query, type Options, type ModelInfo } from '@anthropic-ai/claude-agent-sdk';
import { resolveBinary } from '../common/appServer/client';
import { ILogService } from '../../platform/log/common/logService';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Provider ID used when registering with VS Code's LM system.
 * All models returned by this provider will have `vendor === CLAUDE_PROVIDER_ID`.
 *
 * Namespaced (not just "claude-code") because that generic name is a likely
 * pick for any extension wrapping the Claude Code CLI — including other
 * extensions from this same codebase's lineage — and VS Code's model/agent
 * registries are global across all installed extensions, so a plain
 * "claude-code" collides the moment two such extensions are active at once.
 */
export const CLAUDE_PROVIDER_ID = 'feima-claude-code';

/**
 * Family assigned to all Claude-native models. Groups them visually in the picker
 * and is used as a secondary routing signal alongside `vendor`.
 */
export const CLAUDE_FAMILY = 'feima-claude-code';

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Language model provider that lists the models available under the user's
 * Claude Code subscription via the SDK's `Query.supportedModels()` API.
 *
 * This is the same `list_models` control request the Claude Code TUI uses to
 * build its `/model` picker, so the result reflects what the user's login /
 * subscription actually entitles them to — not a hardcoded API list.
 *
 * Implementation note: `supportedModels()` lives on the `Query` interface, which
 * is only obtainable from `query({ prompt, options })` (the `startup()` WarmQuery
 * does not expose it). We fire a throwaway `query()` with an empty prompt, call
 * `supportedModels()` as a side-channel control request (it does not consume the
 * prompt stream), then tear the subprocess down via `q.return()`.
 *
 * Model listing uses the CLI's OWN auth (OAuth login / ANTHROPIC_API_KEY) against
 * the real Anthropic backend — it is deliberately NOT routed through the LM proxy,
 * which is only for inference. We only set CLAUDE_CONFIG_DIR for session isolation.
 *
 * `provideLanguageModelChatResponse` intentionally throws — these models are
 * picker-only signals. Actual inference routing is handled by ClaudeParticipant.
 *
 * Model list is cached after the first successful fetch. Call `invalidateCache()`
 * to force a refresh (e.g. when the binary path setting changes).
 */
export class ClaudeModelProvider implements vscode.LanguageModelChatProvider {
	private _cachedModels: vscode.LanguageModelChatInformation[] | null = null;
	private _refreshPromise: Promise<void> | null = null;
	private readonly _onDidChange = new vscode.EventEmitter<void>();
	readonly onDidChangeLanguageModelChatInformation = this._onDidChange.event;

	/**
	 * @param storagePath Extension global storage path, used as CLAUDE_CONFIG_DIR
	 *                    so the throwaway listing session is isolated from VS Code's
	 *                    built-in Claude agent (~/.claude).
	 * @param _log Logging service.
	 */
	constructor(
		private readonly storagePath: string,
		private readonly _log: ILogService,
	) { }

	/**
	 * Kick off an eager background fetch so the model list is ready before
	 * the chat picker needs it. Returns immediately; callers that need to
	 * wait for results should await the returned promise.
	 */
	prefetch(): Promise<void> {
		if (this._refreshPromise) {
			return this._refreshPromise;
		}
		this._refreshPromise = this._doRefresh();
		return this._refreshPromise;
	}

	private async _doRefresh(): Promise<void> {
		const abortController = new AbortController();
		const options: Options = {
			abortController,
			env: {
				...process.env,
				// Isolate the throwaway listing session from ~/.claude.
				CLAUDE_CONFIG_DIR: this.storagePath,
			},
		};

		// Point the SDK at the configured binary (auto-discovered via PATH when
		// the setting is empty).
		try {
			const rawBinaryPath = vscode.workspace.getConfiguration('feima.agents.claude').get<string>('binaryPath') ?? '';
			options.pathToClaudeCodeExecutable = resolveBinary(rawBinaryPath, 'claude', this._log);
			this._log.debug('binary path: ' + JSON.stringify({ raw: rawBinaryPath, resolved: options.pathToClaudeCodeExecutable }));
		} catch (err) {
			// Binary not resolvable — leave pathToClaudeCodeExecutable unset so the
			// SDK falls back to its own discovery.
			this._log.warn('could not resolve claude binary, using SDK default discovery: ' + String(err));
		}

		// Throwaway query: empty prompt, we only want the supportedModels() side channel.
		const q = query({ prompt: '', options });
		try {
			const models: ModelInfo[] = await q.supportedModels();
			this._log.debug('raw models from SDK: ' + JSON.stringify(models));

			this._cachedModels = models.map(m => ({
				id: m.value,
				name: m.displayName || m.value,
				family: CLAUDE_FAMILY,
				version: '1',
				maxInputTokens: 200000,
				maxOutputTokens: 65536,
				capabilities: { toolCalling: true, imageInput: false },
				isUserSelectable: true,
			}));
			this._log.info('loaded ' + this._cachedModels.length + ' models');
			this._onDidChange.fire();
		} catch (err) {
			this._log.error(err instanceof Error ? err : String(err), 'failed to list models');
			// Clear promise so next call can retry.
			this._refreshPromise = null;
		} finally {
			// Tear down the throwaway subprocess. q.return() signals the generator
			// is done; the abort controller is a backstop in case return() hangs.
			try { await q.return(undefined); } catch { /* already closed */ }
			abortController.abort();
		}
	}

	async provideLanguageModelChatInformation(
		_options: unknown,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelChatInformation[]> {
		// NEVER spawn a subprocess synchronously — this method is called
		// by vscode.lm.selectChatModels which may be invoked from proxy
		// HTTP handlers on the microtask queue. Blocking here deadlocks.
		if (this._cachedModels !== null) {
			return this._cachedModels;
		}
		if (!this._refreshPromise) {
			this._refreshPromise = this._doRefresh();
		}
		return [];
	}

	provideTokenCount(
		_model: vscode.LanguageModelChatInformation,
		text: string | vscode.LanguageModelChatRequestMessage,
		_token: vscode.CancellationToken
	): Thenable<number> {
		const raw = typeof text === 'string' ? text : JSON.stringify(text);
		return Promise.resolve(Math.ceil(raw.length / 4));
	}

	async provideLanguageModelChatResponse(
		_model: vscode.LanguageModelChatInformation,
		_messages: readonly vscode.LanguageModelChatRequestMessage[],
		_options: unknown,
		_progress: vscode.Progress<unknown>,
		_token: vscode.CancellationToken
	): Promise<void> {
		// Routing is handled by ClaudeParticipant — models are picker-only
		throw new Error('Claude models must be used via the @claude chat participant');
	}

	/**
	 * Invalidate the cached model list and notify VS Code to re-query.
	 * Call when the claude binary path setting changes.
	 */
	invalidateCache(): void {
		this._cachedModels = null;
		this._refreshPromise = null;
		this._onDidChange.fire();
	}
}

/**
 * Register Claude model provider with VS Code's LM system.
 * Returns the provider so the caller can call `invalidateCache()` if needed.
 */
export function registerClaudeModels(context: vscode.ExtensionContext, storagePath: string, log: ILogService): ClaudeModelProvider {
	const provider = new ClaudeModelProvider(storagePath, log);
	log.info('registering with provider ID: ' + CLAUDE_PROVIDER_ID);
	const disposable = vscode.lm.registerLanguageModelChatProvider(CLAUDE_PROVIDER_ID, provider);
	log.info('registered successfully');
	context.subscriptions.push(disposable);
	// Eagerly prefetch model list so it is available before the chat picker
	// or proxy model-lookup needs it; avoids subprocess spawn during a
	// synchronous provideLanguageModelChatInformation call.
	provider.prefetch();
	return provider;
}
