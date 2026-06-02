---
title: API Reference
description: Complete API reference for Feima's OpenAI-compatible endpoints
---

# API Reference

This is the complete API reference for Feima's OpenAI-compatible API endpoints.

## Base URL

```
https://api.feimacode.com
```

## Authentication

All API requests require an API key in the Authorization header:

```http
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### Chat Completions

Create a chat completion with streaming or non-streaming response.

#### Endpoint

```
POST /v1/chat/completions
```

#### Request Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| Authorization | string | Yes | Bearer token (API key) |
| Content-Type | string | Yes | Must be `application/json` |

#### Request Body

```typescript
{
  model: string;                    // Required: Model ID (e.g., "claude-3-5-sonnet-20241022")
  messages: Message[];              // Required: Array of message objects
  stream?: boolean;                 // Optional: Enable streaming (default: false)
  max_tokens?: number;              // Optional: Maximum tokens to generate
  temperature?: number;             // Optional: Sampling temperature (0.0-2.0)
  top_p?: number;                   // Optional: Nucleus sampling (0.0-1.0)
  top_k?: number;                   // Optional: Top-k sampling
  stop?: string | string[];         // Optional: Stop sequences
  presence_penalty?: number;        // Optional: Presence penalty (-2.0 to 2.0)
  frequency_penalty?: number;       // Optional: Frequency penalty (-2.0 to 2.0)
  tools?: Tool[];                   // Optional: List of available tools
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

#### Non-Streaming Response

```typescript
{
  id: string;                       // Unique request ID
  object: "chat.completion";
  created: number;                  // Unix timestamp
  model: string;                    // Model ID
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

#### Streaming Response

Server-Sent Events (SSE) with the following event types:

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
Indicates the end of the stream.

#### Example Request (Non-Streaming)

```bash
curl https://api.feimacode.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
      {"role": "system", "content": "You are a helpful coding assistant."},
      {"role": "user", "content": "Write a Python function to calculate factorial."}
    ],
    "stream": false
  }'
```

#### Example Request (Streaming)

```bash
curl https://api.feimacode.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
      {"role": "user", "content": "Count to 10"}
    ],
    "stream": true
  }'
