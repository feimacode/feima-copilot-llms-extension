---
title: Configuration
description: Customize Feima Copilot settings and preferences
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "Configuration Guide for Feima Copilot",
        "description": "Learn how to customize Feima Copilot settings and preferences",
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

Feima Copilot offers various configuration options to customize your experience.

## Settings Location

Feima Copilot settings are managed through VS Code's standard settings system.

### Accessing Settings

1. Press `Ctrl+,` (or `Cmd+,` on Mac)
2. Search for "Feima"
3. All Feima Copilot settings are prefixed with `feima.`

Or use the command palette:
1. Press `Ctrl+Shift+P`
2. Type "Preferences: Open Settings (JSON)"

## Available Settings

### `feima.defaultModel`

**Type**: `string`
**Default**: `"qwen3.6-flash"`

The default model to use when starting a new conversation.

**Options**:
- `"qwen3.6-flash"` - Qwen3.6 Flash (free tier, chat default, thinking-capable)
- `"qwen3.7-max"` - Qwen3.7 Max (~1M context, deep thinking)
- `"qwen3.8-max"` - Qwen3.8 Max (~1M context, 983K deep thinking, Pro tier)
- `"qwen3-coder-plus"` - Qwen3 Coder Plus (1M context)
- `"qwen3.6-plus"` - Qwen3.6 Plus (vision + thinking, 1M context)
- `"qwen3.7-plus"` - Qwen3.7 Plus (~1M context, vision + deep thinking)
- `"deepseek-v3.2"` - DeepSeek V3.2 (deep thinking)
- `"glm-5"` - GLM-5 (Zhipu, thinking capable)
- `"glm-4.7"` - GLM-4.7 (Zhipu, long output)
- `"glm-5.1"` - GLM 5.1 (202K context)
- `"glm-5.2"` - GLM 5.2 (1M context)
- `"minimax-m2.5"` - MiniMax M2.5
- `"kimi-k2.6"` - Kimi K2.6 (256K context + vision)
- `"kimi-k2.7-code"` - Kimi K2.7 Code (256K context, code-specialized)
- `"kimi-k3"` - Kimi K3 (1M context, vision, deep thinking, premium)
- `"hy3"` - HY3 (256K context, thinking support, free tier)

**Example**:
```json
{
  "feima.defaultModel": "qwen3.7-max"
}
```

### `feima.showStatusBar`

**Type**: `boolean`
**Default**: `true`

Whether to show the Feima status bar item displaying your account and remaining requests.

**Example**:
```json
{
  "feima.showStatusBar": false
}
```

### `feima.autoRefreshToken`

**Type**: `boolean`
**Default**: `true`

Whether to automatically refresh your access token when it expires.

**Example**:
```json
{
  "feima.autoRefreshToken": false
}
```

### `feima.enableDebugLogging`

**Type**: `boolean`
**Default**: `false`

Enable detailed debug logging in the Output panel.

**Example**:
```json
{
  "feima.enableDebugLogging": true
}
```

### `feima.requestTimeout`

**Type**: `number`
**Default**: `30000`

Request timeout in milliseconds. Increase if you're experiencing timeouts.

**Example**:
```json
{
  "feima.requestTimeout": 60000
}
```

### `feima.maxRetries`

**Type**: `number`
**Default**: `3`

Maximum number of retry attempts for failed requests.

**Example**:
```json
{
  "feima.maxRetries": 5
}
```

## Workspace vs User Settings

### User Settings (Global)

Apply to all VS Code workspaces. Stored in your global settings file.

**Location**:
- Windows: `%APPDATA%\Code\User\settings.json`
- macOS: `~/Library/Application Support/Code/User/settings.json`
- Linux: `~/.config/Code/User/settings.json`

### Workspace Settings

Apply only to the current workspace. Stored in `.vscode/settings.json` in your project root.

**Example**:
```json
{
  "feima.defaultModel": "qwen3.6-flash",
  "feima.enableDebugLogging": true
}
```

## Common Configuration Scenarios

### For Development

```json
{
  "feima.defaultModel": "qwen3.7-max",
  "feima.enableDebugLogging": true,
  "feima.showStatusBar": true
}
```

### For Writing Documentation

```json
{
  "feima.defaultModel": "glm-4.7"
}
```

### For Code Review

```json
{
  "feima.defaultModel": "deepseek-v3.2",
  "feima.maxRetries": 2
}
```

### For Large Codebases

```json
{
  "feima.defaultModel": "qwen3-coder-plus",
  "feima.requestTimeout": 60000
}
```

## Configuration Presets

Create multiple configuration files for different workflows:

### `.vscode/settings.json` (Production)
```json
{
  "feima.defaultModel": "qwen3.6-flash",
  "feima.showStatusBar": true
}
```

### `.vscode/settings.local.json` (Development)
```json
{
  "feima.defaultModel": "qwen3.7-max",
  "feima.enableDebugLogging": true
}
```

**Note**: Settings files ending in `.local.json` are gitignored by default.

## Command Line Configuration

You can also configure Feima Copilot via command palette commands:

### `Feima: Select Default Model`

1. Press `Ctrl+Shift+P`
2. Type "Feima: Select Default Model"
3. Choose from the available models

### `Feima: Toggle Status Bar`

1. Press `Ctrl+Shift+P`
2. Type "Feima: Toggle Status Bar"
3. Status bar visibility will be toggled

### `Feima: Toggle Debug Logging`

1. Press `Ctrl+Shift+P`
2. Type "Feima: Toggle Debug Logging"
3. Debug logging will be toggled

## Troubleshooting Settings

### Settings Not Applied

1. Check for syntax errors in `settings.json`
2. Verify setting names are correct (case-sensitive)
3. Check VS Code Output for errors
4. Try restarting VS Code

### Conflicting Settings

If workspace and user settings conflict:
- Workspace settings take precedence
- Check both locations for the setting

### Reset to Defaults

To reset all Feima settings:
1. Open Settings (JSON)
2. Remove all `feima.*` entries
3. Reload VS Code window (`Ctrl+Shift+P` → "Developer: Reload Window")

## Advanced Configuration

### Custom Model Aliases

Define custom aliases for frequently used models (planned feature):

```json
{
  "feima.modelAliases": {
    "code": "qwen3-coder-plus",
    "review": "qwen3.7-max",
    "docs": "glm-4.7"
  }
}
```

### Workspace-Specific Models

Configure different models for different file types (planned feature):

```json
{
  "feima.modelsByFiletype": {
    "typescript": "qwen3-coder-plus",
    "python": "deepseek-v3.2",
    "markdown": "glm-4.7"
  }
}
```

## Sharing Configuration

To share your Feima configuration with your team:

1. Commit `.vscode/settings.json` to your repository
2. Document any important settings in your README
3. Use workspace settings for project-specific configuration

**Note**: Never commit `.vscode/settings.local.json` or files containing sensitive information.

## Next Steps

- [Quick Start](/guides/quickstart) - Get started with Feima Copilot
- [Using Models](/guides/using-models) - Learn about available models
- [Reference - Configuration](/reference/config) - Complete configuration reference

## Need Help?

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.com)