---
title: 开发设置
description: 为飞码扣贡献设置开发环境
---

# 开发设置

本指南帮助您设置用于为飞码扣做出贡献的开发环境。

## 前置要求

### 必需软件

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Git**
- **VS Code** >= 1.85.0

### VS Code 扩展

安装这些 VS Code 扩展用于开发：

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [TypeScript](https://marketplace.visualstudio.com/items?itemName=vscode.vscode-typescript-next)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)（可选）

## 获取源代码

### 克隆仓库

```bash
# 克隆仓库
git clone https://github.com/feimacode/feima-copilot-llms-extension.git
cd feima-copilot-llms-extension
```

### 验证分支

```bash
# 检查当前分支（应该是 main）
git branch

# 对于功能开发，创建新分支
git checkout -b feature/your-feature-name
```

## 安装依赖

```bash
# 安装所有依赖
npm install

# 验证安装
npm list --depth=0
```

## 项目结构

```
feima-copilot-llms-extension/
├── src/                      # 源代码
│   ├── extension.ts          # 扩展入口点
│   ├── auth/                 # 认证服务
│   ├── models/               # 语言模型提供器
│   ├── services/             # API 客户端
│   └── commands/             # VS Code 命令
├── docs/                     # 文档（Astro Starlight）
├── build/                    # 构建脚本
├── test/                     # 测试文件
├── dist/                     # 编译输出（不在 git 中）
├── docs-dist/                # 文档构建（不在 git 中）
├── package.json              # 扩展清单
├── tsconfig.json             # TypeScript 配置
├── .eslintrc.js              # ESLint 配置
└── .vscode/                  # VS Code 设置
```

## 构建扩展

### 编译 TypeScript

```bash
# 编译 TypeScript
npm run compile

# 或使用监视模式进行开发
npm run watch
```

编译输出将在 `dist/` 目录中。

### 验证构建

```bash
# 检查 dist/ 目录是否存在
ls -la dist/

# 应该看到：
# extension.js
# extension.js.map
```

## 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npm test -- src/auth/__tests__/oauthService.test.ts
```

## 在开发中运行扩展

### 启动扩展开发主机

1. 在 VS Code 中打开项目
2. 按 `F5` 或转到 运行 → 开始调试
3. 将打开一个新的 VS Code 窗口（扩展开发主机）

### 调试

扩展可以在扩展开发主机中调试：

1. 在 TypeScript 代码中设置断点
2. 按 `F5` 开始调试
3. 在新窗口中调试扩展

### 查看日志

1. 在扩展开发主机中，转到 查看 → 输出
2. 从下拉列表中选择 "飞码"
3. 查看扩展日志

## 代码风格和检查

### ESLint

```bash
# 运行 ESLint
npm run lint

# 自动修复检查问题
npm run lint:fix
```

### Prettier

```bash
# 格式化所有文件
npm run format

# 检查格式
npm run format:check
```

### 提交前钩子

项目使用提交前钩子：

```bash
# 安装 husky（如果尚未安装）
npm install --save-dev husky
npx husky install

# 添加提交前钩子
npx husky add .husky/pre-commit "npm run lint && npm run test"
```

## 配置

### 环境变量

创建 `.env` 文件用于本地开发（不提交）：

```env
# Feima API 配置
FEIMA_API_ENDPOINT=https://api.feimacode.cn
FEIMA_IDP_ENDPOINT=https://idp.feimacode.cn

# OAuth 配置
OAUTH_CLIENT_ID=vscode-feima-client
OAUTH_REDIRECT_URI=vscode://feima.cn-model-for-copilot/oauth/callback

# 调试设置
DEBUG=feima:*
LOG_LEVEL=debug
```

### TypeScript 配置

`tsconfig.json` 配置了：

- **严格模式**已启用
- **目标**：ES2022
- **模块**：CommonJS
- **源映射**已启用

## 常见开发任务

### 添加新命令

1. 在 `src/commands/` 中创建命令：

```typescript
// src/commands/myCommand.ts
import * as vscode from 'vscode';

export function registerMyCommand(context: vscode.ExtensionContext) {
  const command = vscode.commands.registerCommand('feima.myCommand', async () => {
    // 您的命令逻辑
    vscode.window.showInformationMessage('来自我的命令的问候！');
  });

  context.subscriptions.push(command);
}
```

2. 在 `src/extension.ts` 中注册命令：

```typescript
import { registerMyCommand } from './commands/myCommand';

export function activate(context: vscode.ExtensionContext) {
  // ... 其他代码
  registerMyCommand(context);
}
```

3. 添加到 `package.json`：

```json
{
  "contributes": {
    "commands": [
      {
        "command": "feima.myCommand",
        "title": "我的命令",
        "category": "Feima"
      }
    ]
  }
}
```

### 添加新语言模型

1. 将模型添加到 `src/models/`：

```typescript
// src/models/newModel.ts
import { LanguageModel } from './types';

export const newModel: LanguageModel = {
  id: 'new-model-id',
  name: '新模型',
  description: '新模型的描述',
  provider: '提供商名称',
  contextLength: 32000,
  maxOutputTokens: 4000,
  capabilities: {
    codeGeneration: true,
    codeReview: true,
    reasoning: true
  }
};
```

2. 在 `src/models/languageModelProvider.ts` 中注册模型：

```typescript
import { newModel } from './newModel';

// 添加到模型列表
private models: LanguageModel[] = [
  // ... 现有模型
  newModel
];
```

### 添加测试

1. 在 `src/**/__tests__/` 中创建测试文件：

```typescript
// src/auth/__tests__/myFeature.test.ts
import { myFunction } from '../myFeature';

describe('myFunction', () => {
  it('应该返回预期值', () => {
    const result = myFunction('input');
    expect(result).toBe('预期输出');
  });
});
```

2. 运行测试：

```bash
npm test
```

## 文档开发

文档使用 Astro Starlight 构建：

### 安装文档依赖

```bash
cd docs
npm install
```

### 运行文档开发服务器

```bash
cd docs
npm run dev
```

访问 http://localhost:4321 查看文档。

### 构建文档

```bash
cd docs
npm run build
```

输出将在 `docs-dist/` 中。

## Git 工作流程

### 分支命名

- `feature/feature-name` - 新功能
- `fix/bug-description` - 错误修复
- `docs/documentation-update` - 文档更新
- `refactor/refactor-description` - 重构

### 提交消息

使用约定式提交：

```
feat: 添加新功能
fix: 解决认证错误
docs: 更新安装指南
test: 为认证服务添加测试
refactor: 简化令牌刷新逻辑
```

### 拉取请求流程

1. Fork 仓库
2. 创建功能分支
3. 进行更改
4. 运行测试和检查
5. 提交您的更改
6. 推送到您的 fork
7. 创建拉取请求

## 故障排除

### 构建错误

**问题**：TypeScript 编译失败

**解决方案**：
```bash
# 清理构建产物
npm run clean
rm -rf dist/

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 重新构建
npm run compile
```

### 扩展未激活

**问题**：扩展在扩展开发主机中未激活

**解决方案**：
1. 检查输出面板 → "扩展主机" 中的错误
2. 验证 `package.json` `activationEvents` 正确
3. 检查 `src/extension.ts` 是否有正确的 `activate()` 函数

### 认证问题

**问题**：无法在开发中认证

**解决方案**：
1. 验证 `.env` 文件已配置
2. 检查 feima-idp 是否可访问
3. 查看输出面板 → "飞码" 获取详细日志

## 资源

- [VS Code 扩展 API](https://code.visualstudio.com/api)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Astro Starlight 文档](https://starlight.astro.build/)
- [项目仓库](https://github.com/feimacode/feima-copilot-llms-extension)

## 下一步

- [测试指南](./testing.md) - 如何编写测试
- [构建指南](./building.md) - 构建和打包扩展
- [API 参考](../reference/api.md) - 扩展 API

## 需要帮助？

- 🐛 [报告问题](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [讨论](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [邮件支持](mailto:support@feimacode.cn)