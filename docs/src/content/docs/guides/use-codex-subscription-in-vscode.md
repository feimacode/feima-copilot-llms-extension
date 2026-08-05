---
title: I Have a Codex Subscription. How Can I Use It in VS Code?
description: Use your existing ChatGPT/Codex subscription with the real Codex agent inside VS Code Copilot Chat — no extra cost, no extra API key.
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
            "name": "I have a Codex subscription. How can I use it in VS Code?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Install the Feima Copilot extension and the Codex CLI, sign in to the CLI with your ChatGPT account, then chat with @codex in VS Code Copilot Chat and pick one of your subscription's models. Requests run on the real Codex agent and are billed against your existing subscription."
            }
          }
        ]
      }
---

install the [Feima Copilot extension](https://marketplace.visualstudio.com/items?itemName=feima.copilot-more-llms) and the Codex CLI, sign in to the CLI with your ChatGPT account, then type `@codex` in Copilot Chat and pick one of your subscription's models. Your requests run on the **real Codex agent** and are billed against your existing subscription — no extra cost, no extra API key.

## What you need

| Requirement | Notes |
|---|---|
| A ChatGPT plan that includes Codex (e.g. Plus or Pro) | The same account you already use |
| The [Codex CLI](https://developers.openai.com/codex/cli) installed and signed in | The extension drives your local `codex` binary — it doesn't bundle one |
| VS Code with the GitHub Copilot Chat extension | Feima Copilot builds on top of Copilot Chat |
| The Feima Copilot extension | Adds the `@codex` chat participant |

Native mode talks to OpenAI **directly from your machine using the CLI's own login** — exactly as if you ran `codex` in a terminal. It doesn't consume Feima credits, doesn't need a Feima API key, and nothing is routed through Feima's servers.

## Step 1 — Install Codex and sign in

If you already use Codex from a terminal with this subscription, skip this step — the extension reuses that exact login.

```bash
npm install -g @openai/codex
```

Then run `codex login` and sign in with your ChatGPT account in the browser window that opens. See the [official Codex CLI docs](https://developers.openai.com/codex/cli) for details.

Verify it works: launch `codex` and confirm it recognizes your plan — the same entitlements will appear in VS Code's model picker.

## Step 2 — Install Feima Copilot

1. Open Extensions (`Ctrl+Shift+X`) and search for "Feima Copilot", or open the [Marketplace page](https://marketplace.visualstudio.com/items?itemName=feima.copilot-more-llms)
2. Click **Install**
3. Make sure GitHub Copilot Chat is installed and you can open the Copilot Chat panel

See the [Installation Guide](/guides/installation) for all options.

## Step 3 — Chat with `@codex` using your subscription

1. Open the Copilot Chat panel.
2. In the chat input, type `@codex` followed by your request, e.g. `@codex write an integration test for the checkout flow`.
3. In the chat **model picker**, pick one of the models listed under your Codex subscription. This list is read live from the Codex CLI's own model listing — it reflects what your login actually entitles you to, not a hardcoded catalog.
4. Send the message.

That's it. What happens next:

- The **real Codex agent loop** runs — its own planning, tool use, and edit-review behavior — rendered inside Copilot Chat: streaming responses, inline tool-call display, and file edits applied directly as diffs you can accept or discard.
- Requests go straight from your machine to OpenAI under your subscription, billed exactly like a terminal session would be.
- `@codex` is **sticky** — follow-up messages keep going to it until you `@`-mention a different participant.

## Good to know

- **Permission tiers** — by default `@codex` asks before every tool action. Use `/acceptEdits` or `/fullAuto` at the start of a message to auto-approve for that turn, or set `feima.agents.codex.permissionMode` to change the persistent default. See [Permission tiers](/guides/agent-participants#permission-tiers).
- **Native vs. proxy sessions are separate** — if you switch the model picker from one of your subscription's models to a Copilot/BYOK model mid-conversation (or back), VS Code asks you to confirm, since the two modes keep separate histories. See [Native vs. proxy routing](/guides/agent-participants#native-vs-proxy-routing).
- **MCP servers & tools** — `@codex` picks up MCP servers from VS Code's own `mcp.json` config. See [MCP Servers & Tools for Agent Participants](/guides/agent-mcp-tools).
- **No subscription? No problem** — you can also use `@codex` in **proxy mode**, where the Codex agent loop is answered by a Copilot or BYOK model instead of an OpenAI subscription. See the [Agent Participants overview](/guides/agent-participants#native-vs-proxy-routing).

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| No Codex subscription models in the picker | CLI not installed, not on `PATH`, or not signed in | Install `codex`, run `codex login`, then reopen the picker |
| "Could not find the `codex` binary" | Binary not on `PATH` (common on macOS when VS Code is launched from the Dock) | Set `feima.agents.codex.binaryPath` to the absolute path of the `codex` binary |
| Auth errors, or the model list stays empty | Login expired or missing | Run `codex login` in a terminal and sign in again |
| Not sure what the extension sees | — | Run **"Feima: Show Account"** from the Command Palette — the **🧰 Agent CLI Status** section shows whether each CLI was found and its resolved path |

Full details in [Setup & Troubleshooting](/guides/agent-participants-setup).

## Related

- [Agent Participants](/guides/agent-participants) — what `@claude`, `@codex`, and `@copilot-cli` do, and which mode fits your situation
- [Setup & Troubleshooting](/guides/agent-participants-setup) — binary paths, permission defaults, diagnosing problems
- [Agent Proxy](/guides/agent-proxy) — using the Codex agent loop *without* a subscription, via Copilot/BYOK models
