---
title: 支持的模型
description: 所有支持的 AI 模型完整参考
---

# 模型参考

飞码扣支持的所有 AI 模型完整参考。


## 计费倍率

每个模型都有一个**计费倍率**，影响请求的计费方式。总成本计算如下：

```
加权请求次数 = 模型倍率 × 上下文倍率
```

### 模型级别

| 级别 | 倍率 | 描述 |
|------|------|------|
| **超轻量级** | 0.1x | 超快速、极低资源消耗的模型，适用于快速任务 |
| **轻量级** | 0.5x | 快速、高效的模型，适用于简单任务 |
| **标准** | 1.0x | 性能与成本平衡，适用于日常编程 |
| **高级** | 2.0x | 最先进的模型，提供最佳性能 |

### 上下文倍率

| 上下文大小 | Token 范围 | 倍率 |
|------------|------------|------|
| 小上下文 | 0 - 4,000 tokens | 0.5x |
| 中等上下文 | 4,001 - 16,000 tokens | 1.0x |
| 大上下文 | 16,001 - 32,000 tokens | 1.5x |
| 超大上下文 | 32,001+ tokens | 2.0x |

详细的计费信息，请参阅[计费与定价指南](../guides/billing.md)。

---


## 通义千问系列（阿里云）

### Qwen3 Max

| 属性 | 值 |
|------|-----|
| **提供商** | 阿里云 |
| **模型 ID** | `qwen3-max` |
| **上下文窗口** | 256K tokens |
| **输出限制** | 64K tokens |
| **思维链** | ✅ 32K 思维 tokens |
| **最适用于** | 复杂推理、大型代码库 |

**优势**:
- 256K 上下文窗口，适合大型代码库
- 思维链推理，解决复杂问题
- 支持工具调用和并行工具调用
- 结构化输出

---

### Qwen3 Coder Plus

| 属性 | 值 |
|------|-----|
| **提供商** | 阿里云 |
| **模型 ID** | `qwen3-coder-plus` |
| **上下文窗口** | 100万 tokens |
| **输出限制** | 64K tokens |
| **最适用于** | 代码生成、大型项目 |

**优势**:
- 100万 token 上下文窗口
- 代码生成专精
- 支持工具调用
- 适合大型代码仓库

---

### Qwen3.5 Plus

| 属性 | 值 |
|------|-----|
| **提供商** | 阿里云 |
| **模型 ID** | `qwen3.5-plus` |
| **上下文窗口** | 100万 tokens |
| **输出限制** | 64K tokens |
| **思维链** | ✅ 80K 思维 tokens |
| **最适用于** | 高级推理、复杂任务 |

**优势**:
- 100万 token 上下文窗口
- 80K 思维链深度推理
- 最新 Qwen 架构
- 结构化输出

---

## DeepSeek

### DeepSeek V3.2

| 属性 | 值 |
|------|-----|
| **提供商** | Ali Cloud（路由） |
| **模型 ID** | `deepseek-v3.2` |
| **上下文窗口** | 128K tokens |
| **输出限制** | 64K tokens |
| **思维链** | ✅ 支持 |
| **最适用于** | 代码生成、技术推理 |

**优势**:
- 深度思考，稀疏注意力
- 出色的代码理解能力
- 强大的调试能力
- 支持工具调用

---

## 智谱 AI（GLM）

### GLM-5

| 属性 | 值 |
|------|-----|
| **提供商** | 智谱 AI |
| **模型 ID** | `glm-5` |
| **上下文窗口** | 200K tokens |
| **输出限制** | 16K tokens |
| **思维链** | ✅ 支持 |
| **最适用于** | 高级推理、中文 NLP |

**优势**:
- 200K 上下文窗口
- 思维链推理
- 出色的中文理解
- 支持工具调用

---

### GLM-4.7

| 属性 | 值 |
|------|-----|
| **提供商** | 智谱 AI |
| **模型 ID** | `glm-4.7` |
| **上下文窗口** | 200K tokens |
| **输出限制** | 128K tokens |
| **思维链** | ✅ 支持 |
| **最适用于** | 高质量输出、长文本 |

**优势**:
- 200K 上下文窗口
- 最高 128K 输出 tokens
- 高级推理能力
- 结构化输出

---

## MiniMax

### MiniMax M2.5

| 属性 | 值 |
|------|-----|
| **提供商** | MiniMax |
| **模型 ID** | `minimax-m2.5` |
| **上下文窗口** | 200K tokens |
| **输出限制** | 32K tokens |
| **思维链** | ✅ 32K 思维 tokens |
| **最适用于** | 复杂推理、中文内容 |

**优势**:
- 200K 上下文窗口
- 思维链推理
- 强大的中文支持
- 支持工具调用

---

## Moonshot（Kimi）

### Kimi K2.5

| 属性 | 值 |
|------|-----|
| **提供商** | Moonshot |
| **模型 ID** | `kimi-k2.5` |
| **上下文窗口** | 256K tokens |
| **输出限制** | 16K tokens |
| **思维链** | ✅ 16K 思维 tokens |
| **最适用于** | 长上下文任务、文档分析 |

**优势**:
- 256K 上下文窗口
- 思维链推理
- 出色的文档分析能力
- 结构化输出

---

## 模型选择指南

| 使用场景 | 推荐模型 |
|----------|----------|
| 大型代码库分析 | Qwen3 Coder Plus（100万上下文） |
| 复杂推理任务 | Qwen3.5 Plus（80K 思维链） |
| 代码生成 | DeepSeek V3.2 |
| 中文内容 | GLM-5 或 Qwen3 Max |
| 文档分析 | Kimi K2.5 |
| 通用场景 | Qwen3 Max |

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