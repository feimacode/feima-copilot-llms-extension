---
title: 语言模型
description: 了解 VS Code 中语言模型的工作原理、如何选择合适的模型，以及如何配置模型选择器和思考强度。
source: https://code.visualstudio.com/docs/copilot/concepts/language-models
---

Visual Studio Code 使用大型语言模型（LLM）为其 AI 功能提供支持。你可以通过 GitHub Copilot 计划选择多个模型，或携带自己的模型。本文解释了语言模型(Language Model)的工作原理、主要特性以及如何进行模型选择。

> **💡 使用飞码国内模型**
> **[飞码扣插件](https://marketplace.visualstudio.com/items?itemName=feima.copilot-cn-models)** 为 GitHub Copilot Chat 扩展了国内 AI 模型支持，包括通义千问(Qwen3 Max/Flash/Coder)、DeepSeek V3.2、GLM-5、MiniMax M2.5、Kimi K2.5、Kimi K3 和 HY3。在模型选择器中即可看到这些模型。查看[完整模型列表](/guides/using-models)。 [打开飞码扣](vscode:extension/feima.copilot-cn-models)


## 语言模型(Language Model)的工作原理

语言模型(Language Model)处理文本输入（"提示词(Prompt)"）并生成文本输出。在 VS Code 中，提示词(Prompt)由多个来源组成：你的消息、对话历史、文件内容、工具输出以及自定义说明(Custom Instructions)。模型生成的响应可以包括解释、代码编辑或[调用工具](https://code.visualstudio.com/docs/copilot/concepts/tools)的请求。

语言模型(Language Model)不会直接执行代码或访问文件。相反，它们生成文本，由[智能体(Agent)循环](/vscode-copilot/agents/overview#_agent-loop)将其解释为操作。当模型请求工具调用(Tool Call)时，VS Code 执行该工具并将结果反馈给模型用于下一次迭代。

## 主要特性

- **非确定性**：相同的提示词(Prompt)每次可能产生不同的结果。这是有意为之的，反映了模型从概率分布中采样的方式。
- **依赖上下文**：响应的质量取决于提示词(Prompt)中提供的上下文的质量和相关性。
- **知识边界**：模型训练于截止特定日期的数据，对于超出训练数据的主题可能产生过时或不准确的信息。VS Code 通过工具和工作区索引来缓解这一问题。

## 上下文窗口

上下文窗口是模型在单次请求中可以处理的信息总量。它包括所有内容：系统提示词(Prompt)、自定义说明(Custom Instructions)、对话历史、文件内容、工具输出以及你的当前消息。不同模型有不同的上下文窗口大小。

当上下文窗口填满时，VS Code 会自动压缩对话的较旧部分以腾出空间。这意味着长时间对话早期的重要细节可能被压缩或丢失。你也可以在聊天输入框中输入 `/compact` 手动触发压缩。可选地，在命令后添加自定义说明(Custom Instructions)来指导压缩，例如 `/compact focus on the API design decisions`。

了解更多：[VS Code 如何组织上下文](https://code.visualstudio.com/docs/copilot/concepts/context)和[上下文压缩](https://code.visualstudio.com/docs/copilot/chat/copilot-chat-context#_context-compaction)。

## 思考与推理

一些语言模型(Language Model)在生成响应之前可以进行扩展推理，也称为"思考"。推理模型不是立即生成答案，而是先在内部研究问题，考虑多种方法，评估权衡，并构建逐步的思维链。这种内部推理发生在独立于最终输出的专用思考 token 中。

推理模型对于复杂任务特别有效，如多步骤调试、架构规划、代码重构以及数学或科学分析。对于更简单的任务（如生成样板代码或回答基本问题），额外的推理增加了延迟而没有显著收益。

### 思考强度

思考强度控制模型对每个请求应用多少推理。更高的强度级别会产生更深入的内部推理，对复杂问题提高质量。较低的强度级别通过限制或跳过思考步骤来减少延迟和 token 使用。

可用的强度级别及其默认值因模型和提供商而异。一些模型还支持_自适应思考_，模型根据每个请求的复杂性动态决定是否推理以及推理多少，而不是总是使用固定的思考预算。

VS Code 根据评估和在线性能数据设置默认强度级别，并在支持的情况下启用自适应推理。对于大多数使用场景，默认设置无需更改即可正常工作。

### 思考 Token

思考 token 计入模型的上下文窗口，即使它们在响应中不可见。实际的思考输出通常以摘要形式返回，或者为降低延迟可以完全省略。请注意，较高的思考强度级别可能产生更多的思考 token，这可能增加延迟。

了解如何在 VS Code 中[配置思考强度级别](/vscode-copilot/customization/model-selection#_configure-thinking-effort)。

## 选择合适的模型

每个模型有不同的优势。有些针对速度优化，适合简单的补全。其他的有更大的上下文窗口或更好的推理能力，使其成为复杂任务的理想选择。你可以根据特定任务的需要随时切换模型。

VS Code 还支持**自动模型选择**，自动选择模型以确保最佳性能并减少速率限制。自动选择从可用模型中选择，并对付费用户提供请求折扣。

了解更多：[选择和配置语言模型(Language Model)](/vscode-copilot/customization/model-selection)。

## 延伸阅读

- [上下文](https://code.visualstudio.com/docs/copilot/concepts/context)
- [VS Code 中的 AI 语言模型(Language Model)](/vscode-copilot/customization/model-selection)
