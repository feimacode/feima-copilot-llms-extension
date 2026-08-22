/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Registry of connection recipes for local/enterprise model endpoints.
 *  Mirrors ModelCatalogService's shape (onDidChange event, in-memory list)
 *  but has no authoritative server behind it — the extension itself is the
 *  authority, populated by discovery (see discovery/*.ts).
 *
 *  Persistence scope is split by origin, not stored as one flat list:
 *  - port-probe / manual entries -> ExtensionContext.globalState (machine-local,
 *    never synced — see design.md "Persistence Scope Separation")
 *  - api keys -> ExtensionContext.secrets (never plain globalState)
 *  - workspace-config entries -> read live from the workspace file, never
 *    written back by the registry
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../platform/log/common/logService';
import { LocalEndpointEntry, LocalEndpointEntryInput, LocalEndpointHealth, ModelOverride, idForEndpoint } from './types';
import { readWorkspaceEndpoints } from './discovery/workspaceConfig';

const GLOBAL_STATE_KEY = 'feima.localModels.personalEntries';
const GLOBAL_STATE_KEY_OVERRIDES = 'feima.localModels.modelOverrides';
const SECRET_KEY_PREFIX = 'feima.localModels.apiKey.';

export class LocalEndpointRegistry {
	private readonly _onDidChangeEntries = new vscode.EventEmitter<void>();
	readonly onDidChangeEntries = this._onDidChangeEntries.event;

	/** Fired with the changed entry's id whenever `markHealth` is called — from
	 *  this class's own probes or from any other caller (e.g. LocalEndpointProvider's
	 *  normal aggregation fan-out) — so consumers like a status view can do a
	 *  targeted refresh on *any* health update, not just their own actions.
	 *  See add-endpoint-management-view design.md "A new onDidChangeHealth event". */
	private readonly _onDidChangeHealth = new vscode.EventEmitter<string>();
	readonly onDidChangeHealth = this._onDidChangeHealth.event;

	/** Fired with the affected entry's id whenever a model override is added, changed, or removed. */
	private readonly _onDidChangeModelOverrides = new vscode.EventEmitter<string>();
	readonly onDidChangeModelOverrides = this._onDidChangeModelOverrides.event;

	private _personalEntries: LocalEndpointEntry[] = [];
	private _workspaceEntries: LocalEndpointEntry[] = [];
	private _modelOverrides: ModelOverride[] = [];
	/** In-memory-only liveness/confidence state — never persisted (design.md "hard config vs soft state"). */
	private readonly _health = new Map<string, LocalEndpointHealth>();
	private _workspaceLoadPromise: Promise<void> | null = null;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly log: ILogService,
	) {
		this._personalEntries = this.context.globalState.get<LocalEndpointEntry[]>(GLOBAL_STATE_KEY, []);
		this._modelOverrides = this.context.globalState.get<ModelOverride[]>(GLOBAL_STATE_KEY_OVERRIDES, []);
		void this._dedupePersonalEntries();
		this._workspaceLoadPromise = this._loadWorkspaceEntries();
	}

	/** All entries, personal + workspace-shared, merged for read. Storage stays separate. */
	get entries(): readonly LocalEndpointEntry[] {
		return [...this._personalEntries, ...this._workspaceEntries];
	}

	async ready(): Promise<void> {
		await this._workspaceLoadPromise;
	}

	getEntry(id: string): LocalEndpointEntry | undefined {
		return this.entries.find(e => e.id === id);
	}

	async getApiKey(id: string): Promise<string | undefined> {
		return this.context.secrets.get(SECRET_KEY_PREFIX + id);
	}

	/**
	 * Add or update a personal (machine-local) entry. Workspace-shared entries
	 * are never written here — they come only from the workspace config file.
	 */
	async upsertPersonalEntry(input: LocalEndpointEntryInput): Promise<LocalEndpointEntry> {
		const id = idForEndpoint(input.baseEndpoint);
		const entry: LocalEndpointEntry = {
			id,
			baseEndpoint: input.baseEndpoint.replace(/\/+$/, ''),
			apiFormat: input.apiFormat,
			modelEndpointPath: input.modelEndpointPath,
			completionsEndpointPath: input.completionsEndpointPath,
			origin: input.origin,
			label: input.label,
		};

		const existingIndex = this._personalEntries.findIndex(e => e.id === id);
		if (existingIndex >= 0) {
			this._personalEntries[existingIndex] = entry;
		} else {
			this._personalEntries.push(entry);
		}
		await this._savePersonalEntries();

		if (input.apiKey) {
			await this.context.secrets.store(SECRET_KEY_PREFIX + id, input.apiKey);
		}

		this.log.info(`[LocalEndpointRegistry] Registered entry ${id} (${entry.origin}, ${entry.apiFormat})`);
		this._onDidChangeEntries.fire();
		return entry;
	}

	async removePersonalEntry(id: string): Promise<void> {
		const before = this._personalEntries.length;
		this._personalEntries = this._personalEntries.filter(e => e.id !== id);
		if (this._personalEntries.length === before) {
			return;
		}
		await this._savePersonalEntries();
		await this.context.secrets.delete(SECRET_KEY_PREFIX + id);
		this._health.delete(id);
		await this._removeAllModelOverrides(id);
		this.log.info(`[LocalEndpointRegistry] Removed entry ${id}`);
		this._onDidChangeEntries.fire();
	}

	/**
	 * Edit an existing personal entry. When `baseEndpoint` is unchanged the id
	 * stays stable and this is just `upsertPersonalEntry`. When it changes, the
	 * derived id changes too (see `idForEndpoint`) — this carries the API key
	 * and any model overrides forward to the new id and removes the old entry,
	 * instead of orphaning it (the gap plain `upsertPersonalEntry`-as-edit has).
	 */
	async updatePersonalEntry(currentId: string, input: LocalEndpointEntryInput): Promise<LocalEndpointEntry> {
		const newId = idForEndpoint(input.baseEndpoint);
		if (newId === currentId) {
			return this.upsertPersonalEntry(input);
		}

		const carriedKey = input.apiKey ?? await this.getApiKey(currentId);
		const entry = await this.upsertPersonalEntry({ ...input, apiKey: carriedKey });
		for (const override of this.getModelOverrides(currentId)) {
			await this.upsertModelOverride({ ...override, entryId: newId });
		}
		await this.removePersonalEntry(currentId);
		this.log.info(`[LocalEndpointRegistry] Edited entry: id changed ${currentId} -> ${newId}`);
		return entry;
	}

	getModelOverrides(entryId: string): readonly ModelOverride[] {
		return this._modelOverrides.filter(o => o.entryId === entryId);
	}

	getModelOverride(entryId: string, modelId: string): ModelOverride | undefined {
		return this._modelOverrides.find(o => o.entryId === entryId && o.modelId === modelId);
	}

	async upsertModelOverride(override: ModelOverride): Promise<void> {
		const index = this._modelOverrides.findIndex(o => o.entryId === override.entryId && o.modelId === override.modelId);
		if (index >= 0) {
			this._modelOverrides[index] = override;
		} else {
			this._modelOverrides.push(override);
		}
		await this._saveModelOverrides();
		this.log.info(`[LocalEndpointRegistry] Set model override ${override.entryId}::${override.modelId} (manual=${override.manual})`);
		this._onDidChangeModelOverrides.fire(override.entryId);
	}

	async removeModelOverride(entryId: string, modelId: string): Promise<void> {
		const before = this._modelOverrides.length;
		this._modelOverrides = this._modelOverrides.filter(o => !(o.entryId === entryId && o.modelId === modelId));
		if (this._modelOverrides.length === before) {
			return;
		}
		await this._saveModelOverrides();
		this.log.info(`[LocalEndpointRegistry] Removed model override ${entryId}::${modelId}`);
		this._onDidChangeModelOverrides.fire(entryId);
	}

	private async _removeAllModelOverrides(entryId: string): Promise<void> {
		const before = this._modelOverrides.length;
		this._modelOverrides = this._modelOverrides.filter(o => o.entryId !== entryId);
		if (this._modelOverrides.length !== before) {
			await this._saveModelOverrides();
		}
	}

	private async _saveModelOverrides(): Promise<void> {
		await this.context.globalState.update(GLOBAL_STATE_KEY_OVERRIDES, this._modelOverrides);
	}

	markHealth(id: string, health: LocalEndpointHealth): void {
		this._health.set(id, health);
		this._onDidChangeHealth.fire(id);
	}

	getHealth(id: string): LocalEndpointHealth | undefined {
		return this._health.get(id);
	}

	/** Force re-read of workspace config and fire a change event. Personal entries are not touched here — see refresh command (group 5) for full-registry refresh. */
	async refreshWorkspaceEntries(): Promise<void> {
		await this._loadWorkspaceEntries();
		this._onDidChangeEntries.fire();
	}

	private async _savePersonalEntries(): Promise<void> {
		await this.context.globalState.update(GLOBAL_STATE_KEY, this._personalEntries);
	}

	/**
	 * Self-heal entries persisted before `idForEndpoint` normalized localhost/127.0.0.1 —
	 * without this, an old "http://localhost:11434" entry and a fresh port-probed
	 * "http://127.0.0.1:11434" entry both survive as separate ids and the same
	 * models are aggregated (and shown in the picker) twice. Keeps the manual
	 * entry over a port-probe one when both target the same normalized id.
	 */
	private async _dedupePersonalEntries(): Promise<void> {
		const byNormalizedId = new Map<string, LocalEndpointEntry[]>();
		for (const entry of this._personalEntries) {
			const key = idForEndpoint(entry.baseEndpoint);
			const group = byNormalizedId.get(key);
			if (group) {
				group.push(entry);
			} else {
				byNormalizedId.set(key, [entry]);
			}
		}

		let changed = false;
		const deduped: LocalEndpointEntry[] = [];
		for (const [key, group] of byNormalizedId) {
			if (group.length === 1) {
				deduped.push(group[0]);
				continue;
			}
			changed = true;
			const kept = group.find(e => e.origin === 'manual') ?? group[0];
			const dropped = group.filter(e => e !== kept);
			this.log.warn(`[LocalEndpointRegistry] Deduplicated ${group.length} entries for ${key}, keeping ${kept.id} (${kept.origin}), dropping ${dropped.map(e => `${e.id} (${e.origin})`).join(', ')}`);
			// Re-stamp the id to the normalized key too — entries persisted before
			// idForEndpoint normalized localhost/127.0.0.1 keep their stale literal id
			// otherwise, so upsertPersonalEntry's `e.id === id` lookup never matches on
			// the next port-probe/manual re-registration and silently re-inserts the
			// very duplicate that was just removed here (repeating on every activation).
			if (kept.id !== key) {
				const oldId = kept.id;
				kept.id = key;
				const apiKey = await this.context.secrets.get(SECRET_KEY_PREFIX + oldId);
				if (apiKey) {
					await this.context.secrets.store(SECRET_KEY_PREFIX + key, apiKey);
					await this.context.secrets.delete(SECRET_KEY_PREFIX + oldId);
				}
			}
			for (const entry of dropped) {
				await this.context.secrets.delete(SECRET_KEY_PREFIX + entry.id);
			}
			deduped.push(kept);
		}

		if (changed) {
			this._personalEntries = deduped;
			await this._savePersonalEntries();
		}
	}

	private async _loadWorkspaceEntries(): Promise<void> {
		try {
			this._workspaceEntries = await readWorkspaceEndpoints(this.log);
			this.log.debug(`[LocalEndpointRegistry] Loaded ${this._workspaceEntries.length} workspace-shared entries`);
		} catch (error) {
			this.log.error(error as Error, '[LocalEndpointRegistry] Failed to load workspace-shared entries');
			this._workspaceEntries = [];
		}
	}
}
