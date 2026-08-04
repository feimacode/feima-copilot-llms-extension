---
title: MCP Servers & Tools for Agent Participants
description: Control which MCP servers and VS Code tools are shared with the @claude, @codex, and @copilot-cli agent participants
banner:
  content: |
    🚀 <a href="https://marketplace.visualstudio.com/items?itemName=feima.copilot-more-llms" target="_blank">Install Feima Copilot extension</a> to add open weight models to GitHub Copilot
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "MCP Servers & Tools for Agent Participants in Feima Copilot",
        "description": "Control which MCP servers and VS Code tools are shared with the @claude, @codex, and @copilot-cli agent participants",
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

`@claude`, `@codex`, and `@copilot-cli` (see [Agent Participants](/guides/agent-participants)) can each reach two separate pools of capabilities:

1. **MCP servers** — external tool servers defined in VS Code's own `mcp.json` files, or in the CLI's own native MCP config.
2. **VS Code's built-in and extension-contributed tools** — file edits, search, terminal, and anything else registered in `vscode.lm.tools`, surfaced to each CLI through a **dynamic-tool bridge**.

This page covers how both are wired up, how to enable or restrict them, and which combination fits your setup.

## Two independent tool sources — don't confuse them

| Source | Examples | Reaches participants via |
|---|---|---|
| VS Code's native `mcp.json` (user profile + workspace) | Any MCP server you or an extension added through VS Code's own MCP UI/config | `feima.agents.<participant>.shareMcpServers` (this page, next section) |
| `vscode.lm.tools` (VS Code built-ins + extension-contributed tools, **including** the ones VS Code itself derives from `mcp.json` servers) | File edit/search tools, terminal, other extensions' chat tools, `mcp_*`-named tools for VS Code-managed MCP servers | The dynamic-tool bridge — `feima.agents.tools.excludePatterns` (and per-participant overrides) |

A given MCP server's tools can therefore reach a participant through **either or both** paths at once — directly (native passthrough) and/or indirectly (VS Code already turned it into an `lm.tool`, then the dynamic-tool bridge exposes it). The defaults are tuned to avoid handing the same server to a CLI twice; see [Best practices](#best-practices-it-depends-on-your-setup) below before changing them.

## Passing down VS Code's MCP settings

Each participant can read VS Code's own MCP config directly — no extension-specific `mcp.json` variant to maintain:

- **User profile** — VS Code's per-profile `mcp.json` (open it with **MCP: Open User Configuration**).
- **Per-workspace** — `.vscode/mcp.json` in each workspace folder. A workspace-folder entry takes precedence over a user-profile entry with the same server name.

```json
{
  "servers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@my-org/my-mcp-server"],
      "env": { "MY_TOKEN": "..." }
    }
  }
}
```

Use `command`/`args`/`env` for a local stdio server, or `url` (+ optional `headers`) for a remote HTTP/SSE server.

Whether this merged config is actually **passed down** to a participant's own native MCP client is controlled per-participant by a `shareMcpServers` setting:

| Setting | Default | Effect when enabled |
|---|---|---|
| `feima.agents.codex.shareMcpServers` | `true` | Servers are added as `-c mcp_servers.<name>.*` args — Codex's own native MCP client connects to them directly. |
| `feima.agents.copilot.shareMcpServers` | `true` | Servers are passed into the Copilot CLI SDK's session config — its own MCP client connects to them directly. |
| `feima.agents.claude.shareMcpServers` | `false` | Servers are passed into `Options.mcpServers` — the Claude Agent SDK's own MCP client connects to them directly. |

