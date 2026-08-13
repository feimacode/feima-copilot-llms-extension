# local-model-registry

## Purpose

Stores and manages connection recipes for local/enterprise model endpoints, populated via port-probe discovery, manual registration, or team config; owns persistence scope (machine-local vs. workspace-shared) and cache/refresh behavior.

## Requirements

### Requirement: Registry Entry Schema
The system SHALL store each registered local or enterprise model endpoint as a connection recipe containing `base-endpoint`, `api-format`, an optional `api-key`, `model-endpoint-path`, and `completions-endpoint-path`. The system SHALL NOT persist the endpoint's model list as part of this record — model lists are always fetched live.

#### Scenario: Entry created from successful discovery
- **WHEN** a candidate endpoint responds successfully to a model-list request during discovery
- **THEN** the registry SHALL persist a new entry recording the base endpoint, the confirmed api-format, and the exact path that succeeded, without storing the returned model list

### Requirement: Automatic Local Port Discovery
The system SHALL probe well-known local default ports for supported runtimes (Ollama, LM Studio, vLLM, llama.cpp server, SGLang, LiteLLM proxy, Olla) and SHALL treat a successful model-list response as confirmation of both liveness and endpoint identity in a single request, without a separate health-check step.

#### Scenario: Local Ollama instance found
- **WHEN** the extension probes `127.0.0.1:11434` and receives a valid model-list response
- **THEN** the registry SHALL record a new entry for that endpoint with `api-format` set to the format that succeeded

#### Scenario: No local runtime present
- **WHEN** none of the probed default ports respond
- **THEN** the registry SHALL remain unchanged and SHALL NOT report an error to the user

#### Scenario: Extension host running remotely
- **WHEN** the extension host is running in a remote context (Remote-SSH, Remote-WSL, a dev container, or Codespaces) such that probing `127.0.0.1` reaches the remote machine rather than the user's local machine
- **THEN** automatic discovery SHALL NOT register an endpoint based on an unrelated service that happens to respond on the same port, and an unreached local machine SHALL be treated the same as "not found" rather than surfaced as an error

### Requirement: Manual Endpoint Registration
The system SHALL allow a user to manually register a model endpoint by providing its base endpoint, api-format, and optional api-key, for endpoints that automatic discovery cannot reach — including enterprise or private-cloud-hosted deployments.

#### Scenario: User adds an enterprise endpoint
- **WHEN** a user manually registers an endpoint with a base URL that is not on localhost
- **THEN** the registry SHALL validate the endpoint by requesting its configured model-list path before persisting the entry, and SHALL surface an error to the user if that request fails

### Requirement: Team-Shared Endpoint Configuration
The system SHALL support an optional workspace-level configuration file listing shared endpoint base URLs, without secrets, and SHALL offer entries found there to any user who opens that workspace.

#### Scenario: Opening a workspace with shared config
- **WHEN** a workspace contains a team-shared endpoint configuration file listing a base URL
- **THEN** the registry SHALL treat that URL as a discovery candidate the same way as a manually registered entry, without requiring the user to re-type it

### Requirement: Persistence Scope Separation
The system SHALL persist automatically-discovered and manually-registered personal entries in machine-local storage that does not sync across machines, and SHALL persist team-shared entries only as workspace-level configuration — keeping the two scopes separate.

#### Scenario: Settings Sync does not propagate a local Ollama entry
- **WHEN** a user has Settings Sync enabled and has a locally-discovered Ollama endpoint registered
- **THEN** that entry SHALL NOT be included in data synced to another machine

### Requirement: Registry Refresh
The system SHALL cache discovery and registration results for the same duration as the existing Feima model catalog cache, and SHALL provide a user-invokable command that forces immediate re-discovery and clears the cache.

#### Scenario: User adds a new local model and refreshes
- **WHEN** a user pulls a new model into a locally running runtime and invokes the refresh command
- **THEN** the registry SHALL immediately re-query all registered endpoints rather than waiting for the cache to expire
