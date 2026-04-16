/*---------------------------------------------------------------------------------------------
 *  Feima Account Dialog
 *  Shows user info, balance breakdown, referral info, and activity history.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { FeimaAuthenticationService } from '../platform/authentication/vscode/feimaAuthenticationService';
import { ILogger } from '../platform/log/common/logService';
import { getResolvedConfig } from '../../config/configService';

// ============= Data Interfaces =============

export interface WalletBalance {
	promo_requests: number;
	paid_requests: number;
	reserved_requests: number;
	available_balance: number;
}

export interface UserProfile {
	user_id: number;
	role: string;
	status: string;
	referral_code: string | null;
}

export interface ReferralStats {
	total_referrals: number;
	used_slots: number;
	max_slots: number;
	earned_requests: number;
}

export interface Transaction {
	id: number;
	tx_type: string;
	category: string;
	amount: number;
	model_id: string | null;
	created_at: string;
}

export interface ApiCall {
	id: number;
	correlation_id: string;
	endpoint: string;
	model_id: string;
	input_tokens: number | null;
	output_tokens: number | null;
	total_tokens: number | null;
	status_code: number;
	latency_ms: number;
	created_at: string;
}

export interface IDPUserInfo {
	sub: string;
	name: string;
	email: string;
	email_verified: boolean;
	picture: string | null;
	external_id: string;
}

// ============= API Functions =============

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
 * Fetch user profile with avatar from IDP
 */
async function fetchIDPUserInfo(authService: FeimaAuthenticationService, logger?: ILogger): Promise<IDPUserInfo | null> {
	try {
		const token = await authService.getToken();
		if (!token) {
			logger?.warn('[AccountDialog] No token available for IDP userinfo fetch');
			return null;
		}
		const config = getResolvedConfig();
		const idpBase = config.authBaseUrl || '';
		if (!idpBase) {
			logger?.warn('[AccountDialog] IDP base URL (authBaseUrl) not configured');
			return null;
		}
		
		const url = `${idpBase}/oauth/userinfo`;
		logger?.debug(`[AccountDialog] Fetching IDP userinfo from: ${url}`);
		
		const response = await fetch(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			let errorDetails = '';
			try {
				const errorBody = await response.json();
				errorDetails = JSON.stringify(errorBody);
			} catch {
				errorDetails = response.statusText;
			}
			logger?.warn(
				`[AccountDialog] IDP userinfo fetch failed: HTTP ${response.status} from ${url} - ${errorDetails}`
			);
			return null;
		}

		return await response.json() as IDPUserInfo;
	} catch (error) {
		const errMsg = error instanceof Error ? error.message : String(error);
		logger?.error(`[AccountDialog] Error fetching IDP userinfo: ${errMsg}`);
		return null;
	}
}

/**
 * Fetch user profile (status, referral code) from the API
 */
async function fetchUserProfile(authService: FeimaAuthenticationService, logger?: ILogger): Promise<UserProfile | null> {
	try {
		const token = await authService.getToken();
		if (!token) {
			logger?.warn('[AccountDialog] No token available for user profile fetch');
			return null;
		}
		const apiBase = getResolvedConfig().apiBaseUrl || '';
		const url = `${apiBase}/me`;
		logger?.debug(`[AccountDialog] Fetching user profile from: ${url}`);
		
		const response = await fetch(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			logger?.warn(
				`[AccountDialog] User profile fetch failed: HTTP ${response.status} from ${url} (${response.statusText})`
			);
			return null;
		}

		return await response.json() as UserProfile;
	} catch (error) {
		const errMsg = error instanceof Error ? error.message : String(error);
		logger?.error(`[AccountDialog] Error fetching user profile: ${errMsg}`);
		return null;
	}
}

/**
 * Fetch referral status from the API
 */
