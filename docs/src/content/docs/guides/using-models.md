---
title: Using Models
description: How to select and use different AI models in Feima Copilot
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
        "@type": "Article",
        "headline": "Using AI Models in Feima Copilot",
        "description": "Learn how to select and use different AI models in Feima Copilot",
        "author": {
          "@type": "Organization",
          "name": "Feimacode",
          "url": "https://feimacode.com"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Feimacode",
          "logo": {
            "@type": "ImageObject",
            "url": "https://docs.feimacode.com/feima-icon.png"
          }
        }
      }
---

# Using Models

Feima Copilot provides access to multiple AI models from diverse providers to suit different tasks and budgets.

## Available Models

### Ali Cloud Models

#### Qwen3.6 Flash
- **Model ID**: `qwen3.6-flash`
- **Provider**: Ali Cloud
- **Best For**: Fast responses, everyday coding tasks (chat default)
- **Strengths**:
  - Ultra-fast with 1M context window
  - Thinking support included
  - Free tier included
  - Great for quick questions and simple tasks

#### Qwen Coder Turbo
- **Model ID**: `qwen-coder-turbo`
- **Provider**: Ali Cloud
- **Best For**: Code completions, inline suggestions
- **Strengths**:
  - Optimized for code completion
  - Fast and efficient
  - Free tier included

#### Qwen3.7 Max
- **Model ID**: `qwen3.7-max`
- **Provider**: Ali Cloud
- **Best For**: Complex reasoning, architecture design
- **Strengths**:
  - ~1M context with deep thinking capabilities
  - Advanced reasoning
  - Premium tier required

#### Qwen3 Coder Plus
- **Model ID**: `qwen3-coder-plus`
- **Provider**: Ali Cloud
- **Best For**: Advanced code generation, large codebases
- **Strengths**:
  - 1M context window
  - Excellent at code generation
  - Premium tier required

#### Qwen3.6 Plus
- **Model ID**: `qwen3.6-plus`
- **Provider**: Ali Cloud
- **Best For**: Complex reasoning with vision support
- **Strengths**:
  - 1M context with 80K thinking chain
  - Vision capabilities for image analysis
  - Premium tier required

#### DeepSeek V3.2
- **Model ID**: `deepseek-v3.2`
- **Provider**: Ali Cloud
- **Best For**: Deep thinking, complex problem solving
- **Strengths**:
  - Sparse attention for efficient reasoning
  - Strong at algorithm design
  - Premium tier required

### Zhipu Models

#### GLM-5
- **Model ID**: `glm-5`
- **Provider**: Zhipu (via Ali Cloud)
- **Best For**: Advanced reasoning, Chinese language tasks
- **Strengths**:
  - 200K context with thinking capabilities
  - Excellent Chinese understanding
  - Premium tier required

#### GLM-4.7
- **Model ID**: `glm-4.7`
- **Provider**: Zhipu (via Ali Cloud)
- **Best For**: Long-form content, technical writing
- **Strengths**:
  - 200K context with 128K output
  - Strong at documentation
  - Premium tier required

### MiniMax Models

#### MiniMax M2.5
- **Model ID**: `minimax-m2.5`
- **Provider**: MiniMax (via Ali Cloud)
- **Best For**: Complex reasoning, creative tasks
- **Strengths**:
  - 200K context with thinking capabilities
  - Balanced performance
  - Premium tier required

### Moonshot Models

#### Kimi K2.6
- **Model ID**: `kimi-k2.6`
- **Provider**: Moonshot (via Ali Cloud)
- **Best For**: Large context analysis, vision tasks
- **Strengths**:
  - 256K context with vision support
  - Thinking capabilities
  - Premium tier required


### New Models

#### Kimi K2.7 Code
- **Model ID**: `kimi-k2.7-code`
- **Provider**: Moonshot
- **Best For**: Code-specialized tasks, large context
- **Strengths**:
  - 256K context window with vision support
  - Deep thinking capabilities
  - Code-specialized
  - Premium tier required

