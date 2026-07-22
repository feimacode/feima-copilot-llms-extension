/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as http from 'http';
import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { makeId, startSSE, writeJSON, writeSSEEvent, RouteHandler } from './proxyServer';

// ---------------------------------------------------------------------------
// Minimal type shapes for OpenAI Responses API (no SDK dependency)
// ---------------------------------------------------------------------------

interface ResponsesContentPart {
	type: 'input_text' | 'output_text' | 'input_image' | 'refusal' | string;
	text?: string;
	image_url?: string;
	detail?: string;
	refusal?: string;
}

interface ResponsesMessageItem {
	type: 'message';
	role: 'user' | 'assistant' | 'system' | 'developer';
	content: ResponsesContentPart[];
}

interface ResponsesFunctionCallItem {
	type: 'function_call';
	call_id: string;
	name: string;
	arguments: string;
}

interface ResponsesFunctionCallOutputItem {
	type: 'function_call_output';
	call_id: string;
	output: string;
}

interface ResponsesReasoningItem {
	type: 'reasoning';
	id?: string;
	encrypted_content?: string;
}

type ResponsesInputItem =
	| ResponsesMessageItem
	| ResponsesFunctionCallItem
	| ResponsesFunctionCallOutputItem
	| ResponsesReasoningItem
	| { type: string }; // fallback for unknown types

interface ResponsesFunctionTool {
	type: 'function';
	name: string;
	description?: string;
	parameters?: object;
	strict?: boolean;
}

interface ResponsesNamespaceTool {
	type: 'function';
	name: string;
	description?: string;
	parameters?: object;
	strict?: boolean;
}

interface ResponsesNamespace {
	type: 'namespace';
	name: string;
	description?: string;
	tools: ResponsesNamespaceTool[];
}

/**
 * The Responses API supports several other `type` values
 * (`tool_search`, `web_search`, `image_generation`, `freeform`, …) that
 * have no VS Code LM API equivalent. Model the open-ended field as
 * `{ type: string }` so unknown values don't get erased by the type
 * checker and are caught by the dropped-types warning instead.
 */
interface ResponsesUnknownTool {
	type: string;
	[key: string]: unknown;
}

type ResponsesToolEntry = ResponsesFunctionTool | ResponsesNamespace | ResponsesUnknownTool;

