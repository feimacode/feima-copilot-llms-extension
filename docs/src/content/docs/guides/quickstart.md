---
title: Quick Start
description: Get up and running with Feima Copilot in minutes
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
        "@type": "HowTo",
        "name": "Quick Start with Feima Copilot",
        "description": "Get started with Feima Copilot in just a few minutes",
        "totalTime": "PT10M",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Install Extension",
            "text": "Install Feima Copilot from VS Code Marketplace"
          },
          {
            "@type": "HowToStep",
            "name": "Sign In",
            "text": "Sign in with your Feimacode account via OAuth2"
          },
          {
            "@type": "HowToStep",
            "name": "Select Model",
            "text": "Choose your preferred AI model in Copilot Chat"
          },
          {
            "@type": "HowToStep",
            "name": "Start Coding",
            "text": "Ask questions, get code suggestions, and boost your productivity"
          }
        ]
      }
---

# Quick Start Guide

This guide will help you get Feima Copilot running in just a few minutes.

## Prerequisites

Before you begin, make sure you have:

- ✅ **VS Code** >= 1.85.0
- ✅ **GitHub Copilot Chat** extension installed (required)
- ✅ **Feima Account** (sign up at [feimacode.com](https://feimacode.com))

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
2. Type "Feima: Sign In"
3. Select the command
4. A browser window will open
5. Sign in with your Feima account (WeChat or Weibo)
6. Grant the requested permissions
7. You'll be redirected back to VS Code

**Success message**: "✅ Signed in as: [your-email]"

## Using Feima Copilot

### Step 4: Select a Feima Model

1. Open the Copilot Chat panel (click the chat icon in the sidebar or press `Ctrl+Alt+I`)
2. Click the model selector at the top of the panel
3. Choose a Feima model from the list:
   - **Qwen3.6 Flash** - Fast responses, thinking support, free tier (chat default)
   - **Qwen3.7 Max** - Complex reasoning with deep thinking, ~1M context
   - **Qwen3.6 Plus** - Vision-capable with 80K thinking chain, 1M context
   - **Qwen3.7 Plus** - ~1M context, vision and deep thinking
   - **DeepSeek V3.2** - Deep thinking for complex problems
   - **GLM-5** - Zhipu's advanced reasoning model
   - **GLM-4.7** - Long-form content and documentation
   - **GLM 5.2** - 1M context, advanced reasoning
   - **MiniMax M2.5** - Balanced performance
   - **Kimi K2.6** - 256K context with vision support
   - **Kimi K2.7 Code** - 256K context, code-specialized, vision

### Step 5: Start Chatting

1. Type your question or coding request in the chat input
2. The AI will respond using the selected model
3. You can switch models anytime during your session

## First Example

Try this simple example to verify everything is working:

1. Select "Qwen3 Flash" in Copilot Chat (it's free!)
2. Ask: "How do I create a REST API endpoint in Node.js with Express?"
3. The AI should provide code and explanation

## Optional: Try an Agent Participant

Feima Copilot also adds three chat participants — `@claude`, `@codex`, `@copilot-cli` — that run the *real* Claude Code, Codex, or GitHub Copilot CLI agent inside VS Code chat, if you have the corresponding CLI installed:

1. In the chat input, type `@claude` (or `@codex` / `@copilot-cli`) followed by a request, e.g. `@claude explain what this file does`
2. Pick a model when prompted — the CLI's own model to use your existing subscription, or a Feima/Copilot model to route through those instead
3. Watch the agent plan, read files, and propose edits inline

See the [Agent Participants guide](/guides/agent-participants) for the full picture, including which mode fits your situation, and [Setup & Troubleshooting](/guides/agent-participants-setup) if a CLI isn't detected.

## Troubleshooting

### Browser doesn't open

- Check VS Code has permission to open your default browser
- Ensure your default browser is properly configured

### "No pending callback" error

- The callback expires after 5 minutes - try signing in again quickly
- Check your browser security settings aren't blocking redirects

### Can't find Feima models in selector

- Make sure you're signed in: Press `Ctrl+Shift+P` → "Feima: Show Account"
- Check the Output panel (View → Output) for any error messages

### Token exchange failed

- Verify feima-idp is accessible: `curl https://idp.feimacode.com/.well-known/openid-configuration`
- Check your network connectivity

## What's Next?

- [Installation Guide](/guides/installation) - More detailed installation options
- [Authentication Guide](/guides/authentication) - Learn about OAuth2 flow
- [Configuration Guide](/guides/configuration) - Customize your experience
- [Agent Participants](/guides/agent-participants) - Drive Claude Code, Codex, and Copilot CLI from chat
- [Development Guide](/dev/setup) - Contribute to the project

## Need Help?

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.com)