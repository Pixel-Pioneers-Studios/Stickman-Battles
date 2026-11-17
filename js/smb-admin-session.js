'use strict';

// Browser side of the admin session. The admin secret stays on the server; the browser
// swaps its Supabase session for a short-lived signed token.
const AdminSession = (() => {
  const STORAGE_KEY = 'smb_admin_session_v1';
  let _session = null;

  function _serverBase() {
    return (typeof SERVER_CONFIG !== 'undefined' && SERVER_CONFIG.url)
      ? String(SERVER_CONFIG.url).replace(/\/$/, '')
      : '';
  }

  function _load() {
    if (_session) return _session;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.token && parsed.expiresAt > Date.now() + 15000) {
        _session = parsed;
        return _session;
      }
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    return null;
  }

  function getToken() {
    const session = _load();
    return session ? session.token : '';
  }

  function authHeaders() {
    const token = getToken();
    return token ? { Authorization: 'Bearer ' + token } : {};
  }

  async function refresh() {
    const base = _serverBase();
    if (!base) return null;
    let body = null;
    if (typeof DevKey !== 'undefined' && DevKey.active()) {
      body = { devKey: DevKey.key() };
    } else {
      if (typeof SupabaseBridge === 'undefined') return null;
      await SupabaseBridge.ensureReady();
      const state = SupabaseBridge.getState ? SupabaseBridge.getState() : {};
      const accessToken = state.session && state.session.access_token;
      if (!accessToken) return null;
      body = { supabaseAccessToken: accessToken };
    }
    const res = await fetch(base + '/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      logout();
      return null;
    }
    const data = await res.json();
    if (!data || !data.token) return null;
    _session = { token: data.token, expiresAt: data.expiresAt, email: data.email };
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(_session)); } catch (e) {}
    return _session;
  }

  async function ensure() {
    const current = _load();
    if (current) return current;
    return refresh();
  }

  function logout() {
    _session = null;
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  return { authHeaders, ensure, getToken, logout, refresh };
})();

window.AdminSession = AdminSession;

// Developer key: a long secret that gives any copy of the game (the site, a portal, a file:// folder copy)
// developer powers. Paste it into the locked game console where the password goes, or open the game with
// #devkey=<key> at the end of the URL. The device remembers it until `devkey forget` in the console.
// Only SHA-256 hashes live in the code, so the source being public does not give the key away. The server
// checks the same hashes (DEV_KEY_HASHES in server.js) before it grants an admin session.
// To add or revoke a key, add or remove its hash here and in server.js.
const DEV_KEY_HASHES = [
  '5ec0a870c02afee0c7eb693488814a2817ae6e485ec2eb171bc04f44f9f9b99b',
];

const DevKey = (() => {
  const STORAGE_KEY = 'smb_dev_key_v1';
  let _key = '';

  async function _sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Resolves true when the key matches. Wrong keys change nothing.
  async function use(key) {
    key = String(key || '').trim();
    if (!/^smbdev_[A-Za-z0-9_-]{20,}$/.test(key)) return false;
    if (typeof crypto === 'undefined' || !crypto.subtle) return false;
    if (DEV_KEY_HASHES.indexOf(await _sha256(key)) === -1) return false;
    _key = key;
    try { localStorage.setItem(STORAGE_KEY, key); } catch (e) {}
    return true;
  }

  function forget() {
    _key = '';
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    if (window.AdminSession) AdminSession.logout();
  }

  async function init() {
    let fromUrl = '';
    try {
      const m = /[#&]devkey=([A-Za-z0-9_-]+)/.exec(location.hash || '');
      if (m) {
        fromUrl = m[1];
        // Take the key out of the address bar so it is not left in history or a shared link.
        history.replaceState(null, '', location.pathname + location.search);
      }
    } catch (e) {}
    let stored = '';
    try { stored = localStorage.getItem(STORAGE_KEY) || ''; } catch (e) {}
    if (fromUrl && await use(fromUrl)) return true;
    if (stored && await use(stored)) return true;
    if (stored) forget();   // a revoked key stops working on the next load
    return false;
  }

  return { use, forget, init, active: () => !!_key, key: () => _key };
})();

window.DevKey = DevKey;
DevKey.ready = DevKey.init();
