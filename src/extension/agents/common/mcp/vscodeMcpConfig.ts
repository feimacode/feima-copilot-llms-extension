/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parse as parseJsonc } from 'jsonc-parser';
import { ILogService } from '../../../platform/log/common/logService';

/**
 * A single MCP server entry as it appears in VS Code's own `mcp.json` files
 * (user profile `mcp.json` and workspace-folder `.vscode/mcp.json`). Shape
 * mirrors `vscode.McpStdioServerDefinition` / `McpHttpServerDefinition` from
 * the stable `vscode.lm` API (see node_modules/@types/vscode/index.d.ts,
 * `McpServerDefinition` union), reduced to the plain-data fields every one of
 * our CLI participants (Claude/Codex) needs to re-serialize the server for
 * their own native `-c mcp_servers.*` / `mcpServers` mechanisms.
 */
export interface VsCodeMcpServerDefinition {
	type?: 'stdio' | 'http' | 'sse';
	command?: string;
	args?: string[];
	env?: Record<string, string>;
	cwd?: string;
	url?: string;
	headers?: Record<string, string>;
}

interface McpJsonFileShape {
	servers?: Record<string, unknown>;
	// VS Code's mcp.json also supports an `inputs` array (variable prompts,
	// e.g. `${input:api-key}`) resolved interactively by the editor when a
	// server is started. We have no equivalent prompt UI here, so values
	// containing `${input:...}` placeholders are passed through verbatim —
	// they simply won't be substituted (documented limitation).
	inputs?: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toServerDefinition(raw: unknown): VsCodeMcpServerDefinition | undefined {
	if (!isPlainObject(raw)) {
		return undefined;
	}
	const def: VsCodeMcpServerDefinition = {};
	if (typeof raw.type === 'string') { def.type = raw.type as VsCodeMcpServerDefinition['type']; }
	if (typeof raw.command === 'string') { def.command = raw.command; }
	if (Array.isArray(raw.args)) { def.args = raw.args.filter((a): a is string => typeof a === 'string'); }
	if (isPlainObject(raw.env)) {
		def.env = Object.fromEntries(Object.entries(raw.env).filter((e): e is [string, string] => typeof e[1] === 'string'));
	}
	if (typeof raw.cwd === 'string') { def.cwd = raw.cwd; }
	if (typeof raw.url === 'string') { def.url = raw.url; }
	if (isPlainObject(raw.headers)) {
		def.headers = Object.fromEntries(Object.entries(raw.headers).filter((e): e is [string, string] => typeof e[1] === 'string'));
	}
	return def;
}

/**
 * Reads and parses one `mcp.json`-shaped file (`{ servers: { name: {...} } }`)
 * from disk. Returns an empty map if the file doesn't exist or fails to
 * parse — this is a best-effort read, never fatal to the caller.
 */
async function readMcpJsonFile(uri: vscode.Uri, log: ILogService): Promise<Record<string, VsCodeMcpServerDefinition>> {
	log.debug(`reading MCP config file: ${uri.fsPath}`);
	let bytes: Uint8Array;
	try {
		bytes = await vscode.workspace.fs.readFile(uri);
	} catch {
		// Most common case: file doesn't exist. Not an error.
		log.debug(`no MCP config file at ${uri.fsPath} (not found)`);
		return {};
	}
	try {
		const text = Buffer.from(bytes).toString('utf8');
		const parsed = parseJsonc(text) as McpJsonFileShape | undefined;
		if (!parsed || !isPlainObject(parsed.servers)) {
			log.debug(`${uri.fsPath}: no "servers" object found — 0 MCP server(s)`);
			return {};
		}
		const result: Record<string, VsCodeMcpServerDefinition> = {};
		for (const [name, rawDef] of Object.entries(parsed.servers)) {
			const def = toServerDefinition(rawDef);
			if (def) {
				result[name] = def;
			}
		}
		log.debug(`${uri.fsPath}: found ${Object.keys(result).length} MCP server(s): ${Object.keys(result).join(', ') || '(none)'}`);
		return result;
	} catch (err) {
		log.warn(`failed to parse MCP config file ${uri.toString()}: ${String(err)}`);
		return {};
	}
}

let _isWsl: boolean | undefined;

/**
 * Detects whether the extension host is running inside WSL (as opposed to a
 * "real" remote like SSH/containers). WSL shares the Windows host's
 * filesystem via `/mnt/c`, so — unlike other remotes — the real,
 * user-edited `mcp.json` on the Windows side is directly reachable from the
 * Linux-side extension host; it's just not where `globalStorageUri` points.
 */
function isWsl(): boolean {
	if (_isWsl !== undefined) { return _isWsl; }
	try {
		const version = fs.readFileSync('/proc/version', 'utf8').toLowerCase();
		_isWsl = version.includes('microsoft') || version.includes('wsl');
	} catch {
		_isWsl = false;
	}
	return _isWsl;
}

function detectWindowsAppDataFolderName(): string {
	const appName = vscode.env.appName;
	if (appName.includes('Insiders')) { return 'Code - Insiders'; }
	if (appName.includes('OSS')) { return 'Code - OSS'; }
	return 'Code';
}

/**
 * In WSL, locates the Windows-side user profile's `mcp.json` under
 * `/mnt/c/Users/<user>/AppData/Roaming/<appName>/User/mcp.json`. Tries the
 * WSL username as a hint for the Windows username first, then falls back to
 * scanning `/mnt/c/Users/*` for whichever profile actually has the file.
 */
function resolveWslUserMcpJsonPath(): string | undefined {
	const usersDir = '/mnt/c/Users';
	const appDataFolder = detectWindowsAppDataFolderName();
	const wslUser = os.userInfo().username;

	const userGuesses = [...new Set([wslUser, wslUser.toLowerCase(), wslUser.toUpperCase()])];
	for (const user of userGuesses) {
		const candidate = path.join(usersDir, user, 'AppData', 'Roaming', appDataFolder, 'User', 'mcp.json');
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}

	// WSL username didn't match the Windows one — scan all profiles for the file.
	try {
		for (const entry of fs.readdirSync(usersDir)) {
			const candidate = path.join(usersDir, entry, 'AppData', 'Roaming', appDataFolder, 'User', 'mcp.json');
			if (fs.existsSync(candidate)) {
				return candidate;
			}
		}
	} catch {
		// /mnt/c not mounted/accessible — give up.
	}
	return undefined;
}

/**
 * Resolves the user-profile `mcp.json` URI.
 *
 * For local installs, VS Code defines both `globalStorageHome` and
 * `mcpResource` as direct children of the same profile-root URI (confirmed
 * against VS Code source, src/vs/platform/userDataProfile/common/userDataProfile.ts
 * lines 196/203), and an extension's own `globalStorageUri` is
 * `<profileRoot>/globalStorage/<extensionId>` — so walking up two segments
 * reaches the exact profile root.
 *
 * This does NOT hold for remote extension hosts: per VS Code's server
 * source (src/vs/server/node/remoteAgentEnvironmentImpl.ts), a remote
 * extension host's `globalStorageHome` comes from a *separate*
 * `IUserDataProfilesService` instance running on the remote machine itself —
 * an independent profile, not a mirror of the client's. For a true remote
 * (SSH/containers) there is no extension-facing API that reaches back to the
 * client's real `mcp.json`. WSL is the one exception: since it shares the
 * Windows host's filesystem via `/mnt/c`, we can read the real, user-edited
 * `mcp.json` directly off the Windows side instead of the WSL-local profile
 * mirror that `globalStorageUri` would otherwise point to.
 */
function resolveUserMcpJsonUri(globalStorageUri: vscode.Uri, log: ILogService): vscode.Uri {
	if (isWsl()) {
		const wslPath = resolveWslUserMcpJsonPath();
		if (wslPath) {
			log.debug(`WSL detected — using Windows-side user mcp.json at ${wslPath}`);
			return vscode.Uri.file(wslPath);
		}
		log.debug('WSL detected but no Windows-side user mcp.json found under /mnt/c/Users/*; falling back to the WSL-local profile path');
	}
	return vscode.Uri.joinPath(globalStorageUri, '..', '..', 'mcp.json');
}

/**
 * Resolves the workspace-folder `.vscode/mcp.json` URI for a given folder —
 * VS Code's own project-scoped MCP config file (confirmed against VS Code
 * source, src/vs/workbench/contrib/mcp/browser/mcpWorkbenchService.ts's
 * `getWorkspaceMcpConfigPath`, which joins `FOLDER_CONFIG_FOLDER_NAME`
 * ('.vscode') with `MCP_CONFIGURATION_KEY + '.json'` ('mcp.json')).
 */
function resolveWorkspaceMcpJsonUri(folder: vscode.WorkspaceFolder): vscode.Uri {
	return vscode.Uri.joinPath(folder.uri, '.vscode', 'mcp.json');
}

/**
 * Returns the effective, merged set of MCP servers VS Code itself would
 * offer to the model — read directly from VS Code's own native config
 * files, no extension-specific setting involved:
 *
 *  - user profile `mcp.json` (`<profileRoot>/mcp.json`)
 *  - every workspace folder's `.vscode/mcp.json`
 *
 * Workspace-folder entries take precedence over user entries on name
 * collision, mirroring VS Code's own scope precedence (folder > user).
 *
 * This intentionally does NOT cover every discovery source VS Code itself
 * supports (e.g. the root `.mcp.json` Claude-compat file, `.cursor/mcp.json`
 * compat files, the inline `mcp.servers` settings.json key, or
 * extension/gallery-contributed servers) — those are edge cases with no
 * stable, generically-readable shape from an extension's perspective. The
 * two sources above are VS Code's own primary, documented config surface.
 */
export async function getEffectiveMcpServers(
	globalStorageUri: vscode.Uri,
	log: ILogService,
): Promise<Record<string, VsCodeMcpServerDefinition>> {
	const userUri = resolveUserMcpJsonUri(globalStorageUri, log);
	log.debug(`resolving user-profile MCP config from ${userUri.fsPath}`);
	const userServers = await readMcpJsonFile(userUri, log);

	const merged: Record<string, VsCodeMcpServerDefinition> = { ...userServers };

	const folders = vscode.workspace.workspaceFolders ?? [];
	log.debug(`resolving workspace-folder MCP config across ${folders.length} folder(s)`);
	for (const folder of folders) {
		const folderUri = resolveWorkspaceMcpJsonUri(folder);
		log.debug(`resolving MCP config for workspace folder "${folder.name}" from ${folderUri.fsPath}`);
		const folderServers = await readMcpJsonFile(folderUri, log);
		const overridden = Object.keys(folderServers).filter(name => name in merged);
		if (overridden.length > 0) {
			log.debug(`workspace folder "${folder.name}" overrides ${overridden.length} user-scoped MCP server(s): ${overridden.join(', ')}`);
		}
		Object.assign(merged, folderServers);
	}

	const count = Object.keys(merged).length;
	log.debug(`resolved ${count} effective MCP server(s) total from VS Code's native mcp.json config${count > 0 ? `: ${Object.keys(merged).join(', ')}` : ''} (user: ${Object.keys(userServers).length})`);
	return merged;
}