interface ResponsesRequest {
	model: string;
	input: ResponsesInputItem[];
	tools?: ResponsesToolEntry[];
	stream?: boolean;
	max_output_tokens?: number;
	reasoning?: { effort?: string; summary?: string };
	[key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Input conversion: Responses API input[] → vscode.LanguageModelChatMessage[]
// ---------------------------------------------------------------------------

function convertContentPart(part: ResponsesContentPart): vscode.LanguageModelTextPart | undefined {
	switch (part.type) {
		case 'input_text':
		case 'output_text':
			return new vscode.LanguageModelTextPart(part.text ?? '');
		case 'refusal':
			return new vscode.LanguageModelTextPart(`[Refusal] ${part.refusal ?? ''}`);
		case 'input_image':
			// Images not supported via VS Code LM API; use placeholder
			return new vscode.LanguageModelTextPart('[Image]');
		default:
			return undefined;
	}
}

export function convertInputToMessages(input: ResponsesInputItem[]): vscode.LanguageModelChatMessage[] {
	// First pass: index tool results by call_id so we can pair them with tool
	// calls even when assistant messages are interleaved between calls and outputs.
	// OpenAI Responses API allows arbitrary interleaving; VS Code LM API requires
	// every Assistant[toolCall] message to be immediately followed by a User message
	// containing the matching tool results.
	const pendingResults = new Map<string, ResponsesFunctionCallOutputItem>();
	for (const item of input) {
		if (item.type === 'function_call_output') {
			const fco = item as ResponsesFunctionCallOutputItem;
			pendingResults.set(fco.call_id, fco);
		}
	}
	const consumedResults = new Set<string>();

	const messages: vscode.LanguageModelChatMessage[] = [];
	let i = 0;

	while (i < input.length) {
		const item = input[i];

		// Drop reasoning and unknown items
		if (item.type === 'reasoning' || (item.type !== 'message' && item.type !== 'function_call' && item.type !== 'function_call_output')) {
			i++;
			continue;
		}

		if (item.type === 'message') {
			const msg = item as ResponsesMessageItem;
			const parts = msg.content.map(convertContentPart).filter((p): p is vscode.LanguageModelTextPart => p !== undefined);
			if (msg.role === 'user' || msg.role === 'system' || msg.role === 'developer') {
				// developer/system roles have no VS Code equivalent — treat as User so
				// the conversation doesn't start with an Assistant message.
				messages.push(vscode.LanguageModelChatMessage.User(parts.length > 0 ? parts : ''));
			} else {
				messages.push(vscode.LanguageModelChatMessage.Assistant(parts.length > 0 ? parts : ''));
			}
			i++;
		} else if (item.type === 'function_call') {
			// Collect consecutive function_call items.
			const toolParts: vscode.LanguageModelToolCallPart[] = [];
			while (i < input.length && input[i].type === 'function_call') {
				const fc = input[i] as ResponsesFunctionCallItem;
				let parsedArgs: object;
				try { parsedArgs = JSON.parse(fc.arguments) as object; } catch { parsedArgs = {}; }
				toolParts.push(new vscode.LanguageModelToolCallPart(fc.call_id, fc.name, parsedArgs));
				i++;
			}

			// Look up the matching results by call_id and emit them immediately after
			// the tool calls, regardless of where they appear in the input array.
			const resultParts: vscode.LanguageModelToolResultPart[] = [];
			for (const tc of toolParts) {
				const fco = pendingResults.get(tc.callId);
				if (fco) {
					resultParts.push(new vscode.LanguageModelToolResultPart(fco.call_id, [
						new vscode.LanguageModelTextPart(fco.output),
					]));
					consumedResults.add(fco.call_id);
				}
			}

			if (toolParts.length > 0) {
				messages.push(vscode.LanguageModelChatMessage.Assistant(toolParts));
			}
			if (resultParts.length > 0) {
				messages.push(vscode.LanguageModelChatMessage.User(resultParts));
			}
		} else if (item.type === 'function_call_output') {
			const fco = item as ResponsesFunctionCallOutputItem;
			if (consumedResults.has(fco.call_id)) {
				// Already emitted when its matching function_call was processed.
				i++;
				continue;
			}
			// Orphan output without a matching function_call in the input.
			const results: vscode.LanguageModelToolResultPart[] = [];
			while (i < input.length && input[i].type === 'function_call_output') {
				const fco2 = input[i] as ResponsesFunctionCallOutputItem;
				if (!consumedResults.has(fco2.call_id)) {
					results.push(new vscode.LanguageModelToolResultPart(fco2.call_id, [
						new vscode.LanguageModelTextPart(fco2.output),
					]));
				}
				i++;
			}
			if (results.length > 0) {
				messages.push(vscode.LanguageModelChatMessage.User(results));
			}
		} else {
			i++;
		}
	}

	// VS Code LM API rejects conversations that start with an Assistant message.
	// This happens when Codex replays tool-call history at the start of the input.
	// Prepend a minimal User message to satisfy the constraint.
	if (messages.length > 0 && messages[0].role !== 1 /* User */) {
		messages.unshift(vscode.LanguageModelChatMessage.User('(continuing)'));
	}

	return messages;
}

// ---------------------------------------------------------------------------
// Tools conversion
// ---------------------------------------------------------------------------

/**
 * Result of converting Responses API `tools[]` to the VS Code LM API shape.
 *
 * `tools` — the flattened LM tool list (namespaces are inlined as `ns__name`).
 * `nameToNs` — maps a flat name back to its original `{ namespace, name }`
 * pair, or `null` if the tool was never a namespace child. Namespace tools
 * must be re-split when serializing function calls in the SSE output so
 * Codex matches the original `ToolName { namespace, name }` registration.
 */
const HARD_TOOL_LIMIT = 128;
const HIGH_PRIORITY_TOOL_NAMES = new Set([
	'readFile',
	'writeFile',
	'replaceInFile',
	'listDirectory',
	'fileSearch',
	'searchContent',
	'vscode_editFile_internal',
	'vscode_editFile',
	'copilot_editFiles',
	'runInTerminal',
	'exec_command',
	'create_directory',
	'get_terminal_output',
	'manage_todo_list',
]);

interface ConvertedTools {
	tools: vscode.LanguageModelChatTool[];
	/** Maps flat name → `{ namespace, name }`, or `null` for top-level tools. */
	nameToNs: Map<string, { namespace: string; name: string } | null>;
}

function extractQueryText(messages: vscode.LanguageModelChatMessage[]): string {
	return messages
		.filter(m => m.role === 1)
		.map(m => {
			if (typeof m.content === 'string') {
				return m.content;
			}
			return m.content
				.map(part => part instanceof vscode.LanguageModelTextPart ? part.value : '')
				.join(' ');
		})
		.join(' ');
}

function scoreToolRelevance(tool: vscode.LanguageModelChatTool, query: string): number {
	const queryLower = query.toLowerCase();
	const nameLower = tool.name.toLowerCase();
	const descLower = (tool.description ?? '').toLowerCase();
	let score = 0;

	if (HIGH_PRIORITY_TOOL_NAMES.has(tool.name)) {
		score += 50;
	}

	if (queryLower.includes(nameLower)) {
		score += 10;
	}

	const keywordGroups: Array<{ keywords: string[]; nameKeywords: string[]; bonus: number }> = [
		{ keywords: ['create', 'write', 'save', 'new', 'make'], nameKeywords: ['create', 'write', 'save'], bonus: 10 },
		{ keywords: ['read', 'show', 'display', 'get', 'open'], nameKeywords: ['read', 'get', 'list', 'show', 'open'], bonus: 8 },
		{ keywords: ['edit', 'modify', 'change', 'update', 'replace'], nameKeywords: ['edit', 'replace', 'apply', 'insert'], bonus: 10 },
		{ keywords: ['search', 'find', 'lookup', 'grep'], nameKeywords: ['search', 'find', 'grep'], bonus: 8 },
		{ keywords: ['terminal', 'command', 'run', 'execute', 'shell'], nameKeywords: ['terminal', 'run', 'execute', 'shell'], bonus: 8 },
	];

	for (const group of keywordGroups) {
		if (group.keywords.some(keyword => queryLower.includes(keyword))) {
			if (group.nameKeywords.some(keyword => nameLower.includes(keyword))) {
				score += group.bonus;
			}
		}
	}

	if (descLower) {
		for (const word of queryLower.split(/\s+/)) {
			if (word.length > 3 && descLower.includes(word)) {
				score += 1;
			}
		}
	}

	return score;
}

function filterTools(tools: vscode.LanguageModelChatTool[], query: string, log: ILogService, maxTools: number = HARD_TOOL_LIMIT): vscode.LanguageModelChatTool[] {
	if (tools.length <= maxTools) {
		return tools;
	}

	const scored = tools.map(tool => ({ tool, score: scoreToolRelevance(tool, query) }));
	scored.sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name));

