---
title: 工具模型配置
description: 配置 BYOK 场景下的工具模型，避免飞码扣使用报错
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "飞码扣工具模型配置指南",
        "description": "了解如何在 BYOK 场景下配置工具模型，避免使用飞码扣时出现错误",
        "author": {
          "@type": "Organization",
          "name": "Feimacode",
          "url": "https://feimacode.com"
        },
        "inLanguage": "zh-CN"
      }
---

当你使用飞码扣的模型（或任何 BYOK 模型）作为 GitHub Copilot 的主代理模型时，可能会遇到以下错误：

> No utility model is configured for 'copilot-utility-small' while the selected main agent model is BYOK.

这是因为 VS Code Copilot 在后台运行辅助任务时会使用**工具模型（Utility Model）**。这些任务不会使用你选择的主聊天模型，而是使用独立的内置模型。

## 什么是工具模型？

GitHub Copilot 在后台使用两种工具模型：

| 工具模型 | 用途 |
|----------|------|
| **工具模型** (`copilot-utility`) | 通用后台流程：聊天标题生成、会话摘要、工具调用编排、提示词渲染、搜索面板意图识别 |
| **小型工具模型** (`copilot-utility-small`) | 快速/低成本后台流程：提交信息生成、意图检测、内联聊天进度消息、终端修复生成、重命名建议、语义搜索、MCP 工具调用、后台待办代理、调试启动、工作区生成 |

当你使用 **Copilot 提供的模型**时，这些工具流程会自动使用 Copilot 的内置工具模型。但当你使用 **BYOK 模型**（如飞码扣的模型）时，Copilot 不知道应该用哪个模型来执行这些后台任务。

## 三个关键设置

### 1. `chat.byokUtilityModelDefault`（默认行为）

控制当没有显式设置工具模型时的默认行为。

| 值 | 行为 |
|----|------|
| `none`（默认） | 不使用默认工具模型 — **这是导致错误的原因** |
| `mainAgent` | 使用你选择的 BYOK 主代理模型执行所有工具任务 |
| `copilot` | 使用 GitHub Copilot 的默认工具模型（需要 Copilot 订阅） |

```json
{
  "chat.byokUtilityModelDefault": "mainAgent"
}
```

### 2. `chat.utilityModel`（显式覆盖）

覆盖用于通用工具流程的模型。设置此项可为标题生成、摘要、工具编排等任务指定特定模型。

格式：`vendor/model-id`（例如 `feima/deepseek-v4-flash`）

```json
{
  "chat.utilityModel": "feima/deepseek-v4-flash"
}
```

### 3. `chat.utilitySmallModel`（显式覆盖）

覆盖用于小型/快速工具流程的模型。建议使用快速且低成本的模型，因为这些调用在后台频繁发生。

格式：`vendor/model-id`（例如 `feima/deepseek-v4-flash`）

```json
{
  "chat.utilitySmallModel": "feima/deepseek-v4-flash"
}
```

## 解析顺序

当 Copilot 需要使用工具模型时，按以下顺序解析：

1. **显式覆盖** — `chat.utilityModel` / `chat.utilitySmallModel`（如果已设置）
2. **BYOK 默认值** — `chat.byokUtilityModelDefault`（如果主代理是 BYOK 模型）
3. **Copilot 内置** — 默认的 Copilot 工具模型（如果主代理是 Copilot 模型）

## 推荐配置

### 方案 A：用飞码模型处理所有任务（最简单）

设置 BYOK 默认值使用主代理模型：

```json
{
  "chat.byokUtilityModelDefault": "mainAgent"
}
```

这会让所有工具流程使用与聊天相同的模型。这是最简单的设置，适用于任何飞码模型。

**优点**：切换模型时无需额外配置。
**缺点**：大型模型执行工具任务可能较慢或更昂贵。

### 方案 B：用快速模型处理工具任务（经济实惠）

为工具流程显式设置快速、低成本的模型：

```json
{
  "chat.utilityModel": "feima/deepseek-v4-flash",
  "chat.utilitySmallModel": "feima/deepseek-v4-flash"
}
```

**优点**：后台任务快速且经济实惠。
**缺点**：更换模型提供商时需要更新设置。

### 方案 C：用 Copilot 处理工具任务（需要 Copilot 订阅）

```json
{
  "chat.byokUtilityModelDefault": "copilot"
}
```

**优点**：使用 Copilot 优化的工具模型。
**缺点**：需要有效的 GitHub Copilot 订阅。

## 推荐用于工具任务的飞码模型

对于工具流程，我们推荐快速、经济实惠的模型：

| 模型 | 最适合 | 原因 |
|------|--------|------|
| `feima/deepseek-v4-flash` | 所有工具任务 | 快速、免费额度、支持思维链 |
| `feima/qwen-coder-turbo` | 代码相关工具任务 | 代码优化、免费额度 |
| `feima/glm-4.7` | 通用工具任务 | 快速、支持长输出 |

## 故障排除

### 错误："No utility model is configured"

**原因**：`chat.byokUtilityModelDefault` 设置为 `none`（默认值），且没有配置 `chat.utilityModel` 或 `chat.utilitySmallModel`。

**修复**：设置上述三个设置中的任意一个。最简单的修复是：

```json
{
  "chat.byokUtilityModelDefault": "mainAgent"
}
```

### 工具任务响应慢

**原因**：使用了大型模型（如 `qwen3.7-max`）执行工具任务。

**修复**：将 `chat.utilitySmallModel` 设置为更快的模型：

```json
{
  "chat.utilitySmallModel": "feima/deepseek-v4-flash"
}
```

### 工具任务消耗过多额度

**原因**：使用昂贵的模型执行频繁的后台任务。

**修复**：使用免费额度模型执行工具任务：

```json
{
  "chat.utilityModel": "feima/deepseek-v4-flash",
  "chat.utilitySmallModel": "feima/deepseek-v4-flash"
}
```
