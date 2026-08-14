## Context

`local-model-provider` (shipped, archived as `2026-08-13-add-local-model-endpoints`) already gives `LocalEndpointProvider` a public surface that is structurally identical to what VS Code itself calls: `provideLanguageModelChatInformation` and `provideLanguageModelChatResponse`, implementing `vscode.LanguageModelChatProvider`. Reading VS Code's own core source (`~/toys/vscode`) confirmed two things worth building on directly: first, "Auto" in the real product is nothing more than a synthetic model id (`'auto'`) resolved like any other model — the actual routing decision is computed entirely server-side and the client only relays `{ resolvedModel, predictedLabel, confidence }` and renders a disclosure widget; second, `ClaudeModelProvider`/`CodexModelProvider` (in this extension) intentionally throw from `provideLanguageModelChatResponse` — Claude/Codex have no valid target for the kind of delegation this design relies on, independent of any policy choice.

Because we have no backend equivalent to GitHub's routing service, our classifier and policy have to live client-side, in the extension itself — the interesting part of GitHub's Auto was never open-sourced and isn't something we can borrow beyond its output *shape*.

## Goals / Non-Goals

**Goals:**
- Route a chat request to the best available local/enterprise endpoint automatically, removing the manual "which registered endpoint should I pick" burden.
- Do this as a thin delegator over the existing `LocalEndpointProvider`, adding no parallel endpoint/streaming implementation.
- Offer a small, named, inspectable set of strategies rather than one opaque policy or a raw weight-tuning UI.
- Disclose routing decisions clearly enough to avoid the trust failure documented in GitHub's own "Auto model selection always route to bad models" community discussion.
- Let a user's own Feima-hosted access optionally join the pool through the *existing* registration mechanism, with a convenience shortcut — without adding Feima-specific code to the generic local-endpoint machinery.

**Non-Goals:**
- No built-in Feima-hosted-aware routing logic inside the router itself (no quota-based filtering, no billing-multiplier-aware scoring). If a user wants Feima-hosted in the pool, it enters exactly like any other registered endpoint.
- No inclusion of Claude/Codex in the candidate pool — structurally excluded, not merely policy-excluded (see Context).
- No raw numeric weight-tuning UI for power users in this change — the three named strategies are the full surface for v1.
- No solving Feima's OAuth-token-refresh problem generically. The shortcut command's snapshot-token limitation is accepted, disclosed, and left as-is (see Risks) rather than solved by adding token-refresh awareness to `LocalChatEndpoint`.

## Decisions

### The router is a pure delegator, not a third parallel implementation
`AutoModelProvider` holds a reference to the `LocalEndpointProvider` *instance* (not to `LocalEndpointRegistry` directly) and calls its already-public interface methods — the same ones VS Code itself calls. `provideLanguageModelChatInformation` asks the sibling for its current aggregate list; `provideLanguageModelChatResponse` looks up which candidate was selected and forwards the call to the sibling verbatim. This mirrors the lesson from comparing `FeimaChatEndpoint` and `LocalChatEndpoint` in an earlier design pass: independently re-deriving endpoint/streaming logic in a second place is a real, demonstrated maintenance cost. Delegation avoids that cost entirely for the router, since it never needs its own endpoint code.

**Alternative considered**: give the router direct access to `LocalEndpointRegistry` and have it perform its own live fan-out to registry entries, mirroring what `LocalEndpointProvider` already does internally. Rejected — this would be exactly the kind of duplicated-implementation risk called out above, just one level up the stack, and would also mean building the router's own TTL cache when `LocalEndpointProvider` already has one it can just be asked to use.

### Strategies are presets over one scoring shape, not independent code paths
`local-first`, `balanced`, and `most-capable` differ only in how they weigh locality, capability confidence, and task fit — they share the same candidate-filtering (availability gating), the same disclosure contract, and the same session-stickiness machinery. Implementing them as three parameterizations of one scoring function, rather than three independent policy implementations, keeps the actual net-new logic small and avoids the "N similar-but-subtly-different code paths" trap.

### One setting, one picker entry — not N strategy-flavored picker entries
Given the picker-crowding concern already flagged in the original competitive research (§4 of the feasibility study) and reinforced by VS Code's own `filterModelsForSession`/pool-partitioning logic (confirmed by reading the source), strategies are a `feima.localModels.autoStrategy` enum setting — following the exact shape of the existing `feima.agents.codex.permissionMode` setting (enum + `enumDescriptions` + safe default + `markdownDescription`) — rather than three separate "Auto (Local-First)" / "Auto (Balanced)" / "Auto (Most Capable)" entries in the picker.

