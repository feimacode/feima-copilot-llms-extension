## Why

Registering, viewing, and removing local/enterprise endpoints today is entirely command/QuickInput-driven and one-directional. There is no way to see what's currently registered, its health, or its discovered models without digging through extension storage or reading logs — and `LocalEndpointRegistry.removePersonalEntry` already exists but is never called from any command or UI at all, so a user who registers a bad or stale endpoint has no way to remove it. This gap was flagged but never closed in the original feasibility study's backlog (live status indicator, source badges, a one-click test-endpoint action) and matters more now that `Auto` (shipped) makes which entries are registered and healthy a directly consequential routing input, not just cosmetic information.

## What Changes

- Add a native `TreeView` — "Local & Enterprise Models" — nested under VS Code's built-in Explorer container (no new Activity Bar icon, consistent with this extension's minimal ambient-UI footprint today). Lists registered endpoints grouped by scope (personal / team-shared), each showing a live health indicator, discovered model count, and expandable per-model rows with capability confidence.
- Wire the already-existing `LocalEndpointRegistry.removePersonalEntry` to a context-menu "Remove" action on personal entries — the first UI path to it since it was written. Team-shared entries are not removable from the client (they come from the workspace config file, not per-user state) and the tree reflects that by omitting the action for them.
- Add a per-entry "Test Connection" action (context menu + inline icon) that re-probes just that one entry on demand, closing the gap where today only a global "refresh everything" command exists.
- Add a "+ Add Endpoint" action in the view's title bar that launches the existing `feima.localModels.addEndpoint` QuickInput flow unchanged (see Non-Goals) — this change stays scoped to the view/status half of "registration and view UI," not the registration UX itself.
- The tree refreshes automatically from `LocalEndpointRegistry.onDidChangeEntries` and from per-entry health-probe results, rather than requiring a manual "refresh the view" step.

**Non-Goals for this change:**
- No WebView-based registration form replacing the QuickInput flow. The current flow already works and was validated in the prior change; upgrading it is a separable, larger UX question worth its own exploration later.
- No editing an existing entry's fields in place (label, API key, paths) — only add (existing flow, unchanged) and remove (newly wired) in this first pass.
- No changes to `LocalEndpointProvider`, `AutoModelProvider`, or routing/strategy behavior — this is a purely additive UI surface consuming existing public registry/provider APIs (`entries`, `getHealth`, `getCandidateSource`, `removePersonalEntry`), plus one small new registry method for single-entry re-probing (see design.md once drafted).

## Capabilities

### New Capabilities
- `endpoint-management-view`: a TreeView showing registered local/enterprise endpoints with live health/status and discovered models, plus remove and test-connection actions per entry.

### Modified Capabilities
None — `local-model-registry`, `local-model-provider`, and `local-model-metadata` behavior is unchanged; this change only adds a new UI consumer of their existing public surface (and one small additive registry method, not a behavior change to existing ones).

## Impact

- New source: a `vscode.TreeDataProvider` implementation and tree-item types under `src/extension/models/local/view/` (or similar), consuming `LocalEndpointRegistry`/`LocalEndpointProvider` read-only.
- New `views`/`viewsContainers`-adjacent contribution in `package.json` (nesting under `explorer`), plus `menus` contributions for the context-menu actions (`view/item/context`) and title-bar actions (`view/title`).
- New command(s): a per-entry test-connection command (distinct from the existing blanket `feima.localModels.refresh`), and a remove command — both thin wrappers calling existing/near-existing registry methods.
- No changes to existing commands, the registration flow, or routing behavior.
- No new runtime dependencies — `vscode.window.createTreeView`/`registerTreeDataProvider` are core API, no WebView needed for this scope.
