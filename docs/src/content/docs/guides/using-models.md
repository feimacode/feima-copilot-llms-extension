---
title: Using Models
description: How to select and use different AI models in Feima Copilot
---

# Using Models

Feima Copilot provides access to multiple AI models, both Chinese and international, to suit different tasks.

## Available Models

### Chinese Models (Direct Connection)

#### DeepSeek Coder V2
- **Provider**: DeepSeek
- **Best For**: Code generation, code completion, technical Q&A
- **Strengths**:
  - Excellent at understanding and generating code
  - Strong debugging capabilities
  - Good at explaining complex code

#### Tongyi Qianwen 3 Coder
- **Provider**: Alibaba Cloud
- **Best For**: Chinese code comments, documentation generation
- **Strengths**:
  - Superior Chinese language understanding
  - Great at writing docstrings and comments
  - Strong at Chinese technical documentation

#### Tencent Hunyuan
- **Provider**: Tencent Cloud
- **Best For**: General Q&A, code understanding
- **Strengths**:
  - Balanced performance across tasks
  - Good at natural language explanation
  - Stable performance

### International Models (Accelerated)

#### GPT-4o
- **Provider**: OpenAI
- **Best For**: Complex logic, architecture design, advanced reasoning
- **Strengths**:
  - State-of-the-art reasoning
  - Excellent at architectural decisions
  - Strong at system design

#### Claude 3.5 Sonnet
- **Provider**: Anthropic
- **Best For**: Code review, algorithm optimization, refactoring
- **Strengths**:
  - Very thorough code review
  - Excellent at suggesting optimizations
  - Good at identifying edge cases

#### Gemini 1.5 Pro
- **Provider**: Google
- **Best For**: Large codebase understanding, long context analysis
- **Strengths**:
  - Very long context window
  - Good at understanding large codebases
  - Strong at cross-file analysis

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

**Recommended**: DeepSeek Coder V2, Claude 3.5 Sonnet

```markdown
# Example Prompt
Generate a function to validate email addresses using regex in TypeScript.
```

### For Code Review

**Recommended**: Claude 3.5 Sonnet, GPT-4o

```markdown
# Example Prompt
Review this code for potential bugs and performance issues:
[paste code]
```

### For Chinese Documentation

**Recommended**: Tongyi Qianwen 3 Coder, DeepSeek Coder V2

```markdown
# Example Prompt
为这个函数添加详细的中文注释说明其用途和参数。
```

### For Architecture Design

**Recommended**: GPT-4o, Claude 3.5 Sonnet

```markdown
# Example Prompt
设计一个微服务架构来处理用户认证和授权，包括组件和交互流程。
```

### For Understanding Large Codebases

**Recommended**: Gemini 1.5 Pro, GPT-4o

```markdown
# Example Prompt
Explain how the authentication flow works in this codebase.
```

## Model Comparison

| Task | Chinese Models | International Models |
|------|----------------|---------------------|
| **Code Generation** | DeepSeek Coder V2 | Claude 3.5 Sonnet |
| **Code Review** | DeepSeek Coder V2 | Claude 3.5 Sonnet |
| **Chinese Doc** | Tongyi Qianwen 3 Coder | GPT-4o |
| **Architecture** | DeepSeek Coder V2 | GPT-4o |
| **Large Context** | DeepSeek Coder V2 | Gemini 1.5 Pro |
| **Speed** | Tencent Hunyuan | GPT-4o |

## Best Practices

### Match Model to Task

1. **Code tasks** - Use DeepSeek Coder V2 or Claude 3.5 Sonnet
2. **Chinese content** - Use Tongyi Qianwen 3 Coder
3. **Complex reasoning** - Use GPT-4o or Claude 3.5 Sonnet
4. **Large context** - Use Gemini 1.5 Pro

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

- Chinese models: Direct connection, lower latency
- International models: Accelerated via Feima, slightly higher latency
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

- [Quick Start](./quickstart.md) - Get started with Feima Copilot
- [Configuration](./configuration.md) - Customize model settings

## Need Help?

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.cn)