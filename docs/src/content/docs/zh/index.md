---
title: 欢迎使用飞码扣
description: 为 GitHub Copilot 提供中国 AI 模型支持的 VS Code 扩展
---

# 欢迎使用飞码扣

飞码扣是一个 VS Code 扩展，为 GitHub Copilot Chat 增强中国 AI 模型支持，并提供加速访问国际模型的功能。

## 什么是飞码扣？

**飞码扣 (Feima Copilot)** 是一个 VS Code 扩展，提供以下功能：

- 🇨🇳 **中国 AI 模型**：直接访问 DeepSeek Coder V2、通义千问 Coder、腾讯混元等中国模型
- 💬 **无缝集成**：直接在 GitHub Copilot Chat 中使用，无需切换界面
- 💰 **按次计费**：只为使用的请求付费，无需月付订阅
- 🔒 **安全可靠**：OAuth2 认证，代码不离开 VS Code

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

### 中国模型（直连）

| 模型 | 提供商 | 最适用于 |
|------|--------|----------|
| DeepSeek Coder V2 | DeepSeek | 代码生成、代码补全、技术问答 |
| 通义千问 3 Coder | 阿里云 | 中文代码注释、文档生成 |
| 腾讯混元 | 腾讯 | 通用问答、代码理解 |


## 为什么选择飞码扣？

| 功能 | GitHub Copilot 原生 | 飞码扣增强版 |
|------|-------------------|-------------|
| 中文理解 | ✅ 良好 | 🔥 **优秀**（中国模型） |
| 付费方式 | 按月订阅 | 💡 **按次付费** |

## 开发状态

**当前版本**：v0.1.0-alpha（开发中）

我们正在实现核心功能：
- ✅ OAuth2 认证系统
- ✅ 语言模型提供器
- 🚧 GitHub Copilot Chat 集成测试
- ⏸️ 配额管理（待验证后实现）

## 相关资源

- [快速入门指南](./guides/quickstart.md) - 几分钟内开始使用
- [安装指南](./guides/installation.md) - 详细的安装说明
- [认证指南](./guides/authentication.md) - 设置 OAuth2 认证
- [开发设置](./dev/setup.md) - 参与项目开发

## 参与贡献

我们欢迎社区贡献！请查看[开发指南](./dev/setup.md)了解如何参与。

- 🐛 [报告问题](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [功能建议](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [邮件支持](mailto:support@feimacode.cn)

---

由 [飞码团队](https://feimacode.cn) 用 ❤️ 制作