'use strict';
// Weapon workbench panel (DEV ONLY). Injected into index.html by tools/workbench/server.js;
// the game never loads it on its own.
//
// Opens a Training match with the chosen weapon, then either holds the fighter at a point
// in the swing (Pose) or hands control back (Play). Every slider writes straight into the
// live tables (WEAPONS, WEAPON_SWINGS, WEAPON_SPRITE_DEFS / WEAPON_SPRITES), so the next
// frame shows the change. Save sends only the edited fields to the server, which patches
// the source files.
//
// window.__wb is the scripting API tools/workbench/shot.js drives headless:
//   open(key) pose(p|null) play() set(section, field, value) measureEdge() save()
//   overlays({hitbox, sweep, grip}) hidePanel(bool) fighterScreen() info()
(function () {
  if (window.__wb) return;

  const STAT_F = [
    ['damage', 0, 60, 1], ['range', 0, 800, 1], ['cooldown', 0, 120, 1], ['endlag', 0, 60, 1],
    ['kb', 0, 40, 0.5], ['abilityCooldown', 0, 600, 5], ['superDmgMult', 0, 4, 0.05], ['abilityDmgMult', 0, 4, 0.05],
  ];
  const SWING_F = [
    ['dur', 1, 40, 1], ['a0', -3.2, 3.2, 0.01], ['a1', -3.2, 3.2, 0.01],
    ['tilt', -1.5, 1.5, 0.01], ['tipLen', 0, 90, 1],
  ];
  const SPRITE_F = [['len', 8, 130, 0.1], ['anchor', 0, 1, 0.01], ['shaftY', 0, 1, 0.005]];
  const EASES = ['linear', 'snap', 'iai', 'heavy', 'sweep', 'thrust', 'jab', 'crack', 'recoil'];

  const wb = {
    key: null, p1: null, mode: 'play', poseP: 0.5, loop: false, loopSpeed: 1, _loopT: 0,
    dirty: { stats: {}, swing: {}, sprite: {}, edge: null },
    ov: { hitbox: true, sweep: true, grip: true },
    artKeys: [], artAuto: true, artBase: null, previewing: false,
    screen: null, ui: null, hidden: false,
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const has = name => { try { return typeof eval(name) !== 'undefined'; } catch (e) { return false; } };
  const G = name => { try { return eval(name); } catch (e) { return undefined; } };

  async function post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || r.statusText);
    return j;
  }

  function log(msg, cls) {
    if (!wb.ui) return;
    const d = document.createElement('div');
    d.textContent = msg;
    if (cls) d.className = cls;
    wb.ui.log.prepend(d);
    while (wb.ui.log.childNodes.length > 40) wb.ui.log.lastChild.remove();
  }

  // ---------- match staging ----------

  function clearOverlays() {
    try { if (has('storyModeActive')) storyModeActive = false; } catch (e) {}
    try { if (has('activeCinematic')) activeCinematic = null; } catch (e) {}
    ['prologueOverlay', 'storyPrologueOverlay', 'storyPathPanel', 'storyModal', 'storyIntroOverlay', 'storyUnlockOverlay']
      .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
  }

  async function open(key) {
    if (!WEAPONS[key]) throw new Error('no weapon ' + key);
    wb.key = key;
    wb.dirty = { stats: {}, swing: {}, sprite: {}, edge: null };
    wb.previewing = false;
    const def = WEAPON_SPRITE_DEFS[key];
    wb.artBase = def ? { len: def.len, anchor: def.anchor } : null;
    clearOverlays();
    try { if (gameRunning && typeof backToMenu === 'function') backToMenu(); } catch (e) {}
    try { if (typeof backToHome === 'function') backToHome(); } catch (e) {}
    await sleep(200);
    clearOverlays();
    try { if (typeof selectMode === 'function') selectMode('training'); } catch (e) {}
    gameMode = 'training';
    const sel = document.getElementById('p1Weapon');
    if (sel) {
      if (![...sel.options].some(o => o.value === key)) sel.add(new Option(key, key));
      sel.value = key;
    }
    const cls = document.getElementById('p1Class');
    if (cls && [...cls.options].some(o => o.value === 'none')) cls.value = 'none';
    startGame();
    for (let i = 0; i < 60 && !(gameRunning && players && players.length); i++) await sleep(50);
    wb.p1 = players.find(p => p && p.playerNum === 1) || players[0];
    if (!wb.p1) throw new Error('match did not start');
    if (G('currentArenaKey') !== 'training' || G('tutorialActive')) log(`warning: expected Training, got ${G('currentArenaKey')}${G('tutorialActive') ? ' (tutorial)' : ''}`, 'err');
    // The start path may roll or resolve its own weapon; force ours.
    wb.p1.weaponKey = key;
    wb.p1.weapon = WEAPONS[key];
    wb.p1.lives = 999;
    wb.mode = 'play';
    await sleep(700);            // let the fighter land
    wb.p1.facing = 1;
    if (wb.ui) refreshFields();
    return info();
  }

  // Training mode puts P1 on the left, the dummy on the right.
  function pose(p) {
    if (!wb.p1) return;
    if (p === null) { wb.mode = 'pose'; wb.poseP = null; return; }
    wb.mode = 'pose';
    wb.poseP = Math.max(0, Math.min(1, p));
    if (wb.ui) { wb.ui.scrub.value = wb.poseP; wb.ui.scrubV.textContent = wb.poseP.toFixed(2); }
  }
  function play() { wb.mode = 'play'; wb.loop = false; if (wb.ui) syncModeButtons(); }

  function swingDur() {
    const g = WEAPON_SWINGS[wb.key];
    return (WEAPONS[wb.key].type === 'melee' && g && g.dur) ? g.dur : 12;
  }

  function holdPose(f) {
    f.vx = 0; f.vy = 0;
    f._forceFragmentBearer = false; f._fragArm = 1;
    if (wb.loop) {
      const dur = swingDur();
      wb._loopT += wb.loopSpeed;
      const span = dur + 18;                       // 18-frame rest between swings
      const t = wb._loopT % span;
      wb.poseP = t < dur ? t / dur : 1;
      if (wb.ui) { wb.ui.scrub.value = wb.poseP; wb.ui.scrubV.textContent = wb.poseP.toFixed(2); }
    }
    // draw() reads this.state, which only update() derives, so set it here.
    if (wb.poseP === null || (wb.loop && wb.poseP >= 1)) { f.attackTimer = 0; f.state = 'idle'; return; }
    const dur = swingDur();
    f.attackDuration = dur;
    f.attackTimer = Math.max(0.05, (1 - wb.poseP) * dur);
    f.state = 'attacking';
  }

  // Hit points for the fighter at swing progress p, without disturbing its state.
  function pointsAt(f, p) {
    const at = f.attackTimer, ad = f.attackDuration;
    const dur = swingDur();
    f.attackDuration = dur;
    f.attackTimer = Math.max(0.05, (1 - p) * dur);
    let pts = [];
    try { pts = f._getMeleeArcPoints(); } catch (e) {}
    f.attackTimer = at; f.attackDuration = ad;
    return pts;
  }

  function drawOverlays(f) {
    if (!wb.key || WEAPONS[wb.key].type !== 'melee' || typeof f._getMeleeArcPoints !== 'function') return;
    const c = ctx;
    c.save();
    if (wb.ov.sweep) {
      c.fillStyle = 'rgba(255, 210, 60, 0.28)';
      for (let i = 0; i <= 24; i++) for (const q of pointsAt(f, i / 24)) c.fillRect(q.x - 1, q.y - 1, 2, 2);
    }
    if (wb.ov.hitbox && f.attackTimer > 0) {
      c.fillStyle = '#ff3355';
      for (const q of f._getMeleeArcPoints()) { c.beginPath(); c.arc(q.x, q.y, 1.6, 0, Math.PI * 2); c.fill(); }
    }
    if (wb.ov.grip) {
      c.strokeStyle = 'rgba(80, 220, 255, 0.9)'; c.lineWidth = 1;
      const sx = f.cx(), sy = f.y + (typeof FIG_SHOULDER_DY !== 'undefined' ? FIG_SHOULDER_DY : 0);
      c.beginPath(); c.arc(sx, sy, 2.5, 0, Math.PI * 2); c.stroke();
      if (typeof f._meleeReachDist === 'function') {
        const r = f._meleeReachDist(null) - 22;  // reach of the drawn blade, minus target half-width and pad
        c.setLineDash([3, 3]);
        c.beginPath(); c.moveTo(sx + f.facing * r, sy - 30); c.lineTo(sx + f.facing * r, sy + 40); c.stroke();
        c.setLineDash([]);
      }
    }
    c.restore();
  }

  function installHooks() {
    const P = Fighter.prototype;
    if (P.__wbHooked) return;
    P.__wbHooked = true;
    const up = P.update, dr = P.draw;
    P.update = function (...a) {
      if (this === wb.p1) {
        this._forceFragmentBearer = false; this._fragArm = 1;
        if (wb.mode === 'pose') { holdPose(this); return; }
      }
      return up.apply(this, a);
    };
    P.draw = function (...a) {
      const r = dr.apply(this, a);
      if (this === wb.p1) {
        const m = ctx.getTransform();
        const cy = this.y + this.h / 2;
        wb.screen = { x: m.a * this.cx() + m.c * cy + m.e, y: m.b * this.cx() + m.d * cy + m.f, k: m.a };
        try { drawOverlays(this); } catch (e) {}
      }
      return r;
    };
  }

  // Fighter centre in CSS px, plus CSS px per world unit.
  function fighterScreen() {
    const cv = document.querySelector('canvas');
    if (!cv || !wb.screen) return null;
    const b = cv.getBoundingClientRect();
    const kx = b.width / cv.width;
    return { x: b.left + wb.screen.x * kx, y: b.top + wb.screen.y * kx, unit: wb.screen.k * kx };
  }

  // ---------- live edits ----------

  function current(section, field) {
    if (section === 'stats') return WEAPONS[wb.key][field];
    if (section === 'swing') return (WEAPON_SWINGS[wb.key] || {})[field];
    if (section === 'sprite') return (WEAPON_SPRITE_DEFS[wb.key] || {})[field];
  }

  function set(section, field, value) {
    const k = wb.key;
    if (!k) return;
    if (section === 'stats') {
      WEAPONS[k][field] = value;
      if (wb.p1 && wb.p1.weapon && wb.p1.weapon !== WEAPONS[k]) wb.p1.weapon[field] = value;
    } else if (section === 'swing') {
      if (!WEAPON_SWINGS[k]) WEAPON_SWINGS[k] = {};
      WEAPON_SWINGS[k][field] = value;
    } else if (section === 'sprite') {
      if (WEAPON_SPRITE_DEFS[k]) WEAPON_SPRITE_DEFS[k][field] = value;
      if (WEAPON_SPRITES[k]) WEAPON_SPRITES[k][field] = value;
      if (field === 'len' || field === 'anchor') wb.artBase = { len: WEAPON_SPRITE_DEFS[k].len, anchor: WEAPON_SPRITE_DEFS[k].anchor };
    } else return;
    wb.dirty[section][field] = value;
    markDirty();
  }

  // Opaque extent of the loaded sprite in 8 segments from hand to tip, [above, below]
  // the shaft, in drawn units before weapScale: the WEAPON_EDGE_PROFILE format.
  function measureEdge() {
    const s = WEAPON_SPRITES[wb.key];
    if (!s || !s.img) throw new Error('no sprite loaded for ' + wb.key);
    const W = s.img.naturalWidth || s.img.width, H = s.img.naturalHeight || s.img.height;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'); c.drawImage(s.img, 0, 0);
    const d = c.getImageData(0, 0, W, H).data;
    const u = s.len / W;                   // drawn units per sprite pixel
    const x0 = s.anchor * W, axis = s.shaftY * H;
    const out = [];
    for (let seg = 0; seg < 8; seg++) {
      // Rounded bounds and the shaft clamp below reproduce the hand-measured profiles
      // (141/160 values exact; the misses are mostly the axe/scythe clipart).
      const a = Math.round(x0 + (W - x0) * seg / 8), b = Math.round(x0 + (W - x0) * (seg + 1) / 8);
      let lo = Infinity, hi = -Infinity;
      for (let x = a; x < Math.min(b, W); x++) for (let y = 0; y < H; y++) {
        if (d[(y * W + x) * 4 + 3] > 8) { if (y < lo) lo = y; if (y > hi) hi = y; }
      }
      out.push(lo === Infinity ? [0, 0] : [Math.min(0, (lo - axis) * u), Math.max(0, (hi - axis) * u)]);
    }
    return out.map(([p, q]) => [Math.round(p * 10) / 10, Math.round(q * 10) / 10]);
  }

  async function save() {
    const k = wb.key, d = wb.dirty, body = { key: k };
    if (Object.keys(d.stats).length) body.stats = d.stats;
    if (Object.keys(d.swing).length) body.swing = d.swing;
    if (Object.keys(d.sprite).length) {
      const s = WEAPON_SPRITES[k];
      body.sprite = Object.assign({ imgH: s && s.img ? (s.img.naturalHeight || s.img.height) : null }, d.sprite);
    }
    if (d.edge) body.edge = d.edge;
    if (Object.keys(body).length === 1) { log('nothing to save'); return {}; }
    const r = await post('/wb/save', body);
    for (const sec of ['stats', 'swing', 'sprite', 'edge']) {
      if (!r[sec]) continue;
      for (const c of r[sec].changed || []) log(`${k}.${sec}: ${c}`, 'ok');
      if (r[sec].missing && r[sec].missing.length) log(`${k}.${sec}: not in source, skipped ${r[sec].missing.join(', ')}`, 'err');
      if (r[sec].error) log(r[sec].error, 'err');
    }
    wb.dirty = { stats: {}, swing: {}, sprite: {}, edge: null };
    markDirty();
    return r;
  }

  // ---------- art ----------

  function swapImage(src) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const s = WEAPON_SPRITES[wb.key];
        if (s) { s.img = img; s.ready = true; }
        res(img);
      };
      img.onerror = rej;
      img.src = src;
    });
  }

  // Renders the open weapon's SVG def and shows it in hand. Nothing is written to the repo.
  async function previewArt() {
    const k = wb.key;
    if (!wb.artKeys.includes(k)) { log(`${k}: no ornate SVG def, art is not editable here`, 'err'); return; }
    if (!wb.artBase) { log(`${k}: no WEAPON_SPRITE_DEFS entry to fit the art into`, 'err'); return; }
    // Editors save in several writes; run one render at a time and one more after if needed.
    if (wb._rendering) { wb._renderAgain = true; return; }
    wb._rendering = true;
    log(`${k}: rendering art...`);
    let r;
    try { r = await post('/wb/art/preview', { key: k }); }
    finally {
      wb._rendering = false;
      if (wb._renderAgain) { wb._renderAgain = false; setTimeout(() => previewArt().catch(e => log(e.message, 'err')), 0); }
    }
    await swapImage('data:image/png;base64,' + r.png);
    const len = wb.artBase.len * (1 - wb.artBase.anchor) / (1 - r.anchor);
    for (const [f, v] of [['len', len], ['anchor', r.anchor], ['shaftY', r.shaftY]]) {
      WEAPON_SPRITE_DEFS[k][f] = v; WEAPON_SPRITES[k][f] = v;
    }
    wb.previewing = true;
    markDirty();
    refreshFields();
    log(`${k}: preview ${r.w}x${r.h}, anchor ${r.anchor.toFixed(2)} (not shipped)`, 'ok');
  }

  async function shipArt() {
    const k = wb.key;
    if (!wb.artBase) return;
    const r = await post('/wb/art/ship', { key: k, len: wb.artBase.len, anchor: wb.artBase.anchor });
    for (const [f, v] of [['len', r.len], ['anchor', r.anchor], ['shaftY', r.shaftY]]) {
      WEAPON_SPRITE_DEFS[k][f] = v; WEAPON_SPRITES[k][f] = v;
      delete wb.dirty.sprite[f];
    }
    wb.artBase = { len: r.len, anchor: r.anchor };
    await swapImage(`images/weapons/${k}.png?wb=${Date.now()}`);
    wb.previewing = false;
    log(`${k}: shipped art, len ${r.len}, WEAPON_SPRITE_VER ${r.ver}`, 'ok');
    if (r.note) log(r.note, 'err');
    // Hit points sample the edge profile, so a new silhouette needs a new one.
    if (WEAPONS[k].type === 'melee') {
      const e = measureEdge();
      const s = await post('/wb/save', { key: k, edge: e });
      for (const c of (s.edge && s.edge.changed) || []) log(`${k}: ${c}`, 'ok');
    }
    markDirty();
    refreshFields();
  }

  function listenArt() {
    try {
      const es = new EventSource('/wb/events');
      es.addEventListener('art', () => {
        if (wb.artAuto && wb.key && wb.artKeys.includes(wb.key)) previewArt().catch(e => log(e.message, 'err'));
      });
    } catch (e) {}
  }

  function info() {
    const f = wb.p1, k = wb.key;
    if (!f || !k) return null;
    return {
      key: k, type: WEAPONS[k].type, mode: wb.mode, poseP: wb.poseP,
      reach: typeof f._meleeReachDist === 'function' && WEAPONS[k].type === 'melee' ? Math.round(f._meleeReachDist(null)) : null,
      swingFrames: swingDur(),
      spriteReady: !!(WEAPON_SPRITES[k] && WEAPON_SPRITES[k].ready),
      hitPoints: WEAPONS[k].type === 'melee' && f.attackTimer > 0 ? f._getMeleeArcPoints().length : 0,
      dirty: JSON.parse(JSON.stringify(wb.dirty)),
    };
  }

  // ---------- UI ----------

  const CSS = `
  #wbPanel{position:fixed;top:0;right:0;width:310px;height:100vh;overflow-y:auto;z-index:2147483000;
    background:#12141b;color:#d8dce6;font:12px/1.35 ui-monospace,Menlo,monospace;border-left:1px solid #2a2f3d;
    box-sizing:border-box;padding:10px 12px 40px}
  #wbPanel h3{margin:12px 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7f8aa3}
  #wbPanel .row{display:grid;grid-template-columns:96px 1fr 58px;gap:6px;align-items:center;margin:3px 0}
  #wbPanel .row.d label{color:#ffd84a}
  #wbPanel input[type=range]{width:100%}
  #wbPanel input[type=number],#wbPanel select{width:100%;background:#1c2030;color:#e8ebf2;border:1px solid #333a4d;border-radius:3px;padding:2px 4px;font:inherit}
  #wbPanel button{background:#232a3d;color:#e8ebf2;border:1px solid #3a4360;border-radius:4px;padding:4px 8px;font:inherit;cursor:pointer}
  #wbPanel button.on{background:#2f5bd8;border-color:#2f5bd8}
  #wbPanel button.go{background:#1f8a4c;border-color:#1f8a4c}
  #wbPanel .btns{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0}
  #wbPanel .note{color:#7f8aa3;font-size:11px}
  #wbPanel #wbLog div{padding:1px 0;border-bottom:1px solid #1d2130}
  #wbPanel #wbLog .ok{color:#7ee2a0} #wbPanel #wbLog .err{color:#ff8a8a}
  #wbPanel .title{font-weight:700;font-size:13px;color:#fff;display:flex;justify-content:space-between;align-items:center}
  #wbTab{position:fixed;top:8px;right:8px;z-index:2147483001;display:none}`;

  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'on') for (const ev in attrs.on) e.addEventListener(ev, attrs.on[ev]);
      else if (k in e && k !== 'list') e[k] = attrs[k]; else e.setAttribute(k, attrs[k]);
    }
    for (const c of kids) if (c != null) e.append(c);
    return e;
  }

  function fieldRow(section, [field, min, max, step]) {
    const num = el('input', { type: 'number', step, min, max });
    const rng = el('input', { type: 'range', step, min, max });
    const row = el('div', { className: 'row' }, el('label', { textContent: field }), rng, num);
    const apply = v => { v = parseFloat(v); if (!isFinite(v)) return; num.value = v; rng.value = v; set(section, field, v); row.classList.add('d'); };
    rng.addEventListener('input', () => apply(rng.value));
    num.addEventListener('change', () => apply(num.value));
    row._sync = () => {
      const v = current(section, field);
      const ok = typeof v === 'number';
      row.style.display = ok || section === 'stats' && /Mult$/.test(field) ? '' : 'none';
      num.value = ok ? Math.round(v * 1000) / 1000 : (/Mult$/.test(field) ? 1 : '');
      rng.value = num.value;
      row.classList.toggle('d', field in wb.dirty[section]);
    };
    return row;
  }

  function syncModeButtons() {
    const u = wb.ui;
    u.bPose.classList.toggle('on', wb.mode === 'pose' && !wb.loop);
    u.bLoop.classList.toggle('on', wb.mode === 'pose' && wb.loop);
    u.bPlay.classList.toggle('on', wb.mode === 'play');
  }

  function markDirty() {
    if (!wb.ui) return;
    const d = wb.dirty;
    const n = Object.keys(d.stats).length + Object.keys(d.swing).length + Object.keys(d.sprite).length + (d.edge ? 1 : 0);
    wb.ui.bSave.textContent = n ? `Save ${n} change${n > 1 ? 's' : ''}` : 'Save';
    wb.ui.bSave.classList.toggle('go', n > 0);
    wb.ui.artState.textContent = !wb.artKeys.includes(wb.key) ? 'No SVG def for this weapon (art is a PNG or procedural).'
      : wb.previewing ? 'Previewing unshipped art.' : 'Edit tools/weapon-sprites/defs-ornate.js and save: the art reloads here.';
    wb.ui.bShip.disabled = !wb.previewing;
  }

  function refreshFields() {
    if (!wb.ui || !wb.key) return;
    for (const r of wb.ui.rows) r._sync();
    const g = WEAPON_SWINGS[wb.key];
    wb.ui.ease.parentElement.style.display = g && g.ease ? '' : 'none';
    if (g && g.ease) wb.ui.ease.value = g.ease;
    wb.ui.sel.value = wb.key;
    const i = info();
    wb.ui.readout.textContent = i ? `${i.type}  ·  ${i.swingFrames}f swing  ·  ${i.reach != null ? 'reach ' + i.reach : 'ranged'}` : '';
    markDirty();
  }

  function buildUI() {
    document.head.append(el('style', { textContent: CSS }));
    const u = wb.ui = { rows: [] };
    u.sel = el('select', { on: { change: () => open(u.sel.value).catch(e => log(e.message, 'err')) } },
      ...Object.keys(WEAPONS).map(k => el('option', { value: k, textContent: `${k}  (${WEAPONS[k].name || ''})` })));
    u.readout = el('div', { className: 'note' });
    u.scrub = el('input', { type: 'range', min: 0, max: 1, step: 0.01, value: 0.5 });
    u.scrubV = el('span', { textContent: '0.50' });
    u.scrub.addEventListener('input', () => { wb.loop = false; pose(+u.scrub.value); syncModeButtons(); });
    u.bPose = el('button', { textContent: 'Pose', on: { click: () => { wb.loop = false; pose(+u.scrub.value); syncModeButtons(); } } });
    u.bLoop = el('button', { textContent: 'Loop swing', on: { click: () => { wb.mode = 'pose'; wb.loop = true; wb._loopT = 0; syncModeButtons(); } } });
    u.bSlow = el('button', { textContent: '1x', on: { click: () => {
      wb.loopSpeed = wb.loopSpeed === 1 ? 0.25 : 1; u.bSlow.textContent = wb.loopSpeed === 1 ? '1x' : '0.25x'; } } });
    u.bIdle = el('button', { textContent: 'Idle', on: { click: () => { wb.loop = false; pose(null); syncModeButtons(); } } });
    u.bPlay = el('button', { textContent: 'Play', on: { click: play } });
    u.bFlip = el('button', { textContent: 'Flip', on: { click: () => { if (wb.p1) wb.p1.facing *= -1; } } });

    const ovBtn = (k, label) => {
      const b = el('button', { textContent: label, className: wb.ov[k] ? 'on' : '' });
      b.addEventListener('click', () => { wb.ov[k] = !wb.ov[k]; b.classList.toggle('on', wb.ov[k]); });
      return b;
    };

    const stats = STAT_F.map(f => fieldRow('stats', f));
    const swing = SWING_F.map(f => fieldRow('swing', f));
    const sprite = SPRITE_F.map(f => fieldRow('sprite', f));
    u.rows = [...stats, ...swing, ...sprite];
    u.ease = el('select', { on: { change: () => { set('swing', 'ease', u.ease.value); } } },
      ...EASES.map(e => el('option', { value: e, textContent: e })));

    u.bMeasure = el('button', { textContent: 'Measure edge', on: { click: () => {
      try { const e = measureEdge(); wb.dirty.edge = e; markDirty(); log(`${wb.key} edge ${JSON.stringify(e)}`); }
      catch (e) { log(e.message, 'err'); } } } });
    u.bPreview = el('button', { textContent: 'Render art', on: { click: () => previewArt().catch(e => log(e.message, 'err')) } });
    u.bShip = el('button', { textContent: 'Ship art', on: { click: () => shipArt().catch(e => log(e.message, 'err')) } });
    u.bAuto = el('button', { textContent: 'Auto', className: 'on', on: { click: () => {
      wb.artAuto = !wb.artAuto; u.bAuto.classList.toggle('on', wb.artAuto); } } });
    u.artState = el('div', { className: 'note' });
    u.bSave = el('button', { textContent: 'Save', on: { click: () => save().catch(e => log(e.message, 'err')) } });
    u.bRevert = el('button', { textContent: 'Revert', title: 'Reload the page from source', on: { click: () => location.reload() } });
    u.log = el('div', { id: 'wbLog' });

    const panel = el('div', { id: 'wbPanel' },
      el('div', { className: 'title' }, 'Weapon workbench',
        el('a', { href: location.pathname + '?wb=figures', textContent: 'figures →', style: 'color:#7fa8ff;font-size:11px;font-weight:400' }),
        el('button', { textContent: 'Hide', on: { click: () => hidePanel(true) } })),
      u.sel, u.readout,
      el('h3', { textContent: 'Swing' }),
      el('div', { className: 'row' }, el('label', { textContent: 'progress' }), u.scrub, u.scrubV),
      el('div', { className: 'btns' }, u.bPose, u.bLoop, u.bSlow, u.bIdle, u.bPlay, u.bFlip),
      el('div', { className: 'btns' }, ovBtn('hitbox', 'Hit points'), ovBtn('sweep', 'Swept area'), ovBtn('grip', 'Reach')),
      el('div', { className: 'note', textContent: 'Play hands you P1 (normal controls) against the dummy.' }),
      el('h3', { textContent: 'Stats' }), ...stats,
      el('h3', { textContent: 'Swing shape' }), ...swing,
      el('div', { className: 'row' }, el('label', { textContent: 'ease' }), u.ease, el('span')),
      el('h3', { textContent: 'Sprite fit' }), ...sprite,
      el('div', { className: 'btns' }, u.bMeasure),
      el('h3', { textContent: 'Art' }), u.artState,
      el('div', { className: 'btns' }, u.bPreview, u.bShip, u.bAuto),
      el('h3', { textContent: 'Save' }),
      el('div', { className: 'btns' }, u.bSave, u.bRevert),
      el('div', { className: 'note', textContent: 'Writes only the edited (yellow) fields into js/smb-data-weapons.js and js/smb-weapon-sprites.js.' }),
      u.log);
    // Typing in the panel must not drive the fighter.
    for (const ev of ['keydown', 'keyup', 'keypress']) panel.addEventListener(ev, e => e.stopPropagation());
    u.tab = el('button', { id: 'wbTab', textContent: 'Workbench', on: { click: () => hidePanel(false) } });
    document.body.append(panel, u.tab);
    u.panel = panel;
    syncModeButtons();
    setInterval(() => { if (wb.key && !wb.hidden) { const i = info(); if (i) u.readout.textContent =
      `${i.type}  ·  ${i.swingFrames}f swing  ·  ${i.reach != null ? 'reach ' + i.reach : 'ranged'}${i.spriteReady ? '' : '  ·  sprite not loaded'}`; } }, 500);
  }

  function hidePanel(h) {
    wb.hidden = !!h;
    if (!wb.ui) return;
    wb.ui.panel.style.display = h ? 'none' : '';
    wb.ui.tab.style.display = h ? 'block' : 'none';
  }

  function overlays(o) { Object.assign(wb.ov, o || {}); }

  window.__wb = { open, pose, play, set, measureEdge, save, previewArt, shipArt, overlays, hidePanel, fighterScreen, info,
    loop: on => { wb.mode = 'pose'; wb.loop = !!on; wb._loopT = 0; }, state: wb };

  async function boot() {
    for (let i = 0; i < 200 && !(has('WEAPONS') && has('Fighter') && has('startGame') && has('WEAPON_SPRITES')); i++) await sleep(50);
    if (!has('WEAPONS')) { console.error('[workbench] game globals never appeared'); return; }
    installHooks();
    // A fresh profile is dropped into the first-run ladder fight when the splash clears,
    // which would replace the Training match. Off for this page only; the save is untouched.
    try { maybeStartFirstRun = function () {}; } catch (e) {}
    try { if (typeof window.dismissSplash === 'function') window.dismissSplash(); } catch (e) {}
    try { wb.artKeys = await (await fetch('/wb/art/keys')).json(); } catch (e) { wb.artKeys = []; }
    // ?wb=figures is the figure studio (figures.js); this page then keeps only the API.
    if (!/[?&]wbheadless\b/.test(location.search) && !/[?&]wb=figures\b/.test(location.search)) { buildUI(); listenArt(); }
    const want = new URLSearchParams(location.search).get('weapon');
    window.__wbReady = true;
    if (want && WEAPONS[want]) open(want).catch(e => log(e.message, 'err'));
  }
  boot();
})();
