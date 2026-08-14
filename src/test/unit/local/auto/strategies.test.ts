/*---------------------------------------------------------------------------------------------
 *  Unit tests for local/auto/strategies.ts + scoring.ts
 *  Pure Mocha – no VS Code host needed.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { isSameMachine, filterReachable, meetsHardRequirements, confidenceRank } from '../../../../extension/models/local/auto/scoring';
import { localFirstStrategy, balancedStrategy, mostCapableStrategy } from '../../../../extension/models/local/auto/strategies';
import { AutoCandidate } from '../../../../extension/models/local/auto/types';
import { computeTaskSignal } from '../../../../extension/models/local/auto/taskSignal';

function makeCandidate(overrides: Partial<AutoCandidate> = {}): AutoCandidate {
	return {
		info: {
			id: 'entry::model',
			name: 'test-model',
			family: 'feima-local',
			version: '1',
			maxInputTokens: 8192,
			maxOutputTokens: 2048,
			capabilities: { toolCalling: false, imageInput: false },
		} as AutoCandidate['info'],
		entryId: 'entry',
		isSameMachine: true,
		confidence: 'confirmed',
		reachable: true,
		...overrides,
	};
}

describe('isSameMachine', () => {
	it('recognizes 127.0.0.1 as same-machine', () => {
		assert.strictEqual(isSameMachine('http://127.0.0.1:11434'), true);
	});
	it('recognizes localhost as same-machine', () => {
		assert.strictEqual(isSameMachine('http://localhost:1234'), true);
	});
	it('recognizes IPv6 loopback as same-machine', () => {
		assert.strictEqual(isSameMachine('http://[::1]:11434'), true);
	});
	it('treats a real hostname as network', () => {
		assert.strictEqual(isSameMachine('https://gateway.internal.example.com'), false);
	});
	it('returns false for an unparseable URL rather than throwing', () => {
		assert.strictEqual(isSameMachine('not a url'), false);
	});
});

describe('filterReachable', () => {
	it('excludes unreachable candidates', () => {
		const candidates = [makeCandidate({ reachable: true }), makeCandidate({ reachable: false })];
		assert.strictEqual(filterReachable(candidates).length, 1);
	});
});

describe('meetsHardRequirements', () => {
	it('rejects a non-tool-calling candidate when the task needs tools', () => {
		const candidate = makeCandidate({ info: { ...makeCandidate().info, capabilities: { toolCalling: false, imageInput: false } } });
		const task = computeTaskSignal(100, 2, false, false);
		assert.strictEqual(meetsHardRequirements(candidate, task), false);
	});
	it('accepts a tool-calling candidate when the task needs tools', () => {
		const candidate = makeCandidate({ info: { ...makeCandidate().info, capabilities: { toolCalling: true, imageInput: false } } });
		const task = computeTaskSignal(100, 2, false, false);
		assert.strictEqual(meetsHardRequirements(candidate, task), true);
	});
	it('accepts any candidate when the task needs no tools', () => {
		const candidate = makeCandidate();
		const task = computeTaskSignal(100, 0, false, false);
		assert.strictEqual(meetsHardRequirements(candidate, task), true);
	});
});

describe('confidenceRank', () => {
	it('ranks confirmed > estimated > unconfirmed', () => {
		assert.ok(confidenceRank(makeCandidate({ confidence: 'confirmed' })) > confidenceRank(makeCandidate({ confidence: 'estimated' })));
		assert.ok(confidenceRank(makeCandidate({ confidence: 'estimated' })) > confidenceRank(makeCandidate({ confidence: 'unconfirmed' })));
	});
});

describe('computeTaskSignal', () => {
	it('flags a long prompt as complex', () => {
		assert.strictEqual(computeTaskSignal(3000, 0, false, false).looksComplex, true);
	});
	it('flags 3+ tools as complex', () => {
		assert.strictEqual(computeTaskSignal(100, 3, false, false).looksComplex, true);
	});
	it('flags mid-tool-loop as complex', () => {
		assert.strictEqual(computeTaskSignal(100, 0, false, true).looksComplex, true);
	});
	it('flags required tool mode as complex', () => {
		assert.strictEqual(computeTaskSignal(100, 0, true, false).looksComplex, true);
	});
	it('a short, tool-free prompt is not complex', () => {
		assert.strictEqual(computeTaskSignal(100, 0, false, false).looksComplex, false);
	});
});

describe('localFirstStrategy', () => {
	it('prefers a same-machine candidate over a network one', () => {
		const local = makeCandidate({ info: { ...makeCandidate().info, id: 'local' }, isSameMachine: true });
		const network = makeCandidate({ info: { ...makeCandidate().info, id: 'network' }, isSameMachine: false });
		const outcome = localFirstStrategy.select([network, local], computeTaskSignal(100, 0, false, false));
		assert.strictEqual(outcome.kind, 'resolved');
		if (outcome.kind === 'resolved') {
			assert.strictEqual(outcome.candidate.info.id, 'local');
			assert.strictEqual(outcome.escalated, false);
		}
	});

	it('escalates to network and discloses it when nothing local qualifies', () => {
		const network = makeCandidate({ info: { ...makeCandidate().info, id: 'network' }, isSameMachine: false });
		const outcome = localFirstStrategy.select([network], computeTaskSignal(100, 0, false, false));
		assert.strictEqual(outcome.kind, 'resolved');
		if (outcome.kind === 'resolved') {
			assert.strictEqual(outcome.candidate.info.id, 'network');
			assert.strictEqual(outcome.escalated, true);
			assert.ok(outcome.reason.toLowerCase().includes('no local model qualified'));
		}
	});

	it('falls back when nothing qualifies at all', () => {
		const outcome = localFirstStrategy.select([], computeTaskSignal(100, 0, false, false));
		assert.strictEqual(outcome.kind, 'fallback');
	});

	it('never selects an unreachable candidate', () => {
		const down = makeCandidate({ reachable: false });
		const outcome = localFirstStrategy.select([down], computeTaskSignal(100, 0, false, false));
		assert.strictEqual(outcome.kind, 'fallback');
	});
});

describe('balancedStrategy', () => {
	it('prefers confirmed confidence over estimated', () => {
		const confirmed = makeCandidate({ info: { ...makeCandidate().info, id: 'confirmed-one' }, confidence: 'confirmed' });
		const estimated = makeCandidate({ info: { ...makeCandidate().info, id: 'estimated-one' }, confidence: 'estimated' });
		const outcome = balancedStrategy.select([estimated, confirmed], computeTaskSignal(100, 0, false, false));
		assert.strictEqual(outcome.kind, 'resolved');
		if (outcome.kind === 'resolved') {
			assert.strictEqual(outcome.candidate.info.id, 'confirmed-one');
		}
	});

	it('breaks ties in favor of same-machine', () => {
		const local = makeCandidate({ info: { ...makeCandidate().info, id: 'local' }, isSameMachine: true, confidence: 'confirmed' });
		const network = makeCandidate({ info: { ...makeCandidate().info, id: 'network' }, isSameMachine: false, confidence: 'confirmed' });
		const outcome = balancedStrategy.select([network, local], computeTaskSignal(100, 0, false, false));
		assert.strictEqual(outcome.kind, 'resolved');
		if (outcome.kind === 'resolved') {
			assert.strictEqual(outcome.candidate.info.id, 'local');
		}
	});
});

describe('mostCapableStrategy', () => {
	it('ignores locality and picks the highest-confidence candidate', () => {
		const local = makeCandidate({ info: { ...makeCandidate().info, id: 'local', maxInputTokens: 4096 }, isSameMachine: true, confidence: 'estimated' });
		const network = makeCandidate({ info: { ...makeCandidate().info, id: 'network', maxInputTokens: 128000 }, isSameMachine: false, confidence: 'confirmed' });
		const outcome = mostCapableStrategy.select([local, network], computeTaskSignal(100, 0, false, false));
		assert.strictEqual(outcome.kind, 'resolved');
		if (outcome.kind === 'resolved') {
			assert.strictEqual(outcome.candidate.info.id, 'network');
		}
	});

	it('breaks a confidence tie by larger context window', () => {
		const small = makeCandidate({ info: { ...makeCandidate().info, id: 'small', maxInputTokens: 4096 }, confidence: 'confirmed' });
		const big = makeCandidate({ info: { ...makeCandidate().info, id: 'big', maxInputTokens: 128000 }, confidence: 'confirmed' });
		const outcome = mostCapableStrategy.select([small, big], computeTaskSignal(100, 0, false, false));
		assert.strictEqual(outcome.kind, 'resolved');
		if (outcome.kind === 'resolved') {
			assert.strictEqual(outcome.candidate.info.id, 'big');
		}
	});
});
