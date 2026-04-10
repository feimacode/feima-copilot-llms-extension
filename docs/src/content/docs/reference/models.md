---
title: Supported Models
description: Complete reference for all supported AI models
---

# Model Reference

Complete reference for all AI models available in Feimacode Copilot.


## Billing Multipliers

Each model has a **billing multiplier** that affects how requests are charged. The total cost is calculated as:

```
weighted_requests = model_multiplier × context_multiplier
```

### Model Tiers

| Tier | Multiplier | Description |
|------|------------|-------------|
| **Ultra-Lightweight** | 0.1x | Ultra-fast, minimal resource models for quick tasks |
| **Lightweight** | 0.5x | Fast, efficient models for simple tasks |
| **Standard** | 1.0x | Balanced performance for everyday coding |
| **Premium** | 2.0x | State-of-the-art models with best performance |

### Context Multipliers

| Context Size | Token Range | Multiplier |
|--------------|-------------|------------|
| Small | 0 - 4,000 tokens | 0.5x |
| Medium | 4,001 - 16,000 tokens | 1.0x |
| Large | 16,001 - 32,000 tokens | 1.5x |
| Extra Large | 32,001+ tokens | 2.0x |

For detailed billing information, see the [Billing & Pricing guide](../guides/billing.md).

---


## Qwen Series (Alibaba Cloud)

### Qwen3 Max

| Property | Value |
|----------|-------|
| **Provider** | Alibaba Cloud |
| **Model ID** | `qwen3-max` |
| **Context Window** | 256K tokens |
| **Output Limit** | 64K tokens |
| **Thinking** | ✅ 32K thinking tokens |
| **Best For** | Complex reasoning, large codebases |

**Strengths**:
- 256K context window for large codebases
- Chain-of-thought reasoning for complex problems
- Tool calls and parallel tool calls support
- Structured outputs

---

### Qwen3 Coder Plus

| Property | Value |
|----------|-------|
| **Provider** | Alibaba Cloud |
| **Model ID** | `qwen3-coder-plus` |
| **Context Window** | 1M tokens |
| **Output Limit** | 64K tokens |
| **Best For** | Code generation, large projects |

**Strengths**:
- 1 million token context window
- Specialized for code generation
- Tool calls support
- Ideal for large monorepos

---

### Qwen3.5 Plus

| Property | Value |
|----------|-------|
| **Provider** | Alibaba Cloud |
| **Model ID** | `qwen3.5-plus` |
| **Context Window** | 1M tokens |
| **Output Limit** | 64K tokens |
| **Thinking** | ✅ 80K thinking tokens |
| **Best For** | Advanced reasoning, complex tasks |

**Strengths**:
- 1 million token context window
- 80K thinking chain for deep reasoning
- Latest Qwen architecture
- Structured outputs

---

## DeepSeek

### DeepSeek V3.2

| Property | Value |
|----------|-------|
| **Provider** | Ali Cloud (routed) |
| **Model ID** | `deepseek-v3.2` |
| **Context Window** | 128K tokens |
| **Output Limit** | 64K tokens |
| **Thinking** | ✅ Supported |
| **Best For** | Code generation, technical reasoning |

**Strengths**:
- Deep thinking with sparse attention
- Excellent code understanding
- Strong debugging capabilities
- Tool calls support

---

## Zhipu AI (GLM)

### GLM-5

| Property | Value |
|----------|-------|
| **Provider** | Zhipu AI |
| **Model ID** | `glm-5` |
| **Context Window** | 200K tokens |
| **Output Limit** | 16K tokens |
| **Thinking** | ✅ Supported |
| **Best For** | Advanced reasoning, Chinese NLP |

**Strengths**:
- 200K context window
- Chain-of-thought reasoning
- Excellent Chinese language understanding
- Tool calls support

---

### GLM-4.7

| Property | Value |
|----------|-------|
| **Provider** | Zhipu AI |
| **Model ID** | `glm-4.7` |
| **Context Window** | 200K tokens |
| **Output Limit** | 128K tokens |
| **Thinking** | ✅ Supported |
| **Best For** | High-quality outputs, long-form content |

