/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Webview add/edit form for a per-model override on a personal endpoint —
 *  see types.ts ModelOverride doc comment for the "additive layer, not a
 *  model-list cache" design. UI shape adapted from copilot-alternatives'
 *  byokEditor.ts getModelEditorHtml.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { LocalEndpointRegistry } from '../localEndpointRegistry';
import { LocalEndpointProvider } from '../localEndpointProvider';
import { LocalEndpointEntry, ModelOverride } from '../types';

let _activePanel: vscode.WebviewPanel | undefined;

export function openModelOverrideEditor(
	mode: 'create' | 'edit',
	entry: LocalEndpointEntry,
	existing: ModelOverride | undefined,
	registry: LocalEndpointRegistry,
	provider: LocalEndpointProvider,
): Promise<void> {
	return new Promise(resolve => {
		if (_activePanel) {
			_activePanel.dispose();
		}

		const label = entry.label ?? entry.baseEndpoint;
		const panel = vscode.window.createWebviewPanel(
			'feima.localModels.modelEditor',
			mode === 'create' ? vscode.l10n.t('Add Model to {0}', label) : vscode.l10n.t('Edit Model — {0}', existing?.modelId ?? ''),
			vscode.ViewColumn.Active,
			{ enableScripts: true, retainContextWhenHidden: true },
		);
		_activePanel = panel;
		panel.webview.html = getEditorHtml(mode, entry, existing);

		let settled = false;
		const disposable = panel.webview.onDidReceiveMessage(async msg => {
			if (msg.type === 'cancel') {
				disposable.dispose();
				panel.dispose();
				return;
			}
			if (msg.type !== 'save') {
				return;
			}

			const modelId: string = (msg.model.modelId ?? '').trim();
			if (!modelId) {
				panel.webview.postMessage({ type: 'saveError', message: vscode.l10n.t('Model ID is required.') });
				return;
			}

			const probedIds = new Set(provider.getCachedModelsForEntry(entry.id).map(i => i.id.slice(entry.id.length + 2)));
			const override: ModelOverride = {
				entryId: entry.id,
				modelId,
				name: msg.model.name || undefined,
				maxInputTokens: numOrUndef(msg.model.maxInputTokens),
				maxOutputTokens: numOrUndef(msg.model.maxOutputTokens),
				toolCalling: Boolean(msg.model.toolCalling),
				imageInput: Boolean(msg.model.imageInput),
				manual: !probedIds.has(modelId),
			};

			try {
				await registry.upsertModelOverride(override);
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

function numOrUndef(v: unknown): number | undefined {
	if (v === '' || v === null || v === undefined) {
		return undefined;
	}
	const n = Number(v);
	return Number.isFinite(n) ? n : undefined;
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
	.row.inline { flex-direction: row; gap: 12px; align-items: center; }
	.row.inline > label { flex: 0 0 auto; min-width: 150px; }
	label { font-size: 12px; font-weight: 500; color: var(--dim); }
	.hint { font-size: 11px; color: var(--dim); }
	input[type="text"], input[type="number"] {
		background: var(--input-bg); color: var(--input-fg); border: 1px solid var(--input-border);
		border-radius: 4px; padding: 6px 10px; font-family: inherit; font-size: 13px; outline: none; width: 100%;
	}
	input:focus { border-color: var(--focus); }
	.checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; }
	.checkbox input { width: auto; }
	.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
	button { background: var(--accent-fg); color: white; border: none; border-radius: 4px; padding: 8px 18px; font-family: inherit; font-size: 13px; cursor: pointer; }
	button:hover { filter: brightness(1.1); }
	button.secondary { background: transparent; color: var(--fg); border: 1px solid var(--border); }
	.status { font-size: 12px; min-height: 16px; }
	.status.error { color: var(--error); }
	.status.success { color: var(--success); }
	.section { margin-top: 4px; padding-top: 16px; border-top: 1px solid var(--border); }
	.section-title { font-size: 13px; font-weight: 600; margin-bottom: 12px; color: var(--accent); }
	`;
}

function getEditorHtml(mode: 'create' | 'edit', entry: LocalEndpointEntry, existing: ModelOverride | undefined): string {
	const esc = (v: string | undefined) => (v ?? '').toString().replace(/"/g, '&quot;').replace(/</g, '&lt;');
	const num = (v: number | undefined) => v ?? '';

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>${editorStyles()}</style>
</head>
<body>
<div class="title">${mode === 'create' ? 'Add Model' : 'Edit Model'}</div>
<div class="subtitle">${mode === 'create'
			? `Adding a manual model entry to <code>${esc(entry.label ?? entry.baseEndpoint)}</code>. If the ID matches a model the endpoint already reports, this becomes a correction on top of it instead of a separate manual model.`
			: `Correcting values for <code>${esc(existing?.modelId ?? '')}</code>. Fields left blank fall back to auto-detected values.`}</div>

<form id="form">
	<div class="row inline">
		<label for="modelId">Model ID <span>*</span></label>
		<input id="modelId" type="text" value="${esc(existing?.modelId)}" placeholder="e.g., qwen3-coder" required>
	</div>

	<div class="row inline">
		<label for="name">Display Name</label>
		<input id="name" type="text" value="${esc(existing?.name)}" placeholder="Leave blank to use the model ID">
	</div>

	<div class="section">
		<div class="section-title">Capabilities</div>
		<div class="row inline" style="gap: 20px; flex-wrap: wrap;">
			<label class="checkbox"><input type="checkbox" id="toolCalling"${existing?.toolCalling ? ' checked' : ''}> Tool Calling</label>
			<label class="checkbox"><input type="checkbox" id="imageInput"${existing?.imageInput ? ' checked' : ''}> Vision</label>
		</div>
	</div>

	<div class="section">
		<div class="section-title">Context Limits</div>
		<div class="row inline">
			<label for="maxInputTokens">Max Input Tokens</label>
			<input id="maxInputTokens" type="number" value="${num(existing?.maxInputTokens)}" placeholder="leave blank to inherit" min="0">
		</div>
		<div class="row inline">
			<label for="maxOutputTokens">Max Output Tokens</label>
			<input id="maxOutputTokens" type="number" value="${num(existing?.maxOutputTokens)}" placeholder="leave blank to inherit" min="0">
		</div>
	</div>

	<div class="status error" id="err"></div>

	<div class="actions">
		<button type="button" class="secondary" id="cancelBtn">Cancel</button>
		<button type="submit" id="saveBtn">${mode === 'create' ? 'Add Model' : 'Save Changes'}</button>
	</div>
</form>

<script>
const vscode = acquireVsCodeApi();
const form = document.getElementById('form');
const errEl = document.getElementById('err');
document.getElementById('cancelBtn').addEventListener('click', () => vscode.postMessage({ type: 'cancel' }));

window.addEventListener('message', e => {
	const msg = e.data;
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
		model: {
			modelId: document.getElementById('modelId').value.trim(),
			name: document.getElementById('name').value.trim(),
			toolCalling: document.getElementById('toolCalling').checked,
			imageInput: document.getElementById('imageInput').checked,
			maxInputTokens: document.getElementById('maxInputTokens').value,
			maxOutputTokens: document.getElementById('maxOutputTokens').value,
		},
	});
});
</script>
</body>
</html>`;
}
