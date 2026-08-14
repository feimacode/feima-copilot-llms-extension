/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Thin vscode-dependent adapter that pulls the primitives computeTaskSignal
 *  needs out of a real request. Kept separate from taskSignal.ts so that
 *  file's pure decision logic stays importable without a runtime
 *  `require('vscode')` — see that file's doc comment.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { TaskSignal } from './types';
import { computeTaskSignal } from './taskSignal';

export function extractTaskSignalFromMessages(
	messages: readonly vscode.LanguageModelChatMessage[],
	options: vscode.ProvideLanguageModelChatResponseOptions,
): TaskSignal {
	let promptChars = 0;
	let inToolLoop = false;
	for (const msg of messages) {
		const parts = Array.isArray(msg.content) ? msg.content : [msg.content];
		for (const part of parts) {
			if (part instanceof vscode.LanguageModelTextPart) {
				promptChars += part.value.length;
			} else if (typeof part === 'object' && part !== null && 'callId' in part) {
				inToolLoop = true;
			}
		}
	}

	const toolCount = options.tools?.length ?? 0;
	const toolModeRequired = options.toolMode === vscode.LanguageModelChatToolMode.Required;

	return computeTaskSignal(promptChars, toolCount, toolModeRequired, inToolLoop);
}
