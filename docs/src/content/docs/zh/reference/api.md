---
title: API Reference
description: Complete API reference for Feima Copilot
---

Complete API reference for Feima Copilot extension.

## Extension Commands

### `feima.signIn`

Sign in to your Feima account using OAuth2.

**Signature**:
```typescript
function signIn(): Promise<void>
```

**Usage**:
```typescript
import * as vscode from 'vscode';

const signInCommand = vscode.commands.registerCommand('feima.signIn', async () => {
  // Signs the user in via OAuth2
});
```

**Throws**:
- `Error` - If authentication fails

---

### `feima.showAccount`

Display current account information.

**Signature**:
```typescript
function showAccount(): Promise<void>
```

**Usage**:
```typescript
const showAccountCommand = vscode.commands.registerCommand('feima.showAccount', async () => {
  // Shows email and account ID
});
```

**Throws**:
- `Error` - If not signed in

---

### `feima.signOut`

Sign out from Feima account.

**Signature**:
```typescript
function signOut(): Promise<void>
```

**Usage**:
```typescript
const signOutCommand = vscode.commands.registerCommand('feima.signOut', async () => {
  // Clears all stored tokens
});
```

---

## Language Model Provider

### LanguageModelProvider

Main provider for Feima language models.

**Interface**:
```typescript
interface LanguageModelProvider {
  readonly models: LanguageModel[];
  getModel(id: string): LanguageModel | undefined;
  refreshModels(): Promise<void>;
}
```

---

### LanguageModel

Represents a single AI model.

**Interface**:
```typescript
interface LanguageModel {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly provider: string;
  readonly contextLength: number;
  readonly maxOutputTokens: number;
  readonly capabilities: ModelCapabilities;
}
```

**Properties**:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique model identifier |
| `name` | `string` | Display name |
| `description` | `string` | Model description |
| `provider` | `string` | Provider name |
| `contextLength` | `number` | Maximum context tokens |
| `maxOutputTokens` | `number` | Maximum output tokens |
| `capabilities` | `ModelCapabilities` | Supported capabilities |

---

### ModelCapabilities

Capabilities of a language model.

**Interface**:
```typescript
interface ModelCapabilities {
  readonly codeGeneration: boolean;
  readonly codeReview: boolean;
  readonly reasoning: boolean;
  readonly supportsImages?: boolean;
  readonly supportsTools?: boolean;
}
```

---

## Authentication Service

### OAuth2Service

Handles OAuth2 authentication with Feima IDP.

**Interface**:
```typescript
interface OAuth2Service {
  signIn(): Promise<Session>;
  signOut(): Promise<void>;
  getCurrentSession(): Session | null;
  refreshAccessToken(): Promise<void>;
}
```

---

### Session

Represents an authenticated session.

**Interface**:
```typescript
interface Session {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: Date;
  readonly user: UserInfo;
}
```

---

### UserInfo

User information from Feima IDP.

**Interface**:
```typescript
interface UserInfo {
  readonly email: string;
  readonly sub: string;
  readonly provider: 'wechat' | 'weibo';
}
```

---

## Configuration

### ConfigurationOptions

Extension configuration options.

**Interface**:
```typescript
interface ConfigurationOptions {
  readonly defaultModel: string;
  readonly showStatusBar: boolean;
  readonly autoRefreshToken: boolean;
  readonly enableDebugLogging: boolean;
  readonly requestTimeout: number;
  readonly maxRetries: number;
}
```

---

### getConfiguration()

Get current extension configuration.

**Signature**:
```typescript
function getConfiguration(): ConfigurationOptions
```

**Usage**:
```typescript
const config = getConfiguration();
console.log(config.defaultModel);
```

---

## Events

### SessionChangedEvent

Fired when the user session changes.

**Type**:
```typescript
type SessionChangedEvent = Session | null;
```

**Usage**:
```typescript
authService.onSessionChanged((session) => {
  if (session) {
    console.log('User signed in:', session.user.email);
  } else {
    console.log('User signed out');
  }
});
```

---

### ModelsUpdatedEvent

Fired when available models are updated.

**Type**:
```typescript
type ModelsUpdatedEvent = LanguageModel[];
```

**Usage**:
```typescript
provider.onModelsUpdated((models) => {
  console.log('Available models:', models.length);
});
```

---

## API Client

### FeimaApiClient

HTTP client for Feima API.

**Interface**:
```typescript
interface FeimaApiClient {
  completions(request: CompletionRequest): Promise<CompletionResponse>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  models(): Promise<LanguageModel[]>;
}
```

---

### CompletionRequest

