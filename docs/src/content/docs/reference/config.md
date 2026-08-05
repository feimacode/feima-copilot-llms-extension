---
title: Configuration Reference
description: Complete reference for Feima Copilot configuration
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        "headline": "Feima Copilot Configuration Reference",
        "description": "Complete reference for Feima Copilot configuration",
        "articleSection": "Configuration Reference",
        "author": {
          "@type": "Organization",
          "name": "Feimacode",
          "url": "https://feimacode.com"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Feimacode",
          "logo": {
            "@type": "ImageObject",
            "url": "https://docs.feimacode.com/feima-icon.png"
          }
        }
      }
---

Complete reference for all Feima Copilot configuration options.

## Settings Schema

All Feima Copilot settings are prefixed with `feima.` in VS Code settings.

## User Settings

### `feima.defaultModel`

Default model for new conversations.

**Type**: `string`
**Default**: `"qwen3.6-flash"`
**Scope**: Window

**Valid Values**:
- `"qwen3.6-flash"` - Qwen3.6 Flash (free tier, chat default, thinking-capable)
- `"qwen3.7-max"` - Qwen3.7 Max (~1M context, deep thinking)
- `"qwen3-coder-plus"` - Qwen3 Coder Plus (1M context)
- `"qwen3.6-plus"` - Qwen3.6 Plus (vision + thinking, 1M context)
- `"qwen3.7-plus"` - Qwen3.7 Plus (~1M context, vision + deep thinking)
- `"deepseek-v3.2"` - DeepSeek V3.2 (deep thinking)
- `"glm-5"` - GLM-5 (Zhipu, thinking capable)
- `"glm-4.7"` - GLM-4.7 (Zhipu, long output)
- `"glm-5.1"` - GLM 5.1 (202K context)
- `"glm-5.2"` - GLM 5.2 (1M context)
- `"minimax-m2.5"` - MiniMax M2.5
- `"kimi-k2.6"` - Kimi K2.6 (256K context + vision)
- `"kimi-k2.7-code"` - Kimi K2.7 Code (256K context, code-specialized)
- `"kimi-k3"` - Kimi K3 (1M context, vision, deep thinking, premium)
- `"hy3"` - HY3 (256K context, thinking support, free tier)

**Example**:
```json
{
  "feima.defaultModel": "qwen3.7-max"
}
```

---

### `feima.showStatusBar`

Display Feima status bar item.

**Type**: `boolean`
**Default**: `true`
**Scope**: Window

**Description**: When enabled, shows account info and remaining requests in the status bar.

**Example**:
```json
{
  "feima.showStatusBar": false
}
```

---

### `feima.autoRefreshToken`

Automatically refresh access tokens.

**Type**: `boolean`
**Default**: `true`
**Scope**: Application

**Description**: When enabled, automatically refreshes access tokens before they expire. Disable if you want manual control over token refresh.

**Example**:
```json
{
  "feima.autoRefreshToken": false
}
```

---

### `feima.enableDebugLogging`

Enable detailed debug logging.

**Type**: `boolean`
**Default**: `false`
**Scope**: Window

**Description**: When enabled, logs detailed debug information to the Output panel. Useful for troubleshooting.

**Example**:
```json
{
  "feima.enableDebugLogging": true
}
```

---

### `feima.requestTimeout`

API request timeout in milliseconds.

**Type**: `number`
**Default**: `30000`
**Scope**: Window
**Minimum**: `1000`
**Maximum**: `300000`

**Description**: Maximum time to wait for an API response. Increase if experiencing timeouts on slow connections.

**Example**:
```json
{
  "feima.requestTimeout": 60000
}
```

---

### `feima.maxRetries`

Maximum number of retry attempts.

**Type**: `number`
**Default**: `3`
**Scope**: Window
**Minimum**: `0`
**Maximum**: `10`

**Description**: Number of times to retry failed requests before giving up.

**Example**:
```json
{
  "feima.maxRetries": 5
}
```

---

### `feima.retryDelay`

Delay between retries in milliseconds.

**Type**: `number`
**Default**: `1000`
**Scope**: Window
**Minimum**: `100`
**Maximum**: `10000`

**Description**: How long to wait between retry attempts.

**Example**:
```json
{
  "feima.retryDelay": 2000
}
```

---

### `feima.enableStreaming`

Enable streaming responses.

**Type**: `boolean`
**Default**: `true`
**Scope**: Window

**Description**: When enabled, streams responses as they're generated. Provides better UX but may use more resources.

**Example**:
```json
{
  "feima.enableStreaming": false
}
```

---

### `feima.modelAliases`

Custom aliases for models.

**Type**: `object`
**Default**: `{}`
**Scope**: Window

**Description**: Define custom aliases for frequently used models.

**Example**:
```json
{
  "feima.modelAliases": {
    "code": "qwen3-coder-plus",
    "review": "qwen3.7-max",
    "docs": "glm-4.7",
    "arch": "deepseek-v3.2",
    "fast": "qwen3.6-flash"
  }
}
```

---

## Workspace Settings

### `feima.workspaceModel`

Model override for current workspace.

