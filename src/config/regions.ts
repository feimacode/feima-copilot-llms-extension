/**
 * Region Configuration Objects
 * Defines region-specific settings loaded at build time
 */

import * as vscode from 'vscode';
import { RegionConfig, RegionType } from './types';

/**
 * China (CN) region configuration
 * - Marketplace: VS Code Marketplace (China region)
 * - Auth: WeChat, Weibo, phone-based
 * - Models: Qwen, LLaMA, ChatGLM
 * - API: China-region endpoint with low latency
 */
export const cnRegionConfig: RegionConfig = {
	region: 'cn',
	extensionId: 'copilot-cn-models',
	publisher: 'feima',
	defaultAuthEndpoint: 'https://auth.feimacode.cn',
	defaultApiEndpoint: 'https://api.feimacode.cn/v1',
	defaultClientId: 'vscode-feima-client',
	defaultIssuer: 'https://auth.feimacode.cn',
	scopes: ['openid', 'profile', 'email'],
	marketplaceUrl: 'https://marketplace.visualstudio.com/items?itemName=feima.copilot-cn-models',
	repositoryUrl: 'https://github.com/feimacode/feima-copilot-llms-extension',
	promotionUrl: 'https://feimacode.cn/promotion',
	websiteBaseUrl: 'https://feimacode.cn',
	enforceEnglish: false,
};

/**
 * Global region configuration
 * - Marketplace: VS Code Marketplace (Global)
 * - Auth: GitHub, Google, email-based
 * - Models: Claude, GPT-4, GPT-3.5-turbo
 * - API: Global endpoint with multi-region support
 */
export const globalRegionConfig: RegionConfig = {
	region: 'global',
	extensionId: 'copilot-more-llms',
	publisher: 'feima',
	defaultAuthEndpoint: 'https://auth.feimacode.com',
	defaultApiEndpoint: 'https://api.feimacode.com/v1',
	defaultClientId: 'vscode-feima-client',
	defaultIssuer: 'https://auth.feimacode.com',
	scopes: ['openid', 'profile', 'email'],
	marketplaceUrl: 'https://marketplace.visualstudio.com/items?itemName=feima.copilot-more-llms',
	repositoryUrl: 'https://github.com/feimacode/feima-copilot-llms-extension',
	promotionUrl: 'https://feimacode.com/promotion',
	websiteBaseUrl: 'https://feimacode.com',
	enforceEnglish: true,
};

/**
 * Region configuration registry
 */
export const regionConfigs: Record<RegionType, RegionConfig> = {
	cn: cnRegionConfig,
	global: globalRegionConfig,
};

/**
 * Get region configuration by region type
 */
export function getRegionConfig(region: RegionType): RegionConfig {
	const config = regionConfigs[region];
	if (!config) {
		throw new Error(vscode.l10n.t('Unknown region: {0}', region));
	}
	return config;
}

/**
 * This constant will be set at build time based on FEIMA_REGION environment variable
 * Build process: `FEIMA_REGION=cn npm run build` sets this to 'cn'
 * Cannot be changed at runtime - region is immutable per extension variant
 */
export const FEIMA_REGION: RegionType = (process.env.FEIMA_REGION as RegionType) || 'global';

/**
 * Active region configuration for this build
 * This is what the extension actually uses at runtime
 */
export const activeRegionConfig: RegionConfig = getRegionConfig(FEIMA_REGION);

/**
 * Derived OAuth2 endpoints from activeRegionConfig
 * These replace the hardcoded OAUTH2_ENDPOINTS from old config.ts
 */
export const getOAuth2Endpoints = () => {
	return {
		authorizationEndpoint: `${activeRegionConfig.defaultAuthEndpoint}/oauth/authorize`,
		tokenEndpoint: `${activeRegionConfig.defaultAuthEndpoint}/oauth/token`,
		revocationEndpoint: `${activeRegionConfig.defaultAuthEndpoint}/oauth/revoke`,
		userinfoEndpoint: `${activeRegionConfig.defaultAuthEndpoint}/oauth/userinfo`,
	} as const;
};

/**
 * Convenience export for OAuth config used in authentication
 */
export const getOAuthConfig = () => ({
	authBaseUrl: activeRegionConfig.defaultAuthEndpoint,
	apiBaseUrl: activeRegionConfig.defaultApiEndpoint,
	clientId: activeRegionConfig.defaultClientId,
	issues: activeRegionConfig.defaultIssuer,
	scopes: activeRegionConfig.scopes,
}) as const;
