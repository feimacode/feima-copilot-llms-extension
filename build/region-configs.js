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
        description: '加速创意落地 — 为 GitHub Copilot 提供中国顶级大模型支持：通义千问、DeepSeek、智谱 GLM、MiniMax、月之暗面等。',
		keywords: ['copilot', 'ai', 'qwen', 'deepseek', 'glm', 'minimax', 'kimi', '中文', '国产模型'],
		categories: ['AI', 'LLM', 'Programming Agents'],
		defaultAuthUrl: 'https://auth.feimacode.cn',
		defaultApiUrl: 'https://api.feimacode.cn/v1',
		promotionUrl: 'https://feimacode.cn/pricing',
		issuer: 'https://auth.feimacode.cn',
		icon: 'assets/ext-icon.png',
		readmePath: 'packages/regional/cn/README.md',
	},
	global: {
		extensionId: 'copilot-more-models',
		displayName: 'Feima Code Models',
		description: 'Access Claude, Gemini, Qwen and more models in VS Code Copilot Chat',
		keywords: ['copilot', 'ai', 'llm', 'claude', 'gemini', 'qwen', 'language-model'],
		categories: ['AI', 'Other'],
		defaultAuthUrl: 'https://auth.feimacode.com',
		defaultApiUrl: 'https://api.feimacode.com/v1',
		promotionUrl: 'https://feimacode.com/pricing',
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
