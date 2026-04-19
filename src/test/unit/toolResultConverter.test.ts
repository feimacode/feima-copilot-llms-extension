/*---------------------------------------------------------------------------------------------
 *  Unit tests for toolResultConverter.ts
 *  Pure Mocha – no VS Code host needed.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { toolResultPartToString, toolResultContentToString, isTextualMimeType, TextPartLike, DataPartLike } from '../../extension/models/toolResultConverter';

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

// ---------------------------------------------------------------------------
// isTextualMimeType
// ---------------------------------------------------------------------------
describe('isTextualMimeType', () => {
	it('returns true for undefined (backward compat — legacy DataParts have no mimeType)', () => {
		assert.strictEqual(isTextualMimeType(undefined), true);
	});

	it('returns true for empty string', () => {
		assert.strictEqual(isTextualMimeType(''), true);
	});

	it('returns true for text/plain', () => {
		assert.strictEqual(isTextualMimeType('text/plain'), true);
	});

	it('returns true for text/html', () => {
		assert.strictEqual(isTextualMimeType('text/html'), true);
	});

	it('returns true for application/json', () => {
		assert.strictEqual(isTextualMimeType('application/json'), true);
	});

	it('returns false for cache_control (Anthropic prompt caching signal)', () => {
		assert.strictEqual(isTextualMimeType('cache_control'), false);
	});

	it('returns false for stateful_marker', () => {
		assert.strictEqual(isTextualMimeType('stateful_marker'), false);
	});

	it('returns false for thinking', () => {
		assert.strictEqual(isTextualMimeType('thinking'), false);
	});

	it('returns false for context_management', () => {
		assert.strictEqual(isTextualMimeType('context_management'), false);
	});

	it('returns false for phase_data', () => {
		assert.strictEqual(isTextualMimeType('phase_data'), false);
	});

	it('returns false for image/png', () => {
		assert.strictEqual(isTextualMimeType('image/png'), false);
	});

	it('returns false for image/jpeg', () => {
		assert.strictEqual(isTextualMimeType('image/jpeg'), false);
	});
});

// ---------------------------------------------------------------------------
// toolResultPartToString — mimeType filtering regression tests
// ---------------------------------------------------------------------------
describe('toolResultPartToString — mimeType filtering', () => {
	it('returns empty string for cache_control DataPart (the "ephemeral" bug)', () => {
		// This is the root cause of the phantom "config.mdephemeral" autopilot bug:
		// copilot-chat injects CacheBreakpoint as DataPart(encode('ephemeral'), 'cache_control')
		// inside ToolResultPart.content. Without mimeType filtering, 'ephemeral' was
		// decoded and concatenated onto tool output text.
		const part = new FakeDataPart(new TextEncoder().encode('ephemeral'), 'cache_control');
		assert.strictEqual(toolResultPartToString(part, isTextPart, isDataPart), '');
	});

	it('returns empty string for stateful_marker DataPart', () => {
		const part = new FakeDataPart(new TextEncoder().encode('model1\\marker'), 'stateful_marker');
		assert.strictEqual(toolResultPartToString(part, isTextPart, isDataPart), '');
	});

	it('returns empty string for thinking DataPart', () => {
		const payload = JSON.stringify({ id: 't1', text: 'reasoning...' });
		const part = new FakeDataPart(new TextEncoder().encode(payload), 'thinking');
		assert.strictEqual(toolResultPartToString(part, isTextPart, isDataPart), '');
	});

	it('returns empty string for context_management DataPart', () => {
		const payload = JSON.stringify({ applied_edits: [] });
		const part = new FakeDataPart(new TextEncoder().encode(payload), 'context_management');
		assert.strictEqual(toolResultPartToString(part, isTextPart, isDataPart), '');
	});

	it('returns empty string for phase_data DataPart', () => {
		const payload = JSON.stringify({ phase: 1 });
		const part = new FakeDataPart(new TextEncoder().encode(payload), 'phase_data');
		assert.strictEqual(toolResultPartToString(part, isTextPart, isDataPart), '');
	});

	it('returns empty string for image/png DataPart', () => {
		const part = new FakeDataPart(new Uint8Array([137, 80, 78, 71]), 'image/png');
		assert.strictEqual(toolResultPartToString(part, isTextPart, isDataPart), '');
	});

	it('decodes DataPart with text/plain mimeType', () => {
		const part = new FakeDataPart(new TextEncoder().encode('hello'), 'text/plain');
		assert.strictEqual(toolResultPartToString(part, isTextPart, isDataPart), 'hello');
	});

	it('decodes DataPart with application/json mimeType', () => {
		const payload = JSON.stringify({ result: 42 });
		const part = new FakeDataPart(new TextEncoder().encode(payload), 'application/json');
		assert.strictEqual(toolResultPartToString(part, isTextPart, isDataPart), payload);
	});

	it('decodes DataPart with no mimeType (backward compat)', () => {
		const part = new FakeDataPart(new TextEncoder().encode('legacy'), undefined);
		assert.strictEqual(toolResultPartToString(part, isTextPart, isDataPart), 'legacy');
	});
});

// ---------------------------------------------------------------------------
// toolResultContentToString — integration regression (autopilot loop bug)
// ---------------------------------------------------------------------------
describe('toolResultContentToString — cache breakpoint does not corrupt output', () => {
	it('strips ephemeral DataPart from mixed content (the autopilot loop bug)', () => {
		// Reproduces: model sees "config.mdephemeral" instead of "config.md" because
		// the cache breakpoint DataPart was decoded and joined with the TextPart.
		const content = [
			new FakeTextPart('config.md'),
			new FakeDataPart(new TextEncoder().encode('ephemeral'), 'cache_control'),
		];
		const result = toolResultContentToString(content, isTextPart, isDataPart);
		assert.strictEqual(result, 'config.md');
		assert.ok(!result.includes('ephemeral'), 'must not contain "ephemeral"');
	});

	it('preserves tool output when multiple metadata DataParts are appended', () => {
		const content = [
			new FakeTextPart('tool output text'),
			new FakeDataPart(new TextEncoder().encode('ephemeral'), 'cache_control'),
			new FakeDataPart(new TextEncoder().encode('model1\\marker'), 'stateful_marker'),
		];
		const result = toolResultContentToString(content, isTextPart, isDataPart);
		assert.strictEqual(result, 'tool output text');
	});
});
