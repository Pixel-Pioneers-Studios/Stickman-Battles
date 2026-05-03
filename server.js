'use strict';

// ============================================================
// Stickman Battles — Relay + Moderation API Server
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
//
// REST Endpoints:
//   GET    /api/status                       — health check
//   GET    /api/bans                         — list all active bans
//   GET    /api/bans/check?accountId=&...    — check if identity is banned
//   POST   /api/bans           [admin]       — add a ban record
//   DELETE /api/bans/:key      [admin]       — remove a ban by key
//   DELETE /api/bans           [admin]       — bulk remove by identity (body)
//   GET    /api/live-config                  — live ops configuration (public)
//   POST   /api/live-config    [admin]       — update live ops config
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
const ALLOWED_ORIGINS = new Set(String(process.env.ALLOWED_ORIGINS || 'https://stickman-battles.onrender.com,http://localhost:3001,http://localhost:5173,http://127.0.0.1:3001')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean));
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
  return ALLOWED_ORIGINS.has(origin);
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
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://esm.sh https://cdnjs.cloudflare.com https://unpkg.com https://www.youtube.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "media-src 'self'",
    "connect-src 'self' https://*.supabase.co https://esm.sh https://*.peerjs.com wss: https:",
    "frame-src https://www.youtube.com",
    "frame-ancestors 'none'",
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

  const url      = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  // ── GET /api/status ─────────────────────────────────────────────────────────
  if ((pathname === '/api/status' || pathname === '/healthz') && req.method === 'GET') {
    const data = _loadBans();
    _trimExpiredBans(data);
    _json(res, 200, {
      ok: true,
      server: 'Stickman Battles Moderation API',
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

  fs.readFile(filePath, (err, data) => {
    if (err) {
      _json(res, 404, { error: 'Not found' });
      return;
    }
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    const cacheControl = /\.(?:js|css|png|jpg|jpeg|gif|webp|mp3|wav|ogg)$/i.test(filePath)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache';
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
  console.log(`\nStickman Battles relay + moderation API`);
  console.log(`  Listening on port ${PORT}`);
  console.log(`  Version:   ${BUILD_VERSION}`);
  console.log(`  Admin auth:${ADMIN_SESSION_SECRET ? ' signed sessions configured' : ' NOT CONFIGURED'}`);
  console.log(`  Storage:   ${storage.getType()}`);
  console.log(`  Health:    http://localhost:${PORT}/healthz\n`);
});