	const selected = scored.slice(0, maxTools).map(entry => entry.tool);
	const dropped = scored.slice(maxTools).map(entry => entry.tool.name);
	log.warn(`filtered ${tools.length} tools down to ${maxTools}; dropped ${dropped.length} tools: ${dropped.slice(0, 20).join(', ')}${dropped.length > 20 ? ', ...' : ''}`);
	return selected;
}

/**
 * Convert OpenAI Responses API `tools[]` entries to VS Code LM API
 * `LanguageModelChatTool[]` with a bidirectional name map for the SSE round-trip.
 *
 * The Responses API supports a richer tool vocabulary than the VS Code LM
 * API's flat `LanguageModelChatTool`:
 *
 * - `{"type":"function", name, description, parameters, strict}` — direct
 * - `{"type":"namespace", name, description, tools: [...]}` — a folder of
 *   related functions (Codex multi-agent tools, MCP namespaces, etc.)
 * - `{"type":"tool_search", ...}` — deferred-tool discovery shim
 * - `{"type":"web_search", ...}` / `{"type":"image_generation", ...}` —
 *   hosted Responses tools (no LM-API equivalent, drop with a warning)
 *
 * VS Code's `LanguageModelChatTool` has no namespace concept, so we flatten
 * namespace children to `ns__tool` names using the same double-underscore
 * separator Codex uses for MCP tool names. The reverse map lets the SSE
 * output split them back to `namespace`/`name` so `ToolRouter::build_tool_call`
 * matches the original dynamic tool registration.
 */
