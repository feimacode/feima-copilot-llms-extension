/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Chat endpoint for a single local/enterprise registry entry. Handles
 *  request building, streaming, and tool-call accumulation for the two wire
 *  protocols in scope: OpenAI-compatible chat completions (covers
 *  openai-compat AND ollama-native, since Ollama also serves
 *  /v1/chat/completions by default — see types.ts defaultCompletionsPath)
 *  and Anthropic Messages.
 *
 *  Deliberately simpler than FeimaChatEndpoint: no quota/wallet/billing
 *  concerns, no provider-specific request quirks — this is a generic client
 *  for whatever the registry entry says it speaks, not a Feima-specific one.
 *--------------------------------------------------------------------------------------------*/

import * as crypto from 'crypto';
import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { ILogService } from '../../platform/log/common/logService';
import { countTokens } from '../../platform/tokenizer/tikTokenizer';
import { LocalEndpointEntry } from './types';

export type FinishedCallback = (fullText: string, delta: StreamDelta) => Promise<number | undefined>;

export interface StreamDelta {
	text?: string;
	toolCalls?: Array<{ id: string; name: string; arguments: string }>;
	reasoningContent?: string;
}

export type ChatResponse =
	| { type: 'success' }
	| { type: 'cancelled' }
	| { type: 'error'; reason: string }
	| { type: 'unauthorized'; reason: string };

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;

export class LocalChatEndpoint {
	constructor(
		readonly entry: LocalEndpointEntry,
		readonly modelId: string,
		private readonly apiKey: string | undefined,
		private readonly log: ILogService,
	) {}

	get model(): string {
		return this.modelId;
	}

	private get _completionsUrl(): string {
		return `${this.entry.baseEndpoint}${this.entry.completionsEndpointPath}`;
	}

	private _headers(): Record<string, string> {
		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		if (this.apiKey) {
			if (this.entry.apiFormat === 'anthropic-messages') {
				headers['x-api-key'] = this.apiKey;
				headers['anthropic-version'] = '2023-06-01';
			} else {
				headers['Authorization'] = `Bearer ${this.apiKey}`;
			}
		}
		return headers;
	}

	async provideTokenCount(text: string | vscode.LanguageModelChatMessage): Promise<number> {
		const content = typeof text === 'string' ? text : messageToPlainText(text);
		return countTokens(this.modelId, content);
	}

	async makeChatRequest(
		messages: readonly vscode.LanguageModelChatMessage[],
		callback: FinishedCallback,
		token: vscode.CancellationToken,
		tools?: readonly vscode.LanguageModelChatTool[],
		toolMode?: vscode.LanguageModelChatToolMode,
	): Promise<ChatResponse> {
		const controller = new AbortController();
		const startedAt = Date.now();
		let timedOut = false;
		const timeoutId = setTimeout(() => {
			timedOut = true;
			this.log.warn(`[LocalChatEndpoint] ${this._completionsUrl} exceeded the ${DEFAULT_TIMEOUT_MS}ms timeout with no completed response, aborting (model=${this.modelId})`);
			controller.abort();
		}, DEFAULT_TIMEOUT_MS);
		const cancelListener = token.onCancellationRequested(() => {
			this.log.debug(`[LocalChatEndpoint] Request to ${this._completionsUrl} cancelled by caller after ${Date.now() - startedAt}ms`);
			controller.abort();
		});

		try {
			const body = this.entry.apiFormat === 'anthropic-messages'
				? buildAnthropicRequestBody(this.modelId, messages, tools, toolMode)
				: buildOpenAICompatRequestBody(this.modelId, messages, tools, toolMode);
			const serializedBody = JSON.stringify(body);
			const toolsBytes = tools && tools.length > 0 ? JSON.stringify(tools).length : 0;

			this.log.info(`[LocalChatEndpoint] POST ${this._completionsUrl} (model=${this.modelId}, format=${this.entry.apiFormat}, tools=${tools?.length ?? 0}, bodyBytes=${serializedBody.length}, toolsBytes=${toolsBytes}, timeout=${DEFAULT_TIMEOUT_MS}ms)`);
			if (tools && tools.length > 20) {
				this.log.warn(`[LocalChatEndpoint] ${tools.length} tools (${toolsBytes} bytes of schema) sent to a local model — many local runtimes prefill this into the prompt on every turn, which can make small/quantized models take minutes or time out entirely; consider disabling unused tools for local model chats`);
			}
			const response = await fetch(this._completionsUrl, {
				method: 'POST',
				headers: this._headers(),
				body: serializedBody,
				signal: controller.signal,
			});
			this.log.debug(`[LocalChatEndpoint] Response headers from ${this._completionsUrl} after ${Date.now() - startedAt}ms (status=${response.status}, content-type=${response.headers.get('content-type')})`);

			if (!response.ok) {
				const errorText = await response.text();
				if (response.status === 401 || response.status === 403) {
					return { type: 'unauthorized', reason: vscode.l10n.t('Authentication failed ({0})', response.status) };
				}
				return { type: 'error', reason: `HTTP ${response.status}: ${errorText.slice(0, 500)}` };
			}
			if (!response.body) {
				return { type: 'error', reason: vscode.l10n.t('No response body received') };
			}

			if (this.entry.apiFormat === 'anthropic-messages') {
				await parseAnthropicSSEStream(response.body, callback, token, this.log, startedAt);
			} else {
				await parseOpenAICompatSSEStream(response.body, callback, token, this.log, startedAt);
			}
			this.log.info(`[LocalChatEndpoint] Request to ${this._completionsUrl} completed after ${Date.now() - startedAt}ms`);
			return { type: 'success' };
		} catch (error) {
			const elapsed = Date.now() - startedAt;
			if (timedOut) {
				const reason = vscode.l10n.t('Local model request to {0} timed out after {1}s with no response — the model may still be loading (large models can take minutes on first use) or is slower than the configured timeout', this.entry.baseEndpoint, Math.round(DEFAULT_TIMEOUT_MS / 1000));
				this.log.error(`[LocalChatEndpoint] ${reason} (elapsed=${elapsed}ms)`);
				return { type: 'error', reason };
			}
			if (token.isCancellationRequested) {
				this.log.debug(`[LocalChatEndpoint] Request to ${this._completionsUrl} cancelled after ${elapsed}ms`);
				return { type: 'cancelled' };
			}
			const reason = error instanceof Error ? error.message : String(error);
			this.log.error(`[LocalChatEndpoint] Request to ${this._completionsUrl} failed after ${elapsed}ms: ${reason}`);
			return { type: 'error', reason };
		} finally {
			clearTimeout(timeoutId);
			cancelListener.dispose();
		}
	}
}

