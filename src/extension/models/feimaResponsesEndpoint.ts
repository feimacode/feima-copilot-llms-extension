/*---------------------------------------------------------------------------------------------
 *  Feima Responses Endpoint
 *  Outbound OpenAI Responses API client — sibling to FeimaChatEndpoint (Chat
 *  Completions). Selected per-model by usesResponsesApi() in protocolSelection.ts
 *  whenever a model declares "/responses" in its supported_endpoints, following
 *  vscode-copilot-chat's responsesApi.ts as the wire-format reference and its
 *  own ChatEndpoint.useResponsesApi's "Responses wins whenever declared" rule.
 *
 *  Deliberately duplicates (rather than shares) request/SSE handling with
 *  FeimaChatEndpoint where the two protocols diverge — this codebase already
 *  keeps its three local proxy servers (responsesProxy.ts, messagesProxy.ts,
 *  chatCompletionsProxy.ts) as separate per-protocol files rather than one
 *  shared abstraction, and the request/response shapes here diverge enough
 *  (input items vs. messages, output-item lifecycle vs. delta streaming) that
 *  forcing a shared base would cost more than it saves. Only the genuinely
 *  protocol-agnostic pieces are shared: HTTP-status error mapping
 *  (httpErrorMapping.ts) and tool-result content conversion (toolResultConverter.ts).
 *--------------------------------------------------------------------------------------------*/

import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { ILogService } from '../platform/log/common/logService';
import { FeimaAuthenticationService } from '../platform/authentication/vscode/feimaAuthenticationService';
import { countTokens } from '../platform/tokenizer/tikTokenizer';
import { getResolvedConfig } from '../../config/configService';
import { toolResultContentToString } from './toolResultConverter';
import { mapHttpErrorToChatResponse } from './httpErrorMapping';
import { MAX_TOOL_NAME_LENGTH, shortenToolName } from './toolNameShortening';
import { ApiUsage, ChatResponse, FinishedCallback, IFeimaEndpoint, ModelInfo, StreamDelta } from './feimaChatEndpoint';

// ---------------------------------------------------------------------------
// Wire types — OpenAI Responses API (no SDK dependency, mirrors responsesProxy.ts)
// ---------------------------------------------------------------------------

interface ResponsesInputContentPart {
	type: 'input_text' | 'output_text';
	text: string;
}

interface ResponsesMessageInputItem {
	role: 'user' | 'system' | 'assistant';
	type?: 'message';
	status?: 'completed';
	content: ResponsesInputContentPart[];
}

interface ResponsesFunctionCallInputItem {
	type: 'function_call';
	call_id: string;
	name: string;
	arguments: string;
}

interface ResponsesFunctionCallOutputInputItem {
	type: 'function_call_output';
	call_id: string;
	output: string;
}

type ResponsesInputItem = ResponsesMessageInputItem | ResponsesFunctionCallInputItem | ResponsesFunctionCallOutputInputItem;

interface ResponsesFunctionTool {
	type: 'function';
	name: string;
	description?: string;
	parameters: object;
}

interface ResponsesRequestBody {
	model: string;
	input: ResponsesInputItem[];
	store: false;
	stream: true;
	temperature?: number;
	max_output_tokens?: number;
	tools?: ResponsesFunctionTool[];
	tool_choice?: 'auto' | { type: 'function'; name: string };
	reasoning?: { effort?: string; summary?: string };
	include?: string[];
}

// ---------------------------------------------------------------------------
// Minimal interfaces (matches feimaChatEndpoint.ts)
// ---------------------------------------------------------------------------

interface ToolResultPart {
	callId: string;
	content: string | vscode.LanguageModelTextPart[];
}

interface ToolCallPart {
	callId: string;
	name: string;
	input: object;
}

/**
 * Feima Responses Endpoint
 *
 * Handles the same responsibilities as FeimaChatEndpoint, against the
 * OpenAI Responses API wire format instead of Chat Completions:
 * - Model metadata and capabilities
 * - Authentication token management
 * - Request body creation (VS Code messages → Responses `input[]`)
 * - SSE response parsing (Responses output-item lifecycle → StreamDelta)
 */
