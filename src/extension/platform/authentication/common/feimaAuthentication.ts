/*---------------------------------------------------------------------------------------------
 *  Licensed under the MIT License.
 *  Adapted from feima-code authentication service architecture.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';

/**
 * Service interface for Feima authentication.
 *
 * Provides both consumer-facing methods (getToken, isAuthenticated) AND
 * VS Code AuthenticationProvider methods (getSessions, createSession, removeSession).
 *
 * Architecture:
 * - FeimaAuthenticationService: Heavy implementation (OAuth2, session management, secrets)
 * - FeimaAuthProvider: Thin VS Code adapter that delegates to the service
 * - Other services: Use getToken/isAuthenticated for API access
 */
export interface IFeimaAuthenticationService {
	readonly _serviceBrand: undefined;

	// ============ Consumer-Facing Methods ============

	/**
	 * Get current JWT token for Feima API.
	 * @returns JWT token string or undefined if not authenticated or expired
	 */
	getToken(): Promise<string | undefined>;

	/**
	 * Check if user is authenticated with Feima.
	 * @returns true if authenticated, false otherwise
	 */
	isAuthenticated(): Promise<boolean>;

	/**
	 * Refresh JWT token from authentication server.
	 * @returns Fresh JWT token or undefined if refresh fails
	 */
	refreshToken(): Promise<string | undefined>;

	/**
	 * Force an immediate token refresh, bypassing the time-based check.
	 *
	 * Call this after receiving an HTTP 401 from the API — the token is invalid
	 * server-side even if the client-side clock hasn't reached the expiry window.
	 *
	 * @returns New session if refresh succeeded, null if refresh is impossible
	 *          (no refresh token, or refresh token itself expired).
	 *          When null is returned the caller should trigger full re-authentication.
	 */
	forceRefresh(): Promise<vscode.AuthenticationSession | null>;

	/**
	 * Sign out and clear all stored tokens.
	 */
	signOut(): Promise<void>;

	// ============ Provider Methods (for FeimaAuthProvider delegation) ============

	/**
	 * Get all authentication sessions.
	 * Used by VS Code AuthenticationProvider interface.
	 */
	getSessions(
		scopes: readonly string[] | undefined,
		options: vscode.AuthenticationProviderSessionOptions
	): Promise<vscode.AuthenticationSession[]>;

	/**
	 * Create a new authentication session via OAuth2 + PKCE flow.
	 * Used by VS Code AuthenticationProvider interface.
	 */
	createSession(
		scopes: readonly string[],
		options: vscode.AuthenticationProviderSessionOptions
	): Promise<vscode.AuthenticationSession>;

	/**
	 * Remove an authentication session.
	 * Used by VS Code AuthenticationProvider interface.
	 */
	removeSession(sessionId: string): Promise<void>;

	/**
	 * Get cached sessions synchronously (non-blocking).
	 * Used by FeimaAuthProvider for fast checks.
	 */
	getCachedSessions(): vscode.AuthenticationSession[];

	/**
	 * Event fired when sessions change.
	 * Used by VS Code AuthenticationProvider interface.
	 */
	readonly onDidChangeSessions: vscode.Event<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>;

	/**
	 * Handle OAuth callback URI (called by VS Code UriHandler).
	 * Used by FeimaAuthProvider for OAuth2 flow.
	 */
	handleUri(uri: vscode.Uri): Promise<void>;
}