// ─── Message conversion (shared shape, protocol-generic) ──────────────────────

function messageToPlainText(message: vscode.LanguageModelChatMessage): string {
	if (typeof message.content === 'string') {
		return message.content;
	}
	return message.content
		.map(part => (part instanceof vscode.LanguageModelTextPart ? part.value : ''))
		.join('');
}

// ─── OpenAI-compatible chat completions ────────────────────────────────────────

interface OpenAICompatMessage {
	role: 'user' | 'assistant' | 'system' | 'tool';
	content?: string | null;
	tool_call_id?: string;
	tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
}

function buildOpenAICompatRequestBody(
	model: string,
	messages: readonly vscode.LanguageModelChatMessage[],
	tools?: readonly vscode.LanguageModelChatTool[],
	toolMode?: vscode.LanguageModelChatToolMode,
): Record<string, unknown> {
	const out: OpenAICompatMessage[] = [];

	for (const msg of messages) {
		const parts = Array.isArray(msg.content) ? msg.content : [msg.content];
		const toolResults = parts.filter(p => typeof p === 'object' && p !== null && 'callId' in p && 'content' in p && !('name' in p));

		if (toolResults.length > 0 && msg.role === vscode.LanguageModelChatMessageRole.User) {
			for (const part of toolResults) {
				const p = part as unknown as { callId: string; content: unknown };
				out.push({ role: 'tool', tool_call_id: p.callId, content: toolResultToString(p.content) });
			}
			continue;
		}

		if (msg.role === vscode.LanguageModelChatMessageRole.Assistant) {
			const toolCalls = parts.filter(p => typeof p === 'object' && p !== null && 'callId' in p && 'name' in p && 'input' in p);
			const text = parts.filter((p): p is vscode.LanguageModelTextPart => p instanceof vscode.LanguageModelTextPart)
				.map(p => p.value).join('');
			const assistantMsg: OpenAICompatMessage = { role: 'assistant', content: text || null };
			if (toolCalls.length > 0) {
				assistantMsg.tool_calls = toolCalls.map(p => {
					const call = p as unknown as { callId: string; name: string; input: object };
					return { id: call.callId, type: 'function' as const, function: { name: call.name, arguments: JSON.stringify(call.input || {}) } };
				});
			}
			out.push(assistantMsg);
			continue;
		}

		out.push({
			role: msg.role === vscode.LanguageModelChatMessageRole.User ? 'user' : 'system',
			content: typeof msg.content === 'string' ? msg.content : messageToPlainText(msg),
		});
	}

	const body: Record<string, unknown> = {
		model,
		messages: out,
		stream: true,
		max_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
	};

	if (tools && tools.length > 0) {
		body.tools = tools.map(tool => ({
			type: 'function',
			function: {
				name: tool.name,
				description: tool.description,
				parameters: tool.inputSchema && Object.keys(tool.inputSchema).length > 0 ? tool.inputSchema : { type: 'object', properties: {} },
			},
		}));
		if (toolMode === vscode.LanguageModelChatToolMode.Required && tools.length === 1) {
			body.tool_choice = { type: 'function', function: { name: tools[0].name } };
		}
	}

	return body;
}

