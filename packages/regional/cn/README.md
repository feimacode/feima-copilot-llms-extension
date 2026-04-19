# 飞码扣(Feima Copilot)

**一键接入 GitHub Copilot 到中国顶级大模型支持：通义千问、DeepSeek、智谱 GLM、MiniMax、月之暗面等**

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ 核心特性

- 🚀 **无需梯子** - 国内直连，稳定快速
- 🤖 **多模型支持** - Qwen、DeepSeek、智谱 GLM、MiniMax、月之暗面等主流模型
- 🔐 **安全登录** - 支持一键登录
- 💰 **灵活计费** - 按需付费，无订阅压力
- 🌐 **中文优化** - 完整中文界面和文档

## � 获取免费额度

在公测期间，飞码为用户提供多种方式获取免费额度：

- **每周赠送** - 每周自动获得 50 点积分，无需任何操作
- **邀请好友** - 邀请朋友注册，双方都能获得奖励积分
- **参与推广** - 定期推出特殊活动和优惠，赚取额外积分

[了解如何赚取更多额度 →](https://feimacode.cn/promotion)

## 🎯 支持的模型

| 模型 | 提供商 | 特点 | 价格 |
|------|--------|------|------|
| **Qwen Flash** | 阿里云 | 极速响应，100万token长文本 | 🟦 最便宜 |
| **Qwen3 Max** | 阿里云 | 高质量推理，256K token，支持思维链 | 🟩 标准 |
| **Qwen3 Coder Plus** | 阿里云 | 高级代码生成，100万token上下文 | 🟨 进阶 |
| **Qwen3.5 Plus** | 阿里云 | **最强推理**，100万token，80K思维链 | 🟧 专业 |
| **DeepSeek V3.2** | DeepSeek | 深度思考模型，稀疏注意力，代码能力强 | 🟩 标准 |
| **Qwen Coder Turbo** | 阿里云 | 快速代码补全（内测免费） | 🆓 免费 |
| **GLM-5** | 智谱 | 智谱最新模型，200K token，思维链推理 | 🟨 进阶 |
| **GLM-4.7** | 智谱 | 智谱高性能模型，200K token，思维链推理 | 🟩 标准 |
| **MiniMax M2.5** | MiniMax | 高效推理，200K token，思维链能力 | 🟩 标准 |
| **Kimi K2.5** | 月之暗面 | **超长文本**，256K token，思维链推理 | 🟩 标准 |

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

在 VS Code AI对话框中选择飞码模型

### 3. 开始对话

输入提示词开始您的代码之旅

## 💰 定价

采用按需付费模式，无订阅压力。在公测期间，通过多种方式获取免费额度：

- **每周赠送** - 自动获得 50 点积分/周 💝
- **邀请返利** - 邀请好友赚取奖励 🎁
- **活动赠送** - 参与社区活动赚额度 🏆
- **按量计费** - 用完后才需付费，透明无隐藏成本 ✨

**示例**：
- Qwen Flash（最便宜）：免费额度可用 **数百次对话**
- Qwen3 Max（标准价格）：免费额度可用 **数十次高级推理**

详细定价 & 积分计划：[feimacode.cn/pricing](https://feimacode.cn/pricing)

## 📸 截图

### 登录飞码扣
![登录界面](https://feimacode.cn/screenshots/cn/auth-selection-cn.png)

### 模型选择
![模型选择界面](https://feimacode.cn/screenshots/cn/model-selection-cn.png)

### 代码解释
![代码解释功能](https://feimacode.cn/screenshots/cn/code-explanation-cn.png)

### 对话界面
![AI 对话界面](https://feimacode.cn/screenshots/cn/chat-interface-cn.png)

## ❓ 常见问题

### 网络相关问题

**Q: 需要梯子吗？**
A: 不需要。飞码扣使用国内服务器（阿里云），无需任何网络代理即可正常使用。

**Q: 速度如何？**
A: 快速稳定。我们使用阿里云服务器，国内访问速度快，响应延迟低。具体响应时间取决于所选模型：
- Qwen Flash：极速响应，通常 1-3 秒
- Qwen3 Max：标准响应，通常 3-5 秒
- 思维链模型：深度推理需要更长时间，通常 5-15 秒

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
A: 是的，多个模型支持思维链。包括 Qwen3 Max（32K）、Qwen3.5 Plus（80K）、DeepSeek V3.2、GLM-5、GLM-4.7、MiniMax M2.5（32K）、Kimi K2.5（16K）。思维链功能可提高复杂问题的解决质量。


### 数据隐私

**Q: 我的代码会被存储吗？**
A: 不会。代码仅在请求时发送给 AI 模型进行处理，不会被存储或用于其他目的。详见我们的 [隐私政策](https://feimacode.cn/privacy)。

**Q: 对话记录会保存吗？**
A: 对话记录保存在您的本地设备，不会上传到服务器。您可以随时查看或删除历史对话。

### 计费相关

**Q: 如何计费？**
A: 按次计费，无订阅压力。计费公式：加权请求次数 = 模型倍率 × 上下文倍率。模型倍率从 0.1x（Qwen Flash）到 2.0x（Qwen3 Coder Plus）。

**Q: 公测期间如何获取免费额度？**
A: 多种方式获取：每周赠送（每周自动获得 50 点积分）、邀请好友（双方获得奖励）、参与活动（定期活动赚取额外积分）。[了解详情 →](https://feimacode.cn/promotion)

**Q: 如何查看剩余额度？**
A: 三种方式查看：状态栏（启用设置）、命令面板（"飞码: 查看账号"）、网站（feimacode.cn/dashboard）。


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

**更多问题？** 查看 [完整 FAQ](https://docs.feimacode.cn/zh/guides/faq) 或 [联系我们](mailto:support@feimacode.cn)

## 📚 文档

- **完整文档**：[docs.feimacode.cn](https://docs.feimacode.cn)
- **更新日志**：[CHANGELOG.md](../../CHANGELOG.md)

## 🤝 反馈与支持

- **问题反馈**：[GitHub Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- **功能建议**：[GitHub Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- **用户社区**：微信搜索 "飞码扣" 加入用户群

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

---

**飞码扣** - 让 AI 编程助手更懂中国开发者

[官网](https://feimacode.cn) | [定价](https://feimacode.cn/pricing) | [文档](https://docs.feimacode.cn)
