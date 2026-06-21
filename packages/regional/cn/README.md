# 飞码扣(Feima Copilot)

**一键接入 GitHub Copilot 到中国顶级大模型支持：通义千问、DeepSeek、智谱 GLM、MiniMax、月之暗面等**

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ 核心特性

- 🚀 **无需梯子** - 国内直连，稳定快速
- 🤖 **多模型支持** - Qwen、DeepSeek、智谱 GLM、MiniMax、小米、月之暗面等主流模型
- �️ **视觉支持** - 支持图片上传和视觉理解，可直接分析截图、设计稿、报错信息
- �🔐 **安全登录** - 支持一键登录
- 💰 **灵活计费** - 按需付费，无订阅压力
- 🌐 **中文优化** - 完整中文界面和文档

## � 获取免费额度

在公测期间，飞码为用户提供多种方式获取免费额度：

- **每周赠送** - 每周自动获得 50 点积分，无需任何操作
- **邀请好友** - 邀请朋友注册，双方都能获得奖励积分
- **参与推广** - 定期推出特殊活动和优惠，赚取额外积分

[了解如何赚取更多额度 →](https://feimacode.com/promotion)

## 🎯 支持的模型

| 模型 | 提供商 | 特点 | 价格 |
|------|--------|------|------|
| **Qwen3.6 Flash** | 阿里云 | 极速响应，100万token长文本（默认） | 🟦 最便宜 |
| **Qwen3.7 Max** | 阿里云 | 高质量推理，~1M token，支持思维链 | 🟩 标准 |
| **Qwen3.6 Plus** | 阿里云 | **最强推理**，1M token，80K思维链，视觉 | 🟧 专业 |
| **Qwen3.7 Plus** | 阿里云 | ~1M token，视觉，深度思考 | 🟧 专业 |
| **DeepSeek V4 Pro** | DeepSeek | 100万 token 上下文，深度思考 | 🟧 专业 |
| **DeepSeek V4 Flash** | DeepSeek | 100万 token 上下文，快速响应 | 🟩 标准 |
| **GLM-5** | 智谱 | 智谱最新模型，200K token，思维链推理 | 🟨 进阶 |
| **GLM-4.7** | 智谱 | 智谱高性能模型，200K token，思维链推理 | 🟩 标准 |
| **GLM 5.2** | 智谱 | 1M token 上下文，高级推理 | 🟨 进阶 |
| **MiniMax M2.5** | MiniMax | 高效推理，200K token，思维链能力 | 🟩 标准 |
| **Kimi K2.6** | 月之暗面 | **超长文本**，256K token，思维链推理，视觉 | 🟩 标准 |
| **Kimi K2.7 Code** | 月之暗面 | 256K token，代码专精，视觉 | 🟩 标准 |
| **Mimo V2.5** | 小米 | 1M token 上下文，视觉，高级推理 | 🟩 标准 |
| **Mimo V2.5 Pro** | 小米 | 1M token 上下文，视觉，推理（Pro） | 🟧 专业 |

## 📦 安装

### 方式一：VS Code 扩展市场

1. 打开 VS Code
2. 按 `Ctrl+Shift+X` 打开扩展市场
3. 搜索 "飞码扣"或"Feima"
4. 点击 "安装"

### 方式二：手动安装

1. 从 [GitHub Releases](https://github.com/feimacode/feima-copilot-llms-extension/releases) 下载 `.vsix` 文件
2. 在 VS Code 中按 `Ctrl+Shift+P`
3. 输入 "Extensions: Install from VSIX"
4. 选择下载的 `.vsix` 文件

## 🚀 快速开始

### 1. 登录认证

安装扩展后，首次使用需要登录


### 2. 选择模型

在 VS Code AI对话框中选择飞码模型(所有飞码模型以`[Feima]`开头)

### 3. 开始对话

输入提示词开始您的AI代码之旅

### 🔑 API Key 支持

飞码扣不仅支持 VS Code 扩展，还提供 API Key 供其他工具使用：

- **Copilot CLI** - 在命令行中使用飞码模型
- **Claude Code** - 通过 Anthropic 兼容 API 原生支持
- **其他 CLI 工具** - 支持任何兼容 OpenAI 或 Anthropic API 的工具
- **自定义集成** - 构建自己的应用和工具

我们同时支持 **OpenAI 兼容** 和 **Anthropic 兼容** 两种 API 格式，让您可以自由选择喜爱的工具。

获取 API Key：
1. 登录飞码账号
2. 访问 [个人设置](https://feimacode.com/profile)
3. 在 API Key 管理页面创建新密钥
4. 将密钥配置到您的 CLI 工具中

API Key 使用相同的计费系统，无需额外订阅。

## 💰 定价

按需付费模式，无订阅压力。在公测期间，通过多种方式获取免费额度：

- **首月赠送** - 注册即得 500 点积分 + 每周 50 点 = **首月 700 点** 🎉
- **每周赠送** - 自动获得 50 点积分/周 💝
- **邀请返利** - 邀请好友赚取奖励 🎁
- **按量计费** - 预付费，透明无隐藏成本 ✨

### 🆚 相比 GitHub Copilot 计费的优势

| 特性 | GitHub Copilot | 飞码扣 |
|------|---------------|-------|
| **计费模式** | 按用量（token） | 按请求次数 |
| **费用控制** | 可能产生意外账单 | 预付费，无意外 |
| **免费额度** | 仅限轻量模型（Haiku 4.5、GPT-5 mini） | ✅ 月700次，所有模型可用 |
| **价格** | $10/月 + 超额费用 | $10 一次性（500次） |

**关键优势**：飞码扣免费额度比 Copilot Pro（$10/月）多 **2-12 倍请求次数**！

📄 **完整对比**：[为什么飞码扣是 GitHub Copilot 最佳替代方案](https://feimacode.com/copilot-alternative)

详细定价 & 积分计划：[feimacode.com/pricing](https://feimacode.com/pricing)

## 📸 截图

### 登录飞码扣
![登录界面](https://feimacode.com/screenshots/cn/auth-selection-cn.png)

### 模型选择
![模型选择界面](https://feimacode.com/screenshots/cn/model-selection-cn.png)

### 代码解释
![代码解释功能](https://feimacode.com/screenshots/cn/code-explanation-cn.png)

### 对话界面
![AI 对话界面](https://feimacode.com/screenshots/cn/chat-interface-cn.png)

## ❓ 常见问题


### VS Code 版本

**Q: 支持哪些 VS Code 版本？**
A: 支持 VS Code 1.85.0 及以上版本。建议使用最新版 VS Code 以获得最佳体验。

**Q: 支持 VS Code Insiders 吗？**
A: 是的，完全支持。VS Code Insiders 版本与稳定版功能一致。

**Q: 支持 VSCodium 吗？**
A: 目前不支持。飞码扣依赖 GitHub Copilot Chat 扩展，而 VSCodium 不包含该扩展。

### 功能支持

**Q: 是否支持 Custom Agent？**
A: 是的，和原生 Copilot 一样支持。飞码扣作为 GitHub Copilot Chat 的模型提供器，完全支持 Custom Agent、Skills、constitution.md、prompts.md 和 instructions.md，与原生 Copilot 的功能体验一致。

**Q: 是否支持 Skills？**
A: 是的，和原生 Copilot 一样支持。飞码扣完全支持 Skills 功能，同样支持 constitution.md、prompts.md 和 instructions.md 配置文件。

**Q: 是否支持工具调用（Tool Calls）？**
A: 是的，支持工具调用。所有聊天模型都支持工具调用功能，包括代码执行、文件操作、API 调用等。

**Q: 是否支持思维链（Thinking）？**
A: 是的，多个模型支持思维链。包括 Qwen3.7 Max（983K）、Qwen3.6 Plus（80K）、Qwen3.7 Plus（983K）、DeepSeek V3.2、DeepSeek V4 Pro、DeepSeek V4 Flash、GLM-5、GLM-4.7、MiniMax M2.5（32K）、Kimi K2.6（16K）。思维链功能可提高复杂问题的解决质量。

**Q: 是否支持视觉（Vision）？**
A: 是的，支持图片上传和视觉理解。您可以直接在对话框中粘贴图片、上传截图或拖拽图片文件，AI 将分析图片内容并回答相关问题。适用于分析报错截图、设计稿、图表、代码片段等场景。

**Q: 哪些模型支持视觉？**
A: 目前 **Qwen3.6 Plus**、**Qwen3.7 Plus** 和 **Kimi K2.6** 支持视觉功能。在对话中点击输入框下方的图片按钮或直接使用 `Ctrl+V` 粘贴图片即可。视觉功能按正常请求计费，无额外费用。


### 数据隐私

**Q: 我的代码会被存储吗？**
A: 不会。代码仅在请求时发送给 AI 模型进行处理，不会被存储或用于其他目的。详见我们的 [隐私政策](https://feimacode.com/privacy)。

**Q: 对话记录会保存吗？**
A: 对话记录保存在您的本地设备，不会上传到服务器。您可以随时查看或删除历史对话。

### 计费相关

**Q: 如何计费？**
A: 按次计费，无订阅压力。计费公式：加权请求次数 = 模型倍率 × 上下文倍率。模型倍率从 0.1x（Qwen Flash）到 2.0x（Qwen3 Coder Plus）。

**Q: 公测期间如何获取免费额度？**
A: 多种方式获取：每周赠送（每周自动获得 50 点积分）、邀请好友（双方获得奖励）、参与活动（定期活动赚取额外积分）。[了解详情 →](https://feimacode.com/promotion)

**Q: 如何查看剩余额度？**
A: 三种方式查看：状态栏（启用设置）、命令面板（"飞码: 查看账号"）、[网站](https://feimacode.com/profile)。


### 登录认证

**Q: 如何登录？**
A: OAuth2 一键登录。按 `Ctrl+Shift+P` → 输入 "飞码: 登录" → 浏览器打开认证页面 → 使用 GitHub 账号登录 → 授权后自动返回 VS Code。

**Q: 支持哪些登录方式？**
A: 目前支持 GitHub 登录。未来计划支持微信登录和邮箱登录。

**Q: 登录失败怎么办？**
A: 检查网络连接、默认浏览器设置、回调超时（5 分钟过期）、防火墙设置。如仍无法解决，请联系我们。

### 故障排除

**Q: 模型选择器中找不到飞码模型？**
A: 确保已登录（"飞码: 查看账号"）、检查输出面板错误消息、重新加载 VS Code 窗口。

**Q: 请求失败或超时？**
A: 检查额度是否充足、网络连接是否正常、会员等级是否满足模型要求、上下文是否过大。

**Q: 如何报告 Bug？**
A: 通过 [GitHub Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues) 报告，描述问题、重现步骤、预期结果，附上相关日志或截图。

**更多问题？** 查看 [完整 FAQ](https://docs.feimacode.com/zh/guides/faq) 或 [联系我们](mailto:support@feimacode.com)

## 📚 文档

- **完整文档**：[docs.feimacode.com](https://docs.feimacode.com)
- **更新日志**：[CHANGELOG.md](../../CHANGELOG.md)

## 🤝 反馈与支持

- **问题反馈**：[GitHub Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- **功能建议**：[GitHub Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- **用户社区**：微信搜索 "飞码扣" 加入用户群

## � 微信交流群

扫码加入飞码扣用户交流群，获取最新资讯和技术支持：

![微信群二维码](https://feimacode.com/wechat-barcode.png)

## �📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

---

**飞码扣** - 让 AI 编程助手更懂中国开发者

[官网](https://feimacode.com) | [定价](https://feimacode.com/pricing) | [文档](https://docs.feimacode.com)
