/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';

// ---------------------------------------------------------------------------
// Shared tool-count limiting, used by both the OpenAI Responses proxy and the
// Anthropic Messages proxy. Feima rejects requests with more than 128 tools
// ("Cannot have more than 128 tools per request."), so when a CLI sends more
// than that we relevance-filter down to the limit instead of failing outright.
// ---------------------------------------------------------------------------

export const HARD_TOOL_LIMIT = 128;

const HIGH_PRIORITY_TOOL_NAMES = new Set([
	'readFile',
	'writeFile',
	'replaceInFile',
	'listDirectory',
	'fileSearch',
	'searchContent',
	'vscode_editFile_internal',
	'vscode_editFile',
	'copilot_editFiles',
	'runInTerminal',
	'exec_command',
	'create_directory',
	'get_terminal_output',
	'manage_todo_list',
]);

export function extractQueryText(messages: vscode.LanguageModelChatMessage[]): string {
	return messages
		.filter(m => m.role === 1)
		.map(m => {
			if (typeof m.content === 'string') {
				return m.content;
			}
			return m.content
				.map(part => part instanceof vscode.LanguageModelTextPart ? part.value : '')
				.join(' ');
		})
		.join(' ');
}

function scoreToolRelevance(tool: vscode.LanguageModelChatTool, query: string): number {
	const queryLower = query.toLowerCase();
	const nameLower = tool.name.toLowerCase();
	const descLower = (tool.description ?? '').toLowerCase();
	let score = 0;

	if (HIGH_PRIORITY_TOOL_NAMES.has(tool.name)) {
		score += 50;
	}

	if (queryLower.includes(nameLower)) {
		score += 10;
	}

	const keywordGroups: Array<{ keywords: string[]; nameKeywords: string[]; bonus: number }> = [
		{ keywords: ['create', 'write', 'save', 'new', 'make'], nameKeywords: ['create', 'write', 'save'], bonus: 10 },
		{ keywords: ['read', 'show', 'display', 'get', 'open'], nameKeywords: ['read', 'get', 'list', 'show', 'open'], bonus: 8 },
		{ keywords: ['edit', 'modify', 'change', 'update', 'replace'], nameKeywords: ['edit', 'replace', 'apply', 'insert'], bonus: 10 },
		{ keywords: ['search', 'find', 'lookup', 'grep'], nameKeywords: ['search', 'find', 'grep'], bonus: 8 },
		{ keywords: ['terminal', 'command', 'run', 'execute', 'shell'], nameKeywords: ['terminal', 'run', 'execute', 'shell'], bonus: 8 },
	];

	for (const group of keywordGroups) {
		if (group.keywords.some(keyword => queryLower.includes(keyword))) {
			if (group.nameKeywords.some(keyword => nameLower.includes(keyword))) {
				score += group.bonus;
			}
		}
	}

	if (descLower) {
		for (const word of queryLower.split(/\s+/)) {
			if (word.length > 3 && descLower.includes(word)) {
				score += 1;
			}
		}
	}

	return score;
}

/**
 * Relevance-filter `tools` down to `maxTools`, keyed off text pulled from the
 * user's messages (`query`). No-op if already within the limit.
 */
export function filterTools(tools: vscode.LanguageModelChatTool[], query: string, log: ILogService, maxTools: number = HARD_TOOL_LIMIT): vscode.LanguageModelChatTool[] {
	if (tools.length <= maxTools) {
		return tools;
	}

	const scored = tools.map(tool => ({ tool, score: scoreToolRelevance(tool, query) }));
	scored.sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name));

	const selected = scored.slice(0, maxTools).map(entry => entry.tool);
	const dropped = scored.slice(maxTools).map(entry => entry.tool.name);
	log.warn(`filtered ${tools.length} tools down to ${maxTools}; dropped ${dropped.length} tools: ${dropped.slice(0, 20).join(', ')}${dropped.length > 20 ? ', ...' : ''}`);
	return selected;
}
