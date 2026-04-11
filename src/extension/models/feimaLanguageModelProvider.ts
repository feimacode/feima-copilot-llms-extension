/**
 * Feima Language Model Provider for VS Code
 * 
 * Implements vscode.LanguageModelChatProvider to expose Chinese LLM models
 * (DeepSeek, Qwen, etc.) to GitHub Copilot Chat through feima-api.
 * 
 * Architecture follows feima-code pattern:
 * - Provider: Lists models and delegates requests
 * - Wrapper (FeimaLanguageModelWrapper): Handles streaming and tool calls
 */

import * as vscode from 'vscode';
import { FeimaAuthenticationService } from '../platform/authentication/vscode/feimaAuthenticationService';
import { ModelCatalogService } from './modelCatalog';
import { FeimaLanguageModelWrapper } from './languageModelWrapper';
import { FeimaChatEndpoint, ModelInfo } from './feimaChatEndpoint';
import { ILogService } from '../platform/log/common/logService';

/**
 * Feima Language Model Chat Provider
 * 
 * Integrates Chinese LLM models into VS Code's Language Model API.
 * Delegates actual streaming and tool call handling to FeimaLanguageModelWrapper.
 * 
 * Architecture follows feima-code pattern:
 * - Provider: Lists models, delegates to wrapper
 * - Wrapper: Handles streaming, tool calls, validation
 */
export class FeimaLanguageModelProvider implements vscode.LanguageModelChatProvider {
	private readonly _onDidChange = new vscode.EventEmitter<void>();
	readonly onDidChangeLanguageModelChatInformation = this._onDidChange.event;
	private readonly _log: ILogService;
	private readonly _wrapper: FeimaLanguageModelWrapper;
	private readonly _endpointCache = new Map<string, FeimaChatEndpoint>();

	constructor(
		private readonly authService: FeimaAuthenticationService,
		private readonly modelCatalog: ModelCatalogService,
		log: ILogService
	) {
		this._log = log;
		this._wrapper = new FeimaLanguageModelWrapper(log);
		
		this._log.debug('FeimaLanguageModelProvider constructor called');
		
		// Listen to model catalog changes
		modelCatalog.onDidChangeModels(() => {
			this._log.debug('Model catalog changed event received');
			this._log.debug('Firing onDidChangeLanguageModelChatInformation to notify VS Code');
			this._onDidChange.fire();
			this._log.debug('VS Code notified, it will call provideLanguageModelChatInformation()');
		});
		
		this._log.debug('FeimaLanguageModelProvider initialized successfully');
	}

	/**
	 * Provide available Feima models to VS Code
	 * 
	 * Fetches chat models from ModelCatalogService and transforms into
	 * vscode.LanguageModelChatInformation format.
	 */
	async provideLanguageModelChatInformation(
		_options: { silent: boolean },
		token: vscode.CancellationToken
	): Promise<vscode.LanguageModelChatInformation[]> {
		this._log.info('provideLanguageModelChatInformation called');
		this._log.debug(`Options: silent=${_options.silent}, cancelled=${token.isCancellationRequested}`);
		
		try {
			// Check authentication
			const isAuthenticated = await this.authService.isAuthenticated();
			this._log.debug(`Authentication check: ${isAuthenticated}`);
			
			if (!isAuthenticated) {
				this._log.debug('Not authenticated, returning empty model list');
				return [];
			}

			// Fetch chat models from catalog service
			const chatModels = await this.modelCatalog.getChatModels();
			this._log.debug(`Fetched ${chatModels.length} chat models from catalog`);
			
			if (chatModels.length > 0) {
				this._log.debug(`First chat model: ${JSON.stringify(chatModels[0], null, 2)}`);
			}

			// Transform to VS Code format
			// Filter models enabled for picker
			const pickerModels = chatModels.filter(model => model.model_picker_enabled);
			this._log.debug(`Filtered to ${pickerModels.length} picker-enabled models`);
			
			const vsCodeModels: vscode.LanguageModelChatInformation[] = pickerModels.map(model => {
				// Build tooltip from policy terms or version
				const tooltip = model.policy?.terms || `${model.vendor || 'Feima'} ${model.version}`;
				
				// Build detail string (multiplier or "Free")
				const detail = model.billing?.multiplier && model.billing.multiplier > 0
					? `${model.billing.multiplier}x`
					: 'Free';
				
				return {
					id: model.id, // Use model ID directly, NO "feima/" prefix
					name: model.name,
					family: model.capabilities.family,
					version: model.version,
					tooltip: tooltip,
					detail: detail,
					maxInputTokens: model.capabilities.limits.max_prompt_tokens,
					maxOutputTokens: model.capabilities.limits.max_output_tokens,
					// CRITICAL: isUserSelectable makes models visible by default in picker (proposed API)
					isUserSelectable: true,
					capabilities: {
						imageInput: model.capabilities.supports.vision || false,
						toolCalling: model.capabilities.supports.tool_calls || false
					}
				};
			});
			this._log.debug(`Transformed to ${vsCodeModels.length} VS Code models`);
			if (vsCodeModels.length > 0) {
				this._log.debug(`First VS Code model: ${JSON.stringify(vsCodeModels[0], null, 2)}`);
			}

			this._log.info(`Returning ${vsCodeModels.length} models to VS Code`);

			return vsCodeModels;
		} catch (error) {
			this._log.error(error as Error, 'Failed to fetch models');
			return [];
		}
	}

