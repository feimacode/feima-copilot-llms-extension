---
title: I Have a Claude Code Subscription. How Can I Use It in VS Code?
description: Use your existing Claude Pro/Max subscription with the real Claude Code agent inside VS Code Copilot Chat — no extra cost, no extra API key.
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
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "I have a Claude Code subscription. How can I use it in VS Code?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Install the Feima Copilot extension and the Claude Code CLI, sign in to the CLI with your Claude account, then chat with @claude in VS Code Copilot Chat and pick one of your subscription's models. Requests run on the real Claude Code agent and are billed against your existing subscription."
            }
          }
        ]
      }
---

install the [Feima Copilot extension](https://marketplace.visualstudio.com/items?itemName=feima.copilot-more-llms) and the Claude Code CLI, sign in to the CLI with your Claude account, then type `@claude` in Copilot Chat and pick one of your subscription's models. Your requests run on the **real Claude Code agent** and are billed against your existing Claude subscription — no extra cost, no extra API key.

## What you need

| Requirement | Notes |
|---|---|
| A Claude subscription that includes Claude Code (e.g. Claude Pro or Max) | The same account you already use |
| The [Claude Code CLI](https://docs.claude.com/en/docs/claude-code) installed and signed in | The extension drives your local `claude` binary — it doesn't bundle one |
| VS Code with the GitHub Copilot Chat extension | Feima Copilot builds on top of Copilot Chat |
| The Feima Copilot extension | Adds the `@claude` chat participant |

Native mode talks to Anthropic **directly from your machine using the CLI's own login** — exactly as if you ran `claude` in a terminal. It doesn't consume Feima credits, doesn't need a Feima API key, and nothing is routed through Feima's servers.

## Step 1 — Install Claude Code and sign in

If you already use Claude Code from a terminal with this subscription, skip this step — the extension reuses that exact login.

```bash
npm install -g @anthropic-ai/claude-code
```

Then run `claude` in a terminal and sign in with your Claude account when prompted (or use `/login` inside an interactive session). See the [official Claude Code docs](https://docs.claude.com/en/docs/claude-code) for details.

Verify it works: launch `claude` and confirm it shows your plan and models — the same entitlements will appear in VS Code's model picker.

## Step 2 — Install Feima Copilot

1. Open Extensions (`Ctrl+Shift+X`) and search for "Feima Copilot", or open the [Marketplace page](https://marketplace.visualstudio.com/items?itemName=feima.copilot-more-llms)
2. Click **Install**
3. Make sure GitHub Copilot Chat is installed and you can open the Copilot Chat panel

See the [Installation Guide](/guides/installation) for all options.

## Step 3 — Chat with `@claude` using your subscription

1. Open the Copilot Chat panel.
2. In the chat input, type `@claude` followed by your request, e.g. `@claude refactor parseInvoice() to handle malformed dates`.
3. In the chat **model picker**, pick one of the models listed under your Claude Code subscription. This list is read live from your actual login's entitlement — it's the same list the CLI's own `/model` command shows, not a hardcoded catalog.
4. Send the message.

That's it. What happens next:

- The **real Claude Code agent loop** runs — its own planning, tool use, and edit-review behavior — rendered inside Copilot Chat: streaming responses, inline tool-call display, and file edits applied directly as diffs you can accept or discard.
- Requests go straight from your machine to Anthropic under your subscription, billed exactly like a terminal session would be.
- `@claude` is **sticky** — follow-up messages keep going to it until you `@`-mention a different participant.

## Good to know

- **Permission tiers** — by default `@claude` asks before every tool action. Use `/acceptEdits` or `/fullAuto` at the start of a message to auto-approve for that turn, or set `feima.agents.claude.permissionMode` to change the persistent default. See [Permission tiers](/guides/agent-participants#permission-tiers).
- **Native vs. proxy sessions are separate** — if you switch the model picker from one of your subscription's models to a Copilot/BYOK model mid-conversation (or back), VS Code asks you to confirm, since the two modes keep separate histories. See [Native vs. proxy routing](/guides/agent-participants#native-vs-proxy-routing).
- **MCP servers & tools** — `@claude` picks up MCP servers from VS Code's own `mcp.json` config. See [MCP Servers & Tools for Agent Participants](/guides/agent-mcp-tools).
- **No subscription? No problem** — you can also use `@claude` in **proxy mode**, where the Claude Code agent loop is answered by a Copilot or BYOK model instead of an Anthropic subscription. See the [Agent Participants overview](/guides/agent-participants#native-vs-proxy-routing).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| No Claude subscription models in the picker | CLI not installed, not on `PATH`, or not signed in | Install `claude`, sign in from a terminal, then reopen the picker |
| "Could not find the `claude` binary" | Binary not on `PATH` (common on macOS when VS Code is launched from the Dock) | Set `feima.agents.claude.binaryPath` to the absolute path of the `claude` binary |
| Auth errors, or the model list stays empty | Login expired or missing | Run `claude` in a terminal and sign in again |
| Not sure what the extension sees | — | Run **"Feima: Show Account"** from the Command Palette — the **🧰 Agent CLI Status** section shows whether each CLI was found and its resolved path |

Full details in [Setup & Troubleshooting](/guides/agent-participants-setup).

## Related

- [Agent Participants](/guides/agent-participants) — what `@claude`, `@codex`, and `@copilot-cli` do, and which mode fits your situation
- [Setup & Troubleshooting](/guides/agent-participants-setup) — binary paths, permission defaults, diagnosing problems
- [Agent Proxy](/guides/agent-proxy) — using the Claude Code agent loop *without* a subscription, via Copilot/BYOK models
