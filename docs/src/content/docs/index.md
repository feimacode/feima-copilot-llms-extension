---
title: Feima Copilot Documentation
description: More models for Copilot Chat, native Claude/Codex/Copilot CLI agent subscriptions, and a local LLM proxy for any tool
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Feima Copilot Docs",
        "url": "https://docs.feimacode.com",
        "description": "VS Code extension: more models for Copilot Chat, native Claude/Codex/Copilot CLI agent subscriptions, and a local LLM proxy",
        "inLanguage": ["en", "zh-CN"],
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://docs.feimacode.com/?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      }
---

**More models. Native agent subscriptions. A local LLM proxy for everything else.**

Feima Copilot is a VS Code extension built around three things: more models for Copilot Chat, native `@claude`/`@codex`/`@copilot-cli` agent participants that run on your own Claude Code/Codex/Copilot CLI subscription, and a local LLM proxy that lets any OpenAI- or Anthropic-compatible tool run on your Copilot or BYOK models.

## What is Feima Copilot?

**Feima Copilot** is a VS Code extension that provides:

- � **Diverse Model Selection**: Direct access to Qwen3, DeepSeek V3.2, GLM-5, MiniMax M2.5, Kimi K2.5, Kimi K3, HY3 and more
- 💬 **Seamless Integration**: Works directly within GitHub Copilot Chat without switching interfaces
- 💰 **Pay-Per-Use**: Pay only for requests you make, not monthly subscriptions
- 🔒 **Secure**: OAuth2 authentication with code that never leaves VS Code
- 🧠 **Thinking Models**: Support for chain-of-thought reasoning for complex problems
- 🤖 **Agent Participants**: Drive the real Claude Code, Codex, and Copilot CLI agents right inside VS Code chat with `@claude`, `@codex`, `@copilot-cli`
- 🔌 **Local LLM Proxy**: Point any OpenAI- or Anthropic-compatible tool — even outside VS Code — at your Copilot or BYOK models

## Quick Start

<CardGrid stagger>
  <Card title="Install" icon="lucide:download">
    Install the extension from VS Code Marketplace and GitHub Copilot Chat
  </Card>
  <Card title="Authenticate" icon="lucide:user">
    Sign in with your Feimacode account via OAuth2
  </Card>
  <Card title="Select Model" icon="lucide:bot">
    Choose your preferred model in Copilot Chat
  </Card>
  <Card title="Start Coding" icon="lucide:code">
    Ask questions, get code suggestions, and boost your productivity
  </Card>
</CardGrid>

## Supported Models

| Model | Provider | Context | Features |
|-------|----------|---------|----------|
| Qwen3 Max | Alibaba | 256K | Thinking chain, tool calls |
| Qwen3 Coder Plus | Alibaba | 1M | Code specialized, 1M context |
| Qwen3.5 Plus | Alibaba | 1M | 80K thinking chain |
| DeepSeek V3.2 | DeepSeek | 128K | Thinking, sparse attention |
| GLM-5 | Zhipu AI | 200K | Thinking chain, tool calls |
| GLM-4.7 | Zhipu AI | 200K | Advanced reasoning |
| MiniMax M2.5 | MiniMax | 200K | Thinking chain |
| Kimi K2.5 | Moonshot | 256K | Thinking chain |
| Kimi K3 | Moonshot | 1M | Vision, deep thinking |
| HY3 | Tencent | 256K | Thinking support |

## Why Feima Copilot?

| Feature | GitHub Copilot Native | Feima Copilot Enhanced |
|---------|----------------------|----------------------|
| Cost Control | Fixed subscription | 💡 **Pay-per-request** |
| International Models | ⚠️ Limited access | ✅ **Full access** |
| Pricing | Monthly subscription | 🔥 **Cost-effective** |
| Data Residency | US/EU only | ✅ **Singapore-based** |

### Data Residency & Privacy

Our servers are located in **Singapore**, and most LLM providers we work with also operate in the same region. This ensures:

- ✅ Your code and data stay within Southeast Asia
- ✅ No data transfer to China
- ✅ Compliance with regional data protection requirements

## Agent Participants: bring your own CLI agent

Beyond model access, Feima Copilot lets you drive the *real* Claude Code, Codex, and GitHub Copilot CLI agents from directly inside GitHub Copilot Chat — `@claude`, `@codex`, and `@copilot-cli` — with each CLI's own planning and tool-use loop, rendered in VS Code's native chat UI.

- Already have a Claude Pro/Max or ChatGPT Plus subscription? Use it natively, at no extra cost.
- Don't have one? Route the same agent workflow through a Feima or Copilot model instead — no separate subscription required.
- Every action can require approval, auto-approve edits only, or run hands-off, per turn or by default.

👉 [Agent Participants Overview](/guides/agent-participants) — full guide, including a scenario table to help you pick the right participant and mode for your situation.

👉 Want the same local proxy outside these three participants? See [LLM Proxy](/guides/llm-proxy) for driving any OpenAI- or Anthropic-compatible tool off your Copilot or BYOK models.

## Development Status

**Current Version**: v0.1.0-alpha (In Development)

We're implementing core features:
- ✅ OAuth2 authentication system
- ✅ Language model providers
- 🚧 GitHub Copilot Chat integration testing
- ⏸️ Quota management (pending verification)

## Resources

- [Quick Start Guide](/guides/quickstart) - Get up and running in minutes
- [Installation Guide](/guides/installation) - Detailed installation instructions
- [Authentication Guide](/guides/authentication) - Set up OAuth2 authentication
- [Agent Participants](/guides/agent-participants) - Drive Claude Code, Codex, and Copilot CLI from VS Code chat
- [Development Setup](/dev/setup) - Contribute to the project

## Get Involved

We welcome community contributions! See our [Development Guide](/dev/setup) to learn how to participate.

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Feature Requests](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.com)

---

Made with ❤️ by [Feima Team](https://feimacode.com)