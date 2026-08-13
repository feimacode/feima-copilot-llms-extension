/*---------------------------------------------------------------------------------------------
 *  Unit tests for local/metadata/referenceTable.ts
 *  Pure Mocha – no VS Code host needed.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { lookupReferenceTable } from '../../../extension/models/local/metadata/referenceTable';

describe('lookupReferenceTable', () => {
	it('matches a known model family by name pattern', () => {
		const match = lookupReferenceTable('qwen2.5-coder-32b-instruct');
		assert.ok(match);
		assert.strictEqual(match!.toolCalling, true);
	});

	it('prefers a more specific pattern over a generic one (llama-3.1 over bare llama-3)', () => {
		const match = lookupReferenceTable('llama-3.1-8b-instruct');
		assert.ok(match);
		assert.strictEqual(match!.maxInputTokens, 128_000);
	});

	it('returns undefined for a completely unknown model id', () => {
		assert.strictEqual(lookupReferenceTable('some-bespoke-internal-finetune-v7'), undefined);
	});

	it('is case-insensitive', () => {
		const lower = lookupReferenceTable('mistral-7b-instruct');
		const upper = lookupReferenceTable('MISTRAL-7B-INSTRUCT');
		assert.deepStrictEqual(lower, upper);
	});
});
