# Testing Authentication (Feature 1)

## Setup

1. **Install dependencies**:
   ```bash
   cd /home/iven/toys/feima/cn-model-for-copilot
   npm install
   ```

2. **Compile**:
   ```bash
   npm run compile
   ```

## ⚠️ IMPORTANT: OAuth Client Configuration

This extension **reuses the OAuth client from feima-code extension**. No additional setup required!

**Shared OAuth Client Details:**
- **client_id**: `vscode-feima-client` (shared with feima-code)
- **client_secret**: None (public client, uses PKCE)
- **redirect_uri**: `vscode://feima.cn-model-for-copilot/oauth/callback`
- **grant_types**: `authorization_code`, `refresh_token`
- **scopes**: `openid`, `profile`, `email`

### How It Works

The current feima-idp implementation (MVP) accepts **any redirect URI** for the `vscode-feima-client` client_id. This means:
- ✅ feima-code uses: `vscode://github.copilot-chat/oauth/callback`
- ✅ cn-model-for-copilot uses: `vscode://feima.cn-model-for-copilot/oauth/callback`
- ✅ Both work without configuration changes

See [oauth_service.py#L52-L68](https://github.com/feimacode/feima-idp/blob/main/idp/services/oauth_service.py#L52-L68):
```python
def validate_redirect_uri(self, client_id: str, redirect_uri: str) -> bool:
    # For MVP, allow any redirect URI for VS Code client
    if client_id == settings.vscode_client_id:
        return True  # Accept any URI
    return False
```

### Prerequisites

1. **feima-idp running** at https://auth.feimacode.cn
2. **VSCODE_CLIENT_ID** environment variable set to `vscode-feima-client` (default)
3. That's it! No database changes or additional configuration needed.

## Manual Testing

### Test 1: Launch Extension Development Host

1. Open `/home/iven/toys/feima/cn-model-for-copilot` in VS Code
2. Press **F5** to launch Extension Development Host
3. Check Output panel → "Feima" channel for activation logs

**Expected output**:
```
飞码扣 (Feima) extension is activating...
[Init] ✅ Authentication provider registered
[Init] ✅ Commands registered
✅ 飞码扣 (Feima) extension activated successfully!
```

### Test 2: Sign In Flow

1. In Extension Development Host, press `Ctrl+Shift+P`
2. Type "Feima: 登录" and select the command
3. Browser should open with feima-idp authorization page
4. Log in with your Feima account (WeChat/Weibo)
5. Grant permissions
6. You should be redirected back to VS Code
7. Success message should appear: "✅ 已登录为: [your email]"

**Check logs**:
- Output panel → "Feima" channel should show:
```
[Command] feima.signIn triggered
[Auth] Starting OAuth2 flow
[OAuth2Service] Authorization URL: https://auth.feimacode.cn/oauth/authorize?...
[Auth] Opened browser, waiting for callback...
[Auth] Received OAuth callback: vscode://feima.cn-model-for-copilot/oauth/callback?code=...
[Auth] Callback validated successfully
[Auth] Received authorization code, exchanging for token...
[Auth] Session created successfully for [email]
[Command] Sign in successful: [email]
```

### Test 3: Show Account Info

1. Press `Ctrl+Shift+P`
2. Type "Feima: 查看账号" and execute
3. Should show info message with your account details

**Expected**:
```
当前账号: [your email]
账号 ID: WeChat_[openid] or Weibo_[uid]
```

### Test 4: Token Persistence

1. Close Extension Development Host
2. Reopen with F5
3. Press `Ctrl+Shift+P` → "Feima: 查看账号"
4. Should show account without re-login (token persisted in secrets)

### Test 5: Sign Out

1. Press `Ctrl+Shift+P`
2. Type "Feima: 登出" and execute
3. Should show "✅ 已登出 Feima 账号"
4. Try "Feima: 查看账号" → should show "⚠️ 请先登录 Feima 账号"

### Test 6: Token Refresh (Optional - requires waiting)

This test validates automatic token refresh:

1. Sign in successfully
2. Manually modify stored token to have short expiry:
   - VS Code stores tokens in encrypted secrets
   - For testing, wait ~15 minutes after login
   - Try "Feima: 查看账号" again
   - Logs should show token refresh:
   ```
   [Auth] Refreshing expired token
   ```

## Troubleshooting

### Issue: "Failed to open authentication URL"

**Solution**: Check if default browser is configured correctly.

### Issue: "No pending callback for state=..."

**Possible causes**:
1. Timeout (5 minutes) - Try again faster
2. OAuth client not registered in feima-idp
3. Redirect URI mismatch

**Check**:
```bash
# In feima-idp database
SELECT client_id, redirect_uris FROM idp_schema.oauth_clients 
WHERE client_id = 'cn-model-for-copilot';
```

Should return:
```
client_id              | redirect_uris
-----------------------|-----------------------------------------------
cn-model-for-copilot  | ["vscode://feima.cn-model-for-copilot/oauth/callback"]
```

### Issue: "Token exchange failed: 400"

**Possible causes**:
1. OAuth client secret mismatch (should be NULL for public client)
2. PKCE verification failed
3. Invalid authorization code

**Check logs** for OAuth2Service errors.

### Issue: Browser opens but shows feima-idp error page

**Possible causes**:
1. Client not registered
2. Redirect URI not whitelisted
3. feima-idp configuration issue

**Check feima-idp logs**:
```bash
cd /home/iven/toys/feima/feima-idp
docker-compose logs -f
```

## Success Criteria

✅ Extension activates without errors  
✅ Sign in opens browser with correct authorization URL  
✅ Callback completes and exchanges code for token  
✅ Account info displays correct user details  
✅ Token persists across VS Code restarts  
✅ Sign out clears tokens  
✅ Token refresh works automatically  

## Next Steps

Once authentication is working:
1. ✅ Feature 1 (Authentication) - COMPLETE
2. 🚧 Feature 2 (Language Model Provider) - Extract from feima-code
3. 🔍 Week 3: Critical validation with GitHub Copilot Chat

---

**Status**: Feature 1 implementation complete, ready for testing
