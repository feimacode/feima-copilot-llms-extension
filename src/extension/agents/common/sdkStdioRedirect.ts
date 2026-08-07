/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import { ILogService } from '../../platform/log/common/logService';

/**
 * The agent SDKs (@github/copilot-sdk, @anthropic-ai/claude-agent-sdk) emit
 * their own diagnostics by writing directly to `process.stderr` from within the
 * extension host process (e.g. `[copilot-sdk] ...`, `SDK debug logs: ...`).
 * These writes bypass the Feima output channel and only show up in the
 * extension host's debug console, which makes agent issues hard to diagnose.
 *
 * This module installs a scoped interceptor that forwards `process.stderr`
 * writes to the Feima logger (so they appear in the "Feima" output panel) while
 * still writing to the original stream. It is idempotent — installing twice is a
 * no-op — and returns a disposer that restores the original stream.
 *
 * We deliberately do NOT intercept `process.stdout`: the SDKs don't write their
 * diagnostics there, and a global stdout hook risks interfering with other
 * extensions or the extension host.
 */

let _installed = false;

/**
 * Redirect `process.stderr` writes to the given logger.
 *
 * @returns A disposer that restores the original stream, or a no-op if the
 *          interceptor was already installed.
 */
export function installSdkStderrRedirect(log: ILogService): () => void {
	if (_installed) {
		return () => { /* already installed — no-op */ };
	}
	_installed = true;

	const origStderrWrite = process.stderr.write.bind(process.stderr) as (...a: unknown[]) => boolean;
	let buffer = '';

	const flush = (buf: string): string => {
		const lines = buf.split('\n');
		const remainder = lines.pop() ?? '';
		for (const line of lines) {
			const trimmed = line.replace(/\r$/, '').trim();
			if (trimmed) {
				log.debug(`[sdk] ${trimmed}`);
			}
		}
		return remainder;
	};

	process.stderr.write = ((...args: unknown[]): boolean => {
		try {
			const chunk = args[0];
			buffer += typeof chunk === 'string' ? chunk : Buffer.from(chunk as Uint8Array).toString('utf8');
			buffer = flush(buffer);
		} catch { /* never let logging break the stream */ }
		return origStderrWrite(...args);
	}) as typeof process.stderr.write;

	log.debug('SDK stderr redirect installed');

	return () => {
		if (!_installed) { return; }
		_installed = false;
		process.stderr.write = origStderrWrite;
		log.debug('SDK stderr redirect removed');
	};
}
