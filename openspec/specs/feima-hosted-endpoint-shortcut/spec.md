# feima-hosted-endpoint-shortcut

## Purpose

Provides a one-command shortcut that registers the user's own Feima-hosted API access as a standard `local-model-registry` entry, sparing the user from manually typing a base URL or copying an access token, while remaining fully generic downstream — the created entry receives no Feima-specific handling.

## Requirements

### Requirement: Shortcut Registration Command
The system SHALL provide a command that registers the user's own Feima-hosted API access as a `local-model-registry` entry, pre-filling the base endpoint and `openai-compat` API format, and using a snapshot of the user's current Feima access token as the entry's API key.

#### Scenario: User runs the shortcut command
- **WHEN** an authenticated user invokes the shortcut command
- **THEN** a new (or updated) registry entry SHALL be created pointing at Feima's API, without the user manually typing a base URL or copying a token

### Requirement: Token Snapshot Limitation Is Disclosed
Because the registered entry uses a static API key while Feima's actual access tokens are short-lived and refreshed via OAuth, the system SHALL inform the user, at the time the shortcut is used, that the registered token is a snapshot and may need to be refreshed later — rather than presenting it as an equivalent, continuously-valid integration.

#### Scenario: Shortcut confirmation includes the limitation
- **WHEN** the shortcut command completes registration
- **THEN** the confirmation message SHALL note that the token is a snapshot and point the user to the main Feima-hosted picker entry for continuous, always-fresh access

### Requirement: Re-Running the Shortcut Refreshes the Token
Invoking the shortcut command when a Feima-hosted entry is already registered SHALL update that entry's stored token to a fresh snapshot rather than creating a duplicate registry entry.

#### Scenario: User re-runs the shortcut after the token goes stale
- **WHEN** a user invokes the shortcut command and a Feima-hosted entry already exists in the registry
- **THEN** the existing entry's API key SHALL be replaced with a freshly minted token, and no second entry SHALL be created

### Requirement: No Feima-Specific Coupling in Generic Endpoint Machinery
The registry entry created by the shortcut SHALL behave identically to any other manually-registered `openai-compat` entry — the shortcut SHALL NOT introduce Feima-specific branching into `LocalChatEndpoint`, `LocalEndpointProvider`, or `LocalEndpointRegistry`.

#### Scenario: Feima-hosted entry is indistinguishable from other entries downstream
- **WHEN** the router or provider processes a Feima-hosted entry created by the shortcut
- **THEN** it SHALL be handled through the same generic code path as any other registry entry, with no special-cased logic
