## ADDED Requirements

### Requirement: New Auto Picker Entry
The system SHALL register a new language model provider, distinct from the existing `feima` and `feima-local` providers, that presents a single "Auto" entry in the Copilot Chat model picker.

#### Scenario: Auto appears in the picker
- **WHEN** the extension activates
- **THEN** a new provider SHALL be registered under its own provider ID, alongside the existing `feima` and `feima-local` registrations

### Requirement: Delegation-Only Candidate Sourcing and Fulfillment
The router SHALL obtain its candidate pool and fulfill chat requests exclusively by calling the existing `LocalEndpointProvider` instance's public `provideLanguageModelChatInformation` and `provideLanguageModelChatResponse` methods. The router SHALL NOT construct its own chat endpoints, perform its own HTTP requests to registered endpoints, or duplicate any streaming/tool-call handling logic.

#### Scenario: Router forwards a chat request unchanged
- **WHEN** the router selects a candidate model to fulfill a request
- **THEN** the router SHALL call `LocalEndpointProvider.provideLanguageModelChatResponse` with that model and the original messages, options, progress, and token, and SHALL NOT independently construct a request to the underlying endpoint

### Requirement: Structural Exclusion of Participant-Shaped Models
The router's candidate pool SHALL NOT include models sourced from the Claude or Codex BYOK bridge, since their provider's `provideLanguageModelChatResponse` intentionally throws and offers no valid delegation target.

#### Scenario: Claude/Codex models never appear as Auto candidates
- **WHEN** the router builds its candidate pool
- **THEN** models from the `feima-claude-code` (or equivalent Codex) provider SHALL NOT be included, regardless of routing strategy

### Requirement: Routing Strategy Selection
The system SHALL expose exactly one setting that selects among three named routing strategies (`local-first`, `balanced`, `most-capable`), defaulting to `balanced`, following the same enum-setting pattern as `feima.agents.codex.permissionMode`.

#### Scenario: Default strategy applies when unset
- **WHEN** a user has not configured a routing strategy
- **THEN** the router SHALL apply the `balanced` strategy

### Requirement: Local-First Strategy Behavior
Under the `local-first` strategy, the router SHALL prefer candidates whose endpoint base URL is a loopback host over candidates on a network host, and SHALL only select a network candidate when no qualifying loopback candidate exists.

#### Scenario: Same-machine candidate available
- **WHEN** at least one reachable same-machine candidate meets the task's hard requirements (required tool-calling, sufficient context window)
- **THEN** the router SHALL select among same-machine candidates only, never a network candidate

#### Scenario: Escalation to a network candidate is disclosed
- **WHEN** no same-machine candidate qualifies but a network candidate does
- **THEN** the router SHALL select the network candidate and the disclosure SHALL explicitly state that no local candidate qualified

### Requirement: Balanced Strategy Behavior
Under the `balanced` strategy, the router SHALL select the reachable, requirement-meeting candidate with the highest combined score of task fit and metadata confidence, using locality/latency only as a tie-breaker rather than a primary factor.

#### Scenario: Higher-confidence candidate preferred over lower-confidence candidate of similar fit
- **WHEN** two reachable candidates both meet the task's hard requirements and have similar task fit
- **THEN** the router SHALL prefer the candidate whose capability metadata confidence is `confirmed` over one whose confidence is `estimated` or `unconfirmed`

### Requirement: Most-Capable Strategy Behavior
Under the `most-capable` strategy, the router SHALL select the reachable, requirement-meeting candidate with the highest capability ranking (confidence tier, then context window), ignoring locality and latency entirely.

#### Scenario: Network candidate with higher capability preferred over same-machine candidate
- **WHEN** a network candidate has strictly higher confirmed capability than any same-machine candidate
- **THEN** the router SHALL select the network candidate under `most-capable`, unlike under `local-first`

### Requirement: Availability Gating Precedes Strategy Scoring
Regardless of strategy, the router SHALL exclude unreachable candidates from consideration before applying any strategy-specific scoring or ordering.

#### Scenario: Unreachable candidate never selected
- **WHEN** a candidate's registry entry health is marked unreachable
- **THEN** the router SHALL NOT select that candidate under any strategy, even if it would otherwise rank highest

### Requirement: Per-Response Routing Disclosure
The system SHALL disclose, for each response the router fulfills, which model/endpoint was actually used and the reasoning behind the choice, rendered as a per-message element rather than requiring the user to hover to discover it.

#### Scenario: Disclosure accompanies a routed response
- **WHEN** the router fulfills a chat request
- **THEN** the response SHALL be accompanied by a disclosure identifying the resolved model and a brief reason for the choice

### Requirement: Fallback State Is Disclosed, Not Silent
When no candidate in the pool qualifies for a request under the active strategy, the system SHALL disclose an explicit fallback/unresolved state rather than silently failing or silently picking an unqualified candidate.

#### Scenario: No qualifying candidate exists
- **WHEN** every candidate is either unreachable or fails to meet the task's hard requirements
- **THEN** the router SHALL report a fallback state to the user rather than selecting a disqualified candidate

### Requirement: Session Stickiness Across a Conversation
Once a strategy selects a candidate for a conversation, the router SHALL continue using that candidate for subsequent turns in the same conversation unless the candidate becomes unreachable or the task category changes meaningfully, rather than re-running strategy selection on every turn. This behavior SHALL be shared machinery used by all three strategies, not reimplemented per strategy.

#### Scenario: Same candidate reused across turns
- **WHEN** a conversation continues with a follow-up message of similar task category
- **THEN** the router SHALL reuse the candidate selected for the previous turn rather than re-scoring the full candidate pool

#### Scenario: Candidate becomes unreachable mid-conversation
- **WHEN** the previously-selected candidate's health becomes unreachable
- **THEN** the router SHALL re-run strategy selection for the next turn instead of continuing to use the unreachable candidate
