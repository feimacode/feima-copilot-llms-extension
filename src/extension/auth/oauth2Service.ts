/*---------------------------------------------------------------------------------------------
 *  Licensed under the MIT License.
 *  Adapted from feima-code OAuth2Service - simplified without dependency injection.
 *--------------------------------------------------------------------------------------------*/

import * as crypto from 'crypto';
import fetch from 'node-fetch';

/**
 * OAuth2 token response structure
 */
export interface ITokenResponse {
	access_token: string;
	refresh_token?: string;
	expires_in?: number;
	token_type: string;
	id_token?: string;
}

/**
 * JWT claims structure from ID token
 */
export interface IJWTClaims {
	sub: string;           // User ID
	email?: string;        // User email
	name?: string;         // Display name
	picture?: string;      // Avatar URL
	iss?: string;          // Issuer
	aud?: string;          // Audience
	exp?: number;          // Expiration
	iat?: number;          // Issued at
}

/**
 * OAuth2 authorization URL with metadata.
 */
export interface IAuthorizationUrl {
	url: string;
	nonce: string;          // State/nonce for callback routing
	codeVerifier: string;   // PKCE code verifier for token exchange
}

/**
 * OAuth2 configuration (from ConfigService or region defaults).
 * Can be overridden by VS Code settings.
 */
export interface IOAuth2Config {
	authBaseUrl: string;      // Base URL for auth server
	clientId: string;         // OAuth2 client ID
	scopes: string[];         // OAuth2 scopes to request
}

/**
 * OAuth2 endpoints derived from config.
 */
export interface IOAuth2Endpoints {
	authorizationEndpoint: string;
	tokenEndpoint: string;
	revokeEndpoint: string;
	userinfoEndpoint: string;
}

/**
 * Stateless OAuth2 service for authorization code flow with PKCE.
 * No internal state management - all flow state is returned to caller.
 * Pattern adapted from feima-code OAuth2Service.
 */
export class OAuth2Service {

	/**
	 * Build authorization URL for OAuth2 flow.
	 * Returns URL along with nonce and codeVerifier for caller to manage.
	 * 
	 * @param redirectUri OAuth2 redirect URI
	 * @param config OAuth2 configuration (can be from VS Code settings or region defaults)
	 * @param referralCode Optional referral code to pass to OAuth server (for signup bonus)
	 * @returns Authorization URL with nonce and codeVerifier
	 */
	async buildAuthorizationUrl(redirectUri: string, config: IOAuth2Config, referralCode?: string): Promise<IAuthorizationUrl> {
		const endpoints = this.deriveEndpoints(config);

		// Generate PKCE parameters
		const codeVerifier = this.generateCodeVerifier();
		const codeChallenge = await this.generateCodeChallenge(codeVerifier);

		// Generate state (used as nonce for callback routing)
		const state = this.generateState();

		// Build authorization URL
		const authUrl = new URL(endpoints.authorizationEndpoint);
		authUrl.searchParams.set('client_id', config.clientId);
		authUrl.searchParams.set('response_type', 'code');
		authUrl.searchParams.set('redirect_uri', redirectUri);
		authUrl.searchParams.set('state', state);
		authUrl.searchParams.set('code_challenge', codeChallenge);
		authUrl.searchParams.set('code_challenge_method', 'S256');
		authUrl.searchParams.set('scope', config.scopes.join(' '));

		// Add referral code if provided (for signup bonus)
		if (referralCode) {
			authUrl.searchParams.set('ref', referralCode);
		}

		return {
			url: authUrl.toString(),
			nonce: state,
			codeVerifier
		};
	}



