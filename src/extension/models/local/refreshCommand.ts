/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Manual refresh command for local/enterprise model endpoints. Follows the
 *  DynamicToolManager cache-clear idiom (registerCommand -> clear cache ->
 *  confirmation toast) rather than ModelCatalogService's, since
 *  ModelCatalogService.refreshModels() has no user-facing command today —
 *  see design.md "Refresh follows the DynamicToolManager idiom".
 *
 *  Open question from design.md ("should refresh be local-only, or also
 *  trigger ModelCatalogService.refreshModels()?") is resolved here as: also
 *  refresh Feima's own catalog, via an injected callback so this module
 *  stays decoupled from Feima-catalog-specific code — one "refresh my
 *  models" command is simpler for users than two similarly-named ones.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../platform/log/common/logService';
import { LocalEndpointRegistry } from './localEndpointRegistry';
import { LocalEndpointProvider } from './localEndpointProvider';
import { discoverLocalPorts } from './discovery/portProbe';

export const REFRESH_COMMAND = 'feima.localModels.refresh';

export function registerLocalModelsRefreshCommand(
	registry: LocalEndpointRegistry,
	provider: LocalEndpointProvider,
	log: ILogService,
	refreshFeimaCatalog?: () => Promise<void>,
): vscode.Disposable {
	return vscode.commands.registerCommand(REFRESH_COMMAND, async () => {
		log.info('[refreshCommand] Manual model refresh requested');
		try {
			await Promise.all([
				discoverLocalPorts(registry, log),
				registry.refreshWorkspaceEntries(),
				refreshFeimaCatalog?.(),
			]);
			provider.invalidateCache();
			vscode.window.showInformationMessage(vscode.l10n.t('Model list refreshed'));
		} catch (error) {
			log.error(error as Error, '[refreshCommand] Failed to refresh models');
			vscode.window.showErrorMessage(vscode.l10n.t('Failed to refresh models'));
		}
	});
}
