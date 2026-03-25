/*---------------------------------------------------------------------------------------------
 *  Feima Quota Service
 *  Central service for quota updates. Emits events that subscribers can listen to.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export interface QuotaSnapshot {
	total: number;
	remaining: number;
	remainingPromo: number;
	remainingPaid: number;
}

class QuotaService {
	private readonly _onQuotaChanged = new vscode.EventEmitter<QuotaSnapshot | null>();
	readonly onQuotaChanged = this._onQuotaChanged.event;

	/**
	 * Emit a quota change event.
	 * Called by modelCatalog or chat endpoint when quota is updated.
	 */
	setQuota(quota: QuotaSnapshot): void {
		this._onQuotaChanged.fire(quota);
	}

	/**
	 * Clear quota state (e.g., on sign-out).
	 * Fires an event with null quota to notify subscribers.
	 */
	clearQuota(): void {
		this._onQuotaChanged.fire(null);
	}

	/**
	 * Dispose the service and clean up resources.
	 */
	dispose(): void {
		this._onQuotaChanged.dispose();
	}
}

// Singleton instance
let instance: QuotaService | undefined;

/**
 * Get or create the quota service singleton.
 */
export function getQuotaService(): QuotaService {
	if (!instance) {
		instance = new QuotaService();
	}
	return instance;
}
