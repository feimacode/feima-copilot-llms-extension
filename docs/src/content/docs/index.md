---
title: Feima Copilot Documentation
description: Accelerating intent into execution - Alternative AI models for GitHub Copilot Chat
---

# Welcome to Feima Copilot

**Accelerating intent into execution**

Feima Copilot is a VS Code extension that enhances GitHub Copilot Chat with alternative AI model support — cost-effective alternatives with diverse model selection.

## What is Feima Copilot?

**Feima Copilot** is a VS Code extension that provides:

- � **Diverse Model Selection**: Direct access to Qwen3, DeepSeek V3.2, GLM-5, MiniMax M2.5, Kimi K2.5 and more
- 💬 **Seamless Integration**: Works directly within GitHub Copilot Chat without switching interfaces
- 💰 **Pay-Per-Use**: Pay only for requests you make, not monthly subscriptions
- 🔒 **Secure**: OAuth2 authentication with code that never leaves VS Code
- 🧠 **Thinking Models**: Support for chain-of-thought reasoning for complex problems

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
- [Development Setup](/dev/setup) - Contribute to the project

## Get Involved

We welcome community contributions! See our [Development Guide](/dev/setup) to learn how to participate.

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Feature Requests](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.com)

---

Made with ❤️ by [Feima Team](https://feimacode.com)