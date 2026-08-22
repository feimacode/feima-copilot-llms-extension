/*---------------------------------------------------------------------------------------------
 *  Unit tests for local/toolCallRepair.ts
 *  Pure Mocha – no VS Code host needed.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import {
	stripCodeFence,
	normalizeSyntax,
	closeTruncatedJson,
	repairToolCallArguments,
} from '../../../extension/models/local/toolCallRepair';

describe('stripCodeFence', () => {
	it('strips a fence with a json language tag', () => {
		assert.strictEqual(stripCodeFence('```json\n{"a":1}\n```'), '{"a":1}');
	});

	it('strips a fence without a language tag', () => {
		assert.strictEqual(stripCodeFence('```\n{"a":1}\n```'), '{"a":1}');
	});

	it('leaves unfenced input unchanged', () => {
		assert.strictEqual(stripCodeFence('{"a":1}'), '{"a":1}');
	});
});

describe('normalizeSyntax', () => {
	it('removes a trailing comma before a closing brace', () => {
		assert.strictEqual(normalizeSyntax('{"a":1,}'), '{"a":1}');
	});

	it('removes a trailing comma before a closing bracket', () => {
		assert.strictEqual(normalizeSyntax('[1,2,]'), '[1,2]');
	});

	it('converts single-quoted string values to double-quoted', () => {
		assert.strictEqual(normalizeSyntax(`{"a": 'value'}`), '{"a": "value"}');
	});

	it('quotes unquoted object keys', () => {
		assert.strictEqual(normalizeSyntax('{a: 1}'), '{"a": 1}');
	});

	it('handles a case combining multiple issues', () => {
		assert.strictEqual(normalizeSyntax(`{a: 'value', b: 2,}`), '{"a": "value", "b": 2}');
	});

	it('KNOWN LIMITATION (documented in design.md Risks): two or more apostrophes inside an already-broken string can still misfire', () => {
		// This is why the pipeline only ever runs normalizeSyntax after a plain
		// parse has already failed (see repairToolCallArguments below) — valid
		// JSON with this same content never reaches this transform at all.
		const input = `{a: "it's John's book"}`;
		const result = normalizeSyntax(input);
		assert.notStrictEqual(result, `{"a": "it's John's book"}`, 'documents the known misfire, not asserting correct behavior');
	});
});

describe('closeTruncatedJson', () => {
	it('closes a missing closing brace', () => {
		assert.strictEqual(closeTruncatedJson('{"a":1'), '{"a":1}');
	});

	it('closes a missing closing bracket', () => {
		assert.strictEqual(closeTruncatedJson('[1,2'), '[1,2]');
	});

	it('closes a missing closing quote', () => {
		assert.strictEqual(closeTruncatedJson('{"a":"unterminated'), '{"a":"unterminated"}');
	});

	it('closes nested truncation in the correct order', () => {
		assert.strictEqual(closeTruncatedJson('{"a":[1,2,{"b":3'), '{"a":[1,2,{"b":3}]}');
	});

	it('does not miscount braces that appear inside a legitimate string value', () => {
		// A code-content argument containing literal braces should not confuse the tracker.
		const input = '{"code":"if (x) { y() }"';
		assert.strictEqual(closeTruncatedJson(input), input + '}');
	});
});

describe('repairToolCallArguments', () => {
	it('returns confirmed for clean JSON with no repair needed', () => {
		const result = repairToolCallArguments('{"path":"a.ts"}');
		assert.deepStrictEqual(result?.parameters, { path: 'a.ts' });
		assert.strictEqual(result?.confidence, 'confirmed');
	});

	it('returns estimated for markdown-fenced JSON', () => {
		const result = repairToolCallArguments('```json\n{"path":"a.ts"}\n```');
		assert.deepStrictEqual(result?.parameters, { path: 'a.ts' });
		assert.strictEqual(result?.confidence, 'estimated');
	});

	it('returns estimated for a trailing comma', () => {
		const result = repairToolCallArguments('{"path":"a.ts",}');
		assert.deepStrictEqual(result?.parameters, { path: 'a.ts' });
		assert.strictEqual(result?.confidence, 'estimated');
	});

	it('returns estimated for single-quoted content', () => {
		const result = repairToolCallArguments(`{'path': 'a.ts'}`);
		assert.deepStrictEqual(result?.parameters, { path: 'a.ts' });
		assert.strictEqual(result?.confidence, 'estimated');
	});

	it('returns estimated for truncated JSON', () => {
		const result = repairToolCallArguments('{"path":"a.ts"');
		assert.deepStrictEqual(result?.parameters, { path: 'a.ts' });
		assert.strictEqual(result?.confidence, 'estimated');
	});

	it('treats an empty string as an empty object', () => {
		const result = repairToolCallArguments('');
		assert.deepStrictEqual(result?.parameters, {});
		assert.strictEqual(result?.confidence, 'confirmed');
	});

	it('returns undefined for input with no recoverable JSON at all', () => {
		const result = repairToolCallArguments('I am not going to call a tool right now.');
		assert.strictEqual(result, undefined);
	});

	it('does not misfire on a legitimate comma and apostrophe inside a valid string value', () => {
		const result = repairToolCallArguments(`{"message": "hello, it's fine"}`);
		assert.deepStrictEqual(result?.parameters, { message: "hello, it's fine" });
		assert.strictEqual(result?.confidence, 'confirmed');
	});
});
