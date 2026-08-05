---
title: 快速入门
description: 几分钟内开始使用飞码扣
head:
  - tag: script
    attrs:
      type: application/ld+json
    content: |
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "飞码扣快速入门",
        "description": "在几分钟内开始使用飞码扣",
        "totalTime": "PT10M",
        "inLanguage": "zh-CN"
      }
---

本指南将帮助您在几分钟内开始使用飞码扣。

## 前置要求

在开始之前，请确保您拥有：

- ✅ **VS Code** >= 1.85.0
- ✅ **GitHub Copilot Chat** 扩展已安装（必需）
- ✅ **飞码账号**（在 [feimacode.com](https://feimacode.com) 注册）

## 安装

### 第一步：安装飞码扣

1. 打开 VS Code
2. 按 `Ctrl+Shift+X`（或 Mac 上的 `Cmd+Shift+X`）打开扩展面板
3. 搜索 "飞码扣" 或 "Feima Copilot"
4. 点击 "安装"

### 第二步：验证 GitHub Copilot Chat

确保您已安装 **GitHub Copilot Chat** 扩展。飞码扣需要它才能正常工作。

1. 打开扩展面板
2. 搜索 "GitHub Copilot Chat"
3. 如果未安装，点击 "安装"

## 认证

### 第三步：登录飞码

1. 按 `Ctrl+Shift+P`（或 Mac 上的 `Cmd+Shift+P`）打开命令面板
2. 输入 "Feima: 登录"
3. 选择该命令
4. 浏览器窗口将打开
5. 使用您的飞码账号登录（GitHub）
6. 授予请求的权限
7. 您将被重定向回 VS Code

**成功消息**："✅ 已登录为: [your-email]"

## 使用飞码扣

### 第四步：选择飞码模型

1. 打开 Copilot Chat 面板（点击侧边栏的聊天图标或按 `Ctrl+Alt+I`）
2. 点击面板顶部的模型选择器
3. 从列表中选择一个飞码模型：
   - **Qwen3.6 Flash** - 快速响应，支持思维链，免费（默认）
   - **Qwen3.7 Max** - 深度推理，~1M上下文
   - **Qwen3.6 Plus** - 视觉支持，80K思维链，1M上下文
   - **Qwen3.7 Plus** - ~1M上下文，视觉，深度思考
   - **DeepSeek V3.2** - 深度思考，代码能力强
   - **GLM-5** - 智谱高级推理模型
   - **GLM-4.7** - 长文本，高质量输出
   - **GLM 5.2** - 1M上下文，高级推理
   - **MiniMax M2.5** - 平衡性能
   - **Kimi K2.6** - 256K上下文，视觉支持
   - **Kimi K2.7 Code** - 256K上下文，代码专精
   - **Kimi K3** - 100万上下文，视觉，深度思考（专业版）
   - **HY3** - 256K上下文，思维链支持（免费额度）

### 第五步：开始聊天

1. 在聊天输入框中输入您的问题或编码请求
2. AI 将使用所选模型进行回复
3. 您可以在会话中随时切换模型

## 第一个示例

尝试这个简单示例来验证一切正常：

1. 在 Copilot Chat 中选择 "DeepSeek Coder V2"
2. 提问："如何使用 Express 在 Node.js 中创建 REST API 端点？"
3. AI 应该会提供代码和说明

## 可选：试试智能体参与者

如果你已经安装了对应的 CLI，飞码扣还提供三个聊天参与者 —— `@claude`、`@codex`、`@copilot-cli` —— 可以在 VS Code 聊天中运行真正的 Claude Code、Codex 或 GitHub Copilot CLI 智能体：

1. 在聊天输入框中输入 `@claude`（或 `@codex` / `@copilot-cli`），后面跟上你的请求，例如 `@claude 解释一下这个文件的作用`
2. 系统会提示你选择模型 —— 选择该 CLI 自己的模型以使用你现有的订阅，或选择飞码扣/Copilot 模型将请求路由到它们
3. 观察智能体规划、读取文件，并内联提出修改建议

完整介绍请见[智能体参与者指南](/zh/guides/agent-participants)，其中包含帮你判断该用哪种模式的场景对照表；如果检测不到 CLI，请参阅[设置与故障排查](/zh/guides/agent-participants-setup)。

## 故障排除

### 浏览器没有打开

- 检查 VS Code 是否有打开默认浏览器的权限
- 确保您的默认浏览器已正确配置

### "无待处理回调" 错误

- 回调在 5 分钟后过期 - 请快速重新登录
- 检查浏览器安全设置是否阻止重定向

### 在选择器中找不到飞码模型

- 确保您已登录：按 `Ctrl+Shift+P` → "Feima: 查看账号"
- 检查输出面板（查看 → 输出）是否有任何错误消息

### 令牌交换失败

- 验证 feima-idp 是否可访问：`curl https://idp.feimacode.com/.well-known/openid-configuration`
- 检查您的网络连接

## 下一步

- [安装指南](/guides/installation) - 更多详细的安装选项
- [认证指南](/guides/authentication) - 了解 OAuth2 流程
- [配置指南](/guides/configuration) - 自定义您的体验
- [智能体参与者](/zh/guides/agent-participants) - 在聊天中驱动 Claude Code、Codex 和 Copilot CLI
- [开发指南](/dev/setup) - 为项目做出贡献

## 需要帮助？

- 🐛 [报告问题](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [讨论](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [邮件支持](mailto:support@feimacode.com)