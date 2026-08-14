/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Shared types for the Auto router. See
 *  openspec/changes/add-auto-model-routing/design.md for the rationale
 *  behind the delegation-only architecture and the strategies-as-presets
 *  shape these types support.
 *--------------------------------------------------------------------------------------------*/

/**
 * Type-only import — erased entirely at compile time, so this file has no
 * runtime dependency on the `vscode` module and stays safely importable
 * from plain-mocha unit tests (see scoring.ts and strategies.test.ts).
 */
import type * as vscode from 'vscode';
import { MetadataConfidence } from '../types';

export type AutoStrategyId = 'local-first' | 'balanced' | 'most-capable';

/**
 * One candidate the router can select, built from a `LocalEndpointProvider`-reported
 * model plus the registry state needed for scoring (locality, health) that the
 * public `LanguageModelChatInformation` shape doesn't carry on its own.
 */
export interface AutoCandidate {
	readonly info: vscode.LanguageModelChatInformation;
	readonly entryId: string;
	/** True when the owning entry's base endpoint is a loopback host (127.0.0.1/localhost/::1). */
	readonly isSameMachine: boolean;
	readonly confidence: MetadataConfidence;
	readonly reachable: boolean;
}

/**
 * Coarse, heuristic signal about the current request — deliberately simple
 * (see design.md Open Questions: "still need to be pinned down concretely").
 * Not a trained classifier; a starting point meant to be refined later.
 */
export interface TaskSignal {
	readonly promptChars: number;
	readonly toolCount: number;
	readonly toolModeRequired: boolean;
	/** True when the message history already contains a tool call/result — mid agentic loop. */
	readonly inToolLoop: boolean;
	/** Whether the task, on these signals, looks like it needs a more capable model. */
	readonly looksComplex: boolean;
}

export type AutoOutcome =
	| { kind: 'resolved'; candidate: AutoCandidate; reason: string; escalated: boolean }
	| { kind: 'fallback'; reason: string };

export interface AutoStrategy {
	readonly id: AutoStrategyId;
	select(candidates: readonly AutoCandidate[], task: TaskSignal): AutoOutcome;
}
