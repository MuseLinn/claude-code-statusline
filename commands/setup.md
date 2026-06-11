---
name: setup
description: Install deepseek-statusline — copies script and writes global settings.json
---

Do the following step by step:

1. **Copy statusline.js** from the plugin to `~/.claude/`:

   On **macOS / Linux**:
   ```bash
   cp ${CLAUDE_PLUGIN_ROOT}/statusline.js ~/.claude/statusline.js
   ```

   On **Windows**:
   ```bash
   cp "${CLAUDE_PLUGIN_ROOT}/statusline.js" "${HOME}/.claude/statusline.js"
   ```

   If `${CLAUDE_PLUGIN_ROOT}/statusline.js` is not found, list the plugin root directory to locate it, then copy.

2. **Configure settings.json** (GLOBAL, not local — so it works across all projects):

   Read `~/.claude/settings.json`. This is the global user settings file. If it doesn't exist, create it as `{}`.

   Add (or update) the `statusLine` field. Use `Write` tool to edit the file directly — do NOT use shell commands for JSON manipulation.

   On **macOS / Linux**:
   ```json
   "statusLine": {
     "type": "command",
     "command": "node ~/.claude/statusline.js"
   }
   ```

   On **Windows** — MUST use the full path to node.exe. First find it:
   ```bash
   node -e "console.log(process.execPath)"
   ```
   Then write to settings.json:
   ```json
   "statusLine": {
     "type": "command",
     "command": "\"C:/Program Files/nodejs/node.exe\" \"C:/Users/USERNAME/.claude/statusline.js\""
   }
   ```

3. **IMPORTANT**: Write to `~/.claude/settings.json` — NOT `settings.local.json`. `settings.local.json` is project-scoped and only works in one directory. `settings.json` is global and works everywhere.

4. **Tell the user**: "Setup complete. **Fully quit Claude Code and restart**. The statusline will now appear in ALL projects, not just this directory."
