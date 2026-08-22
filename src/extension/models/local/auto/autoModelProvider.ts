/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Auto Model Provider — a pure delegator over LocalEndpointProvider. See
 *  openspec/changes/add-auto-model-routing/design.md "The router is a pure
 *  delegator, not a third parallel implementation": this class has no
 *  endpoint/streaming logic of its own. It picks a candidate (via one of
 *  the three named strategies) and forwards the actual request to
 *  LocalEndpointProvider verbatim.
 *
 *  Candidate pool for v1 is local/enterprise endpoints only — Claude/Codex
 *  are structurally excluded (their provider's provideLanguageModelChatResponse
 *  intentionally throws, so there is no valid delegation target), and
 *  Feima-hosted is excluded from this router's own logic (though a user can
 *  register their own Feima-hosted access as a registry entry and it will
 *  participate like any other entry — see feimaHostedShortcut.ts).
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { LocalEndpointProvider } from '../localEndpointProvider';
import { LocalEndpointRegistry } from '../localEndpointRegistry';
import { buildCandidates } from './candidateBuilder';
import { extractTaskSignalFromMessages } from './taskSignalExtractor';
import { SessionStickinessTracker, shouldReuseStickyCandidate } from './sessionStickiness';
import { conversationFingerprint } from './conversationFingerprint';
import { AUTO_STRATEGIES } from './strategies';
import { buildDisclosurePrefix, buildFallbackMessage } from './disclosure';
import { AutoCandidate, AutoOutcome, AutoStrategyId, TaskSignal } from './types';

const AUTO_MODEL_ID = 'auto';
const FALLBACK_MAX_INPUT_TOKENS = 32_000;
const FALLBACK_MAX_OUTPUT_TOKENS = 4_096;

export class AutoModelProvider implements vscode.LanguageModelChatProvider {
	private readonly _onDidChange = new vscode.EventEmitter<void>();
	readonly onDidChangeLanguageModelChatInformation = this._onDidChange.event;

	private readonly _stickiness = new SessionStickinessTracker();

	constructor(
		private readonly localProvider: LocalEndpointProvider,
		private readonly registry: LocalEndpointRegistry,
		private readonly getStrategy: () => AutoStrategyId,
		private readonly log: ILogService,
	) {
		// Reuse the sibling's own change signal — new/removed endpoints should
		// invalidate Auto's picker entry too (e.g. its declared capabilities,
		// computed from the current candidate pool, can change).
		localProvider.onDidChangeLanguageModelChatInformation(() => this._onDidChange.fire());
	}

	async provideLanguageModelChatInformation(
		options: { silent: boolean },
		token: vscode.CancellationToken,
	): Promise<vscode.LanguageModelChatInformation[]> {
		this.log.info(`[AutoModelProvider] provideLanguageModelChatInformation called (silent=${options.silent})`);
		const candidates = await buildCandidates(this.localProvider, this.registry, token);
		// Declare generous capabilities so VS Code never preemptively strips tools
		// or truncates history before a request even reaches the router — the
		// actually-selected candidate's real limits are enforced at delegation
		// time by LocalEndpointProvider itself.
		const maxInputTokens = Math.max(FALLBACK_MAX_INPUT_TOKENS, ...candidates.map(c => c.info.maxInputTokens));
		const maxOutputTokens = Math.max(FALLBACK_MAX_OUTPUT_TOKENS, ...candidates.map(c => c.info.maxOutputTokens));

		const strategy = this.getStrategy();
		const info: vscode.LanguageModelChatInformation = {
			id: AUTO_MODEL_ID,
			// "Feima Auto", not just "Auto" — VS Code's own native Auto (GitHub-hosted
			// models only) lives in a different vendor category, but a bare "Auto"
			// still reads as ambiguous in a flattened/searched picker or in disclosure
			// text, so the name itself carries the distinction, not just the vendor
			// category heading (see proposal.md's "not VS Code's own native Auto").
			name: vscode.l10n.t('Feima Auto'),
			family: 'feima-auto',
			version: '1',
			maxInputTokens,
			maxOutputTokens,
			tooltip: vscode.l10n.t('Feima\'s own router — automatically picks the best available local or enterprise endpoint from your registered entries. Not GitHub Copilot\'s built-in Auto, which only sees GitHub-hosted models.'),
			detail: vscode.l10n.t('Strategy: {0}', strategy),
			isUserSelectable: true,
			capabilities: { toolCalling: true, imageInput: false },
		};
		// `silent` means "don't prompt the user for auth/setup," not "return
		// nothing" (see vscode.d.ts PrepareLanguageModelChatModelOptions: "If
		// silent is true, all models may not be resolved due to lack of info
		// such as API keys"). Auto never needs to prompt for anything — it's a
		// pure delegator over already-registered candidates — so it must
		// resolve the same way regardless of `silent`, exactly like
		// LocalEndpointProvider does. Unconditionally suppressing the result
		// when silent (the previous behavior here) hid Auto from the picker's
		// normal background population pass, which calls with silent=true.
		this.log.info(`[AutoModelProvider] Returning ${candidates.length} candidate(s), Auto entry included`);
		return [info];
	}

