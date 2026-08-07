---
title: 欢迎使用飞码扣
description: 为 Copilot Chat 提供更多模型，原生驱动你自己的 Claude/Codex/Copilot CLI 订阅，还有本地 LLM 代理服务任意工具
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "飞码扣文档",
        "url": "https://docs.feimacode.com/zh",
        "description": "为 Copilot Chat 提供更多模型、原生 Claude/Codex/Copilot CLI 智能体订阅与本地 LLM 代理的 VS Code 扩展",
        "inLanguage": ["zh-CN", "en"]
      }
---

**为 Copilot Chat 提供更多模型，原生驱动你自己的智能体订阅，再加一个服务任意工具的本地代理**

飞码扣是一个围绕三件事打造的 VS Code 扩展：为 Copilot Chat 提供更多模型；提供原生的 `@claude`、`@codex`、`@copilot-cli` 智能体参与者，在你自己的 Claude Code/Codex/Copilot CLI 订阅上运行；以及一个本地 LLM 代理，让任意兼容 OpenAI 或 Anthropic 的工具都能运行在你的 Copilot 或 BYOK 模型之上。

## 什么是飞码扣？

**飞码扣 (Feima Copilot)** 是一个 VS Code 扩展，提供以下功能：

- 🇨🇳 **中国顶级 AI 模型**：直接访问通义千问 Qwen3、DeepSeek V3.2、智谱GLM-5、MiniMax M2.5、Kimi K2.5、Kimi K3、HY3 等国产大模型
- 💬 **无缝集成**：直接在 GitHub Copilot Chat 中使用，无需切换界面
- 💰 **按次计费**：只为使用的请求付费，无需月付订阅
- 🔒 **安全可靠**：OAuth2 认证，代码不离开 VS Code
- 🧠 **深度思考**：支持思维链推理，复杂问题迎刃而解
- 🤖 **智能体参与者**：通过 `@claude`、`@codex`、`@copilot-cli` 在 VS Code 聊天中直接驱动真正的 Claude Code、Codex 和 Copilot CLI 智能体
- 🔌 **本地 LLM 代理**：让任意兼容 OpenAI 或 Anthropic 的工具（甚至在 VS Code 之外）都能使用你的 Copilot 或 BYOK 模型

## 快速开始

<CardGrid stagger>
  <Card title="安装" icon="lucide:download">
    从 VS Code 应用商店安装扩展和 GitHub Copilot Chat
  </Card>
  <Card title="认证" icon="lucide:user">
    使用 OAuth2 登录您的飞码账号
  </Card>
  <Card title="选择模型" icon="lucide:bot">
    在 Copilot Chat 中选择您偏好的模型
  </Card>
  <Card title="开始编程" icon="lucide:code">
    提问、获取代码建议、提升您的效率
  </Card>
</CardGrid>

## 支持的模型

### 默认模型（免费）

| 模型 | 提供商 | 上下文 | 特点 |
|------|--------|--------|------|
| **Qwen3 Flash** | 阿里云 | 100万 | 超快响应，极低倍率（0.1x），公测期间免费 |

### 高级模型（Pro 会员）

| 模型 | 提供商 | 上下文 | 思维链 | 倍率 | 特点 |
|------|--------|--------|--------|------|------|
| **Qwen3 Max** | 阿里云 | 256K | ✅ 32K | 1.0x | 复杂推理，工具调用 |
| **Qwen3 Coder Plus** | 阿里云 | 100万 | ❌ | 2.0x | 代码专精，100万上下文 |
| **Qwen3.5 Plus** | 阿里云 | 100万 | ✅ 80K | 0.5x | 80K 思维链，性价比高 |
| **DeepSeek V3.2** | DeepSeek | 128K | ✅ | 1.0x | 深度思考，稀疏注意力 |
| **GLM-5** | 智谱AI | 200K | ✅ | 2.0x | 思维链推理，中文优化 |
| **GLM-4.7** | 智谱AI | 200K | ✅ | 1.0x | 高级推理，128K 输出 |
| **MiniMax M2.5** | MiniMax | 200K | ✅ 32K | 1.0x | 思维链推理，中文优化 |
| **Kimi K2.5** | Moonshot | 256K | ✅ 16K | 1.0x | 文档分析，长上下文 |
| **Kimi K3** | Moonshot | 100万 | ✅ | 6.0x | 超长上下文，视觉，深度思考 |
| **HY3** | 腾讯混元 | 256K | ✅ | 0.5x | 思维链，免费额度 |

**详细模型信息**：请参阅[使用模型](/guides/using-models)了解完整的模型规格、计费倍率和使用建议。


## 为什么选择飞码扣？

| 功能 | GitHub Copilot 原生 | 飞码扣增强版 |
|------|-------------------|-------------|
| 中文理解 | ✅ 良好 | 🔥 **优秀**（中国模型） |
| 付费方式 | 按月订阅 | 💡 **按次付费** |

## 智能体参与者：带上你自己的 CLI 智能体

除了模型接入之外，飞码扣还能让你在 GitHub Copilot Chat 中直接驱动*真正的* Claude Code、Codex 和 GitHub Copilot CLI 智能体 —— `@claude`、`@codex`、`@copilot-cli` —— 每个都保留了对应 CLI 自身的规划与工具调用循环，并渲染在 VS Code 原生聊天界面中。

- 已经订阅了 Claude Pro/Max 或 ChatGPT Plus？直接原生使用，不产生额外费用。
- 还没有订阅？把同样的智能体工作流路由到飞码扣或 Copilot 模型上 —— 无需单独订阅。
- 每一步操作都可以设为需要审批、只自动批准编辑，或完全自动运行，可按次覆盖或设为默认。

👉 [智能体参与者概览](/zh/guides/agent-participants) —— 完整指南，包含帮你选择合适参与者和模式的场景对照表。

👉 想在这三个参与者之外使用同样的本地代理？参见 [LLM 代理](/zh/guides/llm-proxy) 了解如何让任意兼容 OpenAI 或 Anthropic 的工具运行在你的 Copilot 或 BYOK 模型之上。

## 开发状态

**当前版本**：v0.1.0-alpha（开发中）

我们正在实现核心功能：
- ✅ OAuth2 认证系统
- ✅ 语言模型提供器
- 🚧 GitHub Copilot Chat 集成测试
- ⏸️ 配额管理（待验证后实现）

## 相关资源

- [快速入门指南](/guides/quickstart) - 几分钟内开始使用
- [安装指南](/guides/installation) - 详细的安装说明
- [认证指南](/guides/authentication) - 设置 OAuth2 认证
- [智能体参与者](/zh/guides/agent-participants) - 在 VS Code 聊天中驱动 Claude Code、Codex 和 Copilot CLI
- [开发设置](/dev/setup) - 参与项目开发

## 参与贡献

我们欢迎社区贡献！请查看[开发指南](/dev/setup)了解如何参与。

- 🐛 [报告问题](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [功能建议](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [邮件支持](mailto:support@feimacode.com)

---

由 [飞码团队](https://feimacode.com) 用 ❤️ 制作