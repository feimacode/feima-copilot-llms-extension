/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Builds the router's candidate list for one turn — the one function in
 *  the Auto router that genuinely needs real `vscode`/sibling-provider
 *  access, kept separate from the pure scoring primitives in scoring.ts so
 *  those stay unit-testable (see scoring.ts's doc comment).
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { LocalEndpointRegistry } from '../localEndpointRegistry';
import { LocalEndpointProvider } from '../localEndpointProvider';
import { AutoCandidate } from './types';
import { isSameMachine } from './scoring';

/**
 * Ask the sibling provider for its current model list (same call VS Code
 * itself makes), then enrich each with the registry/health/confidence data
 * needed for scoring. Never performs its own network fan-out — see
 * design.md "The router is a pure delegator".
 */
export async function buildCandidates(
	localProvider: LocalEndpointProvider,
	registry: LocalEndpointRegistry,
	token: vscode.CancellationToken,
): Promise<AutoCandidate[]> {
	const infos = await localProvider.provideLanguageModelChatInformation({ silent: true }, token);
	const candidates: AutoCandidate[] = [];

	for (const info of infos) {
		const source = localProvider.getCandidateSource(info.id);
		if (!source) {
			continue;
		}
		const entry = registry.getEntry(source.entryId);
		if (!entry) {
			continue;
		}
		const health = registry.getHealth(source.entryId);
		candidates.push({
			info,
			entryId: source.entryId,
			isSameMachine: isSameMachine(entry.baseEndpoint),
			confidence: source.confidence,
			// No health entry yet (e.g. never probed) is treated as reachable — the
			// sibling provider already excludes truly-unreachable entries from its
			// returned list (see local-model-provider spec's "one endpoint is
			// unreachable" requirement), so absence of a health record here means
			// "not yet checked", not "known down".
			reachable: health?.reachable ?? true,
		});
	}
	return candidates;
}
