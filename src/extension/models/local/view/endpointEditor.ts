/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Webview add/edit form for a personal local/enterprise endpoint — replaces
 *  the old bare QuickInput-steps flow and adds the previously-missing "edit"
 *  capability. UI shape (singleton panel, message-passing, theme-token CSS,
 *  masked-key display) is adapted from copilot-alternatives' byokEditor.ts;
 *  persistence stays entirely on feima's own LocalEndpointRegistry.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { LocalEndpointRegistry } from '../localEndpointRegistry';
import { LocalApiFormat, defaultCompletionsPath } from '../types';
import { probeEndpoint, probeKnownEndpoint } from '../discovery/probe';

export interface EndpointEditorInitial {
	label?: string;
	baseEndpoint?: string;
	apiFormat?: LocalApiFormat;
	/** Required in edit mode — the entry's id before any changes. */
	currentId?: string;
}

let _activePanel: vscode.WebviewPanel | undefined;

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

export function maskApiKeyHint(key: string | undefined): string {
	if (!key) {
		return '';
	}
	if (key.length <= 8) {
		return '••••••••';
	}
	return key.substring(0, 4) + '••••' + key.substring(key.length - 4);
}

export function openEndpointEditor(
	mode: 'create' | 'edit',
	initial: EndpointEditorInitial,
	maskedKeyHint: string | undefined,
	registry: LocalEndpointRegistry,
	log: ILogService,
): Promise<void> {
	return new Promise(resolve => {
		if (_activePanel) {
			_activePanel.dispose();
		}

		const panel = vscode.window.createWebviewPanel(
			'feima.localModels.endpointEditor',
			mode === 'create' ? vscode.l10n.t('Add Model Endpoint') : vscode.l10n.t('Edit {0}', initial.label ?? initial.baseEndpoint ?? ''),
			vscode.ViewColumn.Active,
			{ enableScripts: true, retainContextWhenHidden: true },
		);
		_activePanel = panel;
		panel.webview.html = getEditorHtml(mode, initial, maskedKeyHint);

		let pendingApiKey: string | undefined;
		let settled = false;

		const disposable = panel.webview.onDidReceiveMessage(async msg => {
			if (msg.type === 'requestApiKey') {
				const newKey = await vscode.window.showInputBox({
					title: vscode.l10n.t('Set API Key'),
					prompt: vscode.l10n.t('API key, if this endpoint requires one'),
					password: true,
					placeHolder: vscode.l10n.t('API key'),
				});
				if (newKey) {
					pendingApiKey = newKey;
				}
				panel.webview.postMessage({ type: 'apiKeyValue', value: newKey ?? '' });
				return;
			}

			if (msg.type === 'testConnection') {
				const { baseEndpoint, apiFormat } = msg;
				const known = await probeKnownEndpoint(baseEndpoint, apiFormat, initialModelListPathFor(apiFormat), pendingApiKey);
				const result = known.ok ? known : await probeEndpoint(baseEndpoint, pendingApiKey);
				panel.webview.postMessage({
					type: 'testResult',
					ok: result.ok,
					message: result.ok
						? vscode.l10n.t('Reachable — {0} model(s) found, format: {1}', result.models.length, result.format)
						: vscode.l10n.t('Not reachable: {0}', result.reason),
				});
				return;
			}

			if (msg.type === 'cancel') {
				disposable.dispose();
				panel.dispose();
				return;
			}

			if (msg.type !== 'save') {
				return;
			}

			const { label, baseEndpoint, apiFormat } = msg.entry as { label: string; baseEndpoint: string; apiFormat: LocalApiFormat };
			if (!baseEndpoint) {
				panel.webview.postMessage({ type: 'saveError', message: vscode.l10n.t('Base URL is required.') });
				return;
			}

			const known = await probeKnownEndpoint(baseEndpoint, apiFormat, initialModelListPathFor(apiFormat), pendingApiKey);
			const result = known.ok ? known : await probeEndpoint(baseEndpoint, pendingApiKey);
			if (!result.ok) {
				log.warn(`[endpointEditor] Validation failed for ${baseEndpoint}: ${result.reason}`);
				panel.webview.postMessage({ type: 'saveError', message: vscode.l10n.t('Could not reach {0}: {1}', baseEndpoint, result.reason) });
				return;
			}

			const input = {
				baseEndpoint,
				apiFormat: result.format,
				modelEndpointPath: result.modelEndpointPath,
				completionsEndpointPath: defaultCompletionsPath(result.format),
				origin: 'manual' as const,
				label: label || undefined,
				apiKey: pendingApiKey,
			};

			try {
				if (mode === 'create') {
					await registry.upsertPersonalEntry(input);
				} else {
					await registry.updatePersonalEntry(initial.currentId!, input);
				}
				panel.webview.postMessage({ type: 'saveSuccess' });
				if (!settled) {
					settled = true;
					resolve();
				}
				disposable.dispose();
				panel.dispose();
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				panel.webview.postMessage({ type: 'saveError', message });
			}
		});

		panel.onDidDispose(() => {
			disposable.dispose();
			_activePanel = undefined;
			if (!settled) {
				settled = true;
				resolve();
			}
		});
	});
}

