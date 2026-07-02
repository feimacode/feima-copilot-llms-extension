---
title: API 参考
description: Feima OpenAI 兼容端点的完整 API 参考
---

# API 参考

这是 Feima OpenAI 兼容 API 端点的完整 API 参考。

## 基础 URL

```
https://api.feimacode.com
```

## 身份验证

所有 API 请求都需要在 Authorization 请求头中提供 API 密钥：

```http
Authorization: Bearer YOUR_API_KEY
```

## 端点

### 聊天完成

创建流式或非流式响应的聊天完成。

#### 端点

```
POST /v1/chat/completions
```

#### 请求头

| 请求头 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| Authorization | string | 是 | Bearer 令牌（API 密钥） |
| Content-Type | string | 是 | 必须是 `application/json` |

#### 请求体

```typescript
{
  model: string;                    // 必需：模型 ID（例如："claude-3-5-sonnet-20241022"）
  messages: Message[];              // 必需：消息对象数组
  stream?: boolean;                 // 可选：启用流式传输（默认：false）
  max_tokens?: number;              // 可选：生成的最大令牌数
  temperature?: number;             // 可选：采样温度（0.0-2.0）
  top_p?: number;                   // 可选：核采样（0.0-1.0）
  top_k?: number;                   // 可选：Top-k 采样
  stop?: string | string[];         // 可选：停止序列
  presence_penalty?: number;        // 可选：存在惩罚（-2.0 到 2.0）
  frequency_penalty?: number;       // 可选：频率惩罚（-2.0 到 2.0）
  tools?: Tool[];                   // 可选：可用工具列表
  tool_choice?: "auto" | "none" | { type: "function", function: { name: string } };
}

type Message = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: object;
  };
};

type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};
```

#### 非流式响应

```typescript
{
  id: string;                       // 唯一请求 ID
  object: "chat.completion";
  created: number;                  // Unix 时间戳
  model: string;                    // 模型 ID
  choices: Choice[];
  usage: Usage;
  system_fingerprint?: string;
}

type Choice = {
  index: number;
  message: Message;
  finish_reason: "stop" | "length" | "tool_calls" | "content_filter";
  logprobs?: null;
};

type Usage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};
```

#### 流式响应

服务器发送事件（SSE），包含以下事件类型：

**chat.completion.chunk**:
```typescript
{
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: [{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: ToolCall[];
    };
    finish_reason?: "stop" | "length" | "tool_calls" | "content_filter";
  }];
}
```

**[DONE]**:
表示流结束。

#### 示例请求（非流式）

```bash
curl https://api.feimacode.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
      {"role": "system", "content": "你是一个有用的编程助手。"},
      {"role": "user", "content": "编写一个 Python 函数来计算阶乘。"}
    ],
    "stream": false
  }'
```

#### 示例请求（流式）

```bash
curl https://api.feimacode.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
      {"role": "user", "content": "数到 10"}
    ],
    "stream": true
  }'
```

#### 示例请求（带工具）

```bash
curl https://api.feimacode.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
      {"role": "user", "content": "东京的天气怎么样？"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "获取位置的当前天气",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {"type": "string"},
              "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
            },
            "required": ["location"]
          }
        }
      }
    ],
    "tool_choice": "auto"
  }'
```

### 模型

列出可用模型。

#### 端点

```
GET /v1/models
```

#### 请求头

| 请求头 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| Authorization | string | 是 | Bearer 令牌（API 密钥） |

#### 响应

```typescript
{
  object: "list";
  data: Model[];
}

type Model = {
  id: string;                       // 模型 ID
  object: "model";
  created: number;                  // Unix 时间戳
  owned_by: string;                 // 模型提供商
};
```

#### 示例请求

```bash
curl https://api.feimacode.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 嵌入

为文本创建嵌入。

#### 端点

```
POST /v1/embeddings
```

#### 请求头

| 请求头 | 类型 | 必需 | 描述 |
|--------|------|------|------|
| Authorization | string | 是 | Bearer 令牌（API 密钥） |
| Content-Type | string | 是 | 必须是 `application/json` |

#### 请求体

```typescript
{
  model: string;                    // 必需：嵌入模型 ID
  input: string | string[];         // 必需：要嵌入的文本
  encoding_format?: "float" | "base64";  // 可选：编码格式
  dimensions?: number;              // 可选：嵌入维度
}
```

#### 响应

```typescript
{
  object: "list";
  data: [{
    object: "embedding";
    embedding: number[];            // 嵌入向量
    index: number;
  }];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
```

#### 示例请求

```bash
curl https://api.feimacode.com/v1/embeddings \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-3-small",
    "input": "你好，世界！"
  }'
