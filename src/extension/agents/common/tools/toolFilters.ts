/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Tool-name exclusion patterns are driven by the `feima.agents.tools.excludePatterns`
 * setting — its `default` in package.json is the single source of truth (not
 * duplicated here) and is always what `.get()` below returns until the user
 * overrides it. Supports a single `*` wildcard per pattern (glob-lite), matched
 * case-sensitively against the full tool name. See package.json's
 * markdownDescription for the rationale behind each shipped default (MCP-backed
 * `mcp_*` tools now handled natively by each CLI's own MCP client, Copilot Chat
 * manifest-only tools with no runtime implementation, and foreign agent-loop
 * control signals from other agent SDKs).
 *
 * Each participant may also override the shared list entirely via
 * `feima.agents.<participant>.tools.excludePatterns` — unset (`null`, the
 * default) falls back to the shared list above; an explicit array (including
 * `[]`) replaces it for that participant only.
 */
const CONFIG_SECTION = 'feima.agents.tools';
const CONFIG_KEY = 'excludePatterns';

export type ParticipantId = 'codex' | 'copilot' | 'claude';

/**
 * Reads the effective tool exclusion pattern list for `participant` (or the
 * shared, all-participants list when `participant` is omitted). A
 * participant-specific override, when set, entirely replaces the shared list.
 */
export function getConfiguredExcludePatterns(participant?: ParticipantId): readonly string[] {
	if (participant) {
		const override = vscode.workspace.getConfiguration(`feima.agents.${participant}.tools`).get<string[] | null>(CONFIG_KEY);
		if (override !== null && override !== undefined) {
			return override;
		}
	}
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
