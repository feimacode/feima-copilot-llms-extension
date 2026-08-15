# local-tool-call-repair

## Purpose

Lenient, deterministic repair of malformed tool-call argument JSON emitted by local/enterprise model endpoints, applied at the single tool-call finalization point shared by both the OpenAI-compatible and Anthropic Messages streaming paths. Repaired calls are labeled with the existing `confirmed`/`estimated` confidence vocabulary, and calls that remain unparseable after repair are disclosed visibly rather than silently dropped. The Feima-hosted path's existing fail-hard behavior for malformed tool-call JSON is unaffected.

## Requirements

### Requirement: Repair Pass Before Treating a Tool Call as Failed
When a local/enterprise model's tool-call argument JSON fails to parse, the system SHALL attempt a deterministic repair pass before treating the call as unrecoverable.

#### Scenario: Malformed JSON is repaired before reporting
- **WHEN** a tool call's raw arguments string fails `JSON.parse` on the first attempt
- **THEN** the system SHALL attempt repair transformations on the string before deciding whether the call succeeded or failed

### Requirement: Markdown Code-Fence Stripping
The repair pass SHALL strip a leading/trailing markdown code fence (e.g. ` ```json ... ``` `) from tool-call arguments before attempting to parse.

#### Scenario: Fenced arguments are repaired
- **WHEN** a tool call's arguments string is wrapped in a markdown code fence around otherwise-valid JSON
- **THEN** the repair pass SHALL strip the fence and the resulting JSON SHALL parse successfully

### Requirement: Syntax Normalization
The repair pass SHALL normalize common non-standard JSON syntax patterns — trailing commas, single-quoted keys or string values, and unquoted object keys — into valid JSON before parsing.

#### Scenario: Trailing comma is repaired
- **WHEN** a tool call's arguments string contains a trailing comma before a closing brace or bracket
- **THEN** the repair pass SHALL remove it and the resulting JSON SHALL parse successfully

#### Scenario: Single-quoted keys are repaired
- **WHEN** a tool call's arguments string uses single quotes in place of double quotes for keys or string values
- **THEN** the repair pass SHALL convert them and the resulting JSON SHALL parse successfully

### Requirement: Truncated JSON Bracket Closing
When arguments JSON is truncated (missing closing braces, brackets, or a closing quote), the repair pass SHALL attempt to close the structure by appending the minimal necessary closing characters, and SHALL label the result as unconfirmed data even if parsing subsequently succeeds.

#### Scenario: Truncated object is closed
- **WHEN** a tool call's arguments string is missing one or more closing braces due to stream truncation
- **THEN** the repair pass SHALL append the missing closing characters and attempt to parse the result

### Requirement: Confidence Labeling for Repaired Calls
The system SHALL track whether a tool call's arguments parsed on the first attempt or required repair, using the same confidence vocabulary (`confirmed` / `estimated`) already used for model metadata, and SHALL make this distinction available for logging and downstream consumers rather than treating repaired and unmodified arguments identically.

#### Scenario: Clean parse is confirmed
- **WHEN** a tool call's arguments parse successfully without any repair transformation
- **THEN** the call SHALL be tracked as `confirmed`

#### Scenario: Repaired parse is estimated
- **WHEN** a tool call's arguments only parse successfully after a repair transformation
- **THEN** the call SHALL be tracked as `estimated`, not `confirmed`

### Requirement: Disclosed Failure When Repair Is Unsuccessful
When the repair pass cannot produce parseable JSON for a tool call, the system SHALL surface that failure visibly in the response stream (e.g. as response text naming the tool and stating the call could not be parsed) rather than silently omitting any trace of the attempted call. The system SHALL NOT report a `LanguageModelToolCallPart` for arguments that never became valid JSON.

#### Scenario: Unrepairable call is disclosed, not dropped
- **WHEN** a tool call's arguments still fail to parse after every repair transformation has been attempted
- **THEN** the response SHALL include a visible indication that the named tool call could not be parsed, and the call SHALL NOT be silently omitted with no trace

### Requirement: One Fix Point Covers Both Local Wire Protocols
The repair pass SHALL be applied at the tool-call finalization step shared by both the OpenAI-compatible and Anthropic Messages streaming paths, so a single implementation covers tool calls from either protocol.

#### Scenario: Repair applies regardless of wire protocol
- **WHEN** a malformed tool call arrives via either the OpenAI-compatible or the Anthropic Messages streaming path
- **THEN** the same repair pass SHALL apply to both, without protocol-specific duplication of the repair logic

### Requirement: Feima-Hosted Path Remains Unchanged
This capability SHALL NOT alter the Feima-hosted model path's existing fail-hard behavior for malformed tool-call JSON.

#### Scenario: Feima-hosted fail-hard is untouched
- **WHEN** a Feima-hosted model emits malformed tool-call JSON
- **THEN** the system SHALL continue to fail the request exactly as it did before this capability was added, with no repair attempt applied to that path
