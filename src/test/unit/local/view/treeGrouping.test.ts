/*---------------------------------------------------------------------------------------------
 *  Unit tests for local/view/treeGrouping.ts
 *  Pure Mocha – no VS Code host needed.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { groupEntries } from '../../../../extension/models/local/view/treeGrouping';
import { LocalEndpointEntry } from '../../../../extension/models/local/types';

function makeEntry(id: string, origin: LocalEndpointEntry['origin']): LocalEndpointEntry {
	return {
		id,
		baseEndpoint: `http://${id}`,
		apiFormat: 'openai-compat',
		modelEndpointPath: '/v1/models',
		completionsEndpointPath: '/v1/chat/completions',
		origin,
	};
}

describe('groupEntries', () => {
	it('puts port-probe and manual entries under personal', () => {
		const entries = [makeEntry('a', 'port-probe'), makeEntry('b', 'manual')];
		const { personal, team } = groupEntries(entries);
		assert.strictEqual(personal.length, 2);
		assert.strictEqual(team.length, 0);
	});

	it('puts workspace-config entries under team', () => {
		const entries = [makeEntry('a', 'workspace-config')];
		const { personal, team } = groupEntries(entries);
		assert.strictEqual(personal.length, 0);
		assert.strictEqual(team.length, 1);
	});

	it('splits a mixed list correctly, preserving relative order within each group', () => {
		const entries = [
			makeEntry('a', 'port-probe'),
			makeEntry('b', 'workspace-config'),
			makeEntry('c', 'manual'),
			makeEntry('d', 'workspace-config'),
		];
		const { personal, team } = groupEntries(entries);
		assert.deepStrictEqual(personal.map(e => e.id), ['a', 'c']);
		assert.deepStrictEqual(team.map(e => e.id), ['b', 'd']);
	});

	it('returns empty arrays for an empty entry list', () => {
		const { personal, team } = groupEntries([]);
		assert.strictEqual(personal.length, 0);
		assert.strictEqual(team.length, 0);
	});
});
