---
title: 配置指南
description: 自定义飞码扣设置和偏好
---

飞码扣提供多种配置选项，让您自定义使用体验。

## 设置位置

飞码扣设置通过 VS Code 标准设置系统管理。

### 访问设置

1. 按 `Ctrl+,`（Mac 上按 `Cmd+,`）
2. 搜索 "飞码" 或 "Feima"
3. 所有飞码扣设置都以 `feima.` 为前缀

或使用命令面板：
1. 按 `Ctrl+Shift+P`（Mac 上按 `Cmd+Shift+P`）
2. 输入 "Preferences: Open Settings (JSON)"

---

## 可用设置

### `feima.auth.baseUrl`

**类型**: `string`
**默认值**: `"https://auth.feimacode.cn"`
**作用域**: machine-overridable（机器可覆盖）

OAuth2 认证服务器基础 URL。覆盖区域默认值。

**说明**:
- 用于 OAuth2 认证流程
- 默认值适用于中国区
- 仅在调试或使用自定义认证服务器时修改

**示例**:
```json
{
  "feima.auth.baseUrl": "https://auth.feimacode.cn"
}
```

---

### `feima.api.baseUrl`

**类型**: `string`
**默认值**: `"https://api.feimacode.cn/v1"`
**作用域**: machine-overridable（机器可覆盖）

模型推理 API 服务器基础 URL。覆盖区域默认值。

**说明**:
- 用于所有 AI 模型请求
- 默认值适用于中国区
- 仅在调试或使用自定义 API 服务器时修改

**示例**:
```json
{
  "feima.api.baseUrl": "https://api.feimacode.cn/v1"
}
```

---

### `feima.auth.clientId`

**类型**: `string`
**默认值**: `"vscode-feima-client"`
**作用域**: machine-overridable（机器可覆盖）

用于认证的 OAuth2 客户端 ID。覆盖区域默认值。

**说明**:
- OAuth2 客户端标识符
- 默认值适用于标准飞码扣客户端
- 仅在调试或使用自定义客户端时修改

**示例**:
```json
{
  "feima.auth.clientId": "vscode-feima-client"
}
```

---

### `feima.auth.issuer`

**类型**: `string`
**默认值**: `"https://auth.feimacode.cn"`
**作用域**: machine-overridable（机器可覆盖）

OAuth2 发行者 URL。覆盖区域默认值。

**说明**:
- JWT token 发行者验证
- 默认值适用于中国区
- 仅在调试或使用自定义认证服务器时修改

**示例**:
```json
{
  "feima.auth.issuer": "https://auth.feimacode.cn"
}
```

---

### `feima.promotionUrl`

**类型**: `string`
**默认值**: `"https://feimacode.cn/promotion"`
**作用域**: machine-overridable（机器可覆盖）

额度促销页面 URL。余额不足时显示。

**说明**:
- 当额度不足时，用户可访问此页面获取更多额度
- 默认值适用于中国区
- 仅在调试或使用自定义促销页面时修改

**示例**:
```json
{
  "feima.promotionUrl": "https://feimacode.cn/promotion"
}
```

---

### `feima.showQuotaInStatusBar`

**类型**: `boolean`
**默认值**: `true`
**作用域**: window（窗口）

在状态栏显示剩余请求配额。

**说明**:
- 启用时，状态栏显示剩余请求次数
- 禁用时，状态栏仅显示登录状态
- 建议保持启用以监控额度使用

**示例**:
```json
{
  "feima.showQuotaInStatusBar": true
}
```

---

### `feima.warnWhenQuotaLow`

**类型**: `number`
**默认值**: `50`
**作用域**: window（窗口）

当剩余请求少于此数量时显示警告。

**说明**:
- 当剩余请求次数低于此阈值时，显示警告通知
- 默认值为 50 次
- 可根据使用频率调整

**示例**:
```json
{
  "feima.warnWhenQuotaLow": 100
}
```

---

## 工作区设置 vs 用户设置

### 用户设置（全局）

应用于所有 VS Code 工作区。存储在全局设置文件中。

