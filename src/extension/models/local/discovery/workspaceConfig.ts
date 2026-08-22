/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Team-shared endpoint discovery: reads an optional `.feima/endpoints.json`
 *  committed to the workspace. URLs only, no secrets — see design.md
 *  "Persistence Scope Separation". Candidate URLs are validated the same way
 *  as a manually registered entry (probeEndpoint), never trusted blindly.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { LocalApiFormat, LocalEndpointEntry, idForEndpoint } from '../types';
import { completionsPathForProbeResult, probeEndpoint, probeKnownEndpoint } from './probe';

const CONFIG_RELATIVE_PATH = '.feima/endpoints.json';

interface WorkspaceEndpointFileEntry {
	baseEndpoint: string;
	apiFormat?: LocalApiFormat;
	modelEndpointPath?: string;
	completionsEndpointPath?: string;
	label?: string;
	/** Never honored — flagged if present, see readWorkspaceEndpoints. */
	apiKey?: string;
}

interface WorkspaceEndpointFile {
	endpoints?: WorkspaceEndpointFileEntry[];
}

/**
 * Reads and validates `.feima/endpoints.json` from every open workspace
 * folder. Each candidate is probed before being trusted (a URL sitting in a
 * committed file could be stale or wrong) — this reuses the exact validation
 * path a manual registration goes through.
 */
export async function readWorkspaceEndpoints(log: ILogService): Promise<LocalEndpointEntry[]> {
	const folders = vscode.workspace.workspaceFolders ?? [];
	const results: LocalEndpointEntry[] = [];

	for (const folder of folders) {
		const fileUri = vscode.Uri.joinPath(folder.uri, CONFIG_RELATIVE_PATH);
		let raw: WorkspaceEndpointFile;
		try {
			const bytes = await vscode.workspace.fs.readFile(fileUri);
			raw = JSON.parse(Buffer.from(bytes).toString('utf-8'));
		} catch {
			// No config file in this folder — not an error, just nothing to discover here.
			continue;
		}

		for (const candidate of raw.endpoints ?? []) {
			if (candidate.apiKey) {
				log.warn(
					`[workspaceConfig] Ignoring "apiKey" in ${CONFIG_RELATIVE_PATH} for ${candidate.baseEndpoint} — ` +
					`team-shared config must not contain secrets; register this endpoint manually with a personal key instead`,
				);
			}
			if (!candidate.baseEndpoint) {
				log.warn(`[workspaceConfig] Skipping entry with no baseEndpoint in ${CONFIG_RELATIVE_PATH}`);
				continue;
			}

			const validated = candidate.apiFormat && candidate.modelEndpointPath
				? await probeKnownEndpoint(candidate.baseEndpoint, candidate.apiFormat, candidate.modelEndpointPath)
				: await probeEndpoint(candidate.baseEndpoint);

			if (!validated.ok) {
				log.warn(`[workspaceConfig] Team-shared endpoint ${candidate.baseEndpoint} did not validate: ${validated.reason}`);
				continue;
			}

			results.push({
				id: idForEndpoint(candidate.baseEndpoint),
				baseEndpoint: candidate.baseEndpoint.replace(/\/+$/, ''),
				apiFormat: validated.format,
				modelEndpointPath: validated.modelEndpointPath,
				completionsEndpointPath: candidate.completionsEndpointPath ?? completionsPathForProbeResult(validated),
				origin: 'workspace-config',
				label: candidate.label,
			});
		}
	}

	return results;
}
