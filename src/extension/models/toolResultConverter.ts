/*---------------------------------------------------------------------------------------------
 *  Tool Result Content Converter
 *  Pure helper – no vscode import, so it can be unit-tested in plain Node/Mocha.
 *--------------------------------------------------------------------------------------------*/

/**
 * Minimal duck-type for LanguageModelTextPart.
 * Only the `value` property is needed.
 */
export interface TextPartLike {
	readonly value: string;
}

/**
 * Minimal duck-type for LanguageModelDataPart.
 * Only `data` is needed; `mimeType` is optional context.
 */
export interface DataPartLike {
	readonly data: Uint8Array | string;
	readonly mimeType?: string;
}

/**
 * Returns true when `mimeType` indicates textual content that should be decoded
 * and forwarded to the upstream LLM as part of a tool result string.
 *
 * copilot-chat encodes several metadata signals as DataParts with custom mimeTypes
 * (e.g. `cache_control`, `stateful_marker`, `thinking`, `context_management`,
 * `phase_data`). These are Anthropic-specific bookkeeping signals that must NOT be
 * decoded as text — doing so leaks e.g. the literal string `"ephemeral"` into tool
 * results, corrupting filenames and triggering autopilot fix-loops.
 *
 * Allowlist (treat as textual):
 *   - undefined / empty string  (no mimeType → legacy DataPart carrying text)
 *   - `text/*`                  (e.g. `text/plain`, `text/html`)
 *   - `application/json`
 *
 * Everything else (including `image/*`, `cache_control`, `stateful_marker`, etc.)
 * is treated as non-textual and skipped.
 */
export function isTextualMimeType(mimeType: string | undefined): boolean {
	if (!mimeType) {
		return true; // Legacy DataParts with no mimeType carry actual text content
	}
	return mimeType.startsWith('text/') || mimeType === 'application/json';
}

/**
 * Convert a single element from a `LanguageModelToolResultPart.content` array
 * to a plain string suitable for sending in a `role: "tool"` message.
 *
 * Rules (mirrors VS Code Copilot anthropicMessageConverter.ts):
 * - `LanguageModelTextPart`  → `.value`
 * - `LanguageModelDataPart` with textual mimeType → text-decoded bytes
 * - `LanguageModelDataPart` with non-textual mimeType → empty string (skip metadata/images)
 * - `string` primitive       → as-is
 * - anything else            → empty string (NEVER `String(c)` → `[object Object]`)
 *
 * @param part     A single element from `LanguageModelToolResultPart.content`.
 * @param isTextPart  Predicate that returns true when `part` is a TextPart.
 * @param isDataPart  Predicate that returns true when `part` is a DataPart.
 */
export function toolResultPartToString(
	part: unknown,
	isTextPart: (p: unknown) => p is TextPartLike,
	isDataPart: (p: unknown) => p is DataPartLike
): string {
	if (isTextPart(part)) {
		return part.value;
	}

	if (isDataPart(part)) {
		// Skip non-textual DataParts (metadata signals like cache_control, stateful_marker,
		// thinking, context_management, phase_data, and binary image data).
		// Only decode DataParts whose mimeType indicates actual textual content.
		if (!isTextualMimeType(part.mimeType)) {
			return '';
		}
		try {
			const data = part.data;
			if (typeof data === 'string') {
				return data;
			}
			if (data instanceof Uint8Array) {
				return new TextDecoder().decode(data);
			}
			return ''; // Skip other binary representations
		} catch {
			return '';
		}
	}

	if (typeof part === 'string') {
		return part;
	}

	// Unknown objects (LanguageModelPromptTsxPart, etc.) – skip silently.
	// DO NOT use String(part): it turns objects into "[object Object]".
	return '';
}

/**
 * Convert a full `LanguageModelToolResultPart.content` array to a single string.
 */
export function toolResultContentToString(
	content: unknown,
	isTextPart: (p: unknown) => p is TextPartLike,
	isDataPart: (p: unknown) => p is DataPartLike
): string {
	if (Array.isArray(content)) {
		return content
			.map(c => toolResultPartToString(c, isTextPart, isDataPart))
			.join('');
	}
	// Scalar fallback (should not occur in practice)
	return typeof content === 'string' ? content : '';
}
