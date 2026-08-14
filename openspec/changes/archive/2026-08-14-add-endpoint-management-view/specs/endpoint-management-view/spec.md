## ADDED Requirements

### Requirement: Tree View Registered Under Explorer
The system SHALL register a `TreeView` titled "Local & Enterprise Models" nested under VS Code's built-in Explorer container, without contributing a new Activity Bar icon or view container.

#### Scenario: View appears in Explorer
- **WHEN** the extension activates
- **THEN** a collapsible "Local & Enterprise Models" section SHALL appear in the Explorer sidebar, without adding any new Activity Bar entry

### Requirement: Live Entry Listing Grouped by Scope
The tree SHALL list every entry from `LocalEndpointRegistry.entries`, grouped by scope (personal vs. team-shared), and SHALL reflect additions/removals without requiring a manual view refresh.

#### Scenario: Registry change updates the tree automatically
- **WHEN** `LocalEndpointRegistry.onDidChangeEntries` fires (an entry is added, removed, or workspace config reloads)
- **THEN** the tree SHALL update to reflect the current entry list without the user invoking any refresh action

#### Scenario: Personal and team-shared entries are visually grouped
- **WHEN** both personal and team-shared entries are registered
- **THEN** the tree SHALL present them under distinguishable groupings, not interleaved without indication of scope

### Requirement: Per-Entry Health Indicator
Each endpoint node SHALL display a visual indicator reflecting its current health as known to `LocalEndpointRegistry.getHealth` (reachable, unreachable, or not-yet-checked), distinct at a glance.

#### Scenario: Unreachable endpoint is visually distinct
- **WHEN** an entry's health is marked unreachable
- **THEN** its tree node SHALL display a visibly different indicator than a reachable entry's node

### Requirement: Expandable Model Rows
Expanding an endpoint node SHALL show its currently known discovered models as child rows, each indicating capability-metadata confidence (confirmed / estimated / unconfirmed) consistent with how confidence is already surfaced in the model picker.

#### Scenario: Expanding a healthy endpoint shows its models
- **WHEN** a user expands a reachable endpoint's tree node
- **THEN** child rows SHALL list its discovered models with their confidence level shown

### Requirement: Remove Action for Personal Entries Only
The tree SHALL offer a "Remove" context-menu action on personal entries that calls `LocalEndpointRegistry.removePersonalEntry`, and SHALL NOT offer a remove action on team-shared entries, since those originate from workspace config rather than per-user state.

#### Scenario: Removing a personal entry
- **WHEN** a user invokes "Remove" on a personal entry
- **THEN** `removePersonalEntry` SHALL be called for that entry's id and the tree SHALL update to reflect its removal

#### Scenario: Team-shared entries have no remove action
- **WHEN** a user opens the context menu on a team-shared entry
- **THEN** no "Remove" action SHALL be offered

### Requirement: Per-Entry Test Connection Action
The tree SHALL offer a "Test Connection" action (context menu and inline icon) on each entry that re-probes only that entry, updating its health and model list without re-probing every other registered entry.

#### Scenario: Testing one entry does not affect others
- **WHEN** a user invokes "Test Connection" on one entry while other entries are registered
- **THEN** only the invoked entry SHALL be re-probed, and other entries' last-known health/model state SHALL remain unchanged until their own probe runs

### Requirement: Add Endpoint Title Action
The view's title bar SHALL offer an "Add Endpoint" action that invokes the existing `feima.localModels.addEndpoint` command unchanged.

#### Scenario: Title bar add action
- **WHEN** a user invokes the title bar's add action
- **THEN** the existing manual-registration QuickInput flow SHALL launch exactly as it does today, with no new UI introduced by this capability
