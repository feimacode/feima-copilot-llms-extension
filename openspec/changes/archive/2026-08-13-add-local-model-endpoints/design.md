## Context

The extension already has one working pattern for exposing models to VS Code's Copilot Chat picker: `FeimaLanguageModelProvider` (implements `vscode.LanguageModelChatProvider`) delegates model listing to `ModelCatalogService`, which fetches and caches an authoritative list from `feima-api`. Claude and Codex follow a related but different pattern — `ClaudeModelProvider`/`CodexModelProvider` list real models for picker display, but `provideLanguageModelChatResponse` intentionally throws; actual inference is handled by a separate chat participant (`@claude`/`@codex`), because a CLI-subprocess-driven agentic session doesn't fit the stateless provider-response shape.

Local and enterprise-deployed model endpoints (Ollama, LM Studio, vLLM, llama.cpp, SGLang, LiteLLM, Olla, or an org's own gateway) have no equivalent to `feima-api` — there is no single authoritative server that knows the full set of endpoints a user might have. The extension itself has to become that authority. Research (see `feasibility-study-local-model-support.md`, and confirmed directly during design) established that every one of these runtimes already exposes an HTTP model-listing endpoint (`/v1/models` for OpenAI-compatible servers, `/api/tags` for Ollama-native, `/api/v0/models` for LM Studio-native), which is the foundation this design builds on: discovery does not need to guess what's running, it can ask.

## Goals / Non-Goals

**Goals:**
- Let a user's locally-running or enterprise-deployed model endpoints appear in the same Copilot Chat model picker as Feima-hosted and BYOK-subscription models, with minimal manual configuration for the common local case.
- Support endpoints discovered automatically (local port-probe), added manually (enterprise/private-cloud, unreachable by probing), and shared across a team (workspace config).
- Resolve reasonable capability metadata (context window, tool-calling) even for endpoints that report little or nothing themselves.
- Build this as infrastructure a later smart-routing (`Auto`) feature can consume, without building `Auto` itself in this change.

**Non-Goals:**
- No `Auto`/smart-routing model in this change — that is phase-2, dependent on this registry existing first (feasibility study §12).
- No reaching into other extensions' or VS Code's native Custom Endpoint models via `vscode.lm.selectChatModels()` — deferred stretch (§13.3), since those carry weaker metadata than endpoints this registry manages directly.
- No enterprise governance features (budgets, audit trails, admin allow-lists). An org's already-deployed gateway (Olla, LiteLLM, Portkey, Kong) is just one more registry entry; this extension is a client of such gateways, not a competitor to them (§13.4).
- No bespoke per-runtime protocol handling beyond what's needed to call a model-list and a chat-completions endpoint — runtimes are treated generically by `api-format`, not by name.

## Decisions

### Registry stores connection recipes, not model lists
Each entry is `{ base-endpoint, api-format, api-key?, model-endpoint-path, completions-endpoint-path }`. Model lists are always fetched live from the recipe at picker-refresh time, never persisted as part of the entry. This avoids staleness (a model pulled or removed locally is reflected on next refresh, not stuck in a stored snapshot) and keeps the registry small and simple to persist.

**Alternative considered**: caching the resolved model list per entry alongside the recipe. Rejected because local state changes faster than a config value — persisting it would require its own invalidation logic duplicating the aggregate-level cache the provider already needs.

### Two path fields, asymmetric defaulting
`model-endpoint-path` has no safe cross-format default — LM Studio alone exposes two different listing paths (`/v1/models` OpenAI-shaped, `/api/v0/models` native-richer) with different response shapes, so the path that actually worked during discovery must be persisted verbatim. `completions-endpoint-path` has a usable default derived from `api-format` in most cases (even Ollama, despite having a native `/api/chat`, also serves OpenAI-shaped `/v1/chat/completions`), so it is stored with a default but remains overridable for genuinely non-standard deployments (e.g. an Anthropic-Messages-shaped enterprise gateway).

### Discovery = liveness check, not a separate step
A successful response from `model-endpoint-path` confirms both "this endpoint exists" and "here is what it has" in one request. No separate health-check/ping step is performed before or after. This directly follows from every target runtime's model-list endpoint doubling as its liveness signal.

### Discovery has three sources feeding one registry
1. **Port-probe**: well-known local defaults (Ollama `:11434`, LM Studio `:1234`, vLLM/llama.cpp-server/SGLang, a local Olla instance), localhost-only by design (both Ollama and LM Studio default-bind `127.0.0.1` for security — confirmed, not assumed).
2. **Manual registration**: user-driven, for endpoints port-probe structurally cannot reach (enterprise/private network, private cloud).
3. **Team-shared workspace config**: an optional committed file (URLs only, no secrets) offered as discovery candidates when a shared workspace is opened.

All three write into the same entry schema; the registry does not distinguish an entry's origin once persisted, only its persistence scope (see below).

**Alternative considered**: a single unified "add endpoint" flow covering all three sources uniformly. Rejected as a default because personal auto-discovered entries and team-shared entries have genuinely different lifecycles and audiences — collapsing them into one flow would force a scope decision (personal vs. shared) into every add, including the fully-automatic port-probe path where no such decision should be needed.

### Persistence scope tracks entry origin, not a single store
Auto-discovered and manually-registered personal entries live in machine-local extension storage (not synced via Settings Sync — a `127.0.0.1` entry is meaningless on a different machine). Team-shared entries live only in workspace-level config. The in-memory registry merges both scopes at read time; on-disk, they never mix.

### Provider mirrors the existing Feima pattern, one level removed
A new `LocalEndpointProvider` (`vscode.LanguageModelChatProvider`) is registered under its own provider ID, the same way `FeimaLanguageModelProvider` is registered as `'feima'` in `extension.ts`. Where `FeimaLanguageModelProvider.provideLanguageModelChatInformation()` calls `ModelCatalogService.getChatModels()` (one authoritative source), `LocalEndpointProvider` fans out to every registry entry's `model-endpoint-path` in parallel, tolerates individual failures (an unreachable endpoint simply contributes zero models, it does not fail the whole picker), and merges the results, tagging each returned model with its source entry so `provideLanguageModelChatResponse` can route back correctly.

### Metadata resolution is layered, not per-runtime
1. Prefer metadata the endpoint itself reports (Ollama's `/api/show` returns real `context_length`/`quantization_level` from the GGUF header — no inference needed there at all).
2. Fall back to a community-maintained reference table (e.g. LiteLLM's `model_prices_and_context_window.json`) matched by model name pattern, for sparse endpoints — typically vLLM/llama.cpp single-model instances that return only a bare model ID.
3. If neither resolves, include the model anyway with conservative defaults, marked unconfirmed, rather than excluding it.
Confidence (confirmed vs. estimated) is surfaced in the picker tooltip/detail text rather than silently presented as fact.

**Alternative considered**: per-runtime metadata handling (e.g. special-case vLLM, special-case llama.cpp). Rejected — since discovery already treats all sparse OpenAI-compatible endpoints uniformly (§ "1:1, no metadata endpoint → use the default one"), the metadata layer only needs to know "rich" vs. "sparse," not which specific runtime it's talking to.

### Refresh follows the `DynamicToolManager` idiom, not `ModelCatalogService`'s
`ModelCatalogService.refreshModels()` exists but has no user-facing command today — it only runs proactively at activation. The closer precedent is `DynamicToolManager`'s `feima.agents.clearCodexToolCache` command: a `registerCommand` that clears cache and shows a confirmation toast. The new refresh command follows that shape. Cache TTL matches `ModelCatalogService`'s existing duration.

## Risks / Trade-offs

- **[Risk]** Port-probing from a remote extension host (Remote-SSH/WSL/devcontainer/Codespaces) cannot reach the user's actual local machine, since `127.0.0.1` resolves to wherever the extension host runs, and both Ollama and LM Studio default-bind to localhost-only for security. → **Mitigation**: treat an unreached probe identically to "not installed" (no false error), and do not silently register anything based on an unrelated service answering on the same port; document the limitation rather than trying to work around it in this change.
- **[Risk]** Fanning out to N registered endpoints on every picker refresh could be slow or noisy if a registered endpoint is flaky. → **Mitigation**: short per-endpoint timeout, parallel requests, cache the aggregate for the same TTL as `ModelCatalogService`, and provide the manual refresh command for when a user needs to bypass the cache deliberately.
- **[Risk]** The fallback metadata table (e.g. LiteLLM's JSON) is an external dependency that changes over time; vendoring a stale copy could give confidently-wrong estimates. → **Mitigation**: always label fallback-sourced values as estimated in the UI (per the Confidence Disclosure requirement), so a stale or wrong guess reads as a hedge, not an error.
- **[Trade-off]** Storing `completions-endpoint-path` per entry (rather than always deriving it from `api-format`) adds a field that is redundant in the common case. Accepted because the one confirmed exception (LM Studio's dual listing paths, and the possibility of non-standard enterprise gateway mounts) makes a hardcoded derivation risky, and the default keeps the common case free.

## Open Questions

- Should the manual-refresh command refresh only the local registry, or become a single "refresh all my models" command that also refreshes `ModelCatalogService`'s Feima catalog? No existing precedent forces either choice.
- Should manual endpoint registration mirror VS Code's own native "Custom Endpoint" flow (base URL, API key, protocol-type picker) for familiarity, or use a distinct Feima-specific flow? Both are defensible; not yet decided.
- Should the manual-add flow offer "also save to the team-shared workspace config" as an option within the same interaction, or keep interactive personal registration and workspace-file-based team sharing as two entirely separate paths?