async function fetchReferralStatus(authService: FeimaAuthenticationService, logger?: ILogger): Promise<{ referral_code: string; stats: ReferralStats } | null> {
	try {
		const token = await authService.getToken();
		if (!token) {
			logger?.warn('[AccountDialog] No token available for referral status fetch');
			return null;
		}
		const apiBase = getResolvedConfig().apiBaseUrl || '';
		const url = `${apiBase}/referral/status`;
		logger?.debug(`[AccountDialog] Fetching referral status from: ${url}`);
		
		const response = await fetch(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			logger?.warn(
				`[AccountDialog] Referral status fetch failed: HTTP ${response.status} from ${url} (${response.statusText})`
			);
			return null;
		}

		return await response.json() as { referral_code: string; stats: ReferralStats };
	} catch (error) {
		const errMsg = error instanceof Error ? error.message : String(error);
		logger?.error(`[AccountDialog] Error fetching referral status: ${errMsg}`);
		return null;
	}
}

/**
 * Fetch recent transactions from the API
 */
async function fetchTransactions(authService: FeimaAuthenticationService, limit: number = 20, logger?: ILogger): Promise<Transaction[]> {
	try {
		const token = await authService.getToken();
		if (!token) {
			logger?.warn('[AccountDialog] No token available for transactions fetch');
			return [];
		}
		const apiBase = getResolvedConfig().apiBaseUrl || '';
		const url = `${apiBase}/wallet/transactions?limit=${limit}&offset=0`;
		logger?.debug(`[AccountDialog] Fetching transactions from: ${url}`);
		
		const response = await fetch(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			logger?.warn(
				`[AccountDialog] Transactions fetch failed: HTTP ${response.status} from ${url} (${response.statusText})`
			);
			return [];
		}

		const data = await response.json() as { items: Transaction[] };
		return data.items || [];
	} catch (error) {
		const errMsg = error instanceof Error ? error.message : String(error);
		logger?.error(`[AccountDialog] Error fetching transactions: ${errMsg}`);
		return [];
	}
}

/**
 * Fetch recent API calls from the API
 */
