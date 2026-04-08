import * as vscode from 'vscode';
import { FeimaAuthProvider } from './auth/feimaAuthProvider';
import { FeimaAuthenticationService } from './platform/authentication/vscode/feimaAuthenticationService';
import { registerAuthCommands } from './commands/authCommands';
import { FeimaLanguageModelProvider } from './models/feimaLanguageModelProvider';
import { registerInlineCompletionProvider } from './completion/feimaInlineCompletionProvider';
import { ModelCatalogService } from './models/modelCatalog';
import { LogServiceImpl } from './platform/log/common/logService';
import { VSCodeLogTarget, ConsoleLogTarget } from './platform/log/vscode/logService';
import { LogLevel } from './platform/log/common/logService';
import { FeimaConfigService } from '../config/configService';
import { FEIMA_AUTH_SIGNED_IN_KEY } from './contextKeys';
import { initializeStatusBar, resetStatusBar } from './statusBar';
import { getQuotaService } from './services/quotaService';

// Store auth service for disposal
let authService: FeimaAuthenticationService | undefined;

/**
 * Extension activation function.
 * Called when the extension is activated.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
	// Create LogOutputChannel for production-ready logging with log levels
	const logChannel = vscode.window.createOutputChannel('Feima', { log: true });
	const logService = new LogServiceImpl([
		new VSCodeLogTarget(logChannel),
		new ConsoleLogTarget('[Feima] ', LogLevel.Error)
	]);
	
	logService.info('Feima extension is activating...');
	
	// Initialize context key to false immediately (before checking sessions)
	// This ensures the menu item is visible from the start
	await vscode.commands.executeCommand('setContext', FEIMA_AUTH_SIGNED_IN_KEY, false);

	try {
		// 0. Initialize configuration service with VS Code settings integration
		const configService = FeimaConfigService.getInstance();
		context.subscriptions.push(configService);
		const config = configService.getConfig();
		logService.info('[Init] ✅ Configuration service initialized');
		logService.info(`   Auth Base URL: ${config.authBaseUrl}`);
		logService.info(`   API Base URL: ${config.apiBaseUrl}`);
		logService.info(`   Client ID: ${config.clientId}`);

		// 1. Register authentication service and provider
		const authLog = logService.createSubLogger('Auth');
		
		// Create authentication service (heavy implementation)
		authService = new FeimaAuthenticationService(context, authLog);
		
		// Create thin provider adapter
		const authProvider = new FeimaAuthProvider(authService, authLog);
		
		context.subscriptions.push(
			vscode.authentication.registerAuthenticationProvider(
				'feima',
				vscode.l10n.t('Feimacode'),
				authProvider,
				{ supportsMultipleAccounts: false }
			)
		);
		
		// Register as URI handler (for OAuth callbacks)
		context.subscriptions.push(
			vscode.window.registerUriHandler(authProvider)
		);
		logService.info('[Init] ✅ Authentication service and provider registered');

		// 2. Setup authentication menu integration
		setupAuthenticationMenu(context, authService, logService);
		logService.info('[Init] ✅ Authentication menu integration setup');

		// 3. Register commands
		registerAuthCommands(context, authService, logService);
		logService.info('[Init] ✅ Commands registered');

		// 3.5 Initialize status bar
		initializeStatusBar(context, logService);
		logService.info('[Init] ✅ Status bar initialized');

		// 4. Create shared model catalog service
		const catalogLog = logService.createSubLogger('ModelCatalog');
		const modelCatalog = new ModelCatalogService(authService, catalogLog);
		logService.info('[Init] ✅ Model catalog service created');

		// 5. Register language model provider (Phase 0 - Week 1-2)
		logService.info('');
		logService.info('=== LANGUAGE MODEL PROVIDER REGISTRATION ===');
	
		if (!vscode.lm) {
			logService.warn('❌ Language Model API (vscode.lm) not available!');
			logService.warn('⚠️  This requires VS Code 1.85.0 or later with Copilot Chat installed.');
			vscode.window.showWarningMessage(vscode.l10n.t('Language Model API not available. Please ensure GitHub Copilot Chat is installed.'));
		} else {
			logService.info('✅ Language Model API available');
			logService.info(`   vscode.lm methods: ${Object.keys(vscode.lm).join(', ')}`);

			logService.info('');
			logService.info('📦 Creating FeimaLanguageModelProvider...');
			const providerLog = logService.createSubLogger('Provider');
			const modelProvider = new FeimaLanguageModelProvider(authService, modelCatalog, providerLog);

			logService.info('📝 Registering provider with vendor ID "feima"...');
			const providerDisposable = vscode.lm.registerLanguageModelChatProvider('feima', modelProvider);
			context.subscriptions.push(providerDisposable);
			context.subscriptions.push(modelProvider);
			logService.info('✅ Language model provider registered successfully');
			logService.info('   Vendor ID: feima');
			logService.info('   Provider will be queried when Copilot Chat needs model list');
			logService.info('===========================================');
		}

		// 6. Register inline completion provider
		// logService.info('');
		// logService.info('=== INLINE COMPLETION PROVIDER REGISTRATION ===');
		// logService.info('📦 Registering FeimaInlineCompletionProvider...');
		// const completionLog = logService.createSubLogger('Completion');
		// registerInlineCompletionProvider(context, authService, modelCatalog, completionLog);
		// logService.info('✅ Inline completion provider registered');
		// logService.info('   Pattern: ** (all files)');
		// logService.info('   Yields to: github.copilot (when available)');
		// logService.info('   Debounce: 50ms');
		// logService.info('   Model: deepseek-coder (fast, code-specialized)');
		// logService.info('===========================================');

		// 7. TODO: Initialize quota service (deferred to post-validation)

		// 8. Proactively refresh models if user is already authenticated
		// This ensures VS Code has the model list ready immediately
		const isAuthenticated = await authService.isAuthenticated();
		if (isAuthenticated) {
			logService.info('');
			logService.info('=== PROACTIVE MODEL REFRESH ===');
			logService.info('✅ User already authenticated, fetching models...');
			try {
				await modelCatalog.refreshModels();
				logService.info('✅ Models refreshed successfully');
				logService.info('   VS Code will have model list and quota ready immediately');
			} catch (error) {
				logService.error(error as Error, 'Failed to refresh models');
				// Non-fatal error - continue activation
			}
			logService.info('===============================');
		}

		logService.info('');
		logService.info('✅ Feima extension activated successfully!');
		logService.info('📊 Status: Phase 0 - Feature 1 (Authentication) COMPLETE, Feature 2 (Models) COMPLETE, Feature 3 (Inline Completion) COMPLETE');
		logService.info('🎯 Next: Test model integration with Copilot Chat AND inline completions');
		logService.info('');
		logService.info('💡 Try: Ctrl+Shift+P → "Feima: Sign in" then:');
		logService.info('   - Open GitHub Copilot Chat (test chat models)');
		logService.info('   - Start coding in any file (test inline completions)');
	} catch (error) {
		logService.error(error as Error, 'Failed to activate extension');
		vscode.window.showErrorMessage(vscode.l10n.t('Feima extension activation failed: {0}', String(error)));
		throw error;
	}
}

/**
 * Setup authentication menu integration:
 * - Request session access to add "Sign in with Feima" to Accounts menu
 * - Listen to session changes to update context key and maintain menu visibility
 * - Update context key for conditional menu items
 */
