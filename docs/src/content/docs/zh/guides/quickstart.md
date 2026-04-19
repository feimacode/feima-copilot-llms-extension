---
title: 快速入门
description: 几分钟内开始使用飞码扣
---

# 快速入门指南

本指南将帮助您在几分钟内开始使用飞码扣。

## 前置要求

在开始之前，请确保您拥有：

- ✅ **VS Code** >= 1.85.0
- ✅ **GitHub Copilot Chat** 扩展已安装（必需）
- ✅ **飞码账号**（在 [feimacode.cn](https://feimacode.cn) 注册）

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
   - **DeepSeek Coder V2** - 最适合代码生成
   - **通义千问 3 Coder** - 最适合中文代码注释
   - **腾讯混元** - 通用问答
   - **GPT-4o** - 复杂逻辑和架构设计
   - **Claude 3.5 Sonnet** - 代码审查和优化
   - **Gemini 1.5 Pro** - 大型代码库理解

### 第五步：开始聊天

1. 在聊天输入框中输入您的问题或编码请求
2. AI 将使用所选模型进行回复
3. 您可以在会话中随时切换模型

## 第一个示例

尝试这个简单示例来验证一切正常：

1. 在 Copilot Chat 中选择 "DeepSeek Coder V2"
2. 提问："如何使用 Express 在 Node.js 中创建 REST API 端点？"
3. AI 应该会提供代码和说明

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

- 验证 feima-idp 是否可访问：`curl https://idp.feimacode.cn/.well-known/openid-configuration`
- 检查您的网络连接

## 下一步

- [安装指南](./installation.md) - 更多详细的安装选项
- [认证指南](./authentication.md) - 了解 OAuth2 流程
- [配置指南](./configuration.md) - 自定义您的体验
- [开发指南](../dev/setup.md) - 为项目做出贡献

## 需要帮助？

- 🐛 [报告问题](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [讨论](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [邮件支持](mailto:support@feimacode.cn)