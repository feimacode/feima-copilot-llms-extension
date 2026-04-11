/*---------------------------------------------------------------------------------------------
 *  Feima Language Model Wrapper
 *  Handles VS Code language model API integration and streaming.
 *  Pattern adapted from feima-code/src/extension/conversation/vscode-node/languageModelAccess.ts
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../platform/log/common/logService';
import { FeimaChatEndpoint, FinishedCallback, StreamDelta } from './feimaChatEndpoint';
import { getConfigService } from '../../config/configService';
import { FEIMA_INSUFFICIENT_BALANCE_KEY } from '../contextKeys';

/**
 * Wrapper class that handles VS Code language model API integration.
 * Delegates endpoint concerns to FeimaChatEndpoint.
 * 
 * Pattern adapted from feima-code CopilotLanguageModelWrapper.
 */
export class FeimaLanguageModelWrapper {
	constructor(
		private readonly log: ILogService
	) {}

	/**
	 * Provide language model response with proper tool call handling.
	 * Pattern from feima-code: call endpoint.makeChatRequest with callback.
	 */
	async provideLanguageModelResponse(
		endpoint: FeimaChatEndpoint,
		messages: vscode.LanguageModelChatMessage[],
		options: {
			tools?: readonly vscode.LanguageModelChatTool[];
			toolMode?: vscode.LanguageModelChatToolMode;
		},
		progress: vscode.Progress<vscode.LanguageModelTextPart | vscode.LanguageModelToolCallPart | vscode.LanguageModelThinkingPart>,
		token: vscode.CancellationToken
	): Promise<void> {
		this.log.info(`[Wrapper] provideLanguageModelResponse called for model: ${endpoint.model}`);
		this.log.debug(`[Wrapper] Options - tools: ${options.tools?.length ?? 0}, toolMode: ${options.toolMode}`);

		// Track reported tool call IDs to detect duplicates
		const reportedToolCallIds = new Set<string>();
		let callbackInvokeCount = 0;

		// Create callback that converts deltas to VS Code progress reports
		const finishCallback: FinishedCallback = async (_fullText: string, delta: StreamDelta): Promise<undefined> => {
			callbackInvokeCount++;
			
			// Report text content
			if (delta.text) {
				progress.report(new vscode.LanguageModelTextPart(delta.text));
			}

			// Report reasoning/thinking content (proposed languageModelThinkingPart API)
			if (delta.reasoningContent) {
				this.log.debug(`[Wrapper] Emitting reasoning: ${delta.reasoningContent.length} chars`);
				try {
					const thinkingId = `thinking-${Date.now()}`;
					progress.report(new vscode.LanguageModelThinkingPart(
						delta.reasoningContent,
						thinkingId,
						{}
					));
				} catch (e) {
					this.log.warn(`[Wrapper] Failed to report thinking part: ${e instanceof Error ? e.message : String(e)}`);
				}
			}

			// Report tool calls
			if (delta.toolCalls) {
				this.log.debug(`[Wrapper] Emitting ${delta.toolCalls.length} tool calls`);
				for (const call of delta.toolCalls) {
					try {
						// Validate tool call structure
						if (!call.id || !call.name) {
							this.log.error(`[Wrapper] Invalid tool call structure - missing id or name. Call: ${JSON.stringify(call)}`);
							continue;
						}

						// Check for duplicate tool call ID
						if (reportedToolCallIds.has(call.id)) {
							this.log.debug(`[Wrapper] ⚠️  DUPLICATE TOOL CALL DETECTED! Already reported ${call.name} (${call.id})`);
							continue; // Skip duplicates
						}

						const argsStr = call.arguments || '{}';
						this.log.debug(`[Wrapper] Tool call ${call.name} (${call.id})`);

						// P1 #25: Fail-hard on invalid JSON (pattern from feima-code)
						// Validate JSON format first
						const trimmedArgs = argsStr.trim();
						if (!trimmedArgs.startsWith('{') && !trimmedArgs.startsWith('[')) {
							this.log.error(`[Wrapper] Tool call ${call.name} has invalid JSON format (doesn't start with { or [): ${argsStr.substring(0, 100)}`);
							throw new Error(`Tool call arguments must be valid JSON object or array, got: ${argsStr.substring(0, 50)}`);
						}

						// Parse accumulated arguments
						const parameters = JSON.parse(argsStr);
						
						// Validate parsed result is an object
						if (typeof parameters !== 'object' || parameters === null) {
							this.log.error(`[Wrapper] Tool call ${call.name} parsed to non-object: ${typeof parameters}`);
							throw new Error(`Tool call arguments must parse to object, got: ${typeof parameters}`);
						}

						progress.report(new vscode.LanguageModelToolCallPart(call.id, call.name, parameters));
						reportedToolCallIds.add(call.id); // Track as reported
						this.log.debug(`[Wrapper] Successfully emitted tool call: ${call.name} (id: ${call.id})`);
					} catch (err) {
						// P1 #25: Fail-hard on invalid JSON
						// Log error and re-throw (pattern from feima-code)
						const errorDetail = err instanceof Error ? err.message : String(err);
						const argsPreview = call.arguments ? call.arguments.substring(0, 200) : '<empty>';
						this.log.error(
							`[Wrapper] Failed to parse tool call JSON for ${call.name} (${call.id}). ` +
							`Error: ${errorDetail}. Arguments preview: ${argsPreview}` +
							(call.arguments && call.arguments.length > 200 ? `... (${call.arguments.length} total chars)` : '')
						);
						// Throw instead of silently recovering - let caller handle error
						throw err;
					}
				}
			}

			return undefined;
		};

		// Delegate to endpoint (pattern from feima-code)
		this.log.debug(`[Wrapper] Calling endpoint.makeChatRequest`);
		const result = await endpoint.makeChatRequest(
			messages,
			finishCallback,
			token,
			options.tools,
			options.toolMode
		);

		this.log.debug(`[Wrapper] makeChatRequest returned: type=${result.type}${'reason' in result ? `, reason=${result.reason}` : ''}, total callbacks=${callbackInvokeCount}`);

		// Handle error result
		// P1 #23: Handle structured error types (blocked, quotaExceeded, rateLimited, insufficientBalance)
		if (result.type !== 'success') {
			if (result.type === 'cancelled') {
				// 499 from proxy or token already cancelled — not a user-facing error.
				this.log.debug('[Wrapper] Chat request cancelled (HTTP 499 or client disconnect)');
				return;
			} else if (result.type === 'blocked') {
				this.log.error(`[Wrapper] Chat request blocked: ${result.reason}`);
				throw new Error(result.reason);
			} else if (result.type === 'quotaExceeded') {
				this.log.error(`[Wrapper] Chat request quota exceeded: ${result.reason}`);
				throw new Error(result.reason);
			} else if (result.type === 'rateLimited') {
				this.log.error(`[Wrapper] Chat request rate limited: ${result.reason}`);
				throw new Error(result.reason);
			} else if (result.type === 'insufficientBalance') {
				this.log.error(`[Wrapper] Chat request failed - insufficient balance`);
				await this._handleInsufficientBalance(progress);
				return; // message rendered in chat, do not throw
			} else if (result.type === 'unauthorized') {
				// Token is invalid on the server. Throw with a sentinel message so the
				// provider can intercept this, force-refresh, and prompt re-auth if needed.
				this.log.warn(`[Wrapper] Chat request unauthorized (HTTP 401) — token invalid/expired`);
				throw new Error(`Unauthorized: ${result.reason}`);
			} else {
				this.log.error(`[Wrapper] Chat request failed: ${result.reason}`);
				throw new Error(result.reason);
			}
		}

		this.log.debug('[Wrapper] Chat request completed successfully');
	}

