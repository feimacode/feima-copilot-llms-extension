/*---------------------------------------------------------------------------------------------
 *  Unit tests for toolResultConverter.ts
 *  Pure Mocha – no VS Code host needed.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { toolResultPartToString, toolResultContentToString, TextPartLike, DataPartLike } from '../../extension/models/toolResultConverter';

// ---------------------------------------------------------------------------
// Minimal stubs that mimic vscode.LanguageModelTextPart / DataPart
// ---------------------------------------------------------------------------
class FakeTextPart implements TextPartLike {
	constructor(readonly value: string) {}
}

class FakeDataPart implements DataPartLike {
	constructor(readonly data: Uint8Array | string, readonly mimeType?: string) {}
}

const isTextPart = (p: unknown): p is TextPartLike => p instanceof FakeTextPart;
const isDataPart = (p: unknown): p is DataPartLike => p instanceof FakeDataPart;

// ---------------------------------------------------------------------------
// toolResultPartToString
// ---------------------------------------------------------------------------
describe('toolResultPartToString', () => {
	it('extracts value from TextPart', () => {
		assert.strictEqual(
			toolResultPartToString(new FakeTextPart('hello'), isTextPart, isDataPart),
			'hello'
		);
	});

	it('decodes Uint8Array from DataPart', () => {
		const bytes = new TextEncoder().encode('world');
		assert.strictEqual(
			toolResultPartToString(new FakeDataPart(bytes), isTextPart, isDataPart),
			'world'
		);
	});

	it('returns string data from DataPart', () => {
		assert.strictEqual(
			toolResultPartToString(new FakeDataPart('raw string'), isTextPart, isDataPart),
			'raw string'
		);
	});

	it('returns string primitive as-is', () => {
		assert.strictEqual(
			toolResultPartToString('plain', isTextPart, isDataPart),
			'plain'
		);
	});

	it('returns empty string for plain object (no [object Object])', () => {
		assert.strictEqual(
			toolResultPartToString({ foo: 'bar' }, isTextPart, isDataPart),
			''
		);
	});

	it('returns empty string for null', () => {
		assert.strictEqual(
			toolResultPartToString(null, isTextPart, isDataPart),
			''
		);
	});

	it('returns empty string for undefined', () => {
		assert.strictEqual(
			toolResultPartToString(undefined, isTextPart, isDataPart),
			''
		);
	});

	it('returns empty string for number', () => {
		// Numbers are primitives but not strings; keep consistent
		assert.strictEqual(
			toolResultPartToString(42, isTextPart, isDataPart),
			''
		);
	});
});

// ---------------------------------------------------------------------------
// toolResultContentToString  (array-level)
// ---------------------------------------------------------------------------
describe('toolResultContentToString', () => {
	it('joins multiple TextParts', () => {
		const content = [new FakeTextPart('foo'), new FakeTextPart('bar')];
		assert.strictEqual(
			toolResultContentToString(content, isTextPart, isDataPart),
			'foobar'
		);
	});

	it('skips unknown objects without [object Object]', () => {
		// This is the regression test for the reported bug.
		const content = [
			new FakeTextPart('ok output'),
			{ type: 'prompt-tsx', value: 'something' }, // LanguageModelPromptTsxPart-like
		];
		const result = toolResultContentToString(content, isTextPart, isDataPart);
		assert.strictEqual(result, 'ok output');
		assert.ok(!result.includes('[object Object]'), 'must not contain [object Object]');
	});

	it('handles mixed TextPart, DataPart, and unknown objects', () => {
		const bytes = new TextEncoder().encode(' world');
		const content = [
			new FakeTextPart('hello'),
			new FakeDataPart(bytes),
			{ unknownType: true },        // should yield ''
		];
		assert.strictEqual(
			toolResultContentToString(content, isTextPart, isDataPart),
			'hello world'
		);
	});

	it('handles scalar string fallback (non-array content)', () => {
		assert.strictEqual(
			toolResultContentToString('scalar', isTextPart, isDataPart),
			'scalar'
		);
	});

	it('returns empty string for non-array, non-string content', () => {
		assert.strictEqual(
			toolResultContentToString({ weird: true }, isTextPart, isDataPart),
			''
		);
	});
});