**Type**: `string | null`
**Default**: `null`
**Scope**: Workspace

**Description**: Override the default model for this specific workspace. Takes precedence over `feima.defaultModel`.

**Example**:
```json
{
  "feima.workspaceModel": "qwen3-coder-plus"
}
```

---

### `feima.workspaceContext`

Workspace-specific context hints.

**Type**: `string[]`
**Default**: `[]`
**Scope**: Workspace

**Description**: Additional context to include when generating responses in this workspace.

**Example**:
```json
{
  "feima.workspaceContext": [
    "This is a TypeScript project using React",
    "Follow ESLint rules in .eslintrc.json"
  ]
}
```

---

## Advanced Settings

### `feima.apiEndpoint`

Custom API endpoint.

**Type**: `string | null`
**Default**: `null`
**Scope**: Application

**Description**: Override the default Feima API endpoint. Only use if instructed by support.

**Example**:
```json
{
  "feima.apiEndpoint": "https://api.feimacode.com"
}
```

---

### `feima.authEndpoint`

Custom authentication endpoint.

**Type**: `string | null`
**Default**: `null`
**Scope**: Application

**Description**: Override the default Feima IDP endpoint. Only use if instructed by support.

**Example**:
```json
{
  "feima.authEndpoint": "https://idp.feimacode.com"
}
```

---

### `feima.proxyUrl`

Proxy URL for API requests.

**Type**: `string | null`
**Default**: `null`
**Scope**: Application

**Description**: HTTP proxy URL for API requests.

**Example**:
```json
{
  "feima.proxyUrl": "http://proxy.example.com:8080"
}
```

---

## Agent Participant Settings

Settings for the [`@claude`, `@codex`, and `@copilot-cli` agent participants](/guides/agent-participants). See [Agent Participants Setup](/guides/agent-participants-setup) for a task-oriented walkthrough, and [MCP Servers & Tools for Agent Participants](/guides/agent-mcp-tools) for the MCP/tool-related settings below.

### `feima.agents.claude.binaryPath`

Absolute path to the `claude` binary.

**Type**: `string`
**Default**: `""`
**Scope**: Machine-overridable

**Description**: Leave empty to auto-discover via `PATH`.

---

### `feima.agents.codex.binaryPath`

Absolute path to the `codex` binary.

**Type**: `string`
**Default**: `""`
**Scope**: Machine-overridable

**Description**: Leave empty to auto-discover via `PATH`.

---

### `feima.agents.copilot.binaryPath`

Absolute path to the GitHub Copilot CLI binary.

**Type**: `string`
**Default**: `""`
**Scope**: Machine-overridable

**Description**: Leave empty to auto-discover via `PATH`.

---

### `feima.agents.codex.shareMcpServers` / `feima.agents.copilot.shareMcpServers`

Pass MCP servers from VS Code's own native `mcp.json` config (user profile + every workspace folder's `.vscode/mcp.json`) down to `@codex` / `@copilot-cli`, letting that CLI's own native MCP client connect to them directly.

**Type**: `boolean`
**Default**: `true`

**Description**: Disable if you only want that participant's own separately configured MCP servers (e.g. via `codex mcp add`). See [MCP Servers & Tools for Agent Participants](/guides/agent-mcp-tools).

---

### `feima.agents.claude.shareMcpServers`

Pass MCP servers from VS Code's own native `mcp.json` config down to `@claude`, letting the Claude Agent SDK connect to them itself.

**Type**: `boolean`
**Default**: `false`

**Description**: Defaults to off, because the Claude Agent SDK's own MCP client can't complete OAuth — servers that need it (e.g. Atlassian) silently fail to connect. Instead, by default those servers are managed by VS Code (which does support OAuth) and their tools are exposed to `@claude` through the dynamic-tool bridge — see `feima.agents.claude.tools.excludePatterns` below and [MCP Servers & Tools for Agent Participants](/guides/agent-mcp-tools).

---

### `feima.agents.tools.excludePatterns`

Tool names (from `vscode.lm.tools`) to hide from the dynamic-tool bridge shared by agent participants.

**Type**: `string[]`
**Default**:
```json
[
  "mcp_*",
  "copilot_*",
  "ask_user",
  "task_complete",
  "exit_plan_mode",
  "task",
  "read_agent",
  "write_agent",
  "list_agents",
  "send_inbox",
  "context_board",
  "skill"
]
```
**Scope**: Machine-overridable

**Description**: Each entry may contain a single `*` wildcard, matched against the full tool name. The default excludes MCP-backed tools (`mcp_*` — MCP servers are handled natively by each CLI's own MCP client; see `.vscode/mcp.json` / VS Code's user-profile `mcp.json`), a few Copilot Chat manifest-only tools with no runtime implementation, and internal agent-loop control signals from other agent SDKs.

---

### `feima.agents.codex.tools.excludePatterns` / `feima.agents.copilot.tools.excludePatterns`

Per-participant override of `feima.agents.tools.excludePatterns` for @codex / @copilot-cli only.

**Type**: `string[] | null`
**Default**: `null`
**Scope**: Machine-overridable

