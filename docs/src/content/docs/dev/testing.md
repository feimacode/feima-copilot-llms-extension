---
title: Testing
description: How to write and run tests for Feima Copilot
---

# Testing Guide

This guide covers how to write and run tests for Feima Copilot.

## Testing Framework

Feima Copilot uses:

- **Jest** - Test framework
- **@vscode/test-electron** - VS Code testing utilities
- **ts-jest** - TypeScript support

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Watch Mode

```bash
npm run test:watch
```

### Run Specific Test File

```bash
npm test -- src/auth/__tests__/oauthService.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="OAuth"
```

## Test Structure

Tests are located in `src/**/__tests__/` directories:

```
src/
├── auth/
│   ├── oauthService.ts
│   └── __tests__/
│       ├── oauthService.test.ts
│       └── sessionManager.test.ts
├── models/
│   ├── languageModelProvider.ts
│   └── __tests__/
│       └── languageModelProvider.test.ts
└── services/
    ├── feimaApiClient.ts
    └── __tests__/
        └── feimaApiClient.test.ts
```

## Writing Tests

### Basic Unit Test

```typescript
// src/auth/__tests__/sessionManager.test.ts
import { SessionManager } from '../sessionManager';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  describe('getSession', () => {
    it('should return null when no session exists', () => {
      expect(sessionManager.getSession()).toBeNull();
    });

    it('should return the current session when exists', () => {
      const mockSession = {
        accessToken: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(),
        user: { email: 'test@example.com', sub: '123', provider: 'wechat' }
      };

      sessionManager.setSession(mockSession);
      expect(sessionManager.getSession()).toEqual(mockSession);
    });
  });
});
```

### Testing Async Code

```typescript
describe('OAuth2Service', () => {
  it('should sign in successfully', async () => {
    const service = new OAuth2Service(mockContext);
    const session = await service.signIn();

    expect(session).toBeDefined();
    expect(session.accessToken).toBeDefined();
    expect(session.user.email).toBeDefined();
  });

  it('should throw error on authentication failure', async () => {
    const service = new OAuth2Service(mockContext);
    // Mock API to return error
    mockApi.rejects(new Error('Authentication failed'));

    await expect(service.signIn()).rejects.toThrow('Authentication failed');
  });
});
```

### Mocking Dependencies

```typescript
import { FeimaApiClient } from '../../services/feimaApiClient';

jest.mock('../../services/feimaApiClient');

describe('LanguageModelProvider', () => {
  let mockApiClient: jest.Mocked<FeimaApiClient>;
  let provider: LanguageModelProvider;

  beforeEach(() => {
    mockApiClient = {
      models: jest.fn(),
      completions: jest.fn(),
      chat: jest.fn()
    } as any;

    provider = new LanguageModelProvider(mockContext, mockApiClient);
  });

  it('should fetch models from API', async () => {
    const mockModels = [
      { id: 'deepseek-coder-v2', name: 'DeepSeek Coder V2' }
    ];
    mockApiClient.models.mockResolvedValue(mockModels);

    await provider.refreshModels();
    expect(mockApiClient.models).toHaveBeenCalled();
  });
});
```

### Testing VS Code Extensions

```typescript
import * as vscode from 'vscode';
import { activate } from '../extension';

describe('Extension', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    mockContext = {
      subscriptions: [],
      secrets: {} as any
    } as any;
  });

  it('should register commands', () => {
    activate(mockContext);

    expect(mockContext.subscriptions.length).toBeGreaterThan(0);
  });

  it('should register commands with correct IDs', () => {
    const registerCommandSpy = jest.spyOn(vscode.commands, 'registerCommand');
    activate(mockContext);

    expect(registerCommandSpy).toHaveBeenCalledWith('feima.signIn', expect.any(Function));
    expect(registerCommandSpy).toHaveBeenCalledWith('feima.signOut', expect.any(Function));
  });
});
```

## Integration Tests

### Testing OAuth Flow

```typescript
describe('OAuth Integration Tests', () => {
  it('should complete full OAuth flow', async () => {
    const service = new OAuth2Service(context);

    // Start sign in
    const authUrl = await service.getAuthorizationUrl();
    expect(authUrl).toContain('idp.feimacode.cn');

    // Simulate callback
    const code = 'mock-authorization-code';
    const session = await service.handleCallback(code);

    expect(session).toBeDefined();
    expect(session.accessToken).toBeTruthy();
  });
});
```