`@claude` defaults to **off** for a specific reason: the Claude Agent SDK's own MCP client can't complete an OAuth handshake, so any server requiring it (e.g. Atlassian) would silently fail to connect if passed down this way. With it off, VS Code (which does support MCP OAuth) manages those servers instead, and their tools reach `@claude` through the dynamic-tool bridge described next — see [Best practices](#best-practices-it-depends-on-your-setup).

Disable a participant's `shareMcpServers` if you'd rather it use only servers configured through its own CLI-native mechanism (`claude mcp add`, `codex mcp add`, etc.) and ignore VS Code's `mcp.json` entirely.

## Enabling dynamic tools

Separately from MCP passthrough, every participant also discovers whatever is currently registered in `vscode.lm.tools` — VS Code's built-in tools (file edit, search, terminal, diagnostics, ...), any other extension's chat tools, and the `mcp_*` tools VS Code itself derives from its managed MCP servers — and exposes them as callable tools inside that CLI's own agent loop:

- **`@codex`** — passed as the `dynamicTools` parameter on `thread/start`.
- **`@copilot-cli`** — passed as the `tools` parameter on session creation.
- **`@claude`** — exposed through an in-process MCP server (`vscode-tools`) built with the SDK's `createSdkMcpServer()`, since that's the SDK's only client-tool injection surface; tool calls are routed straight back through `vscode.lm.invokeTool()`.

This discovery is **always on** for all three participants — there's no separate "enable" toggle, because there's nothing to turn on: it's how each participant gets file-editing and search capability in the first place. What you control instead is *which* discovered tools are actually offered, via the exclude patterns below. Tool discovery is cached per participant for the life of the extension host; if you add a tool-contributing extension or otherwise expect the set to have changed, run **"Codex dynamic tool cache cleared"** — the **Feima: Clear Codex Tool Cache** command (`feima.agents.clearCodexToolCache`) — to force rediscovery for all participants (the command name is legacy from when only `@codex` used this bridge).

## Excluding tools

`feima.agents.tools.excludePatterns` hides matching tool names from the dynamic-tool bridge for all three participants by default:

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

Each entry may contain a single `*` wildcard, matched against the full tool name. The default excludes:

- **`mcp_*`** — MCP-backed tools, since those servers are already handled natively by each CLI's own MCP client (previous section) when `shareMcpServers` is on.
- **`copilot_*`** — a handful of Copilot Chat manifest-only tools with no runtime implementation (calling them fails with "no implementation registered").
- The rest — internal agent-loop control signals from other agent SDKs (planning/task/inbox tools) that don't make sense outside their own loop.

Override the shared list per participant with `feima.agents.codex.tools.excludePatterns` / `feima.agents.copilot.tools.excludePatterns` — leave `null` (the default) to inherit the shared list, or set an array (including `[]`) to replace it entirely for that participant. `@claude` has its own override, `feima.agents.claude.tools.excludePatterns`, which **defaults to the shared list minus `mcp_*`** (`["copilot_*", "mcp_aws*"]`) so VS Code-managed MCP tools — including OAuth-authenticated ones @claude's own SDK can't reach — stay visible to it via the bridge.

### Use case: context optimization

Every tool exposed to a participant adds its name, description, and schema to that turn's context — and a larger tool list makes tool selection slower and less reliable for the model. If you have MCP servers or extensions contributing many tools you rarely use in agent-participant conversations, trim them explicitly rather than leaving them all enabled:

```json
{
  "feima.agents.tools.excludePatterns": [
    "mcp_*",
    "copilot_*",
    "mcp_atlassian_*",
    "mcp_aws*"
  ]
}
```

There's no "include only these" allowlist — patterns are exclude-only — so the practical approach is to exclude the noisy server(s) by name prefix (e.g. `mcp_<server>_*`) while leaving the rest of the shared default in place. Use a per-participant override instead of the shared setting if only one participant needs the trim (e.g. you only ever use `@codex` for a task that needs a huge MCP toolset, but want `@claude` kept lean).

## Best practices — it depends on your setup

There's no single right answer here; the best configuration follows from **where you already manage your MCP servers**:

**You already run `claude mcp add`, `codex mcp add`, etc. yourself, and prefer the CLI's own MCP management** — don't pass anything down. Turn off `shareMcpServers` for that participant (`@claude` already defaults to off; set `feima.agents.codex.shareMcpServers` / `feima.agents.copilot.shareMcpServers` to `false` too) so VS Code's `mcp.json` — which you're not using — can't introduce a conflicting duplicate server definition. Leave the shared `mcp_*` exclude in place so tools VS Code doesn't even know about aren't a factor.

**You manage everything through VS Code's `mcp.json` (user profile and/or workspace) and don't run any CLI-native MCP commands** — the practice differs per participant:

- For `@codex` and `@copilot-cli`, leave `shareMcpServers` at its default (`true`). Their own MCP clients don't have the OAuth limitation `@claude`'s does, so native passthrough is the simpler, single path — and the default `mcp_*` tool exclusion avoids also exposing the same servers a second time through the dynamic-tool bridge.
- For `@claude`, leave `shareMcpServers` **off** (the default) unless you specifically need a server the Claude Agent SDK must own directly (for example, to use `claude`'s own per-server approval semantics, or a server you know doesn't need OAuth). The default dynamic-tool bridge path already exposes VS Code-managed MCP tools to `@claude` — including OAuth-authenticated servers its own SDK can't connect to — via `feima.agents.claude.tools.excludePatterns`'s default. Only flip `shareMcpServers` on, and add that server to `feima.agents.claude.tools.excludePatterns` to avoid double-exposure, for servers you've verified don't need OAuth and want handled natively instead.

**Mixed setup (some servers in the CLI, some in VS Code)** — this is where the per-participant `tools.excludePatterns` override earns its keep: keep `shareMcpServers` on for the VS Code-managed servers, and add the CLI-natively-managed server names' derived tool patterns to that participant's exclude list so they aren't offered twice.

Whichever you choose, when in doubt check **"Feima: Show Account"**'s 🧰 Agent CLI Status section and the Output panel's Feima log (enable `feima.enableDebugLogging` for MCP-server-level detail) to see which servers each participant actually connected to before assuming a setting had no effect.

## Next steps

- [Agent Participants Setup & Troubleshooting](/guides/agent-participants-setup) — installing the CLIs, binary paths, permission tiers
- [Config Reference](/reference/config#agent-participant-settings) — full settings list with types and scopes
- [Agent Proxy](/guides/agent-proxy) — how proxy-mode model routing works