**位置**:
- Windows: `%APPDATA%\Code\User\settings.json`
- macOS: `~/Library/Application Support/Code/User/settings.json`
- Linux: `~/.config/Code/User/settings.json`

### 工作区设置

仅应用于当前工作区。存储在项目根目录的 `.vscode/settings.json` 中。

**示例**:
```json
{
  "feima.showQuotaInStatusBar": true,
  "feima.warnWhenQuotaLow": 30
}
```

---

## 常见配置场景

### 开发调试配置

```json
{
  "feima.auth.baseUrl": "http://localhost:8000",
  "feima.api.baseUrl": "http://localhost:8001/v1",
  "feima.showQuotaInStatusBar": true
}
```

### 生产环境配置

```json
{
  "feima.auth.baseUrl": "https://auth.feimacode.cn",
  "feima.api.baseUrl": "https://api.feimacode.cn/v1",
  "feima.showQuotaInStatusBar": true,
  "feima.warnWhenQuotaLow": 50
}
```

### 隐藏状态栏额度

```json
{
  "feima.showQuotaInStatusBar": false
}
```

### 高额度警告阈值

```json
{
  "feima.warnWhenQuotaLow": 200
}
```

---

## 配置预设

为不同工作流创建多个配置文件：

### `.vscode/settings.json`（生产）
```json
{
  "feima.showQuotaInStatusBar": true,
  "feima.warnWhenQuotaLow": 50
}
```

### `.vscode/settings.local.json`（开发）
```json
{
  "feima.auth.baseUrl": "http://localhost:8000",
  "feima.api.baseUrl": "http://localhost:8001/v1",
  "feima.showQuotaInStatusBar": true
}
```

**注意**: 以 `.local.json` 结尾的设置文件默认被 gitignore。

---

## 命令行配置

您也可以通过命令面板配置飞码扣：

### `飞码: 登录`

1. 按 `Ctrl+Shift+P`
2. 输入 "飞码: 登录"
3. 浏览器将打开认证页面

### `飞码: 注销`

1. 按 `Ctrl+Shift+P`
2. 输入 "飞码: 注销"
3. 当前会话将被注销

### `飞码: 查看账号`

1. 按 `Ctrl+Shift+P`
2. 输入 "飞码: 查看账号"
3. 显示当前账号信息和剩余额度

---

## 设置故障排除

### 设置未生效

1. 检查 `settings.json` 是否有语法错误
2. 验证设置名称是否正确（区分大小写）
3. 检查 VS Code 输出面板是否有错误消息
4. 尝试重新加载 VS Code 窗口

### 设置冲突

如果工作区设置和用户设置冲突：
- 工作区设置优先
- 检查两个位置的设置

### 重置为默认值

要重置所有飞码设置：
1. 打开设置（JSON）
2. 删除所有 `feima.*` 条目
3. 重新加载 VS Code 窗口（`Ctrl+Shift+P` → "Developer: Reload Window")

---

## 高级配置

### 自定义认证端点

仅在开发或调试时使用：

```json
{
  "feima.auth.baseUrl": "http://localhost:8000",
  "feima.auth.issuer": "http://localhost:8000",
  "feima.auth.clientId": "dev-client"
}
```

### 自定义 API 端点

仅在开发或调试时使用：

```json
{
  "feima.api.baseUrl": "http://localhost:8001/v1"
}
```

---

## 共享配置

与团队共享飞码配置：

1. 将 `.vscode/settings.json` 提交到仓库
2. 在 README 中记录重要设置
3. 使用工作区设置进行项目特定配置

**注意**: 不要提交 `.vscode/settings.local.json` 或包含敏感信息的文件。

---

## 下一步

- [快速入门](./quickstart.md) - 开始使用飞码扣
- [使用模型](./using-models.md) - 了解可用模型
- [配置参考](../reference/config.md) - 完整配置参考

## 需要帮助？

- 🐛 [报告问题](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [讨论区](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [邮件支持](mailto:support@feimacode.cn)
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