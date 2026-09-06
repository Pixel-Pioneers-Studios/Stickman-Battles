'use strict';

// ============================================================
// Stickman Evolution — Relay + Moderation API Server
//
// Runs two services on the same port:
//   1. Socket.io relay — relays playerState / hitEvent / gameEvent
//      between peers in named rooms (unchanged from original).
//   2. REST API       — persistent cross-device ban storage so
//      admin bans survive across sessions and work on any device.
//
// Environment variables:
//   PORT        Server port (default 3001)
//   ADMIN_SESSION_SECRET  Secret used to sign short-lived admin sessions.
//   ADMIN_EMAILS          Comma-separated Supabase emails allowed as admins.
//   SUPABASE_URL          Supabase project URL.
//   SUPABASE_ANON_KEY     Supabase publishable/anon key for user verification.
//   SUPABASE_SERVICE_ROLE_KEY Supabase service key used for reward writes.
//   REWARD_COOLDOWN_MS    Minimum delay between distinct reward claims.
//   REWARD_MAX_COINS      Maximum coins granted by one claim.
//   REWARD_MAX_BALANCE    Hard upper bound for the stored coin balance.
//
// REST Endpoints:
//   GET    /api/status                       — health check
//   GET    /api/bans                         — list all active bans
//   GET    /api/bans/check?accountId=&...    — check if identity is banned
//   POST   /api/bans           [admin]       — add a ban record
//   DELETE /api/bans/:key      [admin]       — remove a ban by key
//   DELETE /api/bans           [admin]       — bulk remove by identity (body)
//   POST   /api/rewards/claim  [user]        — claim match/story rewards
//   POST   /api/sovereign/memory/commit [user] — persist Sovereign MK2 matchup priors
//   GET    /api/live-config                  — live ops configuration (public)
//   POST   /api/live-config    [admin]       — update live ops config
//   GET    /api/admin/overrides [admin]      — list server-side admin grants/revokes
//   POST   /api/admin/overrides [admin]      — grant or revoke admin for an account ID
//   DELETE /api/admin/overrides/:id [admin] — remove an admin override
//
//   GET    /admin/state        [admin]       — server runtime stats
//   GET    /admin/logs         [admin]       — recent admin action log entries
//   POST   /admin/player-action[admin]       — broadcast a player action via socket.io
//   POST   /admin/broadcast    [admin]       — push announcement to all clients
//   POST   /admin/command      [admin]       — dispatch server-side commands
//
// Data is persisted via storage.js (SQLite by default, in-memory fallback).
// ============================================================

const { createServer } = require('http');
const { Server }       = require('socket.io');
const fs               = require('fs');
const path             = require('path');
const mime             = require('mime-types');
const crypto           = require('crypto');
const storage          = require('./storage');

const STATIC_ROOT = __dirname;

// Paths under STATIC_ROOT that must never be served to the browser.
// Matched against the URL path with a leading slash, case-insensitively.
const PRIVATE_PATH_PATTERNS = [
  /^\/(?:server|storage)\.js$/i,          // server source
  /^\/package(?:-lock)?\.json$/i,
  /^\/render\.yaml$/i,
  /^\/Procfile$/i,
  /\.(?:db|sqlite3?|env|log|pem|key)$/i,  // databases, env files, credentials
  /^\/\./,                                // dotfiles: .env, .git, .DS_Store
  /^\/(?:node_modules|supabase|data|docs|tools|replays)\//i,
  /^\/(?:stickman-roblox|Stickman-Battles-3d)\//i,
  /\.(?:md|smbreplay)$/i,                 // design docs, replay captures
];

function _isPrivatePath(urlPath) {
  return PRIVATE_PATH_PATTERNS.some(re => re.test(urlPath));
}

const PORT = process.env.PORT || 3001;
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_KEY || '';
const ADMIN_SESSION_TTL_MS = Math.max(5 * 60 * 1000, Number(process.env.ADMIN_SESSION_TTL_MS || 30 * 60 * 1000));
const ADMIN_EMAILS = new Set(String(process.env.ADMIN_EMAILS || 'gupta.aarush2018@gmail.com')
  .split(',')
  .map(v => v.trim().toLowerCase())
  .filter(Boolean));
const ADMIN_BOOTSTRAP_KEY = process.env.ADMIN_BOOTSTRAP_KEY || '';
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REWARD_COOLDOWN_MS = Math.max(1000, Number(process.env.REWARD_COOLDOWN_MS || 10000));
const REWARD_MAX_COINS = Math.max(1, Number(process.env.REWARD_MAX_COINS || 500));
const REWARD_MAX_BALANCE = Math.max(1000, Number(process.env.REWARD_MAX_BALANCE || 999999));
const REWARD_ALLOWED_UNLOCKS = new Set([
  'bossBeaten',
  'trueform',
  'megaknight',
  'sovereignBeaten',
  'storyOnline',
  'tfEndingSeen',
  'damnationScar',
  'storyDodgeUnlocked',
  'paradoxCompanion',
  'interTravel',
  'patrolMode',
  'godEncountered',
  'godDefeated',
]);
const REWARD_ALLOWED_TYPES = new Set(['match', 'chapter', 'story']);
const ALLOWED_ORIGINS = new Set(String(process.env.ALLOWED_ORIGINS || 'https://stickman-battles.onrender.com,http://localhost:3001,http://localhost:5173,http://127.0.0.1:3001')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean));
// CrazyGames serves games and its apps from many hosts: the game-files CDN, the
// regional portals (crazygames.fr, crazygames.com.br, ...) and the mobile apps.
// https://docs.crazygames.com/resources/html5/sitelock/
const CRAZYGAMES_ORIGIN = /^(?:https:\/\/(?:[a-z0-9-]+\.)*crazygames\.(?:com|com\.[a-z]{2}|co\.[a-z]{2}|[a-z]{2,3})|capacitor:\/\/app\.crazygames\.com)$/i;
// Portal origins that iframe the game from their own CDN. Newgrounds serves
// HTML5 uploads from uploads.ungrounded.net; Game Jolt from gamejolt.net.
const PORTAL_ORIGINS = [
  /^https:\/\/(?:[a-z0-9-]+\.)?ungrounded\.net$/i,
  /^https:\/\/(?:[a-z0-9-]+\.)?newgrounds\.com$/i,
  /^https:\/\/(?:[a-z0-9-]+\.)?gamejolt\.net$/i,
  /^https:\/\/(?:[a-z0-9-]+\.)?gamejolt\.com$/i,
];
const BUILD_VERSION = process.env.RENDER_GIT_COMMIT || process.env.npm_package_version || 'dev';

if (!ADMIN_SESSION_SECRET || ADMIN_SESSION_SECRET.length < 32) {
  console.warn('[SECURITY] ADMIN_SESSION_SECRET is missing or too short. Set a 32+ character secret before production deploy.');
}

// ── Admin action log buffer ───────────────────────────────────────────────────
// In-memory ring buffer. Entries: { ts, level, msg, meta? }
const _adminLogBuf = [];
const _MAX_ADMIN_LOGS = 500;

function _pushAdminLog(level, msg, meta) {
  const entry = { ts: Date.now(), level: String(level), msg: String(msg) };
  if (meta) entry.meta = meta;
  _adminLogBuf.push(entry);
  if (_adminLogBuf.length > _MAX_ADMIN_LOGS) _adminLogBuf.shift();
}

function _logRequest(req, status, ms) {
  const ip = _clientIp(req);
  console.log(`[HTTP] ${status} ${req.method} ${req.url} ${ms}ms ip=${ip}`);
}

// ── Socket metadata registry ──────────────────────────────────────────────────
// socketId → { accountId, username, peerId, deviceId, roomCode }
const _socketMeta = new Map();

// ── Data persistence ─────────────────────────────────────────────────────────
// Reads/writes go through storage.js (SQLite, or in-memory fallback).
// The old data/bans.json file is no longer used.

function _loadBans() {
  return storage.get('bans') || { records: {}, lastModified: Date.now() };
}

function _saveBans(data) {
  data.lastModified = Date.now();
  storage.set('bans', data);
}

function _loadAdminOverrides() {
  return storage.get('adminOverrides') || { overrides: {} };
}

function _saveAdminOverrides(data) {
  storage.set('adminOverrides', data);
}

// Removes expired records in-place. Returns true if any were removed.
function _trimExpiredBans(data) {
  const now = Date.now();
  let changed = false;
  for (const key of Object.keys(data.records)) {
    const rec = data.records[key];
    if (rec && rec.expiresAt && rec.expiresAt <= now) {
      delete data.records[key];
      changed = true;
    }
  }
  return changed;
}

