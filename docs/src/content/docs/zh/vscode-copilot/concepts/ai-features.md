---
title: AI 功能概述
description: 了解 VS Code 中 AI 相关概念，包括语言模型的工作原理、智能体循环、上下文管理和工具调用。
source: https://code.visualstudio.com/docs/copilot/concepts/ai-features
---

本文介绍 VS Code AI 功能背后的核心概念，帮助你更好地理解和利用这些功能。

## 语言模型(Language Model)

语言模型（LLM）是 Copilot 的 AI 功能的基础。了解更多：[语言模型(Language Model)](/vscode-copilot/concepts/language-models)。

## 智能体(Agent)循环

智能体（Agent）是能够自主完成任务的 AI 系统。与仅生成单次响应的聊天不同，智能体(Agent)在循环中运行：

1. **接收目标**：接收用户的高层级目标
2. **规划**：分析当前状态，制定行动计划
3. **调用工具**：使用工具（读取文件、编写代码、运行命令）执行步骤
4. **观察结果**：处理工具调用(Tool Call)的结果
5. **迭代**：根据结果调整计划，重复直到目标完成

这种循环让智能体(Agent)能够处理需要多步骤、多工具协作的复杂任务。

## 上下文

AI 响应的质量很大程度上取决于上下文质量。VS Code 通过多种方式为 AI 提供上下文：

- **工作区索引**：对代码库的语义理解
- **对话历史**：当前会话的上下文
- **自定义说明(Custom Instructions)**：项目级别的永久指令
- **工具输出**：工具调用(Tool Call)的结果

了解更多：[聊天上下文](/vscode-copilot/chat/context)。

## 工具

工具让智能体(Agent)能够与外部世界交互。内置工具包括：

- **文件操作**：读取和修改文件
- **终端**：运行命令
- **代码搜索**：在代码库中查找相关代码
- **浏览器**：与 Web 内容交互（实验性）

通过 MCP 服务器和 VS Code 扩展，可以添加自定义工具。

了解更多：[智能体(Agent)工具](https://code.visualstudio.com/docs/copilot/agents/agent-tools)和 [MCP 服务器](/vscode-copilot/customization/mcp-servers)。

## 模型提供商

VS Code Copilot 支持多种语言模型(Language Model)提供商：

- **GitHub Copilot**：通过 Copilot 订阅访问多种模型

> **💡 使用飞码国内模型**
> **[飞码扣插件](https://marketplace.visualstudio.com/items?itemName=feima.copilot-cn-models)** 为 GitHub Copilot Chat 扩展了国内 AI 模型支持，包括通义千问(Qwen3 Max/Flash/Coder)、DeepSeek V3.2、GLM-5、MiniMax M2.5、Kimi K2.5、Kimi K3 和 HY3。在模型选择器中即可看到这些模型。查看[完整模型列表](/guides/using-models)。 [打开飞码扣](vscode:extension/feima.copilot-cn-models)

- **BYOK（携带自己的密钥）**：使用自己的 API 密钥访问 OpenAI、Anthropic、Azure OpenAI 等
- **第三方智能体(Third-party Agent)**：Anthropic Claude 和 OpenAI Codex 智能体(Agent)

了解更多：[语言模型(Language Model)](/vscode-copilot/customization/model-selection)。

## 提示词(Prompt)工程

提示词（Prompt）是发送给语言模型(Language Model)的输入。好的提示词(Prompt)可以显著提高响应质量：

- 明确指定目标和约束
- 提供足够的上下文
- 包含预期的输出格式或示例
- 拆分复杂任务为小步骤

了解更多：[提示词(Prompt)编写技巧](/vscode-copilot/chat/prompt-crafting)和[最佳实践](/vscode-copilot/best-practices)。

## 延伸阅读

- [语言模型(Language Model)](/vscode-copilot/concepts/language-models)
- [智能体(Agent)概览](/vscode-copilot/agents/overview)
- [聊天上下文](/vscode-copilot/chat/context)
