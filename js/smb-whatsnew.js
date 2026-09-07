'use strict';
// smb-whatsnew.js — "test the latest update" panel.  F6, or whatsNew() in console.
//
// Reads the manifest written by tools/whatsnew/gen.js (js/smb-whatsnew-data.js)
// and offers a one-click jump into every part of the game that update actually
// changed — nothing else. Regenerate the manifest after each update:
//
//     npm run whatsnew
//
// Loaded LAST, defines only window.whatsNew / _whatsNewToggle, and every hook it
// calls is guarded. If the manifest is missing the panel says so and does nothing
// else; it must never be able to affect a normal play session.
//
// The jump hooks live in smb-debug-jump.js and gate on `debugMode`, so the panel
// sets it before calling them — same as opening the F8 menu would. Note that is a
// bare assignment, not window.debugMode; see the comment at the assignment.

(function () {

  var PANEL_ID = 'smbWhatsNewPanel';

  function data() { return (typeof window.WHATS_NEW === 'object') ? window.WHATS_NEW : null; }

  function _esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // ── Running a target ───────────────────────────────────────────────────────
  function run(kind, arg) {
    try {
      // The jump hooks gate on `debugMode`, which smb-globals.js declares with
      // `let` — so it is a LEXICAL global, and `window.debugMode = true` sets a
      // different variable entirely. Classic scripts share one global lexical
      // scope, so a bare assignment reaches the real binding.
      try { if (typeof debugMode !== 'undefined') debugMode = true; } catch (e) {}
      // The Tuesday prologue plays once per profile and would sit in front of the
      // very thing you opened this panel to look at. Mark it seen — this is a
      // test jump, not a first play.
      try { localStorage.setItem('smb_tuesday_seen', '1'); } catch (e) {}
      // Same for the story "seam" prologue, which fires the first time Story is
      // opened on a save. Harmless on a played profile (already true); it keeps
      // the jump deterministic on a fresh one.
      try { if (typeof _story2 !== 'undefined' && _story2) _story2.prologueSeen = true; } catch (e) {}
      close();
      switch (kind) {
        case 'story':
          if (typeof loadStoryFight === 'function') return loadStoryFight(+arg);
          break;
        case 'boss':
          if (typeof forceBossFight === 'function') return forceBossFight(arg);
          break;
        case 'arena':
          if (typeof spawnInArena === 'function') return spawnInArena(arg);
          break;
        case 'mode':
        case 'match':
          if (typeof selectMode === 'function' && typeof startGame === 'function') {
            selectMode(arg === '2p' ? 'vs' : arg);
            return startGame();
          }
          break;
        case 'domain':
          // _devPreviewDomain needs a live fighter, so route through the same
          // auto-launch the F8 cinematic viewer uses rather than calling it cold.
          if (typeof _cinViewerLaunch === 'function' && typeof _devPreviewDomain === 'function') {
            return _cinViewerLaunch('vs', function () { _devPreviewDomain(arg || 'thor'); }, 800);
          }
          break;
        case 'finisher':
          return _runFinisherPreview();
      }
      _toast('No hook available for "' + kind + '" in this build.');
    } catch (e) {
      _toast('Jump failed: ' + e.message);
      if (window.console) console.warn('[whatsnew]', e);
    }
  }

  // A finisher needs a live match and two fighters, so start one, then force a
  // def on the next frame once players[] exists.
  function _runFinisherPreview() {
    if (typeof selectMode !== 'function' || typeof startGame !== 'function') return;
    selectMode('vs');
    startGame();
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (tries > 120) { clearInterval(iv); return; }
      if (typeof players === 'undefined' || !players || players.length < 2) return;
      if (typeof _devForceFinisher !== 'function') { clearInterval(iv); return; }
      clearInterval(iv);
      var defs = [];
      try { for (var k in WEAPON_FINISHERS) defs.push(WEAPON_FINISHERS[k]); } catch (e) {}
      try { for (var c in CLASS_FINISHERS)  defs.push(CLASS_FINISHERS[c]);  } catch (e) {}
      var def = defs.filter(function (d) { return d && d.swing; })[0];
      if (!def) { _toast('No finisher def with a swing found.'); return; }
      var att = players[0], tgt = players[1];
      att.x = tgt.x - 70; att.y = tgt.y;
      _devForceFinisher(def, att, tgt);
    }, 50);
  }

  function _toast(msg) {
    if (typeof _adminToast === 'function') { _adminToast(msg); return; }
    if (window.console) console.log('[whatsnew] ' + msg);
  }

  // ── Panel ──────────────────────────────────────────────────────────────────
  function close() {
    var el = document.getElementById(PANEL_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function open() {
    close();
    var d = data();
    var wrap = document.createElement('div');
    wrap.id = PANEL_ID;
    wrap.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:100000',
      'background:rgba(4,6,12,0.82)', 'backdrop-filter:blur(3px)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'font-family:ui-monospace,Menlo,Consolas,monospace'
    ].join(';');
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });

    var card = document.createElement('div');
    card.style.cssText = [
      'width:min(780px,92vw)', 'max-height:86vh', 'overflow:auto',
      'background:#0d1018', 'border:1px solid #2b3550', 'border-radius:12px',
      'box-shadow:0 18px 60px rgba(0,0,0,0.65)', 'padding:18px 20px', 'color:#dbe4f5',
      'text-align:left'   // the page centres text; the panel must not inherit that
    ].join(';');

    if (!d) {
      card.innerHTML =
        '<div style="font-size:16px;font-weight:700;color:#ffcc55">No update manifest</div>' +
        '<p style="line-height:1.55;color:#93a1bd">' +
        'Generate one, then reopen this panel:</p>' +
        '<pre style="background:#070a10;border:1px solid #223;padding:10px;border-radius:8px;' +
        'color:#8fd">npm run whatsnew</pre>';
      wrap.appendChild(card); document.body.appendChild(wrap); return;
    }

    var groups = {};
    (d.targets || []).forEach(function (t) { (groups[t.kind] = groups[t.kind] || []).push(t); });

    // Pairs, not an object literal: a `arena: '...'` key reads to the audit's
    // unknown-key rule as a reference to an ARENAS entry, which it is not.
    var GROUPS = [
      ['boss', 'Bosses'], ['mode', 'Modes'], ['match', 'Core combat'],
      ['finisher', 'Finishers'], ['domain', 'Domains'],
      ['arena', 'Arenas'], ['story', 'Story chapters']
    ];

    var html = '';
    html += '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">' +
            '<div style="font-size:17px;font-weight:700;color:#7fd1ff">What\'s new — test it</div>' +
            '<div style="color:#5f6f8c;font-size:12px">' +
            _esc((d.commits || []).length) + ' commit(s) · ' +
            _esc((d.changedFiles || []).length) + ' file(s) · base ' + _esc(d.base || '?') +
            '</div></div>';
    html += '<div style="color:#5f6f8c;font-size:11px;margin:2px 0 12px">' +
            'generated ' + _esc((d.generated || '').replace('T', ' ').slice(0, 16)) +
            ' · regenerate with <span style="color:#8fd">npm run whatsnew</span>' +
            ' · Esc or F6 to close</div>';

    if (d.commits && d.commits.length) {
      html += '<div style="background:#070a10;border:1px solid #1c2437;border-radius:8px;' +
              'padding:8px 10px;margin-bottom:14px">';
      d.commits.forEach(function (c) {
        html += '<div style="font-size:12px;color:#9fb0cc;padding:1px 0">' +
                '<span style="color:#4d6">' + _esc(c.sha) + '</span> ' + _esc(c.subject) + '</div>';
      });
      html += '</div>';
    }

    if (!(d.targets || []).length) {
      html += '<div style="color:#ffcc55;padding:8px 0">' +
              'Nothing in this update maps to something runnable.</div>';
    }

    GROUPS.forEach(function (g) {
      var kind = g[0], title = g[1];
      var list = groups[kind];
      if (!list || !list.length) return;
      var many = list.length > 12;
      html += '<div style="margin:0 0 6px"><div style="font-size:12px;letter-spacing:.08em;' +
              'text-transform:uppercase;color:#6f83a6;margin:12px 0 6px">' +
              _esc(title || kind) + ' <span style="color:#44506b">(' + list.length + ')</span></div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px' +
              (many ? ';max-height:190px;overflow:auto;padding-right:4px' : '') + '">';
      list.forEach(function (t) {
        html += '<button data-kind="' + _esc(t.kind) + '" data-arg="' + _esc(t.arg) + '" ' +
                'title="' + _esc(t.why || '') + '" ' +
                'style="cursor:pointer;background:#16203a;color:#cfe0ff;' +
                'border:1px solid #2b3550;border-radius:7px;padding:6px 10px;font:inherit;font-size:12px">' +
                _esc(t.label) + '</button>';
      });
      html += '</div></div>';
    });

    var extra = (d.unmapped || []).concat(d.nonJs || []);
    if (extra.length) {
      html += '<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;' +
              'color:#6f83a6;margin:16px 0 6px">Changed, but nothing to click ' +
              '<span style="color:#44506b">(' + extra.length + ')</span></div>' +
              '<div style="font-size:11px;color:#66748f;line-height:1.6">' +
              extra.map(_esc).join('<br>') + '</div>';
    }

    card.innerHTML = html;
    card.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-kind]') : null;
      if (b) run(b.getAttribute('data-kind'), b.getAttribute('data-arg'));
    });

    wrap.appendChild(card);
    document.body.appendChild(wrap);
  }

  function toggle() {
    if (document.getElementById(PANEL_ID)) close(); else open();
  }

  window.whatsNew = open;
  window._whatsNewToggle = toggle;

  document.addEventListener('keydown', function (e) {
    if (e.key === 'F6') { e.preventDefault(); toggle(); return; }
    if (e.key === 'Escape' && document.getElementById(PANEL_ID)) { e.preventDefault(); close(); }
  });

})();
