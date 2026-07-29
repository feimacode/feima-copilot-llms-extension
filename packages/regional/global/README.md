# Feima Copilot

**Access Qwen, DeepSeek, GLM, and more — one extension, multiple LLMs**

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ Key Features

- 🌍 **Global Access** - Works worldwide, no regional restrictions
- 🤖 **Multi-Model Support** - Qwen, DeepSeek, GLM, MiniMax, Kimi, and more
- 🔐 **Secure Login** - GitHub OAuth for quick authentication
- 💰 **Pay-As-You-Go** - No subscription required, pay only for what you use
- 🚀 **Fast & Reliable** - Optimized for low latency responses
- 🧑‍💻 **Agent Participants (NEW)** - Drive the real Claude Code, Codex, and Copilot CLI agents natively in chat with `@claude`, `@codex`, `@copilot-cli`

## Prerequisites

Before you begin, make sure you have:

- ✅ **VS Code** >= 1.85.0
- ✅ **GitHub Copilot Chat** extension installed (required)
- ✅ **Feima Account** (sign up at [feimacode.com](https://feimacode.com))

## 🎯 Supported Models

| Model | Provider | Best For |
|-------|----------|----------|
| **Qwen3.6 Flash** | Alibaba Cloud | Fast responses, thinking support (default) |
| **Qwen3.7 Max** | Alibaba Cloud | Complex reasoning with deep thinking, ~1M context |
| **Qwen3.6 Plus** | Alibaba Cloud | Vision-capable, 80K thinking chain, 1M context |
| **Qwen3.7 Plus** | Alibaba Cloud | ~1M context, vision, deep thinking |
| **GLM-5** | Zhipu AI | Advanced reasoning |
| **GLM-4.7** | Zhipu AI | Long-form content and documentation |
| **GLM 5.2** | Zhipu AI | 1M context, advanced reasoning |
| **MiniMax M2.5** | MiniMax | Balanced performance |
| **MiniMax M3** | MiniMax | 1M context, advanced reasoning |
| **Kimi K2.6** | Moonshot | 256K context with vision support |
| **Kimi K2.7 Code** | Moonshot | 256K context, code-specialized, vision |
| **Mimo V2.5** | Xiaomi | 1M context, vision, advanced reasoning |
| **Mimo V2.5 Pro** | Xiaomi | 1M context, vision, reasoning (Pro tier) |
| **DeepSeek V4 Pro** | DeepSeek | 1M token context, deep thinking |
| **DeepSeek V4 Flash** | DeepSeek | 1M token context, fastest DeepSeek |
| **GLM 5.1** | Zhipu AI | 202K context, powerful reasoning |

## 📦 Installation

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

## 🚀 Quick Start

### Step 3: Sign In to Feima

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to open the Command Palette
2. Type "Feima: Sign In"
3. Select the command
4. A browser window will open
5. Sign in with your Feima account (GitHub OAuth)
6. Grant the requested permissions
7. You'll be redirected back to VS Code

**Success message**: "✅ Signed in as: [your-email]"

### Step 4: Select a Feima Model

1. Open the Copilot Chat panel (click the chat icon in the sidebar or press `Ctrl+Alt+I`)
2. Click the model selector at the top of the panel
3. Choose a Feima model from the list

### Step 5: Start Chatting

1. Type your question or coding request in the chat input
2. The AI will respond using the selected model
3. You can switch models anytime during your session

> **Want to drive Claude Code, Codex, or Copilot CLI right inside VS Code chat instead of a terminal?** See the **🤖 Agent Participants** section below — that's a different, newer feature from the API keys described here.

### 🔑 API Key Support

Feima Copilot also provides API keys for use beyond the VS Code extension:

- **Copilot CLI** - Use Feima models in your terminal
- **Claude Code** - Native support via Anthropic-compatible API
- **Other CLI Tools** - Works with any OpenAI-compatible or Anthropic-compatible tool
- **Custom Integrations** - Build your own applications

We support both **OpenAI-compatible** and **Anthropic-compatible** API formats, giving you flexibility to use your favorite tools.

Get your API key:
1. Sign in to your Feima account
2. Visit [Profile Settings](https://feimacode.com/profile)
3. Create a new key in the API Key management page
4. Configure the key in your CLI tools

API keys use the same billing system - no separate subscription needed.

## 🤖 Agent Participants — NEW: Claude Code, Codex & Copilot CLI, right in chat

**Feima Copilot isn't just another model provider — it also lets you drive the *real* Claude Code, Codex, and GitHub Copilot CLI agents from directly inside GitHub Copilot Chat.**

Type `@claude`, `@codex`, or `@copilot-cli` and you get that CLI's own agent loop — its own planning, tool calls, and file-edit review — rendered with VS Code's native chat UI: streaming responses, inline diffs, no terminal window, no copy-pasting code back and forth.

### Which one is for you?

| If you… | Try | Why |
|---|---|---|
| Already pay for **Claude Pro/Max** or **ChatGPT Plus/Pro** | `@claude` / `@codex`, with the CLI's own model selected | Uses your existing subscription directly — no extra cost, nothing else to configure |
| Don't have (or don't want) a separate Anthropic/OpenAI subscription | `@claude` / `@codex`, with a **Feima model** selected instead | Same agent workflow and tool loop, powered by a Feima model you already have access to |
| Just want **GitHub Copilot CLI**'s terminal-automation skills without leaving chat | `@copilot-cli` | Runs Copilot CLI's agent, powered by your Feima/Copilot model |
| Want to try Claude Code's or Codex's workflow before committing to a subscription | Either participant, with a Feima model | Zero new signups — see what the fuss is about first |

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

### Good to know

- **Three permission tiers** per turn — `/ask` (review everything), `/acceptEdits` (auto-approve file edits, still ask before commands), `/fullAuto` (hands-off) — or set a persistent default per participant.
- **Bring your own model** — point any participant at a Feima model through a local, loopback-only Agent Proxy; no separate Anthropic/OpenAI API key required.
- **MCP servers** — wire your own MCP tools into `@claude` and `@codex` via settings.
- **Your CLI, your login** — native mode uses the CLI's own subscription and login exactly as it would from a terminal; the extension never touches your Anthropic/OpenAI credentials.

📖 Full guide: [Agent Participants](https://docs.feimacode.com/guides/agent-participants/) · [Setup & Troubleshooting](https://docs.feimacode.com/guides/agent-participants-setup/) · [Agent Proxy](https://docs.feimacode.com/guides/agent-proxy/)

## 💰 Pricing

Flexible pay-as-you-go pricing with **predictable billing**:

- **Free Tier** - 700 weighted requests in your first month (500 starter + 50×4 weekly)
- **Pay Per Request** - Simple request-based pricing, not complex token metering
- **Prepaid Packs** - $10 one-time for 500 requests (never expires)
- **Transparent** - "You have 300 requests left" vs complex token calculations

### 🆚 Why Feima vs GitHub Copilot Billing?

| Feature | GitHub Copilot | Feima |
|---------|---------------|-------|
| **Billing Model** | Usage-based (tokens) | Request-based |
| **Cost Control** | Surprise bills possible | Prepaid - no surprises |
| **Free Tier** | Limited models (Haiku 4.5, GPT-5 mini) | ✅ 700 requests/month, all models |
| **Pricing** | $10/month + overages | $10 one-time (500 requests) |

**Key Insight**: Feima's free tier gives **2-12x more requests** than Copilot Pro ($10/month)!

📄 **Full Comparison**: [Why Feima is the Best GitHub Copilot Alternative](https://feimacode.com/copilot-alternative)

View detailed rates at [feimacode.com/pricing](https://feimacode.com/pricing)

## 📸 Screenshots

### Authentication
![Authentication](https://feimacode.com/screenshots/global/auth-selection.png)

### Model Selection
![Model Selection](https://feimacode.com/screenshots/global/model-selection.png)

### Chat Interface
![Chat Interface](https://feimacode.com/screenshots/global/chat-interface.png)

## 🔧 Troubleshooting

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

- Verify feima-idp is accessible
- Check your network connectivity

## ❓ Frequently Asked Questions

### Location & Access

**Q: What's the response latency?**
A: We use edge deployments for low latency worldwide. Most responses complete within 2-5 seconds.

**Q: Where are your servers located?**
A: Our servers are deployed in **Singapore**, and most LLM providers we use also have infrastructure in the same region. This ensures your data stays within Southeast Asia and is not transferred to China, addressing common data residency concerns.

### VS Code Compatibility

**Q: Which VS Code versions are supported?**
A: VS Code 1.85.0 and above.

**Q: Does it work with VS Code Insiders?**
A: Yes, fully compatible with VS Code Insiders builds.

### Data Privacy & Security

**Q: Is my code stored on your servers?**
A: No. Your code is only sent to the AI model for processing and is never stored. See our [Privacy Policy](https://feimacode.com/privacy).

**Q: Are conversation histories saved?**
A: Conversations are stored locally on your device and never uploaded to our servers.

**Q: Where is my data processed?**
A: All requests are routed through our Singapore servers, and most LLM providers we work with also operate in Singapore. Your code and data remain in Southeast Asia, ensuring no transfer to China.


## 📚 Documentation

- **Full Documentation**: [docs.feimacode.com](https://docs.feimacode.com)
- **API Reference**: [docs.feimacode.com/api](https://docs.feimacode.com/api)
- **Changelog**: [CHANGELOG.md](../../CHANGELOG.md)

## 🤝 Feedback & Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 **Feature Requests**: [GitHub Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 **Email Support**: [support@feimacode.com](mailto:support@feimacode.com)

## 📄 License

This project is licensed under the [MIT License](LICENSE).
---

**Feima Copilot** - Your AI coding assistant with access to the best LLMs

[Website](https://feimacode.com) | [Pricing](https://feimacode.com/pricing) | [Docs](https://docs.feimacode.com) | [GitHub](https://github.com/feimacode/feima-copilot-llms-extension)
