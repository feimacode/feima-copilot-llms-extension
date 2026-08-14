# Feima Copilot

> **More models for Copilot Chat. Your own Claude Code, Codex & Copilot CLI subscriptions, natively in VS Code. A local proxy for any tool.**

A VS Code extension that turns GitHub Copilot into a model provider (DeepSeek, Qwen, GLM, and more), a home for your own Claude Code/Codex/Copilot CLI subscriptions inside chat, and a local LLM proxy for any OpenAI- or Anthropic-compatible tool

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**English Version** | **[中文版](README-CN.md)**

## Quick Links

- 🛒 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=feima.copilot-cn-models) | [Download Feima Copilot](https://feimacode.com/download)
- 📖 [English Docs](https://docs.feimacode.com/) | [Chinese Docs](https://docs.feimacode.com/zh/)
- 🚀 [Quick Start](https://docs.feimacode.com/guides/quickstart/) | [快速入门](https://docs.feimacode.com/zh/guides/quickstart/)
- 📦 [Installation Guide](https://docs.feimacode.com/guides/installation/) | [安装指南](https://docs.feimacode.com/zh/guides/installation/)
- 🔧 [Configuration Options](https://docs.feimacode.com/guides/configuration/) | [配置选项](https://docs.feimacode.com/zh/guides/configuration/)
- 🤖 [Agent Participants](https://docs.feimacode.com/guides/agent-participants/) | [智能体参与者](https://docs.feimacode.com/zh/guides/agent-participants/)
- 🔌 [LLM Proxy](https://docs.feimacode.com/guides/llm-proxy/) | [本地代理](https://docs.feimacode.com/zh/guides/llm-proxy/)
- 💻 [Development Guide](https://docs.feimacode.com/dev/setup/) | [开发指南](https://docs.feimacode.com/zh/dev/setup/)

## Overview

Feima Copilot is a VS Code extension built around three things: **more models** for Copilot Chat (DeepSeek, Qwen, GLM, and more — cost-effective alternatives with diverse model selection and benchmark-parity performance), **native agent participants** that drive your own Claude Code/Codex/Copilot CLI subscriptions right inside chat, and a **local LLM proxy** that lets any OpenAI- or Anthropic-compatible tool run on your Copilot or BYOK models.

### Key Features

- � **Diverse Model Selection**: Qwen3.8, DeepSeek V4, GLM-5, MiniMax M3, Mimo V2.5, Kimi K2.7 Code, Kimi K3, HY3
- 💬 **Seamless Integration**: Works directly in GitHub Copilot Chat, no interface switching needed
- 💰 **Pay-per-Request**: Request-based pricing, cost-controllable, no monthly subscriptions
- 🔒 **Secure & Reliable**: OAuth2 authentication, code never leaves VS Code
- 🧠 **Chain-of-Thought**: Full support for reasoning models, solving complex problems effortlessly
- 🤖 **Agent Participants (NEW)**: Drive the real Claude Code, Codex, and Copilot CLI agents with `@claude`, `@codex`, `@copilot-cli` — see below
- 🔌 **Local LLM Proxy**: Power any OpenAI- or Anthropic-compatible tool — even outside VS Code — with your Copilot or BYOK models
- 🖥️ **Local & Enterprise Endpoints (NEW)**: Every model source in one picker — Feima-hosted, your Claude/Codex subscription, and now your own local runtimes (Ollama, LM Studio, vLLM, llama.cpp, SGLang, LiteLLM, [Olla](https://github.com/thushan/olla)) or an enterprise/private-cloud gateway — see below
- 🧭 **Auto (NEW)**: Automatically routes each request to the best available local/enterprise endpoint — `local-first`, `balanced`, or `most-capable` — with disclosure on every response, instead of manually picking every time

### Why Choose Feima Copilot?

| Feature | GitHub Copilot Native | Feima Copilot Enhanced |
|---------|----------------------|------------------------|
| Cost Control | Fixed subscription | 💡 **Pay-per-request** |
| Chain-of-Thought | ⚠️ Limited | ✅ **Full Support** |
| Pricing | Monthly subscription | 🔥 **Cost-effective** |

### Supported Models

| Model | Provider | Features |
|-------|----------|----------|
| Qwen3.8 Max | Alibaba Cloud | ~1M context, deep chain-of-thought reasoning (Pro) |
| Qwen3.7 Max | Alibaba Cloud | ~1M context, chain-of-thought reasoning |
| Qwen3.6 Plus | Alibaba Cloud | 1M token context, 80K chain-of-thought, vision |
| Qwen3.6 Flash | Alibaba Cloud | 1M token context, thinking support (default) |
| Qwen3.7 Plus | Alibaba Cloud | ~1M context, vision, deep thinking |
| GLM-4.7 | Zhipu AI | 200K context, advanced reasoning |
| GLM-5 | Zhipu AI | 200K context, chain-of-thought reasoning |
| GLM 5.1 | Zhipu AI | 202K context, powerful reasoning |
| GLM 5.2 | Zhipu AI | 1M context, advanced reasoning |
| GLM 5.3 | Zhipu AI | 1M context, advanced reasoning |
| MiniMax M2.5 | MiniMax | 200K context, chain-of-thought reasoning |
| Kimi K2.6 | Moonshot | 256K context, chain-of-thought reasoning, vision |
| Kimi K2.7 Code | Moonshot | 256K context, code-specialized, vision |
| MiniMax M3 | MiniMax | 1M context, advanced reasoning |
| MiniMax M2.7 | MiniMax | 200K context, fast responses, reasoning |
| Mimo V2.5 | Xiaomi | 1M context, vision, advanced reasoning |
| Mimo V2.5 Pro | Xiaomi | 1M context, vision, reasoning (Pro tier) |
| DeepSeek V4 Pro | DeepSeek | 1M token context, deep thinking |
| DeepSeek V4 Flash | DeepSeek | 1M token context, fast |
| Kimi K3 | Moonshot | 1M context, vision, deep thinking (premium) |
| HY3 | Tencent | 256K context, thinking support (free tier) |

## 🖥️ Local & Enterprise Model Endpoints

**One picker, every model source.** Alongside Feima-hosted models and your Claude/Codex subscriptions (below), Feima Copilot can surface models from anything you run yourself — a laptop running Ollama or LM Studio, a self-hosted vLLM/llama.cpp/SGLang/LiteLLM instance, an [Olla](https://github.com/thushan/olla) fleet, or an internal enterprise gateway — right in the same Copilot Chat model picker.

- **Auto-discovery**: on startup, the extension quietly checks well-known local ports (Ollama, LM Studio, and friends) and adds anything it finds — nothing to configure for the common local case.
- **Manual registration**: for an enterprise or private-cloud endpoint auto-discovery can't reach, run **Feima: Add Model Endpoint** and give it a base URL, protocol, and optional API key.
- **Team-shared endpoints**: commit a `.feima/endpoints.json` (URLs only, never secrets) to your repo so anyone who opens the workspace gets your team's shared gateway offered automatically. Example:
  ```json
  {
    "endpoints": [
      { "baseEndpoint": "https://models.internal.example.com", "label": "Team Gateway" }
    ]
  }
  ```
- **Refresh on demand**: pulled a new local model or changed something? Run **Feima: Refresh Models** to re-discover immediately instead of waiting for the cache to expire.
- **See what's registered**: the **Local & Enterprise Models** view in the Explorer sidebar lists every registered endpoint, grouped personal/team, with a live health indicator and its discovered models. Right-click an endpoint to remove it (personal entries only) or test its connection on demand — the view updates automatically as health changes, no manual refresh needed.

Capability metadata (context window, tool-calling support) is read from the endpoint itself when available, and clearly marked as *estimated* in the picker when it has to be inferred — never presented as fact when it's a guess.

> **Note on the remote/WSL/SSH case**: auto-discovery probes `127.0.0.1`, which — when VS Code itself is running remotely (Remote-SSH, Remote-WSL, a dev container, Codespaces) — is the *remote* machine, not necessarily wherever you're actually running Ollama or LM Studio. In that setup, register the endpoint manually instead.

### Auto — pick a model automatically, from among your local/enterprise endpoints

Rather than manually choosing which registered endpoint to use every time, select **Auto** in the model picker and it routes each request for you, disclosing which model was actually used and why on every response. Auto's pool is your local/enterprise endpoints only, for now — not Feima-hosted models, and not the Claude/Codex participants (they need `@claude`/`@codex`, not the model picker, since a CLI-driven agent session doesn't fit the same request/response shape).

Choose how it picks via `feima.localModels.autoStrategy`:

| Strategy | Behavior |
|---|---|
| `local-first` | Prefer endpoints on this machine; only reach for a network endpoint (enterprise gateway, remote Olla) when nothing local qualifies — and says so when it does. |
| `balanced` (default) | Weighs task fit and capability confidence; locality is only a tie-breaker. |
| `most-capable` | Always picks the strongest qualifying endpoint, regardless of locality or latency. |

Auto sticks with the same endpoint across a conversation rather than re-deciding every message, and it never hides the underlying `feima`/`feima-local` picker entries — if a routing decision isn't what you wanted, picking a specific model directly always works.

**Want your Feima-hosted models in Auto's pool too?** Run **Feima: Add My Feima-Hosted Models to Auto**. This is a convenience, not a second way to access Feima-hosted models — it snapshots your current access token into the local endpoint registry, which means it can go stale (Feima's real login uses a refreshing OAuth token; this shortcut doesn't). If it starts failing, just re-run the command. For everyday use, the main **Feima** entry in the picker already gives you continuous, always-fresh access — this shortcut exists purely so those same models can participate in Auto's routing pool.

## 🤖 Agent Participants — Claude Code, Codex & Copilot CLI, natively in VS Code

**Feima Copilot isn't just another model provider — it also lets you drive the *real* Claude Code, Codex, and GitHub Copilot CLI agents from directly inside GitHub Copilot Chat.**

Type `@claude`, `@codex`, or `@copilot-cli` and you get that CLI's own agent loop — its own planning, tool calls, and file-edit review — rendered with VS Code's native chat UI: streaming responses, inline diffs, no terminal window, no copy-pasting code back and forth.

### Which one is for you?

| If you… | Try | Why |
|---|---|---|
| Already pay for **Claude Pro/Max** or **ChatGPT Plus/Pro** | `@claude` / `@codex`, with the CLI's own model selected | Uses your existing subscription directly — no extra cost, nothing else to configure |
| Don't have (or don't want) a separate Anthropic/OpenAI subscription | `@claude` / `@codex`, with a **Feima or Copilot model** selected instead | Same agent workflow and tool loop, powered by a model you already have access to |
| Just want **GitHub Copilot CLI**'s terminal-automation skills without leaving chat | `@copilot-cli` | Runs Copilot CLI's agent, powered by your Copilot/Feima model |
| Want to try Claude Code's or Codex's workflow before committing to a subscription | Either participant, with a Feima/Copilot model | Zero new signups — see what the fuss is about first |
| Want the real `claude`/`codex` CLI in a plain terminal, billed through Copilot/Feima instead of a separate API key | The built-in **Agent Proxy** (Feima: Show Account → 🔌 Agent Proxy) | Same local routing, reachable outside VS Code too |

### What it looks like

```
You: @claude Refactor parseInvoice() to handle malformed dates and add tests

Claude: I'll take a look at the function first...
  ⚙ Reading src/billing/parseInvoice.ts
  ⚙ Reading test/billing/parseInvoice.test.ts
  ✎ Editing src/billing/parseInvoice.ts
  ✎ Creating test/billing/parseInvoice.test.ts
  Done — added guard clauses for 3 malformed date formats and 5 new test cases.
```

No terminal, no `cd`, no copy-paste — the edits land in your open editor exactly like a native Copilot Chat edit would.

### Under the hood

- **Three permission tiers** per turn — `/ask` (review everything), `/acceptEdits` (auto-approve file edits, still ask before commands), `/fullAuto` (hands-off) — or set a persistent default per participant.
- **Bring your own model** — point any participant at a Copilot or BYOK model through a local, loopback-only Agent Proxy; no separate Anthropic/OpenAI API key required.
- **MCP servers** — wire your own MCP tools into `@claude` and `@codex` via settings.
- **Your CLI, your login** — native mode uses the CLI's own subscription and login exactly as it would from a terminal; the extension never touches your Anthropic/OpenAI credentials.

📖 Learn more: [Agent Participants Overview](https://docs.feimacode.com/guides/agent-participants/) · [Setup & Troubleshooting](https://docs.feimacode.com/guides/agent-participants-setup/) · [Agent Proxy Guide](https://docs.feimacode.com/guides/agent-proxy/)

## Development Status

**Current Version**: v0.1.0-alpha (In Development)

We are implementing core features:
- ✅ OAuth2 authentication system
- ✅ Language model provider
- 🚧 GitHub Copilot Chat integration testing
- ⏸️ Quota management (to be implemented after validation)

## Release Process

### Automated Release (GitHub Release)

Push version tags to trigger automatic build and release:

```bash
# Update package.json version
npm version patch  # or minor / major

# Push tags
git push --follow-tags
```

The workflow automatically:
1. Builds two VSIX variants (CN + Global)
2. Generates SHA-256 checksums
3. Creates GitHub Release with all artifacts

### Manual Publish to VS Code Marketplace

1. Ensure GitHub Release is created
2. Trigger `publish-marketplace.yml` workflow in GitHub Actions
3. Enter version number (without v prefix)
4. Enter "PUBLISH" to confirm
5. Wait for publishing to complete

**Prerequisites**:
- `VSCE_PAT` secret configured (Personal Access Token)
- Version must match GitHub Release
- Pre-release versions (-alpha, -beta) cannot be published to marketplace


## Contributing

We welcome community contributions! Check out the [full documentation](https://docs.feimacode.com/dev/setup/) to learn how to participate in development.

```bash
# Clone repository
git clone https://github.com/feimacode/feima-copilot-llms-extension.git
cd feima-copilot-llms-extension

# Install dependencies
npm install

# Compile
npm run ext:compile

# Open in VS Code
code .

# Press F5 to start debugging
```

## Documentation

For complete documentation, visit:
- [Chinese Documentation](https://docs.feimacode.com/zh/)
- [English Documentation](https://docs.feimacode.com/)

## Support & Contact

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Feature Requests](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.com)

## License

MIT License - See [LICENSE](LICENSE) file for details

---

<p align="center">
  <strong>Accelerating Intent into Execution - 加速创意落地</strong><br>
  Made with ❤️ by <a href="https://feimacode.com">Feimacode Team</a>
</p>