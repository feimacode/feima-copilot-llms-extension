/*---------------------------------------------------------------------------------------------
 *  Feima Chat Endpoint
 *  Handles endpoint configuration, auth, and request body creation.
 *  Pattern adapted from feima-code/src/platform/endpoint/node/feimaChatEndpoint.ts
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../platform/log/common/logService';
import { FeimaAuthenticationService } from '../platform/authentication/vscode/feimaAuthenticationService';
import { countTokens } from '../platform/tokenizer/tikTokenizer';
import { getResolvedConfig } from '../../config/configService';
import { parseQuotaHeader } from '../statusBar';
import { getQuotaService } from '../services/quotaService';

/**
 * Callback invoked as stream progresses with deltas.
 * Pattern from feima-code FinishedCallback.
 */
export type FinishedCallback = (fullText: string, delta: StreamDelta) => Promise<number | undefined>;

/**
 * Delta from streaming response.
 * Pattern from feima-code IResponseDelta.
 */
export interface StreamDelta {
	text?: string;
	toolCalls?: Array<{
		id: string;
		name: string;
		arguments: string;
	}>;
	// Thinking/reasoning content from models that support thinking
	reasoningContent?: string;
	// P2 #27: Stateful marker content
	stateful_marker?: string;
}

/**
 * Chat response result with error type differentiation.
 * Follows feima-code pattern: success/blocked/quotaExceeded/rateLimited/error.
 */
export type ChatResponse =
	| { type: 'success'; requestId?: string }
	| { type: 'cancelled'; requestId?: string }
	| { type: 'error'; reason: string; requestId?: string }
	| { type: 'blocked'; reason: string; requestId?: string }
	| { type: 'quotaExceeded'; reason: string; requestId?: string }
	| { type: 'rateLimited'; reason: string; requestId?: string }
	| { type: 'insufficientBalance'; reason: string; requestId?: string };

/**
 * Model information from catalog
 */
/**
 * Chat completion request body for OpenAI-compatible API
 */
export interface ChatCompletionRequest {
	model: string;
	messages: Array<{
		role: 'user' | 'assistant' | 'system' | 'tool';
		content?: string | null;
		tool_call_id?: string;
		tool_calls?: Array<{
			id: string;
			type: 'function';
			function: { name: string; arguments: string };
		}>;
	}>;
	stream: boolean;
	temperature?: number;
	max_tokens?: number;
	enable_thinking?: boolean;
	tools?: Array<{
		type: 'function';
		function: {
			name: string;
			description?: string;
			parameters?: object;
		};
	}>;
	tool_choice?: string | { type: 'function'; function: { name: string } };
}

/**
 * Minimal interface for LanguageModelToolResultPart
 */
interface ToolResultPart {
	callId: string;
	content: string | vscode.LanguageModelTextPart[];
}

/**
 * Minimal interface for LanguageModelToolCallPart
 * (actual type from VS Code API)
 */
interface ToolCallPart {
	callId: string;
	name: string;
	input: object;
}

export interface ModelInfo {
	id: string;
	name: string;
	family: string;
	maxInputTokens: number;
	maxOutputTokens: number;
	supportsToolCalls: boolean;
	supportsVision: boolean;
	supportsThinking: boolean;
}

/**
 * Feima Chat Endpoint
 * 
 * Handles:
 * - Model metadata and capabilities
 * - Authentication token management
 * - Request body creation
 * - Request headers
 */
export class FeimaChatEndpoint {
	private _cachedToken: string | null = null;

	constructor(
		private readonly modelInfo: ModelInfo,
		private readonly authService: FeimaAuthenticationService,
		private readonly log: ILogService
	) {
		// Pre-fetch token on construction
		this._prefetchToken();
	}

	/**
	 * Get model ID
	 */
	get model(): string {
		return this.modelInfo.id;
	}

	/**
	 * Get model name
	 */
	get name(): string {
		return this.modelInfo.name;
	}

	/**
	 * Get model family
	 */
	get family(): string {
		return this.modelInfo.family;
	}