### Testing API Communication

```typescript
describe('API Integration Tests', () => {
  it('should make successful API request', async () => {
    const api = new FeimaApiClient(authService);

    const response = await api.chat({
      model: 'deepseek-coder-v2',
      messages: [{ role: 'user', content: 'Hello' }]
    });

    expect(response.choices).toBeDefined();
    expect(response.choices[0].message).toBeDefined();
  });
});
```

## Testing Authentication

### Testing Token Refresh

```typescript
describe('Token Refresh', () => {
  it('should refresh token when expired', async () => {
    const expiredSession = {
      accessToken: 'expired-token',
      refreshToken: 'valid-refresh-token',
      expiresAt: new Date(Date.now() - 1000), // Expired
      user: { email: 'test@example.com', sub: '123', provider: 'wechat' }
    };

    const service = new OAuth2Service(context);
    service.setSession(expiredSession);

    await service.refreshAccessToken();

    const newSession = service.getSession();
    expect(newSession?.accessToken).not.toBe('expired-token');
  });
});
```

### Testing Session Persistence

```typescript
describe('Session Persistence', () => {
  it('should persist session to secrets', async () => {
    const mockSecrets = {
      get: jest.fn(),
      store: jest.fn()
    };

    const service = new OAuth2Service(context);

    const session = await service.signIn();
    expect(mockSecrets.store).toHaveBeenCalledWith(
      'session',
      expect.any(String)
    );
  });
});
```

## Testing Models

### Testing Model Selection

```typescript
describe('Model Selection', () => {
  it('should return correct model by ID', () => {
    const provider = new LanguageModelProvider(context);

    const model = provider.getModel('deepseek-coder-v2');
    expect(model?.id).toBe('deepseek-coder-v2');
    expect(model?.name).toBe('DeepSeek Coder V2');
  });

  it('should return undefined for unknown model', () => {
    const provider = new LanguageModelProvider(context);

    const model = provider.getModel('unknown-model');
    expect(model).toBeUndefined();
  });
});
```

## Test Configuration

### Jest Config

The Jest configuration is in `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
```

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// Good - tests behavior
it('should sign in user', async () => {
  const session = await service.signIn();
  expect(session).toBeDefined();
  expect(session.user.email).toBeTruthy();
});

// Bad - tests implementation
it('should call API with correct endpoint', async () => {
  await service.signIn();
  expect(mockApi.calledWith).toBe('https://idp.feimacode.cn');
});
```

### 2. Use Descriptive Test Names

```typescript
// Good
it('should throw error when authentication fails due to invalid credentials');

// Bad
it('should handle error');
```

### 3. Isolate Tests

```typescript
describe('Feature', () => {
  beforeEach(() => {
    // Reset state before each test
    mockApi.resetMock();
  });

  afterEach(() => {
    // Clean up after each test
    jest.clearAllMocks();
  });
});
```

### 4. Use Test Doubles

```typescript
// Mock external dependencies
const mockApiClient = {
  chat: jest.fn()
} as jest.Mocked<FeimaApiClient>;

// Stub specific methods
const stubService = {
  signIn: jest.fn().mockResolvedValue(mockSession)
};
```

## Continuous Integration

Tests run automatically on:
- Pull requests
- Push to main branch
- Nightly builds

### GitHub Actions

```yaml
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Debugging Tests

### Running Tests in VS Code

1. Install the Jest Runner extension
2. Click the play button next to tests
3. Set breakpoints in test files

### Debugging with VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Current File",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["${fileBasenameNoExtension}", "--config", "jest.config.js"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Common Issues

### Timeout Errors

```typescript
// Increase timeout for slow tests
it('should complete slow operation', async () => {
  // test code
}, 30000); // 30 second timeout
```

### Async Test Issues

```typescript
// Make sure to use async/await
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeTruthy();
});
```

### Mock Issues

```typescript
// Clear mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});

// Or reset all mocks
afterEach(() => {
  jest.resetAllMocks();
});
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/)
- [VS Code Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)

## Next Steps

- [Development Setup](./setup.md) - Set up development environment
- [Building Guide](./building.md) - Build and package
- [API Reference](../reference/api.md) - Extension API

## Need Help?

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.cn)