'use strict';
// smb-story-map.js — Story Mode as a map of the multiverse
// -------------------------------------------------------
// The chapter list, drawn as a star chart. Each world the story visits is one
// body on the chart, in the order the story reaches it; selecting a world zooms
// into it, where its chapters sit as stops along a path.
//
//   Star chart:  ← → (↑ ↓) pick a world · Enter or click zooms in
//   World:       ← → pick a stop · Enter or Play starts it · Esc zooms out
//
// Spoiler rule: a world nobody has reached is a dark silhouette marked "???".
// Its name, look and chapters stay hidden until one of its chapters unlocks.
// Locked boss chapters keep the list's "??? Boss Encounter" mask.
//
// Grouping comes from each chapter's `world` string ("🌆 Home City — Alley"):
// the part before " — " names the world, the part after names the location.
// STORY_MAP_WORLDS maps those names onto map bodies; a world name it does not
// know still gets a body, in a neutral style.
//
// Depends on: smb-story-config.js (_renderChapterList, _isArcUnlocked,
//             STORY_ACT_STRUCTURE), smb-story-engine-flow.js (_beginChapter2),
//             smb-story-engine-explore.js (storyChapterStarred)
// Mounted by: _renderChapterList() when the map view is on (the default)
// -------------------------------------------------------

// kind: how the body is drawn. c1/c2: lit and shadow colours. accent: rim/glow.
const STORY_MAP_WORLDS = [
  { id: 'home',      name: 'Home City',            match: ['Home City', 'City'],                               kind: 'earth',     c1: '#4f8fd6', c2: '#123056', accent: '#9fd2ff', r: 34 },
  { id: 'fracture',  name: 'The Fracture Network', match: ['Fracture Network', 'Fracture Core'],               kind: 'rift',      c1: '#b07cff', c2: '#2a1050', accent: '#e2c6ff', r: 30 },
  { id: 'core',      name: 'The Multiversal Core', match: ['Multiversal Core'],                                kind: 'ringed',    c1: '#56d6d0', c2: '#0c3a44', accent: '#b8fff8', r: 30 },
  { id: 'forest',    name: 'Forest Dimension',     match: ['Forest Dimension'],                                kind: 'planet',    c1: '#4fae5a', c2: '#103a1a', accent: '#b9f0a8', r: 28, detail: 'patches' },
  { id: 'ice',       name: 'Ice Dimension',        match: ['Ice Dimension'],                                   kind: 'planet',    c1: '#d6ecff', c2: '#4a6f94', accent: '#ffffff', r: 28, detail: 'caps' },
  { id: 'ruins',     name: 'Ruins Dimension',      match: ['Ruins Dimension'],                                 kind: 'planet',    c1: '#c49a68', c2: '#4a3020', accent: '#f0d0a0', r: 26, detail: 'cracks' },
  { id: 'neutral',   name: 'Neutral Dimension',    match: ['Neutral Dimension'],                               kind: 'planet',    c1: '#a8b0c0', c2: '#2c3240', accent: '#e6ecf8', r: 28, detail: 'bands' },
  { id: 'interfere', name: 'Interference Layer',   match: ["Creator's Interference Layer", 'Interference Layer'], kind: 'lattice', c1: '#ff9a3c', c2: '#3a1806', accent: '#ffd29a', r: 28 },
  { id: 'facility',  name: 'Research Facility',    match: ['Abandoned Research Facility'],                     kind: 'station',   c1: '#9fb4c8', c2: '#26323e', accent: '#d6e6f4', r: 24 },
  { id: 'void',      name: 'The Void',             match: ['The Void', 'The Loop', 'Void'],                    kind: 'hole',      c1: '#7a5cff', c2: '#000000', accent: '#c8b8ff', r: 30 },
  { id: 'between',   name: 'The Void Between',     match: ['The Void Between', 'The Void Between Dimensions'], kind: 'nebula',    c1: '#5a7cff', c2: '#120a30', accent: '#b8c8ff', r: 32 },
  { id: 'wartorn',   name: 'War-Torn Dimension',   match: ['War-Torn Dimension'],                              kind: 'planet',    c1: '#d0583c', c2: '#3a0e08', accent: '#ffb090', r: 28, detail: 'scorch' },
  { id: 'gravity',   name: 'Gravity Flux World',   match: ['Gravity Flux World'],                              kind: 'ringed',    c1: '#8ad06a', c2: '#1a3a14', accent: '#e0ffc0', r: 26 },
  { id: 'shadow',    name: 'Shadow Realm',         match: ['Shadow Realm'],                                    kind: 'planet',    c1: '#6a4a8a', c2: '#0c0614', accent: '#c8a0ff', r: 28, detail: 'bands' },
  { id: 'titan',     name: 'Titan World',          match: ['Titan World'],                                     kind: 'planet',    c1: '#d8b070', c2: '#4a2e10', accent: '#ffe0a8', r: 38, detail: 'bands' },
  { id: 'null',      name: 'Null Space',           match: ['Null Space'],                                      kind: 'nebula',    c1: '#8c8c9c', c2: '#0e0e14', accent: '#d8d8e8', r: 28 },
  { id: 'quiet',     name: 'The Quiet Expanse',    match: ['Quiet Expanse'],                                   kind: 'nebula',    c1: '#6ab8c8', c2: '#081c24', accent: '#c8f4ff', r: 30 },
  { id: 'coast',     name: 'The Fracture Coast',   match: ['Fracture Coast'],                                  kind: 'rift',      c1: '#4ac0e0', c2: '#06202c', accent: '#b8f0ff', r: 28 },
  { id: 'collision', name: 'The Collision Realm',  match: ['Collision Realm'],                                 kind: 'binary',    c1: '#ff7a5a', c2: '#3a1010', accent: '#ffd0b8', r: 26 },
  { id: 'threshold', name: 'The Threshold',        match: ['The Threshold'],                                   kind: 'rift',      c1: '#ffcc66', c2: '#2a1a04', accent: '#fff0c0', r: 26 },
  { id: 'creator',   name: "The Creator's Domain", match: ["Creator's Domain", "Creator's Proving Ground"],    kind: 'lattice',   c1: '#ff4fd8', c2: '#2a0424', accent: '#ffc0f0', r: 36 },
  { id: 'substrate', name: 'The Substrate',        match: ['The Substrate'],                                   kind: 'lattice',   c1: '#4a4a5a', c2: '#000000', accent: '#9a9ab0', r: 34 },
  { id: 'god',       name: "God's Domain",         match: ["God's Domain"],                                    kind: 'sun',       c1: '#fff1b0', c2: '#ff9a20', accent: '#fffbe0', r: 36 },
  { id: 'lab',       name: 'The Lab',              match: ['The Lab'],                                         kind: 'station',   c1: '#c0c8d0', c2: '#20262c', accent: '#f0f6ff', r: 24 },
];

