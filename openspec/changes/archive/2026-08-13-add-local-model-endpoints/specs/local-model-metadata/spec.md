## ADDED Requirements

### Requirement: Endpoint-Reported Metadata Preferred
When resolving a discovered model's capability metadata (context window, quantization, tool-calling support), the system SHALL prefer metadata reported directly by the originating endpoint over any inferred or looked-up value.

#### Scenario: Ollama model with native metadata
- **WHEN** a model is discovered from an Ollama endpoint that exposes context length and quantization via its native model-detail endpoint
- **THEN** the system SHALL use those reported values rather than a looked-up estimate

### Requirement: Fallback Reference Table
When an endpoint does not report sufficient capability metadata for a discovered model, the system SHALL attempt to resolve the missing values from a community-maintained reference table matched by model name pattern.

#### Scenario: Sparse vLLM endpoint
- **WHEN** a model is discovered from a vLLM endpoint that returns only a model ID with no context window information
- **THEN** the system SHALL look up the model ID against the reference table and use a matching entry's context window value if found

### Requirement: Confidence Disclosure
The system SHALL visibly distinguish, in the model's picker tooltip or detail text, between capability metadata confirmed by the endpoint and capability metadata estimated from a fallback source.

#### Scenario: Estimated context window shown to user
- **WHEN** a model's context window value came from the fallback reference table rather than the endpoint itself
- **THEN** the picker SHALL label that value as estimated rather than presenting it identically to a confirmed value

### Requirement: Unresolved Metadata Handling
The system SHALL still include a discovered model in the picker using conservative default values when no metadata can be resolved from either the endpoint or the fallback table, rather than excluding the model.

#### Scenario: Completely unknown model
- **WHEN** a discovered model matches no fallback table entry and the endpoint reports no capability data
- **THEN** the system SHALL include the model in the picker with a conservative default context window and SHALL mark its metadata as unconfirmed
