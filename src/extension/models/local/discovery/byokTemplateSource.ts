/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Fetches BYOK provider templates from copilot-alternatives' public
 *  `byok-templates/` catalog on GitHub (feimacode/copilot-alternatives,
 *  confirmed public) instead of bundling a local copy. A bundled copy
 *  silently drifts from upstream — model roster, pricing, urls change over
 *  time with no signal here that it happened. Reading the source of truth
 *  directly means a new/updated file in that repo is immediately usable
 *  here with no release on this side, and the loader below is parameterized
 *  by template name — not hardcoded to "feimacode" — so adding support for
 *  another provider already published there is a one-line change, not a
 *  new bundled-file pair.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { ILogService } from '../../../platform/log/common/logService';

const REPO_RAW_BASE = 'https://raw.githubusercontent.com/feimacode/copilot-alternatives/master/byok-templates';
const REPO_CONTENTS_API = 'https://api.github.com/repos/feimacode/copilot-alternatives/contents/byok-templates';
const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const CACHE_KEY_PREFIX = 'feima.byok.templateCache.';

export interface ByokTemplate {
	readonly displayName: string;
	readonly keyInstructions: string;
	readonly chatLanguageModelsFile: string;
}

export interface ByokModel {
	readonly url?: string;
	readonly [key: string]: unknown;
}

export interface ByokGroup {
	readonly name: string;
	readonly vendor: string;
	readonly apiType: string;
	readonly apiKey: string;
	readonly models: readonly ByokModel[];
}

export interface FetchedByokTemplate {
	readonly template: ByokTemplate;
	readonly groups: ByokGroup[];
}

interface CacheEntry extends FetchedByokTemplate {
	fetchedAt: number;
}

async function fetchJson<T>(url: string): Promise<T> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} fetching ${url}`);
		}
		return await response.json() as T;
	} finally {
		clearTimeout(timeoutId);
	}
}

/** Lists available template names (without the `.byok.json` suffix) from the remote catalog. */
export async function listByokTemplateNames(): Promise<string[]> {
	interface ContentsEntry { name: string; type: string }
	const entries = await fetchJson<ContentsEntry[]>(REPO_CONTENTS_API);
	return entries
		.filter(e => e.type === 'file' && e.name.endsWith('.byok.json'))
		.map(e => e.name.slice(0, -'.byok.json'.length));
}

/**
 * Fetches one named template + its model array from the remote catalog.
 * Caches the result in `globalState` (TTL below) so repeated invocations in
 * a session don't re-fetch, and falls back to the last successful fetch —
 * even if stale beyond the TTL — when the network call itself fails, so a
 * flaky connection degrades to "possibly outdated" rather than "broken".
 */
export async function fetchByokTemplate(
	name: string,
	context: vscode.ExtensionContext,
	log: ILogService,
): Promise<FetchedByokTemplate> {
	const cacheKey = CACHE_KEY_PREFIX + name;
	const cached = context.globalState.get<CacheEntry>(cacheKey);
	if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
		return cached;
	}

	try {
		const template = await fetchJson<ByokTemplate>(`${REPO_RAW_BASE}/${name}.byok.json`);
		const groups = await fetchJson<ByokGroup[]>(`${REPO_RAW_BASE}/${template.chatLanguageModelsFile}`);
		const entry: CacheEntry = { fetchedAt: Date.now(), template, groups };
		await context.globalState.update(cacheKey, entry);
		return entry;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (cached) {
			log.warn(`[byokTemplateSource] Fetch failed for "${name}" (${message}) — using cached copy from ${new Date(cached.fetchedAt).toISOString()}`);
			return cached;
		}
		log.error(error as Error, `[byokTemplateSource] Fetch failed for "${name}" and no cached copy exists`);
		throw error;
	}
}
