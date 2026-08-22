/*---------------------------------------------------------------------------------------------
 *  Unit tests for protocolSelection.ts
 *  Pure Mocha – no VS Code host needed.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { usesResponsesApi } from '../../extension/models/protocolSelection';

describe('usesResponsesApi', () => {
	it('returns false when supportedEndpoints only has /chat/completions', () => {
		assert.strictEqual(usesResponsesApi({ supportedEndpoints: ['/chat/completions'] }), false);
	});

	it('returns true when supportedEndpoints only has /responses', () => {
		assert.strictEqual(usesResponsesApi({ supportedEndpoints: ['/responses'] }), true);
	});

	it('returns true when both /chat/completions and /responses are declared — Responses wins', () => {
		// Mirrors vscode-copilot-chat's ChatEndpoint.useResponsesApi: Responses is used
		// whenever declared, not only when it's the sole option.
		assert.strictEqual(
			usesResponsesApi({ supportedEndpoints: ['/chat/completions', '/responses'] }),
			true
		);
	});

	it('returns false for an empty supportedEndpoints array', () => {
		assert.strictEqual(usesResponsesApi({ supportedEndpoints: [] }), false);
	});

	it('returns false for unrelated declared endpoints', () => {
		assert.strictEqual(usesResponsesApi({ supportedEndpoints: ['ws:/responses-typo'] }), false);
	});
});