```

## 错误响应

### 错误格式

```typescript
{
  error: {
    message: string;                // 人类可读的错误消息
    type: string;                   // 错误类型
    code?: string;                  // 错误代码
    param?: string;                 // 导致错误的参数
    details?: object;               // 附加错误详细信息
  };
}
```

### HTTP 状态码

| 状态 | 类型 | 描述 |
|------|------|------|
| 200 | 成功 | 请求成功 |
| 400 | 错误请求 | 无效的请求参数 |
| 401 | 未授权 | 无效或缺少 API 密钥 |
| 402 | 需要付款 | 余额不足 |
| 403 | 禁止 | 账户被阻止或暂停 |
| 404 | 未找到 | 未找到资源 |
| 429 | 请求过多 | 超过速率限制 |
| 499 | 客户端关闭请求 | 客户端取消请求 |
| 500 | 内部服务器错误 | 服务器错误 |
| 503 | 服务不可用 | 服务暂时不可用 |

### 错误类型

| 类型 | 描述 |
|------|------|
| `invalid_request_error` | 无效的请求参数 |
| `invalid_api_key` | 无效的 API 密钥 |
| `insufficient_quota` | 配额或余额不足 |
| `rate_limit_exceeded` | 超过速率限制 |
| `content_filter` | 内容被过滤 |
| `server_error` | 内部服务器错误 |

## 响应头

| 响应头 | 描述 |
|--------|------|
| `x-request-id` | 用于调试的唯一请求 ID |
| `x-feima-quota-snapshot` | 包含配额信息的 JSON 对象 |
| `x-ratelimit-limit-requests` | 请求速率限制 |
| `x-ratelimit-remaining-requests` | 剩余请求数 |
| `x-ratelimit-reset-requests` | 速率限制重置的 Unix 时间戳 |
| `x-feima-latency-ms` | 总请求延迟（毫秒） |
| `x-feima-ttft-ms` | 首个令牌时间（毫秒） |

## 速率限制

### 请求速率限制

- **免费层级**：每分钟 60 个请求
- **付费层级**：每分钟 300 个请求

速率限制按 API 密钥应用。

### 配额限制

配额限制取决于您的定价层级：

- **免费层级**：有限的每日请求
- **基础层级**：每月 10,000 个请求
- **专业层级**：每月 100,000 个请求
- **企业版**：自定义限制

### 处理速率限制

当您收到 `429` 状态码时：

1. 检查 `x-ratelimit-reset-requests` 请求头获取重置时间
2. 等待到重置时间，或
3. 实现带抖动的指数退避

```python
import time
import random

def make_request_with_backoff(request_func, max_retries=5):
    for attempt in range(max_retries):
        response = request_func()
        if response.status_code == 429:
            reset_time = int(response.headers.get('x-ratelimit-reset-requests', time.time() + 60))
            wait_time = min(2 ** attempt + random.random(), reset_time - time.time())
            time.sleep(wait_time)
            continue
        return response
    raise Exception("超过最大重试次数")
```

## 计费

### 令牌定价

定价基于使用的令牌（输入 + 输出）：

| 模型 | 输入（每 1K 令牌） | 输出（每 1K 令牌） |
|-------|-------------------|-------------------|
| claude-3-5-sonnet-20241022 | $0.003 | $0.015 |
| claude-3-opus-20240229 | $0.015 | $0.075 |
| claude-3-haiku-20240307 | $0.00025 | $0.00125 |

### 上下文窗口

| 模型 | 上下文窗口 |
|-------|-----------|
| claude-3-5-sonnet-20241022 | 200K 令牌 |
| claude-3-opus-20240229 | 200K 令牌 |
| claude-3-haiku-20240307 | 200K 令牌 |

### 配额跟踪

监控您的配额使用情况：

- **响应头**：`x-feima-quota-snapshot` 包含实时配额信息
- **VS Code 扩展**：状态栏显示剩余配额
- **Web 仪表板**：访问 [feimacode.com/profile](https://feimacode.com/profile)

## 最佳实践

### 1. 对长响应使用流式传输

流式传输提供更快的响应时间和更好的用户体验：

```typescript
const response = await fetch('https://api.feimacode.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    messages: [{ role: 'user', content: '写一篇长文章...' }],
    stream: true,
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  // 处理 SSE 块
}
```

### 2. 优雅地处理错误

始终处理错误并提供有意义的反馈：

```typescript
try {
  const response = await fetch('https://api.feimacode.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || '请求失败');
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error('API 请求失败：', error);
  throw error;
}
```

### 3. 实现重试逻辑

为瞬态错误实现指数退避：

```typescript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status === 429) {
        const waitTime = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

### 4. 使用适当的温度

- **0.0-0.3**：确定性、事实性响应
- **0.4-0.7**：平衡创造性和连贯性
- **0.8-1.0**：创造性、多样化响应

### 5. 高效管理上下文

- 保持对话历史简洁
- 总结长对话
- 有效地使用系统消息

## 更新日志

### 版本 1.0（当前）

- OpenAI 兼容的聊天完成 API
- 流式和非流式响应
- 工具/函数调用支持
- 嵌入 API
- 模型列出端点

## 支持

获取 API 支持：

- 文档：[docs.feimacode.com/zh](https://docs.feimacode.com/zh)
- 邮箱：support@feimacode.com
- 状态页面：[status.feimacode.com](https://status.feimacode.com)