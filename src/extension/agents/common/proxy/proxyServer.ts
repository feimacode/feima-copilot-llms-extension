/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as crypto from 'crypto';
import * as http from 'http';
import { ILogService } from '../../../platform/log/common/logService';

export type RouteHandler = (
	req: http.IncomingMessage,
	res: http.ServerResponse,
	body: unknown,
) => Promise<void>;

export interface IRoute {
	method: string;
	path: string;
	handler: RouteHandler;
}

/** Read and JSON-parse the request body. Returns `{}` on parse failure. */
export async function readBody(req: http.IncomingMessage): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on('data', (chunk: Buffer) => chunks.push(chunk));
		req.on('end', () => {
			const raw = Buffer.concat(chunks).toString('utf8');
			if (!raw) { resolve({}); return; }
			try { resolve(JSON.parse(raw)); } catch { resolve({}); }
		});
		req.on('error', reject);
	});
}

/** Start SSE response headers. */
export function startSSE(res: http.ServerResponse): void {
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive',
		'X-Accel-Buffering': 'no',
	});
}

/** Write one SSE `data:` event. */
export function writeSSEEvent(res: http.ServerResponse, data: unknown): void {
	res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/** Write one SSE event with an explicit event name (Anthropic style). */
export function writeNamedSSEEvent(res: http.ServerResponse, event: string, data: unknown): void {
	res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Write JSON response. */
export function writeJSON(res: http.ServerResponse, status: number, body: unknown): void {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		'Content-Type': 'application/json',
		'Content-Length': Buffer.byteLength(payload),
	});
	res.end(payload);
}

/** Simple short ID generator (not cryptographically unique but good enough for SSE IDs). */
let _idCounter = 0;
export function makeId(prefix: string): string {
	return `${prefix}_${Date.now().toString(36)}${(++_idCounter).toString(36)}`;
}

/**
 * A minimal HTTP server that authenticates every request with a per-instance nonce.
 * Routes are matched by exact method + path prefix.
 *
 * Lifecycle: start with `start()`, dispose by calling `dispose()` (called from extension deactivate).
 */
export class ProxyServer {
	readonly nonce: string = crypto.randomUUID();
	private readonly _server: http.Server;
	private _port = 0;
	private readonly _routes: IRoute[] = [];

	constructor(private readonly _log: ILogService) {
		this._server = http.createServer(async (req, res) => {
			const url = req.url ?? '/';
			const method = (req.method ?? 'GET').toUpperCase();
			this._log.debug(`→ ${method} ${url} auth=${(req.headers['authorization'] ?? '').toString().slice(0, 30)}...`);

			// CORS pre-flight
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
			if (req.method === 'OPTIONS') {
				res.writeHead(204);
				res.end();
				return;
			}

			// HEAD / is a health check — respond without auth
			if (method === 'HEAD') {
				res.writeHead(200);
				res.end();
				return;
			}

			// Nonce auth — accept Bearer <nonce> or Bearer <nonce>.<sessionId>
			const auth = (req.headers['authorization'] ?? '').toString();
			if (!auth.startsWith(`Bearer ${this.nonce}`)) {
				this._log.warn(`401 auth mismatch — got: ${auth.slice(0, 40)} expected Bearer ${this.nonce.slice(0, 8)}...`);
				writeJSON(res, 401, { error: { type: 'authentication_error', message: 'Unauthorized' } });
				return;
			}

			// Find matching route (exact match or prefix)
			const route = this._routes.find(r =>
				r.method === method && (url === r.path || url.startsWith(r.path + '?'))
			);

			if (!route) {
				this._log.warn(`404 no route for ${method} ${url}  routes=${this._routes.map(r => r.method + ' ' + r.path).join(', ')}`);
				writeJSON(res, 404, { error: { type: 'not_found_error', message: `No handler for ${method} ${url}` } });
				return;
			}

			let body: unknown;
			try {
				body = method === 'GET' ? {} : await readBody(req);
			} catch {
				writeJSON(res, 400, { error: { type: 'invalid_request_error', message: 'Failed to parse request body' } });
				return;
			}

			try {
				await route.handler(req, res, body);
			} catch (err) {
				if (!res.headersSent) {
					writeJSON(res, 500, { error: { type: 'server_error', message: String(err) } });
				}
			}
		});
	}

	addRoute(method: string, path: string, handler: RouteHandler): void {
		this._routes.push({ method: method.toUpperCase(), path, handler });
	}

	start(): Promise<number> {
		return new Promise((resolve, reject) => {
			this._server.listen(0, '127.0.0.1', () => {
				const addr = this._server.address() as { port: number };
				this._port = addr.port;
				this._log.debug(`listening on http://127.0.0.1:${this._port}  nonce=${this.nonce.slice(0, 8)}...`);
				resolve(this._port);
			});
			this._server.once('error', reject);
		});
	}

	get port(): number { return this._port; }
	get baseUrl(): string { return `http://127.0.0.1:${this._port}`; }

	dispose(): void {
		this._server.close();
	}
}
