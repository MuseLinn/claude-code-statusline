#!/usr/bin/env node
// ============================================================================
// Claude Code Statusline — DeepSeek Edition
// Design: left→right narrative, semantic color, conditional activation,
//         TrueColor gradient bar, powerline-style separators
// ============================================================================

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const HOME = os.homedir();
const CFG = path.join(HOME, '.claude', 'settings.json');
const CACHE = path.join(HOME, '.claude', 'deepseek-cache.json');
const BAL_TTL = 5 * 60 * 1000;
const GIT_TTL = 3 * 1000;
const IO_MIN = 1500;
const NC = !!process.env.NO_COLOR || !!process.env.CLAUDE_CODE_NO_COLOR;

// ---- DeepSeek pricing (¥/1M tokens) -----------------------------------------
const PRICE = {
  'deepseek-v4-flash': { i: 1, c: 0.02, o: 2 },
  'deepseek-v4-pro':   { i: 3, c: 0.025, o: 6 },
};

// ---- Anthropic-inspired warm palette -----------------------------------------
const C = {
  git:    '38;5;108',   // sage green
  gitM:   '38;5;216',   // modified amber
  gitA:   '38;5;108',   // added green
  gitD:   '38;5;209',   // deleted rust
  gitR:   '38;5;109',   // renamed blue
  gitU:   '38;5;144',   // untracked grey
  dir:    '38;5;109',   // muted blue
  tierS:  '38;5;109',   // sonnet muted cyan
  tierO:  '38;5;216',   // opus warm peach
  tierH:  '38;5;108',   // haiku sage
  efHi:   '38;5;209',   // max effort rust
  efLo:   '38;5;108',   // high effort sage
  bag:    '38;5;229',   // cream text
  bbg:    '48;5;236',   // warm dark block bg
  sep:    '38;5;240',   // separator grey
  tIn:    '38;5;109',   // muted blue
  tOut:   '38;5;174',   // muted rose
  tCch:   '38;5;180',   // warm tan
  cost:   '38;5;216',   // warm amber
  bal:    '38;5;216',   // warm amber
  clock:  '38;5;144',   // warm grey
  muted:  '38;5;243',   // dim
  warn:   '38;5;209',   // rust
  add:    '38;5;108',   // sage
  del:    '38;5;174',   // muted rose
  prOk:   '38;5;108',
  prPend: '38;5;216',
  prChg:  '38;5;209',
  prDraft:'38;5;243',
  burn:   '38;5;144',
};

// ---- helpers -----------------------------------------------------------------
const Z = NC ? '' : '\x1b[0m';
const S = (c, s) => NC ? s : '\x1b[' + c + 'm' + s + Z;
const R = c => NC ? '' : '\x1b[' + c + 'm';
const vlen = s => s.replace(/\x1b\[[0-9;]*m/g, '').length;

function fnum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}
function fcny(n) {
  if (typeof n !== 'number' || isNaN(n)) return '0.00';
  if (n < 0.01) return n.toFixed(4);
  if (n < 1) return n.toFixed(3);
  return n.toFixed(2);
}
function pad(n, w) { return n.toString().padStart(w); }

// ---- TrueColor gradient: sage → amber → rust (Anthropic warm) ----------------
function rgb(r, g, b, s) { return NC ? s : '\x1b[38;2;' + r + ';' + g + ';' + b + 'm' + s + Z; }
function barGrad(pct) {
  const t = pct / 100;
  // sage green → warm amber → rust orange
  const r = Math.round(140 + t * 80);
  const g = Math.round(165 - t * 70);
  const b = Math.round(100 - t * 60);
  return [r, g, b];
}

// ---- I/O ---------------------------------------------------------------------
function rjson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function wjson(p, d) { try { fs.writeFileSync(p, JSON.stringify(d), 'utf8'); } catch {} }

// ---- WSL ---------------------------------------------------------------------
let _wsl = null;
function isWsl() {
  if (_wsl !== null) return _wsl;
  try { _wsl = fs.existsSync('/proc/version') && /microsoft|WSL/i.test(fs.readFileSync('/proc/version', 'utf8')); }
  catch { _wsl = false; }
  return _wsl;
}

