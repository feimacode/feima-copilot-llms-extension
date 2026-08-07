/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Converts VS Code chat attachments (`#file:`, editor selections) into the SDK
 * `MessageOptions.attachments` shape so context is forwarded to the Copilot
 * runtime instead of being silently dropped.
 */

import * as vscode from 'vscode';
import type { MessageOptions } from '@github/copilot-sdk';

export type CopilotMessageAttachment = NonNullable<MessageOptions['attachments']>[number];

/** Duck-typed URI check — `instanceof vscode.Uri` can fail across module boundaries. */
function isUri(value: unknown): value is vscode.Uri {
	return !!value && typeof value === 'object' && 'scheme' in value && 'path' in value && 'fsPath' in value;
}

/** Duck-typed Location check (`{ uri, range }`). */
function isLocation(value: unknown): value is vscode.Location {
	return !!value && typeof value === 'object' && 'uri' in value && 'range' in value;
}

function basename(path: string): string {
	const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
	return idx === -1 ? path : path.substring(idx + 1);
}

/**
 * Map `request.references` to SDK attachments. Unsupported reference kinds are
 * skipped rather than failing the request.
 */
export function toSdkAttachments(request: vscode.ChatRequest): CopilotMessageAttachment[] {
	const attachments: CopilotMessageAttachment[] = [];
	for (const ref of request.references) {
		const value: unknown = ref.value;
		if (isLocation(value)) {
			const path = value.uri.fsPath;
			attachments.push({
				type: 'selection',
				filePath: path,
				displayName: basename(path),
				selection: {
					start: { line: value.range.start.line, character: value.range.start.character },
					end: { line: value.range.end.line, character: value.range.end.character },
				},
			});
		} else if (isUri(value)) {
			attachments.push({
				type: 'file',
				path: value.fsPath,
				displayName: basename(value.fsPath),
			});
		}
		// Other reference kinds (strings, symbols, images, …) are skipped.
	}
	return attachments;
}
