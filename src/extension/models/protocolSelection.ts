/*---------------------------------------------------------------------------------------------
 *  Protocol selection: which wire format (Chat Completions vs. Responses)
 *  a model uses to talk to feima-api.
 *  Pure helper — no vscode import, so it can be unit-tested in plain Node/Mocha,
 *  matching this codebase's convention of keeping decidable logic out of the
 *  vscode-touching endpoint/provider files (see toolResultConverter.ts).
 *--------------------------------------------------------------------------------------------*/

/**
 * Returns true if a model should use the Responses API rather than Chat Completions.
 *
 * Mirrors vscode-copilot-chat's `ChatEndpoint.useResponsesApi`: Responses wins
 * whenever it's declared, even if /chat/completions is also present — not a
 * fallback-only mechanism.
 */
export function usesResponsesApi(modelInfo: { supportedEndpoints: readonly string[] }): boolean {
	return modelInfo.supportedEndpoints.includes('/responses');
}
