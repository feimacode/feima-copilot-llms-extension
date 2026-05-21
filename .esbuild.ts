/*---------------------------------------------------------------------------------------------
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.dirname(__filename);
const isWatch = process.argv.includes('--watch');
const isDev = process.argv.includes('--dev');

const baseBuildOptions = {
	bundle: true,
	logLevel: 'info',
	minify: !isDev,
	outdir: './dist',
	sourcemap: isDev ? 'linked' : false,
	sourcesContent: false,
	treeShaking: true
} satisfies esbuild.BuildOptions;

const extensionBuildOptions = {
	...baseBuildOptions,
	entryPoints: [
		{ in: './src/extension/extension.ts', out: 'extension' },
	],
	external: [
		'vscode' // the vscode-module is created on-the-fly and must be excluded
	],
	platform: 'node',
	mainFields: ["module", "main"],
	format: 'cjs', // CommonJS format for VS Code extensions
	// Bake the region into the bundle so activeRegionConfig resolves correctly at runtime.
	// FEIMA_REGION must be set in the environment before building (defaults to 'cn').
	define: {
		'process.env.FEIMA_REGION': JSON.stringify(process.env.FEIMA_REGION || 'cn'),
	},
} satisfies esbuild.BuildOptions;

/**
 * Recursively substitute all `%key%` placeholder strings in a JSON value
 * using the provided NLS map. Non-matching placeholders are left as-is.
 */
function resolveNlsPlaceholders(value: unknown, nls: Record<string, string>): unknown {
	if (typeof value === 'string') {
		return value.replace(/%([^%]+)%/g, (_match, key) => nls[key] ?? _match);
	}
	if (Array.isArray(value)) {
		return value.map(item => resolveNlsPlaceholders(item, nls));
	}
	if (value !== null && typeof value === 'object') {
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			result[k] = resolveNlsPlaceholders(v, nls);
		}
		return result;
	}
	return value;
}

/**
 * Process package.json to substitute region-specific values.
 *
 * For production builds (`!isDev`) this also writes the resolved manifest back to
 * the root `package.json` so that `vsce package` bundles fully-resolved strings
 * (no `%placeholder%` tokens) and VS Code shows the correct display name /
 * description regardless of the user's UI locale.
 */
function processPackageJson() {
	const region = (process.env.FEIMA_REGION || 'cn') as 'cn' | 'global';
	console.log(`[build] Processing package.json for region: ${region}`);
	
	// Read source package.json
	const packageJsonPath = path.join(REPO_ROOT, 'package.json');
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
	
	// Read localization file based on region
	const nlsFile = region === 'cn' ? 'package.nls.zh-cn.json' : 'package.nls.json';
	const nlsPath = path.join(REPO_ROOT, nlsFile);
	const nls: Record<string, string> = JSON.parse(fs.readFileSync(nlsPath, 'utf-8'));
	
	// Resolve all %key% placeholders in the whole manifest using the region NLS.
	// This handles display strings (%extension.displayName%) AND default config
	// values (%default.auth.baseUrl%, %default.api.baseUrl%, etc.) in one pass.
	let processedPackage = resolveNlsPlaceholders(
		JSON.parse(JSON.stringify(packageJson)),
		nls
	) as Record<string, unknown>;

	// Update `name` from the NLS file (e.g. "copilot-cn-models" vs "copilot-more-llms")
	if (nls['extension.name']) {
		processedPackage['name'] = nls['extension.name'];
		console.log(`[build] Set name: ${nls['extension.name']}`);
	}

	// For production builds, write the resolved manifest back to the root package.json.
	// vsce reads the root package.json when creating the VSIX, so this ensures the
	// bundled manifest contains fully-resolved strings instead of %placeholder% tokens.
	if (!isDev) {
		fs.writeFileSync(packageJsonPath, JSON.stringify(processedPackage, null, '\t') + '\n', 'utf-8');
		console.log(`[build] Wrote resolved package.json to root (production build)`);
	}
}

async function main() {
	// Process package.json before building
	processPackageJson();
	
	if (isWatch) {
		const context = await esbuild.context(extensionBuildOptions);
		
		console.log('[watch] watching for changes...');
		await context.watch();
		console.log('[watch] build finished, watching for changes...');
		
		// Keep the process alive
		await new Promise(() => {
			// This promise never resolves, keeping the process running
			process.on('SIGINT', async () => {
				console.log('[watch] stopping...');
				await context.dispose();
				process.exit(0);
			});
		});
	} else {
		await esbuild.build(extensionBuildOptions);
		console.log('[build] build complete');
	}
}

main().catch((error) => {
	console.error('[build] build failed:', error);
	process.exit(1);
});
