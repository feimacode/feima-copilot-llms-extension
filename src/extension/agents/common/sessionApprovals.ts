/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Cross-turn "allow for the session" memory, shared by all three
 * participants (see common/confirmationTool.ts's "Allow for the Session"
 * option).
 *
 * Keyed however each participant's approval requests naturally identify
 * "the same action" — Claude: tool name; Codex: command text / grantRoot;
 * Copilot: a kind-prefixed request identifier. Persisted in
 * `ChatResult.metadata` (not just an in-memory session map) so it survives
 * both warm-session reuse and a full extension host restart, same as the
 * session/thread ids each participant already round-trips through metadata.
 */

/** Parse a metadata field back into a live approvals set. */
export function parseAllowedActions(raw: unknown): Set<string> {
	return new Set(Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : []);
}

/** Serialize an approvals set for `ChatResult.metadata`; `undefined` when empty (nothing to persist). */
export function serializeAllowedActions(approvals: ReadonlySet<string>): string[] | undefined {
	return approvals.size > 0 ? [...approvals] : undefined;
}