// Checks whether a ban record matches a client identity object.
function _recordMatchesIdentity(rec, id) {
  if (!rec || !id) return false;
  if (rec.expiresAt && rec.expiresAt <= Date.now()) return false;
  const acc  = String(id.accountId || '');
  const peer = String(id.peerId    || '');
  const dev  = String(id.deviceId  || '');
  const user = String(id.username  || '').toLowerCase();
  return (
    (rec.accountId && acc  && String(rec.accountId) === acc)  ||
    (rec.peerId    && peer && String(rec.peerId)    === peer) ||
    (rec.deviceId  && dev  && String(rec.deviceId)  === dev)  ||
    (!rec.accountId && !rec.peerId && !rec.deviceId &&
     rec.username && user && String(rec.username).toLowerCase() === user)
  );
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function _originAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin) || CRAZYGAMES_ORIGIN.test(origin)) return true;
  return PORTAL_ORIGINS.some(re => re.test(origin));
}

function _securityHeaders(req, res) {
  const origin = req.headers.origin || '';
  if (_originAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || 'null');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Session');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // No X-Frame-Options: it cannot express an allowlist, and game portals embed
  // the game in an iframe. Framing is restricted via CSP frame-ancestors below.
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://esm.sh https://cdnjs.cloudflare.com https://unpkg.com https://www.youtube.com https://sdk.crazygames.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "media-src 'self'",
    "connect-src 'self' https://*.supabase.co https://esm.sh https://*.peerjs.com wss: https: http://localhost:11434 http://127.0.0.1:11434",
    "frame-src https://www.youtube.com",
    "frame-ancestors 'self' https://crazygames.com https://*.crazygames.com https://*.crazygames.fr https://*.crazygames.pl https://*.crazygames.com.br https://*.crazygames.jp https://*.crazygames.co.kr https://app.crazygames.com capacitor://app.crazygames.com https://itch.io https://*.itch.io https://*.itch.zone https://newgrounds.com https://*.newgrounds.com",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));
}

function _json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

// Reads the request body as JSON. Resolves to {} on parse failure.
function _readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 512 * 1024) reject(new Error('Request body too large'));
    });
    req.on('end',   () => { try { resolve(JSON.parse(raw)); } catch (_) { resolve({}); } });
    req.on('error', reject);
  });
}

function _clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim() || 'unknown';
}

const _rateBuckets = new Map();
function _rateLimit(req, key, limit, windowMs) {
  const now = Date.now();
  const bucketKey = `${key}:${_clientIp(req)}`;
  const bucket = _rateBuckets.get(bucketKey) || { count: 0, reset: now + windowMs };
  if (bucket.reset <= now) {
    bucket.count = 0;
    bucket.reset = now + windowMs;
  }
  bucket.count += 1;
  _rateBuckets.set(bucketKey, bucket);
  return bucket.count <= limit;
}

function _b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function _tryJson(value) {
  if (value === null || value === undefined) return null;
  try { return JSON.parse(JSON.stringify(value)); } catch (e) { return null; }
}

function _clampInt(value, min, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function _cleanInt(value, min, max) {
  const n = _clampInt(value, min, max);
  return n === null ? null : n;
}

function _rewardAudit(type, msg, meta) {
  _pushAdminLog(type, msg, meta);
  if (/REJECT|FAIL|ERROR|COOLDOWN/i.test(String(type || '')) && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    void _supabaseInsert('suspicious_activity', {
      user_id: meta && meta.userId ? meta.userId : null,
      event_type: String(type).slice(0, 80),
      details: Object.assign({ message: msg }, meta || {}),
    }).catch(() => {});
  }
}

function _signAdminSession(payload) {
  const body = _b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function _parseAdminSession(token) {
  if (!ADMIN_SESSION_SECRET || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', ADMIN_SESSION_SECRET).update(body).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload || payload.role !== 'admin' || payload.exp <= Date.now()) return null;
  if (!ADMIN_EMAILS.has(String(payload.email || '').toLowerCase())) return null;
  return payload;
}

function _adminSessionFromReq(req) {
  const auth = String(req.headers.authorization || '');
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  return bearer || String(req.headers['x-admin-session'] || '').trim();
}

function _isAdmin(req) {
  try {
    const session = _parseAdminSession(_adminSessionFromReq(req));
    if (session) {
      req.adminSession = session;
      return true;
    }
  } catch (e) {}
  _pushAdminLog('AUTH_FAIL', `Admin auth failed for ${req.method} ${req.url}`, { ip: _clientIp(req) });
  return false;
}

async function _verifySupabaseUser(accessToken) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Supabase verification is not configured');
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!resp.ok) throw new Error('Invalid Supabase session');
  return resp.json();
}

function _supabaseHeaders({ service = false, bearer = null } = {}) {
  const key = service ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return null;
  return {
    apikey: key,
    Authorization: `Bearer ${bearer || key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function _supabaseRequest(method, path, body, opts) {
  const headers = _supabaseHeaders(opts || {});
  if (!headers) throw new Error('Supabase service access is not configured');
  const init = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, init);
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!resp.ok) {
    const err = new Error(`Supabase ${method} ${path} failed: ${resp.status}`);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function _supabaseSelect(table, query, opts) {
  const headers = _supabaseHeaders(opts || {});
  if (!headers) throw new Error('Supabase service access is not configured');
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const resp = await fetch(url, { method: 'GET', headers });
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!resp.ok) {
    const err = new Error(`Supabase GET ${table} failed: ${resp.status}`);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function _supabaseUpsert(table, body, onConflict, opts) {
  const headers = _supabaseHeaders(opts || {});
  if (!headers) throw new Error('Supabase service access is not configured');
  headers.Prefer = 'resolution=merge-duplicates,return=representation';
  const query = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!resp.ok) {
    const err = new Error(`Supabase upsert ${table} failed: ${resp.status}`);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function _supabaseInsert(table, body, opts) {
  const headers = _supabaseHeaders(opts || {});
  if (!headers) throw new Error('Supabase service access is not configured');
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!resp.ok && resp.status !== 409) {
    const err = new Error(`Supabase insert ${table} failed: ${resp.status}`);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function _supabaseDelete(table, query, opts) {
  const headers = _supabaseHeaders(opts || {});
  if (!headers) throw new Error('Supabase service access is not configured');
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`, {
    method: 'DELETE',
    headers,
  });
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!resp.ok) {
    const err = new Error(`Supabase delete ${table} failed: ${resp.status}`);
    err.status = resp.status;
    err.data = data;
    throw err;
  }
  return data;
}

function _emptySovereignActionCounts() {
  return {
    attack: 0,
    shield: 0,
    jump: 0,
    dodge: 0,
    idle: 0,
    edge: 0,
    melee: 0,
    ranged: 0,
  };
}

function _emptySovereignContextCounts() {
  return { grounded: 0, airborne: 0, edge: 0 };
}

function _emptySovereignPunishStats() {
  return {
    direct:  { hits: 0, escapes: 0 },
    crossup: { hits: 0, escapes: 0 },
    delayed: { hits: 0, escapes: 0 },
  };
}

function _emptySovereignSourceCounts() {
  return { human: 0, self_play: 0, replay: 0 };
}

function _mergeSovereignCounts(target, source) {
  const out = target || {};
  if (!source) return out;
  for (const [key, value] of Object.entries(source)) {
    out[key] = (Number(out[key]) || 0) + (Number(value) || 0);
  }
  return out;
}

function _mergeSovereignPunishStats(target, source) {
  const out = target || _emptySovereignPunishStats();
  if (!source) return out;
  for (const route of ['direct', 'crossup', 'delayed']) {
    const row = out[route] || { hits: 0, escapes: 0 };
    const add = source[route] || {};
    row.hits = (Number(row.hits) || 0) + (Number(add.hits) || 0);
    row.escapes = (Number(row.escapes) || 0) + (Number(add.escapes) || 0);
    out[route] = row;
  }
  return out;
}

function _mergeSovereignSourceCounts(target, source) {
  const out = target || _emptySovereignSourceCounts();
  if (!source) return out;
  for (const [key, value] of Object.entries(source)) {
    out[key] = (Number(out[key]) || 0) + (Number(value) || 0);
  }
  return out;
}

function _cloneJson(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch (e) { return null; }
}

