/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Pure grouping logic for the endpoint management tree — which entries go
 *  under the "Personal" vs. "Team-Shared" group node, and whether the team
 *  group should be rendered at all. Deliberately vscode-free (see
 *  scoring.ts in ../auto for the same split rationale) so this is
 *  unit-testable without a running extension host.
 *--------------------------------------------------------------------------------------------*/

import { LocalEndpointEntry } from '../types';

export interface GroupedEntries {
	readonly personal: readonly LocalEndpointEntry[];
	readonly team: readonly LocalEndpointEntry[];
}

/**
 * Team-shared entries are always `origin === 'workspace-config'` — everything
 * else (`port-probe`, `manual`) is personal, machine-local state (see
 * types.ts `LocalEndpointOrigin` doc comment).
 */
export function groupEntries(entries: readonly LocalEndpointEntry[]): GroupedEntries {
	const personal: LocalEndpointEntry[] = [];
	const team: LocalEndpointEntry[] = [];
	for (const entry of entries) {
		(entry.origin === 'workspace-config' ? team : personal).push(entry);
	}
	return { personal, team };
}