#### GLM 5.2
- **Model ID**: `glm-5.2`
- **Provider**: Zhipu AI
- **Best For**: Advanced reasoning, complex tasks
- **Strengths**:
  - 1M context window
  - Powerful reasoning capabilities
  - Premium tier required

#### DeepSeek V4 Pro
- **Model ID**: `deepseek-v4-pro`
- **Provider**: DeepSeek
- **Best For**: Complex reasoning, ultra-long conversations
- **Strengths**:
  - 1M token context window
  - Deep thinking capabilities
  - Premium tier required

#### DeepSeek V4 Flash
- **Model ID**: `deepseek-v4-flash`
- **Provider**: DeepSeek
- **Best For**: Fast responses, complex reasoning
- **Strengths**:
  - 1M token context window
  - Fastest DeepSeek variant
  - Free tier included

#### GLM 5.1
- **Model ID**: `glm-5.1`
- **Provider**: Zhipu AI
- **Best For**: Advanced reasoning, complex tasks
- **Strengths**:
  - 202K context window
  - Powerful reasoning capabilities
  - Free tier included

#### Qwen3.7 Plus
- **Model ID**: `qwen3.7-plus`
- **Provider**: Ali Cloud
- **Best For**: Advanced reasoning, vision tasks
- **Strengths**:
  - ~1M context window
  - Vision and deep thinking support
  - Premium tier required

## Selecting a Model

### Via Copilot Chat

1. Open Copilot Chat (click chat icon or press `Ctrl+Alt+I`)
2. Click the model selector dropdown at the top
3. Select a Feima model from the list
4. The selected model will be used for subsequent requests

### Switching Models

You can switch models at any time:
- The switch applies to new requests only
- Previous conversation context is maintained
- Different models may give different perspectives on the same problem

## Model Selection Guide

### For Code Generation

**Recommended**: Qwen3 Coder Plus, DeepSeek V3.2

```markdown
# Example Prompt
Generate a function to validate email addresses using regex in TypeScript.
```

### For Code Review

**Recommended**: Qwen3 Max, GLM-5

```markdown
# Example Prompt
Review this code for potential bugs and performance issues:
[paste code]
```

### For Documentation

**Recommended**: GLM-4.7, Qwen3.5 Plus

```markdown
# Example Prompt
Add detailed documentation for this function explaining its purpose and parameters.
```

### For Architecture Design

**Recommended**: Qwen3 Max, DeepSeek V3.2

```markdown
# Example Prompt
Design a microservice architecture for user authentication and authorization, including components and interaction flows.
```

### For Understanding Large Codebases

**Recommended**: Qwen3 Coder Plus, Kimi K2.5

```markdown
# Example Prompt
Explain how the authentication flow works in this codebase.
```

## Model Comparison

| Task | Lightweight Models | Powerful Models |
|------|-------------------|-----------------|
| **Code Generation** | Qwen3.6 Flash, DeepSeek V4 Flash | Qwen3.6 Plus, DeepSeek V4 Pro |
| **Code Review** | Qwen3.6 Flash | Qwen3.7 Max, GLM 5.2 |
| **Documentation** | Qwen3.6 Flash | GLM-4.7, Qwen3.6 Plus |
| **Architecture** | Qwen3.7 Max | DeepSeek V4 Pro, GLM 5.2 |
| **Large Context** | Qwen3.6 Flash | Qwen3.6 Plus, Kimi K2.6, DeepSeek V4 Flash |

## Best Practices

### Match Model to Task

1. **Quick questions** - Use Qwen3.6 Flash (free tier)
2. **Code generation** - Use Qwen3.6 Plus or DeepSeek V4 Pro
3. **Documentation** - Use GLM-4.7 or Qwen3.6 Plus
4. **Complex reasoning** - Use Qwen3.7 Max or DeepSeek V4 Pro
5. **Large context** - Use Qwen3.6 Plus, Kimi K2.6, or DeepSeek V4 Flash

