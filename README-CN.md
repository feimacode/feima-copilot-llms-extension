# 飞码扣 (Feima Copilot)

> **为 Copilot Chat 提供更多模型，用你自己的 Claude Code / Codex / Copilot CLI 订阅原生驱动智能体，再加一个服务于任意工具的本地代理**

一个让 GitHub Copilot 化身模型提供商（DeepSeek、通义千问、智谱 GLM 等）、在聊天中原生驱动你自己的 Claude Code/Codex/Copilot CLI 订阅、并提供本地 LLM 代理服务任意 OpenAI/Anthropic 兼容工具的 VS Code 扩展

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**[English Version](README.md)** | 中文版

## 快速链接

- 🛒 [VS Code 插件市场](https://marketplace.visualstudio.com/items?itemName=feima.copilot-cn-models) | [下载飞码扣](https://feimacode.com/download)
- 📖 [英文文档](https://ivenxu.github.io/feima-copilot-llms-extension/) | [中文文档](https://docs.feimacode.com/zh/)
- 🚀 [快速入门](https://ivenxu.github.io/feima-copilot-llms-extension/guides/quickstart/) | [快速入门（中文）](https://docs.feimacode.com/zh/guides/quickstart/)
- 📦 [安装指南](https://ivenxu.github.io/feima-copilot-llms-extension/guides/installation/) | [安装指南（中文）](https://docs.feimacode.com/zh/guides/installation/)
- 🔧 [配置选项](https://ivenxu.github.io/feima-copilot-llms-extension/guides/configuration/) | [配置选项（中文）](https://docs.feimacode.com/zh/guides/configuration/)
- 🤖 [智能体参与者](https://ivenxu.github.io/feima-copilot-llms-extension/guides/agent-participants/) | [智能体参与者（中文）](https://docs.feimacode.com/zh/guides/agent-participants/)
- 🖥️ [本地与企业端点](https://ivenxu.github.io/feima-copilot-llms-extension/guides/local-endpoints/) | [本地与企业端点（中文）](https://docs.feimacode.com/zh/guides/local-endpoints/)
- 🔌 [本地 LLM 代理](https://ivenxu.github.io/feima-copilot-llms-extension/guides/llm-proxy/) | [本地 LLM 代理（中文）](https://docs.feimacode.com/zh/guides/llm-proxy/)
- 💻 [开发指南](https://ivenxu.github.io/feima-copilot-llms-extension/dev/setup/) | [开发指南（中文）](https://docs.feimacode.com/zh/dev/setup/)

## 简介

飞码扣是一个围绕三件事打造的 VS Code 扩展：为 Copilot Chat 提供**更多模型**（DeepSeek、通义千问、智谱 GLM、MiniMax、Moonshot Kimi 等国产顶级大模型，更懂中文，更适合中国开发者）；提供**原生智能体参与者**，在聊天中直接驱动你自己的 Claude Code/Codex/Copilot CLI 订阅；以及一个**本地 LLM 代理**，让任意兼容 OpenAI 或 Anthropic 的工具都能运行在你的 Copilot 或 BYOK 模型之上。

### 核心特点

- 🇨🇳 **国产顶级模型**: Qwen3.8 系列、DeepSeek V4、GLM-5、MiniMax M3、Mimo V2.5、Kimi K2.7 Code、Kimi K3、HY3
- 💬 **无缝集成**: 直接在 GitHub Copilot Chat 中使用，无需切换界面
- 💰 **按次计费**: 请求数付费，成本可控，告别按月订阅
- 🔒 **安全可靠**: OAuth2 认证，代码不离开 VS Code
- 🧠 **深度思考**: 支持思维链推理，复杂问题迎刃而解
- 🤖 **智能体参与者（全新）**: 通过 `@claude`、`@codex`、`@copilot-cli` 驱动真正的 Claude Code、Codex 和 Copilot CLI 智能体 —— 详见下文
- 🔌 **本地 LLM 代理**: 让任意兼容 OpenAI 或 Anthropic 的工具（甚至在 VS Code 之外）都能使用你的 Copilot 或 BYOK 模型
- 🖥️ **本地与企业端点（全新）**: 一个选择器覆盖所有模型来源 —— 飞码托管模型、你的 Claude/Codex 订阅，现在还有你自己的本地运行时（Ollama、LM Studio、vLLM、llama.cpp、SGLang、LiteLLM、[Olla](https://github.com/thushan/olla)）或企业/私有云网关 —— 详见下文
- 🧭 **Feima Auto（全新）**: 自动将每个请求路由到最合适的本地/企业端点 —— `local-first`、`balanced` 或 `most-capable` —— 每次响应都会说明路由依据，无需每次手动选择

### 为什么选择飞码扣？

| 对比项 | GitHub Copilot 原生 | 飞码扣增强版 |
|--------|-------------------|-------------|
| 中文理解 | ✅ 良好 | 🔥 **优秀**（国产模型） |
| 模型选择 | 3-4 个 | 🎉 **10+ 个模型** |
| 思维链推理 | ⚠️ 有限 | ✅ **全面支持** |
| 付费方式 | 按月订阅 | 💡 **按次付费** |

### 支持的模型

| 模型 | 提供商 | 特点 |
|------|--------|------|
| Qwen3.8 Max | 阿里云 | ~1M 上下文，深度思维链推理（Pro） |
| Qwen3.7 Max | 阿里云 | ~1M 上下文，思维链推理 |
| Qwen3.6 Plus | 阿里云 | 1M token 上下文，80K 思维链，视觉 |
| Qwen3.6 Flash | 阿里云 | 1M token 上下文，支持思维链（默认） |
| Qwen3.7 Plus | 阿里云 | ~1M 上下文，视觉，深度思考 |
| DeepSeek V3.2 | DeepSeek | 深度思考，稀疏注意力 |
| GLM-5 | 智谱AI | 200K 上下文，思维链推理 |
| GLM-4.7 | 智谱AI | 200K 上下文，高级推理 |
| GLM 5.2 | 智谱AI | 1M 上下文，高级推理 |
| GLM 5.3 | 智谱AI | 1M 上下文，高级推理 |
| GLM 5.3 Flash | 智谱AI | 1M 上下文，快速响应（免费额度） |
| Grok 4.6 | xAI | 500K 上下文，视觉，可配置推理（专业） |
| GPT 5.6 Luna | OpenAI | 1M 上下文，视觉，推理，经济高效 |
| MiniMax M2.5 | MiniMax | 200K 上下文，思维链推理 |
| MiniMax M3 | MiniMax | 1M 上下文，高级推理 |
| Kimi K2.6 | Moonshot | 256K 上下文，思维链推理，视觉 |
| Kimi K2.7 Code | Moonshot | 256K 上下文，代码专精，视觉 |
| Mimo V2.5 | 小米 | 1M 上下文，视觉，高级推理 |
| Mimo V2.5 Pro | 小米 | 1M 上下文，视觉，推理（Pro） |
| DeepSeek V4 Pro | DeepSeek | 1M token 上下文，深度思考 |
| DeepSeek V4 Flash | DeepSeek | 1M token 上下文，快速响应 |
| GLM 5.1 | 智谱AI | 202K 上下文，强大推理 |
| Kimi K3 | 月之暗面 | 1M 上下文，视觉，深度思考（专业） |
| HY3 | 腾讯混元 | 256K 上下文，思维链支持（免费额度） |

## 🖥️ 本地与企业模型端点

**一个选择器，覆盖所有模型来源。** 除了飞码托管模型和你的 Claude/Codex 订阅（见上文），飞码扣还能呈现你自己运行的任何模型 —— 一台运行 Ollama 或 LM Studio 的笔记本电脑、一个自建的 vLLM/llama.cpp/SGLang/LiteLLM 实例、一个 [Olla](https://github.com/thushan/olla) 集群，或是内部的企业/私有云网关 —— 全部出现在同一个 Copilot Chat 模型选择器中。

- **自动发现**：启动时，扩展会静默探测常见的本地端口（Ollama、LM Studio 等），并自动添加找到的一切 —— 常见本地场景无需任何配置。
- **手动注册**：对于自动发现无法触达的企业或私有云端点，运行 **Feima Local Models: Add Model Endpoint**，填入基础 URL、协议和可选的 API key。
- **团队共享端点**：将 `.feima/endpoints.json`（只含 URL，绝不含密钥）提交到仓库，团队成员打开工作区即可自动获得共享网关。示例：
  ```json
  {
    "endpoints": [
      { "baseEndpoint": "https://models.internal.example.com", "label": "Team Gateway" }
    ]
  }
  ```
- **按需刷新**：拉取了新模型或改动了配置？运行 **Feima Local Models: Refresh Models** 立即重新发现，无需等待缓存过期。
- **查看已注册内容**：Explorer 侧边栏中的**本地与企业模型**视图列出每个已注册端点（按个人/团队分组），带实时健康指示和已发现的模型 —— 右键端点可移除（仅限个人条目）或按需测试连接，视图会随健康状态变化自动更新，无需手动刷新。

能力元数据（上下文窗口、工具调用支持）会在端点自身可提供时读取，无法确认时会在选择器中明确标注为*估计值* —— 绝不会把猜测当作事实呈现。

> **关于远程 / WSL / SSH 场景的说明**：自动发现探测的是 `127.0.0.1`，当 VS Code 本身运行在远程环境（Remote-SSH、Remote-WSL、开发容器、Codespaces）时，这指向的是*远程*机器，未必是你实际运行 Ollama 或 LM Studio 的那台机器。这种情况下请改为手动注册端点。

### Feima Auto —— 在本地/企业端点之间自动选择模型

与其每次手动选择使用哪个已注册端点，不如在模型选择器中选择 **Feima Auto**，它会为每个请求自动路由，并在每次响应中说明实际使用了哪个模型、以及原因。（这是飞码自己的路由器，与 VS Code 自带的内置 "Auto" 条目是两回事，后者只能看到 GitHub 托管的模型。）目前 Feima Auto 的候选池仅限于你的本地/企业端点 —— 默认不含飞码托管模型，也不含 Claude/Codex 参与者（它们需要 `@claude`/`@codex`，而不是模型选择器，因为由 CLI 驱动的智能体会话与模型选择器的请求/响应形态不同）。

通过 `feima.localModels.autoStrategy` 设置来选择路由策略：

| 策略 | 行为 |
|---|---|
| `local-first` | 优先使用本机端点；仅当没有本地端点满足条件时才会转向网络端点（企业网关、远程 Olla）—— 并会说明原因。 |
| `balanced`（默认） | 权衡任务匹配度与能力置信度，本地性仅作为决胜因素。 |
| `most-capable` | 始终选择满足条件中能力最强的端点，不考虑本地性或延迟。 |

Feima Auto 会在同一次对话中持续使用同一个端点，而不是每条消息都重新决策，也不会隐藏底层的 `feima`/`feima-local` 选择器条目 —— 如果路由结果不是你想要的，直接手动选择某个具体模型始终可行。

**想让飞码托管模型也加入 Feima Auto 的候选池？** 运行 **Feima Local Models: Add My Feima-Hosted Models to Auto**，输入一个飞码 API key（从你的 [Feima 控制台](https://feimacode.com/use-api-keys) 获取）。这会把飞码托管模型注册为一个本地端点，与你的其他端点并列，目的仅仅是让它们能参与 Feima Auto 的路由池 —— 日常直接使用时，选择器中的主 **Feima** 条目仍是最简单的选择。

📖 深入了解：[本地与企业模型端点指南](https://docs.feimacode.com/zh/guides/local-endpoints/)

## 🤖 智能体参与者 —— 在 VS Code 中原生使用 Claude Code、Codex 和 Copilot CLI

**飞码扣不只是又一个模型提供商 —— 它还能让你在 GitHub Copilot Chat 中直接驱动*真正的* Claude Code、Codex 和 GitHub Copilot CLI 智能体。**

输入 `@claude`、`@codex` 或 `@copilot-cli`，你得到的是该 CLI 自己的智能体循环 —— 它自己的规划、工具调用和文件编辑审查 —— 并渲染在 VS Code 原生聊天界面中：流式响应、内联 diff，无需打开终端，也不用来回复制粘贴代码。

### 该用哪一个？

| 如果你… | 试试 | 为什么 |
|---|---|---|
| 已经订阅了 **Claude Pro/Max** 或 **ChatGPT Plus/Pro** | `@claude` / `@codex`，选择该 CLI 自己的模型 | 直接使用你已有的订阅额度 —— 无额外费用，无需其他配置 |
| 没有（或不想要）单独的 Anthropic/OpenAI 订阅 | `@claude` / `@codex`，改为选择**飞码扣或 Copilot 模型** | 同样的智能体工作流和工具循环，由你已经拥有的模型驱动 |
| 只想用 **GitHub Copilot CLI** 的终端自动化能力，又不想离开聊天窗口 | `@copilot-cli` | 运行 Copilot CLI 的智能体，由你的 Copilot/飞码扣模型驱动 |
| 想先体验 Claude Code 或 Codex 的工作流，再决定是否订阅 | 任一参与者 + 飞码扣/Copilot 模型 | 无需新注册任何账号，先感受一下 |
| 想在普通终端里使用真正的 `claude`/`codex` CLI，但通过 Copilot/飞码扣计费，而不是单独的 API key | 内置的**智能体代理**（Feima: Show Account → 🔌 Agent Proxy） | 同样的本地路由，在 VS Code 之外也能使用 |

### 实际效果

```
你: @claude 重构 parseInvoice() 以处理格式错误的日期，并添加测试

Claude: 我先看一下这个函数……
  ⚙ 正在读取 src/billing/parseInvoice.ts
  ⚙ 正在读取 test/billing/parseInvoice.test.ts
  ✎ 正在编辑 src/billing/parseInvoice.ts
  ✎ 正在创建 test/billing/parseInvoice.test.ts
  完成 —— 为 3 种格式错误的日期添加了防御性判断，并新增 5 个测试用例。
```

无需终端、无需 `cd`、无需复制粘贴 —— 修改会像原生 Copilot Chat 编辑一样，直接落在你打开的编辑器中。

### 技术细节

- **三种权限等级**（按次生效）—— `/ask`（逐项确认）、`/acceptEdits`（自动批准文件编辑，命令仍需确认）、`/fullAuto`（完全自动）—— 也可为每个参与者设置持久默认值。
- **自带模型（BYOK）** —— 通过本地、仅限回环地址的智能体代理，将任意参与者指向 Copilot 或 BYOK 模型，无需单独的 Anthropic/OpenAI API key。
- **MCP 服务器** —— 通过设置为 `@claude` 和 `@codex` 接入你自己的 MCP 工具。
- **你的 CLI，你的登录态** —— 原生模式使用该 CLI 自己的订阅和登录态，就像在终端里使用一样；扩展本身不会接触你的 Anthropic/OpenAI 凭据。

📖 深入了解：[智能体参与者概览](https://docs.feimacode.com/zh/guides/agent-participants/) · [设置与故障排查](https://docs.feimacode.com/zh/guides/agent-participants-setup/) · [智能体代理指南](https://docs.feimacode.com/zh/guides/agent-proxy/)

## 开发状态

**当前版本**: v0.1.0-alpha（开发中）

我们正在实现核心功能：
- ✅ OAuth2 认证系统
- ✅ 语言模型提供器
- 🚧 与 GitHub Copilot Chat 集成测试
- ⏸️ 配额管理（待验证后实现）

## 发布流程

### 自动发布（GitHub Release）

推送版本标签即可触发自动构建和发布：

```bash
# 更新 package.json 版本号
npm version patch  # 或 minor / major

# 推送标签
git push --follow-tags
```

工作流会自动：
1. 构建两个 VSIX 变体（CN + Global）
2. 生成 SHA-256 校验和
3. 创建 GitHub Release 并附带所有产物

### 手动发布到 VS Code Marketplace

1. 确保 GitHub Release 已创建
2. 在 GitHub Actions 中触发 `publish-marketplace.yml` 工作流
3. 输入版本号（不带 v 前缀）
4. 输入 "PUBLISH" 确认发布
5. 等待发布完成

**前置条件**：
- `VSCE_PAT` secret 已配置（Personal Access Token）
- 版本号必须与 GitHub Release 匹配
- 预发布版本（-alpha, -beta）无法发布到市场


## 贡献

我们欢迎社区贡献！请查看[完整文档](https://docs.feimacode.com/zh/dev/setup/)了解如何参与开发。

```bash
# 克隆仓库
git clone https://github.com/feimacode/feima-copilot-llms-extension.git
cd feima-copilot-llms-extension

# 安装依赖
npm install

# 编译
npm run ext:compile

# 在 VS Code 中打开
code .

# 按 F5 启动调试
```

## 文档

完整的文档请访问：
- [中文文档](https://docs.feimacode.com/zh/)
- [英文文档](https://ivenxu.github.io/feima-copilot-llms-extension/)

## 支持与联系

- 🐛 [报告问题](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [功能建议](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [邮件支持](mailto:support@feimacode.com)
- 💬 微信交流群：扫码下方二维码加入

## 微信交流群

扫码加入飞码扣用户交流群，获取最新资讯和技术支持：

![微信群二维码](https://feimacode.com/wechat-barcode.png)

## 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件

---

<p align="center">
  <strong>加速创意落地 - Accelerating intent into execution</strong><br>
  Made with ❤️ by <a href="https://feimacode.com">Feimacode Team</a>
</p>