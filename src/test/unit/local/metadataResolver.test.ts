/*---------------------------------------------------------------------------------------------
 *  Unit tests for local/metadata/metadataResolver.ts
 *  Pure Mocha – no VS Code host needed.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as http from 'http';
import { AddressInfo } from 'net';
import { resolveModelMetadata } from '../../../extension/models/local/metadata/metadataResolver';
import { ILogService } from '../../../extension/platform/log/common/logService';
import { LocalEndpointEntry } from '../../../extension/models/local/types';

class NoopLog implements ILogService {
	readonly _serviceBrand: undefined = undefined;
	trace(): void {}
	debug(): void {}
	info(): void {}
	warn(): void {}
	error(): void {}
	show(): void {}
	createSubLogger(): ILogService { return this; }
	withExtraTarget(): ILogService { return this; }
}

function makeEntry(overrides: Partial<LocalEndpointEntry> = {}): LocalEndpointEntry {
	return {
		id: 'test-entry',
		baseEndpoint: 'http://127.0.0.1:0',
		apiFormat: 'openai-compat',
		modelEndpointPath: '/v1/models',
		completionsEndpointPath: '/v1/chat/completions',
		origin: 'manual',
		...overrides,
	};
}

describe('resolveModelMetadata', () => {
	it('prefers a context length already present in the endpoint\'s raw response (confirmed)', async () => {
		const entry = makeEntry();
		const result = await resolveModelMetadata(entry, { id: 'some-model', raw: { context_length: 131072 } }, new NoopLog());
		assert.strictEqual(result.confidence, 'confirmed');
		assert.strictEqual(result.maxInputTokens, 131072);
	});

	it('reads Ollama-nested context length keys (e.g. "llama.context_length")', async () => {
		const entry = makeEntry();
		const result = await resolveModelMetadata(entry, { id: 'llama3.1', raw: { 'llama.context_length': 128000 } }, new NoopLog());
		assert.strictEqual(result.confidence, 'confirmed');
		assert.strictEqual(result.maxInputTokens, 128000);
	});

	it('falls back to the reference table (estimated) when the endpoint reports nothing useful', async () => {
		const entry = makeEntry();
		const result = await resolveModelMetadata(entry, { id: 'qwen2.5-coder-7b' }, new NoopLog());
		assert.strictEqual(result.confidence, 'estimated');
		assert.strictEqual(result.toolCalling, true);
	});

	it('uses conservative defaults (unconfirmed) for a totally unknown sparse model', async () => {
		const entry = makeEntry();
		const result = await resolveModelMetadata(entry, { id: 'my-internal-finetune-v3' }, new NoopLog());
		assert.strictEqual(result.confidence, 'unconfirmed');
		assert.strictEqual(result.maxInputTokens, 4096);
	});

	it('queries Ollama\'s /api/show for a richer answer when the list response was sparse', async () => {
		const server = http.createServer((req, res) => {
			if (req.method === 'POST' && req.url === '/api/show') {
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ model_info: { 'llama.context_length': 131072 }, capabilities: ['tools'] }));
				return;
			}
			res.writeHead(404);
			res.end();
		});
		await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
		try {
			const { port } = server.address() as AddressInfo;
			const entry = makeEntry({ apiFormat: 'ollama-native', baseEndpoint: `http://127.0.0.1:${port}`, modelEndpointPath: '/api/tags' });
			const result = await resolveModelMetadata(entry, { id: 'llama3.1:8b' }, new NoopLog());
			assert.strictEqual(result.confidence, 'confirmed');
			assert.strictEqual(result.maxInputTokens, 131072);
			assert.strictEqual(result.toolCalling, true);
		} finally {
			await new Promise<void>(resolve => server.close(() => resolve()));
		}
	});
});
