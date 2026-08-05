---
title: API Keys
description: Create and use API keys to integrate Feima with your favorite tools
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "API Keys Guide for Feima Copilot",
        "description": "Learn how to create and use API keys to integrate Feima with Claude Code, Copilot CLI, and other tools",
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

# API Keys

API keys allow you to integrate Feima's AI coding assistant with your favorite tools and workflows. This guide covers creating API keys, authentication, and using them with supported tools.

## What Are API Keys?

API keys are authentication tokens that allow external applications to access Feima's AI models programmatically. With an API key, you can:

- Integrate Feima with command-line tools (Claude Code, Codex CLI, CC Switch, etc.)
- Build custom applications using our OpenAI-compatible API
- Automate workflows with AI-powered code generation and analysis
- Use Feima models in your own development environment

## Creating an API Key

### Step 1: Sign In

1. Visit [feimacode.com](https://feimacode.com) and sign in to your account
2. Navigate to **Profile** → **API Keys**

### Step 2: Generate a New Key

1. Click **"Generate New API Key"**
2. Enter a descriptive name (e.g., "claude-code-laptop")
3. Optionally set an expiry date (1-365 days, or leave blank for no expiry)
4. Click **"Generate API Key"**

### Step 3: Copy Your Key

**Important**: API keys are only shown once. Copy and store them securely!

- Click the **Copy** button to copy the key to your clipboard
- Store the key in a secure location (password manager, environment variables, or secrets manager)
- Never commit API keys to version control or share them publicly

### Key Format

API keys follow this format:
```
feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Authentication

Feima uses Bearer token authentication for all API requests.

### HTTP Header Format

```http
Authorization: Bearer feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Example Request

```bash
curl https://api.feimacode.com/v1/chat/completions \
  -H "Authorization: Bearer feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5",
    "messages": [{"role": "user", "content": "Hello, Feima!"}]
  }'
```

## Quick Start

### Basic Chat Completion

```bash
curl https://api.feimacode.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5",
    "messages": [{"role": "user", "content": "Explain this code:\n\nprint(\"Hello, World!\")"}],
    "stream": false
  }'
```

### Streaming Chat Completion

```bash
curl https://api.feimacode.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-5",
    "messages": [{"role": "user", "content": "Count to 10"}],
    "stream": true
  }'
```

## Supported Tools

Feima API keys work with a wide range of AI coding tools:

### Anthropic-Compatible Tools

- **Claude Code**: Anthropic's official AI coding assistant
- **CC Switch** (Claude apps): Universal provider for multiple AI tools

### OpenAI-Compatible Tools

- **Codex CLI**: OpenAI-compatible command-line tool
- **CC Switch** (OpenAI apps): Universal provider for multiple AI tools
- **Copilot CLI**: GitHub Copilot's command-line interface
- **OpenCode**: OpenAI-compatible coding tool
- **OpenClaw**: OpenAI-compatible coding tool
- **Hermes**: OpenAI-compatible coding tool
- **Gemini CLI**: OpenAI-compatible Gemini tool

For detailed setup instructions for each tool, see [Tool Guides](./api-tool-guides.md).

## Error Handling

### Common HTTP Status Codes

| Status Code | Meaning | Action |
|------------|---------|--------|
| 200 | Success | — |
| 401 | Unauthorized | Check your API key is valid |
| 402 | Insufficient Balance | Top up your account |
| 403 | Blocked | Too many requests, wait and retry |
| 429 | Rate Limited | Too many requests, wait and retry |
| 499 | Cancelled | Request was cancelled |

### Error Response Format

```json
{
  "error": {
    "message": "Invalid API key",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

## Rate Limits and Quotas

### Request Quotas

- **Free tier**: Limited number of requests per day
- **Paid tier**: Higher quotas based on your plan

### Rate Limiting

- Requests are rate-limited to ensure fair usage
- If you hit a rate limit, you'll receive a `429` status code
- Use exponential backoff when retrying rate-limited requests

### Monitoring Your Usage

Check your remaining quota:
- Visit [feimacode.com/profile](https://feimacode.com/profile)
- Use the VS Code extension status bar
- Check response headers (`x-feima-quota-snapshot`)

## Security Best Practices

### 1. Never Share API Keys

- Don't commit API keys to version control
- Don't share API keys in public repositories
- Don't include API keys in client-side code

### 2. Use Environment Variables

```bash
export ANTHROPIC_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export OPENAI_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 3. Rotate Keys Regularly

- Set expiry dates on API keys (30-90 days recommended)
- Rotate keys if they're ever exposed or compromised
- Revoke old keys after creating replacements

### 4. Use Separate Keys for Different Environments

- **Development**: Keys with short expiry, limited scope
- **Staging**: Keys with medium expiry, testing scope
- **Production**: Keys with longer expiry, full scope

### 5. Monitor Key Usage

- Regularly review your API key usage logs
- Revoke unused keys
- Investigate suspicious activity

## Managing API Keys

### Viewing Your Keys

1. Go to **Profile** → **API Keys**
2. View all active keys with creation date and expiry
3. Keys are partially masked for security (`feima_sk_xxx...xxx`)

### Revoking a Key

1. Go to **Profile** → **API Keys**
2. Find the key you want to revoke
3. Click **Revoke**
4. Confirm the action

**Note**: Revoked keys cannot be recovered. Generate a new key if needed.

### Key Limits

- Maximum of 5 active keys per account
- Keys can be set to expire in 1-365 days
- Keys without expiry remain valid until revoked

## Troubleshooting

### "Invalid API Key" Error

- Verify the key is copied correctly (no extra spaces)
- Check the key hasn't been revoked
- Ensure you're using the correct endpoint URL

### "Insufficient Balance" Error

- Check your account balance at [feimacode.com/profile](https://feimacode.com/profile)
- Top up your account if needed
- Check if you're on the correct pricing tier

### "Rate Limited" Error

- Wait a few seconds before retrying
- Implement exponential backoff in your code
- Consider upgrading to a higher tier for more quota

### Streaming Issues

- Ensure you're handling SSE (Server-Sent Events) correctly
- Check your network connection
- Verify you're using a compatible HTTP client

## Next Steps

- [API Reference](../reference/api-reference.md) - Detailed API documentation
- [Code Examples](./api-code-examples.md) - Sample code in multiple languages
- [Tool Guides](./api-tool-guides.md) - Setup instructions for supported tools

## Support

If you encounter any issues or have questions:

- Visit our [FAQ](./faq.md)
- Contact support at support@feimacode.com
- Check our [documentation](https://docs.feimacode.com)