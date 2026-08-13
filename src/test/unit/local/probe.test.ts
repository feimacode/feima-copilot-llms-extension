/*---------------------------------------------------------------------------------------------
 *  Unit tests for local/discovery/probe.ts
 *  Pure Mocha – no VS Code host needed. Uses a tiny local HTTP server to
 *  exercise the real fetch path without hitting the network.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as http from 'http';
import { AddressInfo } from 'net';
import {
	probeEndpoint,
	probeKnownEndpoint,
	completionsPathForProbeResult,
	ProbeResult,
} from '../../../extension/models/local/discovery/probe';

type Handler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

async function withServer(handler: Handler, run: (baseUrl: string) => Promise<void>): Promise<void> {
	const server = http.createServer(handler);
	await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
	try {
		const { port } = server.address() as AddressInfo;
		await run(`http://127.0.0.1:${port}`);
	} finally {
		await new Promise<void>(resolve => server.close(() => resolve()));
	}
}

function json(res: http.ServerResponse, body: unknown, status = 200): void {
	res.writeHead(status, { 'Content-Type': 'application/json' });
	res.end(JSON.stringify(body));
}

describe('probeEndpoint', () => {
	it('discovers an Ollama-shaped endpoint via /api/tags', async () => {
		await withServer(
			(req, res) => {
				if (req.url === '/api/tags') {
					return json(res, { models: [{ name: 'llama3.1:8b', model: 'llama3.1:8b' }] });
				}
				json(res, {}, 404);
			},
			async baseUrl => {
				const result = await probeEndpoint(baseUrl);
				assert.strictEqual(result.ok, true);
				if (result.ok) {
					assert.strictEqual(result.format, 'ollama-native');
					assert.strictEqual(result.modelEndpointPath, '/api/tags');
					assert.strictEqual(result.models.length, 1);
					assert.strictEqual(result.models[0].id, 'llama3.1:8b');
				}
			},
		);
	});

	it('falls back to /v1/models for a bare OpenAI-compatible endpoint', async () => {
		await withServer(
			(req, res) => {
				if (req.url === '/v1/models') {
					return json(res, { object: 'list', data: [{ id: 'my-vllm-model' }] });
				}
				json(res, {}, 404);
			},
			async baseUrl => {
				const result = await probeEndpoint(baseUrl);
				assert.strictEqual(result.ok, true);
				if (result.ok) {
					assert.strictEqual(result.format, 'openai-compat');
					assert.strictEqual(result.modelEndpointPath, '/v1/models');
					assert.strictEqual(result.models[0].id, 'my-vllm-model');
				}
			},
		);
	});

	it('discovers Olla\'s nested unified endpoint', async () => {
		await withServer(
			(req, res) => {
				if (req.url === '/olla/proxy/v1/models') {
					return json(res, { object: 'list', data: [{ id: 'routed-model' }] });
				}
				json(res, {}, 404);
			},
			async baseUrl => {
				const result = await probeEndpoint(baseUrl);
				assert.strictEqual(result.ok, true);
				if (result.ok) {
					assert.strictEqual(result.modelEndpointPath, '/olla/proxy/v1/models');
					// Completions path must be nested under the same prefix, not the bare root.
					assert.strictEqual(completionsPathForProbeResult(result), '/olla/proxy/v1/chat/completions');
				}
			},
		);
	});

	it('returns a failure, not a throw, when nothing responds', async () => {
		await withServer(
			(_req, res) => json(res, {}, 404),
			async baseUrl => {
				const result = await probeEndpoint(baseUrl);
				assert.strictEqual(result.ok, false);
			},
		);
	});

	it('treats an empty model list as a failed probe, not a false positive', async () => {
		await withServer(
			(req, res) => {
				if (req.url === '/v1/models') {
					return json(res, { object: 'list', data: [] });
				}
				json(res, {}, 404);
			},
			async baseUrl => {
				const result = await probeEndpoint(baseUrl);
				assert.strictEqual(result.ok, false);
			},
		);
	});
});

describe('probeKnownEndpoint', () => {
	it('re-validates a specific already-known recipe', async () => {
		await withServer(
			(req, res) => {
				if (req.url === '/v1/models') {
					return json(res, { data: [{ id: 'still-here' }] });
				}
				json(res, {}, 404);
			},
			async baseUrl => {
				const result = await probeKnownEndpoint(baseUrl, 'openai-compat', '/v1/models');
				assert.strictEqual(result.ok, true);
			},
		);
	});
});

describe('completionsPathForProbeResult', () => {
	it('defaults to the root OpenAI-compat completions path when the listing path is at the root', () => {
		const result: ProbeResult = { ok: true, format: 'openai-compat', modelEndpointPath: '/v1/models', models: [] };
		assert.strictEqual(completionsPathForProbeResult(result), '/v1/chat/completions');
	});

	it('uses the OpenAI-compat completions shape even for an Ollama-discovered entry', () => {
		const result: ProbeResult = { ok: true, format: 'ollama-native', modelEndpointPath: '/api/tags', models: [] };
		assert.strictEqual(completionsPathForProbeResult(result), '/v1/chat/completions');
	});

	it('falls back to the per-format default for an unrecognized listing path', () => {
		const result: ProbeResult = { ok: true, format: 'anthropic-messages', modelEndpointPath: '/custom/list', models: [] };
		assert.strictEqual(completionsPathForProbeResult(result), '/v1/messages');
	});
});
