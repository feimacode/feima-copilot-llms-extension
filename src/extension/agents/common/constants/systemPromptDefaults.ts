/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Built-in default system-prompt text for each agent participant. These are
 * the "well-defined defaults" that `resolveSystemPrompt` (../systemPrompt.ts)
 * merges with the user's own `feima.agents.<agent>.systemPrompt` setting.
 *
 * Structural reference: GitHub Copilot Chat's own agent-mode system prompt
 * (vscode-copilot-chat's `defaultAgentInstructions.tsx`), which layers a short
 * identity block, tool-preference rules, file-editing rules and an output-
 * formatting block. We don't reuse its text (different tool surface, different
 * CLI), but we follow the same shape: short, imperative, VS Code-specific.
 */

/**
 * Codex and Copilot CLI both receive the same VS Code-native file-editing
 * tools via the shared dynamic-tool bridge (writeFile/replaceInFile/
 * vscode_editFile_internal — see common/tools/dynamicToolManager.ts), and
 * each of those tools already carries its own "prefer this over shell
 * commands" description on its schema (see TOOL_DESCRIPTIONS there).
 *
 * An earlier version of this file also force-fed a top-level "CRITICAL FILE
 * EDITING RULES ... FORBIDDEN APPROACHES ... you MUST" block on every turn.
 * That was a testing-era workaround, not something either CLI needs going
 * forward — so there's no built-in default here. Both are empty on purpose;
 * `feima.agents.{codex,copilot}.systemPrompt` layers entirely on top of each
 * CLI's own default system prompt, with nothing from Feima underneath it.
 */
export const CODEX_DEFAULT_SYSTEM_PROMPT = '';

/** See CODEX_DEFAULT_SYSTEM_PROMPT. */
export const COPILOT_DEFAULT_SYSTEM_PROMPT = '';

/**
 * Claude Code's own built-in tools (Edit/Write/MultiEdit/NotebookEdit — see
 * claude/claudeEditTools.ts) already write straight to disk; @claude is never
 * given the writeFile/replaceInFile bridge tools, so it doesn't need the
 * shell-avoidance instructions above. What it's missing by default is any
 * awareness that it's running inside VS Code's Chat view rather than the
 * standalone `claude` terminal UI.
 */
export const CLAUDE_DEFAULT_SYSTEM_PROMPT =
`You are running as the @claude chat participant inside VS Code's Chat view, not the standalone Claude Code terminal UI.

- The user is reading your reply in a chat side panel, not a terminal — keep responses concise and skimmable, formatted as Markdown (headings, lists, fenced code blocks with a language tag).
- File edits made with the Edit/Write/MultiEdit/NotebookEdit tools are shown to the user as inline diffs in VS Code's editor and Working Set. Don't also paste the changed code into your reply or narrate the diff line-by-line — a short summary of what changed and why is enough.
- Terminal commands run in a VS Code-managed terminal the user can see directly; don't echo command output back verbatim unless the user asks for it.
- Tool approval is handled entirely by VS Code's own confirmation UI (and the currently configured permission mode) — never ask the user for permission in the chat text itself.`;