function editorStyles(): string {
	return `
	:root {
		--bg: var(--vscode-editor-background);
		--fg: var(--vscode-editor-foreground);
		--dim: var(--vscode-descriptionForeground);
		--accent: var(--vscode-textLink-foreground);
		--accent-fg: var(--vscode-button-background);
		--border: var(--vscode-widget-border, var(--vscode-panel-border));
		--input-bg: var(--vscode-input-background);
		--input-fg: var(--vscode-input-foreground);
		--input-border: var(--vscode-input-border, var(--vscode-widget-border));
		--focus: var(--vscode-focusBorder);
		--error: var(--vscode-errorForeground);
		--success: var(--vscode-terminal-ansiGreen, #22c55e);
	}
	* { box-sizing: border-box; }
	body { font-family: var(--vscode-font-family); background: var(--bg); color: var(--fg); padding: 24px 32px; font-size: 13px; line-height: 1.5; }
	.title { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
	.subtitle { color: var(--dim); font-size: 12px; margin-bottom: 24px; }
	form { display: flex; flex-direction: column; gap: 16px; max-width: 640px; }
	.row { display: flex; flex-direction: column; gap: 4px; }
	label { font-size: 12px; font-weight: 500; color: var(--dim); }
	.hint { font-size: 11px; color: var(--dim); }
	input[type="text"], input[type="url"], select {
		background: var(--input-bg); color: var(--input-fg); border: 1px solid var(--input-border);
		border-radius: 4px; padding: 6px 10px; font-family: inherit; font-size: 13px; outline: none; width: 100%;
	}
	input:focus, select:focus { border-color: var(--focus); }
	.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
	button { background: var(--accent-fg); color: white; border: none; border-radius: 4px; padding: 8px 18px; font-family: inherit; font-size: 13px; cursor: pointer; }
	button:hover { filter: brightness(1.1); }
	button.secondary { background: transparent; color: var(--fg); border: 1px solid var(--border); }
	.status { font-size: 12px; min-height: 16px; }
	.status.error { color: var(--error); }
	.status.success { color: var(--success); }
	.field-with-button { display: flex; gap: 8px; align-items: stretch; }
	.field-with-button input { flex: 1; }
	.field-with-button button { white-space: nowrap; padding: 6px 14px; font-size: 12px; background: transparent; color: var(--accent); border: 1px solid var(--accent); }
	.field-with-button button:hover { background: var(--accent); color: white; }
	.api-key-display { font-family: monospace; letter-spacing: 0.5px; }
	`;
}