	/**
	 * Handle an insufficient-balance (HTTP 402) response.
	 *
	 * - Sets the `feima.insufficientBalance` context key so the status bar can show
	 *   a low-credit icon.
	 * - Writes a markdown error message with an inline promotion link directly into
	 *   the chat response, so the user sees it in context instead of a generic error panel.
	 */
	private async _handleInsufficientBalance(
		progress: vscode.Progress<vscode.LanguageModelTextPart | vscode.LanguageModelToolCallPart | vscode.LanguageModelThinkingPart>
	): Promise<void> {
		// Set context key so status-bar contributions can react
		await vscode.commands.executeCommand('setContext', FEIMA_INSUFFICIENT_BALANCE_KEY, true);

		const promotionUrl = getConfigService().getConfig().promotionUrl;
		const title = vscode.l10n.t('You ran out of Feima credits');
		const body = vscode.l10n.t('Get more credits for free during the public preview: [Get Credits]({0})', promotionUrl);
		const markdown = `❌ **${title}**\n\n${body}`;

		progress.report(new vscode.LanguageModelTextPart(markdown));
	}

	/**
	 * Provide token count for message.
	 * Delegates to endpoint.
	 */
	async provideTokenCount(
		endpoint: FeimaChatEndpoint,
		text: string | vscode.LanguageModelChatMessage
	): Promise<number> {
		return endpoint.provideTokenCount(text);
	}
}
