'use strict';
// smb-owner-tools.js — Owner Toolbox: one clickable panel for dev-role accounts.
// Depends on: smb-globals.js, smb-combat.js, smb-debug-console.js (_consoleExec),
// smb-accounts.js (hasPermission), smb-admin-panels.js, smb-admin-liveops-panel.js.
// Opens with the ` key or the OWNER chip. Ticked from gameLoop (smb-loop-core.js).
// Everything here is local to this browser; in online matches other players don't see it.

const OwnerTools = (function() {
  const S = {
    god: false, infSuper: false, noCd: false, ohko: false, infLives: false,
    freezeAI: false, labels: false, speed: 1, gravity: null,
    frozen: false, stepLeft: 0, teleport: false, selected: null,
  };
  let _panel = null, _chip = null, _lastXf = null, _mouse = null;
  let _allowedCache = false, _allowedAt = 0;
  let _rec = null, _recChunks = [];
  const _gravOrig = new Map();
  let _savedDmgMult;

  function allowed() {
    const now = performance.now();
    if (now - _allowedAt > 1000) {
      _allowedAt = now;
      _allowedCache = typeof hasPermission === 'function' && hasPermission('dev');
    }
    return _allowedCache;
  }

  function me() {
    if (typeof players === 'undefined' || !players.length) return null;
    return players.find(p => p && !p.isAI && !p.isRemote) || players[0];
  }

  function everyone() {
    if (typeof players === 'undefined') return [];
    const out = [...players];
    if (typeof minions !== 'undefined') out.push(...minions);
    if (typeof trainingDummies !== 'undefined') out.push(...trainingDummies);
    return out.filter(Boolean);
  }

  function toast(msg, bad) {
    let t = document.getElementById('_ownerToast');
    if (!t) {
      t = document.createElement('div');
      t.id = '_ownerToast';
      t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:100001;' +
        'background:rgba(8,6,20,0.94);padding:8px 18px;border-radius:8px;font:13px "Segoe UI",Arial,sans-serif;' +
        'pointer-events:none;transition:opacity .25s;border:1px solid #ffcc44';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.color = bad ? '#ff7777' : '#ffe9a8';
    t.style.borderColor = bad ? '#ff5555' : '#ffcc44';
    t.style.opacity = '1';
    clearTimeout(t._h);
    t._h = setTimeout(() => { t.style.opacity = '0'; }, 2200);
  }

  // Runs a console command and toasts the console's own reply.
  function run(cmd) {
    if (typeof _consoleExec !== 'function') { toast('Console not loaded', true); return; }
    const orig = window._consoleAppend;
    let last = null;
    window._consoleAppend = function(prefix, text, color) {
      last = { bad: prefix === '✗', text };
      if (typeof orig === 'function') orig(prefix, text, color);
    };
    try { _consoleExec(cmd); }
    catch (e) { last = { bad: true, text: String(e.message || e) }; }
    finally { window._consoleAppend = orig; }
    if (last) toast(last.text, last.bad);
  }

  function needGame() {
    if (typeof gameRunning === 'undefined' || !gameRunning || !me()) { toast('Start a match first', true); return false; }
    return true;
  }

  // ── Per-frame ────────────────────────────────────────────────────────────────
  function tick() {
    if (!allowed()) return;
    const m = me();
    if (m) {
      if (S.god && !m.godmode) { m.godmode = true; m._godmode = true; }
      if (S.infSuper) { m.superMeter = 100; m.superReady = true; }
      if (S.noCd) { m.cooldown = 0; m.cooldown2 = 0; m.abilityCooldown = 0; m.abilityCooldown2 = 0; }
      if (S.ohko) m.dmgMult = 999;
      if (S.infLives && typeof m.lives === 'number' && isFinite(m.lives) && m.lives < 3) m.lives = 3;
    }
    if (S.freezeAI && typeof frameCount !== 'undefined') {
      for (const p of everyone()) {
        if (p === m || !p.isAI || p.health <= 0) continue;
        p._aiHoldUntil = frameCount + 2;
        if (p.onGround) p.vx *= 0.5;
      }
    }
    if (S.speed !== 1 && !activeCinematic && !(typeof activeFinisher !== 'undefined' && activeFinisher)) slowMotion = S.speed;
    if (S.gravity !== null && typeof currentArena !== 'undefined' && currentArena) {
      if (!_gravOrig.has(currentArena)) _gravOrig.set(currentArena, currentArena.modifiers);
      const mods = currentArena.modifiers || {};
      if (mods.gravityMult !== S.gravity) currentArena.modifiers = Object.assign({}, mods, { gravityMult: S.gravity });
    }
    if (S.frozen) {
      if (S.stepLeft > 0) S.stepLeft--;
      hitStopFrames = 1e9;
    }
  }

  function drawWorld(c) {
    if (!allowed()) return;
    _lastXf = c.getTransform();
    const sel = S.selected && S.selected.health > 0 ? S.selected : null;
    if (!S.labels && !sel && !(S.teleport && _mouse)) return;
    c.save();
    if (S.labels) {
      c.font = 'bold 10px monospace';
      c.textAlign = 'center';
      for (const p of everyone()) {
        if (p.health <= 0 || typeof p.cx !== 'function') continue;
        const hp = Math.round(p.health) + '/' + Math.round(p.maxHealth || 0);
        const txt = (p.name || p.constructor.name) + '  ' + hp + '  ' + (p.state || '') + (p.isAI ? '  AI' : '');
        c.fillStyle = 'rgba(0,0,0,0.6)';
        c.fillRect(p.cx() - c.measureText(txt).width / 2 - 3, p.y - 34, c.measureText(txt).width + 6, 13);
        c.fillStyle = p.isAI ? '#ffb347' : '#7dffb0';
        c.fillText(txt, p.cx(), p.y - 24);
      }
    }
    if (sel && typeof sel.cx === 'function') {
      c.strokeStyle = '#ffcc44';
      c.lineWidth = 2;
      c.setLineDash([5, 4]);
      c.strokeRect(sel.x - 6, sel.y - 6, sel.w + 12, sel.h + 12);
      c.setLineDash([]);
    }
    if (S.teleport && _mouse) {
      const w = toWorld(_mouse.x, _mouse.y);
      if (w) {
        c.strokeStyle = '#44e0ff';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(w.x, w.y, 14, 0, Math.PI * 2);
        c.moveTo(w.x - 22, w.y); c.lineTo(w.x + 22, w.y);
        c.moveTo(w.x, w.y - 22); c.lineTo(w.x, w.y + 22);
        c.stroke();
      }
    }
    c.restore();
  }

  function toWorld(clientX, clientY) {
    if (!_lastXf || typeof canvas === 'undefined') return null;
    const r = canvas.getBoundingClientRect();
    const px = (clientX - r.left) * canvas.width / r.width;
    const py = (clientY - r.top) * canvas.height / r.height;
    const pt = _lastXf.inverse().transformPoint(new DOMPoint(px, py));
    return { x: pt.x, y: pt.y };
  }

  function placeAt(p, x, y) {
    if (!p) return;
    p.x = x - p.w / 2;
    p.y = y - p.h;
    p.vx = 0; p.vy = 0;
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  function setGod(on) {
    S.god = on;
    const m = me();
    if (m) { m.godmode = on; m._godmode = on; m.invincible = on ? 999999 : 0; }
  }

  function setOhko(on) {
    S.ohko = on;
    const m = me();
    if (!m) return;
    if (on) _savedDmgMult = m.dmgMult;
    else m.dmgMult = _savedDmgMult;
  }

  function setGravity(g) {
    S.gravity = g;
    if (g === null) {
      for (const [arena, mods] of _gravOrig) arena.modifiers = mods;
      _gravOrig.clear();
    }
  }

  function setSpeed(v) {
    S.speed = v;
    if (v === 1) slowMotion = 1;
  }

  function setFrozen(on) {
    S.frozen = on;
    S.stepLeft = 0;
    hitStopFrames = on ? 1e9 : 0;
  }

  function step(n) {
    if (!S.frozen) setFrozen(true);
    S.stepLeft = n;
    hitStopFrames = 0;
  }

  function killTarget(t) {
    if (!t || t.health <= 0) return;
    if (t.godmode || t._godmode) { toast('Target has godmode', true); return; }
    t.invincible = 0;
    if (typeof dealDamage === 'function') dealDamage(me() || t, t, Math.ceil(t.health) + 50, 6);
    if (t.health > 0) toast('Still alive (shielded or immune) — HP ' + Math.round(t.health), true);
  }

  function screenshot(clean) {
    if (typeof canvas === 'undefined') return;
    const prev = clean && typeof settings !== 'undefined' ? { h: settings.hideHud, d: settings.dmgNumbers } : null;
    if (prev) { settings.hideHud = true; settings.dmgNumbers = false; }
    if (_panel) _panel.style.visibility = 'hidden';
    const finish = () => {
      canvas.toBlob(b => {
        if (prev) { settings.hideHud = prev.h; settings.dmgNumbers = prev.d; }
        if (_panel) _panel.style.visibility = '';
        if (!b) { toast('Screenshot failed', true); return; }
        download(b, 'stickman-' + stamp() + '.png');
        toast('Screenshot saved');
      }, 'image/png');
    };
    requestAnimationFrame(() => requestAnimationFrame(finish));
  }

  function toggleRecord() {
    if (_rec) { _rec.stop(); return; }
    if (typeof canvas === 'undefined' || !canvas.captureStream || typeof MediaRecorder === 'undefined') {
      toast('This browser cannot record the canvas', true); return;
    }
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t));
    _recChunks = [];
    _rec = new MediaRecorder(canvas.captureStream(60), mime ? { mimeType: mime, videoBitsPerSecond: 12e6 } : undefined);
    _rec.ondataavailable = e => { if (e.data && e.data.size) _recChunks.push(e.data); };
    _rec.onstop = () => {
      download(new Blob(_recChunks, { type: 'video/webm' }), 'stickman-clip-' + stamp() + '.webm');
      _rec = null;
      toast('Clip saved');
      render();
    };
    _rec.start(500);
    toast('Recording… press Stop to save');
    render();
  }

  function stamp() {
    const d = new Date(), z = n => String(n).padStart(2, '0');
    return d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + '-' + z(d.getHours()) + z(d.getMinutes()) + z(d.getSeconds());
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  // ── UI ──────────────────────────────────────────────────────────────────────
  const CSS = `
#_ownerPanel{position:fixed;top:10px;right:10px;width:318px;max-height:calc(100vh - 20px);overflow-y:auto;z-index:100000;
  background:rgba(8,6,20,0.95);border:1px solid #ffcc44;border-radius:10px;color:#eee;font:12px "Segoe UI",Arial,sans-serif;
  box-shadow:0 8px 30px rgba(0,0,0,.6);user-select:none}
#_ownerPanel .oh{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#1a1426;
  border-bottom:1px solid #3a2f4a;position:sticky;top:0;cursor:move;z-index:1}
#_ownerPanel .oh b{color:#ffcc44;letter-spacing:.08em}
#_ownerPanel .ox{background:none;border:0;color:#aaa;font-size:16px;cursor:pointer}
#_ownerPanel details{border-bottom:1px solid #2a2238}
#_ownerPanel summary{padding:7px 10px;cursor:pointer;color:#ffdf8a;font-weight:600}
#_ownerPanel .ob{padding:2px 10px 10px}
#_ownerPanel .row{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0;align-items:center}
#_ownerPanel button.t{flex:1 1 auto;min-width:64px;padding:5px 6px;border-radius:6px;border:1px solid #4a3d60;background:#221b33;
  color:#ddd;cursor:pointer;font:12px "Segoe UI",Arial,sans-serif}
#_ownerPanel button.t:hover{border-color:#ffcc44}
#_ownerPanel button.on{background:#5a4210;border-color:#ffcc44;color:#fff}
#_ownerPanel button.bad{border-color:#803030}
#_ownerPanel select,#_ownerPanel input{flex:1 1 90px;min-width:0;background:#120e1c;color:#eee;border:1px solid #4a3d60;border-radius:5px;padding:4px}
#_ownerPanel .lbl{color:#998fae;font-size:11px;width:100%}
#_ownerPanel .note{color:#ff9a6a;font-size:11px;padding:4px 10px}
#_ownerPanel .ent{display:flex;gap:6px;align-items:center;padding:3px 4px;border-radius:5px;cursor:pointer}
#_ownerPanel .ent:hover{background:#1d1630}
#_ownerPanel .ent.sel{background:#3b2c0c}
#_ownerPanel .bar{flex:0 0 60px;height:6px;background:#333;border-radius:3px;overflow:hidden}
#_ownerPanel .bar i{display:block;height:100%;background:#5fdc7c}
#_ownerChip{position:fixed;left:10px;bottom:10px;z-index:9990;padding:5px 10px;border-radius:14px;border:1px solid #ffcc44;
  background:rgba(8,6,20,0.85);color:#ffcc44;font:bold 11px "Segoe UI",Arial,sans-serif;letter-spacing:.08em;cursor:pointer;opacity:.75}
#_ownerChip:hover{opacity:1}`;

  const btn = (label, act, opts) => `<button class="t${opts && opts.on ? ' on' : ''}${opts && opts.bad ? ' bad' : ''}" data-a="${act}" title="${(opts && opts.tip) || ''}">${label}</button>`;
  const sec = (id, title, body, open) => `<details data-s="${id}"${open ? ' open' : ''}><summary>${title}</summary><div class="ob">${body}</div></details>`;
  const opts = (obj, nameOf) => Object.keys(obj || {}).sort().map(k => `<option value="${k}">${nameOf ? nameOf(k) : k}</option>`).join('');

  function body() {
    const W = typeof WEAPONS !== 'undefined' ? WEAPONS : {};
    const C = typeof CLASSES !== 'undefined' ? CLASSES : {};
    const A = typeof ARENAS !== 'undefined' ? ARENAS : {};
    const nm = o => k => (o[k] && o[k].name ? o[k].name + ' (' + k + ')' : k);
    const online = typeof onlineMode !== 'undefined' && onlineMode;
    return (online ? '<div class="note">Online match: these tools only change your screen and can desync the match.</div>' : '') +
      sec('me', 'Me', `
        <div class="row">${btn('God mode', 'god', { on: S.god, tip: 'Invincible, fly with jump/shield, pass through floors' })}${btn('Infinite super', 'infSuper', { on: S.infSuper })}</div>
        <div class="row">${btn('No cooldowns', 'noCd', { on: S.noCd })}${btn('One-hit KO', 'ohko', { on: S.ohko })}${btn('Infinite lives', 'infLives', { on: S.infLives })}</div>
        <div class="row">${btn('Full heal', 'heal')}${btn('Revive me', 'reviveMe')}${btn('Click to teleport', 'teleport', { on: S.teleport, tip: 'Click the arena to move there. Hold Shift to keep teleporting.' })}</div>`, true) +
      sec('load', 'Loadout', `
        <div class="row"><select id="_owW">${opts(W, nm(W))}</select>${btn('Set weapon', 'setW')}</div>
        <div class="row"><select id="_owC">${opts(C, nm(C))}</select>${btn('Set class', 'setC')}</div>
        <div class="lbl">Applies to the selected fighter (Fighters section), or you if none is selected.</div>`) +
      sec('ents', 'Fighters', `
        <div id="_owList"></div>
        <div class="row">${btn('Heal', 'selHeal')}${btn('Kill', 'selKill', { bad: true })}${btn('HP → 1', 'selHp1')}${btn('Godmode', 'selGod')}</div>
        <div class="row">${btn('Bring to me', 'selBring')}${btn('Go to it', 'selGo')}${btn('Deselect', 'selNone')}</div>
        <div class="row">${btn('Labels over heads', 'labels', { on: S.labels })}</div>`) +
      sec('foes', 'Enemies & spawning', `
        <div class="row">${btn('Freeze AI', 'freezeAI', { on: S.freezeAI, tip: 'AI fighters stand still until you turn this off' })}${btn('Kill enemies', 'killEnemies', { bad: true })}</div>
        <div class="row">${btn('Heal all', 'healAll')}${btn('Revive all', 'reviveAll')}${btn('Reset bot AI', 'botsReset')}</div>
        <div class="row">${btn('Boss ph 1', 'ph1')}${btn('Boss ph 2', 'ph2')}${btn('Boss ph 3', 'ph3')}</div>
        <div class="lbl">Spawn a bot with the weapon and class picked in Loadout:</div>
        <div class="row">${btn('Spawn bot', 'spBot')}${btn('Dummy', 'spDummy')}${btn('Minion', 'spMinion')}${btn('Beast', 'spBeast')}${btn('Yeti', 'spYeti')}</div>`) +
      sec('time', 'Time & physics', `
        <div class="lbl">Game speed</div>
        <div class="row">${[0.1, 0.25, 0.5, 1].map(v => btn(v + '×', 'speed:' + v, { on: S.speed === v })).join('')}</div>
        <div class="row">${btn(S.frozen ? 'Unfreeze' : 'Freeze time', 'freeze', { on: S.frozen })}${btn('Step 1 frame', 'step1')}${btn('Step 10', 'step10')}</div>
        <div class="lbl">Gravity</div>
        <div class="row">${[['Moon', 0.3], ['Light', 0.6], ['Heavy', 1.6], ['Crush', 2.5]].map(([n, v]) => btn(n, 'grav:' + v, { on: S.gravity === v })).join('')}${btn('Normal', 'grav:reset', { on: S.gravity === null })}</div>`) +
      sec('world', 'Arena & view', `
        <div class="row"><select id="_owA">${opts(A, nm(A))}</select>${btn('Change arena', 'setA')}</div>
        <div class="row">${btn('Hitboxes', 'dbgHit', { on: typeof showHitboxes !== 'undefined' && showHitboxes && debugMode })}${btn('Platforms', 'dbgCol', { on: typeof showCollisionBoxes !== 'undefined' && showCollisionBoxes && debugMode })}${btn('Physics', 'dbgPhy', { on: typeof showPhysicsInfo !== 'undefined' && showPhysicsInfo && debugMode })}</div>
        <div class="row">${btn('Debug HUD', 'dbg', { on: typeof debugMode !== 'undefined' && debugMode })}${btn('Hide HUD', 'hideHud', { on: typeof settings !== 'undefined' && settings.hideHud })}${btn('Dmg numbers', 'dmgNum', { on: typeof settings !== 'undefined' && settings.dmgNumbers })}</div>
        <div class="row">${btn('Screen shake', 'shake', { on: typeof settings !== 'undefined' && settings.screenShake })}${btn('Particles', 'parts', { on: typeof settings !== 'undefined' && settings.particles })}</div>`) +
      sec('cap', 'Capture', `
        <div class="row">${btn('Screenshot', 'shot')}${btn('Clean screenshot', 'shotClean', { tip: 'No HUD, no damage numbers, no panel' })}</div>
        <div class="row">${btn(_rec ? '■ Stop & save clip' : '● Record clip', 'rec', { on: !!_rec, tip: 'Video only (.webm), no game audio' })}</div>`) +
      sec('go', 'Start & jump', `
        <div class="row">${btn('Vs bot', 'mBot')}${btn('Training', 'mTrain')}${btn('Boss', 'mBoss')}</div>
        <div class="row">${btn('True Form', 'mTF')}${btn('Sovereign', 'mSov')}${btn('Main menu', 'menu')}</div>
        <div class="row">${btn('Jump menu (story, cinematics, arenas)', 'jump')}</div>`) +
      sec('acct', 'Account & progress', `
        <div class="row">${btn('+10,000 coins', 'coins')}${btn('Unlock everything', 'unlock')}</div>
        <div class="row"><input id="_owCh" type="number" min="1" placeholder="Chapter # (1 = first)">${btn('Set story chapter', 'setCh')}</div>`) +
      sec('panels', 'Other panels', `
        <div class="row">${btn('Console', 'console')}${btn('Admin (F9)', 'admin')}${btn('Live ops (F10)', 'liveops')}</div>
        <div class="lbl">Keys: \` toolbox · Shift+O console · F6 what's new · F7 Sovereign plays for you · F8 jump menu · F9 admin · F10 live ops</div>`);
  }

  function render() {
    if (!_panel) return;
    const openSecs = new Set([..._panel.querySelectorAll('details[open]')].map(d => d.dataset.s));
    const keep = {};
    for (const id of ['_owW', '_owC', '_owA', '_owCh']) { const el = _panel.querySelector('#' + id); if (el) keep[id] = el.value; }
    const scroll = _panel.scrollTop;
    _panel.querySelector('.oc').innerHTML = body();
    if (openSecs.size) _panel.querySelectorAll('details').forEach(d => { d.open = openSecs.has(d.dataset.s); });
    for (const id in keep) { const el = _panel.querySelector('#' + id); if (el && keep[id]) el.value = keep[id]; }
    _panel.scrollTop = scroll;
    renderList();
  }

  function renderList() {
    const box = _panel && _panel.querySelector('#_owList');
    if (!box) return;
    const list = everyone();
    if (!list.length) { box.innerHTML = '<div class="lbl">No match running.</div>'; return; }
    box.innerHTML = list.map((p, i) => {
      const pct = Math.max(0, Math.min(100, 100 * p.health / (p.maxHealth || 1)));
      const tag = p === me() ? 'you' : p.isBoss ? 'boss' : p.isAI ? 'AI' : 'human';
      const lives = typeof p.lives === 'number' && isFinite(p.lives) ? ' ×' + p.lives : '';
      return `<div class="ent${p === S.selected ? ' sel' : ''}" data-i="${i}"><span style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">` +
        `${(p.name || p.constructor.name)} <span style="color:#998fae">${tag}${lives}</span></span>` +
        `<span class="bar"><i style="width:${pct}%"></i></span><span style="width:46px;text-align:right">${Math.round(p.health)}</span></div>`;
    }).join('');
  }

  function act(a) {
    if (S.frozen && /^(m[A-Z]|menu$|jump$)/.test(a)) setFrozen(false);
    const m = me();
    const tgt = S.selected && everyone().includes(S.selected) ? S.selected : null;
    const forT = tgt || m;
    const val = id => { const el = _panel.querySelector('#' + id); return el ? el.value : ''; };
    if (a.startsWith('speed:')) { setSpeed(parseFloat(a.slice(6))); return render(); }
    if (a.startsWith('grav:'))  { setGravity(a === 'grav:reset' ? null : parseFloat(a.slice(5))); return render(); }
    switch (a) {
      case 'god':      setGod(!S.god); break;
      case 'infSuper': S.infSuper = !S.infSuper; break;
      case 'noCd':     S.noCd = !S.noCd; break;
      case 'ohko':     setOhko(!S.ohko); break;
      case 'infLives': S.infLives = !S.infLives; break;
      case 'heal':     if (needGame()) { m.health = m.maxHealth; toast('Healed'); } break;
      case 'reviveMe': if (needGame()) run('revive p' + (players.indexOf(m) + 1)); break;
      case 'teleport': S.teleport = !S.teleport; if (S.teleport) toast('Click the arena to teleport'); break;
      case 'setW':
        if (!needGame()) break;
        if (typeof WEAPONS !== 'undefined' && WEAPONS[val('_owW')]) {
          forT.weapon = WEAPONS[val('_owW')]; forT.weaponKey = val('_owW');
          if (typeof updateClassWeapon === 'function') { try { updateClassWeapon(forT); } catch (e) {} }
          toast((forT.name || 'Fighter') + ' now uses ' + val('_owW'));
        }
        break;
      case 'setC':
        if (!needGame()) break;
        if (typeof applyClass === 'function') { applyClass(forT, val('_owC')); toast((forT.name || 'Fighter') + ' is now ' + val('_owC')); }
        break;
      case 'selHeal':  if (tgt) { tgt.health = tgt.maxHealth; toast('Healed ' + (tgt.name || '')); } else toast('Select a fighter first', true); break;
      case 'selKill':  if (tgt) killTarget(tgt); else toast('Select a fighter first', true); break;
      case 'selHp1':   if (tgt) { tgt.health = 1; } else toast('Select a fighter first', true); break;
      case 'selGod':   if (tgt) { const on = !tgt.godmode; tgt.godmode = on; tgt._godmode = on; tgt.invincible = on ? 999999 : 0; toast('Godmode ' + (on ? 'ON' : 'OFF') + ' for ' + (tgt.name || 'target')); } else toast('Select a fighter first', true); break;
      case 'selBring': if (tgt && m) placeAt(tgt, m.cx() + (m.facing || 1) * 70, m.y + m.h); else toast('Select a fighter first', true); break;
      case 'selGo':    if (tgt && m) placeAt(m, tgt.cx() - (tgt.facing || 1) * 70, tgt.y + tgt.h); else toast('Select a fighter first', true); break;
      case 'selNone':  S.selected = null; break;
      case 'labels':   S.labels = !S.labels; break;
      case 'freezeAI': S.freezeAI = !S.freezeAI; break;
      case 'killEnemies': if (needGame()) run('kill enemies'); break;
      case 'healAll':  if (needGame()) run('heal all'); break;
      case 'reviveAll': if (needGame()) run('revive all'); break;
      case 'botsReset': run('bots reset'); break;
      case 'ph1': case 'ph2': case 'ph3': run('boss phase ' + a.slice(2)); break;
      case 'spBot':    if (needGame()) run('spawn bot ' + val('_owW') + ' ' + val('_owC')); break;
      case 'spDummy':  if (needGame()) run('spawn dummy'); break;
      case 'spMinion': if (needGame()) run('spawn minion'); break;
      case 'spBeast':  if (needGame()) run('spawn forestbeast'); break;
      case 'spYeti':   if (needGame()) run('spawn yeti'); break;
      case 'freeze':   if (needGame()) setFrozen(!S.frozen); break;
      case 'step1':    if (needGame()) step(1); break;
      case 'step10':   if (needGame()) step(10); break;
      case 'setA':     if (needGame()) run('setmap ' + val('_owA')); break;
      case 'dbg':      debugMode = !debugMode; break;
      case 'dbgHit':   showHitboxes = !(showHitboxes && debugMode); if (showHitboxes) debugMode = true; break;
      case 'dbgCol':   showCollisionBoxes = !(showCollisionBoxes && debugMode); if (showCollisionBoxes) debugMode = true; break;
      case 'dbgPhy':   showPhysicsInfo = !(showPhysicsInfo && debugMode); if (showPhysicsInfo) debugMode = true; break;
      case 'hideHud':  settings.hideHud = !settings.hideHud; break;
      case 'dmgNum':   settings.dmgNumbers = !settings.dmgNumbers; break;
      case 'shake':    settings.screenShake = !settings.screenShake; break;
      case 'parts':    settings.particles = !settings.particles; break;
      case 'shot':     screenshot(false); break;
      case 'shotClean': screenshot(true); break;
      case 'rec':      toggleRecord(); break;
      case 'mBot':     run('startmatch p1vsbot'); break;
      case 'mTrain':   run('startmatch training'); break;
      case 'mBoss':    run('startboss boss'); break;
      case 'mTF':      run('startboss trueform'); break;
      case 'mSov':     run('startmatch sovereign'); break;
      case 'menu':     if (typeof backToMenu === 'function' && typeof gameRunning !== 'undefined' && gameRunning) backToMenu(); break;
      case 'jump':     if (typeof _dbgJumpMenuOpen === 'function') _dbgJumpMenuOpen(); break;
      case 'coins':    run('coins give 10000'); break;
      case 'unlock':   run('unlockall'); run('unlockallskills'); break;
      case 'setCh': {
        const n = parseInt(val('_owCh'), 10);
        if (!(n >= 1)) { toast('Enter a chapter number (1 = the first chapter)', true); break; }
        run('setchapter ' + (n - 1));
        break;
      }
      case 'console':  if (typeof openGameConsole === 'function') openGameConsole(); break;
      case 'admin':    if (typeof _adminPanelToggle === 'function') _adminPanelToggle(); break;
      case 'liveops':  if (window.AdminDash) AdminDash.toggle(); break;
    }
    render();
  }

  function build() {
    if (_panel) return;
    if (!document.getElementById('_ownerCss')) {
      const st = document.createElement('style');
      st.id = '_ownerCss';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    _panel = document.createElement('div');
    _panel.id = '_ownerPanel';
    _panel.innerHTML = '<div class="oh"><b>OWNER TOOLBOX</b><button class="ox" title="Close (`)">✕</button></div><div class="oc"></div>';
    document.body.appendChild(_panel);
    _panel.querySelector('.ox').onclick = close;
    _panel.addEventListener('click', e => {
      const b = e.target.closest('button[data-a]');
      if (b) { act(b.dataset.a); return; }
      const row = e.target.closest('.ent[data-i]');
      if (row) {
        const p = everyone()[+row.dataset.i];
        S.selected = p === S.selected ? null : p;
        renderList();
      }
    });
    // Keys typed into the panel's inputs must not drive the fighter.
    _panel.addEventListener('keydown', e => e.stopPropagation());
    const head = _panel.querySelector('.oh');
    head.addEventListener('mousedown', e => {
      if (e.target.closest('button')) return;
      const r = _panel.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
      const mv = ev => { _panel.style.left = Math.max(0, ev.clientX - ox) + 'px'; _panel.style.top = Math.max(0, ev.clientY - oy) + 'px'; _panel.style.right = 'auto'; };
      const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
      document.addEventListener('mousemove', mv);
      document.addEventListener('mouseup', up);
    });
    render();
    _panel._iv = setInterval(() => { if (_panel && _panel.style.display !== 'none') renderList(); }, 300);
  }

  function open() {
    if (!allowed()) { toast('Owner Toolbox needs the developer role on this account', true); return; }
    build();
    _panel.style.display = '';
    render();
  }
  function close() { if (_panel) _panel.style.display = 'none'; }
  function toggle() { if (_panel && _panel.style.display !== 'none') close(); else open(); }

  // ── Wiring ──────────────────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key !== '`' || e.repeat) return;
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
    if (!allowed()) return;
    e.preventDefault();
    toggle();
  });

  document.addEventListener('mousemove', e => { _mouse = { x: e.clientX, y: e.clientY }; }, true);
  document.addEventListener('mousedown', e => {
    if (!S.teleport || typeof canvas === 'undefined' || e.target !== canvas || !allowed()) return;
    if (typeof gameRunning === 'undefined' || !gameRunning) return;
    const w = toWorld(e.clientX, e.clientY);
    if (!w) return;
    e.preventDefault();
    e.stopPropagation();
    placeAt(me(), w.x, w.y + (me() ? me().h / 2 : 0));
    if (!e.shiftKey) { S.teleport = false; render(); }
  }, true);

  setInterval(() => {
    // tick() can't run while frozen, so leaving the match is caught here instead.
    if (S.frozen && (typeof gameRunning === 'undefined' || !gameRunning)) setFrozen(false);
    const ok = allowed();
    if (ok && !_chip && document.body) {
      _chip = document.createElement('div');
      _chip.id = '_ownerChip';
      _chip.textContent = 'OWNER';
      _chip.title = 'Owner Toolbox (`)';
      _chip.onclick = toggle;
      if (!document.getElementById('_ownerCss')) {
        const st = document.createElement('style'); st.id = '_ownerCss'; st.textContent = CSS; document.head.appendChild(st);
      }
      document.body.appendChild(_chip);
    } else if (!ok && _chip) {
      _chip.remove(); _chip = null; close();
    }
  }, 1500);

  return { tick, drawWorld, open, close, toggle, state: S };
})();
window.OwnerTools = OwnerTools;
