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
 * Convert a single element from a `LanguageModelToolResultPart.content` array
 * to a plain string suitable for sending in a `role: "tool"` message.
 *
 * Rules (mirrors VS Code Copilot anthropicMessageConverter.ts):
 * - `LanguageModelTextPart`  → `.value`
 * - `LanguageModelDataPart`  → text-decoded bytes, or empty string for binary
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
