/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Generic endpoint probe: a single request that confirms liveness AND
 *  discovers the model list at once (see design.md "Discovery = liveness
 *  check, not a separate step"). No VS Code dependency — kept pure so it is
 *  unit-testable with a fake fetch.
 *--------------------------------------------------------------------------------------------*/

import fetch from 'node-fetch';
import { DiscoveredModel, LocalApiFormat, defaultCompletionsPath } from '../types';

export interface ProbeCandidate {
	path: string;
	format: LocalApiFormat;
	parse: (body: unknown) => DiscoveredModel[];
}

function parseOllamaTags(body: unknown): DiscoveredModel[] {
	const data = body as { models?: Array<{ name?: string; model?: string; [k: string]: unknown }> };
	if (!Array.isArray(data.models)) {
		return [];
	}
	const result: DiscoveredModel[] = [];
	for (const m of data.models) {
		const id = m.name ?? m.model;
		if (typeof id === 'string' && id.length > 0) {
			result.push({ id, raw: m as Record<string, unknown> });
		}
	}
	return result;
}

function parseOpenAIModelList(body: unknown): DiscoveredModel[] {
	const data = body as { data?: Array<{ id?: string; [k: string]: unknown }> };
	if (!Array.isArray(data.data)) {
		return [];
	}
	const result: DiscoveredModel[] = [];
	for (const m of data.data) {
		if (typeof m.id === 'string' && m.id.length > 0) {
			result.push({ id: m.id, raw: m as Record<string, unknown> });
		}
	}
	return result;
}

/**
 * Candidates tried in order for an unknown endpoint. Richer/native shapes are
 * tried before the generic OpenAI-compatible fallback so more metadata is
 * captured when available (see design.md "endpoint-reported metadata preferred").
 * `/api/v0/models` (LM Studio native) is still classified `openai-compat` —
 * its completions endpoint is the standard one; only the listing path differs.
 */
export const DEFAULT_PROBE_CANDIDATES: ProbeCandidate[] = [
	{ path: '/api/tags', format: 'ollama-native', parse: parseOllamaTags },
	{ path: '/api/v0/models', format: 'openai-compat', parse: parseOpenAIModelList },
	{ path: '/v1/models', format: 'openai-compat', parse: parseOpenAIModelList },
	// Olla's unified OpenAI-compatible entry point (see thushan/olla) — nested
	// under /olla/proxy/, distinct from a bare OpenAI-compatible server's /v1/models.
	{ path: '/olla/proxy/v1/models', format: 'openai-compat', parse: parseOpenAIModelList },
];

export interface ProbeResult {
	ok: true;
	format: LocalApiFormat;
	modelEndpointPath: string;
	models: DiscoveredModel[];
}

/** Known listing-path suffixes whose prefix (if any) also namespaces the completions path — e.g. Olla's `/olla/proxy/v1/models`. */
const KNOWN_LISTING_SUFFIXES = ['/v1/models', '/api/tags', '/api/v0/models'];

/**
 * Derive the completions path from wherever the listing path actually
 * succeeded, rather than blindly defaulting from api-format alone — a
 * gateway that nests its listing endpoint under a prefix (e.g. Olla's
 * `/olla/proxy/v1/models`) nests its completions endpoint under the same
 * prefix. Falls back to the plain per-format default when the listing path
 * doesn't match a known shape (e.g. it was set by hand).
 */
export function completionsPathForProbeResult(result: ProbeResult): string {
	const suffix = KNOWN_LISTING_SUFFIXES.find(s => result.modelEndpointPath.endsWith(s));
	if (suffix === undefined) {
		return defaultCompletionsPath(result.format);
	}
	const prefix = result.modelEndpointPath.slice(0, result.modelEndpointPath.length - suffix.length);
	return `${prefix}${defaultCompletionsPath(result.format)}`;
}

export interface ProbeFailure {
	ok: false;
	reason: string;
}

const PROBE_TIMEOUT_MS = 1500;

/**
 * Try a single candidate path against a base endpoint. Never throws —
 * network errors, timeouts, non-2xx responses, and unparseable bodies all
 * resolve to a failure result so callers can move to the next candidate or
 * conclude "not found" without special-casing exceptions.
 */
async function tryCandidate(
	baseEndpoint: string,
	candidate: ProbeCandidate,
	apiKey?: string,
): Promise<ProbeResult | ProbeFailure> {
	const url = `${baseEndpoint.replace(/\/+$/, '')}${candidate.path}`;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
	try {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (apiKey) {
			headers['Authorization'] = `Bearer ${apiKey}`;
		}
		const response = await fetch(url, { method: 'GET', headers, signal: controller.signal });
		if (!response.ok) {
			return { ok: false, reason: `HTTP ${response.status}` };
		}
		const body = await response.json();
		const models = candidate.parse(body);
		if (models.length === 0) {
			return { ok: false, reason: 'no models in response' };
		}
		return { ok: true, format: candidate.format, modelEndpointPath: candidate.path, models };
	} catch (error) {
		return { ok: false, reason: error instanceof Error ? error.message : String(error) };
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Probe a base endpoint against a set of candidates (default: all known
 * shapes) in order, returning the first success. This single call is both
 * the liveness check and the model discovery — there is no separate ping.
 */
export async function probeEndpoint(
	baseEndpoint: string,
	apiKey?: string,
	candidates: ProbeCandidate[] = DEFAULT_PROBE_CANDIDATES,
): Promise<ProbeResult | ProbeFailure> {
	let lastFailure: ProbeFailure = { ok: false, reason: 'no candidates tried' };
	for (const candidate of candidates) {
		const result = await tryCandidate(baseEndpoint, candidate, apiKey);
		if (result.ok) {
			return result;
		}
		lastFailure = result;
	}
	return lastFailure;
}

/**
 * Probe a base endpoint against one already-known recipe (format + path),
 * used to re-validate an existing registry entry rather than rediscover it.
 */
export async function probeKnownEndpoint(
	baseEndpoint: string,
	format: LocalApiFormat,
	modelEndpointPath: string,
	apiKey?: string,
): Promise<ProbeResult | ProbeFailure> {
	const parse = DEFAULT_PROBE_CANDIDATES.find(c => c.path === modelEndpointPath)?.parse ?? parseOpenAIModelList;
	return tryCandidate(baseEndpoint, { path: modelEndpointPath, format, parse }, apiKey);
}
