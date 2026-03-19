#!/usr/bin/env node
/**
 * Master Build Script for Multi-Region Extension
 * 
 * Usage:
 *   FEIMA_REGION=cn npm run build:cn
 *   FEIMA_REGION=global npm run build:global
 *   npm run build:all
 * 
 * Builds the extension VSIX packages for different regions
 * - CN variant: feima-copilot-cn-models-{version}.vsix
 * - Global variant: feima-copilot-more-models-{version}.vsix
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Region-specific configuration
const REGION_CONFIGS = {
	cn: {
		extensionId: 'copilot-cn-models',
		displayName: '飞码 AI 模型',
		description: '国产 AI 模型扩展，支持 Qwen、DeepSeek 等模型，国内直连无需梯子',
		keywords: ['copilot', 'ai', 'qwen', 'deepseek', '中文', '国产模型'],
		categories: ['AI', 'Other'],
		defaultAuthUrl: 'https://auth.feimacode.cn',
		defaultApiUrl: 'https://api.feimacode.cn/v1',
		promotionUrl: 'https://feimacode.cn/pricing',
		issuer: 'https://auth.feimacode.cn',
		icon: 'assets/feima-icon.png',
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
		icon: 'assets/feima-icon.png',
		readmePath: 'packages/regional/global/README.md',
	},
};

interface BuildConfig {
	region: 'cn' | 'global';
	startTime: Date;
	buildDir: string;
	version: string;
	extensionId: string;
}

interface BuildResult {
	success: boolean;
	region: string;
	vsixFile: string;
	checksumFile: string;
	duration: number;
	message: string;
	bundleSize?: number;
}

class BuildSystem {
	private config: BuildConfig;
	private originalPackageJson: string | null = null;
	private originalReadme: string | null = null;
	private results: BuildResult[] = [];

	constructor(region: 'cn' | 'global') {
		const packageJson = this.readPackageJson();
		this.config = {
			region,
			startTime: new Date(),
			buildDir: path.join(PROJECT_ROOT, 'dist', region),
			version: packageJson.version,
			extensionId: REGION_CONFIGS[region].extensionId,
		};
	}

	/**
	 * Read the root package.json
	 */
	private readPackageJson(): Record<string, unknown> {
		const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
		const content = fs.readFileSync(packageJsonPath, 'utf-8');
		return JSON.parse(content);
	}

	/**
	 * Validate build prerequisites
	 */
	async validatePrerequisites(): Promise<boolean> {
		try {
			console.log(`\n🔍 Validating prerequisites for region: ${this.config.region}`);

			// Check if package.json exists
			const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
			if (!fs.existsSync(packageJsonPath)) {
				throw new Error('package.json not found');
			}

			// Check if TypeScript config exists
			const tsconfigPath = path.join(PROJECT_ROOT, 'tsconfig.json');
			if (!fs.existsSync(tsconfigPath)) {
				throw new Error('tsconfig.json not found');
			}

			// Check if regional README exists
			const regionConfig = REGION_CONFIGS[this.config.region];
			const readmePath = path.join(PROJECT_ROOT, regionConfig.readmePath);
			if (!fs.existsSync(readmePath)) {
				console.warn(`⚠️  Regional README not found: ${readmePath}`);
				// Don't fail, README can be added later
			}

			// Check if icon exists
			const iconPath = path.join(PROJECT_ROOT, regionConfig.icon);
			if (!fs.existsSync(iconPath)) {
				console.warn(`⚠️  Icon not found: ${iconPath}`);
				// Don't fail, icon can be added later
			}

			console.log('✅ Validation passed');
			return true;
		} catch (error) {
			console.error('❌ Validation failed:', error);
			return false;
		}
	}

	/**
	 * Backup original files before modification
	 */
	private backupOriginalFiles(): void {
		const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
		const readmePath = path.join(PROJECT_ROOT, 'README.md');

		if (fs.existsSync(packageJsonPath)) {
			this.originalPackageJson = fs.readFileSync(packageJsonPath, 'utf-8');
		}

		if (fs.existsSync(readmePath)) {
			this.originalReadme = fs.readFileSync(readmePath, 'utf-8');
		}
	}

	/**
	 * Restore original files after packaging
	 */
	restoreOriginalFiles(): boolean {
		try {
			console.log('🔄 Restoring original files...');

			if (this.originalPackageJson) {
				const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
				fs.writeFileSync(packageJsonPath, this.originalPackageJson, 'utf-8');
				console.log('✅ package.json restored');
			}

			if (this.originalReadme) {
				const readmePath = path.join(PROJECT_ROOT, 'README.md');
				fs.writeFileSync(readmePath, this.originalReadme, 'utf-8');
				console.log('✅ README.md restored');
			}

			return true;
		} catch (error) {
			console.error('❌ Failed to restore original files:', error);
			return false;
		}
	}

	/**
	 * Generate region-specific package.json
	 * Reads directly from root package.json (source of truth) and applies region overrides
	 */
	private generateRegionPackageJson(): void {
		const regionConfig = REGION_CONFIGS[this.config.region];
		
		// Read root package.json as the source of truth
		const rootPackageJson = this.readPackageJson();

		// Create region-specific package.json by merging root with region config
		// This ensures all changes to root package.json are automatically included
		const resolvedPackage = {
			...rootPackageJson,
			// Override region-specific fields
			name: regionConfig.extensionId,
			displayName: regionConfig.displayName,
			description: regionConfig.description,
			keywords: regionConfig.keywords,
			categories: regionConfig.categories,
			icon: regionConfig.icon,
			galleryBanner: {
				color: '#1a1a2e',
				theme: 'dark',
			},
		};

		// Update configuration defaults with resolved URLs
		if (resolvedPackage.contributes?.configuration?.properties) {
			const props = resolvedPackage.contributes.configuration.properties;
			if (props['feima.auth.baseUrl']) {
				props['feima.auth.baseUrl'].default = regionConfig.defaultAuthUrl;
			}
			if (props['feima.api.baseUrl']) {
				props['feima.api.baseUrl'].default = regionConfig.defaultApiUrl;
			}
			if (props['feima.auth.issuer']) {
				props['feima.auth.issuer'].default = regionConfig.issuer;
			}
			if (props['feima.promotionUrl']) {
				props['feima.promotionUrl'].default = regionConfig.promotionUrl;
			}
		}

		// Write to root package.json (will be restored later)
		const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
		fs.writeFileSync(packageJsonPath, JSON.stringify(resolvedPackage, null, '\t'), 'utf-8');
		console.log(`✅ Generated region-specific package.json for ${this.config.region}`);
	}

	/**
	 * Copy regional README to root
	 */
	private copyRegionalReadme(): void {
		const regionConfig = REGION_CONFIGS[this.config.region];
		const sourcePath = path.join(PROJECT_ROOT, regionConfig.readmePath);
		const destPath = path.join(PROJECT_ROOT, 'README.md');

		if (fs.existsSync(sourcePath)) {
			fs.copyFileSync(sourcePath, destPath);
			console.log(`✅ Copied regional README from ${regionConfig.readmePath}`);
		} else {
			console.warn(`⚠️  Regional README not found at ${sourcePath}, using existing README.md`);
		}
	}

	/**
	 * Build VSIX package for the configured region
	 */
	async buildVsix(): Promise<{ success: boolean; vsixPath: string | null }> {
		try {
			console.log(`\n📦 Building VSIX for region: ${this.config.region}`);

			// Backup original files
			this.backupOriginalFiles();

			// Generate region-specific package.json
			this.generateRegionPackageJson();

			// Copy regional README
			this.copyRegionalReadme();

			// Ensure dist directory exists
			fs.mkdirSync(this.config.buildDir, { recursive: true });

			// Build the VSIX
			const vsixFilename = `feima-${this.config.extensionId}-${this.config.version}.vsix`;
			const vsixPath = path.join(this.config.buildDir, vsixFilename);

			console.log(`🔨 Running vsce package...`);
			
			// Run vsce package command
			const cmd = `npx @vscode/vsce package --allow-star-activation --no-dependencies --out "${vsixPath}"`;
			execSync(cmd, { 
				cwd: PROJECT_ROOT, 
				stdio: 'inherit',
				env: { 
					...process.env, 
					FEIMA_REGION: this.config.region 
				}
			});

			// Check if VSIX was created
			if (fs.existsSync(vsixPath)) {
				const stats = fs.statSync(vsixPath);
				console.log(`✅ VSIX created: ${vsixFilename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
				
				// Validate VSIX size
				const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
				if (stats.size > maxSizeBytes) {
					console.warn(`⚠️  Warning: VSIX exceeds 5 MB limit (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
				}

				return { success: true, vsixPath };
			} else {
				throw new Error('VSIX file was not created');
			}
		} catch (error) {
			console.error('❌ VSIX build failed:', error);
			return { success: false, vsixPath: null };
		} finally {
			// Always restore original files
			this.restoreOriginalFiles();
		}
	}

	/**
	 * Generate SHA-256 checksum for a file
	 */
	generateChecksums(vsixPath: string): { success: boolean; checksumPath: string | null } {
		try {
			console.log(`🔐 Generating SHA-256 checksum...`);

			const checksumPath = `${vsixPath}.sha256`;
			
			// Use sha256sum on Linux, shasum on macOS
			let cmd: string;
			if (process.platform === 'darwin') {
				cmd = `shasum -a 256 "${vsixPath}" > "${checksumPath}"`;
			} else {
				cmd = `sha256sum "${vsixPath}" > "${checksumPath}"`;
			}

			execSync(cmd, { cwd: PROJECT_ROOT, stdio: 'pipe' });

			if (fs.existsSync(checksumPath)) {
				const checksumContent = fs.readFileSync(checksumPath, 'utf-8').trim();
				console.log(`✅ Checksum generated: ${checksumContent.split(' ')[0].substring(0, 16)}...`);
				return { success: true, checksumPath };
			} else {
				throw new Error('Checksum file was not created');
			}
		} catch (error) {
			console.error('❌ Checksum generation failed:', error);
			return { success: false, checksumPath: null };
		}
	}

	/**
	 * Validate the VSIX package
	 */
	async validateVsix(vsixPath: string): Promise<boolean> {
		try {
			console.log(`🔍 Validating VSIX...`);
			
			// Run vsce ls to validate (use --package-path with hyphens)
			const cmd = `npx @vscode/vsce ls --package-path "${vsixPath}"`;
			execSync(cmd, { cwd: PROJECT_ROOT, stdio: 'pipe' });
			
			console.log(`✅ VSIX validation passed`);
			return true;
		} catch (error) {
			console.error('❌ VSIX validation failed:', error);
			return false;
		}
	}

	/**
	 * Generate build summary report
	 */
	generateSummary(result: BuildResult): void {
		const duration = Date.now() - this.config.startTime.getTime();
		console.log(`\n📊 Build Summary`);
		console.log(`   Region: ${this.config.region.toUpperCase()}`);
		console.log(`   Extension ID: ${this.config.extensionId}`);
		console.log(`   Version: ${this.config.version}`);
		console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
		console.log(`   VSIX: ${result.vsixFile}`);
		console.log(`   Checksum: ${result.checksumFile}`);
		console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
	}

	/**
	 * Execute full build process
	 */
	async build(): Promise<boolean> {
		try {
			console.log('🚀 Feima Multi-Region Extension Build System');
			console.log(`   Building region: ${this.config.region.toUpperCase()}`);
			console.log(`   Version: ${this.config.version}`);

			// Step 1: Validate prerequisites
			const valid = await this.validatePrerequisites();
			if (!valid) {
				return false;
			}

			// Step 2: Build VSIX
			const { success: buildSuccess, vsixPath } = await this.buildVsix();
			if (!buildSuccess || !vsixPath) {
				return false;
			}

			// Step 3: Validate VSIX
			const validVsix = await this.validateVsix(vsixPath);
			if (!validVsix) {
				return false;
			}

			// Step 4: Generate checksums
			const { success: checksumSuccess, checksumPath } = this.generateChecksums(vsixPath);
			if (!checksumSuccess || !checksumPath) {
				return false;
			}

			// Generate summary
			const result: BuildResult = {
				success: true,
				region: this.config.region,
				vsixFile: path.basename(vsixPath),
				checksumFile: path.basename(checksumPath),
				duration: Date.now() - this.config.startTime.getTime(),
				message: 'Build completed successfully',
				bundleSize: fs.statSync(vsixPath).size,
			};

			this.generateSummary(result);
			return true;
		} catch (error) {
			console.error('❌ Build failed:', error);
			return false;
		}
	}
}

/**
 * Main entry point
 */
async function main() {
	const region = (process.env.FEIMA_REGION as 'cn' | 'global') || 'global';

	// Validate region
	if (region !== 'cn' && region !== 'global') {
		console.error(`❌ Invalid region: ${region}. Must be 'cn' or 'global'.`);
		process.exit(1);
	}

	const builder = new BuildSystem(region);
	const success = await builder.build();

	process.exit(success ? 0 : 1);
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
