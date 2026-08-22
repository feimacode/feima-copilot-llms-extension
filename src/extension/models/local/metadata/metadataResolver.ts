/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Layered model-metadata resolution: prefer what the endpoint itself
 *  reports, fall back to the vendored reference table, and finally a
 *  conservative default — never excluding a model for lack of metadata (see
 *  specs/local-model-metadata/spec.md). Deliberately protocol-generic: it
 *  only distinguishes "rich" vs. "sparse" endpoint responses, not runtime
 *  names (see design.md "Metadata resolution is layered, not per-runtime").
 *--------------------------------------------------------------------------------------------*/

import fetch from 'node-fetch';
import { ILogService } from '../../../platform/log/common/logService';
import { CONSERVATIVE_DEFAULT_METADATA, DiscoveredModel, LocalEndpointEntry, ResolvedModelMetadata } from '../types';
import { lookupReferenceTable } from './referenceTable';

const OLLAMA_SHOW_TIMEOUT_MS = 1000;

/** Fields various endpoints use for context length — checked in order. */
const CONTEXT_LENGTH_FIELDS = ['context_length', 'max_context_length', 'context_window', 'num_ctx'];

interface OllamaShowResponse {
	model_info?: Record<string, unknown>;
	capabilities?: string[];
	details?: { quantization_level?: string; parameter_size?: string };
}

/**
 * Ollama's list endpoint (/api/tags) doesn't carry context length; the
 * per-model /api/show endpoint does (see feasibility study — GGUF header
 * metadata via model_info). Best-effort, short-timeout, never blocks picker
 * population on failure.
 */
async function fetchOllamaShowMetadata(baseEndpoint: string, modelId: string, log: ILogService): Promise<OllamaShowResponse | undefined> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), OLLAMA_SHOW_TIMEOUT_MS);
	try {
		const response = await fetch(`${baseEndpoint}/api/show`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: modelId }),
			signal: controller.signal,
		});
		if (!response.ok) {
			return undefined;
		}
		return await response.json() as OllamaShowResponse;
	} catch (error) {
		log.debug(`[metadataResolver] /api/show lookup failed for ${modelId}: ${error instanceof Error ? error.message : String(error)}`);
		return undefined;
	} finally {
		clearTimeout(timeoutId);
	}
}

function extractContextLength(raw: Record<string, unknown> | undefined): number | undefined {
	if (!raw) {
		return undefined;
	}
	for (const field of CONTEXT_LENGTH_FIELDS) {
		const value = raw[field];
		if (typeof value === 'number' && value > 0) {
			return value;
		}
	}
	// Ollama's model_info nests context length under an architecture-prefixed key
	// (e.g. "llama.context_length") rather than a fixed top-level field.
	for (const [key, value] of Object.entries(raw)) {
		if (key.endsWith('.context_length') && typeof value === 'number' && value > 0) {
			return value;
		}
	}
	return undefined;
}

/**
 * Resolve capability metadata for one discovered model.
 * Order: endpoint-reported (list response, then Ollama /api/show if needed) -> reference table -> conservative default.
 */
export async function resolveModelMetadata(
	entry: LocalEndpointEntry,
	model: DiscoveredModel,
	log: ILogService,
): Promise<ResolvedModelMetadata> {
	// 1. Whatever the list response itself already reported.
	let contextLength = extractContextLength(model.raw);
	let toolCalling: boolean | undefined;
	let imageInput: boolean | undefined;

	if (model.raw?.capabilities && Array.isArray(model.raw.capabilities)) {
		const caps = model.raw.capabilities as string[];
		toolCalling = caps.includes('tools');
		imageInput = caps.includes('vision');
	}

	// 2. Ollama can be asked directly for richer per-model metadata when the
	// list response didn't already have it.
	if (contextLength === undefined && entry.apiFormat === 'ollama-native') {
		const show = await fetchOllamaShowMetadata(entry.baseEndpoint, model.id, log);
		if (show) {
			contextLength = extractContextLength(show.model_info);
			if (show.capabilities) {
				toolCalling = show.capabilities.includes('tools');
				imageInput = show.capabilities.includes('vision');
			}
		}
	}

	if (contextLength !== undefined) {
		return {
			maxInputTokens: contextLength,
			maxOutputTokens: Math.min(contextLength, CONSERVATIVE_DEFAULT_METADATA.maxOutputTokens * 2),
			toolCalling: toolCalling ?? false,
			imageInput: imageInput ?? false,
			confidence: 'confirmed',
			source: 'Reported by endpoint',
		};
	}

	// 3. Fallback reference table, matched by name pattern.
	const referenceMatch = lookupReferenceTable(model.id);
	if (referenceMatch) {
		return {
			maxInputTokens: referenceMatch.maxInputTokens,
			maxOutputTokens: referenceMatch.maxOutputTokens,
			toolCalling: toolCalling ?? referenceMatch.toolCalling,
			imageInput: imageInput ?? false,
			confidence: 'estimated',
			source: 'Estimated from model name',
		};
	}

	// 4. Conservative default — still include the model, never exclude it for lack of metadata.
	return {
		...CONSERVATIVE_DEFAULT_METADATA,
		toolCalling: toolCalling ?? CONSERVATIVE_DEFAULT_METADATA.toolCalling,
		imageInput: imageInput ?? CONSERVATIVE_DEFAULT_METADATA.imageInput,
		source: 'Unknown model — using conservative defaults',
	};
}
