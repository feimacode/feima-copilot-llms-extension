---
title: Tool Guides
description: Setup instructions for using Feima API with supported AI coding tools
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "API Tool Guides for Feima Copilot",
        "description": "Setup instructions for using Feima API with supported AI coding tools",
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

# Tool Guides

Feima API keys work with a wide range of AI coding tools. This page provides setup instructions for each supported tool.

## Table of Contents

- [Anthropic-Compatible Tools](#anthropic-compatible-tools)
  - [Claude Code](#claude-code)
  - [CC Switch (Claude)](#cc-switch-claude)
- [OpenAI-Compatible Tools](#openai-compatible-tools)
  - [Codex CLI](#codex-cli)
  - [CC Switch (OpenAI)](#cc-switch-openai)
  - [Copilot CLI](#copilot-cli)
  - [OpenCode](#opencode)
  - [OpenClaw](#openclaw)
  - [Hermes](#hermes)
  - [Gemini CLI](#gemini-cli)

## Anthropic-Compatible Tools

### Claude Code

Claude Code is Anthropic's official AI coding assistant that works with the command line.

#### Setup

1. **Install Claude Code**:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **Configure API Key**:
   ```bash
   export ANTHROPIC_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

   Or add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):
   ```bash
   echo 'export ANTHROPIC_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Set Custom Base URL**:
   ```bash
   export ANTHROPIC_BASE_URL="https://api.feimacode.com/v1"
   ```

4. **Verify Installation**:
   ```bash
   claude-code --version
   ```

5. **Run Claude Code**:
   ```bash
   claude-code
   ```

#### Usage

```bash
# Start Claude Code
claude-code

# Ask Claude to explain code
claude-code "Explain this function"

# Ask Claude to refactor code
claude-code "Refactor this function to be more efficient"

# Ask Claude to write tests
claude-code "Write unit tests for this module"
```

#### Configuration File

Create `~/.claude-code/config.json`:

```json
{
  "apiKey": "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "baseUrl": "https://api.feimacode.com/v1",
  "model": "glm-5"
}
```

#### Troubleshooting

- **"Invalid API Key"**: Verify your API key is correct and not expired
- **"Connection Refused"**: Check your internet connection and base URL
- **"Rate Limited"**: Wait a few seconds and try again

---

### CC Switch (Claude)

CC Switch is a universal provider that allows you to use multiple AI tools with a single interface.

#### Setup

1. **Install CC Switch**:
   ```bash
   npm install -g @cc-switch/cli
   ```

2. **Configure Feima Provider**:
   ```bash
   cc-switch config set provider claude
   cc-switch config set api-key "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   cc-switch config set base-url "https://api.feimacode.com/v1"
   ```

3. **Verify Configuration**:
   ```bash
   cc-switch config get
   ```

#### Usage

```bash
# Use Claude through CC Switch
cc-switch "Write a Python function to sort a list"

# Switch to OpenAI provider
cc-switch config set provider openai

# Use OpenAI through CC Switch
cc-switch "Write a JavaScript function to sort an array"
```

#### Configuration File

Create `~/.cc-switch/config.json`:

```json
{
  "claude": {
    "apiKey": "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "baseUrl": "https://api.feimacode.com/v1",
    "model": "glm-5"
  },
  "openai": {
    "apiKey": "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "baseUrl": "https://api.feimacode.com/v1",
    "model": "glm-5"
  }
}
```

---

## OpenAI-Compatible Tools

### Codex CLI

Codex CLI is an OpenAI-compatible command-line tool for AI coding assistance.

#### Setup

1. **Install Codex CLI**:
   ```bash
   npm install -g @openai/codex-cli
   ```

2. **Configure API Key**:
   ```bash
   export OPENAI_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   export OPENAI_BASE_URL="https://api.feimacode.com/v1"
   ```

   Or add to your shell profile:
   ```bash
   echo 'export OPENAI_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"' >> ~/.bashrc
   echo 'export OPENAI_BASE_URL="https://api.feimacode.com/v1"' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Verify Installation**:
   ```bash
   codex --version
   ```

4. **Run Codex**:
   ```bash
   codex "Write a function to calculate factorial in Python"
   ```

#### Usage

```bash
# Generate code
codex "Write a REST API endpoint in Express.js"

# Explain code
codex --explain "path/to/file.js"

# Refactor code
codex --refactor "path/to/file.js"

# Write tests
codex --test "path/to/file.js"
```

#### Configuration File

Create `~/.codex/config.json`:

```json
{
  "apiKey": "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "baseUrl": "https://api.feimacode.com/v1",
  "model": "glm-5",
  "temperature": 0.7
}
```

---

### CC Switch (OpenAI)

Use CC Switch with OpenAI compatibility mode.

#### Setup

1. **Install CC Switch** (if not already installed):
   ```bash
   npm install -g @cc-switch/cli
   ```

2. **Configure OpenAI Provider**:
   ```bash
   cc-switch config set provider openai
   cc-switch config set api-key "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   cc-switch config set base-url "https://api.feimacode.com/v1"
   ```

#### Usage

```bash
# Use OpenAI through CC Switch
cc-switch "Write a Python script to scrape a website"

# Switch back to Claude
cc-switch config set provider claude
cc-switch "Write a Python script to scrape a website"
```

---

### Copilot CLI

Copilot CLI is GitHub Copilot's command-line interface.

#### Setup

1. **Install Copilot CLI**:
   ```bash
   npm install -g @github/copilot-cli
   ```

2. **Authenticate**:
   ```bash
   copilot login
   ```

3. **Configure Custom Endpoint**:
   ```bash
   copilot config set endpoint https://api.feimacode.com/v1
   copilot config set api-key "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

#### Usage

```bash
# Generate code
copilot suggest "Write a function to validate email addresses"

# Get code explanation
copilot explain "path/to/file.js"

# Get refactoring suggestions
copilot refactor "path/to/file.js"
```

---

### OpenCode

OpenCode is an OpenAI-compatible coding assistant.

#### Setup

1. **Install OpenCode**:
   ```bash
   npm install -g @opencode/cli
   ```

2. **Configure API Key**:
   ```bash
   export OPENCODE_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   export OPENCODE_BASE_URL="https://api.feimacode.com/v1"
   ```

3. **Verify Installation**:
   ```bash
   opencode --version
   ```

#### Usage

```bash
# Generate code
opencode "Create a React component for a todo list"

# Chat with OpenCode
opencode chat

# Get help with specific files
opencode help src/app.js
```

---

### OpenClaw

OpenClaw is an OpenAI-compatible AI coding tool.

#### Setup

1. **Install OpenClaw**:
   ```bash
   npm install -g @openclaw/cli
   ```

2. **Configure API Key**:
   ```bash
   export OPENCLAW_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   export OPENCLAW_BASE_URL="https://api.feimacode.com/v1"
   ```

3. **Verify Installation**:
   ```bash
   openclaw --version
   ```

#### Usage

```bash
# Generate code
openclaw "Write a Python script to process CSV files"

# Analyze code
openclaw analyze "path/to/file.py"

# Fix bugs
openclaw fix "path/to/file.py"
```

---

### Hermes

Hermes is an OpenAI-compatible AI coding assistant.

#### Setup

1. **Install Hermes**:
   ```bash
   npm install -g @hermes/cli
   ```

2. **Configure API Key**:
   ```bash
   export HERMES_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   export HERMES_BASE_URL="https://api.feimacode.com/v1"
   ```

3. **Verify Installation**:
   ```bash
   hermes --version
   ```

#### Usage

```bash
# Generate code
hermes "Write a Go function to parse JSON"

# Get code review
hermes review "path/to/file.go"

# Generate documentation
hermes docs "path/to/file.go"
```

---

### Gemini CLI

Gemini CLI is an OpenAI-compatible tool for using Google's Gemini models.

#### Setup

1. **Install Gemini CLI**:
   ```bash
   npm install -g @gemini/cli
   ```

2. **Configure API Key**:
   ```bash
   export GEMINI_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   export GEMINI_BASE_URL="https://api.feimacode.com/v1"
   ```

3. **Verify Installation**:
   ```bash
   gemini --version
   ```

#### Usage

```bash
# Generate code
gemini "Write a TypeScript function to debounce a function"

# Ask questions
gemini ask "What is the difference between let and const in JavaScript?"

# Get help with errors
gemini fix "path/to/file.ts"
```

---

## Common Configuration Patterns

### Environment Variables

Most tools support environment variables for configuration. Add these to your shell profile:

```bash
# Anthropic-compatible tools
export ANTHROPIC_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export ANTHROPIC_BASE_URL="https://api.feimacode.com/v1"

# OpenAI-compatible tools
export OPENAI_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export OPENAI_BASE_URL="https://api.feimacode.com/v1"

# Feima-specific (for tools that support it)
export FEIMA_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export FEIMA_BASE_URL="https://api.feimacode.com/v1"
```

### Configuration Files

Create a central configuration file that all tools can read:

```bash
# Create ~/.feima/config.json
mkdir -p ~/.feima
cat > ~/.feima/config.json << EOF
{
  "apiKey": "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "baseUrl": "https://api.feimacode.com/v1",
  "model": "glm-5",
  "temperature": 0.7
}
EOF
```

### Shell Aliases

Create convenient aliases for different tools:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias claude='claude-code'
alias codex='codex-cli'
alias cc='cc-switch'
```

## Troubleshooting

### Common Issues

#### "Invalid API Key"

- Verify the API key is copied correctly (no extra spaces)
- Check the key hasn't been revoked
- Ensure you're using the correct environment variable name

#### "Connection Refused"

- Check your internet connection
- Verify the base URL is correct: `https://api.feimacode.com/v1`
- Check if the API is operational at [status.feimacode.com](https://status.feimacode.com)

#### "Rate Limited"

- Wait a few seconds before retrying
- Implement exponential backoff in your scripts
- Consider upgrading to a higher tier for more quota

#### "Model Not Found"

- Verify the model ID is correct
- Check the [models endpoint](../reference/api-reference.md#models) for available models

### Debug Mode

Most tools support debug mode for troubleshooting:

```bash
# Enable debug mode
claude-code --debug "Write a function"
codex --debug "Write a function"
```

### Verbose Logging

Enable verbose logging to see detailed request/response information:

```bash
claude-code --verbose "Write a function"
codex -v "Write a function"
```

## Best Practices

### 1. Use Separate API Keys

Create separate API keys for different tools and environments:

- Development: Keys with short expiry (30 days)
- Production: Keys with longer expiry (90 days)
- Tool-specific: One key per tool for better tracking

### 2. Monitor Usage

Regularly check your API usage:

- Visit [feimacode.com/profile](https://feimacode.com/profile)
- Check response headers (`x-feima-quota-snapshot`)
- Use the VS Code extension status bar

### 3. Handle Errors Gracefully

Implement proper error handling in your scripts:

```bash
#!/bin/bash

# Example script with error handling
if ! claude-code "$PROMPT"; then
  echo "Error: Failed to generate code"
  exit 1
fi
```

### 4. Use Version Control

Commit configuration files (without API keys) to version control:

```json
{
  "baseUrl": "https://api.feimacode.com/v1",
  "model": "glm-5",
  "temperature": 0.7
  // Note: Never commit API keys!
}
```

Use environment variables for API keys:

```bash
export ANTHROPIC_API_KEY="$(cat ~/.feima/api-key.txt)"
```

## Next Steps

- [API Keys](./api-keys.md) - Getting started with API keys
- [API Reference](../reference/api-reference.md) - Complete API documentation
- [Code Examples](./api-code-examples.md) - Sample code in multiple languages

## Support

If you encounter issues with any tool:

- Check the tool's official documentation
- Visit our [FAQ](./faq.md)
- Contact support at support@feimacode.com