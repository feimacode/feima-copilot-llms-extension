/*---------------------------------------------------------------------------------------------
 *  Feima Status Bar
 *  Shows credit balance in VS Code status bar, listening to quota service events.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogger } from './platform/log/common/logService';
import { getQuotaService, QuotaSnapshot } from './services/quotaService';

let statusBarItem: vscode.StatusBarItem | undefined;
let logger: ILogger | undefined;

/**
 * Initialize the status bar item.
 * Should be called during extension activation.
 */
export function initializeStatusBar(
	context: vscode.ExtensionContext,
	log: ILogger
): void {
	logger = log;

	// Create status bar item - positioned on the right side
	statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100  // Priority - appears near other extensions' status items
	);

	// Set command to open account dialog
	statusBarItem.command = 'feima.showAccount';
	statusBarItem.tooltip = 'Feima Credits: Click to view account';

	// Always show with custom feima-logo icon (registered in package.json contributes.icons)
	statusBarItem.text = '$(feima-logo)';
	statusBarItem.tooltip = buildTooltip(null, null);
	statusBarItem.show();

	// Add to subscriptions for proper cleanup
	context.subscriptions.push(statusBarItem);

	// Subscribe to quota changes from the quota service
	const quotaService = getQuotaService();
	context.subscriptions.push(
		quotaService.onQuotaChanged((quota: QuotaSnapshot) => {
			updateStatusBarUI(quota);
		})
	);

	logger.info('[StatusBar] Initialized');
}

/**
 * Parse quota snapshot header value.
 * Header format: ent={total}&rem={remaining}&remPromo={promo}&remPaid={paid}
 */
export function parseQuotaHeader(headerValue: string | null): QuotaSnapshot | null {
	if (!headerValue) {
		return null;
	}

	try {
		const params = new URLSearchParams(headerValue);
		const total = parseInt(params.get('ent') || '0', 10);
		const remaining = parseInt(params.get('rem') || '0', 10);
		const remainingPromo = parseInt(params.get('remPromo') || '0', 10);
		const remainingPaid = parseInt(params.get('remPaid') || '0', 10);

		if (total === 0 && remaining === 0) {
			return null;  // Invalid/empty values
		}

		return {
			total,
			remaining,
			remainingPromo,
			remainingPaid
		};
	} catch (error) {
		logger?.error(`[StatusBar] Failed to parse quota header: ${headerValue} - ${error}`);
		return null;
	}
}

/**
 * Get the warning threshold from settings.
 * Default: 50 requests
 */
function getWarningThreshold(): number {
	const config = vscode.workspace.getConfiguration('feima');
	return config.get<number>('warnWhenQuotaLow', 50);
}

/**
 * Build a rich MarkdownString tooltip showing account and balance info.
 */
function buildTooltip(quota: QuotaSnapshot | null, userName: string | null): vscode.MarkdownString {
	const md = new vscode.MarkdownString();
	md.isTrusted = true;
	md.supportHtml = false;

	if (!quota) {
		md.appendMarkdown('**Feima**\n\n');
		md.appendMarkdown('No credit data yet.\n\n');
		md.appendMarkdown('[View Account](command:feima.showAccount)');
		return md;
	}

	const threshold = getWarningThreshold();
	const isLow = quota.remaining <= threshold;
	const header = userName ? `**Feima** — ${userName}` : '**Feima**';

	md.appendMarkdown(`${header}\n\n`);
	md.appendMarkdown('---\n\n');

	// Show breakdown of promo vs paid credits
	md.appendMarkdown('| | |\n');
	md.appendMarkdown('| --- | ---: |\n');
	md.appendMarkdown(`| Promo | ${quota.remainingPromo.toLocaleString()} |\n`);
	md.appendMarkdown(`| Paid | ${quota.remainingPaid.toLocaleString()} |\n`);
	md.appendMarkdown(`| **Total** | **${quota.total.toLocaleString()}** |\n\n`);

	if (isLow) {
		md.appendMarkdown(`⚠️ Low balance — only **${quota.remaining.toLocaleString()}** requests left.\n\n`);
	}

	md.appendMarkdown('[View Account](command:feima.showAccount)');
	return md;
}

/** Last known user display name (populated externally). */
let currentUserName: string | null = null;

/**
 * Set the current user name to display in the tooltip.
 */
export function setStatusBarUserName(name: string | null): void {
	currentUserName = name;
}

/**
 * Update status bar UI with quota snapshot.
 * Called by quota service event listener.
 */
function updateStatusBarUI(quota: QuotaSnapshot): void {
	if (!statusBarItem) {
		return;
	}

	const threshold = getWarningThreshold();
	const isLow = quota.remaining <= threshold;

	statusBarItem.text = isLow
		? `$(feima-logo) Feima Credit: ${quota.remaining.toLocaleString()} $(warning)`
		: `$(feima-logo) Feima Credit: ${quota.remaining.toLocaleString()}`;
	statusBarItem.tooltip = buildTooltip(quota, currentUserName);

	logger?.debug(`[StatusBar] Updated: remaining=${quota.remaining}, threshold=${threshold}`);
}

/**
 * Hide the status bar item.
 */
export function hideStatusBar(): void {
	if (statusBarItem) {
		statusBarItem.hide();
	}
}

/**
 * Show the status bar item (e.g., when user signs in).
 */
export function showStatusBar(): void {
	if (statusBarItem) {
		statusBarItem.show();
	}
}