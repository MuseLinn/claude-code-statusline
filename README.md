# claude-code-statusline

> **Recommended install**: via [MuseLinn/muselinn-garage](https://github.com/MuseLinn/muselinn-garage) — one marketplace for all your Claude Code tools.

A [Claude Code](https://code.claude.com/) statusline plugin with Anthropic-warm palette, supporting DeepSeek, opencode go, and Anthropic providers. Pac-Man progress bar, git porcelain, code churn.

```
main 1M1A │ ~/project │ Sonnet → deepseek-v4-flash ⚡high │ 14:32
▐●●●●ᗧ·····▌ 45% │ 155K/200K │ +128 -38 │ 24 turns
5h ▐████░░▌ 12%  wk ▐████████░░▌ 20%  mo ▐█████████████████░░░▌ 35%
```

## Features

| Feature | DeepSeek | opencode go | Anthropic |
|---|---|---|---|
| Context bar (Pac-Man eating beans) | ✅ | ✅ | ✅ |
| Token counts (in/out) | ✅ | ✅ | ✅ |
| >200k token warning | ✅ | ✅ | ✅ |
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
claude plugin install claude-code-statusline
/statusline-setup
```

Restart Claude Code.

### Manual (copy file)

```bash
git clone https://github.com/MuseLinn/claude-code-statusline
cp claude-code-statusline/statusline.js ~/.claude/statusline.js
```

Then add to `~/.claude/settings.json`:

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

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-your-deepseek-key"
  }
}
```

### opencode go

Create `~/.claude/statusline-config.json` (survives `/model` switches):

```json
{
  "OPENCODE_GO_ENABLED": "true",
  "OPENCODE_GO_AUTH_COOKIE": "Fe26.2**...",
  "OPENCODE_GO_WORKSPACE_ID": "wrk_..."
}
```

Get the cookie: visit https://opencode.ai, sign in, DevTools → Application → Cookies → copy `auth` value.

### Anthropic

No additional config needed.

## How it works

1. Claude Code pipes session JSON to the script via stdin (refreshInterval: 10s)
2. Script renders model, context bar (Pac-Man), tokens, git, etc.
3. Session state persisted in `~/.claude/deepseek-cache.json`, auto-cleaned after 7 days
4. DeepSeek: balance fetched from `/user/balance`, cached 5 min
5. opencode go: usage scraped from workspace page, cached 10s

## License

MIT
