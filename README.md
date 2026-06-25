# claude-code-statusline

>  **Recommended install**: via [MuseLinn/muselinn-garage](https://github.com/MuseLinn/muselinn-garage) — one marketplace for all your Claude Code tools.

A [Claude Code](https://code.claude.com/) statusline plugin with Anthropic-warm palette, supporting DeepSeek and opencode go providers.

```
main │ ~ │ Opus → mimo-v2.5 ⚡high │ 14:32 │ 1h23m
▐███████▌░░░░░░░▌ 75% │ 628.6K in 10.0K out │ 24 turns │ +128 -38
5h ▐██░░░░░░▌ 7%  wk ▐████░░░░░░░░▌ 10%  mo ▐██░░░░░░░░░░░░░░▌ 5%
```

## Features

| Feature | DeepSeek | opencode go | Anthropic |
|---|---|---|---|
| Context bar (80-seg TrueColor gradient) | ✅ | ✅ | ✅ |
| Token counts (in/out) | ✅ | ✅ | ✅ |
| Cache hit % | ✅ | — | — |
| Cost tracking (¥) | ✅ | — | — |
| Balance (DeepSeek API) | ✅ | — | — |
| Subscription usage (5h/wk/mo) | — | ✅ | — |
| Model tier badge (Sonnet → xxx) | ✅ | ✅ | ✅ |
| Git branch + porcelain status | ✅ | ✅ | ✅ |
| Repo link (OSC 8 clickable) | ✅ | ✅ | ✅ |
| Session name / Agent prefix | ✅ | ✅ | ✅ |
| Effort indicator | ✅ | ✅ | ✅ |
| Code churn (+N/-N) | ✅ | ✅ | ✅ |
| Vim mode / Worktree / PR | ✅ | ✅ | ✅ |

## Requirements

- [Claude Code](https://code.claude.com/) v2.1.132+
- Node.js 18+

## Installation

### Via plugin marketplace

```bash
claude plugin marketplace add MuseLinn/muselinn-garage
claude plugin install claude-code-statusline@muselinn-garage
/deepseek-statusline:setup
```

Restart Claude Code.

### Manual (copy file)

```bash
git clone https://github.com/MuseLinn/claude-code-statusline
cp claude-code-statusline/statusline.js ~/.claude/statusline.js
```

Then add to `~/.claude/settings.local.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/statusline.js"
  }
}
```

### Windows (Git Bash / MSYS2)

```json
{
  "statusLine": {
    "type": "command",
    "command": "\"C:\\Program Files\\nodejs\\node.exe\" \"C:\\Users\\<username>\\.claude\\statusline.js\""
  }
}
```

## Configuration

### DeepSeek

Set your API key for balance tracking:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-your-deepseek-key"
  }
}
```

### opencode go

Enable subscription usage tracking (LINE 3 shows 5h/wk/mo progress bars):

1. Visit https://opencode.ai, sign in
2. Open DevTools → Application → Cookies → copy the `auth` value
3. Add to `~/.claude/settings.json`:

```json
{
  "env": {
    "OPENCODE_GO_ENABLED": "true",
    "OPENCODE_GO_AUTH_COOKIE": "Fe26.2**...",
    "OPENCODE_GO_WORKSPACE_ID": "wrk_..."
  }
}
```

### Anthropic

No additional config needed — context bar and tokens work out of the box.

## Pricing

### DeepSeek (¥/1M tokens)

| Model | Input | Cached | Output |
|---|---|---|---|
| deepseek-v4-flash | ¥1 | ¥0.02 | ¥2 |
| deepseek-v4-pro | ¥3 | ¥0.025 | ¥6 |

Edit the `PRICE` object in `statusline.js` to add or update models.

### opencode go

Usage is fetched from opencode.ai via HTML scraping. No local pricing needed.

## How it works

1. Claude Code pipes session JSON to the script via stdin every ~300ms
2. Script parses model, context window, tokens, effort, and session info
3. Session state persisted in `~/.claude/deepseek-cache.json`, auto-cleaned after 7 days
4. DeepSeek: balance fetched from `/user/balance`, cached 5 min
5. opencode go: usage scraped from workspace page, cached 10s

## License

MIT
