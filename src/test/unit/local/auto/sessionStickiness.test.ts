/*---------------------------------------------------------------------------------------------
 *  Unit tests for local/auto/sessionStickiness.ts
 *  Pure Mocha – no VS Code host needed.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { SessionStickinessTracker, shouldReuseStickyCandidate, StickyEntry } from '../../../../extension/models/local/auto/sessionStickiness';
import { AutoCandidate } from '../../../../extension/models/local/auto/types';
import { computeTaskSignal } from '../../../../extension/models/local/auto/taskSignal';

function makeCandidate(id: string, reachable = true): AutoCandidate {
	return {
		info: { id, name: id, family: 'feima-local', version: '1', maxInputTokens: 8192, maxOutputTokens: 2048 } as AutoCandidate['info'],
		entryId: 'entry',
		isSameMachine: true,
		confidence: 'confirmed',
		reachable,
	};
}

describe('shouldReuseStickyCandidate', () => {
	it('returns undefined when there is no sticky state yet', () => {
		const result = shouldReuseStickyCandidate(undefined, [makeCandidate('a')], computeTaskSignal(100, 0, false, false));
		assert.strictEqual(result, undefined);
	});

	it('reuses the sticky candidate when it is still present, reachable, and task complexity matches', () => {
		const sticky: StickyEntry = { candidateId: 'a', looksComplex: false, lastSeenAt: Date.now() };
		const result = shouldReuseStickyCandidate(sticky, [makeCandidate('a')], computeTaskSignal(100, 0, false, false));
		assert.strictEqual(result?.info.id, 'a');
	});

	it('does not reuse when the sticky candidate is no longer reachable', () => {
		const sticky: StickyEntry = { candidateId: 'a', looksComplex: false, lastSeenAt: Date.now() };
		const result = shouldReuseStickyCandidate(sticky, [makeCandidate('a', false)], computeTaskSignal(100, 0, false, false));
		assert.strictEqual(result, undefined);
	});

	it('does not reuse when the sticky candidate has dropped out of the candidate list', () => {
		const sticky: StickyEntry = { candidateId: 'gone', looksComplex: false, lastSeenAt: Date.now() };
		const result = shouldReuseStickyCandidate(sticky, [makeCandidate('a')], computeTaskSignal(100, 0, false, false));
		assert.strictEqual(result, undefined);
	});

	it('does not reuse when task complexity has shifted', () => {
		const sticky: StickyEntry = { candidateId: 'a', looksComplex: false, lastSeenAt: Date.now() };
		const result = shouldReuseStickyCandidate(sticky, [makeCandidate('a')], computeTaskSignal(5000, 0, false, false));
		assert.strictEqual(result, undefined);
	});
});

describe('SessionStickinessTracker', () => {
	it('stores and retrieves by fingerprint', () => {
		const tracker = new SessionStickinessTracker();
		tracker.set('conv-1', 'model-a', false);
		assert.strictEqual(tracker.get('conv-1')?.candidateId, 'model-a');
	});

	it('returns undefined for an untracked fingerprint', () => {
		const tracker = new SessionStickinessTracker();
		assert.strictEqual(tracker.get('never-seen'), undefined);
	});

	it('evicts the oldest entry once the tracked-conversation bound is exceeded', () => {
		const tracker = new SessionStickinessTracker();
		for (let i = 0; i < 51; i++) {
			tracker.set(`conv-${i}`, `model-${i}`, false);
		}
		assert.strictEqual(tracker.size, 50);
		assert.strictEqual(tracker.get('conv-0'), undefined, 'oldest entry should have been evicted');
		assert.notStrictEqual(tracker.get('conv-50'), undefined, 'newest entry should still be present');
	});
});
