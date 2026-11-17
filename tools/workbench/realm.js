'use strict';
// Realm studio (DEV ONLY): lay out realm rooms on the live game. Open /index.html?wb=realm through
// tools/workbench/server.js. The room runs in standalone Realm mode (no room foes spawn there; foes show as
// markers), so you can walk it with the keyboard while you edit it with the mouse.
//
//   Drag a part to move it (snaps to 10 px). Drag the small square on a part's right edge to resize
//   (ledges, spikes, lifts, floor gaps, steps). A lift's dashed top stop drags on its own.
//   Click a part to select it; its fields show as JSON below and Apply writes them back. Del removes it.
//   The palette adds a part at the middle of the view. Save writes the room into js/smb-realm.js
//   (tools/workbench/realm-patch.js), replacing that room's literal.
(function () {
  if (window.__wbRealm || !/[?&]wb=realm\b/.test(location.search)) return;
  const F = () => REALM_FLOOR_Y;
  const S = {
    realm: null, room: null, sel: null, drag: null, dirty: false, ui: null, ov: null,
  };
  window.__wbRealm = S;

  const snap = v => Math.round(v / 10) * 10;
  const defs = () => REALM_DEFS;
  const room = () => S.realm && defs()[S.realm] && defs()[S.realm].rooms[S.room];

  // Every editable part in the room as { list, i, kind, box(r), move(dx,dy), resize(dx), ... }.
  function parts(R) {
    const out = [];
    const add = (list, kind, box, opt) => (R[list] || []).forEach((v, i) => out.push(Object.assign({ list, i, kind, v, box: () => box(R[list][i]) }, opt || {})));
    const g = F();
    add('ledges', 'ledge', l => [l[0], l[1], l[2], 16], { move: (l, dx, dy) => { l[0] += dx; l[1] += dy; }, resize: (l, dx) => { l[2] = Math.max(40, l[2] + dx); } });
    add('steps', 'step', s => [s[0], g - s[1], s[2], s[1]], { move: (s, dx, dy) => { s[0] += dx; s[1] = Math.max(10, s[1] - dy); }, resize: (s, dx) => { s[2] = Math.max(20, s[2] + dx); } });
    add('spikes', 'spikes', s => [s[0], g - 18, s[1] - s[0], 18], { move: (s, dx) => { s[0] += dx; s[1] += dx; }, resize: (s, dx) => { s[1] = Math.max(s[0] + 20, s[1] + dx); } });
    add('chests', 'chest', c => [c.x - 22, (c.y || g) - 36, 44, 36], { move: (c, dx, dy) => { c.x += dx; if (c.y != null || dy) c.y = (c.y || g) + dy; if (c.y === g) delete c.y; } });
    add('blocks', 'block', b => [b.x - 32, g - 64, 64, 64], { move: (b, dx) => { b.x += dx; } });
    add('plates', 'plate', p => [p.x - 42, g - 10, 84, 10], { move: (p, dx) => { p.x += dx; } });
    add('bars', 'bars', b => [b.x - 14, g - 300, 28, 300], { move: (b, dx) => { b.x += dx; } });
    add('cracks', 'crack', c => [c.x - 24, g - 300, 48, 300], { move: (c, dx) => { c.x += dx; } });
    add('levers', 'lever', l => [l.x - 16, (l.y || g) - 60, 32, 60], { move: (l, dx, dy) => { l.x += dx; if (l.y != null || dy) l.y = (l.y || g) + dy; if (l.y === g) delete l.y; } });
    add('lifts', 'lift', l => [l.x, l.y0, l.w || 120, 14], { move: (l, dx, dy) => { l.x += dx; l.y0 += dy; }, resize: (l, dx) => { l.w = Math.max(60, (l.w || 120) + dx); } });
    add('foes', 'foe', f => [f.x - 20, g - 90, 40, 90], { move: (f, dx) => { f.x += dx; } });
    add('npcs', 'npc', n => [n.x - 30, g - 160, 60, 160], { move: (n, dx) => { n.x += dx; } });
    add('burn', 'burn', b => [b.x - 70, g - 150, 140, 150], { move: (b, dx) => { b.x += dx; } });
    (R.doors || []).forEach((d, i) => {
      if (d.kind === 'arch') out.push({ list: 'doors', i, kind: 'door', v: d, box: () => [R.doors[i].x - 46, (R.doors[i].y || g) - 150, 92, 150],
        move: (d2, dx, dy) => { d2.x += dx; if (d2.y != null || dy) d2.y = (d2.y || g) + dy; if (d2.y === g) delete d2.y; } });
      else if (d.kind === 'drop') out.push({ list: 'doors', i, kind: 'drop', v: d, box: () => [R.doors[i].x0, g - 6, R.doors[i].x1 - R.doors[i].x0, 12],
        move: (d2, dx) => { d2.x0 += dx; d2.x1 += dx; }, resize: (d2, dx) => { d2.x1 = Math.max(d2.x0 + 40, d2.x1 + dx); } });
      else if (d.kind === 'fall') out.push({ list: 'doors', i, kind: 'fall', v: d, box: () => [R.doors[i].x - 20, g - 400, 40, 30], move: (d2, dx) => { d2.x += dx; } });
    });
    // A lift's top stop is its own handle.
    (R.lifts || []).forEach((l, i) => out.push({ list: 'lifts', i, kind: 'lift top', v: l, box: () => [R.lifts[i].x, R.lifts[i].y1, R.lifts[i].w || 120, 14],
      move: (l2, dx, dy) => { l2.y1 += dy; }, dashed: true }));
    return out;
  }

  const PALETTE = {
    ledge: (x) => ['ledges', [x - 70, F() - 120, 140]],
    chest: (x) => ['chests', { id: 'c' + Date.now() % 10000, x, gives: 'tokens:25' }],
    block: (x) => ['blocks', { id: 'b' + Date.now() % 10000, x }],
    plate: (x) => ['plates', { id: 'p' + Date.now() % 10000, x, latch: true }],
    bars: (x) => ['bars', { id: 'g' + Date.now() % 10000, x, when: 'clear' }],
    crack: (x) => ['cracks', { id: 'k' + Date.now() % 10000, x, hits: 4 }],
    lever: (x) => ['levers', { id: 'l' + Date.now() % 10000, x, line: 'Something opens.' }],
    spikes: (x) => ['spikes', [x - 100, x + 100]],
    step: (x) => ['steps', [x - 30, 70, 60]],
    lift: (x) => ['lifts', { id: 'u' + Date.now() % 10000, x: x - 60, w: 120, y0: F() - 60, y1: F() - 300 }],
    foe: (x) => ['foes', { x, name: 'Guard', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'medium', color: '#887766' }],
    arch: (x) => ['doors', { id: 'd' + Date.now() % 10000, kind: 'arch', x, to: ['ROOM', 'DOOR'] }],
  };

  // ---------- room lifecycle ----------
  function rebuild(keepPlayer) {
    const p = players && players[0];
    const pos = p ? { x: p.x, y: p.y } : null;
    ARENAS.__realm__ = realmMakeArena(S.room);
    currentArena = ARENAS.__realm__;
    if (typeof _realmPuzzleReset === 'function') _realmPuzzleReset(S.room);
    if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();
    if (keepPlayer && p && pos) { p.x = pos.x; p.y = pos.y; }
  }

  function openRoom(realm, roomKey) {
    S.realm = realm; S.room = roomKey; S.sel = null;
    if (typeof gameRunning === 'undefined' || !gameRunning || gameMode !== 'realm' || realmKey !== realm) {
      realmKey = realm;
      if (typeof selectMode === 'function') selectMode('realm');
      gameMode = 'realm';
      if (typeof startGame === 'function') startGame(true);
    }
    setTimeout(() => {
      try {
        realmKey = realm;
        if (!realmSave) realmSave = _realmLoad();
        const R = room();
        const door = (R.doors || []).find(d => d.kind !== 'edge') || (R.doors || [])[0];
        _realmEnterRoom(roomKey, door ? door.id : null);
        if (players[0]) players[0].invincible = 1e9;
        renderPanel();
      } catch (e) { log('open failed: ' + e.message, 'err'); }
    }, 700);
  }

  // ---------- coordinates ----------
  function view() {
    const c = document.getElementById('gameCanvas'), m = window._realmView;
    if (!c || !m) return null;
    const r = c.getBoundingClientRect();
    const k = r.width / c.width;
    return { r, k, m };
  }
  function toScreen(x, y) {
    const v = view(); if (!v) return null;
    return [v.r.left + (v.m.a * x + v.m.c * y + v.m.e) * v.k, v.r.top + (v.m.b * x + v.m.d * y + v.m.f) * v.k];
  }
  function toWorld(sx, sy) {
    const v = view(); if (!v) return null;
    const cx = (sx - v.r.left) / v.k, cy = (sy - v.r.top) / v.k;
    const det = v.m.a * v.m.d - v.m.b * v.m.c;
    return [(v.m.d * (cx - v.m.e) - v.m.c * (cy - v.m.f)) / det, (-v.m.b * (cx - v.m.e) + v.m.a * (cy - v.m.f)) / det];
  }

  // ---------- overlay ----------
  function drawOverlay() {
    requestAnimationFrame(drawOverlay);
    const ov = S.ov; if (!ov) return;
    const ctx2 = ov.getContext('2d');
    ov.width = innerWidth; ov.height = innerHeight;
    ctx2.clearRect(0, 0, ov.width, ov.height);
    const R = room();
    if (!R || gameMode !== 'realm' || realmRoomKey !== S.room) return;
    const v = view(); if (!v) return;
    const sc = v.m.a * v.k;
    ctx2.font = '11px monospace';
    for (const pt of parts(R)) {
      const b = pt.box(), a = toScreen(b[0], b[1]);
      if (!a) continue;
      const w = b[2] * sc, h = b[3] * sc;
      const sel = S.sel && S.sel.list === pt.list && S.sel.i === pt.i && S.sel.kind === pt.kind;
      ctx2.setLineDash(pt.dashed ? [5, 4] : []);
      ctx2.strokeStyle = sel ? '#ffe066' : pt.kind === 'foe' ? 'rgba(255,110,90,0.9)' : 'rgba(120,220,255,0.75)';
      ctx2.lineWidth = sel ? 2 : 1;
      ctx2.strokeRect(a[0], a[1], w, h);
      if (pt.kind === 'foe') { ctx2.fillStyle = 'rgba(255,110,90,0.15)'; ctx2.fillRect(a[0], a[1], w, h); }
      ctx2.fillStyle = sel ? '#ffe066' : 'rgba(200,235,255,0.9)';
      ctx2.fillText(pt.kind + (pt.v && pt.v.id ? ' ' + pt.v.id : pt.v && pt.v.name ? ' ' + pt.v.name : ''), a[0], a[1] - 3);
      if (pt.resize) { ctx2.fillStyle = sel ? '#ffe066' : 'rgba(120,220,255,0.9)'; ctx2.fillRect(a[0] + w - 4, a[1] + h / 2 - 4, 8, 8); }
    }
    ctx2.setLineDash([]);
    // Room bounds.
    const l = toScreen(0, F()), r = toScreen(R.w, F());
    if (l && r) { ctx2.strokeStyle = 'rgba(255,255,255,0.35)'; ctx2.beginPath(); ctx2.moveTo(l[0], l[1] - 600 * sc); ctx2.lineTo(l[0], l[1]); ctx2.moveTo(r[0], r[1] - 600 * sc); ctx2.lineTo(r[0], r[1]); ctx2.stroke(); }
  }

  function hit(sx, sy) {
    const R = room(); if (!R) return null;
    const w = toWorld(sx, sy); if (!w) return null;
    const v = view(), tol = 6 / (v.m.a * v.k);
    let best = null;
    for (const pt of parts(R)) {
      const b = pt.box();
      if (pt.resize && Math.abs(w[0] - (b[0] + b[2])) < tol * 2 && w[1] > b[1] - tol && w[1] < b[1] + b[3] + tol) return { pt, mode: 'resize', w };
      if (w[0] >= b[0] - tol && w[0] <= b[0] + b[2] + tol && w[1] >= b[1] - tol && w[1] <= b[1] + b[3] + tol) {
        // Smallest box wins, so a plate on the floor beats the bars above it.
        if (!best || b[2] * b[3] < best.area) best = { pt, mode: 'move', w, area: b[2] * b[3] };
      }
    }
    return best;
  }

  function onDown(e) {
    if (e.button !== 0) return;
    const h = hit(e.clientX, e.clientY);
    if (!h) { S.sel = null; renderSel(); return; }
    e.preventDefault(); e.stopPropagation();
    S.sel = { list: h.pt.list, i: h.pt.i, kind: h.pt.kind };
    S.drag = { pt: h.pt, mode: h.mode, last: h.w, acc: [0, 0] };
    renderSel();
  }
  function onMove(e) {
    const ov = S.ov;
    if (!S.drag) { if (ov) ov.style.cursor = hit(e.clientX, e.clientY) ? 'move' : 'default'; return; }
    const w = toWorld(e.clientX, e.clientY); if (!w) return;
    const d = S.drag;
    d.acc[0] += w[0] - d.last[0]; d.acc[1] += w[1] - d.last[1]; d.last = w;
    const dx = snap(d.acc[0]), dy = snap(d.acc[1]);
    if (!dx && !dy) return;
    d.acc[0] -= dx; d.acc[1] -= dy;
    const R = room(), target = R[d.pt.list][d.pt.i];
    if (d.mode === 'resize') d.pt.resize(target, dx); else d.pt.move(target, dx, dy);
    markDirty(); rebuild(true); renderSel();
  }
  function onUp() { S.drag = null; }

  function onKey(e) {
    if (!S.sel || (e.key !== 'Delete' && e.key !== 'Backspace') || /input|textarea/i.test(document.activeElement.tagName)) return;
    const R = room();
    if (S.sel.kind === 'lift top') S.sel.kind = 'lift';
    R[S.sel.list].splice(S.sel.i, 1);
    if (!R[S.sel.list].length) delete R[S.sel.list];
    S.sel = null; markDirty(); rebuild(true); renderSel();
    e.preventDefault();
  }

  // ---------- panel ----------
  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { if (k === 'style') n.style.cssText = v; else if (k.startsWith('on')) n[k] = v; else n.setAttribute(k, v); });
    (kids || []).forEach(k => n.append(k));
    return n;
  }
  function log(msg, cls) {
    if (!S.ui) { console.log('[realm studio]', msg); return; }
    const d = el('div', { style: 'color:' + (cls === 'err' ? '#ff8877' : cls === 'ok' ? '#88ffaa' : '#aab') }, [msg]);
    S.ui.log.prepend(d);
  }
  function markDirty() { S.dirty = true; if (S.ui) S.ui.save.textContent = 'Save room *'; }

  function renderPanel() {
    const ui = S.ui; if (!ui) return;
    ui.realm.innerHTML = '';
    Object.keys(defs()).forEach(k => ui.realm.append(el('option', { value: k }, [k])));
    ui.realm.value = S.realm || Object.keys(defs())[0];
    ui.room.innerHTML = '';
    Object.keys(defs()[ui.realm.value].rooms).forEach(k => ui.room.append(el('option', { value: k }, [k])));
    if (S.room && defs()[ui.realm.value].rooms[S.room]) ui.room.value = S.room;
    const R = room();
    ui.head.value = R ? JSON.stringify(Object.fromEntries(Object.entries(R).filter(([k]) => ['name', 'gx', 'gy', 'w', 'back', 'wall', 'dark', 'stone', 'say', 'floor'].includes(k)))) : '';
    renderSel();
  }
  function renderSel() {
    const ui = S.ui; if (!ui) return;
    const R = room();
    if (!R || !S.sel) { ui.sel.textContent = 'Nothing selected'; ui.json.value = ''; return; }
    ui.sel.textContent = S.sel.kind + ' (' + S.sel.list + '[' + S.sel.i + '])';
    if (document.activeElement !== ui.json) ui.json.value = JSON.stringify(R[S.sel.list][S.sel.i]);
  }

  function buildUI() {
    const css = 'position:fixed;top:10px;right:10px;width:290px;max-height:calc(100vh - 20px);overflow:auto;z-index:100000;' +
      'background:rgba(12,14,22,0.94);border:1px solid #445;border-radius:6px;padding:10px;color:#dde;font:12px system-ui,sans-serif;';
    const btn = (label, fn) => el('button', { style: 'margin:2px;padding:3px 7px;background:#2a3044;color:#dde;border:1px solid #556;border-radius:4px;cursor:pointer;font-size:11px', onclick: fn }, [label]);
    const ui = {};
    ui.realm = el('select', { style: 'width:48%', onchange: () => { S.realm = ui.realm.value; S.room = null; renderPanel(); } });
    ui.room = el('select', { style: 'width:48%;margin-left:4%' });
    ui.head = el('textarea', { rows: 4, style: 'width:100%;box-sizing:border-box;background:#0b0d14;color:#cfe;border:1px solid #334;font:11px monospace' });
    ui.sel = el('div', { style: 'margin-top:8px;color:#ffe066' }, ['Nothing selected']);
    ui.json = el('textarea', { rows: 6, style: 'width:100%;box-sizing:border-box;background:#0b0d14;color:#cfe;border:1px solid #334;font:11px monospace' });
    ui.save = btn('Save room', save);
    ui.log = el('div', { style: 'margin-top:8px;max-height:140px;overflow:auto;font:11px monospace' });
    const pal = el('div', {}, Object.keys(PALETTE).map(k => btn('+ ' + k, () => addPart(k))));
    ui.box = el('div', { style: css }, [
      el('div', { style: 'font-weight:700;margin-bottom:6px' }, ['Realm studio']),
      ui.realm, ui.room,
      el('div', {}, [btn('Open room', () => openRoom(ui.realm.value, ui.room.value)), btn('New room', newRoom), ui.save]),
      el('div', { style: 'margin-top:8px;color:#99a' }, ['Room fields (JSON)']), ui.head, btn('Apply room fields', applyHead),
      el('div', { style: 'margin-top:8px;color:#99a' }, ['Add part']), pal,
      ui.sel, ui.json, btn('Apply part', applyPart), btn('Delete part', () => onKey({ key: 'Delete', preventDefault() {} })),
      el('div', { style: 'margin-top:6px;color:#778;line-height:1.4' }, ['Drag to move (10 px grid), drag the right-edge square to resize, Del removes. Walk the room with A/D/W to test it. Doors to @main do nothing outside story.']),
      ui.log,
    ]);
    document.body.append(ui.box);
    S.ui = ui;
    S.ov = el('canvas', { style: 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:99999;pointer-events:none' });
    document.body.append(S.ov);
    // The overlay takes the mouse only over a part, so the panel and game stay clickable.
    window.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('div') === ui.box) return; if (hit(e.clientX, e.clientY)) onDown(e); else if (!ui.box.contains(e.target)) { S.sel = null; renderSel(); } }, true);
    window.addEventListener('mousemove', onMove, true);
    window.addEventListener('mouseup', onUp, true);
    window.addEventListener('keydown', onKey, true);
    drawOverlay();
  }

  function addPart(kind) {
    const R = room(); if (!R) { log('Open a room first.', 'err'); return; }
    const c = toWorld(innerWidth * 0.4, innerHeight * 0.5);
    const x = snap(Math.max(60, Math.min(R.w - 60, c ? c[0] : R.w / 2)));
    const [list, v] = PALETTE[kind](x);
    (R[list] = R[list] || []).push(v);
    S.sel = { list, i: R[list].length - 1, kind: kind === 'arch' ? 'door' : kind };
    markDirty(); rebuild(true); renderSel();
  }
  function applyPart() {
    const R = room(); if (!R || !S.sel) return;
    try { R[S.sel.list][S.sel.i] = JSON.parse(S.ui.json.value); markDirty(); rebuild(true); log('part applied', 'ok'); }
    catch (e) { log('JSON: ' + e.message, 'err'); }
  }
  function applyHead() {
    const R = room(); if (!R) return;
    try {
      const h = JSON.parse(S.ui.head.value);
      ['name', 'gx', 'gy', 'w', 'back', 'wall', 'dark', 'stone', 'say', 'floor'].forEach(k => { if (k in h) R[k] = h[k]; else delete R[k]; });
      markDirty(); rebuild(true); log('room fields applied', 'ok');
    } catch (e) { log('JSON: ' + e.message, 'err'); }
  }
  function newRoom() {
    const realm = S.ui.realm.value;
    const name = prompt('Key for the new room (letters, digits, _):');
    if (!name || !/^\w+$/.test(name) || defs()[realm].rooms[name]) { log('bad or taken key', 'err'); return; }
    defs()[realm].rooms[name] = { name: name, gx: 0, gy: 0, w: 1200, back: true,
      doors: [{ id: 'in', kind: 'arch', x: 110, to: ['ROOM', 'DOOR'] }] };
    S.realm = realm; S.room = name; markDirty(); renderPanel(); openRoom(realm, name);
  }
  async function save() {
    const R = room(); if (!R) return;
    try {
      const res = await fetch('/wb/realm/save', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ realm: S.realm, room: S.room, data: R }) }).then(r => r.json());
      if (res.error) throw new Error(res.error);
      S.dirty = false; S.ui.save.textContent = 'Save room';
      log('saved ' + S.realm + '.' + S.room + (res.isNew ? ' (new)' : ''), 'ok');
    } catch (e) { log('save failed: ' + e.message, 'err'); }
  }

  window.addEventListener('load', () => setTimeout(() => {
    buildUI();
    S.realm = 'old_ruins';
    renderPanel();
    log('Pick a realm and room, then Open room.');
  }, 800));
})();
