// Page-side helpers for "Kael vs The Creator" (window.CR), evaluated after lib.js.
// The Creator's look is the game's: the boss's mantle and broken halo (Boss._drawSignature), the HD 'creator'
// arena, the crystal spikes. Its weapons are constructions (canon), drawn here as clean violet geometry.
(function () {
  const L = window.FILM, P = Math.PI;
  const CR = window.CR = { violet: '#cc00ee', pale: '#e8d4ff', magenta: '#ff40c0', phase: 1 };

  // Floor only (the arena's floating decks would sit in every shot), and the HD backdrop's crack layer driven by
  // CR.phase through a stand-in boss.
  CR.stage = function (ph) {
    CR.phase = ph || 1;
    currentArena.platforms = currentArena.platforms.filter(p => p.isFloor);
    const p2 = players[1];
    p2.isBoss = true;
    p2.weaponKey = 'gauntlet'; p2.weapon = WEAPONS.gauntlet; p2.color = CR.violet;
    p2.getPhase = () => CR.phase;
  };

  // The Creator actor: larger than Kael, mantle behind the body, halo over the head.
  CR.actor = function (spec) {
    return Object.assign({ scale: 1.32, z: 1, lag: 1, auraColor: CR.violet, pre: CR.drawSignature }, spec);
  };
  CR.drawSignature = function (c, L, a, s) {
    const J = L.joints(a.key), f = s.face, sc = a.scale || 1;
    const proxy = Object.create(a.f);
    proxy.getPhase = () => CR.phase; proxy.isFallenGod = false; proxy.vx = 0; proxy.vy = 0;
    // A stutter (CR.haloJit 0..1): the halo and mantle losing their place for a moment.
    const jit = CR.haloJit || 0;
    if (jit > 0) { c.globalAlpha *= 1 - jit * Math.random() * 0.85; c.translate((Math.random() - 0.5) * jit * 6, (Math.random() - 0.5) * jit * 3); }
    c.translate(J.neck.x, J.neck.y); c.scale(sc, sc); c.translate(-J.neck.x, -J.neck.y);
    const hipY = J.neck.y + (J.hip.y - J.neck.y) / sc, headY = J.neck.y + (J.head.y - J.neck.y) / sc;
    try { Boss.prototype._drawSignature.call(proxy, J.neck.x, headY, J.neck.y, hipY, f, J.headR / sc); } catch (e) {}
  };

  // A crystal of unmade ground (the game's boss spike: one main shard and two spurs), h px tall at x.
  CR.spike = function (c, x, h, a) {
    if (h <= 0.5) return;
    const G = L.G, tip = G - h, lean = ((x * 7.31) % 1 - 0.5) * 6;
    c.save(); c.globalAlpha = a === undefined ? 1 : a;
    c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(190,110,255,0.35)';
    c.beginPath(); c.ellipse(x, G + 1, 26, 5, 0, 0, P * 2); c.fill();
    c.globalCompositeOperation = 'source-over';
    const g = c.createLinearGradient(0, G, 0, tip);
    g.addColorStop(0, '#2a0c4a'); g.addColorStop(0.6, '#7a3ac8'); g.addColorStop(1, '#f0e0ff');
    c.fillStyle = g; c.strokeStyle = 'rgba(235,215,255,0.9)'; c.lineWidth = 1.2; c.shadowColor = '#b060ff'; c.shadowBlur = 14;
    const shard = (bx, hw, sh, tx) => { c.beginPath(); c.moveTo(bx - hw, G); c.lineTo(bx + tx - hw * 0.15, G - sh * 0.82); c.lineTo(bx + tx, G - sh); c.lineTo(bx + hw, G); c.closePath(); c.fill(); c.stroke(); };
    shard(x - 11, 7, h * 0.5, -8); shard(x + 12, 6, h * 0.38, 7); shard(x, 12, h, lean);
    c.restore();
  };
  // The spike's warning: a widening orange crack in the floor (the game's spike_warn), k 0..1.
  CR.warn = function (c, x, k) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#ff9a40'; c.shadowColor = '#ff7a20'; c.shadowBlur = 10;
    c.globalAlpha = 0.4 + 0.6 * k; c.lineWidth = 1.5 + k * 2;
    c.beginPath(); c.moveTo(x - 14 * k - 4, L.G + 1); c.lineTo(x - 4, L.G - 1); c.lineTo(x + 3, L.G + 2); c.lineTo(x + 14 * k + 4, L.G); c.stroke();
    c.restore();
  };
  // A slab of violet glass standing up out of the floor (w wide, h tall), or hanging in the air when y is given.
  CR.slab = function (c, x, w, h, o) {
    o = o || {}; if (h <= 0.5) return;
    const bot = o.y !== undefined ? o.y : L.G, top = bot - h;
    c.save(); c.globalAlpha = o.a === undefined ? 1 : o.a;
    const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, 'rgba(60,10,100,0.85)'); g.addColorStop(0.5, 'rgba(120,50,200,0.55)'); g.addColorStop(1, 'rgba(40,6,80,0.9)');
    c.fillStyle = g; c.shadowColor = '#b060ff'; c.shadowBlur = 16; c.fillRect(x - w / 2, top, w, h);
    c.shadowBlur = 0; c.strokeStyle = 'rgba(235,215,255,0.85)'; c.lineWidth = 1.4; c.strokeRect(x - w / 2, top, w, h);
    // Facet lines: built, not grown.
    c.globalAlpha *= 0.4; c.beginPath();
    for (let i = 1; i < 4; i++) { const yy = top + h * i / 4; c.moveTo(x - w / 2, yy); c.lineTo(x + w / 2, yy - w * 0.3); }
    c.stroke();
    if (o.glint) { c.globalAlpha = o.glint; c.globalCompositeOperation = 'lighter'; c.fillStyle = '#ffffff'; c.fillRect(x - w / 2, top, w, 2); }
    c.restore();
  };
  // The Creator's constructed blade: a long straight faceted edge from its front hand. Drawn in the actor's post.
  CR.bladeLen = 92;
  CR.tip = function (key, len) {
    const J = L.joints(key), l = len === undefined ? CR.bladeLen : len;
    return { x: J.rHand.x + Math.cos(J.rFore) * l, y: J.rHand.y + Math.sin(J.rFore) * l, hand: J.rHand, ang: J.rFore };
  };
  CR.drawBlade = function (c, key, k) {
    if (k <= 0.01) return;
    const J = L.joints(key), h = J.rHand, an = J.rFore, len = CR.bladeLen * Math.min(1, k * 1.2);
    const ux = Math.cos(an), uy = Math.sin(an), nx = -uy, ny = ux, w = 4.5;
    c.save(); c.globalAlpha = Math.min(1, k * 1.5);
    // Guard: a short crossbar of the same glass.
    c.strokeStyle = CR.pale; c.lineWidth = 3; c.shadowColor = '#b060ff'; c.shadowBlur = 12;
    c.beginPath(); c.moveTo(h.x + nx * 9, h.y + ny * 9); c.lineTo(h.x - nx * 9, h.y - ny * 9); c.stroke();
    const g = c.createLinearGradient(h.x, h.y, h.x + ux * len, h.y + uy * len);
    g.addColorStop(0, '#6a2ab8'); g.addColorStop(0.7, '#c9a0ff'); g.addColorStop(1, '#ffffff');
    c.fillStyle = g; c.beginPath();
    c.moveTo(h.x + nx * w * 0.6, h.y + ny * w * 0.6); c.lineTo(h.x + ux * len * 0.86 + nx * w, h.y + uy * len * 0.86 + ny * w);
    c.lineTo(h.x + ux * len, h.y + uy * len); c.lineTo(h.x + ux * len * 0.86 - nx * w * 0.5, h.y + uy * len * 0.86 - ny * w * 0.5);
    c.lineTo(h.x - nx * w * 0.4, h.y - ny * w * 0.4); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1; c.stroke();
    c.restore();
  };
  // Where Kael's blade and the Creator's blade meet: { x, y, d } with d the gap between the two segments (0 when
  // they cross), u along Kael's blade and v along the Creator's (0 hand .. 1 tip). Log it at every contact.
  CR.contact = function (kKey, cKey) {
    const a = L.tip(kKey), b = CR.tip(cKey), N = 24;
    let best = { d: 1e9 };
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
      const u = i / N, v = j / N;
      const ax = a.hand.x + (a.x - a.hand.x) * u, ay = a.hand.y + (a.y - a.hand.y) * u;
      const bx = b.hand.x + (b.x - b.hand.x) * v, by = b.hand.y + (b.y - b.hand.y) * v;
      const d = Math.hypot(ax - bx, ay - by);
      if (d < best.d) best = { d: Math.round(d), x: Math.round((ax + bx) / 2), y: Math.round((ay + by) / 2), u: +u.toFixed(2), v: +v.toFixed(2) };
    }
    return best;
  };
  CR.logContact = function (name) { (L.D.log.contact || (L.D.log.contact = {}))[name] = CR.contact('k', 's'); };

  // The blade assembling: segments of glass snapping onto the line of the grip, hand first, k 0..1.
  CR.assemble = function (key, dur) {
    L.add({ t: 'draw', life: dur * 60, fn: (c, k) => {
      const J = L.joints(key), h = J.rHand, an = J.rFore, n = 9;
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = CR.pale; c.shadowColor = '#b060ff'; c.shadowBlur = 14;
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, kk = Math.max(0, Math.min(1, k * 1.6 - u * 0.6)); if (kk <= 0) continue;
        const d = (1 - kk) * 40, side = i % 2 ? 1 : -1;
        const x = h.x + Math.cos(an) * CR.bladeLen * u - Math.sin(an) * d * side, y = h.y + Math.sin(an) * CR.bladeLen * u + Math.cos(an) * d * side;
        c.globalAlpha = kk < 1 ? 0.9 : Math.max(0, 1 - (k - 0.8) * 5); c.lineWidth = 2;
        c.beginPath(); c.moveTo(x - Math.cos(an) * 6, y - Math.sin(an) * 6); c.lineTo(x + Math.cos(an) * 6, y + Math.sin(an) * 6); c.stroke();
      }
    } });
  };
  // The rift gate: a standing tear of white-violet light at x, open by k.
  CR.gate = function (c, x, k, t) {
    if (k <= 0.01) return;
    const G = L.G, h = 150 * k, w = 16 * k;
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, G - 75, 2, x, G - 75, 120);
    g.addColorStop(0, 'rgba(230,200,255,' + 0.35 * k + ')'); g.addColorStop(1, 'rgba(120,40,200,0)');
    c.fillStyle = g; c.fillRect(x - 130, G - 200, 260, 210);
    c.fillStyle = '#ffffff'; c.shadowColor = '#c080ff'; c.shadowBlur = 30;
    c.beginPath(); c.moveTo(x, G - h - 4);
    for (let i = 1; i <= 8; i++) c.lineTo(x + w * (0.5 + 0.5 * Math.sin(i * 1.7 + t * 4)) * (i % 2 ? 1 : 0.6), G - h + h * i / 8);
    for (let i = 7; i >= 0; i--) c.lineTo(x - w * (0.5 + 0.5 * Math.sin(i * 2.3 + t * 3.2)) * (i % 2 ? 0.6 : 1), G - h + h * i / 8);
    c.closePath(); c.fill();
    c.restore();
  };
  // Kael's blade breaking: cyan shards thrown from the line of the blade. They land and stay lit (they are
  // fragment, not glass: nothing in this domain can unmake them).
  CR.shards = [];
  CR.shatter = function (key, col, o) {
    o = o || {};
    const J = L.joints(key), h = J.rHand, an = J.wAng, l = J.bLen;
    for (let i = 0; i < 34; i++) {
      const u = 0.15 + Math.random() * 0.85, a = (o.dir !== undefined ? o.dir * P / 180 : an + P) + (Math.random() - 0.5) * 2.4, v = 2 + Math.random() * 5;
      CR.shards.push({ c: L.D.c, x: h.x + Math.cos(an) * l * u, y: h.y + Math.sin(an) * l * u, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2.5,
        w: 2 + Math.random() * 3.5, spin: Math.random() * 6, col: col || '#00d4ff' });
    }
  };
  CR.drawShards = function (c) {
    const G = L.G;
    for (const s of CR.shards) {
      const a = (L.D.c - s.c) * 60; if (a < 0) continue;
      const t = Math.min(a, s.land || 1e9);
      let x = s.x + s.vx * t, y = s.y + s.vy * t + 0.11 * t * t;
      if (y >= G - 1 && !s.land) s.land = a;
      if (s.land) { const tl = s.land; x = s.x + s.vx * tl; y = G - 1; }
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = s.col; c.shadowColor = s.col; c.shadowBlur = 10;
      c.globalAlpha = Math.min(1, (s.land ? 0.55 + 0.25 * Math.sin(L.D.c * 3 + s.spin) : 0.95) + (s.boost || 0) * 0.6);
      if (s.boost) c.shadowBlur = 10 + s.boost * 20;
      c.translate(x, y); c.rotate(s.land ? s.spin : s.spin + a * 0.2);
      c.beginPath(); c.moveTo(-s.w, 0); c.lineTo(0, -s.w * 0.45); c.lineTo(s.w, 0); c.lineTo(0, s.w * 0.45); c.closePath(); c.fill();
      c.restore();
    }
  };

  // ── Act 2: what the domain cannot unmake ──

  // Light through Kael's rebuilt blade (it is the pieces, fitted back together): the katana's own sprite drawn
  // again over itself, tinted cyan and glowing, so the light sits exactly on the drawn blade. Drawn in Kael's post.
  CR.bladeCracks = function (c, key, k, filter, glow) {
    if (k <= 0.01) return;
    const a = L.actors[key], f = a.f, J = L.joints(key), fc = f.facing;
    f.facing = J.face;
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, 0.32 * k);
    c.filter = filter || 'sepia(1) hue-rotate(150deg) saturate(5) brightness(1.3)';
    c.shadowColor = glow || '#00d4ff'; c.shadowBlur = 6 + k * 10;
    try { f.drawWeapon(J.rHand.x, J.rHand.y, J.rFore, false, null, 1.5 * 0.9 * (a.scale || 1)); } catch (e) {}
    c.restore();
    f.facing = fc;
  };
  // The pieces on the floor flying back into the hand: each lands on its own place along the blade.
  CR.recall = function (key, c0, dur) {
    for (const s of CR.shards) { s.recall = { c0: c0 + Math.random() * dur * 0.3, dur: dur * (0.5 + Math.random() * 0.2), u: Math.random() }; }
  };
  // Lay pieces already on the floor (a shot that opens after the break).
  CR.layShards = function (x0, x1, n, col) {
    for (let i = 0; i < n; i++) CR.shards.push({ c: -10, x: x0 + Math.random() * (x1 - x0), y: L.G - 1, vx: 0, vy: 0, land: 0.001, w: 2 + Math.random() * 3.5, spin: Math.random() * 6, col: col || '#00d4ff' });
  };
  const drawShardsBase = CR.drawShards;
  CR.drawShards = function (c) {
    const live = CR.shards.filter(s => !s.recall || L.D.c < s.recall.c0);
    const flying = CR.shards.filter(s => s.recall && L.D.c >= s.recall.c0);
    const keep = CR.shards; CR.shards = live; drawShardsBase(c); CR.shards = keep;
    if (!flying.length) return;
    const J = L.joints('k'), h = J.rHand, an = J.wAng, l = J.bLen;
    for (const s of flying) {
      const r = s.recall, k = Math.min(1, (L.D.c - r.c0) / r.dur); if (k >= 1) continue;
      const e = L.EASE.in(k), sx = s.land ? s.x + s.vx * s.land : s.x, sy = L.G - 1;
      const tx = h.x + Math.cos(an) * l * r.u, ty = h.y + Math.sin(an) * l * r.u;
      const x = sx + (tx - sx) * e, y = sy + (ty - sy) * e - Math.sin(k * P) * 30;
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = s.col; c.shadowColor = s.col; c.shadowBlur = 14; c.globalAlpha = 1;
      c.translate(x, y); c.rotate(s.spin + k * 8); c.beginPath(); c.moveTo(-s.w, 0); c.lineTo(0, -s.w * 0.45); c.lineTo(s.w, 0); c.lineTo(0, s.w * 0.45); c.closePath(); c.fill();
      c.restore();
    }
  };
  // The Creator's unmaking: violet light poured from its open hand onto a point, k 0..1 (strength).
  CR.wash = function (c, from, to, k, t) {
    if (k <= 0.01) return;
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(from.x, from.y, to.x, to.y);
    g.addColorStop(0, 'rgba(230,200,255,' + 0.5 * k + ')'); g.addColorStop(1, 'rgba(160,60,240,' + 0.25 * k + ')');
    const an = Math.atan2(to.y - from.y, to.x - from.x), nx = -Math.sin(an), ny = Math.cos(an), w0 = 4, w1 = 26;
    c.fillStyle = g; c.beginPath();
    c.moveTo(from.x + nx * w0, from.y + ny * w0); c.lineTo(to.x + nx * w1, to.y + ny * w1); c.lineTo(to.x - nx * w1, to.y - ny * w1); c.lineTo(from.x - nx * w0, from.y - ny * w0); c.closePath(); c.fill();
    // Streams running down the cone.
    c.strokeStyle = CR.pale; c.shadowColor = '#b060ff'; c.shadowBlur = 8; c.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const u = ((t * 1.6 + i / 9) % 1), off = (i / 8 - 0.5) * 2;
      const x = from.x + (to.x - from.x) * u + nx * off * (w0 + (w1 - w0) * u), y = from.y + (to.y - from.y) * u + ny * off * (w0 + (w1 - w0) * u);
      c.globalAlpha = k * Math.sin(u * P) * 0.9; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(an) * 10, y + Math.sin(an) * 10); c.stroke();
    }
    c.restore();
  };
  // Fragment veins through the floor: cyan, jagged, racing out from where the blade went in.
  // CR.veins = [{ x, c0, speed, reach }]; CR.veinR(v, c) is how far a vein has run at time c.
  CR.veins = [];
  CR.vein = (x, c0, speed, reach) => CR.veins.push({ x, c0, speed: speed || 260, reach: reach || 600, seed: Math.random() * 1000 });
  CR.veinR = (v, c) => Math.max(0, Math.min(v.reach, (c - v.c0) * v.speed));
  CR.reached = (x, c) => CR.veins.some(v => Math.abs(x - v.x) <= CR.veinR(v, c));
  CR.drawVeins = function (c, recede) {
    const cc = L.D.c, G = L.G;
    for (const v of CR.veins) {
      let r = CR.veinR(v, cc) * (1 - (recede || 0)); if (r <= 0) continue;
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#5fe8ff'; c.shadowColor = '#00d4ff'; c.shadowBlur = 12; c.lineCap = 'round';
      // The floor's skin lit faintly where the veins have been.
      const rl = Math.min(r, v.capL === undefined ? r : v.capL), rr = Math.min(r, v.capR === undefined ? r : v.capR);
      const g = c.createLinearGradient(v.x - rl, 0, v.x + rr, 0), mid = rl / Math.max(1, rl + rr);
      g.addColorStop(0, 'rgba(0,212,255,0)'); g.addColorStop(mid, 'rgba(0,212,255,0.18)'); g.addColorStop(1, 'rgba(0,212,255,0)');
      c.fillStyle = g; c.fillRect(v.x - rl, G - 2, rl + rr, 14);
      let sd = v.seed; const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
      for (let j = 0; j < 8; j++) {
        const dir = j % 2 ? 1 : -1, cap = dir > 0 ? v.capR : v.capL, len = Math.min(r * (0.55 + R() * 0.45), cap === undefined ? 1e9 : cap * (1 - j * 0.04));
        let x = v.x, y = G + 1 + R() * 3; c.lineWidth = 2.4 - j * 0.2; c.globalAlpha = 0.9 - j * 0.07;
        c.beginPath(); c.moveTo(x, y);
        const steps = 14;
        for (let s = 0; s < steps; s++) { x += dir * len / steps; y = G + 1 + R() * 9; c.lineTo(x, y); }
        c.stroke();
        // A fork rising a little up a spike or wall where the vein meets it.
        c.globalAlpha *= 0.5; c.lineWidth = 1; c.beginPath(); c.moveTo(v.x + dir * len * 0.6, G + 2); c.lineTo(v.x + dir * len * 0.66, G + 8 + R() * 4); c.stroke();
      }
      c.restore();
    }
  };
  // A construction coming apart: chunks of its glass falling, and the dark it leaves for a moment.
  CR.crumble = function (x, top, w, h, n) {
    for (let i = 0; i < (n || 14); i++) {
      L.parts.push({ c: L.D.c + Math.random() * 0.1, x: x + (Math.random() - 0.5) * w, y: top + Math.random() * h, vx: (Math.random() - 0.5) * 2.2, vy: -Math.random() * 1.5,
        g: 0.22, life: 40 + Math.random() * 30, r: 2.4 + Math.random() * 3.6, col: Math.random() < 0.5 ? '#3a1466' : '#7a3ac8', kind: 'rock', spin: Math.random() * 6, floor: L.G });
    }
    for (let i = 0; i < 8; i++) L.parts.push({ c: L.D.c, x: x + (Math.random() - 0.5) * w, y: top + Math.random() * h, vx: (Math.random() - 0.5) * 1.6, vy: -1 - Math.random() * 1.5,
      life: 20 + Math.random() * 16, r: 1.6 + Math.random() * 1.6, col: '#5fe8ff', kind: 'wisp' });
  };
  // A spike or slab the veins have reached: dead (black glass, cyan cracks) for `dead` seconds, then it crumbles.
  CR.deadSpike = function (c, x, h, k) {
    if (h <= 0.5) return;
    c.save(); c.globalAlpha = 1 - k;
    const G = L.G, lean = ((x * 7.31) % 1 - 0.5) * 6;
    c.fillStyle = '#0c0614'; c.strokeStyle = 'rgba(95,232,255,0.9)'; c.lineWidth = 1; c.shadowColor = '#00d4ff'; c.shadowBlur = 8;
    const shard = (bx, hw, sh, tx) => { c.beginPath(); c.moveTo(bx - hw, G); c.lineTo(bx + tx - hw * 0.15, G - sh * 0.82); c.lineTo(bx + tx, G - sh); c.lineTo(bx + hw, G); c.closePath(); c.fill(); c.stroke(); };
    shard(x - 11, 7, h * 0.5, -8); shard(x + 12, 6, h * 0.38, 7); shard(x, 12, h, lean);
    c.restore();
  };
  // Unmade floor: a gap of void between x0 and x1 with chunks falling out of it. Footholds (CR.holds: [{x, c}])
  // are plates of fragment light that form under Kael's feet: the one thing the unmaking cannot reach.
  CR.holds = [];
  CR.gap = function (c, x0, x1, k) {
    if (k <= 0.01 || x1 <= x0) return;
    const G = L.G, cc = L.D.c;
    c.save();
    const g = c.createLinearGradient(0, G, 0, G + 70);
    g.addColorStop(0, 'rgba(4,0,10,' + k + ')'); g.addColorStop(1, 'rgba(0,0,0,' + k + ')');
    c.fillStyle = g; c.fillRect(x0, G - 1, x1 - x0, 80);
    c.strokeStyle = 'rgba(200,150,255,' + 0.8 * k + ')'; c.lineWidth = 1.5; c.shadowColor = '#b060ff'; c.shadowBlur = 10;
    c.beginPath(); c.moveTo(x0, G - 1); c.lineTo(x0, G + 60); c.moveTo(x1, G - 1); c.lineTo(x1, G + 60); c.stroke();
    // The floor's pieces dropping away into the dark.
    let sd = 77; const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 16; i++) {
      const x = x0 + R() * (x1 - x0), sp = 0.4 + R() * 0.8, y = G + 4 + ((cc * 60 * sp + R() * 80) % 80);
      c.globalAlpha = k * (1 - (y - G) / 84); c.fillStyle = '#3a0055'; c.fillRect(x - 4, y, 8, 4);
    }
    c.restore();
    for (const hd of CR.holds) {
      const a = (cc - hd.c) * 60; if (a < 0) continue;
      const kin = Math.min(1, a / 5);
      c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(0,212,255,0.55)'; c.shadowColor = '#00d4ff'; c.shadowBlur = 16;
      c.fillRect(hd.x - 13 * kin, G - 1, 26 * kin, 4);
      c.globalAlpha = 0.5; c.strokeStyle = '#bff4ff'; c.lineWidth = 1; c.strokeRect(hd.x - 13 * kin, G - 1, 26 * kin, 4);
      c.restore();
    }
  };
  // The half-made world finishing itself overhead: plates of land flying in from outside and locking into a vault
  // over the arena, from both ends toward the middle. k 0..1 (how much is laid), drop px (the vault coming down).
  CR.vault = function (c, k, drop) {
    if (k <= 0.01) return;
    const cx = 450, cy = 820 + (drop || 0), r = 760, span = 0.66, n = 40;
    c.save();
    let sd = 41; const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, ord = Math.floor(i / 2) / (n / 2), born = ord * 0.8;
      const kk = Math.max(0, Math.min(1, (k - born) / 0.2)), jit = R(), row = R() < 0.5 ? 0 : 1, sz = 26 + R() * 22;
      if (kk <= 0) continue;
      const a = -P / 2 + side * span * (1 - ord) * (0.96 + jit * 0.06), rr = r + row * 34;
      const fly = (1 - L.EASE.out(kk)) * 260, x = cx + Math.cos(a) * (rr + fly), y = cy + Math.sin(a) * (rr + fly);
      c.globalAlpha = 0.95 * kk; c.fillStyle = row ? '#160a2c' : '#24104a'; c.strokeStyle = 'rgba(220,180,255,0.65)'; c.lineWidth = 1.4;
      c.shadowColor = '#b060ff'; c.shadowBlur = kk < 1 ? 16 : 5;
      c.beginPath(); for (let j = 0; j < 6; j++) { const b = j / 6 * P * 2 + i, q = sz * (0.7 + R() * 0.4); c.lineTo(x + Math.cos(b) * q, y + Math.sin(b) * q * 0.7); } c.closePath(); c.fill(); c.stroke();
    }
    c.restore();
  };

  // ── Act 3: the Lock, the key, the shell ──

  // The Lock: rings of violet glass built around the Creator, each a broken circle of thick segments turning
  // against the next. rings: [{ r, k (0..1 laid, segment by segment), dead (0..1: black glass, cyan cracks), gone }].
  CR.drawLock = function (c, cx, cy, rings, t) {
    rings.forEach((rg, ri) => {
      if (rg.gone || rg.k <= 0.01) return;
      const n = 9, spin = t * (ri % 2 ? -0.5 : 0.4) + ri, gapA = 0.12;
      c.save(); c.lineCap = 'butt';
      for (let i = 0; i < n; i++) {
        const born = i / n, kk = Math.max(0, Math.min(1, (rg.k - born * 0.8) / 0.2)); if (kk <= 0) continue;
        const a0 = spin + i / n * P * 2 + gapA, a1 = spin + (i + 1) / n * P * 2 - gapA, out = (1 - L.EASE.out(kk)) * 60;
        const r = rg.r + out;
        if (rg.dead > 0) {
          c.globalAlpha = kk; c.strokeStyle = '#0c0614'; c.lineWidth = 9; c.shadowBlur = 0;
          c.beginPath(); c.arc(cx, cy, r, a0, a1); c.stroke();
          c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#5fe8ff'; c.shadowColor = '#00d4ff'; c.shadowBlur = 10; c.lineWidth = 1.4; c.globalAlpha = rg.dead;
          const m = (a0 + a1) / 2; c.beginPath(); c.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r); c.lineTo(cx + Math.cos(m) * (r + 3), cy + Math.sin(m) * (r + 3)); c.lineTo(cx + Math.cos(a1) * (r - 3), cy + Math.sin(a1) * (r - 3)); c.stroke();
          c.globalCompositeOperation = 'source-over';
        } else {
          c.globalAlpha = 0.9 * kk; c.strokeStyle = ri === 2 ? '#7a3ac8' : '#4a1a86'; c.lineWidth = 9; c.shadowColor = '#b060ff'; c.shadowBlur = 14;
          c.beginPath(); c.arc(cx, cy, r, a0, a1); c.stroke();
          c.strokeStyle = 'rgba(235,215,255,0.85)'; c.lineWidth = 1.2; c.shadowBlur = 0;
          c.beginPath(); c.arc(cx, cy, r + 4.5, a0, a1); c.stroke(); c.beginPath(); c.arc(cx, cy, r - 4.5, a0, a1); c.stroke();
        }
      }
      c.restore();
    });
  };
  // Where Kael's blade crosses a ring of radius r around (cx, cy): { x, y, err } (err = how far the closest blade
  // point is from the ring line; 0 means the blade really cuts it).
  CR.ringCross = function (key, cx, cy, r) {
    const t = L.tip(key); let best = { err: 1e9 };
    for (let i = 0; i <= 40; i++) {
      const u = i / 40, x = t.hand.x + (t.x - t.hand.x) * u, y = t.hand.y + (t.y - t.hand.y) * u, e = Math.abs(Math.hypot(x - cx, y - cy) - r);
      if (e < best.err) best = { x: Math.round(x), y: Math.round(y), err: Math.round(e), u: +u.toFixed(2) };
    }
    return best;
  };
  // A ring breaking: its glass falling all the way round.
  CR.breakRing = function (cx, cy, r) {
    for (let i = 0; i < 14; i++) { const a = i / 14 * P * 2; CR.crumble(cx + Math.cos(a) * r, cy + Math.sin(a) * r - 4, 14, 8, 3); }
  };
  // A plate of the vault falling at x, landing (or being cut) at time t1, from t0. Drawn as a hexagon of land.
  CR.plate = function (c, x, y, sz, spin, a) {
    c.save(); c.globalAlpha = a === undefined ? 1 : a; c.fillStyle = '#1c0c38'; c.strokeStyle = 'rgba(220,180,255,0.7)'; c.lineWidth = 1.4; c.shadowColor = '#b060ff'; c.shadowBlur = 10;
    c.beginPath(); for (let j = 0; j < 6; j++) { const b = j / 6 * P * 2 + spin; c.lineTo(x + Math.cos(b) * sz, y + Math.sin(b) * sz * 0.72); } c.closePath(); c.fill(); c.stroke();
    c.restore();
  };
  // The rift torn open both ways from (x, y): up into the vault and down through the floor. k 0..1.
  CR.tear = function (c, x, y, k, t) {
    if (k <= 0.01) return;
    const up = 520 * Math.min(1, k * 1.4), down = 160 * Math.min(1, k * 1.4), w = 6 + 30 * k;
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y, 4, x, y, 260 * k + 40);
    g.addColorStop(0, 'rgba(255,255,255,' + 0.55 * k + ')'); g.addColorStop(0.4, 'rgba(200,160,255,' + 0.25 * k + ')'); g.addColorStop(1, 'rgba(120,40,200,0)');
    c.fillStyle = g; c.fillRect(x - 320, y - 320, 640, 640);
    c.fillStyle = '#ffffff'; c.shadowColor = '#c080ff'; c.shadowBlur = 40;
    c.beginPath(); c.moveTo(x, y - up);
    const N = 14;
    for (let i = 1; i <= N; i++) { const u = i / N, yy = y - up + (up + down) * u, wv = w * Math.sin(u * P) * (0.6 + 0.4 * Math.sin(i * 2.1 + t * 6)); c.lineTo(x + wv * (i % 2 ? 1 : 0.55), yy); }
    for (let i = N - 1; i >= 0; i--) { const u = i / N, yy = y - up + (up + down) * u, wv = w * Math.sin(u * P) * (0.6 + 0.4 * Math.sin(i * 1.7 + t * 5)); c.lineTo(x - wv * (i % 2 ? 0.55 : 1), yy); }
    c.closePath(); c.fill();
    c.restore();
  };
  // The shell cracking: lines of light running from a point over the Creator's body, with starlight showing
  // through them (the Cosmic form underneath: deep blue, white stars). k 0..1 (how far they have run).
  CR.shellCracks = function (c, key, from, k, t) {
    if (k <= 0.01) return;
    const J = L.joints(key), pts = [J.head, J.neck, J.hip, J.rHand, J.lHand, J.rFoot, J.lFoot, J.rElbow, J.lElbow, J.rKnee, J.lKnee];
    c.save(); c.lineCap = 'round';
    let sd = 13; const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], kk = Math.max(0, Math.min(1, k * 1.6 - R() * 0.6)); if (kk <= 0) continue;
      const ex = from.x + (p.x - from.x) * kk, ey = from.y + (p.y - from.y) * kk, mx = (from.x + ex) / 2 + (R() - 0.5) * 10, my = (from.y + ey) / 2 + (R() - 0.5) * 10;
      // The gap: dark blue, wide.
      c.globalCompositeOperation = 'source-over'; c.strokeStyle = '#0a1240'; c.lineWidth = 3.4 + k * 2; c.shadowBlur = 0; c.globalAlpha = 1;
      c.beginPath(); c.moveTo(from.x, from.y); c.lineTo(mx, my); c.lineTo(ex, ey); c.stroke();
      // Light along its edges and stars in it.
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#9fb4ff'; c.shadowColor = '#7fa0ff'; c.shadowBlur = 12; c.lineWidth = 1;
      c.beginPath(); c.moveTo(from.x, from.y); c.lineTo(mx, my); c.lineTo(ex, ey); c.stroke();
      c.fillStyle = '#ffffff';
      for (let s = 0; s < 4; s++) { const u = R() * kk, sx = from.x + (ex - from.x) * u, sy = from.y + (ey - from.y) * u; c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 7 + s + i); c.beginPath(); c.arc(sx, sy, 0.9, 0, P * 2); c.fill(); }
    }
    c.restore();
  };

  window.CR = CR;
})();
