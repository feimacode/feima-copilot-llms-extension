/**
 * Shared region configuration for both build.ts and release.yml
 * 
 * This is the single source of truth for all region-specific settings.
 * Both the local build script and CI/CD workflows use these configs.
 * 
 * Usage:
 * - In build.ts: import as ES module
 * - In release.yml: node -e "const config = require('./build/region-configs.js'); ..."
 */

const REGION_CONFIGS = {
	cn: {
		extensionId: 'copilot-cn-models',
        displayName: '飞码扣(Feimacode)',
		description: '飞码扣 —— 为 GitHub Copilot Chat 接入 DeepSeek、通义千问 Qwen、智谱 GLM、MiniMax、Kimi 等顶级大模型；用你自己的 Claude/Codex/Copilot CLI 订阅在 VS Code 中原生驱动智能体；还提供本地代理，让 Copilot/BYOK 模型驱动任意工具。',
		keywords: ['copilot', 'ai', 'deepseek', 'qwen', '通义千问', 'glm', '智谱', 'minimax', 'kimi', '月之暗面', 'mimo', '小米', '中文', '国产模型', 'claude', 'codex', 'copilot cli', '订阅', '本地代理', 'model provider'],
		categories: ['AI', 'LLM', 'Programming Agents'],
		defaultAuthUrl: 'https://auth.feimacode.com',
		defaultApiUrl: 'https://api.feimacode.com/v1',
		promotionUrl: 'https://feimacode.com/pricing',
		websiteBaseUrl: 'https://feimacode.com',
		issuer: 'https://auth.feimacode.com',
		icon: 'assets/ext-icon.png',
		readmePath: 'packages/regional/cn/README.md',
	},
	global: {
		extensionId: 'copilot-more-llms',
		displayName: 'Feima Copilot Models',
		description: 'Feima Copilot — more models for GitHub Copilot Chat (DeepSeek, Qwen, GLM, MiniMax, Kimi), native Claude Code/Codex/Copilot CLI agents on your own subscription, and a local proxy to power any tool with Copilot or BYOK models.',
		keywords: ['copilot', 'ai', 'llm', 'deepseek', 'qwen', 'glm', 'minimax', 'kimi', 'moonshot', 'mimo', 'language-model', 'coding-assistant', 'model provider', 'claude', 'codex', 'copilot cli', 'subscription', 'local proxy', 'llm proxy'],
		categories: ['AI', 'Other'],
		defaultAuthUrl: 'https://auth.feimacode.com',
		defaultApiUrl: 'https://api.feimacode.com/v1',
		promotionUrl: 'https://feimacode.com/pricing',
		websiteBaseUrl: 'https://feimacode.com',
		issuer: 'https://auth.feimacode.com',
		icon: 'assets/ext-icon.png',
		readmePath: 'packages/regional/global/README.md',
	},
};

// Support both CommonJS (for Node scripts in workflows) and ES modules (for build.ts)
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { REGION_CONFIGS };
}

export { REGION_CONFIGS };
