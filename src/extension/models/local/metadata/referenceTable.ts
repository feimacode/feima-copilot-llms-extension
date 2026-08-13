/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Fallback capability reference table, matched by model-name pattern, used
 *  only when an endpoint reports no usable metadata itself (see
 *  metadataResolver.ts). A small curated subset inspired by community
 *  references such as LiteLLM's `model_prices_and_context_window.json`
 *  (https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json)
 *  rather than a live sync of the full 2,500+ model file — vendoring a
 *  static, reviewed subset avoids taking a runtime dependency on fetching
 *  arbitrary remote JSON. Values here are always surfaced as "estimated" to
 *  the user (see types.ts MetadataConfidence), never presented as confirmed.
 *
 *  Extend this table as gaps are found; it is intentionally not exhaustive.
 *--------------------------------------------------------------------------------------------*/

export interface ReferenceTableEntry {
	/** Case-insensitive pattern matched against the model id. */
	pattern: RegExp;
	maxInputTokens: number;
	maxOutputTokens: number;
	toolCalling: boolean;
}

export const REFERENCE_TABLE: ReferenceTableEntry[] = [
	{ pattern: /llama-?3\.[23]/i, maxInputTokens: 128_000, maxOutputTokens: 8_192, toolCalling: true },
	{ pattern: /llama-?3\.1/i, maxInputTokens: 128_000, maxOutputTokens: 8_192, toolCalling: true },
	{ pattern: /llama-?3(\D|$)/i, maxInputTokens: 8_192, maxOutputTokens: 4_096, toolCalling: false },
	{ pattern: /qwen2\.5-coder/i, maxInputTokens: 32_768, maxOutputTokens: 8_192, toolCalling: true },
	{ pattern: /qwen2\.5/i, maxInputTokens: 32_768, maxOutputTokens: 8_192, toolCalling: true },
	{ pattern: /qwen3/i, maxInputTokens: 128_000, maxOutputTokens: 8_192, toolCalling: true },
	{ pattern: /qwen/i, maxInputTokens: 32_768, maxOutputTokens: 8_192, toolCalling: false },
	{ pattern: /deepseek-?r1/i, maxInputTokens: 64_000, maxOutputTokens: 8_192, toolCalling: false },
	{ pattern: /deepseek-?v3/i, maxInputTokens: 64_000, maxOutputTokens: 8_192, toolCalling: true },
	{ pattern: /deepseek-?coder/i, maxInputTokens: 16_384, maxOutputTokens: 4_096, toolCalling: false },
	{ pattern: /mixtral/i, maxInputTokens: 32_768, maxOutputTokens: 4_096, toolCalling: true },
	{ pattern: /mistral-?7b/i, maxInputTokens: 32_768, maxOutputTokens: 4_096, toolCalling: false },
	{ pattern: /mistral/i, maxInputTokens: 32_768, maxOutputTokens: 4_096, toolCalling: true },
	{ pattern: /gemma-?2/i, maxInputTokens: 8_192, maxOutputTokens: 4_096, toolCalling: false },
	{ pattern: /gemma/i, maxInputTokens: 8_192, maxOutputTokens: 4_096, toolCalling: false },
	{ pattern: /phi-?4/i, maxInputTokens: 16_384, maxOutputTokens: 4_096, toolCalling: false },
	{ pattern: /phi-?3/i, maxInputTokens: 4_096, maxOutputTokens: 2_048, toolCalling: false },
	{ pattern: /codellama/i, maxInputTokens: 16_384, maxOutputTokens: 4_096, toolCalling: false },
	{ pattern: /granite/i, maxInputTokens: 8_192, maxOutputTokens: 4_096, toolCalling: true },
];

/** Returns the first matching entry, or undefined if nothing in the table matches. */
export function lookupReferenceTable(modelId: string): ReferenceTableEntry | undefined {
	return REFERENCE_TABLE.find(entry => entry.pattern.test(modelId));
}
