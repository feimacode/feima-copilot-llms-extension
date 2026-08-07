/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as http from 'http';
import * as vscode from 'vscode';
import { makeId, startSSE, writeJSON, writeSSEEvent, RouteHandler } from './proxyServer';
import { ILogService } from '../../../platform/log/common/logService';

// ---------------------------------------------------------------------------
// Minimal type shapes for OpenAI Chat Completions API
// ---------------------------------------------------------------------------

interface ChatCompletionsMessage {
	role: 'system' | 'user' | 'assistant' | 'tool';
	content: string | null;
	tool_calls?: Array<{
		id: string;
		type: 'function';
		function: { name: string; arguments: string };
	}>;
	tool_call_id?: string;
}

interface ChatCompletionsTool {
	type: 'function';
	function: {
		name: string;
		description?: string;
		parameters?: object;
	};
}

interface ChatCompletionsRequest {
	model: string;
	messages: ChatCompletionsMessage[];
	tools?: ChatCompletionsTool[];
	tool_choice?: string | object;
	max_tokens?: number;
	temperature?: number;
	stream?: boolean;
	reasoning_effort?: string;
	[key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Model encoding: parse "vendor/modelId" format for precise proxy lookup
// ---------------------------------------------------------------------------

interface ParsedModel {
	vendor: string | null;
	modelId: string;
}

function parseModelEncoding(raw: string): ParsedModel {
	const idx = raw.indexOf('/');
	if (idx !== -1) {
		return { vendor: raw.slice(0, idx), modelId: raw.slice(idx + 1) };
	}
	return { vendor: null, modelId: raw };
}

// ---------------------------------------------------------------------------
// Streaming handler
// ---------------------------------------------------------------------------

async function streamChatCompletionsSSE(
	res: http.ServerResponse,
	vsResponse: vscode.LanguageModelChatResponse,
	modelId: string,
	ctsToken: vscode.CancellationToken,
	log: ILogService,
): Promise<void> {
	const id = makeId('chatcmpl');
	const created = Math.floor(Date.now() / 1000);
	let reasoningIndex = 0;

	const sendDelta = (delta: Record<string, unknown>, finishReason?: string) => {
		const chunk: Record<string, unknown> = {
			id,
			object: 'chat.completion.chunk',
			created,
			model: modelId,
			choices: [{
				index: 0,
				delta,
				...(finishReason ? { finish_reason: finishReason } : {}),
			}],
		};
		writeSSEEvent(res, chunk);
	};

	try {
		for await (const part of vsResponse.stream) {
			if (ctsToken.isCancellationRequested) { break; }

			if (part instanceof vscode.LanguageModelTextPart) {
				// Text content → standard content delta
				sendDelta({ content: part.value });
			} else if (part instanceof vscode.LanguageModelToolCallPart) {
				// Tool call → delta.tool_calls
				sendDelta({
					tool_calls: [{
						index: 0,
						id: part.callId,
						type: 'function',
						function: {
							name: part.name,
							arguments: JSON.stringify(part.input),
						},
					}],
				});
			} else if (part instanceof vscode.LanguageModelDataPart) {
				// Usage data part
				if (part.mimeType === 'application/vnd.vscode.lm.usage') {
					try {
						const usage = JSON.parse(new TextDecoder().decode(part.data)) as { outputTokens?: number; inputTokens?: number };
						log.debug(`chat completions usage: in=${usage.inputTokens ?? '?'} out=${usage.outputTokens ?? '?'}`);
					} catch { /* ignore */ }
				}
			} else {
				// Check for thinking/reasoning parts
				const ThinkingPartCtor = (vscode as unknown as Record<string, unknown>)['LanguageModelThinkingPart'] as (new (...args: unknown[]) => unknown) | undefined;
				if (ThinkingPartCtor && part instanceof ThinkingPartCtor) {
					const thinkPart = part as { value?: string };
					const thinkText = thinkPart.value ?? '';
					if (thinkText) {
						// Reasoning content → delta.reasoning_content (OpenAI standard)
						log.debug(`chat completions reasoning delta[${reasoningIndex++}]: ${thinkText.slice(0, 80)}`);
						sendDelta({ reasoning_content: thinkText });
					}
				}
			}
		}
	} catch (err) {
		log.error(err instanceof Error ? err : String(err), 'chat completions stream error');
		const errMsg = err instanceof Error ? err.message : String(err);
		// Surface error as content so the user sees it
		sendDelta({ content: `\n\n⚠️ ${errMsg}` });
	}

	// Final chunk with finish_reason
	sendDelta({}, 'stop');
	res.end();
}

// ---------------------------------------------------------------------------
// Non-streaming handler
// ---------------------------------------------------------------------------

async function collectChatCompletionsResponse(
	vsResponse: vscode.LanguageModelChatResponse,
	modelId: string,
	ctsToken: vscode.CancellationToken,
	log: ILogService,
): Promise<object> {
	const id = makeId('chatcmpl');
	const created = Math.floor(Date.now() / 1000);
	let content = '';
	const toolCalls: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> = [];

	try {
		for await (const part of vsResponse.stream) {
			if (ctsToken.isCancellationRequested) { break; }
			if (part instanceof vscode.LanguageModelTextPart) {
				content += part.value;
			} else if (part instanceof vscode.LanguageModelToolCallPart) {
				toolCalls.push({
					id: part.callId,
					type: 'function' as const,
					function: { name: part.name, arguments: JSON.stringify(part.input) },
				});
			}
		}
	} catch (err) {
		log.error(err instanceof Error ? err : String(err), 'chat completions collect error');
	}

	const message: Record<string, unknown> = {
		role: 'assistant',
		content: content || null,
	};
	if (toolCalls.length > 0) {
		message.tool_calls = toolCalls;
	}

	return {
		id,
		object: 'chat.completion',
		created,
		model: modelId,
		choices: [{
			index: 0,
			message,
			finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
		}],
	};
}

// ---------------------------------------------------------------------------
// Main handler factory
// ---------------------------------------------------------------------------

export function createChatCompletionsHandler(log: ILogService): RouteHandler {
	return async (_req: http.IncomingMessage, res: http.ServerResponse, body: unknown) => {
		const req = body as ChatCompletionsRequest;
		log.debug(`→ POST /v1/chat/completions model=${req.model} stream=${req.stream !== false} tools=${Array.isArray(req.tools) ? req.tools.length : 0} messages=${req.messages?.length ?? '?'}`);

		if (!req.model) {
			writeJSON(res, 400, { error: { message: '`model` field is required' } });
			return;
		}
		if (!Array.isArray(req.messages) || req.messages.length === 0) {
			writeJSON(res, 400, { error: { message: '`messages` array is required and must not be empty' } });
			return;
		}

		// Model lookup — consumer may encode as "vendor/modelId"
		const parsedModel = parseModelEncoding(req.model);
		const modelSelector: vscode.LanguageModelChatSelector = parsedModel.vendor
			? { vendor: parsedModel.vendor, id: parsedModel.modelId }
			: { id: parsedModel.modelId };
		let models = await vscode.lm.selectChatModels(modelSelector);
		if (models.length === 0 && parsedModel.vendor) {
			models = await vscode.lm.selectChatModels({ id: parsedModel.modelId });
		}
		log.debug(`model lookup '${req.model}' → ${models.length} match(es)`);
		if (models.length === 0) {
			writeJSON(res, 404, { error: { message: `Model '${req.model}' not found` } });
			return;
		}
		const model = models.find(m => m.vendor === 'copilot') ?? models[0];

		// Convert messages
		const messages: vscode.LanguageModelChatMessage[] = [];
		for (const msg of req.messages) {
			if (msg.role === 'system') {
				messages.push(vscode.LanguageModelChatMessage.User(msg.content ?? ''));
			} else if (msg.role === 'assistant') {
				const parts: Array<vscode.LanguageModelTextPart | vscode.LanguageModelToolCallPart> = [];
				if (msg.content) {
					parts.push(new vscode.LanguageModelTextPart(msg.content));
				}
				if (msg.tool_calls) {
					for (const tc of msg.tool_calls) {
						let parsedArgs: object;
						try { parsedArgs = JSON.parse(tc.function.arguments) as object; } catch { parsedArgs = {}; }
						parts.push(new vscode.LanguageModelToolCallPart(tc.id, tc.function.name, parsedArgs));
					}
				}
				messages.push(vscode.LanguageModelChatMessage.Assistant(parts.length > 0 ? parts : ''));
			} else if (msg.role === 'tool' && msg.tool_call_id) {
				// Tool results must carry a LanguageModelToolResultPart with matching
				// callId for the Feima API's validation pass.
				messages.push(vscode.LanguageModelChatMessage.User([
					new vscode.LanguageModelToolResultPart(msg.tool_call_id, [
						new vscode.LanguageModelTextPart(msg.content ?? ''),
					]),
				]));
			} else {
				messages.push(vscode.LanguageModelChatMessage.User(msg.content ?? ''));
			}
		}

		// Convert tools
		const options: vscode.LanguageModelChatRequestOptions = {};
		if (Array.isArray(req.tools) && req.tools.length > 0) {
			options.tools = req.tools.map(t => ({
				name: t.function.name,
				description: t.function.description ?? '',
				inputSchema: (t.function.parameters && typeof t.function.parameters === 'object'
					? (t.function.parameters as Record<string, unknown>)
					: {}),
			} as vscode.LanguageModelChatTool));
		}

		const cts = new vscode.CancellationTokenSource();
		_req.on('close', () => cts.cancel());

		let vsResponse: vscode.LanguageModelChatResponse;
		try {
			log.debug(`sendRequest model=${model.id} messages=${messages.length}`);
			vsResponse = await model.sendRequest(messages, options, cts.token);
		} catch (err) {
			log.error(err instanceof Error ? err : String(err), 'sendRequest error');
			cts.dispose();
			const errMsg = err instanceof Error ? err.message : String(err);
			if (req.stream !== false) {
				startSSE(res);
				writeSSEEvent(res, {
					id: makeId('chatcmpl'),
					object: 'chat.completion.chunk',
					created: Math.floor(Date.now() / 1000),
					model: model.id,
					choices: [{ index: 0, delta: { content: `\n\n⚠️ ${errMsg}` }, finish_reason: 'stop' }],
				});
				res.end();
			} else {
				writeJSON(res, 500, { error: { message: errMsg } });
			}
			return;
		}

		if (req.stream !== false) {
			startSSE(res);
			await streamChatCompletionsSSE(res, vsResponse, model.id, cts.token, log);
		} else {
			const result = await collectChatCompletionsResponse(vsResponse, model.id, cts.token, log);
			writeJSON(res, 200, result);
		}
		cts.dispose();
	};
}
