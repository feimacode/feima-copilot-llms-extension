/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Disclosure content for a routing decision.
 *
 *  IMPORTANT DESIGN-TIME CONSTRAINT (found during implementation, not
 *  anticipated in design.md): VS Code's own native Auto renders disclosure
 *  as a rich, collapsible `ChatAutoModeResolutionContentPart` — but that is
 *  core/chat-participant-only machinery (`vscode.ChatResponseStream`), not
 *  something available to a third-party `vscode.LanguageModelChatProvider`.
 *  A provider can only report `LanguageModelResponsePart`s (text, tool
 *  calls, data, thinking) — there is no custom collapsible-widget part type
 *  in the public API. So disclosure here is a small markdown-formatted text
 *  prefix reported via `LanguageModelTextPart` before the actual answer
 *  streams in — matching the CONTENT shape VS Code's Auto discloses
 *  (resolved model + reason, escalation/fallback called out explicitly),
 *  not the rich widget mechanics, which are simply not reachable from this
 *  API surface. See design.md for the note added alongside this file.
 *--------------------------------------------------------------------------------------------*/

import { AutoOutcome } from './types';

/** Text prefix reported before the delegated response streams in. Empty string for no prefix (not currently used, kept for API symmetry). */
export function buildDisclosurePrefix(outcome: AutoOutcome): string {
	if (outcome.kind === 'fallback') {
		return `> 🧭 **Feima Auto** — ${outcome.reason}\n\n`;
	}
	const icon = outcome.escalated ? '🧭↗' : '🧭';
	return `> ${icon} **Feima Auto** routed to *${outcome.candidate.info.name}* — ${outcome.reason}\n\n`;
}

/** Message shown when no candidate qualifies at all — the whole response, since there's nothing to delegate to. */
export function buildFallbackMessage(outcome: Extract<AutoOutcome, { kind: 'fallback' }>): string {
	return `🧭 **Feima Auto** could not find a qualifying local or enterprise endpoint for this request: ${outcome.reason}. `
		+ `Register an endpoint (\`Feima: Add Model Endpoint\`) or pick a model directly from the picker instead of Feima Auto.`;
}
