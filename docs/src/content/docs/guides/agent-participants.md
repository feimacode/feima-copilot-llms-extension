---
title: Agent Participants
description: Use the real Claude Code, Codex, and Copilot CLI agents from inside VS Code chat
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Agent Participants in Feima Copilot",
        "description": "Use the real Claude Code, Codex, and Copilot CLI agents from inside VS Code chat",
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

Feima Copilot adds three chat participants — `@claude`, `@codex`, and `@copilot-cli` — that hand your chat turn to the *real* Claude Code, Codex, or GitHub Copilot CLI, while keeping VS Code's native chat experience: streaming responses, inline tool-call and diff rendering, and file edits applied directly in your editor. You never leave Copilot Chat or switch to a terminal.

This is different from just picking "Claude" or "GPT" in the Copilot model picker — those still run Copilot's own agent loop. Typing `@claude` or `@codex` runs the actual CLI's agent loop (its own planning, tool use, and edit-review behavior), just rendered inside VS Code.

## Is this for me? Common scenarios

| Your situation | Use this | Why |
|---|---|---|
| You already pay for Claude Pro/Max or ChatGPT Plus/Pro (for Codex), and want that same agent inside VS Code instead of a separate terminal window | `@claude` or `@codex`, with the tool's **own** model selected in the picker (**native mode**) — step-by-step: [Use a Claude Code Subscription](/guides/use-claude-code-subscription-in-vscode) / [Use a Codex Subscription](/guides/use-codex-subscription-in-vscode) | Uses your existing subscription's entitlement directly — no extra cost, no Copilot or Feima model involved |
| You like Claude Code's or Codex's agent workflow (planning, tool calls, edit review) but don't have — or don't want — a separate Anthropic/OpenAI subscription | `@claude` or `@codex`, with a **Copilot or BYOK model** selected in the picker (**proxy mode**) | Same CLI experience and tool loop, answered by whatever model your Copilot/BYOK plan already includes |
| You're curious what Claude Code's or Codex's workflow feels like, without signing up for anything new | Either participant, proxy mode | Zero new accounts — your existing Copilot chat model answers the requests |
| You want to run the actual `claude` or `codex` CLI in a regular terminal (outside VS Code), but billed through Copilot/BYOK instead of a separate API key | The **[Agent Proxy](/guides/agent-proxy)**'s external endpoints | Same local proxy this feature uses internally, reachable from outside VS Code too |
| You want Feima's models from a terminal tool, from anywhere, without VS Code open | The existing [hosted cloud API](/guides/using-models#anthropic-messages-api-compatible-models) — not this feature | That's an always-on hosted service with its own API key, independent of VS Code |
| You just want GitHub Copilot CLI's terminal-automation abilities without leaving Copilot Chat | `@copilot-cli` | Always proxy-routed through your Copilot/BYOK model — there's no separate Copilot-CLI-native billing path |

If none of that matched, start with [Setup & Troubleshooting](/guides/agent-participants-setup) to confirm the CLI you want is installed, then come back here.

## The three participants

