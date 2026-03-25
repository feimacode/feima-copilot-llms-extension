/*---------------------------------------------------------------------------------------------
 *  Feima Account Dialog
 *  Shows user info, balance breakdown, and actions in a modal dialog.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { FeimaAuthenticationService } from '../platform/authentication/vscode/feimaAuthenticationService';
import { ILogger } from '../platform/log/common/logService';
import { getResolvedConfig } from '../../config/configService';

export interface WalletBalance {
	promo_requests: number;
	paid_requests: number;
	reserved_requests: number;
	available_balance: number;
}

/**
 * Fetch wallet balance from the API
 */
async function fetchWalletBalance(authService: FeimaAuthenticationService, logger?: ILogger): Promise<WalletBalance | null> {
	try {
		const token = await authService.getToken();
		if (!token) {
			logger?.warn('[AccountDialog] No auth token available');
			return null;
		}
		const apiBase = getResolvedConfig().apiBaseUrl || '';
		logger?.debug(`[AccountDialog] Fetching wallet balance from ${apiBase}/wallet/balance`);
		
		const response = await fetch(`${apiBase}/wallet/balance`, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			logger?.warn(`[AccountDialog] Wallet balance fetch failed: HTTP ${response.status}`);
			return null;
		}

		const data = await response.json() as {
			promo_requests: number | string;
			paid_requests: number | string;
			reserved_requests: number | string;
			available_balance: number | string;
		};
		logger?.debug(`[AccountDialog] Wallet balance response: ${JSON.stringify(data)}`);
		
		const result = {
			promo_requests: Number(data.promo_requests) || 0,
			paid_requests: Number(data.paid_requests) || 0,
			reserved_requests: Number(data.reserved_requests) || 0,
			available_balance: Number(data.available_balance) || 0
		};
		logger?.debug(`[AccountDialog] Parsed wallet balance: ${JSON.stringify(result)}`);
		return result;
	} catch (error) {
		const errMsg = error instanceof Error ? error.message : String(error);
		logger?.error(`[AccountDialog] Error fetching wallet balance: ${errMsg}`);
		return null;
	}
}

/**
 * Show the account dialog with user info and balance.
 */
export async function showAccountDialog(
	authService: FeimaAuthenticationService,
	logger: ILogger
): Promise<void> {
	logger.info('[AccountDialog] Opening account dialog');

	// Get session info
	const sessions = await authService.getSessions([], {});
	
	if (sessions.length === 0) {
		vscode.window.showWarningMessage('Please sign in to Feima first');
		logger.info('[AccountDialog] No active session');
		return;
	}

	const session = sessions[0];
	const userName = session.account.label;
	const userId = session.account.id;

	// Fetch wallet balance
	const balance = await fetchWalletBalance(authService, logger);

	// Get warning threshold from settings
	const config = vscode.workspace.getConfiguration('feima');
	const warnThreshold = config.get<number>('warnWhenQuotaLow', 50);

	// Build the message
	const totalCredits = balance 
		? balance.promo_requests + balance.paid_requests 
		: 0;
	const promoCredits = balance?.promo_requests || 0;
	const paidCredits = balance?.paid_requests || 0;
	const availableCredits = balance?.available_balance || 0;
	const isLowBalance = availableCredits <= warnThreshold;

	// Create a panel for the account dialog
	const panel = vscode.window.createWebviewPanel(
		'feimaAccount',
		'Feima Account',
		vscode.ViewColumn.One,
		{
			enableScripts: true,
			retainContextWhenHidden: true
		}
	);

	// Handle messages from the webview
	panel.webview.onDidReceiveMessage(
		async (message: { command: string; url?: string }) => {
			switch (message.command) {
				case 'addCredits':
					if (message.url) {
						vscode.env.openExternal(vscode.Uri.parse(message.url));
					}
					break;
				case 'signOut':
					const confirm = await vscode.window.showWarningMessage(
						vscode.l10n.t('Are you sure you want to sign out of Feima?'),
						{ modal: true },
						vscode.l10n.t('Sign Out')
					);
					if (confirm) {
						await authService.signOut();
						panel.dispose();
					}
					break;
			}
		},
		undefined,
		[]
	);

	// Generate the HTML content
	panel.webview.html = getAccountHtml({
		userName,
		userId,
		totalCredits,
		promoCredits,
		paidCredits,
		availableCredits,
		isLowBalance,
		promotionUrl: getResolvedConfig().promotionUrl || 'https://feimacode.cn'
	});

	logger.info(`[AccountDialog] Dialog shown for user: ${userName}`);
}