const StoryMap = (() => {
  const PREF_KEY = 'smb_storyMapView';
  const SPACING  = 250;   // chart units between worlds
  const ZOOM_FR  = 26;    // frames for the zoom in / out

  let worlds = [];        // built per mount: [{ def, chapters:[idx], known, done, total, x, y }]
  let mode   = 'galaxy';  // 'galaxy' | 'zoomIn' | 'world' | 'zoomOut'
  let modeT  = 0;
  let sel    = 0;         // selected world index
  let stop   = 0;         // selected stop index within the selected world
  let camX = 0, camY = 0, camTX = 0, camTY = 0;
  let wScroll = 0, wScrollT = 0;
  let canvas = null, c2d = null, wrap = null, infoEl = null;
  let raf = 0, frame = 0;
  let stars = null, starsW = 0, starsH = 0;
  let hits = [];          // click targets rebuilt every frame: { x, y, r, act }

  // ── Data ───────────────────────────────────────────────────────────────────

  function _baseName(world) {
    const w = String(world || '').replace(/^[^\w(]+/, '').trim();
    return w.split(' — ')[0].trim();
  }
  function _location(ch) {
    const w = String(ch.world || '').replace(/^[^\w(]+/, '').trim();
    const i = w.indexOf(' — ');
    return i >= 0 ? w.slice(i + 3).trim() : '';
  }

  function _defFor(base) {
    const d = STORY_MAP_WORLDS.find(w => w.match.includes(base));
    if (d) return d;
    // An unknown world name still gets a body: neutral style, its own id.
    let h = 0;
    for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return { id: 'x:' + base, name: base, match: [base], kind: 'planet',
             c1: `hsl(${hue},45%,60%)`, c2: `hsl(${hue},45%,14%)`, accent: `hsl(${hue},60%,85%)`, r: 26 };
  }

  function _arcFor(i) {
    if (typeof STORY_ACT_STRUCTURE === 'undefined') return null;
    for (const act of STORY_ACT_STRUCTURE) {
      for (const arc of act.arcs) {
        if (i >= arc.chapterRange[0] && i <= arc.chapterRange[1]) return arc;
      }
    }
    return null;
  }

  // Same unlock rule the chapter list uses.
  function _chState(i) {
    const cur = (typeof sagaClampChapter === 'function') ? sagaClampChapter(_story2.chapter) : _story2.chapter;
    const arc = _arcFor(i);
    const arcUnlocked = arc && typeof _isArcUnlocked === 'function' ? _isArcUnlocked(arc) : true;
    const done    = _story2.defeated.includes(i);
    const current = i === cur;
    const locked  = !arcUnlocked || i > cur;
    return { done, current, locked };
  }

  function _build() {
    const byId = new Map();
    worlds = [];
    STORY_CHAPTERS2.forEach((ch, i) => {
      if (!ch || ch._menuHidden) return;
      const def = _defFor(_baseName(ch.world));
      let w = byId.get(def.id);
      if (!w) { w = { def, chapters: [] }; byId.set(def.id, w); worlds.push(w); }
      w.chapters.push(i);
    });
    worlds.forEach((w, k) => {
      let done = 0, open = false, cur = false;
      for (const i of w.chapters) {
        const s = _chState(i);
        if (s.done) done++;
        if (s.done || !s.locked) open = true;
        if (s.current) cur = true;
      }
      w.done = done; w.total = w.chapters.length; w.known = open; w.current = cur;
      // A slow wave across the chart, so the route reads as a journey rather
      // than a row of buttons.
      w.x = k * SPACING;
      w.y = Math.sin(k * 0.85) * 120 + ((k % 3) - 1) * 26;
    });
  }

  function _knownIdx() { return worlds.map((w, k) => w.known ? k : -1).filter(k => k >= 0); }
  function _currentWorldIdx() {
    const k = worlds.findIndex(w => w.current);
    if (k >= 0) return k;
    const kn = _knownIdx();
    return kn.length ? kn[kn.length - 1] : 0;
  }

  // ── Mount / view preference ────────────────────────────────────────────────

  function enabled() {
    try { return localStorage.getItem(PREF_KEY) !== 'list'; } catch (e) { return true; }
  }
  function toggle() {
    try { localStorage.setItem(PREF_KEY, enabled() ? 'list' : 'map'); } catch (e) {}
    if (typeof _renderChapterList === 'function') _renderChapterList();
  }

  /** Render the map into the chapter list container (replaces its contents). */
  function mount(list) {
    _build();
    list.innerHTML = '';
    wrap = document.createElement('div');
    wrap.className = 'story-map-wrap';
    canvas = document.createElement('canvas');
    canvas.className = 'story-map-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', 'Story map. Arrow keys choose, Enter opens, Escape goes back.');
    infoEl = document.createElement('div');
    infoEl.className = 'story-map-info';
    wrap.appendChild(canvas);
    wrap.appendChild(infoEl);
    list.appendChild(wrap);
    c2d = canvas.getContext('2d');
    canvas.addEventListener('click', _onClick);
    canvas.addEventListener('mousemove', _onMove);

    const box = document.querySelector('#storyModal .story-modal-box');
    if (box) box.classList.add('story-map-mode');

    sel = _currentWorldIdx();
    mode = 'galaxy'; modeT = 0;
    camX = camTX = worlds[sel] ? worlds[sel].x : 0;
    camY = camTY = worlds[sel] ? worlds[sel].y : 0;
    _info();
    if (!raf) raf = requestAnimationFrame(_tick);
    setTimeout(() => { try { canvas.focus({ preventScroll: true }); } catch (e) {} }, 0);
  }

  /** Called by _renderChapterList in list mode so the modal returns to its normal width. */
  function unmount() {
    const box = document.querySelector('#storyModal .story-modal-box');
    if (box) box.classList.remove('story-map-mode');
    canvas = null;
  }

  function _visible() {
    const m = document.getElementById('storyModal');
    return !!(canvas && canvas.isConnected && m && m.style.display !== 'none');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  function _selectWorld(dir) {
    const kn = _knownIdx();
    if (!kn.length) return;
    let pos = kn.indexOf(sel);
    if (pos < 0) pos = 0;
    pos = Math.max(0, Math.min(kn.length - 1, pos + dir));
    if (kn[pos] === sel) return;
    sel = kn[pos];
    _blip();
    _info();
  }

  function _enterWorld() {
    const w = worlds[sel];
    if (!w || !w.known || mode !== 'galaxy') return;
    // Start on the current chapter if it lives here, else the first unbeaten
    // unlocked stop, else the first stop.
    let s = w.chapters.findIndex(i => _chState(i).current);
    if (s < 0) s = w.chapters.findIndex(i => { const st = _chState(i); return !st.done && !st.locked; });
    if (s < 0) s = 0;
    stop = s;
    wScroll = wScrollT = 0;
    mode = 'zoomIn'; modeT = 0;
    _blip();
    _info();
  }

  function _leaveWorld() {
    if (mode !== 'world') return;
    mode = 'zoomOut'; modeT = 0;
    _info();
  }

  function _selectStop(dir) {
    const w = worlds[sel];
    if (!w) return;
    const n = Math.max(0, Math.min(w.chapters.length - 1, stop + dir));
    if (n === stop) return;
    stop = n;
    _blip();
    _info();
  }

  function _play() {
    const w = worlds[sel];
    if (!w || mode !== 'world') return;
    const i = w.chapters[stop];
    if (i === undefined || _chState(i).locked) return;
    if (typeof _beginChapter2 === 'function') _beginChapter2(i);
  }

  function _blip() {
    if (typeof SoundManager !== 'undefined' && SoundManager.menuMove) SoundManager.menuMove();
  }

  // Keys only while the map is the thing on screen: the story modal is open in
  // map view and nothing (difficulty picker, prologue, narrative) sits over it.
  function _keysLive() {
    if (!_visible()) return false;
    if (typeof _narrativeActive !== 'undefined' && _narrativeActive) return false;
    for (const id of ['storyDifficultyOverlay', 'storyPrologueOverlay', 'prologueOverlay', 'storyIntroOverlay']) {
      const el = document.getElementById(id);
      if (el && el.style.display !== 'none' && el.isConnected) return false;
    }
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')) return false;
    return true;
  }

  window.addEventListener('keydown', function (e) {
    if (!_keysLive()) return;
    const k = e.key;
    let used = true;
    if (mode === 'galaxy') {
      if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'd' || k === 'D') _selectWorld(1);
      else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'a' || k === 'A') _selectWorld(-1);
      else if (k === 'Enter' || k === ' ') _enterWorld();
      else used = false;
    } else if (mode === 'world') {
      if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'd' || k === 'D') _selectStop(1);
      else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'a' || k === 'A') _selectStop(-1);
      else if (k === 'Enter' || k === ' ') _play();
      else if (k === 'Escape' || k === 'Backspace') _leaveWorld();
      else used = false;
    } else used = (k === 'Escape' || k.startsWith('Arrow') || k === 'Enter' || k === ' ');
    if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  function _onClick(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (e.clientY - r.top) * (canvas.height / r.height);
    for (let i = hits.length - 1; i >= 0; i--) {
      const h = hits[i];
      if ((x - h.x) ** 2 + (y - h.y) ** 2 <= h.r * h.r) { h.act(); return; }
    }
  }
  function _onMove(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (e.clientY - r.top) * (canvas.height / r.height);
    canvas.style.cursor = hits.some(h => (x - h.x) ** 2 + (y - h.y) ** 2 <= h.r * h.r) ? 'pointer' : 'default';
  }

  // ── Info bar (DOM, under the canvas) ───────────────────────────────────────

  function _stopTitle(i) {
    const ch = STORY_CHAPTERS2[i];
    const s = _chState(i);
    const isBoss = !!(ch.isBossFight || ch.isTrueFormFight);
    if (s.locked && !s.done && isBoss) return ch.isTrueFormFight ? '??? Final Entity' : '??? Boss Encounter';
    return ch.title;
  }

  function _info() {
    if (!infoEl) return;
    const w = worlds[sel];
    const kn = _knownIdx().length;
    const _hint = (t) => `<span class="smi-hint">${t}</span>`;
    if (!w) { infoEl.innerHTML = ''; return; }
    if (mode === 'galaxy' || mode === 'zoomOut') {
      const name = w.known ? w.def.name : '???';
      infoEl.innerHTML =
        `<div class="smi-main"><div class="smi-title">${name}</div>` +
        `<div class="smi-sub">${w.known ? `${w.done}/${w.total} chapters cleared` : 'Not reached yet'} · ${kn} of ${worlds.length} worlds reached</div></div>` +
        `<div class="smi-btns">${_hint('← → choose · Enter open')}` +
        `<button class="b b-primary smi-go" ${w.known ? '' : 'disabled'}>Open</button></div>`;
      const go = infoEl.querySelector('.smi-go');
      if (go) go.onclick = _enterWorld;
      return;
    }
    const i = w.chapters[stop];
    const ch = STORY_CHAPTERS2[i];
    const s = _chState(i);
    const loc = _location(ch);
    const lives = ch.playerLives !== undefined ? ch.playerLives : 3;
    const star = typeof storyChapterStarred === 'function' && storyChapterStarred(i);
    const bits = [];
    if (loc && !(s.locked && (ch.isBossFight || ch.isTrueFormFight))) bits.push(loc);
    if (!ch.noFight) bits.push(lives === 1 ? '1 life' : lives + ' lives');
    if (!s.done && ch.tokenReward) bits.push('+' + ch.tokenReward + ' coins');
    bits.push(s.done ? (star ? '★ 100%' : 'Cleared') : s.locked ? 'Locked' : s.current ? 'Next up' : 'Open');
    infoEl.innerHTML =
      `<div class="smi-main"><div class="smi-title">Chapter ${i + 1}: ${_stopTitle(i)}</div>` +
      `<div class="smi-sub">${bits.join(' · ')}</div></div>` +
      `<div class="smi-btns">${_hint('← → choose · Esc map')}` +
      `<button class="b b-secondary smi-back">Map</button>` +
      `<button class="b b-primary smi-go" ${s.locked ? 'disabled' : ''}>${s.done ? 'Replay' : 'Play'}</button></div>`;
    infoEl.querySelector('.smi-back').onclick = _leaveWorld;
    infoEl.querySelector('.smi-go').onclick = _play;
  }

  // ── Frame ──────────────────────────────────────────────────────────────────

  function _tick() {
    raf = 0;
    if (!_visible()) return;   // mount() restarts it
    raf = requestAnimationFrame(_tick);
    frame++;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    if (!cssW || !cssH) return;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    }
    const cw = canvas.width, ch = canvas.height;
    const ctx = c2d;
    hits = [];

    if (mode === 'zoomIn' || mode === 'zoomOut') {
      modeT++;
      if (modeT >= ZOOM_FR) {
        mode = mode === 'zoomIn' ? 'world' : 'galaxy';
        modeT = 0;
        _info();
      }
    }

    const w = worlds[sel];
    if (w) { camTX = w.x; camTY = w.y; }
    // A zoom always centres on its world: a pan still in flight would otherwise
    // dive into whatever world the camera happened to be passing.
    const k = (mode === 'zoomIn' || mode === 'zoomOut') ? 1 : 0.14;
    camX += (camTX - camX) * k;
    camY += (camTY - camY) * k;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    _drawSky(ctx, cw, ch);

    // Zoom progress: 0 = star chart, 1 = inside the world.
    let z = 0;
    if (mode === 'world') z = 1;
    else if (mode === 'zoomIn') z = _ease(modeT / ZOOM_FR);
    else if (mode === 'zoomOut') z = 1 - _ease(modeT / ZOOM_FR);

    const galaxyAlpha = 1 - Math.max(0, (z - 0.45) / 0.55);
    const worldAlpha  = Math.max(0, (z - 0.55) / 0.45);
    if (galaxyAlpha > 0) _drawGalaxy(ctx, cw, ch, z, galaxyAlpha);
    if (worldAlpha > 0 && w) _drawWorld(ctx, cw, ch, w, worldAlpha, mode === 'world');
  }

  function _ease(t) { t = Math.max(0, Math.min(1, t)); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function _drawSky(ctx, cw, ch) {
    const g = ctx.createLinearGradient(0, 0, cw, ch);
    g.addColorStop(0, '#05060f');
    g.addColorStop(1, '#0b0718');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);
    if (!stars || starsW !== cw || starsH !== ch) {
      starsW = cw; starsH = ch;
      let s = 1234567;
      const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      stars = [];
      const n = Math.round(cw * ch / 2600);
      for (let i = 0; i < n; i++) stars.push({ x: rnd(), y: rnd(), r: rnd() < 0.08 ? 1.6 : 0.8, a: 0.25 + rnd() * 0.6, p: rnd() * 6.28, d: 0.2 + rnd() * 0.8 });
    }
    const px = camX * 0.04, py = camY * 0.04;
    for (const st of stars) {
      const x = ((st.x * cw - px * st.d) % cw + cw) % cw;
      const y = ((st.y * ch - py * st.d) % ch + ch) % ch;
      ctx.globalAlpha = st.a * (0.75 + 0.25 * Math.sin(frame * 0.03 + st.p));
      ctx.fillStyle = '#cfd8ff';
      ctx.fillRect(x, y, st.r * (cw / 900), st.r * (cw / 900));
    }
    ctx.globalAlpha = 1;
  }

  function _drawGalaxy(ctx, cw, ch, z, alpha) {
    const base = Math.min(cw / 1000, ch / 400);
    const scale = base * (1 + z * 5);
    const ox = cw / 2 - camX * scale, oy = ch * 0.46 - camY * scale;
    const sx = x => ox + x * scale, sy = y => oy + y * scale;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Route: travelled legs solid, the rest a faint dotted line into the unknown.
    for (let k = 0; k < worlds.length - 1; k++) {
      const a = worlds[k], b = worlds[k + 1];
      const lit = a.known && b.known;
      ctx.strokeStyle = lit ? 'rgba(255,190,120,0.55)' : 'rgba(150,160,200,0.18)';
      ctx.lineWidth = (lit ? 2.2 : 1.4) * scale;
      ctx.setLineDash(lit ? [] : [5 * scale, 7 * scale]);
      ctx.beginPath();
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 40;
      ctx.moveTo(sx(a.x), sy(a.y));
      ctx.quadraticCurveTo(sx(mx), sy(my), sx(b.x), sy(b.y));
      ctx.stroke();
    }
    ctx.setLineDash([]);

    worlds.forEach((w, k) => {
      // Bodies are drawn larger than their spacing implies: the chart is about
      // the worlds, and the route between them only needs to read as a line.
      const x = sx(w.x), y = sy(w.y), r = w.def.r * scale * 1.45;
      if (x < -r * 3 || x > cw + r * 3) return;
      const selected = k === sel;
      _drawBody(ctx, w, x, y, r, w.known);
      if (selected) {
        ctx.strokeStyle = w.known ? w.def.accent : 'rgba(200,210,240,0.5)';
        ctx.lineWidth = 2 * scale;
        ctx.globalAlpha = alpha * (0.6 + 0.4 * Math.sin(frame * 0.08));
        ctx.beginPath(); ctx.arc(x, y, r + 10 * scale, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = alpha;
      }
      if (w.current) {
        // "You are here": a small marker above the world you are fighting in.
        const my = y - r - 16 * scale + Math.sin(frame * 0.1) * 3 * scale;
        ctx.fillStyle = '#ffb347';
        ctx.beginPath();
        ctx.moveTo(x, my + 7 * scale); ctx.lineTo(x - 6 * scale, my - 3 * scale); ctx.lineTo(x + 6 * scale, my - 3 * scale);
        ctx.closePath(); ctx.fill();
      }
      ctx.textAlign = 'center';
      ctx.font = `${selected ? 700 : 600} ${Math.round(16 * scale)}px 'Rajdhani', 'Segoe UI', sans-serif`;
      ctx.fillStyle = w.known ? (selected ? '#ffffff' : 'rgba(220,226,245,0.78)') : 'rgba(160,168,200,0.45)';
      ctx.fillText(w.known ? w.def.name : '???', x, y + r + 22 * scale);
      if (w.known) {
        ctx.font = `600 ${Math.round(12.5 * scale)}px 'Rajdhani', 'Segoe UI', sans-serif`;
        ctx.fillStyle = w.done === w.total ? '#ffcf6a' : 'rgba(170,180,210,0.7)';
        ctx.fillText(`${w.done}/${w.total}`, x, y + r + 38 * scale);
      }
      if (mode === 'galaxy') {
        hits.push({ x, y, r: Math.max(r + 8 * scale, 22), act: () => {
          if (!w.known) return;
          if (sel !== k) { sel = k; _info(); }
          _enterWorld();
        } });
      }
    });

    ctx.textAlign = 'left';
    ctx.restore();
  }

  // The inside of a world: the body large on the left, its chapters as stops
  // along a path to the right. Long worlds scroll to keep the selection in view.
  function _drawWorld(ctx, cw, ch, w, alpha, interactive) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const R = Math.min(ch * 0.30, cw * 0.15);
    const bx = cw * 0.16, by = ch * 0.48;
    _drawBody(ctx, w, bx, by, R, true);
    if (interactive) hits.push({ x: bx, y: by, r: R, act: _leaveWorld });

    ctx.textAlign = 'left';
    ctx.font = `700 ${Math.round(Math.max(14, ch * 0.05))}px 'Rajdhani', 'Segoe UI', sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(w.def.name, Math.round(cw * 0.03), Math.round(ch * 0.10));
    ctx.font = `600 ${Math.round(Math.max(11, ch * 0.034))}px 'Rajdhani', 'Segoe UI', sans-serif`;
    ctx.fillStyle = 'rgba(200,210,235,0.75)';
    ctx.fillText(`${w.done} of ${w.total} cleared`, Math.round(cw * 0.03), Math.round(ch * 0.10 + Math.max(16, ch * 0.055)));

    const n = w.chapters.length;
    const x0 = bx + R + cw * 0.08, x1 = cw - cw * 0.05;
    const step = Math.max(cw * 0.075, Math.min(cw * 0.14, (x1 - x0) / Math.max(1, n - 1)));
    const span = step * (n - 1);
    // Keep the selected stop in view on worlds with more stops than fit.
    wScrollT = span > (x1 - x0) ? Math.max(0, Math.min(span - (x1 - x0), stop * step - (x1 - x0) * 0.5)) : 0;
    wScroll += (wScrollT - wScroll) * 0.18;
    const pt = j => ({ x: x0 + j * step - wScroll, y: by + Math.sin(j * 0.9) * ch * 0.16 });

    // Stops scrolling left vanish at the planet's edge rather than over its face.
    const clipX = bx + R + 6;
    ctx.save();
    ctx.beginPath();
    ctx.rect(clipX, 0, cw, ch);
    ctx.clip();

    // Path between stops: walked legs solid in the world's accent.
    for (let j = 0; j < n - 1; j++) {
      const a = pt(j), b = pt(j + 1);
      const walked = _chState(w.chapters[j]).done && !_chState(w.chapters[j + 1]).locked;
      ctx.strokeStyle = walked ? w.def.accent : 'rgba(170,180,215,0.25)';
      ctx.globalAlpha = alpha * (walked ? 0.75 : 1);
      ctx.lineWidth = walked ? 3 : 2;
      ctx.setLineDash(walked ? [] : [4, 6]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = alpha;

    const sr = Math.max(9, ch * 0.032);
    w.chapters.forEach((i, j) => {
      const { x, y } = pt(j);
      if (x < clipX - sr || x > cw + sr) return;
      const st = _chState(i);
      const c = STORY_CHAPTERS2[i];
      const boss = !!(c.isBossFight || c.isTrueFormFight);
      const r = boss ? sr * 1.35 : sr;
      const selected = j === stop;

      if (selected) {
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = alpha * (0.55 + 0.45 * Math.sin(frame * 0.12));
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, r + 7, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = alpha;
      }
      ctx.beginPath();
      if (boss) { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); }
      else ctx.arc(x, y, r, 0, Math.PI * 2);
      if (st.done)         { ctx.fillStyle = w.def.accent; ctx.fill(); }
      else if (st.locked)  { ctx.fillStyle = 'rgba(40,44,60,0.9)'; ctx.fill(); ctx.strokeStyle = 'rgba(140,150,180,0.35)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      else                 { ctx.fillStyle = 'rgba(10,12,22,0.9)'; ctx.fill(); ctx.strokeStyle = st.current ? '#ffb347' : w.def.accent; ctx.lineWidth = 2.5; ctx.stroke(); }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(r * 0.95)}px 'Rajdhani', 'Segoe UI', sans-serif`;
      ctx.fillStyle = st.done ? '#10121c' : st.locked ? 'rgba(160,170,200,0.55)' : '#ffffff';
      ctx.fillText(st.done ? '✓' : String(i + 1), x, y + 1);
      ctx.textBaseline = 'alphabetic';

      if (typeof storyChapterStarred === 'function' && storyChapterStarred(i)) {
        ctx.fillStyle = '#ffcf6a';
        ctx.font = `${Math.round(r * 0.9)}px sans-serif`;
        ctx.fillText('★', x + r * 0.95, y - r * 0.8);
      }
      if (selected || n <= 8) {
        ctx.font = `${selected ? 700 : 600} ${Math.round(Math.max(11, ch * 0.033))}px 'Rajdhani', 'Segoe UI', sans-serif`;
        ctx.fillStyle = selected ? '#ffffff' : 'rgba(200,208,230,0.6)';
        const label = _stopTitle(i);
        // Alternate labels above and below the path so neighbours never collide;
        // the selected stop always reads below, where the eye expects it.
        const below = selected || j % 2 === 0;
        const ly = below ? y + r + Math.max(14, ch * 0.05) : y - r - Math.max(8, ch * 0.03);
        ctx.fillText(label.length > 26 ? label.slice(0, 25) + '…' : label, x, ly);
      }
      if (interactive) {
        hits.push({ x, y, r: r + 8, act: () => {
          if (stop === j) _play();
          else { stop = j; _info(); }
        } });
      }
    });
    ctx.restore();
    ctx.restore();
  }

  // ── World bodies ───────────────────────────────────────────────────────────

  function _drawBody(ctx, w, x, y, r, known) {
    const d = w.def;
    ctx.save();
    if (!known) {
      // A shape in the dark: present on the route, nothing more.
      ctx.fillStyle = '#0d0f1a';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(150,160,200,0.30)';
      ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.stroke();
      ctx.fillStyle = 'rgba(170,180,215,0.35)';
      ctx.font = `700 ${Math.round(r * 0.9)}px 'Rajdhani', sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', x, y + r * 0.05);
      ctx.restore();
      return;
    }

    // Soft halo in the world's accent.
    const halo = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.9);
    halo.addColorStop(0, _alpha(d.accent, 0.22));
    halo.addColorStop(1, _alpha(d.accent, 0));
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, Math.PI * 2); ctx.fill();

    switch (d.kind) {
      case 'hole':    _hole(ctx, d, x, y, r); break;
      case 'nebula':  _nebula(ctx, d, x, y, r); break;
      case 'rift':    _rift(ctx, d, x, y, r); break;
      case 'lattice': _lattice(ctx, d, x, y, r); break;
      case 'station': _station(ctx, d, x, y, r); break;
      case 'sun':     _sun(ctx, d, x, y, r); break;
      case 'binary':  _sphere(ctx, d, x - r * 0.45, y + r * 0.1, r * 0.7); _sphere(ctx, { c1: d.accent, c2: d.c2 }, x + r * 0.55, y - r * 0.2, r * 0.5); break;
      case 'ringed':  _ring(ctx, d, x, y, r, true); _sphere(ctx, d, x, y, r); _ring(ctx, d, x, y, r, false); break;
      case 'earth':   _sphere(ctx, d, x, y, r); _earth(ctx, d, x, y, r); break;
      default:        _sphere(ctx, d, x, y, r); _detail(ctx, d, x, y, r); break;
    }
    ctx.restore();
  }

  function _alpha(col, a) {
    if (col.startsWith('#')) {
      const n = parseInt(col.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    }
    return col.replace('hsl(', 'hsla(').replace(')', `,${a})`);
  }

  function _sphere(ctx, d, x, y, r) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, d.c1);
    g.addColorStop(1, d.c2);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  function _clipSphere(ctx, x, y, r) { ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip(); }

  function _earth(ctx, d, x, y, r) {
    _clipSphere(ctx, x, y, r);
    ctx.fillStyle = 'rgba(80,170,90,0.85)';
    const blobs = [[-0.35, -0.25, 0.32], [0.25, 0.1, 0.28], [-0.05, 0.45, 0.2], [0.45, -0.45, 0.16]];
    for (const [bxo, byo, br] of blobs) { ctx.beginPath(); ctx.ellipse(x + bxo * r, y + byo * r, br * r * 1.3, br * r, 0.4, 0, Math.PI * 2); ctx.fill(); }
    // City lights on the night side.
    ctx.fillStyle = 'rgba(255,214,120,0.9)';
    for (let i = 0; i < 9; i++) {
      const a = 0.2 + i * 0.37, rr = r * (0.3 + (i % 3) * 0.18);
      ctx.fillRect(x + Math.cos(a) * rr * 0.6 + r * 0.25, y + Math.sin(a) * rr * 0.5 + r * 0.2, Math.max(1, r * 0.05), Math.max(1, r * 0.05));
    }
    _terminator(ctx, x, y, r);
    ctx.restore();
  }

  function _detail(ctx, d, x, y, r) {
    _clipSphere(ctx, x, y, r);
    ctx.globalAlpha *= 0.55;
    ctx.strokeStyle = d.accent; ctx.fillStyle = d.accent;
    if (d.detail === 'bands') {
      ctx.lineWidth = r * 0.12;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(x, y + i * r * 0.38, r * 1.1, r * 0.08, 0, 0, Math.PI * 2); ctx.stroke(); }
    } else if (d.detail === 'caps') {
      ctx.beginPath(); ctx.ellipse(x, y - r * 0.9, r * 0.8, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, y + r * 0.92, r * 0.7, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    } else if (d.detail === 'patches') {
      for (const [a, b, s] of [[-0.3, -0.2, 0.3], [0.3, 0.25, 0.25], [0.1, -0.5, 0.18]]) { ctx.beginPath(); ctx.arc(x + a * r, y + b * r, s * r, 0, Math.PI * 2); ctx.fill(); }
    } else if (d.detail === 'cracks' || d.detail === 'scorch') {
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.6, y - r * 0.3); ctx.lineTo(x - r * 0.1, y - r * 0.05); ctx.lineTo(x + r * 0.2, y - r * 0.4); ctx.lineTo(x + r * 0.6, y - r * 0.2);
      ctx.moveTo(x - r * 0.1, y - r * 0.05); ctx.lineTo(x + r * 0.05, y + r * 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha /= 0.55;
    _terminator(ctx, x, y, r);
    ctx.restore();
  }

  function _terminator(ctx, x, y, r) {
    const g = ctx.createLinearGradient(x - r * 0.2, y - r * 0.2, x + r, y + r);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,10,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function _ring(ctx, d, x, y, r, back) {
    ctx.save();
    ctx.strokeStyle = _alpha(d.accent, 0.8);
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.7, r * 0.42, -0.35, back ? Math.PI : 0, back ? Math.PI * 2 : Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  function _hole(ctx, d, x, y, r) {
    ctx.save();
    ctx.strokeStyle = _alpha(d.accent, 0.85);
    for (let i = 0; i < 3; i++) {
      ctx.lineWidth = Math.max(1, r * (0.16 - i * 0.04));
      ctx.globalAlpha *= 0.85;
      ctx.beginPath();
      ctx.ellipse(x, y, r * (1.25 + i * 0.22), r * (0.38 + i * 0.07), 0.25 + frame * 0.002 * (i + 1), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = _alpha(d.c1, 0.9); ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.stroke();
  }

  function _nebula(ctx, d, x, y, r) {
    const puffs = [[0, 0, 1], [-0.55, 0.2, 0.7], [0.5, -0.25, 0.75], [0.15, 0.5, 0.55], [-0.3, -0.5, 0.5]];
    for (const [a, b, s] of puffs) {
      const g = ctx.createRadialGradient(x + a * r, y + b * r, 0, x + a * r, y + b * r, s * r);
      g.addColorStop(0, _alpha(d.accent, 0.55));
      g.addColorStop(0.5, _alpha(d.c1, 0.35));
      g.addColorStop(1, _alpha(d.c1, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x + a * r, y + b * r, s * r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function _rift(ctx, d, x, y, r) {
    ctx.save();
    ctx.shadowColor = d.accent;
    ctx.shadowBlur = r * 0.6;
    ctx.fillStyle = _alpha(d.c1, 0.9);
    const jag = [[0, -1.15], [0.22, -0.55], [0.08, -0.2], [0.32, 0.25], [0.05, 0.55], [0.12, 1.1], [-0.1, 0.5], [-0.3, 0.15], [-0.08, -0.25], [-0.25, -0.6]];
    ctx.beginPath();
    jag.forEach(([a, b], i) => { const px = x + a * r, py = y + b * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = _alpha(d.accent, 0.95);
    ctx.beginPath();
    jag.forEach(([a, b], i) => { const px = x + a * r * 0.4, py = y + b * r * 0.85; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function _lattice(ctx, d, x, y, r) {
    _sphere(ctx, { c1: d.c2, c2: '#000' }, x, y, r);
    _clipSphere(ctx, x, y, r);
    ctx.strokeStyle = _alpha(d.c1, 0.75);
    ctx.lineWidth = Math.max(1, r * 0.05);
    const k = 5;
    for (let i = -k; i <= k; i++) {
      ctx.beginPath(); ctx.ellipse(x, y, Math.abs(r * i / k), r, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - r, y + r * i / k); ctx.lineTo(x + r, y + r * i / k); ctx.stroke();
    }
    _terminator(ctx, x, y, r);
    ctx.restore();
    ctx.strokeStyle = _alpha(d.accent, 0.8); ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  }

  function _station(ctx, d, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.3);
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, d.c1); g.addColorStop(1, d.c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = d.c2;
    ctx.fillRect(-r * 1.35, -r * 0.12, r * 0.55, r * 0.24);
    ctx.fillRect(r * 0.8, -r * 0.12, r * 0.55, r * 0.24);
    ctx.fillStyle = _alpha(d.accent, 0.9);
    ctx.fillRect(-r * 1.3, -r * 0.08, r * 0.45, r * 0.16);
    ctx.fillRect(r * 0.85, -r * 0.08, r * 0.45, r * 0.16);
    ctx.fillStyle = _alpha(d.accent, 0.8 + 0.2 * Math.sin(frame * 0.1));
    ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function _sun(ctx, d, x, y, r) {
    ctx.save();
    ctx.strokeStyle = _alpha(d.accent, 0.5);
    ctx.lineWidth = Math.max(1, r * 0.06);
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + frame * 0.004;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 1.1);
      ctx.lineTo(x + Math.cos(a) * r * 1.55, y + Math.sin(a) * r * 1.55);
      ctx.stroke();
    }
    ctx.restore();
    const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, d.c1); g.addColorStop(1, d.c2);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  return { enabled, toggle, mount, unmount };
})();
