# Changelog

All notable changes to the Feima Copilot LLM Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.2]

### Added
- **Local & Enterprise Model Endpoints** — bring your own Ollama, LM Studio, vLLM, llama.cpp, SGLang, LiteLLM, or [Olla](https://github.com/thushan/olla) fleet, or an internal enterprise/private-cloud gateway, into the same Copilot Chat model picker as Feima-hosted models
  - Auto-discovery of well-known local ports on startup, manual registration (`Feima Local Models: Add Model Endpoint`) for endpoints discovery can't reach, and team-shared `.feima/endpoints.json` (URLs only, never secrets)
  - New **Local & Enterprise Models** view in the Explorer sidebar — live per-endpoint health indicators, model overrides, and an endpoint editor for correcting or adding model metadata
  - `Feima Local Models: Refresh Models` plus per-endpoint test-connection/remove/edit commands
- **Feima Auto** — a new picker entry that automatically routes each request to the best available registered local/enterprise endpoint (`local-first`, `balanced`, or `most-capable`, via the `feima.localModels.autoStrategy` setting), disclosing which endpoint was used and why on every response
  - Sticks with the same endpoint across a conversation instead of re-deciding every message
  - `Feima Local Models: Add My Feima-Hosted Models to Auto` — registers your Feima-hosted models (using a Feima API key) as local endpoints so Auto can route to them too
- Lenient repair for malformed tool-call JSON from local/enterprise models, plus a Responses API endpoint option for providers that support it
- **Qwen3.8 Flash** — Alibaba Cloud, ~1M context, ultra-fast (free tier)
- **HY4 Preview** — Tencent Hunyuan, 1M context, thinking support (free tier)

### Changed
- Renamed the local/enterprise router's picker entry from "Auto" to **"Feima Auto"**, to avoid confusion with VS Code's own built-in Auto (which only sees GitHub-hosted models)

## [0.2.5] - 2026-08-14

### Added
- **GLM 5.3** model — Zhipu AI's latest with 1M context and advanced reasoning

## [0.2.4] - 2026-08-09

### Fixed
- Multi-folder workspace discovery for Claude and Codex agent participants

## [0.2.3] - 2026-08-08

### Fixed
- Force OpenAI as the provider for native Codex models

## [0.2.2] - 2026-08-08

### Fixed
- Removed unsupported proposal API usage

## [0.2.1] - 2026-08-08

### Fixed
- Fixed thinking-part propose API error

## [0.2.0] - 2026-08-07

### Added
- **Agent Participants** - Drive the real Claude Code, Codex, and GitHub Copilot CLI agents from native VS Code chat via `@claude`, `@codex`, and `@copilot-cli`
  - Keeps VS Code's chat UX (streaming, inline tool-call and diff rendering) while running each CLI's own agent loop
  - **Native mode**: use your existing Claude/Codex subscription and login, exactly as in a terminal
  - **Proxy mode**: route the CLI's model calls through your Copilot or BYOK model instead, via a local Agent Proxy
  - Per-turn permission overrides (`/ask`, `/acceptEdits`, `/fullAuto`) plus persistent `feima.agents.*.permissionMode` settings
  - Configurable CLI binary paths and MCP servers via `feima.agents.*.binaryPath` / `feima.agents.*.mcpServers` settings
  - Agent Proxy exposes local OpenAI Responses and Anthropic Messages-compatible endpoints, also usable from an external terminal session (see Account dialog's "Agent Proxy" section)
  - See the new [Agent Participants](https://docs.feimacode.com/guides/agent-participants/) docs
- **Local LLM Proxy** - Power any OpenAI- or Anthropic-compatible tool (even outside VS Code) with your Copilot or BYOK models
- **Qwen3.8 Max** model — flagship deep-thinking reasoning with ~1M context (Pro tier)
- Session-level tool approval, runaway-loop protection, and filtering of Copilot internal tools for agent participants
- Configurable system prompts for agent participants
- `.github/skills` directory support for Copilot agent skills
- Enhanced WSL support for user `mcp.json` resolution and path detection

## [0.1.25] - 2026-08-02

### Added
- **Kimi K3** model — 1M context, vision, deep thinking (premium)
- **HY3** model — Tencent Hunyuan with 256K context and thinking support
- Clarified supported Anthropic models and corrected the displayed model list
- Help documentation for utility model settings
- `llms.txt` and documentation site SEO improvements

### Fixed
- Removed prefix in model IDs

## [0.1.24] - 2026-07-02

### Added
- **MiniMax M3** model support and documentation optimizations

## [0.1.23] - 2026-06-21

### Fixed
- Use global endpoints for both regions

## [0.1.22] - 2026-06-21

### Added
- **GLM 5.2** model — 1M context, advanced reasoning
- **Kimi K2.7 Code** model — 256K context, code-specialized, vision
- **Mimo V2.5** and **Mimo V2.5 Pro** models — 1M context, vision, reasoning
- **MiniMax M2.7** model — 200K context, fast responses, reasoning

### Changed
- Simplified buy credits button visibility and updated status bar for insufficient balance

### Fixed
- Double locale prefix in VS Code Copilot sidebar links

## [0.1.21] - 2026-06-15

### Added
- **DeepSeek V4 Pro** and **DeepSeek V4 Flash** models — 1M token context
- **GLM 5.1** model — 202K context, powerful reasoning
- **Qwen3.7 Plus** model
- WeChat group information for user support and community engagement

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