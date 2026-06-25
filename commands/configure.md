---
name: configure
description: "Configure statusline for your current provider (DeepSeek / opencode go / Anthropic)"
---

# Statusline Provider Configuration

Help the user configure their statusline to work with their current API provider.

## Current Provider

Read `~/.claude/settings.json` → `env.ANTHROPIC_BASE_URL`:
- `api.deepseek.com` → **DeepSeek** (shows: ¥ balance, cost, tokens with cache)
- `opencode.ai` or `127.0.0.1` proxy → **opencode go** (shows: usage %, tokens, no cost)
- Otherwise → **Anthropic** (shows: tokens, no cost)

## What to ask the user

Based on their provider, ask ONLY what's relevant:

### If opencode go / local proxy:
Ask for their `OPENCODE_GO_AUTH_COOKIE` and `OPENCODE_GO_WORKSPACE_ID`, then update `~/.claude/settings.json` → `env`:

```json
"OPENCODE_GO_AUTH_COOKIE": "<their cookie>",
"OPENCODE_GO_WORKSPACE_ID": "<their workspace id>"
```

Explain how to get the cookie: visit https://opencode.ai, sign in, open browser DevTools → Application → Cookies → copy the `auth` value.

### If DeepSeek:
Ask for their DeepSeek API key if not already set, then update `~/.claude/settings.json` → `env.ANTHROPIC_AUTH_TOKEN`.

### If Anthropic:
No additional config needed — Claude Code's built-in `cost.total_cost_usd` and `rate_limits` fields are used automatically.

## After updating config

Tell the user to restart Claude Code for changes to take effect. Statusline features by provider:

| Feature | DeepSeek | opencode go | Anthropic |
|---------|----------|-------------|-----------|
| Context bar | ✅ | ✅ | ✅ |
| Tokens (in/out) | ✅ | ✅ | ✅ |
| Cache hit % | ✅ | ❌ | ❌ |
| Cost (¥) | ✅ | ❌ | ❌ |
| Balance | ✅ (API) | ❌ | ❌ |
| Usage % (5h/wk/mo) | ❌ | ✅ (API) | ❌ |
| Model tier badge | ✅ | ✅ | ✅ |
| Git / dir / PR | ✅ | ✅ | ✅ |
