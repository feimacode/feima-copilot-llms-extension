/*---------------------------------------------------------------------------------------------
 *  Shared HTTP-status → ChatResponse error-type mapping.
 *  Extracted from FeimaChatEndpoint so the Chat Completions and Responses
 *  API clients report identical error types for identical HTTP statuses —
 *  this is the one piece of feimaChatEndpoint.ts/feimaResponsesEndpoint.ts
 *  that is genuinely protocol-agnostic (status codes carry the same meaning
 *  regardless of which wire format produced them).
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../platform/log/common/logService';
import type { ChatResponse } from './feimaChatEndpoint';

/**
 * Map a non-OK fetch Response to a ChatResponse error variant.
 * Assumes `response.ok` is already known to be false.
 */
export function mapHttpErrorToChatResponse(
	response: Response,
	errorText: string,
	modelId: string,
	token: vscode.CancellationToken,
	log: ILogService,
	logPrefix: string
): ChatResponse {
	if (errorText && errorText.startsWith('{')) {
		try {
			const errorJson = JSON.parse(errorText);
			if (errorJson.code || errorJson.message) {
				log.debug(`${logPrefix} Error details: ${errorJson.code || errorJson.message}`);
			}
		} catch (_) {
			// Not valid JSON, continue
		}
	}

	if (response.status === 401) {
		log.warn(`${logPrefix} Unauthorized (HTTP 401) for model ${modelId}. Token is invalid or expired server-side.`);
		return { type: 'unauthorized', reason: vscode.l10n.t('Authentication token is invalid or expired') };
	} else if (response.status === 403) {
		const retryAfter = response.headers.get('Retry-After');
		log.warn(`${logPrefix} Extension BLOCKED (HTTP 403) for model ${modelId}. Retry-After: ${retryAfter || 'not specified'}, Timestamp: ${new Date().toISOString()}`);
		return { type: 'blocked', reason: vscode.l10n.t('The extension has been temporarily blocked due to too many requests') };
	} else if (response.status === 402) {
		log.warn(`${logPrefix} Insufficient balance (HTTP 402) for model ${modelId}`);
		return { type: 'insufficientBalance', reason: 'Insufficient balance' };
	} else if (response.status === 429) {
		const isQuota = errorText.includes('quota') || response.headers.get('x-error-type') === 'quota_exceeded';
		const retryAfter = response.headers.get('Retry-After');
		if (isQuota) {
			log.info(`${logPrefix} Quota exceeded for model ${modelId}, retry after: ${retryAfter || 'unspecified'}`);
			return { type: 'quotaExceeded', reason: vscode.l10n.t('Request quota exceeded') };
		} else {
			log.info(`${logPrefix} Rate limited for model ${modelId}, retry after: ${retryAfter || 'unspecified'}`);
			return { type: 'rateLimited', reason: vscode.l10n.t('Too many requests, please retry later') };
		}
	} else if (response.status === 499) {
		// 499 = proxy-level "client closed request" — benign when the
		// cancellation token is already set (user cancelled), otherwise
		// a transient upstream disconnect; treat as cancelled either way.
		log.debug(`${logPrefix} Request cancelled (HTTP 499) for model ${modelId}, token cancelled: ${token.isCancellationRequested}`);
		return { type: 'cancelled' };
	} else {
		return { type: 'error', reason: vscode.l10n.t('HTTP {0}: {1}', response.status.toString(), errorText) };
	}
}
