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
    if (typeof SupabaseBridge === 'undefined') return null;
    await SupabaseBridge.ensureReady();
    const state = SupabaseBridge.getState ? SupabaseBridge.getState() : {};
    const accessToken = state.session && state.session.access_token;
    if (!accessToken) return null;
    const res = await fetch(base + '/admin/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabaseAccessToken: accessToken }),
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
