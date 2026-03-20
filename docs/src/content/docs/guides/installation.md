---
title: Installation
description: Detailed installation instructions for Feima Copilot
---

# Installation Guide

This guide covers all the installation options for Feima Copilot.

## Requirements

### System Requirements

- **VS Code** >= 1.85.0
- **GitHub Copilot Chat** extension (required)
- **Operating System**: Windows, macOS, or Linux

### Account Requirements

- Feima account ([sign up](https://feimacode.cn/register))
- Feima account supports WeChat or Weibo authentication

## Installation Methods

### Method 1: VS Code Marketplace (Recommended)

1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for "Feima Copilot"
4. Click "Install"
5. Wait for the installation to complete

**Note**: This method gives you automatic updates when new versions are released.

### Method 2: Manual Installation

1. Download the latest `.vsix` file from the [Releases page](https://github.com/feimacode/feima-copilot-llms-extension/releases)
2. In VS Code, press `Ctrl+Shift+P`
3. Type "Install from VSIX..."
4. Select the downloaded `.vsix` file
5. Wait for installation to complete

### Method 3: Command Line Installation

```bash
# Using code CLI
code --install-extension feima-copilot-llms-extension.vsix

# Or directly from marketplace (if published)
code --install-extension feima-tech.feima-copilot
```

## GitHub Copilot Chat Setup

Feima Copilot requires GitHub Copilot Chat to be installed and activated.

### Install GitHub Copilot Chat

1. Open Extensions view (`Ctrl+Shift+X`)
2. Search for "GitHub Copilot Chat"
3. Click "Install"

### Activate GitHub Copilot Chat

1. Open the Copilot Chat panel (chat icon in sidebar)
2. Follow the on-screen prompts to activate
3. Sign in with your GitHub account if prompted

**Note**: You don't need a paid GitHub Copilot subscription to use Feima Copilot models. The models are provided by Feima and billed separately.

## Verifying Installation

### Check Extension Activation

1. Open VS Code
2. Go to View → Output
3. Select "Feima" from the dropdown
4. You should see: "✅ 飞码扣 (Feima) extension activated successfully!"

### Check Commands

1. Press `Ctrl+Shift+P`
2. Type "Feima:"
3. You should see commands like:
   - Feima: 登录 (Sign In)
   - Feima: 查看账号 (Show Account)
   - Feima: 登出 (Sign Out)

### Check Model Availability

1. Open Copilot Chat
2. Click the model selector at the top
3. You should see Feima models listed

## Development Installation

If you want to contribute to Feima Copilot or run from source:

```bash
# Clone the repository
git clone https://github.com/feimacode/feima-copilot-llms-extension.git
cd feima-copilot-llms-extension

# Install dependencies
npm install

# Build the extension
npm run compile

# Open in VS Code
code .

# Press F5 to launch Extension Development Host
```

See [Development Setup](../dev/setup.md) for more details.

## Uninstallation

### Uninstall from VS Code

1. Open Extensions view (`Ctrl+Shift+X`)
2. Search for "Feima Copilot"
3. Click the gear icon
4. Select "Uninstall"

### Clear Stored Data

To remove all Feima Copilot data from VS Code:

1. Press `Ctrl+Shift+P`
2. Type "Developer: Open Logs Folder"
3. Navigate to the global storage folder
4. Delete any Feima-related files

**Note**: This will sign you out and remove all stored preferences.

## Updating

### Automatic Updates

When installed from VS Code Marketplace, updates are automatic. VS Code will notify you when a new version is available.

### Manual Update

1. Open Extensions view
2. Find Feima Copilot
3. Click the "Update" button if available
4. Restart VS Code when prompted

## Firewall and Proxy Issues

### China Users

Feima Copilot provides direct access to Chinese models without needing to bypass the firewall. However, international models are accessed via Feima's accelerated service.

If you experience issues:

1. Check if `https://idp.feimacode.cn` is accessible
2. Try using a different network
3. Contact support if issues persist

### Corporate Networks

Some corporate networks may block OAuth redirects. If you encounter authentication issues:

1. Check with your IT department about OAuth policy
2. Try connecting from a different network
3. Use the [troubleshooting guide](../guides/quickstart.md#troubleshooting)

## Next Steps

- [Quick Start](./quickstart.md) - Start using Feima Copilot
- [Authentication](./authentication.md) - Learn about OAuth2 setup
- [Configuration](./configuration.md) - Customize your settings

## Need Help?

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.cn)