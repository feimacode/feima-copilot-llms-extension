/*---------------------------------------------------------------------------------------------
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { /*activeRegionConfig,*/ } from '../../config/regions';
import { getResolvedConfig } from '../../config/configService';
import { FeimaAuthenticationService } from '../platform/authentication/vscode/feimaAuthenticationService';
import { ILogService } from '../platform/log/common/logService';
import { parseQuotaHeader, setStatusBarUserName } from '../statusBar';
import { getQuotaService } from '../services/quotaService';

// Minimal response shape used to avoid depending on conflicting Response typedefs
interface FetchResponseLike {
	ok: boolean;
	status: number;
	statusText: string;
	json(): Promise<unknown>;
	headers?: {
		get(name: string): string | null;
	};
}

/**
 * Raw model information from feima-api /v1/models endpoint
 */
export interface FeimaModelAPIResponse {
	id: string;
	name: string;
	version: string;
	object: string;
	vendor?: string;
	model_picker_enabled: boolean;
	model_picker_category?: string;
	preview?: boolean;
	is_chat_default?: boolean;
	is_chat_fallback?: boolean;
	capabilities: {
		type: 'chat' | 'completion' | 'embeddings';
		family: string;
		tokenizer?: string;
		limits: {
			max_prompt_tokens: number;
			max_output_tokens: number;
			max_context_window_tokens?: number;
		};
		supports: {
			streaming: boolean;
			tool_calls?: boolean;
			parallel_tool_calls?: boolean;
			vision?: boolean;
			structured_outputs?: boolean;
			thinking?: boolean;
		};
	};
	billing?: {
		is_premium: boolean;
		multiplier: number;
		restricted_to?: string[];
	};
	policy?: {
		state: 'enabled' | 'disabled' | 'unconfigured';
		terms?: string;
	};
}

/**
 * Categorized model information
 */
export interface ChatModel extends FeimaModelAPIResponse {
	capabilities: FeimaModelAPIResponse['capabilities'] & { type: 'chat' };
}

export interface CompletionModel extends FeimaModelAPIResponse {
	capabilities: FeimaModelAPIResponse['capabilities'] & { type: 'completion' };
}

export interface EmbeddingModel extends FeimaModelAPIResponse {
	capabilities: FeimaModelAPIResponse['capabilities'] & { type: 'embeddings' };
}

/**
 * Model catalog service - fetches and categorizes models from feima-api
 * 
 * Follows feima-code pattern: models are split by capabilities.type into:
 * - Chat models (capabilities.type === 'chat')
 * - Completion models (capabilities.type === 'completion')
 * - Embedding models (capabilities.type === 'embeddings')
 */
export class ModelCatalogService {
	private readonly _onDidChangeModels = new vscode.EventEmitter<void>();
	readonly onDidChangeModels = this._onDidChangeModels.event;

	private _chatModels: ChatModel[] = [];
	private _completionModels: CompletionModel[] = [];
	private _embeddingModels: EmbeddingModel[] = [];
	private _lastFetch: number = 0;
	private readonly _cacheDuration = 5 * 60 * 1000; // 5 minutes
	private readonly _log: ILogService;
	// P2 #10: Track token change listener for cleanup
	private _tokenChangeListener: vscode.Disposable | undefined;

	constructor(
		private readonly authService: FeimaAuthenticationService,
		log: ILogService
	) {
		this._log = log;
		// Listen to auth changes and proactively fetch models
		authService.onDidChangeSessions(async (event) => {
			this._log.debug('Auth session changed');
			
			// Clear cache on any auth change
			this.clearCache();
			
			// If sessions were added (sign-in), proactively fetch models
			if (event.added && event.added.length > 0) {
				setStatusBarUserName(event.added[0].account.label);
				this._log.info('New session detected, fetching models...');
				try {
					await this._fetchIfNeeded();
					this._log.info('Models fetched successfully, firing change event');
					this._onDidChangeModels.fire();
				} catch (error) {
					this._log.error(error as Error, 'Failed to fetch models after auth');
					// Still fire event so UI updates, even if fetch failed
					this._onDidChangeModels.fire();
				}
			} else {
				// Sessions removed (sign-out), clear username and fire event
				setStatusBarUserName(null);
				this._log.info('Session removed, firing change event');
				this._onDidChangeModels.fire();
			}
		});
	}

	/**
	 * Get chat models (capabilities.type === 'chat')
	 */
	async getChatModels(): Promise<ChatModel[]> {
		await this._fetchIfNeeded();
		return [...this._chatModels];
	}

