---
title: Code Examples
description: Sample code for using Feima API in multiple programming languages
---

# Code Examples

This page provides sample code for using the Feima API in various programming languages and frameworks.

## Table of Contents

- [Python](#python)
- [JavaScript/TypeScript](#javascripttypescript)
- [cURL](#curl)
- [Go](#go)
- [Java](#java)
- [Rust](#rust)
- [Ruby](#ruby)
- [PHP](#php)

## Python

### Basic Chat Completion

```python
import httpx

async def chat_completion(api_key: str, prompt: str):
    """Send a chat completion request."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.feimacode.com/v1/chat/completions",
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

# Usage
import asyncio

result = asyncio.run(chat_completion(
    "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "Write a Python function to calculate factorial."
))
print(result["choices"][0]["message"]["content"])
```

### Streaming Chat Completion

```python
import httpx
import json

async def stream_chat_completion(api_key: str, prompt: str):
    """Send a streaming chat completion request."""
    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            "https://api.feimacode.com/v1/chat/completions",
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

# Usage
import asyncio

asyncio.run(stream_chat_completion(
    "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "Count to 10"
))
```

### With Tool Calling

```python
import httpx
import json

async def chat_with_tools(api_key: str, prompt: str):
    """Send a chat completion with tool calling."""
    tools = [
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
    ]

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.feimacode.com/v1/chat/completions",
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

# Usage
import asyncio

result = asyncio.run(chat_with_tools(
    "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "What's the weather in Tokyo?"
))

# Check if model wants to call a tool
if result["choices"][0]["finish_reason"] == "tool_calls":
    tool_call = result["choices"][0]["message"]["tool_calls"][0]
    print(f"Tool called: {tool_call['function']['name']}")
    print(f"Arguments: {tool_call['function']['arguments']}")
else:
    print(result["choices"][0]["message"]["content"])
```

### Using OpenAI SDK

```python
from openai import OpenAI

# Configure OpenAI SDK to use Feima
client = OpenAI(
    api_key="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    base_url="https://api.feimacode.com/v1"
)

# Basic completion
response = client.chat.completions.create(
    model="glm-5",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello, Feima!"}
    ]
)
print(response.choices[0].message.content)

# Streaming completion
stream = client.chat.completions.create(
    model="glm-5",
    messages=[{"role": "user", "content": "Count to 10"}],
    stream=True
)
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
print()

# With tools
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather",
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
    messages=[{"role": "user", "content": "What's the weather in Tokyo?"}],
    tools=tools,
    tool_choice="auto"
)
```

### Using Anthropic SDK

```python
from anthropic import Anthropic

# Configure Anthropic SDK to use Feima
client = Anthropic(
    api_key="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    base_url="https://api.feimacode.com/v1"
)

# Basic completion
message = client.messages.create(
    model="glm-5",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello, Feima!"}
    ]
)
print(message.content[0].text)

# Streaming completion
with client.messages.stream(
    model="glm-5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Count to 10"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
    print()

# With tools
tools = [
    {
        "name": "get_weather",
        "description": "Get current weather",
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
    messages=[{"role": "user", "content": "What's the weather in Tokyo?"}],
    tools=tools
)
```

## JavaScript/TypeScript

### Basic Chat Completion

```typescript
async function chatCompletion(apiKey: string, prompt: string) {
  const response = await fetch('https://api.feimacode.com/v1/chat/completions', {
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

// Usage
const result = await chatCompletion(
  'feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'Write a JavaScript function to calculate factorial.'
);
console.log(result);
```

### Streaming Chat Completion

```typescript
async function streamChatCompletion(apiKey: string, prompt: string) {
  const response = await fetch('https://api.feimacode.com/v1/chat/completions', {
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
          // Ignore parsing errors for incomplete chunks
        }
      }
    }
  }
  console.log();
}

// Usage
await streamChatCompletion(
  'feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  'Count to 10'
);
```

### Using OpenAI SDK

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: 'feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  baseURL: 'https://api.feimacode.com/v1',
});

// Basic completion
const response = await client.chat.completions.create({
  model: 'glm-5',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello, Feima!' },
  ],
});
console.log(response.choices[0].message.content);

// Streaming completion
const stream = await client.chat.completions.create({
  model: 'glm-5',
  messages: [{ role: 'user', content: 'Count to 10' }],
  stream: true,
});

for await (const chunk of stream) {
  if (chunk.choices[0]?.delta?.content) {
    process.stdout.write(chunk.choices[0].delta.content);
  }
}
console.log();

// With tools
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'get_weather',
      description: 'Get current weather',
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
  messages: [{ role: 'user', content: "What's the weather in Tokyo?" }],
  tools,
  tool_choice: 'auto',
});
```

### Using Anthropic SDK

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: 'feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  baseURL: 'https://api.feimacode.com/v1',
});

// Basic completion
const message = await client.messages.create({
  model: 'glm-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello, Feima!' }],
});
console.log(message.content[0].text);

// Streaming completion
const stream = await client.messages.create({
  model: 'glm-5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Count to 10' }],
  stream: true,
});

for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    process.stdout.write(event.delta.text);
  }
}
console.log();

// With tools
const tools = [
  {
    name: 'get_weather',
    description: 'Get current weather',
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
  messages: [{ role: 'user', content: "What's the weather in Tokyo?" }],
  tools,
});
```

## cURL

### Basic Request

```bash
curl https://api.feimacode.com/v1/chat/completions \
  -H "Authorization: Bearer feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5",
    "messages": [
      {"role": "user", "content": "Hello, Feima!"}
    ]
  }'
```

### Streaming Request

```bash
curl https://api.feimacode.com/v1/chat/completions \
  -H "Authorization: Bearer feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5",
    "messages": [
      {"role": "user", "content": "Count to 10"}
    ],
    "stream": true
  }'
```

### With Tools

```bash
curl https://api.feimacode.com/v1/chat/completions \
  -H "Authorization: Bearer feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5",
    "messages": [
      {"role": "user", "content": "What'\''s the weather in Tokyo?"}
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get current weather",
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

### Basic Chat Completion

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

	httpReq, err := http.NewRequest("POST", "https://api.feimacode.com/v1/chat/completions", bytes.NewBuffer(reqBody))
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
	result, err := chatCompletion("feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "Hello, Feima!")
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	fmt.Println(result)
}
```

## Java

### Basic Chat Completion

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
    private static final String BASE_URL = "https://api.feimacode.com/v1";

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
            throw new RuntimeException("Request failed: " + response.statusCode());
        }

        JsonNode root = mapper.readTree(response.body());
        return root.path("choices").get(0).path("message").path("content").asText();
    }

    public static void main(String[] args) throws Exception {
        FeimaClient client = new FeimaClient();
        String result = client.chatCompletion("Hello, Feima!");
        System.out.println(result);
    }
}
```

## Rust

### Basic Chat Completion

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
            content: "Hello, Feima!".to_string(),
        }],
        stream: false,
    };

    let response = client
        .post("https://api.feimacode.com/v1/chat/completions")
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

### Basic Chat Completion

```ruby
require 'net/http'
require 'json'
require 'uri'

def chat_completion(api_key, prompt)
  uri = URI('https://api.feimacode.com/v1/chat/completions')

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
    raise "Request failed: #{response.code} #{response.message}"
  end

  data = JSON.parse(response.body)
  data['choices'][0]['message']['content']
end

# Usage
result = chat_completion('feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'Hello, Feima!')
puts result
```

## PHP

### Basic Chat Completion

```php
<?php

function chatCompletion($apiKey, $prompt) {
    $url = 'https://api.feimacode.com/v1/chat/completions';

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
        throw new Exception("Request failed: HTTP $httpCode");
    }

    $result = json_decode($response, true);
    return $result['choices'][0]['message']['content'];
}

// Usage
try {
    $result = chatCompletion('feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'Hello, Feima!');
    echo $result;
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
```

## Next Steps

- [API Reference](../reference/api-reference.md) - Complete API documentation
- [API Keys](./api-keys.md) - Getting started with API keys
- [Tool Guides](./api-tool-guides.md) - Setup instructions for supported tools