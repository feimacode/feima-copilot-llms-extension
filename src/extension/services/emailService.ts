/*---------------------------------------------------------------------------------------------
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Email service for managing user email collection.
 */

export interface EmailUpdateResponse {
	success: boolean;
	message: string;
}

export class EmailService {
	constructor(
		private readonly _logService: any,
		private readonly _apiBaseUrl: string,
		private readonly _accessToken: string
	) {
		this._logService = _logService;
	}

	/**
	 * Update user's email address.
	 */
	async updateEmail(email: string): Promise<EmailUpdateResponse> {
		try {
			const response = await fetch(`${this._apiBaseUrl}/user/email`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this._accessToken}`,
				},
				body: JSON.stringify({ email }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.detail || 'Failed to update email');
			}

			return await response.json();
		} catch (error) {
			this._logService.error('[EmailService] Failed to update email:', error);
			throw error;
		}
	}

	/**
	 * Validate email format.
	 */
	static isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}
}