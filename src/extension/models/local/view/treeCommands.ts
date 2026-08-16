/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Remove / Test Connection commands for the endpoint management tree.
 *  "Add Endpoint" needs no new command — the view's title-bar action wires
 *  directly to the existing feima.localModels.addEndpoint command via
 *  package.json's menus.view/title contribution (task 3.3).
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { LocalEndpointRegistry } from '../localEndpointRegistry';
import { LocalEndpointProvider } from '../localEndpointProvider';
import { probeKnownEndpoint } from '../discovery/probe';
import { openEndpointEditor, maskApiKeyHint } from './endpointEditor';
import { openModelOverrideEditor } from './modelEditor';
import { EndpointTreeNode } from './localEndpointTreeProvider';

export const REMOVE_ENDPOINT_COMMAND = 'feima.localModels.view.remove';
export const TEST_CONNECTION_COMMAND = 'feima.localModels.view.testConnection';
export const EDIT_ENDPOINT_COMMAND = 'feima.localModels.view.editEndpoint';
export const ADD_MODEL_COMMAND = 'feima.localModels.view.addModel';
export const EDIT_MODEL_COMMAND = 'feima.localModels.view.editModel';
export const REMOVE_MODEL_OVERRIDE_COMMAND = 'feima.localModels.view.removeModelOverride';

export function registerTreeCommands(registry: LocalEndpointRegistry, provider: LocalEndpointProvider, log: ILogService): vscode.Disposable[] {
	const removeDisposable = vscode.commands.registerCommand(REMOVE_ENDPOINT_COMMAND, async (node?: EndpointTreeNode) => {
		// Personal-only, per spec — the menu's `when` clause already restricts
		// this to personalEndpoint items, but a direct command-palette
		// invocation (no node) or a stale reference is handled defensively too.
		if (!node || node.kind !== 'entry' || node.scope !== 'personal') {
			return;
		}
		const label = node.entry.label ?? node.entry.baseEndpoint;
		const removeAction = vscode.l10n.t('Remove');
		const confirmed = await vscode.window.showWarningMessage(
			vscode.l10n.t('Remove {0}?', label),
			{ modal: true },
			removeAction,
		);
		if (confirmed !== removeAction) {
			return;
		}
		await registry.removePersonalEntry(node.entry.id);
		log.info(`[treeCommands] Removed entry ${node.entry.id} via view`);
	});

	const testDisposable = vscode.commands.registerCommand(TEST_CONNECTION_COMMAND, async (node?: EndpointTreeNode) => {
		if (!node || node.kind !== 'entry') {
			return;
		}
		const { entry } = node;
		const label = entry.label ?? entry.baseEndpoint;
		const apiKey = await registry.getApiKey(entry.id);

		// Deliberately a lightweight liveness recheck (probe + markHealth), not
		// a full LocalEndpointProvider._fetchEntryModels-equivalent pass with
		// per-model metadata resolution — see design.md "Test Connection is a
		// lightweight liveness recheck, not a full metadata re-resolution".
		const result = await probeKnownEndpoint(entry.baseEndpoint, entry.apiFormat, entry.modelEndpointPath, apiKey);
		if (result.ok) {
			registry.markHealth(entry.id, { lastCheckedAt: Date.now(), reachable: true });
			vscode.window.showInformationMessage(vscode.l10n.t('{0} is reachable', label));
		} else {
			registry.markHealth(entry.id, { lastCheckedAt: Date.now(), reachable: false, lastError: result.reason });
			vscode.window.showWarningMessage(vscode.l10n.t('{0} is not reachable: {1}', label, result.reason));
		}
	});

	const editEndpointDisposable = vscode.commands.registerCommand(EDIT_ENDPOINT_COMMAND, async (node?: EndpointTreeNode) => {
		if (!node || node.kind !== 'entry' || node.scope !== 'personal') {
			return;
		}
		const { entry } = node;
		const maskedKey = maskApiKeyHint(await registry.getApiKey(entry.id));
		await openEndpointEditor(
			'edit',
			{ label: entry.label, baseEndpoint: entry.baseEndpoint, apiFormat: entry.apiFormat, currentId: entry.id },
			maskedKey,
			registry,
			log,
		);
	});

	const addModelDisposable = vscode.commands.registerCommand(ADD_MODEL_COMMAND, async (node?: EndpointTreeNode) => {
		if (!node || node.kind !== 'entry' || node.scope !== 'personal') {
			return;
		}
		await openModelOverrideEditor('create', node.entry, undefined, registry, provider);
	});

	const editModelDisposable = vscode.commands.registerCommand(EDIT_MODEL_COMMAND, async (node?: EndpointTreeNode) => {
		if (!node || node.kind !== 'model' || node.scope !== 'personal') {
			return;
		}
		const entry = registry.getEntry(node.entryId);
		if (!entry) {
			return;
		}
		const existing = registry.getModelOverride(node.entryId, node.rawModelId);
		await openModelOverrideEditor('edit', entry, existing ?? { entryId: node.entryId, modelId: node.rawModelId, manual: false }, registry, provider);
	});

	const removeModelOverrideDisposable = vscode.commands.registerCommand(REMOVE_MODEL_OVERRIDE_COMMAND, async (node?: EndpointTreeNode) => {
		if (!node || node.kind !== 'model' || node.scope !== 'personal' || !node.isOverride) {
			return;
		}
		const action = node.isManualOnly ? vscode.l10n.t('Remove') : vscode.l10n.t('Reset');
		const message = node.isManualOnly
			? vscode.l10n.t('Remove manually-added model {0}?', node.rawModelId)
			: vscode.l10n.t('Reset {0} to auto-detected values?', node.rawModelId);
		const confirmed = await vscode.window.showWarningMessage(message, { modal: true }, action);
		if (confirmed !== action) {
			return;
		}
		await registry.removeModelOverride(node.entryId, node.rawModelId);
		log.info(`[treeCommands] Removed model override ${node.entryId}::${node.rawModelId} via view`);
	});

	return [removeDisposable, testDisposable, editEndpointDisposable, addModelDisposable, editModelDisposable, removeModelOverrideDisposable];
}