Request for text completion.

**Interface**:
```typescript
interface CompletionRequest {
  readonly model: string;
  readonly prompt: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly stop?: string[];
}
```

---

### CompletionResponse

Response from completion API.

**Interface**:
```typescript
interface CompletionResponse {
  readonly id: string;
  readonly model: string;
  readonly choices: CompletionChoice[];
  readonly usage: Usage;
}
```

---

### ChatRequest

Request for chat completion.

**Interface**:
```typescript
interface ChatRequest {
  readonly model: string;
  readonly messages: ChatMessage[];
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly stream?: boolean;
}
```

---

### ChatMessage

Single message in a chat conversation.

**Interface**:
```typescript
interface ChatMessage {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
}
```

---

### Usage

Token usage information.

**Interface**:
```typescript
interface Usage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}
```

---

## Error Types

### AuthenticationError

Thrown when authentication fails.

```typescript
class AuthenticationError extends Error {
  readonly code: string;
  constructor(message: string, code: string);
}
```

---

### ApiError

Thrown when API request fails.

```typescript
class ApiError extends Error {
  readonly statusCode: number;
  readonly requestId: string;
  constructor(message: string, statusCode: number, requestId: string);
}
```

---

### RateLimitError

Thrown when rate limit is exceeded.

```typescript
class RateLimitError extends Error {
  readonly retryAfter: number;
  constructor(message: string, retryAfter: number);
}
```

---

## Extension API

### activate()

Main extension activation function.

**Signature**:
```typescript
export function activate(context: vscode.ExtensionContext): void
```

**Parameters**:
- `context` - VS Code extension context

---

### deactivate()

Extension deactivation function.

**Signature**:
```typescript
export function deactivate(): void | Promise<void>
```

---

## Examples

### Sign In Example

```typescript
import * as vscode from 'vscode';
import { OAuth2Service } from './auth/oauthService';

const authService = new OAuth2Service(context);

async function signInExample() {
  try {
    const session = await authService.signIn();
    vscode.window.showInformationMessage(
      `Signed in as ${session.user.email}`
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Sign in failed: ${error.message}`
    );
  }
}
```

---

### Get Model Example

```typescript
import { LanguageModelProvider } from './models/languageModelProvider';

const provider = new LanguageModelProvider(context);

function getModelExample() {
  const model = provider.getModel('deepseek-coder-v2');
  if (model) {
    console.log(`Model: ${model.name}`);
    console.log(`Provider: ${model.provider}`);
    console.log(`Context: ${model.contextLength} tokens`);
  }
}
```

---

### Chat API Example

```typescript
import { FeimaApiClient } from './services/feimaApiClient';

const api = new FeimaApiClient(authService);

async function chatExample() {
  const response = await api.chat({
    model: 'deepseek-coder-v2',
    messages: [
      {
        role: 'user',
        content: 'Write a hello world function in TypeScript'
      }
    ],
    maxTokens: 500
  });

  console.log(response.choices[0].message.content);
}
```

---

## Types

### LogLevel

Log level enum.

```typescript
enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error'
}
```

---

### ModelProvider

Model provider enum.

```typescript
enum ModelProvider {
  DeepSeek = 'deepseek',
  Alibaba = 'alibaba',
  Tencent = 'tencent',
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Google = 'google'
}
```

---

## Constants

### Model IDs

```typescript
export const MODEL_IDS = {
  DEEPSEEK_CODER_V2: 'deepseek-coder-v2',
  TONGYI_QIANWEN_3_CODER: 'tongyi-qianwen-3-coder',
  TENCENT_HUNYUAN: 'tencent-hunyuan',
  GPT_4O: 'gpt-4o',
  CLAUDE_3_5_SONNET: 'claude-3.5-sonnet',
  GEMINI_1_5_PRO: 'gemini-1.5-pro'
} as const;
```

---

### Configuration Keys

```typescript
export const CONFIG_KEYS = {
  DEFAULT_MODEL: 'feima.defaultModel',
  SHOW_STATUS_BAR: 'feima.showStatusBar',
  AUTO_REFRESH_TOKEN: 'feima.autoRefreshToken',
  ENABLE_DEBUG_LOGGING: 'feima.enableDebugLogging',
  REQUEST_TIMEOUT: 'feima.requestTimeout',
  MAX_RETRIES: 'feima.maxRetries'
} as const;
```

---

## Next Steps

- [Development Setup](../dev/setup.md) - Set up development environment
- [Testing Guide](../dev/testing.md) - Test your changes
- [Building Guide](../dev/building.md) - Build and package

## Need Help?

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.cn)