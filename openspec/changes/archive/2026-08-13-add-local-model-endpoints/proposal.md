## Why

Feima's extension currently exposes Feima-hosted models and BYOK Claude/Codex subscriptions to Copilot Chat, but has no way to surface models a user runs locally (Ollama, LM Studio, vLLM, llama.cpp, SGLang) or has deployed on an enterprise/private network. A feasibility study (`feasibility-study-local-model-support.md`) found this specific niche already well-served by free tools — the official Ollama extension (131K installs), GitHub Copilot LLM Gateway (29K installs), and VS Code's own native "Custom Endpoint" BYOK provider all already let a model show up in the picker — so building bespoke per-runtime integrations would be low-differentiation, duplicative effort. What no competitor offers, including VS Code's native BYOK, is automatic discovery across multiple heterogeneous local/enterprise endpoints unified with Feima's own hosted+subscription models in one picker. This registry-and-provider layer is also the necessary prerequisite for a later smart-routing (`Auto`) feature, which needs live health/capability data per endpoint to route well — building it now, scoped as infrastructure rather than a headline feature, sets that up without overcommitting to it yet.

## What Changes

- Add a `LocalEndpointRegistry` service that stores connection recipes for local/enterprise model endpoints — `{ base-endpoint, api-format, api-key, model-endpoint-path, completions-endpoint-path }` — not model lists, which stay live and are fetched on demand.
- Add three discovery sources that populate the registry:
  - Automatic port-probing of well-known local defaults (Ollama `:11434`, LM Studio `:1234`, vLLM/SGLang/llama.cpp-server, a local Olla instance), which doubles as a liveness check since a successful model-list response confirms both.
  - Manual, user-driven registration for endpoints port-probing can't reach (enterprise/private-cloud-deployed vLLM, LiteLLM, Portkey, Kong, or a private Olla instance).
  - Optional team-shared workspace config (e.g. a committed `.feima/endpoints.json`, URLs only, no secrets) so opening a shared workspace can offer a team's already-deployed gateway.
- Add a `LocalEndpointProvider` implementing `vscode.LanguageModelChatProvider`, registered as a new model category alongside the existing `feima` provider ID, that fans out to every registry entry's model-list endpoint in parallel, merges the results into one picker list, and routes each chat/completion request back to the correct endpoint using its recorded `api-format`.
- Add a model-metadata resolution step: prefer metadata an endpoint reports itself (e.g. Ollama's `/api/show` — real `context_length`, `quantization_level`), fall back to a community-maintained reference table (e.g. LiteLLM's `model_prices_and_context_window.json`) for sparse endpoints (typically vLLM/llama.cpp single-model instances), and label estimated values as such in the UI instead of presenting a guess as fact.
- Add a manual refresh command mirroring the existing `DynamicToolManager` cache-clear idiom (`feima.agents.clearCodexToolCache`), so users can force re-discovery when local models change, on top of the same TTL-based cache `ModelCatalogService` already uses for Feima's own catalog.
- **Explicitly out of scope for this change**: the `Auto` smart-routing model (phase-2, depends on this registry existing first — see feasibility study §12/§13), opportunistically reaching into other extensions'/VS Code's native custom-endpoint models via `vscode.lm.selectChatModels()` (deferred stretch — see §13.3), and any enterprise governance/budget/audit features (explicitly rejected — this extension routes *into* existing gateways like Olla/LiteLLM/Portkey, it does not build a competing one — see §13.4).

## Capabilities

### New Capabilities
- `local-model-registry`: stores and manages connection recipes for local/enterprise model endpoints, populated via port-probe discovery, manual registration, or team config; owns persistence scope (machine-local vs. workspace-shared) and cache/refresh behavior.
- `local-model-provider`: exposes registered endpoints' models to VS Code's Copilot Chat model picker as a new provider category, aggregating live model lists from the registry and routing chat/completion requests to the correct backend.
- `local-model-metadata`: resolves model capability metadata (context window, tool-calling, vision support) for discovered models, preferring endpoint-reported data over inference, falling back to a community-maintained reference table, and surfacing confidence (confirmed vs. estimated) in the UI.

### Modified Capabilities
None — this is a new area of the extension; no existing specs change behavior.

## Impact

- New source files, likely under `src/extension/models/local/` (registry, discovery sources, provider, metadata resolver), following the existing `feimaLanguageModelProvider.ts` / `modelCatalog.ts` / `languageModelWrapper.ts` split.
- New registration call in `extension.ts` alongside the existing `vscode.lm.registerLanguageModelChatProvider('feima', modelProvider)` line.
- New user-facing command for manual refresh, and a manual-add flow/command for enterprise endpoints.
- New settings surface for manually-registered endpoints, and possibly a `.feima/endpoints.json` workspace-file convention.
- No changes to existing Feima-hosted model or Claude/Codex BYOK code paths — purely additive.
- No new runtime dependencies anticipated (uses the existing `node-fetch` + VS Code Language Model Provider API already used by `FeimaLanguageModelProvider`).
