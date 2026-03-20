# 飞码扣 (Feima Copilot)

> 为 GitHub Copilot 提供中国 AI 模型支持的 VS Code 扩展

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/feima-tech/feima-copilot-llms-extension?style=flat-square)](https://github.com/feimacode/feima-copilot-llms-extension)

## 快速链接

- 📖 [文档](https://feimacode.cn/docs/) | [中文文档](https://docs.feima.cn/)
- 🚀 [快速入门](https://feimacode.cn/docs/guides/quickstart/) | [快速入门（中文）](https://docs.feima.cn/guides/quickstart/)
- 📦 [安装指南](https://feimacode.cn/docs/guides/installation/) | [安装指南（中文）](https://docs.feima.cn/guides/installation/)
- 🔧 [配置选项](https://feimacode.cn/docs/guides/configuration/) | [配置选项（中文）](https://docs.feima.cn/guides/configuration/)
- 💻 [开发指南](https://feimacode.cn/docs/dev/setup/) | [开发指南（中文）](https://docs.feima.cn/dev/setup/)

## 简介

飞码扣是 VS Code 的扩展插件，为 GitHub Copilot Chat 添加中国 AI 模型支持，让你在使用 Copilot 的同时，也能使用 DeepSeek、通义千问、混元等更懂中文的国产模型，以及通过飞码加速访问 GPT-4、Claude、Gemini 等海外顶级模型。

### 核心特点

- 🇨🇳 **国产模型支持**: DeepSeek Coder V2、通义千问3 Coder、腾讯混元
- 🚀 **海外模型加速**: GPT-4o、Claude 3.5 Sonnet、Gemini 1.5 Pro（通过飞码加速）
- 💬 **无缝集成**: 直接在 GitHub Copilot Chat 中使用，无需切换界面
- 💰 **按次计费**: 请求数付费，成本可控，告别按月订阅
- 🔒 **安全可靠**: OAuth2 认证，代码不离开 VS Code

### 为什么选择飞码扣？

| 对比项 | GitHub Copilot 原生 | 飞码扣增强版 |
|--------|-------------------|-------------|
| 中文理解 | ✅ 良好 | 🔥 **优秀**（国产模型） |
| 海外模型连接 | ⚠️ 不稳定（GFW） | ✅ **稳定加速** |
| 模型选择 | 3-4 个 | 🎉 **6+ 个模型** |
| 付费方式 | 按月订阅 | 💡 **按次付费** |

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

## 安装

```bash
# 从 VS Code Marketplace 安装
code --install-extension feima-tech.feima-copilot

# 或在 VS Code 中搜索 "Feima Copilot"
```

## 贡献

我们欢迎社区贡献！请查看[完整文档](https://feimacode.cn/docs/dev/setup/)了解如何参与开发。

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
- [中文文档](https://docs.feima.cn/)
- [英文文档](https://feimacode.cn/docs/)

## 支持与联系

- 🐛 [报告问题](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [功能建议](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [邮件支持](mailto:support@feimacode.cn)

## 开源协议

MIT License - 详见 [LICENSE](LICENSE) 文件

---

<p align="center">
  <strong>更懂中文，连接更稳</strong><br>
  Made with ❤️ by <a href="https://feimacode.cn">Feima Team</a>
</p>