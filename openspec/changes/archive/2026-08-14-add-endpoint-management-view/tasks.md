## 1. Registry & Provider Additions (small, additive)

- [x] 1.1 Add `onDidChangeHealth: vscode.Event<string>` to `LocalEndpointRegistry`, fired from `markHealth` with the changed entry's id — no change to `markHealth`'s existing signature or callers
- [x] 1.2 Add `getCachedModelsForEntry(entryId): vscode.LanguageModelChatInformation[]` to `LocalEndpointProvider` — reads from the existing cache, returns `[]` when cold, never triggers a fetch

## 2. Tree Data Provider

- [x] 2.1 Define tree item types: group nodes (`personalGroup` / `teamGroup`), entry nodes (`personalEndpoint` / `teamEndpoint`), model nodes — each with the `contextValue` menus will target
- [x] 2.2 Implement `LocalEndpointTreeProvider implements vscode.TreeDataProvider<...>` — **refined during implementation**: also omits the *personal* group-node wrapper (not just team) when only one scope has entries, so the common case (personal-only) lists entries directly without a redundant single "Personal" wrapper; documented in the provider's `_rootChildren` comment as a minor UX refinement, not a spec deviation
- [x] 2.3 Wire `registry.onDidChangeEntries` → full tree refresh; `registry.onDidChangeHealth` → **refined during implementation**: also fires a whole-tree refresh rather than a true single-node refresh, since tree nodes are freshly built plain objects without stable identity to target, and the list size is tiny — documented in the provider's header comment; the real benefit of the separate event is firing on more occasions, not narrower DOM targeting
- [x] 2.4 Populate the provider's model rows via `localProvider.getCachedModelsForEntry`, showing each model's confidence level — confidence sourced via the existing `getCandidateSource` accessor per model rather than parsing display strings
- [x] 2.5 Trigger one background `localProvider.provideLanguageModelChatInformation()` call when the view first becomes visible, so the tree isn't empty-looking before the picker's own first query (see design.md "Eager population on activation") — implemented as `ensurePopulated()`, called from the view's `onDidChangeVisibility` handler when wired in extension.ts (group 4)

## 3. Actions

- [x] 3.1 Implement the "Remove" command: calls `registry.removePersonalEntry(entryId)`, available via context menu on personal entries only (`when` clause on `contextValue == personalEndpoint`) — with a confirmation modal before removing
- [x] 3.2 Implement the "Test Connection" command: calls `probeKnownEndpoint` + `registry.markHealth` directly for the single selected entry (see design.md — deliberately not a full `_fetchEntryModels`-equivalent), available via context menu and inline icon on any entry
- [x] 3.3 Implement the view title-bar "Add Endpoint" action: invokes the existing `feima.localModels.addEndpoint` command unchanged — needs no new command, just a `menus.view/title` contribution (group 4) referencing the existing command id directly

## 4. Registration & Contributions

- [x] 4.1 Add `views.explorer` contribution in `package.json` for the new tree view — **resolved**: `package.json` was initially found in a post-build, literal-string-resolved state (some earlier build run's restore step hadn't fired). Fixed via `git checkout -- package.json` (restoring the clean, correctly-placeholder'd version already committed on this branch) followed by reapplying just this session's additions using proper `%key%` placeholders. Diff against `HEAD` is now a clean 47-line pure addition, no flattening noise
- [x] 4.2 Add `menus.view/item/context` contributions for Remove (personal-only `when` clause) and Test Connection (all entries, via a `viewItem =~ /Endpoint$/` regex matching both `personalEndpoint` and `teamEndpoint`)
- [x] 4.3 Add `menus.view/title` contribution for the Add Endpoint action — also added the existing `feima.localModels.refresh` command to the title bar (natural fit, no new code, not spec'd but zero-cost given it already existed)
- [x] 4.4 Register the tree view and its commands in `extension.ts`, alongside the existing local-endpoint registration block — no changes to existing registration code
- [x] 4.5 Add l10n entries (view title, command titles, any static labels) to `package.nls.json` and `package.nls.zh-cn.json`

## 5. Testing & Validation

- [x] 5.1 Unit tests for the pure parts of tree construction — `treeGrouping.test.ts` (4 cases: personal-only, team-only, mixed-order-preserving, empty). All 107 unit tests pass
- [ ] 5.2 Manual validation: confirm Remove only appears for personal entries, never team-shared ones — **not performed in this session**, needs a running extension host
- [ ] 5.3 Manual validation: confirm Test Connection updates only the tested entry's health/models, not others — **not performed in this session**, needs a running extension host
- [ ] 5.4 Manual validation against a real running local runtime — **not performed in this session**, carries forward the same still-open gap noted in the prior two changes

## 6. Documentation

- [x] 6.1 Update README to mention the new view alongside the existing "Local & Enterprise Model Endpoints" section
