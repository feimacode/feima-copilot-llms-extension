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
import { completionsPathForProbeResult, probeEndpoint } from './probe';
import { isRemoteExtensionHost } from './remoteContext';

/**
 * Well-known local defaults for runtimes named in the feasibility study.
 * Bind defaults confirmed during design: Ollama and LM Studio both default
 * to 127.0.0.1 for security; other runtimes vary by launch config but these
 * are the documented common defaults.
 */
const WELL_KNOWN_LOCAL_ENDPOINTS: string[] = [
	'http://127.0.0.1:11434', // Ollama
	'http://127.0.0.1:1234',  // LM Studio
	'http://127.0.0.1:8000',  // vLLM / llama.cpp server (common default)
	'http://127.0.0.1:8080',  // llama.cpp server (alternate common default)
	'http://127.0.0.1:30000', // SGLang
	'http://127.0.0.1:4000',  // LiteLLM proxy
	'http://127.0.0.1:40114', // Olla ("4 OLLA")
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
	await Promise.all(WELL_KNOWN_LOCAL_ENDPOINTS.map(async baseEndpoint => {
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
