# local-model-provider

## Purpose

Exposes registered endpoints' models to VS Code's Copilot Chat model picker as a new provider category, aggregating live model lists from the registry and routing chat/completion requests to the correct backend.

## Requirements

### Requirement: New Model Provider Category
The system SHALL register a new VS Code language model provider, distinct from the existing Feima-hosted provider and the Claude/Codex providers, dedicated to models sourced from the local endpoint registry.

#### Scenario: Provider registered at activation
- **WHEN** the extension activates
- **THEN** a new language model provider SHALL be registered under its own provider ID, alongside the existing Feima provider registration

### Requirement: Live Model Aggregation
When VS Code requests the available language models, the system SHALL query the model-list endpoint of every registry entry in parallel and merge all successfully returned models into a single list for the picker.

#### Scenario: Multiple endpoints registered
- **WHEN** two registry entries are present — one Ollama-based returning several models and one vLLM-based returning a single model
- **THEN** the picker SHALL show all models from both endpoints together

#### Scenario: One endpoint is unreachable
- **WHEN** one registered endpoint fails to respond within a timeout
- **THEN** the system SHALL exclude that endpoint's models from the aggregated list without preventing models from other reachable endpoints from being shown

### Requirement: Request Routing to Source Endpoint
When a user sends a chat request to a model sourced from the local endpoint registry, the system SHALL route the request to that model's originating endpoint using the `api-format` and `completions-endpoint-path` recorded for that entry.

#### Scenario: Chat request dispatched correctly
- **WHEN** a user selects a model that was discovered from a specific registered endpoint
- **THEN** the chat request SHALL be sent to that endpoint's `base-endpoint` and `completions-endpoint-path`, formatted according to its recorded `api-format`

### Requirement: Aggregate Cache Consistency
The system SHALL apply the same cache duration to the aggregated model list as the registry uses for its discovery results, and SHALL re-fetch the aggregate when the registry's contents change.

#### Scenario: Registry entry added mid-session
- **WHEN** a new endpoint is registered while VS Code is running
- **THEN** the provider SHALL be notified and SHALL make the new endpoint's models available in the picker without requiring a VS Code restart
