---
name: setup
description: Install deepseek-statusline — copies script and writes settings.local.json
---

Do the following step by step:

1. **Copy statusline.js** from the plugin to `~/.claude/`:

   First, find where the plugin is installed — read any `.ts` or `.js` file in `${CLAUDE_PLUGIN_ROOT}` to confirm the path exists. Then copy `${CLAUDE_PLUGIN_ROOT}/statusline.js` to the Claude config directory.

   On **macOS / Linux**:
   ```bash
   cp ${CLAUDE_PLUGIN_ROOT}/statusline.js ~/.claude/statusline.js
   ```

   On **Windows** (use PowerShell-style double-quoted paths):
   ```bash
   cp "${CLAUDE_PLUGIN_ROOT}/statusline.js" "${HOME}/.claude/statusline.js"
   ```

   If `${CLAUDE_PLUGIN_ROOT}/statusline.js` is not found, list the plugin root directory to locate it, then copy.

2. **Configure settings.local.json**:

   Read `~/.claude/settings.local.json`. If the file doesn't exist, create it as `{}`.

   Add (or update) the `statusLine` field with:

   On **macOS / Linux**:
   ```json
   "statusLine": {
     "type": "command",
     "command": "node ~/.claude/statusline.js"
   }
   ```

   On **Windows** — you MUST use the full path to node.exe. First find it with:
   ```bash
   node -e "console.log(process.execPath)"
   ```
   Then use the result, formatted WITHOUT JSON-string-escape issues. Write it directly via Write tool:
   ```json
   "statusLine": {
     "type": "command",
     "command": "\"C:/Program Files/nodejs/node.exe\" \"ABSOLUTE/PATH/TO/.claude/statusline.js\""
   }
   ```

3. **Tell the user**: "Setup complete. **Fully quit Claude Code and restart** — `/reload-plugins` is not enough. The statusLine setting only takes effect on a fresh start."
