---
title: 配置参考
description: 飞码扣配置完整参考
---

飞码扣所有配置选项的完整参考。

## 设置架构

所有飞码扣设置在 VS Code 设置中以 `feima.` 为前缀。

---

## 认证设置

### `feima.auth.baseUrl`

OAuth2 认证服务器基础 URL。

**类型**: `string`
**默认值**: `"https://auth.feimacode.cn"`
**作用域**: machine-overridable

**说明**:
- 用于 OAuth2 认证流程
- 默认值适用于中国区
- 仅在调试或使用自定义认证服务器时修改

**有效值**:
- `"https://auth.feimacode.cn"` - 中国区生产环境
- `"http://localhost:8000"` - 本地开发环境

**示例**:
```json
{
  "feima.auth.baseUrl": "https://auth.feimacode.cn"
}
```

---

### `feima.auth.clientId`

OAuth2 客户端 ID。

**类型**: `string`
**默认值**: `"vscode-feima-client"`
**作用域**: machine-overridable

**说明**:
- OAuth2 客户端标识符
- 用于认证请求
- 默认值适用于标准飞码扣客户端

**示例**:
```json
{
  "feima.auth.clientId": "vscode-feima-client"
}
```

---

### `feima.auth.issuer`

OAuth2 发行者 URL。

**类型**: `string`
**默认值**: `"https://auth.feimacode.cn"`
**作用域**: machine-overridable

**说明**:
- JWT token 发行者验证
- 必须与认证服务器 URL 一致
- 用于 token 验证

**示例**:
```json
{
  "feima.auth.issuer": "https://auth.feimacode.cn"
}
```

---

## API 设置

### `feima.api.baseUrl`

模型推理 API 服务器基础 URL。

**类型**: `string`
**默认值**: `"https://api.feimacode.cn/v1"`
**作用域**: machine-overridable

**说明**:
- 用于所有 AI 模型请求
- 默认值适用于中国区
- 仅在调试或使用自定义 API 服务器时修改

**有效值**:
- `"https://api.feimacode.cn/v1"` - 中国区生产环境
- `"http://localhost:8001/v1"` - 本地开发环境

**示例**:
```json
{
  "feima.api.baseUrl": "https://api.feimacode.cn/v1"
}
```

---

## UI 设置

### `feima.showQuotaInStatusBar`

在状态栏显示剩余请求配额。

**类型**: `boolean`
**默认值**: `true`
**作用域**: window

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

额度不足警告阈值。

**类型**: `number`
**默认值**: `50`
**作用域**: window

**说明**:
- 当剩余请求次数低于此阈值时，显示警告通知
- 默认值为 50 次
- 可根据使用频率调整

**有效范围**: `0` - `10000`

**示例**:
```json
{
  "feima.warnWhenQuotaLow": 100
}
```

---

## 促销设置

### `feima.promotionUrl`

额度促销页面 URL。

**类型**: `string`
**默认值**: `"https://feimacode.cn/promotion"`
**作用域**: machine-overridable

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

## 设置作用域

| 作用域 | 说明 | 存储位置 |
|--------|------|----------|
| **machine-overridable** | 可在机器级别覆盖 | 用户设置或工作区设置 |
| **window** | 窗口级别 | 工作区设置 |
| **application** | 应用级别 | 用户设置 |

---

## 设置优先级

当同一设置在不同位置定义时，优先级如下：

1. **工作区设置** (`.vscode/settings.json`) - 最高优先级
2. **用户设置** (全局 settings.json)
3. **默认值** - 最低优先级

---

## 完整配置示例

### 生产环境配置

```json
{
  "feima.auth.baseUrl": "https://auth.feimacode.cn",
  "feima.api.baseUrl": "https://api.feimacode.cn/v1",
  "feima.auth.clientId": "vscode-feima-client",
  "feima.auth.issuer": "https://auth.feimacode.cn",
  "feima.promotionUrl": "https://feimacode.cn/promotion",
  "feima.showQuotaInStatusBar": true,
  "feima.warnWhenQuotaLow": 50
}
```