	/**
	 * Get max input tokens
	 */
	get maxInputTokens(): number {
		return this.modelInfo.maxInputTokens;
	}

	/**
	 * Get max output tokens
	 */
	get maxOutputTokens(): number {
		return this.modelInfo.maxOutputTokens;
	}

	/**
	 * Check if model supports tool calls
	 */
	get supportsToolCalls(): boolean {
		return this.modelInfo.supportsToolCalls;
	}

	/**
	 * Check if model supports vision
	 */
	get supportsVision(): boolean {
		return this.modelInfo.supportsVision;
	}

	/**
	 * Check if model supports thinking/reasoning
	 */
	get supportsThinking(): boolean {
		return this.modelInfo.supportsThinking;
	}

	/**
	 * Get API endpoint URL
	 */
	get apiUrl(): string {
		const apiBase = getResolvedConfig().apiBaseUrl || '';
		return `${apiBase}/chat/completions`;
	}

	/**
	 * Pre-fetch and cache token to avoid latency on first request
	 */
	private async _prefetchToken(): Promise<void> {
		try {
			const sessions = await this.authService.getSessions(undefined, {});
			const session = sessions[0];
			if (session) {
				this._cachedToken = session.accessToken;
			}
		} catch (error) {
			this.log.error(error as Error, '[FeimaChatEndpoint] Failed to prefetch token');
		}
	}

	/**
	 * Get fresh auth token (refreshes if needed)
	 */
	async getAuthToken(): Promise<string> {
		try {
			const sessions = await this.authService.getSessions(undefined, {});
			const session = sessions[0];
			if (!session) {
				// Provide actionable error message
				throw new Error(vscode.l10n.t('error.auth.unauthorized'));
			}
			this._cachedToken = session.accessToken;
			return session.accessToken;
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			this.log.error(error as Error, `[FeimaChatEndpoint] Failed to get auth token: ${errorMsg}`);
			throw error;
		}
	}