**Description**: Leave unset (`null`) to use the shared list above. Set to an array — including `[]` to disable exclusions entirely — to replace the shared list just for that participant.

---

### `feima.agents.claude.tools.excludePatterns`

Per-participant override of `feima.agents.tools.excludePatterns` for `@claude` only.

**Type**: `string[] | null`
**Default**: `["copilot_*", "mcp_aws*"]`
**Scope**: Machine-overridable

**Description**: Defaults to the shared list minus `mcp_*`, so VS Code-managed MCP tools — including OAuth-authenticated ones the Claude SDK can't reach on its own (see `feima.agents.claude.shareMcpServers` above) — are exposed to `@claude` via the dynamic-tool bridge. Set to `null` to fall back to the shared list (which excludes `mcp_*`); set to a custom array (including `[]`) to replace it.

---

### `feima.agents.claude.permissionMode`

Default permission tier for `@claude`.

**Type**: `"ask" | "acceptEdits" | "fullAuto"`
**Default**: `"ask"`

**Description**: How much `@claude` asks before running commands or changing files. Override for a single turn with `/ask`, `/acceptEdits`, or `/fullAuto`.
- `ask` — Ask for approval before running commands or changing files (safe default).
- `acceptEdits` — Auto-approve file edits; still ask before running commands or other tools.
- `fullAuto` — Auto-approve everything; never ask. Use with caution.

---

### `feima.agents.codex.permissionMode`

Default permission tier for `@codex`. Same values and behavior as `feima.agents.claude.permissionMode`, above.

**Type**: `"ask" | "acceptEdits" | "fullAuto"`
**Default**: `"ask"`

---

### `feima.agents.copilot.permissionMode`

Default permission tier for `@copilot-cli`. Same values and behavior as `feima.agents.claude.permissionMode`, above.

**Type**: `"ask" | "acceptEdits" | "fullAuto"`
**Default**: `"ask"`

---

## Security Settings

### `feima.tokenEncryption`

Enable token encryption.

**Type**: `boolean`
**Default**: `true`
**Scope**: Application

**Description**: Encrypt stored tokens. Do not disable unless required for debugging.

**Example**:
```json
{
  "feima.tokenEncryption": false
}
```

---

### `feima.storeHistory`

Store conversation history.

**Type**: `boolean`
**Default**: `true`
**Scope**: Application

**Description**: Store conversation history locally for context. Disable to save disk space.

**Example**:
```json
{
  "feima.storeHistory": false
}
```

---

### `feima.maxHistorySize`

Maximum history entries.

**Type**: `number`
**Default**: `100`
**Scope**: Application
**Minimum**: `0`
**Maximum**: `1000`

**Description**: Maximum number of conversation history entries to store.

**Example**:
```json
{
  "feima.maxHistorySize": 50
}
```

---

## UI Settings

### `feima.theme`

Extension theme.

**Type**: `string`
**Default**: `"auto"`
**Scope**: Window

**Valid Values**:
- `"auto"` - Match VS Code theme
- `"light"` - Force light theme
- `"dark"` - Force dark theme

**Example**:
```json
{
  "feima.theme": "auto"
}
```

---

### `feima.compactMode`

Use compact UI mode.

**Type**: `boolean`
**Default**: `false`
**Scope**: Window

**Description**: Enable compact mode for the UI elements.

**Example**:
```json
{
  "feima.compactMode": true
}
```

---

## Feature Flags

### `feima.experimentalFeatures`

Enable experimental features.

**Type**: `boolean`
**Default**: `false`
**Scope**: Application

**Description**: Enable experimental features that are still in development.

**Example**:
```json
{
  "feima.experimentalFeatures": true
}
```

---

### `feima.betaModels`

Show beta/unstable models.

**Type**: `boolean`
**Default**: `false`
**Scope**: Window

**Description**: Include beta and experimental models in the model list.

**Example**:
```json
{
  "feima.betaModels": true
}
```

---

## Settings Hierarchy

Settings are applied in this order (higher priority overrides lower):

1. **Workspace settings** (`.vscode/settings.json`)
2. **User settings** (`settings.json`)
3. **Default values**

## Configuration Files

### `settings.json`

Main configuration file. Location:
- **Windows**: `%APPDATA%\Code\User\settings.json`
- **macOS**: `~/Library/Application Support/Code/User/settings.json`
- **Linux**: `~/.config/Code/User/settings.json`

### `.vscode/settings.json`

Workspace-specific configuration. Create in your project root.

### `.vscode/settings.local.json`

Local workspace configuration. Gitignored by default.

## Validation

Settings are validated on change. Invalid settings are logged to the Output panel.

## Migration

### From Previous Versions

Settings are automatically migrated between versions. Manual migration is not required.

### Default Reset

To reset all settings to defaults:

```json
// Remove all feima.* entries from settings.json
// Or use the command: "Feima: Reset Settings"
```

## Next Steps

- [Configuration Guide](/guides/configuration) - How to configure
- [Development Setup](/dev/setup) - Develop for Feima Copilot
- [API Reference](/reference/api) - Extension API

## Need Help?

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.com)