| Participant | Backing CLI | What it's for |
|---|---|---|
| `@claude` | [Claude Code](https://docs.claude.com/en/docs/claude-code) | Deep codebase edits, refactors, multi-file changes with Claude's agent loop |
| `@codex` | [OpenAI Codex CLI](https://developers.openai.com/codex/cli) | Same, using Codex's agent loop |
| `@copilot-cli` | GitHub Copilot CLI | Coding and terminal automation tasks via Copilot's CLI agent |

All three are **sticky** — once you start a conversation with one, follow-up messages keep going to the same participant until you explicitly `@`-mention a different one.

## What it looks like

A conversation with an agent participant reads like a normal Copilot Chat exchange, but you can watch the agent read files and stage edits before they land:

```
You: @claude Refactor parseInvoice() to handle malformed dates and add tests

Claude: I'll take a look at the function first...
  ⚙ Reading src/billing/parseInvoice.ts
  ⚙ Reading test/billing/parseInvoice.test.ts
  ✎ Editing src/billing/parseInvoice.ts
  ✎ Creating test/billing/parseInvoice.test.ts
  Done — added guard clauses for 3 malformed date formats and 5 new test cases.
```

Some other things people commonly ask each participant to do:

| Participant | Example prompts |
|---|---|
| `@claude` | `@claude find and fix the race condition in the connection pool`  ·  `@claude add JSDoc comments to every exported function in src/utils/`  ·  `@claude /fullAuto migrate this file from CommonJS to ESM` |
| `@codex` | `@codex write an integration test for the checkout flow`  ·  `@codex why is this query slow, and fix it`  ·  `@codex /acceptEdits update all callers after renaming this function` |
| `@copilot-cli` | `@copilot-cli set up a GitHub Actions workflow to run our tests on PRs`  ·  `@copilot-cli find every place we log secrets and redact them` |

Edits appear directly in your open files, same as any other Copilot Chat edit — review them in the diff view, then accept or discard.

## Permission tiers

Every participant supports three sub-commands that control how much it asks before acting:

| Command | Behavior |
|---|---|
| `/ask` | Ask for approval before every tool action — the safe default |
| `/acceptEdits` | Auto-approve file edits; still ask before running commands or other tools |
| `/fullAuto` | Auto-approve everything and never ask — use when you trust the task to run end-to-end unattended, e.g. a scripted, well-understood refactor |

These sub-commands only override the behavior **for that one turn**. The persistent default for each participant is controlled by a setting — `feima.agents.claude.permissionMode`, `feima.agents.codex.permissionMode`, `feima.agents.copilot.permissionMode` — all defaulting to `"ask"`. See [Setup & Troubleshooting](/guides/agent-participants-setup) to change the default, or [Config Reference](/reference/config#agent-participant-settings) for the full settings list.

`@copilot-cli` also understands a few extra inline commands from Copilot CLI itself — `/compact`, `/plan`, `/autopilot` — typed as plain text at the start of your message.

## Native vs. proxy routing

Each participant's model picker offers two kinds of choices:

- **The tool's own models** (e.g. Claude Code's native model list, read live from your actual subscription entitlement). Picking one of these is **native routing**: the CLI talks to Anthropic/OpenAI directly using its own login, exactly as if you'd run it in a terminal.
- **Any other model** — a Copilot model, or a BYOK model you've configured. Picking one of these is **proxy routing**: the CLI's model calls are instead answered by a small local proxy server that speaks the model's expected API format, backed by whatever model you picked. See the [Agent Proxy guide](/guides/agent-proxy) for how this works under the hood.

Native and proxy conversations are kept as separate sessions. If you switch models mid-conversation in a way that would cross from native to proxy (or back), VS Code will ask you to confirm before continuing, since the two can't silently share history.

## Not the same as the hosted cloud API

If you've seen the [Anthropic Messages API-Compatible Models](/guides/using-models#anthropic-messages-api-compatible-models) section elsewhere in these docs, that's a **different feature**: a hosted API at `api.feimacode.com` for using Feima models from any Claude-Code-compatible tool, anywhere, with a `feima_sk_...` API key — independent of VS Code. Agent Participants and the Agent Proxy described here are local to your VS Code session and need no separate API key.

## Next steps

- [Use a Claude Code Subscription in VS Code](/guides/use-claude-code-subscription-in-vscode) — step-by-step for native `@claude` with your Claude Pro/Max subscription
- [Use a Codex Subscription in VS Code](/guides/use-codex-subscription-in-vscode) — step-by-step for native `@codex` with your ChatGPT Plus/Pro subscription
- [Setup & Troubleshooting](/guides/agent-participants-setup) — install the CLIs, configure binary paths and MCP servers, diagnose issues
- [Agent Proxy](/guides/agent-proxy) — how proxy routing works, and how to point an external terminal session at it
