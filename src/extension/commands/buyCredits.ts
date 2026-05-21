/*---------------------------------------------------------------------------------------------
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { FeimaAuthenticationService } from '../platform/authentication/vscode/feimaAuthenticationService';
import { ILogService } from '../platform/log/common/logService';
import { FeimaConfigService } from '../../config/configService';
import { getCreditPacks, getCheckoutUrl } from '../services/purchaseService';

/**
 * Register the feima.buyCredits command.
 *
 * Flow:
 * 1. Verify the user is signed in.
 * 2. Fetch available credit packs from the Feima API.
 * 3. Show a QuickPick so the user can select a pack.
 * 4. Call the checkout API to get a personalised Lemon Squeezy URL.
 * 5. Open the URL in the default browser.
 */
export function registerBuyCreditsCommand(
	context: vscode.ExtensionContext,
	authService: FeimaAuthenticationService,
	logService: ILogService
): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('feima.buyCredits', async () => {
			logService.info('feima.buyCredits triggered');

			// --- Guard: must be signed in ---
			// Use authService directly (not vscode.authentication.getSession) so that published
			// marketplace builds behave the same as local dev — the VS Code API layer can return
			// null even when a session exists in some marketplace configurations.
			const sessions = await authService.getSessions([], {});
			if (!sessions.length) {
				const action = await vscode.window.showWarningMessage(
					vscode.l10n.t('Please sign in to Feima to purchase credits.'),
					vscode.l10n.t('Sign In')
				);
				if (action === vscode.l10n.t('Sign In')) {
					await vscode.commands.executeCommand('feima.signIn');
				}
				return;
			}

			try {
				// --- Fetch credit packs ---
				const packs = await vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: vscode.l10n.t('Loading credit packs…'),
						cancellable: false,
					},
					() => getCreditPacks(logService)
				);

				if (!packs.length) {
					vscode.window.showInformationMessage(
						vscode.l10n.t('No credit packs are currently available.')
					);
					return;
				}

				// --- Let the user pick a pack ---
				const items: vscode.QuickPickItem[] = packs.map(p => ({
					label: p.name,
					description: `$${p.priceUsd.toFixed(2)}`,
					detail: vscode.l10n.t('{0} credits', String(p.creditAmount)),
				}));

				const picked = await vscode.window.showQuickPick(items, {
					placeHolder: vscode.l10n.t('Select a credit pack to purchase'),
					ignoreFocusOut: true,
				});

				if (!picked) {
					logService.info('[BuyCredits] User dismissed QuickPick');
					return;
				}

				const selectedPack = packs.find(p => p.name === picked.label);
				if (!selectedPack) {
					return;
				}

				// --- Get personalised checkout URL ---
				const checkoutUrl = await vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: vscode.l10n.t('Preparing checkout…'),
						cancellable: false,
					},
					() => getCheckoutUrl(selectedPack.variantId, authService, logService)
				);

				// --- Open in browser ---
				logService.info(`[BuyCredits] Opening checkout URL for variant=${selectedPack.variantId}`);
				await vscode.env.openExternal(vscode.Uri.parse(checkoutUrl));

			} catch (error) {
				const msg = error instanceof Error ? error.message : String(error);
				logService.error(error as Error, '[BuyCredits]');
				vscode.window.showErrorMessage(
					vscode.l10n.t('Failed to open checkout: {0}', msg)
				);
			}
		})
	);
}
