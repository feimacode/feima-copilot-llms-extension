# 飞码扣 (Feima Copilot)

> **加速创意落地** - Accelerating intent into execution

为 GitHub Copilot 提供中国 AI 模型支持的 VS Code 扩展

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**[English Version](README.md)** | 中文版

## 快速链接

- 🛒 [VS Code 插件市场](https://marketplace.visualstudio.com/items?itemName=feima.copilot-cn-models) | [下载飞码扣](https://feimacode.com/download)
- 📖 [英文文档](https://ivenxu.github.io/feima-copilot-llms-extension/) | [中文文档](https://docs.feimacode.com/zh/)
- 🚀 [快速入门](https://ivenxu.github.io/feima-copilot-llms-extension/guides/quickstart/) | [快速入门（中文）](https://docs.feimacode.com/zh/guides/quickstart/)
- 📦 [安装指南](https://ivenxu.github.io/feima-copilot-llms-extension/guides/installation/) | [安装指南（中文）](https://docs.feimacode.com/zh/guides/installation/)
- 🔧 [配置选项](https://ivenxu.github.io/feima-copilot-llms-extension/guides/configuration/) | [配置选项（中文）](https://docs.feimacode.com/zh/guides/configuration/)
- 💻 [开发指南](https://ivenxu.github.io/feima-copilot-llms-extension/dev/setup/) | [开发指南（中文）](https://docs.feimacode.com/zh/dev/setup/)

## 简介

飞码扣是 VS Code 的扩展插件，为 GitHub Copilot Chat 添加中国 AI 模型支持。使用 DeepSeek、通义千问、智谱GLM、MiniMax、Moonshot Kimi 等国产顶级大模型，更懂中文，更适合中国开发者。

### 核心特点

- 🇨🇳 **国产顶级模型**: Qwen3.7 系列、DeepSeek V4、GLM-5、MiniMax M3、Mimo V2.5、Kimi K2.7 Code
- 💬 **无缝集成**: 直接在 GitHub Copilot Chat 中使用，无需切换界面
- 💰 **按次计费**: 请求数付费，成本可控，告别按月订阅
- 🔒 **安全可靠**: OAuth2 认证，代码不离开 VS Code
- 🧠 **深度思考**: 支持思维链推理，复杂问题迎刃而解

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
| Qwen3.7 Max | 阿里云 | ~1M 上下文，思维链推理 |
| Qwen3.6 Plus | 阿里云 | 1M token 上下文，80K 思维链，视觉 |
| Qwen3.6 Flash | 阿里云 | 1M token 上下文，支持思维链（默认） |
| Qwen3.7 Plus | 阿里云 | ~1M 上下文，视觉，深度思考 |
| DeepSeek V3.2 | DeepSeek | 深度思考，稀疏注意力 |
| GLM-5 | 智谱AI | 200K 上下文，思维链推理 |
| GLM-4.7 | 智谱AI | 200K 上下文，高级推理 |
| GLM 5.2 | 智谱AI | 1M 上下文，高级推理 |
| MiniMax M2.5 | MiniMax | 200K 上下文，思维链推理 |
| MiniMax M3 | MiniMax | 1M 上下文，高级推理 |
| Kimi K2.6 | Moonshot | 256K 上下文，思维链推理，视觉 |
| Kimi K2.7 Code | Moonshot | 256K 上下文，代码专精，视觉 |
| Mimo V2.5 | 小米 | 1M 上下文，视觉，高级推理 |
| Mimo V2.5 Pro | 小米 | 1M 上下文，视觉，推理（Pro） |
| DeepSeek V4 Pro | DeepSeek | 1M token 上下文，深度思考 |
| DeepSeek V4 Flash | DeepSeek | 1M token 上下文，快速响应 |
| GLM 5.1 | 智谱AI | 202K 上下文，强大推理 |

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