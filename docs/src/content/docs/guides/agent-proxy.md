---
title: Agent Proxy
description: How Feima Copilot routes Claude Code, Codex, and Copilot CLI through your Copilot or BYOK models
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
        "headline": "Agent Proxy Guide for Feima Copilot",
        "description": "How Feima Copilot routes Claude Code, Codex, and Copilot CLI through your Copilot or BYOK models",
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

# Agent Proxy

The Agent Proxy is what powers **proxy mode** for the [Agent Participants](/guides/agent-participants) — it's what lets `@claude`, `@codex`, and `@copilot-cli` answer their requests using a Copilot or BYOK model instead of a native Anthropic/OpenAI subscription. This page explains how it works, and how to point an external terminal session at it too.

> **Looking for general-purpose usage beyond these three participants?** The same local proxy can back *any* OpenAI- or Anthropic-compatible tool, not just the built-in participants — see [LLM Proxy](/guides/llm-proxy) for the broader picture, including driving the standalone `codex`/`claude` CLIs off your Copilot subscription.

## What it is

When the extension activates, it starts two small local HTTP servers, bound only to `127.0.0.1`:

- An **OpenAI Responses-compatible** server (`/v1/responses`, `/v1/chat/completions`, `/v1/models`) — used by `@codex` and `@copilot-cli` in proxy mode.
- An **Anthropic Messages-compatible** server (`/v1/messages`, `/v1/messages/count_tokens`, `/v1/models`) — used by `@claude` in proxy mode.

Both translate incoming requests into calls against whatever model is currently selected in VS Code's chat model picker — a Copilot model, or any BYOK model provider you've configured — and translate the response back into the format the calling CLI expects. From the CLI's point of view, it's just talking to Anthropic or OpenAI; it has no idea the other end is actually your Copilot/BYOK model.

This is entirely local and automatic — there's no command to start or stop it, and no configuration needed for participants to use it. It's only relevant to configure by hand if you want to reach it from **outside** VS Code (see below).

## Security model

- Bound to `127.0.0.1` only — not reachable from other machines or containers.
- Every request must include `Authorization: Bearer <token>`, where the token is a random value generated once when the proxy starts.
- **The token (and the port) are not stable across VS Code restarts or window reloads.** If you've copied them into a shell profile or `.env` file, they'll go stale the next time VS Code restarts — always get the current values from the Account dialog rather than hardcoding them long-term.

## Using it from outside VS Code (advanced)

If you want to run the real `claude` or `codex` CLI in a plain terminal — not through the `@claude`/`@codex` chat participants — but still have it billed through your Copilot/BYOK model instead of a separate Anthropic/OpenAI subscription, you can point it at the same proxy:

1. Run **"Feima: Show Account"** from the Command Palette.
2. Find the **🔌 Agent Proxy** section — it lists the Responses URL/Token (for OpenAI-style tools) and Messages URL/Token (for Anthropic-style tools), each with a Copy button.
3. Export them before launching the CLI, e.g. for Claude Code:

   ```bash
   export ANTHROPIC_BASE_URL="<Messages URL from Account dialog>"
   export ANTHROPIC_AUTH_TOKEN="<Messages Token from Account dialog>"
   claude
   ```

   VS Code must stay open for the proxy to keep responding — this only works while your VS Code window with the extension is running.

## Model addressing

Because the proxy can serve multiple model providers behind one endpoint, models are addressed as `vendor/modelId` (for example `copilot/gpt-5.5`) so it can tell apart identically-named models from different providers. A plain `modelId` without a vendor prefix also works as a fallback if there's no ambiguity.

## How this differs from the hosted cloud API

Feima also offers a separate, unrelated way to use its models from Claude-Code-compatible tools — documented in [Using Models → Anthropic Messages API-Compatible Models](/guides/using-models#anthropic-messages-api-compatible-models). Don't confuse the two:

| | Agent Proxy (this page) | Hosted cloud API |
|---|---|---|
| Where it runs | Locally, inside your VS Code process | Feima's servers (`api.feimacode.com`) |
| Auth | Ephemeral token from the Account dialog | Long-lived `feima_sk_...` API key |
| Available when... | VS Code is open with the extension active | Anywhere, anytime — no VS Code needed |
| Models it serves | Whatever model is selected in VS Code's model picker (Copilot or BYOK) | A fixed set of Feima-hosted models |
| Typical use | Driving `@claude`/`@codex`/`@copilot-cli` inside VS Code, or an external CLI session tied to your current VS Code session | A CI pipeline, a remote server, or any tool that isn't running alongside VS Code |
