# Changelog

All notable changes to the Feima Copilot LLM Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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