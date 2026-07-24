/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../platform/log/common/logService';
import { ProxyManager } from './common/proxy/proxyManager';
import { DynamicToolManager } from './common/tools/dynamicToolManager';
import { registerApprovalTool } from './common/approvalBridge';
import { CodexParticipant } from './codex/codexParticipant';
import { registerCodexModels } from './codex/codexModelProvider';
import { CopilotParticipant } from './copilot/copilotParticipant';
import { ClaudeParticipant } from './claude/claudeParticipant';
import { registerClaudeModels } from './claude/claudeModelProvider';
import { setProxyManager } from './agentDiagnostics';
import { installSdkStderrRedirect } from './common/sdkStdioRedirect';

/**
 * Registers all agent chat participants (@codex, @copilot-cli, @claude),
 * their language model providers, the LM proxy servers, dynamic tool
 * discovery, and the approval tool.
 *
 * Called once from `extension.ts` during activation. Non-fatal: if any
 * part fails, the error is logged but the extension continues to work.
 */
export function registerAgents(context: vscode.ExtensionContext, logService: ILogService): void {
	const log = logService.createSubLogger('Agents');
	log.info('=== AGENT PARTICIPANTS REGISTRATION ===');

	// ── SDK stderr redirect ───────────────────────────────────────────────
	// The agent SDKs write diagnostics straight to process.stderr, which
	// bypasses the Feima output panel. Forward those writes to the logger so
	// they are visible alongside our own agent logs.
	const disposeStderrRedirect = installSdkStderrRedirect(log);
	context.subscriptions.push({ dispose: disposeStderrRedirect });

	// ── LM Proxy (OpenAI Responses + Anthropic Messages) ──────────────────
	const proxyManager = new ProxyManager(log.createSubLogger('Proxy'));
	const proxyReady = proxyManager.start();
	proxyReady.then(info => {
		log.info(`Proxy ready — responses: ${info.responsesUrl}  messages: ${info.messagesUrl}`);
	}).catch(err => {
		log.error(err instanceof Error ? err : String(err), 'Failed to start LM proxy servers');
	});
	context.subscriptions.push({ dispose: () => proxyManager.dispose() });

	// Expose the proxy to the Account dialog so users can copy the endpoints
	// and nonces for configuring external CLIs (Claude Code, Codex, Copilot).
	setProxyManager(proxyManager);

	// ── Dynamic tool discovery (vscode.lm.tools → Codex dynamicTools) ─────
	const toolManager = new DynamicToolManager(log);
	context.subscriptions.push(
		vscode.commands.registerCommand('feima.agents.clearCodexToolCache', () => {
			toolManager.clearCache();
			vscode.window.showInformationMessage(vscode.l10n.t('Codex dynamic tool cache cleared'));
		})
	);

	// ── Approval tool (inline confirmation card for Codex) ────────────────
	registerApprovalTool(context, log);

	// ── Model providers (picker-only signals for native models) ───────────
	registerCodexModels(context, log);
	registerClaudeModels(context, context.globalStorageUri.fsPath, log);
	// Note: no Copilot model provider — the Copilot CLI SDK manages model
	// selection internally via the GitHub Copilot API.

	// ── @codex participant ────────────────────────────────────────────────
	const codexParticipant = new CodexParticipant(proxyManager, toolManager, log.createSubLogger('Codex'));
	const codexChat = vscode.chat.createChatParticipant(
		'codex.participant',
		codexParticipant.handleRequest.bind(codexParticipant)
	);
	codexChat.iconPath = new vscode.ThemeIcon('robot');
	context.subscriptions.push(codexChat);
	context.subscriptions.push({ dispose: () => codexParticipant.dispose() });
	log.info('✅ @codex participant registered');

	// ── @copilot-cli participant ──────────────────────────────────────────
	// @github/copilot-sdk auto-discovers the bundled @github/copilot runtime.
	// baseDirectory is set to the extension's own storage to isolate sessions
	// from VS Code's built-in Copilot CLI agent which uses ~/.copilot.
	// The runtime's model calls are always routed through proxyManager → VS Code LM.
	const copilotParticipant = new CopilotParticipant(
		context.globalStorageUri.fsPath,
		proxyManager,
		log.createSubLogger('Copilot'),
	);
	const copilotChat = vscode.chat.createChatParticipant(
		'copilot-cli.participant',
		copilotParticipant.handleRequest.bind(copilotParticipant)
	);
	copilotChat.iconPath = new vscode.ThemeIcon('github');
	context.subscriptions.push(copilotChat);
	context.subscriptions.push({ dispose: () => copilotParticipant.dispose() });
	log.info('✅ @copilot-cli participant registered');

	// ── @claude participant ───────────────────────────────────────────────
	const claudeParticipant = new ClaudeParticipant(
		proxyManager,
		context.globalStorageUri.fsPath,
		log.createSubLogger('Claude'),
	);
	const claudeChat = vscode.chat.createChatParticipant(
		'claude.participant',
		claudeParticipant.handleRequest.bind(claudeParticipant)
	);
	claudeChat.iconPath = new vscode.ThemeIcon('sparkle');
	context.subscriptions.push(claudeChat);
	context.subscriptions.push({ dispose: () => claudeParticipant.dispose() });
	log.info('✅ @claude participant registered');

	log.info('===========================================');
}
