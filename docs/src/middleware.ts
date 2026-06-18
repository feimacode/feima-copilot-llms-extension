import { defineMiddleware } from 'astro:middleware';

/**
 * Fixes double locale prefix on VS Code Copilot sidebar links.
 *
 * The VS Code Copilot docs are Chinese-only. Sidebar links use
 *   link: '/zh/vscode-copilot/...'
 * so that English users land on the Chinese content directly.
 *
 * Starlight auto-prepends the locale prefix to `link` values, which means
 * on ZH pages the links become /zh/zh/vscode-copilot/... — broken.
 *
 * This middleware strips the duplicate /zh/ prefix.
 */
export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;

	// Fix double /zh/ prefix on VS Code Copilot paths
	// e.g., /zh/zh/vscode-copilot/overview/ → /zh/vscode-copilot/overview/
	if (pathname.startsWith('/zh/zh/')) {
		const fixed = pathname.replace('/zh/zh/', '/zh/');
		return context.redirect(fixed, 301);
	}

	return next();
});