	/**
	 * Get request headers including auth
	 */
	async getHeaders(): Promise<Record<string, string>> {
		const token = await this.getAuthToken();
		return {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`
		};
	}

	/**
	 * Create request body for chat completion
	 */
	createRequestBody(
		messages: vscode.LanguageModelChatMessage[],
		options: {
			tools?: readonly vscode.LanguageModelChatTool[];
			toolMode?: vscode.LanguageModelChatToolMode;
		}
	): ChatCompletionRequest {
		// Convert VS Code messages to API format
		// Need to handle tool calls and tool results properly
		const requestMessages: ChatCompletionRequest['messages'] = [];

		for (const msg of messages) {
			// Check if this is a User message with tool results
			const hasToolResults = Array.isArray(msg.content) && 
				msg.content.some(part => 
					typeof part === 'object' && 'callId' in part && 'content' in part
				);

			if (hasToolResults && msg.role === vscode.LanguageModelChatMessageRole.User) {
				// Convert tool results to role="tool" messages
				const toolResultParts = (Array.isArray(msg.content) ? msg.content : [msg.content])
					.filter(part => typeof part === 'object' && 'callId' in part && 'content' in part);

				this.log.debug(`[FeimaChatEndpoint] Converting ${toolResultParts.length} tool results to role="tool" messages`);

				for (const part of toolResultParts) {
					const toolResultPart = part as ToolResultPart;
					const resultContent = Array.isArray(toolResultPart.content)
						? toolResultPart.content.map((c: vscode.LanguageModelTextPart | string) => 
							c instanceof vscode.LanguageModelTextPart ? c.value : String(c)
						).join('')
						: String(toolResultPart.content || '');
					
					this.log.debug(`[FeimaChatEndpoint] Tool result for callId=${toolResultPart.callId}, content length: ${resultContent.length}`);
					
					requestMessages.push({
						role: 'tool',
						tool_call_id: toolResultPart.callId,
						content: resultContent
					});
				}
			} else if (msg.role === vscode.LanguageModelChatMessageRole.Assistant) {
				// Check if assistant message has tool calls
				const toolCallParts = (Array.isArray(msg.content) ? msg.content : [msg.content])
					.filter(part => typeof part === 'object' && 'callId' in part && 'name' in part && 'input' in part);

				// Extract text content
				const textContent = (Array.isArray(msg.content) ? msg.content : [msg.content])
					.map(part => {
						if (part instanceof vscode.LanguageModelTextPart) {
							return part.value;
						}
						return '';
					})
					.join('');

				const assistantMsg: ChatCompletionRequest['messages'][0] = {
					role: 'assistant',
					content: textContent || null
				};

				// Add tool calls if present
				if (toolCallParts.length > 0) {
					this.log.debug(`[FeimaChatEndpoint] Assistant message with ${toolCallParts.length} tool calls`);
					assistantMsg.tool_calls = toolCallParts.map((part: unknown) => {
						const toolCallPart = part as ToolCallPart;
						this.log.debug(`[FeimaChatEndpoint] Tool call: ${toolCallPart.name} (callId: ${toolCallPart.callId})`);
						return {
							id: toolCallPart.callId,
							type: 'function' as const,
							function: {
								name: toolCallPart.name,
								arguments: JSON.stringify(toolCallPart.input || {})
							}
						};
					});
				}

				requestMessages.push(assistantMsg);
			} else {
				// Regular user/system message
				const content = typeof msg.content === 'string' ? msg.content :
					msg.content.map(part => {
						if (part instanceof vscode.LanguageModelTextPart) {
							return part.value;
						}
						return '';
					}).join('');

				requestMessages.push({
					role: msg.role === vscode.LanguageModelChatMessageRole.User ? 'user' as const :
						msg.role === vscode.LanguageModelChatMessageRole.Assistant ? 'assistant' as const :
						'system' as const,
					content
				});
			}
		}

		// Log all system messages before merging
		const systemMsgsBefore = requestMessages.filter(m => m.role === 'system');
		this.log.debug(`[FeimaChatEndpoint] createRequestBody: total=${requestMessages.length} messages, system=${systemMsgsBefore.length}`);
		systemMsgsBefore.forEach((m, idx) => {
			const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
			this.log.debug(`[FeimaChatEndpoint] system[${idx}] (${content.length} chars): ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`);
		});

		// Collapse consecutive system messages — some providers (e.g. MiniMax) only accept
		// a single system message per request. Pattern from copilot-chat promptRenderer.ts.
		for (let i = 1; i < requestMessages.length; i++) {
			const current = requestMessages[i];
			const prev = requestMessages[i - 1];
			if (current.role === 'system' && prev.role === 'system') {
				const prevContent = typeof prev.content === 'string' ? prev.content : '';
				const currContent = typeof current.content === 'string' ? current.content : '';
				prev.content = prevContent.trimEnd() + '\n' + currContent;
				requestMessages.splice(i, 1);
				i--;
			}
		}

		const systemMsgsAfter = requestMessages.filter(m => m.role === 'system');
		if (systemMsgsBefore.length !== systemMsgsAfter.length) {
			this.log.debug(`[FeimaChatEndpoint] Merged ${systemMsgsBefore.length} system messages → ${systemMsgsAfter.length}`);
		}

		const requestBody: ChatCompletionRequest = {
			model: this.model,
			messages: requestMessages,
			stream: true,
			temperature: 0.7,
			max_tokens: this.maxOutputTokens
		};
		// Add thinking configuration if model supports it
		if (this.supportsThinking) {
			requestBody.enable_thinking = true;
			this.log.debug(`[FeimaChatEndpoint] Enabled thinking for model: ${this.model}`);
		}
		// Add tools if provided and supported
		if (options.tools && options.tools.length > 0 && this.supportsToolCalls) {
			this.log.debug(`[FeimaChatEndpoint] Sending ${options.tools.length} tools: ${options.tools.map(t => t.name).join(', ')}`);
			requestBody.tools = options.tools.map(tool => {
				// Always provide a valid parameters object — MiniMax rejects undefined/missing parameters
				// with error 2013 "function name or parameters is empty"
				let parameters: object;
				if (tool.inputSchema && typeof tool.inputSchema === 'object' && Object.keys(tool.inputSchema).length > 0) {
					parameters = tool.inputSchema;
				} else {
					// Default empty schema — required by MiniMax and other strict providers
					parameters = { type: 'object', properties: {} };
				}

				this.log.debug(`[FeimaChatEndpoint] Tool: name="${tool.name}", hasSchema=${Object.keys(tool.inputSchema ?? {}).length > 0}`);

				return {
					type: 'function',
					function: {
						name: tool.name,
						description: tool.description,
						parameters
					}
				};
			});

			// Set tool_choice based on toolMode
			// Only set when Required mode AND exactly 1 tool (match feima-code behavior)
			if (options.toolMode === vscode.LanguageModelChatToolMode.Required && options.tools.length === 1) {
				requestBody.tool_choice = {
					type: 'function',
					function: { name: options.tools[0].name }
				};
			}
			// Otherwise defaults to "auto" (let model decide)
		}

		return requestBody;
	}

	/**
	 * Validate request before sending
	 */
	validateRequest(
		messages: vscode.LanguageModelChatMessage[],
		options: {
			tools?: readonly vscode.LanguageModelChatTool[];
			toolMode?: vscode.LanguageModelChatToolMode;
		}
	): void {
		// Must have at least one message
		if (!messages || messages.length === 0) {
			throw new Error('Invalid request: no messages.');
		}

		// Validate tool configuration
		if (options.tools) {
			this._validateTools(options.tools, options.toolMode);
		}

		// P2 #29: Validate tool call/result pairing in message history
		// Every tool call must have exactly one matching result
		// Issue #1 & #2: Use strict instanceof validation like feima-code
		messages.forEach((message, i) => {
			if (message.role === vscode.LanguageModelChatMessageRole.Assistant) {
				const content = Array.isArray(message.content) ? message.content : [message.content];
				
				// Issue #1: Explicitly filter out DataPart before tool validation
				// Filter out any data parts (they don't have toolCallPart semantics)
				const filteredContent = content.filter(part => 
					!(part instanceof vscode.LanguageModelDataPart)
				);

				// Get tool call IDs using strict instanceof checks
				const toolCallIds = new Set<string>(filteredContent
					.filter(part => part instanceof vscode.LanguageModelToolCallPart)
					.map(part => (part as ToolCallPart).callId) // Tool calls present in message
				);

				if (toolCallIds.size > 0) {
					let nextIdx = i + 1;
					const errMsg = 'Invalid request: Tool call must be followed by User message with LanguageModelToolResultPart with matching callId.';
					
					// Issue #2: Strict validation - ALL parts in User message must be result parts
					while (toolCallIds.size > 0) {
						const nextMessage = messages.at(nextIdx++);
						if (!nextMessage || nextMessage.role !== vscode.LanguageModelChatMessageRole.User) {
							throw new Error(errMsg);
						}

						// Issue #2: Validate that ALL parts in User message are result or data parts
						const nextContent = Array.isArray(nextMessage.content) ? nextMessage.content : [nextMessage.content];
						let foundAnyResult = false;
						
						for (const part of nextContent) {
							// Only allow ToolResultPart or DataPart in message after tool call
							const isToolResult = (part instanceof vscode.LanguageModelToolResultPart) || 
								(part.constructor.name === 'LanguageModelToolResultPart2');
							const isDataPart = part instanceof vscode.LanguageModelDataPart;
							
							if (!isToolResult && !isDataPart) {
								this.log.error(`[FeimaChatEndpoint] Invalid part in User message after tool call: ${part.constructor.name}`);
								throw new Error(errMsg);
							}
							
							if (isToolResult) {
								foundAnyResult = true;
								toolCallIds.delete((part as ToolResultPart).callId);
							}
						}
						
						if (!foundAnyResult) {
							throw new Error(errMsg);
						}
					}

					if (toolCallIds.size > 0) {
						const unmatched = Array.from(toolCallIds).join(', ');
						throw new Error(`Tool calls not matched with results: ${unmatched}`);
					}
				}
			}
		});
	}

	/**
	 * Validate tools configuration
	 * Issue #1: Separated validation for clarity
	 */
	private _validateTools(
		tools: readonly vscode.LanguageModelChatTool[],
		toolMode?: vscode.LanguageModelChatToolMode
	): void {
		// Check tool names
		for (const tool of tools) {
			if (!tool.name.match(/^[\w-]+$/)) {
				throw new Error(`Invalid tool name "${tool.name}": only alphanumeric characters, hyphens, and underscores are allowed.`);
			}
		}

		// Check tool count
		if (tools.length > 128) {
			throw new Error('Cannot have more than 128 tools per request.');
		}

		// Validate toolMode
		if (toolMode === vscode.LanguageModelChatToolMode.Required && tools.length > 1) {
			throw new Error(vscode.l10n.t('error.toolModeNotSupported'));
		}

		// Warn if tools provided but not supported
		if (!this.supportsToolCalls) {
			this.log.warn(`[FeimaChatEndpoint] Tools provided but model ${this.model} does not support tool calls`);
		}

		this.log.debug(`[FeimaChatEndpoint] Validated ${tools.length} tools`);
	}

	/**
	 * Provide token count for message
	 */
	async provideTokenCount(text: string | vscode.LanguageModelChatMessage): Promise<number> {
		const textContent = typeof text === 'string' 
			? text 
			: (typeof text.content === 'string' 
				? text.content 
				: text.content.map(part => {
					if (part instanceof vscode.LanguageModelTextPart) {
						return part.value;
					}
					return '';
				}).join(''));

		const tokenCount = countTokens(this.model, textContent);
		return tokenCount;
	}

	/**
	 * Make chat completion request with streaming.
	 * Pattern from feima-code CopilotChatEndpoint.makeChatRequest.
	 * 
	 * @param messages Chat messages
	 * @param callback Callback for streaming deltas
	 * @param token Cancellation token
	 * @param tools Optional tools to provide
	 * @param toolMode Optional tool mode
	 * @returns Chat response result with error type differentiation
	 */
	async makeChatRequest(
		messages: vscode.LanguageModelChatMessage[],
		callback: FinishedCallback,
		token: vscode.CancellationToken,
		tools?: readonly vscode.LanguageModelChatTool[],
		toolMode?: vscode.LanguageModelChatToolMode
	): Promise<ChatResponse> {
		this.log.debug(`[FeimaChatEndpoint] makeChatRequest called: model=${this.model}, messages=${messages.length}`);
		
		// Validate request
		this.validateRequest(messages, { tools, toolMode });

		// Get auth token
		const authToken = await this.getAuthToken();
		if (!authToken) {
			this.log.error(`[FeimaChatEndpoint] No auth token available`);
			return { type: 'error', reason: 'Authentication failed: no token available' };
		}

		// Create request body
		const requestBody = this.createRequestBody(messages, { tools, toolMode });
		this.log.debug(`[FeimaChatEndpoint] Request body created: model=${requestBody.model}, stream=${requestBody.stream}, headers will be added`);

		try {
			// Get headers (need to await since it's async)
			const baseHeaders = await this.getHeaders();
			
			// Use configurable timeout (feima.api.requestTimeout setting, default 5 min)
			const timeoutMs = getResolvedConfig().requestTimeout * 1000;
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
			
			this.log.debug(`[FeimaChatEndpoint] Sending POST to ${this.apiUrl} (timeout=${timeoutMs / 1000}s)`);
			
			let response: Response;
			try {
				response = await fetch(this.apiUrl, {
					method: 'POST',
					headers: {
						...baseHeaders,
						'Authorization': `Bearer ${authToken}`,
					},
					body: JSON.stringify(requestBody),
					signal: controller.signal
				});
			} finally {
				clearTimeout(timeoutId);
			}

			this.log.debug(`[FeimaChatEndpoint] Response received: status=${response.status}, hasBody=${!!response.body}, contentLength=${response.headers.get('content-length')}`);

			if (!response.ok) {
				const errorText = await response.text();
				this.log.error(`[FeimaChatEndpoint] Request failed: HTTP ${response.status}: ${errorText}`);
				
				// P2 #17: Validate error response JSON if present
				if (errorText && errorText.startsWith('{')) {
					try {
						const errorJson = JSON.parse(errorText);
						if (errorJson.code || errorJson.message) {
							this.log.debug(`[FeimaChatEndpoint] Error details: ${errorJson.code || errorJson.message}`);
						}
					} catch (_) {
						// Not valid JSON, continue
					}
				}
				
				// P2 #23: Error type differentiation
				if (response.status === 403) {
					// P2 #24 & Issue #6: Track/log blocked request for analytics
					const retryAfter = response.headers.get('Retry-After');
					this.log.warn(
						`[FeimaChatEndpoint] Extension BLOCKED (HTTP 403) for model ${this.modelInfo.id}. ` +
						`Retry-After: ${retryAfter || 'not specified'}, ` +
						`Timestamp: ${new Date().toISOString()}`
					);
					return { type: 'blocked', reason: vscode.l10n.t('error.extensionBlocked', 'The extension has been temporarily blocked due to too many requests') };
				} else if (response.status === 402) {
					this.log.warn(
						`[FeimaChatEndpoint] Insufficient balance (HTTP 402) for model ${this.modelInfo.id}`
					);
					return { type: 'insufficientBalance', reason: 'Insufficient balance' };
				} else if (response.status === 429) {
					// Try to detect quota vs rate limit from headers or body
					const isQuota = errorText.includes('quota') || response.headers.get('x-error-type') === 'quota_exceeded';
					const retryAfter = response.headers.get('Retry-After');
					// Issue #6: Log rate limit events with context
					if (isQuota) {
						this.log.info(`[FeimaChatEndpoint] Quota exceeded for model ${this.modelInfo.id}, retry after: ${retryAfter || 'unspecified'}`);
						return { type: 'quotaExceeded', reason: vscode.l10n.t('error.quotaExceeded', 'Request quota exceeded') };
					} else {
						this.log.info(`[FeimaChatEndpoint] Rate limited for model ${this.modelInfo.id}, retry after: ${retryAfter || 'unspecified'}`);
						return { type: 'rateLimited', reason: vscode.l10n.t('error.rateLimited', 'Too many requests, please retry later') };
					}
				} else if (response.status === 499) {
					// 499 = proxy-level "client closed request" — benign when the
					// cancellation token is already set (user cancelled), otherwise
					// a transient upstream disconnect; treat as cancelled either way.
					this.log.debug(`[FeimaChatEndpoint] Request cancelled (HTTP 499) for model ${this.modelInfo.id}, token cancelled: ${token.isCancellationRequested}`);
					return { type: 'cancelled' };
				} else {
					return { type: 'error', reason: vscode.l10n.t('error.httpRequest', response.status.toString(), errorText) };
				}
			}

			if (!response.body) {
				this.log.error(`[FeimaChatEndpoint] Response has no body`);
				return { type: 'error', reason: vscode.l10n.t('error.noResponseBody') };
			}

			// Extract and emit quota update from response headers
			const quotaHeaderValue = response.headers.get('x-feima-quota-snapshot');
			this.log.debug(`[FeimaChatEndpoint] Quota header value: "${quotaHeaderValue}"`);
			if (quotaHeaderValue) {
				const quota = parseQuotaHeader(quotaHeaderValue);
				this.log.debug(`[FeimaChatEndpoint] Parsed quota: ${JSON.stringify(quota)}`);
				if (quota) {
					this.log.debug(`[FeimaChatEndpoint] Emitting quota to service`);
					getQuotaService().setQuota(quota);
				} else {
					this.log.warn(`[FeimaChatEndpoint] Failed to parse quota header: "${quotaHeaderValue}"`);
				}
			} else {
				this.log.warn(`[FeimaChatEndpoint] No x-feima-quota-snapshot header in response`);
			}

			this.log.debug(`[FeimaChatEndpoint] Starting SSE stream parsing`);
			// Parse SSE stream
			await this._parseSSEStream(response.body, callback, token);
			this.log.debug(`[FeimaChatEndpoint] SSE stream parsing completed successfully`);

			return { type: 'success' };

		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			this.log.error(`[FeimaChatEndpoint] Request error: ${reason}`);
			return { type: 'error', reason };
		}
	}

	/**
	 * Parse SSE stream from response body.
	 * Pattern from feima-code CopilotLanguageModelWrapper._parseSSEStream.
	 */
	private async _parseSSEStream(
		body: ReadableStream<Uint8Array>,
		callback: FinishedCallback,
		token: vscode.CancellationToken
	): Promise<void> {
		const reader = body.getReader();
		const decoder = new TextDecoder('utf-8');
		let buffer = '';
		let fullText = '';
		let chunkCount = 0;
		let emitCount = 0;
		const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();
		// P1 #28: Remove duplicate deduplication tracking here
		// Only the wrapper tracks emitted IDs (single source of truth)

		this.log.debug(`[FeimaChatEndpoint] Starting SSE stream parsing`);

		try {
			let done = false;
			while (!done && !token.isCancellationRequested) {
				const result = await reader.read();
				done = result.done;
				
				if (done || !result.value) {
					this.log.debug(`[FeimaChatEndpoint] Stream ended: done=${done}, value=${!result.value ? 'empty' : 'has-data'}`);
					break;
				}
				
				const value = result.value;
				const rawChunk = new TextDecoder('utf-8').decode(value);
				this.log.trace(`[FeimaChatEndpoint] Received raw stream chunk: ${rawChunk.length} bytes`);

				// Decode chunk and add to buffer
				buffer += decoder.decode(value, { stream: true });

				// Process complete lines
				const lines = buffer.split('\n');
				buffer = lines.pop() || ''; // Keep last incomplete line in buffer

				for (const line of lines) {
					if (!line.trim() || line.startsWith(':')) {
						continue; // Skip empty lines and comments
					}

					if (line.startsWith('data: ')) {
						const data = line.slice(6).trim();
						chunkCount++;

						if (data === '[DONE]') {
							this.log.debug(`[FeimaChatEndpoint] Received [DONE] marker after ${chunkCount} chunks`);
							// Emit accumulated tool calls when stream is done
							if (toolCallsMap.size > 0) {
								const completedCalls = Array.from(toolCallsMap.values()).filter(
									call => call.id && call.name
								);
								if (completedCalls.length > 0) {
									this.log.debug(`[FeimaChatEndpoint] Emitting ${completedCalls.length} tool calls at [DONE]`);
									emitCount++;
									await callback(fullText, { toolCalls: completedCalls });
								}
							}
							continue;
						}

						// Separate JSON parse errors (skip bad chunk) from provider/logic errors (abort stream)
						let parsed: unknown;
						try {
							parsed = JSON.parse(data);
						} catch (jsonErr) {
							const jsonErrMsg = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
							this.log.error(`[FeimaChatEndpoint] Failed to parse SSE JSON: ${jsonErrMsg}. Data: ${data}`);
							continue;
						}
						try {
							interface SSEToolCall {
								index?: number;
								id?: string;
								function?: { name?: string; arguments?: string };
							}
							interface SSEChunk {
								type?: string;
								snapshot?: string;
								error?: { message?: string; code?: unknown; http_code?: unknown };
								choices?: Array<{
									delta: {
										content?: string;
										reasoning_content?: string;
										tool_calls?: SSEToolCall[];
									};
									finish_reason?: string;
								}>;
							}
							const chunk = parsed as SSEChunk;

							// Handle quota snapshot event emitted after billing completes
							if (chunk.type === 'quota_snapshot' && typeof chunk.snapshot === 'string') {
								const quota = parseQuotaHeader(chunk.snapshot);
								if (quota) {
									getQuotaService().setQuota(quota);
									this.log.debug(`[FeimaChatEndpoint] Quota updated from SSE event: remaining=${quota.remaining}`);
								}
								continue;
							}

							// Check if this is an error response (not a normal choice response)
							if (chunk.error) {
								const errorMsg = chunk.error.message || 'Unknown error';
								const errorCode = chunk.error.code || chunk.error.http_code || 'unknown';
								this.log.error(`[FeimaChatEndpoint] API Error from provider: ${errorCode} - ${errorMsg}`);
								throw new Error(`Provider error: ${errorMsg}`);
							}

							const choice = chunk.choices?.[0];
							if (!choice) {
								this.log.debug(`[FeimaChatEndpoint] Chunk #${chunkCount}: No choice[0] in choices array. Full chunk: ${JSON.stringify(parsed).substring(0, 300)}`);
								continue;
							}

							const delta = choice.delta;
							const streamDelta: StreamDelta = {};

							// Handle text content - emit immediately for streaming
							if (delta.content) {
								fullText += delta.content;
								streamDelta.text = delta.content;
							}

							// Handle reasoning/thinking content - emit immediately
							if (delta.reasoning_content) {
								streamDelta.reasoningContent = delta.reasoning_content;
							}

							// Accumulate tool calls silently (don't emit on every chunk)
							if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
								for (const toolCall of delta.tool_calls) {
									const index = toolCall.index ?? 0;
									const existing = toolCallsMap.get(index);

									if (existing) {
										// Accumulate arguments
										if (toolCall.function?.arguments) {
											existing.arguments += toolCall.function.arguments;
										}
									} else {
										// New tool call
										toolCallsMap.set(index, {
											id: toolCall.id || '',
											name: toolCall.function?.name || '',
											arguments: toolCall.function?.arguments || '',
										});
									}
								}
								// NOTE: Don't include toolCalls in streamDelta here!
								// We'll emit them only when [DONE] or finish_reason indicates completion
							}

