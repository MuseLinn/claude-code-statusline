#!/usr/bin/env node
// ============================================================================
// Claude Code Statusline — DeepSeek Edition (v4)
// Multi-line, labels, git status, progress bar, balance, cost, tokens
// ============================================================================

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const HOME = os.homedir();
const CACHE_FILE = path.join(HOME, '.claude', 'deepseek-cache.json');
const BALANCE_TTL = 5 * 60 * 1000; // 5 min

// DeepSeek pricing (CNY per 1M tokens)
const PRICING = {
  'deepseek-v4-flash': { input: 1, cached: 0.02, output: 2 },
  'deepseek-v4-pro':   { input: 3, cached: 0.025, output: 6 },
};

// ---- helpers ---------------------------------------------------------------
function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function costStr(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0.0000';
  if (n === 0) return '0.0000';
  if (n < 0.01) return n.toFixed(4);
  if (n < 1) return n.toFixed(3);
  return n.toFixed(2);
}

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function writeJSON(p, d) {
  try { fs.writeFileSync(p, JSON.stringify(d), 'utf8'); } catch {}
}

// ---- cache ----------------------------------------------------------------
function readCache() {
  const c = readJSON(CACHE_FILE);
  if (!c || !c.sessions) return { sessions: {}, balance: '', balanceTs: 0 };
  return c;
}

function writeCache(c) {
  writeJSON(CACHE_FILE, c);
}

// ---- balance (persistent cache, across process invocations) ----------------
function getBalance(apiKey) {
  if (!apiKey || apiKey === 'PROXY_MANAGED') return '';
  const cache = readCache();
  const now = Date.now();

  if (cache.balance && cache.balanceTs && now - cache.balanceTs < BALANCE_TTL) {
    return cache.balance;
  }

  let key = process.env.DEEP_SEEK_API_KEY_FOR_BALANCE || apiKey;
  if (!key || key === 'PROXY_MANAGED') return cache.balance || '';

  const https = require('https');
  const req = https.get({
    hostname: 'api.deepseek.com',
    path: '/user/balance',
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + key },
    timeout: 3000,
  }, (res) => {
    let chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
      try {
        const j = JSON.parse(Buffer.concat(chunks));
        const b = j.balance_infos && j.balance_infos[0] && j.balance_infos[0].total_balance;
        if (b != null) {
          const c2 = readCache();
          c2.balance = '¥' + parseFloat(b).toFixed(2);
          c2.balanceTs = Date.now();
          writeCache(c2);
        }
      } catch {}
    });
  });
  req.on('error', () => {});
  req.end();

  return cache.balance || '';
}

// ---- git status -----------------------------------------------------------
function getGitStatus() {
  try {
    const cwd = process.cwd();
    let branch = '';

    const gitHead = path.join(cwd, '.git', 'HEAD');
    if (!fs.existsSync(gitHead)) return { branch: '', untracked: 0, modified: false };

    const head = fs.readFileSync(gitHead, 'utf8').trim();
    if (head.startsWith('ref: refs/heads/')) {
      branch = head.replace('ref: refs/heads/', '');
    } else {
      branch = head.slice(0, 12);
    }

    const status = execSync('git status --porcelain', { encoding: 'utf8', timeout: 2000 });
    const untracked = (status.match(/^\?\?/gm) || []).length;
    const modified = /^[ MADRC]/m.test(status);

    return { branch: branch, untracked: untracked, modified: modified };
  } catch {
    return { branch: '', untracked: 0, modified: false };
  }
}

