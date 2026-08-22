/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  A lightweight, explainable fingerprint of "which conversation is this",
 *  derived from the first message. The Language Model Provider API is
 *  stateless per-call and exposes no stable conversation/session id, so
 *  continuity is inferred this way instead — a simple heuristic, not a
 *  perfect one, consistent with the rest of Auto's v1 scope (see design.md
 *  Open Questions).
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export function conversationFingerprint(messages: readonly vscode.LanguageModelChatMessage[]): string | undefined {
	const first = messages[0];
	if (!first) {
		return undefined;
	}
	const text = typeof first.content === 'string'
		? first.content
		: first.content
			.map(p => (p instanceof vscode.LanguageModelTextPart ? p.value : ''))
			.join('');
	// Role + a bounded prefix is enough to distinguish conversations without
	// growing the key with the whole (potentially huge) message history.
	return `${first.role}:${text.slice(0, 200)}`;
}
