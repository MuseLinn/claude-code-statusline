# deepseek-statusline

A [Claude Code](https://code.claude.com/) statusline plugin for DeepSeek models.
Anthropic-inspired warm palette, colour-coded git porcelain status, TrueColor gradient context bar, rolling burn rate, and more.

```
main 8M·12N│GPR/UAV-Rotor-Interferen…│Opus → deepseek-v4-pro ⚡max│¥8.05│14:32│1h23m
▐███▋░░░░░░▌ 64%│1.7M 📦54.8M 96.9% 162.0K (+371)│¥0.0092│#291│Total ¥7.58│+10740/-747│~¥0.42/h
```

## Features

| Section | What it shows |
|---|---|
| Git branch | colour-coded porcelain status: `M` amber, `A` green, `D` rust, `R` blue, `N` grey |
| Project dir | last 2+ path segments, auto `~` for home, long names truncated |
| Model badge | bg-block: tier → DeepSeek model + effort level |
| 💳 Balance | DeepSeek account balance, cached 5 min |
| ⏱ Clock + duration | real-time clock + session elapsed |
| Context bar | 80-seg TrueColor gradient `▐████▌░░░░░▌` (sage→amber→rust) |
| Token counts | `↓input 📦cache hit% ↑output` with per-turn deltas |
| 💰 Cost | this turn cost + session cumulative |
| 💬 Turns | conversation turn counter |
| +N/-N Code churn | lines added / removed this session |
| ~¥/h Burn rate | rolling 10-min window, not lifetime average |
| Vim mode | shown when vim mode active |
| Worktree / PR | auto-appear when relevant |

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

### Manual (copy file)

```bash
git clone https://github.com/MuseLinn/deepseek-statusline
cp deepseek-statusline/statusline.js ~/.claude/statusline.js
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

The statusline reads your DeepSeek API key in order:

1. `DEEP_SEEK_API_KEY_FOR_BALANCE` env var
2. `ANTHROPIC_AUTH_TOKEN` from `settings.json` → `env`
3. `ANTHROPIC_AUTH_TOKEN` env var

Recommended `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
    "ANTHROPIC_AUTH_TOKEN": "sk-your-deepseek-key",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-v4-flash[1M]",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-v4-pro[1M]",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-v4-flash",
    "DISABLE_AUTOUPDATER": "1",
    "ENABLE_TOOL_SEARCH": "true"
  }
}
```

### Pricing (CNY per 1M tokens)

| Model | Input | Cached | Output |
|---|---|---|---|
| deepseek-v4-flash | ¥1 | ¥0.02 | ¥2 |
| deepseek-v4-pro | ¥3 | ¥0.025 | ¥6 |

Edit the `PRICE` object in `statusline.js` to add or update models.

### Effort level

| Claude level | Display |
|---|---|
| low / medium / high | `⚡high` |
| xhigh / max | `⚡max` |

## How it works

1. Claude Code pipes session JSON to the script via stdin every ~300ms
2. Script parses model, context window, tokens, effort, and session info
3. Session state persisted in `~/.claude/deepseek-cache.json`, auto-cleaned after 7 days
4. Balance fetched from DeepSeek `/user/balance`, cached 5 minutes
5. Burn rate: snapshot every 10s, rolling 10-min window → active consumption rate

## License

MIT
