---
title: 本地与企业模型端点
description: 将你自己的 Ollama、LM Studio、vLLM 或企业网关接入 Copilot Chat 模型选择器，并让 Feima Auto 自动在它们之间路由
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "飞码扣本地与企业模型端点指南",
        "description": "将本地运行时和企业网关注册到 Copilot Chat 模型选择器，并让 Feima Auto 自动在它们之间路由",
        "author": {
          "@type": "Organization",
          "name": "Feimacode",
          "url": "https://feimacode.com"
        },
        "inLanguage": "zh-CN"
      }
---

飞码扣的模型选择器不止于飞码托管模型。它同样可以呈现你自己运行的任何模型——一台运行 [Ollama](https://ollama.com) 或 [LM Studio](https://lmstudio.ai) 的笔记本电脑、一个自建的 vLLM/llama.cpp/SGLang/LiteLLM 实例、一个 [Olla](https://github.com/thushan/olla) 集群，或是内部的企业/私有云网关——与飞码托管模型、你的 Claude/Codex 订阅一起，出现在同一个 Copilot Chat 选择器中。

更进一步，**Feima Auto** 还能按请求自动帮你在这些端点中选出最合适的一个，而不必每次手动切换模型。

## 自动发现本地运行时

启动时，扩展会静默探测常见的本地端口（Ollama、LM Studio 等运行时），并注册找到的一切。常见情况下无需任何配置——安装 Ollama、拉取一个模型、打开 VS Code，它就会出现在 Copilot Chat 模型选择器的独立厂商条目下。

> **关于远程 / WSL / SSH 场景的说明：** 自动发现探测的是 `127.0.0.1`——当 VS Code 本身运行在远程环境（Remote-SSH、Remote-WSL、开发容器、Codespaces）时，这个回环地址指向的是*远程*机器，未必是你实际运行 Ollama 或 LM Studio 的那台机器。这种情况下，请改用[手动注册端点](#手动注册端点)并填入真正可达的地址。

## 手动注册端点

对于自动发现无法触达的企业或私有云端点（或运行在非默认端口的本地运行时），从命令面板运行 **Feima Local Models: Add Model Endpoint**（添加模型端点）。系统会依次询问：

- 基础 URL
- 所使用的协议——`openai-compat`（vLLM、llama.cpp、SGLang、LiteLLM 等绝大多数运行时都使用这一协议）、`ollama-native`，或 `anthropic-messages`
- 可选的 API key（如果该端点需要）

该命令还为常见的本地运行时提供了一些预置模板，多数情况下你只需确认端口号，而不必手动输入完整的 URL 和协议。

能力元数据（上下文窗口、工具调用支持）会在端点自身可提供时直接读取；当只能靠推断得出时，会在选择器中明确标注为*估计值*，绝不会把猜测的结果当作事实呈现。你可以在[本地与企业模型视图](#本地与企业模型视图)中为任意模型修正或补充这些元数据。

## 团队共享端点

将 `.feima/endpoints.json` 文件（只包含 URL，绝不包含密钥）提交到你的代码仓库，这样任何打开该工作区的人都会自动看到你团队共享的网关：

```json
{
  "endpoints": [
    { "baseEndpoint": "https://models.internal.example.com", "label": "Team Gateway" }
  ]
}
```

每个条目所接受的字段与手动注册相同（`baseEndpoint`、`apiFormat`、`modelEndpointPath`、`completionsEndpointPath`、`label`）——唯独没有密钥字段。如果你不小心在其中写入了 `apiKey` 字段，它会被忽略并记录一条警告日志，而不会被静默信任——团队共享配置的设计初衷就是只承载 URL，如果网关需要密钥，由每位队员在本地各自补充。每个候选 URL 都会经过与手动注册相同的探测与校验流程，因此提交文件中一条过期或错误的记录不会被盲目信任。

## 本地与企业模型视图

Explorer 侧边栏中的**本地与企业模型**视图（也可通过 **Feima Local Models: Show Local & Enterprise Models** 打开）会列出每一个已注册的端点，按个人/团队分组，并附带实时健康状态指示和已发现的模型列表。它会随健康状态变化自动更新，无需手动刷新。右键点击某个端点（或其下的模型）可以：

- **Test Connection**（测试连接）——按需探测一次
- **Edit Endpoint**（编辑端点）——修改其 URL、协议或密钥（仅限个人条目）
- **Remove Endpoint**（移除端点）——删除一个个人条目（团队共享条目只能通过编辑 `.feima/endpoints.json` 来移除）
- **Add Model** / **Edit Model**（添加/编辑模型）——手动声明一个模型，或修正端点自身报告错误或未报告的元数据（上下文窗口、工具调用、视觉能力）
- **Remove/Reset Model**（移除/重置模型）——清除手动修正，回退到端点自身报告的内容

拉取了新的本地模型，或是上游有变动？运行 **Feima Local Models: Refresh Models**（刷新模型）立即重新发现，无需等待缓存过期。

## Feima Auto —— 自动选择模型

与其每次手动选择使用哪个已注册端点，不如在模型选择器中选择 **Feima Auto**，它会为每个请求自动路由，并在每次响应中说明实际使用了哪个模型、以及为什么，例如：

> 🧭 **Feima Auto** routed to *Qwen3.6 Flash* — fastest qualifying endpoint on this machine

这是飞码自己的路由器，与 VS Code 自带的内置 "Auto" 条目是两回事——后者只能看到 GitHub 托管的模型。Feima Auto 的候选池默认是你已注册的本地/企业端点——默认不包含飞码托管模型（参见[下文](#让飞码托管模型也加入-feima-auto-的候选池)了解如何改变这一点），也不包含 Claude/Codex 参与者，因为一个由 CLI 驱动的智能体会话与模型选择器条目的请求/响应形态并不相同（这两者请改用 `@claude`/`@codex`，参见[智能体参与者](/zh/guides/agent-participants)）。

### 选择路由策略

通过 `feima.localModels.autoStrategy` 设置来控制 Feima Auto 的选择方式：

| 策略 | 行为 |
|---|---|
| `local-first` | 优先使用本机上的端点；只有当没有任何本地端点满足条件时才会转向网络端点（企业网关、远程 Olla）——并会在这么做时说明原因。 |
| `balanced`（默认） | 综合权衡任务匹配度与能力置信度，仅在其他条件相当时才把本地性作为决胜因素。 |
| `most-capable` | 始终选择满足条件中能力最强的端点，不考虑本地性或延迟。 |

Feima Auto 会在同一次对话中持续使用同一个端点，而不是每条消息都重新决策；它也不会隐藏底层的选择器条目——如果某次路由结果不是你想要的，直接手动选择某个具体模型始终可行。

### 让飞码托管模型也加入 Feima Auto 的候选池

默认情况下，Feima Auto 只会在你自己注册的本地/企业端点之间路由——不包含选择器中的主 **Feima** 条目。如果你希望飞码托管模型也参与进来，运行 **Feima Local Models: Add My Feima-Hosted Models to Auto**（将我的飞码托管模型加入 Auto），并输入一个飞码 API key（从你的 [Feima 控制台](https://feimacode.com/use-api-keys) 获取）。

这会把飞码托管模型注册为一个本地端点，与你的其他端点并列，目的仅仅是让它们能参与 Feima Auto 的路由池。这只是为这一特定目的提供的便利手段，并不是访问飞码托管模型的另一种日常方式——日常直接使用时，选择器中的主 **Feima** 条目仍然是最简单的选择。

## 设置参考

| 设置 | 说明 |
|---|---|
| `feima.localModels.autoStrategy` | Feima Auto 在你已注册的端点之间如何选择——`local-first`、`balanced`（默认）或 `most-capable`。 |

## 下一步

- [使用模型](/zh/guides/using-models) —— 模型选择器的其余部分：飞码托管模型及切换方式。
- [智能体参与者](/zh/guides/agent-participants) —— 驱动真正的 Claude Code、Codex 和 Copilot CLI 智能体，这部分完全在模型选择器之外。
- [配置](/zh/guides/configuration) —— 完整的扩展设置参考。