function toolResultToString(content: unknown): string {
	if (typeof content === 'string') {
		return content;
	}
	if (Array.isArray(content)) {
		return content.map(c => (c instanceof vscode.LanguageModelTextPart ? c.value : '')).join('');
	}
	return '';
}

async function parseOpenAICompatSSEStream(
	body: NodeJS.ReadableStream,
	callback: FinishedCallback,
	token: vscode.CancellationToken,
	log: ILogService,
	startedAt: number,
): Promise<void> {
	const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();
	let fullText = '';
	let firstChunkLogged = false;
	let unrecognizedShapesLogged = 0;

	for await (const line of iterateSSELines(body, token)) {
		if (!firstChunkLogged) {
			firstChunkLogged = true;
			log.debug(`[LocalChatEndpoint] First SSE chunk received after ${Date.now() - startedAt}ms`);
		}
		if (line === '[DONE]') {
			emitAccumulatedToolCalls(toolCallsMap, fullText, callback, log);
			continue;
		}
		let parsed: {
			choices?: Array<{
				delta?: {
					content?: string;
					reasoning_content?: string;
					reasoning?: string;
					thinking?: string;
					tool_calls?: Array<{ index?: number; id?: string; function?: { name?: string; arguments?: string } }>;
				};
				finish_reason?: string;
			}>;
			error?: { message?: string };
		};
		try {
			parsed = JSON.parse(line);
		} catch {
			continue;
		}
		if (parsed.error) {
			throw new Error(parsed.error.message ?? 'Provider error');
		}
		const choice = parsed.choices?.[0];
		if (!choice) {
			continue;
		}
		const delta = choice.delta ?? {};
		const streamDelta: StreamDelta = {};
		if (delta.content) {
			fullText += delta.content;
			streamDelta.text = delta.content;
		}
		// Different runtimes/reasoning-parsers use different field names for
		// reasoning tokens — accept the common variants defensively rather
		// than silently dropping "thinking" output under an unrecognized key.
		const reasoning = delta.reasoning_content ?? delta.reasoning ?? delta.thinking;
		if (reasoning) {
			streamDelta.reasoningContent = reasoning;
		}
		if (delta.tool_calls) {
			for (const call of delta.tool_calls) {
				const idx = call.index ?? 0;
				const existing = toolCallsMap.get(idx);
				if (existing) {
					if (call.id) { existing.id = call.id; }
					if (call.function?.name) { existing.name = call.function.name; }
					if (call.function?.arguments) { existing.arguments += call.function.arguments; }
				} else {
					toolCallsMap.set(idx, { id: call.id ?? '', name: call.function?.name ?? '', arguments: call.function?.arguments ?? '' });
				}
			}
		}
		if (!streamDelta.text && !streamDelta.reasoningContent && !delta.tool_calls && unrecognizedShapesLogged < 3) {
			unrecognizedShapesLogged++;
			log.debug(`[LocalChatEndpoint] Delta with no recognized content/reasoning/tool_calls field: ${JSON.stringify(delta)}`);
		}
		if (choice.finish_reason && toolCallsMap.size > 0) {
			emitAccumulatedToolCalls(toolCallsMap, fullText, callback, log);
		}
		if (streamDelta.text || streamDelta.reasoningContent) {
			await callback(fullText, streamDelta);
		}
	}
	// Safety net: stream ended without an explicit finish_reason/[DONE] carrying the calls.
	emitAccumulatedToolCalls(toolCallsMap, fullText, callback, log);
}

function emitAccumulatedToolCalls(
	toolCallsMap: Map<number, { id: string; name: string; arguments: string }>,
	fullText: string,
	callback: FinishedCallback,
	log: ILogService,
): void {
	if (toolCallsMap.size === 0) {
		return;
	}
	const completed: Array<{ id: string; name: string; arguments: string }> = [];
	for (const call of toolCallsMap.values()) {
		if (!call.name) {
			log.warn(`[LocalChatEndpoint] Dropping tool call with no name (malformed local-model output)`);
			continue;
		}
		completed.push(call.id ? call : { ...call, id: `call_${crypto.randomUUID()}` });
	}
	toolCallsMap.clear();
	if (completed.length > 0) {
		void callback(fullText, { toolCalls: completed });
	}
}

// ─── Anthropic Messages ─────────────────────────────────────────────────────────

