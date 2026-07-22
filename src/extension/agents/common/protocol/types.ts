/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Ported from VS Code agent-host codex protocol types
 * Source: src/vs/platform/agentHost/node/codex/protocol/generated/v2/
 * Generated from: `codex app-server generate-ts --experimental`
 * Generated from @openai/codex 0.134.0, licensed Apache-2.0.
 */

// ─── Serde ────────────────────────────────────────────────────────────────────

export type JsonValue = number | string | boolean | Array<JsonValue> | { [key in string]?: JsonValue } | null;

// ─── Core Primitives ──────────────────────────────────────────────────────────

export type AbsolutePathBuf = string;

export interface Thread {
	id: string;
	sessionId?: string;
	preview?: string;
	modelProvider?: string;
	createdAt?: number;
	status?: ThreadStatus;
	ephemeral?: boolean;
	cwd?: AbsolutePathBuf;
}

export interface ThreadStatus {
	type: 'notLoaded' | 'idle' | 'systemError' | 'active';
	activeFlags?: string[];
}

export interface Turn {
	id: string;
	items: Array<ThreadItem>;
	itemsView: TurnItemsView;
	status: TurnStatus;
	error: TurnError | null;
}

export type TurnItemsView = 'notLoaded' | 'summary' | 'full';
export type TurnStatus = 'inProgress' | 'completed' | 'interrupted' | 'failed';

export interface TurnError {
	message: string;
	codexErrorInfo?: string;
}

// ─── Config Types ─────────────────────────────────────────────────────────────

export type AskForApproval = 'untrusted' | 'on-failure' | 'on-request' | 'never';
export type SandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access';

// ─── Thread Item Types ────────────────────────────────────────────────────────

export type PatchChangeKind =
	| { type: 'add' }
	| { type: 'delete' }
	| { type: 'update'; move_path: string | null };

export interface FileUpdateChange {
	path: string;
	kind: PatchChangeKind;
	diff: string;
}

export type CommandAction =
	| { type: 'read'; command: string; name: string; path: AbsolutePathBuf }
	| { type: 'listFiles'; command: string; path: string | null }
	| { type: 'search'; command: string; query: string | null; path: string | null }
	| { type: 'unknown'; command: string };

export type CommandExecutionSource = 'model' | 'userShell';

export type CommandExecutionStatus = 'inProgress' | 'completed' | 'failed' | 'declined';

export type PatchApplyStatus = 'inProgress' | 'completed' | 'failed' | 'declined';

export type McpToolCallStatus = 'inProgress' | 'completed' | 'failed';

export type DynamicToolCallStatus = 'inProgress' | 'completed' | 'failed';

export interface McpToolCallResult {
	content: Array<JsonValue>;
	structuredContent: JsonValue | null;
}

export interface McpToolCallError {
	message: string;
}

export type DynamicToolCallOutputContentItem =
	| { type: 'inputText'; text: string }
	| { type: 'inputImage'; imageUrl: string };

export type WebSearchAction =
	| { type: 'search'; query: string | null; queries: Array<string> | null }
	| { type: 'openPage'; url: string | null }
	| { type: 'findInPage'; url: string | null; pattern: string | null }
	| { type: 'other' };

export type UserInput =
	| { type: 'text'; text: string }
	| { type: 'image'; url: string }
	| { type: 'localImage'; path: string };

export type ThreadItem =
	| { type: 'userMessage'; id: string; content: Array<UserInput> }
	| { type: 'agentMessage'; id: string; text: string }
	| { type: 'plan'; id: string; text: string }
	| { type: 'reasoning'; id: string; summary: Array<string>; content: Array<string> }
	| {
		type: 'commandExecution'; id: string;
		command: string; cwd: AbsolutePathBuf;
		processId: string | null; source: CommandExecutionSource;
		status: CommandExecutionStatus;
		commandActions: Array<CommandAction>;
		aggregatedOutput: string | null;
		exitCode: number | null;
		durationMs: number | null;
	}
	| {
		type: 'fileChange'; id: string;
		changes: Array<FileUpdateChange>;
		status: PatchApplyStatus;
	}
	| {
		type: 'mcpToolCall'; id: string;
		server: string; tool: string;
		status: McpToolCallStatus;
		arguments: JsonValue;
		result: McpToolCallResult | null;
		error: McpToolCallError | null;
		durationMs: number | null;
	}
	| {
		type: 'dynamicToolCall'; id: string;
		namespace: string | null; tool: string;
		arguments: JsonValue;
		status: DynamicToolCallStatus;
		contentItems: Array<DynamicToolCallOutputContentItem> | null;
		success: boolean | null;
		durationMs: number | null;
	}
	| {
		type: 'webSearch'; id: string;
		query: string;
		action: WebSearchAction | null;
	}
	| {
		type: 'contextCompaction'; id: string;
	};

// ─── Dynamic Tools ────────────────────────────────────────────────────────────

export interface DynamicToolSpec {
	name: string;
	description: string;
	inputSchema: JsonValue;
	namespace?: string;
	deferLoading?: boolean;
}

export interface DynamicToolCallParams {
	threadId: string;
	turnId: string;
	callId: string;
	namespace: string | null;
	tool: string;
	arguments: JsonValue;
}

export interface DynamicToolCallResponse {
	contentItems: Array<DynamicToolCallOutputContentItem>;
	success: boolean;
}

// ─── Request Params & Responses ───────────────────────────────────────────────

export interface ThreadStartParams {
	model?: string | null;
	cwd?: string | null;
	approvalPolicy?: AskForApproval | null;
	sandbox?: SandboxMode | null;
	dynamicTools?: Array<DynamicToolSpec> | null;
	baseInstructions?: string | null;
	developerInstructions?: string | null;
	config?: Record<string, JsonValue> | null;
}