export class FeimaResponsesEndpoint implements IFeimaEndpoint {
	private _cachedToken: string | null = null;

	constructor(
		private readonly modelInfo: ModelInfo,
		private readonly authService: FeimaAuthenticationService,
		private readonly log: ILogService
	) {
		this._prefetchToken();
	}

	get model(): string { return this.modelInfo.id; }
	get name(): string { return this.modelInfo.name; }
	get family(): string { return this.modelInfo.family; }
	get maxInputTokens(): number { return this.modelInfo.maxInputTokens; }
	get maxOutputTokens(): number { return this.modelInfo.maxOutputTokens; }
	get supportsToolCalls(): boolean { return this.modelInfo.supportsToolCalls; }
	get supportsVision(): boolean { return this.modelInfo.supportsVision; }
	get supportsThinking(): boolean { return this.modelInfo.supportsThinking; }
	get supportedReasoningEffort(): string[] { return this.modelInfo.supportedReasoningEffort; }

	get apiUrl(): string {
		const apiBase = getResolvedConfig().apiBaseUrl || '';
		return `${apiBase}/responses`;
	}

	private async _prefetchToken(): Promise<void> {
		try {
			const sessions = await this.authService.getSessions(undefined, {});
			const session = sessions[0];
			if (session) {
				this._cachedToken = session.accessToken;
			}
		} catch (error) {
			this.log.error(error as Error, '[FeimaResponsesEndpoint] Failed to prefetch token');
		}
	}

	async getAuthToken(): Promise<string> {
		try {
			const sessions = await this.authService.getSessions(undefined, {});
			const session = sessions[0];
			if (!session) {
				throw new Error(vscode.l10n.t('Please sign in to Feima first'));
			}
			this._cachedToken = session.accessToken;
			return session.accessToken;
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			this.log.error(error as Error, `[FeimaResponsesEndpoint] Failed to get auth token: ${errorMsg}`);
			throw error;
		}
	}

