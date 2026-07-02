---
title: 工具指南
description: 使用支持的 AI 编程工具配置 Feima API 的设置说明
---

# 工具指南

Feima API 密钥可与多种 AI 编程工具配合使用。本页面提供每个支持工具的设置说明。

## 目录

- [Anthropic 兼容工具](#anthropic-兼容工具)
  - [Claude Code](#claude-code)
  - [CC Switch (Claude)](#cc-switch-claude)
- [OpenAI 兼容工具](#openai-兼容工具)
  - [Codex CLI](#codex-cli)
  - [CC Switch (OpenAI)](#cc-switch-openai)
  - [Copilot CLI](#copilot-cli)
  - [OpenCode](#opencode)
  - [OpenClaw](#openclaw)
  - [Hermes](#hermes)
  - [Gemini CLI](#gemini-cli)

## Anthropic 兼容工具

### Claude Code

Claude Code 是 Anthropic 官方的 AI 编程助手，可与命令行配合使用。

#### 设置

1. **安装 Claude Code**：
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```

2. **配置 API 密钥**：
   ```bash
   export ANTHROPIC_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

   或添加到您的 shell 配置文件（`~/.bashrc`、`~/.zshrc` 等）：
   ```bash
   echo 'export ANTHROPIC_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **设置自定义基础 URL**：
   ```bash
   export ANTHROPIC_BASE_URL="https://api.feimacode.com/v1"
   ```

4. **验证安装**：
   ```bash
   claude-code --version
   ```

5. **运行 Claude Code**：
   ```bash
   claude-code
   ```

#### 使用

```bash
# 启动 Claude Code
claude-code

# 要求 Claude 解释代码
claude-code "解释这个函数"

# 要求 Claude 重构代码
claude-code "重构这个函数以提高效率"

# 要求 Claude 编写测试
claude-code "为这个模块编写单元测试"
```

#### 配置文件

创建 `~/.claude-code/config.json`：

```json
{
  "apiKey": "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "baseUrl": "https://api.feimacode.com/v1",
  "model": "glm-5"
}
```

#### 故障排除

- **"无效的 API 密钥"**：验证您的 API 密钥正确且未过期
- **"连接被拒绝"**：检查您的互联网连接和基础 URL
- **"速率限制"**：等待几秒钟后重试

---

### CC Switch (Claude)

CC Switch 是一个通用提供商，允许您通过单一界面使用多种 AI 工具。

#### 设置

1. **安装 CC Switch**：
   ```bash
   npm install -g @cc-switch/cli
   ```

2. **配置 Feima 提供商**：
   ```bash
   cc-switch config set provider claude
   cc-switch config set api-key "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   cc-switch config set base-url "https://api.feimacode.com/v1"
   ```

3. **验证配置**：
   ```bash
   cc-switch config get
   ```

#### 使用

```bash
# 通过 CC Switch 使用 Claude
cc-switch "编写一个 Python 函数来排序列表"

# 切换到 OpenAI 提供商
cc-switch config set provider openai

# 通过 CC Switch 使用 OpenAI
cc-switch "编写一个 JavaScript 函数来排序数组"
```

#### 配置文件

创建 `~/.cc-switch/config.json`：

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

## OpenAI 兼容工具

### Codex CLI

Codex CLI 是一个 OpenAI 兼容的命令行工具，用于 AI 编程辅助。

#### 设置

1. **安装 Codex CLI**：
   ```bash
   npm install -g @openai/codex-cli
   ```

2. **配置 API 密钥**：
   ```bash
   export OPENAI_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   export OPENAI_BASE_URL="https://api.feimacode.com/v1"
   ```

   或添加到您的 shell 配置文件：
   ```bash
   echo 'export OPENAI_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"' >> ~/.bashrc
   echo 'export OPENAI_BASE_URL="https://api.feimacode.com/v1"' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **验证安装**：
   ```bash
   codex --version
   ```

4. **运行 Codex**：
   ```bash
   codex "编写一个 Python 函数来计算阶乘"
   ```

#### 使用

```bash
# 生成代码
codex "在 Express.js 中编写 REST API 端点"

# 解释代码
codex --explain "path/to/file.js"

# 重构代码
codex --refactor "path/to/file.js"

# 编写测试
codex --test "path/to/file.js"
```

#### 配置文件

创建 `~/.codex/config.json`：

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

使用 CC Switch 的 OpenAI 兼容模式。

#### 设置

1. **安装 CC Switch**（如果尚未安装）：
   ```bash
   npm install -g @cc-switch/cli
   ```

2. **配置 OpenAI 提供商**：
   ```bash
   cc-switch config set provider openai
   cc-switch config set api-key "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   cc-switch config set base-url "https://api.feimacode.com/v1"
   ```

#### 使用

```bash
# 通过 CC Switch 使用 OpenAI
cc-switch "编写一个 Python 脚本来抓取网站"

# 切换回 Claude
cc-switch config set provider claude
cc-switch "编写一个 Python 脚本来抓取网站"
```

---

### Copilot CLI

Copilot CLI 是 GitHub Copilot 的命令行界面。

#### 设置

1. **安装 Copilot CLI**：
   ```bash
   npm install -g @github/copilot-cli
   ```

2. **身份验证**：
   ```bash
   copilot login
   ```

3. **配置自定义端点**：
   ```bash
   copilot config set endpoint https://api.feimacode.com/v1
   copilot config set api-key "feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```

#### 使用

```bash
# 生成代码
copilot suggest "编写一个函数来验证电子邮件地址"

# 获取代码解释
copilot explain "path/to/file.js"

# 获取重构建议
copilot refactor "path/to/file.js"
```

---

### OpenCode

OpenCode 是一个 OpenAI 兼容的编程助手。

#### 设置

1. **安装 OpenCode**：
   ```bash
   npm install -g @opencode/cli
   ```

2. **配置 API 密钥**：
   ```bash
   export OPENCODE_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   export OPENCODE_BASE_URL="https://api.feimacode.com/v1"
   ```

3. **验证安装**：
   ```bash
   opencode --version
   ```

#### 使用

```bash
# 生成代码
opencode "创建一个待办事项列表的 React 组件"

# 与 OpenCode 聊天
opencode chat

# 获取特定文件的帮助
opencode help src/app.js
```

---

### OpenClaw

OpenClaw 是一个 OpenAI 兼容的 AI 编程工具。

#### 设置

1. **安装 OpenClaw**：
   ```bash
   npm install -g @openclaw/cli
   ```

2. **配置 API 密钥**：
   ```bash
   export OPENCLAW_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   export OPENCLAW_BASE_URL="https://api.feimacode.com/v1"
   ```

3. **验证安装**：
   ```bash
   openclaw --version
   ```

#### 使用

```bash
# 生成代码
openclaw "编写一个 Python 脚本来处理 CSV 文件"

# 分析代码
openclaw analyze "path/to/file.py"

# 修复错误
openclaw fix "path/to/file.py"
```

---

### Hermes

Hermes 是一个 OpenAI 兼容的 AI 编程助手。

#### 设置

1. **安装 Hermes**：
   ```bash
   npm install -g @hermes/cli
   ```

2. **配置 API 密钥**：
   ```bash
   export HERMES_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   export HERMES_BASE_URL="https://api.feimacode.com/v1"
   ```

3. **验证安装**：
   ```bash
   hermes --version
   ```

#### 使用

```bash
# 生成代码
hermes "编写一个 Go 函数来解析 JSON"

# 获取代码审查
hermes review "path/to/file.go"

# 生成文档
hermes docs "path/to/file.go"
```

---

### Gemini CLI

Gemini CLI 是一个 OpenAI 兼容的工具，用于使用 Google 的 Gemini 模型。

#### 设置

1. **安装 Gemini CLI**：
   ```bash
   npm install -g @gemini/cli
   ```

2. **配置 API 密钥**：
   ```bash
   export GEMINI_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   export GEMINI_BASE_URL="https://api.feimacode.com/v1"
   ```

3. **验证安装**：
   ```bash
   gemini --version
   ```

#### 使用

```bash
# 生成代码
gemini "编写一个 TypeScript 函数来防抖函数"

# 提问
gemini ask "JavaScript 中 let 和 const 有什么区别？"

# 获取错误帮助
gemini fix "path/to/file.ts"
```

---

## 通用配置模式

### 环境变量

大多数工具支持通过环境变量进行配置。将这些添加到您的 shell 配置文件中：

```bash
# Anthropic 兼容工具
export ANTHROPIC_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export ANTHROPIC_BASE_URL="https://api.feimacode.com/v1"

# OpenAI 兼容工具
export OPENAI_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export OPENAI_BASE_URL="https://api.feimacode.com/v1"

# Feima 特定（对于支持它的工具）
export FEIMA_API_KEY="feima_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export FEIMA_BASE_URL="https://api.feimacode.com/v1"
```

### 配置文件

创建一个所有工具都可以读取的中央配置文件：

```bash
# 创建 ~/.feima/config.json
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

### Shell 别名

为不同工具创建方便的别名：

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
alias claude='claude-code'
alias codex='codex-cli'
alias cc='cc-switch'
```

## 故障排除

### 常见问题

#### "无效的 API 密钥"

- 验证 API 密钥复制正确（没有多余的空格）
- 检查密钥未被撤销
- 确保您使用的是正确的环境变量名称

#### "连接被拒绝"

- 检查您的互联网连接
- 验证基础 URL 正确：`https://api.feimacode.com/v1`
- 检查 API 是否在 [status.feimacode.com](https://status.feimacode.com) 运行

#### "速率限制"

- 等待几秒钟后重试
- 在脚本中实现指数退避
- 考虑升级到更高层级以获得更多配额

#### "未找到模型"

- 验证模型 ID 正确
- 检查 [models 端点](../reference/api-reference.md#models) 获取可用模型

### 调试模式

大多数工具支持调试模式以进行故障排除：

```bash
# 启用调试模式
claude-code --debug "编写一个函数"
codex --debug "编写一个函数"
```

### 详细日志记录

启用详细日志记录以查看详细的请求/响应信息：

```bash
claude-code --verbose "编写一个函数"
codex -v "编写一个函数"
```

## 最佳实践

### 1. 使用单独的 API 密钥

为不同的工具和环境创建单独的 API 密钥：

- 开发环境：具有短过期时间的密钥（30 天）
- 生产环境：具有较长过期时间的密钥（90 天）
- 工具特定：每个工具一个密钥，以便更好地跟踪

### 2. 监控使用情况

定期检查您的 API 使用情况：

- 访问 [feimacode.com/profile](https://feimacode.com/profile)
- 检查响应头（`x-feima-quota-snapshot`）
- 使用 VS Code 扩展状态栏

### 3. 优雅地处理错误

在脚本中实现适当的错误处理：

```bash
#!/bin/bash

# 带错误处理的示例脚本
if ! claude-code "$PROMPT"; then
  echo "错误：无法生成代码"
  exit 1
fi
```

### 4. 使用版本控制

将配置文件（不包含 API 密钥）提交到版本控制：

```json
{
  "baseUrl": "https://api.feimacode.com/v1",
  "model": "glm-5",
  "temperature": 0.7
  // 注意：永远不要提交 API 密钥！
}
```

使用环境变量设置 API 密钥：

```bash
export ANTHROPIC_API_KEY="$(cat ~/.feima/api-key.txt)"
```

## 下一步

- [API 密钥](./api-keys.md) - API 密钥入门
- [API 参考](../reference/api-reference.md) - 完整的 API 文档
- [代码示例](./api-code-examples.md) - 多种语言的示例代码

## 支持

如果您在任何工具中遇到问题：

- 检查工具的官方文档
- 访问我们的 [常见问题](./faq.md)
- 通过 support@feimacode.com 联系支持