function convertTools(tools: ResponsesToolEntry[], log: ILogService): ConvertedTools {
	const out: vscode.LanguageModelChatTool[] = [];
	const nameToNs = new Map<string, { namespace: string; name: string } | null>();
	const droppedTypes: Record<string, number> = {};

	for (const t of tools) {
		if (!t || typeof t !== 'object') { continue; }
		// Read `type` as a local string so the union narrowing below can
		// distinguish known vs unknown tool shapes without erasing the
		// open-ended field.
		const toolType = typeof t.type === 'string' ? t.type : '';

		if (toolType === 'function') {
			const fn = t as ResponsesFunctionTool;
			if (!fn.name) { continue; }
			out.push({
				name: fn.name,
				description: fn.description ?? '',
				inputSchema: (fn.parameters && typeof fn.parameters === 'object'
					? (fn.parameters as Record<string, unknown>)
					: {}),
			});
			// Not a namespace tool — record as top-level.
			nameToNs.set(fn.name, null);
			continue;
		}

		if (toolType === 'namespace') {
			const ns = t as ResponsesNamespace;
			const nsName = ns.name || 'ns';
			for (const child of ns.tools ?? []) {
				if (!child || child.type !== 'function' || !child.name) { continue; }
				const flatName = `${nsName}__${child.name}`;
				out.push({
					name: flatName,
					description: child.description ?? ns.description ?? '',
					inputSchema: (child.parameters && typeof child.parameters === 'object'
						? (child.parameters as Record<string, unknown>)
						: {}),
				});
				nameToNs.set(flatName, { namespace: nsName, name: child.name });
			}
			continue;
		}

		// Other tool types (tool_search, web_search, image_generation, freeform)
		// have no VS Code LM API equivalent — count and drop with a warning.
		if (toolType) {
			droppedTypes[toolType] = (droppedTypes[toolType] ?? 0) + 1;
		}
	}

	if (Object.keys(droppedTypes).length > 0) {
		log.warn(`dropped unsupported tool types: ${JSON.stringify(droppedTypes)}`);
	}

	return { tools: out, nameToNs };
}

/**
 * Given a flat tool name from the LM, return the `{ namespace, name }` pair
 * for the SSE `function_call` output. Returns `null` for top-level tools
 * (no namespace).
 */
function splitToolName(
	nameToNs: Map<string, { namespace: string; name: string } | null>,
	flatName: string,
): { namespace?: string; name: string } {
	const mapped = nameToNs.get(flatName);
	if (mapped) {
		return { namespace: mapped.namespace, name: mapped.name };
	}
	// Fallback: unknown tool name, emit as plain top-level name.
	return { name: flatName };
}

// ---------------------------------------------------------------------------
// Output: VS Code stream → Responses API SSE
// ---------------------------------------------------------------------------

