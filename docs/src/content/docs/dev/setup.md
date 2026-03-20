---
title: Development Setup
description: Set up your development environment for contributing to Feima Copilot
---

# Development Setup

This guide helps you set up a development environment for contributing to Feima Copilot.

## Prerequisites

### Required Software

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Git**
- **VS Code** >= 1.85.0

### VS Code Extensions

Install these VS Code extensions for development:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [TypeScript](https://marketplace.visualstudio.com/items?itemName=vscode.vscode-typescript-next)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) (optional)

## Getting the Source Code

### Clone the Repository

```bash
# Clone the repository
git clone https://github.com/feimacode/feima-copilot-llms-extension.git
cd feima-copilot-llms-extension
```

### Verify Branch

```bash
# Check current branch (should be main)
git branch

# For feature development, create a new branch
git checkout -b feature/your-feature-name
```

## Install Dependencies

```bash
# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

## Project Structure

```
feima-copilot-llms-extension/
├── src/                      # Source code
│   ├── extension.ts          # Extension entry point
│   ├── auth/                 # Authentication services
│   ├── models/               # Language model providers
│   ├── services/             # API clients
│   └── commands/             # VS Code commands
├── docs/                     # Documentation (Astro Starlight)
├── build/                    # Build scripts
├── test/                     # Test files
├── dist/                     # Compiled output (not in git)
├── docs-dist/                # Documentation build (not in git)
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript config
├── .eslintrc.js              # ESLint config
└── .vscode/                  # VS Code settings
```

## Build the Extension

### Compile TypeScript

```bash
# Compile TypeScript
npm run compile

# Or use watch mode for development
npm run watch
```

The compiled output will be in the `dist/` directory.

### Verify Build

```bash
# Check that dist/ directory exists
ls -la dist/

# Should see:
# extension.js
# extension.js.map
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/auth/__tests__/oauthService.test.ts
```

## Running the Extension in Development

### Launch Extension Development Host

1. Open the project in VS Code
2. Press `F5` or go to Run → Start Debugging
3. A new VS Code window (Extension Development Host) will open

### Debugging

The extension can be debugged in the Extension Development Host:

1. Set breakpoints in your TypeScript code
2. Press `F5` to start debugging
3. Debug the extension in the new window

### View Logs

1. In the Extension Development Host, go to View → Output
2. Select "Feima" from the dropdown
3. View extension logs

## Code Style and Linting

### ESLint

```bash
# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

### Prettier

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

### Pre-commit Hooks

The project uses pre-commit hooks:

```bash
# Install husky (if not installed)
npm install --save-dev husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run test"
```

## Configuration

### Environment Variables

Create a `.env` file for local development (not committed):

```env
# Feima API configuration
FEIMA_API_ENDPOINT=https://api.feimacode.cn
FEIMA_IDP_ENDPOINT=https://idp.feimacode.cn

# OAuth configuration
OAUTH_CLIENT_ID=vscode-feima-client
OAUTH_REDIRECT_URI=vscode://feima.cn-model-for-copilot/oauth/callback

# Debug settings
DEBUG=feima:*
LOG_LEVEL=debug
```

### TypeScript Config

The `tsconfig.json` is configured with:

- **Strict mode** enabled
- **Target**: ES2022
- **Module**: CommonJS
- **Source maps** enabled

## Common Development Tasks

### Adding a New Command

1. Create command in `src/commands/`:

```typescript
// src/commands/myCommand.ts
import * as vscode from 'vscode';

export function registerMyCommand(context: vscode.ExtensionContext) {
  const command = vscode.commands.registerCommand('feima.myCommand', async () => {
    // Your command logic here
    vscode.window.showInformationMessage('Hello from my command!');
  });

  context.subscriptions.push(command);
}
```

2. Register command in `src/extension.ts`:

```typescript
import { registerMyCommand } from './commands/myCommand';

export function activate(context: vscode.ExtensionContext) {
  // ... other code
  registerMyCommand(context);
}
```

3. Add to `package.json`:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "feima.myCommand",
        "title": "My Command",
        "category": "Feima"
      }
    ]
  }
}
```

### Adding a New Language Model

1. Add model to `src/models/`:

```typescript
// src/models/newModel.ts
import { LanguageModel } from './types';

export const newModel: LanguageModel = {
  id: 'new-model-id',
  name: 'New Model',
  description: 'Description of the new model',
  provider: 'ProviderName',
  contextLength: 32000,
  maxOutputTokens: 4000,
  capabilities: {
    codeGeneration: true,
    codeReview: true,
    reasoning: true
  }
};
```

2. Register model in `src/models/languageModelProvider.ts`:

```typescript
import { newModel } from './newModel';

// Add to models list
private models: LanguageModel[] = [
  // ... existing models
  newModel
];
```

### Adding Tests

1. Create test file in `src/**/__tests__/`:

```typescript
// src/auth/__tests__/myFeature.test.ts
import { myFunction } from '../myFeature';

describe('myFunction', () => {
  it('should return expected value', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

2. Run tests:

```bash
npm test
```

## Documentation Development

The documentation is built with Astro Starlight:

### Install Documentation Dependencies

```bash
cd docs
npm install
```

### Run Documentation Dev Server

```bash
cd docs
npm run dev
```

Visit http://localhost:4321 to view the documentation.

### Build Documentation

```bash
cd docs
npm run build
```

The output will be in `docs-dist/`.

## Git Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/documentation-update` - Documentation updates
- `refactor/refactor-description` - Refactoring

### Commit Messages

Use conventional commits:

```
feat: add new feature
fix: resolve authentication bug
docs: update installation guide
test: add tests for auth service
refactor: simplify token refresh logic
```

### Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Commit your changes
6. Push to your fork
7. Create a pull request

## Troubleshooting

### Build Errors

**Problem**: TypeScript compilation fails

**Solution**:
```bash
# Clean build artifacts
npm run clean
rm -rf dist/

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run compile
```

### Extension Not Activating

**Problem**: Extension doesn't activate in Extension Development Host

**Solution**:
1. Check Output panel → "Extension Host" for errors
2. Verify `package.json` `activationEvents` are correct
3. Check `src/extension.ts` has proper `activate()` function

### Authentication Issues

**Problem**: Can't authenticate in development

**Solution**:
1. Verify `.env` file is configured
2. Check feima-idp is accessible
3. View Output panel → "Feima" for detailed logs

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Astro Starlight Docs](https://starlight.astro.build/)
- [Project Repository](https://github.com/feimacode/feima-copilot-llms-extension)

## Next Steps

- [Testing Guide](./testing.md) - How to write tests
- [Building Guide](./building.md) - Build and package the extension
- [API Reference](../reference/api.md) - Extension API

## Need Help?

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.cn)