async function fetchApiCalls(authService: FeimaAuthenticationService, limit: number = 20, logger?: ILogger): Promise<ApiCall[]> {
	try {
		const token = await authService.getToken();
		if (!token) {
			logger?.warn('[AccountDialog] No token available for API calls fetch');
			return [];
		}
		const apiBase = getResolvedConfig().apiBaseUrl || '';
		const url = `${apiBase}/api/calls?limit=${limit}&offset=0`;
		logger?.debug(`[AccountDialog] Fetching API calls from: ${url}`);
		
		const response = await fetch(url, {
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			logger?.warn(
				`[AccountDialog] API calls fetch failed: HTTP ${response.status} from ${url} (${response.statusText})`
			);
			return [];
		}

		const data = await response.json() as { items: ApiCall[] };
		return data.items || [];
	} catch (error) {
		const errMsg = error instanceof Error ? error.message : String(error);
		logger?.error(`[AccountDialog] Error fetching API calls: ${errMsg}`);
		return [];
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

	// Fetch wallet balance (required)
	const balance = await fetchWalletBalance(authService, logger);
	
	// Fetch optional data with graceful fallbacks
	const userProfile = await fetchUserProfile(authService, logger);
	const idpUserInfo = await fetchIDPUserInfo(authService, logger);
	const referralStatus = await fetchReferralStatus(authService, logger);
	const transactions = await fetchTransactions(authService, 20, logger);
	const apiCalls = await fetchApiCalls(authService, 20, logger);

	// Get warning threshold from settings
	const config = vscode.workspace.getConfiguration('feima');
	const warnThreshold = config.get<number>('warnWhenQuotaLow', 50);

	// Build derived values
	const totalCredits = balance 
		? balance.promo_requests + balance.paid_requests 
		: 0;
	const promoCredits = balance?.promo_requests || 0;
	const paidCredits = balance?.paid_requests || 0;
	const availableCredits = balance?.available_balance || 0;
	const isLowBalance = availableCredits <= warnThreshold;
	const accountStatus = userProfile?.status || 'active';
	const referralCode = referralStatus?.referral_code || userProfile?.referral_code || '';
	const referralStats = referralStatus?.stats || null;
	const avatarUrl = idpUserInfo?.picture || null;

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
		async (message: { command: string; url?: string; text?: string }) => {
			switch (message.command) {
				case 'viewProfile':
					if (message.url) {
						vscode.env.openExternal(vscode.Uri.parse(message.url));
					}
					break;
				case 'copyReferralCode':
					if (message.text) {
						await vscode.env.clipboard.writeText(message.text);
						vscode.window.showInformationMessage(vscode.l10n.t('Referral code copied to clipboard'));
					}
					break;
				case 'viewMore':
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
		accountStatus,
		totalCredits,
		promoCredits,
		paidCredits,
		availableCredits,
		isLowBalance,
		avatarUrl,
		referralCode,
		referralStats,
		transactions,
		apiCalls,
		profileUrl: getResolvedConfig().promotionUrl || 'https://feimacode.cn'
	});

	logger.info(`[AccountDialog] Dialog shown for user: ${userName}`);
}

/**
 * Generate HTML for the account dialog
 */
function getAccountHtml(data: {
	userName: string;
	userId: string;
	accountStatus: string;
	totalCredits: number;
	promoCredits: number;
	paidCredits: number;
	availableCredits: number;
	isLowBalance: boolean;
	avatarUrl: string | null;
	referralCode: string;
	referralStats: ReferralStats | null;
	transactions: Transaction[];
	apiCalls: ApiCall[];
	profileUrl: string;
}): string {
	const formatNumber = (n: number) => n.toLocaleString();
	const formatDate = (dateStr: string) => {
		try {
			const date = new Date(dateStr);
			return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} catch {
			return dateStr;
		}
	};
	const formatShortDate = (dateStr: string) => {
		try {
			const date = new Date(dateStr);
			return date.toLocaleDateString();
		} catch {
			return dateStr;
		}
	};
	const t = (key: string, ...args: (string | number)[]) => vscode.l10n.t(key, ...args.map(String));
	const warningIcon = data.isLowBalance ? '⚠️' : '';
	const warningStyle = data.isLowBalance ? 'color: var(--vscode-errorForeground);' : '';

	// Avatar - use real image from IDP if available, fallback to emoji
	const avatarHtml = data.avatarUrl 
		? `<img src="${data.avatarUrl}" alt="Avatar" class="avatar-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="avatar-emoji" style="display:none;">👤</div>`
		: '<div class="avatar-emoji">👤</div>';
	
	// Status badge
	const isActive = data.accountStatus === 'active';
	const statusBadge = isActive 
		? `<span class="status-badge status-active">✓ ${t('Active')}</span>`
		: `<span class="status-badge status-suspended">✗ ${t('Suspended')}</span>`;

	// Referral section
	const referralSection = data.referralCode ? `
		<div class="referral-section">
			<h3>🔗 ${t('Referral Code')}</h3>
			<div class="referral-code-row">
				<code class="referral-code">${data.referralCode}</code>
				<button class="copy-btn" onclick="copyReferralCode()">${t('Copy')}</button>
			</div>
			${data.referralStats ? `
				<p class="referral-stats">
					${t('Referrals: {0}/{1}', data.referralStats.used_slots, data.referralStats.max_slots)} | 
					${t('Earned: {0} requests', formatNumber(data.referralStats.earned_requests))}
				</p>
			` : ''}
		</div>
	` : '';

	// Transactions table
	const transactionRows = data.transactions.slice(0, 20).map(tx => `
		<tr>
			<td>${formatShortDate(tx.created_at)}</td>
			<td>${t(tx.category) || tx.category}</td>
			<td class="${tx.tx_type === 'credit' ? 'amount-positive' : 'amount-negative'}">
				${tx.tx_type === 'credit' ? '+' : ''}${formatNumber(tx.amount)}
			</td>
		</tr>
	`).join('');
	const transactionsSection = `
		<div class="table-section">
			<h3>📊 ${t('Recent Transactions')}</h3>
			<table class="data-table">
				<thead>
					<tr>
						<th>${t('Date')}</th>
						<th>${t('Category')}</th>
						<th>${t('Amount')}</th>
					</tr>
				</thead>
				<tbody>
					${transactionRows || `<tr><td colspan="3" class="empty">${t('No transactions yet')}</td></tr>`}
				</tbody>
			</table>
			${data.transactions.length > 0 ? `<button class="link-btn" onclick="viewMore('transactions')">${t('View More')} →</button>` : ''}
		</div>
	`;

	// API Calls table
	const apiCallRows = data.apiCalls.slice(0, 20).map(call => `
		<tr>
			<td>${formatShortDate(call.created_at)}</td>
			<td>${call.model_id || call.endpoint}</td>
			<td>${call.total_tokens ? formatNumber(call.total_tokens) : '-'}</td>
			<td class="status-${Math.floor(call.status_code / 100)}">${call.status_code}</td>
		</tr>
	`).join('');
	const apiCallsSection = `
		<div class="table-section">
			<h3>📈 ${t('Recent API Calls')}</h3>
			<table class="data-table">
				<thead>
					<tr>
						<th>${t('Date')}</th>
						<th>${t('Model')}</th>
						<th>${t('Tokens')}</th>
						<th>${t('Status')}</th>
					</tr>
				</thead>
				<tbody>
					${apiCallRows || `<tr><td colspan="4" class="empty">${t('No API calls yet')}</td></tr>`}
				</tbody>
			</table>
			${data.apiCalls.length > 0 ? `<button class="link-btn" onclick="viewMore('apiCalls')">${t('View More')} →</button>` : ''}
		</div>
	`;

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
			max-width: 800px;
		}
		.header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 20px;
		}
		.header-left {
			display: flex;
			align-items: center;
		}
		.avatar {
			width: 48px;
			height: 48px;
			border-radius: 50%;
			overflow: hidden;
			margin-right: 16px;
		}
		.avatar-emoji {
			width: 100%;
			height: 100%;
			background: var(--vscode-progressBar-background);
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 24px;
		}
		.avatar-image {
			width: 100%;
			height: 100%;
			object-fit: cover;
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
		.status-badge {
			padding: 4px 12px;
			border-radius: 12px;
			font-size: 12px;
			font-weight: 500;
		}
		.status-active {
			background: rgba(0, 128, 0, 0.2);
			color: #4caf50;
		}
		.status-suspended {
			background: rgba(255, 0, 0, 0.2);
			color: #f44336;
		}
		.section {
			background: var(--vscode-editor-background);
			border: 1px solid var(--vscode-editorWidget-border);
			border-radius: 8px;
			padding: 16px;
			margin: 16px 0;
		}
		.section h3 {
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
		.referral-code-row {
			display: flex;
			align-items: center;
			gap: 12px;
			margin-bottom: 8px;
		}
		.referral-code {
			background: var(--vscode-input-background);
			padding: 8px 16px;
			border-radius: 4px;
			font-family: var(--vscode-editor-font-family);
			font-size: 14px;
		}
		.referral-stats {
			color: var(--vscode-descriptionForeground);
			font-size: 13px;
			margin: 8px 0 0;
		}
		.copy-btn {
			padding: 6px 12px;
			border: 1px solid var(--vscode-button-border);
			border-radius: 4px;
			background: var(--vscode-button-secondaryBackground);
			color: var(--vscode-button-secondaryForeground);
			cursor: pointer;
			font-size: 12px;
		}
		.copy-btn:hover {
			background: var(--vscode-button-secondaryHoverBackground);
		}
		.table-section {
			background: var(--vscode-editor-background);
			border: 1px solid var(--vscode-editorWidget-border);
			border-radius: 8px;
			padding: 16px;
			margin: 16px 0;
		}
		.table-section h3 {
			margin: 0 0 12px;
			font-size: 14px;
			color: var(--vscode-descriptionForeground);
		}
		.data-table {
			width: 100%;
			border-collapse: collapse;
			font-size: 13px;
		}
		.data-table th {
			text-align: left;
			padding: 8px;
			color: var(--vscode-descriptionForeground);
			border-bottom: 1px solid var(--vscode-editorWidget-border);
		}
		.data-table td {
			padding: 8px;
			border-bottom: 1px solid var(--vscode-editorWidget-border);
		}
		.data-table tr:last-child td {
			border-bottom: none;
		}
		.data-table .empty {
			text-align: center;
			color: var(--vscode-descriptionForeground);
		}
		.amount-positive {
			color: #4caf50;
		}
		.amount-negative {
			color: #f44336;
		}
		.status-2 {
			color: #4caf50;
		}
		.status-4 {
			color: #f44336;
		}
		.status-5 {
			color: #ff9800;
		}
		.link-btn {
			display: block;
			margin-top: 12px;
			padding: 0;
			border: none;
			background: transparent;
			color: var(--vscode-textLink-foreground);
			cursor: pointer;
			font-size: 13px;
		}
		.link-btn:hover {
			color: var(--vscode-textLink-activeForeground);
		}
		.actions {
			display: flex;
			gap: 8px;
			margin-top: 20px;
		}
		button.primary {
			padding: 8px 16px;
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 13px;
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
		}
		button.secondary {
			padding: 8px 16px;
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 13px;
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
		<div class="header-left">
			<div class="avatar">${avatarHtml}</div>
			<div class="user-info">
				<h2>${data.userName}</h2>
				<p>ID: ${data.userId}</p>
			</div>
		</div>
		${statusBadge}
	</div>

	<div class="section">
		<h3>💰 ${warningIcon} ${t('Balance')}</h3>
		<div class="balance-row">
			<span class="label">${t('Promo Credits')}</span>
			<span class="value">${formatNumber(data.promoCredits)} ${t('requests')}</span>
		</div>
		<div class="balance-row">
			<span class="label">${t('Paid Credits')}</span>
			<span class="value">${formatNumber(data.paidCredits)} ${t('requests')}</span>
		</div>
		<div class="balance-row">
			<span class="label">${t('Total')}</span>
			<span class="value">${formatNumber(data.totalCredits)} ${t('requests')}</span>
		</div>
		<div class="balance-row">
			<span class="label">${t('Available')} ${warningIcon}</span>
			<span class="value ${data.isLowBalance ? 'low-balance' : ''}">${formatNumber(data.availableCredits)} ${t('requests')}</span>
		</div>
		${data.isLowBalance ? `<p style="color: var(--vscode-errorForeground); font-size: 12px; margin-top: 8px;">⚠️ ${t('Low balance! Consider adding more credits.')}</p>` : ''}
	</div>

	${referralSection}

	${transactionsSection}

	${apiCallsSection}

	<div class="actions">
		<button class="primary" onclick="viewProfile()">${t('View Profile')}</button>
		<button class="secondary" onclick="signOut()">${t('Sign Out')}</button>
	</div>

	<script>
		const vscode = acquireVsCodeApi();
		const profileUrl = '${data.profileUrl}';
		const referralCode = '${data.referralCode}';
		
		function viewProfile() {
			vscode.postMessage({ command: 'viewProfile', url: profileUrl });
		}
		function copyReferralCode() {
			vscode.postMessage({ command: 'copyReferralCode', text: referralCode });
		}
		function viewMore(section) {
			vscode.postMessage({ command: 'viewMore', url: profileUrl + '/' + section });
		}
		function signOut() {
			vscode.postMessage({ command: 'signOut' });
		}
	</script>
</body>
</html>`;
}