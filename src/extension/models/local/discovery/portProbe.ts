/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Automatic discovery of local model runtimes via well-known default ports.
 *  A successful probe is both the liveness check and the model discovery
 *  (see probe.ts) — there is no separate ping step.
 *--------------------------------------------------------------------------------------------*/

import { ILogService } from '../../../platform/log/common/logService';
import { LocalEndpointRegistry } from '../localEndpointRegistry';
import { LocalApiFormat } from '../types';
import { completionsPathForProbeResult, probeEndpoint } from './probe';
import { isRemoteExtensionHost } from './remoteContext';

export interface LocalRuntimeTemplate {
	readonly name: string;
	readonly baseEndpoint: string;
	/** Best guess only — always re-verified live by probeEndpoint/probeKnownEndpoint, never trusted as-is. */
	readonly apiFormatHint: LocalApiFormat;
	readonly description: string;
}

/**
 * Well-known local defaults for runtimes named in the feasibility study.
 * Bind defaults confirmed during design: Ollama and LM Studio both default
 * to 127.0.0.1 for security; other runtimes vary by launch config but these
 * are the documented common defaults. Doubles as the curated template list
 * for the manual-add flow's template picker (see view/templatePicker.ts) —
 * single source of truth for "known local runtime" shortcuts.
 */
export const LOCAL_RUNTIME_TEMPLATES: readonly LocalRuntimeTemplate[] = [
	{ name: 'Ollama', baseEndpoint: 'http://127.0.0.1:11434', apiFormatHint: 'ollama-native', description: 'Local Ollama installation' },
	{ name: 'LM Studio', baseEndpoint: 'http://127.0.0.1:1234', apiFormatHint: 'openai-compat', description: 'Local LM Studio server' },
	{ name: 'vLLM / llama.cpp server', baseEndpoint: 'http://127.0.0.1:8000', apiFormatHint: 'openai-compat', description: 'OpenAI-compatible local server (common default port)' },
	{ name: 'llama.cpp server (alt port)', baseEndpoint: 'http://127.0.0.1:8080', apiFormatHint: 'openai-compat', description: 'llama.cpp server, alternate common default port' },
	{ name: 'SGLang', baseEndpoint: 'http://127.0.0.1:30000', apiFormatHint: 'openai-compat', description: 'Local SGLang server' },
	{ name: 'LiteLLM proxy', baseEndpoint: 'http://127.0.0.1:4000', apiFormatHint: 'openai-compat', description: 'Local LiteLLM proxy' },
	{ name: 'Olla', baseEndpoint: 'http://127.0.0.1:40114', apiFormatHint: 'openai-compat', description: 'Local Olla instance' },
];

/**
 * Probe every well-known local default and register any that respond.
 * Never throws, never surfaces an error for "nothing found" — a quiet machine
 * is the expected common case, not a failure (see spec "No local runtime present").
 */
export async function discoverLocalPorts(registry: LocalEndpointRegistry, log: ILogService): Promise<number> {
	if (isRemoteExtensionHost()) {
		// Still probe — a real runtime can legitimately be running inside a
		// remote/devcontainer/Codespaces environment too — but note the context,
		// since 127.0.0.1 here is NOT necessarily the user's physical machine
		// (see design.md Risks and discovery/remoteContext.ts).
		log.debug('[portProbe] Extension host is remote — probing 127.0.0.1 targets the remote machine, not necessarily the user\'s local machine');
	}

	let discovered = 0;
	await Promise.all(LOCAL_RUNTIME_TEMPLATES.map(t => t.baseEndpoint).map(async baseEndpoint => {
		const result = await probeEndpoint(baseEndpoint);
		if (!result.ok) {
			log.debug(`[portProbe] ${baseEndpoint}: ${result.reason}`);
			return;
		}
		await registry.upsertPersonalEntry({
			baseEndpoint,
			apiFormat: result.format,
			modelEndpointPath: result.modelEndpointPath,
			completionsEndpointPath: completionsPathForProbeResult(result),
			origin: 'port-probe',
		});
		discovered++;
		log.info(`[portProbe] Discovered local endpoint at ${baseEndpoint} (${result.models.length} models, format=${result.format})`);
	}));
	return discovered;
}
