# Changelog

All notable changes to the Feima Copilot LLM Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Agent Participants** - Drive the real Claude Code, Codex, and GitHub Copilot CLI agents from native VS Code chat via `@claude`, `@codex`, and `@copilot-cli`
  - Keeps VS Code's chat UX (streaming, inline tool-call and diff rendering) while running each CLI's own agent loop
  - **Native mode**: use your existing Claude/Codex subscription and login, exactly as in a terminal
  - **Proxy mode**: route the CLI's model calls through your Copilot or BYOK model instead, via a local Agent Proxy
  - Per-turn permission overrides (`/ask`, `/acceptEdits`, `/fullAuto`) plus persistent `feima.agents.*.permissionMode` settings
  - Configurable CLI binary paths and MCP servers via `feima.agents.*.binaryPath` / `feima.agents.*.mcpServers` settings
  - Agent Proxy exposes local OpenAI Responses and Anthropic Messages-compatible endpoints, also usable from an external terminal session (see Account dialog's "Agent Proxy" section)
  - See the new [Agent Participants](https://docs.feimacode.com/guides/agent-participants/) docs

## [0.1.20] - 2026-06-01

### Added
- **API Key Support** - Feima now provides API keys for use beyond VS Code extension
  - Native support for **Claude Code** via Anthropic-compatible API
  - Works with **Copilot CLI** and other terminal-based tools
  - Compatible with both **OpenAI** and **Anthropic** API formats
  - Same billing system - no separate subscription needed
  - API keys can be created from Profile Settings page
- Updated README documentation with API key usage instructions

## [0.1.0] - 2026-03-19

### Added
- Initial release of Feima Code Models extension
- Support for Qwen Turbo, Qwen Max, DeepSeek models
- Support for Claude, GPT-4o international models
- GitHub authentication
- Global endpoints for international users

---

## Release Notes Template

When adding a new version, use this template:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature description

### Fixed
- Bug fix description

### Changed
- Change description

### Deprecated
- Feature to be removed in future versions

### Removed
- Features removed in this version
```

### Version Naming Convention

- **Major (X.0.0)**: Breaking changes, major feature rewrites
- **Minor (0.Y.0)**: New features, backward compatible
- **Patch (0.0.Z)**: Bug fixes, minor improvements
- **Pre-release (0.0.0-alpha.1, 0.0.0-beta.1)**: Testing releases, not published to marketplace