### Disclosure mirrors GitHub's contract shape, not just its UX pattern
Reading `chatAutoModeResolutionContentPart.ts` confirmed GitHub's real disclosure is a collapsible per-message content block ("Routed to X" collapsed, label + confidence% expanded), not a passive hover tooltip as earlier secondary-source research had suggested. Our disclosure targets the same shape: `{ resolvedModel, reason, confidence? }` rendered per response. The `fallback` state (GitHub's "Unable to resolve") is preserved as a first-class disclosed outcome, not a silent default pick.

### The Feima-hosted shortcut stays a convenience, not an integration
A user can already register their own Feima-hosted API access as a plain `openai-compat` registry entry through the existing manual-registration flow — nothing in `local-model-registry`/`local-model-provider` prevents it, since Feima's own API is OpenAI-compatible (confirmed by `feimaChatEndpoint.ts`'s request/response shape). The friction is only that Feima's real auth is OAuth-based, short-lived, and refreshed via `FeimaAuthenticationService` — not the static API key the registry entry shape assumes. The shortcut command solves the *typing/copying* friction (pre-fill base URL + format, mint a fresh token at registration time) but explicitly does not solve the *staleness* problem, because doing so would mean teaching `LocalChatEndpoint` (or the registry) about Feima-specific OAuth refresh — reintroducing exactly the Feima/local coupling the two-endpoint-class split was built to avoid two design passes ago.

**Alternative considered**: give `LocalEndpointEntry` an optional "token provider callback" instead of a static string, so a Feima-hosted entry could pull a live token from `authService` on every request. Rejected for this change — it's a real option, but it changes the registry's entry shape (currently a plain serializable recipe) into something that needs live extension-internal wiring for one specific entry type, which is more coupling than the convenience is worth right now. Left as a documented option if the snapshot-token limitation proves too rough in practice.

### Disclosure is a text prefix, not a rich widget — found during implementation

Reading VS Code's source (Context) showed GitHub's own Auto disclosure as a rich, collapsible `ChatAutoModeResolutionContentPart`. That component is core/chat-participant-only machinery (`vscode.ChatResponseStream`), not reachable from the public `vscode.LanguageModelChatProvider` interface a third-party extension implements — a `LanguageModelChatProvider` can only report `LanguageModelResponsePart`s (text, tool calls, data, thinking), with no custom collapsible-widget part type available. This wasn't apparent until implementing `disclosure.ts` against the actual API surface. The implementation instead reports a small markdown-formatted text prefix (`> 🧭 **Auto** routed to *X* — reason`) via `LanguageModelTextPart` before the delegated response streams in — matching the *content* shape (resolved model + reason, escalation/fallback called out explicitly), not the rich widget mechanics, which are structurally unavailable here. Documented in `disclosure.ts`'s header comment.

## Risks / Trade-offs

- **[Risk]** A Feima-hosted entry registered via the shortcut will start failing with 401s whenever the snapshotted token expires or rotates, and `LocalChatEndpoint`'s generic `unauthorized` error path has no refresh capability (by design). → **Mitigation**: disclosed explicitly at registration time (see spec `feima-hosted-endpoint-shortcut`); re-running the shortcut refreshes the token; the primary `feima` picker entry (with full OAuth refresh) remains the recommended way to use Feima-hosted models — the shortcut is positioned as "let it optionally join Auto's local/enterprise pool," not as a replacement path.
- **[Risk]** `most-capable` and `balanced` can look identical in practice on a machine with only one or two similar local endpoints registered — the strategy only differentiates when there's real capability spread in the pool. → **Mitigation**: none needed structurally; worth calling out in user-facing docs/settings descriptions so `most-capable` isn't mistaken for broken when it behaves like `balanced` on a sparse registry.
- **[Trade-off]** Session-stickiness means a strategy's "wrong" pick early in a conversation persists across turns rather than being re-evaluated each time. Accepted deliberately — the alternative (re-score every turn) risks the exact cache-boundary churn VS Code's own Auto is designed to avoid (confirmed via `shouldShowCacheBreakHint`/cache-boundary-aware routing in the source read).
- **[Trade-off]** No raw weight-tuning surface for power users in this change. If the three presets prove too coarse in practice, that's an intentionally deferred follow-up, not a gap being silently accepted forever.

## Open Questions

- Exact disclosure copy — how much detail (confidence percentage vs. a qualitative label only) is worth showing per response, and does that differ by strategy?
- Should the shortcut's minted token have an explicit expiry warning surfaced proactively (e.g., a status-bar hint) rather than only failing loudly on next use?
- Task-classification signals for `balanced`'s "task fit" scoring (prompt length, agent-mode vs. simple chat, tool/file context presence) still need to be pinned down concretely — carried over from the original Auto exploration, not resolved by this design pass.
