/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Tool-name exclusion patterns are entirely driven by the
 * `feima.agents.tools.excludePatterns` setting — its `default` in
 * package.json is the single source of truth (not duplicated here) and is
 * always what `.get()` below returns until the user overrides it. Supports
 * a single `*` wildcard per pattern (glob-lite), matched case-sensitively
 * against the full tool name. See package.json's markdownDescription for
 * the rationale behind each shipped default (MCP-backed `mcp_*` tools now
 * handled natively by each CLI's own MCP client, Copilot Chat manifest-only
 * tools with no runtime implementation, and foreign agent-loop control
 * signals from other agent SDKs).
 */
const CONFIG_SECTION = 'feima.agents.tools';
const CONFIG_KEY = 'excludePatterns';

/** Reads the user-configurable tool exclusion pattern list. */
export function getConfiguredExcludePatterns(): readonly string[] {
	return vscode.workspace.getConfiguration(CONFIG_SECTION).get<string[]>(CONFIG_KEY) ?? [];
}

/** Converts a single `*`-wildcard glob pattern into a fully-anchored RegExp. */
function globToRegExp(pattern: string): RegExp {
	const escaped = pattern
		.split('*')
		.map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
		.join('.*');
	return new RegExp(`^${escaped}$`);
}

/**
 * Returns true if `name` matches any of the given exclude patterns. Each
 * pattern may contain `*` as a wildcard (matching zero or more characters);
 * everything else is matched literally.
 */
export function isToolNameExcluded(name: string, patterns: readonly string[]): boolean {
	return patterns.some(pattern => globToRegExp(pattern).test(name));
}
