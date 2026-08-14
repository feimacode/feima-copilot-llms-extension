/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Local Endpoint Provider — exposes models from every registered local/
 *  enterprise endpoint as a single new picker category, mirroring
 *  FeimaLanguageModelProvider's registration pattern. Where the Feima
 *  provider asks one authoritative ModelCatalogService, this provider fans
 *  out to every LocalEndpointRegistry entry's own model-list endpoint live
 *  and merges the results (see design.md "Provider mirrors the existing
 *  Feima pattern, one level removed").
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../platform/log/common/logService';
import { LocalEndpointRegistry } from './localEndpointRegistry';
import { LocalChatEndpoint } from './localChatEndpoint';
import { resolveModelMetadata } from './metadata/metadataResolver';
import { probeKnownEndpoint } from './discovery/probe';
import { LocalEndpointEntry, idForEndpoint } from './types';

/** Same TTL as ModelCatalogService — see design.md "Aggregate Cache Consistency". */
const CACHE_DURATION_MS = 5 * 60 * 1000;
const PER_ENTRY_TIMEOUT_MS = 2000;

interface AggregatedModel {
	info: vscode.LanguageModelChatInformation;
	entryId: string;
	rawModelId: string;
	apiKey: string | undefined;
}

export class LocalEndpointProvider implements vscode.LanguageModelChatProvider {
	private readonly _onDidChange = new vscode.EventEmitter<void>();
	readonly onDidChangeLanguageModelChatInformation = this._onDidChange.event;

	private _cache: AggregatedModel[] | null = null;
	private _lastFetch = 0;

	constructor(
		private readonly registry: LocalEndpointRegistry,
		private readonly log: ILogService,
	) {
		// Registry changes (new entry added/removed, workspace config reloaded)
		// invalidate the aggregate immediately so new endpoints appear without
		// a VS Code restart (spec: "Registry entry added mid-session").
		registry.onDidChangeEntries(() => {
			this.invalidateCache();
			this._onDidChange.fire();
		});
	}

	/** Used by the manual refresh command (group 5) to force immediate re-aggregation. */
	invalidateCache(): void {
		this._cache = null;
		this._lastFetch = 0;
	}

	async provideLanguageModelChatInformation(
		_options: { silent: boolean },
		_token: vscode.CancellationToken,
	): Promise<vscode.LanguageModelChatInformation[]> {
		const now = Date.now();
		if (this._cache && now - this._lastFetch < CACHE_DURATION_MS) {
			return this._cache.map(c => c.info);
		}

		await this.registry.ready();
		const entries = this.registry.entries;
		this.log.debug(`[LocalEndpointProvider] Aggregating models from ${entries.length} registered endpoint(s): ${entries.map(e => `${e.baseEndpoint} (${e.origin})`).join(', ')}`);

		const perEntryResults = await Promise.all(entries.map(entry => this._fetchEntryModels(entry)));
		for (const [i, result] of perEntryResults.entries()) {
			this.log.debug(`[LocalEndpointProvider] ${entries[i].baseEndpoint} (${entries[i].origin}) contributed ${result.length} model(s): ${result.map(r => r.rawModelId).join(', ')}`);
		}
		const flat = perEntryResults.flat();
		this._logPotentialDuplicates(entries, flat);

		this._cache = flat;
		this._lastFetch = now;
		this.log.info(`[LocalEndpointProvider] Aggregated ${flat.length} model(s) from ${entries.length} endpoint(s)`);
		return flat.map(c => c.info);
	}

	/**
	 * Fetch and describe models for one entry. Never throws — an unreachable
	 * or misbehaving endpoint contributes zero models and does not prevent
	 * other entries' models from being shown (spec: "One endpoint is unreachable").
	 */
	private async _fetchEntryModels(entry: LocalEndpointEntry): Promise<AggregatedModel[]> {
		try {
			const apiKey = await this.registry.getApiKey(entry.id);
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), PER_ENTRY_TIMEOUT_MS);
			let probeResult;
			try {
				probeResult = await probeKnownEndpoint(entry.baseEndpoint, entry.apiFormat, entry.modelEndpointPath, apiKey);
			} finally {
				clearTimeout(timeoutId);
			}

			if (!probeResult.ok) {
				this.registry.markHealth(entry.id, { lastCheckedAt: Date.now(), reachable: false, lastError: probeResult.reason });
				this.log.debug(`[LocalEndpointProvider] ${entry.baseEndpoint} unreachable: ${probeResult.reason}`);
				return [];
			}
			this.registry.markHealth(entry.id, { lastCheckedAt: Date.now(), reachable: true });

			return await Promise.all(probeResult.models.map(async model => {
				const metadata = await resolveModelMetadata(entry, model, this.log);
				const label = entry.label ?? entry.baseEndpoint;
				const info: vscode.LanguageModelChatInformation = {
					// Namespaced so identically-named models from two different
					// endpoints never collide in the picker.
					id: `${entry.id}::${model.id}`,
					name: model.name ?? model.id,
					family: 'feima-local',
					version: '1',
					maxInputTokens: metadata.maxInputTokens,
					maxOutputTokens: metadata.maxOutputTokens,
					tooltip: `${label} — ${metadata.source}`,
					detail: metadata.confidence === 'confirmed' ? label : `${label} (estimated capabilities)`,
					isUserSelectable: true,
					capabilities: { imageInput: metadata.imageInput, toolCalling: metadata.toolCalling },
				};
				return { info, entryId: entry.id, rawModelId: model.id, apiKey };
			}));
		} catch (error) {
			this.log.error(error as Error, `[LocalEndpointProvider] Failed to fetch models for ${entry.baseEndpoint}`);
			return [];
		}
	}

	/**
	 * Diagnostic-only: warns when two different registry entries resolve the
	 * same normalized loopback host and report the same raw model id, since
	 * that's a duplicate-in-the-picker symptom (e.g. a workspace-shared entry
	 * overlapping a personal one — those two scopes aren't deduplicated the
	 * way personal entries are, see LocalEndpointRegistry._dedupePersonalEntries).
	 */
	private _logPotentialDuplicates(entries: readonly LocalEndpointEntry[], flat: AggregatedModel[]): void {
		const entryById = new Map(entries.map(e => [e.id, e]));
		const seen = new Map<string, string>();
		for (const model of flat) {
			const entry = entryById.get(model.entryId);
			if (!entry) {
				continue;
			}
			const key = `${idForEndpoint(entry.baseEndpoint)}::${model.rawModelId}`;
			const priorEntryId = seen.get(key);
			if (priorEntryId && priorEntryId !== entry.id) {
				this.log.warn(`[LocalEndpointProvider] Model "${model.rawModelId}" is reported by both ${priorEntryId} and ${entry.id} — it will appear twice in the picker`);
			} else {
				seen.set(key, entry.id);
			}
		}
	}

	private _lookup(modelId: string): AggregatedModel | undefined {
		return this._cache?.find(c => c.info.id === modelId);
	}

	async provideLanguageModelChatResponse(
		model: vscode.LanguageModelChatInformation,
		messages: vscode.LanguageModelChatMessage[],
		options: vscode.ProvideLanguageModelChatResponseOptions,
		progress: vscode.Progress<vscode.LanguageModelResponsePart | vscode.LanguageModelToolCallPart>,
		token: vscode.CancellationToken,
	): Promise<void> {
		// Widened locally only for reporting LanguageModelThinkingPart (proposed API,
		// not part of the stable LanguageModelResponsePart union) — the public method
		// signature above must stay exactly what LanguageModelChatProvider declares.
		const thinkingProgress = progress as vscode.Progress<vscode.LanguageModelResponsePart | vscode.LanguageModelToolCallPart | vscode.LanguageModelThinkingPart>;
		const cached = this._lookup(model.id);
		if (!cached) {
			throw new Error(vscode.l10n.t('Local model {0} is no longer registered', model.id));
		}
		const entry = this.registry.getEntry(cached.entryId);
		if (!entry) {
			throw new Error(vscode.l10n.t('Endpoint for {0} is no longer registered', model.id));
		}

		const endpoint = new LocalChatEndpoint(entry, cached.rawModelId, cached.apiKey, this.log);
		const reportedToolCallIds = new Set<string>();
		const thinkingId = `feima-local-thinking-${Date.now()}`;

		const result = await endpoint.makeChatRequest(
			messages,
			async (_fullText, delta) => {
				if (delta.text) {
					progress.report(new vscode.LanguageModelTextPart(delta.text));
				}
				if (delta.reasoningContent) {
					this.log.debug(`[LocalEndpointProvider] Emitting reasoning from ${entry.baseEndpoint}: ${delta.reasoningContent.length} chars`);
					try {
						thinkingProgress.report(new vscode.LanguageModelThinkingPart(delta.reasoningContent, thinkingId, {}));
					} catch (err) {
						this.log.warn(`[LocalEndpointProvider] Failed to report thinking part: ${err instanceof Error ? err.message : String(err)}`);
					}
				}
				if (delta.toolCalls) {
					for (const call of delta.toolCalls) {
						if (reportedToolCallIds.has(call.id)) {
							continue;
						}
						try {
							const parameters = JSON.parse(call.arguments || '{}');
							progress.report(new vscode.LanguageModelToolCallPart(call.id, call.name, parameters));
							reportedToolCallIds.add(call.id);
						} catch (err) {
							this.log.error(err as Error, `[LocalEndpointProvider] Malformed tool call JSON from ${entry.baseEndpoint} for ${call.name}`);
						}
					}
				}
				return undefined;
			},
			token,
			options.tools,
			options.toolMode,
		);

		if (result.type === 'cancelled') {
			return;
		}
		if (result.type === 'unauthorized') {
			throw new Error(result.reason);
		}
		if (result.type === 'error') {
			throw new Error(result.reason);
		}
	}

	async provideTokenCount(
		model: vscode.LanguageModelChatInformation,
		text: string | vscode.LanguageModelChatMessage,
		_token: vscode.CancellationToken,
	): Promise<number> {
		const cached = this._lookup(model.id);
		if (!cached) {
			// Conservative character-based estimate when the model has fallen out of cache.
			const raw = typeof text === 'string' ? text : JSON.stringify(text);
			return Math.ceil(raw.length / 4);
		}
		const endpoint = new LocalChatEndpoint(
			this.registry.getEntry(cached.entryId)!,
			cached.rawModelId,
			cached.apiKey,
			this.log,
		);
		return endpoint.provideTokenCount(text);
	}

	dispose(): void {
		this._onDidChange.dispose();
	}
}
