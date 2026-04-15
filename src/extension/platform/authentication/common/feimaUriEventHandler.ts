/*---------------------------------------------------------------------------------------------
 *  Licensed under the MIT License.
 *  Adapted from feima-code FeimaUriEventHandler.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../log/common/logService';

/**
 * OAuth2 callback data structure.
 */
export interface ICallbackData {
	code: string;
	state: string;
}

/**
 * Launch data structure for referral deep links.
 */
export interface ILaunchData {
	referralCode: string;
	source: string;
}

/**
 * Event emitted when a referral code is received from a /launch deep link.
 */
export const onDidReceiveReferralCode = new vscode.EventEmitter<string>();
export const referralCodeEvent = onDidReceiveReferralCode.event;

/**
 * Callback resolver for a specific OAuth2 flow.
 */
interface IPendingCallback {
	nonce: string;
	resolve: (data: ICallbackData) => void;
	reject: (error: Error) => void;
	timeoutId: NodeJS.Timeout;
}

/**
 * URI event handler for Feima OAuth2 callbacks.
 * Handles multiple concurrent authorization flows using nonce-based routing.
 *
 * Pattern adapted from GitHub Copilot authentication:
 * Each authorization request generates a unique nonce.
 * Multiple pending callbacks can coexist simultaneously.
 * Incoming URIs are routed to the correct callback via nonce matching.
 *
 * This enables users to retry authentication if they close the browser prematurely.
 */
export class FeimaUriEventHandler implements vscode.UriHandler {
	/**
	 * Map of nonce → pending callback.
	 * Allows multiple concurrent OAuth flows.
	 */
	private readonly _pendingCallbacks = new Map<string, IPendingCallback>();

	constructor(
		private readonly _logService: ILogService
	) { }

	/**
	 * Handle incoming URI from VS Code deep link.
	 * Routes to appropriate handler based on path:
	 * - /launch → Referral deep link (stores referral code, prompts sign-in)
	 * - /oauth/callback → OAuth2 callback (routes to pending authorization)
	 *
	 * @param uri URI from VS Code: vscode://feima.cn-model-for-copilot/launch?referral_code=...
	 *            or vscode://feima.cn-model-for-copilot/oauth/callback?code=...&state=...
	 */
	handleUri(uri: vscode.Uri): void {
		this._logService.debug(`[FeimaUriEventHandler] Received URI: ${uri.toString()}`);

		// Check path to determine handler
		const path = uri.path;

		if (path === '/launch') {
			this._handleLaunchUri(uri);
			return;
		}

		// Default: OAuth callback handling
		this._handleOAuthCallback(uri);
	}

	/**
	 * Handle /launch deep link for referral code.
	 * Stores referral code and prompts user to sign in.
	 *
	 * @param uri Launch URI with referral_code query param
	 */
	private _handleLaunchUri(uri: vscode.Uri): void {
		this._logService.info(`[FeimaUriEventHandler] Handling launch URI: ${uri.toString()}`);

		try {
			const query = new URLSearchParams(uri.query);
			const referralCode = query.get('referral_code');
			const source = query.get('source');

			if (!referralCode) {
				this._logService.warn('[FeimaUriEventHandler] Launch URI missing referral_code');
				vscode.window.showWarningMessage(vscode.l10n.t('Welcome to Feima! Sign in to get started.'));
				return;
			}

			this._logService.info(`[FeimaUriEventHandler] Received referral code: ${referralCode}, source: ${source}`);

			// Emit event for authentication service to consume
			onDidReceiveReferralCode.fire(referralCode);

			// Prompt user to sign in
			const message = vscode.l10n.t('Welcome to Feima! Sign in to claim your referral bonus.');
			const signIn = vscode.l10n.t('Sign In');
			const later = vscode.l10n.t('Later');

			vscode.window.showInformationMessage(message, signIn, later).then(selection => {
				if (selection === signIn) {
					vscode.commands.executeCommand('feima.signIn');
				}
			});

		} catch (error) {
			this._logService.error(error as Error, '[FeimaUriEventHandler] Failed to handle launch URI');
			vscode.window.showErrorMessage(vscode.l10n.t('Failed to process launch request'));
		}
	}

