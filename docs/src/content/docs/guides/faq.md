---
title: Frequently Asked Questions
description: Common questions about Feima Copilot answered
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
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Are there any regional restrictions?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No. Feima Copilot works globally without any regional restrictions or VPN requirements. All model requests are routed through our servers for stable and fast access."
            }
          },
          {
            "@type": "Question",
            "name": "What's the response latency?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Fast and stable. We use Singapore-based servers with excellent global connectivity. Response times vary by model: Qwen3.6 Flash (1-3 seconds), Qwen3.7 Max (3-8 seconds), Thinking Models (5-15 seconds)."
            }
          },
          {
            "@type": "Question",
            "name": "Does Feima work in mainland China?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No. The China instance (auth.feimacode.cn / api.feimacode.cn) has been shut down as of June 22, 2026. Feima is only available through the Global instance (auth.feimacode.com / api.feimacode.com)."
            }
          },
          {
            "@type": "Question",
            "name": "How much does Feima cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Feima uses pay-per-request pricing. You get a free tier with weekly credits, and can purchase credit packs that never expire. No monthly subscription required."
            }
          },
          {
            "@type": "Question",
            "name": "Which models are supported?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Feima supports 10+ top open-weight LLMs including Qwen 3.7, DeepSeek V4, GLM-5, Kimi K2.7, MiniMax M3, Mimo V2.5, Kimi K3, and HY3 from leading providers like Alibaba, DeepSeek, Zhipu AI, Moonshot, MiniMax, Xiaomi, and Tencent."
            }
          }
        ]
      }
---

