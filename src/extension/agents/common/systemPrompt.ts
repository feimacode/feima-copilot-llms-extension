/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Resolves each agent's `feima.agents.<agent>.systemPrompt` /
 * `.systemPromptMode` settings against a built-in default (see
 * constants/systemPromptDefaults.ts) into the single merged string each
 * participant hands to its own SDK.
 */

export type SystemPromptMode = 'append' | 'replace';

export interface ResolvedSystemPrompt {
	/** The mode actually applied. Only differs from the configured mode when
	 *  'replace' was selected with an empty `systemPrompt` (see below). */
	mode: SystemPromptMode;
	/** Merged text: `builtInDefault` + user text (append), or user text alone (replace). */
	content: string;
}

function isSystemPromptMode(value: unknown): value is SystemPromptMode {
	return value === 'append' || value === 'replace';
}

/**
 * Reads `feima.agents.<agentKey>.systemPrompt` and `.systemPromptMode`, and
 * merges them with `builtInDefault`:
 * - `'append'` (default): `builtInDefault`, then the user's text on a new
 *   paragraph. The user's text is omitted entirely if left blank.
 * - `'replace'`: the user's text alone, verbatim — the built-in default (and,
 *   for Claude/Copilot, the vendor CLI's own default persona) is dropped.
 *   Falls back to `'append'` with just `builtInDefault` if the user selected
 *   `'replace'` but left the text empty, since an actually-empty prompt is
 *   never a useful outcome of a misconfigured setting.
 */
export function resolveSystemPrompt(
	agentKey: 'claude' | 'codex' | 'copilot',
	builtInDefault: string,
	log?: { debug(message: string): void },
): ResolvedSystemPrompt {
	const config = vscode.workspace.getConfiguration(`feima.agents.${agentKey}`);
	const userText = (config.get<string>('systemPrompt') ?? '').trim();
	const rawMode = config.get<string>('systemPromptMode');
	const mode: SystemPromptMode = isSystemPromptMode(rawMode) ? rawMode : 'append';

	if (mode === 'replace') {
		if (userText) {
			return { mode, content: userText };
		}
		log?.debug(`feima.agents.${agentKey}.systemPromptMode is 'replace' but systemPrompt is empty; falling back to the built-in default`);
		return { mode: 'append', content: builtInDefault };
	}
	if (!userText) {
		return { mode: 'append', content: builtInDefault };
	}
	return { mode: 'append', content: builtInDefault ? `${builtInDefault}\n\n${userText}` : userText };
}
