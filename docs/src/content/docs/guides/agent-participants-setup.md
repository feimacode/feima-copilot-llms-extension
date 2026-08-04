---
title: Agent Participants Setup & Troubleshooting
description: Install and configure the Claude Code, Codex, and Copilot CLI agent participants
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
        "headline": "Agent Participants Setup & Troubleshooting for Feima Copilot",
        "description": "Install and configure the Claude Code, Codex, and Copilot CLI agent participants",
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

New to `@claude`, `@codex`, or `@copilot-cli`? Read the [Agent Participants overview](/guides/agent-participants) first for what they do and which one fits your situation. This page covers getting each one running and fixing common problems.

## Prerequisite: install the CLI

The extension doesn't bundle Claude Code, Codex, or Copilot CLI — it drives whichever one you already have installed:

| Participant | Requires |
|---|---|
| `@claude` | [`claude`](https://docs.claude.com/en/docs/claude-code) installed and, for native mode, logged in (`claude login` or equivalent) |
| `@codex` | [`codex`](https://developers.openai.com/codex/cli) installed and, for native mode, logged in |
| `@copilot-cli` | GitHub Copilot CLI installed |

The extension never manages CLI login for you — sign in to each CLI the same way you would from a terminal. If you only plan to use **proxy mode** (routing through Copilot/BYOK models), the CLI still needs to be installed, but native login isn't required.

## Pointing the extension at the CLI binary

By default, each participant looks for its CLI on your `PATH`. If it's installed somewhere non-standard, set the binary path explicitly:

| Setting | Purpose |
|---|---|
| `feima.agents.claude.binaryPath` | Absolute path to the `claude` binary |
| `feima.agents.codex.binaryPath` | Absolute path to the `codex` binary |
| `feima.agents.copilot.binaryPath` | Absolute path to the Copilot CLI binary |

All three default to `""` (auto-discover via `PATH`). If the binary can't be found either way, the participant fails with:

> Could not find the `<name>` binary. Set the binary path in VS Code settings or make sure `<name>` is on your PATH.

## Configuring MCP servers and tools

`@claude`, `@codex`, and `@copilot-cli` all pick up MCP servers directly from VS Code's own native MCP config — the same `mcp.json` files VS Code's built-in MCP support already reads — and also expose VS Code's built-in and extension-contributed tools through a dynamic-tool bridge. See [MCP Servers & Tools for Agent Participants](/guides/agent-mcp-tools) for the full picture: how MCP passthrough is gated per participant, how to enable/restrict the dynamic-tool bridge, and which setup fits your preferences (CLI-native MCP management vs. everything in VS Code's `mcp.json`).

## Changing the default permission tier

Each participant defaults to `"ask"` — approve every tool action manually. To change the persistent default (independent of the per-turn `/ask`, `/acceptEdits`, `/fullAuto` overrides described in the [overview](/guides/agent-participants#permission-tiers)):

- `feima.agents.claude.permissionMode`
- `feima.agents.codex.permissionMode`
- `feima.agents.copilot.permissionMode`

Each accepts `"ask"`, `"acceptEdits"`, or `"fullAuto"`.

## Diagnosing problems

Run **"Feima: Show Account"** from the Command Palette. The account view includes a **🧰 Agent CLI Status** section showing, for each CLI, whether it was found and its resolved path — copy it when reporting an issue.

| Symptom | Likely cause | Fix |
|---|---|---|
| Participant fails immediately with "Could not find the `<name>` binary" | CLI not installed, or not on `PATH` | Install the CLI, or set the matching `binaryPath` setting |
| Agent CLI Status shows "Not found" for a CLI you know is installed | Extension host's `PATH` differs from your shell's `PATH` (common on macOS when VS Code is launched from the Dock) | Set the `binaryPath` setting explicitly instead of relying on auto-discovery |
| Native mode's model list is empty, or requests fail with an auth error | Not logged in to that CLI | Log in to the CLI directly (`claude login`, `codex login`, etc.), same as you would in a terminal |
| It asks for approval on every single action even though you expected auto-approval | `/acceptEdits`/`/fullAuto` only apply to the current turn, not future ones | Set the persistent `permissionMode` setting for that participant, or re-issue the slash command each turn |
| Switching models mid-conversation pops up a confirmation dialog | You crossed between native and proxy routing, which use separate session histories | Confirm to start a fresh session in the new mode, or switch back to the original model to keep the existing one |

## Next steps

- [Use a Claude Code Subscription in VS Code](/guides/use-claude-code-subscription-in-vscode) — step-by-step for native `@claude` with your Claude Pro/Max subscription
- [Use a Codex Subscription in VS Code](/guides/use-codex-subscription-in-vscode) — step-by-step for native `@codex` with your ChatGPT Plus/Pro subscription
- [MCP Servers & Tools for Agent Participants](/guides/agent-mcp-tools) — passing down `mcp.json`, the dynamic-tool bridge, and tool exclusion
- [Agent Proxy](/guides/agent-proxy) — how proxy-mode routing works, and how to use it from outside VS Code
