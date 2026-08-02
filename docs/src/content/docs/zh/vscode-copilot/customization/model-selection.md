---
title: 模型选择
description: 了解如何在 VS Code GitHub Copilot 中选择和切换语言模型，以及携带自己密钥（BYOK）的配置。
source: https://code.visualstudio.com/docs/copilot/customization/model-selection
---

> **注意**
> 此页面已从原始文档网站迁移。相关内容已合并到[语言模型(Language Model)](/vscode-copilot/concepts/language-models)页面。

VS Code 中的 GitHub Copilot 支持多种语言模型(Language Model)，你可以根据任务需求选择最合适的模型。

## 从聊天视图选择模型

在聊天视图的输入区域，使用模型选择器下拉菜单在可用模型之间切换。

可用的模型取决于你的 Copilot 计划：
- **Copilot 免费版**：有限数量的模型和高级请求
- **Copilot Pro/Pro+**：更多模型选项和高级请求
- **Copilot Business/Enterprise**：完整模型访问权限，由组织管理员控制

> **💡 使用飞码国内模型**
> **[飞码扣插件](https://marketplace.visualstudio.com/items?itemName=feima.copilot-cn-models)** 为 GitHub Copilot Chat 扩展了国内 AI 模型支持，包括通义千问(Qwen3 Max/Flash/Coder)、DeepSeek V3.2、智谱 GLM-5、MiniMax M2.5、Kimi K2.5、Kimi K3 和 HY3。在模型选择器中即可看到这些模型。查看[完整模型列表](/guides/using-models)。 [打开飞码扣](vscode:extension/feima.copilot-cn-models)


## 为内联建议(Inline Suggestion)选择模型

通过命令面板更改内联建议(Inline Suggestion)使用的模型：

1. 打开命令面板（F1 或 ⇧⌘P / Ctrl+Shift+P）
2. 搜索 **GitHub Copilot: Change Completions Model**
3. 从下拉菜单选择所需模型

## 携带自己的密钥（BYOK）

Copilot Pro 及以上计划支持使用自己的 API 密钥访问模型（BYOK）：

1. 打开命令面板，运行 **GitHub Copilot: Add Model**
2. 选择提供商（OpenAI、Anthropic、Azure OpenAI 等）
3. 输入 API 密钥和端点信息
4. 模型出现在模型选择器中

支持的提供商：
- OpenAI（GPT-4o、o1、o3 等）
- Anthropic（Claude 3.5 Sonnet、Claude 3 Opus 等）
- Azure OpenAI
- Google（Gemini）
- Ollama（本地模型）
- 任何 OpenAI 兼容端点

## 在提示词(Prompt)文件和智能体(Agent)中固定模型

在自定义智能体(Custom Agent) `.agent.md` 文件的 frontmatter 中固定特定模型：

```yaml
---
name: My Agent
model: claude-3-5-sonnet
---
```

了解更多：[自定义智能体(Custom Agent)](/vscode-copilot/customization/custom-agents)和[语言模型(Language Model)](/vscode-copilot/concepts/language-models)。