function _normalizeSovereignRow(row) {
  const out = _cloneJson(row) || {};
  out.bucket_key = String(out.bucket_key || '').trim();
  out.bucket_type = String(out.bucket_type || '').trim();
  out.bucket_value = String(out.bucket_value || 'unknown').trim();
  out.sample_count = Math.max(0, Math.floor(Number(out.sample_count) || 0));
  out.win_count = Math.max(0, Math.floor(Number(out.win_count) || 0));
  out.loss_count = Math.max(0, Math.floor(Number(out.loss_count) || 0));
  out.action_counts = _mergeSovereignCounts(_emptySovereignActionCounts(), out.action_counts);
  out.context_counts = _mergeSovereignCounts(_emptySovereignContextCounts(), out.context_counts);
  out.punish_stats = _mergeSovereignPunishStats(_emptySovereignPunishStats(), out.punish_stats);
  out.tendency_stats = _mergeSovereignCounts({}, out.tendency_stats);
  out.source_counts = _mergeSovereignSourceCounts(_emptySovereignSourceCounts(), out.source_counts);
  out.last_summary = _cloneJson(out.last_summary) || {};
  out.updated_at = out.updated_at || new Date().toISOString();
  return out;
}

function _sourceKindFromRow(row, fallback) {
  const summary = row && row.last_summary && typeof row.last_summary === 'object' ? row.last_summary : null;
  const source = String(summary && summary.source || fallback || 'human').toLowerCase();
  if (source === 'self_play') return 'self_play';
  if (source === 'replay') return 'replay';
  return 'human';
}

function _buildSovereignSourceCounts(row, fallback) {
  const kind = _sourceKindFromRow(row, fallback);
  const out = _emptySovereignSourceCounts();
  out[kind] += 1;
  const summary = row && row.last_summary && typeof row.last_summary === 'object' ? row.last_summary : null;
  if (summary && summary.replayMeta) out.replay += 1;
  return out;
}

function _mergeSovereignMemoryRow(existing, incoming, fallbackSource) {
  const base = _normalizeSovereignRow(existing);
  const add = _normalizeSovereignRow(incoming);
  const sourceCounts = _buildSovereignSourceCounts(add, fallbackSource);
  return {
    bucket_key: add.bucket_key || base.bucket_key,
    bucket_type: add.bucket_type || base.bucket_type,
    bucket_value: add.bucket_value || base.bucket_value,
    sample_count: (Number(base.sample_count) || 0) + (Number(add.sample_count) || 0),
    win_count: (Number(base.win_count) || 0) + (Number(add.win_count) || 0),
    loss_count: (Number(base.loss_count) || 0) + (Number(add.loss_count) || 0),
    action_counts: _mergeSovereignCounts(base.action_counts, add.action_counts),
    context_counts: _mergeSovereignCounts(base.context_counts, add.context_counts),
    punish_stats: _mergeSovereignPunishStats(base.punish_stats, add.punish_stats),
    tendency_stats: _mergeSovereignCounts(base.tendency_stats, add.tendency_stats),
    source_counts: _mergeSovereignSourceCounts(base.source_counts, sourceCounts),
    last_summary: add.last_summary || base.last_summary || {},
    updated_at: new Date().toISOString(),
  };
}

function _defaultRewardSave() {
  return {
    version: 3,
    coins: 0,
    chapter: 0,
    cosmetics: [],
    achievements: [],
    unlocks: {
      bossBeaten: false,
      trueform: false,
      megaknight: false,
      letters: [],
      achievements: [],
      sovereignBeaten: false,
      storyOnline: false,
      tfEndingSeen: false,
      damnationScar: false,
      storyDodgeUnlocked: false,
      paradoxCompanion: false,
      interTravel: false,
      patrolMode: false,
      godEncountered: false,
      godDefeated: false,
    },
    storyProgress: { act: 0, chapter: 0, flags: {} },
    progression: {},
    settings: { sfxVol: 0.35, sfxMute: false, musicMute: false, ragdoll: false },
    story: { chapter: 0, defeated: [] },
    meta: { updatedAt: Date.now(), source: 'cloud' },
  };
}

function _normalizeRewardSave(raw) {
  const out = _defaultRewardSave();
  const src = _tryJson(raw) || {};
  if (typeof src.version === 'number') out.version = src.version;
  if (typeof src.coins === 'number') out.coins = Math.max(0, Math.min(REWARD_MAX_BALANCE, Math.floor(src.coins)));
  if (typeof src.chapter === 'number') out.chapter = Math.max(0, Math.floor(src.chapter));
  if (Array.isArray(src.cosmetics)) out.cosmetics = Array.from(new Set(src.cosmetics.map(v => String(v))));
  if (Array.isArray(src.achievements)) out.achievements = Array.from(new Set(src.achievements.map(v => String(v))));
  if (src.unlocks && typeof src.unlocks === 'object') {
    for (const key of Object.keys(src.unlocks)) {
      if (REWARD_ALLOWED_UNLOCKS.has(key)) out.unlocks[key] = !!src.unlocks[key];
    }
    if (Array.isArray(src.unlocks.letters)) out.unlocks.letters = Array.from(new Set(src.unlocks.letters.map(v => String(v))));
    if (Array.isArray(src.unlocks.achievements)) out.unlocks.achievements = Array.from(new Set(src.unlocks.achievements.map(v => String(v))));
  }
  if (src.storyProgress && typeof src.storyProgress === 'object') {
    out.storyProgress.act = Math.max(0, Math.floor(Number(src.storyProgress.act) || 0));
    out.storyProgress.chapter = Math.max(0, Math.floor(Number(src.storyProgress.chapter) || 0));
    out.storyProgress.flags = Object.assign({}, src.storyProgress.flags || {});
  }
  if (src.story && typeof src.story === 'object') {
    out.story.chapter = Math.max(0, Math.floor(Number(src.story.chapter) || 0));
    if (Array.isArray(src.story.defeated)) {
      out.story.defeated = Array.from(new Set(src.story.defeated.map(v => Math.max(0, Math.floor(Number(v) || 0)))));
    }
  }
  if (src.progression && typeof src.progression === 'object') out.progression = _tryJson(src.progression) || {};
  if (src.settings && typeof src.settings === 'object') out.settings = Object.assign({}, out.settings, _tryJson(src.settings) || {});
  if (src.meta && typeof src.meta === 'object') out.meta = Object.assign({}, out.meta, _tryJson(src.meta) || {});
  if (typeof out.story.chapter !== 'number') out.story.chapter = out.chapter;
  if (typeof out.storyProgress.chapter !== 'number') out.storyProgress.chapter = out.chapter;
  if (typeof out.meta.updatedAt !== 'number') out.meta.updatedAt = Date.now();
  return out;
}

function _mergeRewardDelta(save, reward, currentChapter) {
  const out = _normalizeRewardSave(save);
  const deltaCoins = _cleanInt(reward && reward.coins, 0, REWARD_MAX_COINS);
  if (deltaCoins === null) throw new Error('Invalid coin reward');
  const totalCoins = out.coins + deltaCoins;
  if (totalCoins > REWARD_MAX_BALANCE) throw new Error('Coin balance would exceed maximum');
  out.coins = totalCoins;

  const chapterAdvance = reward && reward.chapterAdvance !== undefined ? _cleanInt(reward.chapterAdvance, 0, 1) : 0;
  const targetChapter = reward && reward.chapterTarget !== undefined
    ? _cleanInt(reward.chapterTarget, 0, 9999)
    : null;
  if (targetChapter !== null && targetChapter < 0) throw new Error('Invalid chapter target');
  let nextChapter = out.chapter;
  if (chapterAdvance) {
    nextChapter = currentChapter + chapterAdvance;
    if (chapterAdvance > 1) throw new Error('Chapter advance too large');
    if (nextChapter > currentChapter + 1) throw new Error('Chapter progression skipped ahead');
  } else if (targetChapter !== null) {
    if (targetChapter !== currentChapter + 1 && targetChapter !== currentChapter) {
      throw new Error('Chapter progression out of order');
    }
    nextChapter = Math.max(nextChapter, targetChapter);
  }
  if (nextChapter > out.chapter) {
    out.chapter = nextChapter;
    out.story.chapter = nextChapter;
    out.storyProgress.chapter = nextChapter;
    if (!Array.isArray(out.story.defeated)) out.story.defeated = [];
    if (out.story.defeated.indexOf(nextChapter) === -1) out.story.defeated.push(nextChapter);
    out.story.defeated.sort(function(a, b) { return a - b; });
  }

  const unlocks = reward && reward.unlocks && typeof reward.unlocks === 'object' ? reward.unlocks : null;
  if (unlocks) {
    for (const key of Object.keys(unlocks)) {
      if (!REWARD_ALLOWED_UNLOCKS.has(key)) throw new Error('Unknown unlock key: ' + key);
      if (typeof unlocks[key] !== 'boolean') throw new Error('Unlock flags must be boolean');
      if (unlocks[key]) out.unlocks[key] = true;
    }
  }

  const cosmetics = reward && Array.isArray(reward.cosmetics) ? reward.cosmetics : [];
  if (cosmetics.length > 0) {
    const merged = new Set(out.cosmetics);
    cosmetics.forEach(c => merged.add(String(c)));
    out.cosmetics = Array.from(merged);
  }

  const achievements = reward && Array.isArray(reward.achievements) ? reward.achievements : [];
  if (achievements.length > 0) {
    const merged = new Set(out.achievements);
    achievements.forEach(a => merged.add(String(a)));
    out.achievements = Array.from(merged);
    out.unlocks.achievements = Array.from(new Set([...(out.unlocks.achievements || []), ...out.achievements]));
  }

  out.meta.updatedAt = Date.now();
  out.meta.source = 'server';
  return out;
}

