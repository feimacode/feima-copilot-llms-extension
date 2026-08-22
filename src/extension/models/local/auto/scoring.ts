/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Shared scoring primitives used by all three strategies: locality
 *  classification, availability gating, and confidence ranking.
 *  Deliberately vscode-free (only `import type`, erased at compile time) so
 *  these stay unit-testable in the plain-mocha harness this codebase uses —
 *  see design.md and the prior change's precedent (probe.ts, metadataResolver.ts).
 *  Building the candidate list itself (`buildCandidates`, in
 *  candidateBuilder.ts) does need real `vscode`/sibling-provider access and
 *  is not unit-tested for the same reason `LocalEndpointProvider` isn't.
 *--------------------------------------------------------------------------------------------*/

import { AutoCandidate, TaskSignal } from './types';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

/** True when a base endpoint's host is a loopback address (same machine as the extension host). */
export function isSameMachine(baseEndpoint: string): boolean {
	try {
		const url = new URL(baseEndpoint);
		return LOOPBACK_HOSTS.has(url.hostname.toLowerCase());
	} catch {
		return false;
	}
}

/** Availability gating: applied before any strategy-specific scoring, regardless of strategy. */
export function filterReachable(candidates: readonly AutoCandidate[]): AutoCandidate[] {
	return candidates.filter(c => c.reachable);
}

/** Whether a candidate meets the task's hard requirements (not scored — a strict gate). */
export function meetsHardRequirements(candidate: AutoCandidate, task: TaskSignal): boolean {
	if (task.toolCount > 0 && !candidate.info.capabilities?.toolCalling) {
		return false;
	}
	return true;
}

const CONFIDENCE_RANK: Record<AutoCandidate['confidence'], number> = {
	confirmed: 2,
	estimated: 1,
	unconfirmed: 0,
};

/** Higher is better. Used by `balanced` and `most-capable` to rank by capability confidence. */
export function confidenceRank(candidate: AutoCandidate): number {
	return CONFIDENCE_RANK[candidate.confidence];
}
