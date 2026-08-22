/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Session-sticky candidate tracking: once a strategy picks a candidate for a
 *  conversation, later turns reuse it unless the candidate becomes
 *  unreachable or the task category shifts — see design.md "Session
 *  stickiness" and specs/auto-model-routing "Session Stickiness Across a
 *  Conversation". Deliberately vscode-free (the conversation-fingerprint
 *  extraction that DOES need vscode lives in conversationFingerprint.ts) so
 *  the reuse decision itself is unit-testable — see scoring.ts's doc
 *  comment for the same split rationale applied here.
 *--------------------------------------------------------------------------------------------*/

import { AutoCandidate, TaskSignal } from './types';

/** Bound on tracked conversations so this never grows unbounded over a long-running session. */
const MAX_TRACKED_CONVERSATIONS = 50;

export interface StickyEntry {
	readonly candidateId: string;
	readonly looksComplex: boolean;
	readonly lastSeenAt: number;
}

/**
 * Pure decision: should a previously-picked candidate be reused for this turn?
 * Reused only when the candidate is still present and reachable in the current
 * candidate list, and the task's complexity classification hasn't flipped.
 */
export function shouldReuseStickyCandidate(
	sticky: StickyEntry | undefined,
	candidates: readonly AutoCandidate[],
	task: TaskSignal,
): AutoCandidate | undefined {
	if (!sticky) {
		return undefined;
	}
	if (sticky.looksComplex !== task.looksComplex) {
		return undefined;
	}
	const candidate = candidates.find(c => c.info.id === sticky.candidateId);
	if (!candidate || !candidate.reachable) {
		return undefined;
	}
	return candidate;
}

export class SessionStickinessTracker {
	private readonly _byConversation = new Map<string, StickyEntry>();

	get(fingerprint: string): StickyEntry | undefined {
		return this._byConversation.get(fingerprint);
	}

	set(fingerprint: string, candidateId: string, looksComplex: boolean): void {
		if (!this._byConversation.has(fingerprint) && this._byConversation.size >= MAX_TRACKED_CONVERSATIONS) {
			// Evict the oldest tracked conversation (Map preserves insertion order).
			const oldestKey = this._byConversation.keys().next().value;
			if (oldestKey !== undefined) {
				this._byConversation.delete(oldestKey);
			}
		}
		this._byConversation.set(fingerprint, { candidateId, looksComplex, lastSeenAt: Date.now() });
	}

	/** Number of tracked conversations — exposed for tests verifying the eviction bound. */
	get size(): number {
		return this._byConversation.size;
	}
}