	/**
	 * Handle OAuth2 callback URI.
	 * Routes callback to the appropriate pending authorization request.
	 *
	 * @param uri Callback URI from feima-idp: vscode://feima.cn-model-for-copilot/oauth/callback?code=...&state=...
	 */
	private _handleOAuthCallback(uri: vscode.Uri): void {
		this._logService.debug(`[FeimaUriEventHandler] Handling OAuth callback URI: ${uri.toString()}`);

		try {
			// Parse query parameters
			const query = new URLSearchParams(uri.query);
			const code = query.get('code');
			const state = query.get('state');
			const error = query.get('error');
			const errorDescription = query.get('error_description');

			// Handle error responses from OAuth server
			if (error) {
				const errorMsg = errorDescription || error;
				this._logService.error(new Error(errorMsg), `[FeimaUriEventHandler] OAuth2 error: ${errorMsg}`);

				// If we have state, route to specific callback
				if (state) {
					const pending = this._pendingCallbacks.get(state);
					if (pending) {
						clearTimeout(pending.timeoutId);
						this._pendingCallbacks.delete(state);
						pending.reject(new Error(`OAuth2 error: ${errorMsg}`));
					}
				}
				vscode.window.showErrorMessage(`Feima authentication failed: ${errorMsg}`);
				return;
			}

			// Validate required parameters
			if (!code || !state) {
				this._logService.error(new Error('Invalid callback'), `[FeimaUriEventHandler] Invalid callback URI: missing code=${!!code}, state=${!!state}`);
				vscode.window.showErrorMessage('Invalid OAuth callback: missing required parameters');
				return;
			}

			// Extract nonce from state parameter
			// For Feima, state IS the nonce (generated by OAuth2Service)
			const nonce = state;

			// Find pending callback for this nonce
			const pending = this._pendingCallbacks.get(nonce);
			if (!pending) {
				this._logService.warn(`[FeimaUriEventHandler] No pending callback found for nonce=${nonce}, pendingCount=${this._pendingCallbacks.size}`);
				vscode.window.showWarningMessage('OAuth callback received but no authentication was in progress. Please try signing in again.');
				return;
			}

			// Clear timeout and remove from pending map
			clearTimeout(pending.timeoutId);
			this._pendingCallbacks.delete(nonce);

			this._logService.info(`[FeimaUriEventHandler] Routing callback to pending request: nonce=${nonce}, remainingPending=${this._pendingCallbacks.size}`);

			// Resolve the promise
			pending.resolve({ code, state });

		} catch (error) {
			this._logService.error(error as Error, '[FeimaUriEventHandler] Failed to handle callback URI');
			vscode.window.showErrorMessage('Failed to process OAuth callback');
		}
	}

	/**
	 * Register a pending OAuth2 authorization request.
	 *
	 * @param nonce Unique nonce for this authorization flow
	 * @returns Promise that resolves when callback is received
	 */
	registerPendingCallback(nonce: string): Promise<ICallbackData> {
		return new Promise<ICallbackData>((resolve, reject) => {
			// Timeout after 5 minutes
			const timeoutId = setTimeout(() => {
				if (this._pendingCallbacks.has(nonce)) {
					this._pendingCallbacks.delete(nonce);
					this._logService.warn(`[FeimaUriEventHandler] Callback timeout: nonce=${nonce}, remainingPending=${this._pendingCallbacks.size}`);
					reject(new Error('OAuth2 authorization timeout after 5 minutes'));
				}
			}, 5 * 60 * 1000);

			this._pendingCallbacks.set(nonce, { nonce, resolve, reject, timeoutId });
			this._logService.debug(`[FeimaUriEventHandler] Registered pending callback: nonce=${nonce}, pendingCount=${this._pendingCallbacks.size}`);
		});
	}

	/**
	 * Cancel a pending authorization request.
	 * Resolves gracefully without error (used when browser fails to open).
	 *
	 * @param nonce Unique nonce to cancel
	 */
	cancelPendingCallback(nonce: string): void {
		this._cancelPendingCallback(nonce, 'browser failed to open');
	}

	/**
	 * Internal method to cancel a pending authorization request.
	 * Resolves gracefully without error (used when superseded by newer attempt).
	 *
	 * @param nonce Unique nonce to cancel
	 * @param reason Optional reason for cancellation (logged only)
	 */
	private _cancelPendingCallback(nonce: string, reason: string = 'canceled'): void {
		const pending = this._pendingCallbacks.get(nonce);
		if (pending) {
			clearTimeout(pending.timeoutId);
			this._pendingCallbacks.delete(nonce);
			// Resolve with null instead of rejecting - no scary error for user
			pending.resolve(null as unknown as ICallbackData);
			this._logService.info(`[FeimaUriEventHandler] Canceled pending callback: nonce=${nonce}, reason=${reason}, remainingPending=${this._pendingCallbacks.size}`);
		}
	}

	/**
	 * Cancel all pending callbacks except the one that just succeeded.
	 * Called when an OAuth flow completes to clean up stale attempts.
	 *
	 * @param excludeNonce The nonce to keep (the successful one)
	 */
	cancelAllPendingCallbacksExcept(excludeNonce: string): void {
		for (const [nonce] of this._pendingCallbacks.entries()) {
			if (nonce !== excludeNonce) {
				this._cancelPendingCallback(nonce, 'superseded by newer attempt');
			}
		}
	}

	/**
	 * Get count of pending callbacks (for diagnostics).
	 */
	getPendingCount(): number {
		return this._pendingCallbacks.size;
	}

	/**
	 * Dispose and reject all pending callbacks.
	 */
	dispose(): void {
		// Reject all pending callbacks
		for (const [nonce, pending] of this._pendingCallbacks.entries()) {
			clearTimeout(pending.timeoutId);
			pending.reject(new Error('FeimaUriEventHandler disposed'));
			this._logService.debug(`[FeimaUriEventHandler] Rejected pending callback on dispose: nonce=${nonce}`);
		}
		this._pendingCallbacks.clear();
	}
}
