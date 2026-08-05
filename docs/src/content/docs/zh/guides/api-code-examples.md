---
title: 代码示例
description: 在多种编程语言中使用 Feima API 的示例代码
---

本页面提供了在各种编程语言和框架中使用 Feima API 的示例代码。

## 目录

- [Python](#python)
- [JavaScript/TypeScript](#javascripttypescript)
- [cURL](#curl)
- [Go](#go)
- [Java](#java)
- [Rust](#rust)
- [Ruby](#ruby)
- [PHP](#php)

## Python

### 基本聊天完成

```python
import httpx

async def chat_completion(api_key: str, prompt: str):
    """发送聊天完成请求。"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.feimacode.cn/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "glm-5",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "stream": False,
            }
        )
        response.raise_for_status()
        return response.json()

# 使用
import asyncio

result = asyncio.run(chat_completion(
    "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "编写一个 Python 函数来计算阶乘。"
))
print(result["choices"][0]["message"]["content"])
```

### 流式聊天完成

```python
import httpx
import json

async def stream_chat_completion(api_key: str, prompt: str):
    """发送流式聊天完成请求。"""
    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            "https://api.feimacode.cn/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "glm-5",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "stream": True,
            }
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    chunk = json.loads(data)
                    if chunk["choices"][0].get("delta", {}).get("content"):
                        print(chunk["choices"][0]["delta"]["content"], end="", flush=True)
            print()

# 使用
import asyncio

asyncio.run(stream_chat_completion(
    "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "数到 10"
))
```

### 带工具调用

```python
import httpx
import json

async def chat_with_tools(api_key: str, prompt: str):
    """发送带工具调用的聊天完成请求。"""
    tools = [
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
    ]

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.feimacode.cn/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "glm-5",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "tools": tools,
                "tool_choice": "auto",
            }
        )
        response.raise_for_status()
        return response.json()

# 使用
import asyncio

result = asyncio.run(chat_with_tools(
    "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "东京的天气怎么样？"
))

# 检查模型是否想要调用工具
if result["choices"][0]["finish_reason"] == "tool_calls":
    tool_call = result["choices"][0]["message"]["tool_calls"][0]
    print(f"调用的工具: {tool_call['function']['name']}")
    print(f"参数: {tool_call['function']['arguments']}")
else:
    print(result["choices"][0]["message"]["content"])
```

### 使用 OpenAI SDK

```python
from openai import OpenAI

# 配置 OpenAI SDK 使用 Feima
client = OpenAI(
    api_key="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    base_url="https://api.feimacode.cn/v1"
)

# 基本完成
response = client.chat.completions.create(
    model="glm-5",
    messages=[
        {"role": "system", "content": "你是一个有用的助手。"},
        {"role": "user", "content": "你好，Feima！"}
    ]
)
print(response.choices[0].message.content)

# 流式完成
stream = client.chat.completions.create(
    model="glm-5",
    messages=[{"role": "user", "content": "数到 10"}],
    stream=True
)
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
print()

# 带工具
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取当前天气",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"}
                },
                "required": ["location"]
            }
        }
    }
]

response = client.chat.completions.create(
    model="glm-5",
    messages=[{"role": "user", "content": "东京的天气怎么样？"}],
    tools=tools,
    tool_choice="auto"
)
```

### 使用 Anthropic SDK

```python
from anthropic import Anthropic

# 配置 Anthropic SDK 使用 Feima
client = Anthropic(
    api_key="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    base_url="https://api.feimacode.cn/v1"
)

# 基本完成
message = client.messages.create(
    model="glm-5",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "你好，Feima！"}
    ]
)
print(message.content[0].text)

# 流式完成
with client.messages.stream(
    model="glm-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "数到 10"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
    print()

# 带工具
tools = [
    {
        "name": "get_weather",
        "description": "获取当前天气",
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {"type": "string"}
            },
            "required": ["location"]
        }
    }
]

message = client.messages.create(
    model="glm-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "东京的天气怎么样？"}],
    tools=tools
)
```

## JavaScript/TypeScript

### 基本聊天完成

```typescript
async function chatCompletion(apiKey: string, prompt: string) {
  const response = await fetch('https://api.feimacode.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'glm-5',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// 使用
const result = await chatCompletion(
  'feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  '编写一个 JavaScript 函数来计算阶乘。'
);
console.log(result);
```

### 流式聊天完成

```typescript
async function streamChatCompletion(apiKey: string, prompt: string) {
  const response = await fetch('https://api.feimacode.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'glm-5',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            process.stdout.write(content);
          }
        } catch (e) {
          // 忽略不完整块的解析错误
        }
      }
    }
  }
  console.log();
}

// 使用
await streamChatCompletion(
  'feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  '数到 10'
);
```

### 使用 OpenAI SDK

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  baseURL: 'https://api.feimacode.cn/v1',
});

// 基本完成
const response = await client.chat.completions.create({
  model: 'glm-5',
  messages: [
    { role: 'system', content: '你是一个有用的助手。' },
    { role: 'user', content: '你好，Feima！' },
  ],
});
console.log(response.choices[0].message.content);

// 流式完成
const stream = await client.chat.completions.create({
  model: 'glm-5',
  messages: [{ role: 'user', content: '数到 10' }],
  stream: true,
});

for await (const chunk of stream) {
  if (chunk.choices[0]?.delta?.content) {
    process.stdout.write(chunk.choices[0].delta.content);
  }
}
console.log();

// 带工具
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'get_weather',
      description: '获取当前天气',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string' },
        },
        required: ['location'],
      },
    },
  },
];

const responseWithTools = await client.chat.completions.create({
  model: 'glm-5',
  messages: [{ role: 'user', content: '东京的天气怎么样？' }],
  tools,
  tool_choice: 'auto',
});
```

### 使用 Anthropic SDK

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: 'feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  baseURL: 'https://api.feimacode.cn/v1',
});

// 基本完成
const message = await client.messages.create({
  model: 'glm-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: '你好，Feima！' }],
});
console.log(message.content[0].text);

// 流式完成
const stream = await client.messages.create({
  model: 'glm-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: '数到 10' }],
  stream: true,
});

for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    process.stdout.write(event.delta.text);
  }
}
console.log();

// 带工具
const tools = [
  {
    name: 'get_weather',
    description: '获取当前天气',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string' },
      },
      required: ['location'],
    },
  },
];

const messageWithTools = await client.messages.create({
  model: 'glm-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: '东京的天气怎么样？' }],
  tools,
});
```

## cURL

### 基本请求

```bash
curl https://api.feimacode.cn/v1/chat/completions \
  -H "Authorization: Bearer feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5",
    "messages": [
      {"role": "user", "content": "你好，Feima！"}
    ]
  }'
```

### 流式请求

```bash
curl https://api.feimacode.cn/v1/chat/completions \
  -H "Authorization: Bearer feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5",
    "messages": [
      {"role": "user", "content": "数到 10"}
    ],
    "stream": true
  }'
```

### 带工具

```bash
curl https://api.feimacode.cn/v1/chat/completions \
  -H "Authorization: Bearer feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5",
    "messages": [
      {"role": "user", "content": "东京的天气怎么样？"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "获取当前天气",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {"type": "string"}
            },
            "required": ["location"]
          }
        }
      }
    ],
    "tool_choice": "auto"
  }'
```

## Go

### 基本聊天完成

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type ChatRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
	Stream   bool      `json:"stream"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatResponse struct {
	Choices []Choice `json:"choices"`
}

type Choice struct {
	Message Message `json:"message"`
}

func chatCompletion(apiKey, prompt string) (string, error) {
	req := ChatRequest{
		Model: "glm-5",
		Messages: []Message{
			{Role: "user", Content: prompt},
		},
		Stream: false,
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return "", err
	}

	httpReq, err := http.NewRequest("POST", "https://api.feimacode.cn/v1/chat/completions", bytes.NewBuffer(reqBody))
	if err != nil {
		return "", err
	}

	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var chatResp ChatResponse
	if err := json.Unmarshal(body, &chatResp); err != nil {
		return "", err
	}

	return chatResp.Choices[0].Message.Content, nil
}

func main() {
	result, err := chatCompletion("feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "你好，Feima！")
	if err != nil {
		fmt.Printf("错误: %v\n", err)
		return
	}
	fmt.Println(result)
}
```

## Java

### 基本聊天完成

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse.BodyHandlers;
import com.fasterxml.jackson.databind.ObjectMapper;

public class FeimaClient {
    private static final String API_KEY = "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    private static final String BASE_URL = "https://api.feimacode.cn/v1";

    private final HttpClient client;
    private final ObjectMapper mapper;

    public FeimaClient() {
        this.client = HttpClient.newHttpClient();
        this.mapper = new ObjectMapper();
    }

    public String chatCompletion(String prompt) throws Exception {
        String requestBody = String.format(
            "{\"model\":\"glm-5\",\"messages\":[{\"role\":\"user\",\"content\":\"%s\"}]}",
            prompt
        );

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(BASE_URL + "/chat/completions"))
            .header("Authorization", "Bearer " + API_KEY)
            .header("Content-Type", "application/json")
            .POST(BodyPublishers.ofString(requestBody))
            .build();

        HttpResponse<String> response = client.send(request, BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("请求失败: " + response.statusCode());
        }

        JsonNode root = mapper.readTree(response.body());
        return root.path("choices").get(0).path("message").path("content").asText();
    }

    public static void main(String[] args) throws Exception {
        FeimaClient client = new FeimaClient();
        String result = client.chatCompletion("你好，Feima！");
        System.out.println(result);
    }
}
```

## Rust

### 基本聊天完成

```rust
use reqwest::{Client, header::AUTHORIZATION, header::CONTENT_TYPE};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<Message>,
    stream: bool,
}

