/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Manual endpoint registration — the on-ramp for endpoints port-probing
 *  structurally cannot reach (enterprise/private-cloud deployments), plus a
 *  curated shortcut for known local runtimes. Template picker (quickpick) ->
 *  webview form, mirroring copilot-alternatives' BYOK add flow shape (see
 *  view/templatePicker.ts and view/endpointEditor.ts for the rationale).
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { LocalEndpointRegistry } from '../localEndpointRegistry';
import { pickEndpointTemplate } from '../view/templatePicker';
import { openEndpointEditor } from '../view/endpointEditor';
import { FEIMA_HOSTED_SHORTCUT_COMMAND } from './feimaHostedShortcut';

export const MANUAL_REGISTER_COMMAND = 'feima.localModels.addEndpoint';

export function registerManualEndpointCommand(
	registry: LocalEndpointRegistry,
	log: ILogService,
): vscode.Disposable {
	return vscode.commands.registerCommand(MANUAL_REGISTER_COMMAND, async () => {
		const choice = await pickEndpointTemplate();
		if (!choice) {
			return;
		}
		if (choice === 'feima-hosted') {
			// Delegates to the dedicated shortcut rather than the generic form —
			// it asks for a Feima API key and fetches the model roster/metadata
			// from copilot-alternatives' template, rather than the user hand-typing
			// a base URL. It still registers through this same `registry`, just via
			// its own upsertPersonalEntry/upsertModelOverride calls instead of
			// openEndpointEditor's generic webview form. See feimaHostedShortcut.ts.
			await vscode.commands.executeCommand(FEIMA_HOSTED_SHORTCUT_COMMAND);
			return;
		}
		const initial = choice === 'custom'
			? {}
			: { label: choice.name, baseEndpoint: choice.baseEndpoint, apiFormat: choice.apiFormatHint };
		await openEndpointEditor('create', initial, undefined, registry, log);
	});
}