/**
 * Generate HTML for the account dialog
 */
function getAccountHtml(data: {
	userName: string;
	userId: string;
	totalCredits: number;
	promoCredits: number;
	paidCredits: number;
	availableCredits: number;
	isLowBalance: boolean;
	promotionUrl: string;
}): string {
	const formatNumber = (n: number) => n.toLocaleString();
	const warningIcon = data.isLowBalance ? '⚠️' : '';
	const warningStyle = data.isLowBalance ? 'color: var(--vscode-errorForeground);' : '';

	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<style>
		body {
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			padding: 20px;
			color: var(--vscode-foreground);
		}
		.header {
			display: flex;
			align-items: center;
			margin-bottom: 20px;
		}
		.avatar {
			width: 48px;
			height: 48px;
			border-radius: 50%;
			background: var(--vscode-progressBar-background);
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 24px;
			margin-right: 16px;
		}
		.user-info h2 {
			margin: 0;
			font-size: 18px;
		}
		.user-info p {
			margin: 4px 0 0;
			color: var(--vscode-descriptionForeground);
			font-size: 13px;
		}
		.balance-section {
			background: var(--vscode-editor-background);
			border: 1px solid var(--vscode-editorWidget-border);
			border-radius: 8px;
			padding: 16px;
			margin: 16px 0;
		}
		.balance-section h3 {
			margin: 0 0 12px;
			font-size: 14px;
			color: var(--vscode-descriptionForeground);
		}
		.balance-row {
			display: flex;
			justify-content: space-between;
			padding: 8px 0;
			border-bottom: 1px solid var(--vscode-editorWidget-border);
		}
		.balance-row:last-child {
			border-bottom: none;
			font-weight: bold;
		}
		.balance-row .label {
			color: var(--vscode-descriptionForeground);
		}
		.balance-row .value {
			font-family: var(--vscode-editor-font-family);
		}
		.low-balance {
			${warningStyle}
			font-weight: bold;
		}
		.actions {
			display: flex;
			gap: 8px;
			margin-top: 20px;
		}
		button {
			padding: 8px 16px;
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 13px;
		}
		button.primary {
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
		}
		button.secondary {
			background: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
		}
		button:hover {
			opacity: 0.9;
		}
	</style>
</head>
<body>
	<div class="header">
		<div class="avatar">👤</div>
		<div class="user-info">
			<h2>${data.userName}</h2>
			<p>ID: ${data.userId}</p>
		</div>
	</div>

	<div class="balance-section">
		<h3>${warningIcon} Balance</h3>
		<div class="balance-row">
			<span class="label">Promo Credits</span>
			<span class="value">${formatNumber(data.promoCredits)} requests</span>
		</div>
		<div class="balance-row">
			<span class="label">Paid Credits</span>
			<span class="value">${formatNumber(data.paidCredits)} requests</span>
		</div>
		<div class="balance-row">
			<span class="label">Total</span>
			<span class="value">${formatNumber(data.totalCredits)} requests</span>
		</div>
		<div class="balance-row">
			<span class="label">Available ${warningIcon}</span>
			<span class="value ${data.isLowBalance ? 'low-balance' : ''}">${formatNumber(data.availableCredits)} requests</span>
		</div>
		${data.isLowBalance ? '<p style="color: var(--vscode-errorForeground); font-size: 12px; margin-top: 8px;">⚠️ Low balance! Consider adding more credits.</p>' : ''}
	</div>

	<div class="actions">
		<button class="primary" onclick="addCredits()">Add Credits</button>
		<button class="secondary" onclick="signOut()">Sign Out</button>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		function addCredits() {
			vscode.postMessage({ command: 'addCredits', url: '${data.promotionUrl}' });
		}
		function signOut() {
			vscode.postMessage({ command: 'signOut' });
		}
	</script>
</body>
</html>`;
}