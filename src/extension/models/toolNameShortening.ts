/*---------------------------------------------------------------------------------------------
 *  Tool name shortening for the Responses API's 64-char function-name limit.
 *  Pure helper — no vscode import, so it can be unit-tested in plain Node/Mocha,
 *  matching this codebase's convention of keeping decidable logic out of the
 *  vscode-touching endpoint/provider files (see toolResultConverter.ts,
 *  protocolSelection.ts).
 *--------------------------------------------------------------------------------------------*/

import * as crypto from 'crypto';

/**
 * Some backends behind the Responses API (confirmed: OpenCode Zen /
 * opencode-go, rejecting a 70-char MCP-namespaced tool name —
 * "activate_fallback_mcp_pylance_mcp_s_pylanceInstalledTopLevelModules_1" —
 * with "function tool name must be at most 64 characters") enforce OpenAI's
 * own function-name length limit. VS Code tool names can exceed it — MCP
 * tools are often qualified as `server__toolName` and can run long.
 */
export const MAX_TOOL_NAME_LENGTH = 64;

/**
 * Deterministically shorten a tool name to fit within MAX_TOOL_NAME_LENGTH.
 * Pure function of the name — the same input always produces the same
 * output, so replayed tool-call history (from prior turns) naturally
 * re-derives the exact shortened name the server actually saw, with no need
 * to persist a mapping across requests. Within a single request, the
 * forward mapping built alongside the tool list is enough to reverse it
 * when a tool-call event comes back — the model can only call a tool that
 * was declared in that request's tool list.
 */
export function shortenToolName(name: string): string {
	if (name.length <= MAX_TOOL_NAME_LENGTH) {
		return name;
	}
	const hash = crypto.createHash('sha1').update(name).digest('hex').slice(0, 8);
	const prefixLength = MAX_TOOL_NAME_LENGTH - hash.length - 1; // -1 for the separator
	return `${name.slice(0, prefixLength)}_${hash}`;
}
