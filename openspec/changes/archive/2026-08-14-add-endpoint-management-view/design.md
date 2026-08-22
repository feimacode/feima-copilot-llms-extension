## Context

`LocalEndpointRegistry` and `LocalEndpointProvider` (shipped) already expose everything this view needs to read: `entries`, `getHealth`, and (via the small accessor added for `add-auto-model-routing`) `getCandidateSource`. What's missing is a consumer that surfaces this to the user, and two small gaps in the write path: `removePersonalEntry` has existed since the first change but has never been wired to a command, and there is no way to re-probe a single entry — only the blanket `feima.localModels.refresh` command exists.

This codebase has exactly one existing interactive UI precedent (`accountDialog.ts`, a `WebView` with a message-passing action dispatch) and zero `TreeView`/`viewsContainers` contributions. The user chose a native `TreeView` nested under Explorer over extending the `WebView` pattern, prioritizing ambient visibility and VS Code-native list/context-menu idioms over the `WebView`'s richer per-item HTML.

## Goals / Non-Goals

**Goals:**
- Make the current registry state (what's registered, its health, its known models) visible without opening a command palette or reading logs.
- Give `removePersonalEntry` and single-entry re-probing their first real UI paths.
- Stay a read-mostly, additive consumer of existing public APIs — no behavior changes to routing, the provider's aggregation, or the registry's persistence.

**Non-Goals:**
- No WebView-based registration form in this change (see proposal.md Non-Goals) — the "+" action launches the existing QuickInput flow unchanged.
- No in-place editing of an existing entry's fields.
- No new Activity Bar icon or view container — nested under Explorer only.

## Decisions

### Tree shape: two synthetic group nodes, `contextValue`-driven menus
`getChildren(undefined)` returns two synthetic nodes ("Personal", "Team-Shared") rather than flattening scope into a label suffix — this satisfies the spec's "distinguishable groupings" requirement more robustly than a text label would (a group node can also be entirely omitted when empty, e.g. no "Team-Shared" node at all until a workspace actually has `.feima/endpoints.json`). Each entry node and the two group nodes carry a `contextValue` (`'personalEndpoint'` / `'teamEndpoint'` / `'personalGroup'` / `'teamGroup'`) so `package.json`'s `menus.view/item/context` `when` clauses can target "Remove" at personal entries only, per spec.

### Reading models: one small additive accessor, no new fetch trigger
The tree does not perform its own live fan-out. It reads whatever `LocalEndpointProvider` already knows via a new `getCachedModelsForEntry(entryId): vscode.LanguageModelChatInformation[]` accessor — returns from the existing cache, `[]` if the cache hasn't been populated yet, and never itself triggers a network fetch. This mirrors the `getCandidateSource` accessor added for Auto: small, additive, read-only, no behavior change to the class it's added to.

**Alternative considered**: call `provideLanguageModelChatInformation()` (the full aggregate) whenever a node expands. Rejected — that performs a live fan-out to *every* registered entry just to display *one* node's children, wasteful and potentially slow on a cold cache.

### Eager population on activation
Because the tree reads passively from the provider's cache (previous decision), it would show "no models known yet" until something else happens to trigger a real fetch (the user opening Copilot Chat's model picker, or manually hitting Test Connection). To avoid that being the default first-run experience, the tree view registration calls `localProvider.provideLanguageModelChatInformation()` once, in the background, when the view first becomes visible — the same call the picker itself would make, not a new fetch path.

### Test Connection is a lightweight liveness recheck, not a full metadata re-resolution
"Test Connection" calls the already-exported `probeKnownEndpoint` + `registry.markHealth` directly (both already public) rather than routing through `LocalEndpointProvider._fetchEntryModels`'s full per-model `resolveModelMetadata` pass (which includes a live Ollama `/api/show` call per model). A quick reachability check doesn't need full capability metadata — the picker's own next normal refresh will pick up richer details. This is a distinct, lighter-weight sibling operation built from already-shared primitives, not a duplicate of `_fetchEntryModels`.

### A new `onDidChangeHealth` event on the registry
`markHealth` currently doesn't fire any event — so a health change from the picker's own normal background fan-out (not just from this view's Test Connection button) would leave the tree's health indicators stale until the next full `onDidChangeEntries`-triggered refresh (entry add/remove only). `LocalEndpointRegistry` gains a small additive `onDidChangeHealth: vscode.Event<string>` (fired with the changed entry's id) so the tree can do a targeted single-node refresh on *any* health update, from any source — not just its own actions. Same "one small additive accessor" pattern as the two prior changes; `markHealth`'s existing callers and signature are unchanged.

## Risks / Trade-offs

- **[Risk]** `contextValue`-driven `when` clauses in `package.json` menus are inherently stringly-typed — a typo silently shows/hides the wrong action rather than failing to compile. → **Mitigation**: none beyond care and the same manual-validation step already deferred elsewhere in this project; standard risk for this VS Code idiom, not unique to this feature.
- **[Trade-off]** Eager population on activation means the tree can trigger a live network fan-out on every VS Code startup (once), even if the user never opens the view. → Accepted: `LocalEndpointProvider` already does this same fan-out on the picker's own first query in most sessions (Copilot Chat typically queries models eagerly too), so this isn't meaningfully new network activity, just possibly earlier.
- **[Trade-off]** Team-shared entries have no remove action from the client, by design (spec requirement) — but the tree gives no in-UI explanation of *why* a team entry can't be removed (only the absence of the action). Worth a tooltip in implementation, not spec'd as a hard requirement here.

## Open Questions

- Should "Copy URL" (shown in one of the explored UI mockups but not committed to the proposal's scope) be added to the context menu in this change or deferred? Leaning deferred — keep this change to what's specified.
- Icon choice for health states (reachable / unreachable / not-yet-checked) — a VS Code `ThemeIcon` decision, not architecturally significant; left to implementation.
