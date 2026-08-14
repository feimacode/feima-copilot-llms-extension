/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Shared types for local/enterprise model endpoint discovery and registry.
 *  See openspec/changes/add-local-model-endpoints/design.md for the rationale
 *  behind the entry shape (recipe, not model list) and the two-path split.
 *--------------------------------------------------------------------------------------------*/

/**
 * Wire protocol an endpoint speaks. Endpoints are classified by protocol,
 * never by runtime name — vLLM, llama.cpp, SGLang, and LiteLLM are all
 * `openai-compat` in practice, so no runtime-specific branching is needed
 * beyond this.
 */
export type LocalApiFormat = 'openai-compat' | 'ollama-native' | 'anthropic-messages';

/**
 * How an entry came to be registered. Determines persistence scope:
 * `port-probe` and `manual` are always machine-local (never synced —
 * `127.0.0.1` on this machine means nothing on another); `workspace-config`
 * entries live only in the workspace's shared config file.
 */
export type LocalEndpointOrigin = 'port-probe' | 'manual' | 'workspace-config';

/**
 * A connection recipe for a local or enterprise model endpoint. Deliberately
 * does NOT include the model list — that is always fetched live from
 * `modelEndpointPath` at picker-refresh time, never cached as part of the
 * entry itself (see design.md "Registry stores connection recipes, not model
 * lists").
 */
export interface LocalEndpointEntry {
	/** Stable identifier, derived from baseEndpoint (see idForEndpoint). */
	id: string;
	/** e.g. "http://127.0.0.1:11434" — no trailing slash. */
	baseEndpoint: string;
	apiFormat: LocalApiFormat;
	/**
	 * No safe cross-format default exists (LM Studio alone exposes two
	 * different listing paths with different response shapes) — this must
	 * be the exact path that succeeded during discovery/validation.
	 */
	modelEndpointPath: string;
	/**
	 * Has a usable default derived from apiFormat (see defaultCompletionsPath)
	 * in most cases, but stored explicitly so it can be overridden for
	 * non-standard deployments (e.g. an Anthropic-Messages-shaped gateway).
	 */
	completionsEndpointPath: string;
	origin: LocalEndpointOrigin;
	/** Optional user-facing label; falls back to baseEndpoint when absent. */
	label?: string;
}

/** Non-persisted, non-secret entry data. Secrets are stored separately (see registry). */
export type LocalEndpointEntryInput = Omit<LocalEndpointEntry, 'id'> & { apiKey?: string };

/**
 * Default completions path per api-format. Even Ollama, despite having its
 * own native `/api/chat`, also serves `/v1/chat/completions` — so
 * `openai-compat` covers it too unless discovery finds a reason to override.
 */
export function defaultCompletionsPath(apiFormat: LocalApiFormat): string {
	switch (apiFormat) {
		case 'anthropic-messages':
			return '/v1/messages';
		case 'ollama-native':
		case 'openai-compat':
		default:
			return '/v1/chat/completions';
	}
}

/**
 * Deterministic id from a base endpoint, so re-discovery of the same endpoint
 * doesn't duplicate entries. `localhost` and `127.0.0.1` are the same loopback
 * address, so they're normalized to one id here — otherwise a manually-added
 * "http://localhost:11434" and a port-probed "http://127.0.0.1:11434" register
 * as two separate entries and the same models show up twice in the picker.
 */
export function idForEndpoint(baseEndpoint: string): string {
	const normalized = baseEndpoint.trim().replace(/\/+$/, '').toLowerCase();
	return normalized.replace(/^(https?:\/\/)localhost(:|\/|$)/, '$1127.0.0.1$2');
}

/** A model returned by an endpoint's model-list call, before metadata resolution. */
export interface DiscoveredModel {
	/** Model id as reported by the endpoint (used verbatim in completion requests). */
	id: string;
	name?: string;
	/** Raw fields the endpoint reported, if any — consumed by the metadata resolver. */
	raw?: Record<string, unknown>;
}

/** In-memory-only liveness/confidence state for a registry entry. Never persisted. */
export interface LocalEndpointHealth {
	lastCheckedAt: number;
	reachable: boolean;
	lastError?: string;
}

/** How a resolved metadata value was obtained — surfaced to the user, never silently presented as fact when estimated. */
export type MetadataConfidence = 'confirmed' | 'estimated' | 'unconfirmed';

export interface ResolvedModelMetadata {
	maxInputTokens: number;
	maxOutputTokens: number;
	toolCalling: boolean;
	imageInput: boolean;
	confidence: MetadataConfidence;
	/** Human-readable note on where the metadata came from — shown in the picker tooltip. */
	source: string;
}

/** Conservative fallback used when nothing else resolves — small enough to be safe, not so small it's useless. */
export const CONSERVATIVE_DEFAULT_METADATA: Omit<ResolvedModelMetadata, 'source'> = {
	maxInputTokens: 4096,
	maxOutputTokens: 2048,
	toolCalling: false,
	imageInput: false,
	confidence: 'unconfirmed',
};
