## 1. Repair Transforms (pure, unit-testable)

- [x] 1.1 Implement `stripCodeFence(raw: string): string` — removes a leading/trailing markdown code fence (with or without a `json` language tag) if present, otherwise returns input unchanged
- [x] 1.2 Implement `normalizeSyntax(raw: string): string` — fixes trailing commas before `}`/`]`, converts single-quoted keys/string values to double-quoted, quotes unquoted object keys
- [x] 1.3 Implement `closeTruncatedJson(raw: string): string` — tracks open `{`/`[`/`"` and appends the minimal closing sequence needed — **refined during implementation**: tracks string-open state and escape sequences so brackets inside legitimate string values (e.g. code content) are never miscounted, not a naive char-by-char bracket count
- [x] 1.4 Implement the pipeline function `repairToolCallArguments(raw: string): { parameters: object; confidence: 'confirmed' | 'estimated' } | undefined` that tries plain `JSON.parse`, then each transform in order (per design.md's pipeline), returning the first successful result with the correct confidence label, or `undefined` if nothing parses
- [x] 1.5 Keep all of 1.1-1.4 free of any `vscode` import, following the vscode-free pure-logic pattern established across the prior three changes, so they're unit-testable in the plain-mocha harness

## 2. Integration into `LocalChatEndpoint`

- [x] 2.1 Call `repairToolCallArguments` from `emitAccumulatedToolCalls` for each finalized tool call's `arguments` string, before the call is included in the `toolCalls` array passed to the callback
- [x] 2.2 When repair succeeds, include the call as today, tagging it — **refined**: `confidence` is now a field directly on the `StreamDelta.toolCalls` entry (not just a log line), since `StreamDelta`'s shape changed to carry pre-parsed `parameters` + `confidence` instead of a raw `arguments` string (see design.md's stated goal that the provider no longer needs its own JSON.parse)
- [x] 2.3 When repair fails entirely, do not include that call in `toolCalls` — instead placed on a new `StreamDelta.failedToolCalls` field for group 3 to disclose via the text channel
- [x] 2.4 Confirmed: both `parseOpenAICompatSSEStream` (3 call sites) and `parseAnthropicSSEStream` (2 call sites) go through the single shared `emitAccumulatedToolCalls` — no protocol-specific duplication

## 3. Disclosure in `LocalEndpointProvider`

- [x] 3.1 Update the tool-call reporting loop in `provideLanguageModelChatResponse` (`localEndpointProvider.ts`) to no longer need its own `JSON.parse`/`try-catch` for arguments — `emitAccumulatedToolCalls` now only ever hands it calls with already-valid parsed arguments
- [x] 3.2 When `LocalChatEndpoint` reports a call that failed repair (via the new `StreamDelta.failedToolCalls` field), report a `LanguageModelTextPart` naming the tool and stating its arguments could not be parsed
- [x] 3.3 Log repair outcomes (confirmed / estimated / failed) per call — `estimated` and `failed` outcomes log a warning/error including the endpoint and tool name (in both `emitAccumulatedToolCalls` and the provider's reporting loop); `confirmed` outcomes are not separately logged since they're the expected/silent-success case, consistent with the rest of this codebase's logging density

## 4. Testing

- [x] 4.1 Unit tests for `stripCodeFence`: fenced-with-language-tag, fenced-without-tag, unfenced input unchanged
- [x] 4.2 Unit tests for `normalizeSyntax`: trailing comma removal, single-quote conversion, unquoted key quoting, and a case combining more than one issue
- [x] 4.3 Unit tests for `closeTruncatedJson`: missing closing brace, missing closing bracket, missing closing quote, nested truncation — plus a test confirming braces inside a legitimate string value are never miscounted
- [x] 4.4 Unit tests for `repairToolCallArguments`: clean JSON returns `confirmed`, each individual malformed pattern returns `estimated` with correct data, a truly unrecoverable string (e.g. prose with no JSON at all) returns `undefined`
- [x] 4.5 Unit test confirming a regex-based transform does NOT misfire on a legitimate comma or quote character inside a valid string value — **and** an honest test documenting the one residual case that still can (two-or-more apostrophes inside already-broken JSON, which never reaches the risky transform unless the input was already unparseable — see the "KNOWN LIMITATION" test and design.md Risks)
- [ ] 4.6 Manual validation against a real local runtime known to occasionally produce malformed tool-call output — **not performed in this session**, carries forward the same still-open manual-validation gap noted in every prior change in this arc

## 5. Documentation

- [x] 5.1 Add a short note to `localChatEndpoint.ts`'s header comment (or `emitAccumulatedToolCalls`'s doc comment) describing the repair pipeline and pointing to this change's design.md for the rationale