	/**
	 * Call the IDP logout endpoint to invalidate the server-side session.
	 *
	 * Deletes the DB session record so the next /authorize request treats the
	 * browser as unauthenticated and shows the login page.
	 *
	 * @param accessToken The access token of the session to terminate
	 * @param config OAuth2 configuration
	 */
	async logout(accessToken: string, config: IOAuth2Config): Promise<void> {
		const logoutEndpoint = `${config.authBaseUrl}/oauth/logout`;
		try {
			const response = await fetch(logoutEndpoint, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Accept': 'application/json',
				},
			});
			if (!response.ok) {
				// Non-fatal — local token is cleared regardless
				const errorText = await response.text();
				throw new Error(`IDP logout failed: ${response.status} ${errorText}`);
			}
		} catch (error) {
			// Re-throw so caller can log; local sign-out should still proceed
			throw error;
		}
	}

	/**
	 * Exchange authorization code for access token.
	 * 
	 * @param code Authorization code from callback
	 * @param codeVerifier PKCE code verifier from buildAuthorizationUrl
	 * @param redirectUri Redirect URI used in authorization request
	 * @param config OAuth2 configuration (can be from VS Code settings or region defaults)
	 * @returns Token response with access token, refresh token, etc.
	 */
	async exchangeCodeForToken(code: string, codeVerifier: string, redirectUri: string, config: IOAuth2Config): Promise<ITokenResponse> {
		const endpoints = this.deriveEndpoints(config);

		const body = new URLSearchParams();
		body.append('grant_type', 'authorization_code');
		body.append('client_id', config.clientId);
		body.append('code', code);
		body.append('redirect_uri', redirectUri);
		body.append('code_verifier', codeVerifier);

		const response = await fetch(endpoints.tokenEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': 'application/json'
			},
			body: body.toString()
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
		}

		return await response.json() as ITokenResponse;
	}

	/**
	 * Refresh access token using refresh token.
	 * 
	 * @param refreshToken Refresh token from token response
	 * @param config OAuth2 configuration (can be from VS Code settings or region defaults)
	 * @returns New token response with refreshed access token
	 */
	async refreshAccessToken(refreshToken: string, config: IOAuth2Config): Promise<ITokenResponse> {
		const endpoints = this.deriveEndpoints(config);

		const body = new URLSearchParams();
		body.append('grant_type', 'refresh_token');
		body.append('client_id', config.clientId);
		body.append('refresh_token', refreshToken);

		const response = await fetch(endpoints.tokenEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Accept': 'application/json'
			},
			body: body.toString()
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
		}

		return await response.json() as ITokenResponse;
	}

	/**
	 * Extract user claims from JWT token.
	 * Decodes without verification (server already validated).
	 * 
	 * @param tokenResponse Token response containing access_token or id_token
	 * @returns Parsed JWT claims or null if parsing fails
	 */
	getUserInfo(tokenResponse: ITokenResponse): IJWTClaims | null {
		try {
			const token = tokenResponse.id_token || tokenResponse.access_token;
			if (!token) {
				return null;
			}

			// Decode JWT (without verification - server already validated)
			const parts = token.split('.');
			if (parts.length !== 3) {
				return null;
			}

			const payload = parts[1];
			// Add padding if needed for Base64 decoding
			const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
			const decoded = Buffer.from(paddedPayload, 'base64').toString('utf8');
			return JSON.parse(decoded);
		} catch {
			// Silent error - JWT parsing is optional
			return null;
		}
	}

	/**
	 * Check if token needs refresh (5 minutes before expiration).
	 *
	 * Primary source: `expires_in` from the OAuth token response + `issuedAt` timestamp.
	 * Fallback: `exp` claim decoded from the JWT itself when `expires_in` is absent
	 * (feima-idp may omit the field in some responses).
	 */
	shouldRefreshToken(tokenResponse: ITokenResponse, issuedAt: number): boolean {
		const fiveMinutes = 5 * 60 * 1000;
		const now = Date.now();

		if (tokenResponse.expires_in) {
			const expiresAt = issuedAt + (tokenResponse.expires_in * 1000);
			return (expiresAt - now) < fiveMinutes;
		}

		// Fallback: decode JWT exp claim from access_token
		try {
			const claims = this.getUserInfo(tokenResponse);
			if (claims?.exp) {
				const expiresAt = claims.exp * 1000; // exp is in seconds
				return (expiresAt - now) < fiveMinutes;
			}
		} catch {
			// JWT decode failure is non-fatal
		}

		// No expiry information available — don't proactively refresh
		return false;
	}

	// ============ Configuration Helpers ============

	/**
	 * Derive OAuth2 endpoints from configuration.
	 * Allows config to come from either VS Code settings or region defaults.
	 */
	private deriveEndpoints(config: IOAuth2Config): IOAuth2Endpoints {
		const baseUrl = config.authBaseUrl;
		return {
			authorizationEndpoint: `${baseUrl}/oauth/authorize`,
			tokenEndpoint: `${baseUrl}/oauth/token`,
			revokeEndpoint: `${baseUrl}/oauth/revoke`,
			userinfoEndpoint: `${baseUrl}/oauth/userinfo`,
		};
	}

	// ============ PKCE Helpers ============

	/**
	 * Generate random code verifier (43-128 characters)
	 */
	private generateCodeVerifier(): string {
		return crypto.randomBytes(32).toString('base64url');
	}

	/**
	 * Generate code challenge from verifier (SHA256)
	 */
	private async generateCodeChallenge(verifier: string): Promise<string> {
		const hash = crypto.createHash('sha256').update(verifier).digest();
		return Buffer.from(hash).toString('base64url');
	}

	/**
	 * Generate random state parameter
	 */
	private generateState(): string {
		return crypto.randomBytes(32).toString('base64url');
	}

	/**
	 * Generate random nonce parameter
	 */
	private generateNonce(): string {
		return crypto.randomBytes(16).toString('base64url');
	}
}
