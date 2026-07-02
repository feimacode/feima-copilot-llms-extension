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
		description: '一键接入 GitHub Copilot 国产顶级大模型：DeepSeek、通义千问 Qwen、智谱 GLM、MiniMax、月之暗面 Kimi、小米 Mimo，按次计费、中文优化、思维链与视觉支持。',
		keywords: ['copilot', 'ai', 'deepseek', 'qwen', '通义千问', 'glm', '智谱', 'minimax', 'kimi', '月之暗面', 'mimo', '小米', '中文', '国产模型'],
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
		description: 'Add DeepSeek, Qwen, GLM, MiniMax, Kimi, Mimo and more top LLMs to GitHub Copilot Chat in VS Code. Pay-as-you-go, OAuth sign-in, chain-of-thought and vision support.',
		keywords: ['copilot', 'ai', 'llm', 'deepseek', 'qwen', 'glm', 'minimax', 'kimi', 'moonshot', 'mimo', 'language-model', 'coding-assistant'],
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
