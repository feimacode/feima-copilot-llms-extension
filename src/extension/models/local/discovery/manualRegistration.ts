/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Manual endpoint registration — the on-ramp for endpoints port-probing
 *  structurally cannot reach (enterprise/private-cloud deployments). Modeled
 *  as a lightweight multi-step QuickInput flow (base URL -> protocol ->
 *  optional API key), echoing the shape of VS Code's own native "Custom
 *  Endpoint" BYOK flow for familiarity, but implemented as our own command
 *  since that native flow isn't itself extensible (see design.md Open
 *  Questions — this is the decision made when that question came up during
 *  implementation).
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { LocalEndpointRegistry } from '../localEndpointRegistry';
import { LocalApiFormat, defaultCompletionsPath } from '../types';
import { probeEndpoint, probeKnownEndpoint } from './probe';

const FORMAT_OPTIONS: Array<{ label: string; description: string; format: LocalApiFormat }> = [
	{ label: 'OpenAI-compatible', description: 'vLLM, LM Studio, llama.cpp, SGLang, LiteLLM, most enterprise gateways', format: 'openai-compat' },
	{ label: 'Ollama-native', description: 'Ollama\'s own API shape', format: 'ollama-native' },
	{ label: 'Anthropic Messages', description: 'Claude-compatible gateway', format: 'anthropic-messages' },
];

/** Initial model-list path to try for a user-chosen format, before falling back to full auto-detect. */
function initialModelListPathFor(format: LocalApiFormat): string {
	switch (format) {
		case 'ollama-native':
			return '/api/tags';
		case 'anthropic-messages':
		case 'openai-compat':
		default:
			return '/v1/models';
	}
}

export const MANUAL_REGISTER_COMMAND = 'feima.localModels.addEndpoint';

export function registerManualEndpointCommand(
	registry: LocalEndpointRegistry,
	log: ILogService,
): vscode.Disposable {
	return vscode.commands.registerCommand(MANUAL_REGISTER_COMMAND, async () => {
		const baseEndpoint = await vscode.window.showInputBox({
			title: vscode.l10n.t('Add Model Endpoint'),
			prompt: vscode.l10n.t('Base URL of the endpoint (e.g. an enterprise gateway or private-cloud deployment)'),
			placeHolder: 'https://models.internal.example.com',
			validateInput: value => {
				try {
					const url = new URL(value);
					if (!url.protocol.startsWith('http')) {
						return vscode.l10n.t('URL must start with http:// or https://');
					}
					return undefined;
				} catch {
					return vscode.l10n.t('Enter a valid URL');
				}
			},
		});
		if (!baseEndpoint) {
			return;
		}

		const formatPick = await vscode.window.showQuickPick(FORMAT_OPTIONS, {
			title: vscode.l10n.t('Add Model Endpoint'),
			placeHolder: vscode.l10n.t('What protocol does this endpoint speak?'),
		});
		if (!formatPick) {
			return;
		}

		const apiKey = await vscode.window.showInputBox({
			title: vscode.l10n.t('Add Model Endpoint'),
			prompt: vscode.l10n.t('API key, if this endpoint requires one (leave empty otherwise)'),
			password: true,
		});
		// User pressed Escape vs. left it empty are both "no key" here — an
		// explicit cancel of the whole flow already returned above at the
		// earlier steps, so reaching here means proceed either way.

		await vscode.window.withProgress(
			{ location: vscode.ProgressLocation.Notification, title: vscode.l10n.t('Validating endpoint...') },
			async () => {
				const known = await probeKnownEndpoint(baseEndpoint, formatPick.format, initialModelListPathFor(formatPick.format), apiKey || undefined);
				const result = known.ok ? known : await probeEndpoint(baseEndpoint, apiKey || undefined);

				if (!result.ok) {
					log.warn(`[manualRegistration] Validation failed for ${baseEndpoint}: ${result.reason}`);
					vscode.window.showErrorMessage(
						vscode.l10n.t('Could not reach {0}: {1}', baseEndpoint, result.reason),
					);
					return;
				}

				await registry.upsertPersonalEntry({
					baseEndpoint,
					apiFormat: result.format,
					modelEndpointPath: result.modelEndpointPath,
					completionsEndpointPath: defaultCompletionsPath(result.format),
					origin: 'manual',
					apiKey: apiKey || undefined,
				});
				vscode.window.showInformationMessage(vscode.l10n.t('Added {0}', baseEndpoint));
			},
		);
	});
}
