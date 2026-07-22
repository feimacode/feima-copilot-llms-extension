/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { execSync } from 'child_process';
import type { ProxyManager, ProxyInfo } from './common/proxy/proxyManager';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CliStatus {
	/** CLI identifier: 'codex' | 'claude' | 'copilot' */
	id: string;
	/** Human-readable name for display */
	displayName: string;
	/** Whether the binary was found */
	installed: boolean;
	/** Resolved absolute path, or null if not found */
	path: string | null;
	/** The VS Code setting key that overrides the binary path */
	settingKey: string;
}

// ─── Proxy info provider ──────────────────────────────────────────────────────

/**
 * The ProxyManager is created in registerAgents(), which runs after the auth
 * commands (and thus the Account dialog) are wired up. To avoid a circular
 * dependency or ordering constraint, we store a lazy reference here that the
 * Account dialog reads on demand.
 */
let _proxyManager: ProxyManager | null = null;

/** Called once by registerAgents() to make the proxy available to the dialog. */
export function setProxyManager(proxyManager: ProxyManager): void {
	_proxyManager = proxyManager;
}

/**
 * Returns the proxy endpoint info (URLs + nonces) for display in the Account
 * dialog. Returns null if the agents haven't been registered yet.
 */
export async function getProxyInfo(): Promise<ProxyInfo | null> {
	if (!_proxyManager) {
		return null;
	}
	await _proxyManager.ready;
	return _proxyManager.info;
}

// ─── CLI detection ────────────────────────────────────────────────────────────

const CLI_DEFS: Array<{ id: string; displayName: string; binaryName: string; settingKey: string }> = [
	{ id: 'codex', displayName: 'Codex CLI', binaryName: 'codex', settingKey: 'feima.agents.codex.binaryPath' },
	{ id: 'claude', displayName: 'Claude CLI', binaryName: 'claude', settingKey: 'feima.agents.claude.binaryPath' },
	{ id: 'copilot', displayName: 'Copilot CLI', binaryName: 'copilot', settingKey: 'feima.agents.copilot.binaryPath' },
];

/**
 * Detect whether each agent CLI is installed and resolve its location.
 * Uses the configured binary path from settings if set, otherwise falls back
 * to PATH lookup via `which`.
 *
 * This is intentionally synchronous (execSync) because it runs once when the
 * Account dialog opens and the `which` calls are fast (< 10ms each).
 */
export function detectCliStatuses(): CliStatus[] {
	return CLI_DEFS.map(def => {
		const configuredPath = vscode.workspace.getConfiguration().get<string>(def.settingKey) ?? '';
		if (configuredPath) {
			return {
				id: def.id,
				displayName: def.displayName,
				installed: true,
				path: configuredPath,
				settingKey: def.settingKey,
			};
		}
		try {
			const resolved = execSync(`which ${def.binaryName}`, { encoding: 'utf8', timeout: 5000 }).trim();
			return {
				id: def.id,
				displayName: def.displayName,
				installed: true,
				path: resolved,
				settingKey: def.settingKey,
			};
		} catch {
			return {
				id: def.id,
				displayName: def.displayName,
				installed: false,
				path: null,
				settingKey: def.settingKey,
			};
		}
	});
}
