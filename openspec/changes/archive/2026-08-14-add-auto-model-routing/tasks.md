## 1. Router Foundation

- [x] 1.1 Define the candidate/scoring types: unified candidate shape (model info, source entry, locality, capability confidence), strategy function signature, disclosure result shape (`resolvedModel`, `reason`, `confidence?`, `fallback?`)
- [x] 1.2 Implement `AutoModelProvider` implementing `vscode.LanguageModelChatProvider`, holding a reference to the existing `LocalEndpointProvider` instance — **refined during implementation**: also holds a read-only reference to `LocalEndpointRegistry` (entries/health lookups only, never re-fetching model lists — no fan-out duplication; see design.md note). The public `LanguageModelChatInformation` shape alone doesn't carry back locality/confidence, so `LocalEndpointProvider` also gained one small additive accessor (`getCandidateSource`) rather than requiring fragile string-parsing of `detail`/`tooltip`
- [x] 1.3 Implement `provideLanguageModelChatInformation()`: call the sibling's `provideLanguageModelChatInformation`, tag each result as a candidate, expose one "Auto" entry in the picker
- [x] 1.4 Implement `provideLanguageModelChatResponse()`: run availability gating + the active strategy to pick a candidate, then forward the call verbatim to `LocalEndpointProvider.provideLanguageModelChatResponse`
- [x] 1.5 Implement `provideTokenCount()` by forwarding to the sibling for the resolved candidate (or a conservative estimate when no candidate is yet resolved) — implemented as the conservative estimate always, since no "currently resolved candidate" concept exists outside an active response call
- [x] 1.6 Confirmed structurally: `grep -rn "claude|codex" src/extension/models/local/auto/` finds zero references outside an explanatory comment — nothing in the router's dependency graph can reach `ClaudeModelProvider`/`CodexModelProvider`, so this isn't a filter that could be silently bypassed, it's a graph-level impossibility. Documented in `autoModelProvider.ts`'s header comment

## 2. Availability Gating & Strategies

- [x] 2.1 Implement availability gating: exclude any candidate whose registry entry health is unreachable, applied before any strategy scoring
- [x] 2.2 Implement the shared scoring primitives: locality classification (loopback vs. network host), task-fit signal (carried over from the original Auto design exploration — prompt length, agent-mode vs. simple chat, tool/file context presence), capability confidence ranking
- [x] 2.3 Implement `local-first`: prefer same-machine candidates; escalate to network only when no same-machine candidate qualifies; disclose the escalation explicitly
- [x] 2.4 Implement `balanced`: score by task fit + confidence, locality/latency as tie-breaker only
- [x] 2.5 Implement `most-capable`: rank by capability confidence tier then context window, ignoring locality/latency
- [x] 2.6 Implement the fallback state: when no candidate qualifies under the active strategy, return a disclosed fallback result rather than silently picking a disqualified candidate or failing opaquely

## 3. Session Stickiness

- [x] 3.1 Implement per-conversation sticky-candidate state — **refined during implementation**: the Language Model Provider API exposes no stable conversation/session id, so state is keyed by a lightweight fingerprint of the conversation's first message instead (documented in sessionStickiness.ts)
- [x] 3.2 On a follow-up turn, reuse the sticky candidate unless it has become unreachable or the task category has shifted meaningfully
- [x] 3.3 Re-run full strategy selection when the sticky candidate is invalidated, and update the sticky state to the new pick

## 4. Disclosure UI

- [x] 4.1 Implement disclosure content construction: `{ resolvedModel, resolvedModelName, reason, confidence? }` attached to each routed response
- [x] 4.2 Render disclosure — **design deviation found during implementation, documented in disclosure.ts and design.md**: VS Code's rich collapsible content-part widget is core/chat-participant-only machinery, not reachable from the public `vscode.LanguageModelChatProvider` API a third-party extension implements. Disclosure is a markdown text prefix reported via `LanguageModelTextPart` instead — matches the *content* shape (resolved model + reason), not the rich widget mechanics, which are structurally unavailable here
- [x] 4.3 Ensure the `local-first` escalation case and the fallback case each have distinct, explicit disclosure copy (not generic "routed to X" text that hides the reasoning)

