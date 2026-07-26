/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Shared blocking confirmation card for the claude/codex/copilot participants.
 *
 * All three participants previously asked for approval via
 * `vscode.lm.invokeTool('vscode_get_confirmation', ...)` — an undocumented
 * internal tool name (no entry in this repo's vendored VS Code API surface)
 * with no contract guaranteeing it blocks on real user input when invoked
 * from code that isn't itself an in-flight model tool call — which describes
 * every call site here: canUseTool hooks and async approval-request events
 * all run after the triggering LM turn has already completed. Measured:
 * it resolves allow/deny in ~130-175ms regardless of risk, i.e. it never
 * actually prompted.
 *
 * `vscode.lm.registerTool` + `prepareInvocation` returning
 * `confirmationMessages` is the documented, stable mechanism for a genuinely
 * blocking interactive Continue/Cancel card in the chat stream — per the
 * stable API docs on `toolInvocationToken`: "if the tool requires user
 * confirmation, it will show up inline in the chat view." This resurrects
 * the pattern the deleted common/approvalBridge.ts used for codex
 * specifically, generalized here for all three participants.
 */

import * as vscode from 'vscode';
import { ILogService } from '../../platform/log/common/logService';

const CONFIRMATION_TOOL_ID = 'feima.agents.requestConfirmation';

interface ConfirmationInput {
	title: string;
	message: string;
}

/** Register the shared confirmation tool. Call once, at extension activation. */
export function registerConfirmationTool(context: vscode.ExtensionContext, log: ILogService): void {
	const tool = vscode.lm.registerTool<ConfirmationInput>(CONFIRMATION_TOOL_ID, {
		prepareInvocation(options: vscode.LanguageModelToolInvocationPrepareOptions<ConfirmationInput>): vscode.PreparedToolInvocation {
			const { title, message } = options.input;
			return {
				invocationMessage: title,
				confirmationMessages: {
					title,
					message: new vscode.MarkdownString(message),
				},
			};
		},
		invoke(): vscode.LanguageModelToolResult {
			// Reaching here means the user clicked "Continue" on the card built
			// from prepareInvocation above. A rejected invokeTool() promise
			// (Cancel) is how requestConfirmation below learns "denied".
			return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart('approved')]);
		},
	});
	context.subscriptions.push(tool);
	log.debug('confirmation tool registered');
}

/**
 * Request a blocking yes/no confirmation from the user, rendered as an
 * inline Continue/Cancel card in the chat stream. Resolves `true` only if
 * the user clicks Continue; `false` for Cancel, a disposed session, or any
 * error invoking the tool.
 */
export async function requestConfirmation(
	title: string,
	message: string,
	toolInvocationToken: vscode.ChatRequest['toolInvocationToken'],
	token: vscode.CancellationToken,
): Promise<boolean> {
	try {
		await vscode.lm.invokeTool(
			CONFIRMATION_TOOL_ID,
			{ input: { title, message } satisfies ConfirmationInput, toolInvocationToken },
			token,
		);
		return true;
	} catch {
		return false;
	}
}
