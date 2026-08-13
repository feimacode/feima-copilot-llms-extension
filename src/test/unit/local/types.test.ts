/*---------------------------------------------------------------------------------------------
 *  Unit tests for local/types.ts
 *  Pure Mocha – no VS Code host needed.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { defaultCompletionsPath, idForEndpoint } from '../../../extension/models/local/types';

describe('defaultCompletionsPath', () => {
	it('defaults openai-compat to /v1/chat/completions', () => {
		assert.strictEqual(defaultCompletionsPath('openai-compat'), '/v1/chat/completions');
	});

	it('defaults ollama-native to /v1/chat/completions too (Ollama also serves it)', () => {
		assert.strictEqual(defaultCompletionsPath('ollama-native'), '/v1/chat/completions');
	});

	it('defaults anthropic-messages to /v1/messages', () => {
		assert.strictEqual(defaultCompletionsPath('anthropic-messages'), '/v1/messages');
	});
});

describe('idForEndpoint', () => {
	it('is stable across trailing slash differences', () => {
		assert.strictEqual(idForEndpoint('http://127.0.0.1:11434'), idForEndpoint('http://127.0.0.1:11434/'));
	});

	it('is stable across case differences', () => {
		assert.strictEqual(idForEndpoint('HTTP://Example.com'), idForEndpoint('http://example.com'));
	});

	it('is stable across surrounding whitespace', () => {
		assert.strictEqual(idForEndpoint('  http://127.0.0.1:1234  '), idForEndpoint('http://127.0.0.1:1234'));
	});

	it('produces different ids for different endpoints', () => {
		assert.notStrictEqual(idForEndpoint('http://127.0.0.1:11434'), idForEndpoint('http://127.0.0.1:1234'));
	});
});
