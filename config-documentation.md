# Claude Code — DeepSeek Configuration

> Synced from live config on **2026-06-08**
> Plugin: [MuseLinn/claude-code-statusline](https://github.com/MuseLinn/claude-code-statusline)
> Backup: `~/.claude/backups/20260608-140722/`

---

## Environment Variables (`~/.claude/settings.json`)

```json
{
  "ANTHROPIC_BASE_URL": "https://api.deepseek.com/anthropic",
  "ANTHROPIC_AUTH_TOKEN": "sk-**[REDACTED]**",
  "ANTHROPIC_MODEL": "deepseek-v4-flash[1M]",
  "ANTHROPIC_DEFAULT_OPUS_MODEL": "deepseek-v4-pro[1M]",
  "ANTHROPIC_DEFAULT_SONNET_MODEL": "deepseek-v4-flash[1M]",
  "ANTHROPIC_DEFAULT_HAIKU_MODEL": "deepseek-v4-flash[1M]",
  "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
  "CLAUDE_CODE_ATTRIBUTION_HEADER": "0",
  "DISABLE_AUTOUPDATER": "1",
  "ENABLE_TOOL_SEARCH": "true"
}
```

### Notes
- `ANTHROPIC_AUTH_TOKEN` is the real DeepSeek API key (redacted above)
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` reduces background requests
- `CLAUDE_CODE_ATTRIBUTION_HEADER=0` reduces per-request overhead

---

## Statusline (`~/.claude/statusline.js` + `settings.local.json`)

### Line 1 — Environment & Project
```
[main+1*] windows-island · 🤖 Sonnet → deepseek-v4-flash · 💳 ¥18.50 · ⏱ 1h48m
```

| Element | Color | Source |
|---------|-------|--------|
| Git branch | Green | `.git/HEAD` + `git status --porcelain` |
| Project dir | Bright cyan | `workspace.project_dir` → last 2 segments |
| Model label | Bold white | `model.display_name` + `ANTHROPIC_DEFAULT_*_MODEL_NAME` env |
| Balance | Bright yellow | DeepSeek `/user/balance` API (cached 5 min) |
| Duration | Bright blue | `cost.total_duration_ms` |

### Line 2 — Context, Tokens & Cost
```
[████░░░░░░] 80% [1.0M] · ⬇ 13.3K 📦5.7M ⬆ 11.7K · 💰 ¥0.151 · 📊 ¥2.50 · 💬 12
                                                                     ↑ ⚠ compact (≤20%)
```

| Element | Color | Notes |
|---------|-------|-------|
| Context bar | Green/Yellow/Red | 10-segment, based on used percentage |
| Context size | Gray | API-reported window size |
| Input tokens | Bright cyan | Cumulative for this session |
| Cache tokens | Bright yellow | Cache read hits |
| Output tokens | Bright magenta | Cumulative for this session |
| Session cost | Yellow | Per DeepSeek pricing, uncached tokens only |
| Lifetime cost | Bright cyan | Sum across all cached sessions |
| Compact warning | Yellow or Red | Appears when remaining ≤20% |
| Turn counter | Gray | Incremented per API call |

---

## Pricing (CNY per 1M tokens)

| Model | Input | Cached Input | Output |
|-------|-------|-------------|--------|
| `deepseek-v4-flash` | ¥1 | ¥0.02 | ¥2 |
| `deepseek-v4-pro` | ¥3 | ¥0.025 | ¥6 |

---

## Cache & State Files

| File | Purpose |
|------|---------|
| `~/.claude/deepseek-cache.json` | Per-session token accumulations + balance cache |
| *Format:* `{ sessions: { [sid]: { in, out, cache, turns, ts } }, balance, balanceTs }` |
| *Retention:* Sessions older than 7 days auto-cleaned |
| `~/.claude/statusline.js` | The running script (Node.js, 0 dependencies) |

---

## Key File Paths

| Path | Purpose |
|------|---------|
| `~/.claude/settings.json` | Main config — `cc switch` manages this |
| `~/.claude/settings.local.json` | Local overrides — statusLine + permissions, survives cc switch |
| `~/.claude/statusline.js` | The statusline script |
| `~/.claude/deepseek-cache.json` | Token/balance cache |
| `~/.claude/backups/20260608-140722/` | Full config backup (3 files) |
| `~/projects/claude-code-statusline/` | Plugin development repo |

---

## Plugin (for future updates)

**GitHub:** https://github.com/MuseLinn/claude-code-statusline

```bash
# Install
claude plugin marketplace add MuseLinn/claude-code-statusline
claude plugin install claude-code-statusline
/claude-code-statusline:setup

# Restart Claude Code after setup
```

---

## Restore from Backup

```bash
cp ~/.claude/backups/20260608-140722/* ~/.claude/
```

Files in backup: `settings.json`, `settings.local.json`, `statusline.js`

---

## Settings.local.json Snapshot (permissions structure only)

Contains:
- `statusLine` — points to `node ~/.claude/statusline.js`
- `permissions.allow` — list of allowed Bash/MCP patterns (too long to list here, see actual file)
