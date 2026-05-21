/*---------------------------------------------------------------------------------------------
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { FeimaAuthenticationService } from '../platform/authentication/vscode/feimaAuthenticationService';
import { ILogService } from '../platform/log/common/logService';
import { FeimaConfigService } from '../../config/configService';

export interface CreditPack {
	id: number;
	variantId: string;
	name: string;
	creditAmount: number;
	priceUsd: number;
}

/**
 * Fetch the checkout URL for a given variant from the Feima API.
 * The API injects the user_id into Lemon Squeezy custom_data for webhook attribution.
 */
export async function getCheckoutUrl(
	variantId: string,
	authService: FeimaAuthenticationService,
	logService: ILogService
): Promise<string> {
	const config = FeimaConfigService.getInstance().getConfig();
	// Use authService directly (not vscode.authentication.getSession) — consistent with
	// how accountDialog.ts checks auth and avoids VS Code API layer quirks in published builds.
	const token = await authService.getToken();
	if (!token) {
		throw new Error(vscode.l10n.t('Please sign in to Feima first'));
	}

	const url = `${config.apiBaseUrl}/billing/checkout?variant_id=${encodeURIComponent(variantId)}&source=extension`;
	logService.info(`[Purchase] Requesting checkout URL for variant=${variantId}`);

	const response = await fetch(url, {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		const body = await response.text().catch(() => '');
		logService.error(new Error(`Checkout API error ${response.status}: ${body}`), '[Purchase]');
		throw new Error(
			vscode.l10n.t('Failed to get checkout URL: {0}', `HTTP ${response.status}`)
		);
	}

	const data = (await response.json()) as { checkout_url: string };
	return data.checkout_url;
}

/**
 * Fetch available credit packs from the Feima API.
 */
export async function getCreditPacks(
	logService: ILogService
): Promise<CreditPack[]> {
	const config = FeimaConfigService.getInstance().getConfig();
	const url = `${config.apiBaseUrl}/billing/packs`;
	logService.info('[Purchase] Fetching credit packs');

	const response = await fetch(url, {
		method: 'GET',
		headers: { 'Content-Type': 'application/json' },
	});

	if (!response.ok) {
		logService.error(
			new Error(`Credit packs API error ${response.status}`),
			'[Purchase]'
		);
		throw new Error(
			vscode.l10n.t('Failed to fetch credit packs: {0}', `HTTP ${response.status}`)
		);
	}

	const data = (await response.json()) as {
		items: Array<{
			id: number;
			variant_id: string;
			name: string;
			credit_amount: number;
			price_usd: number;
		}>;
	};

	return data.items.map(p => ({
		id: p.id,
		variantId: p.variant_id,
		name: p.name,
		creditAmount: Number(p.credit_amount),
		priceUsd: Number(p.price_usd),
	}));
}
