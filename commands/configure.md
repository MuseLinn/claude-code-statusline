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
Ask for their `OPENCODE_GO_AUTH_COOKIE` and `OPENCODE_GO_WORKSPACE_ID`, then write to `~/.claude/statusline-config.json`:

```bash
cat > ~/.claude/statusline-config.json << 'JSONEOF'
{
  "OPENCODE_GO_ENABLED": "true",
  "OPENCODE_GO_AUTH_COOKIE": "<their auth cookie value>",
  "OPENCODE_GO_WORKSPACE_ID": "<their workspace id>"
}
JSONEOF
```

Explain how to get the cookie: visit https://opencode.ai, sign in, open browser DevTools → Application → Cookies → copy the `auth` value (just the hex string, not the `auth=` prefix).

**Why `statusline-config.json` instead of `settings.json`?** Claude Code's `/model` and `/plugin` commands rewrite `settings.json`, which would wipe out custom env vars. `statusline-config.json` is merged at runtime and survives CLI commands.

### If DeepSeek:
Ask for their DeepSeek API key if not already set, then update `~/.claude/settings.json` → `env.ANTHROPIC_AUTH_TOKEN`.

### If Anthropic:
No additional config needed — Claude Code's built-in `cost.total_cost_usd` and `rate_limits` fields are used automatically.

## After updating config

Tell the user to restart Claude Code for changes to take effect. If the third line (usage %) still doesn't show after restart, check:

1. `~/.claude/statusline-config.json` has `OPENCODE_GO_ENABLED: "true"` (string, not boolean)
2. The auth cookie hasn't expired — re-copy from browser DevTools
3. The workspace ID is correct — it should start with `wrk_`

Statusline features by provider:

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
| Agent panel rows | ✅ | ✅ | ✅ |

The `subagent-statusline.js` script is installed automatically by `/claude-code-statusline:setup` and configures the [subagentStatusLine](https://code.claude.com/docs/en/statusline#subagent-status-lines) setting. If the agent panel rows still show default text, check that `~/.claude/settings.json` contains a `subagentStatusLine` block.
