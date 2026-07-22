/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from 'events';
import * as readline from 'readline';
import { execSync } from 'child_process';
import { ILogService } from '../../../platform/log/common/logService';

// ─── JSON-RPC primitives ─────────────────────────────────────────────────────

export type JSONRPCRequest = { method: string; id: number | string; params?: unknown };

export type JSONRPCResponse = {
	id: string | number;
	result?: unknown;
	error?: { code: number; message: string; data?: unknown };
};

export type JSONRPCNotification = { method: string; params?: unknown };

/** A message from the app-server can be a response, a server-initiated request, or a notification. */
export type AppServerMessage =
	| JSONRPCResponse
	| { method: string; id: string | number; params?: unknown }
	| JSONRPCNotification;

export interface AppServerClientOptions {
	/** Resolved absolute path to the codex binary. */
	binaryPath: string;
	cwd?: string;
	signal?: AbortSignal;
	/** Additional environment variables for the subprocess (merged over process.env). */
	env?: NodeJS.ProcessEnv;
	/** Extra arguments appended after 'app-server' (e.g. '-c model_provider=vscode-proxy'). */
	extraArgs?: string[];
}

// ─── Client ──────────────────────────────────────────────────────────────────

/**
 * Low-level JSON-RPC client for codex app-server.
 * Handles bidirectional communication over stdin/stdout.
 *
 * Events:
 *   'notification'  — any server notification  (params: JSONRPCNotification)
 *   'request'       — server-initiated request  (params: { method, id, params })
 *   'error'         — error event
 *   'stderr'        — stderr text from subprocess
 *   'exit'          — process exited            (params: { code, signal })
 *   '{method}'      — shortcut per notification method
 */
export class AppServerClient extends EventEmitter {
	private process: ChildProcessWithoutNullStreams | null = null;
	private requestId = 0;
	private pendingRequests = new Map<
		number | string,
		{ resolve: (value: unknown) => void; reject: (error: Error) => void }
	>();
	private lineReader: readline.Interface | null = null;
	private readonly _log?: ILogService;

	constructor(private readonly options: AppServerClientOptions, log?: ILogService) {
		super();
		this._log = log;
	}

	/** Spawn the app-server subprocess and wire up message routing. */
	async start(): Promise<void> {
		this.process = spawn(this.options.binaryPath, ['app-server', ...(this.options.extraArgs ?? [])], {
			cwd: this.options.cwd ?? process.cwd(),
			signal: this.options.signal,
			stdio: ['pipe', 'pipe', 'pipe'],
			env: this.options.env ?? process.env,
		});

		if (!this.process.stdin || !this.process.stdout || !this.process.stderr) {
			throw new Error('Failed to create app-server process streams');
		}

		this.lineReader = readline.createInterface({
			input: this.process.stdout,
			crlfDelay: Infinity,
		});

		this.lineReader.on('line', (line) => {
			if (!line.trim()) { return; }
			this._log?.debug('[app-server] raw line: ' + line.slice(0, 500));
			try {
				const message = JSON.parse(line) as AppServerMessage;
				this.handleMessage(message);
			} catch {
				this.emit('error', new Error(`Failed to parse JSON-RPC message: ${line}`));
			}
		});

		this.process.stderr.on('data', (data: Buffer) => {
			this._log?.debug('[app-server] stderr: ' + data.toString().trim());
			this.emit('stderr', data.toString());
		});

		this.process.on('error', (err: Error) => {
			this.emit('error', err);
		});

		this.process.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
			this.emit('exit', { code, signal });
			this.cleanup();
		});
	}

	/** Send the JSON-RPC initialize handshake. */
	async initialize(clientInfo: { name: string; title: string; version: string }): Promise<unknown> {
		const result = await this.request('initialize', {
			clientInfo,
			capabilities: { experimentalApi: true },
		});
		this.notify('initialized', undefined);
		return result;
	}

	/** Send a JSON-RPC request and wait for the response. */
	async request(method: string, params?: unknown): Promise<unknown> {
		if (!this.process?.stdin) {
			throw new Error('App-server not started');
		}

		const id = ++this.requestId;
		const message: JSONRPCRequest = { method, id, params };
		this._log?.debug('[app-server] → request ' + JSON.stringify({ method, id, params }).slice(0, 300));

		return new Promise((resolve, reject) => {
			this.pendingRequests.set(id, { resolve, reject });
			const json = JSON.stringify(message) + '\n';
			this.process!.stdin!.write(json, (err) => {
				if (err) {
					this.pendingRequests.delete(id);
					reject(err);
				}
			});
		});
	}

	/** Send a JSON-RPC notification (fire-and-forget). */
	notify(method: string, params?: unknown): void {
		if (!this.process?.stdin) { return; }
		this._log?.debug('[app-server] → notify ' + method);
		this.process.stdin.write(JSON.stringify({ method, params }) + '\n');
	}

	/** Respond to a server-initiated request (e.g. an approval). */
	respond(id: string | number, result: unknown): void {
		if (!this.process?.stdin) { return; }
		this._log?.debug('[app-server] → respond id=' + id + ' ' + JSON.stringify(result).slice(0, 200));
		this.process.stdin.write(JSON.stringify({ id, result }) + '\n');
	}

	/** Kill the subprocess. */
	stop(): void {
		this.process?.kill();
		this.cleanup();
	}

	private handleMessage(message: AppServerMessage): void {
		// Response to one of our requests (has id, no method)
		if ('id' in message && !('method' in message)) {
			const response = message as JSONRPCResponse;
			// Try both the raw id and its numeric coercion — the server may return
			// a string id ("1") while we stored the pending request under a number (1).
			const pending = this.pendingRequests.get(response.id)
				?? this.pendingRequests.get(Number(response.id))
				?? this.pendingRequests.get(String(response.id));
			this._log?.debug('[app-server] response id ' + response.id + ' ' + typeof response.id + ' pending found: ' + !!pending);
			if (pending) {
				this.pendingRequests.delete(response.id);
				this.pendingRequests.delete(Number(response.id));
				this.pendingRequests.delete(String(response.id));
				if (response.error) {
					pending.reject(new Error(response.error.message));
				} else {
					pending.resolve(response.result);
				}
			}
			return;
		}

		// Server-initiated request (has both id and method) — e.g. approval
		if ('id' in message && 'method' in message) {
			this.emit('request', message);
			return;
		}

		// Notification (method only, no id)
		const notification = message as JSONRPCNotification;
		this.emit('notification', notification);
		this.emit(notification.method, notification.params);
	}

	private cleanup(): void {
		this.lineReader?.close();
		this.lineReader = null;

		for (const [, pending] of this.pendingRequests) {
			pending.reject(new Error('App-server process terminated'));
		}
		this.pendingRequests.clear();

		this.process = null;
	}
}

// ─── Binary resolution ───────────────────────────────────────────────────────

/**
 * Resolve a CLI binary path.
 * Uses `configPath` if non-empty, otherwise falls back to `which <fallbackName>` on PATH.
 */
export function resolveBinary(configPath: string, fallbackName = 'codex', log?: ILogService): string {
	if (configPath) {
		return configPath;
	}
	try {
		return execSync(`which ${fallbackName}`, { encoding: 'utf8' }).trim();
	} catch {
		log?.error(`Could not find the ${fallbackName} binary. Set the binary path in VS Code settings or make sure ${fallbackName} is on your PATH.`);
		throw new Error(
			`Could not find the ${fallbackName} binary. ` +
			`Set the binary path in VS Code settings or make sure ${fallbackName} is on your PATH.`
		);
	}
}
