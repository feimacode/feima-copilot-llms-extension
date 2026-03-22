/*---------------------------------------------------------------------------------------------
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { FeimaAuthenticationService } from '../platform/authentication/vscode/feimaAuthenticationService';
import { ILogService } from '../platform/log/common/logService';
import { showAccountDialog } from '../dialogs/accountDialog';

/**
 * Register all authentication-related commands
 */
export function registerAuthCommands(
	context: vscode.ExtensionContext,
	authService: FeimaAuthenticationService,
	logService: ILogService
): void {
	// Sign In command
	context.subscriptions.push(
		vscode.commands.registerCommand('feima.signIn', async () => {
			logService.info('feima.signIn triggered');
			
			try {
				// Directly call createSession instead of using VS Code API
				// This allows multiple concurrent sign-in attempts (user can retry if browser closes)
				const session = await authService.createSession([], {});
				
				vscode.window.showInformationMessage(
					vscode.l10n.t('Signed in as {0}', session.account.label)
				);
				logService.info(`Sign in successful: ${session.account.label}`);
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				vscode.window.showErrorMessage(vscode.l10n.t('Sign in failed: {0}', errorMsg));
				logService.error(error as Error, 'Sign in failed');
			}
		})
	);

	// Sign Out command
	context.subscriptions.push(
		vscode.commands.registerCommand('feima.signOut', async () => {
			logService.info('feima.signOut triggered');
			
			try {
				await authService.signOut();
				vscode.window.showInformationMessage(vscode.l10n.t('Signed out of Feima'));
				logService.info('Sign out successful');
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				vscode.window.showErrorMessage(vscode.l10n.t('Sign out failed: {0}', errorMsg));
				logService.error(error as Error, 'Sign out failed');
			}
		})
	);

	// Show Account command
	context.subscriptions.push(
		vscode.commands.registerCommand('feima.showAccount', async () => {
			logService.info('feima.showAccount triggered');
			
			try {
				// Show the full account dialog with balance
				await showAccountDialog(authService, logService);
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				vscode.window.showErrorMessage(vscode.l10n.t('Failed to get account info: {0}', errorMsg));
				logService.error(error as Error, 'Get account failed');
			}
		})
	);

	logService.info('Registered: feima.signIn, feima.signOut, feima.showAccount');
}