	/**
	 * Get or create endpoint for a model.
	 * Endpoints are cached to avoid recreating them.
	 */
	private async _getEndpoint(modelId: string): Promise<FeimaChatEndpoint> {
		// Check cache first
		let endpoint = this._endpointCache.get(modelId);
		if (endpoint) {
			return endpoint;
		}

		try {
			// Check authentication first to provide better error messages
			const isAuthenticated = await this.authService.isAuthenticated();
			if (!isAuthenticated) {
				throw new Error(vscode.l10n.t('Please sign in to Feima first'));
			}

			// P2 #12: Add error handling for endpoint creation
			// Fetch model metadata from catalog
			const chatModels = await this.modelCatalog.getChatModels();
			const catalogModel = chatModels.find(m => m.id === modelId);
			
			if (!catalogModel) {
				this._log.error(new Error(`Model not found: ${modelId}`), `Failed to find model in catalog`);
				throw new Error(`Model not found: ${modelId}`);
			}

			// Convert catalog model to ModelInfo
			const modelInfo: ModelInfo = {
				id: catalogModel.id,
				name: catalogModel.name,
				family: catalogModel.capabilities.family,
				maxInputTokens: catalogModel.capabilities.limits.max_prompt_tokens,
				maxOutputTokens: catalogModel.capabilities.limits.max_output_tokens,
				supportsToolCalls: catalogModel.capabilities.supports.tool_calls || false,
				supportsVision: catalogModel.capabilities.supports.vision || false,
				supportsThinking: catalogModel.capabilities.supports.thinking || false
			};

			// Create and cache endpoint
			endpoint = new FeimaChatEndpoint(modelInfo, this.authService, this._log);
			this._endpointCache.set(modelId, endpoint);
			
			this._log.debug(`Created endpoint for model: ${modelId}`);
			return endpoint;
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			this._log.error(error as Error, `Failed to create endpoint for model ${modelId}`);
			throw new Error(`Failed to create endpoint for model ${modelId}: ${reason}`);
		}
	}