function _buildRewardRows(user, save, reward, claim) {
  const now = new Date().toISOString();
  const stats = {
    rewardType: claim.rewardType,
    claimKey: claim.claimKey,
    coins: reward.coins || 0,
    chapterAdvance: reward.chapterAdvance || 0,
    chapterTarget: reward.chapterTarget || null,
    mode: reward.mode || null,
    arena: reward.arena || null,
  };
  return {
    profile: {
      user_id: user.id,
      email: user.email || '',
      display_name: String((reward.displayName || user.user_metadata?.full_name || (user.email || 'Player').split('@')[0]) || 'Player').slice(0, 32),
      provider: String(user.app_metadata && user.app_metadata.provider ? user.app_metadata.provider : 'email').slice(0, 32),
      last_login_at: now,
      last_sync_at: now,
      updated_at: now,
    },
    progress: {
      user_id: user.id,
      save_version: save.version || 3,
      progress_data: {
        storyProgress: save.storyProgress || null,
        progression: save.progression || null,
        unlocks: save.unlocks || null,
        coins: save.coins || 0,
        cosmetics: save.cosmetics || [],
        settings: save.settings || null,
      },
      updated_at: now,
    },
    snapshot: {
      user_id: user.id,
      save_version: save.version || 3,
      save_data: save,
      client_updated_at: now,
      updated_at: now,
    },
    stats: {
      user_id: user.id,
      stats_data: stats,
      updated_at: now,
    },
    claim: {
      claim_key: claim.claimKey,
      user_id: user.id,
      reward_type: claim.rewardType,
      reward_data: reward,
      before_state: claim.beforeState || null,
      after_state: null,
      status: 'pending',
      created_at: now,
      claimed_at: null,
    },
  };
}

async function _loadCurrentRewardState(userId) {
  const snapshot = await _supabaseSelect('player_save_snapshots', `select=save_data,save_version,updated_at,client_updated_at&user_id=eq.${encodeURIComponent(userId)}&limit=1`, { service: true });
  const progress = await _supabaseSelect('player_progress', `select=progress_data,save_version,updated_at&user_id=eq.${encodeURIComponent(userId)}&limit=1`, { service: true });
  const row = Array.isArray(snapshot) && snapshot.length > 0 ? snapshot[0] : null;
  const progressRow = Array.isArray(progress) && progress.length > 0 ? progress[0] : null;
  const current = row && row.save_data ? row.save_data : (progressRow && progressRow.progress_data ? progressRow.progress_data : null);
  const save = _normalizeRewardSave(current);
  if (progressRow && progressRow.progress_data) {
    const pdata = progressRow.progress_data;
    if (typeof pdata.coins === 'number') save.coins = Math.max(0, Math.floor(pdata.coins));
    if (pdata.storyProgress && typeof pdata.storyProgress === 'object') {
      if (typeof pdata.storyProgress.chapter === 'number') save.storyProgress.chapter = pdata.storyProgress.chapter;
      if (typeof pdata.storyProgress.act === 'number') save.storyProgress.act = pdata.storyProgress.act;
      if (pdata.storyProgress.flags && typeof pdata.storyProgress.flags === 'object') save.storyProgress.flags = Object.assign({}, pdata.storyProgress.flags);
    }
    if (pdata.unlocks && typeof pdata.unlocks === 'object') {
      for (const key of Object.keys(pdata.unlocks)) {
        if (REWARD_ALLOWED_UNLOCKS.has(key)) save.unlocks[key] = !!pdata.unlocks[key];
      }
    }
  }
  if (typeof save.story.chapter !== 'number') save.story.chapter = save.chapter;
  if (typeof save.storyProgress.chapter !== 'number') save.storyProgress.chapter = save.chapter;
  return { snapshotRow: row, progressRow, save };
}

function _cleanString(value, maxLen) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLen);
}

function _cleanIdentity(value, maxLen) {
  return _cleanString(value, maxLen).replace(/[^\w@.+:\- ]/g, '');
}

function _sanitizeBanRecord(record) {
  const ttl = Number(record.expiresAt || 0);
  return {
    kind: _cleanIdentity(record.kind || 'mixed', 32),
    accountId: _cleanIdentity(record.accountId, 80) || null,
    peerId: _cleanIdentity(record.peerId, 80) || null,
    deviceId: _cleanIdentity(record.deviceId, 80) || null,
    username: _cleanIdentity(record.username, 40) || null,
    targetLabel: _cleanString(record.targetLabel, 80) || null,
    reason: _cleanString(record.reason, 240),
    createdAt: Number(record.createdAt) || Date.now(),
    expiresAt: Number.isFinite(ttl) && ttl > Date.now() ? ttl : null,
  };
}

function _summarizeRewardClaim(save, reward, claim) {
  return {
    claimKey: claim.claimKey,
    rewardType: claim.rewardType,
    coins: reward.coins || 0,
    chapterAdvance: reward.chapterAdvance || 0,
    chapterTarget: reward.chapterTarget || null,
    beforeCoins: save.coins || 0,
    afterCoins: save.coins || 0,
    afterChapter: save.chapter || 0,
  };
}

// ── Request handler ───────────────────────────────────────────────────────────