// ---- read stdin -----------------------------------------------------------
let buf = '';
process.stdin.on('data', c => buf += c);
process.stdin.on('end', () => {
  try {
    const info = JSON.parse(buf);
    const model = info.model && info.model.display_name || '';
    const modelId = info.model && info.model.id || '';
    const sid = info.session_id || 'default';
    const cw = info.context_window || {};

    // ---- settings (read early for mapping/balance) ----
    const settings = readJSON(path.join(HOME, '.claude', 'settings.json'));

    // ---- short model name ----
    const shortModel = model.includes(',') ? model.split(',')[1].trim() : model.replace(/\[.*?\]/g, '').trim();

    // ---- context window size (API reported value) ----
    let ctxSizeStr = '';
    if (cw.context_window_size) {
      ctxSizeStr = ' [' + fmt(cw.context_window_size) + ']';
    }

    // ---- model tier mapping (Claude -> DeepSeek) from settings.env ----
    const env = settings && settings.env || {};
    const modelTierMap = [
      { tier: 'Sonnet', ds: env.ANTHROPIC_DEFAULT_SONNET_MODEL_NAME },
      { tier: 'Opus',   ds: env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME },
      { tier: 'Haiku',  ds: env.ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME },
    ];
    const dsModelLower = shortModel.toLowerCase();
    const matchedTier = modelTierMap.find(function(m) { return m.ds && dsModelLower.includes(m.ds.toLowerCase()); });
    let modelLabel = shortModel;
    if (matchedTier) {
      modelLabel = matchedTier.tier + ' → ' + shortModel;
    }

    // ---- effort level (mapped: low/medium/high → high, xhigh/max → max) ----
    var effortLevel = info.effort && info.effort.level || '';
    var effortStr = '';
    if (effortLevel) {
      var efMap = effortLevel === 'max' || effortLevel === 'xhigh' ? 'max' : 'high';
      var ec = efMap === 'max' ? 31 : 32;
      effortStr = ' \x1b[' + ec + 'm⚡' + efMap + '\x1b[0m';
    }

    // ---- pricing ----
    let p = PRICING['deepseek-v4-flash'];
    for (var k in PRICING) {
      if (PRICING.hasOwnProperty(k)) {
        if (modelId.includes(k) || model.toLowerCase().includes(k)) { p = PRICING[k]; break; }
      }
    }

    // ---- context percentage (use remaining) ----
    let remPct = 100;
    if (cw.remaining_percentage != null) remPct = Math.round(cw.remaining_percentage);
    else if (cw.used_percentage != null) remPct = Math.round(100 - cw.used_percentage);

    // ---- context progress bar (10-seg) ----
    const usedPct = 100 - remPct;
    const filled = Math.min(10, Math.max(0, Math.round(usedPct / 10)));
    let bar = '';
    for (let i = 0; i < 10; i++) bar += i < filled ? '█' : '░';
    const barColor = usedPct > 80 ? 31 : usedPct > 50 ? 33 : 32;

    // ---- tokens (current turn) ----
    const cu = cw.current_usage || {};
    const tIn = cu.input_tokens || 0;
    const tCache = cu.cache_read_input_tokens || 0;
    const tOut = cu.output_tokens || 0;

    // ---- cumulative session cost (3-state dedup from Duroxi) ----
    const cache = readCache();
    const sess = cache.sessions[sid] || { in: 0, out: 0, cache: 0 };
    const prevIn = sess.in || 0, prevOut = sess.out || 0, prevCache = sess.cache || 0;

    const hasLast = '_lastIn' in sess;
    const inputChanged = !hasLast || tIn !== sess._lastIn || tCache !== sess._lastCache;
    const outputOnlyChanged = hasLast && !inputChanged && tOut !== sess._lastOut;

    if (inputChanged) {
      sess.in = prevIn + tIn;
      sess.out = prevOut + tOut;
      sess.cache = prevCache + tCache;
      sess.turns = (sess.turns || 0) + 1;
    } else if (outputOnlyChanged) {
      sess.out = prevOut + Math.max(0, tOut - (sess._lastOut || 0));
    }

    sess._lastIn = tIn; sess._lastOut = tOut; sess._lastCache = tCache;
    sess.ts = Date.now();
    cache.sessions[sid] = sess;

    // Auto-clean sessions older than 7 days
    const week = 7 * 86400 * 1000;
    for (var k2 in cache.sessions) {
      if (cache.sessions.hasOwnProperty(k2)) {
        if (Date.now() - (cache.sessions[k2].ts || 0) > week) delete cache.sessions[k2];
      }
    }
    writeCache(cache);

    const cost = (sess.in * p.input + sess.cache * p.cached + sess.out * p.output) / 1000000;

    // ---- cache hit rates ----
    const totalInput = sess.in + sess.cache;
    var sessionCacheRate = totalInput > 0 ? Math.round(sess.cache / totalInput * 100) : 0;
    // ---- total lifetime spending across all cached sessions ----
    let lifeCost = 0;
    for (var k3 in cache.sessions) {
      if (cache.sessions.hasOwnProperty(k3)) {
        var s = cache.sessions[k3];
        if (s && typeof s.in === 'number') {
          lifeCost += (s.in * p.input + s.cache * p.cached + s.out * p.output) / 1000000;
        }
      }
    }

    // ---- balance (persistent cache) ----
    const balanceStr = getBalance(env.ANTHROPIC_AUTH_TOKEN || '');

    // ---- project dir (try multiple sources) ----
    const projDir = info.workspace && info.workspace.project_dir || info.workspace && info.workspace.current_dir || info.cwd || process.cwd();
    const dirShort = projDir.replace(/\\/g, '/').split('/').filter(Boolean).slice(-2).join('/');

    // ---- session duration ----
    let dur = '';
    const durMs = info.cost && info.cost.total_duration_ms;
    if (durMs > 0) {
      const sec = Math.floor(durMs / 1000);
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
      dur = h > 0 ? h + 'h' + String(m).padStart(2, '0') + 'm' : m > 0 ? m + 'm' + String(s).padStart(2, '0') + 's' : s + 's';
    }

    // ---- git status ----
    const git = getGitStatus();
    let gitStr = '';
    if (git.branch) {
      gitStr = git.branch;
      if (git.untracked > 0) gitStr += '+' + git.untracked;
      if (git.modified) gitStr += '*';
    }

    // ---- responsive width ----
    const cols = parseInt(process.env.COLUMNS || '120', 10);

    // ===================================================================
    // Line 1: Environment & Project Info
    // [main+1*] project/src . Sonnet -> deepseek-v4-flash . bal . time
    // ===================================================================
    const line1Parts = [];

    if (gitStr) {
      line1Parts.push('\x1b[32m[' + gitStr + ']\x1b[0m');
    }

    if (dirShort) {
      line1Parts.push('\x1b[96m' + dirShort + '\x1b[0m');
    }

    line1Parts.push('\x1b[1;37m\u{1F916} ' + modelLabel + '\x1b[0m' + effortStr);

    if (balanceStr) {
      line1Parts.push('\x1b[93m\u{1F4B3} ' + balanceStr + '\x1b[0m');
    }

    if (dur) {
      line1Parts.push('\x1b[94m⏱ ' + dur + '\x1b[0m');
    }

    let line1 = line1Parts.join(' │ ');
    var line1Vis = line1.replace(/\x1b\[[0-9;]*m/g, '');
    if (line1Vis.length > cols) {
      line1 = line1.slice(0, cols + line1.length - line1Vis.length - 3) + '...';
    }

    // ===================================================================
    // Line 2: Context, Tokens & Cost
    // [bar] 80% [1.0M] . down 13.3K box 5.7M up 11.7K . session . total
    // ===================================================================
    const line2Parts = [];

    // [bar] 80% [1.0M]
    var barStr = '\x1b[' + barColor + 'm[' + bar + ']\x1b[0m \x1b[' + barColor + 'm' + remPct + '%\x1b[0m';
    if (ctxSizeStr) {
      barStr += '\x1b[90m' + ctxSizeStr + '\x1b[0m';
    }
    line2Parts.push(barStr);

    // down 13.3K box 5.7M(76%) up 11.7K
    var cacheHitStr = sessionCacheRate > 0 ? ' (' + sessionCacheRate + '%)' : '';
    line2Parts.push('\x1b[96m⬇ ' + fmt(sess.in) + '\x1b[0m \x1b[93m\u{1F4E6}' + fmt(sess.cache) + cacheHitStr + '\x1b[0m \x1b[95m⬆ ' + fmt(sess.out) + '\x1b[0m');

    // session cost
    line2Parts.push('\x1b[33m\u{1F4B0} ¥' + costStr(cost) + '\x1b[0m');

    // compact warning
    if (remPct <= 20) {
      var warnColor = remPct <= 10 ? 31 : 33;
      line2Parts.push('\x1b[' + warnColor + 'm⚠ compact\x1b[0m');
    }

    // turn counter
    var turns = sess.turns || 0;
    if (turns > 0) {
      line2Parts.push('\x1b[90m\u{1F4AC} ' + turns + '\x1b[0m');
    }

    // (turn cache rate removed - unreliable due to stdin interim states)

    // total lifetime (if more than session)
    if (lifeCost > 0) {
      line2Parts.push('\x1b[96m\u{1F4CA} ¥' + costStr(lifeCost) + '\x1b[0m');
    }

    let line2 = line2Parts.join(' │ ');
    var line2Vis = line2.replace(/\x1b\[[0-9;]*m/g, '');
    if (line2Vis.length > cols) {
      line2 = line2.slice(0, cols + line2.length - line2Vis.length - 3) + '...';
    }

    process.stdout.write('\r\x1b[K' + line1 + '\n\r\x1b[K' + line2 + '\n');
  } catch (e) {
    // silent
  }
});