	/**
	 * Provide chat response by delegating to FeimaLanguageModelWrapper.
	 * 
	 * Architecture follows feima-code pattern:
	 * - Provider validates and creates endpoint
	 * - Wrapper handles streaming and tool calls
	 */
	async provideLanguageModelChatResponse(
		model: vscode.LanguageModelChatInformation,
		messages: vscode.LanguageModelChatMessage[],
		options: vscode.ProvideLanguageModelChatResponseOptions,
		progress: vscode.Progress<vscode.LanguageModelResponsePart | vscode.LanguageModelToolCallPart>,
		token: vscode.CancellationToken
	): Promise<void> {
		this._log.info(`Chat request for model: ${model.id}`);
		this._log.debug(`Options received - tools: ${options.tools?.length ?? 0}, toolMode: ${options.toolMode}`);
		
		if (options.tools) {
			this._log.debug(`Tool names: ${options.tools.map(t => t.name).join(', ')}`);
		}

		try {
			// Get endpoint for model
			const endpoint = await this._getEndpoint(model.id);

			// Delegate to wrapper
			// Cast progress: the wrapper only ever reports TextPart | ToolCallPart | ThinkingPart,
			// all of which are valid LanguageModelResponsePart subtypes, so this is safe.
			return this._wrapper.provideLanguageModelResponse(
				endpoint,
				messages,
				{
					tools: options.tools,
					toolMode: options.toolMode
				},
				progress as unknown as vscode.Progress<vscode.LanguageModelTextPart | vscode.LanguageModelToolCallPart | vscode.LanguageModelThinkingPart>,
				token
			);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);

			// Check for authentication errors — covers both 401 sentinel and legacy messages
			if (this._isAuthError(errorMsg)) {
				this._log.error(error as Error, `[Provider] Authentication error for model ${model.id}`);
				await this._handleAuthFailure(progress);
				return;
			}

			throw error;
		}
	}

	/**
	 * Provide token count by delegating to FeimaLanguageModelWrapper.
	 * Throws on authentication failure to break the agent loop immediately.
	 */
	async provideTokenCount(
		model: vscode.LanguageModelChatInformation,
		text: string | vscode.LanguageModelChatMessage,
		_token: vscode.CancellationToken
	): Promise<number> {
		try {
			const endpoint = await this._getEndpoint(model.id);
			return this._wrapper.provideTokenCount(endpoint, text);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);

			// Throw auth errors — do NOT return a fallback, as that lets the
			// agent loop continue firing requests with an expired token.
			if (this._isAuthError(errorMsg)) {
				this._log.error(error as Error, `[Provider] Auth error during token count for model ${model.id}`);

				// Fire-and-forget refresh attempt (token count errors don't have a progress stream)
				this.authService.forceRefresh().then(newSession => {
					if (!newSession) {
						this._log.info('[Provider] Token refresh failed during token count — prompting re-auth');
						this.authService.createSession([], {}).catch(e => {
							this._log.error(e as Error, '[Provider] Re-auth failed during token count');
						});
					}
				}).catch(e => this._log.error(e as Error, '[Provider] forceRefresh failed during token count'));

				throw new Error(vscode.l10n.t('Your session has expired'));
			}

			throw error;
		}
	}

	/** Returns true for errors that indicate the session/token has expired or is invalid. */
	private _isAuthError(msg: string): boolean {
		// Match the sentinel thrown by the wrapper on HTTP 401, plus legacy patterns
		return msg.startsWith('Unauthorized:') ||
			msg.includes('authenticated') ||
			msg.includes('Unauthorized') ||
			msg.includes('Please sign in');
	}

	// Debounce auth-failure handling so we don't show multiple dialogs in rapid succession.
	private _authFailureInProgress = false;

	/**
	 * Handle an authentication failure (HTTP 401 or token-expired error).
	 *
	 * 1. Attempt a forced token refresh (bypass time-based check).
	 * 2. If refresh succeeds, cache is updated — next request will use the new token.
	 * 3. If refresh fails (no/expired refresh token), clear the session and prompt re-auth.
	 * 4. Write an inline warning to the chat for the current request regardless.
	 */
	private async _handleAuthFailure(
		progress: vscode.Progress<vscode.LanguageModelResponsePart | vscode.LanguageModelToolCallPart>
	): Promise<void> {
		// Always show an inline warning for the current (failed) request
		const warningMsg = vscode.l10n.t('Your session has expired');
		progress.report(new vscode.LanguageModelTextPart(`⚠️ **${warningMsg}** — ${vscode.l10n.t('signing you in again...')}`));

		// Guard against concurrent handling (e.g., multiple simultaneous 401s)
		if (this._authFailureInProgress) {
			this._log.debug('[Provider] Auth failure handling already in progress, skipping');
			return;
		}
		this._authFailureInProgress = true;

		try {
			this._log.info('[Provider] Attempting forced token refresh after auth failure');
			const newSession = await this.authService.forceRefresh();

			if (newSession) {
				// Refresh succeeded — cache is up to date, next request will use new token
				this._log.info('[Provider] Token refreshed successfully after 401');
			} else {
				// No refresh token or refresh failed — need full re-auth
				this._log.info('[Provider] forceRefresh returned null — prompting re-authentication');
				try {
					await this.authService.createSession([], {});
					this._log.info('[Provider] Re-authentication completed successfully');
				} catch (authError) {
					this._log.error(authError as Error, '[Provider] Re-authentication failed or was dismissed');
				}
			}
		} finally {
			// Allow next auth failure to be handled after a brief cooldown
			setTimeout(() => { this._authFailureInProgress = false; }, 30_000);
		}
	}

	/**
	 * Dispose resources
	 */
	dispose(): void {
		this._onDidChange.dispose();
	}
}