	/**
	 * Get completion models (capabilities.type === 'completion')
	 */
	async getCompletionModels(): Promise<CompletionModel[]> {
		await this._fetchIfNeeded();
		return [...this._completionModels];
	}

	/**
	 * Get embedding models (capabilities.type === 'embeddings')
	 */
	async getEmbeddingModels(): Promise<EmbeddingModel[]> {
		await this._fetchIfNeeded();
		return [...this._embeddingModels];
	}

	/**
	 * Get default completion model for inline completions
	 */
	async getDefaultCompletionModel(): Promise<CompletionModel | undefined> {
		const models = await this.getCompletionModels();
		// Prefer models marked as default, otherwise return first available
		return models.find(m => m.is_chat_default) || models[0];
	}

	/**
	 * Clear cached models
	 */
	clearCache(): void {
		this._chatModels = [];
		this._completionModels = [];
		this._embeddingModels = [];
		this._lastFetch = 0;
	}

	/**
	 * Manually trigger model refresh.
	 * Forces a fetch regardless of cache state and fires change event.
	 */
	async refreshModels(): Promise<void> {
		this._log.info('Manual model refresh requested');
		try {
			await this._fetchIfNeeded(true); // Force fetch
			this._log.info('Models refreshed, firing change event');
			this._onDidChangeModels.fire();
		} catch (error) {
			this._log.error(error as Error, 'Failed to refresh models');
			throw error;
		}
	}

	/**
	 * Fetch models if cache expired or empty
	 * @param force Force fetch even if cache is valid
	 */
	private async _fetchIfNeeded(force: boolean = false): Promise<void> {
		const now = Date.now();
		const cacheValid = (this._chatModels.length > 0 || this._completionModels.length > 0) &&
			now - this._lastFetch < this._cacheDuration;

		if (cacheValid && !force) {
			return;
		}

		// Check authentication
		const isAuthenticated = await this.authService.isAuthenticated();
		if (!isAuthenticated) {
			this._log.debug('Not authenticated, skipping fetch');
			return;
		}

		try {
			this._log.info('Fetching models from feima-api');
			const sessions = await this.authService.getSessions(undefined, {});
			if (!sessions.length) {
				throw new Error('No access token available');
			}
			const accessToken = sessions[0].accessToken;
			setStatusBarUserName(sessions[0].account.label);
			
			// P2 #11: Add fetch timeout (30 seconds)
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 30000);
			
			// Use a minimal response interface to avoid type conflicts between
			// node-fetch and the environment's fetch/undici types.
			let response: FetchResponseLike;
			try {
				const apiBase = getResolvedConfig().apiBaseUrl || '';
				// Settings always provide apiBaseUrl ending with 'v1/', so simply append 'models'
				const modelsUrl = `${apiBase}/models`;
				this._log.debug(`[ModelCatalog] Fetching models from ${modelsUrl}`);
				response = await fetch(modelsUrl, {
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${accessToken}`,
						'Content-Type': 'application/json'
					},
					signal: controller.signal
				});
			} finally {
				clearTimeout(timeoutId);
			}

			if (!response.ok) {
				throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
			}

			// Extract quota snapshot from response headers if available
			if (response.headers) {
				const quotaHeaderValue = response.headers.get('x-feima-quota-snapshot');
				if (quotaHeaderValue) {
					const quota = parseQuotaHeader(quotaHeaderValue);
					if (quota) {
						getQuotaService().setQuota(quota);
						this._log.debug(`[ModelCatalog] Updated quota from header: remaining=${quota.remaining}`);
					}
				}
			}

			const data = await response.json() as { data: FeimaModelAPIResponse[] };
			if (!data.data || !Array.isArray(data.data)) {
				throw new Error('Invalid models response format');
			}

			// Clear caches
			this._chatModels = [];
			this._completionModels = [];
			this._embeddingModels = [];

			// Categorize models by type
			for (const model of data.data) {
				if (model.capabilities.type === 'chat') {
					this._chatModels.push(model as ChatModel);
				} else if (model.capabilities.type === 'completion') {
					this._completionModels.push(model as CompletionModel);
				} else if (model.capabilities.type === 'embeddings') {
					this._embeddingModels.push(model as EmbeddingModel);
				}
			}

			this._lastFetch = now;

			this._log.info(
				`Fetched models: ${this._chatModels.length} chat, ` +
				`${this._completionModels.length} completion, ${this._embeddingModels.length} embedding`
			);

		} catch (error) {
			this._log.error(error as Error, 'Error fetching models');
			// Don't throw - allow caller to handle gracefully
		}
	}
}
