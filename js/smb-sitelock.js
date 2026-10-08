'use strict';
// smb-sitelock.js — host allowlist ("sitelock")
// Load order: first, before any game script. Depends on nothing.
//
// Portals ask for this so a stolen copy of the build cannot be re-hosted and
// monetised elsewhere: https://docs.crazygames.com/resources/html5/sitelock/
//
// IMPORTANT: every host the game is legitimately published on must appear in
// ALLOWED_HOSTS below, including the CDN host a portal serves the files from
// (which is usually NOT the portal's own domain). If the game is ever deployed
// to a new domain, add it here first or that deploy will show the lock screen.
(function () {
  var ALLOWED_HOSTS = [
    // Local development / offline
    /^localhost$/i,
    /^127\.0\.0\.1$/,
    /^\[?::1\]?$/,
    /^0\.0\.0\.0$/,
    // Own hosting
    /(^|\.)onrender\.com$/i,
    /(^|\.)github.com$/i,
    // CrazyGames: portal (all regional TLDs), game-file CDN, and the mobile apps
    /(^|\.)crazygames\.(com|com\.[a-z]{2}|co\.[a-z]{2}|[a-z]{2,3})$/i,
    // itch.io — HTML5 uploads are served from itch.zone / the hwcdn edge
    /(^|\.)itch\.io$/i,
    /(^|\.)itch\.zone$/i,
    /(^|\.)hwcdn\.net$/i,
    // Newgrounds — uploads are served from ungrounded.net
    /(^|\.)newgrounds\.com$/i,
    /(^|\.)ungrounded\.net$/i,
    // Game Jolt
    /(^|\.)gamejolt\.(com|net|io)$/i,
  ];

  var host = String(location.hostname || '').toLowerCase();

  // No hostname at all (file://, a packaged app shell) — allow rather than
  // lock a legitimate offline copy out of the game.
  if (!host || location.protocol === 'file:') return;

  for (var i = 0; i < ALLOWED_HOSTS.length; i++) {
    if (ALLOWED_HOSTS[i].test(host)) return;
  }

  window.SMB_SITELOCKED = true;

  function _lock() {
    try {
      document.title = 'Play on CrazyGames';
      document.body.innerHTML =
        '<div style="position:fixed;inset:0;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;gap:18px;background:#0b0d12;' +
        'color:#e8ecf5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;text-align:center;padding:24px;">' +
        '<div style="font-size:1.6rem;font-weight:700;letter-spacing:0.04em;">Stickman Evolution: The 95th</div>' +
        '<div style="font-size:1rem;opacity:0.8;max-width:34ch;line-height:1.5;">' +
        'This copy of the game is hosted without permission.</div>' +
        '<a href="https://www.crazygames.com" style="color:#8ec5ff;font-size:1rem;text-decoration:none;' +
        'border:1px solid rgba(140,197,255,0.5);border-radius:8px;padding:10px 20px;">Play it on CrazyGames</a>' +
        '</div>';
    } catch (e) {}
  }

  if (document.body) _lock();
  else document.addEventListener('DOMContentLoaded', _lock);

  // Stop the rest of the page from booting.
  window.stop && window.stop();
}());
