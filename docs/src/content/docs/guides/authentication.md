---
title: Authentication
description: Set up OAuth2 authentication for Feima Copilot
---

# Authentication Guide

Feima Copilot uses OAuth2 authentication to secure your account and manage API access.

## How OAuth2 Authentication Works

Feima Copilot uses the **OAuth2 + PKCE** (Proof Key for Code Exchange) flow, which is a secure authentication method designed for client-side applications.

### Authentication Flow

```
┌─────────────┐     1. Request Auth          ┌──────────────┐
│   VS Code   │ ──────────────────────────► │   feima-idp  │
│  Extension  │                              │   (Auth)     │
└─────────────┘                              └──────────────┘
      │                                             │
      │ 2. Browser opens login page                 │
      │ ◄───────────────────────────────────────── │
      │                                             │
      │ 3. User logs in (WeChat/Weibo)             │
      │ ──────────────────────────────────────────►│
      │                                             │
      │ 4. Redirect to VS Code with code           │
      │ ◄───────────────────────────────────────── │
      │                                             │
      │ 5. Exchange code for token                 │
      │ ──────────────────────────────────────────►│
      │                                             │
      │ 6. Receive access token                    │
      │ ◄───────────────────────────────────────── │
      └─────────────┘
```

## Signing In

### First Time Setup

1. **Open Command Palette**
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Feima: 登录" (Sign In)

2. **Authorize in Browser**
   - A browser window will open at `https://idp.feimacode.cn/oauth/authorize`
   - Choose your login method: WeChat or Weibo
   - Scan the QR code or enter your credentials

3. **Grant Permissions**
   - Review the requested permissions
   - Click "Authorize" to grant access

4. **Complete Sign In**
   - You'll be redirected back to VS Code
   - Success message: "✅ 已登录为: [your-email]"

### Token Storage

Your tokens are securely stored in VS Code's encrypted secrets storage:
- **Access Token**: Used for API requests (expires in 1 hour)
- **Refresh Token**: Used to get new access tokens (expires in 30 days)
- Tokens are automatically refreshed when needed
- No need to sign in repeatedly

## Viewing Your Account

### Check Account Status

1. Press `Ctrl+Shift+P`
2. Type "Feima: 查看账号" (Show Account)
3. View your account information:
   - Email address
   - Account ID (WeChat_[openid] or Weibo_[uid])

### Check Output Logs

1. Go to View → Output
2. Select "Feima" from the dropdown
3. View detailed authentication logs

## Signing Out

### Manual Sign Out

1. Press `Ctrl+Shift+P`
2. Type "Feima: 登出" (Sign Out)
3. Confirm the action
4. Success message: "✅ 已登出 Feima 账号"

**Note**: Sign out removes all stored tokens. You'll need to sign in again to use Feima Copilot.

## OAuth Client Details

Feima Copilot uses a public OAuth client with no secret:

| Property | Value |
|----------|-------|
| **client_id** | `vscode-feima-client` |
| **client_secret** | None (public client) |
| **redirect_uri** | `vscode://feima.cn-model-for-copilot/oauth/callback` |
| **grant_types** | `authorization_code`, `refresh_token` |
| **scopes** | `openid`, `profile`, `email` |
| **auth method** | PKCE (Proof Key for Code Exchange) |

### Shared Client

The `vscode-feima-client` is shared between:
- **feima-code**: Feima's main VS Code extension
- **feima-copilot**: This extension

Both extensions can use the same OAuth tokens, providing a seamless experience.

## Security Features

### PKCE Protection

- Uses code challenge and verifier for secure code exchange
- Prevents authorization code interception attacks
- Standard for public clients

### Secure Token Storage

- Tokens stored in VS Code's encrypted secrets
- Never written to disk in plaintext
- Isolated from other extensions

### Scope Limitations

- Minimum required scopes only
- No access to user password
- Tokens can be revoked at any time

## Troubleshooting

### Browser doesn't open

**Possible causes**:
- VS Code doesn't have permission to open browser
- No default browser configured

**Solutions**:
1. Check VS Code permissions in your OS settings
2. Set a default browser in your system
3. Try running VS Code as administrator

### "No pending callback" error

**Possible causes**:
- Callback expired (5-minute timeout)
- Redirect URI blocked by security settings
- OAuth state mismatch

**Solutions**:
1. Sign in again quickly (within 5 minutes)
2. Check browser security settings
3. Disable popup blockers for the redirect
4. Check Extension Host logs for details

### "Token exchange failed"

**Possible causes**:
- Network connectivity issues
- Authorization code already used
- PKCE verification failed

**Solutions**:
1. Check network connectivity
2. Verify feima-idp is accessible: `curl https://idp.feimacode.cn/.well-known/openid-configuration`
3. Sign in again to get a new code

### Token not refreshing automatically

**Possible causes**:
- Refresh token expired (30 days)
- Network issues during refresh

**Solutions**:
1. Sign out and sign in again
2. Check network connectivity
3. Contact support if issue persists

## Best Practices

### Security Tips

1. **Never share your tokens** - They are stored securely and never exposed
2. **Sign out on shared computers** - Use "Feima: 登出" when done
3. **Keep VS Code updated** - Security improvements are included in updates
4. **Use secure networks** - Avoid public Wi-Fi when signing in

### Account Management

1. **One account per user** - Each user should have their own Feima account
2. **Use your primary email** - For important notifications
3. **Enable 2FA if available** - For additional security

## Next Steps

- [Quick Start](./quickstart.md) - Start using Feima Copilot
- [Using Models](./using-models.md) - Learn about available models
- [Configuration](./configuration.md) - Customize your settings

## Need Help?

- 🐛 [Report Issues](https://github.com/feimacode/feima-copilot-llms-extension/issues)
- 💬 [Discussions](https://github.com/feimacode/feima-copilot-llms-extension/discussions)
- 📧 [Email Support](mailto:support@feimacode.cn)