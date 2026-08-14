/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Convenience shortcut: register the user's own Feima-hosted API access as
 *  a plain `local-model-registry` entry, so it can optionally join Auto's
 *  candidate pool through the existing, unmodified registration path.
 *
 *  This is deliberately a convenience, not an integration — see
 *  openspec/changes/add-auto-model-routing/design.md "The Feima-hosted
 *  shortcut stays a convenience, not an integration". Feima's real auth is
 *  OAuth-based and refreshed via FeimaAuthenticationService; the registry
 *  entry shape assumes a static API key. This command mints a snapshot of
 *  the current access token rather than teaching the generic local-endpoint
 *  machinery about Feima-specific OAuth refresh, which would reintroduce
 *  the coupling the Feima/local split was built to avoid.
 *
 *  No probe/validation before registering (unlike manual registration in
 *  manualRegistration.ts): the base URL and `/models` path are exactly what
 *  ModelCatalogService itself already calls successfully (see modelCatalog.ts),
 *  so re-validating here would be redundant.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { FeimaAuthenticationService } from '../../../platform/authentication/vscode/feimaAuthenticationService';
import { ILogService } from '../../../platform/log/common/logService';
import { getResolvedConfig } from '../../../../config/configService';
import { LocalEndpointRegistry } from '../localEndpointRegistry';

export const FEIMA_HOSTED_SHORTCUT_COMMAND = 'feima.localModels.addFeimaHostedEndpoint';

export function registerFeimaHostedShortcutCommand(
	registry: LocalEndpointRegistry,
	authService: FeimaAuthenticationService,
	log: ILogService,
): vscode.Disposable {
	return vscode.commands.registerCommand(FEIMA_HOSTED_SHORTCUT_COMMAND, async () => {
		const sessions = await authService.getSessions(undefined, {});
		const session = sessions[0];
		if (!session) {
			vscode.window.showErrorMessage(vscode.l10n.t('Please sign in to Feima first'));
			return;
		}

		// Same base URL and /models path ModelCatalogService already uses — see
		// modelCatalog.ts's `${apiBase}/models` and its FeimaModelAPIResponse
		// shape, which matches our generic OpenAI-compatible { data: [...] } parser.
		const apiBase = getResolvedConfig().apiBaseUrl || '';
		const baseEndpoint = apiBase.replace(/\/+$/, '');
		if (!baseEndpoint) {
			vscode.window.showErrorMessage(vscode.l10n.t('Feima API base URL is not configured'));
			return;
		}

		// `upsertPersonalEntry` keys by baseEndpoint and updates in place when an
		// entry for it already exists (see LocalEndpointRegistry), so re-running
		// this command naturally refreshes the stored token rather than creating
		// a duplicate entry — no special-case logic needed here for that.
		await registry.upsertPersonalEntry({
			baseEndpoint,
			apiFormat: 'openai-compat',
			modelEndpointPath: '/models',
			completionsEndpointPath: '/chat/completions',
			origin: 'manual',
			label: vscode.l10n.t('My Feima-hosted models'),
			apiKey: session.accessToken,
		});

		log.info(`[feimaHostedShortcut] Registered/refreshed Feima-hosted entry at ${baseEndpoint}`);
		vscode.window.showInformationMessage(
			vscode.l10n.t(
				'Added your Feima-hosted models so Auto can route to them. This uses a snapshot of your current access token, which may need refreshing later — re-run this command if it starts failing. For continuous, always-fresh access, prefer the main "Feima" entry in the model picker.',
			),
		);
	});
}