async function streamResponsesSSE(
	res: http.ServerResponse,
	vsResponse: vscode.LanguageModelChatResponse,
	modelId: string,
	nameToNs: Map<string, { namespace: string; name: string } | null>,
	token: vscode.CancellationToken,
	log: ILogService,
): Promise<void> {
	const responseId = makeId('resp');
	const messageItemId = makeId('msg');

	const ThinkingPartCtor = (vscode as unknown as Record<string, unknown>)['LanguageModelThinkingPart'] as (new (...args: unknown[]) => unknown) | undefined;

	startSSE(res);

	// Phase 1: Setup events
	const baseResponse = { id: responseId, object: 'realtime.response', status: 'in_progress', model: modelId, output: [], usage: null };
	writeSSEEvent(res, { type: 'response.created', response: baseResponse });
	writeSSEEvent(res, { type: 'response.in_progress', response: baseResponse });

	// Open the message output item
	let outputIndex = 0;
	const msgOutputIndex = outputIndex;
	writeSSEEvent(res, {
		type: 'response.output_item.added',
		output_index: msgOutputIndex,
		item: { id: messageItemId, type: 'message', status: 'in_progress', role: 'assistant', content: [] },
	});

	// Open the text content part
	const contentIndex = 0;
	const textContentIndex = contentIndex;
	let textContentOpen = false;
	let accumulatedText = '';

	const openTextContent = () => {
		if (textContentOpen) { return; }
		textContentOpen = true;
		writeSSEEvent(res, {
			type: 'response.content_part.added',
			item_id: messageItemId,
			output_index: msgOutputIndex,
			content_index: textContentIndex,
			part: { type: 'output_text', text: '' },
		});
	};

	const closeTextContent = () => {
		if (!textContentOpen) { return; }
		textContentOpen = false;
		writeSSEEvent(res, {
			type: 'response.output_text.done',
			item_id: messageItemId,
			output_index: msgOutputIndex,
			content_index: textContentIndex,
			text: accumulatedText,
		});
		writeSSEEvent(res, {
			type: 'response.content_part.done',
			item_id: messageItemId,
			output_index: msgOutputIndex,
			content_index: textContentIndex,
			part: { type: 'output_text', text: accumulatedText },
		});
	};

	// Track reasoning item state (reserved for future reasoning support)
	const _reasoningItemId: string | null = null;
	const _reasoningOutputIndex = 0;
	const _reasoningSummaryIndex = 0;
	let reasoningContentIndex = 0;

	// Track tool call output items
	const toolCallItems: Array<{ id: string; call_id: string; name: string; arguments: string; output_index: number }> = [];
	outputIndex++; // tool calls start at outputIndex 1+

	let usageInputTokens = 0;
	let usageOutputTokens = 0;
	let _stopReason = 'stop';
	let partCount = 0;
	let streamError: Error | null = null;

	try {
		for await (const part of vsResponse.stream) {
			if (token.isCancellationRequested) { break; }
			const partType = (part as { constructor?: { name?: string } }).constructor?.name ?? typeof part;
			const isText = part instanceof vscode.LanguageModelTextPart;
			const isToolCall = part instanceof vscode.LanguageModelToolCallPart;
			const isData = part instanceof vscode.LanguageModelDataPart;
			const isThinking = ThinkingPartCtor ? part instanceof ThinkingPartCtor : false;
			if (partCount < 5) {
				log.debug(`stream part[${partCount}] type=${partType} isText=${isText} isTool=${isToolCall} isData=${isData} isThinking=${isThinking}${isText ? ' ' + (part as vscode.LanguageModelTextPart).value.slice(0, 60) : ''}`);
			}
			partCount++;

			if (isText) {
				openTextContent();
				accumulatedText += (part as vscode.LanguageModelTextPart).value;
				writeSSEEvent(res, {
					type: 'response.output_text.delta',
					item_id: messageItemId,
					output_index: msgOutputIndex,
					content_index: textContentIndex,
					delta: (part as vscode.LanguageModelTextPart).value,
				});
			} else if (isToolCall) {
				// Close text content before emitting tool calls
				closeTextContent();
				_stopReason = 'tool_calls';

				const toolPart = part as vscode.LanguageModelToolCallPart;
				const resolved = splitToolName(nameToNs, toolPart.name);
				const toolItemId = makeId('fc');
				const toolOutputIndex = outputIndex++;
				const argsJson = JSON.stringify(toolPart.input);

				writeSSEEvent(res, {
					type: 'response.output_item.added',
					output_index: toolOutputIndex,
					item: { id: toolItemId, type: 'function_call', status: 'in_progress', call_id: part.callId, name: resolved.name, namespace: resolved.namespace, arguments: '' },
				});
				writeSSEEvent(res, {
					type: 'response.function_call_arguments.delta',
					item_id: toolItemId,
					output_index: toolOutputIndex,
					delta: argsJson,
				});
				writeSSEEvent(res, {
					type: 'response.function_call_arguments.done',
					item_id: toolItemId,
					output_index: toolOutputIndex,
					name: resolved.name,
					namespace: resolved.namespace,
					arguments: argsJson,
				});
				writeSSEEvent(res, {
					type: 'response.output_item.done',
					output_index: toolOutputIndex,
					item: { id: toolItemId, type: 'function_call', status: 'completed', call_id: toolPart.callId, name: resolved.name, namespace: resolved.namespace, arguments: argsJson },
				});

				toolCallItems.push({ id: toolItemId, call_id: toolPart.callId, name: toolPart.name, arguments: argsJson, output_index: toolOutputIndex });
			} else if (isData) {
				const dataPart = part as vscode.LanguageModelDataPart;
				// Check for usage DataPart
				if (dataPart.mimeType === 'application/vnd.vscode.lm.usage') {
					try {
						const usage = JSON.parse(new TextDecoder().decode(dataPart.data)) as { inputTokens?: number; outputTokens?: number };
						usageInputTokens = usage.inputTokens ?? usageInputTokens;
						usageOutputTokens = usage.outputTokens ?? usageOutputTokens;
					} catch { /* ignore */ }
				}
			} else if (isThinking) {
				// Forward thinking parts as reasoning content deltas.
				// Codex's SSE parser REQUIRES `content_index` in
				// `response.reasoning_text.delta` — without it the
				// event is silently dropped (codex-api/src/sse/responses.rs:351).
				const thinkingPart = part as { value?: string };
				const thinkingText = thinkingPart.value ?? '';
				if (thinkingText) {
					log.debug(`reasoning_text.delta ci=${reasoningContentIndex}: ${thinkingText.slice(0, 80)}`);
					writeSSEEvent(res, {
						type: 'response.reasoning_text.delta',
						delta: thinkingText,
						content_index: reasoningContentIndex++,
					});
				}
			}
		}
	} catch (streamErr) {
		log.error(streamErr instanceof Error ? streamErr : String(streamErr), 'stream error');
		streamError = streamErr instanceof Error ? streamErr : new Error(String(streamErr));
	}
	log.debug(`stream iteration done, total parts=${partCount ?? 0}`);

	// Phase 3: Close message item
	closeTextContent();

	// If there was a stream error, send a failed response
	if (streamError) {
		writeSSEEvent(res, {
			type: 'response.failed',
			response: {
				id: responseId,
				object: 'realtime.response',
				status: 'failed',
				model: modelId,
				output: [],
				error: {
					type: 'server_error',
					code: 'stream_error',
					message: streamError.message,
				},
				usage: {
					input_tokens: usageInputTokens,
					output_tokens: usageOutputTokens,
					total_tokens: usageInputTokens + usageOutputTokens,
					output_tokens_details: { reasoning_tokens: 0 },
				},
			},
		});
		log.debug(`stream failed — error: ${streamError.message}`);
		res.end();
		return;
	}

	const outputContent = accumulatedText
		? [{ type: 'output_text', text: accumulatedText, annotations: [] }]
		: [];

	writeSSEEvent(res, {
		type: 'response.output_item.done',
		output_index: msgOutputIndex,
		item: { id: messageItemId, type: 'message', status: 'completed', role: 'assistant', content: outputContent },
	});

	// Final response.completed
	const finalOutput: unknown[] = [];
	if (accumulatedText) {
		finalOutput.push({ id: messageItemId, type: 'message', status: 'completed', role: 'assistant', content: outputContent });
	}
	for (const tc of toolCallItems) {
		finalOutput.push({ id: tc.id, type: 'function_call', status: 'completed', call_id: tc.call_id, name: tc.name, arguments: tc.arguments });
	}

	writeSSEEvent(res, {
		type: 'response.completed',
		response: {
			id: responseId,
			object: 'realtime.response',
			status: 'completed',
			model: modelId,
			output: finalOutput,
			usage: {
				input_tokens: usageInputTokens,
				output_tokens: usageOutputTokens,
				total_tokens: usageInputTokens + usageOutputTokens,
				output_tokens_details: { reasoning_tokens: 0 },
			},
		},
	});
	log.debug(`stream done — in=${usageInputTokens} out=${usageOutputTokens} total=${usageInputTokens + usageOutputTokens}`);
	res.end();
}

