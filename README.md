# Feima Copilot

> **Accelerating Intent into Execution**

A VS Code extension that adds alternative AI model support to GitHub Copilot Chat

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**English Version** | **[中文版](README-CN.md)**

## Quick Links

- 🛒 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=feima.copilot-cn-models) | [Download Feima Copilot](https://feimacode.cn/download)
- 📖 [English Docs](https://ivenxu.github.io/feima-copilot-llms-extension/) | [Chinese Docs](https://docs.feimacode.cn/)
- 🚀 [Quick Start](https://ivenxu.github.io/feima-copilot-llms-extension/guides/quickstart/) | [快速入门](https://docs.feimacode.cn/guides/quickstart/)
- 📦 [Installation Guide](https://ivenxu.github.io/feima-copilot-llms-extension/guides/installation/) | [安装指南](https://docs.feimacode.cn/guides/installation/)
- 🔧 [Configuration Options](https://ivenxu.github.io/feima-copilot-llms-extension/guides/configuration/) | [配置选项](https://docs.feimacode.cn/guides/configuration/)
- 💻 [Development Guide](https://ivenxu.github.io/feima-copilot-llms-extension/dev/setup/) | [开发指南](https://docs.feimacode.cn/dev/setup/)

## Overview

Feima Copilot is a VS Code extension that adds alternative AI model support to GitHub Copilot Chat. Access top-tier models like DeepSeek, Qwen, and more — cost-effective alternatives with diverse model selection and benchmark-parity performance.

### Key Features

- � **Diverse Model Selection**: Qwen3, DeepSeek V3.2, GLM-5, MiniMax M2.5, Kimi K2.5
- 💬 **Seamless Integration**: Works directly in GitHub Copilot Chat, no interface switching needed
- 💰 **Pay-per-Request**: Request-based pricing, cost-controllable, no monthly subscriptions
- 🔒 **Secure & Reliable**: OAuth2 authentication, code never leaves VS Code
- 🧠 **Chain-of-Thought**: Full support for reasoning models, solving complex problems effortlessly

### Why Choose Feima Copilot?

| Feature | GitHub Copilot Native | Feima Copilot Enhanced |
|---------|----------------------|------------------------|
| Cost Control | Fixed subscription | 💡 **Pay-per-request** |
| Chain-of-Thought | ⚠️ Limited | ✅ **Full Support** |
| Pricing | Monthly subscription | 🔥 **Cost-effective** |

### Supported Models

| Model | Provider | Features |
|-------|----------|----------|
| Qwen3 Max | Alibaba Cloud | 256K context, chain-of-thought reasoning |
| Qwen3 Coder Plus | Alibaba Cloud | 1M token context, code-specialized |
| Qwen3.5 Plus | Alibaba Cloud | 1M token context, 80K chain-of-thought |
| DeepSeek V3.2 | DeepSeek | Deep thinking, sparse attention |
| GLM-5 | Zhipu AI | 200K context, chain-of-thought reasoning |
| GLM-4.7 | Zhipu AI | 200K context, advanced reasoning |
| MiniMax M2.5 | MiniMax | 200K context, chain-of-thought reasoning |
| Kimi K2.5 | Moonshot | 256K context, chain-of-thought reasoning |

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
- [Chinese Documentation](https://docs.feimacode.cn/)
- [English Documentation](https://ivenxu.github.io/feima-copilot-llms-extension/)

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