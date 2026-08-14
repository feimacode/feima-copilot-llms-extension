## Why

`local-model-provider` (shipped) unified local and enterprise model endpoints into one picker category, but selecting among them is still entirely manual — a user has to know which registered endpoint is healthiest, most capable, or best suited to the task at hand every time. That manual burden is exactly the gap a prior feasibility study (§12) identified as the one piece of white space nobody in this niche has filled — not VS Code's own native "Auto" (scoped only to GitHub's first-party hosted models, structurally unable to see local/BYOK models), not the strongest direct competitor (`vscode-unify-chat-provider`, manual selection only), not Olla (infrastructure-level load balancing, not model-aware). The local endpoint registry and provider built in the prior change is exactly the prerequisite "sensor layer" that study called for — this change is the payoff.

## What Changes

- Add a new `AutoModelProvider`, registered as its own picker entry (distinct from `feima` and `feima-local`), that routes each request to the best available local/enterprise endpoint rather than requiring manual per-message selection.
- The router is a **pure delegator**: it holds a reference to the existing `LocalEndpointProvider` instance and calls its already-public `provideLanguageModelChatInformation`/`provideLanguageModelChatResponse` methods — the same contract VS Code itself uses — rather than reimplementing any endpoint/auth/streaming logic of its own. No changes to `LocalEndpointProvider`, `LocalChatEndpoint`, or the registry are required.
- **Scope for this change is local/enterprise endpoints only.** Feima-hosted models and the Claude/Codex BYOK bridge are explicitly out of the router's candidate pool:
  - Claude/Codex are structurally excluded — `ClaudeModelProvider`/`CodexModelProvider`'s `provideLanguageModelChatResponse` intentionally throws (confirmed in source), so there is no valid delegation target for them under this router's mechanism at all, independent of any policy choice.
  - Feima-hosted is excluded from the router's *built-in* logic, but **nothing stops a user from registering their own Feima-hosted endpoint as a `local-model-registry` entry** — Feima's API is OpenAI-compatible, so it fits the existing registration path unmodified. This change adds a convenience shortcut command for exactly that (see below), rather than adding a second, Feima-specific code path into the router itself.
- Add three named routing strategies, exposed as a single enum setting (mirroring the existing `feima.agents.codex.permissionMode` pattern) rather than as separate picker entries, to avoid adding to the picker-crowding problem already flagged in prior research:
  - `local-first` — prefer same-machine endpoints (loopback host) over network endpoints (enterprise gateway, remote Olla); escalate to network only when no same-machine candidate qualifies, and disclose the escalation when it happens.
  - `balanced` (default) — weighs task fit, metadata confidence, and latency; the general-purpose heuristic.
  - `most-capable` — ranks purely by confirmed capability (context window, tool-calling, confidence tier), ignoring locality/latency; only meaningfully different from `balanced` when the registry has real capability spread across entries.
- Add per-response disclosure of the routing decision (which endpoint/model was actually used, and why), modeled on VS Code's own native Auto disclosure contract (`resolvedModel`, `predictedLabel`, `confidence`) confirmed by reading its source — a collapsible per-message UI element, not just a hover tooltip.
- Add session-stickiness: once a strategy picks a candidate for a conversation, later turns in the same conversation stay on it unless the candidate becomes unreachable or the task category shifts meaningfully — shared machinery across all three strategies, not reimplemented per strategy.
- Add a `feima.localModels.addFeimaHostedEndpoint` shortcut command that pre-fills the registration flow (base URL, `openai-compat` format) and mints a snapshot of the user's current Feima access token, so a user who wants their own Feima-hosted models to participate in `Auto`'s pool doesn't have to manually copy a base URL and token. This is explicitly a convenience, not a first-class integration — see design.md for the token-staleness limitation this carries and why it's not solved by deeper coupling.
- **Explicitly out of scope**: reaching into other extensions'/VS Code's native Custom Endpoint models via `vscode.lm.selectChatModels()`; any deeper Feima-hosted integration into the router itself (billing-aware routing, quota-based candidate filtering); folding Claude/Codex into the router by re-architecting their provider shape.

## Capabilities

### New Capabilities
- `auto-model-routing`: registers the `feima-auto` picker entry, delegates to the existing local-endpoint provider for its candidate pool, applies one of three named strategies (as a setting), discloses the routing decision per response, and maintains session-stickiness across a conversation.
- `feima-hosted-endpoint-shortcut`: a convenience command that registers the user's own Feima-hosted API access as a `local-model-registry` entry, using a snapshot access token, so it can optionally join `auto-model-routing`'s candidate pool through the existing (unmodified) registration path.

### Modified Capabilities
None — `local-model-registry`, `local-model-provider`, and `local-model-metadata` are consumed through their existing public interfaces, unchanged.

## Impact

- New source files under `src/extension/models/local/auto/` (or similar): the router provider, the strategy implementations, the disclosure content building, session-stickiness state.
- New registration in `extension.ts`, constructed after and depending on the existing `localProvider` instance — no changes to existing registration code beyond adding this new block.
- New setting (`feima.localModels.autoStrategy`, enum) and new command (`feima.localModels.addFeimaHostedEndpoint`) in `package.json` + l10n files, following the exact conventions established in the prior change.
- No changes to `FeimaLanguageModelProvider`, `LocalEndpointProvider`, `LocalChatEndpoint`, or `LocalEndpointRegistry` — this change is additive, consuming their existing public surface only.
- No new runtime dependencies.