export interface ThreadStartResponse {
	thread: Thread;
}

export interface ThreadResumeParams {
	threadId: string;
	excludeTurns?: boolean;
}

export interface ThreadResumeResponse {
	thread: Thread;
}

export interface TurnStartParams {
	threadId: string;
	input: Array<UserInput>;
	model?: string | null;
	effort?: string | null;
	approvalPolicy?: AskForApproval | null;
}

export interface TurnStartResponse {
	turn: Turn;
}

// ─── Turn cancellation & steering ─────────────────────────────────────────────
// Mirrors agent-host: codexAgent._startConnection wires `turn/interrupt`
// (abortSession) and `turn/steer` (setPendingMessages).

export interface TurnInterruptParams {
	threadId: string;
	turnId: string;
}

export interface TurnSteerParams {
	threadId: string;
	input: Array<UserInput>;
	expectedTurnId: string;
	clientUserMessageId?: string | null;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface ItemStartedNotification {
	item: ThreadItem;
	threadId: string;
	turnId: string;
	startedAtMs: number;
}

export interface ItemCompletedNotification {
	item: ThreadItem;
	threadId: string;
	turnId: string;
}

export interface AgentMessageDeltaNotification {
	threadId: string;
	turnId: string;
	itemId: string;
	delta: string;
}

export interface TurnStartedNotification {
	threadId: string;
	turn: Turn;
}

export interface TurnCompletedNotification {
	threadId: string;
	turn: Turn;
}

export interface ThreadStartedNotification {
	thread: Thread;
}

export interface ReasoningSummaryPartAddedNotification {
	threadId: string;
	turnId: string;
	itemId: string;
	summaryIndex: number;
}

export interface ReasoningSummaryTextDeltaNotification {
	threadId: string;
	turnId: string;
	itemId: string;
	delta: string;
	summaryIndex: number;
}

export interface ReasoningTextDeltaNotification {
	threadId: string;
	turnId: string;
	itemId: string;
	delta: string;
	contentIndex: number;
}

export interface CommandExecutionOutputDeltaNotification {
	threadId: string;
	turnId: string;
	itemId: string;
	delta: string;
}

export interface FileChangePatchUpdatedNotification {
	threadId: string;
	turnId: string;
	itemId: string;
	changes: Array<FileUpdateChange>;
}

export interface McpToolCallProgressNotification {
	threadId: string;
	turnId: string;
	itemId: string;
	message: string;
}

export interface ThreadTokenUsageUpdatedNotification {
	threadId: string;
	turnId: string;
	tokenUsage: ThreadTokenUsage;
}

export interface ThreadTokenUsage {
	last?: {
		inputTokens: number;
		outputTokens: number;
		cachedInputTokens?: number;
		reasoningOutputTokens?: number;
	};
}

// ─── Approval Request Shapes ──────────────────────────────────────────────────

export interface CommandExecutionRequestApprovalParams {
	threadId: string;
	turnId: string;
	itemId: string;
	command?: string | null;
	cwd?: string | null;
	reason?: string | null;
	commandActions?: Array<CommandAction> | null;
	environmentId?: string | null;
	startedAtMs: number;
}

export interface FileChangeRequestApprovalParams {
	threadId: string;
	turnId: string;
	itemId: string;
	startedAtMs: number;
	reason?: string | null;
	grantRoot?: string | null;
	itemId_dup?: string;  // sometimes sent as itemId in params
}

export interface ServerRequestResolvedNotification {
	threadId: string;
	requestId: string | number;
}

// ─── MCP Server Protocol ─────────────────────────────────────────────────────

export type McpServerState = 'ready' | 'starting' | 'cancelled' | 'error' | 'running';

export interface McpServerStatus {
	serverName: string;
	status: McpServerState;
	error?: string;
	tools?: Array<DynamicToolSpec>;
}

export interface McpServerStatusListParams {
	cursor?: string;
	limit?: number;
}

export interface McpServerStatusListResponse {
	data: Array<McpServerStatus>;
	nextCursor?: string;
}

export interface McpServerStatusUpdatedNotification {
	serverName: string;
	status: McpServerState;
	error?: string;
}

// ─── MCP Server Tool Call (Request/Response cycle) ───────────────────────────

export interface McpServerToolCallParams {
	threadId: string;
	serverName: string;
	toolName: string;
	arguments: Record<string, unknown>;
}

export interface McpServerToolCallResponse {
	content: Array<{ type: 'text'; text: string }>;
	isError?: boolean;
}

// ─── MCP Tool Approval via requestUserInput ──────────────────────────────────

export interface ToolRequestUserInputParams {
	threadId: string;
	itemId: string;
	questions: Array<ToolRequestUserInputQuestion>;
}

export interface ToolRequestUserInputQuestion {
	id: string;
	label: string;
	description?: string;
	defaultValue?: string;
	required?: boolean;
}

export interface ToolRequestUserInputAnswer {
	questionId: string;
	value: string;
}

export interface ToolRequestUserInputResponse {
	answers: Array<ToolRequestUserInputAnswer>;
}

// ─── MCP Elicitation ─────────────────────────────────────────────────────────

export interface McpServerElicitationRequestParams {
	threadId: string;
	serverName: string;
	message: string;
}

export interface McpServerElicitationRequestResponse {
	decision: 'accept' | 'decline' | 'cancel';
}

// ─── MCP Inventory Entry ─────────────────────────────────────────────────────

export interface McpInventoryEntry {
	name: string;
	status: McpServerState;
	tools?: Array<DynamicToolSpec>;
	error?: string;
}
