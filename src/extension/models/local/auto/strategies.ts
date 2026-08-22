/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  The three named routing strategies, each a preset over the same shared
 *  scoring primitives (see scoring.ts) rather than an independent
 *  implementation — see design.md "Strategies are presets over one scoring
 *  shape, not independent code paths".
 *--------------------------------------------------------------------------------------------*/

import { confidenceRank, filterReachable, meetsHardRequirements } from './scoring';
import { AutoCandidate, AutoOutcome, AutoStrategy, TaskSignal } from './types';

function describe(candidate: AutoCandidate): string {
	return candidate.info.name;
}

function qualifyingCandidates(candidates: readonly AutoCandidate[], task: TaskSignal): AutoCandidate[] {
	return filterReachable(candidates).filter(c => meetsHardRequirements(c, task));
}

function pickByConfidenceThenContext(candidates: readonly AutoCandidate[]): AutoCandidate {
	return [...candidates].sort((a, b) =>
		confidenceRank(b) - confidenceRank(a) || b.info.maxInputTokens - a.info.maxInputTokens,
	)[0];
}

/**
 * Prefer same-machine endpoints; escalate to network only when nothing same-machine
 * qualifies, and disclose the escalation explicitly (spec: "Escalation to a network
 * candidate is disclosed").
 */
export const localFirstStrategy: AutoStrategy = {
	id: 'local-first',
	select(candidates, task): AutoOutcome {
		const qualifying = qualifyingCandidates(candidates, task);
		const sameMachine = qualifying.filter(c => c.isSameMachine);
		if (sameMachine.length > 0) {
			const picked = pickByConfidenceThenContext(sameMachine);
			return { kind: 'resolved', candidate: picked, reason: `Local endpoint on this machine`, escalated: false };
		}
		const network = qualifying.filter(c => !c.isSameMachine);
		if (network.length > 0) {
			const picked = pickByConfidenceThenContext(network);
			return {
				kind: 'resolved',
				candidate: picked,
				reason: `No local model qualified — used ${describe(picked)} on the network instead`,
				escalated: true,
			};
		}
		return { kind: 'fallback', reason: 'No registered endpoint (local or network) qualified for this request' };
	},
};

/**
 * Weighs task fit + confidence; locality/latency only breaks ties (spec: "Balanced
 * Strategy Behavior"). This is the default strategy.
 */
export const balancedStrategy: AutoStrategy = {
	id: 'balanced',
	select(candidates, task): AutoOutcome {
		const qualifying = qualifyingCandidates(candidates, task);
		if (qualifying.length === 0) {
			return { kind: 'fallback', reason: 'No registered endpoint qualified for this request' };
		}

		function score(c: AutoCandidate): number {
			// Confidence dominates; a small bonus for having enough headroom on a
			// complex task, since an undersized context window is a real risk on a
			// long conversation even if it technically "meets" the hard minimum.
			let s = confidenceRank(c) * 10;
			if (task.looksComplex && c.info.maxInputTokens >= 32_000) {
				s += 2;
			}
			return s;
		}

		const best = [...qualifying].sort((a, b) =>
			score(b) - score(a)
			|| (Number(a.isSameMachine) - Number(b.isSameMachine)) * -1 // same-machine wins ties
			|| b.info.maxInputTokens - a.info.maxInputTokens,
		)[0];

		return { kind: 'resolved', candidate: best, reason: `Balanced pick — ${describe(best)}`, escalated: false };
	},
};

/**
 * Ranks purely by confirmed capability (confidence tier, then context window),
 * ignoring locality/latency entirely (spec: "Most-Capable Strategy Behavior").
 */
export const mostCapableStrategy: AutoStrategy = {
	id: 'most-capable',
	select(candidates, task): AutoOutcome {
		const qualifying = qualifyingCandidates(candidates, task);
		if (qualifying.length === 0) {
			return { kind: 'fallback', reason: 'No registered endpoint qualified for this request' };
		}
		const best = pickByConfidenceThenContext(qualifying);
		return { kind: 'resolved', candidate: best, reason: `Most capable available — ${describe(best)}`, escalated: false };
	},
};

export const AUTO_STRATEGIES = {
	'local-first': localFirstStrategy,
	'balanced': balancedStrategy,
	'most-capable': mostCapableStrategy,
} as const;