// ---- cache -------------------------------------------------------------------
let _cache = null, _lw = 0;
function rcache() {
  if (_cache) return _cache;
  const c = rjson(CACHE);
  return _cache = (c && c.sessions) ? c : { sessions: {}, balance: '', balanceTs: 0 };
}
function wcache(c) {
  const n = Date.now();
  if (!c._forceWrite && n - _lw < IO_MIN) return;
  _lw = n; c._forceWrite = false;
  wjson(CACHE, c);
}

// ---- balance -----------------------------------------------------------------
let _bf = false;
function getBal(apiKey) {
  if (!apiKey || apiKey === 'PROXY_MANAGED') return '';
  const c = rcache();
  if (c.balance && c.balanceTs && Date.now() - c.balanceTs < BAL_TTL) return c.balance;
  const key = process.env.DEEP_SEEK_API_KEY_FOR_BALANCE || apiKey;
  if (!key || key === 'PROXY_MANAGED') return c.balance || '';
  if (_bf) return c.balance || '';
  _bf = true;
  require('https').get({
    hostname: 'api.deepseek.com', path: '/user/balance',
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + key }, timeout: 3000
  }, r => {
    let ck = []; r.on('data', d => ck.push(d)); r.on('end', () => {
      _bf = false;
      try {
        const b = JSON.parse(Buffer.concat(ck)).balance_infos?.[0]?.total_balance;
        if (b != null) { const c2 = rcache(); c2.balance = '¥' + parseFloat(b).toFixed(2); c2.balanceTs = Date.now(); c2._forceWrite = true; wcache(c2); }
      } catch {}
    });
  }).on('error', () => { _bf = false; }).end();
  return c.balance || '';
}

// ---- settings (once) ---------------------------------------------------------
let _st = undefined;
function sets() { return _st !== undefined ? _st : (_st = rjson(CFG) || {}); }

// ---- git ---------------------------------------------------------------------
let _gt = { ts: 0, data: null };
function getGit() {
  const n = Date.now();
  if (_gt.data && n - _gt.ts < GIT_TTL) return _gt.data;
  try {
    const cwd = process.cwd();
    const gf = path.join(cwd, '.git', 'HEAD');
    if (!fs.existsSync(gf)) return _gt = { ts: n, data: { branch: '', st: {} } }, _gt.data;
    const head = fs.readFileSync(gf, 'utf8').trim();
    const branch = head.startsWith('ref: refs/heads/') ? head.slice(16) : head.slice(0, 12);
    const raw = execSync('git status --porcelain', { encoding: 'utf8', timeout: 2000 });
    const st = { M: 0, A: 0, D: 0, R: 0, U: 0 };
    if (raw.trim()) {
      for (const l of raw.trim().split('\n')) {
        const x = l[0] || ' ', y = l[1] || ' ';
        if (x === '?' && y === '?') { st.U++; continue; }
        if (x === '!' || y === '!') continue;
        if (x === 'M' || y === 'M') st.M++;
        else if (x === 'A' || y === 'A') st.A++;
        else if (x === 'D' || y === 'D') st.D++;
        else if (x === 'R' || y === 'R') st.R++;
      }
    }
    return _gt = { ts: n, data: { branch, st } }, _gt.data;
  } catch {
    return _gt = { ts: n, data: { branch: '', st: {} } }, _gt.data;
  }
}

// ---- progress bar: 80-seg, TrueColor gradient --------------------------------
function bar(pct) {
  const B = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
  const u = Math.round(pct * 0.8), full = u >> 3, part = u & 7;
  const [r, g, b] = barGrad(pct);
  let out = '';
  for (let i = 0; i < 10; i++) {
    if (i < full) out += rgb(r, g, b, '█');
    else if (i === full && part) out += rgb(r, g, b, B[part]);
    else out += S('38;5;237', '░');
  }
  return out;
}