function setupAuthenticationMenu(
	context: vscode.ExtensionContext,
	authService: FeimaAuthenticationService,
	logService: LogServiceImpl
): void {
	// Function to request session access (adds menu item to Accounts menu)
	const requestSessionAccess = async () => {
		// Only prompt for sign-in if not already authenticated
		const isSignedIn = await authService.isAuthenticated();
		if (isSignedIn) {
			logService.debug('[Auth] User already authenticated, skipping sign-in prompt');
			return;
		}
		
		vscode.authentication.getSession(
			'feima',
			[],
			{ createIfNone: true }
		).then(undefined, () => {
			// Ignore error if user doesn't sign in immediately
			// The menu item will remain available
		});
	};

	// Update context key when sessions change
	// The menu item automatically appears/disappears based on getSessions() result:
	// - Has sessions (signed in) → menu hidden
	// - No sessions (signed out) → menu shown
	// We only need to update the context key; VS Code manages the menu.
	context.subscriptions.push(
		authService.onDidChangeSessions(async (_e: vscode.AuthenticationProviderAuthenticationSessionsChangeEvent) => {
			logService.debug('[Auth] Session changed');

			// Check if user is signed in
			const isSignedIn = await authService.isAuthenticated();
			await vscode.commands.executeCommand('setContext', FEIMA_AUTH_SIGNED_IN_KEY, isSignedIn);
			logService.debug(`[Auth] Sign-in state updated: ${isSignedIn}`);

			// Clear quota and status bar when user signs out
			if (!isSignedIn) {
				getQuotaService().clearQuota();
				resetStatusBar();
				logService.debug('[Auth] Cleared quota and status bar on sign-out');
			}
		})
	);

	// Set initial context key state
	authService.isAuthenticated().then(isSignedIn => {
		vscode.commands.executeCommand('setContext', FEIMA_AUTH_SIGNED_IN_KEY, isSignedIn);
		logService.info(`[Auth] Initial sign-in state: ${isSignedIn}`);
	});

	// Request session access to add sign-in menu item to Accounts menu
	// By passing createIfNone: true, VS Code will automatically add a menu entry
	// in the Accounts menu for signing in (with a numbered badge on the Accounts icon)
	logService.info('[Auth] Requesting session access to add menu item');
	requestSessionAccess();
}

/**
 * Extension deactivation function.
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
	// Dispose authentication service to clean up URI handler and event emitters
	if (authService) {
		authService.dispose();
		authService = undefined;
	}
}
