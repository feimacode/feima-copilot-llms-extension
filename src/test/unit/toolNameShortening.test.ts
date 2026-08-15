/*---------------------------------------------------------------------------------------------
 *  Unit tests for toolNameShortening.ts
 *  Pure Mocha – no VS Code host needed.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { MAX_TOOL_NAME_LENGTH, shortenToolName } from '../../extension/models/toolNameShortening';

// The real tool name that triggered OpenCode Zen's
// "function tool name must be at most 64 characters" 400 error in production
// (69 chars — an MCP-namespaced Pylance fallback tool name).
const REAL_WORLD_LONG_NAME = 'activate_fallback_mcp_pylance_mcp_s_pylanceInstalledTopLevelModules_1';

describe('shortenToolName', () => {
	it('leaves short names unchanged', () => {
		assert.strictEqual(shortenToolName('read_file'), 'read_file');
	});

	it('leaves a name exactly at the limit unchanged', () => {
		const exactly64 = 'a'.repeat(64);
		assert.strictEqual(shortenToolName(exactly64), exactly64);
	});

	it('shortens a name one character over the limit', () => {
		const oneOver = 'a'.repeat(65);
		const result = shortenToolName(oneOver);
		assert.ok(result.length <= MAX_TOOL_NAME_LENGTH, `expected <= ${MAX_TOOL_NAME_LENGTH}, got ${result.length}`);
		assert.notStrictEqual(result, oneOver);
	});

	it('shortens the real-world 69-char name that broke production to <= 64 chars', () => {
		assert.strictEqual(REAL_WORLD_LONG_NAME.length, 69);
		const result = shortenToolName(REAL_WORLD_LONG_NAME);
		assert.ok(result.length <= MAX_TOOL_NAME_LENGTH, `expected <= ${MAX_TOOL_NAME_LENGTH}, got ${result.length}: "${result}"`);
	});

	it('is deterministic — same input always produces the same output', () => {
		const a = shortenToolName(REAL_WORLD_LONG_NAME);
		const b = shortenToolName(REAL_WORLD_LONG_NAME);
		assert.strictEqual(a, b);
	});

	it('produces different shortened names for different long names (low collision risk)', () => {
		const nameA = 'activate_fallback_mcp_pylance_mcp_s_pylanceInstalledTopLevelModules_1';
		const nameB = 'activate_fallback_mcp_pylance_mcp_s_pylanceInstalledTopLevelModules_2';
		assert.notStrictEqual(shortenToolName(nameA), shortenToolName(nameB));
	});

	it('round-trips via a forward map the way createRequestBody/parseSSEStream do', () => {
		// Mirrors the actual usage pattern: build a map while shortening names
		// for the request, then reverse-look-up when a tool-call event returns.
		const toolNameMap = new Map<string, string>();
		const shortened = shortenToolName(REAL_WORLD_LONG_NAME);
		if (shortened !== REAL_WORLD_LONG_NAME) {
			toolNameMap.set(shortened, REAL_WORLD_LONG_NAME);
		}

		const recoveredName = toolNameMap.get(shortened) ?? shortened;
		assert.strictEqual(recoveredName, REAL_WORLD_LONG_NAME);
	});
});