function _handleRequest(req, res) {
  const started = Date.now();
  const originalEnd = res.end;
  res.end = function(...args) {
    _logRequest(req, res.statusCode || 200, Date.now() - started);
    return originalEnd.apply(res, args);
  };
  _securityHeaders(req, res);

  if (!_originAllowed(req.headers.origin || '')) {
    _json(res, 403, { error: 'Origin not allowed' });
    return;
  }

  // CORS pre-flight — browsers send this before cross-origin writes
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // A protocol-relative request target ("//") makes `new URL` throw, which would
  // otherwise take down the whole process — treat anything unparseable as 400.
  let url;
  try {
    url = new URL(req.url, 'http://localhost');
  } catch {
    _json(res, 400, { error: 'Bad request' });
    return;
  }
  const pathname = url.pathname;

  // ── GET /api/status ─────────────────────────────────────────────────────────
  if ((pathname === '/api/status' || pathname === '/healthz') && req.method === 'GET') {
    const data = _loadBans();
    _trimExpiredBans(data);
    _json(res, 200, {
      ok: true,
      server: 'Stickman Evolution Moderation API',
      version: BUILD_VERSION,
      activeBans: Object.keys(data.records).length,
      uptime: Math.floor(process.uptime()),
      storage: storage.getType(),
    });
    return;
  }

  if (pathname === '/admin/session' && req.method === 'POST') {
    if (!_rateLimit(req, 'admin-session', 10, 60 * 1000)) {
      _pushAdminLog('AUTH_RATE_LIMIT', 'Admin session rate limit hit', { ip: _clientIp(req) });
      _json(res, 429, { error: 'Too many attempts' });
      return;
    }
    _readBody(req).then(async body => {
      const accessToken = _cleanString(body && body.supabaseAccessToken, 4096);
      const bootstrapKey = _cleanString(body && body.bootstrapKey, 512);
      let email = '';
      let userId = '';
      if (accessToken) {
        const user = await _verifySupabaseUser(accessToken);
        email = String(user.email || '').toLowerCase();
        userId = String(user.id || '');
      } else if (ADMIN_BOOTSTRAP_KEY && bootstrapKey && bootstrapKey === ADMIN_BOOTSTRAP_KEY) {
        email = Array.from(ADMIN_EMAILS)[0] || 'bootstrap-admin';
        userId = 'bootstrap';
      } else {
        throw new Error('Admin Supabase session required');
      }
      if (!ADMIN_EMAILS.has(email)) {
        _pushAdminLog('AUTH_DENY', `Denied admin session for ${email || 'unknown'}`, { ip: _clientIp(req), userId });
        _json(res, 403, { error: 'Forbidden' });
        return;
      }
      const exp = Date.now() + ADMIN_SESSION_TTL_MS;
      const token = _signAdminSession({ role: 'admin', email, userId, iat: Date.now(), exp });
      _pushAdminLog('AUTH_OK', `Admin session issued for ${email}`, { ip: _clientIp(req), userId, exp });
      _json(res, 200, { ok: true, token, expiresAt: exp, email });
    }).catch(err => {
      _pushAdminLog('AUTH_FAIL', `Admin session failed: ${err.message}`, { ip: _clientIp(req) });
      _json(res, 401, { error: 'Unauthorized' });
    });
    return;
  }

  // ── GET /api/bans ────────────────────────────────────────────────────────────
  // Returns all active (non-expired) ban records. Admin-only because the full
  // list can expose private moderation targets/reasons. Clients use /check.
  if (pathname === '/api/bans' && req.method === 'GET') {
    if (!_isAdmin(req)) { _json(res, 403, { error: 'Forbidden' }); return; }
    const data = _loadBans();
    const changed = _trimExpiredBans(data);
    if (changed) _saveBans(data);
    _json(res, 200, { records: data.records, lastModified: data.lastModified });
    return;
  }

  // ── GET /api/bans/check ──────────────────────────────────────────────────────
  // Query params: accountId, peerId, deviceId, username
  // Returns { banned: bool, record: BanRecord|null }
  if (pathname === '/api/bans/check' && req.method === 'GET') {
    const identity = {
      accountId: url.searchParams.get('accountId') || '',
      peerId:    url.searchParams.get('peerId')    || '',
      deviceId:  url.searchParams.get('deviceId')  || '',
      username:  url.searchParams.get('username')  || '',
    };
    const data = _loadBans();
    _trimExpiredBans(data);
    let match = null;
    for (const rec of Object.values(data.records)) {
      if (_recordMatchesIdentity(rec, identity)) { match = rec; break; }
    }
    _json(res, 200, { banned: !!match, record: match || null });
    return;
  }

  // ── POST /api/bans ───────────────────────────────────────────────────────────
  // Body: { key: string, record: BanRecord }
  // Adds or replaces a ban record. Requires a signed admin session.
  if (pathname === '/api/bans' && req.method === 'POST') {
    if (!_rateLimit(req, 'admin-write', 60, 60 * 1000)) { _json(res, 429, { error: 'Too many admin writes' }); return; }
    if (!_isAdmin(req)) { _json(res, 403, { error: 'Forbidden — invalid or missing admin session' }); return; }
    _readBody(req).then(body => {
      const { key, record } = body || {};
      if (!key || !record || typeof record !== 'object') {
        _json(res, 400, { error: 'Body must be { key: string, record: BanRecord }' }); return;
      }
      const data = _loadBans();
      const cleanKey = _cleanIdentity(key, 160);
      const cleanRecord = _sanitizeBanRecord(record);
      if (!cleanKey || (!cleanRecord.accountId && !cleanRecord.peerId && !cleanRecord.deviceId && !cleanRecord.username)) {
        _json(res, 400, { error: 'Ban must include a valid key and identity' }); return;
      }
      data.records[cleanKey] = cleanRecord;
      _saveBans(data);
      const label = cleanRecord.targetLabel || cleanRecord.accountId || cleanRecord.peerId || cleanRecord.deviceId || '?';
      const ttl   = cleanRecord.expiresAt ? Math.ceil((cleanRecord.expiresAt - Date.now()) / 60000) + 'm' : 'perm';
      const banMsg = `Banned ${label} [${ttl}]${cleanRecord.reason ? ' — ' + cleanRecord.reason : ''}`;
      console.log(`[Ban] + ${banMsg}`);
      _pushAdminLog('BAN', banMsg, { admin: req.adminSession && req.adminSession.email });
      _json(res, 200, { ok: true, key: cleanKey });
    }).catch(err => _json(res, 500, { error: err.message }));
    return;
  }

  // ── DELETE /api/bans/:key ────────────────────────────────────────────────────
  // Removes a single ban record by its exact key (URL-encoded).
  if (pathname.startsWith('/api/bans/') && req.method === 'DELETE') {
    if (!_rateLimit(req, 'admin-write', 60, 60 * 1000)) { _json(res, 429, { error: 'Too many admin writes' }); return; }
    if (!_isAdmin(req)) { _json(res, 403, { error: 'Forbidden' }); return; }
    const rawKey = decodeURIComponent(pathname.slice('/api/bans/'.length).trim());
    if (!rawKey) { _json(res, 400, { error: 'Key required in path' }); return; }
    const data = _loadBans();
    if (!data.records[rawKey]) { _json(res, 404, { error: 'Ban record not found' }); return; }
    delete data.records[rawKey];
    _saveBans(data);
    console.log('[Ban] - removed key:', rawKey);
    _json(res, 200, { ok: true });
    return;
  }

  // ── DELETE /api/bans (bulk unban by identity) ─────────────────────────────────
  // Body: { accountId?, peerId?, deviceId?, username? }
  // Removes all records matching the given identity fields.
  if (pathname === '/api/bans' && req.method === 'DELETE') {
    if (!_rateLimit(req, 'admin-write', 60, 60 * 1000)) { _json(res, 429, { error: 'Too many admin writes' }); return; }
    if (!_isAdmin(req)) { _json(res, 403, { error: 'Forbidden' }); return; }
    _readBody(req).then(body => {
      const identity = body || {};
      const data = _loadBans();
      const removedKeys = [];
      for (const [key, rec] of Object.entries(data.records)) {
        if (_recordMatchesIdentity(rec, identity)) {
          removedKeys.push(key);
          delete data.records[key];
        }
      }
      if (removedKeys.length) {
        _saveBans(data);
        console.log('[Ban] - bulk removed ' + removedKeys.length + ' record(s)');
      }
      _json(res, 200, { ok: true, removed: removedKeys.length });
    }).catch(err => _json(res, 500, { error: err.message }));
    return;
  }

  // ── GET /api/admin/overrides ──────────────────────────────────────────────────
  // Returns all server-side admin grants/revokes. Requires a signed admin session.
  if (pathname === '/api/admin/overrides' && req.method === 'GET') {
    if (!_isAdmin(req)) { _json(res, 403, { error: 'Forbidden' }); return; }
    const data = _loadAdminOverrides();
    _json(res, 200, { overrides: data.overrides });
    return;
  }

  // ── POST /api/admin/overrides ─────────────────────────────────────────────────
  // Body: { accountId: string, granted: bool }
  // Grants or revokes admin for the given account ID.
  if (pathname === '/api/admin/overrides' && req.method === 'POST') {
    if (!_rateLimit(req, 'admin-write', 60, 60 * 1000)) { _json(res, 429, { error: 'Too many admin writes' }); return; }
    if (!_isAdmin(req)) { _json(res, 403, { error: 'Forbidden' }); return; }
    _readBody(req).then(body => {
      const accountId = _cleanIdentity(body && body.accountId, 80);
      if (!accountId || !/^acct_/.test(accountId)) {
        _json(res, 400, { error: 'accountId must be a valid account ID (acct_...)' }); return;
      }
      if (typeof body.granted !== 'boolean') {
        _json(res, 400, { error: 'granted must be a boolean' }); return;
      }
      const data = _loadAdminOverrides();
      data.overrides[accountId] = body.granted;
      _saveAdminOverrides(data);
      const adminBy = (req.adminSession && req.adminSession.email) || 'admin';
      const action = body.granted ? 'GRANT_ADMIN' : 'REVOKE_ADMIN';
      _pushAdminLog(action, `[${adminBy}] ${body.granted ? 'granted' : 'revoked'} admin for ${accountId}`);
      console.log(`[AdminOverride] ${body.granted ? 'granted' : 'revoked'} admin → ${accountId}`);
      _json(res, 200, { ok: true, accountId, granted: body.granted });
    }).catch(err => _json(res, 500, { error: err.message }));
    return;
  }

  // ── DELETE /api/admin/overrides/:accountId ────────────────────────────────────
  // Removes the server-side admin override for the given account ID.
  if (pathname.startsWith('/api/admin/overrides/') && req.method === 'DELETE') {
    if (!_rateLimit(req, 'admin-write', 60, 60 * 1000)) { _json(res, 429, { error: 'Too many admin writes' }); return; }
    if (!_isAdmin(req)) { _json(res, 403, { error: 'Forbidden' }); return; }
    const targetId = decodeURIComponent(pathname.slice('/api/admin/overrides/'.length).trim());
    if (!targetId) { _json(res, 400, { error: 'Account ID required in path' }); return; }
    const data = _loadAdminOverrides();
    if (!data.overrides.hasOwnProperty(targetId)) { _json(res, 404, { error: 'No override found for that ID' }); return; }
    delete data.overrides[targetId];
    _saveAdminOverrides(data);
    const adminBy = (req.adminSession && req.adminSession.email) || 'admin';
    _pushAdminLog('REMOVE_ADMIN_OVERRIDE', `[${adminBy}] removed admin override for ${targetId}`);
    _json(res, 200, { ok: true });
    return;
  }

  // ── GET /api/live-config ─────────────────────────────────────────────────────
  // Returns the current live ops configuration. Public — no auth required.
  // Falls back to live-config.json on disk if nothing has been set in storage yet.
  if (pathname === '/api/live-config' && req.method === 'GET') {
    let cfg = storage.get('liveConfig');
    if (!cfg) {
      // Seed from the static file shipped with the repo
      const staticPath = path.join(STATIC_ROOT, 'live-config.json');
      try {
        cfg = JSON.parse(fs.readFileSync(staticPath, 'utf8'));
      } catch (_) {
        cfg = {};
      }
    }
    _json(res, 200, cfg);
    return;
  }

  // ── POST /api/live-config ────────────────────────────────────────────────────
  // Replaces the live ops config (merged over current). Requires a signed admin session.
  // Body: partial or full config object. Stored in storage under 'liveConfig'.
  if (pathname === '/api/live-config' && req.method === 'POST') {
    if (!_rateLimit(req, 'admin-write', 60, 60 * 1000)) { _json(res, 429, { error: 'Too many admin writes' }); return; }
    if (!_isAdmin(req)) { _json(res, 403, { error: 'Forbidden — invalid or missing admin session' }); return; }
    _readBody(req).then(body => {
      if (!body || typeof body !== 'object') {
        _json(res, 400, { error: 'Body must be a JSON config object' }); return;
      }
      const current = storage.get('liveConfig') || {};
      const safeBody = JSON.parse(JSON.stringify(body));
      const merged  = Object.assign({}, current, safeBody);
      // Merge nested objects (events, balance) instead of overwriting
      if (safeBody.events)  merged.events  = Object.assign({}, current.events  || {}, safeBody.events);
      if (safeBody.balance) merged.balance = Object.assign({}, current.balance || {}, safeBody.balance);
      storage.set('liveConfig', merged);
      const cfgMsg = 'Live config updated: ' + JSON.stringify(body);
      console.log('[LiveOps]', cfgMsg);
      _pushAdminLog('LIVEOPS', cfgMsg);
      // Broadcast updated config to all clients so dashboards refresh
      if (_io) _io.emit('liveConfigUpdated', merged);
      _json(res, 200, { ok: true, config: merged });
    }).catch(err => _json(res, 500, { error: err.message }));
    return;
  }

  // ── POST /api/sovereign/memory/commit ─────────────────────────────────────
  // Records compact Sovereign MK2 matchup summaries using the server-side
  // service role key. Human match data is accepted from authenticated users;
  // self-play summaries can be batched into the same request.
  if (pathname === '/api/sovereign/memory/commit' && req.method === 'POST') {
    if (!_rateLimit(req, 'sovereign-memory', 30, 60 * 1000)) {
      _json(res, 429, { error: 'Too many Sovereign memory writes' });
      return;
    }
    _readBody(req).then(async body => {
      const authHeader = String(req.headers.authorization || '').trim();
      const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
      const accessToken = bearer || _cleanString(body && body.supabaseAccessToken, 4096);
      if (!accessToken) {
        _json(res, 401, { error: 'Supabase access token required' });
        return;
      }

      let user;
      try {
        user = await _verifySupabaseUser(accessToken);
      } catch (e) {
        _json(res, 401, { error: 'Unauthorized' });
        return;
      }

      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        _json(res, 503, { error: 'Sovereign memory persistence is not configured' });
        return;
      }

      const rows = Array.isArray(body && body.rows) ? body.rows.slice(0, 9) : [];
      if (!rows.length) {
        _json(res, 400, { error: 'rows required' });
        return;
      }

      const normalizedRows = rows
        .map(row => _normalizeSovereignRow(row))
        .filter(row => row.bucket_key && row.bucket_type && row.bucket_value);
      if (!normalizedRows.length) {
        _json(res, 400, { error: 'No valid memory rows supplied' });
        return;
      }

      const mergedRows = [];
      for (const row of normalizedRows) {
        const existing = await _supabaseSelect(
          'sovereign_matchup_memory',
          `select=*&bucket_key=eq.${encodeURIComponent(row.bucket_key)}&limit=1`,
          { service: true }
        ).catch(() => []);
        const existingRow = Array.isArray(existing) && existing[0] ? existing[0] : null;
        mergedRows.push(_mergeSovereignMemoryRow(existingRow, row, body && body.source ? body.source : 'human'));
      }

      try {
        await _supabaseUpsert('sovereign_matchup_memory', mergedRows, 'bucket_key', { service: true });
      } catch (e) {
        _json(res, 500, { error: 'Failed to persist Sovereign memory' });
        return;
      }

      _pushAdminLog('SOV_MEMORY', `Sovereign memory commit from ${user.email || user.id} (${mergedRows.length} row(s))`, {
        userId: user.id,
        email: user.email || null,
        rows: mergedRows.length,
        source: body && body.source ? String(body.source) : 'human',
      });

      _json(res, 200, { ok: true, rows: mergedRows.length });
    }).catch(err => _json(res, 500, { error: err.message }));
    return;
  }

  // ── POST /api/rewards/claim ────────────────────────────────────────────────
  // Claims match/story rewards for the authenticated Supabase user.
  if (pathname === '/api/rewards/claim' && req.method === 'POST') {
    if (!_rateLimit(req, 'reward-claim', 20, 60 * 1000)) {
      _json(res, 429, { error: 'Too many reward claims' });
      return;
    }
    _readBody(req).then(async body => {
      const authHeader = String(req.headers.authorization || '').trim();
      const bearer = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
      const accessToken = bearer || _cleanString(body && body.supabaseAccessToken, 4096);
      if (!accessToken) {
        _json(res, 401, { error: 'Supabase access token required' });
        return;
      }
      let user;
      try {
        user = await _verifySupabaseUser(accessToken);
      } catch (e) {
        _rewardAudit('REWARD_AUTH_FAIL', `Reward claim auth failed: ${e.message}`, { ip: _clientIp(req) });
        _json(res, 401, { error: 'Unauthorized' });
        return;
      }

      const rewardType = _cleanIdentity(body && body.rewardType, 24) || 'match';
      if (!REWARD_ALLOWED_TYPES.has(rewardType)) {
        _rewardAudit('REWARD_REJECT', `Rejected reward claim with unsupported type "${rewardType}"`, { userId: user.id, email: user.email || null });
        _json(res, 400, { error: 'Unsupported reward type' });
        return;
      }

      const claimKey = _cleanIdentity(body && body.claimKey, 180);
      if (!claimKey) {
        _rewardAudit('REWARD_REJECT', 'Rejected reward claim with missing claim key', { userId: user.id, email: user.email || null });
        _json(res, 400, { error: 'claimKey required' });
        return;
      }

      const reward = _tryJson(body && body.reward) || {};
      const coins = _cleanInt(reward.coins, 0, REWARD_MAX_COINS);
      if (coins === null) {
        _rewardAudit('REWARD_REJECT', `Rejected reward claim "${claimKey}" due to invalid coins`, { userId: user.id, email: user.email || null, claimKey });
        _json(res, 400, { error: 'Invalid coin amount' });
        return;
      }

      let current;
      try {
        current = await _loadCurrentRewardState(user.id);
      } catch (e) {
        _rewardAudit('REWARD_ERROR', `Failed loading current reward state for "${claimKey}": ${e.message}`, { userId: user.id, email: user.email || null, claimKey });
        _json(res, 500, { error: 'Failed to load reward state' });
        return;
      }

      const duplicateRow = await _supabaseSelect('reward_claims', `select=*&claim_key=eq.${encodeURIComponent(claimKey)}&limit=1`, { service: true }).catch(() => []);
      if (Array.isArray(duplicateRow) && duplicateRow.length > 0) {
        _json(res, 200, { ok: true, duplicate: true, claimKey, save: duplicateRow[0].after_state || current.save });
        return;
      }

      const recentClaims = await _supabaseSelect('reward_claims', `select=claim_key,claimed_at&user_id=eq.${encodeURIComponent(user.id)}&order=claimed_at.desc&limit=1`, { service: true }).catch(() => []);
      if (Array.isArray(recentClaims) && recentClaims.length > 0) {
        const lastAt = Date.parse(recentClaims[0].claimed_at || recentClaims[0].created_at || 0);
        if (Number.isFinite(lastAt) && Date.now() - lastAt < REWARD_COOLDOWN_MS) {
          _rewardAudit('REWARD_COOLDOWN', `Rejected reward claim "${claimKey}" due to cooldown`, {
            userId: user.id,
            email: user.email || null,
            claimKey,
            lastClaimAt: recentClaims[0].claimed_at || recentClaims[0].created_at || null,
          });
          _json(res, 429, { error: 'Reward cooldown active' });
          return;
        }
      }

      let mergedSave;
      try {
        mergedSave = _mergeRewardDelta(current.save, reward, Math.max(
          Number(current.save.chapter || 0),
          Number(current.save.storyProgress && current.save.storyProgress.chapter || 0),
          Number(current.save.story && current.save.story.chapter || 0),
        ));
      } catch (e) {
        _rewardAudit('REWARD_REJECT', `Rejected reward claim "${claimKey}": ${e.message}`, {
          userId: user.id,
          email: user.email || null,
          claimKey,
          rewardType,
        });
        _json(res, 400, { error: e.message });
        return;
      }

      const rows = _buildRewardRows(user, mergedSave, reward, {
        claimKey,
        rewardType,
        beforeState: current.save,
      });

      let insertedClaim = false;
      try {
        await _supabaseInsert('reward_claims', rows.claim, { service: true });
        insertedClaim = true;
      } catch (e) {
        if (e.status === 409) {
          const existing = await _supabaseSelect('reward_claims', `select=*&claim_key=eq.${encodeURIComponent(claimKey)}&limit=1`, { service: true }).catch(() => []);
          const existingRow = Array.isArray(existing) && existing[0] ? existing[0] : null;
          _json(res, 200, {
            ok: true,
            duplicate: true,
            claimKey,
            status: existingRow && existingRow.status ? existingRow.status : 'duplicate',
            save: existingRow && existingRow.after_state ? existingRow.after_state : mergedSave,
          });
          return;
        }
        _rewardAudit('REWARD_ERROR', `Failed inserting reward claim "${claimKey}": ${e.message}`, {
          userId: user.id,
          email: user.email || null,
          claimKey,
          rewardType,
        });
        _json(res, 500, { error: 'Failed to record reward claim' });
        return;
      }

      try {
        await _supabaseUpsert('player_profiles', rows.profile, 'user_id', { service: true });
        await _supabaseUpsert('player_progress', rows.progress, 'user_id', { service: true });
        await _supabaseUpsert('player_save_snapshots', rows.snapshot, 'user_id', { service: true });
        await _supabaseUpsert('player_stats', rows.stats, 'user_id', { service: true });
      } catch (e) {
        if (insertedClaim) {
          await _supabaseDelete('reward_claims', `claim_key=eq.${encodeURIComponent(claimKey)}`, { service: true }).catch(() => {});
        }
        _rewardAudit('REWARD_ERROR', `Reward claim "${claimKey}" recorded but save sync failed: ${e.message}`, {
          userId: user.id,
          email: user.email || null,
          claimKey,
          rewardType,
        });
        _json(res, 500, { error: 'Reward saved but sync failed' });
        return;
      }

      const claimFinishedAt = new Date().toISOString();
      await _supabaseUpsert('reward_claims', Object.assign({}, rows.claim, {
        after_state: mergedSave,
        status: 'applied',
        claimed_at: claimFinishedAt,
      }), 'claim_key', { service: true }).catch(e => {
        _rewardAudit('REWARD_ERROR', `Reward claim "${claimKey}" saved but claim status update failed: ${e.message}`, {
          userId: user.id,
          email: user.email || null,
          claimKey,
          rewardType,
        });
      });

      if (mergedSave.chapter > current.save.chapter) {
        await _supabaseUpsert('player_chapters_beaten', {
          user_id: user.id,
          chapter_index: mergedSave.chapter,
          beaten_at: new Date().toISOString(),
        }, 'user_id,chapter_index', { service: true }).catch(() => {});
      }

      const summary = _summarizeRewardClaim(mergedSave, reward, { claimKey, rewardType });
      _rewardAudit('REWARD_OK', `Reward claim accepted for ${user.email || user.id}: ${claimKey}`, {
        userId: user.id,
        email: user.email || null,
        claimKey,
        rewardType,
        coins,
        chapter: mergedSave.chapter,
      });
      _json(res, 200, {
        ok: true,
        claimKey,
        duplicate: false,
        rewardType,
        summary,
        save: mergedSave,
      });
    }).catch(err => {
      _rewardAudit('REWARD_ERROR', `Reward claim handler failed: ${err.message}`, { ip: _clientIp(req) });
      _json(res, 500, { error: 'Reward claim failed' });
    });
    return;
  }

  // ── GET /admin/state ──────────────────────────────────────────────────────────
  // Returns live server runtime stats. Requires a signed admin session.
  if (pathname === '/admin/state' && req.method === 'GET') {
    if (!_isAdmin(req)) { _json(res, 403, { error: 'Forbidden' }); return; }
    const liveConfig = storage.get('liveConfig') || {};
    const activeRooms = [...rooms.values()].filter(r => r.p1 || r.p2);
    const roomList = [...rooms.entries()]
      .filter(([, r]) => r.p1 || r.p2)
      .map(([code, r]) => ({ code, players: [r.p1, r.p2].filter(Boolean).length }));
    _json(res, 200, {
      ok: true,
      uptime:        Math.floor(process.uptime()),
      onlinePlayers: _io ? _io.engine.clientsCount : 0,
      activeRooms:   activeRooms.length,
      rooms:         roomList,
      version:       liveConfig.latestVersion || '?',
      liveConfig,
    });
    return;
  }

  // ── GET /admin/logs ───────────────────────────────────────────────────────────
  // Returns recent admin log entries. Requires a signed admin session.
  if (pathname === '/admin/logs' && req.method === 'GET') {
    if (!_isAdmin(req)) { _json(res, 403, { error: 'Forbidden' }); return; }
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10), 500);
    _json(res, 200, { ok: true, logs: _adminLogBuf.slice(-limit) });
    return;
  }

  // ── POST /admin/player-action ─────────────────────────────────────────────────
  // Broadcasts a player-action event via socket.io. Each client checks if it is
  // the target and applies the action locally. Requires a signed admin session.
  // Body: { type, targetAccountId?, targetUsername?, value?, adminBy? }
  if (pathname === '/admin/player-action' && req.method === 'POST') {
    if (!_rateLimit(req, 'admin-write', 60, 60 * 1000)) { _json(res, 429, { error: 'Too many admin writes' }); return; }
    if (!_isAdmin(req)) { _json(res, 403, { error: 'Forbidden' }); return; }
    _readBody(req).then(body => {
      const allowedTypes = new Set(['giveCoins', 'giveCosmetic']);
      const type = _cleanIdentity(body && body.type, 40);
      if (!allowedTypes.has(type)) { _json(res, 400, { error: 'unsupported player action' }); return; }
      const targetAccountId = _cleanIdentity(body && body.targetAccountId, 80) || null;
      const targetUsername = _cleanString(body && body.targetUsername, 40) || null;
      const value = type === 'giveCoins' ? Math.max(-10000, Math.min(10000, Math.floor(Number(body.value) || 0))) : _cleanIdentity(body && body.value, 80);
      const adminBy = (req.adminSession && req.adminSession.email) || _cleanString(body && body.adminBy, 80) || 'admin';
      if (_io) _io.emit('adminPlayerAction', { type, targetAccountId, targetUsername, value, ts: Date.now(), signedBy: adminBy });
      const label = targetUsername || targetAccountId || 'unknown';
      _pushAdminLog('ADMIN', `[${adminBy || 'admin'}] player-action type=${type} target=${label} value=${JSON.stringify(value)}`);
      console.log(`[AdminAction] ${type} → ${label}`);
      _json(res, 200, { ok: true });
    }).catch(err => _json(res, 500, { error: err.message }));
    return;
  }

  // ── POST /admin/broadcast ─────────────────────────────────────────────────────
  // Pushes an announcement toast to all connected clients. Requires a signed admin session.
  // Body: { message, color?, duration?, adminBy? }
  if (pathname === '/admin/broadcast' && req.method === 'POST') {
    if (!_rateLimit(req, 'admin-write', 60, 60 * 1000)) { _json(res, 429, { error: 'Too many admin writes' }); return; }
    if (!_isAdmin(req)) { _json(res, 403, { error: 'Forbidden' }); return; }
    _readBody(req).then(body => {
      const message = _cleanString(body && body.message, 240);
      const color = /^#[0-9a-f]{6}$/i.test(String(body && body.color || '')) ? String(body.color) : '#ffcc66';
      const duration = Math.max(1000, Math.min(15000, Number(body && body.duration) || 6000));
      const adminBy = (req.adminSession && req.adminSession.email) || _cleanString(body && body.adminBy, 80) || 'admin';
      if (!message) { _json(res, 400, { error: 'message required' }); return; }
      if (_io) _io.emit('adminAnnouncement', { message, color, duration });
      _pushAdminLog('ANNOUNCE', `[${adminBy}] broadcast: ${message}`);
      console.log(`[Broadcast] ${message}`);
      _json(res, 200, { ok: true });
    }).catch(err => _json(res, 500, { error: err.message }));
    return;
  }

  // ── POST /admin/command ───────────────────────────────────────────────────────
  // Dispatches server-side commands. Requires a signed admin session.
  // Body: { command, ...params }
  if (pathname === '/admin/command' && req.method === 'POST') {
    if (!_rateLimit(req, 'admin-write', 60, 60 * 1000)) { _json(res, 429, { error: 'Too many admin writes' }); return; }
    if (!_isAdmin(req)) { _json(res, 403, { error: 'Forbidden' }); return; }
    _readBody(req).then(body => {
      const command = _cleanIdentity(body && body.command, 40);
      const adminBy = (req.adminSession && req.adminSession.email) || _cleanString(body && body.adminBy, 80) || 'admin';
      let result = { ok: true };
      switch (command) {
        case 'endAllMatches':
          // Close all active rooms by emitting disconnect to all sockets
          if (_io) _io.emit('adminForceDisconnect', { reason: 'Match ended by admin.' });
          _pushAdminLog('ADMIN', `[${adminBy}] endAllMatches — ${rooms.size} room(s) affected`);
          console.log(`[AdminCmd] endAllMatches — ${rooms.size} room(s)`);
          result.roomsAffected = rooms.size;
          break;
        case 'getStats':
          result.onlinePlayers = _io ? _io.engine.clientsCount : 0;
          result.activeRooms   = [...rooms.values()].filter(r => r.p1 || r.p2).length;
          result.uptime        = Math.floor(process.uptime());
          break;
        default:
          result = { ok: false, error: 'Unknown command: ' + command };
      }
      _json(res, result.ok ? 200 : 400, result);
    }).catch(err => _json(res, 500, { error: err.message }));
    return;
  }

  // ── Socket.io owns /socket.io/* — leave those alone ──────────────────────────
  if (pathname.startsWith('/socket.io')) return;

  // ── Static file serving ───────────────────────────────────────────────────────
  // Resolve the requested path; default '/' to index.html.
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(STATIC_ROOT, safePath);

  // Prevent directory traversal outside STATIC_ROOT.
  if (!filePath.startsWith(STATIC_ROOT + path.sep) && filePath !== STATIC_ROOT) {
    _json(res, 403, { error: 'Forbidden' });
    return;
  }

  // STATIC_ROOT is the repo root, so everything not on this denylist is public.
  // Blocks server source, the ban database, env/config, docs and sibling projects.
  // Anything the browser actually loads (index.html, SMB.css, js/, images/,
  // favicon.svg, live-config.json, the audio file, axiom-prequel/) stays served.
  if (_isPrivatePath(safePath)) {
    _json(res, 404, { error: 'Not found' });
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      _json(res, 404, { error: 'Not found' });
      return;
    }
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    let cacheControl = 'no-cache';
    if (/\.(?:png|jpg|jpeg|gif|webp|mp3|wav|ogg)$/i.test(filePath)) {
      cacheControl = 'public, max-age=31536000, immutable';
    } else if (/\.(?:js|css)$/i.test(filePath)) {
      cacheControl = 'no-cache, must-revalidate';
    } else if (/\.html?$/i.test(filePath)) {
      cacheControl = 'no-store, no-cache, must-revalidate';
    }
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': cacheControl });
    res.end(data);
  });
}