// ---------------------------------------------------------------------------
// Non-streaming response
// ---------------------------------------------------------------------------

async function collectResponsesResponse(
	vsResponse: vscode.LanguageModelChatResponse,
	modelId: string,
	nameToNs: Map<string, { namespace: string; name: string } | null>,
	token: vscode.CancellationToken,
	log: ILogService,
): Promise<object> {
	const responseId = makeId('resp');
	const messageItemId = makeId('msg');
	let text = '';
	const toolCalls: Array<{ id: string; call_id: string; namespace?: string; name: string; arguments: string }> = [];
	let streamError: Error | null = null;

	try {
		for await (const part of vsResponse.stream) {
			if (token.isCancellationRequested) { break; }
			if (part instanceof vscode.LanguageModelTextPart) {
				text += part.value;
			} else if (part instanceof vscode.LanguageModelToolCallPart) {
				const resolved = splitToolName(nameToNs, part.name);
				toolCalls.push({ id: makeId('fc'), call_id: part.callId, namespace: resolved.namespace, name: resolved.name, arguments: JSON.stringify(part.input) });
			}
		}
	} catch (err) {
		log.error(err instanceof Error ? err : String(err), 'collect stream error');
		streamError = err instanceof Error ? err : new Error(String(err));
	}

	// If there was a stream error, return a failed response object
	if (streamError) {
		return {
			id: responseId,
			object: 'realtime.response',
			status: 'failed',
			model: modelId,
			output: [],
			error: {
				type: 'server_error',
				code: 'stream_error',
				message: streamError.message,
			},
			usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
		};
	}

	const output: unknown[] = [];
	const content: unknown[] = [];
	if (text) { content.push({ type: 'output_text', text, annotations: [] }); }

	if (content.length > 0) {
		output.push({ id: messageItemId, type: 'message', status: 'completed', role: 'assistant', content });
	}
	for (const tc of toolCalls) {
		const fc: Record<string, unknown> = { id: tc.id, type: 'function_call', status: 'completed', call_id: tc.call_id, name: tc.name, arguments: tc.arguments };
		if (tc.namespace) { fc.namespace = tc.namespace; }
		output.push(fc);
	}

	return {
		id: responseId,
		object: 'realtime.response',
		status: 'completed',
		model: modelId,
		output,
		usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
	};
}

