/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Normalized permission tier shared across the claude/codex/copilot participants.
 * Each participant maps this onto its own native permission vocabulary — see
 * claudeOptionsBuilder.ts's `mapTierToPermissionMode`, codexParticipant.ts's
 * `mapTierToApprovalPolicy`, and copilotPermissionHandler.ts's tiering in `handle()`.
 */
export type PermissionTier = 'ask' | 'acceptEdits' | 'fullAuto';

export const DEFAULT_PERMISSION_TIER: PermissionTier = 'ask';

export function isPermissionTier(value: unknown): value is PermissionTier {
	return value === 'ask' || value === 'acceptEdits' || value === 'fullAuto';
}

/**
 * Resolve the permission tier for a single turn.
 *
 * A recognized slash command (`/ask`, `/acceptEdits`, `/fullAuto` — registered
 * per-participant in package.json's `chatParticipants[].commands`, surfaced here
 * as `request.command`) overrides the configured default for that turn only;
 * it is never persisted back to settings or carried into the next turn.
 */
export function resolvePermissionTier(command: string | undefined, configuredDefault: unknown): PermissionTier {
	if (isPermissionTier(command)) { return command; }
	return isPermissionTier(configuredDefault) ? configuredDefault : DEFAULT_PERMISSION_TIER;
}
