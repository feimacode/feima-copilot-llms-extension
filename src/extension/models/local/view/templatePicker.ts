/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Curated-template quickpick for the manual-add flow. Feima's domain (local
 *  runtimes, private enterprise gateways) has no commercial-provider catalog
 *  to borrow the way copilot-alternatives' BYOK templates do (those are
 *  exclusively hosted commercial APIs) — so the "templates" here are the
 *  extension's own well-known local-runtime defaults (see discovery/portProbe.ts),
 *  a shortcut to the user's own Feima-hosted access, and a Custom option for
 *  everything else.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { LOCAL_RUNTIME_TEMPLATES, LocalRuntimeTemplate } from '../discovery/portProbe';

const CUSTOM_LABEL = vscode.l10n.t('$(edit) Custom / Enterprise Endpoint...');
const FEIMA_HOSTED_LABEL = vscode.l10n.t('$(account) Feima Hosted Models');

export type EndpointTemplateChoice = LocalRuntimeTemplate | 'custom' | 'feima-hosted';

export async function pickEndpointTemplate(): Promise<EndpointTemplateChoice | undefined> {
	const items: (vscode.QuickPickItem & { template?: LocalRuntimeTemplate; sentinel?: 'custom' | 'feima-hosted' })[] = [
		{
			label: FEIMA_HOSTED_LABEL,
			detail: vscode.l10n.t('Adds your Feima-hosted models — asks for your Feima API key, no URL to enter'),
			sentinel: 'feima-hosted',
		},
		{ label: '', kind: vscode.QuickPickItemKind.Separator },
		...LOCAL_RUNTIME_TEMPLATES.map(template => ({
			label: `$(server) ${template.name}`,
			description: template.baseEndpoint,
			detail: template.description,
			template,
		})),
		{ label: '', kind: vscode.QuickPickItemKind.Separator },
		{
			label: CUSTOM_LABEL,
			detail: vscode.l10n.t('Enter a base URL manually — for enterprise gateways or anything not listed above'),
			sentinel: 'custom',
		},
	];

	const selected = await vscode.window.showQuickPick(items, {
		title: vscode.l10n.t('Add Model Endpoint'),
		placeHolder: vscode.l10n.t('Choose a known local runtime, your Feima-hosted access, or enter a custom endpoint'),
	});

	if (!selected) {
		return undefined;
	}
	return selected.template ?? selected.sentinel;
}