**Strengths**:
- 200K context window
- Up to 128K output tokens
- Advanced reasoning capabilities
- Structured outputs

---

## MiniMax

### MiniMax M2.5

| Property | Value |
|----------|-------|
| **Provider** | MiniMax |
| **Model ID** | `minimax-m2.5` |
| **Context Window** | 200K tokens |
| **Output Limit** | 32K tokens |
| **Thinking** | ✅ 32K thinking tokens |
| **Best For** | Complex reasoning, Chinese content |

**Strengths**:
- 200K context window
- Chain-of-thought reasoning
- Strong Chinese language support
- Tool calls support

---

## Moonshot (Kimi)

### Kimi K2.5

| Property | Value |
|----------|-------|
| **Provider** | Moonshot |
| **Model ID** | `kimi-k2.5` |
| **Context Window** | 256K tokens |
| **Output Limit** | 16K tokens |
| **Thinking** | ✅ 16K thinking tokens |
| **Best For** | Long-context tasks, document analysis |

**Strengths**:
- 256K context window
- Chain-of-thought reasoning
- Excellent at document analysis
- Structured outputs

---

## Choosing the Right Model

| Use Case | Recommended Model |
|----------|-------------------|
| Large codebase analysis | Qwen3 Coder Plus (1M context) |
| Complex reasoning | Qwen3.5 Plus (80K thinking) |
| Code generation | DeepSeek V3.2 |
| Chinese content | GLM-5 or Qwen3 Max |
| Document analysis | Kimi K2.5 |
| General purpose | Qwen3 Max |

### GPT-4o

| Property | Value |
|----------|-------|
| **Provider** | OpenAI |
| **Model ID** | `gpt-4o` |
| **Context Window** | 128K tokens |
| **Output Limit** | 4K tokens |
| **Status** | Stable |
| **Latency** | Medium (via Feima acceleration) |
| **Best For** | Complex reasoning, architecture design |

**Strengths**:
- State-of-the-art reasoning capabilities
- Excellent at architectural decisions
- Strong at system design
- Good at creative problem solving
- Large context window

**Weaknesses**:
- Higher cost than some alternatives
- Slightly higher latency via acceleration
- May be overkill for simple tasks

**Example Usage**:
```markdown
Design a microservices architecture for an e-commerce platform
including user authentication, product catalog, and order processing.
Include the main components, their responsibilities, and how they
communicate with each other.
```

---

### Claude 3.5 Sonnet

| Property | Value |
|----------|-------|
| **Provider** | Anthropic |
| **Model ID** | `claude-3.5-sonnet` |
| **Context Window** | 200K tokens |
| **Output Limit** | 4K tokens |
| **Status** | Stable |
| **Latency** | Medium (via Feima acceleration) |
| **Best For** | Code review, algorithm optimization |

**Strengths**:
- Very thorough code review
- Excellent at identifying edge cases
- Strong at suggesting optimizations
- Very large context window
- Careful and methodical reasoning

**Weaknesses**:
- Can be verbose in responses
- May be slower on simple tasks
- Higher cost than some alternatives

**Example Usage**:
```markdown
Review this code for potential bugs, performance issues, and
security vulnerabilities. Suggest improvements with explanations.
```

---

### Gemini 1.5 Pro

| Property | Value |
|----------|-------|
| **Provider** | Google |
| **Model ID** | `gemini-1.5-pro` |
| **Context Window** | 1M tokens |
| **Output Limit** | 8K tokens |
| **Status** | Stable |
| **Latency** | Medium (via Feima acceleration) |
| **Best For** | Large codebase analysis, long context |

**Strengths**:
- Extremely large context window (1M tokens)
- Good at understanding large codebases
- Strong at cross-file analysis
- Can process entire projects at once

**Weaknesses**:
- Higher cost
- Slower on very large inputs
- May not be as strong on code-specific tasks

