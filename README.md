# deepseek-statusline

A [Claude Code](https://code.claude.com/) statusline plugin for DeepSeek models.  
Shows balance, session cost, lifetime spending, cache hit rate, context progress, token usage, effort level, turns count, git status, and more.

```
windows-island │ 🤖 Sonnet → deepseek-v4-flash ⚡max │ 💳 ¥18.50 │ ⏱ 1h48m
[██░░░░░░░░] 80% [1.0M] │ ⬇ 13.3K 📦5.7M (99.83%) ⬆ 11.7K │ 💰 ¥0.151 │ 💬 12 │ 📊 ¥2.50
```

## Features

| Section | Line | What it shows |
|---------|------|---------------|
| Git branch | 1 | `[main+2*]` — branch, untracked files, modified indicator |
| Project dir | 1 | Last 2 path segments |
| Model | 1 | Claude tier → DeepSeek model name, e.g. `Sonnet → deepseek-v4-flash` |
| ⚡ Effort | 1 | Mapped effort level: `high` (low/medium/high) or `max` (xhigh/max) |
| 💳 Balance | 1 | DeepSeek account balance (cached 5 min) |
| ⏱ Duration | 1 | Session elapsed time |
| Context bar | 2 | `[████░░░░░░]` 10-segment progress bar, color-coded (green/yellow/red) |
| Context size | 2 | API-reported context window size |
| 🔄 Cache hit rate | 2 | `(99.83%)` — session cache hit rate with 2 decimal places |
| Token counts | 2 | `⬇ input 📦cache ⬆ output` with K/M formatting |
| 💰 Session cost | 2 | This session's cumulative cost, model-safe (per-turn pricing) |
| 💬 Turns | 2 | Conversation turn count |
| 📊 Lifetime cost | 2 | Total spending across all sessions |
| ⚠ Compact | 2 | Warning when context remaining ≤ 20% |

## Requirements

- [Claude Code](https://code.claude.com/) v2.1.132+
- Node.js 18+
- DeepSeek API key

## Installation

### Via plugin marketplace

```bash
claude plugin marketplace add MuseLinn/deepseek-statusline
claude plugin install deepseek-statusline
/deepseek-statusline:setup
```

Restart Claude Code.

### Manual installation

```bash
git clone https://github.com/MuseLinn/deepseek-statusline
cd deepseek-statusline
cp statusline.js ~/.claude/statusline.js
```

Add to `~/.claude/settings.local.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/statusline.js"
  }
}
```

### Windows + Git Bash

```json
{
  "statusLine": {
    "type": "command",
    "command": "\"C:\\Program Files\\nodejs\\node.exe\" \"C:\\Users\\<username>\\.claude\\statusline.js\""
  }
}
```

## Configuration

### API Key

The statusline reads your DeepSeek API key in order:

1. `DEEP_SEEK_API_KEY_FOR_BALANCE` environment variable
2. `ANTHROPIC_AUTH_TOKEN` from `settings.json` env
3. `ANTHROPIC_AUTH_TOKEN` environment variable

Recommended `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-your-deepseek-key",
    "ANTHROPIC_MODEL": "deepseek-v4-flash[1M]",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-v4-flash[1M]",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-v4-pro[1M]",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-v4-flash",
    "DISABLE_AUTOUPDATER": "1",
    "ENABLE_TOOL_SEARCH": "true",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  }
}
```

### Effort level mapping

| Claude level | Display |
|-------------|---------|
| low / medium / high | `⚡high` |
| xhigh / max | `⚡max` |

### Pricing (CNY per 1M tokens)

| Model | Input | Cached | Output |
|-------|-------|--------|--------|
| deepseek-v4-flash | ¥1 | ¥0.02 | ¥2 |
| deepseek-v4-pro | ¥3 | ¥0.025 | ¥6 |

Edit `PRICING` in `statusline.js` to add more models.

## How it works

1. Claude Code sends session JSON to the script via stdin every ~300ms
2. Script parses model, context window, tokens, effort, and session info
3. **Cost is per-turn incremental** — each turn calculated at current model pricing. Switching models mid-session won't reprice history.
4. **Cache hit rate** displayed with 2 decimal places, calculated as `cache / (input + cache) × 100`
5. **Migration-safe** — old cache without `paid` field auto-initializes from accumulated tokens
6. Balance fetched from DeepSeek API (`/user/balance`), cached 5 minutes
7. Session state persisted in `~/.claude/deepseek-cache.json`, auto-cleans after 7 days

## Contributors

- [@MuseLinn](https://github.com/MuseLinn) — project maintainer
- [@Claude](https://anthropic.com/) — AI pair programmer ([claude.ai](https://claude.ai))

## License

MIT
