/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AppServerConnection } from '../common/appServer/connection';
import { resolveBinary } from '../common/appServer/client';
import { ILogService } from '../../platform/log/common/logService';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Provider ID used when registering with VS Code's LM system.
 * All models returned by this provider will have `vendor === CODEX_PROVIDER_ID`.
 * CodexParticipant uses this to route to the app server instead of the proxy.
 */
export const CODEX_PROVIDER_ID = 'codex';

/**
 * Family assigned to all Codex-native models. Groups them visually in the picker
 * and is used as a secondary routing signal alongside `vendor`.
 */
export const CODEX_FAMILY = 'codex';

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Language model provider that dynamically fetches available models from the
 * Codex app server via `model/list` JSON-RPC. Each model is tagged with
 * `family: CODEX_FAMILY` so they are visually grouped and can be identified
 * for routing by CodexParticipant.
 *
 * `provideLanguageModelChatResponse` intentionally throws — these models are
 * picker-only signals. Actual routing is handled by CodexParticipant.
 *
 * Model list is cached after the first successful fetch. Call `invalidateCache()`
 * to force a refresh (e.g. when the binary path setting changes).
 */
export class CodexModelProvider implements vscode.LanguageModelChatProvider {
	private _cachedModels: vscode.LanguageModelChatInformation[] | null = null;
	private _refreshPromise: Promise<void> | null = null;
	private readonly _onDidChange = new vscode.EventEmitter<void>();
	readonly onDidChangeLanguageModelChatInformation = this._onDidChange.event;

	constructor(
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
		// Resolve binary path eagerly (settings may not be ready on activate)
		this._refreshPromise = this._doRefresh();
		return this._refreshPromise;
	}

	private async _doRefresh(): Promise<void> {
		try {
			const rawBinaryPath = vscode.workspace.getConfiguration('feima.agents.codex').get<string>('binaryPath') ?? '';
			const binaryPath = resolveBinary(rawBinaryPath);
			this._log.debug(`binary path ${JSON.stringify({ raw: rawBinaryPath, resolved: binaryPath })}`);

			const conn = new AppServerConnection({ binaryPath }, this._log);
			await conn.connect();
			const models = await conn.listModels();
			conn.disconnect();
			this._log.debug(`raw models from app server ${JSON.stringify(models)}`);

			this._cachedModels = models.map(m => ({
				id: m.id,
				name: m.displayName ?? m.label ?? m.id,
				family: CODEX_FAMILY,
				version: '1',
				maxInputTokens: 200000,
				maxOutputTokens: 65536,
				capabilities: { toolCalling: true, imageInput: false },
				isUserSelectable: true,
			}));
			this._log.info(`loaded ${this._cachedModels.length} models`);
			this._onDidChange.fire();
		} catch (err) {
			this._log.error(err instanceof Error ? err : String(err), 'failed to list models');
			// Clear promise so next call can retry
			this._refreshPromise = null;
		}
	}

	async provideLanguageModelChatInformation(
		_options: unknown,
		_token: vscode.CancellationToken
	): Promise<vscode.LanguageModelChatInformation[]> {
		// NEVER spawn a subprocess synchronously — this method is called
		// by vscode.lm.selectChatModels which may be invoked from proxy
		// HTTP handlers on the microtask queue. Blocking here deadlocks.
		//
		// Instead, eagerly prefetch at activation time and always return
		// from cache. If the prefetch hasn't completed yet, kick one off
		// and return empty — the picker will receive models on the next
		// _onDidChange fire.
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
		// Routing is handled by CodexParticipant — models are picker-only
		throw new Error('Codex models must be used via the @codex chat participant');
	}

	/**
	 * Invalidate the cached model list and notify VS Code to re-query.
	 * Call when the codex binary path setting changes.
	 */
	invalidateCache(): void {
		this._cachedModels = null;
		this._refreshPromise = null;
		this._onDidChange.fire();
	}
}

/**
 * Register Codex model provider with VS Code's LM system.
 * Returns the provider so the caller can call `invalidateCache()` if needed.
 */
export function registerCodexModels(context: vscode.ExtensionContext, log: ILogService): CodexModelProvider {
	const provider = new CodexModelProvider(log);
	log.debug(`registering with provider ID: ${CODEX_PROVIDER_ID}`);
	const disposable = vscode.lm.registerLanguageModelChatProvider(CODEX_PROVIDER_ID, provider);
	log.debug('registered successfully');
	context.subscriptions.push(disposable);
	// Eagerly prefetch model list so it is available before the chat picker
	// or proxy model-lookup needs it; avoids subprocess spawn during a
	// synchronous provideLanguageModelChatInformation call.
	provider.prefetch();
	return provider;
}