**Example Usage**:
```markdown
Analyze this entire repository and explain:
1. The overall architecture
2. How data flows through the system
3. The main components and their responsibilities
```

## Comparison Matrix

| Feature | DeepSeek V2 | Tongyi Q3 | Hunyuan | GPT-4o | Claude 3.5 | Gemini 1.5 |
|---------|-------------|-----------|---------|--------|------------|------------|
| **Context Window** | 16K | 32K | 128K | 128K | 200K | 1M |
| **Output Limit** | 4K | 8K | 4K | 4K | 4K | 8K |
| **Code Strength** | 🔥 | ⭐ | ⭐ | 🔥 | 🔥 | ⭐ |
| **Chinese** | ⭐ | 🔥 | ⭐ | ⭐ | ⭐ | ⭐ |
| **Reasoning** | ⭐ | ⭐ | ⭐ | 🔥 | 🔥 | 🔥 |
| **Review** | ⭐ | ⭐ | ⭐ | 🔥 | 🔥 | ⭐ |
| **Speed** | 🔥 | 🔥 | 🔥 | ⭐ | ⭐ | ⭐ |
| **Latency** | Low | Low | Low | Medium | Medium | Medium |
| **Cost** | Low | Low | Low | High | High | High |

Legend: 🔥 Excellent | ⭐ Good | ⚡ Fair

## Model Selection Guidelines

### Choose DeepSeek Coder V2 when:
- Writing or generating code
- Debugging issues
- Explaining code logic
- Working with programming-specific tasks

### Choose Tongyi Qianwen 3 Coder when:
- Writing Chinese documentation
- Adding Chinese comments
- Generating Chinese docstrings
- Working with Chinese technical content

### Choose Tencent Hunyuan when:
- Need large context window
- Doing general Q&A
- Explaining natural language concepts
- Need stable, balanced performance

### Choose GPT-4o when:
- Doing complex reasoning
- Designing architectures
- Creative problem solving
- Need strong general intelligence

### Choose Claude 3.5 Sonnet when:
- Doing code reviews
- Optimizing algorithms
- Identifying edge cases
- Need thorough, careful analysis

### Choose Gemini 1.5 Pro when:
- Analyzing large codebases
- Need massive context window
- Processing entire projects
- Cross-file analysis

## Token Counting

Understanding token limits helps you optimize your requests:

### Rough Token Estimates

- 1 token ≈ 4 characters (English)
- 1 token ≈ 1-2 characters (Chinese)
- 100 tokens ≈ 75 words (English)
- 100 tokens ≈ 50-100 characters (Chinese)

### Code Tokens

- ~1 token per 4-5 characters of code
- Comments count toward tokens
- Indentation and formatting matter slightly

### Best Practices

1. Be concise in your prompts
2. Remove unnecessary code before analysis
3. Use file chunks for very large files
4. Select models with appropriate context windows

## Rate Limits

### Free Tier

- 100 requests per day
- Resets at midnight UTC
- All models available

### Paid Tiers

| Plan | Requests | Price | Features |
|------|----------|-------|----------|
| Basic | 500 | ¥29/month | All models |
| Pro | 2,000 | ¥99/month | Priority support |
| Team | 10,000 | ¥399/month | Team management |

### How to Check

1. Look at the status bar
2. Command: "Feima: 查看账号" (Show Account)
3. Visit [feimacode.cn/dashboard](https://feimacode.cn/dashboard)

## Future Models

Feima Copilot will continue to add new models as they become available.

### Upcoming (Planned)

- DeepSeek V3 (when released)
- New Chinese models from other providers
- Specialized models for specific tasks

Stay updated by following our [GitHub repository](https://github.com/feimacode/feima-copilot-llms-extension).

## Next Steps

- [Using Models](../guides/using-models.md) - How to use models effectively
- [Configuration](../guides/configuration.md) - Set your default model
- [API Reference](./api.md) - Detailed API documentation

## Need Help?

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.cn)