function buildAnthropicRequestBody(
	model: string,
	messages: readonly vscode.LanguageModelChatMessage[],
	tools?: readonly vscode.LanguageModelChatTool[],
	toolMode?: vscode.LanguageModelChatToolMode,
): Record<string, unknown> {
	// vscode.LanguageModelChatMessageRole only has User/Assistant — there is no
	// distinct System role at this API layer (matches FeimaChatEndpoint's own
	// exhaustive User/Assistant-only ternary). Any system-prompt-like content
	// necessarily arrives as a User message, so the Anthropic `system` field is
	// never populated here.
	const out: Array<{ role: 'user' | 'assistant'; content: unknown[] }> = [];

	for (const msg of messages) {
		const parts = Array.isArray(msg.content) ? msg.content : [msg.content];
		const role = msg.role === vscode.LanguageModelChatMessageRole.Assistant ? 'assistant' as const : 'user' as const;
		const content: unknown[] = [];
		for (const part of parts) {
			if (part instanceof vscode.LanguageModelTextPart) {
				content.push({ type: 'text', text: part.value });
			} else if (typeof part === 'object' && part !== null && 'callId' in part && 'name' in part && 'input' in part) {
				const call = part as unknown as { callId: string; name: string; input: object };
				content.push({ type: 'tool_use', id: call.callId, name: call.name, input: call.input });
			} else if (typeof part === 'object' && part !== null && 'callId' in part && 'content' in part) {
				const result = part as unknown as { callId: string; content: unknown };
				content.push({ type: 'tool_result', tool_use_id: result.callId, content: toolResultToString(result.content) });
			}
		}
		out.push({ role, content });
	}

	const body: Record<string, unknown> = {
		model,
		messages: out,
		max_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
		stream: true,
	};
	if (tools && tools.length > 0) {
		body.tools = tools.map(tool => ({
			name: tool.name,
			description: tool.description,
			input_schema: tool.inputSchema && Object.keys(tool.inputSchema).length > 0 ? tool.inputSchema : { type: 'object', properties: {} },
		}));
		if (toolMode === vscode.LanguageModelChatToolMode.Required && tools.length === 1) {
			body.tool_choice = { type: 'tool', name: tools[0].name };
		}
	}
	return body;
}

async function parseAnthropicSSEStream(
	body: NodeJS.ReadableStream,
	callback: FinishedCallback,
	token: vscode.CancellationToken,
	log: ILogService,
	startedAt: number,
): Promise<void> {
	let fullText = '';
	const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();
	let firstChunkLogged = false;

	for await (const line of iterateSSELines(body, token)) {
		if (!firstChunkLogged) {
			firstChunkLogged = true;
			log.debug(`[LocalChatEndpoint] First SSE chunk received after ${Date.now() - startedAt}ms`);
		}
		let event: {
			type?: string;
			index?: number;
			content_block?: { type?: string; id?: string; name?: string };
			delta?: { type?: string; text?: string; partial_json?: string; thinking?: string };
			error?: { message?: string };
		};
		try {
			event = JSON.parse(line);
		} catch {
			continue;
		}
		if (event.type === 'error' || event.error) {
			throw new Error(event.error?.message ?? 'Provider error');
		}
		if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
			toolCallsMap.set(event.index ?? 0, { id: event.content_block.id ?? '', name: event.content_block.name ?? '', arguments: '' });
			continue;
		}
		if (event.type === 'content_block_delta') {
			if (event.delta?.type === 'text_delta' && event.delta.text) {
				fullText += event.delta.text;
				await callback(fullText, { text: event.delta.text });
			} else if (event.delta?.type === 'thinking_delta' && event.delta.thinking) {
				await callback(fullText, { reasoningContent: event.delta.thinking });
			} else if (event.delta?.type === 'input_json_delta' && event.delta.partial_json !== undefined) {
				const existing = toolCallsMap.get(event.index ?? 0);
				if (existing) {
					existing.arguments += event.delta.partial_json;
				}
			}
			continue;
		}
		if (event.type === 'message_stop') {
			emitAccumulatedToolCalls(toolCallsMap, fullText, callback, log);
		}
	}
	emitAccumulatedToolCalls(toolCallsMap, fullText, callback, log);
}

// ─── Shared SSE line iterator ───────────────────────────────────────────────────

async function* iterateSSELines(
	body: NodeJS.ReadableStream,
	token: vscode.CancellationToken,
): AsyncGenerator<string> {
	const decoder = new TextDecoder('utf-8');
	let buffer = '';
	for await (const chunk of body) {
		if (token.isCancellationRequested) {
			return;
		}
		buffer += decoder.decode(chunk as Buffer, { stream: true });
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';
		for (const line of lines) {
			if (!line.startsWith('data: ')) {
				continue;
			}
			const data = line.slice(6).trim();
			if (data) {
				yield data;
			}
		}
	}
}