// ==============================================================================
// RENDER
// ==============================================================================
let buf = '';
process.stdin.on('data', c => buf += c);
process.stdin.on('end', () => {
  try {
    const I = JSON.parse(buf);
    const model = I.model?.display_name || '';
    const mid = I.model?.id || '';
    const sid = I.session_id || 'default';
    const cw = I.context_window || {};

    const env = sets().env || {};

    // ── model ───────────────────────────────────────────────────────────────
    const short = model.includes(',') ? model.split(',')[1].trim() : model.replace(/\[.*?\]/g, '').trim();
    const TM = [
      { t: 'Sonnet', d: env.ANTHROPIC_DEFAULT_SONNET_MODEL_NAME || env.ANTHROPIC_DEFAULT_SONNET_MODEL || '', c: C.tierS },
      { t: 'Opus',   d: env.ANTHROPIC_DEFAULT_OPUS_MODEL_NAME || env.ANTHROPIC_DEFAULT_OPUS_MODEL || '',     c: C.tierO },
      { t: 'Haiku',  d: env.ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME || env.ANTHROPIC_DEFAULT_HAIKU_MODEL || '',   c: C.tierH },
    ];
    const lo = short.toLowerCase();
    const tm = TM.find(m => m.d && m.d.toLowerCase().replace(/\[.*?\]/g, '').includes(lo));
    const tclr = tm ? tm.c : C.muted;
    const mlab = tm ? tm.t + ' → ' + short : short;

    // ── effort ──────────────────────────────────────────────────────────────
    const ef = I.effort?.level || '';
    const efTxt = ef ? S(ef === 'max' || ef === 'xhigh' ? C.efHi : C.efLo, ' ⚡' + (ef === 'max' || ef === 'xhigh' ? 'max' : 'high')) : '';

    // ── pricing ─────────────────────────────────────────────────────────────
    let p = PRICE['deepseek-v4-flash'];
    for (const k in PRICE) if (Object.hasOwn(PRICE, k) && (mid.includes(k) || model.toLowerCase().includes(k))) { p = PRICE[k]; break; }

    // ── context ─────────────────────────────────────────────────────────────
    let rem = 100;
    if (cw.remaining_percentage != null) rem = Math.round(cw.remaining_percentage);
    else if (cw.used_percentage != null) rem = Math.round(100 - cw.used_percentage);
    const used = 100 - rem;

    // ── tokens ──────────────────────────────────────────────────────────────
    const cu = cw.current_usage || {};
    const ti = cu.input_tokens || 0, tc = cu.cache_read_input_tokens || 0, to = cu.output_tokens || 0;

    // ── session ─────────────────────────────────────────────────────────────
    const cache = rcache();
    let s = cache.sessions[sid] || { in: 0, out: 0, cache: 0 };
    if (s.paid === undefined && (s.in || s.cache || s.out)) s.paid = (s.in * p.i + s.cache * p.c + s.out * p.o) / 1e6;
    if (s.paid === undefined) s.paid = 0;
    const pi = s.in || 0, po = s.out || 0, pc = s.cache || 0;
    const hl = '_lastIn' in s;
    const ic = !hl || ti !== s._lastIn || tc !== s._lastCache;
    const oc = hl && !ic && to !== s._lastOut;
    const dtIn = hl ? Math.max(0, ti - (s._lastIn || 0)) : ti;
    const dtOut = hl ? Math.max(0, to - (s._lastOut || 0)) : to;
    const dtCache = hl ? Math.max(0, tc - (s._lastCache || 0)) : tc;

    if (ic) {
      s.in = pi + ti; s.out = po + to; s.cache = pc + tc;
      s.turns = (s.turns || 0) + 1;
      s.paid = (s.paid || 0) + (ti * p.i + tc * p.c + to * p.o) / 1e6;
    } else if (oc) {
      const d = Math.max(0, to - (s._lastOut || 0));
      s.out = po + d; s.paid = (s.paid || 0) + (d * p.o) / 1e6;
    }
    s._lastIn = ti; s._lastOut = to; s._lastCache = tc; s.ts = Date.now();
    cache.sessions[sid] = s;
    const wk = 7 * 864e5;
    for (const k in cache.sessions) if (Object.hasOwn(cache.sessions, k) && Date.now() - (cache.sessions[k].ts || 0) > wk) delete cache.sessions[k];
    wcache(cache);

    const sessCost = s.paid || 0;
    const turnCost = (ti * p.i + tc * p.c + to * p.o) / 1e6;
    const cr = (s.in + s.cache) > 0 ? (s.cache / (s.in + s.cache) * 100).toFixed(1) : '0.0';
    const turns = s.turns || 0;

    const bal = getBal(env.ANTHROPIC_AUTH_TOKEN || '');

    // ── dir ─────────────────────────────────────────────────────────────────
    const raw = I.workspace?.project_dir || I.workspace?.current_dir || I.cwd || process.cwd();
    let dir;
    // Normalize to forward slashes
    const np = raw.replace(/\\/g, '/');
    if (np.startsWith(HOME.replace(/\\/g, '/'))) {
      dir = '~' + np.slice(HOME.replace(/\\/g, '/').length);
      if (dir === '~') dir = '~';
    } else if (isWsl() && np.startsWith('/home/')) {
      const t = np.split('/').filter(Boolean);
      dir = '~' + (t[1] || '') + (t.length > 3 ? '/' + t.slice(3).join('/') : '');
    } else if (isWsl() && np.startsWith('/mnt/')) {
      dir = 'win:' + np.replace('/mnt/', '').replace('/', ':/').split('/').filter(Boolean).slice(-2).join('/');
    } else {
      dir = np.split('/').filter(Boolean).slice(-2).join('/');
    }
    // Truncate very long segments
    dir = dir.split('/').map(s => s.length > 24 ? s.slice(0, 22) + '…' : s).join('/');

    // ── duration ────────────────────────────────────────────────────────────
    let dur = '';
    const dm = I.cost?.total_duration_ms;
    if (dm > 0) {
      const ss = Math.floor(dm / 1000), h = Math.floor(ss / 3600), m = Math.floor((ss % 3600) / 60), s2 = ss % 60;
      dur = h > 0 ? h + 'h' + pad(m, 2) + 'm' : m > 0 ? m + 'm' + pad(s2, 2) + 's' : s2 + 's';
    }

    // ── clock ───────────────────────────────────────────────────────────────
    const now = new Date();
    const clock = pad(now.getHours(), 2) + ':' + pad(now.getMinutes(), 2);

    // ── git (bg block, Anthropic warm) ──────────────────────────────────────
    const git = getGit();
    let gitTag = '';
    if (git.branch) {
      const st = git.st;
      const dirty = st.M || st.A || st.D || st.R || st.U;
      let content = git.branch;
      if (dirty) {
        const parts = [];
        if (st.M) parts.push(S(C.gitM, pad(st.M, 1) + 'M'));
        if (st.A) parts.push(S(C.gitA, pad(st.A, 1) + 'A'));
        if (st.D) parts.push(S(C.gitD, pad(st.D, 1) + 'D'));
        if (st.R) parts.push(S(C.gitR, pad(st.R, 1) + 'R'));
        if (st.U) parts.push(S(C.gitU, pad(st.U, 1) + 'N'));
        content += ' ' + parts.join(S(C.muted, '·'));
      }
      // background block: warm dark bg + sage green text
      gitTag = R(C.bbg) + S(C.git, ' ' + content + ' ') + Z;
    }

    // ── conditionals ────────────────────────────────────────────────────────
    // Vim mode
    const vim = I.vim?.mode || '';
    const vimTag = vim ? S(C.muted, ' ' + vim.toLowerCase()) : '';

    // Worktree
    const wt = I.worktree?.name || '';
    const wtTag = wt ? S(C.muted, ' wt:' + wt) : '';

    // PR
    let prTag = '';
    if (I.pr?.number) {
      let clr = C.prPend;
      if (I.pr.review_state === 'approved') clr = C.prOk;
      else if (I.pr.review_state === 'changes_requested') clr = C.prChg;
      else if (I.pr.review_state === 'draft') clr = C.prDraft;
      prTag = S(clr, ' PR#' + I.pr.number + (I.pr.review_state ? ' ' + I.pr.review_state : ''));
    }

    // Code churn
    const added = I.cost?.total_lines_added || 0;
    const removed = I.cost?.total_lines_removed || 0;
    let churn = '';
    if (added > 0 || removed > 0) {
      churn = (added > 0 ? S(C.add, '+' + added) : '') + (added > 0 && removed > 0 ? S(C.muted, '/') : '') + (removed > 0 ? S(C.del, '-' + removed) : '');
    }

    // Note: burn rate removed — per-turn cost ¥x.xxxx is more reliable
    // than a short-window estimate that spikes after idle periods.

    // ── width ───────────────────────────────────────────────────────────────
    const col = parseInt(process.env.COLUMNS || '120', 10);
    const SEP = S(C.sep, '│');

    // ═════════════════════════════════════════════════════════════════════════
    // LINE 1
    // ═════════════════════════════════════════════════════════════════════════
    const L1l = []; // left
    if (gitTag)   L1l.push(gitTag + wtTag + prTag);
    if (dir)      L1l.push(S(C.dir, dir));

    // model badge (padding inside bg, no extra spaces leaked)
    const badge = R(C.bbg) + R(C.bag) + ' ' + mlab + ' ' + Z;
    L1l.push(S(tclr, badge) + efTxt + vimTag);

    const L1r = []; // right
    if (bal)      L1r.push(S(C.bal, bal));
    L1r.push(S(C.clock, clock));
    if (dur)      L1r.push(S(C.muted, dur));

    let line1 = L1l.concat(L1r).join(SEP);
    if (vlen(line1) > col) {
      // collapse: git + model + right
      const fb = L1l.concat(L1r.slice(-2));
      line1 = fb.join(SEP);
      if (vlen(line1) > col) line1 = line1.slice(0, Math.max(0, col + line1.length - vlen(line1) - 2)) + '…';
    }

    // ═════════════════════════════════════════════════════════════════════════
    // LINE 2
    // ═════════════════════════════════════════════════════════════════════════
    const L2 = [];

    // Progress: ▐████▌░░░░░▌ 73%
    const prog = S('38;5;240', '▐') + bar(used) + S('38;5;240', '▌') + ' ' + (() => {
      const [r, g, b] = barGrad(used);
      return rgb(r, g, b, pad(rem, 3) + '%');
    })();
    const ctxWarn = rem <= 15 ? S(C.warn, ' ⚠') : '';
    L2.push(prog + ctxWarn);

    // Tokens: cumulative + per-turn delta for each
    let tks = S(C.tIn, '↓' + fnum(s.in));
    if (dtIn > 0) tks += S(C.muted, '(+' + fnum(dtIn) + ')');
    if (pc > 0) {
      tks += ' ' + S(C.tCch, '📦' + fnum(pc) + ' ' + cr + '%');
      if (dtCache > 0) tks += S(C.muted, '(+' + fnum(dtCache) + ')');
    }
    tks += ' ' + S(C.tOut, '↑' + fnum(s.out));
    if (dtOut > 0) tks += S(C.muted, '(+' + fnum(dtOut) + ')');
    L2.push(tks);

    // Turn cost
    L2.push(S(C.cost, '¥' + fcny(turnCost)));

    // Turns
    if (turns > 0) L2.push(S(C.muted, '#' + turns));

    // Total
    if (sessCost > 0.001) L2.push(S(C.muted, 'Total ¥' + fcny(sessCost)));

    // Churn
    if (churn) L2.push(churn);
    let line2 = L2.join(SEP);
    if (vlen(line2) > col) {
      // drop churn, then total
      const fb = [L2[0], L2[1], L2[2]];
      if (L2[3]) fb.push(L2[3]);
      line2 = fb.join(SEP);
      if (vlen(line2) > col) {
        const fb2 = [L2[0], L2[1], L2[2]];
        line2 = fb2.join(SEP);
        if (vlen(line2) > col) line2 = line2.slice(0, Math.max(0, col + line2.length - vlen(line2) - 2)) + '…';
      }
    }

    process.stdout.write('\r\x1b[K' + line1 + '\n\r\x1b[K' + line2 + '\n');
  } catch (e) {
    // silent
  }
});