function getEditorHtml(mode: 'create' | 'edit', initial: EndpointEditorInitial, maskedKeyHint: string | undefined): string {
	const esc = (v: string) => v.replace(/"/g, '&quot;').replace(/</g, '&lt;');
	const formats: LocalApiFormat[] = ['openai-compat', 'ollama-native', 'anthropic-messages'];
	const formatLabels: Record<LocalApiFormat, string> = {
		'openai-compat': 'OpenAI-compatible',
		'ollama-native': 'Ollama-native',
		'anthropic-messages': 'Anthropic Messages',
	};
	const selectedFormat = initial.apiFormat ?? 'openai-compat';

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>${editorStyles()}</style>
</head>
<body>
<div class="title">${mode === 'create' ? 'Add Model Endpoint' : 'Edit Model Endpoint'}</div>
<div class="subtitle">${mode === 'create'
			? 'Register a local runtime or enterprise gateway. Validated before saving.'
			: 'Changing the base URL re-validates and moves this to a new entry.'}</div>

<form id="form">
	<div class="row">
		<label for="label">Label</label>
		<input id="label" type="text" value="${esc(initial.label ?? '')}" placeholder="e.g., My vLLM Server">
		<div class="hint">Optional display name. Falls back to the base URL when empty.</div>
	</div>

	<div class="row">
		<label for="baseEndpoint">Base URL <span>*</span></label>
		<input id="baseEndpoint" type="url" value="${esc(initial.baseEndpoint ?? '')}" placeholder="http://127.0.0.1:11434" required>
	</div>

	<div class="row">
		<label for="apiFormat">API Format</label>
		<select id="apiFormat">
			${formats.map(f => `<option value="${f}"${f === selectedFormat ? ' selected' : ''}>${formatLabels[f]}</option>`).join('')}
		</select>
		<div class="hint">Best guess — re-verified against the live endpoint on Test/Save.</div>
	</div>

	<div class="row">
		<label for="apiKey">API Key</label>
		<div class="field-with-button">
			<input id="apiKey" type="text" class="api-key-display" value="${esc(maskedKeyHint ?? '')}" placeholder="${mode === 'edit' ? '(unchanged if left blank)' : 'Leave empty if not required'}" readonly>
			<button type="button" id="setKeyBtn">${mode === 'edit' ? 'Update Key' : 'Set Key'}</button>
		</div>
	</div>

	<div class="row">
		<div class="field-with-button">
			<button type="button" id="testBtn" class="secondary" style="flex:0 0 auto;">Test Connection</button>
			<div class="status" id="testStatus" style="align-self:center;"></div>
		</div>
	</div>

	<div class="status error" id="err"></div>

	<div class="actions">
		<button type="button" class="secondary" id="cancelBtn">Cancel</button>
		<button type="submit" id="saveBtn">${mode === 'create' ? 'Add Endpoint' : 'Save Changes'}</button>
	</div>
</form>

<script>
const vscode = acquireVsCodeApi();
const form = document.getElementById('form');
const errEl = document.getElementById('err');
const apiKeyInput = document.getElementById('apiKey');
const testStatus = document.getElementById('testStatus');

document.getElementById('cancelBtn').addEventListener('click', () => vscode.postMessage({ type: 'cancel' }));
document.getElementById('setKeyBtn').addEventListener('click', () => vscode.postMessage({ type: 'requestApiKey' }));
document.getElementById('testBtn').addEventListener('click', () => {
	testStatus.className = 'status';
	testStatus.textContent = 'Testing...';
	vscode.postMessage({
		type: 'testConnection',
		baseEndpoint: document.getElementById('baseEndpoint').value.trim(),
		apiFormat: document.getElementById('apiFormat').value,
	});
});

window.addEventListener('message', e => {
	const msg = e.data;
	if (msg.type === 'apiKeyValue' && msg.value) {
		apiKeyInput.value = msg.value.length <= 8 ? '••••••••' : msg.value.slice(0, 4) + '••••' + msg.value.slice(-4);
	}
	if (msg.type === 'testResult') {
		testStatus.className = 'status ' + (msg.ok ? 'success' : 'error');
		testStatus.textContent = msg.message;
	}
	if (msg.type === 'saveSuccess') {
		errEl.className = 'status success';
		errEl.textContent = 'Saved.';
	}
	if (msg.type === 'saveError') {
		errEl.className = 'status error';
		errEl.textContent = 'Save failed: ' + msg.message;
	}
});

form.addEventListener('submit', e => {
	e.preventDefault();
	errEl.textContent = '';
	vscode.postMessage({
		type: 'save',
		entry: {
			label: document.getElementById('label').value.trim(),
			baseEndpoint: document.getElementById('baseEndpoint').value.trim(),
			apiFormat: document.getElementById('apiFormat').value,
		},
	});
});
</script>
</body>
</html>`;
}
