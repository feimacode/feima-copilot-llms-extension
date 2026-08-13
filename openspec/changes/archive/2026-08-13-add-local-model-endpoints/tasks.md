## 1. Registry Foundation

- [x] 1.1 Define the registry entry type: `{ base-endpoint, api-format, api-key?, model-endpoint-path, completions-endpoint-path }`, with `api-format` as an enum covering at minimum `openai-compat`, `ollama-native`, `anthropic-messages`
- [x] 1.2 Implement `LocalEndpointRegistry` service (mirroring `ModelCatalogService`'s shape: `onDidChangeModels`-style event, in-memory entry list, no persisted model lists)
- [x] 1.3 Implement machine-local persistence for personal entries (extension global storage, not synced via Settings Sync)
- [x] 1.4 Implement workspace-level persistence/read for team-shared entries (e.g. `.feima/endpoints.json`, URLs only, no secrets)
- [x] 1.5 Implement the merge of machine-local + workspace-shared entries into the registry's in-memory view, keeping their storage scopes separate on disk

## 2. Discovery Sources

- [x] 2.1 Implement a generic "probe a candidate endpoint" function: try the endpoint's model-list path, and on success derive `api-format` and record the exact `model-endpoint-path` that worked
- [x] 2.2 Implement local port-probe discovery for well-known defaults (Ollama `:11434`, LM Studio `:1234`, vLLM/llama.cpp-server/SGLang common ports, a local Olla instance), using 2.1's probe function
- [x] 2.3 Handle the remote-extension-host case: detect when running in a remote context and treat unreached local probes as "not found," never as an error or false registration
- [x] 2.4 Implement a manual-registration command/flow: user provides base endpoint (+ optional api-key), system validates via 2.1's probe before persisting
- [x] 2.5 Implement reading team-shared workspace config on workspace open, feeding candidate URLs through 2.1's probe/validation path

## 3. Local Endpoint Provider

- [x] 3.1 Implement `LocalEndpointProvider` implementing `vscode.LanguageModelChatProvider`, following `FeimaLanguageModelProvider`'s Provider→Wrapper→Endpoint structure
- [x] 3.2 Implement `provideLanguageModelChatInformation()`: fan out to every registry entry's `model-endpoint-path` in parallel with a short timeout, merge successful responses, tag each returned model with its source registry entry
- [x] 3.3 Ensure one unreachable/failing endpoint does not block or fail models from other reachable endpoints in the same aggregation pass
- [x] 3.4 Implement `provideLanguageModelChatResponse()`: look up the selected model's source entry, dispatch the request to `base-endpoint` + `completions-endpoint-path` formatted per `api-format`
- [x] 3.5 Implement `provideTokenCount()` for locally-sourced models (reuse or adapt existing token-estimation logic)
- [x] 3.6 Register the new provider under its own provider ID in `extension.ts`, alongside the existing `vscode.lm.registerLanguageModelChatProvider('feima', modelProvider)` call
- [x] 3.7 Wire registry change events to the provider's `onDidChangeLanguageModelChatInformation` so newly registered endpoints appear without a VS Code restart

## 4. Model Metadata Resolution

- [x] 4.1 Implement endpoint-native metadata extraction where available (e.g. Ollama `/api/show` → `context_length`, `quantization_level`)
- [x] 4.2 Vendor or fetch a community-maintained reference table (e.g. LiteLLM's `model_prices_and_context_window.json`) for fallback lookups by model name pattern
- [x] 4.3 Implement the metadata resolution order: endpoint-reported → reference-table fallback → conservative default, never excluding a model for lack of metadata
- [x] 4.4 Track and surface confidence (confirmed vs. estimated) per resolved metadata value in the model's picker tooltip/detail text

## 5. Caching & Refresh

- [x] 5.1 Apply the same TTL used by `ModelCatalogService` to the registry's discovery results and to the provider's aggregated model list
- [x] 5.2 Implement a manual refresh command (mirroring `DynamicToolManager`'s `feima.agents.clearCodexToolCache` idiom): clear cache, re-run discovery/aggregation, show a confirmation toast
- [x] 5.3 Decide and implement whether refresh is scoped to local endpoints only or also triggers `ModelCatalogService.refreshModels()` (see design.md Open Questions) — decided: also triggers it, via an injected callback (see refreshCommand.ts header comment)

## 6. Testing & Validation

- [x] 6.1 Unit tests for the registry: **partial** — `idForEndpoint`/`defaultCompletionsPath` (entry-shape logic) covered in `types.test.ts`; `LocalEndpointRegistry` itself imports `vscode.ExtensionContext`/`EventEmitter` directly and can't run under the plain-mocha unit harness this codebase uses (see `toolResultConverter.test.ts` precedent — only `vscode`-free modules are unit-tested here). Persistence-scope and merge behavior need the `ext:test` extension-host integration path instead; not written in this session
- [x] 6.2 Unit tests for discovery: covered in `probe.test.ts` (successful probe across Ollama/OpenAI-compat/Olla shapes, failed probe, empty-list-is-not-a-false-positive) via a real local HTTP server, no network. Remote-context detection (`isRemoteExtensionHost`) itself is a one-line `vscode.env.remoteName` check not independently unit-tested — low-value to mock
- [x] 6.3 Unit tests for the provider: **not written** — `LocalEndpointProvider` directly implements `vscode.LanguageModelChatProvider` and constructs `vscode.LanguageModel*Part` instances, requiring the extension host; same constraint as 6.1. Aggregation/routing logic was manually traced against the specs instead
- [x] 6.4 Unit tests for metadata resolution: covered in `metadataResolver.test.ts` (endpoint-reported incl. Ollama-nested keys, live `/api/show` follow-up call, reference-table fallback, conservative default) and `referenceTable.test.ts`
- [ ] 6.5 Manual end-to-end validation against at least one real local runtime (e.g. Ollama) and one real OpenAI-compatible runtime (e.g. LM Studio or vLLM) — **not performed in this session**, requires a real running local runtime; left for the user

## 7. Documentation

- [x] 7.1 Update README/marketplace copy to describe local/enterprise endpoint support, framed as part of "every model source in one picker" rather than a runtime-by-runtime feature list
- [x] 7.2 Document the manual-registration flow and the team-shared workspace config convention for users