This page answers frequently asked questions about Feima Copilot. If you have other questions, please contact us through our [feedback channels](#feedback--support).

---

## Network & Access

### Q: Are there any regional restrictions?

**A: No.**

Feima Copilot works globally without any regional restrictions or VPN requirements. All model requests are routed through our servers for stable and fast access.

---

### Q: What's the response latency?

**A: Fast and stable.**

We use Singapore-based servers with excellent global connectivity. Response times vary by model:
- **Qwen3.6 Flash**: Ultra-fast, typically 1-3 seconds
- **Qwen3.7 Max**: Standard response, typically 3-8 seconds
- **Thinking Models**: Deep reasoning requires more time, typically 5-15 seconds

---

### Q: Where are your servers located?

**A: Singapore.**

Our servers are deployed in **Singapore**, and most LLM providers we use also have infrastructure in the same region. This ensures:
- ✅ Your code and data stay within Southeast Asia
- ✅ No data transfer to China
- ✅ Compliance with regional data protection requirements
- ✅ GDPR-friendly infrastructure outside EU/US jurisdiction

---

### Q: What network environments are supported?

**A: All global network environments.**

- Corporate networks
- Home broadband
- Mobile networks
- Educational networks

No special configuration required, just use it directly.

---

## VS Code Version & Compatibility

### Q: Which VS Code versions are supported?

**A: VS Code 1.85.0 and above.**

We recommend using the latest version of VS Code for the best experience.

---

### Q: Does it support VS Code Insiders?

**A: Yes, fully supported.**

VS Code Insiders has the same functionality as the stable version, and Feima Copilot works perfectly in both.

---

### Q: Does it support VSCodium?

**A: Not currently.**

Feima Copilot depends on the GitHub Copilot Chat extension, which VSCodium doesn't support. Please use official VS Code.

---

### Q: Does it support VS Code Web?

**A: Partially supported.**

It works on vscode.dev and github.dev, but some features may be limited. We recommend using the desktop version of VS Code.

---

## Feature Support

### Q: Does it support Custom Agent?

**A: Yes, same as native Copilot.**

Feima Copilot fully supports GitHub Copilot's Custom Agent feature, working exactly like the native Copilot. You can:
- Create custom Agents
- Configure Agent behavior and prompts
- Use Agents to execute specific tasks

---

### Q: Does it support Skills?

**A: Yes, same as native Copilot.**

Feima Copilot fully supports GitHub Copilot's Skills feature, working exactly like the native Copilot. You can:
- Use built-in Skills
- Create custom Skills
- Execute specific operations through Skills

---

### Q: Does it support constitution.md, prompts.md, and instructions.md?

**A: Yes, fully supported.**

Feima Copilot supports all GitHub Copilot custom configuration files, including:
- **constitution.md** - Define Agent behavior guidelines and principles
- **prompts.md** - Custom prompt templates
- **instructions.md** - Provide detailed instructions for specific tasks

These files work exactly like native Copilot, just place them in the `.github/copilot/` directory.

---

### Q: Does it support Tool Calls?

**A: Yes, supports tool calls.**

All chat models support tool call functionality, including:
- Code execution
- File operations
- API calls

---

### Q: Does it support Thinking (Chain-of-Thought)?

**A: Yes, multiple models support thinking.**

Models that support thinking:
- Qwen3.7 Max (983K thinking tokens)
- Qwen3.6 Plus (80K thinking tokens)
- Qwen3.7 Plus (983K thinking tokens)
- DeepSeek V3.2
- GLM-5
- GLM-4.7
- MiniMax M2.5 (32K thinking tokens)
- Kimi K2.6 (16K thinking tokens)
- Kimi K3 (1M thinking tokens)
- HY3 (thinking support)

Thinking improves the quality of solutions for complex problems.

---

### Q: Does it support multiple languages?

**A: Yes, supports multiple languages.**

Feima Copilot supports:
- **English**: Full support, suitable for international projects
- **Chinese**: Complete Chinese interface and documentation, models optimized for Chinese
- **Other languages**: Models support multiple programming languages and natural languages

---

### Q: Does it support code completion?

**A: Yes, supports code completion.**

Feima Copilot provides:
- **Chat completion**: Get code suggestions in Copilot Chat
- **Inline completion**: Through Qwen Coder Turbo model (free during beta)

---

### Q: Does it support code review?

**A: Yes, supports code review.**

Recommended models:
- **Qwen3.7 Max**: Deep analysis, 983K thinking chain
- **GLM 5.2**: Advanced reasoning, 1M context

---

## Models & Billing

### Q: How does billing work?

**A: Pay-per-request, no subscription pressure.**

Billing formula:
```
Weighted Request Count = Model Multiplier × Context Multiplier
```

- **Model Multiplier**: From 0.1x (Qwen Flash) to 2.0x (Qwen3 Coder Plus)
- **Context Multiplier**: From 0.5x to 2.0x based on context size

See the [Billing Guide](/guides/billing) for detailed billing information.

---

### Q: How to get free credits during public preview?

**A: Multiple ways to get free credits.**

- **Weekly grant**: Automatically receive 50 credits every week
- **Referral program**: Invite friends to register, both parties receive rewards
- **Participate in promotions**: Regular activities to earn extra credits

[Learn how to earn more credits →](https://feimacode.com/promotion)

---

### Q: How to check remaining credits?

**A: Three ways to check.**

1. **Status bar**: Enable `feima.showQuotaInStatusBar` setting
2. **Command palette**: `Ctrl+Shift+P` → "Feima: Show Account"
3. **Website**: Visit [feimacode.com/dashboard](https://feimacode.com/profile)

---

### Q: What happens when credits run out?

**A: Multiple solutions.**

- **Wait for weekly grant**: Automatically receive 50 credits every week
- **Invite friends**: Receive reward credits
- **Purchase credits**: Visit [feimacode.com/pricing](https://feimacode.com/pricing)

---

### Q: What are the multipliers for different models?

**A: Multipliers range from 0.1x to 2.0x.**

| Model | Multiplier | Notes |
|-------|------------|-------|
| Qwen Flash | 0.1x | Cheapest, suitable for quick tasks |
| Qwen3.5 Plus | 0.5x | High value, 80K thinking chain |
| Qwen3 Max | 1.0x | Standard, 256K context |
| DeepSeek V3.2 | 1.0x | Standard, code specialized |
| GLM-4.7 | 1.0x | Standard, long text output |
| MiniMax M2.5 | 1.0x | Standard, Chinese optimized |
| Kimi K2.5 | 1.0x | Standard, document analysis |
| Kimi K3 | 6.0x | Premium, 1M context, vision |
| HY3 | 0.5x | Standard, free tier included |
| Qwen3 Coder Plus | 2.0x | Premium, 1M context |
| GLM-5 | 2.0x | Premium, best for Chinese |

---

### Q: How to choose the most suitable model?

**A: Choose based on task type.**

| Task Type | Recommended Model |
|-----------|-------------------|
| Quick Q&A | Qwen Flash (0.1x) |
| Code generation | Qwen3 Coder Plus or DeepSeek V3.2 |
| Complex reasoning | Qwen3.5 Plus (80K thinking chain) |
| Chinese documents | GLM-5 or GLM-4.7 |
| Large codebase | Qwen3 Coder Plus (1M context) |

See [Using Models](/guides/using-models) for detailed selection guide.

---

## Data Privacy

### Q: Is my code stored?

**A: No.**

Code is only sent to the AI model for processing during requests and is never stored or used for other purposes. See our [Privacy Policy](https://feimacode.com/privacy).

---

### Q: Are conversation histories saved?

**A: Saved locally, not uploaded to servers.**

Conversation histories are saved on your local device and never uploaded to servers. You can:
- View historical conversations in VS Code
- Manually delete conversation records
- Conversation records are only stored locally

---

### Q: How is data transmitted?

**A: Encrypted transmission.**

- All requests use HTTPS encryption
- Authentication uses OAuth2 + JWT
- Data doesn't pass through third-party servers

---

### Q: Where is my data processed?

**A: Singapore.**

All requests are routed through our Singapore servers, and most LLM providers we work with also operate in Singapore. This ensures:
- ✅ Your code and data remain in Southeast Asia
- ✅ No cross-border data transfer to China
- ✅ Compliance with regional data protection requirements

---

### Q: Does it comply with data compliance requirements?

**A: Yes.**

Feima Copilot complies with:
- International data security standards
- User privacy protection requirements
- Enterprise data compliance standards

---

## Feedback & Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 **Feature Requests**: [GitHub Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 **Email Support**: [support@feimacode.com](mailto:support@feimacode.com)

**More Questions?** Check our [full FAQ](https://docs.feimacode.com/guides/faq) or [contact us](mailto:support@feimacode.com)