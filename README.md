# Feima Copilot

> **Accelerating Intent into Execution**

A VS Code extension that adds alternative AI model support to GitHub Copilot Chat

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**English Version** | **[中文版](README-CN.md)**

## Quick Links

- 🛒 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=feima.copilot-cn-models) | [Download Feima Copilot](https://feimacode.com/download)
- 📖 [English Docs](https://docs.feimacode.com/) | [Chinese Docs](https://docs.feimacode.com/zh/)
- 🚀 [Quick Start](https://docs.feimacode.com/guides/quickstart/) | [快速入门](https://docs.feimacode.com/zh/guides/quickstart/)
- 📦 [Installation Guide](https://docs.feimacode.com/guides/installation/) | [安装指南](https://docs.feimacode.com/zh/guides/installation/)
- 🔧 [Configuration Options](https://docs.feimacode.com/guides/configuration/) | [配置选项](https://docs.feimacode.com/zh/guides/configuration/)
- 🤖 [Agent Participants](https://docs.feimacode.com/guides/agent-participants/) | [智能体参与者](https://docs.feimacode.com/zh/guides/agent-participants/)
- 💻 [Development Guide](https://docs.feimacode.com/dev/setup/) | [开发指南](https://docs.feimacode.com/zh/dev/setup/)

## Overview

Feima Copilot is a VS Code extension that adds alternative AI model support to GitHub Copilot Chat. Access top-tier models like DeepSeek, Qwen, and more — cost-effective alternatives with diverse model selection and benchmark-parity performance.

### Key Features

- � **Diverse Model Selection**: Qwen3.7, DeepSeek V4, GLM-5, MiniMax M3, Mimo V2.5, Kimi K2.7 Code
- 💬 **Seamless Integration**: Works directly in GitHub Copilot Chat, no interface switching needed
- 💰 **Pay-per-Request**: Request-based pricing, cost-controllable, no monthly subscriptions
- 🔒 **Secure & Reliable**: OAuth2 authentication, code never leaves VS Code
- 🧠 **Chain-of-Thought**: Full support for reasoning models, solving complex problems effortlessly
- 🤖 **Agent Participants (NEW)**: Drive the real Claude Code, Codex, and Copilot CLI agents with `@claude`, `@codex`, `@copilot-cli` — see below

### Why Choose Feima Copilot?

| Feature | GitHub Copilot Native | Feima Copilot Enhanced |
|---------|----------------------|------------------------|
| Cost Control | Fixed subscription | 💡 **Pay-per-request** |
| Chain-of-Thought | ⚠️ Limited | ✅ **Full Support** |
| Pricing | Monthly subscription | 🔥 **Cost-effective** |

### Supported Models

| Model | Provider | Features |
|-------|----------|----------|
| Qwen3.7 Max | Alibaba Cloud | ~1M context, chain-of-thought reasoning |
| Qwen3.6 Plus | Alibaba Cloud | 1M token context, 80K chain-of-thought, vision |
| Qwen3.6 Flash | Alibaba Cloud | 1M token context, thinking support (default) |
| Qwen3.7 Plus | Alibaba Cloud | ~1M context, vision, deep thinking |
| GLM-4.7 | Zhipu AI | 200K context, advanced reasoning |
| GLM-5 | Zhipu AI | 200K context, chain-of-thought reasoning |
| GLM 5.1 | Zhipu AI | 202K context, powerful reasoning |
| GLM 5.2 | Zhipu AI | 1M context, advanced reasoning |
| MiniMax M2.5 | MiniMax | 200K context, chain-of-thought reasoning |
| Kimi K2.6 | Moonshot | 256K context, chain-of-thought reasoning, vision |
| Kimi K2.7 Code | Moonshot | 256K context, code-specialized, vision |
| MiniMax M3 | MiniMax | 1M context, advanced reasoning |
| MiniMax M2.7 | MiniMax | 200K context, fast responses, reasoning |
| Mimo V2.5 | Xiaomi | 1M context, vision, advanced reasoning |
| Mimo V2.5 Pro | Xiaomi | 1M context, vision, reasoning (Pro tier) |
| DeepSeek V4 Pro | DeepSeek | 1M token context, deep thinking |
| DeepSeek V4 Flash | DeepSeek | 1M token context, fast |

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