#[derive(Serialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: MessageResponse,
}

#[derive(Deserialize)]
struct MessageResponse {
    content: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let api_key = "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

    let request = ChatRequest {
        model: "glm-5".to_string(),
        messages: vec![Message {
            role: "user".to_string(),
            content: "你好，Feima！".to_string(),
        }],
        stream: false,
    };

    let response = client
        .post("https://api.feimacode.cn/v1/chat/completions")
        .header(AUTHORIZATION, format!("Bearer {}", api_key))
        .header(CONTENT_TYPE, "application/json")
        .json(&request)
        .send()
        .await?;

    let chat_response: ChatResponse = response.json().await?;
    println!("{}", chat_response.choices[0].message.content);

    Ok(())
}
```

## Ruby

### 基本聊天完成

```ruby
require 'net/http'
require 'json'
require 'uri'

def chat_completion(api_key, prompt)
  uri = URI('https://api.feimacode.cn/v1/chat/completions')

  request = Net::HTTP::Post.new(uri)
  request['Authorization'] = "Bearer #{api_key}"
  request['Content-Type'] = 'application/json'
  request.body = {
    model: 'glm-5',
    messages: [{ role: 'user', content: prompt }],
    stream: false
  }.to_json

  response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
    http.request(request)
  end

  if response.code != '200'
    raise "请求失败: #{response.code} #{response.message}"
  end

  data = JSON.parse(response.body)
  data['choices'][0]['message']['content']
end

# 使用
result = chat_completion('feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '你好，Feima！')
puts result
```

## PHP

### 基本聊天完成

```php
<?php

function chatCompletion($apiKey, $prompt) {
    $url = 'https://api.feimacode.cn/v1/chat/completions';

    $data = [
        'model' => 'glm-5',
        'messages' => [
            ['role' => 'user', 'content' => $prompt]
        ],
        'stream' => false
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json'
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) {
        throw new Exception("请求失败: HTTP $httpCode");
    }

    $result = json_decode($response, true);
    return $result['choices'][0]['message']['content'];
}

// 使用
try {
    $result = chatCompletion('feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', '你好，Feima！');
    echo $result;
} catch (Exception $e) {
    echo "错误: " . $e->getMessage();
}
?>
```

## 下一步

- [API 参考](../reference/api-reference.md) - 完整的 API 文档
- [API 密钥](./api-keys.md) - API 密钥入门
- [工具指南](./api-tool-guides.md) - 支持工具的设置说明