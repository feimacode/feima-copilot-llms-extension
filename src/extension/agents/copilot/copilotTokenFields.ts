/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *--------------------------------------------------------------------------------------------*/

/**
 * Parses the structured metadata header carried by a GitHub Copilot token.
 *
 * A Copilot token has the shape `<key1>=<value1>;<key2>=<value2>;...:HMAC` — a
 * semicolon-delimited field list, then a colon, then the HMAC signature. Mirrors
 * the agent-host's `copilotTokenFields.ts`.
 */

export function parseCopilotTokenFields(token: string | undefined): ReadonlyMap<string, string> {
	const result = new Map<string, string>();
	if (!token) {
		return result;
	}
	const colonIdx = token.indexOf(':');
	const header = colonIdx === -1 ? token : token.substring(0, colonIdx);
	for (const field of header.split(';')) {
		const eqIdx = field.indexOf('=');
		if (eqIdx <= 0) {
			continue;
		}
		result.set(field.substring(0, eqIdx), field.substring(eqIdx + 1));
	}
	return result;
}

/** When the token's `rt` field is `1`, restricted (enhanced) telemetry is enabled. */
export function isRestrictedTelemetryEnabled(token: string | undefined): boolean {
	return parseCopilotTokenFields(token).get('rt') === '1';
}
