# deepseek-statusline

A [Claude Code](https://code.claude.com/) statusline plugin for DeepSeek models.  
Shows account balance, session cost, lifetime spending, context progress, token usage, git status, and more — right in your Claude Code status bar.

## Features

```
windows-island · 🤖 Sonnet → deepseek-v4-flash · 💳 ¥18.50 · ⏱ 1h48m
[██░░░░░░░░] 80% [1.0M] · ⬇ 13.3K 📦5.7M ⬆ 11.7K · 💰 ¥0.151 · 📊 ¥2.50
```

| Section | Line | What it shows |
|---------|------|---------------|
| Git branch | 1 | `[main+2*]` — branch, untracked files, modified indicator |
| Project dir | 1 | Last 2 path segments (dim) |
| Model | 1 | Claude tier → DeepSeek model name, e.g. `Sonnet → deepseek-v4-flash` |
| 💳 Balance | 1 | DeepSeek account balance (cached 5 min) |
| ⏱ Duration | 1 | Session elapsed time |
| Context bar | 2 | `[████░░░░░░]` 10-segment progress bar, color-coded (green/yellow/red) |
| Context size | 2 | API-reported context window size |
| Token counts | 2 | `⬇ input 📦cache ⬆ output` with K/M formatting |
| 💰 Session cost | 2 | This session's cumulative cost (uncached tokens only) |
| 📊 Lifetime cost | 2 | Total spending across all sessions |

## Requirements

- [Claude Code](https://code.claude.com/) v2.1.132+
- Node.js 18+
- DeepSeek API key

## Installation

### Via plugin marketplace

```bash
# Add the marketplace source
claude plugin marketplace add <your-github-username>/deepseek-statusline

# Install the plugin
claude plugin install deepseek-statusline

# Run setup
/deepseek-statusline:setup
```

Restart Claude Code.

### Manual installation

```bash
# 1. Clone the repo
git clone https://github.com/<your-github-username>/deepseek-statusline
cd deepseek-statusline

# 2. Copy the script
cp statusline.js ~/.claude/statusline.js

# 3. Add to settings.local.json
# (merges with settings.json, survives cc switch)
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

Use the full path to node.exe:

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

The statusline reads your DeepSeek API key in this order:

1. `DEEP_SEEK_API_KEY_FOR_BALANCE` environment variable
2. `ANTHROPIC_AUTH_TOKEN` from `settings.json` env
3. `ANTHROPIC_AUTH_TOKEN` environment variable

For the cheapest DeepSeek setup, add to `~/.claude/settings.json`:

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

### Pricing

Built-in pricing table (CNY per million tokens). Update `PRICING` in `statusline.js` as needed:

| Model | Input | Cached | Output |
|-------|-------|--------|--------|
| deepseek-v4-flash | ¥1 | ¥0.02 | ¥2 |
| deepseek-v4-pro | ¥3 | ¥0.025 | ¥6 |

### Adding more models

Edit the `PRICING` and `modelTierMap` sections in `statusline.js`.

## How it works

1. Claude Code sends session JSON to the script via stdin every ~300ms
2. The script parses model info, context window, and token usage
3. Token costs are calculated using per-model pricing (uncached tokens only)
4. Balance is fetched from DeepSeek API (`/user/balance`) and cached for 5 minutes
5. Session state is persisted in `~/.claude/deepseek-cache.json`
6. Old sessions (7+ days) are auto-cleaned

## Restoring previous statusline

A backup of your previous statusline (if any) is saved to `previous-statusline.txt` in the plugin directory.

## License

MIT