### 开发环境配置

```json
{
  "feima.auth.baseUrl": "http://localhost:8000",
  "feima.api.baseUrl": "http://localhost:8001/v1",
  "feima.auth.clientId": "dev-client",
  "feima.auth.issuer": "http://localhost:8000",
  "feima.showQuotaInStatusBar": true
}
```

---

## 配置文件位置

### 用户设置

**Windows**: `%APPDATA%\Code\User\settings.json`

**macOS**: `~/Library/Application Support/Code/User/settings.json`

**Linux**: `~/.config/Code/User/settings.json`

### 工作区设置

项目根目录: `.vscode/settings.json`

---

## 命令参考

| 命令 | 说明 |
|------|------|
| `飞码: 登录` | 登录飞码账号 |
| `飞码: 注销` | 注销当前会话 |
| `飞码: 查看账号` | 显示账号信息和剩余额度 |

---

## 下一步

- [配置指南](../guides/configuration.md) - 配置使用说明
- [快速入门](../guides/quickstart.md) - 开始使用
- [使用模型](../guides/using-models.md) - 了解可用模型

## 需要帮助？

- 🐛 [报告问题](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [讨论区](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [邮件支持](mailto:support@feimacode.cn)

**Type**: `number`
**Default**: `30000`
**Scope**: Window
**Minimum**: `1000`
**Maximum**: `300000`

**Description**: Maximum time to wait for an API response. Increase if experiencing timeouts on slow connections.

**Example**:
```json
{
  "feima.requestTimeout": 60000
}
```

---

### `feima.maxRetries`

Maximum number of retry attempts.

**Type**: `number`
**Default**: `3`
**Scope**: Window
**Minimum**: `0`
**Maximum**: `10`

**Description**: Number of times to retry failed requests before giving up.

**Example**:
```json
{
  "feima.maxRetries": 5
}
```

---

### `feima.retryDelay`

Delay between retries in milliseconds.

**Type**: `number`
**Default**: `1000`
**Scope**: Window
**Minimum**: `100`
**Maximum**: `10000`

**Description**: How long to wait between retry attempts.

**Example**:
```json
{
  "feima.retryDelay": 2000
}
```

---

### `feima.enableStreaming`

Enable streaming responses.

**Type**: `boolean`
**Default**: `true`
**Scope**: Window

**Description**: When enabled, streams responses as they're generated. Provides better UX but may use more resources.

**Example**:
```json
{
  "feima.enableStreaming": false
}
```

---

### `feima.modelAliases`

Custom aliases for models.

**Type**: `object`
**Default**: `{}`
**Scope**: Window

**Description**: Define custom aliases for frequently used models.

**Example**:
```json
{
  "feima.modelAliases": {
    "code": "deepseek-coder-v2",
    "review": "claude-3.5-sonnet",
    "chinese": "tongyi-qianwen-3-coder",
    "arch": "gpt-4o"
  }
}
```

---

## Workspace Settings

### `feima.workspaceModel`

Model override for current workspace.

**Type**: `string | null`
**Default**: `null`
**Scope**: Workspace

**Description**: Override the default model for this specific workspace. Takes precedence over `feima.defaultModel`.

**Example**:
```json
{
  "feima.workspaceModel": "claude-3.5-sonnet"
}
```

---

### `feima.workspaceContext`

Workspace-specific context hints.

**Type**: `string[]`
**Default**: `[]`
**Scope**: Workspace

**Description**: Additional context to include when generating responses in this workspace.

**Example**:
```json
{
  "feima.workspaceContext": [
    "This is a TypeScript project using React",
    "Follow ESLint rules in .eslintrc.json"
  ]
}
```

---

## Advanced Settings

### `feima.apiEndpoint`

Custom API endpoint.

**Type**: `string | null`
**Default**: `null`
**Scope**: Application

**Description**: Override the default Feima API endpoint. Only use if instructed by support.

**Example**:
```json
{
  "feima.apiEndpoint": "https://api.feimacode.cn"
}
```

---

### `feima.authEndpoint`

Custom authentication endpoint.

**Type**: `string | null`
**Default**: `null`
**Scope**: Application

**Description**: Override the default Feima IDP endpoint. Only use if instructed by support.

**Example**:
```json
{
  "feima.authEndpoint": "https://idp.feimacode.cn"
}
```

---

### `feima.proxyUrl`

Proxy URL for API requests.

**Type**: `string | null`
**Default**: `null`
**Scope**: Application

**Description**: HTTP proxy URL for API requests.

**Example**:
```json
{
  "feima.proxyUrl": "http://proxy.example.com:8080"
}
```

---

## Security Settings

### `feima.tokenEncryption`

Enable token encryption.

**Type**: `boolean`
**Default**: `true`
**Scope**: Application

**Description**: Encrypt stored tokens. Do not disable unless required for debugging.

**Example**:
```json
{
  "feima.tokenEncryption": false
}
```

---

### `feima.storeHistory`

Store conversation history.

**Type**: `boolean`
**Default**: `true`
**Scope**: Application

**Description**: Store conversation history locally for context. Disable to save disk space.

**Example**:
```json
{
  "feima.storeHistory": false
}
```

---

### `feima.maxHistorySize`

Maximum history entries.

**Type**: `number`
**Default**: `100`
**Scope**: Application
**Minimum**: `0`
**Maximum**: `1000`

**Description**: Maximum number of conversation history entries to store.

**Example**:
```json
{
  "feima.maxHistorySize": 50
}
```

---

## UI Settings

### `feima.theme`

Extension theme.

**Type**: `string`
**Default**: `"auto"`
**Scope**: Window

**Valid Values**:
- `"auto"` - Match VS Code theme
- `"light"` - Force light theme
- `"dark"` - Force dark theme

**Example**:
```json
{
  "feima.theme": "auto"
}
```

---

### `feima.compactMode`

Use compact UI mode.

**Type**: `boolean`
**Default**: `false`
**Scope**: Window

**Description**: Enable compact mode for the UI elements.

**Example**:
```json
{
  "feima.compactMode": true
}
```

---

## Feature Flags

### `feima.experimentalFeatures`

Enable experimental features.

**Type**: `boolean`
**Default**: `false`
**Scope**: Application

**Description**: Enable experimental features that are still in development.

**Example**:
```json
{
  "feima.experimentalFeatures": true
}
```

---

### `feima.betaModels`

Show beta/unstable models.

**Type**: `boolean`
**Default**: `false`
**Scope**: Window

**Description**: Include beta and experimental models in the model list.

**Example**:
```json
{
  "feima.betaModels": true
}
```

---

## Settings Hierarchy

Settings are applied in this order (higher priority overrides lower):

1. **Workspace settings** (`.vscode/settings.json`)
2. **User settings** (`settings.json`)
3. **Default values**

## Configuration Files

### `settings.json`

Main configuration file. Location:
- **Windows**: `%APPDATA%\Code\User\settings.json`
- **macOS**: `~/Library/Application Support/Code/User/settings.json`
- **Linux**: `~/.config/Code/User/settings.json`

### `.vscode/settings.json`

Workspace-specific configuration. Create in your project root.

### `.vscode/settings.local.json`

Local workspace configuration. Gitignored by default.

## Validation

Settings are validated on change. Invalid settings are logged to the Output panel.

## Migration

### From Previous Versions

Settings are automatically migrated between versions. Manual migration is not required.

### Default Reset

To reset all settings to defaults:

```json
// Remove all feima.* entries from settings.json
// Or use the command: "Feima: Reset Settings"
```

## Next Steps

- [Configuration Guide](../guides/configuration.md) - How to configure
- [Development Setup](../dev/setup.md) - Develop for Feima Copilot
- [API Reference](./api.md) - Extension API

## Need Help?

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.cn)