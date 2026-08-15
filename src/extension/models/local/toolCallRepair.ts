/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Deterministic repair of malformed tool-call argument JSON from local
 *  models. See openspec/changes/add-local-tool-call-repair/design.md for the
 *  rationale: a small, targeted transform pipeline rather than a vendored
 *  general-purpose lenient-JSON library, applied cheapest-and-safest-first.
 *
 *  Deliberately free of any `vscode` import so this stays unit-testable in
 *  the plain-mocha harness (same pattern as scoring.ts/taskSignal.ts in
 *  ../auto) — the Feima-hosted path is untouched by this file entirely.
 *--------------------------------------------------------------------------------------------*/

export type RepairConfidence = 'confirmed' | 'estimated';

export interface RepairedToolCallArguments {
	readonly parameters: object;
	readonly confidence: RepairConfidence;
}

/**
 * Strips a leading/trailing markdown code fence (with or without a `json`
 * language tag) around otherwise-valid JSON. Returns the input unchanged
 * when no fence is present.
 */
export function stripCodeFence(raw: string): string {
	const match = raw.trim().match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
	return match ? match[1].trim() : raw;
}

/**
 * Fixes common non-standard JSON syntax: trailing commas before a closing
 * brace/bracket, unquoted object keys, and single-quoted keys/string values.
 * Narrowly scoped on purpose (see design.md Risks: a general-purpose fixer
 * risks misfiring on legitimate content inside string values) — unquoted
 * keys are normalized before single-quote conversion so a key that was
 * unquoted-with-single-quoted-value (`{key: 'value'}`) resolves correctly.
 */
export function normalizeSyntax(raw: string): string {
	let result = raw;
	// Trailing comma immediately before a closing brace/bracket.
	result = result.replace(/,(\s*[}\]])/g, '$1');
	// Unquoted object keys: identifier immediately followed by a colon,
	// preceded by '{' or ',' (with optional whitespace).
	result = result.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)/g, '$1"$2"$3');
	// Single-quoted string values (keys are already double-quoted by the
	// step above, so this only ever converts values at this point).
	result = result.replace(/'([^'\\]*)'/g, '"$1"');
	return result;
}

/**
 * Closes truncated JSON by tracking bracket/quote balance and appending the
 * minimal closing sequence. Correctly ignores braces/brackets that appear
 * inside string literals (e.g. a code-content argument containing `{`) by
 * tracking string-open state and escape sequences, rather than naively
 * counting every bracket character in the raw text.
 */
export function closeTruncatedJson(raw: string): string {
	let inString = false;
	let escaped = false;
	const stack: Array<'}' | ']'> = [];

	for (const ch of raw) {
		if (escaped) {
			escaped = false;
			continue;
		}
		if (ch === '\\') {
			escaped = true;
			continue;
		}
		if (ch === '"') {
			inString = !inString;
			continue;
		}
		if (inString) {
			continue;
		}
		if (ch === '{') {
			stack.push('}');
		} else if (ch === '[') {
			stack.push(']');
		} else if (ch === '}' || ch === ']') {
			stack.pop();
		}
	}

	let result = raw;
	if (inString) {
		result += '"';
	}
	while (stack.length > 0) {
		result += stack.pop();
	}
	return result;
}

/**
 * Attempts to parse a tool call's raw arguments string, applying repair
 * transforms cumulatively (cheapest/most-faithful first) until one
 * succeeds. Returns `undefined` when nothing produces valid JSON.
 *
 * Confidence is `confirmed` only when the raw string parsed as-is;
 * `estimated` for every repaired case, including the least certain one
 * (truncation bracket-closing, which can produce syntactically-valid but
 * semantically-incomplete data — see design.md Risks).
 */
export function repairToolCallArguments(raw: string): RepairedToolCallArguments | undefined {
	const input = raw.trim() || '{}';

	const attempts: Array<{ candidate: () => string; confidence: RepairConfidence }> = [
		{ candidate: () => input, confidence: 'confirmed' },
		{ candidate: () => stripCodeFence(input), confidence: 'estimated' },
		{ candidate: () => normalizeSyntax(stripCodeFence(input)), confidence: 'estimated' },
		{ candidate: () => closeTruncatedJson(normalizeSyntax(stripCodeFence(input))), confidence: 'estimated' },
	];

	for (const attempt of attempts) {
		try {
			const parsed: unknown = JSON.parse(attempt.candidate());
			if (typeof parsed === 'object' && parsed !== null) {
				return { parameters: parsed as object, confidence: attempt.confidence };
			}
		} catch {
			continue;
		}
	}
	return undefined;
}