							// Check for finish_reason - indicates this choice is complete
							if (choice.finish_reason && toolCallsMap.size > 0) {
								// Emit tool calls when finish_reason present
								const completedCalls = Array.from(toolCallsMap.values()).filter(
									call => call.id && call.name
								);
								if (completedCalls.length > 0) {
									this.log.debug(`[FeimaChatEndpoint] Emitting ${completedCalls.length} tool calls at finish_reason: ${choice.finish_reason}`);
									streamDelta.toolCalls = completedCalls;
								}
							}

							// Invoke callback with delta (text, reasoning, or completed tool calls)
							if (streamDelta.text || streamDelta.toolCalls || streamDelta.reasoningContent) {
								emitCount++;
								this.log.trace(`[FeimaChatEndpoint] Callback #${emitCount}: text=${streamDelta.text ? streamDelta.text.length + 'c' : '-'} reason=${streamDelta.reasoningContent ? streamDelta.reasoningContent.length + 'c' : '-'} calls=${streamDelta.toolCalls?.length ?? 0}`);
								await callback(fullText, streamDelta);
							}

						} catch (e) {
							// Re-throw provider errors — they abort the stream and surface as error responses.
							// Only swallow unexpected/logic errors to avoid crashing the whole stream.
							const errorMsg = e instanceof Error ? e.message : String(e);
							if (e instanceof Error && e.message.startsWith('Provider error:')) {
								throw e;
							}
							this.log.error(`[FeimaChatEndpoint] Unexpected error handling SSE chunk: ${errorMsg}. Data: ${data}`);
						}
					}
				}
			}

			this.log.debug(`[FeimaChatEndpoint] Stream parsing complete: ${chunkCount} chunks processed, ${emitCount} callbacks invoked, fullText=${fullText.length} chars`);

			// Safety: emit any remaining tool calls if stream ended without [DONE]
			if (toolCallsMap.size > 0) {
				const completedCalls = Array.from(toolCallsMap.values()).filter(
					call => call.id && call.name
				);
				if (completedCalls.length > 0) {
					this.log.debug(`[FeimaChatEndpoint] Emitting ${completedCalls.length} tool calls at stream end`);
					await callback(fullText, { toolCalls: completedCalls });
				}
			}
		} finally {
			reader.releaseLock();
		}
	}
}
