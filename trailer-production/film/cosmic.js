// Page-side helpers for "Kael vs Cosmic Axiom" (window.CA), evaluated after creator.js.
// Canon: Cosmic Axiom is what was under the Creator shell, a human will with the First Laws (God's retired first
// draft of physics) running underneath it. His look carries on from the end of film 2: a starlit body (deep blue,
// white stars, starlight eyes), a nebula behind him, the game's orbiting shards. Over it, five thousand years of void
// corruption as a dark violet crust that Kael's hits clear (CA.crust, per bone).
(function () {
  const L = window.FILM, P = Math.PI;
  const CA = window.CA = { star: '#cfe0ff', blue: '#7fa0ff', deep: '#0a1240', rot: '#4c2470', gold: '#ffd27f' };

  function srand(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  CA.srand = srand;

  // Floor only, and the second fighter dressed as the Axiom (no weapon: his attacks are the laws themselves).
  CA.stage = function () {
    currentArena.platforms = currentArena.platforms.filter(p => p.isFloor);
    const p2 = players[1];
    p2.weaponKey = 'gauntlet'; p2.weapon = WEAPONS.gauntlet; p2.color = CA.blue;
  };

  CA.actor = function (spec) {
    return Object.assign({ scale: 1.3, z: 1, lag: 1, auraColor: CA.blue, eyeColor: CA.star, weapon: [[0, false]], pre: CA.drawMantle, post: CA.drawBody }, spec);
  };

  // The body's bones as CinRig paints them (same order, same widths), so a plate laid over a bone covers it exactly.
  CA.bones = function (J, sc) {
    const w = 5.2 * 0.9 * sc;
    return [
      [J.hip, J.rKnee, w, w * 0.92], [J.rKnee, J.rFoot, w * 0.92, w * 0.78], [J.hip, J.lKnee, w, w * 0.92], [J.lKnee, J.lFoot, w * 0.92, w * 0.78],
      [J.neck, J.hip, w * 1.05, w], [J.shoulder, J.lElbow, w, w * 0.9], [J.lElbow, J.lHand, w * 0.9, w * 0.72],
      [J.shoulder, J.rElbow, w, w * 0.9], [J.rElbow, J.rHand, w * 0.9, w * 0.72],
    ];
  };

  // ── his look ──
  // a.neb [[c, 0..1]] nebula strength; a.crust [[c, 0..1]] corruption left (bone i is crusted while crust > its
  // seeded threshold, so it clears piece by piece); a.tint '#rrggbb' overrides the starlight (gold at the end).
  CA.drawMantle = function (c, L, a, s) {
    const J = L.joints(a.key), sc = a.scale || 1, t = L.D.c;
    const k = (a.neb ? L.curve(a.neb, t)[0] : 1) * s.alpha; if (k <= 0.01) return;
    const cx = (J.neck.x + J.hip.x) / 2, cy = (J.neck.y + J.hip.y) / 2 - 4 * sc, R = 62 * sc;
    const rot = a.crust ? L.curve(a.crust, t)[0] : 0, col = a.tint || CA.blue;
    c.globalCompositeOperation = 'lighter';
    const blob = (ox, oy, r, inner, alpha, ph) => {
      const pr = r * (1 + Math.sin(t * 1.3 + ph) * 0.06);
      const g = c.createRadialGradient(cx + ox, cy + oy, pr * 0.05, cx + ox, cy + oy, pr);
      g.addColorStop(0, inner); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = alpha * k; c.fillStyle = g; c.beginPath(); c.arc(cx + ox, cy + oy, pr, 0, P * 2); c.fill();
    };
    blob(0, 0, R * 1.5, 'rgba(40,60,180,0.55)', 1, 0);
    blob(-R * 0.25, -R * 0.2, R, 'rgba(110,40,190,' + (0.25 + rot * 0.35) + ')', 1, 1.7);
    blob(R * 0.2, R * 0.15, R * 0.7, col === CA.blue ? 'rgba(150,180,255,0.35)' : 'rgba(255,210,127,0.35)', 1, 3.1);
    // Stars in the nebula: a fixed field that turns slowly with him.
    const r = srand(17);
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 46; i++) {
      const an = r() * P * 2 + t * 0.05, d = Math.sqrt(r()) * R * 1.25, sz = 0.5 + r() * 1.1 * sc;
      c.globalAlpha = k * (0.35 + 0.5 * Math.abs(Math.sin(t * (1 + r() * 3) + i)));
      c.fillRect(cx + Math.cos(an) * d, cy + Math.sin(an) * d * 0.8, sz, sz);
    }
    // The kept (canon: the 94 bearers he consumed, held in his construct layer): grey strangers standing in the
    // nebula behind his stars, shown as the crust comes off. a.kept [[c, 0..1]], a.keptFace [[c, 1|-1|0]] (0 = toward him).
    const kk = a.kept ? L.curve(a.kept, t)[0] * s.alpha : 0;
    if (kk > 0.01) {
      c.globalCompositeOperation = 'source-over';
      const rk = srand(94), kf = a.keptFace ? (() => { let v = 1; for (const q of a.keptFace) if (q[0] <= t) v = q[1]; return v; })() : 1;
      const names = ['stand', 'readyOpen', 'guard', 'walkA', 'sovPlant', 'crStand', 'kneel'];
      for (let i = 0; i < 9; i++) {
        const an = rk() * P * 2, d = (0.35 + rk() * 0.6) * R * 1.1, x = cx + Math.cos(an) * d, y = cy + Math.sin(an) * d * 0.7 + 30 * sc * 0.4;
        const face = kf === 0 ? (x < cx ? 1 : -1) : kf * (s.face || 1);
        const q = L.resolve(names[i % names.length]);
        L.drawFig(a.f, q, x, y, face, { alpha: kk * (0.22 + rk() * 0.18) * (0.85 + 0.15 * Math.sin(t * 2 + i)), color: '#aab0bc', scale: sc * 0.42, weapon: false });
      }
      c.globalCompositeOperation = 'lighter';
    }
    // The game's orbiting shards: a tilted ring of crystal round the chest.
    const n = 7;
    c.shadowColor = col; c.shadowBlur = 10;
    for (let i = 0; i < n; i++) {
      const an = t * 0.9 + i / n * P * 2, x = cx + Math.cos(an) * R * 0.85, y = cy + Math.sin(an) * R * 0.28, z = Math.sin(an);
      const sz = (3 + (i % 3)) * sc * (0.8 + z * 0.2);
      c.globalAlpha = k * (0.45 + z * 0.3); c.fillStyle = i % 2 ? col : '#ffffff';
      c.save(); c.translate(x, y); c.rotate(an * 2); c.beginPath(); c.moveTo(-sz, 0); c.lineTo(0, -sz * 0.45); c.lineTo(sz, 0); c.lineTo(0, sz * 0.45); c.closePath(); c.fill(); c.restore();
    }
  };

  CA.drawBody = function (c, L, a, s) {
    const J = L.joints(a.key), sc = a.scale || 1, t = L.D.c, B = CA.bones(J, sc);
    const crust = a.crust ? L.curve(a.crust, t)[0] : 0;
    const r = srand(29), thr = []; for (let i = 0; i <= B.length; i++) thr.push(0.05 + r() * 0.9);
    // The plates the bare-hand blows clear (x5h-brawl), below the three cuts of x5-excavate.
    thr[6] = 0.255; thr[4] = 0.25; thr[2] = 0.245;
    // Stars along every clean bone (the starlight showing through). a.starK [[c, 0..1]] dims them (the empty form).
    const sk = a.starK ? L.curve(a.starK, t)[0] : 1;
    c.globalCompositeOperation = 'lighter'; c.fillStyle = '#ffffff';
    B.forEach((b, i) => {
      if (crust > thr[i]) return;
      for (let j = 0; j < 3; j++) {
        const u = r(), x = b[0].x + (b[1].x - b[0].x) * u, y = b[0].y + (b[1].y - b[0].y) * u;
        c.globalAlpha = (0.45 + 0.55 * Math.abs(Math.sin(t * (2 + j) + i * 1.3))) * s.alpha * sk;
        c.beginPath(); c.arc(x, y, 0.7 * sc, 0, P * 2); c.fill();
      }
    });
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    // The crust: dark violet plates over the bones still covered, with the void's cracks in them.
    // A bone whose threshold the crust just fell past throws its plate off (dark shards and starlight under it).
    if (a._pc !== undefined && crust < a._pc) B.forEach((b, i) => {
      if (thr[i] <= a._pc && thr[i] > crust) {
        const mx = (b[0].x + b[1].x) / 2, my = (b[0].y + b[1].y) / 2;
        L.debris(mx, my, 10, { col: '#1a0c2a', v: 4, r: 2.6 * sc, g: 0.12, spread: 360 });
        L.debris(mx, my, 8, { kind: 'spark', col: CA.star, v: 3.5, r: 1.6, g: 0.05, spread: 360 });
      }
    });
    a._pc = crust;
    if ((crust <= 0.01 && !a.headCrust) || s.alpha <= 0.01) return;
    c.globalAlpha = s.alpha;
    B.forEach((b, i) => { if (crust > thr[i]) CA.crustPlate(c, b, sc, i); });
    // The head keeps its own curve (a.headCrust) so the face can be the last thing cleared.
    if ((a.headCrust ? L.curve(a.headCrust, t)[0] : crust) > thr[B.length]) CA.crustHead(c, J, sc, a.headCrack ? L.curve(a.headCrack, t)[0] : 0, t);
  };
  CA.crustPlate = function (c, b, sc, i) {
    const [p0, p1, w0, w1] = b, dx = p1.x - p0.x, dy = p1.y - p0.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    const r = srand(101 + i * 7), N = 5, wv = 1.35;
    c.save();
    c.beginPath();
    for (let j = 0; j <= N; j++) { const u = j / N, w = (w0 + (w1 - w0) * u) * 0.5 * wv * (0.85 + r() * 0.35); c.lineTo(p0.x + dx * u + nx * w, p0.y + dy * u + ny * w); }
    for (let j = N; j >= 0; j--) { const u = j / N, w = (w0 + (w1 - w0) * u) * 0.5 * wv * (0.85 + r() * 0.35); c.lineTo(p0.x + dx * u - nx * w, p0.y + dy * u - ny * w); }
    c.closePath();
    c.fillStyle = '#07040c'; c.fill();
    c.strokeStyle = CA.rot; c.lineWidth = 1 * sc; c.shadowColor = '#5a1a90'; c.shadowBlur = 4; c.stroke();
    // A crack along the plate.
    c.shadowBlur = 0; c.strokeStyle = 'rgba(150,70,200,0.55)'; c.lineWidth = 0.7 * sc;
    c.beginPath(); for (let j = 0; j <= 4; j++) { const u = 0.15 + j * 0.17, o = (r() - 0.5) * w0 * 0.5; c.lineTo(p0.x + dx * u + nx * o, p0.y + dy * u + ny * o); } c.stroke();
    c.restore();
  };
  // crack 0..1: lines of starlight running across the plate from its centre (the face about to come through).
  CA.crustHead = function (c, J, sc, crack, t) {
    const r = srand(77), R = J.headR * 1.12;
    c.save(); c.beginPath();
    for (let j = 0; j < 9; j++) { const an = j / 9 * P * 2, q = R * (0.92 + r() * 0.16); c.lineTo(J.head.x + Math.cos(an) * q, J.head.y + Math.sin(an) * q); }
    c.closePath(); c.fillStyle = '#07040c'; c.fill();
    c.strokeStyle = CA.rot; c.lineWidth = 1 * sc; c.shadowColor = '#5a1a90'; c.shadowBlur = 4; c.stroke();
    if (crack > 0.01) {
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = CA.star; c.shadowColor = '#00d4ff'; c.shadowBlur = 8; c.lineWidth = 0.9 * sc; c.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        let x = J.head.x + (r() - 0.5) * R * 0.3, y = J.head.y + (r() - 0.5) * R * 0.3; const a0 = i / 6 * P * 2 + r();
        c.globalAlpha = Math.min(1, crack * 1.5) * (0.7 + 0.3 * Math.sin((t || 0) * 9 + i));
        c.beginPath(); c.moveTo(x, y);
        for (let j = 1; j <= 3; j++) { const q = R * crack * j / 3; c.lineTo(J.head.x + Math.cos(a0 + (r() - 0.5) * 0.6) * q, J.head.y + Math.sin(a0 + (r() - 0.5) * 0.6) * q); }
        c.stroke();
      }
    }
    c.restore();
  };

  // ── the husk (cold open): the Creator shell coming off him ──
  // Each bone carries a plate drawn exactly as the Creator's body was (black capsule, violet outline). Plate i lets go
  // at its own moment in k (0 = whole shell, 1 = all gone) and falls, turning. The mantle and broken halo slide off first.
  CA.husk = function (c, key, k, o) {
    o = o || {};
    const a = L.actors[key], J = L.joints(key), sc = a.scale || 1, B = CA.bones(J, sc), t = L.D.c;
    const r = srand(55), order = o.order || [4, 8, 7, 5, 6, 0, 2, 1, 3, 9];
    const at = {}; order.forEach((bi, n) => { at[bi] = (n / order.length) * 0.85 + r() * 0.08; });
    const pal = FigureSkin.pal(o.col || CR.violet);
    // The signature (mantle, halo) goes before any plate.
    const sk = Math.max(0, Math.min(1, k / 0.18));
    if (sk < 1) {
      c.save(); c.globalAlpha = 1 - sk; c.translate(0, sk * sk * 40);
      CR.drawSignature(c, L, a, { face: J.face }); c.restore();
    }
    const fall = (n, cx0, cy0, path, spin) => {
      const age = Math.max(0, (k - at[n]) * (o.dur || 3) * 60);
      c.save();
      if (age > 0) {
        const dirx = ((n * 37) % 7 - 3) * 0.35, rr = (n % 2 ? 1 : -1) * (0.02 + (n % 3) * 0.012);
        c.translate(cx0 + dirx * age, cy0 + 0.5 * 0.09 * age * age); c.rotate(rr * age); c.translate(-cx0, -cy0);
        c.globalAlpha = Math.max(0, 1 - age / 70);
      }
      c.strokeStyle = pal.accent; c.lineWidth = 1.85 * sc; c.lineJoin = 'round'; c.stroke(path);
      c.fillStyle = '#05060f'; c.fill(path);
      c.restore();
      // The moment it lets go: starlight underneath.
      if (age > 0 && age < 8) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - age / 8; c.fillStyle = CA.star; c.shadowColor = CA.blue; c.shadowBlur = 14; c.beginPath(); c.arc(cx0, cy0, 4 * sc * (1 + age / 8), 0, P * 2); c.fill(); c.restore(); }
    };
    B.forEach((b, i) => {
      if (k > at[i] + 0.4) return;
      fall(i, (b[0].x + b[1].x) / 2, (b[0].y + b[1].y) / 2, CinRig._capsule(b[0], b[1], b[2] * 1.06, b[3] * 1.06), 0);
    });
    if (k <= at[9] + 0.4) {
      const hp = new Path2D(); hp.ellipse(J.head.x, J.head.y, J.headR * 1.04, J.headR * 1.04, 0, 0, P * 2);
      fall(9, J.head.x, J.head.y, hp, 0);
    }
  };

  // ── his attacks (all real events run at first-draft speed, canon) ──

  // A rift into the Void: a vertical lens of dark with stars in it and a pale rim. k 0..1 open.
  CA.rift = function (c, x, y, h, k, t, o) {
    if (k <= 0.01) return;
    o = o || {};
    const hh = h * Math.min(1, k * 1.3), w = (o.w || 26) * k;
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y, 2, x, y, hh * 0.9);
    g.addColorStop(0, 'rgba(160,190,255,' + 0.35 * k + ')'); g.addColorStop(1, 'rgba(60,80,200,0)');
    c.fillStyle = g; c.fillRect(x - hh, y - hh, hh * 2, hh * 2);
    c.globalCompositeOperation = 'source-over';
    const lens = () => { c.beginPath(); c.moveTo(x, y - hh / 2); c.quadraticCurveTo(x + w, y, x, y + hh / 2); c.quadraticCurveTo(x - w, y, x, y - hh / 2); c.closePath(); };
    lens(); c.fillStyle = '#02031a'; c.fill();
    c.save(); lens(); c.clip();
    const r = srand(9); c.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) { c.globalAlpha = 0.4 + r() * 0.6; c.fillRect(x - w + r() * w * 2, y - hh / 2 + r() * hh, 1.2, 1.2); }
    c.restore();
    lens(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = CA.star; c.shadowColor = CA.blue; c.shadowBlur = 18; c.lineWidth = 2.2; c.globalAlpha = 1; c.stroke();
    c.restore();
  };

  // A star collapsed in a heartbeat: the black disc, a thin bright ring at its edge, the accretion disc turning round it,
  // matter pulled in on spirals. r = radius of the dark, k 0..1. o.jam (0..1, Act 2): the edge losing its shape.
  CA.hole = function (c, x, y, r, k, t, o) {
    if (k <= 0.01) return;
    o = o || {};
    const R = r * k, jam = o.jam || 0;
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y, R * 0.8, x, y, R * 4);
    g.addColorStop(0, 'rgba(150,180,255,0.5)'); g.addColorStop(0.3, 'rgba(90,70,220,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, R * 4, 0, P * 2); c.fill();
    // Accretion disc: many thin tilted rings, the side turning toward us brighter; the far half goes behind the dark.
    const disc = (front) => {
      for (let i = 0; i < 7; i++) {
        const rx = R * (1.5 + i * 0.22), ry = rx * 0.2, lw = Math.max(0.6, R / 22) * (1.8 - i * 0.18);
        const gr = c.createLinearGradient(x - rx, y, x + rx, y);
        gr.addColorStop(0, 'rgba(255,255,255,' + (0.95 - i * 0.11) + ')'); gr.addColorStop(0.5, 'rgba(160,185,255,' + (0.6 - i * 0.07) + ')'); gr.addColorStop(1, 'rgba(90,110,230,' + (0.35 - i * 0.04) + ')');
        c.strokeStyle = gr; c.shadowColor = CA.blue; c.shadowBlur = 8; c.lineWidth = lw; c.globalAlpha = 1;
        c.beginPath(); c.ellipse(x, y, rx, ry, -0.12, front ? 0 : P, front ? P : P * 2); c.stroke();
      }
    };
    disc(false);
    // The far side of the disc, bent up over the top of the dark and under it (the lensing).
    for (const [sgn, al] of [[-1, 0.85], [1, 0.4]]) {
      for (let i = 0; i < 3; i++) {
        c.strokeStyle = i ? CA.star : '#ffffff'; c.shadowColor = CA.blue; c.shadowBlur = 10; c.globalAlpha = al * (1 - i * 0.28); c.lineWidth = Math.max(0.6, R / 26) * (1.6 - i * 0.4);
        c.beginPath(); c.ellipse(x, y + sgn * R * 0.06, R * (1.18 + i * 0.1), R * (1.1 + i * 0.12), -0.12, sgn < 0 ? P * 1.04 : P * 0.06, sgn < 0 ? P * 1.96 : P * 0.94); c.stroke();
      }
    }
    // Infalling matter.
    const rr = srand(3);
    c.fillStyle = CA.star;
    for (let i = 0; i < 36; i++) {
      const a0 = rr() * P * 2, sp = 0.6 + rr(), u = ((t * sp * 0.6 + rr()) % 1), d = R * (1.1 + 3.2 * (1 - u)), an = a0 + u * 5;
      c.globalAlpha = u * 0.9; c.beginPath(); c.arc(x + Math.cos(an) * d, y + Math.sin(an) * d * 0.3, 1.1, 0, P * 2); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
    // The dark, ragged when jammed.
    c.globalAlpha = 1; c.fillStyle = '#000000'; c.shadowBlur = 0;
    c.beginPath();
    for (let i = 0; i <= 28; i++) { const an = i / 28 * P * 2, q = R * (1 + jam * 0.3 * Math.sin(an * 5 + t * 23) * Math.sin(t * 17 + i)); c.lineTo(x + Math.cos(an) * q, y + Math.sin(an) * q); }
    c.closePath(); c.fill();
    c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#ffffff'; c.shadowColor = CA.star; c.shadowBlur = 8; c.lineWidth = 1; c.globalAlpha = 0.9; c.stroke();
    disc(true);
    c.restore();
  };

  // Light aimed like a blade: a beam from (x0, y0) to (x1, y1), w wide, k 0..1. o.jam scatters it (Act 2).
  CA.beam = function (c, x0, y0, x1, y1, w, k, t, o) {
    if (k <= 0.01) return;
    o = o || {};
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, an = Math.atan2(dy, dx), jam = o.jam || 0;
    c.save(); c.translate(x0, y0); c.rotate(an); c.globalCompositeOperation = 'lighter';
    const flick = 0.85 + 0.15 * Math.sin(t * 60);
    for (const [ww, col, al] of [[w * 3.2, CA.blue, 0.22], [w * 1.6, CA.star, 0.55], [w * 0.6, '#ffffff', 1]]) {
      c.fillStyle = col; c.globalAlpha = al * k * flick; c.shadowColor = CA.blue; c.shadowBlur = 20;
      c.beginPath(); c.moveTo(0, -ww * 0.3);
      for (let i = 0; i <= 20; i++) { const u = i / 20, j = jam * Math.sin(u * 30 + t * 40) * w * 1.4 * u; c.lineTo(d * u, -ww / 2 + j); }
      for (let i = 20; i >= 0; i--) { const u = i / 20, j = jam * Math.sin(u * 30 + t * 40 + 1) * w * 1.4 * u; c.lineTo(d * u, ww / 2 + j); }
      c.closePath(); c.fill();
    }
    // The source: a star point at his fingers.
    c.globalAlpha = k; c.fillStyle = '#ffffff'; c.shadowBlur = 24; c.beginPath(); c.arc(0, 0, w * 1.1, 0, P * 2); c.fill();
    c.restore();
  };

  // "Down" belongs to the strongest mass (canon): motes in the frame streaming toward (x, y). k 0..1.
  CA.pull = function (c, x, y, k, t) {
    if (k <= 0.01) return;
    const v = L.view(), r = srand(61);
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = CA.star; c.lineCap = 'round';
    for (let i = 0; i < 90; i++) {
      const sx = v.x0 + r() * (v.x1 - v.x0), sy = v.y0 + r() * (v.y1 - v.y0), u = (t * (0.5 + r()) * 0.7 + r()) % 1;
      const px = sx + (x - sx) * u, py = sy + (y - sy) * u, dx = x - sx, dy = y - sy, d = Math.hypot(dx, dy) || 1, len = 6 + 18 * u;
      c.globalAlpha = k * 0.6 * Math.sin(u * P); c.lineWidth = 1 + u;
      c.beginPath(); c.moveTo(px, py); c.lineTo(px - dx / d * len, py - dy / d * len); c.stroke();
    }
    c.restore();
  };

  // The Void as a place to fall through: deep blue dark, a galaxy far off, stars streaking past (vy = how fast,
  // in px per choreography second, + = the viewer falling down past them).
  CA.paintVoid = function (c, o) {
    o = o || {};
    const v = L.view(), W = v.x1 - v.x0, Hh = v.y1 - v.y0, t = L.D.c;
    const g = c.createLinearGradient(0, v.y0, 0, v.y1);
    g.addColorStop(0, '#02030c'); g.addColorStop(1, '#070a22');
    c.fillStyle = g; c.fillRect(v.x0 - 20, v.y0 - 20, W + 40, Hh + 40);
    c.save(); c.globalCompositeOperation = 'lighter';
    // The galaxy is far: it moves a tenth as much as the camera.
    const gx = v.cx + (o.gx || 0) - (v.cx - 450) * 0.1, gy = v.cy + (o.gy || -40) - (v.cy - 300) * 0.1;
    const gg = c.createRadialGradient(gx, gy, 4, gx, gy, Math.max(W, Hh) * 0.5);
    gg.addColorStop(0, 'rgba(200,190,255,0.28)'); gg.addColorStop(0.2, 'rgba(90,80,200,0.14)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gg; c.fillRect(v.x0, v.y0, W, Hh);
    // The game's own baked void galaxy, far off, turning slowly.
    if (typeof _hdVoidBake === 'function') {
      _hdVoidBake();
      const C = _HD_VOID;
      if (C.galaxy) { c.save(); c.globalAlpha = o.galaxy === undefined ? 0.7 : o.galaxy; c.translate(gx, gy + (o.galDy || 0)); c.scale(1.8, 0.75); c.rotate(t * 0.02 + 0.4); c.drawImage(C.galaxy, -260, -260); c.restore(); }
    }
    const r = srand(23), vy = o.vy || 0;
    c.strokeStyle = '#dfe6ff'; c.fillStyle = '#ffffff';
    for (let i = 0; i < 160; i++) {
      const sx = r() * W, sy = r() * Hh, z = 0.3 + r() * 0.7;
      // o.scroll: how far the viewer has fallen (integrated by the shot, so a change of speed never jumps).
      const y = v.y0 + ((sy - (o.scroll !== undefined ? o.scroll : t * vy) * z) % Hh + Hh) % Hh, x = v.x0 + sx;
      c.globalAlpha = 0.25 + z * 0.6;
      if (vy * z > 60) { c.lineWidth = z * 1.4; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + vy * z * 0.05); c.stroke(); }
      else c.fillRect(x, y, z * 1.6, z * 1.6);
    }
    c.restore();
  };
  // The Void's floor (the game's void arena: black slab, white edge), drawn by the film where a backdrop covers it.
  CA.floor = function (c) {
    const v = L.view();
    c.fillStyle = '#000000'; c.fillRect(v.x0 - 20, L.G, v.x1 - v.x0 + 40, 600);
    c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.shadowColor = '#ffffff'; c.shadowBlur = 8;
    c.beginPath(); c.moveTo(v.x0 - 20, L.G); c.lineTo(v.x1 + 20, L.G); c.stroke(); c.shadowBlur = 0;
  };

  // Aim a cut: search rArm/rFore offsets on beat bi of actor `key` so that at time c the drawn blade passes through
  // target with its outer part (u 0.5..0.95). Applies the best and returns { dA, dF, d, u }. Run after L.setup.
  CA.solve = function (key, bi, target, c, o) {
    o = o || {};
    const a = L.actors[key], b = a.beats[bi], base = Object.assign({}, typeof b[1] === 'string' ? L.POSES[b[1]] : b[1], b[3] || {});
    let best = null;
    const R = o.range || 70;
    for (let dA = -R; dA <= R; dA += 4) for (let dF = -R * 1.4; dF <= R * 1.4; dF += 4) {
      b._q = L.resolve(b[1], Object.assign({}, b[3] || {}, { rArm: base.rArm + dA, rFore: base.rFore + dF }));
      const ob = L.onBlade(key, target, c), cost = ob.d + (ob.u < 0.5 || ob.u > 0.95 ? 40 : 0) + 0.04 * (Math.abs(dA) + Math.abs(dF));
      if (!best || cost < best.cost) best = { dA, dF, d: ob.d, u: ob.u, cost };
    }
    b._q = L.resolve(b[1], Object.assign({}, b[3] || {}, { rArm: base.rArm + best.dA, rFore: base.rFore + best.dF }));
    return best;
  };

  // ── Act 2: interference ──
  // Kael's fragment radiating at the Axiom's own frequency (canon: same source, so it jams his attacks): wavering
  // cyan rings round (x, y) and a shimmer of short level lines. k 0..1.
  CA.noise = function (c, x, y, k, t) {
    if (k <= 0.01) return;
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#00d4ff'; c.shadowColor = '#00d4ff'; c.shadowBlur = 10;
    for (let i = 0; i < 3; i++) {
      const u = ((t * 0.9 + i / 3) % 1), r = 18 + u * 56 * (0.6 + k * 0.5);
      c.globalAlpha = k * (1 - u) * 0.42; c.lineWidth = 1.6;
      c.beginPath();
      for (let j = 0; j <= 40; j++) { const an = j / 40 * P * 2, q = r * (1 + 0.06 * Math.sin(an * 7 + t * 13 + i) + 0.04 * Math.sin(an * 3 - t * 9)); c.lineTo(x + Math.cos(an) * q, y + Math.sin(an) * q * 0.9); }
      c.closePath(); c.stroke();
    }
    const r = srand(Math.floor(t * 20)); c.lineWidth = 1;
    for (let i = 0; i < Math.round(10 * k); i++) { const a = r() * P * 2, d = 20 + r() * 60, lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d * 0.9; c.globalAlpha = k * 0.5 * r(); c.beginPath(); c.moveTo(lx - 6, ly); c.lineTo(lx + 6 + r() * 8, ly); c.stroke(); }
    c.restore();
  };
  // A beam that reaches Kael's interference and comes apart: full beam from (x0, y0) to the edge of a radius-R
  // sphere round (kx, ky), then n thin rays bent off round him and on past. k 0..1.
  CA.scatter = function (c, x0, y0, kx, ky, R, k, t, o) {
    if (k <= 0.01) return;
    o = o || {};
    const an = Math.atan2(ky - y0, kx - x0), ex = kx - Math.cos(an) * R, ey = ky - Math.sin(an) * R;
    CA.beam(c, x0, y0, ex, ey, o.w || 5, k, t, { jam: 0.25 });
    const n = o.n || 6;
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, off = side * (0.35 + 0.22 * Math.floor(i / 2)) + Math.sin(t * 30 + i) * 0.04;
      const a2 = an + off, len = (o.len || 300) * (0.7 + 0.3 * ((i * 37) % 10) / 10);
      CA.beam(c, ex, ey, ex + Math.cos(a2) * len, ey + Math.sin(a2) * len, 1.4, k * 0.8, t + i, { jam: 0.5 });
    }
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = k; c.fillStyle = '#ffffff'; c.shadowColor = '#00d4ff'; c.shadowBlur = 24;
    c.beginPath(); c.arc(ex, ey, 5 + Math.sin(t * 50) * 1.5, 0, P * 2); c.fill(); c.restore();
  };
  // Supernova: a star gathered at (x, y) out of everything near it (k 0..0.5), then let go (0.5..1) as a shell of
  // light that fills the Void, except in the shadow Kael's interference casts behind him (o.kx, o.ky: his centre).
  CA.nova = function (c, x, y, k, t, o) {
    if (k <= 0.01 || k >= 1) return;
    o = o || {};
    const W = canvas.width, Hh = canvas.height;
    const off = CA._nova || (CA._nova = document.createElement('canvas'));
    if (off.width !== W || off.height !== Hh) { off.width = W; off.height = Hh; }
    const oc = off.getContext('2d'); oc.setTransform(1, 0, 0, 1, 0, 0); oc.clearRect(0, 0, W, Hh); oc.setTransform(c.getTransform());
    oc.globalCompositeOperation = 'lighter';
    if (k < 0.5) {
      const u = k / 0.5, r = 3 + u * 26;
      const g = oc.createRadialGradient(x, y, 0, x, y, r * 4);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, 'rgba(255,236,190,' + (0.5 + u * 0.5) + ')'); g.addColorStop(1, 'rgba(120,140,255,0)');
      oc.fillStyle = g; oc.beginPath(); oc.arc(x, y, r * 4, 0, P * 2); oc.fill();
      const rr = srand(5); oc.strokeStyle = CA.star; oc.lineWidth = 1.2;
      for (let i = 0; i < 40; i++) { const a = rr() * P * 2, d0 = 60 + rr() * 260, v = ((t * (1 + rr()) + rr()) % 1), d = d0 * (1 - v); oc.globalAlpha = u * v; oc.beginPath(); oc.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d); oc.lineTo(x + Math.cos(a) * (d + 14), y + Math.sin(a) * (d + 14)); oc.stroke(); }
    } else {
      const u = (k - 0.5) / 0.5, R = 30 + L.EASE.out(u) * 1100, fade = 1 - u;
      const g = oc.createRadialGradient(x, y, R * 0.2, x, y, R);
      g.addColorStop(0, 'rgba(255,250,235,' + 0.7 * fade + ')'); g.addColorStop(0.55, 'rgba(255,214,150,' + 0.6 * fade + ')'); g.addColorStop(0.9, 'rgba(150,170,255,' + 0.8 * fade + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      oc.fillStyle = g; oc.beginPath(); oc.arc(x, y, R, 0, P * 2); oc.fill();
      oc.strokeStyle = '#ffffff'; oc.lineWidth = 6 * fade + 1; oc.globalAlpha = fade; oc.beginPath(); oc.arc(x, y, R * 0.98, 0, P * 2); oc.stroke();
      if (o.kx !== undefined) {
        // The lee: a cone from Kael away from the star, and a pocket round him, where the light comes apart.
        const a = Math.atan2(o.ky - y, o.kx - x), sp = o.spread || 0.28, far = 3000;
        oc.globalCompositeOperation = 'destination-out'; oc.globalAlpha = 1; oc.fillStyle = '#000';
        oc.beginPath(); oc.moveTo(o.kx - Math.cos(a) * 26, o.ky - Math.sin(a) * 26);
        oc.lineTo(o.kx + Math.cos(a + sp) * far, o.ky + Math.sin(a + sp) * far); oc.lineTo(o.kx + Math.cos(a - sp) * far, o.ky + Math.sin(a - sp) * far); oc.closePath(); oc.fill();
        oc.beginPath(); oc.arc(o.kx, o.ky, o.pocket || 46, 0, P * 2); oc.fill();
        // Its edge, ragged cyan where the jam holds.
        oc.globalCompositeOperation = 'lighter'; oc.strokeStyle = '#00d4ff'; oc.shadowColor = '#00d4ff'; oc.shadowBlur = 12; oc.lineWidth = 2; oc.globalAlpha = fade;
        oc.beginPath(); for (let j = 0; j <= 30; j++) { const an = j / 30 * P * 2; const q = (o.pocket || 46) * (1 + 0.1 * Math.sin(an * 6 + t * 20)); oc.lineTo(o.kx + Math.cos(an) * q, o.ky + Math.sin(an) * q); } oc.stroke();
      }
    }
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'lighter'; c.drawImage(off, 0, 0); c.restore();
  };

  // ── Act 3: two people ──
  // A stand-in fighter for an extra actor (gold Axiom, Sovereign, a bearer): the first fighter's drawing with its own
  // colour and weapon.
  CA.proxy = function (color, wk) {
    const f = Object.create(players[0]);
    f.color = color; f.weaponKey = wk || 'gauntlet'; f.weapon = WEAPONS[f.weaponKey]; f.weaponTheme = null;
    return f;
  };
  // The channel (canon: Kael's fragment finding what is buried in the Axiom, the same thing in two states): a
  // wavering thread from (x0, y0) to (x1, y1), cyan at Kael's end and pale gold at his, with light moving both ways.
  CA.thread = function (c, x0, y0, x1, y1, k, t) {
    if (k <= 0.01) return;
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#00d4ff'); g.addColorStop(1, CA.gold);
    for (const [w, a] of [[7, 0.18], [2.4, 0.6], [1, 1]]) {
      c.strokeStyle = g; c.lineWidth = w; c.globalAlpha = a * k; c.shadowColor = '#bfe8ff'; c.shadowBlur = 12;
      c.beginPath();
      for (let i = 0; i <= 30; i++) { const u = i / 30, wv = Math.sin(u * P) * 3 * Math.sin(u * 14 - t * 6) * (1.2 - k * 0.6); c.lineTo(x0 + dx * u + nx * wv, y0 + dy * u + ny * wv); }
      c.stroke();
    }
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 8; i++) { const u = ((t * 0.5 + i / 8) % 1), uu = i % 2 ? u : 1 - u; c.globalAlpha = k * Math.sin(u * P); c.beginPath(); c.arc(x0 + dx * uu, y0 + dy * uu, 1.6, 0, P * 2); c.fill(); }
    c.restore();
  };
  // The kept standing out in the Void: grey strangers on a wide ring round (cx, floor), the far side smaller and
  // fainter, every one facing the centre. k 0..1 (how many have come out), o.look: 1 = all turned to the centre.
  CA.keptRing = function (c, cx, k, t, o) {
    if (k <= 0.01) return;
    o = o || {};
    const f = CA._grey || (CA._grey = CA.proxy('#aab0bc')), r = srand(940), n = o.n || 18, rx = o.rx || 340, ry = o.ry || 46;
    const names = ['stand', 'readyOpen', 'walkA', 'sovPlant', 'crStand', 'kneel', 'guard'];
    const list = [];
    for (let i = 0; i < n; i++) { const an = -P / 2 + (i / n) * P * 2 + (r() - 0.5) * 0.2, born = r() * 0.8; list.push({ an, born, pose: names[i % names.length], d: 0.9 + r() * 0.2 }); }
    list.sort((a, b) => Math.sin(a.an) - Math.sin(b.an));
    for (const b of list) {
      const kk = Math.max(0, Math.min(1, (k - b.born) / 0.2)); if (kk <= 0) continue;
      const depth = (Math.sin(b.an) + 1) / 2, x = cx + Math.cos(b.an) * rx * b.d, y = L.G;
      const face = x < cx ? 1 : -1, sc = 0.7 + depth * 0.35;
      L.drawFig(f, L.resolve(b.pose), x, y, face, { alpha: kk * (0.32 + depth * 0.28) * (0.9 + 0.1 * Math.sin(t * 2 + b.an * 3)) * Math.min(1, 1.6 / ((L.cam && L.cam.z) || 1)), color: '#aab0bc', scale: sc, weapon: false, glow: '#ffffff', glowBlur: 4 });
    }
  };
  // Sovereign's mark (his domain's four arcs) closing onto (x, y): r from big to small as k goes 0..1, turning.
  CA.mark = function (c, x, y, k, t, o) {
    if (k <= 0.01) return;
    o = o || {};
    const r = (o.r1 || 10) + (o.r0 || 60) * (1 - L.EASE.out(Math.min(1, k))), a = o.alpha === undefined ? 1 : o.alpha;
    c.save(); c.globalCompositeOperation = 'source-over'; c.strokeStyle = '#ff3311'; c.shadowColor = '#ff3311'; c.shadowBlur = 8; c.lineWidth = o.w || 2.4;
    c.globalAlpha = a * Math.min(1, k * 3);
    for (let i = 0; i < 4; i++) { const a0 = t * 0.8 + i * P / 2 + 0.25; c.beginPath(); c.arc(x, y, r, a0, a0 + P / 2 - 0.5); c.stroke(); }
    c.lineWidth = 1; c.beginPath(); c.arc(x, y, 1.6, 0, P * 2); c.stroke();
    c.restore();
  };

  // A dent slammed into the void floor at x (draw after CA.floor, in the backdrop, so a body can lie in it): the white
  // edge broken and dipping into a bowl w wide, d deep, its rim lit. k 0..1 (how far it has been driven in).
  CA.crater = function (c, x, w, d, k) {
    if (k <= 0.01) return;
    const G = L.G, dd = d * k;
    c.save();
    c.fillStyle = '#000000'; c.fillRect(x - w / 2 - 2, G - 4, w + 4, 8);
    c.strokeStyle = '#ffffff'; c.shadowColor = CA.star; c.shadowBlur = 10; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - w / 2 - 2, G);
    for (let i = 0; i <= 16; i++) { const u = i / 16, jag = (i % 2 ? 1.5 : -1) * k; c.lineTo(x - w / 2 + w * u, G + Math.sin(u * P) * dd + jag); }
    c.lineTo(x + w / 2 + 2, G); c.stroke();
    // Splintered edge plates either side.
    c.fillStyle = '#0b0b14'; c.strokeStyle = 'rgba(220,230,255,0.8)'; c.lineWidth = 1; c.shadowBlur = 4;
    for (const sg of [-1, 1]) { const ex = x + sg * w / 2; c.beginPath(); c.moveTo(ex - sg * 2, G); c.lineTo(ex + sg * 10 * k, G - 5 * k); c.lineTo(ex + sg * 18 * k, G); c.closePath(); c.fill(); c.stroke(); }
    c.restore();
  };


  // ── motion: paths and contact ──
  // A ballistic path as 'lin' keys [c, x, h]: x at constant speed, h a parabola through h0, the peak, h1. Nothing in the
  // air eases to a stop at its apex. peak is the top height (default: just the higher end, so a straight fall).
  CA.arc = function (t0, x0, h0, t1, x1, h1, peak, n) {
    n = n || 12;
    const top = Math.max(peak === undefined ? -1e9 : peak, h0, h1);
    // Solve the time of the apex u* in 0..1 so h(u) = top - A (u - u*)^2 passes through both ends.
    const a = Math.sqrt(Math.max(0, top - h0)), b = Math.sqrt(Math.max(0, top - h1)), us = a + b > 0 ? a / (a + b) : 0, A = us > 0 ? (top - h0) / (us * us) : (top - h1) / ((1 - us) * (1 - us) || 1);
    const o = [];
    for (let i = 1; i <= n; i++) { const u = i / n; o.push([t0 + (t1 - t0) * u, x0 + (x1 - x0) * u, top - A * (u - us) * (u - us), 'lin']); }
    return o;
  };
  // Aim a blow: search two limb angles of beat bi of `key` so `joint` is on `target` at time c. Returns the miss in px.
  CA.aim = function (key, bi, joint, limbs, target, c, o) {
    o = o || {};
    const a = L.actors[key], b = a.beats[bi], base = Object.assign({}, L.POSES.stand, typeof b[1] === 'string' ? L.POSES[b[1]] : b[1], b[3] || {});
    const R = o.range || 100, st = o.step || 4, [l0, l1] = limbs;
    let best = null;
    for (let d0 = -R; d0 <= R; d0 += st) for (let d1 = -R; d1 <= R; d1 += st) {
      b._q = L.resolve(b[1], Object.assign({}, b[3] || {}, { [l0]: base[l0] + d0, [l1]: base[l1] + d1 }));
      const J = L.joints(key, c), d = Math.hypot(J[joint].x - target.x, J[joint].y - target.y), cost = d + 0.02 * (Math.abs(d0) + Math.abs(d1));
      if (!best || cost < best.cost) best = { d0, d1, d: Math.round(d), cost };
    }
    b._q = L.resolve(b[1], Object.assign({}, b[3] || {}, { [l0]: base[l0] + best.d0, [l1]: base[l1] + best.d1 }));
    return best;
  };
  const LIMB = { lHand: ['lArm', 'lFore'], rHand: ['rArm', 'rFore'], lFoot: ['lLeg', 'lShin'], rFoot: ['rLeg', 'rShin'], lKnee: ['lLeg', 'lShin'], rKnee: ['rLeg', 'rShin'], lElbow: ['lArm', 'lFore'], rElbow: ['rArm', 'rFore'] };
  CA.point = function (key, at, c) {
    const J = L.joints(key, c);
    const mid = (a, b) => ({ x: (J[a].x + J[b].x) / 2, y: (J[a].y + J[b].y) / 2 });
    if (at === 'chest') return { x: J.shoulder.x * 0.7 + J.hip.x * 0.3, y: J.shoulder.y * 0.7 + J.hip.y * 0.3 };
    if (at === 'gut') return { x: J.shoulder.x * 0.3 + J.hip.x * 0.7, y: J.shoulder.y * 0.3 + J.hip.y * 0.7 };
    if (at === 'rFore') return mid('rElbow', 'rHand');
    if (at === 'lFore') return mid('lElbow', 'lHand');
    if (at === 'lThigh') return mid('hip', 'lKnee');
    if (at === 'rThigh') return mid('hip', 'rKnee');
    return { x: J[at].x, y: J[at].y };
  };
  // Blows: [{ t, by, with: 'lHand'|'rFoot'|.., on: 'k', at: 'head'|'chest'|'gut'|<joint>, kind: 'jab'|'heavy'|'block'|'catch' }]. A
  // beat of `by` at time t must exist. Each is aimed at where the target's body really is (judged a few frames into the
  // hold), the miss is logged to marks.blows, and the effect fires on the striking joint. o.quiet: aim only.
  CA.blows = function (L, list) {
    const spec = L.spec, log = L.D.log.blows = {};
    for (const b of list) {
      const a = L.actors[b.by], bi = a.beats.findIndex(q => Math.abs(q[0] - b.t) < 1e-6);
      if (bi < 0) { log[b.t] = 'NO BEAT'; continue; }
      const jt = b.t + (b.lead === undefined ? 0.06 : b.lead);
      const tgt = b.point || CA.point(b.on, b.at, jt);
      const r = CA.aim(b.by, bi, b.with, LIMB[b.with], tgt, jt, b);
      // A hold of the same pose keeps the aimed arm.
      const nx = a.beats[bi + 1]; if (nx && nx[1] === a.beats[bi][1] && !nx[3] && !a.beats[bi][3]) nx._q = a.beats[bi]._q;
      log[b.t.toFixed(2)] = b.by + ' ' + b.with + '>' + (b.at || 'pt') + ' ' + r.d;
      if (r.d > 9) (L.D.log.miss || (L.D.log.miss = [])).push([b.t, b.by, b.with, b.at, r.d]);
      spec.ev.push([jt - 0.01, l => CA.blowFx(l, b)]);
    }
  };
  CA.blowFx = function (L, b) {
    const J = L.joints(b.by), p = J[b.with], k = b.kind || 'jab', col = b.col || '#ffffff';
    if (k === 'none') return;
    if (k === 'block') { L.sfx('parry', 0.7, 1.1); L.sfx('hitBlunt', 0.6, 1.2); L.debris(p.x, p.y, 7, { kind: 'spark', col: CA.star, v: 3.5, r: 1.6, g: 0.1, spread: 360 }); L.ring(p.x, p.y, 13, { col, w: 1.5, life: 7 }); L.shake(3); }
    else if (k === 'catch') { L.sfx('hitBlunt', 1, 0.7); L.ring(p.x, p.y, 18, { col, w: 2, life: 9 }); L.shake(5); }
    else if (k === 'jab') { L.sfx('hitBlunt', 0.95, 1.15); L.ring(p.x, p.y, 13, { col, w: 2, life: 7 }); L.streaks(p.x, p.y, 6, 18, { col, life: 6, w: 1.5 }); L.shake(5); }
    else { L.sfx('heavyHit', 1, 0.75); L.sfx('hitBlunt', 1, 0.7); L.ring(p.x, p.y, 26, { col, w: 3, life: 10 }); L.streaks(p.x, p.y, 10, 34, { col, life: 9, w: 2 }); L.debris(p.x, p.y, 8, { kind: 'spark', col: CA.star, v: 4, r: 2, g: 0.1, spread: 360 }); L.shake(11); if (b.impact) L.impact(1, { tint: '#bfd0ff' }); }
  };
  // Camera keys that keep both actors in frame from c0 to c1: smoothed midpoint, zoom from their separation. The first key is a cut.
  CA.follow = function (L, a, b, c0, c1, o) {
    o = o || {};
    const at = c => { const A = L.joints(a, c), B = L.joints(b, c); return { x: (A.hip.x + B.hip.x) / 2, y: (A.hip.y + B.hip.y) / 2 - 18, dx: Math.abs(A.hip.x - B.hip.x), dy: Math.abs(A.hip.y - B.hip.y) }; };
    const keys = [], st = 0.1;
    for (let c = c0; c < c1 + st / 2; c += st) {
      let x = 0, y = 0, z = 0;
      for (let i = -2; i <= 2; i++) { const q = at(Math.max(c0, Math.min(c1, c + i * 0.08))); x += q.x / 5; y += q.y / 5; z += Math.min(o.zMax || 2.3, 900 / (q.dx + 200), 400 / (q.dy + 150)) / 5; }
      keys.push([Math.min(c, c1), x, L.G - y + (o.lift || 0), Math.max(o.zMin || 1.05, z), c === c0 ? (o.cut === false ? 'sine' : 'hold') : 'sine']);
    }
    return keys;
  };
  // A speed curve from hit-stops [t, slow, hold]: full speed, dropping to slow at t, held, then back.
  CA.hitch = function (list) {
    const o = [[0, 1]];
    for (const [t, slow, hold] of list) o.push([t - 0.01, 1], [t + 0.01, slow, 'lin'], [t + hold, slow], [t + hold + 0.12, 1]);
    return o;
  };
  // Holds `own` joint of actor a on `joint` of `other` between c0 and c1 (a collar in a fist); outside it, base(c).
  CA.lock = function (a, own, other, joint, c0, c1, base) {
    return function (c) {
      const b = base(c);
      if (c < c0 || c > c1 || a._lk) return b;
      a._lk = true;
      try { const J = L.joints(a.key, c), A = L.joints(other, c); return [b[0] + A[joint].x - J[own].x, b[1] - (A[joint].y - J[own].y)]; } finally { a._lk = false; }
    };
  };
  // A blade out of anyone's hand, spinning, or standing in the floor: hilt at (x, y), pointing along ang (world radians).
  CA.loose = function (c, f, x, y, ang, sc, clipY) {
    const swg = typeof WEAPON_SWINGS !== 'undefined' ? WEAPON_SWINGS[f.weaponKey] : null, tilt = (swg && swg.carry && swg.carry.tilt) || 0;
    const fc = f.facing; f.facing = 1;
    c.save();
    if (clipY !== undefined) { c.beginPath(); c.rect(x - 400, y - 400, 800, clipY - (y - 400)); c.clip(); }
    try { f.drawWeapon(x, y, ang - tilt, false, null, 1.5 * 0.9 * (sc || 1)); } catch (e) {}
    c.restore(); f.facing = fc;
  };
  // The vanish of a blink: black and starlight going in, a ring on arrival.
  CA.blink = function (L, x, y, o) {
    o = o || {};
    L.debris(x, y, 16, { col: '#05030a', v: 3, r: 3, g: 0, spread: 360, life: 26 });
    L.debris(x, y, 10, { kind: 'spark', col: CA.star, v: 3, r: 1.6, g: 0, spread: 360, life: 20 });
    L.add({ t: 'ring', x, y, r0: o.r || 46, r1: 3, life: 8, w: 2.5, sq: 1, col: CA.star });
    if (!o.quiet) L.sfx('portalOpen', 0.5, 1.5);
  };
  // calcStrike's mark (the game's STRIKE cross): where he knows you end up.
  CA.cross = function (c, x, y, k) {
    if (k <= 0.01) return;
    const r = 15 + 16 * (1 - Math.min(1, k));
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#aaddff'; c.shadowColor = '#aaddff'; c.shadowBlur = 10; c.lineWidth = 1.8; c.globalAlpha = Math.min(1, k * 2);
    c.beginPath(); c.moveTo(x - r, y - r); c.lineTo(x + r, y + r); c.moveTo(x + r, y - r); c.lineTo(x - r, y + r); c.stroke();
    c.lineWidth = 1; c.beginPath(); c.arc(x, y, r * 1.3, 0, P * 2); c.stroke();
    c.restore();
  };
  // An arm of his through a rift (warp): from the lens at (rx, ry) out to the fist at (fx, fy), same body as his.
  CA.riftArm = function (c, rx, ry, fx, fy, k, t) {
    if (k <= 0.01) return;
    const mx = rx + (fx - rx) * 0.5, my = ry + (fy - ry) * 0.5, sc = 1.17, w = 5.2 * sc;
    c.save();
    const p = CinRig._capsule({ x: rx, y: ry }, { x: fx, y: fy }, w, w * 0.72);
    c.fillStyle = '#05060f'; c.fill(p);
    c.strokeStyle = CA.blue; c.shadowColor = CA.blue; c.shadowBlur = 8; c.lineWidth = 1.85; c.stroke(p);
    c.shadowBlur = 0; c.globalCompositeOperation = 'lighter'; c.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) { const u = 0.2 + i * 0.2; c.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 3 + i)); c.beginPath(); c.arc(rx + (fx - rx) * u, ry + (fy - ry) * u, 0.9, 0, P * 2); c.fill(); }
    c.restore();
  };

  // ── the sky (x6h-sky) ──
  // The floor withdrawn ("a courtesy"): k 0 = whole, 1 = gone. The slab breaks from x0 outward, each span falling. back: re-forming.
  CA.floorGone = function (c, x0, k) {
    if (k <= 0.001) { CA.floor(c); return; }
    if (k >= 1) return;
    const v = L.view(), r = srand(44), step = 46;
    for (let x = Math.floor((v.x0 - 60) / step) * step; x < v.x1 + 60; x += step) {
      const dist = Math.abs(x + step / 2 - x0) / 520, u = Math.max(0, (k - dist * 0.55) / 0.45), fall = u * u * 420, rot = (r() - 0.5) * u * 0.9, a = Math.max(0, 1 - u * 1.1);
      if (a <= 0) continue;
      c.save(); c.globalAlpha = a; c.translate(x + step / 2, L.G + fall); c.rotate(rot);
      c.fillStyle = '#000000'; c.fillRect(-step / 2, 0, step, 300);
      c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.shadowColor = '#ffffff'; c.shadowBlur = u > 0 ? 3 : 8; c.beginPath(); c.moveTo(-step / 2, 0); c.lineTo(step / 2, 0); c.stroke();
      c.restore();
    }
  };
  // A meteor: a dark jagged rock with a lit edge, and fire streaming behind it against its travel (vx, vy per second). k: heat.
  CA.rock = function (c, x, y, r, seed, spin, vx, vy, heat) {
    const rr = srand(seed), sp = Math.hypot(vx, vy) || 1;
    if (heat > 0.01 && sp > 30) {
      const tx = -vx / sp, ty = -vy / sp, len = r * (2.5 + sp / 90), nx = -ty, ny = tx;
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(x, y, x + tx * len, y + ty * len);
      g.addColorStop(0, 'rgba(255,225,190,' + 0.5 * heat + ')'); g.addColorStop(0.3, 'rgba(150,170,255,' + 0.22 * heat + ')'); g.addColorStop(1, 'rgba(60,70,200,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(x + nx * r * 0.7, y + ny * r * 0.7); c.lineTo(x + tx * len, y + ty * len); c.lineTo(x - nx * r * 0.7, y - ny * r * 0.7); c.closePath(); c.fill();
      c.restore();
    }
    c.save(); c.translate(x, y); c.rotate(spin);
    c.beginPath(); const n = 9; for (let i = 0; i < n; i++) { const a = i / n * P * 2, q = r * (0.78 + rr() * 0.34); c.lineTo(Math.cos(a) * q, Math.sin(a) * q * 0.82); } c.closePath();
    c.fillStyle = '#0a0b14'; c.fill(); c.strokeStyle = heat > 0.1 ? '#ffe9c8' : CA.star; c.lineWidth = 1.5; c.shadowColor = heat > 0.1 ? '#ffb070' : CA.blue; c.shadowBlur = 8; c.stroke();
    c.restore();
  };
  // Reality Slash: a line across the world, opening. Through (x, y) at ang degrees, k 0..1 (draws fast, then thins).
  CA.realSlash = function (c, x, y, ang, k) {
    if (k <= 0.01 || k >= 1) return;
    const a = ang * P / 180, len = 900 * Math.min(1, k * 6), w = 7 * (1 - k) * (1 - k) + 0.5;
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#ffffff'; c.shadowColor = CA.star; c.shadowBlur = 22; c.lineWidth = w; c.globalAlpha = 1 - k * k;
    c.beginPath(); c.moveTo(x - Math.cos(a) * len, y - Math.sin(a) * len); c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke();
    c.restore();
  };
  // Galaxy Sweep: two spiral arms of stars turning about (x, y), ang radians, R out, k 0..1. o.gap: { x, y, r }: a
  // point its light frays and parts around (Kael's interference). Returns nothing; hits are staged by the shot.
  CA.galaxy = function (c, x, y, ang, R, k, t, o) {
    if (k <= 0.01) return;
    o = o || {};
    const rr = srand(71);
    c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(x, y, 2, x, y, R * 0.3);
    g.addColorStop(0, 'rgba(255,240,220,' + 0.7 * k + ')'); g.addColorStop(1, 'rgba(90,70,220,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, R * 0.3, 0, P * 2); c.fill();
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 190; i++) {
        const u = i / 190, wob = (rr() - 0.5) * (6 + u * 26), an = ang + arm * P + u * 3.4, d = 14 + u * R;
        let px = x + Math.cos(an) * d + Math.cos(an + P / 2) * wob, py = y + (Math.sin(an) * d + Math.sin(an + P / 2) * wob) * 0.62;
        const sz = rr();
        if (o.gap) { const gx = px - o.gap.x, gy = py - o.gap.y, gd = Math.hypot(gx, gy); if (gd < o.gap.r) { const ps = o.gap.r / (gd || 1); px = o.gap.x + gx * ps; py = o.gap.y + gy * ps; } }
        c.globalAlpha = k * (1 - u * 0.6) * (0.35 + rr() * 0.65);
        c.fillStyle = i % 5 === 0 ? '#ffffff' : i % 2 ? CA.star : '#9a8cff';
        c.beginPath(); c.arc(px, py, 0.8 + sz * 2.1 * (1 - u * 0.5), 0, P * 2); c.fill();
      }
    }
    c.restore();
  };

  window.CA = CA;
})();
