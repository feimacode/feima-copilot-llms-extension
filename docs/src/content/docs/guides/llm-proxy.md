---
title: LLM Proxy
description: Use Feima's local OpenAI- and Anthropic-compatible proxy to drive any external tool — including the standalone Codex and Claude Code CLIs — with your Copilot or BYOK models
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "LLM Proxy Guide for Feima Copilot",
        "description": "Use Feima's local OpenAI- and Anthropic-compatible proxy to drive any external tool with your Copilot or BYOK models",
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

Feima Copilot runs a small local API gateway inside VS Code that re-exposes whatever model you currently have selected — a GitHub Copilot model, or any BYOK provider you've configured — as a standard **OpenAI-compatible** and **Anthropic-compatible** API. It's what powers proxy mode for the [Agent Participants](/guides/agent-participants) (`@claude`, `@codex`, `@copilot-cli`), but that's only one consumer of it. Anything on your machine that speaks either protocol can point at it directly: other CLIs, editor extensions, scripts, or your own code.

The headline use case: **if you only have a GitHub Copilot subscription — no separate OpenAI or Anthropic API key — you can still run the standalone `codex` or `claude` CLIs (or any other OpenAI/Anthropic-shaped tool) against your Copilot models.** The CLI never knows it isn't talking to OpenAI or Anthropic; Copilot is doing the work underneath.

## What makes this different

Most proxy-style extensions in the VS Code marketplace do one of two things: they forward a hardcoded API key to a single fixed backend, or they translate one wire protocol into calls against one fixed model. Feima's proxy does something most don't:

- **It serves both protocols from the same model at once.** The exact model you have selected in VS Code's chat model picker is reachable as an OpenAI Responses/Chat Completions endpoint *and* as an Anthropic Messages endpoint, at the same time, with no extra setup. A tool built only for "OpenAI" or only for "Anthropic" doesn't care — it just sees the shape of API it expects.
- **It bridges subscriptions across ecosystems.** Tools like the Codex CLI or Claude Code CLI assume you're paying OpenAI or Anthropic directly. Point them at this proxy instead and your Copilot (or BYOK) subscription answers the request — no second subscription, no separate API key to manage.

## What it is

When the extension activates, it starts two small local HTTP servers, bound only to `127.0.0.1`:

- An **OpenAI-compatible** server — `POST /v1/responses`, `POST /v1/chat/completions`, `GET /v1/models`.
- An **Anthropic-compatible** server — `POST /v1/messages`, `POST /v1/messages/count_tokens`, `GET /v1/models`.

Both translate incoming requests into calls against whatever model is currently selected in VS Code's chat model picker, and translate the response back into the format the caller expects. This is entirely local and automatic — there's no command to start or stop it, and nothing to install on top of the extension.

> **Already using `@claude`/`@codex`/`@copilot-cli` in VS Code chat?** Those participants use this same proxy automatically in proxy mode — you don't need to do anything described on this page for them. See [Agent Proxy](/guides/agent-proxy) for that participant-specific wiring. This page is about pointing your *own* tools — including the standalone CLIs run in a plain terminal — at the same endpoints.

## Getting your endpoint and token

1. Run **"Feima: Show Account"** from the Command Palette.
2. Find the **🔌 Agent Proxy** section — it lists the Responses URL/Token (OpenAI-style) and Messages URL/Token (Anthropic-style), each with a Copy button.

Keep in mind:

- Bound to `127.0.0.1` only — nothing outside your machine can reach it.
- Every request needs `Authorization: Bearer <token>`, where the token is a random value generated once per VS Code session.
- **The port and token are not stable across VS Code restarts or window reloads.** Don't hardcode them into a shell profile — pull the current values from the Account dialog each time, or read them at launch time in a script.
- VS Code must stay open with the extension active for the proxy to keep responding.

## Model addressing

Since the proxy can serve models from multiple providers behind one endpoint, address a specific one as `vendor/modelId` — for example `copilot/gpt-5.5`. A plain `modelId` without a vendor prefix also works as a fallback when there's no ambiguity. Call `GET /v1/models` (with your token) to list what's currently available.

## Connecting an OpenAI-compatible tool

Anything that talks to the OpenAI Chat Completions or Responses API can use the Responses URL/Token as a drop-in replacement for `https://api.openai.com`. The server understands both wire formats — pick whichever your tool speaks.

