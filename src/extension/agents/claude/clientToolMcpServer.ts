/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * In-process client-tool MCP server that exposes `vscode.lm.tools` (via the
 * shared `DynamicToolManager` — see ../common/tools/dynamicToolManager.ts,
 * also used by @codex/@copilot-cli) to the Claude Agent SDK.
 *
 * `createSdkMcpServer()` + `tool()` is the SDK's only client-tool injection
 * surface — its `Options.mcpServers` union also carries fully-serializable
 * stdio/SSE/HTTP configs for settings-based MCP servers (see
 * claudeParticipant.ts's `getEffectiveMcpServers()` merge), which is a
 * separate, orthogonal mechanism from this one.
 *
 * Each tool's handler routes straight through `vscode.lm.invokeTool()` using
 * whichever turn context `getTurnContext()` currently returns. The server is
 * built fresh per turn (tools can change between turns) but its instance may
 * be reused across a WarmQuery session's later turns, so handlers must never
 * capture a single request/token pair by value.
 *
 * @module clientToolMcpServer
 */

import * as vscode from 'vscode';
import { createSdkMcpServer, tool, type McpSdkServerConfigWithInstance } from '@anthropic-ai/claude-agent-sdk';
import { z, type ZodTypeAny } from 'zod';
import type { DynamicToolManager } from '../common/tools/dynamicToolManager';
import { ILogService } from '../../platform/log/common/logService';

/** MCP server name registered under `Options.mcpServers` — tools surface to
 *  the model (and to `canUseTool`) as `mcp__vscode-tools__<toolName>`. */
export const CLAUDE_TOOL_SERVER_NAME = 'vscode-tools';

/** Per-turn context that MCP tool handlers need to call back into VS Code. */
export interface ClaudeTurnContext {
	request: vscode.ChatRequest;
	token: vscode.CancellationToken;
}

export interface ClientToolMcpServerBuild {
	server: McpSdkServerConfigWithInstance;
	/** Tool names baked into `server`, for WarmQuery staleness detection. */
	toolNames: readonly string[];
}

/**
 * Discover this turn's dynamic tools (via `toolManager`, participant id
 * `'claude'`) and build an in-process SDK MCP server whose handlers route
 * through `vscode.lm.invokeTool()`.
 *
 * Returns `undefined` when there are no tools to expose, so the caller omits
 * the `mcpServers` entry entirely.
 */
export async function buildClientToolMcpServer(
	toolManager: DynamicToolManager,
	getTurnContext: () => ClaudeTurnContext | undefined,
	log: ILogService,
): Promise<ClientToolMcpServerBuild | undefined> {
	const specs = await toolManager.buildDynamicTools('claude');
	if (specs.length === 0) {
		return undefined;
	}

	const tools = specs.map(spec => tool(
		spec.name,
		spec.description,
		jsonSchemaToZodRawShape(spec.inputSchema),
		async (args) => {
			const turn = getTurnContext();
			if (!turn || turn.token.isCancellationRequested) {
				return { isError: true, content: [{ type: 'text' as const, text: 'No active chat turn.' }] };
			}
			try {
				const result = await vscode.lm.invokeTool(spec.name, {
					input: args,
					toolInvocationToken: turn.request.toolInvocationToken,
				}, turn.token);
				return { content: toMcpContent(result.content) };
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				log.warn(`vscode.lm.invokeTool("${spec.name}") failed: ${message}`);
				// Same "manifest-only, no runtime implementation" signal @codex/
				// @copilot-cli already handle via DynamicToolManager.markUninvokable.
				if (message.includes('does not have an implementation registered')) {
					toolManager.markUninvokable(spec.name);
				}
				return { isError: true, content: [{ type: 'text' as const, text: message }] };
			}
		},
	));

	log.debug(`client-tool MCP server built with ${tools.length} tool(s): ${specs.map(s => s.name).join(', ')}`);
	return {
		server: createSdkMcpServer({ name: CLAUDE_TOOL_SERVER_NAME, tools }),
		toolNames: specs.map(s => s.name),
	};
}

// ─── Result mapping ───────────────────────────────────────────────────────────

/** `LanguageModelToolResultPart[]` → MCP `CallToolResult['content']`. */
function toMcpContent(parts: readonly unknown[]): Array<{ type: 'text'; text: string }> {
	return parts.map(part => ({
		type: 'text' as const,
		text: typeof part === 'object' && part !== null && 'value' in part
			? String((part as { value: unknown }).value)
			: JSON.stringify(part),
	}));
}

// ─── JSON Schema → Zod conversion ─────────────────────────────────────────────
// Ported from VS Code production's claudeJsonSchemaToZod.ts
// (vscode/src/vs/platform/agentHost/node/claude/clientTools/claudeJsonSchemaToZod.ts):
// per-property try/catch fallback to z.any() so one malformed property never
// rejects an entire tool.

interface JsonSchemaObject {
	type?: string | string[];
	properties?: Record<string, JsonSchemaProperty>;
	required?: string[];
}

interface JsonSchemaProperty {
	type?: string | string[];
	description?: string;
	default?: unknown;
	nullable?: boolean;
	enum?: unknown[];
	oneOf?: JsonSchemaProperty[];
	anyOf?: JsonSchemaProperty[];
	items?: JsonSchemaProperty;
	properties?: Record<string, JsonSchemaProperty>;
	required?: string[];
}

/** Converts a `DynamicToolSpec.inputSchema` into the raw shape `tool()` needs. */
export function jsonSchemaToZodRawShape(inputSchema: unknown): Record<string, ZodTypeAny> {
	const schema = inputSchema as JsonSchemaObject | undefined;
	if (!schema || schema.type !== 'object' || !schema.properties) {
		return {};
	}
	const required = new Set(schema.required ?? []);
	const shape: Record<string, ZodTypeAny> = {};
	for (const [name, raw] of Object.entries(schema.properties)) {
		let zodType: ZodTypeAny;
		try {
			zodType = jsonPropertyToZod(raw);
		} catch {
			zodType = z.any();
		}
		if (!required.has(name)) {
			zodType = zodType.optional();
		}
		shape[name] = zodType;
	}
	return shape;
}

function jsonPropertyToZod(prop: JsonSchemaProperty): ZodTypeAny {
	if (!prop || typeof prop !== 'object') {
		return z.any();
	}

	let base: ZodTypeAny;

	if (Array.isArray(prop.enum) && prop.enum.length > 0) {
		const literals = prop.enum.filter(v =>
			typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null
		) as (string | number | boolean | null)[];
		if (literals.length === 0) {
			base = z.any();
		} else if (literals.length === 1) {
			base = z.literal(literals[0] as Exclude<typeof literals[number], null>);
		} else {
			base = z.union(literals.map(v => z.literal(v as Exclude<typeof literals[number], null>)) as unknown as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
		}
	} else if (Array.isArray(prop.oneOf) && prop.oneOf.length > 0) {
		base = unionOf(prop.oneOf);
	} else if (Array.isArray(prop.anyOf) && prop.anyOf.length > 0) {
		base = unionOf(prop.anyOf);
	} else {
		const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;
		switch (type) {
			case 'string':
				base = z.string();
				break;
			case 'number':
				base = z.number();
				break;
			case 'integer':
				base = z.number().int();
				break;
			case 'boolean':
				base = z.boolean();
				break;
			case 'array':
				base = z.array(prop.items ? jsonPropertyToZod(prop.items) : z.any());
				break;
			case 'object': {
				const sub: Record<string, ZodTypeAny> = {};
				const subRequired = new Set(prop.required ?? []);
				for (const [n, p] of Object.entries(prop.properties ?? {})) {
					let t: ZodTypeAny;
					try { t = jsonPropertyToZod(p); } catch { t = z.any(); }
					if (!subRequired.has(n)) { t = t.optional(); }
					sub[n] = t;
				}
				base = z.object(sub);
				break;
			}
			case 'null':
				base = z.null();
				break;
			default:
				base = z.any();
		}
	}

	if (prop.nullable) {
		base = base.nullable();
	}
	if (prop.description) {
		base = base.describe(prop.description);
	}
	if (prop.default !== undefined) {
		base = base.default(prop.default as never);
	}
	return base;
}

function unionOf(schemas: JsonSchemaProperty[]): ZodTypeAny {
	const variants = schemas.map(s => {
		try { return jsonPropertyToZod(s); } catch { return z.any(); }
	});
	if (variants.length === 1) {
		return variants[0];
	}
	return z.union(variants as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
}
