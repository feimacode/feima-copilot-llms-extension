## Context

Confirmed by reading both paths directly: `LocalEndpointProvider.provideLanguageModelChatResponse` (`localEndpointProvider.ts:229-241`) silently drops a tool call whose arguments fail `JSON.parse` — logs and continues, nothing else. `FeimaLanguageModelWrapper` (`languageModelWrapper.ts:80-134`) does the opposite: fails the entire request, explicitly tagged as a deliberate decision ("P1 #25: Fail-hard on invalid JSON"). Neither behavior fits local models well — silent drop hides real problems, and copying Feima's fail-hard would abort far more turns than is tolerable given how much more often small/quantized models produce recoverable formatting mistakes. No repair logic of any kind exists anywhere in this codebase today, for either path.

## Goals / Non-Goals

**Goals:**
- Recover the common, deterministic classes of malformed tool-call JSON from local models without an extra model round-trip.
- Never let a single malformed tool call silently vanish — either it's repaired and reported, or its failure is visibly disclosed.
- Cover both local wire protocols (OpenAI-compatible and Anthropic Messages) from one implementation.
- Leave the Feima-hosted path's fail-hard behavior untouched.

**Non-Goals:**
- No retry round-trip to the same local model asking it to re-emit valid JSON.
- No routing malformed JSON to a Feima-hosted model for repair.
- No general-purpose lenient-JSON-grammar parser — the transform set targets the specific patterns local models actually produce, not arbitrary non-JSON input.
- No new "tool failed" part type or protocol addition to how failures are disclosed (see Decisions — this isn't available at this API layer).

## Decisions

### Build a small, targeted transform pipeline — don't vendor a general JSON-repair library
No `jsonrepair`/`json5`-style dependency exists in this project today, and every prior change in this local-model arc has explicitly avoided adding new runtime dependencies. The failure taxonomy here is small and known (fence-wrapping, trailing commas, quote style, unquoted keys, truncation) — a general lenient-JSON-grammar library would handle a much broader (and partly irrelevant) input space than this problem actually has. A handful of ordered, independently-testable string transforms is simpler to reason about, review, and extend than a dependency whose exact leniency rules aren't under this project's control.

### Transform pipeline order matters — cheapest and safest first
```
raw arguments string
   │
   ▼
1. try JSON.parse as-is                     → success: confirmed
   │ fail
   ▼
2. strip markdown code fence, retry parse   → success: estimated
   │ fail
   ▼
3. normalize syntax (trailing commas,       → success: estimated
   single quotes, unquoted keys), retry
   │ fail
   ▼
4. close truncated brackets/quotes, retry   → success: estimated
   │ fail
   ▼
5. unrepairable → disclose failure in the response text, no tool call reported
```
Steps 2-3 are purely syntactic and faithful — they never change the model's intended data, only its formatting. Step 4 (bracket-closing) is qualitatively different: it can produce syntactically-valid JSON that's still semantically incomplete (a truncated string value gets force-closed mid-word). It's still attempted, because a slightly-wrong recovered value is usually still more useful to a tool than nothing — but it's the last resort, tried only after the faithful transforms fail, and its result carries the same `estimated` label without a stronger claim than that.

### Disclosure mechanism: response text, not a fabricated tool call or a "tool result" part
This corrects an imprecision in the original proposal's "report a failed tool result back into the loop" framing. `vscode.LanguageModelChatProvider.provideLanguageModelChatResponse` can only report `LanguageModelResponsePart`s (text, tool call, data, thinking) via `progress.report(...)` — there is no "tool failed" or "tool result" part type available to a provider. Tool *results* are supplied by whoever actually executes the tool, on a later turn — the provider has no mechanism to inject one itself.

Given that constraint, two real options were considered:
- **Report the tool call anyway, with a marker payload**, letting the tool's own invocation/validation surface the failure through VS Code's existing tool-execution error path. Rejected — this fabricates a tool call the model never validly made, and pushes the failure mode onto arbitrary third-party tool implementations that have no reason to expect a `__repair_failed` sentinel in their input.
- **Report response text naming the failure**, and never emit a `LanguageModelToolCallPart` for arguments that never became valid JSON. Chosen — this is honest about what actually happened (the model's structured output was unusable) and uses the one channel a provider genuinely has for visible disclosure. The text is visible in the chat transcript, which is a strictly better disclosure surface than a log line nobody's watching mid-task, even though it doesn't re-enter the formal tool-calling protocol the way a real tool result would.

**Trade-off accepted**: the model doesn't get a structured "your tool call failed, here's why" signal on its *next* turn the way it would from a real tool result — it only sees the disclosure as plain text in the same turn. Revisit if this proves insufficient for getting models to self-correct in practice.

### Confidence label is internal (logging), not surfaced to the model or a new API concept
Unlike model metadata's confidence label (which has a natural home in the picker tooltip), a per-tool-call `confirmed`/`estimated` label has no equivalent persistent UI surface and no VS Code API to attach it to a `LanguageModelToolCallPart`. It's tracked for logging/debugging visibility only — useful for understanding how often repair is actually firing and on which endpoints, not something exposed further right now.

## Risks / Trade-offs

- **[Risk]** The bracket-closing heuristic (step 4) can produce a tool call with subtly wrong data (a truncated string silently closed early) that still executes successfully against a real tool, rather than failing loudly. → **Mitigation**: none beyond the `estimated` logging label — accepted as a real risk of best-effort truncation recovery; if it proves too costly in practice, step 4 can be dropped from the pipeline without touching steps 1-3 or the disclosure behavior.
- **[Risk]** Regex-based syntax normalization (trailing commas, quote conversion) can misfire on legitimately-quoted content inside string values (e.g. a file's content argument that itself contains a comma-like pattern near a brace). → **Mitigation**: order the transforms to only apply when the prior, more conservative attempt has already failed, and keep each transform narrowly scoped (e.g. trailing-comma removal only matches a comma immediately before `}`/`]`, not commas anywhere).
- **[Trade-off]** Disclosure via response text, not a real tool-result re-entry into the protocol, is a real limitation on how well a model can self-correct — see the Decisions section above. Accepted as the only mechanism actually available at this API layer.
