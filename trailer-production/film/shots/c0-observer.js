'use strict';
// Cold open, the observer. The Creator's domain, half built. The Creator stands before a drift of floating
// shards of broken reality; each holds a moment of the rooftop fight (film 1), seen the way it sees: violet rings
// closing on Kael, measuring. The clash. The two-finger catch. The ninety-four behind him. Then Sovereign rising
// from his knee, and turning his head to look straight out of the shard at the one watching (canon: the Creator
// believes Sovereign is its guardian; Sovereign has always known who watches). That shard goes black. The Creator
// closes its hand and the shards crush into one crystal. It turns toward the gate.
module.exports = {
  arena: 'creator', frames: 1000, endC: 16.4,
  match: { p2: 'gauntlet', p2Color: '#cc00ee' },
  install: function (H) {
    const L = FILM, G = H.D.G, P = Math.PI;
    const red = '#ff3311', cyan = '#00d4ff', violet = '#cc00ee', pale = '#e8d4ff';
    CR.stage(1);
    const CX = 300;
    // The shards: centre, radius, the moment it holds, when the camera is inside it.
    const SH = [
      { x: 478, y: G - 196, r: 64, seed: 3, scene: 'clash', t0: 2.6 },
      { x: 628, y: G - 214, r: 60, seed: 9, scene: 'catch', t0: 5.0, sc: 0.5 },
      { x: 556, y: G - 84, r: 62, seed: 17, scene: 'bearers', t0: 7.4 },
      { x: 716, y: G - 118, r: 64, seed: 23, scene: 'look', t0: 9.8 },
    ];
    for (const s of SH) {
      let sd = s.seed; const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
      s.poly = []; const n = 7;
      for (let i = 0; i < n; i++) { const a = i / n * P * 2 + (R() - 0.5) * 0.5; s.poly.push([Math.cos(a) * s.r * (0.82 + R() * 0.3), Math.sin(a) * s.r * 0.72 * (0.82 + R() * 0.3)]); }
      s.bob = R() * 6;
    }
    // Stand-ins for film 1's two fighters, drawn small inside the shards.
    const K = players[0];
    const S = Object.create(players[1]);
    S.weaponKey = 'nullblade'; S.weapon = WEAPONS.nullblade; S.color = red;
    const tilt = k => { const w = typeof WEAPON_SWINGS !== 'undefined' && WEAPON_SWINGS[k]; return (w && w.carry && w.carry.tilt) || 0; };
    const blen = (k, sc) => { const s = typeof WEAPON_SPRITES !== 'undefined' && WEAPON_SPRITES[k]; return s ? s.len * (1 - s.anchor) * 1.5 * 0.9 * sc : 60; };
    const jts = (q, x, y, face, sc) => {
      const m = face < 0 ? L.mirror(q) : Object.assign({}, q); m.rot = 0;
      m.x = x; m.y = y; m.facing = face; m.scale = (m.scale || 1) * 0.9 * sc; m.headScale = (m.headScale || 1) * 0.77;
      return CinRig.joints(m);
    };
    // Blade segment for a posed fighter (world angle of the weapon arm + the weapon's carry tilt).
    const blade = (f, q, x, y, face, sc) => {
      const J = jts(q, x, y, face, sc), m = face < 0 ? L.mirror(q) : q, t = tilt(f.weaponKey);
      const an = m.rFore + (face < 0 ? -t : t), l = blen(f.weaponKey, sc);
      return { h: J.rHand, t: { x: J.rHand.x + Math.cos(an) * l, y: J.rHand.y + Math.sin(an) * l }, J };
    };
    const cross = (a, b) => {
      const d1x = a.t.x - a.h.x, d1y = a.t.y - a.h.y, d2x = b.t.x - b.h.x, d2y = b.t.y - b.h.y, den = d1x * d2y - d1y * d2x;
      if (Math.abs(den) < 1e-6) return null;
      const u = ((b.h.x - a.h.x) * d2y - (b.h.y - a.h.y) * d2x) / den;
      return { x: a.h.x + d1x * u, y: a.h.y + d1y * u };
    };
    const BEARERS = ['hammer', 'scythe', 'spear', 'axe', 'sword', 'bow', 'mace', 'dagger', 'lance', 'whip'].filter(k => WEAPONS[k]);
    const bearerF = BEARERS.map(k => { const f = Object.create(K); f.weaponKey = k; f.weapon = WEAPONS[k]; f.color = '#aab0bc'; f.weaponTheme = null; return f; });
    // The Creator's measuring: rings closing on a point, with ticks.
    const reticle = (c, x, y, t, a) => {
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = pale; c.shadowColor = violet; c.shadowBlur = 6; c.lineWidth = 0.9;
      for (let i = 0; i < 3; i++) {
        const k = ((t * 0.7 + i / 3) % 1), r = 46 * (1 - k) + 8;
        c.globalAlpha = a * Math.sin(k * P) * 0.8;
        c.beginPath(); c.arc(x, y, r, 0, P * 2); c.stroke();
        for (let j = 0; j < 4; j++) { const an = j * P / 2 + t * 0.6; c.beginPath(); c.moveTo(x + Math.cos(an) * r, y + Math.sin(an) * r); c.lineTo(x + Math.cos(an) * (r + 5), y + Math.sin(an) * (r + 5)); c.stroke(); }
      }
      c.restore();
    };
    // The rooftop at night inside a shard: scene units, roof at y 0.
    const roof = (c, t) => {
      const g = c.createLinearGradient(0, -170, 0, 40); g.addColorStop(0, '#060614'); g.addColorStop(1, '#151530');
      c.fillStyle = g; c.fillRect(-220, -200, 440, 260);
      let sd = 5; const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 9; i++) { const bx = -220 + i * 52, bh = 40 + R() * 110; c.fillStyle = 'rgb(16,16,30)'; c.fillRect(bx, -bh + 10, 46, bh); c.fillStyle = 'rgba(255,235,160,0.18)'; for (let w = 0; w < 6; w++) if (R() > 0.5) c.fillRect(bx + 4 + (w % 3) * 13, -bh + 18 + Math.floor(w / 3) * 14, 4, 6); }
      c.fillStyle = '#33334a'; c.fillRect(-220, 0, 440, 60); c.fillStyle = '#55556a'; c.fillRect(-220, 0, 440, 2);
      c.strokeStyle = 'rgba(170,190,230,0.25)'; c.lineWidth = 1; c.beginPath();
      for (let i = 0; i < 40; i++) { const x = -220 + ((i * 53.7 + t * 40) % 440), y = -200 + ((i * 97.1 + t * 520) % 260); c.moveTo(x, y); c.lineTo(x - 1.2, y + 8); }
      c.stroke();
    };
    const q = n => L.resolve(n);
    const pa = (beats, t) => L.poseAt(beats, t);
    const SCENES = {
      // The clash: the blades crossed above and between them, sparks at the X.
      clash: (c, t) => {
        roof(c, t);
        const push = Math.min(1, t / 2.4) * 4;
        const kq = q('clash'), sq = Object.assign({}, q('clash'), { rFore: L.RAD(-36) });
        const kx = -50 - push * 0.3, sx = 52 + push * 0.3;
        const a = blade(K, kq, kx, 0, 1, 1), b = blade(S, sq, sx, 0, -1, 1.08);
        L.drawFig(K, kq, kx, 0, 1, { expr: 'intense' }); L.drawFig(S, sq, sx, 0, -1, { scale: 1.08 });
        const X = cross(a, b);
        if (X) {
          c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#ffe9a0'; c.shadowColor = '#ffd060'; c.shadowBlur = 10;
          for (let i = 0; i < 9; i++) { const an = i * 0.7 + t * 9, r = 4 + ((t * 30 + i * 7) % 14); c.globalAlpha = 0.8; c.lineWidth = 1.2; c.beginPath(); c.moveTo(X.x + Math.cos(an) * 2, X.y + Math.sin(an) * 2); c.lineTo(X.x + Math.cos(an) * r, X.y + Math.sin(an) * r); c.stroke(); }
          c.restore();
        }
        reticle(c, a.J.head.x, a.J.head.y + 12, t, 1);
      },
      // The catch: Kael's draw-cut stopped between two of Sovereign's fingers (the blade's tip is put on his hand).
      catch: (c, t) => {
        roof(c, t);
        const sq = q('sovCatch'), sx = 40, SJ = jts(sq, sx, 0, -1, 1.08), tgt = SJ.lHand;
        // The drawn blade sits at rFore + the katana's carry tilt: aim it at the hand, then slide Kael so the tip lands
        // on it (twice, since the hand moves with the forearm).
        const kq = Object.assign({}, q('slashOut')), l = blen('katana', 1);
        let kx = -60;
        for (let i = 0; i < 3; i++) {
          const h = jts(kq, kx, 0, 1, 1).rHand, dy = tgt.y - h.y, dx = Math.sqrt(Math.max(1, l * l - dy * dy));
          kq.rFore = Math.atan2(dy, dx) - tilt('katana');
          kx += tgt.x - dx - jts(kq, kx, 0, 1, 1).rHand.x;
        }
        c.translate(-(kx + sx) / 2, 0);
        L.drawFig(K, kq, kx, 0, 1, { expr: 'intense' }); L.drawFig(S, sq, sx, 0, -1, { scale: 1.08 });
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = '#ffd0c0'; c.shadowColor = red; c.shadowBlur = 12; c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8);
        c.beginPath(); c.arc(tgt.x, tgt.y, 2.2, 0, P * 2); c.fill(); c.restore();
        reticle(c, kx + 2, -30, t, 1);
      },
      // The ninety-four behind him: grey bearers, each with the weapon of their pattern.
      bearers: (c, t) => {
        roof(c, t);
        const kq = pa([[0, 'rising'], [1.2, 'rising'], [2.2, 'stand', 'io']], t);
        const fade = Math.min(1, t / 0.8);
        bearerF.forEach((f, i) => {
          const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), bx = side * (15 + row * 12), sc = 1 - row * 0.05;
          L.drawFig(f, q(['ready', 'readyOpen', 'guard', 'stand'][i % 4]), bx, -row * 2, 1, { alpha: 0.26 * fade * (1 - row * 0.13), color: '#aab0bc', scale: sc, glow: '#ffffff', glowBlur: 6, wAlpha: 0.35 });
        });
        L.drawFig(K, kq, 0, 0, 1, { weapon: false, expr: 'intense' });
        reticle(c, 0, -36, t, Math.max(0, 1 - t / 2.6));
      },
      // Sovereign rises from his knee, then turns and looks out of the shard.
      look: (c, t) => {
        roof(c, t);
        const sq = pa([[0, 'sovKneelPlant'], [0.5, 'sovKneelPlant'], [1.6, 'sovReady', 'io'], [2.2, 'sovReady'], [2.4, 'sovLook', 'out']], t);
        const face = t < 2.25 ? 1 : -1;
        L.drawFig(S, sq, 10, 0, face, { scale: 1.08 });
        if (t > 2.35) {
          const J = jts(sq, 10, 0, face, 1.08), k = Math.min(1, (t - 2.35) * 4);
          const x = J.head.x - J.headR * 0.4, y = J.head.y - J.headR * 0.1, r = J.headR * (0.3 + Math.sin(Math.min(1, k) * P) * 1.4);
          c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = '#ffd0c0'; c.shadowColor = red; c.shadowBlur = 14; c.globalAlpha = Math.max(0.5, 1 - (t - 2.6));
          c.beginPath(); for (let i = 0; i < 8; i++) { const an = i * P / 4, rr = i % 2 ? r * 0.16 : r; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(an) * rr, y + Math.sin(an) * rr); } c.closePath(); c.fill();
          c.restore();
        }
      },
    };
    // A shard: clipped window, its moment at scene scale sc, the glass edge. dark 0..1 blacks it out; crack draws
    // fracture lines across it.
    const drawShard = (c, s, o) => {
      const x = o.x, y = o.y, sc = o.sc || 1;
      c.save();
      c.globalAlpha = o.a === undefined ? 1 : o.a;
      c.beginPath(); s.poly.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](x + p[0] * sc, y + p[1] * sc)); c.closePath();
      c.save(); c.clip();
      c.save(); c.translate(x, y + s.r * 0.42 * sc); c.scale((s.sc || 0.62) * sc, (s.sc || 0.62) * sc);
      try { SCENES[s.scene](c, Math.max(0, o.t)); } catch (e) {}
      c.restore();
      // A violet cast: this is how the Creator sees.
      c.globalCompositeOperation = 'source-over'; c.fillStyle = 'rgba(120,40,200,0.12)'; c.fillRect(x - s.r * 2, y - s.r * 2, s.r * 4, s.r * 4);
      if (o.dark) { c.fillStyle = 'rgba(0,0,0,' + o.dark + ')'; c.fillRect(x - s.r * 2, y - s.r * 2, s.r * 4, s.r * 4); }
      if (o.crack) {
        c.globalAlpha = Math.min(1, o.crack * 2); c.strokeStyle = '#ffffff'; c.lineWidth = 0.9; c.shadowColor = red; c.shadowBlur = 6;
        let sd = s.seed * 7; const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
        for (let j = 0; j < 7; j++) {
          let px = x + (R() - 0.5) * 10, py = y + (R() - 0.5) * 10; const an = R() * P * 2; c.beginPath(); c.moveTo(px, py);
          for (let st = 0; st < 5; st++) { px += Math.cos(an + (R() - 0.5)) * s.r * 0.26 * sc * Math.min(1, o.crack * 1.5); py += Math.sin(an + (R() - 0.5)) * s.r * 0.26 * sc * Math.min(1, o.crack * 1.5); c.lineTo(px, py); }
          c.stroke();
        }
      }
      c.restore();
      c.beginPath(); s.poly.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](x + p[0] * sc, y + p[1] * sc)); c.closePath();
      const zw = Math.max(1, ((L.cam && L.cam.z) || 1) / 1.6);
      c.strokeStyle = pale; c.lineWidth = 1.6 / zw; c.shadowColor = violet; c.shadowBlur = 14 / zw; c.stroke();
      c.globalCompositeOperation = 'lighter'; c.globalAlpha *= 0.35; c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(x + s.poly[0][0] * sc * 0.8, y + s.poly[0][1] * sc * 0.8); c.lineTo(x + s.poly[2][0] * sc * 0.5, y + s.poly[2][1] * sc * 0.5); c.stroke();
      c.restore();
    };
    const GATHER0 = 13.7, GATHER1 = 14.5;
    L.setup(H, {
      tempo: 1, vignette: 0.62,
      fade: [[0, 1], [1.8, 0, 'sine'], [15.7, 0], [16.4, 1, 'sine']],
      backdrop: (c, L) => {
        const cc = L.D.c;
        // The shards, drifting, until the hand gathers them.
        const J = L.joints('s'), hand = J.rHand;
        for (const s of SH) {
          let x = s.x + Math.sin(cc * 0.5 + s.bob) * 4, y = s.y + Math.cos(cc * 0.6 + s.bob) * 5, sc = 1, a = 1;
          if (cc > GATHER0) {
            const k = L.EASE.in(Math.min(1, (cc - GATHER0) / (GATHER1 - GATHER0)));
            x += (hand.x - x) * k; y += (hand.y - y) * k; sc = 1 - k * 0.92; a = 1 - Math.max(0, k - 0.8) * 5;
            if (a <= 0) continue;
          }
          const inside = cc - s.t0;
          const t = inside >= 0 ? inside : (cc % 2.6);
          const dark = s.scene === 'look' ? Math.max(0, Math.min(1, (cc - (s.t0 + 2.95)) / 0.3)) : 0;
          const crack = s.scene === 'look' ? Math.max(0, Math.min(1, (cc - (s.t0 + 2.75)) / 0.25)) : 0;
          drawShard(c, s, { x, y, sc, a, t: s.scene === 'look' && cc > s.t0 + 3.2 ? 3.2 : t, dark, crack });
        }
        // The crystal the shards crushed into, held a moment in the closing hand.
        if (cc > GATHER1 - 0.1 && cc < 15.6) {
          const k = Math.min(1, (cc - GATHER1 + 0.1) / 0.2), f = Math.max(0, 1 - (cc - 15.1) / 0.5);
          c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = '#ffffff'; c.shadowColor = violet; c.shadowBlur = 20; c.globalAlpha = k * f;
          c.beginPath(); c.moveTo(hand.x, hand.y - 6); c.lineTo(hand.x + 3, hand.y); c.lineTo(hand.x, hand.y + 6); c.lineTo(hand.x - 3, hand.y); c.closePath(); c.fill();
          c.restore();
        }
      },
      actors: {
        k: { beats: [[0, 'stand']], pos: [[0, -400, 0]], hidden: [[0, true]] },
        s: CR.actor({
          beats: [[0, 'crStand'], [13.2, 'crStand'], [13.6, 'crReach', 'io'], [14.45, 'crReach'], [14.7, 'crClose', 'xout'], [15.4, 'crClose'], [16.2, 'crStand', 'io']],
          pos: [[0, CX, 0]], face: [[0, 1], [15.5, -1]], weapon: [[0, false]],
          aura: [[0, 0.12]],
        }),
      },
      cam: [
        [0, 500, 122, 1.5], [2.59, 510, 128, 1.64, 'sine'],
        [2.6, SH[0].x, G - SH[0].y, 3.2, 'hold'], [4.99, SH[0].x + 4, G - SH[0].y + 2, 3.6, 'sine'],
        [5.0, SH[1].x, G - SH[1].y, 3.3, 'hold'], [7.39, SH[1].x - 4, G - SH[1].y, 3.7, 'sine'],
        [7.4, SH[2].x, G - SH[2].y, 3.2, 'hold'], [9.79, SH[2].x, G - SH[2].y + 2, 3.6, 'sine'],
        [9.8, SH[3].x, G - SH[3].y, 3.3, 'hold'], [12.6, SH[3].x - 4, G - SH[3].y + 4, 4.0, 'sine'], [13.2, SH[3].x - 4, G - SH[3].y + 4, 4.0],
        [13.21, 505, 124, 1.56, 'hold'], [14.6, 470, 118, 1.72, 'sine'],
        [14.61, CX + 6, 108, 3.4, 'hold'], [16.4, CX + 2, 106, 3.8, 'sine'],
      ],
      ev: [
        [0.05, L => { L.sfx('stingLow', 0.55, 0.7); }],
        [2.6, L => { L.sfx('phaseUp', 0.3, 0.7); L.sfx('clang', 0.45, 0.75); }],
        [5.0, L => { L.sfx('phaseUp', 0.3, 0.75); L.sfx('parry', 0.45, 0.8); }],
        [7.4, L => { L.sfx('phaseUp', 0.3, 0.8); L.sfx('soulAbsorb', 0.35, 0.9); }],
        [9.8, L => { L.sfx('phaseUp', 0.3, 0.7); }],
        [12.15, L => { L.sfx('stingImpact', 0.7, 0.8); L.sfx('hitZap', 0.4, 0.6); }],
        [12.55, L => { L.sfx('hitSnap', 0.8, 0.7); L.shake(3); }],
        [13.6, L => { L.sfx('swingLight', 0.4, 0.6); }],
        [14.45, L => { L.sfx('heavyHit', 0.6, 0.55); L.sfx('stingLow', 0.5, 0.9); L.shake(5); const h = L.joints('s').rHand; L.ring(h.x, h.y, 50, { col: pale, w: 3, life: 20 }); }],
        [15.5, L => { L.sfx('swingLight', 0.3, 0.5); }],
      ],
      each: (L, c) => { if (c > 15.5) CR.gateGlow = Math.min(1, (c - 15.5) / 0.6); },
      afterGrade: (c2, W, Hh, L) => {
        // Light from the left: the gate opening somewhere behind the Creator as it turns.
        const k = CR.gateGlow || 0; if (k <= 0) return;
        const g = c2.createLinearGradient(0, 0, W * 0.5, 0);
        g.addColorStop(0, 'rgba(230,200,255,' + 0.35 * k + ')'); g.addColorStop(1, 'rgba(230,200,255,0)');
        c2.globalCompositeOperation = 'lighter'; c2.fillStyle = g; c2.fillRect(0, 0, W, Hh); c2.globalCompositeOperation = 'source-over';
      },
    });
  },
  tick: function (H) { FILM.tick(H); },
};