	async provideLanguageModelChatResponse(
		_model: vscode.LanguageModelChatInformation,
		messages: vscode.LanguageModelChatMessage[],
		options: vscode.ProvideLanguageModelChatResponseOptions,
		progress: vscode.Progress<vscode.LanguageModelResponsePart | vscode.LanguageModelToolCallPart>,
		token: vscode.CancellationToken,
	): Promise<void> {
		const candidates = await buildCandidates(this.localProvider, this.registry, token);
		const task = extractTaskSignalFromMessages(messages, options);
		const fingerprint = conversationFingerprint(messages);

		const outcome = this._resolveOutcome(candidates, task, fingerprint);

		if (outcome.kind === 'fallback') {
			this.log.info(`[AutoModelProvider] Fallback: ${outcome.reason}`);
			progress.report(new vscode.LanguageModelTextPart(buildFallbackMessage(outcome)));
			return;
		}

		this.log.info(`[AutoModelProvider] Routed to ${outcome.candidate.info.id} — ${outcome.reason}`);
		progress.report(new vscode.LanguageModelTextPart(buildDisclosurePrefix(outcome)));
		return this.localProvider.provideLanguageModelChatResponse(outcome.candidate.info, messages, options, progress, token);
	}

	private _resolveOutcome(
		candidates: readonly AutoCandidate[],
		task: TaskSignal,
		fingerprint: string | undefined,
	): AutoOutcome {
		const sticky = fingerprint ? this._stickiness.get(fingerprint) : undefined;
		const reused = shouldReuseStickyCandidate(sticky, candidates, task);
		if (reused) {
			return { kind: 'resolved', candidate: reused, reason: vscode.l10n.t('Continuing this conversation'), escalated: false };
		}

		const strategy = AUTO_STRATEGIES[this.getStrategy()];
		const outcome = strategy.select(candidates, task);
		if (outcome.kind === 'resolved' && fingerprint) {
			this._stickiness.set(fingerprint, outcome.candidate.info.id, task.looksComplex);
		}
		return outcome;
	}

	async provideTokenCount(
		_model: vscode.LanguageModelChatInformation,
		text: string | vscode.LanguageModelChatMessage,
		_token: vscode.CancellationToken,
	): Promise<number> {
		// No "currently resolved candidate" concept exists outside an active
		// response call (task 1.5: conservative estimate when none is resolved —
		// re-running strategy selection just to count tokens would be wasteful
		// and could itself trigger a live endpoint fan-out for no benefit).
		const raw = typeof text === 'string' ? text : JSON.stringify(text);
		return Math.ceil(raw.length / 4);
	}

	dispose(): void {
		this._onDidChange.dispose();
	}
}
