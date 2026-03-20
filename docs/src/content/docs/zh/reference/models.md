---
title: Supported Models
description: Complete reference for all supported AI models
---

# Model Reference

Complete reference for all AI models available in Feima Copilot.

## Chinese Models

### DeepSeek Coder V2

| Property | Value |
|----------|-------|
| **Provider** | DeepSeek |
| **Model ID** | `deepseek-coder-v2` |
| **Context Window** | 16K tokens |
| **Output Limit** | 4K tokens |
| **Status** | Stable |
| **Latency** | Low (China direct) |
| **Best For** | Code generation, debugging, technical Q&A |

**Strengths**:
- Excellent code understanding and generation
- Strong debugging capabilities
- Good at explaining technical concepts
- Fast response times in China

**Weaknesses**:
- Limited context window compared to some international models
- May struggle with very complex architectural questions

**Example Usage**:
```markdown
Write a TypeScript function that implements a binary search algorithm
with proper error handling and documentation.
```

---

### Tongyi Qianwen 3 Coder

| Property | Value |
|----------|-------|
| **Provider** | Alibaba Cloud |
| **Model ID** | `tongyi-qianwen-3-coder` |
| **Context Window** | 32K tokens |
| **Output Limit** | 8K tokens |
| **Status** | Stable |
| **Latency** | Low (China direct) |
| **Best For** | Chinese documentation, code comments |

**Strengths**:
- Superior Chinese language understanding
- Excellent at writing Chinese documentation
- Strong at generating Chinese code comments
- Large context window

**Weaknesses**:
- May not be as strong on code optimization as DeepSeek
- Response quality can vary on highly technical topics

**Example Usage**:
```markdown
为这个React组件添加详细的中文注释，包括props说明、使用示例和注意事项。
```

---

### Tencent Hunyuan

| Property | Value |
|----------|-------|
| **Provider** | Tencent Cloud |
| **Model ID** | `tencent-hunyuan` |
| **Context Window** | 128K tokens |
| **Output Limit** | 4K tokens |
| **Status** | Stable |
| **Latency** | Low (China direct) |
| **Best For** | General Q&A, code understanding |

**Strengths**:
- Very large context window
- Balanced performance across tasks
- Good at natural language explanation
- Stable and reliable

**Weaknesses**:
- Not as specialized for code as DeepSeek
- May be slower on complex code tasks

**Example Usage**:
```markdown
Explain how this authentication system works, including all the
components and their interactions.
```

## International Models

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