## 5. Setting & Registration

- [x] 5.1 Add `feima.localModels.autoStrategy` enum setting (`local-first` | `balanced` | `most-capable`, default `balanced`) to `package.json`, following the `feima.agents.codex.permissionMode` pattern exactly (enum + enumDescriptions + markdownDescription)
- [x] 5.2 Add corresponding l10n entries to `package.nls.json` and `package.nls.zh-cn.json`
- [x] 5.3 Register `AutoModelProvider` in `extension.ts` under its own provider ID (e.g. `feima-auto`), constructed after and depending on the existing `localProvider` instance — no changes to existing registration code

## 6. Feima-Hosted Endpoint Shortcut

- [x] 6.1 Implement the `feima.localModels.addFeimaHostedEndpoint` command: resolve the current Feima access token via the existing `authService`, pre-fill base endpoint + `openai-compat` format, and call `LocalEndpointRegistry.upsertPersonalEntry` — reusing the existing registration path unmodified
- [x] 6.2 Detect an existing Feima-hosted entry (by base endpoint) on re-run and update its token in place rather than creating a duplicate — satisfied for free by `upsertPersonalEntry`'s existing id-keyed upsert semantics, no special-case code needed
- [x] 6.3 Show a confirmation message that explicitly states the token is a snapshot and may need re-running the command later; point to the primary `feima` picker entry as the continuously-fresh alternative
- [x] 6.4 Add the command declaration to `package.json` + l10n files, following the existing command conventions
- [x] 6.5 Verify no Feima-specific branching was introduced into `LocalChatEndpoint`, `LocalEndpointProvider`, or `LocalEndpointRegistry` — confirmed: the shortcut only calls the existing public `upsertPersonalEntry`, no new branching added to any of the three files

## 7. Testing & Validation

- [x] 7.1 Unit tests for strategy scoring functions — `strategies.test.ts` (23 cases: locality, hard-requirement gating, confidence ranking, task-signal thresholding, all three strategies including escalation/fallback/tie-breaking). **Refined during implementation**: `scoring.ts`, `types.ts`, and `taskSignal.ts` were split from their vscode-dependent counterparts (`candidateBuilder.ts`, `taskSignalExtractor.ts`) specifically so this pure logic could be unit-tested at all — a plain `import * as vscode` anywhere in the import chain (even if only used for types) breaks the plain-mocha harness
- [x] 7.2 Unit tests for session-stickiness state transitions — `sessionStickiness.test.ts` (8 cases: no-sticky-state, reuse, unreachable invalidation, dropped-candidate invalidation, task-shift invalidation, tracker get/set, eviction bound)
- [ ] 7.3 Unit tests for the shortcut's re-run/update-not-duplicate behavior — **not written**: this behavior lives entirely in `LocalEndpointRegistry.upsertPersonalEntry`, which imports real `vscode.ExtensionContext`/`EventEmitter` and can't run under the plain-mocha harness, same constraint documented for the registry in the prior change. Needs the `ext:test` extension-host integration path
- [ ] 7.4 Manual validation: confirm Claude/Codex models never surface as Auto candidates in a real running extension — **not performed in this session**, needs a running extension host; the structural guarantee (task 1.6) makes this a sanity check rather than a real risk, but it's still unverified live
- [ ] 7.5 Manual end-to-end validation against real registered endpoints — **not performed in this session**, carries forward the still-open gap from the prior change; needs a live local runtime (e.g. real Ollama) to verify routing/delegation/disclosure end to end

## 8. Documentation

- [x] 8.1 Update README to describe Auto, the three strategies, and the Feima-hosted shortcut, framed consistently with the existing "every model source in one picker" positioning
- [x] 8.2 Document the shortcut's token-snapshot limitation for users explicitly, not just in the in-app confirmation message
