---
title: Building
description: Build and package Feima Copilot for distribution
---

# Building Guide

This guide covers how to build and package Feima Copilot for distribution.

## Build Overview

Feima Copilot uses esbuild for fast compilation:

- **TypeScript** → **JavaScript**
- Source maps included
- Minified for production
- VSIX packaging for Marketplace

## Build Commands

### Development Build

```bash
# Compile with source maps
npm run compile
```

### Watch Mode

```bash
# Watch for changes and rebuild
npm run watch
```

### Production Build

```bash
# Clean and build for production
npm run build
```

### Clean Build Artifacts

```bash
# Remove dist/ and docs-dist/
npm run clean
```

## Build Configuration

The build configuration is in `.esbuild.ts`:

```typescript
import { build } from 'esbuild';

const options = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production'
};

build(options);
```

## Packaging

### Create VSIX Package

```bash
# Create .vsix file
npm run package
```

This creates `feima-copilot-llms-extension.vsix` in the project root.

### Package with Specific Version

```bash
# Update version in package.json first
npm version patch  # or minor, major

# Then package
npm run package
```

## Release Process

### 1. Update Version

```bash
# Update package.json version
npm version <patch|minor|major>

# Examples:
npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.0 → 0.2.0
npm version major  # 0.1.0 → 1.0.0
```

### 2. Update Changelog

Edit `CHANGELOG.md`:

```markdown
## [0.1.1] - 2024-02-23

### Added
- New feature description

### Fixed
- Bug fix description

### Changed
- Change description
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Check coverage
npm run test:coverage
```

### 4. Build and Package

```bash
# Clean build
npm run clean

# Production build
npm run build

# Create package
npm run package
```

### 5. Verify Package

```bash
# List contents of VSIX
unzip -l feima-copilot-llms-extension.vsix

# Or inspect with vsce
vsce ls feima-copilot-llms-extension.vsix
```

### 6. Publish to Marketplace

```bash
# Publish to VS Code Marketplace
vsce publish

# Or publish specific version
vsce publish 0.1.1
```

## Pre-publishing Checklist

Before publishing, verify:

- [ ] Version updated in `package.json`
- [ ] Changelog updated
- [ ] All tests pass
- [ ] No linting errors
- [ ] Build successful
- [ ] VSIX package verified
- [ ] README updated if needed
- [ ] Documentation updated if needed
- [ ] Release notes prepared

## Manual Installation for Testing

### Install from VSIX

```bash
# Install from command line
code --install-extension feima-copilot-llms-extension.vsix

# Or via VS Code:
# 1. Extensions → ... (menu)
# 2. Install from VSIX...
# 3. Select the .vsix file
```

### Uninstall

```bash
# Uninstall from command line
code --uninstall-extension feima-copilot-llms-extension

# Or via VS Code:
# 1. Extensions → Find Feima Copilot
# 2. Click gear icon → Uninstall
```

## Multi-Market Publishing

Feima Copilot is published as two extensions:

### China Market (Open VSX)

```bash
# Publish to Open VSX (for VSCodium users in China)
ovsx publish
```

### Global Market (VS Code Marketplace)

```bash
# Publish to VS Code Marketplace
vsce publish
```

## Automated Builds

The project uses GitHub Actions for automated builds:

### Build Workflow

```yaml
name: Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm run package
      - uses: actions/upload-artifact@v3
        with:
          name: extension-vsix
          path: '*.vsix'
```

### Release Workflow

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - run: npm run package
      - name: Publish to Marketplace
        run: vsce publish
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
```

## Secrets Required

For automated publishing, configure these secrets:

| Secret | Purpose |
|--------|---------|
| `VSCE_PAT` | VS Code Marketplace personal access token |
| `OVSX_PAT` | Open VSX personal access token |

## Troubleshooting

### Build Fails

**Problem**: esbuild fails to compile

**Solution**:
```bash
# Clean and retry
npm run clean
npm install
npm run build
```

### VSIX Validation Errors

**Problem**: VSIX fails validation

**Solution**:
```bash
# Check package.json
cat package.json

# Verify publisher
# Verify version
# Verify icon size (128x128 pixels)
```

### Publish Fails

**Problem**: `vsce publish` fails

**Solution**:
```bash
# Check if token is valid
vsce ls-publishers

# Try with verbose output
vsce publish --no-dry-run
```

### Icon Issues

**Problem**: Icon not displaying correctly

**Solution**:
- Verify icon is exactly 128x128 pixels
- Verify icon is in PNG format
- Verify icon path in `package.json` is correct

## Build Artifacts

### dist/

Contains compiled extension:

```
dist/
├── extension.js        # Compiled code
├── extension.js.map    # Source map
└── [other compiled files]
```

### docs-dist/

Contains built documentation:

```
docs-dist/
├── index.html
├── guides/
├── reference/
└── dev/
```

### .vsix

The VSIX package containing everything needed for installation.

## Performance Optimization

### Build Time Optimization

```bash
# Use cache
npm install --prefer-offline

# Parallel builds (if needed)
npm run build:parallel
```

### Bundle Size Optimization

- Externalize `vscode` module (already done)
- Use tree-shaking (esbuild default)
- Minify in production builds

## Continuous Integration

Builds run on:
- Every push to main
- Every pull request
- Every tag push (for releases)

View build status at:
- GitHub Actions tab in repository

## Resources

- [esbuild Documentation](https://esbuild.github.io/)
- [vsce Documentation](https://github.com/microsoft/vscode-vsce)
- [VS Code Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

## Next Steps

- [Development Setup](./setup.md) - Set up development environment
- [Testing Guide](./testing.md) - Write tests
- [Documentation](../) - Project documentation

## Need Help?

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.cn)