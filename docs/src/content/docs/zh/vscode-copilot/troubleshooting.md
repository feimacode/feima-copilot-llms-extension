---
title: 故障排查
description: 本文介绍在 VS Code 中使用 GitHub Copilot 遇到问题时的诊断工具和技术，包括日志查看、网络诊断和 MCP 服务器调试。
source: https://code.visualstudio.com/docs/copilot/troubleshooting
---

本文介绍在 VS Code 中排查 AI 相关问题的诊断工具和技术。使用这些工具识别网络连接、自定义文件和 AI 响应方面的问题。

## 查看 GitHub Copilot 的日志

GitHub Copilot 扩展的日志文件存储在 Visual Studio Code 扩展的标准日志位置。使用这些日志来诊断连接问题、扩展错误和意外行为。

查看详细日志：

1. 打开命令面板（⇧⌘P / Windows、Linux：Ctrl+Shift+P）。
2. 运行 **Developer: Set Log Level**，将 GitHub Copilot 和 GitHub Copilot Chat 扩展的值设置为 **Trace**。
3. 运行 **Output: Show Output Channels**，从列表中选择 **GitHub Copilot** 或 **GitHub Copilot Chat**。
4. 在"输出"面板中查看所选扩展的日志。

要在输出频道之间切换，从"输出"面板右侧的下拉菜单选择 **GitHub Copilot** 或 **GitHub Copilot Chat**。

## 收集网络诊断信息

如果遇到连接到 GitHub Copilot 的问题，收集网络连接诊断信息以识别防火墙、代理或 VPN 问题。

1. 打开命令面板（⇧⌘P / Windows、Linux：Ctrl+Shift+P）。
2. 运行 **GitHub Copilot: Collect Diagnostics**。
3. 编辑器标签页会打开，显示你可以查看并在报告问题时共享的诊断信息。

有关网络配置的更多信息，请参阅 [Copilot 的网络和防火墙配置](/vscode-copilot/faq#_network-and-firewall-configuration-for-copilot)。

## 调试聊天交互

VS Code 提供不同的工具来检查向 AI 发送提示词(Prompt)时发生的情况。

### `/troubleshoot` 斜杠命令(Slash Command)

让 AI 分析聊天会话的调试日志。可选地，包含 `#session` 来选择并诊断之前的聊天会话。输入 `/troubleshoot` 后跟你的问题，例如 `/troubleshoot how many tokens did I use?` 或 `/troubleshoot list all paths you tried to load customizations in #session`。

需要启用 `github.copilot.chat.agentDebugLog.enabled` 设置。

### 智能体(Agent)调试日志面板（预览版）

按时间顺序显示聊天会话中智能体(Agent)交互的事件日志，包括工具调用(Tool Call)序列、LLM 请求、token 使用量、提示词(Prompt)文件发现和错误。这是理解和调试聊天交互的主要工具。

打开智能体(Agent)调试日志面板：

1. 选择聊天视图中的省略号（**...**）菜单。
2. 选择**显示智能体(Agent)调试日志**。

在智能体(Agent)调试日志面板中，你可以将智能体(Agent)调试事件的快照附加到聊天对话，就会话提问并排查特定交互问题。

了解更多：[智能体(Agent)调试日志面板](https://code.visualstudio.com/docs/copilot/chat/chat-debug-view#_agent-debug-log-panel)。

### 聊天调试视图

显示每个 LLM 请求和响应的原始详情，包括完整的系统提示词(Prompt)、用户提示词(Prompt)、上下文和工具调用(Tool Call)有效载荷。使用此视图检查每次交互发送到语言模型(Language Model)和从语言模型(Language Model)接收的确切数据。

打开聊天调试视图：

1. 选择聊天视图中的溢出菜单（`...`）。
2. 选择**显示聊天调试视图**。

了解更多：[聊天调试视图](https://code.visualstudio.com/docs/copilot/chat/chat-debug-view#_chat-debug-view)。

## 排查 MCP 服务器问题

MCP 服务器通过连接外部服务来扩展聊天功能。如果 MCP 服务器无法正常工作，你可以查看其日志并重启它。

排查 MCP 服务器问题：

1. 打开命令面板，运行 **MCP: List Servers**。
2. 选择一个服务器查看其状态和可用操作。
3. 选择**显示输出**查看服务器的日志。
4. 选择**重启服务器**来重启行为异常的服务器。

了解更多：[配置和调试 MCP 服务器](/vscode-copilot/customization/mcp-servers)。

## 提供反馈

如果遇到无法解决的问题，请报告以帮助改进 GitHub Copilot：

- **幽灵文字建议**：将鼠标悬停在编辑器中的幽灵文字建议上，选择**发送 Copilot 补全反馈**。
- **下一个编辑建议**：选择编辑器行号区域中下一个编辑建议菜单中的**反馈**操作。
- **一般问题**：打开**帮助** > **报告问题**，选择 **VS Code 扩展**，然后选择 **GitHub Copilot Chat**。

报告问题时，包含来自 [Copilot 日志](#_view-logs-for-github-copilot)的相关信息以帮助诊断问题。

## 延伸阅读

- [调试聊天交互](https://code.visualstudio.com/docs/copilot/chat/chat-debug-view)
- [自定义说明(Custom Instructions)](/vscode-copilot/customization/custom-instructions)
- [MCP 服务器](/vscode-copilot/customization/mcp-servers)
- [GitHub Copilot 常见问题](/vscode-copilot/faq)

---

## 飞码扣：国内用户的替代方案

如果您正在寻找适合国内使用的 AI 编程助手，**[飞码扣插件](https://marketplace.visualstudio.com/items?itemName=feima.copilot-cn-models)** 是一个绝佳选择：

- 🇨🇳 **国内顶级模型**：通义千问(Qwen3)、DeepSeek V3.2、GLM-5、MiniMax M2.5、Kimi K2.5、Kimi K3、HY3
- 💰 **按次计费**：无需月付订阅，只为使用的请求付费
- 💬 **无缝集成**：直接在 GitHub Copilot Chat 界面中使用，无需切换工具
- 🔒 **安全可靠**：OAuth2 认证，代码不离开 VS Code

[快速入门指南 →](/guides/quickstart) | [查看所有模型 →](/guides/using-models)
