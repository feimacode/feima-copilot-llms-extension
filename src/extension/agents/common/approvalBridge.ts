/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../platform/log/common/logService';

// ─── Input shape passed to the tool ──────────────────────────────────────────

/**
 * We inject `__method` (the original JSON-RPC method name) alongside the raw
 * approval params so `prepareInvocation` can tailor the confirmation message.
 */
interface ApprovalInput {
	__method?: string;
	command?: string;
	cwd?: string;
	reason?: string;
	grantRoot?: string;
	[key: string]: unknown;
}

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Register a dummy "codex.approval" tool.
 *
 * When `lm.invokeTool('codex.approval', ...)` is called from the participant
 * handler, VS Code:
 *   1. Calls `prepareInvocation` to get the confirmation card text.
 *   2. Shows an inline "Continue / Cancel" card in the chat UI.
 *   3. If the user clicks Continue → calls `invoke` → Promise resolves.
 *   4. If the user clicks Cancel   → Promise rejects with a cancellation error.
 *
 * The participant catches the rejection and sends `decision: 'denied'` to the
 * CodexAppServer.
 */
export function registerApprovalTool(context: vscode.ExtensionContext, log: ILogService): void {
	log.info('registering tool codex.approval...');
	const tool = vscode.lm.registerTool<ApprovalInput>('codex.approval', {
		prepareInvocation(
			options: vscode.LanguageModelToolInvocationPrepareOptions<ApprovalInput>,
			_token: vscode.CancellationToken
		): vscode.PreparedToolInvocation {
			const input = options.input;
			const method = input.__method ?? '';

			let title: string;
			const lines: string[] = [];

			if (method === 'item/commandExecution/requestApproval') {
				title = vscode.l10n.t('Allow Command Execution?');
				if (input.command) { lines.push(`**${vscode.l10n.t('Command')}**: \`${input.command}\``); }
				if (input.cwd) { lines.push(`**${vscode.l10n.t('Directory')}**: \`${input.cwd}\``); }
			} else if (method === 'item/fileChange/requestApproval') {
				title = vscode.l10n.t('Allow File Changes?');
				if (input.grantRoot) { lines.push(`**${vscode.l10n.t('Root')}**: \`${input.grantRoot}\``); }
			} else {
				title = vscode.l10n.t('Codex Approval Request');
			}

			if (input.reason) {
				lines.push(`**${vscode.l10n.t('Reason')}**: ${input.reason}`);
			}

			return {
				invocationMessage: title,
				confirmationMessages: {
					title,
					message: new vscode.MarkdownString(
						lines.length > 0 ? lines.join('\n\n') : vscode.l10n.t('Codex wants to perform an action.')
					),
				},
			};
		},

		invoke(
			_options: vscode.LanguageModelToolInvocationOptions<ApprovalInput>,
			_token: vscode.CancellationToken
		): vscode.LanguageModelToolResult {
			// Reaching here means the user clicked "Continue".
			// The participant handler treats a resolved Promise as "approved".
			return new vscode.LanguageModelToolResult([
				new vscode.LanguageModelTextPart('approved'),
			]);
		},
	});

	context.subscriptions.push(tool);
	log.info('tool codex.approval registered');
}
