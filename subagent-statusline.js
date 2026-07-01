#!/usr/bin/env node
// ============================================================================
// Claude Code Subagent Statusline
// Renders each subagent row in the agent panel with type badge, elapsed time,
// and token count. Matches the main statusline's warm Anthropic palette.
// ============================================================================

const os = require('os');

const NC = !!process.env.NO_COLOR || !!process.env.CLAUDE_CODE_NO_COLOR;
const Z = NC ? '' : '\x1b[0m';

// Warm anthropic palette (matches main statusline)
const C = {
  explore: '38;5;108',   // sage (haiku-associated color)
  plan:    '38;5;110',    // muted blue
  general: '38;5;215',   // peach (sonnet-associated color)
  custom:  '38;5;144',   // warm grey
  done:    '38;5;108',   // sage
  run:     '38;5;215',   // amber
  err:     '38;5;203',   // rust
  token:   '38;5;180',   // tan
  clock:   '38;5;243',   // muted
  sep:     '38;5;240',   // separator
  dim:     '38;5;237',   // very dim
};

const S = (c, s) => NC ? s : '\x1b[' + c + 'm' + s + Z;
const R = c => NC ? '' : '\x1b[' + c + 'm';

const BG = '48;5;236'; // warm dark block bg
const TXT = '38;5;229'; // cream text

// Agent type → display badge + color
function agentBadge(type) {
  const t = (type || '').toLowerCase();
  if (t === 'explore' || t === 'general-purpose') {
    return { label: 'Explore', color: C.explore };
  }
  if (t === 'plan') {
    return { label: 'Plan', color: C.plan };
  }
  // Custom agent names
  return { label: type || 'agent', color: C.custom };
}

// Token formatting
function fnum(n) {
  if (!n && n !== 0) return '';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

// Elapsed time from startTime (ISO string), human-readable
function elapsed(start) {
  if (!start) return '';
  const now = Date.now();
  const s = new Date(start).getTime();
  if (!s) return '';
  const ms = Math.max(0, now - s);
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return sec + 's';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + 'm ' + (sec % 60) + 's';
  const h = Math.floor(min / 60);
  return h + 'h ' + (min % 60) + 'm';
}

// Status symbol
function statusTag(status) {
  if (!status || status === 'running') return S(C.run, '▶');
  if (status === 'completed' || status === 'success') return S(C.done, '✓');
  if (status === 'error' || status === 'failed') return S(C.err, '✗');
  if (status === 'cancelled') return S(C.muted, '⊘');
  return S(C.dim, '○');
}

let buf = '';
process.stdin.on('data', c => buf += c);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(buf);
    const tasks = input.tasks || [];
    const cols = input.columns || 80;

    const lines = [];
    for (const task of tasks) {
      const { id, name, type, status, tokenCount, startTime, description } = task;
      const badge = agentBadge(type || name);
      const badgeStr = R(C.bbg || BG) + R(C.bag || TXT) + ' ' + badge.label + ' ' + Z;

      // Status + elapsed
      const stat = statusTag(status);
      const elap = elapsed(startTime);
      const timeStr = elap ? S(C.clock, elap) : '';

      // Token count
      const tokStr = tokenCount != null ? S(C.token, fnum(tokenCount) + ' tok') : '';

      // Description (truncate if too long)
      let desc = description || name || '';
      // Estimate available width: cols - badge(~12) - status(2) - time(8) - tokens(10) - separators(4)
      const badgeW = badge.label.length + 3; // "[label] "
      const maxDesc = Math.max(10, cols - badgeW - 4 - (timeStr ? 8 : 0) - (tokStr ? 10 : 0));
      if (desc.length > maxDesc) desc = desc.slice(0, maxDesc - 1) + '…';

      // Assemble row
      const parts = [badgeStr];
      if (desc) parts.push(desc);

      // Right-side items: status + time + tokens
      const right = [stat];
      if (timeStr) right.push(timeStr);
      if (tokStr) right.push(tokStr);

      const sep = ' ' + S(C.sep, '·') + ' ';
      const content = parts.join(sep) + ' ' + right.join(' ');

      lines.push(JSON.stringify({ id, content }));
    }

    if (lines.length) {
      process.stdout.write(lines.join('\n') + '\n');
    }
  } catch (e) {
    // Silent fail — keep default rendering
  }
});