	async getHeaders(): Promise<Record<string, string>> {
		const token = await this.getAuthToken();
		return {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`
		};
	}

	/**
	 * Create the Responses API request body from VS Code chat messages.
	 *
	 * Converts:
	 * - User/system text → {role, content: [{type: 'input_text', text}]}
	 * - Assistant text → {role: 'assistant', type: 'message', content: [{type: 'output_text', text}]}
	 * - Assistant tool calls → {type: 'function_call', call_id, name, arguments}
	 * - User tool results → {type: 'function_call_output', call_id, output}
	 *
	 * Mirrors the inverse of responsesProxy.ts's convertInputToMessages, and
	 * the system-message-collapsing workaround already applied in
	 * feimaChatEndpoint.ts's createRequestBody (some providers reject
	 * multiple system messages per request).
	 */
	createRequestBody(
		messages: vscode.LanguageModelChatMessage[],
		options: {
			tools?: readonly vscode.LanguageModelChatTool[];
			toolMode?: vscode.LanguageModelChatToolMode;
		}
	): { body: ResponsesRequestBody; toolNameMap: Map<string, string> } {
		const input: ResponsesInputItem[] = [];

		if (getResolvedConfig().enforceEnglish) {
			input.push({
				role: 'system',
				content: [{ type: 'input_text', text: 'Always respond in English, regardless of the language used in the conversation.' }]
			});
		}

		for (const msg of messages) {
			const hasToolResults = Array.isArray(msg.content) &&
				msg.content.some(part =>
					typeof part === 'object' && 'callId' in part && 'content' in part
				);

			if (hasToolResults && msg.role === vscode.LanguageModelChatMessageRole.User) {
				const toolResultParts = (Array.isArray(msg.content) ? msg.content : [msg.content])
					.filter(part => typeof part === 'object' && 'callId' in part && 'content' in part);

				for (const part of toolResultParts) {
					const toolResultPart = part as ToolResultPart;
					const resultContent = toolResultContentToString(
						toolResultPart.content,
						(c): c is vscode.LanguageModelTextPart => c instanceof vscode.LanguageModelTextPart,
						(c): c is vscode.LanguageModelDataPart => c instanceof vscode.LanguageModelDataPart
					);
					input.push({
						type: 'function_call_output',
						call_id: toolResultPart.callId,
						output: resultContent
					});
				}
			} else if (msg.role === vscode.LanguageModelChatMessageRole.Assistant) {
				const toolCallParts = (Array.isArray(msg.content) ? msg.content : [msg.content])
					.filter(part => typeof part === 'object' && 'callId' in part && 'name' in part && 'input' in part);

				const textContent = (Array.isArray(msg.content) ? msg.content : [msg.content])
					.map(part => part instanceof vscode.LanguageModelTextPart ? part.value : '')
					.join('');

				if (textContent) {
					input.push({
						role: 'assistant',
						type: 'message',
						status: 'completed',
						content: [{ type: 'output_text', text: textContent }]
					});
				}

				for (const part of toolCallParts) {
					const toolCallPart = part as unknown as ToolCallPart;
					input.push({
						type: 'function_call',
						call_id: toolCallPart.callId,
						name: shortenToolName(toolCallPart.name),
						arguments: JSON.stringify(toolCallPart.input || {})
					});
				}
			} else {
				const content = typeof msg.content === 'string' ? msg.content :
					msg.content.map(part => part instanceof vscode.LanguageModelTextPart ? part.value : '').join('');

				input.push({
					role: msg.role === vscode.LanguageModelChatMessageRole.User ? 'user' as const : 'system' as const,
					content: [{ type: 'input_text', text: content }]
				});
			}
		}

		// Collapse consecutive system messages, matching feimaChatEndpoint.ts —
		// some providers only accept a single system message per request.
		for (let i = 1; i < input.length; i++) {
			const current = input[i];
			const prev = input[i - 1];
			if ('role' in current && current.role === 'system' && 'role' in prev && prev.role === 'system') {
				const prevText = prev.content[0]?.text ?? '';
				const currText = current.content[0]?.text ?? '';
				prev.content = [{ type: 'input_text', text: prevText.trimEnd() + '\n' + currText }];
				input.splice(i, 1);
				i--;
			}
		}

		const body: ResponsesRequestBody = {
			model: this.model,
			input,
			store: false,
			stream: true,
			temperature: 0.7,
			max_output_tokens: this.maxOutputTokens
		};

		// Gated on supportedReasoningEffort, NOT supportsThinking — a model can
		// produce reasoning tokens without accepting the Responses API's
		// `reasoning` parameter shape at all (matches vscode-copilot-chat's
		// `endpoint.supportsReasoningEffort?.length` check in
		// createResponsesRequestBody; sending `reasoning` to a model that
		// doesn't declare support for it is exactly what caused gpt-5.6-luna's
		// persistent "invalid_prompt" 400s from OpenCode Zen).
		if (this.supportedReasoningEffort.length > 0) {
			body.reasoning = { effort: 'medium', summary: 'auto' };
			// Required by real OpenAI-family reasoning models when store=false
			// (always, for this client) — encrypted_content is the only way to
			// carry reasoning state across a tool-calling loop without
			// server-side storage. Matches vscode-copilot-chat's
			// createResponsesRequestBody, which sets this unconditionally
			// whenever reasoning is used.
			body.include = ['reasoning.encrypted_content'];
		}

		const toolNameMap = new Map<string, string>(); // shortened -> original

		if (options.tools && options.tools.length > 0 && this.supportsToolCalls) {
			body.tools = options.tools.map(tool => {
				let parameters: object;
				if (tool.inputSchema && typeof tool.inputSchema === 'object' && Object.keys(tool.inputSchema).length > 0) {
					parameters = tool.inputSchema;
				} else {
					parameters = { type: 'object', properties: {} };
				}
				const shortName = shortenToolName(tool.name);
				if (shortName !== tool.name) {
					toolNameMap.set(shortName, tool.name);
					this.log.debug(`[FeimaResponsesEndpoint] Tool name "${tool.name}" (${tool.name.length} chars) exceeds ${MAX_TOOL_NAME_LENGTH}, shortened to "${shortName}"`);
				}
				return {
					type: 'function' as const,
					name: shortName,
					description: tool.description,
					parameters
				};
			});

			if (options.toolMode === vscode.LanguageModelChatToolMode.Required && options.tools.length === 1) {
				body.tool_choice = { type: 'function', name: shortenToolName(options.tools[0].name) };
			}
		}

		return { body, toolNameMap };
	}

	/** Validate request before sending — identical contract to FeimaChatEndpoint.validateRequest. */
	validateRequest(
		messages: vscode.LanguageModelChatMessage[],
		options: { tools?: readonly vscode.LanguageModelChatTool[]; toolMode?: vscode.LanguageModelChatToolMode }
	): void {
		if (!messages || messages.length === 0) {
			throw new Error('Invalid request: no messages.');
		}

		if (options.tools) {
			for (const tool of options.tools) {
				if (!tool.name.match(/^[\w-]+$/)) {
					throw new Error(`Invalid tool name "${tool.name}": only alphanumeric characters, hyphens, and underscores are allowed.`);
				}
			}
			if (options.tools.length > 128) {
				throw new Error('Cannot have more than 128 tools per request.');
			}
			if (options.toolMode === vscode.LanguageModelChatToolMode.Required && options.tools.length > 1) {
				throw new Error(vscode.l10n.t('LanguageModelChatToolMode.Required is not supported with more than one tool'));
			}
		}

		messages.forEach((message, i) => {
			if (message.role === vscode.LanguageModelChatMessageRole.Assistant) {
				const content = Array.isArray(message.content) ? message.content : [message.content];
				const filteredContent = content.filter(part => !(part instanceof vscode.LanguageModelDataPart));
				const toolCallIds = new Set<string>(filteredContent
					.filter(part => part instanceof vscode.LanguageModelToolCallPart)
					.map(part => (part as ToolCallPart).callId)
				);

				if (toolCallIds.size > 0) {
					let nextIdx = i + 1;
					const errMsg = 'Invalid request: Tool call must be followed by User message with LanguageModelToolResultPart with matching callId.';
					while (toolCallIds.size > 0) {
						const nextMessage = messages.at(nextIdx++);
						if (!nextMessage || nextMessage.role !== vscode.LanguageModelChatMessageRole.User) {
							throw new Error(errMsg);
						}
						const nextContent = Array.isArray(nextMessage.content) ? nextMessage.content : [nextMessage.content];
						let foundAnyResult = false;
						for (const part of nextContent) {
							const isToolResult = (part instanceof vscode.LanguageModelToolResultPart) ||
								(part.constructor.name === 'LanguageModelToolResultPart2');
							const isDataPart = part instanceof vscode.LanguageModelDataPart;
							if (!isToolResult && !isDataPart) {
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

	async provideTokenCount(text: string | vscode.LanguageModelChatMessage): Promise<number> {
		const textContent = typeof text === 'string'
			? text
			: (typeof text.content === 'string'
				? text.content
				: text.content.map(part => part instanceof vscode.LanguageModelTextPart ? part.value : '').join(''));
		return countTokens(this.model, textContent);
	}

	/**
	 * Make a Responses API request with streaming.
	 * Same external contract as FeimaChatEndpoint.makeChatRequest.
	 */
	async makeChatRequest(
		messages: vscode.LanguageModelChatMessage[],
		callback: FinishedCallback,
		token: vscode.CancellationToken,
		tools?: readonly vscode.LanguageModelChatTool[],
		toolMode?: vscode.LanguageModelChatToolMode
	): Promise<ChatResponse> {
		this.log.debug(`[FeimaResponsesEndpoint] makeChatRequest called: model=${this.model}, messages=${messages.length}`);

		this.validateRequest(messages, { tools, toolMode });

		const authToken = await this.getAuthToken();
		if (!authToken) {
			return { type: 'error', reason: 'Authentication failed: no token available' };
		}

		const { body: requestBody, toolNameMap } = this.createRequestBody(messages, { tools, toolMode });

		// Structural summary (types/roles/call_ids, not full content) so an
		// upstream "invalid_prompt"-style rejection can be diagnosed from
		// logs alone — mirrors responsesProxy.ts's equivalent input-item log.
		this.log.debug(`[FeimaResponsesEndpoint] input items (${requestBody.input.length}): ${requestBody.input.map((item, idx) => {
			if (item.type === 'function_call') { return `${idx}:function_call(call_id=${item.call_id}, name=${item.name})`; }
			if (item.type === 'function_call_output') { return `${idx}:function_call_output(call_id=${item.call_id})`; }
			return `${idx}:message(${item.role})`;
		}).join(', ')}`);
		if (requestBody.tools) {
			this.log.debug(`[FeimaResponsesEndpoint] tools (${requestBody.tools.length}): ${requestBody.tools.map(t => t.name).join(', ')}`);
		}

		try {
			const baseHeaders = await this.getHeaders();
			const timeoutMs = getResolvedConfig().requestTimeout * 1000;
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

			let response: Response;
			try {
				response = await fetch(this.apiUrl, {
					method: 'POST',
					headers: { ...baseHeaders, 'Authorization': `Bearer ${authToken}` },
					body: JSON.stringify(requestBody),
					signal: controller.signal
				});
			} finally {
				clearTimeout(timeoutId);
			}

			if (!response.ok) {
				const errorText = await response.text();
				this.log.error(`[FeimaResponsesEndpoint] Request failed: HTTP ${response.status}: ${errorText}`);
				return mapHttpErrorToChatResponse(response, errorText, this.modelInfo.id, token, this.log, '[FeimaResponsesEndpoint]');
			}

			if (!response.body) {
				return { type: 'error', reason: vscode.l10n.t('No response body received') };
			}

			const usage = await this._parseResponsesSSEStream(response.body, callback, token, toolNameMap);
			return { type: 'success', usage };

		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			this.log.error(`[FeimaResponsesEndpoint] Request error: ${reason}`);
			return { type: 'error', reason };
		}
	}

	/**
	 * Finalize a tool call once its output-item lifecycle completes.
	 * A call without a name can't be identified and is dropped (loudly);
	 * see feimaChatEndpoint.ts's _finalizeToolCalls for the same reasoning.
	 */
	private _finalizeToolCall(call: { id: string; name: string; arguments: string }): { id: string; name: string; arguments: string } | undefined {
		if (!call.name) {
			this.log.warn(`[FeimaResponsesEndpoint] Dropping tool call with no name (id=${call.id || '(none)'}): ${call.arguments.slice(0, 200)}`);
			return undefined;
		}
		if (!call.id) {
			const syntheticId = `call_${crypto.randomUUID()}`;
			this.log.warn(`[FeimaResponsesEndpoint] Tool call "${call.name}" had no id from the provider; synthesizing ${syntheticId}`);
			return { ...call, id: syntheticId };
		}
		return call;
	}

	/**
	 * Parse a Responses API SSE stream.
	 *
	 * Event vocabulary matches responsesProxy.ts's streamResponsesSSE (the
	 * same shape this extension already emits in the reverse direction for
	 * the Codex proxy) — response.output_text.delta, response.output_item.added/.done
	 * for function_call and reasoning items, response.function_call_arguments.delta,
	 * response.reasoning_summary_text.delta, response.completed, response.failed.
	 */
	private async _parseResponsesSSEStream(
		body: ReadableStream<Uint8Array>,
		callback: FinishedCallback,
		token: vscode.CancellationToken,
		toolNameMap: Map<string, string>
	): Promise<ApiUsage | undefined> {
		const reader = body.getReader();
		const decoder = new TextDecoder('utf-8');
		let buffer = '';
		let fullText = '';
		let capturedUsage: ApiUsage | undefined;
		const toolCallsByOutputIndex = new Map<number, { id: string; name: string; arguments: string }>();

		try {
			let done = false;
			while (!done && !token.isCancellationRequested) {
				const result = await reader.read();
				done = result.done;
				if (done || !result.value) {
					break;
				}

				buffer += decoder.decode(result.value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (!line.trim() || line.startsWith(':')) {
						continue;
					}
					if (!line.startsWith('data: ')) {
						continue;
					}
					const data = line.slice(6).trim();
					if (data === '[DONE]') {
						continue;
					}

					let event: Record<string, unknown>;
					try {
						event = JSON.parse(data);
					} catch (jsonErr) {
						const jsonErrMsg = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
						this.log.error(`[FeimaResponsesEndpoint] Failed to parse SSE JSON: ${jsonErrMsg}. Data: ${data}`);
						continue;
					}

					const eventType = typeof event.type === 'string' ? event.type : undefined;
					const streamDelta: StreamDelta = {};

					if (eventType === 'response.output_text.delta') {
						const delta = typeof event.delta === 'string' ? event.delta : '';
						fullText += delta;
						streamDelta.text = delta;
					} else if (eventType === 'response.reasoning_summary_text.delta') {
						const delta = typeof event.delta === 'string' ? event.delta : '';
						streamDelta.reasoningContent = delta;
					} else if (eventType === 'response.output_item.added') {
						const item = event.item as { type?: string; call_id?: string; name?: string } | undefined;
						const outputIndex = typeof event.output_index === 'number' ? event.output_index : -1;
						if (item?.type === 'function_call' && outputIndex >= 0) {
							toolCallsByOutputIndex.set(outputIndex, {
								id: item.call_id ?? '',
								name: item.name ?? '',
								arguments: ''
							});
						}
					} else if (eventType === 'response.function_call_arguments.delta') {
						const outputIndex = typeof event.output_index === 'number' ? event.output_index : -1;
						const delta = typeof event.delta === 'string' ? event.delta : '';
						const existing = toolCallsByOutputIndex.get(outputIndex);
						if (existing) {
							existing.arguments += delta;
						}
					} else if (eventType === 'response.output_item.done') {
						const item = event.item as { type?: string; call_id?: string; name?: string; arguments?: string } | undefined;
						const outputIndex = typeof event.output_index === 'number' ? event.output_index : -1;
						if (item?.type === 'function_call') {
							const tracked = toolCallsByOutputIndex.get(outputIndex);
							const returnedName = item.name ?? tracked?.name ?? '';
							const finalCall = {
								id: item.call_id ?? tracked?.id ?? '',
								// Reverse the shortening applied in createRequestBody — the
								// model can only call names it was actually given, so a hit
								// here always resolves to the real VS Code tool name; a miss
								// means the name was never shortened (<=64 chars) already.
								name: toolNameMap.get(returnedName) ?? returnedName,
								arguments: item.arguments ?? tracked?.arguments ?? ''
							};
							toolCallsByOutputIndex.delete(outputIndex);
							const finalized = this._finalizeToolCall(finalCall);
							if (finalized) {
								streamDelta.toolCalls = [finalized];
							}
						}
					} else if (eventType === 'response.completed') {
						const response = event.response as { usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } } | undefined;
						if (response?.usage) {
							capturedUsage = {
								prompt_tokens: response.usage.input_tokens ?? 0,
								completion_tokens: response.usage.output_tokens ?? 0,
								total_tokens: response.usage.total_tokens ?? 0
							};
						}
					} else if (eventType === 'response.failed' || eventType === 'error') {
						const errObj = (event.response as { error?: { message?: string } } | undefined)?.error ?? event as { message?: string };
						const errorMsg = errObj?.message || 'Unknown Responses API error';
						this.log.error(`[FeimaResponsesEndpoint] Provider error: ${errorMsg}`);
						throw new Error(`Provider error: ${errorMsg}`);
					}

					if (streamDelta.text || streamDelta.toolCalls || streamDelta.reasoningContent) {
						await callback(fullText, streamDelta);
					}
				}
			}
		} finally {
			reader.releaseLock();
		}

		return capturedUsage;
	}
}