// ---------------------------------------------------------------------------
// Main handler factory
// ---------------------------------------------------------------------------

export function createResponsesHandler(log: ILogService): RouteHandler {
	return async (_req: http.IncomingMessage, res: http.ServerResponse, body: unknown) => {
		const req = body as ResponsesRequest;
		log.debug(`→ POST /v1/responses model=${req.model} stream=${req.stream !== false} tools=${Array.isArray(req.tools) ? req.tools.length : 0} input=${Array.isArray(req.input) ? req.input.length : '?'}`);
		if (!req.model) {
			writeJSON(res, 400, { error: { type: 'invalid_request_error', message: '`model` field is required' } });
			return;
		}
		if (!Array.isArray(req.input) || req.input.length === 0) {
			writeJSON(res, 400, { error: { type: 'invalid_request_error', message: '`input` array is required and must not be empty' } });
			return;
		}

		// Model lookup — consumer provides exact ID; prefer copilot vendor when multiple matches
		const models = await vscode.lm.selectChatModels({ id: req.model });
		log.debug(`model lookup '${req.model}' → ${models.length} match(es)${models.length ? ': ' + models.map(m => `${m.vendor}/${m.id}`).join(', ') : ''}`);
		if (models.length === 0) {
			writeJSON(res, 404, { error: { type: 'not_found_error', message: `Model '${req.model}' not found` } });
			return;
		}
		// Prefer copilot-vendor model; fall back to first match
		const model = models.find(m => m.vendor === 'copilot') ?? models[0];

		const messages = convertInputToMessages(req.input);
		log.debug(`input items (${req.input.length}): ${req.input.map((it: ResponsesInputItem, idx) => `${idx}:${it.type}${it.type === 'function_call' ? '(call_id=' + (it as ResponsesFunctionCallItem).call_id + ')' : ''}${it.type === 'function_call_output' ? '(call_id=' + (it as ResponsesFunctionCallOutputItem).call_id + ')' : ''}${it.type === 'message' ? '(' + (it as ResponsesMessageItem).role + ')' : ''}`).join(', ')}`);
		log.debug(`converted messages (${messages.length}): ${messages.map((m, idx) => {
			let roleName = 'unknown';
			if (m.role === 1) { roleName = 'User'; }
			if (m.role === 2) { roleName = 'Assistant'; }
			if (typeof m.content === 'string') { return `${idx}:${roleName}[text]`; }
			const partsDesc = m.content.map((p: unknown) => {
				if (p instanceof vscode.LanguageModelTextPart) { return `text("${p.value.slice(0, 40)}")`; }
				if (p instanceof vscode.LanguageModelToolCallPart) { return `toolCall(${p.callId}, ${p.name})`; }
				if (p instanceof vscode.LanguageModelToolResultPart) { return `toolResult(${p.callId})`; }
				return typeof p;
			}).join(', ');
			return `${idx}:${roleName}[${partsDesc}]`;
		}).join(', ')}`);
		if (messages.length === 0) {
			writeJSON(res, 400, { error: { type: 'invalid_request_error', message: 'No messages could be derived from `input`' } });
			return;
		}

		const options: vscode.LanguageModelChatRequestOptions = {};
		let nameToNs = new Map<string, { namespace: string; name: string } | null>();
		if (Array.isArray(req.tools) && req.tools.length > 0) {
			// Hand the full list to convertTools so namespace tools are
			// flattened into the LM API's flat LanguageModelChatTool shape.
			// The returned nameToNs map is used by the SSE output to
			// reconstruct `namespace`/`name` pairs for Codex's ToolRouter.
			const typeBreakdown: Record<string, number> = {};
			for (const t of req.tools) {
				if (t && typeof t === 'object' && typeof t.type === 'string') {
					typeBreakdown[t.type] = (typeBreakdown[t.type] ?? 0) + 1;
				}
			}
			log.debug(`tools inbound: ${req.tools.length} (${JSON.stringify(typeBreakdown)})`);
			const converted = convertTools(req.tools, log);
			nameToNs = converted.nameToNs;
			log.debug(`tools after convert: ${converted.tools.length}`);
			if (converted.tools.length > HARD_TOOL_LIMIT) {
				const queryText = extractQueryText(messages);
				const filtered = filterTools(converted.tools, queryText, log, HARD_TOOL_LIMIT);
				const filteredNames = new Set(filtered.map(t => t.name));
				nameToNs = new Map(Array.from(nameToNs.entries()).filter(([name]) => filteredNames.has(name)));
				log.debug(`filtered tools down to ${filtered.length}`);
				options.tools = filtered;
			} else {
				options.tools = converted.tools;
			}
			if (options.tools.length > 0) {
				log.debug(`tools[0] sample: ${JSON.stringify(options.tools[0]).slice(0, 300)}`);
				log.debug(`tools list: ${options.tools.map(t => t.name).join(', ')}`);
			}
		}

		const cts = new vscode.CancellationTokenSource();
		_req.on('close', () => cts.cancel());

		let vsResponse: vscode.LanguageModelChatResponse;
		try {
			log.debug(`sendRequest model=${model.id} messages=${messages.length} firstRole=${messages[0]?.role}`);
			vsResponse = await model.sendRequest(messages, options, cts.token);
		} catch (err) {
			log.error(err instanceof Error ? err : String(err), 'sendRequest error');
			cts.dispose();
			const errMsg = err instanceof Error ? err.message : String(err);
			// For streaming requests, send a SSE error event instead of plain JSON
			if (req.stream !== false) {
				startSSE(res);
				const responseId = makeId('resp');
				writeSSEEvent(res, {
					type: 'response.failed',
					response: {
						id: responseId,
						object: 'realtime.response',
						status: 'failed',
						model: model.id,
						output: [],
						error: {
							type: 'server_error',
							code: 'send_request_failed',
							message: errMsg,
						},
					},
				});
				res.end();
			} else {
				writeJSON(res, 500, { error: { type: 'server_error', message: errMsg } });
			}
			return;
		}

		if (req.stream !== false) {
			await streamResponsesSSE(res, vsResponse, model.id, nameToNs, cts.token, log);
		} else {
			const result = await collectResponsesResponse(vsResponse, model.id, nameToNs, cts.token, log);
			writeJSON(res, 200, result);
		}

		cts.dispose();
	};
}

/** Handler for GET /v1/models — returns available models in OpenAI format. */
export function createResponsesModelsHandler(_log: ILogService): RouteHandler {
	return async (_req, res) => {
		const models = await vscode.lm.selectChatModels();
		writeJSON(res, 200, {
			object: 'list',
			data: models.map(m => ({
				id: m.id,
				object: 'model',
				created: 0,
				owned_by: m.vendor,
			})),
		});
	};
}
