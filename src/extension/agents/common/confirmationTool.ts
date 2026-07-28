/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Shared blocking confirmation card for the claude/codex/copilot participants.
 *
 * Calls VS Code's own built-in `vscode_get_confirmation_with_options` tool
 * directly — we never register it ourselves, it already exists in core.
 * Two earlier approaches were tried and ruled out:
 *
 *  - `vscode.lm.invokeTool('vscode_get_confirmation', ...)`: resolves
 *    allow/deny in ~130-175ms regardless of risk — auto-confirmed by VS
 *    Code's per-toolId "Always Allow" store (`chat/autoconfirm`, keyed only
 *    on tool id), which any prior click against that shared internal id can
 *    silently poison for the rest of a session/workspace/profile.
 *  - Our own `vscode.lm.registerTool` + `confirmationMessages`: genuinely
 *    interactive, but exposed to the exact same per-toolId auto-confirm
 *    store, since every call site here funnelled through one shared tool id.
 *
 * `vscode_get_confirmation_with_options` is structurally exempt from that
 * store — VS Code core hardcodes it into `toolIdsThatCannotBeAutoApproved`
 * (languageModelToolsService.ts), so `isToolEligibleForAutoApproval()` always
 * returns false for it and the auto-confirm check is never reached, no
 * matter what's been clicked before. Its `buttons` input also gets us a real
 * multi-way answer: since it's core's own tool (not one we register), its
 * `invoke()` runs in-process with direct access to which custom button was
 * clicked, and returns that button's label back to us as plain text — unlike
 * a custom-registered extension tool, where that selection never crosses the
 * extension-host RPC boundary at all.
 *
 * Caveat: this is still undocumented internal API (no entry in this repo's
 * vendored VS Code type declarations, no compatibility contract) — the same
 * category of risk as the original `vscode_get_confirmation` bug. Unlike
 * that one, though, it has a structural (not incidental) guarantee behind
 * it, which is why it's worth the bet.
 *
 * Two more built-in wrinkles to know about:
 *
 *  - When several of our confirmations are pending at once (e.g. Codex or
 *    Copilot firing off multiple concurrent approval requests), VS Code's
 *    chat UI groups them into a "carousel" widget
 *    (chatToolConfirmationCarouselPart.ts) with an "Allow All" shortcut.
 *    That shortcut resolves every grouped invocation via a bare
 *    `{ type: ToolConfirmKind.UserAction }` — no `selectedButton` — so
 *    `vscode_get_confirmation_with_options`'s own `invoke()` never sees
 *    `invocation.selectedCustomButton` and falls back to its hardcoded
 *    default text, `'yes'`, instead of any of our button labels. Treated as
 *    an ordinary approval below.
 *  - Custom-option "kind" is fixed by VS Code core, not configurable by us:
 *    `prepareToolInvocation` maps index 0 → Approve, every other index →
 *    Deny (languageModelToolsService's built-in confirmationTool.ts), and the
 *    widget always renders each kind-group as one visible button (the first
 *    of that group) plus a dropdown for the rest. So "Cancel" and "Allow for
 *    the Session" land in the same (secondary) group — deliberately ordered
 *    below so "Cancel" is the one that stays visible and "Allow for the
 *    Session" is the one tucked a click deeper, since it's the broader,
 *    harder-to-undo commitment of the two.
 */

import * as vscode from 'vscode';

const CONFIRMATION_TOOL_ID = 'vscode_get_confirmation_with_options';
const APPROVE_LABEL = 'Allow';
const APPROVE_FOR_SESSION_LABEL = 'Allow for the Session';
const DENY_LABEL = 'Cancel';
// vscode_get_confirmation_with_options's own fallback text when a batch
// action (VS Code's carousel "Allow All") confirms it without a specific
// selectedButton — see the "Allow All" note above.
const BATCH_APPROVE_VALUE = 'yes';

interface ConfirmationWithOptionsInput {
	title: string;
	message: string;
	buttons: string[];
}

/** Outcome of a `requestConfirmation()` call. */
export type ConfirmationOutcome =
	| 'approved'
	/** User picked "Allow for the Session" — caller should remember this
	 *  specific action and stop asking for the rest of the conversation. */
	| 'approvedForSession'
	| 'denied';

/**
 * Request a blocking confirmation from the user, rendered as an inline
 * Allow / Allow for the Session / Cancel card in the chat stream.
 */
export async function requestConfirmation(
	title: string,
	message: string,
	toolInvocationToken: vscode.ChatRequest['toolInvocationToken'],
	token: vscode.CancellationToken,
): Promise<ConfirmationOutcome> {
	try {
		const result = await vscode.lm.invokeTool(
			CONFIRMATION_TOOL_ID,
			{
				input: {
					title,
					message,
					// Order matters for rendering, not just semantics — see the
					// module doc comment's "kind is fixed by VS Code core" note.
					buttons: [APPROVE_LABEL, DENY_LABEL, APPROVE_FOR_SESSION_LABEL],
				} satisfies ConfirmationWithOptionsInput,
				toolInvocationToken,
			},
			token,
		);
		const first = result.content.at(0);
		const selected = first instanceof vscode.LanguageModelTextPart ? first.value : undefined;
		if (selected === APPROVE_LABEL || selected === BATCH_APPROVE_VALUE) {
			return 'approved';
		}
		if (selected === APPROVE_FOR_SESSION_LABEL) {
			return 'approvedForSession';
		}
		return 'denied';
	} catch {
		return 'denied';
	}
}