```

#### Example Request with Tools

```bash
curl https://api.feimacode.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
      {"role": "user", "content": "What is the weather in Tokyo?"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get current weather for a location",
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

### Models

List available models.

#### Endpoint

```
GET /v1/models
```

#### Request Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| Authorization | string | Yes | Bearer token (API key) |

#### Response

```typescript
{
  object: "list";
  data: Model[];
}

type Model = {
  id: string;                       // Model ID
  object: "model";
  created: number;                  // Unix timestamp
  owned_by: string;                 // Model provider
};
```

#### Example Request

```bash
curl https://api.feimacode.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Embeddings

Create embeddings for text.

#### Endpoint

```
POST /v1/embeddings
```

#### Request Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| Authorization | string | Yes | Bearer token (API key) |
| Content-Type | string | Yes | Must be `application/json` |

#### Request Body

```typescript
{
  model: string;                    // Required: Embedding model ID
  input: string | string[];         // Required: Text to embed
  encoding_format?: "float" | "base64";  // Optional: Encoding format
  dimensions?: number;              // Optional: Embedding dimensions
}
```

#### Response

```typescript
{
  object: "list";
  data: [{
    object: "embedding";
    embedding: number[];            // Embedding vector
    index: number;
  }];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
```

#### Example Request

```bash
curl https://api.feimacode.com/v1/embeddings \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "text-embedding-3-small",
    "input": "Hello, world!"
  }'
```

## Error Responses

### Error Format

```typescript
{
  error: {
    message: string;                // Human-readable error message
    type: string;                   // Error type
    code?: string;                  // Error code
    param?: string;                 // Parameter that caused the error
    details?: object;               // Additional error details
  };
}
```

### HTTP Status Codes

| Status | Type | Description |
|--------|------|-------------|
| 200 | Success | Request succeeded |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Invalid or missing API key |
| 402 | Payment Required | Insufficient balance |
| 403 | Forbidden | Account blocked or suspended |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 499 | Client Closed Request | Request cancelled by client |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Types

| Type | Description |
|------|-------------|
| `invalid_request_error` | Invalid request parameters |
| `invalid_api_key` | Invalid API key |
| `insufficient_quota` | Insufficient quota or balance |
| `rate_limit_exceeded` | Rate limit exceeded |
| `content_filter` | Content was filtered |
| `server_error` | Internal server error |

## Response Headers

| Header | Description |
|--------|-------------|
| `x-request-id` | Unique request ID for debugging |
| `x-feima-quota-snapshot` | JSON object with quota information |
| `x-ratelimit-limit-requests` | Request rate limit |
| `x-ratelimit-remaining-requests` | Remaining requests |
| `x-ratelimit-reset-requests` | Unix timestamp when rate limit resets |
| `x-feima-latency-ms` | Total request latency in milliseconds |
| `x-feima-ttft-ms` | Time to first token in milliseconds |

## Rate Limits

### Request Rate Limits

- **Free tier**: 60 requests per minute
- **Paid tier**: 300 requests per minute

Rate limits are applied per API key.

### Quota Limits

Quota limits depend on your pricing tier:

- **Free tier**: Limited daily requests
- **Basic tier**: 10,000 requests per month
- **Pro tier**: 100,000 requests per month
- **Enterprise**: Custom limits

### Handling Rate Limits

When you receive a `429` status code:

1. Check the `x-ratelimit-reset-requests` header for the reset time
2. Wait until the reset time, or
3. Implement exponential backoff with jitter

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
    raise Exception("Max retries exceeded")
```

## Billing

### Token Pricing

Pricing is based on tokens used (input + output):

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|------------------------|
| claude-3-5-sonnet-20241022 | $0.003 | $0.015 |
| claude-3-opus-20240229 | $0.015 | $0.075 |
| claude-3-haiku-20240307 | $0.00025 | $0.00125 |

### Context Window

| Model | Context Window |
|-------|----------------|
| claude-3-5-sonnet-20241022 | 200K tokens |
| claude-3-opus-20240229 | 200K tokens |
| claude-3-haiku-20240307 | 200K tokens |

### Quota Tracking

Monitor your quota usage:

- **Response headers**: `x-feima-quota-snapshot` contains real-time quota info
- **VS Code extension**: Status bar shows remaining quota
- **Web dashboard**: Visit [feimacode.com/profile](https://feimacode.com/profile)

## Best Practices

### 1. Use Streaming for Long Responses

Streaming provides faster response times and better user experience:

```typescript
const response = await fetch('https://api.feimacode.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    messages: [{ role: 'user', content: 'Write a long article...' }],
    stream: true,
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  // Process SSE chunks
}
```

### 2. Handle Errors Gracefully

Always handle errors and provide meaningful feedback:

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
    throw new Error(error.error?.message || 'Request failed');
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error('API request failed:', error);
  throw error;
}
```

### 3. Implement Retry Logic

Implement exponential backoff for transient errors:

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

### 4. Use Appropriate Temperature

- **0.0-0.3**: Deterministic, factual responses
- **0.4-0.7**: Balanced creativity and coherence
- **0.8-1.0**: Creative, varied responses

### 5. Manage Context Efficiently

- Keep conversation history concise
- Summarize long conversations
- Use system messages effectively

## Changelog

### Version 1.0 (Current)

- OpenAI-compatible chat completions API
- Streaming and non-streaming responses
- Tool/function calling support
- Embeddings API
- Model listing endpoint

## Support

For API support:

- Documentation: [docs.feimacode.com](https://docs.feimacode.com)
- Email: support@feimacode.com
- Status Page: [status.feimacode.com](https://status.feimacode.com)