### Provide Clear Context

```markdown
# Good Prompt
I'm working on a React application using TypeScript. Help me create a
custom hook for managing form state with validation.

# Bad Prompt
Help me with React forms.
```

### Test Different Models

If you're not getting good results, try another model:
- Different models have different strengths
- Some may understand your specific task better
- Compare responses from multiple models

### Use Model Specific Features

Some models have special capabilities:
- **Claude**: Very thorough and careful
- **GPT-4**: Strong reasoning and creativity
- **Gemini**: Very long context windows
- **DeepSeek**: Code-optimized
- **Tongyi**: Chinese-optimized

## Anthropic Messages API-Compatible Models

When using Feima models with **Claude Code** or any tool that speaks the Anthropic Messages API, only a subset of models are available. The Anthropic Messages API format is different from the OpenAI-compatible format, and not all Feima models support it.

The following models are compatible with the Anthropic Messages API:

| Model ID | Model Name |
|----------|------------|
| `feima/minimax-m3` | MiniMax M3 |
| `feima/minimax-m2.7` | MiniMax M2.7 |
| `feima/minimax-m2.5` | MiniMax M2.5 |
| `feima/qwen3.7-max` | Qwen 3.7 Max |
| `feima/qwen3.7-plus` | Qwen 3.7 Plus |
| `feima/qwen3.6-plus` | Qwen 3.6 Plus |

### Configuring Claude Code

Set the `ANTHROPIC_BASE_URL` and `ANTHROPIC_MODEL` to use one of the compatible models:

```bash
export ANTHROPIC_BASE_URL=https://api.feimacode.com
export ANTHROPIC_API_KEY=feima_sk_your_key_here
export ANTHROPIC_MODEL=feima/minimax-m3
export ANTHROPIC_DEFAULT_HAIKU_MODEL=feima/minimax-m3
export ANTHROPIC_DEFAULT_SONNET_MODEL=feima/minimax-m3
export ANTHROPIC_DEFAULT_OPUS_MODEL=feima/minimax-m3
export ANTHROPIC_REASONING_MODEL=feima/minimax-m3
```

Or in `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "feima_sk_your_key_here",
    "ANTHROPIC_BASE_URL": "https://api.feimacode.com",
    "ANTHROPIC_MODEL": "feima/minimax-m3",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "feima/minimax-m3",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "feima/minimax-m3",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "feima/minimax-m3",
    "ANTHROPIC_REASONING_MODEL": "feima/minimax-m3"
  }
}
```

> **Note:** `ANTHROPIC_BASE_URL` should point to the root API URL — do not append `/v1`. This is the Anthropic Messages API convention.

## Limitations

### Token Limits

Each model has different context limits:
- Check current limits in your account dashboard
- Large files may need to be split
- Consider using models with larger context windows for big tasks

### Rate Limits

API requests are rate limited:
- Free tier: 100 requests
- Paid tiers: Higher limits based on your plan
- Check your status bar for remaining requests

### Network Latency

- Provider models: Direct connection, lower latency
- Global models: Accelerated via Feima, slightly higher latency
- Network conditions can affect response time

## Tips for Better Results

### Be Specific

```markdown
# Specific
Write a TypeScript function that validates an email address and returns
true for valid emails, false otherwise.

# Vague
Help me with email validation.
```

### Provide Examples

```markdown
I need a function to parse dates. Here's what I want:

Input: "2024-02-23"
Output: Date object for February 23, 2024

Input: "23/02/2024"
Output: Date object for February 23, 2024
```

### Use Code Blocks

```markdown
```typescript
function example() {
  // Explain what this code does
}
```
```

### Ask for Explanations

```markdown
Write this function, and explain:
1. How it works
2. Why it's implemented this way
3. Potential edge cases
```

## Next Steps

- [Quick Start](/guides/quickstart) - Get started with Feima Copilot
- [Configuration](/guides/configuration) - Customize model settings

## Need Help?

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.com)