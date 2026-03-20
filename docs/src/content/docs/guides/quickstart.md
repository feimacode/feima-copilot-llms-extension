---
title: Quick Start
description: Get up and running with Feima Copilot in minutes
---

# Quick Start Guide

This guide will help you get Feima Copilot running in just a few minutes.

## Prerequisites

Before you begin, make sure you have:

- ✅ **VS Code** >= 1.85.0
- ✅ **GitHub Copilot Chat** extension installed (required)
- ✅ **Feima Account** (sign up at [feimacode.cn](https://feimacode.cn))

## Installation

### Step 1: Install Feima Copilot

1. Open VS Code
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac) to open Extensions
3. Search for "Feima Copilot"
4. Click "Install"

### Step 2: Verify GitHub Copilot Chat

Make sure you have the **GitHub Copilot Chat** extension installed. Feima Copilot requires it to function.

1. Open Extensions view
2. Search for "GitHub Copilot Chat"
3. If not installed, click "Install"

## Authentication

### Step 3: Sign In to Feima

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open the Command Palette
2. Type "Feima: 登录" (Sign In)
3. Select the command
4. A browser window will open
5. Sign in with your Feima account (WeChat or Weibo)
6. Grant the requested permissions
7. You'll be redirected back to VS Code

**Success message**: "✅ 已登录为: [your-email]"

## Using Feima Copilot

### Step 4: Select a Feima Model

1. Open the Copilot Chat panel (click the chat icon in the sidebar or press `Ctrl+Alt+I`)
2. Click the model selector at the top of the panel
3. Choose a Feima model from the list:
   - **DeepSeek Coder V2** - Best for code generation
   - **Tongyi Qianwen 3 Coder** - Best for Chinese code comments
   - **Tencent Hunyuan** - General purpose Q&A
   - **GPT-4o** - Complex logic and architecture
   - **Claude 3.5 Sonnet** - Code review and optimization
   - **Gemini 1.5 Pro** - Large codebase understanding

### Step 5: Start Chatting

1. Type your question or coding request in the chat input
2. The AI will respond using the selected model
3. You can switch models anytime during your session

## First Example

Try this simple example to verify everything is working:

1. Select "DeepSeek Coder V2" in Copilot Chat
2. Ask: "How do I create a REST API endpoint in Node.js with Express?"
3. The AI should provide code and explanation

## Troubleshooting

### Browser doesn't open

- Check VS Code has permission to open your default browser
- Ensure your default browser is properly configured

### "No pending callback" error

- The callback expires after 5 minutes - try signing in again quickly
- Check your browser security settings aren't blocking redirects

### Can't find Feima models in selector

- Make sure you're signed in: Press `Ctrl+Shift+P` → "Feima: 查看账号"
- Check the Output panel (View → Output) for any error messages

### Token exchange failed

- Verify feima-idp is accessible: `curl https://idp.feimacode.cn/.well-known/openid-configuration`
- Check your network connectivity

## What's Next?

- [Installation Guide](./installation.md) - More detailed installation options
- [Authentication Guide](./authentication.md) - Learn about OAuth2 flow
- [Configuration Guide](./configuration.md) - Customize your experience
- [Development Guide](../dev/setup.md) - Contribute to the project

## Need Help?

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.cn)