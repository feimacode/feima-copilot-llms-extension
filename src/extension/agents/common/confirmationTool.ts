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
 * two-way answer: since it's core's own tool (not one we register), its
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
 */

import * as vscode from 'vscode';

const CONFIRMATION_TOOL_ID = 'vscode_get_confirmation_with_options';
const APPROVE_LABEL = 'Continue';
const DENY_LABEL = 'Cancel';

interface ConfirmationWithOptionsInput {
	title: string;
	message: string;
	buttons: string[];
}

/**
 * Request a blocking yes/no confirmation from the user, rendered as an
 * inline Continue/Cancel card in the chat stream. Resolves `true` only if
 * the user picks "Continue"; `false` for "Cancel", a disposed session, or
 * any error invoking the tool.
 */
export async function requestConfirmation(
	title: string,
	message: string,
	toolInvocationToken: vscode.ChatRequest['toolInvocationToken'],
	token: vscode.CancellationToken,
): Promise<boolean> {
	try {
		const result = await vscode.lm.invokeTool(
			CONFIRMATION_TOOL_ID,
			{
				input: { title, message, buttons: [APPROVE_LABEL, DENY_LABEL] } satisfies ConfirmationWithOptionsInput,
				toolInvocationToken,
			},
			token,
		);
		const first = result.content.at(0);
		const selected = first instanceof vscode.LanguageModelTextPart ? first.value : undefined;
		return selected === APPROVE_LABEL;
	} catch {
		return false;
	}
}