// ── HTTP Server + Socket.io ───────────────────────────────────────────────────

const httpServer = createServer(_handleRequest);

// `let _io` so the request handler can emit banSync events
let _io;
_io = new Server(httpServer, {
  cors: {
    origin(origin, cb) {
      cb(null, _originAllowed(origin));
    },
    methods: ['GET', 'POST'],
  },
});

// ── Socket.io relay rooms ─────────────────────────────────────────────────────

const rooms = new Map();

function _getRoomBySocket(socketId) {
  for (const [code, room] of rooms.entries()) {
    if (room.p1 === socketId || room.p2 === socketId) return { code, room };
  }
  return null;
}

_io.on('connection', (socket) => {
  console.log(`[+] socket connected: ${socket.id}`);
  _pushAdminLog('CONNECT', `Socket connected: ${socket.id}`);

  // Client may send identity metadata alongside the room code
  socket.on('joinRoom', (payload) => {
    // Accept both legacy string and new object { code, accountId, username, ... }
    const rawCode = typeof payload === 'object' && payload !== null ? (payload.code || '') : (payload || '');
    const code = String(rawCode).trim().toLowerCase().slice(0, 20);
    if (!code) return;

    // Store socket metadata for admin targeting
    if (typeof payload === 'object' && payload !== null) {
      _socketMeta.set(socket.id, {
        accountId: payload.accountId || null,
        username:  payload.username  || null,
        peerId:    payload.peerId    || null,
        deviceId:  payload.deviceId  || null,
        roomCode:  code,
      });
    } else {
      _socketMeta.set(socket.id, { roomCode: code });
    }

    let room = rooms.get(code);
    if (!room) { room = { p1: null, p2: null }; rooms.set(code, room); }

    if (room.p1 && room.p2) { socket.emit('roomFull'); return; }

    let slot;
    if (!room.p1) { room.p1 = socket.id; slot = 1; }
    else           { room.p2 = socket.id; slot = 2; }

    socket.join(code);
    socket.emit('joined', { slot, roomCode: code });
    const meta = _socketMeta.get(socket.id) || {};
    const label = meta.username ? ` (${meta.username})` : '';
    console.log(`  Room "${code}" — slot ${slot} → ${socket.id}${label}`);
    _pushAdminLog('JOIN', `Room "${code}" slot ${slot}: ${socket.id}${label}`);

    if (room.p1 && room.p2) {
      _io.to(code).emit('bothConnected');
      console.log(`  Room "${code}" is full`);
    }
  });

  socket.on('playerState', (state) => {
    const found = _getRoomBySocket(socket.id);
    if (found) socket.to(found.code).emit('remoteState', state);
  });

  socket.on('hitEvent', (ev) => {
    const found = _getRoomBySocket(socket.id);
    if (found) socket.to(found.code).emit('remoteHit', ev);
  });

  socket.on('gameEvent', (ev) => {
    if (ev && typeof ev.event === 'string' && /^admin/i.test(ev.event)) {
      _pushAdminLog('SOCKET_BLOCK', `Blocked spoofed privileged gameEvent "${ev.event}"`, {
        socketId: socket.id,
        ip: socket.handshake && socket.handshake.address,
      });
      return;
    }
    const found = _getRoomBySocket(socket.id);
    if (found) socket.to(found.code).emit('remoteGameEvent', ev);
  });

  socket.on('disconnect', () => {
    const meta = _socketMeta.get(socket.id);
    const label = (meta && meta.username) ? ` (${meta.username})` : '';
    console.log(`[-] socket disconnected: ${socket.id}${label}`);
    _pushAdminLog('DISCONNECT', `Socket disconnected: ${socket.id}${label}`);
    _socketMeta.delete(socket.id);

    const found = _getRoomBySocket(socket.id);
    if (!found) return;
    const { code, room } = found;
    socket.to(code).emit('opponentDisconnected');
    if (room.p1 === socket.id) room.p1 = null;
    if (room.p2 === socket.id) room.p2 = null;
    if (!room.p1 && !room.p2) {
      rooms.delete(code);
      console.log(`  Room "${code}" deleted (empty)`);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`\nStickman Evolution relay + moderation API`);
  console.log(`  Listening on port ${PORT}`);
  console.log(`  Version:   ${BUILD_VERSION}`);
  console.log(`  Admin auth:${ADMIN_SESSION_SECRET ? ' signed sessions configured' : ' NOT CONFIGURED'}`);
  console.log(`  Storage:   ${storage.getType()}`);
  console.log(`  Health:    http://localhost:${PORT}/healthz\n`);
});
