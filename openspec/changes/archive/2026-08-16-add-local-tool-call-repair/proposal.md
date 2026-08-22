## Why

Today, a local model's malformed tool-call JSON is silently dropped: `LocalEndpointProvider.provideLanguageModelChatResponse` calls `JSON.parse(call.arguments)` in a `try/catch` that only logs on failure — no `LanguageModelToolCallPart` is ever reported, so the tool call vanishes from the agent loop as if the model never attempted it. This is the opposite of the Feima-hosted path's behavior, which deliberately fail-hards on the same failure (`languageModelWrapper.ts`, tagged "P1 #25: Fail-hard on invalid JSON," a considered decision, not an oversight) — appropriate there because malformed JSON from Feima's curated hosted models is rare and likely signals a real bug worth surfacing loudly. Local/quantized models are the opposite case: malformed tool-call JSON is routine, expected noise, not a rare signal — so neither existing behavior fits them. Silently dropping hides real problems from the user; naively fail-harding would abort the entire turn far more often than is tolerable given how frequently small models produce recoverable formatting mistakes. This was flagged in the original feasibility study as the single most load-bearing reliability feature in this competitive niche (it's specifically what a 29K-install competitor's traction is attributed to) and has been on the backlog, unbuilt, since the very first local-model change shipped.

## What Changes

- Add a lenient repair pass for tool-call arguments emitted by local models, applied in `emitAccumulatedToolCalls` (`localChatEndpoint.ts`) — the one finalization point shared by both the OpenAI-compatible and Anthropic Messages streaming paths, so both protocols are covered by a single fix. Handles the deterministic, no-model-call-needed failure patterns: markdown code-fence wrapping, trailing commas, single-quoted keys/values, unquoted keys, and closing brackets/quotes for truncated JSON.
- Add confidence labeling for repaired tool calls, reusing the existing three-tier vocabulary (`confirmed` / `estimated` / `unconfirmed`) already established for model metadata: arguments that parsed cleanly are `confirmed`; arguments that needed repair are `estimated`.
- When repair still fails, report a failed tool result back into the agent loop instead of silently dropping the call — the model sees its call failed and can retry cleanly on its next turn, rather than the action disappearing without a trace.
- **Explicitly out of scope**: retrying against the same local model with a "please re-emit valid JSON" follow-up request (a second, potentially slow inference round-trip on hardware that's often already the latency-sensitive part of this system), and routing malformed JSON to a Feima-hosted model for repair (a new kind of coupling between local and hosted machinery that this project has deliberately avoided everywhere else). Both are real options, deferred rather than rejected, should the deterministic repair pass prove insufficient in practice.
- **Explicitly not touched**: the Feima-hosted path's fail-hard behavior (`languageModelWrapper.ts`) stays exactly as-is — it fits that path's reliability profile and there's no evidence it needs to change.

## Capabilities

### New Capabilities
- `local-tool-call-repair`: lenient, deterministic repair of malformed tool-call argument JSON from local/enterprise endpoints, with confidence labeling and disclosed (non-silent) failure when repair is unsuccessful.

### Modified Capabilities
None — this changes internal behavior within `LocalChatEndpoint`'s existing tool-call finalization step; no existing capability's documented requirements change.

## Impact

- Changes to `src/extension/models/local/localChatEndpoint.ts`: `emitAccumulatedToolCalls` gains a repair step before finalizing each call's arguments.
- Small change to `src/extension/models/local/localEndpointProvider.ts`'s tool-call reporting: on a still-unrepairable call, report a failed tool result into the loop instead of only logging.
- No changes to `FeimaChatEndpoint`, `FeimaLanguageModelWrapper`, `AutoModelProvider`, or any registry/discovery code.
- No new runtime dependencies anticipated — the repair pass is a small set of deterministic string transformations, not a dependency on an external JSON-repair library (a build-vs-vendor decision for design.md to make explicit).
