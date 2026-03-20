---
title: Configuration
description: Customize Feima Copilot settings and preferences
---

# Configuration Guide

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
**Default**: `"deepseek-coder-v2"`

The default model to use when starting a new conversation.

**Options**:
- `"deepseek-coder-v2"` - DeepSeek Coder V2
- `"tongyi-qianwen-3-coder"` - Tongyi Qianwen 3 Coder
- `"tencent-hunyuan"` - Tencent Hunyuan
- `"gpt-4o"` - GPT-4o
- `"claude-3.5-sonnet"` - Claude 3.5 Sonnet
- `"gemini-1.5-pro"` - Gemini 1.5 Pro

**Example**:
```json
{
  "feima.defaultModel": "gpt-4o"
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
  "feima.defaultModel": "deepseek-coder-v2",
  "feima.enableDebugLogging": true
}
```

## Common Configuration Scenarios

### For Development

```json
{
  "feima.defaultModel": "claude-3.5-sonnet",
  "feima.enableDebugLogging": true,
  "feima.showStatusBar": true
}
```

### For Writing Documentation

```json
{
  "feima.defaultModel": "tongyi-qianwen-3-coder"
}
```

### For Code Review

```json
{
  "feima.defaultModel": "gpt-4o",
  "feima.maxRetries": 2
}
```

### For Large Codebases

```json
{
  "feima.defaultModel": "gemini-1.5-pro",
  "feima.requestTimeout": 60000
}
```

## Configuration Presets

Create multiple configuration files for different workflows:

### `.vscode/settings.json` (Production)
```json
{
  "feima.defaultModel": "deepseek-coder-v2",
  "feima.showStatusBar": true
}
```

### `.vscode/settings.local.json` (Development)
```json
{
  "feima.defaultModel": "gpt-4o",
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
    "code": "deepseek-coder-v2",
    "review": "claude-3.5-sonnet",
    "chinese": "tongyi-qianwen-3-coder"
  }
}
```

### Workspace-Specific Models

Configure different models for different file types (planned feature):

```json
{
  "feima.modelsByFiletype": {
    "typescript": "claude-3.5-sonnet",
    "python": "gpt-4o",
    "markdown": "tongyi-qianwen-3-coder"
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

- [Quick Start](./quickstart.md) - Get started with Feima Copilot
- [Using Models](./using-models.md) - Learn about available models
- [Reference - Configuration](../reference/config.md) - Complete configuration reference

## Need Help?

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.cn)