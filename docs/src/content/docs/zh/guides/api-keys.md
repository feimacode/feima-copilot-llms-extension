---
title: API 密钥
description: 创建和使用 API 密钥，将 Feima 与您喜爱的工具集成
---

API 密钥允许您将 Feima 的 AI 编程助手与您喜爱的工具和工作流集成。本指南涵盖创建 API 密钥、身份验证以及在支持的工具中使用它们。

## 什么是 API 密钥？

API 密钥是身份验证令牌，允许外部应用程序通过编程方式访问 Feima 的 AI 模型。使用 API 密钥，您可以：

- 将 Feima 与命令行工具集成（Claude Code、Codex CLI、CC Switch 等）
- 使用我们的 OpenAI 兼容 API 构建自定义应用程序
- 使用 AI 驱动的代码生成和分析自动化工作流
- 在您自己的开发环境中使用 Feima 模型

## 创建 API 密钥

### 步骤 1：登录

1. 访问 [feimacode.cn](https://feimacode.cn) 并登录您的账户
2. 导航至 **个人资料** → **API 密钥**

### 步骤 2：生成新密钥

1. 点击 **"生成新 API 密钥"**
2. 输入描述性名称（例如："claude-code-laptop"）
3. 可选设置过期日期（1-365 天，或留空表示永不过期）
4. 点击 **"生成 API 密钥"**

### 步骤 3：复制您的密钥

**重要**：API 密钥仅显示一次。请复制并安全存储！

- 点击 **复制** 按钮将密钥复制到剪贴板
- 将密钥存储在安全位置（密码管理器、环境变量或密钥管理器）
- 永远不要将 API 密钥提交到版本控制或公开分享

### 密钥格式

API 密钥遵循以下格式：
```
feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 身份验证

Feima 对所有 API 请求使用 Bearer 令牌身份验证。

### HTTP 请求头格式

```http
Authorization: Bearer feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 示例请求

```bash
curl https://api.feimacode.cn/v1/chat/completions \
  -H "Authorization: Bearer feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5",
    "messages": [{"role": "user", "content": "你好，Feima！"}]
  }'
```

## 快速开始

### 基本聊天完成

```bash
curl https://api.feimacode.cn/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5",
    "messages": [{"role": "user", "content": "解释这段代码：\n\nprint(\"Hello, World!\")"}],
    "stream": false
  }'
```

### 流式聊天完成

```bash
curl https://api.feimacode.cn/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5",
    "messages": [{"role": "user", "content": "数到 10"}],
    "stream": true
  }'
```

## 支持的工具

Feima API 密钥可与多种 AI 编程工具配合使用：

### Anthropic 兼容工具

- **Claude Code**：Anthropic 官方 AI 编程助手
- **CC Switch**（Claude 应用）：多种 AI 工具的通用提供商

### OpenAI 兼容工具

- **Codex CLI**：OpenAI 兼容的命令行工具
- **CC Switch**（OpenAI 应用）：多种 AI 工具的通用提供商
- **Copilot CLI**：GitHub Copilot 的命令行界面
- **OpenCode**：OpenAI 兼容的编程工具
- **OpenClaw**：OpenAI 兼容的编程工具
- **Hermes**：OpenAI 兼容的编程工具
- **Gemini CLI**：OpenAI 兼容的 Gemini 工具

有关每个工具的详细设置说明，请参阅 [工具指南](./api-tool-guides.md)。

## 错误处理

### 常见 HTTP 状态码

| 状态码 | 含义 | 操作 |
|--------|------|------|
| 200 | 成功 | — |
| 401 | 未授权 | 检查您的 API 密钥是否有效 |
| 402 | 余额不足 | 充值您的账户 |
| 403 | 被阻止 | 请求过多，请等待并重试 |
| 429 | 速率限制 | 请求过多，请等待并重试 |
| 499 | 已取消 | 请求已取消 |

### 错误响应格式

```json
{
  "error": {
    "message": "无效的 API 密钥",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

## 速率限制和配额

### 请求配额

- **免费层级**：每天有限的请求数
- **付费层级**：根据您的计划提供更高的配额

### 速率限制

- 请求受到速率限制，以确保公平使用
- 如果您达到速率限制，您将收到 `429` 状态码
- 重试速率限制的请求时，请使用指数退避

### 监控您的使用情况

检查您的剩余配额：
- 访问 [feimacode.cn/profile](https://feimacode.cn/profile)
- 使用 VS Code 扩展状态栏
- 检查响应头（`x-feima-quota-snapshot`）

## 安全最佳实践

### 1. 永远不要分享 API 密钥

- 不要将 API 密钥提交到版本控制
- 不要在公共仓库中分享 API 密钥
- 不要在客户端代码中包含 API 密钥

### 2. 使用环境变量

```bash
export ANTHROPIC_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export OPENAI_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 3. 定期轮换密钥

- 为 API 密钥设置过期日期（推荐 30-90 天）
- 如果密钥被暴露或泄露，请轮换密钥
- 创建替换密钥后撤销旧密钥

### 4. 为不同环境使用单独的密钥

- **开发环境**：具有短过期时间、有限范围的密钥
- **测试环境**：具有中等过期时间、测试范围的密钥
- **生产环境**：具有较长过期时间、完整范围的密钥

### 5. 监控密钥使用情况

- 定期查看您的 API 密钥使用日志
- 撤销未使用的密钥
- 调查可疑活动

## 管理 API 密钥

### 查看您的密钥

1. 前往 **个人资料** → **API 密钥**
2. 查看所有活动密钥及其创建日期和过期时间
3. 密钥出于安全原因被部分屏蔽（`feima_sk_xxx...xxx`）

### 撤销密钥

1. 前往 **个人资料** → **API 密钥**
2. 找到要撤销的密钥
3. 点击 **撤销**
4. 确认操作

**注意**：撤销的密钥无法恢复。如需要，请生成新密钥。

### 密钥限制

- 每个账户最多 5 个活动密钥
- 密钥可以设置为 1-365 天后过期
- 没有过期时间的密钥在被撤销之前保持有效

## 故障排除

### "无效的 API 密钥" 错误

- 验证密钥复制正确（没有多余的空格）
- 检查密钥未被撤销
- 确保您使用的是正确的端点 URL

### "余额不足" 错误

- 在 [feimacode.cn/profile](https://feimacode.cn/profile) 检查您的账户余额
- 如需要，请充值您的账户
- 检查您是否在正确的定价层级

### "速率限制" 错误

- 等待几秒钟后重试
- 在您的代码中实现指数退避
- 考虑升级到更高层级以获得更多配额

### 流式传输问题

- 确保您正确处理 SSE（服务器发送事件）
- 检查您的网络连接
- 验证您使用的是兼容的 HTTP 客户端

## 下一步

- [API 参考](../reference/api-reference.md) - 详细的 API 文档
- [代码示例](./api-code-examples.md) - 多种语言的示例代码
- [工具指南](./api-tool-guides.md) - 支持工具的设置说明

## 支持

如果您遇到任何问题或有疑问：

- 访问我们的 [常见问题](./faq.md)
- 通过 support@feimacode.cn 联系支持
- 查看我们的 [文档](https://docs.feimacode.cn)