---
title: Local & Enterprise Model Endpoints
description: Bring your own Ollama, LM Studio, vLLM, or enterprise gateway into the Copilot Chat model picker, and let Feima Auto route between them automatically
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Local & Enterprise Model Endpoints Guide for Feima Copilot",
        "description": "Register local runtimes and enterprise gateways in the Copilot Chat model picker, and let Feima Auto route between them automatically",
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

Feima Copilot's model picker isn't limited to Feima-hosted models. It can also surface anything you run yourself — a laptop running [Ollama](https://ollama.com) or [LM Studio](https://lmstudio.ai), a self-hosted vLLM/llama.cpp/SGLang/LiteLLM instance, an [Olla](https://github.com/thushan/olla) fleet, or an internal enterprise/private-cloud gateway — right alongside Feima-hosted models and your Claude/Codex subscriptions, in the same Copilot Chat picker.

On top of that, **Feima Auto** can pick the best one of those endpoints for you automatically, on a per-request basis, instead of you manually switching models.

## Getting your local runtime discovered automatically

On startup, the extension quietly probes well-known local ports (Ollama, LM Studio, and similar runtimes) and registers anything it finds. There's nothing to configure for the common case — install Ollama, pull a model, open VS Code, and it shows up in the Copilot Chat model picker under its own vendor entry.

> **Note on the remote/WSL/SSH case:** auto-discovery probes `127.0.0.1`, which — when VS Code itself is running remotely (Remote-SSH, Remote-WSL, a dev container, Codespaces) — is the *remote* machine, not necessarily wherever you're actually running Ollama or LM Studio. In that setup, [register the endpoint manually](#registering-an-endpoint-manually) with its real reachable address instead.

## Registering an endpoint manually

For an enterprise or private-cloud endpoint auto-discovery can't reach (or a local runtime on a non-default port), run **Feima Local Models: Add Model Endpoint** from the Command Palette. You'll be asked for:

- A base URL
- The wire protocol it speaks — `openai-compat` (vLLM, llama.cpp, SGLang, LiteLLM, and most others all speak this), `ollama-native`, or `anthropic-messages`
- An optional API key, if the endpoint requires one

The command also offers a few curated templates for well-known local runtimes, so you often only need to confirm a port rather than type a full URL and protocol by hand.

Capability metadata (context window, tool-calling support) is read from the endpoint itself when available, and clearly marked as *estimated* in the picker when it has to be inferred — never presented as fact when it's a guess. You can correct or add metadata for any model from the [Local & Enterprise Models view](#the-local--enterprise-models-view).

## Team-shared endpoints

Commit a `.feima/endpoints.json` file to your repository (URLs only, never secrets) so anyone who opens the workspace gets your team's shared gateway offered automatically:

```json
{
  "endpoints": [
    { "baseEndpoint": "https://models.internal.example.com", "label": "Team Gateway" }
  ]
}
```

Each entry accepts the same fields as manual registration (`baseEndpoint`, `apiFormat`, `modelEndpointPath`, `completionsEndpointPath`, `label`) — everything except a key. If you accidentally include an `apiKey` field, it's ignored and logged as a warning rather than silently trusted; team-shared config is meant to carry URLs only, with each teammate supplying their own key locally if the gateway needs one. Every candidate URL is probed and validated the same way a manual registration is, so a stale or wrong entry in the committed file doesn't get trusted blindly.

## The Local & Enterprise Models view

The **Local & Enterprise Models** view in the Explorer sidebar (also reachable via **Feima Local Models: Show Local & Enterprise Models**) lists every registered endpoint, grouped personal/team, each with a live health indicator and its discovered models. It updates automatically as health changes — no manual refresh needed. Right-click an endpoint (or its models) for:

- **Test Connection** — probe it on demand
- **Edit Endpoint** — change its URL, protocol, or key (personal entries only)
- **Remove Endpoint** — drop a personal entry (team-shared entries can only be removed by editing `.feima/endpoints.json`)
- **Add Model** / **Edit Model** — declare a model manually, or correct auto-detected metadata (context window, tool-calling, vision) that the endpoint itself reports incorrectly or not at all
- **Remove/Reset Model** — clear a manual override and fall back to what the endpoint reports

Pulled a new local model or changed something upstream? Run **Feima Local Models: Refresh Models** to re-discover immediately instead of waiting for the cache to expire.

## Feima Auto — pick a model automatically

Rather than manually choosing which registered endpoint to use every time, select **Feima Auto** in the model picker and it routes each request for you, disclosing which model was actually used and why on every response — for example:

> 🧭 **Feima Auto** routed to *Qwen3.6 Flash* — fastest qualifying endpoint on this machine

This is Feima's own router, distinct from VS Code's own built-in "Auto" entry, which only sees GitHub-hosted models. Feima Auto's candidate pool is your registered local/enterprise endpoints — not Feima-hosted models by default (see [below](#bringing-feima-hosted-models-into-feima-autos-pool) to change that), and not the Claude/Codex participants, since a CLI-driven agent session doesn't fit the same request/response shape as a model picker entry (use `@claude`/`@codex` for those instead — see [Agent Participants](/guides/agent-participants)).

### Choosing a strategy

Control how Feima Auto picks via the `feima.localModels.autoStrategy` setting:

| Strategy | Behavior |
|---|---|
| `local-first` | Prefer endpoints on this machine; only reach for a network endpoint (enterprise gateway, remote Olla) when nothing local qualifies — and says so when it does. |
| `balanced` (default) | Weighs task fit and capability confidence; locality is only a tie-breaker. |
| `most-capable` | Always picks the strongest qualifying endpoint, regardless of locality or latency. |

Feima Auto sticks with the same endpoint across a conversation rather than re-deciding every message, and it never hides the underlying picker entries — if a routing decision isn't what you wanted, picking a specific model directly always works.

### Bringing Feima-hosted models into Feima Auto's pool

By default, Feima Auto only routes among your own registered local/enterprise endpoints — not the main **Feima** picker entry. If you'd like your Feima-hosted models to participate too, run **Feima Local Models: Add My Feima-Hosted Models to Auto** and enter a Feima API key (from your [Feima dashboard](https://feimacode.com/use-api-keys)).

This registers Feima's hosted models as a local endpoint alongside your others, purely so they can participate in Feima Auto's routing pool. It's a convenience for that specific purpose, not a second way to access Feima-hosted models day-to-day — for everyday direct use, the main **Feima** entry in the picker remains the simplest option.

## Settings reference

| Setting | Description |
|---|---|
| `feima.localModels.autoStrategy` | How Feima Auto picks among your registered endpoints — `local-first`, `balanced` (default), or `most-capable`. |

## Next steps

- [Using Models](/guides/using-models) — the rest of the model picker: Feima-hosted models and how to switch between them.
- [Agent Participants](/guides/agent-participants) — drive the real Claude Code, Codex, and Copilot CLI agents, which sit outside the model picker entirely.
- [Configuration](/guides/configuration) — the full extension settings reference.
