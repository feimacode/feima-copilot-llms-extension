/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Tiered permission approval for the Copilot CLI participant.
 *
 * Mirrors the agent-host's `_handlePermissionRequest()` cascade: safe operations
 * are auto-approved without prompting; everything else is parked in a deferred
 * registry keyed by tool-call id and resolved from the shared `requestConfirmation`
 * dialog (common/confirmationTool.ts). The registry keeps concurrent requests
 * correlated and lets dispose settle any outstanding prompts.
 */

import * as os from 'os';
import * as vscode from 'vscode';
import type { PermissionRequest, PermissionRequestResult } from '@github/copilot-sdk';
import { PendingRequestRegistry } from '../common/util/pendingRequestRegistry';
import type { PermissionTier } from '../common/permissionTier';
import { requestConfirmation } from '../common/confirmationTool';
import { ILogService } from '../../platform/log/common/logService';

const APPROVE_ONCE: PermissionRequestResult = { kind: 'approve-once' };
const REJECT: PermissionRequestResult = { kind: 'reject' };

export class CopilotPermissionHandler {
	private readonly _pending = new PendingRequestRegistry<boolean>();

	/**
	 * @param attachedPaths Absolute paths the user attached to the request; reads of these are auto-approved.
	 * @param tier Resolved cross-participant permission tier for this turn
	 *             (configured default, or a /ask, /acceptEdits, /fullAuto override).
	 * @param _log Logging service.
	 */
	constructor(
		private readonly stream: vscode.ChatResponseStream,
		private readonly toolInvocationToken: vscode.ChatRequest['toolInvocationToken'],
		private readonly token: vscode.CancellationToken,
		private readonly attachedPaths: ReadonlySet<string>,
		private readonly tier: PermissionTier,
		private readonly _log: ILogService,
	) {}

	/** SDK `onPermissionRequest` callback. */
	handle = async (request: PermissionRequest): Promise<PermissionRequestResult> => {
		const toolCallId = request.toolCallId;
		this._log.debug(`permission request ${JSON.stringify({ kind: request.kind, toolCallId: toolCallId?.slice(0, 13) })}`);
		if (!toolCallId) {
			// Fail-safe: a request we cannot correlate is rejected.
			this._log.debug(`reject (no toolCallId) ${JSON.stringify({ kind: request.kind })}`);
			return REJECT;
		}

		// Tier: fullAuto → auto-approve everything.
		if (this.tier === 'fullAuto') {
			this._log.debug(`auto-approve (fullAuto tier) ${JSON.stringify({ kind: request.kind })}`);
			return APPROVE_ONCE;
		}
		// Tier: acceptEdits → auto-approve file writes; shell/custom-tool/other reads still prompt.
		if (this.tier === 'acceptEdits' && request.kind === 'write') {
			this._log.debug(`auto-approve (acceptEdits tier) ${JSON.stringify({ path: request.fileName })}`);
			return APPROVE_ONCE;
		}

		// Tier: read of a user-attached file → auto-approve.
		if (request.kind === 'read' && this.attachedPaths.has(request.path)) {
			this._log.debug(`auto-approve (attached file read) ${JSON.stringify({ path: request.path })}`);
			return APPROVE_ONCE;
		}
		// Tier: read of an OS temp file (SDK tool output) → auto-approve.
		if (request.kind === 'read' && request.path.startsWith(os.tmpdir())) {
			this._log.debug(`auto-approve (temp file read) ${JSON.stringify({ path: request.path })}`);
			return APPROVE_ONCE;
		}

		// Otherwise: park a deferred and prompt the user.
		this._log.debug(`prompting user ${JSON.stringify({ toolCallId: toolCallId.slice(0, 13), kind: request.kind })}`);
		const approved = await this._pending.registerAndFire(toolCallId, () => {
			void this._confirm(request, toolCallId);
		});
		this._log.debug(`permission decision ${JSON.stringify({ toolCallId: toolCallId.slice(0, 13), approved })}`);
		return approved ? APPROVE_ONCE : REJECT;
	};

	/** Resolve a parked permission request externally (e.g. from a UI action). */
	respond(toolCallId: string, approved: boolean): boolean {
		return this._pending.respond(toolCallId, approved);
	}

	/** Reject all outstanding prompts — call on session/participant dispose. */
	dispose(): void {
		this._pending.rejectAll(new Error('Copilot session disposed'));
	}

	private async _confirm(request: PermissionRequest, toolCallId: string): Promise<void> {
		this.stream.progress('Waiting for approval…');
		const approved = await requestConfirmation(
			'Copilot CLI — Allow operation?',
			describePermission(request),
			this.toolInvocationToken,
			this.token,
		);
		this._pending.respondOrBuffer(toolCallId, approved);
	}
}

function describePermission(request: PermissionRequest): string {
	switch (request.kind) {
		case 'shell':
			return `**Run shell command?**\n\n\`\`\`sh\n${request.fullCommandText.slice(0, 400)}\n\`\`\``;
		case 'write':
			return `**Write file?** \`${request.fileName}\``;
		case 'read':
			return `**Read file?** \`${request.path}\``;
		case 'custom-tool':
			return `**Run tool?** \`${request.toolName}\``;
		default:
			return `**Permission request:**\n\n\`\`\`json\n${JSON.stringify(request, null, 2).slice(0, 400)}\n\`\`\``;
	}
}
