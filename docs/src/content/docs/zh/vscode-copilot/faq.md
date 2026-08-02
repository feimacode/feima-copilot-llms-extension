---
title: 常见问题（FAQ）
description: GitHub Copilot 在 Visual Studio Code 中使用的常见问题解答，涵盖订阅、内联建议、聊天功能和故障排查。
source: https://code.visualstudio.com/docs/copilot/faq
---

本文解答在 Visual Studio Code 中使用 GitHub Copilot 的常见问题。

## GitHub Copilot 订阅

### 如何获取 Copilot 订阅？

获取 GitHub Copilot 访问权限的方式：

| 用户类型 | 说明 |
|----------|------|
| 个人用户 | 注册 GitHub Copilot 免费版，每月有一定数量的内联建议(Inline Suggestion)和聊天交互额度。或注册付费 GitHub Copilot 计划，获得更多灵活性和高级功能。参见[为自己设置 GitHub Copilot](https://docs.github.com/en/copilot/setting-up-github-copilot/setting-up-github-copilot-for-yourself)。 |
| 组织/企业成员 | 如果你是拥有 GitHub Copilot 订阅的组织或企业的成员，可以在 [https://github.com/settings/copilot](https://github.com/settings/copilot) 请求访问 Copilot。参见[为组织设置 GitHub Copilot](https://docs.github.com/en/copilot/setting-up-github-copilot/setting-up-github-copilot-for-your-organization)。 |

### 使用 GitHub 账号登录有什么优势？

使用有 GitHub Copilot 访问权限的 GitHub 账号登录的好处：

- [更多每月聊天交互额度](https://docs.github.com/en/copilot/get-started/plans#comparing-copilot-plans)
- [在聊天中访问高级语言模型(Language Model)](https://docs.github.com/en/copilot/reference/ai-models/supported-models#supported-ai-models-per-copilot-plan)
- [携带自己的模型密钥 (BYOK)](/vscode-copilot/customization/model-selection#_bring-your-own-language-model-key)
- [远程仓库索引和语义代码搜索](https://code.visualstudio.com/docs/copilot/reference/workspace-context#_remote-index)
- [Copilot 代码审查](https://docs.github.com/en/copilot/concepts/agents/code-review)
- [Copilot 内容排除](https://docs.github.com/en/copilot/how-tos/configure-content-exclusion/exclude-content-from-copilot)
- [将任务委托给 Copilot 云端智能体(Cloud Agent)](/vscode-copilot/agents/cloud-agents#_github-copilot-cloud-agent)进行后台执行

### 如何监控 Copilot 使用情况？

你可以通过 VS Code 状态栏中的 Copilot 状态仪表板查看当前 Copilot 使用情况。仪表板显示：

- **内联建议(Inline Suggestion)**：当月内联建议(Inline Suggestion)配额的使用百分比。
- **聊天消息**：当月聊天请求配额的使用百分比。
- **高级请求**：当月高级请求配额的使用百分比。
- **高级请求超额**：当月超额使用的高级请求数量。

### 我已达到内联建议(Inline Suggestion)或聊天交互限制

你的内联建议(Inline Suggestion)和聊天交互限制每月重置。如果你只达到了聊天交互限制，仍然可以使用内联建议(Inline Suggestion)，反之亦然。

对于 Copilot 免费版用户，要获取更多内联建议(Inline Suggestion)和聊天交互，可以直接在 VS Code 中注册付费计划，或等到下月继续免费使用 Copilot。

如果你使用了付费计划的所有高级请求，当月剩余时间仍可使用 Copilot 的某个包含模型。也可以申请超出计划限制的额外高级请求。

### 未在 VS Code 中检测到我的 Copilot 订阅

在 Visual Studio Code 中使用聊天，必须使用有 GitHub Copilot 访问权限的 GitHub 账号登录 Visual Studio Code。

- 如果你的 Copilot 订阅与另一个 GitHub 账号关联，请退出当前账号并用另一个账号登录。使用活动栏中的**账号**菜单退出当前 GitHub 账号。
- 在 [GitHub Copilot 设置](https://github.com/settings/copilot)中验证 Copilot 订阅是否仍然有效。
- 如果你在 GHE.com 上使用托管用户账号的 Copilot 计划，需要先更新一些设置再登录。

### 如何切换 Copilot 的账号

如果你的 Copilot 订阅与另一个 GitHub 账号关联，请在 VS Code 中退出 GitHub 账号，然后用另一个账号登录。

参见[为 Copilot 使用不同的 GitHub 账号](/vscode-copilot/setup#_use-a-different-github-account-with-copilot)获取更多信息。

## 一般 Copilot 问题

### 如何从 VS Code 中移除 Copilot？

你可以使用 `chat.disableAIFeatures` 设置禁用 VS Code 的内置 AI 功能。这会禁用并隐藏聊天或内联建议(Inline Suggestion)等功能，并禁用 Copilot 扩展。可在工作区或用户级别配置此设置。

或者，从标题栏的聊天菜单选择**了解如何隐藏 AI 功能**来访问该设置。

### Copilot 的网络和防火墙配置

- 如果你或你的组织使用了防火墙或代理服务器等安全措施，建议将某些域名 URL 添加到"允许列表"并开放特定端口和协议。了解更多：[排查 GitHub Copilot 防火墙设置](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot)。
- 如果你在公司设备上工作并连接到公司网络，可能通过 VPN 或 HTTP 代理服务器连接互联网，这可能会阻止 GitHub Copilot 连接到 GitHub 服务器。了解更多：[排查 GitHub Copilot 网络错误](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-network-errors-for-github-copilot)。

### 我的请求被速率限制

此错误表明你已超过 Copilot 请求的速率限制。GitHub 使用速率限制确保所有人公平访问 Copilot 服务并防止滥用。

了解更多：[GitHub Copilot 的速率限制](https://docs.github.com/en/copilot/troubleshooting-github-copilot/rate-limits-for-github-copilot)。

> **💡 遇到限速？切换到飞码扣模型**
> 安装 **[飞码扣插件](https://marketplace.visualstudio.com/items?itemName=feima.copilot-cn-models)** 后，即可在 GitHub Copilot Chat 中切换到通义千问(Qwen3)、DeepSeek V3.2、GLM-5 等国内模型，不受 GitHub 速率限制影响，按次计费。[立即开始 →](/guides/quickstart) [打开飞码扣](vscode:extension/feima.copilot-cn-models)

### 是否有 Copilot 扩展的预发布版本？

有，你可以切换到 Copilot 扩展的预发布（每晚构建）版本以尝试最新功能和修复。在扩展视图中，右键单击或选择齿轮图标打开上下文菜单，然后选择**切换到预发布版本**。

## 内联建议(Inline Suggestion)

### 如何启用或禁用内联建议(Inline Suggestion)？

你可以通过 VS Code 状态栏中 Copilot 状态仪表板的复选框启用或禁用内联建议(Inline Suggestion)，可以全局启用/禁用，也可以针对活跃编辑器的文件类型启用/禁用。

也可以使用 `github.copilot.enable` 和 `github.copilot.nextEditSuggestions.enabled` 设置分别启用或禁用内联建议(Inline Suggestion)和下一个编辑建议。可在工作区或用户级别配置。

### 内联建议(Inline Suggestion)在编辑器中不工作

- 验证 [GitHub Copilot 未被全局或对此语言禁用](#_how-do-i-enable-or-disable-inline-suggestions)
- 验证 [GitHub Copilot 订阅有效且已被检测到](#_my-copilot-subscription-is-not-detected-in-vs-code)
- 验证[网络设置](#_network-and-firewall-configuration-for-copilot)已配置为允许连接到 GitHub Copilot
- 验证你尚未达到本月 Copilot 免费计划的内联建议(Inline Suggestion)限制

## 聊天(Chat)

### 聊天功能不工作

确保满足以下要求：

- 确保使用最新版本的 Visual Studio Code（运行 **Code: Check for Updates**）。
- 确保安装了 [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) 和 [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) 扩展的最新版本。
- 登录 VS Code 的 GitHub 账号必须有有效的 Copilot 订阅。检查你的 [Copilot 订阅](https://github.com/settings/copilot)。
- 验证你尚未达到本月 Copilot 免费计划的聊天交互限制。

### 聊天中不可用智能体(Agent)

验证 VS Code 设置中是否启用了智能体（`chat.agent.enabled`，此设置由组织级别管理）。你的组织可能禁用了此功能，请联系管理员启用。

### 聊天中的智能体(Agent)在 VS Code 中能做什么？

智能体(Agent)能自主处理完整的编码任务。它们规划多步骤实施，跨多个文件执行协调变更，运行终端命令，调用工具，并在遇到错误时自我纠正。可用于功能实现、架构级别重构、框架迁移、调试和测试生成。

### Copilot 与大型代码库和 monorepo 兼容吗？

是的。VS Code 使用语义搜索、语言智能（LSP）和 GitHub 代码搜索自动索引工作区，跨仓库提供深度理解。对于大型仓库，[远程索引](https://code.visualstudio.com/docs/copilot/reference/workspace-context#_remote-index)使用 GitHub 的索引跨相关仓库获得快速、全面的结果。使用[多根工作区](https://code.visualstudio.com/docs/editing/workspaces/multi-root-workspaces)在 monorepo 中限定上下文，使用[自定义说明(Custom Instructions)](/vscode-copilot/customization/custom-instructions)描述项目架构。

### 我的组织能控制 AI 功能和智能体(Agent)访问吗？

是的。组织管理员可以通过[企业 AI 设置](https://code.visualstudio.com/docs/enterprise/ai-settings)和[策略](https://code.visualstudio.com/docs/enterprise/policies)管理 Copilot，包括启用或禁用智能体(Agent)、控制模型访问、配置内容排除和强制执行信任边界。

### 语言模型(Language Model)选择器中并非所有模型都可用

你可以选择哪些模型在语言模型(Language Model)选择器中可用。了解如何[自定义语言模型(Language Model)选择器](/vscode-copilot/customization/model-selection#_customize-the-model-picker)。

组织可以限制对某些模型的访问。如果你认为某个模型应该可用，请联系组织管理员。

### 如何防止聊天视图自动打开？

默认情况下，聊天视图在辅助侧边栏中打开。当你为某个工作区关闭聊天视图时，VS Code 会记住此设置，下次打开该工作区时不会自动打开聊天视图。

你可以直接从聊天视图更改默认可见性：

1. 打开聊天视图（⌃⌘I / Windows、Linux：Ctrl+Alt+I）。
2. 选择聊天视图右上角的 `...` 图标。
3. 选择**默认显示视图**以启用或禁用自动打开聊天视图。

也可以使用 `workbench.secondarySideBar.defaultVisibility` 设置控制辅助侧边栏的默认可见性。设置为 `hidden` 可防止聊天视图自动打开。

## 故障排查和反馈

### 如何对 Copilot 提供反馈？

我们在 [microsoft/vscode](https://github.com/microsoft/vscode) GitHub 仓库跟踪 VS Code 中 GitHub Copilot 的问题和功能请求。你可以在此仓库创建问题，也可以在 VS Code 中使用以下反馈机制：

- **幽灵文字建议**：将鼠标悬停在编辑器中的幽灵文字建议上，使用**发送 Copilot 补全反馈**操作。
- **一般问题**：打开**帮助** > **报告问题**，选择 **VS Code 扩展**，然后选择 **GitHub Copilot Chat**。

---

## 飞码扣：国内用户的替代方案

如果您正在寻找适合国内使用的 AI 编程助手，**[飞码扣插件](https://marketplace.visualstudio.com/items?itemName=feima.copilot-cn-models)** 是一个绝佳选择：

- 🇨🇳 **国内顶级模型**：通义千问(Qwen3)、DeepSeek V3.2、GLM-5、MiniMax M2.5、Kimi K2.5、Kimi K3、HY3
- 💰 **按次计费**：无需月付订阅，只为使用的请求付费
- 💬 **无缝集成**：直接在 GitHub Copilot Chat 界面中使用，无需切换工具
- 🔒 **安全可靠**：OAuth2 认证，代码不离开 VS Code

[快速入门指南 →](/guides/quickstart) | [查看所有模型 →](/guides/using-models)
