/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Pure task-complexity decision logic — no vscode dependency, unit-tested
 *  directly. The vscode-dependent extraction of these primitives from real
 *  messages/options lives in taskSignalExtractor.ts, kept in a separate
 *  file so importing this one never pulls in a runtime `require('vscode')`
 *  (see scoring.ts's doc comment for the same split rationale). Deliberately
 *  simple heuristic, not a trained classifier — see design.md Open Questions.
 *--------------------------------------------------------------------------------------------*/

import { TaskSignal } from './types';

export function computeTaskSignal(
	promptChars: number,
	toolCount: number,
	toolModeRequired: boolean,
	inToolLoop: boolean,
): TaskSignal {
	// Simple thresholding, intentionally coarse — see doc comment above.
	const looksComplex = promptChars > 2000 || toolCount >= 3 || inToolLoop || toolModeRequired;
	return { promptChars, toolCount, toolModeRequired, inToolLoop, looksComplex };
}
