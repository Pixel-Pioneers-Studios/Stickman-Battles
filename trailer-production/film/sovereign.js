// Page-side helpers for "Kael vs Awakened Sovereign" (window.AS), evaluated after cosmic.js.
// Canon (docs/canon.md, SOVEREIGN - ADAPTATION): he does not learn you, he recognises you. Four stages are a candidate
// set collapsing: OBSERVING, READING, DOMINATING, TYRANT. Every game-mode fight was a hunting simulation, so the Lab is
// filled with them: columns, each holding a small red Kael losing on a loop.
// Series rule: no fusion, no Absolute Axiom, no God, no Void Mind.
(function () {
  const L = window.FILM, P = Math.PI, CA = window.CA;
  const AS = window.AS = { red: '#ff3311', cyan: '#00d4ff', lamp: '#cfe8e4', steel: '#3a4346' };
  const srand = CA.srand;

  // Canon (docs/canon.md, SOVEREIGN'S ARMS): he has no fragment, so nothing forms in his hands. He opens with his own
  // Null Blade; from the Reading on he pulls copies out of his pocket through a portal, each the arm that answers the
  // one Kael has just formed. Copies are tinted his red, a ghost of the real thing; the Null Blade is drawn as itself.
  AS.COUNTER = { katana: 'sword', hammer: 'spear' };
  // Luminance into his red (an SVG colour matrix: canvas hue-rotate filters drift to orange on grey steel).
  AS.TINT = 'url(#asCopyTint)';
  AS._tintDef = function () {
    if (document.getElementById('asCopyTint')) return;
    const d = document.createElement('div');
    d.innerHTML = '<svg width="0" height="0" style="position:absolute"><filter id="asCopyTint" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0.42 0.42 0.42 0 0.08  0.05 0.05 0.05 0 0  0.04 0.04 0.04 0 0.01  0 0 0 0.9 0"/></filter></svg>';
    document.body.appendChild(d.firstChild);
  };
  AS.copy = function (f) {
    if (!f || f._sovCopy) return f;
    f._sovCopy = true; AS._tintDef();
    if (typeof WEAPON_THEMES !== 'undefined') WEAPON_THEMES.sovCopy = AS.red;
    const draw = f.drawWeapon;
    f.drawWeapon = function () {
      if (this.weaponKey === 'nullblade') { this.weaponTheme = null; return draw.apply(this, arguments); }
      this.weaponTheme = 'sovCopy';
      ctx.save(); ctx.filter = AS.TINT; ctx.globalAlpha *= 0.9;
      try { return draw.apply(this, arguments); } finally { ctx.restore(); }
    };
    return f;
  };
  // The pocket opening at his hand: a red-rimmed slit along the blade, black inside, open for life seconds. The weapon
  // swap itself is the actor's wkey/wAlphaK (the blade fades into the slit and the copy fades out of it).
  AS.portal = function (L, key, life) {
    const sparks = []; for (let i = 0; i < 14; i++) sparks.push({ u: Math.random(), a: Math.random() * P * 2, v: 8 + Math.random() * 18 });
    L.sfx('portalOpen', 0.55, 1.3);
    L.add({ t: 'draw', life: (life || 0.6) * 60, fn: (c, k) => {
      const J = L.joints(key), l = Math.max(30, J.bLen), an = J.wAng;
      const op = k < 0.3 ? 1 - Math.pow(1 - k / 0.3, 3) : k > 0.72 ? Math.max(0, 1 - (k - 0.72) / 0.28) : 1;
      if (op <= 0.01) return;
      const cx = J.rHand.x + Math.cos(an) * l * 0.5, cy = J.rHand.y + Math.sin(an) * l * 0.5;
      c.save(); c.beginPath(); c.rect(cx - 400, cy - 400, 800, L.G - (cy - 400)); c.clip(); c.translate(cx, cy); c.rotate(an);
      c.globalAlpha = 0.92 * op; c.fillStyle = '#050102';
      c.beginPath(); c.ellipse(0, 0, l * 0.4 * op, 7 * op, 0, 0, P * 2); c.fill();
      c.globalCompositeOperation = 'lighter'; c.shadowColor = AS.red; c.shadowBlur = 14; c.strokeStyle = AS.red;
      c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, l * 0.4 * op, 7 * op, 0, 0, P * 2); c.stroke();
      c.lineWidth = 1; c.strokeStyle = '#ffb0a0'; c.beginPath(); c.ellipse(0, 0, l * 0.34 * op, 4 * op, 0, 0, P * 2); c.stroke();
      c.fillStyle = AS.red;
      for (const sp of sparks) { const r = sp.v * k; c.globalAlpha = op * (1 - k) * 0.9; c.fillRect((sp.u - 0.5) * l * 0.8 + Math.cos(sp.a) * r, Math.sin(sp.a) * r * 0.6, 2, 2); }
      c.restore();
    } });
  };
  AS.stage = function () { currentArena.platforms = currentArena.platforms.filter(p => p.isFloor); AS.copy(players[1]); };

  // Alternating steps from t0 to t1, for pose beats.
  AS.walk = function (t0, t1, step, extra, a, b) {
    const o = []; let i = 0;
    for (let t = t0; t < t1 - 1e-6; t += step, i++) o.push([t, i % 2 ? (b || 'walkB') : (a || 'walkA'), 'io', extra]);
    return o;
  };

  // A walk whose feet stay where they are put. Step count and stride are chosen for the distance at a natural cadence
  // (stride scaled by drawing the legs in toward standing); call AS.pinWalk after the beats are set.
  AS.walkTo = function (L, key, t0, t1, dist, o) {
    o = o || {};
    const A = o.a || 'walkA', B = o.b || 'walkB', a = L.actors[key], sc = 0.9 * (a.scale || 1), ext = o.extra || {};
    const foot = (pose, f) => { const q = L.resolve(pose, ext), m = Object.assign({}, q); m.rot = 0; m.x = 0; m.y = L.G; m.facing = 1; m.scale = sc; m.headScale = 0.77; return CinRig.joints(m)[f].x; };
    const full = Math.abs(foot(B, 'lFoot') - foot(A, 'lFoot'));
    const cad = o.cadence || 0.45, dur = t1 - t0;
    let n = Math.max(1, Math.round(dur / cad)), k = Math.abs(dist) / n / full;
    if (k > 1.15) { n = Math.max(1, Math.round(Math.abs(dist) / full)); k = Math.abs(dist) / n / full; }
    const S = L.resolve('stand'), PA = L.POSES[A], PB = L.POSES[B], ST = L.POSES.stand, D = 180 / Math.PI;
    const legs = P0 => { const q = Object.assign({ from: A === P0 ? A : B }, ext); for (const j of ['rLeg', 'rShin', 'lLeg', 'lShin']) q[j] = ST[j] + ((P0 === A ? PA : PB)[j] - ST[j]) * Math.min(1.15, k); return q; };
    const out = [], step = dur / n;
    // Between strides, the passing pose: the standing leg straight under the hip, the other foot lifted as it swings through.
    const lift = 90 + 36 * Math.min(1, k + 0.25);
    const pass = sw => Object.assign({ from: A }, ext, sw === 'r' ? { rLeg: 84, rShin: lift, lLeg: 91, lShin: 91 } : { lLeg: 84, lShin: lift, rLeg: 91, rShin: 91 });
    for (let i = 0; i <= n; i++) {
      out.push([t0 + i * step, legs(i % 2 ? B : A), i ? 'out' : 'io']);
      if (i < n) out.push([t0 + (i + 0.5) * step, pass(i % 2 ? 'l' : 'r'), 'in']);
    }
    return out;
  };
  AS.pinWalk = function (L, key, t0, t1) {
    const a = L.actors[key], prev = a.posFn, base = c => (prev ? prev(c) : L.curve(a.pos, c)).slice();
    a.posFn = base;
    const st = c => L.state(a, c), off = (c, f) => L.joints(key, c)[f].x - st(c).x;
    const x0 = base(t0)[0], x1 = base(t1)[0], dir = Math.sign(x1 - x0) || 1;
    const bt = a.beats.map(b => b[0]).filter(t => t > t0 + 1e-6 && t < t1 - 1e-6), seg = [t0, ...bt, t1], tab = [];
    let x = x0;
    for (let i = 0; i < seg.length - 1; i++) {
      const ta = seg[i], tb = seg[i + 1], dl = off(tb, 'lFoot') - off(ta, 'lFoot'), dr = off(tb, 'rFoot') - off(ta, 'rFoot');
      const f = dl * dir < dr * dir ? 'lFoot' : 'rFoot', anchor = x + off(ta, f);
      for (let c = ta; c < tb - 1e-6; c += 1 / 120) tab.push([c, anchor - off(c, f)]);
      x = anchor - off(tb, f);
    }
    tab.push([t1, x]);
    const R = x1 - x;
    for (const q of tab) q[1] += R * (q[0] - t0) / (t1 - t0);
    (L.D.log.walkResidual || (L.D.log.walkResidual = {}))[key + ' ' + t0.toFixed(2)] = Math.round(R);
    a.posFn = c => {
      const b = base(c); if (c < t0 || c > t1) return b;
      let lo = 0, hi = tab.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tab[m][0] <= c) lo = m; else hi = m; }
      const p = tab[lo], q = tab[hi], u = q[0] > p[0] ? (c - p[0]) / (q[0] - p[0]) : 0;
      return [p[1] + (q[1] - p[1]) * Math.max(0, Math.min(1, u)), b[1]];
    };
  };

  // ── the stored fights: what each small figure is doing ──
  const LOOPS = [
    [[0, 'ready'], [0.9, 'ready'], [1.1, 'lunge', 'out'], [1.3, 'slashOut', 'xout'], [1.55, 'hitBack', 'xout'], [1.95, 'kneel', 'in'], [2.6, 'miniDead', 'io'], [4.4, 'miniDead']],
    [[0, 'guard'], [0.7, 'highGuard', 'io'], [0.95, 'cutDown', 'xout'], [1.2, 'headSnap', 'xout'], [1.6, 'folded', 'out'], [2.1, 'kneel', 'in'], [2.8, 'miniDead', 'io'], [4.4, 'miniDead']],
    [[0, 'readyOpen'], [1.0, 'iaido', 'io'], [1.35, 'slashOut', 'xout'], [1.5, 'flyBack', 'xout'], [2.0, 'miniDead', 'in'], [4.4, 'miniDead']],
  ];
  // o: { x, base (floor y), sc, seed, t (loop clock), stop 0..1 (turned to look at `look`), look, mimic (pose to copy, 0..1), lit, broke (c of the break) }
  AS.column = function (c, o) {
    const sc = o.sc, w = 58 * sc, h = 178 * sc, x = o.x, y0 = o.base - h, t = L.D.c, r = srand(o.seed * 91 + 7);
    const lit = o.lit === undefined ? 1 : o.lit;
    const broke = o.broke !== undefined && t >= o.broke;
    // o.dead: the time his record in it went dark (the fragment's veins ran under it); the glass stays.
    const dead = o.dead !== undefined && t >= o.dead;
    // Plinth and cap.
    c.fillStyle = '#1b2224'; c.fillRect(x - w * 0.62, o.base - 11 * sc, w * 1.24, 11 * sc); c.fillRect(x - w * 0.62, y0 - 9 * sc, w * 1.24, 12 * sc);
    c.fillStyle = 'rgba(180,220,214,' + (0.1 + 0.25 * lit) + ')'; c.fillRect(x - w * 0.62, o.base - 11 * sc, w * 1.24, 1.2 * sc); c.fillRect(x - w * 0.62, y0 + 2 * sc, w * 1.24, 1 * sc);
    // The red glow it holds.
    const flick = 0.82 + 0.18 * Math.sin(t * 3.1 + o.seed);
    if (!broke && dead && t - o.dead < 0.4) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - (t - o.dead) / 0.4; c.strokeStyle = '#5fe8ff'; c.shadowColor = AS.cyan; c.shadowBlur = 14; c.lineWidth = 1.6 * sc; c.strokeRect(x - w / 2, y0, w, h - 10 * sc); c.fillStyle = 'rgba(95,232,255,0.1)'; c.fillRect(x - w / 2, y0, w, h - 10 * sc); c.restore();
    }
    if (!broke && !dead) {
      const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      g.addColorStop(0, 'rgba(120,12,4,0.5)'); g.addColorStop(0.5, 'rgba(40,4,2,0.24)'); g.addColorStop(1, 'rgba(120,12,4,0.5)');
      const ga = c.globalAlpha; c.globalAlpha = ga * flick * 0.72; c.fillStyle = g; c.fillRect(x - w / 2, y0, w, h - 10 * sc); c.globalAlpha = ga;
      const g2 = c.createRadialGradient(x, o.base - h * 0.35, 4, x, o.base - h * 0.35, w * 1.9);
      g2.addColorStop(0, 'rgba(255,51,17,0.12)'); g2.addColorStop(1, 'rgba(255,51,17,0)');
      if (!o.dim) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g2; c.fillRect(x - w * 2, y0 - 10, w * 4, h + 30); c.restore(); }
    }
    if (!broke && !dead && AS.mini) {
      const loop = LOOPS[o.seed % LOOPS.length];
      const lt = ((o.t === undefined ? t : o.t) * 0.92 + r() * 4.4) % 4.4;
      let q = L.poseAt(loop, lt), face = 1;
      const stop = o.stop || 0;
      if (stop > 0) {
        // Stopping: a standing figure turns to its new pose quickly; one lying dead gets up through a kneel first.
        const qs = o.mimicQ || L.resolve(o.mimic || 'stand'), tf = o.mimicFace || (o.look < x ? -1 : 1), E = L.EASE.io;
        const mix = (a, b, u) => { const m = Object.assign({}, a); for (const k in b) if (typeof b[k] === 'number' && typeof a[k] === 'number') m[k] = a[k] + (b[k] - a[k]) * u; return m; };
        const lying = Math.abs(q.rot || 0) > 0.35, KN = 0.55;
        if (lying) { const kn = L.resolve('kneel'); q = stop < KN ? mix(q, kn, E(stop / KN)) : mix(kn, qs, E((stop - KN) / (1 - KN))); }
        else q = mix(q, qs, E(Math.min(1, stop * 2.2)));
        if (stop >= (lying ? KN : 0.23)) face = tf;
      }
      const fy = o.base - 11 * sc, gx0 = x - w / 2, gw = w, gh = h - 10 * sc;
      // Stand it on the plinth and keep it inside the glass, whatever the pose does to its extent.
      let px = x, py = fy;
      {
        const m = face < 0 ? L.mirror(q) : Object.assign({}, q), rot = m.rot || 0; m.rot = 0;
        m.x = x; m.y = fy; m.facing = face; m.scale = (m.scale || 1) * 0.9 * 0.66 * sc; m.headScale = (m.headScale || 1) * 0.77;
        const J = CinRig.joints(m); J.rot = rot;
        let lo = -1e9, x0 = 1e9, x1 = -1e9;
        for (const k of ['hip', 'neck', 'rHand', 'lHand', 'rKnee', 'lKnee', 'rFoot', 'lFoot', 'rElbow', 'lElbow']) { const p = L.rotPt(J, J[k]); lo = Math.max(lo, p.y + 1.5 * sc); x0 = Math.min(x0, p.x - 2 * sc); x1 = Math.max(x1, p.x + 2 * sc); }
        const hd = L.rotPt(J, J.head); lo = Math.max(lo, hd.y + J.headR); x0 = Math.min(x0, hd.x - J.headR); x1 = Math.max(x1, hd.x + J.headR);
        py += fy - lo;
        const L0 = gx0 + 3 * sc, R0 = gx0 + gw - 3 * sc;
        px += x1 - x0 > R0 - L0 ? (L0 + R0) / 2 - (x0 + x1) / 2 : x0 < L0 ? L0 - x0 : x1 > R0 ? R0 - x1 : 0;
      }
      c.save(); c.beginPath(); c.rect(gx0, y0, gw, gh); c.clip();
      const MJ = L.drawFig(AS.mini, q, px, py, face, { color: AS.red, scale: 0.66 * sc, weapon: false, alpha: 0.95, glow: AS.red, glowBlur: 7 });
      // His blade: a thin red line, so the figure stays the thing you read.
      const hp = L.rotPt(MJ, MJ.rHand), an = (face < 0 ? P - q.rFore : q.rFore) + (MJ.rot || 0), bl = 27 * sc;
      if (!q.rot || Math.abs(q.rot) < 0.5) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#ff7a60'; c.shadowColor = AS.red; c.shadowBlur = 5; c.lineWidth = 1.3 * sc; c.beginPath(); c.moveTo(hp.x, hp.y); c.lineTo(hp.x + Math.cos(an) * bl, hp.y + Math.sin(an) * bl); c.stroke(); c.restore(); }
      c.restore();
      // The cut that finished him, on its beat.
      if (stop < 0.5) {
        const hitAt = loop[3] ? loop[2][0] : 1.3, da = (lt - hitAt) * 60;
        if (da > 0 && da < 8) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#ffd9d0'; c.shadowColor = AS.red; c.shadowBlur = 8; c.globalAlpha = 1 - da / 8; c.lineWidth = 2.2 * sc; c.beginPath(); c.moveTo(x - w * 0.42, fy - 46 * sc); c.lineTo(x + w * 0.42, fy - 18 * sc); c.stroke(); c.restore(); }
      }
    }
    // Glass.
    if (!broke) {
      c.strokeStyle = 'rgba(190,230,224,' + (0.16 + 0.34 * lit) + ')'; c.lineWidth = 1.1 * sc; c.strokeRect(x - w / 2, y0, w, h - 10 * sc);
      c.fillStyle = 'rgba(210,240,236,' + (0.03 + 0.06 * lit) + ')'; c.fillRect(x - w * 0.36, y0 + 2, w * 0.1, h - 14 * sc);
    } else {
      // A stump of broken glass left in the plinth and the cap.
      c.strokeStyle = 'rgba(190,230,224,0.4)'; c.lineWidth = 1 * sc; c.beginPath();
      for (const [yy, sg] of [[o.base - 11 * sc, -1], [y0 + 3, 1]]) { c.moveTo(x - w / 2, yy); for (let i = 1; i <= 7; i++) c.lineTo(x - w / 2 + w * i / 7, yy + sg * (i % 2 ? 12 + r() * 16 : 3) * sc); }
      c.stroke();
    }
  };
  AS.shatter = function (L, x, sc, o) {
    o = o || {};
    const y0 = L.G - 178 * sc;
    for (let i = 0; i < 46; i++) {
      const y = y0 + Math.random() * 178 * sc, a = (o.dir === undefined ? 180 : o.dir) + (Math.random() - 0.5) * 150;
      L.parts.push({ c: L.D.c, x: x + (Math.random() - 0.5) * 50 * sc, y, vx: Math.cos(a * P / 180) * (2 + Math.random() * 6), vy: Math.sin(a * P / 180) * (2 + Math.random() * 5) - 2, g: 0.26, life: 50 + Math.random() * 50, r: 1.8 + Math.random() * 3.2, col: 'rgba(200,235,230,0.8)', kind: 'rock', spin: Math.random() * 6, floor: L.G });
    }
    L.debris(x, L.G - 60, 22, { kind: 'spark', col: AS.red, v: 4, r: 1.8, g: 0.1, spread: 360, life: 34 });
  };

  // ── the room ──
  // o: { lamp(x) 0..1 for each ceiling strip, redK 0..1, cols: fn(x, row) overrides, gate { x, k }, mon { x, n, label, k } }
  const ROOM_TOP = 372;
  AS.paintLab = function (c, o) {
    const v = L.view(), G = L.G, t = L.D.c, W = v.x1 - v.x0, red = o.redK || 0;
    const lamp = o.lamp || (() => 1);
    let mean = 0, nm = 0;
    for (let x = v.x0; x <= v.x1; x += 90) { mean += lamp(x); nm++; } mean /= nm || 1;
    // The back wall.
    const g = c.createLinearGradient(0, G - ROOM_TOP, 0, G);
    g.addColorStop(0, '#050708'); g.addColorStop(1, '#0a0e0f');
    c.fillStyle = g; c.fillRect(v.x0 - 20, v.y0 - 20, W + 40, v.y1 - v.y0 + 40);
    const panels = (p, ph, col) => {
      const ox = v.cx * (1 - p);
      c.strokeStyle = col; c.lineWidth = 1;
      c.beginPath();
      for (let x = Math.floor((v.x0 - ox) / ph) * ph; x < v.x1 - ox + ph; x += ph) { c.moveTo(x + ox, G - ROOM_TOP); c.lineTo(x + ox, G); }
      for (let y = G - ROOM_TOP; y < G; y += ph * 0.72) { c.moveTo(v.x0, y); c.lineTo(v.x1, y); }
      c.stroke();
    };
    panels(0.5, 110, 'rgba(120,160,155,' + (0.03 + 0.08 * mean) + ')');
    // Ranks of columns going back into the dark, smaller and nearer the wall.
    for (const [p, sc, base, gap, seed] of [[0.42, 0.42, G - 92, 62, 3], [0.68, 0.66, G - 44, 96, 11]]) {
      const ox = v.cx * (1 - p);
      for (let i = Math.floor((v.x0 - ox) / gap) - 1; i * gap + ox < v.x1 + gap; i++) {
        const wx = i * gap;
        const x = wx + ox;
        if (o.backLimit !== undefined && x > o.backLimit) continue;
        c.save(); c.globalAlpha = sc < 0.5 ? 0.34 : 0.56;
        AS.column(c, Object.assign({ x, base, sc, seed: Math.abs(i * 7 + seed), lit: lamp(x) * 0.8, dim: true }, o.colState ? o.colState(x) : {}));
        c.restore();
      }
    }
    // Conduit rail along the back wall.
    c.fillStyle = 'rgba(12,16,17,0.92)'; c.fillRect(v.x0 - 20, G - 28, W + 40, 28);
    c.fillStyle = 'rgba(180,220,214,' + (0.05 + 0.16 * mean) + ')'; c.fillRect(v.x0 - 20, G - 28, W + 40, 1);
    // The screen his count runs on.
    if (o.mon) AS.monitor(c, o.mon);
    // Ceiling and the strip lamps: each one a pool of cold light on the floor when it is on.
    c.fillStyle = '#040506'; c.fillRect(v.x0 - 20, v.y0 - 40, W + 40, G - ROOM_TOP - v.y0 + 40);
    c.fillStyle = '#12181a'; c.fillRect(v.x0 - 20, G - ROOM_TOP - 7, W + 40, 7);
    const sp = 170;
    for (let x = Math.floor((v.x0 - 120) / sp) * sp; x < v.x1 + 120; x += sp) {
      const k = lamp(x); if (k <= 0.01) { c.fillStyle = '#20282a'; c.fillRect(x - 38, G - ROOM_TOP, 76, 3); continue; }
      const fl = k < 0.98 ? (Math.sin(t * 90 + x) > 0 ? k : k * 0.35) : k;
      c.save(); c.globalCompositeOperation = 'lighter'; c.filter = 'blur(16px)';
      const cone = c.createLinearGradient(0, G - ROOM_TOP, 0, G);
      const lc = red > 0 ? 'rgba(' + Math.round(170 + 80 * red) + ',' + Math.round(210 - 190 * red) + ',' + Math.round(205 - 190 * red) + ',' : 'rgba(170,210,205,';
      cone.addColorStop(0, lc + 0.1 * fl + ')'); cone.addColorStop(1, lc + 0.012 * fl + ')');
      c.fillStyle = cone; c.beginPath(); c.moveTo(x - 34, G - ROOM_TOP); c.lineTo(x + 34, G - ROOM_TOP); c.lineTo(x + 112, G); c.lineTo(x - 112, G); c.closePath(); c.fill();
      c.restore();
      c.fillStyle = red > 0.3 ? '#ff8c78' : '#e8fffb'; c.globalAlpha = fl; c.shadowColor = red > 0.3 ? AS.red : '#cfe8e4'; c.shadowBlur = 16; c.fillRect(x - 38, G - ROOM_TOP, 76, 3); c.shadowBlur = 0; c.globalAlpha = 1;
    }
    // The near rank stands on the fighters' own floor.
    if (o.near) for (const n of o.near) {
      if (n.x < v.x0 - 80 || n.x > v.x1 + 80) continue;
      AS.column(c, Object.assign({ base: G, sc: 1, seed: n.seed, lit: lamp(n.x) }, n, o.colState ? o.colState(n.x, n) : {}));
    }
    // The floor.
    const fg = c.createLinearGradient(0, G, 0, G + 90);
    fg.addColorStop(0, '#1a2021'); fg.addColorStop(1, '#090c0c');
    c.fillStyle = fg; c.fillRect(v.x0 - 20, G, W + 40, v.y1 - G + 40);
    c.strokeStyle = 'rgba(200,235,230,' + (0.05 + 0.1 * mean) + ')'; c.lineWidth = 1;
    c.beginPath();
    for (let x = Math.floor((v.x0 - 200) / 120) * 120; x < v.x1 + 200; x += 120) { c.moveTo(x, G); c.lineTo(x + (x - v.cx) * 0.35, G + 90); }
    c.moveTo(v.x0, G + 24); c.lineTo(v.x1, G + 24); c.stroke();
    c.fillStyle = 'rgba(220,250,245,' + (0.1 + 0.34 * mean) + ')'; c.fillRect(v.x0 - 20, G, W + 40, 1.3);
    for (let x = Math.floor((v.x0 - 120) / sp) * sp; x < v.x1 + 120; x += sp) {
      const k = lamp(x); if (k <= 0.01) continue;
      const pg = c.createRadialGradient(x, G + 8, 2, x, G + 8, 104);
      pg.addColorStop(0, 'rgba(180,225,218,' + 0.13 * k + ')'); pg.addColorStop(1, 'rgba(180,225,218,0)');
      c.fillStyle = pg; c.save(); c.translate(0, G + 8); c.scale(1, 0.2); c.translate(0, -G - 8); c.fillRect(x - 110, G - 100, 220, 220); c.restore();
    }
    if (o.gate) AS.bulkhead(c, o.gate.x, o.gate.k);
  };

  // A slab across the corridor that lifts into the ceiling. Light comes in from the side Kael came from.
  AS.bulkhead = function (c, x, k) {
    const G = L.G, top = G - ROOM_TOP, h = ROOM_TOP, lift = k * (h - 6), w = 30;
    // What he came through: pale daylight on the far side of the gap.
    const beam = c.createLinearGradient(x + w, 0, x + w + 200, 0);
    beam.addColorStop(0, 'rgba(160,200,195,' + 0.34 * Math.min(1, k * 2.5) + ')'); beam.addColorStop(1, 'rgba(160,200,195,0)');
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = beam; c.beginPath(); c.moveTo(x + w, G); c.lineTo(x + w, G - lift); c.lineTo(x + w + 200, G - lift * 0.4); c.lineTo(x + w + 200, G); c.closePath(); c.fill(); c.restore();
    c.fillStyle = '#0a0d0e'; c.fillRect(x - 800, top, 800, h + 80);
    c.fillStyle = '#141a1c'; c.fillRect(x, top, w, h - lift);
    c.strokeStyle = 'rgba(180,220,214,0.3)'; c.lineWidth = 1; c.strokeRect(x, top, w, h - lift);
    for (let y = top + 18; y < top + h - lift - 8; y += 34) { c.fillStyle = 'rgba(180,220,214,0.14)'; c.fillRect(x + 3, y, w - 6, 1.5); }
    if (k > 0) { const s = c.createLinearGradient(0, G - lift - 2, 0, G - lift + 3); c.fillStyle = 'rgba(232,255,251,0.9)'; c.fillRect(x, G - lift - 1, w, 2); }
  };

  // o: { x, n (candidates left), label, k 0..1 }
  AS.monitor = function (c, o) {
    const k = o.k === undefined ? 1 : o.k; if (k <= 0.01) return;
    const G = L.G, w = 240, h = 100, x = o.x - w / 2, y = G - 256, t = L.D.c;
    c.save();
    c.fillStyle = 'rgba(14,4,3,0.95)'; c.fillRect(x, y, w, h);
    c.globalAlpha = k;
    c.strokeStyle = AS.red; c.lineWidth = 1.6; c.shadowColor = AS.red; c.shadowBlur = 10; c.strokeRect(x, y, w, h); c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,51,17,0.05)'; for (let yy = y + 2; yy < y + h; yy += 4) c.fillRect(x, yy, w, 1.5);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = 'rgba(255,120,90,0.9)'; c.font = '700 13px monospace'; c.fillText(o.label || 'OBSERVING', o.x, y + 16);
    c.fillStyle = '#ff5533'; c.shadowColor = AS.red; c.shadowBlur = 16; c.font = '700 44px monospace'; c.fillText(Math.round(o.n).toLocaleString('en-US'), o.x, y + 53); c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,120,90,0.6)'; c.font = '11px monospace'; c.fillText('CANDIDATES', o.x, y + 85);
    // Its light on the room.
    c.globalAlpha = k * 0.14 * (0.9 + 0.1 * Math.sin(t * 30)); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(o.x, y + h / 2, 10, o.x, y + h / 2, 300); g.addColorStop(0, 'rgba(255,51,17,1)'); g.addColorStop(1, 'rgba(255,51,17,0)');
    c.fillStyle = g; c.fillRect(o.x - 310, y - 200, 620, 620);
    c.restore();
  };

  // Where a cut crossed the body: logged, so a cut that misses shows up in the numbers.
  // Where two blades cross at c: the closest point on K's blade to S's. Logged, so a clash in thin air shows in the numbers.
  AS.cross = function (L, K, S, c) {
    const t = L.tip(K, undefined, c), h = t.hand; let best = null;
    for (let i = 0; i <= 14; i++) { const u = i / 14, p = { x: h.x + (t.x - h.x) * u, y: h.y + (t.y - h.y) * u }, b = L.onBlade(S, p, c); if (!best || b.d < best.d) best = { d: b.d, x: p.x, y: p.y }; }
    return best;
  };

  // The Reading sequence: 13 seconds Sovereign has already seen. Written once, played twice: as his prediction (red, in the
  // dark room) and as what then happens. o: { t0, K, S (actor keys), col (spark colour), gain, rate }.
  AS.readSeq = function (L, o) {
    const T = o.t0, K = o.K, S = o.S, G = L.G, g = o.gain === undefined ? 1 : o.gain, rt = o.rate || 1, spark = o.col || '#ffe9a0';
    const KB = [[0, 'guard']], SB = [[0, 'sovReady']], KP = [[0, 958, 0]], SP = [[0, 1090, 0]], KF = [[0, 1]], SF = [[0, -1]], ev = [], blows = [], stops = [];
    const kb = (t, p, e, x) => KB.push([T + t, p, e || 'io', x]), sb = (t, p, e, x) => SB.push([T + t, p, e || 'io', x]);
    const kp = (t, x, h, e) => KP.push(e ? [T + t, x, h || 0, e] : [T + t, x, h || 0]), sp = (t, x, h, e) => SP.push(e ? [T + t, x, h || 0, e] : [T + t, x, h || 0]);
    const karc = (t0, x0, h0, t1, x1, h1, pk) => KP.push(...CA.arc(T + t0, x0, h0, T + t1, x1, h1, pk, 14));
    const sfx = (t, k, gn, r) => ev.push([T + t, l => l.sfx(k, gn * g, r * rt)]);
    const clash = (t, stop) => {
      stops.push([T + t, stop || 0.32, 0.07]);
      ev.push([T + t + 0.015, l => {
        const x = AS.cross(l, K, S, T + t + 0.03);
        (l.D.log.clash || (l.D.log.clash = {}))[t] = x.d;
        if (x.d > 16) (l.D.log.miss || (l.D.log.miss = [])).push(['clash', t, x.d]);
        l.sfx('clang', 0.9 * g, (0.9 + Math.random() * 0.25) * rt); l.shake(6 * g);
        l.debris(x.x, x.y, 12, { kind: 'spark', col: spark, v: 4.6, r: 1.7, g: 0.14, spread: 360, life: 22 });
        l.ring(x.x, x.y, 30, { col: spark, w: 2.4, life: 11 });
      }]);
    };
    const hit = (t, by, wth, on, at, r, shake) => { blows.push({ t: T + t, by, with: wth, on, at, kind: 'none', range: r || 90 }); stops.push([T + t, 0.3, 0.06]); ev.push([T + t + 0.05, l => { const p = CA.point(on, at, T + t + 0.06); l.sfx('heavyHit', 0.8 * g, 0.95 * rt); l.sfx('hitBlunt', 0.6 * g, rt); l.shake((shake || 8) * g); l.debris(p.x, p.y, 8, { kind: 'spark', col: spark, v: 3.4, r: 1.5, g: 0.08, spread: 360, life: 18 }); l.ring(p.x, p.y, 26, { col: spark, w: 2, life: 10 }); }]); };
    const swish = (t, r) => sfx(t, 'swingHeavy', 0.65, r || 1.15);

    // ── blades on the open floor ──
    kb(0.26, 'runA'); kb(0.38, 'runB'); kb(0.48, 'highGuard', 'out'); kb(0.62, 'cutStop', 'xout', { rArm: -20, rFore: -20 }); kb(0.78, 'cutStop', 'io', { rArm: -20, rFore: -20 }); kp(0.2, 958); kp(0.58, 992, 0, 'in'); kp(0.82, 982, 0, 'out');
    sb(0.5, 'sovBlock', 'out', { rFore: -84, rArm: 30 }); sb(0.8, 'sovBlock', 'io', { rFore: -84, rArm: 30 }); clash(0.62, 0.25);
    kb(0.86, 'windBack', 'out'); kb(1.0, 'slashOut', 'xout'); kp(1.0, 1006, 0, 'out'); sb(0.93, 'sovDuck', 'xout'); sb(1.06, 'sovDuck'); swish(0.92);
    sb(1.24, 'sovSweep', 'xout', { rFore: 22 }); sb(1.38, 'sovSweep', 'io', { rFore: 22 }); swish(1.16, 0.8); sfx(1.08, 'jump', 0.6, 1);
    kb(1.12, 'tuck', 'out'); kb(1.32, 'airHigh', 'out'); kb(1.48, 'airCut', 'xout'); kb(1.68, 'tuck'); karc(1.08, 1006, 0, 1.9, 1176, 0, 124); KF.push([T + 1.72, -1]);
    sp(1.38, 1102, 0, 'out'); sb(1.38, 'sovRaise', 'xout'); sb(1.7, 'sovRaise'); clash(1.48, 0.35);
    kb(1.9, 'crouchLand', 'xout'); sfx(1.9, 'land', 0.7, 1); SF.push([T + 1.82, 1]);
    sb(1.86, 'sovReady'); sb(2.06, 'sovSweep', 'xout', { rFore: -6 }); sb(2.2, 'sovSweep', 'io', { rFore: -6 }); sp(1.9, 1090); sp(2.06, 1102, 0, 'out'); swish(2.0, 1);
    kb(2.06, 'block', 'xout'); kp(2.06, 1200, 0, 'out'); kb(2.2, 'skid', 'out'); kp(2.4, 1236, 0, 'out'); clash(2.08, 0.3);
    // The kick caught, thrown back across.
    kb(2.46, 'runA'); kb(2.58, 'readyOpen'); kp(2.62, 1164, 0, 'in'); sb(2.5, 'sovReady'); sp(2.5, 1110); sb(2.72, 'sovCatch', 'xout', { lArm: -6, lFore: -18 }); kb(2.72, 'frontKick', 'xout'); sfx(2.68, 'swing', 0.6, 1);
    ev.push([T + 2.74, l => { l.sfx('hitBlunt', 0.7 * g, 1.3 * rt); l.shake(4 * g); }]); kb(2.92, 'frontKick', 'io');
    blows.push({ t: T + 2.72, by: S, with: 'lHand', on: K, at: 'lFoot', kind: 'none', range: 90 });
    sb(2.92, 'sovCatch', 'io', { lArm: -6, lFore: -18 }); sb(3.12, 'sovPalm', 'xout', { lArm: 196, lFore: 190, torso: 8 }); SF.push([T + 3.2, -1]); sb(3.36, 'sovReady');
    kb(3.1, 'tuck', 'out', { rot: 170 }); kb(3.3, 'tuck', 'lin', { rot: 300 }); kb(3.46, 'tuck', 'lin', { rot: 350 }); kb(3.6, 'crouchLand', 'xout'); KF.push([T + 3.3, 1]); kp(2.92, 1164); karc(2.96, 1164, 2, 3.6, 1008, 0, 118); sfx(3.0, 'swingHeavy', 0.8, 0.8); sfx(3.6, 'landHard', 0.7, 1);
    // Under the cut, up behind him: he doesn't turn round.
    sp(3.56, 1110); sp(3.86, 1076, 0, 'out'); sb(3.72, 'sovReady', 'io', { rArm: 170, rFore: 210 }); sb(3.92, 'sovSweep', 'xout', { rFore: -10 }); sb(4.06, 'sovSweep', 'io', { rFore: -10 }); swish(3.84);
    kb(3.72, 'runA'); kb(3.84, 'skid', 'out', { torso: 44, headTilt: 10 }); kb(4.02, 'skid', 'io'); kp(3.66, 1008); kp(4.1, 1176, 0, 'lin'); KF.push([T + 4.1, -1]); ev.push([T + 3.92, l => { l.dust(1076, 4, 40, { a: 0.2 }); }]);
    kb(4.2, 'sweepLow', 'out'); kb(4.38, 'upperCut', 'xout'); kb(4.5, 'upperCut'); kp(4.38, 1154, 0, 'out');
    sb(4.26, 'sovReady', 'out', { rArm: 196, rFore: 240, torso: 10, headTilt: -2 }); sb(4.5, 'sovReady', 'io', { rArm: 196, rFore: 240, torso: 10, headTilt: -2 }); clash(4.38, 0.26);
    // Hands. Kael's three, none lands. Then two of his.
    SF.push([T + 4.56, 1]); sb(4.68, 'sovReady', 'io'); sp(4.6, 1076); kb(4.62, 'openHand'); kp(4.7, 1132, 0, 'in');
    kb(4.82, 'palmK', 'xout'); sb(4.82, 'sovLean', 'xout'); sp(4.82, 1066, 0, 'out'); kb(4.92, 'openHand'); swish(4.78, 1.5);
    kp(4.98, 1120, 0, 'in'); kb(5.04, 'elbow', 'xout'); sb(5.04, 'sovDuck', 'xout'); kb(5.12, 'openHand'); swish(5.0, 1.5); sb(5.16, 'sovReady');
    kp(5.2, 1112, 0, 'in'); kb(5.28, 'heelKick', 'xout'); sb(5.28, 'sovLean', 'xout'); sp(5.28, 1052, 0, 'out'); swish(5.24, 1.2); kb(5.42, 'openHand'); sb(5.44, 'sovReady');
    sp(5.5, 1082, 0, 'in'); sb(5.62, 'sovPalm', 'xout'); kb(5.62, 'openHand'); kb(5.68, 'headSnap', 'xout'); hit(5.62, S, 'lHand', K, 'head', 90, 6); kp(5.68, 1118, 0, 'out'); sb(5.78, 'sovReady');
    sb(5.94, 'sovKick', 'xout'); kb(5.94, 'headSnap'); kb(6.0, 'flyBack', 'xout'); hit(5.94, S, 'lFoot', K, 'hip', 90, 10); sb(6.2, 'sovReady'); sp(5.94, 1084, 0, 'out');
    karc(5.98, 1118, 2, 6.36, 1224, 0, 40); kb(6.36, 'crouchLand', 'xout'); sfx(6.36, 'landHard', 0.7, 1); kp(6.5, 1236, 0, 'out');
    // The leap off the far floor: down on him from above; he has stepped out from under it.
    kb(6.56, 'crouch', 'out'); kb(6.68, 'airHigh', 'out'); kb(7.06, 'airHigh'); kb(7.2, 'cutDown', 'xout'); kb(7.42, 'crouchLand', 'out'); karc(6.62, 1236, 0, 7.22, 1020, 0, 170); sfx(6.62, 'jump', 0.8, 0.9); KF.push([T + 6.9, -1]);
    sb(6.8, 'sovReady'); sp(6.9, 1084); sp(7.14, 1110, 0, 'out'); SF.push([T + 7.2, -1]);
    ev.push([T + 7.22, l => { l.sfx('landHard', g, 0.7 * rt); l.sfx('explosion', 0.45 * g, 0.8 * rt); l.shake(16 * g); l.ring(1040, G, 110, { sq: 0.16, col: spark, w: 4, life: 22 }); l.debris(1040, G - 2, 18, { col: '#202a2c', v: 5.4, r: 3 }); }]);
    // The thrust that goes past him and through the glass; his hand already on Kael's wrist.
    KF.push([T + 7.48, 1]); kb(7.62, 'guard'); kp(7.7, 980, 0, 'out'); sb(7.5, { from: 'sovReady', rArm: 150, rFore: 170, torso: -4 }, 'out'); sp(7.56, 1106); kb(7.84, 'kSlip', 'xout', { rArm: 110, rFore: 50 }); sb(7.86, 'thrust', 'xout', { rArm: 0, rFore: 0 }); sp(7.86, 1032, 0, 'xout'); sfx(7.78, 'swingHeavy', 0.9, 0.95);
    ev.push([T + 7.88, l => { AS.shatter(l, 910, 1, { dir: 180 }); l.sfx('clang', 0.8 * g, 2.1 * rt); l.sfx('hitZap', 0.5 * g, 2.2 * rt); l.shake(10 * g); }]);
    kb(8.02, 'kSlip', 'io', { rArm: 110, rFore: 50 }); kb(8.16, 'upperCut', 'xout'); kp(8.16, 1000, 0, 'out'); sb(8.06, 'thrust'); sb(8.18, 'sovCatch', 'xout', { lArm: -10, lFore: -30, rArm: 0, rFore: 0, rArmLen: 1.2 }); kb(8.32, 'upperCut'); swish(8.08, 1.2);
    blows.push({ t: T + 8.18, by: S, with: 'lHand', on: K, at: 'rHand', kind: 'none', range: 110 }); ev.push([T + 8.22, l => { l.sfx('hitBlunt', 0.8 * g, 1.4 * rt); l.shake(5 * g); }]);
    sb(8.4, 'sovCatch', 'io', { lArm: -10, lFore: -30, rArm: 0, rFore: 0, rArmLen: 1.2 }); sb(8.56, 'sovPalm', 'xout', { rArm: 116, rFore: 140, lArmLen: 1.15 }); kb(8.5, 'upperCut'); kb(8.6, 'folded', 'xout'); hit(8.56, S, 'lHand', K, 'chest', 90, 9); kp(8.56, 1000); kp(8.7, 950, 0, 'out'); kp(8.92, 900, 0, 'out'); kb(8.9, 'guard', 'out'); sp(8.56, 1024, 0, 'out');
    // Three more cuts, each blocked while he walks through them.
    const W = [[9.2, 'cutStop', { rArm: -20, rFore: -20 }, 'highGuard', 906, 1000], [9.56, 'cutStop', { rArm: -24, rFore: -30 }, 'windBack', 888, 984], [9.9, 'cutStop', { rArm: -18, rFore: -14 }, 'highGuard', 878, 968]];
    W.forEach(([t, p, x, w, kx, sx]) => { kb(t - 0.17, w, 'out'); kb(t, p, 'xout', x); kb(t + 0.1, p, 'io', x); kp(t, kx, 0, 'out'); sp(t, sx, 0, 'lin'); sb(t - 0.04, 'sovBlock', 'xout', { rFore: -84, rArm: 30, headTilt: 14 }); sb(t + 0.1, 'sovBlock', 'io', { rFore: -84, rArm: 30, headTilt: 14 }); clash(t, 0.3); swish(t - 0.1, 1.15); });
    // Palm. Knee. The pommel on the crown. Down.
    sp(10.18, 906, 0, 'in'); kb(10.08, 'guard'); sb(10.3, 'sovPalm', 'xout'); hit(10.3, S, 'lHand', K, 'chest', 90, 8); kb(10.36, 'folded', 'xout'); kp(10.3, 878); kp(10.42, 868, 0, 'out'); sb(10.42, 'sovReady');
    sp(10.6, 892, 0, 'io'); sb(10.62, 'kneeUp', 'xout', { rArm: 110, rFore: 130 }); hit(10.62, S, 'lKnee', K, 'gut', 60, 8); kb(10.62, 'folded'); kb(10.68, 'folded', 'xout', { torso: 58, headTilt: 40, hipDrop: -4 }); kp(10.68, 868, 10, 'out'); sb(10.76, 'sovReady'); sb(10.88, 'sovRaise', 'out');
    sb(11.04, 'cutDown', 'xout', { rArm: 30, rFore: 60 }); kb(10.96, 'folded', 'io', { torso: 58, headTilt: 40 }); kb(11.08, 'kneel', 'xout'); kp(11.08, 866, 0, 'in'); hit(11.04, S, 'rHand', K, 'head', 80, 14); kb(11.34, 'fallen', 'in'); kp(11.34, 768, 6, 'out');
    ev.push([T + 11.34, l => { l.sfx('landHard', 0.9 * g, 0.8 * rt); l.dust(768, 8, 70, { a: 0.24 }); l.shake(9 * g); }]);
    kb(11.9, 'fallen'); kb(12.3, 'pushUp', 'io'); kb(13, 'pushUp', 'io', { headTilt: -24, torso: 30 });
    // The walk, and the point. The prediction ends here.
    const steps = AS.walk(T + 11.5, T + 12.5, 0.34, null, 'sovWalkA', 'sovWalkB'); steps.forEach(q => SB.push(q));
    sp(11.5, 900); sp(12.5, 892, 0, 'lin'); sb(12.72, 'sovReady', 'out', { rArm: 12, rFore: 4, torso: 2, headTilt: 10 }); sb(13, 'sovReady', 'io', { rArm: 12, rFore: 4, torso: 2, headTilt: 10 }); sfx(12.7, 'iaiMark', 0.8, 0.7);
    // The arms. Kael's blade breaks to light under the hit and a new one forms as he lands (film 1's patterns); each
    // time, Sovereign's hand goes into a portal and comes out holding that arm's answer.
    const kcol = o.kcol || AS.cyan, KW = [[0, 'katana']], SW = [[0, AS.COUNTER.katana]], KA = [[0, 1]], SA = [[0, 1]];
    const reform = (t0, t1, wk) => {
      KA.push([T + t0, 1], [T + t0 + 0.04, 0], [T + t1, 0], [T + t1 + 0.3, 1, 'in']); KW.push([T + t1, wk]);
      ev.push([T + t0, l => { l.disperse(K, kcol, 0.7); }], [T + t1, l => { l.manifest(K, kcol, 0.45); l.sfx('phaseUp', 0.45 * g, rt); }]);
    };
    const pull = (t, wk) => {
      SA.push([T + t, 1], [T + t + 0.12, 0], [T + t + 0.24, 0], [T + t + 0.42, 1, 'in']); SW.push([T + t + 0.2, wk]);
      ev.push([T + t, l => { AS.portal(l, S, 0.6); }]);
    };
    reform(5.96, 6.4, 'hammer'); pull(6.36, AS.COUNTER.hammer);
    reform(8.6, 8.84, 'katana'); pull(8.62, AS.COUNTER.katana);
    for (const a of [KB, SB, KP, SP, KF, SF]) a.sort((p, q) => p[0] - q[0]);
    return { KB, SB, KP, SP, KF, SF, KW, SW, KA, SA, ev, blows, stops, end: T + 13 };
  };

  // A cut crosses the body somewhere in its arc: the closest the blade came over its last frames, and the mark it left there.
  AS.logCut = function (L, name, on, at, t) {
    let best = null;
    for (let u = t - 0.14; u <= t + 0.03 + 1e-6; u += 1 / 120) {
      const p = CA.point(on, at, t + 0.03), b = L.onBlade('k', p, u);
      if (!best || b.d < best.d) best = { d: b.d, u: b.u, p };
    }
    (L.D.log.cuts || (L.D.log.cuts = {}))[name] = [best.d, best.u];
    if (best.d > 16) (L.D.log.miss || (L.D.log.miss = [])).push([t, name, best.d]);
    return best.p;
  };
  // The line a cut leaves across a body: one bright stroke along the blade, gone in a few frames.
  AS.cutLine = function (L, x, y, ang, len, col) {
    L.add({ t: 'draw', life: 9, fn: (c, k) => {
      const l = len * (0.55 + 0.45 * Math.min(1, k * 3)), dx = Math.cos(ang) * l, dy = Math.sin(ang) * l;
      c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.shadowColor = col; c.shadowBlur = 14;
      c.globalAlpha = 1 - k; c.strokeStyle = col; c.lineWidth = 6 * (1 - k) + 1; c.beginPath(); c.moveTo(x - dx, y - dy); c.lineTo(x + dx, y + dy); c.stroke();
      c.strokeStyle = '#ffffff'; c.lineWidth = 2 * (1 - k) + 0.4; c.beginPath(); c.moveTo(x - dx, y - dy); c.lineTo(x + dx, y + dy); c.stroke();
    } });
  };

  // ── the long cut (z5 on): shared authoring kit ──
  // Light along a body's bones, grown from the first joint of each path (k 0..1), with a fixed jag per segment.
  AS.bodyVeins = function (c, L, key, k, paths, seed, w, col) {
    if (k <= 0.01) return;
    const J = L.joints(key), r = srand(seed); col = col || AS.cyan;
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.shadowColor = col; c.shadowBlur = 10;
    c.strokeStyle = col; c.globalAlpha = Math.min(1, k * 1.5) * (0.75 + 0.25 * Math.sin(L.D.c * 23 + seed));
    for (const [p0, path] of paths) {
      const u = Math.max(0, Math.min(1, (Math.min(k, 1) - p0) / (1 - p0))) * (path.length - 1);
      c.lineWidth = (w || 1.6) * (k > 1 ? k : 1); c.beginPath(); c.moveTo(J[path[0]].x, J[path[0]].y);
      for (let i = 0; i < path.length - 1 && i < u; i++) {
        const a = J[path[i]], b = J[path[i + 1]], f = Math.min(1, u - i), nx = -(b.y - a.y), ny = b.x - a.x, nl = Math.hypot(nx, ny) || 1;
        for (let j = 1; j <= 4; j++) { const v = j / 4 * f, o = j < 4 ? (r() - 0.5) * 7 : 0; c.lineTo(a.x + (b.x - a.x) * v + nx / nl * o, a.y + (b.y - a.y) * v + ny / nl * o); }
      }
      c.stroke();
    }
    c.restore();
  };
  AS.ARMS = [[0, ['lHand', 'lElbow', 'shoulder', 'neck']], [0, ['rHand', 'rElbow', 'shoulder']], [0.5, ['neck', 'head']], [0.55, ['shoulder', 'hip', 'lKnee', 'lFoot']], [0.6, ['hip', 'rKnee', 'rFoot']]];
  // A wound that does not finish (canon: he is unfinished): a still line across the chest, lit, never closing or bleeding.
  AS.wound = function (c, L, key, k, col, ang, u) {
    if (k <= 0.01) return;
    u = u === undefined ? 0.72 : u;
    const J = L.joints(key), a = { x: J.shoulder.x * u + J.hip.x * (1 - u), y: J.shoulder.y * u + J.hip.y * (1 - u) }, A = ang === undefined ? -0.5 : ang, an = J.face > 0 ? A : P - A, l = 15;
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.shadowColor = col || AS.red; c.shadowBlur = 6 + 8 * k;
    c.globalAlpha = Math.min(1, k); c.strokeStyle = '#ff7050'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(a.x - Math.cos(an) * l, a.y - Math.sin(an) * l * 1.5); c.lineTo(a.x + Math.cos(an) * l, a.y + Math.sin(an) * l * 1.5); c.stroke(); c.restore();
  };
  // Reaching back to an older draft: heat coming off him in thin red lines, rising, and the air near him bending. k 0..1.
  AS.reach = function (c, L, key, k) {
    if (k <= 0.01) return;
    const J = L.joints(key), t = L.D.c, r = srand(Math.floor(t * 30));
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = AS.red; c.shadowColor = AS.red; c.shadowBlur = 12; c.lineCap = 'round';
    for (let i = 0; i < Math.round(18 * k); i++) {
      const p = [J.head, J.shoulder, J.hip, J.rHand, J.lHand, J.rKnee, J.lKnee][i % 7], x = p.x + (r() - 0.5) * 20, y = p.y + (r() - 0.5) * 16, h = 10 + r() * 34 * k;
      c.globalAlpha = k * (0.3 + r() * 0.5); c.lineWidth = 0.8 + r() * 1.6;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + (r() - 0.5) * 10, y - h * 0.5, x + (r() - 0.5) * 6, y - h); c.stroke();
    }
    const g = c.createRadialGradient(J.shoulder.x, J.shoulder.y, 4, J.shoulder.x, J.shoulder.y, 90);
    g.addColorStop(0, 'rgba(255,51,17,' + 0.22 * k + ')'); g.addColorStop(1, 'rgba(255,51,17,0)');
    c.globalAlpha = 1; c.shadowBlur = 0; c.fillStyle = g; c.beginPath(); c.arc(J.shoulder.x, J.shoulder.y, 90, 0, P * 2); c.fill();
    c.restore();
  };
  // A door into the pocket, standing on the floor: a tall red-rimmed slit, black inside with the racks of his arms far
  // off in it. (x, foot y), h tall, k 0..1 open.
  AS.door = function (c, x, y, h, k, t) {
    if (k <= 0.01) return;
    const w = 46 * k, cy = y - h / 2;
    c.save();
    c.beginPath(); c.ellipse(x, cy, w, h / 2, 0, 0, P * 2); c.fillStyle = '#060102'; c.fill();
    c.save(); c.clip();
    const g = c.createRadialGradient(x, cy, 4, x, cy, h * 0.6); g.addColorStop(0, 'rgba(90,6,2,0.9)'); g.addColorStop(1, 'rgba(10,0,0,0)');
    c.fillStyle = g; c.fillRect(x - w, y - h, w * 2, h);
    c.strokeStyle = 'rgba(255,80,50,0.35)'; c.lineWidth = 1;
    for (let i = -3; i <= 3; i++) { const xx = x + i * 11; c.beginPath(); c.moveTo(xx, cy - h * 0.18); c.lineTo(xx + 3, cy + h * 0.1); c.stroke(); }
    c.restore();
    c.globalCompositeOperation = 'lighter'; c.shadowColor = AS.red; c.shadowBlur = 20; c.strokeStyle = AS.red; c.lineWidth = 2.6;
    c.beginPath(); for (let j = 0; j <= 48; j++) { const an = j / 48 * P * 2, q = 1 + 0.04 * Math.sin(an * 9 + t * 14); c.lineTo(x + Math.cos(an) * w * q, cy + Math.sin(an) * h / 2 * q); } c.closePath(); c.stroke();
    c.lineWidth = 1; c.strokeStyle = '#ffb0a0'; c.beginPath(); c.ellipse(x, cy, w * 0.8, h * 0.46, 0, 0, P * 2); c.stroke();
    c.restore();
  };
  // Choreography kit: beat/position lists for 'k' and 's', sound, clashes, blows, hit-stops. o.lv(lvIndex) → a G to
  // land particles on, optional. finish() sorts and hands everything to the actors.
  AS.kit = function (L, o) {
    o = o || {};
    const a = L.actors, ev = L.spec.ev, spark = o.spark || '#ffe9a0';
    const K = { KB: [], SB: [], KP: [], SP: [], KF: [[0, 1]], SF: [[0, -1]], blows: [], stops: [] };
    K.kb = (t, p, e, x) => K.KB.push([t, p, e || 'io', x]); K.sb = (t, p, e, x) => K.SB.push([t, p, e || 'io', x]);
    K.kp = (t, x, h, e) => K.KP.push(e ? [t, x, h || 0, e] : [t, x, h || 0]); K.sp = (t, x, h, e) => K.SP.push(e ? [t, x, h || 0, e] : [t, x, h || 0]);
    K.karc = (t0, x0, h0, t1, x1, h1, pk) => K.KP.push(...CA.arc(t0, x0, h0, t1, x1, h1, pk, 14));
    K.sarc = (t0, x0, h0, t1, x1, h1, pk) => K.SP.push(...CA.arc(t0, x0, h0, t1, x1, h1, pk, 14));
    K.kf = (t, f) => K.KF.push([t, f]); K.sf = (t, f) => K.SF.push([t, f]);
    K.ev = (t, fn) => ev.push([t, fn]);
    K.sfx = (t, k, g, r) => ev.push([t, l => l.sfx(k, g, r)]);
    K.swish = (t, r) => K.sfx(t, 'swingHeavy', 0.65, r || 1.15);
    K.whoosh = (t, r) => K.sfx(t, 'swing', 0.5, r || 1.3);
    K.clash = (t, stop, col) => {
      K.stops.push([t, stop || 0.3, 0.07]);
      ev.push([t + 0.015, l => {
        const x = AS.cross(l, 'k', 's', t + 0.03);
        (l.D.log.clash || (l.D.log.clash = {}))[t] = x.d;
        if (x.d > 16) (l.D.log.miss || (l.D.log.miss = [])).push(['clash', t, x.d]);
        l.sfx('clang', 0.9, 0.9 + Math.random() * 0.25); l.shake(6);
        l.debris(x.x, x.y, 12, { kind: 'spark', col: col || spark, v: 4.6, r: 1.7, g: 0.14, spread: 360, life: 22 });
        l.ring(x.x, x.y, 30, { col: col || spark, w: 2.4, life: 11 });
      }]);
    };
    // A landed blow, aimed by CA.blows: kind light|heavy, col for its sparks.
    K.hit = (t, by, wth, on, at, kind, shake, col) => {
      K.blows.push({ t, by, with: wth, on, at, kind: 'none', range: 90, lead: 0.02 }); K.stops.push([t, kind === 'light' ? 0.4 : 0.28, kind === 'light' ? 0.04 : 0.07]);
      ev.push([t + 0.05, l => { const p = CA.point(on, at, t + 0.06), c2 = col || spark; l.sfx(kind === 'light' ? 'hitBlunt' : 'heavyHit', 0.8, kind === 'light' ? 1.15 : 0.95); l.sfx('hitBlunt', 0.6, 1); l.shake(shake || 8); l.debris(p.x, p.y, 8, { kind: 'spark', col: c2, v: 3.4, r: 1.5, g: 0.08, spread: 360, life: 18 }); l.ring(p.x, p.y, 26, { col: c2, w: 2, life: 10 }); }]);
    };
    // A blow turned aside by the other's hand or forearm (aimed: `by` puts `wth` onto `on`'s `at`).
    K.block = (t, by, wth, on, at) => {
      K.blows.push({ t, by, with: wth, on, at, kind: 'none', range: 90, lead: 0.02 }); K.stops.push([t, 0.45, 0.04]);
      ev.push([t + 0.03, l => { const p = CA.point(on, at, t + 0.04); l.sfx('parry', 0.7, 1.1); l.sfx('hitBlunt', 0.5, 1.3); l.shake(3); l.debris(p.x, p.y, 6, { kind: 'spark', col: spark, v: 3, r: 1.3, g: 0.1, spread: 360, life: 14 }); }]);
    };
    // After finish(): turn `key`'s weapon arm on its beat at t so the two blades cross there (the clash logged above).
    K.solveClash = (t, key, R) => {
      R = R || 60;
      const bt = a[key].beats.find(q => Math.abs(q[0] - t) < 1e-6); if (!bt) return;
      const base0 = Object.assign({}, L.POSES.stand, typeof bt[1] === 'string' ? L.POSES[bt[1]] : bt[1], bt[3]); let best = null;
      for (let d0 = -R; d0 <= R; d0 += 4) for (let d1 = -R; d1 <= R; d1 += 4) {
        bt._q = L.resolve(bt[1], Object.assign({}, bt[3], { rArm: base0.rArm + d0, rFore: base0.rFore + d1 }));
        const d = AS.cross(L, 'k', 's', t + 0.03).d, cost = d + 0.03 * (Math.abs(d0) + Math.abs(d1));
        if (!best || cost < best.cost) best = { d0, d1, cost, d };
      }
      bt[3] = Object.assign({}, bt[3], { rArm: base0.rArm + best.d0, rFore: base0.rFore + best.d1 }); bt._q = null;
      (L.D.log.solve || (L.D.log.solve = {}))[t] = best.d;
    };
    K.finish = () => {
      for (const q of [K.KB, K.SB, K.KP, K.SP, K.KF, K.SF]) q.sort((p, r) => p[0] - r[0]);
      a.k.beats = K.KB; a.k.pos = K.KP; a.k.face = K.KF; a.s.beats = K.SB; a.s.pos = K.SP; a.s.face = K.SF;
    };
    return K;
  };
})();