### Chat Completions API

The older, more widely supported shape — used by most OpenAI-compatible tools (Continue, aider, LangChain, custom scripts):

```bash
curl http://127.0.0.1:<port>/v1/chat/completions \
  -H "Authorization: Bearer <Responses Token>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "copilot/gpt-5.5",
    "messages": [{ "role": "user", "content": "Say hello in one sentence." }]
  }'
```

### Responses API

OpenAI's newer, stateful-shaped API — this is what the Codex CLI and OpenAI's Agents SDK use by default. It takes an `input` array of message items instead of a flat `messages` array:

```bash
curl http://127.0.0.1:<port>/v1/responses \
  -H "Authorization: Bearer <Responses Token>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "copilot/gpt-5.5",
    "input": [
      {
        "type": "message",
        "role": "user",
        "content": [{ "type": "input_text", "text": "Say hello in one sentence." }]
      }
    ]
  }'
```

Most tools just need two environment variables, regardless of which of the two shapes they use internally:

```bash
export OPENAI_BASE_URL="http://127.0.0.1:<port>/v1"
export OPENAI_API_KEY="<Responses Token>"
```

## Connecting an Anthropic-compatible tool

Anything that talks to the Anthropic Messages API can use the Messages URL/Token the same way:

```bash
curl http://127.0.0.1:<port>/v1/messages \
  -H "Authorization: Bearer <Messages Token>" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "copilot/claude-opus-4.5",
    "max_tokens": 256,
    "messages": [{ "role": "user", "content": "Say hello in one sentence." }]
  }'
```

Or as environment variables:

```bash
export ANTHROPIC_BASE_URL="http://127.0.0.1:<port>"
export ANTHROPIC_AUTH_TOKEN="<Messages Token>"
```

## Example: standalone Codex CLI, driven by Copilot

The real `codex` CLI (run in a plain terminal, not the `@codex` chat participant) supports registering a custom model provider in `~/.codex/config.toml`. Point it at the proxy's Responses URL instead of OpenAI:

```toml
model_provider = "feima-copilot"

[model_providers.feima-copilot]
name = "Feima Copilot Proxy"
base_url = "http://127.0.0.1:<port>/v1"
wire_api = "responses"
env_key = "OPENAI_API_KEY"
requires_openai_auth = false
```

Then, since the port and token change every VS Code session, export the current token right before launching rather than baking it into a static file:

```bash
export OPENAI_API_KEY="<Responses Token from Account dialog>"
codex
```

VS Code needs to be open with the extension active while `codex` is running. This is the same mechanism the built-in `@codex` participant uses in proxy mode — just applied to the standalone CLI outside VS Code.

## Example: standalone Claude Code CLI, driven by Copilot

```bash
export ANTHROPIC_BASE_URL="<Messages URL from Account dialog>"
export ANTHROPIC_AUTH_TOKEN="<Messages Token from Account dialog>"
claude
```

See [Agent Proxy](/guides/agent-proxy#using-it-from-outside-vs-code-advanced) for more detail on this flow.

## How this differs from the hosted cloud API

Feima also offers a separate, unrelated way to reach its models with a long-lived API key — documented in [Using Models → Anthropic Messages API-Compatible Models](/guides/using-models#anthropic-messages-api-compatible-models) and [API Keys](/guides/api-keys). Don't confuse the two:

| | Local LLM Proxy (this page) | Hosted cloud API |
|---|---|---|
| Where it runs | Locally, inside your VS Code process | Feima's servers (`api.feimacode.com`) |
| Auth | Ephemeral token from the Account dialog | Long-lived `feima_sk_...` API key |
| Available when... | VS Code is open with the extension active | Anywhere, anytime — no VS Code needed |
| Models it serves | Whatever model is selected in VS Code's model picker (Copilot or BYOK) | A fixed set of Feima-hosted models |
| Typical use | Driving any local tool — a standalone CLI, script, or editor extension — off your Copilot/BYOK subscription | A CI pipeline, a remote server, or any tool that isn't running alongside VS Code |

## Next steps

- [Agent Participants](/guides/agent-participants) — the built-in `@claude`/`@codex`/`@copilot-cli` chat participants that use this proxy automatically.
- [Agent Proxy](/guides/agent-proxy) — participant-specific proxy wiring and security details.
- [Using Models](/guides/using-models) — what models are available and how to pick one.
