'use strict';
// smb-stage3d-sets.js: the 3D set for each arena in the ?3d view (smb-stage3d.js draws them).
// Each set follows its arena's 2D HD painting (smb-arena-hd*.js, smb-drawing-arenas*.js): same palette,
// same landmarks, lit from the upper left. Far scenery is painted (flat lit and shadow tones, unlit), near
// scenery is toon-shaded. Nothing here runs unless the page was opened with ?3d.
// Load order: after smb-stage3d.js. Defines no globals.

(function () {
  if (typeof Stage3D === 'undefined' || !Stage3D.wanted) return;
  const def = Stage3D.defineSet;

  // ---------- Shared backdrop pieces. K is the set's kit (THREE, scene, toon, paintedMesh, ...). ----------

  function _tmp(T) { return { M: new T.Matrix4(), q: new T.Quaternion(), v: new T.Vector3(), s: new T.Vector3(), up: new T.Vector3(0, 1, 0) }; }

  // A painted mountain range: jittered cones (or flat-topped mesas), lit faces vs shadow faces, optional snow.
  function range(K, rnd, o) {
    const T = K.T, t = _tmp(T), parts = [];
    for (let i = 0; i < o.n; i++) {
      const g = o.mesa ? new T.CylinderGeometry(0.62, 1, 1, 7, 2) : new T.ConeGeometry(1, 1, 5 + (i % 3), 3);
      const P = g.attributes.position;
      for (let k = 0; k < P.count; k++) {
        const y = P.getY(k);
        if (!o.mesa && y > 0.49) continue;
        const j = (o.mesa ? 0.08 : 0.16) * (0.5 - y);
        P.setXYZ(k, P.getX(k) * (1 + (rnd() - 0.5) * j * 2), y + (o.mesa ? 0 : (rnd() - 0.5) * 0.06), P.getZ(k) * (1 + (rnd() - 0.5) * j * 2));
      }
      const h = o.hMin + rnd() * (o.hMax - o.hMin), r = h * (o.wide || 0.85) * (0.9 + rnd() * 0.5);
      t.M.compose(t.v.set(o.x0 + i * o.step + rnd() * o.step * 0.5, (o.base != null ? o.base : -480) + h / 2 - 40, o.z - rnd() * (o.zJ || 0)),
                  t.q.setFromAxisAngle(t.up, rnd() * 6.28), t.s.set(r, h, r * 0.8));
      parts.push({ geo: g, m: t.M.clone() });
    }
    const C = k => new T.Color(o[k]), lit = C('lit'), shade = C('shade'), foot = C('foot');
    const snow = o.snow ? C('snow') : null, snowSh = o.snow ? C('snowSh') : null, cc = new T.Color();
    const base = o.base != null ? o.base : -480;
    const m = K.paintedMesh(parts, (l, y, ny) => {
      const tt = Math.min(1, Math.max(0, (y - base) / (o.hMax || 1500)));
      if (snow && tt > (o.snowT || 0.62) + (ny < 0.3 ? 0.08 : 0)) return cc.copy(l > 0.05 ? snow : snowSh);
      cc.copy(l > 0.05 ? lit : shade);
      return cc.lerp(foot, Math.max(0, 0.55 - tt) * 1.4);
    }, true);
    m.renderOrder = -0.5;
    K.scene.add(m);
    return m;
  }

  // Cumulus towers: lobes stacked wide to narrow, three flat tones (warm top, cool body, blue-grey belly).
  function towers(K, rnd, o) {
    const T = K.T, t = _tmp(T), lobeG = new T.SphereGeometry(1, 28, 18);
    const top = new T.Color(o.top), body = new T.Color(o.body), belly = new T.Color(o.belly), cc = new T.Color();
    for (const [tx, th, tw] of o.list) {
      const parts = [], tz = (o.z || -8200) - rnd() * 900, base = (o.base != null ? o.base : -200) + rnd() * 200;
      for (let row = 0; row < 6; row++) {
        const u = row / 5, rowW = tw * (1 - u * 0.62), n = 4 - Math.floor(u * 2.5);
        for (let k = 0; k < n; k++) {
          const fx = n === 1 ? 0 : (k / (n - 1) - 0.5), r = (rowW / n) * (0.62 + rnd() * 0.3) + 110;
          t.M.compose(t.v.set(tx + fx * rowW * 0.8 + (rnd() - 0.5) * 180, base + u * th, tz + (rnd() - 0.5) * 300), t.q.identity(), t.s.set(r, r * 0.92, r * 0.8));
          parts.push({ geo: lobeG, m: t.M.clone() });
        }
      }
      K.scene.add(K.paintedMesh(parts, (l, y, ny) => {
        if (ny < -0.45) return cc.copy(belly);
        if (l > 0.42) return cc.copy(top);
        if (l > -0.1) return cc.copy(body);
        return cc.copy(belly).lerp(body, 0.35);
      }, false));
    }
  }

  // Rolling toon hills.
  function hills(K, rnd, o) {
    const T = K.T, dome = new T.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat = K.toon(o.color);
    for (let i = 0; i < o.n; i++) {
      const m = new T.Mesh(dome, mat), r = o.r + rnd() * o.r * 0.8;
      m.scale.set(r * 1.7, o.h + rnd() * o.h, r);
      m.position.set(o.x0 + i * o.step + rnd() * 200, (o.base != null ? o.base : -481), o.z - rnd() * (o.zJ || 500));
      m.receiveShadow = true;
      K.scene.add(m);
    }
  }

  // Trees in bands of depth. shape: round (cel crowns), pine (stacked cones), dead (bare branches), tall (trunks into the canopy).
  function trees(K, rnd, o) {
    const T = K.T, base = o.base != null ? o.base : -480;
    const trunkG = new T.CylinderGeometry(o.shape === 'tall' ? 0.7 : 0.62, 1, 1, 7), trunkM = K.toon(o.trunk);
    const sphere = new T.SphereGeometry(1, 14, 10), cone = new T.ConeGeometry(1, 1, 8);
    const crowns = (o.crowns || []).map(c => K.toon(c)), snowM = o.snow ? K.toon(o.snow) : null;
    const add = (m, cast) => { m.castShadow = cast !== false; m.receiveShadow = true; K.scene.add(m); };
    for (const row of o.rows) {
      for (let i = 0; i < row.n; i++) {
        const x = row.x0 + i * row.step + rnd() * row.step * 0.5, z = row.z - rnd() * (row.zJ || 200), s = row.s + rnd() * (row.sJ || 0.5);
        if (row.z > -700) K.contact(x, base, z, (o.shape === 'tall' ? 26 : o.shape === 'dead' ? 14 : 30) * s, (o.shape === 'tall' ? 22 : 18) * s, 0.4);   // near rows only
        if (o.shape === 'tall') {
          const h = 1400, w = 14 * s;
          const tr = new T.Mesh(trunkG, trunkM); tr.scale.set(w, h, w); tr.position.set(x, base + h / 2, z); add(tr);
          const c = new T.Mesh(sphere, crowns[i % crowns.length]); c.scale.set(140 * s, 90 * s, 120 * s);
          c.position.set(x + (rnd() - 0.5) * 60, base + 640 + rnd() * 300, z); add(c, false);
          continue;
        }
        const h = (o.shape === 'pine' ? 30 : 70) * s;
        const tr = new T.Mesh(trunkG, trunkM); tr.scale.set(6 * s, h, 6 * s); tr.position.set(x, base + h / 2, z); add(tr);
        if (o.shape === 'round') {
          const nC = 2 + Math.floor(rnd() * 2);
          for (let k = 0; k < nC; k++) {
            const c = new T.Mesh(sphere, crowns[(k + Math.floor(rnd() * 3)) % crowns.length]), cr = (34 + rnd() * 16) * s;
            c.scale.set(cr * 1.1, cr, cr * 1.1);
            c.position.set(x + (rnd() - 0.5) * 30 * s, base + h + cr * 0.55 + k * 16 * s, z + (rnd() - 0.5) * 20 * s);
            add(c);
          }
        } else if (o.shape === 'pine') {
          for (let k = 0; k < 3; k++) {
            const c = new T.Mesh(cone, k === 2 && snowM ? snowM : crowns[k % crowns.length]), cw = (44 - k * 11) * s, ch = (52 - k * 8) * s;
            c.scale.set(cw, ch, cw); c.position.set(x, base + h + k * 30 * s + ch / 2, z); add(c);
          }
        } else if (o.shape === 'dead') {
          // Bare crooked branches: a few thin cylinders leaning out from the trunk top.
          for (let k = 0; k < 4; k++) {
            const b = new T.Mesh(trunkG, trunkM), bl = (30 + rnd() * 30) * s, a = (k % 2 ? 1 : -1) * (0.5 + rnd() * 0.6);
            b.scale.set(2.2 * s, bl, 2.2 * s); b.rotation.z = a;
            b.position.set(x - Math.sin(a) * bl / 2, base + h * (0.7 + k * 0.1) + Math.cos(a) * bl / 2, z); add(b);
          }
        }
      }
    }
  }

  // City blocks: boxes with a lit-window map (emissive) and optional neon strips down the faces.
  function buildings(K, rnd, o) {
    const T = K.T, base = o.base != null ? o.base : -480, box = new T.BoxGeometry(1, 1, 1);
    const winTex = [0, 1, 2].map(v => {
      const tx = K.canvasTex(64, 128, (g, w, h) => {
        const r = (function (s) { return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })(v * 99 + 3);
        g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
        const cols = o.win || ['#ffd27a'];
        if (o.style === 'bands') {
          // Office floors: whole lit strips with dark mullions, one hue per strip.
          for (let y = 6; y < h - 6; y += 14) {
            if (r() > (o.winP || 0.35) * 2.2) continue;
            g.fillStyle = cols[Math.floor(r() * cols.length)];
            const x0 = 3 + Math.floor(r() * 10), x1 = w - 3 - Math.floor(r() * 14);
            for (let x = x0; x < x1; x += 9) g.fillRect(x, y, 7, 5);
          }
        } else {
          for (let y = 4; y < h - 4; y += 10) for (let x = 4; x < w - 4; x += 10) {
            if (r() < (o.winP || 0.35)) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, y, 5, 6); }
          }
        }
      });
      tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.magFilter = T.NearestFilter;
      return tx;
    });
    const neonM = (o.neon || []).map(c => K.basic(c, { fog: false }));
    for (const row of o.rows) {
      for (let i = 0; i < row.n; i++) {
        const w = row.wMin + rnd() * (row.wMax - row.wMin), h = row.hMin + rnd() * (row.hMax - row.hMin), d = w * (0.6 + rnd() * 0.5);
        const tex = winTex[i % 3].clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(1, Math.round(w / 110)), Math.max(1, Math.round(h / 220)));
        const mat = new T.MeshToonMaterial({ color: o.colors[i % o.colors.length], emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: row.glow || 1 });
        const m = new T.Mesh(box, mat), x = row.x0 + i * row.step + rnd() * row.step * 0.4, z = row.z - rnd() * (row.zJ || 300);
        m.scale.set(w, h, d); m.position.set(x, base + h / 2 - 2, z);
        m.receiveShadow = true;
        K.scene.add(m);
        if (neonM.length && rnd() < (o.neonP || 0.4)) {
          const s = new T.Mesh(box, neonM[Math.floor(rnd() * neonM.length)]), sh = h * (0.25 + rnd() * 0.4);
          const vert = rnd() < 0.6;
          if (vert) s.scale.set(6, sh, 3); else s.scale.set(w * 0.6, 14, 3);
          s.position.set(x + (rnd() - 0.5) * w * 0.6, base + h * (0.35 + rnd() * 0.45), z + d / 2 + 2);
          K.scene.add(s);
        }
      }
    }
  }

  // Stars on the upper sky, unlit and unfogged.
  function stars(K, rnd, o) {
    const T = K.T, pos = [], col = [], c = new T.Color();
    for (let i = 0; i < o.n; i++) {
      const a = rnd() * Math.PI * 2, e = (o.minEl || 0.05) + rnd() * (Math.PI / 2 - (o.minEl || 0.05)), R = 11000;
      pos.push(450 + Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R - 480, Math.sin(a) * Math.cos(e) * R - 2000);
      c.set(o.colors ? o.colors[i % o.colors.length] : '#ffffff'); col.push(c.r, c.g, c.b);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    const p = new T.Points(g, new T.PointsMaterial({ size: o.size || 2, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false }));
    p.renderOrder = -0.95; p.frustumCulled = false;
    K.scene.add(p);
    return p;
  }

  // Glowing crystals: stretched octahedra, unlit body tone with a lighter tip.
  function crystals(K, rnd, o) {
    const T = K.T, g = new T.OctahedronGeometry(1, 0), mats = o.colors.map(c => new T.MeshToonMaterial({ color: c, emissive: c, emissiveIntensity: o.glow != null ? o.glow : 0.6 }));
    const out = [];
    for (let i = 0; i < o.n; i++) {
      const m = new T.Mesh(g, mats[i % mats.length]), h = o.hMin + rnd() * (o.hMax - o.hMin);
      m.scale.set(h * 0.22, h, h * 0.22);
      m.rotation.set((rnd() - 0.5) * 0.5, rnd() * 3, (rnd() - 0.5) * 0.6);
      m.position.set(o.x0 + rnd() * (o.x1 - o.x0), (o.y != null ? o.y : -480) + (o.hang ? -h * 0.6 : h * 0.4), o.z0 + rnd() * (o.z1 - o.z0));
      if (o.hang) m.rotation.x += Math.PI;
      K.scene.add(m); out.push(m);
    }
    return out;
  }

  // Piers: raised platforms stand on supports down to the surface under them (a lower slab, the floor, or
  // o.toY over lava), set at the back of the slab so they never sit on the play line. Turns floating set
  // pieces into one built space. Returns a platDress. Styles: column, girder, stalk, prism, post, block.
  function piers(o) {
    let G = null, M = null;
    return function (g, pl, d, K) {
      const T = K.T, P = (currentArena && currentArena.platforms) || [];
      if (!G) G = { cyl: new T.CylinderGeometry(1, 1.08, 1, 12), hex: new T.CylinderGeometry(1, 1, 1, 6), box: new T.BoxGeometry(1, 1, 1), stalk: new T.CylinderGeometry(0.75, 1, 1, 10) };
      if (!M) M = { s: K.toon(o.color), c: K.toon(o.cap || o.color), glow: o.glow ? K.basic(o.glow, { fog: false }) : null };
      const r = o.r || 11, z = -d / 2 + (o.inset || 16), parts = [];
      const xs = pl.w > 200 ? [pl.w * 0.24, pl.w * 0.76] : [pl.w / 2];      // one pier under a narrow slab: two at the ends read as table legs
      const add = (geo, mat, sx, sy, sz, x, y, zz, rz) => { const m = new T.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, zz); if (rz) m.rotation.z = rz; m.castShadow = true; parts.push(m); return m; };
      const hs = [];
      for (const lx of xs) {
        const wx = pl.x + lx;
        let below = null;
        for (const q of P) if (q !== pl && !q.isFloorDisabled && !q.noDraw && q.y > pl.y && wx >= q.x && wx <= q.x + q.w && (!below || q.y < below.y)) below = q;
        const h = below ? below.y - pl.y : o.toY != null ? o.toY - pl.y + 8 : 0;
        if (h <= 20) continue;                                   // over a pit: no pier
        hs.push([lx, h]);
        switch (o.style) {
          case 'girder':                                         // steel I-beam: two flanges and a web
            add(G.box, M.s, r * 1.8, h, 3, lx, -h / 2, z + r * 0.7); add(G.box, M.s, r * 1.8, h, 3, lx, -h / 2, z - r * 0.7);
            add(G.box, M.c, 4, h, r * 1.4, lx, -h / 2, z);
            if (M.glow) add(G.box, M.glow, 2, h - 20, 1, lx, -h / 2, z + r * 0.7 + 2);
            add(G.box, M.c, r * 2.6, 8, r * 2.2, lx, -h + 4, z);
            break;
          case 'stalk': {                                        // a mushroom stem, flared at the foot, gills under the slab
            const m = add(G.stalk, M.s, r, h, r, lx, -h / 2, z); m.rotation.z = (lx % 7 - 3) * 0.01;
            add(G.cyl, M.c, r * 2.4, 6, r * 2.4, lx, -h + 3, z);
            add(G.cyl, M.c, r * 1.9, 5, r * 1.9, lx, -16, z);
            break;
          }
          case 'prism':                                          // hexagonal pillar (ice, basalt)
            add(G.hex, M.s, r, h, r, lx, -h / 2, z);
            add(G.hex, M.c, r * 1.3, 10, r * 1.3, lx, -15, z);
            if (M.glow) add(G.box, M.glow, 2, h * 0.7, 1, lx + r * 0.3, -h * 0.55, z + r * 0.9);
            break;
          case 'post':                                           // timber post with a knee brace up into the slab
            add(G.box, M.s, r * 1.4, h, r * 1.4, lx, -h / 2, z);
            add(G.box, M.c, 5, 44, 5, lx + (lx < pl.w / 2 ? 18 : -18), -34, z, lx < pl.w / 2 ? -0.78 : 0.78);
            break;
          case 'block':                                          // square dressed-stone pillar
            add(G.box, M.s, r * 2, h, r * 2, lx, -h / 2, z);
            add(G.box, M.c, r * 2.8, 9, r * 2.8, lx, -20, z);
            add(G.box, M.c, r * 2.8, 10, r * 2.8, lx, -h + 5, z);
            break;
          default:                                               // column: shaft, capital under the slab, base
            add(G.cyl, M.s, r, h, r, lx, -h / 2, z);
            add(G.box, M.c, r * 3, 9, r * 3, lx, -20, z);
            add(G.box, M.c, r * 2.8, 10, r * 2.8, lx, -h + 5, z);
        }
        if (o.contact !== false && below) { const c = K.contactMesh(r * 2.4, r * 2, 0.45); c.position.set(lx, -h + 0.6, z); g.add(c); }
      }
      // Two piers on one slab are tied by a brace at the back (girder X, or a stone tie beam).
      if (hs.length === 2 && o.brace) {
        const [a, b] = hs, h = Math.min(a[1], b[1]), w = b[0] - a[0];
        if (o.style === 'girder') {
          const L = Math.hypot(w, h * 0.6), ang = Math.atan2(h * 0.6, w);
          add(G.box, M.c, L, 4, 3, (a[0] + b[0]) / 2, -h * 0.4, z - r * 0.9, ang);
          add(G.box, M.c, L, 4, 3, (a[0] + b[0]) / 2, -h * 0.4, z - r * 0.9, -ang);
        } else add(G.box, M.c, w, 12, r * 1.6, (a[0] + b[0]) / 2, -Math.min(h * 0.55, 90), z);
      }
      // Under the slab a pier would go near-black and read like a fighter's body: no shadow received.
      for (const m of parts) g.add(m);
    };
  }

  // Columns with a base and capital; some broken short.
  function columns(K, rnd, o) {
    const T = K.T, base = o.base != null ? o.base : -480, shaft = new T.CylinderGeometry(1, 1.08, 1, 12), cap = new T.BoxGeometry(1, 1, 1);
    const m1 = K.toon(o.color), m2 = K.toon(o.capColor || o.color), out = [];
    for (const row of o.rows) {
      for (let i = 0; i < row.n; i++) {
        const x = row.x0 + i * row.step, z = row.z - rnd() * (row.zJ || 0), r = row.r || 16;
        const broken = rnd() < (o.broken || 0), h = broken ? row.h * (0.3 + rnd() * 0.4) : row.h;
        const s = new T.Mesh(shaft, m1); s.scale.set(r, h, r); s.position.set(x, base + h / 2, z);
        const b = new T.Mesh(cap, m2); b.scale.set(r * 2.6, 12, r * 2.6); b.position.set(x, base + 6, z);
        s.castShadow = s.receiveShadow = b.receiveShadow = true;
        K.scene.add(s, b);
        if (o.contact) K.contact(x, base, z, r * 2.3, r * 2.3, 0.5);
        if (!broken) {
          const c = new T.Mesh(cap, m2); c.scale.set(r * 2.8, 14, r * 2.8); c.position.set(x, base + h, z); c.receiveShadow = true; K.scene.add(c); out.push(c);
          if (o.neck) { const n = new T.Mesh(shaft, m2); n.scale.set(r * 1.25, 8, r * 1.25); n.position.set(x, base + h - 14, z); n.receiveShadow = true; K.scene.add(n); }
        } else if (o.neck) {
          // A broken top: a tilted chunk of shaft, so the break reads as stone, not a capped pipe.
          const k = new T.Mesh(shaft, m1); k.scale.set(r * 0.9, r * 0.9, r * 0.9); k.position.set(x + r * 0.2, base + h + r * 0.2, z); k.rotation.set(0.5, 0, 0.6); K.scene.add(k);
        }
        if (row.lintel && i < row.n - 1 && !broken) {
          const l = new T.Mesh(cap, m2); l.scale.set(row.step, 22, r * 2.2); l.position.set(x + row.step / 2, base + h + 18, z); l.receiveShadow = true; K.scene.add(l);
        }
      }
    }
    return out;
  }

  // Additive light shafts: soft vertical gradient planes, angled from the upper left.
  function shafts(K, rnd, o) {
    const T = K.T, tex = K.canvasTex(64, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, o.color + '0.55)'); gr.addColorStop(1, o.color + '0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const sx = g.createLinearGradient(0, 0, w, 0); sx.addColorStop(0, 'rgba(0,0,0,1)'); sx.addColorStop(0.5, 'rgba(0,0,0,0)'); sx.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = sx; g.fillRect(0, 0, w, h);
    });
    const mat = new T.MeshBasicMaterial({ map: tex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide, opacity: o.opacity || 0.5 });
    const out = [];
    for (let i = 0; i < o.n; i++) {
      const m = new T.Mesh(new T.PlaneGeometry(1, 1), mat), w = o.w + rnd() * o.w;
      m.scale.set(w, o.h, 1);
      m.position.set(o.x0 + rnd() * (o.x1 - o.x0), o.top - o.h / 2, o.z0 + rnd() * (o.z1 - o.z0));
      m.rotation.z = o.tilt != null ? o.tilt : -0.25;
      m.renderOrder = 5;
      K.scene.add(m); out.push(m);
    }
    return out;
  }

  // Liquid-free floating debris: rocks or shards drifting slowly (update() turns them).
  function floaters(K, rnd, o) {
    const T = K.T, out = [], geo = o.geo === 'shard' ? new T.PlaneGeometry(1, 1.4) : o.geo === 'puff' ? new T.SphereGeometry(1, 16, 10) : new T.DodecahedronGeometry(1, 0);
    const mats = o.colors.map(c => o.geo === 'shard'
      ? new T.MeshBasicMaterial({ color: c, transparent: true, opacity: o.opacity || 0.3, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending })
      : K.toon(c));
    for (let i = 0; i < o.n; i++) {
      const m = new T.Mesh(geo, mats[i % mats.length]), s = o.sMin + rnd() * (o.sMax - o.sMin);
      m.scale.set(s, s * (0.6 + rnd() * 0.6), s);
      m.position.set(o.x0 + rnd() * (o.x1 - o.x0), o.y0 + rnd() * (o.y1 - o.y0), o.z0 + rnd() * (o.z1 - o.z0));
      m.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
      m.userData.spin = (rnd() - 0.5) * 0.006; m.userData.y = m.position.y; m.userData.ph = rnd() * 6;
      K.scene.add(m); out.push(m);
    }
    return out;
  }
  function drift(list, f, amp) {
    for (const m of list) { m.rotation.y += m.userData.spin; m.rotation.x += m.userData.spin * 0.6; m.position.y = m.userData.y + Math.sin(f * 0.01 + m.userData.ph) * (amp || 8); }
  }

  // A soft glow sprite (additive), for craters, lamps and windows.
  function glow(K, x, y, z, size, color) {
    const T = K.T, tex = K.canvasTex(128, 128, (g) => {
      const r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, color + '0.9)'); r.addColorStop(1, color + '0)');
      g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    });
    const s = new T.Sprite(new T.SpriteMaterial({ map: tex, blending: T.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    s.scale.set(size, size, 1); s.position.set(x, y, z);
    K.scene.add(s);
    return s;
  }

  // A wide back wall (cave rock, sewer brick, colosseum stands): one plane with a painted texture.
  function wall(K, o) {
    const T = K.T, tex = K.canvasTex(o.tw || 256, o.th || 256, o.paint);
    tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(o.rx || 8, o.ry || 4);
    const m = new T.Mesh(new T.PlaneGeometry(o.w, o.h), new T.MeshToonMaterial({ color: 0xffffff, map: tex }));
    m.position.set(o.x || 450, o.y, o.z); m.receiveShadow = true;
    K.scene.add(m);
    return m;
  }

  // ---------- The arenas ----------

  // Grass: floating earth islands over a meadow, snow-capped blue range, cumulus towers, sun with rays.
  def('grass', (T, K) => ({
    sky: [[0, '#1d63c4'], [0.42, '#3f97e4'], [0.78, '#86c8f2'], [1, '#d6f0fb']],
    fog: '#cfeaf8',
    sun: { dir: [-0.42, 0.58, -1], rays: true },
    ground: { top: '#7cbf62', backTop: '#86c06c', face: ['#8f6038', '#7a5030', '#9c6a3e', '#4a2f1b'], deep: '#7a5232' },
    plat: { kind: 'island', top: '#5aae4e', lip: '#3a7030', body: '#9a6a3e', under: '#7a5232' },
    blades: ['#3f8a36', '#7fcf5a', '#5cae45', '#4f9a3e'],
    dress(scene, K, rnd) {
      range(K, rnd, { n: 16, x0: -6200, step: 820, z: -6400, zJ: 1400, hMin: 900, hMax: 1800, lit: '#86a9d8', shade: '#5f86bd', foot: '#b6d6ee', snow: '#f7fbff', snowSh: '#c6d8f0' });
      hills(K, rnd, { n: 7, x0: -1300, step: 520, z: -1500, r: 380, h: 120, color: '#86c06c' });
      trees(K, rnd, { shape: 'round', trunk: '#5a3a22', crowns: ['#3f9a3c', '#52ad46', '#2f8034'],
        rows: [{ n: 22, x0: -900, step: 125, z: -820, zJ: 260, s: 1.1 }, { n: 18, x0: -1300, step: 190, z: -1250, zJ: 350, s: 1.5, sJ: 0.6 }] });
      towers(K, rnd, { top: '#fffaf0', body: '#eaf1fb', belly: '#a9bfdf', list: [[-5200, 1500, 1700], [-2600, 1900, 2000], [200, 1400, 1500], [2900, 1800, 1900], [5600, 1500, 1600], [-7600, 1300, 1500]] });
    },
  }));

  // City: night skyline with lit windows, a pale moon, concrete street, steel ledges.
  def('city', (T, K) => ({
    sky: [[0, '#070a1e'], [0.5, '#1a1d44'], [0.85, '#3a2f62'], [1, '#5a4478']],
    fog: '#2a2448',
    light: { sky: '#7a88d0', ground: '#2a2440', hemi: 1.1, key: '#c8d4ff', keyI: 1.2 },
    sun: { dir: [-0.5, 0.5, -1], color: '#f4f1e0', size: 330, glow: 'rgba(200,215,255,' },
    ground: { top: '#3c3f4e', backTop: '#33364a', face: ['#4a4d5a', '#3a3d48', '#55586a', '#22242c'], deep: '#2a2c38' , trim: { color: '#4a4e60', steps: [[0, 10, 8], [10, 40, 3]] } },
    plat: { kind: 'block', top: '#5b6075', lip: '#9aa0b8', body: '#2e3242', depth: [50, 80], topH: 5 },
    platDress: piers({ style: 'girder', color: '#5a6280', cap: '#6a7290', r: 10, brace: true }),
    dress(scene, K, rnd) {
      stars(K, rnd, { n: 260, size: 1.6, minEl: 0.25 });
      buildings(K, rnd, { colors: ['#1c1f33', '#24283e', '#181a2a'], win: ['#ffd27a', '#ffe9b0', '#ffc860'], winP: 0.24, neon: ['#b46cff', '#ff6ab0'], neonP: 0.25,
        rows: [{ n: 16, x0: -1100, step: 190, z: -1250, zJ: 250, wMin: 110, wMax: 180, hMin: 260, hMax: 640 },
               { n: 22, x0: -2400, step: 250, z: -2100, zJ: 400, wMin: 160, wMax: 260, hMin: 500, hMax: 1200, glow: 0.8 },
               { n: 20, x0: -4200, step: 450, z: -3200, zJ: 600, wMin: 260, wMax: 420, hMin: 700, hMax: 1700, glow: 0.6 }] });
      // Street edge: a parapet wall with a rail behind the fight and lamp posts on it, joining the street to the towers.
      const pm = K.toon('#3c4054'), rm = K.toon('#6a7088'), lampM = K.basic('#ffe0a0', { fog: false });
      box(K, pm, 450, -438, -230, 1500, 46, 24);
      box(K, rm, 450, -438 + 46, -230, 1500, 6, 30);
      for (let x = -240; x <= 1140; x += 230) {
        box(K, rm, x, -438 + 52, -230, 6, 150, 6, true);
        box(K, rm, x + 14, -438 + 198, -230, 34, 4, 4);
        box(K, lampM, x + 28, -438 + 190, -230, 14, 6, 10);
        glow(K, x + 28, -438 + 186, -226, 46, 'rgba(255,220,150,');
        K.contact(x, -438, -214, 30, 14, 0.4);
      }
    },
  }));

  // Space: asteroid floor in open space, stars, a galaxy smear and a ringed planet, drifting rocks.
  let _spaceRocks = null;
  def('space', (T, K) => ({
    sky: [[0, '#000006'], [0.6, '#03031a'], [1, '#0a0a34']],
    fog: '#06061e', fogSpan: 9000,
    light: { sky: '#8a90ff', ground: '#201838', hemi: 0.8, key: '#e8ecff', keyI: 1.6 },
    ground: { top: '#2c2a4c', face: ['#2a2848', '#201e3a', '#34325a', '#12102a'], deep: '#1a1830', back: false,
      tile: { size: 120, paint: (g, w, h) => { const r = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(12); for (let i = 0; i < 14; i++) { g.fillStyle = r() < 0.5 ? '#232140' : '#363460'; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 16, 4 + r() * 10, r() * 3, 0, 7); g.fill(); } } } },
    plat: { kind: 'island', top: '#5a5a8a', lip: '#8a8ac0', body: '#3a3a6a', under: '#2a2a4a', depth: [50, 90] },
    dress(scene, K, rnd) {
      stars(K, rnd, { n: 900, size: 1.8, minEl: -0.3, colors: ['#ffffff', '#cfd8ff', '#ffe8d0', '#bfc8ff'] });
      const gal = K.canvasTex(256, 256, (g) => {
        g.translate(128, 128); g.rotate(-0.5); g.scale(1, 0.38);
        const r = g.createRadialGradient(0, 0, 4, 0, 0, 128); r.addColorStop(0, 'rgba(255,240,255,0.9)'); r.addColorStop(0.3, 'rgba(170,140,255,0.45)'); r.addColorStop(1, 'rgba(60,40,160,0)');
        g.fillStyle = r; g.beginPath(); g.arc(0, 0, 128, 0, 7); g.fill();
      });
      const gs = new T.Sprite(new T.SpriteMaterial({ map: gal, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      gs.scale.set(2600, 2600, 1); gs.position.set(-1800, 1600, -9000); scene.add(gs);
      const planet = new T.Mesh(new T.SphereGeometry(900, 40, 24), K.toon('#8a5ab8'));
      planet.position.set(3200, 1900, -8000); scene.add(planet);
      const ring = new T.Mesh(new T.RingGeometry(1150, 1600, 64), new T.MeshBasicMaterial({ color: '#c8a8f0', side: T.DoubleSide, transparent: true, opacity: 0.55, fog: false }));
      ring.position.copy(planet.position); ring.rotation.set(1.2, 0.3, 0.2); scene.add(ring);
      _spaceRocks = floaters(K, rnd, { n: 30, colors: ['#4a4870', '#5a5880', '#3a3858'], sMin: 12, sMax: 60, x0: -1600, x1: 2600, y0: -300, y1: 700, z0: -2400, z1: -600 });
    },
    update(f) { if (_spaceRocks) drift(_spaceRocks, f, 10); },
  }));

  // Lava: night red sky over a lava sea, black cones glowing at the foot, basalt islands with molten lips.
  def('lava', (T, K) => ({
    sky: [[0, '#140000'], [0.55, '#3d0800'], [0.85, '#7a1a04'], [1, '#c2420c']],
    fog: '#5a1205',
    light: { sky: '#ff8050', ground: '#ff4a00', hemi: 1.0, key: '#ffb070', keyI: 1.5 },
    plat: { kind: 'island', top: '#6b2b0a', lip: '#ff7a2a', body: '#4a1a08', under: '#2a0c04', glow: '#ff9a3a' },
    liquid: { y: 490, kind: 'lava', color: '#c2340a', veins: ['rgba(255,170,60,0.55)', 'rgba(110,16,0,0.5)'], cracks: 'rgba(255,214,110,0.85)', flowX: 0.0006, flowZ: 0.0003 },
    dress(scene, K, rnd) {
      range(K, rnd, { n: 14, x0: -5200, step: 820, z: -4200, zJ: 1600, hMin: 700, hMax: 1500, wide: 1.1, base: -490, lit: '#4a160c', shade: '#2a0a06', foot: '#ff5a10' });
      for (let i = 0; i < 6; i++) glow(K, -3000 + i * 1300 + rnd() * 400, -300 + rnd() * 500, -4000 - rnd() * 1200, 900, 'rgba(255,110,30,');
    },
  }));

  // Volcano: violet night, one erupting cone dead centre, basalt ledges with orange seams, lava lake.
  let _volGlow = null;
  def('volcano', (T, K) => ({
    sky: [[0, '#0a0412'], [0.5, '#22082e'], [0.85, '#3a0f2e'], [1, '#7a2234']],
    fog: '#3a1030',
    light: { sky: '#a070d0', ground: '#ff5a20', hemi: 1.0, key: '#ffd0a0', keyI: 1.4 },
    plat: { kind: 'block', top: '#3c2a3a', lip: '#5c3f52', body: '#2a1c2a', glow: '#ff7a2a', depth: [50, 90] },
    platDress: piers({ style: 'prism', color: '#5a4050', cap: '#6a4c5e', glow: '#ff7a2a', r: 15, toY: 490 }),
    liquid: { y: 490, kind: 'lava', color: '#2a0e18', veins: ['rgba(90,30,40,0.6)', 'rgba(16,4,10,0.6)'], cracks: 'rgba(255,110,30,0.95)', flowX: 0.0002, flowZ: 0.0001 },
    dress(scene, K, rnd) {
      stars(K, rnd, { n: 300, size: 1.5, minEl: 0.3, colors: ['#ffffff', '#ffd8f0'] });
      range(K, rnd, { n: 12, x0: -5000, step: 900, z: -5200, zJ: 1200, hMin: 600, hMax: 1300, wide: 1.2, base: -490, lit: '#3a2238', shade: '#22122a', foot: '#c2401a' });
      const big = K.paintedMesh([{ geo: new T.CylinderGeometry(160, 1300, 1700, 9, 3), m: new T.Matrix4().makeTranslation(450, -490 + 850, -3400) }],
        (l, y) => new T.Color(y > 1000 ? (l > 0 ? '#5a2a3a' : '#3a1a2a') : l > 0 ? '#3c2232' : '#24121e').lerp(new T.Color('#ff6a1a'), Math.max(0, 0.25 - (y + 490) / 4000)), true);
      scene.add(big);
      _volGlow = glow(K, 450, 1150, -3380, 1300, 'rgba(255,120,40,');
      glow(K, 450, 1700, -3420, 900, 'rgba(255,200,120,');
    },
    update(f) { if (_volGlow) { const s = 1300 + Math.sin(f * 0.05) * 120; _volGlow.scale.set(s, s, 1); } },
  }));

  // Forest: deep green under a canopy, tall trunks into the leaves, light shafts, mossy islands.
  def('forest', (T, K) => ({
    sky: [[0, '#0e2a14'], [0.5, '#1a4020'], [1, '#3d7a46']],
    fog: '#2d6b3a',
    light: { sky: '#b0f0a0', ground: '#2a4a20', hemi: 1.3, key: '#fff0c0', keyI: 1.6 },
    ground: { top: '#3f8a2a', backTop: '#3a7a28', face: ['#5a3a22', '#4a2e1a', '#6a4428', '#2a1a10'], deep: '#3a2616' },
    plat: { kind: 'island', top: '#4a8a38', lip: '#2a5a18', body: '#5a3a22', under: '#3a2616' },
    blades: ['#2f6a22', '#4f9a3a', '#3a7a2a', '#5aaa44'], floorBlades: 1400,
    dress(scene, K, rnd) {
      trees(K, rnd, { shape: 'tall', trunk: '#3a2818', crowns: ['#1f5a22', '#2a6a2a', '#184a1c'],
        rows: [{ n: 9, x0: -700, step: 260, z: -380, zJ: 150, s: 1.6, sJ: 0.6 }, { n: 14, x0: -1500, step: 300, z: -900, zJ: 300, s: 2.2, sJ: 0.8 }, { n: 16, x0: -2600, step: 400, z: -1900, zJ: 500, s: 3, sJ: 1 }] });
      shafts(K, rnd, { n: 7, color: 'rgba(230,255,190,', x0: -400, x1: 1300, top: 700, h: 1500, w: 70, z0: -700, z1: -150, opacity: 0.45 });
    },
  }));

  // Ice: pale sky, snowy range and pines, glacier floor, ice shelves with icicles.
  def('ice', (T, K) => ({
    sky: [[0, '#6aa8d8'], [0.5, '#99c8e8'], [1, '#e8f6fc']],
    fog: '#d8ecf6',
    light: { sky: '#e8f4ff', ground: '#a8c8e0', hemi: 1.5, key: '#ffffff', keyI: 1.6 },
    sun: { dir: [-0.45, 0.5, -1], color: '#fffdf4', size: 420, glow: 'rgba(255,255,240,' },
    ground: { top: '#eef6fb', backTop: '#e4f0f8', face: ['#b8d8ee', '#9cc4e0', '#cfe6f4', '#7aa8c8'], deep: '#9cc4e0' },
    plat: { kind: 'block', top: '#f4fbff', lip: '#cfe6f4', body: '#8ec0de', drips: '#dff2ff', depth: [60, 100] },
    platDress: piers({ style: 'prism', color: '#a8d4ee', cap: '#d8eefa', r: 16 }),
    dress(scene, K, rnd) {
      range(K, rnd, { n: 16, x0: -6200, step: 820, z: -6000, zJ: 1400, hMin: 900, hMax: 1800, lit: '#b8d0e8', shade: '#86a6c8', foot: '#dcebf6', snow: '#ffffff', snowSh: '#d0e0f0', snowT: 0.45 });
      trees(K, rnd, { shape: 'pine', trunk: '#4a3a30', crowns: ['#2f5a4a', '#3a6a58'], snow: '#f4fbff',
        rows: [{ n: 20, x0: -1000, step: 140, z: -800, zJ: 300, s: 1.1 }, { n: 22, x0: -1800, step: 200, z: -1500, zJ: 400, s: 1.6 }] });
    },
  }));

  // Ruins: dusk-brown hall of broken columns and lintels, pale sandstone floors over open pits.
  def('ruins', (T, K) => ({
    sky: [[0, '#140a04'], [0.5, '#1f1008'], [1, '#4a3020']],
    fog: '#6a4a34', fogSpan: 1700,                       // dusty haze: far rows step back toward one warm value
    light: { sky: '#c0c8e4', ground: '#5a4a3a', hemi: 1.2, key: '#ffe6c0', keyI: 2.1 },
    blades: ['#4a6a2a', '#5a7a30', '#3a5a22'], floorBlades: 700,
    ground: { top: '#b8a47c', backTop: '#7a6445', face: ['#8a7455', '#6a5440', '#9a8460', '#3a2a1c'], deep: '#5a4432',
      tile: { size: 70, paint: (g, w, h) => { g.strokeStyle = '#8a7656'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h / 2 - 2); g.strokeRect(-w / 2, h / 2, w, h / 2 - 2); g.strokeRect(w / 2, h / 2, w, h / 2 - 2); g.strokeStyle = 'rgba(70,50,30,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(30, 20); g.lineTo(52, 44); g.lineTo(48, 60); g.stroke(); } } },
    plat: { kind: 'block', top: '#c8b48c', lip: '#e0d0a8', body: '#8a7455', under: '#4a3a2a', depth: [80, 120] },
    platDress: piers({ style: 'column', color: '#c4baa6', cap: '#d0c6b2', r: 13 }),
    dress(scene, K, rnd) {
      const T = K.T, BASE = -440;                              // the floor slabs' top: columns stand on it, not in it
      columns(K, rnd, { color: '#b4aca0', capColor: '#ccc4b4', broken: 0.35, neck: true, contact: true, base: BASE,
        rows: [{ n: 4, x0: 40, step: 270, z: -170, h: 300, r: 20 }, { n: 8, x0: -300, step: 210, z: -420, h: 520, r: 26, lintel: true }, { n: 10, x0: -900, step: 300, z: -1000, h: 760, r: 38, lintel: true }, { n: 9, x0: -1800, step: 520, z: -2000, h: 1100, r: 56, lintel: true }] });
      // The hall's back wall behind the second colonnade: plinth, ashlar courses, a broken cornice line.
      const wallM = K.toon('#8c7f6c'), trimM = K.toon('#a89a84');
      box(K, trimM, 450, BASE, -1240, 5200, 40, 70);
      for (let x = -2100; x < 3000; x += 160) {
        const h = 380 + (rnd() < 0.3 ? -rnd() * 220 : rnd() * 40);
        box(K, wallM, x + 80, BASE + 40, -1250, 162, h, 50);
        if (h > 360) box(K, trimM, x + 80, BASE + 40 + h, -1240, 170, 18, 70);
      }
      // Foundation: two stepped courses along the front of each floor slab (stylobate).
      const stepM = K.toon('#9a8866');
      for (const fx of [0, 320, 640]) {
        box(K, stepM, fx + 130, BASE - 26, 160, 270, 18, 22, true);
        box(K, stepM, fx + 130, BASE - 62, 172, 280, 28, 46, true);
      }
      shafts(K, rnd, { n: 4, color: 'rgba(255,220,160,', x0: 0, x1: 1000, top: 600, h: 1300, w: 120, z0: -800, z1: -300, opacity: 0.35 });
      // Foreground: broken stubs and fallen drums on the front of each floor slab, between camera and fight.
      const stone = K.toon('#a49a8a'), dark = K.toon('#7a7062'), drum = new T.CylinderGeometry(1, 1.05, 1, 14), blk = new T.BoxGeometry(1, 1, 1);
      for (const [x, z, kind, h] of [[30, 110, 'stub', 120], [250, 125, 'drum', 0], [445, 130, 'block', 0], [610, 130, 'stub', 70], [870, 110, 'stub', 160]]) {
        const g = new T.Group();
        if (kind === 'stub') {
          const s2 = new T.Mesh(drum, stone); s2.scale.set(26, h, 26); s2.position.y = h / 2;
          const b = new T.Mesh(blk, dark); b.scale.set(66, 12, 50); b.position.y = 6;
          g.add(s2, b);
        } else if (kind === 'drum') {
          const s2 = new T.Mesh(drum, stone); s2.scale.set(24, 60, 24); s2.rotation.set(Math.PI / 2, 0, 0.5); s2.position.y = 24;
          g.add(s2);
        } else {
          const s2 = new T.Mesh(blk, dark); s2.scale.set(60, 30, 34); s2.rotation.y = 0.4; s2.position.y = 15;
          const t = new T.Mesh(blk, stone); t.scale.set(40, 20, 26); t.rotation.set(0, -0.3, 0.12); t.position.set(8, 40, 0);
          g.add(s2, t);
        }
        g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
        g.scale.setScalar(0.8); g.position.set(x, BASE, z); K.scene.add(g); K.occluder(g);
        K.contact(x, BASE, z, 44, 26, 0.55);
      }
    },
  }));

  // Cave: dark rock hall, stalactites overhead, cyan and violet crystals along the floor.
  def('cave', (T, K) => ({
    sky: [[0, '#050304'], [0.6, '#0a0608'], [1, '#1a0e10']],
    fog: '#120a0c',
    light: { sky: '#9aa8e0', ground: '#4a2a20', hemi: 1.5, key: '#d0dcff', keyI: 1.7 },
    ground: { top: '#5a4232', backTop: '#3e2c22', face: ['#3a2618', '#2a1a10', '#4a3020', '#100806'], deep: '#2a1a10' },
    plat: { kind: 'island', top: '#6a4a38', lip: '#8a6a50', body: '#4a3020', under: '#2a1a10' },
    dress(scene, K, rnd) {
      const rock = (g, w, h) => { const r = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(41); g.fillStyle = '#2a1c20'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? '#3a282e' : '#1c1216'; g.beginPath(); g.ellipse(r() * w, r() * h, 10 + r() * 30, 6 + r() * 16, r() * 3, 0, 7); g.fill(); } };
      wall(K, { w: 9000, h: 3000, x: 450, y: 200, z: -1600, paint: rock, rx: 10, ry: 4 });
      crystals(K, rnd, { n: 22, colors: ['#7a3cff', '#2ad0ff', '#c050ff'], hMin: 40, hMax: 150, hang: true, y: 220, x0: -800, x1: 1700, z0: -1400, z1: -200, glow: 0.2 });
      crystals(K, rnd, { n: 40, colors: ['#2ad0ff', '#8a4aff', '#40ffd0'], hMin: 20, hMax: 90, x0: -600, x1: 1500, z0: -1300, z1: -60, glow: 0.7 });
    },
  }));

  // Underwater: blue depths, kelp that sways, coral, light shafts from the surface, a coral-blue seabed.
  let _kelp = null;
  def('underwater', (T, K) => ({
    sky: [[0, '#0a5a9a'], [0.4, '#023a6a'], [1, '#01102a']],
    fog: '#023a6a', fogSpan: 1900,
    light: { sky: '#70d0ff', ground: '#003366', hemi: 1.35, key: '#a8e4ff', keyI: 1.4 },
    ground: { top: '#1d5a96', backTop: '#164a80', face: ['#0a3366', '#08284f', '#0e3c77', '#041a33'], deep: '#082a50' , trim: { color: '#245a80', steps: [[0, 12, 8], [12, 26, 16]] } },
    plat: { kind: 'block', top: '#2a7ac0', lip: '#5ab0ff', body: '#00447f', depth: [50, 90] },
    platDress: piers({ style: 'column', color: '#4a88a8', cap: '#5a9ab8', r: 14 }),
    dress(scene, K, rnd) {
      const T2 = K.T, kelpG = new T2.CylinderGeometry(1, 2, 1, 5, 6); kelpG.translate(0, 0.5, 0);
      const kelpM = [K.toon('#2a8a3a'), K.toon('#3aa84a'), K.toon('#1f6a30')];
      _kelp = [];
      for (let i = 0; i < 60; i++) {
        const m = new T2.Mesh(kelpG, kelpM[i % 3]), h = 160 + rnd() * 420;
        m.scale.set(3 + rnd() * 3, h, 3 + rnd() * 3);
        m.position.set(-900 + rnd() * 2700, -480, -150 - rnd() * 1300);
        m.userData.ph = rnd() * 6; K.scene.add(m); _kelp.push(m);
      }
      const coral = ['#ff6a8a', '#ffb04a', '#c86aff', '#4ae0d0'].map(c => K.toon(c)), cg = new T2.IcosahedronGeometry(1, 1);
      for (let i = 0; i < 50; i++) {
        const m = new T2.Mesh(cg, coral[i % 4]), s = 10 + rnd() * 24;
        m.scale.set(s * 1.3, s, s); m.position.set(-800 + rnd() * 2500, -480 + s * 0.4, -60 - rnd() * 900); K.scene.add(m);
      }
      shafts(K, rnd, { n: 8, color: 'rgba(160,230,255,', x0: -500, x1: 1400, top: 900, h: 1700, w: 90, z0: -900, z1: -200, opacity: 0.4, tilt: -0.18 });
      // Sunken colonnade behind the fight: what's left of a drowned hall, broken and leaning.
      columns(K, rnd, { color: '#2e6488', capColor: '#3a7aa0', broken: 0.5, neck: true, contact: true, rows: [{ n: 7, x0: -260, step: 230, z: -380, h: 380, r: 20, lintel: true }] });
    },
    update(f) { if (_kelp) for (const m of _kelp) { m.rotation.z = Math.sin(f * 0.02 + m.userData.ph) * 0.08; m.rotation.x = Math.cos(f * 0.017 + m.userData.ph) * 0.05; } },
  }));

  // Colosseum: warm sand floor inside a ring of arches, banners on the wall, sun high.
  def('colosseum', (T, K) => ({
    sky: [[0, '#c8883a'], [0.5, '#e0a858'], [1, '#f4d8a0']],
    fog: '#d8b070',
    light: { sky: '#ffe0a0', ground: '#a07040', hemi: 1.4, key: '#ffe8c0', keyI: 1.8 },
    sun: { dir: [-0.4, 0.62, -1], rays: true, color: '#fff4d8', glow: 'rgba(255,236,190,' },
    ground: { top: '#d8b880', backTop: '#c8a870', face: ['#b89060', '#9a7448', '#c8a070', '#6a4a28'], deep: '#8a6438' , trim: { color: '#c8a070', steps: [[0, 14, 8], [14, 24, 18]] } },
    plat: { kind: 'block', top: '#e0c898', lip: '#f0dcb0', body: '#b89060', depth: [50, 90] },
    platDress: piers({ style: 'column', color: '#d8b880', cap: '#e8cc98', r: 16 }),
    dress(scene, K, rnd) {
      // The stands: a two-tier arcade wall behind the sand, columns standing proud of each arch, banners between.
      const arches = (g, w, h) => {
        g.fillStyle = '#c8a070'; g.fillRect(0, 0, w, h);
        for (const [top, ah] of [[18, 100], [140, 96]]) {
          g.fillStyle = '#5a3a20'; g.beginPath(); g.moveTo(24, top + ah); g.lineTo(24, top + 32); g.arc(w / 2, top + 32, w / 2 - 24, Math.PI, 0); g.lineTo(w - 24, top + ah); g.fill();
          g.fillStyle = '#a07c50'; g.fillRect(0, top + ah, w, 8);
        }
        g.fillStyle = '#e0c090'; g.fillRect(0, 0, w, 6);
      };
      wall(K, { w: 6400, h: 560, x: 450, y: -480 + 280, z: -900, paint: arches, tw: 128, th: 256, rx: 25, ry: 1 });
      columns(K, rnd, { color: '#d8b880', capColor: '#e8cc98', contact: true, rows: [{ n: 25, x0: -2750, step: 256, z: -870, h: 250, r: 13 }] });
      const T2 = K.T;
      for (let i = 0; i < 12; i++) {
        const b = new T2.Mesh(new T2.PlaneGeometry(46, 150), new T2.MeshToonMaterial({ color: i % 2 ? '#b8301f' : '#d8a030', side: T2.DoubleSide }));
        b.position.set(-1150 + i * 256 * 1.5, -480 + 420, -885); K.scene.add(b);
      }
      columns(K, rnd, { color: '#b89060', capColor: '#c8a070', rows: [{ n: 12, x0: -2400, step: 520, z: -2200, h: 900, r: 40, lintel: true }] });
      // Podium: the low wall ringing the sand, between the floor and the stands, with a capping course.
      const pm = K.toon('#c49a62'), cm = K.toon('#e4c68e');
      box(K, pm, 450, -480, -320, 2600, 96, 40);
      box(K, cm, 450, -480 + 96, -316, 2620, 10, 52);
      for (let x = -700; x <= 1600; x += 128) box(K, cm, x, -480, -296, 18, 96, 8);
    },
  }));

  // Clouds: above the cloud sea, pale range below the horizon, cumulus towers, cloud-puff ledges.
  def('clouds', (T, K) => ({
    sky: [[0, '#2f86d8'], [0.5, '#7cbcf0'], [1, '#e2f0fb']],
    fog: '#e2f0fb', fogNear: 700,
    light: { sky: '#e8f2ff', ground: '#7c98c4', hemi: 1.15, key: '#fff4dc', keyI: 2.0 },
    sun: { dir: [-0.3, 0.7, -1], rays: true },
    ground: { top: '#f2f6fc', backTop: '#e4ecf8', face: ['#eef4fb', '#dde8f4', '#f6faff', '#c8d8ec'], deep: '#d8e4f2' },
    plat: { kind: 'cloud', top: '#ffffff', body: '#f2f7ff', under: '#c8d8ee' },
    dress(scene, K, rnd) {
      range(K, rnd, { n: 14, x0: -6000, step: 900, z: -7000, zJ: 1200, hMin: 700, hMax: 1300, base: -620, lit: '#c8d4e4', shade: '#a4b4ca', foot: '#eef4fb', snow: '#ffffff', snowSh: '#dde6f2', snowT: 0.5 });
      towers(K, rnd, { top: '#ffffff', body: '#e6f0fc', belly: '#98b2d4', base: -500, z: -6000, list: [[-4000, 1300, 1500], [-1200, 1600, 1700], [1800, 1200, 1400], [4400, 1500, 1600]] });
      const puffs = floaters(K, rnd, { geo: 'puff', n: 110, colors: ['#ffffff', '#f4f8ff'], sMin: 40, sMax: 140, x0: -1500, x1: 2400, y0: -500, y1: -470, z0: -2400, z1: -260 });
      for (const p of puffs) { p.scale.y *= 0.45; p.rotation.set(0, p.rotation.y, 0); p.userData.spin = 0; }
    },
  }));

  // Mushroom: magenta night of giant glowing mushrooms, spores, violet ground.
  def('mushroom', (T, K) => ({
    sky: [[0, '#1a0628'], [0.5, '#3a0a50'], [0.85, '#7a2a9a'], [1, '#b050c8']],
    fog: '#5a1a7a',
    light: { sky: '#ff9aff', ground: '#4a1a6a', hemi: 1.3, key: '#ffe0ff', keyI: 1.4 },
    ground: { top: '#7a3a9a', backTop: '#6a2a8a', face: ['#4a1a6a', '#3a1058', '#5a2478', '#200830'], deep: '#3a1058' },
    plat: { kind: 'block', top: '#c890e0', lip: '#ecc0ff', body: '#6a2a8a', depth: [50, 90] },
    platDress: piers({ style: 'stalk', color: '#f0e0f0', cap: '#d8b8e8', r: 13 }),
    dress(scene, K, rnd) {
      stars(K, rnd, { n: 220, size: 1.6, minEl: 0.3, colors: ['#ffd0ff', '#ffffff'] });
      const T2 = K.T, stemG = new T2.CylinderGeometry(0.7, 1, 1, 10), capG = new T2.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      const caps = ['#4ad8ff', '#ff6ab8', '#ff9a4a', '#c86aff', '#e0e0ff'].map(c => new T2.MeshToonMaterial({ color: c, emissive: c, emissiveIntensity: 0.35 }));
      const stemM = K.toon('#f0e0f0');
      const shroom = (x, z, s) => {
        const h = 120 * s, st = new T2.Mesh(stemG, stemM); st.scale.set(10 * s, h, 10 * s); st.position.set(x, -480 + h / 2, z);
        const c = new T2.Mesh(capG, caps[Math.floor(rnd() * caps.length)]); c.scale.set(60 * s, 34 * s, 60 * s); c.position.set(x, -480 + h - 4, z);
        st.castShadow = c.castShadow = true; st.receiveShadow = c.receiveShadow = true; K.scene.add(st, c);
      };
      for (let i = 0; i < 18; i++) shroom(-800 + i * 150 + rnd() * 80, -250 - rnd() * 300, 0.5 + rnd() * 0.7);
      for (let i = 0; i < 12; i++) shroom(-1400 + i * 330 + rnd() * 120, -900 - rnd() * 500, 1.8 + rnd() * 1.4);
      for (let i = 0; i < 8; i++) shroom(-2600 + i * 800 + rnd() * 300, -2200 - rnd() * 700, 4 + rnd() * 2);
    },
  }));

  // Haunted: purple night, dead trees, gravestones, a house with lit windows, big violet moon.
  def('haunted', (T, K) => ({
    sky: [[0, '#06040e'], [0.5, '#140c24'], [1, '#3a2850']],
    fog: '#2a1a3a',
    light: { sky: '#9080c8', ground: '#1a1428', hemi: 1.0, key: '#c8b8ff', keyI: 1.15 },
    sun: { dir: [-0.35, 0.55, -1], color: '#d8c8f0', size: 460, glow: 'rgba(170,140,230,' },
    ground: { top: '#2e2640', backTop: '#262034', face: ['#1f1a2a', '#181422', '#2a2236', '#0a080f'], deep: '#181422' },
    plat: { kind: 'block', top: '#4a3a5a', lip: '#6a5a80', body: '#2a2238', depth: [50, 90] },
    platDress: piers({ style: 'post', color: '#5a4a5e', cap: '#6a5a70', r: 9 }),
    dress(scene, K, rnd) {
      stars(K, rnd, { n: 200, size: 1.4, minEl: 0.3 });
      trees(K, rnd, { shape: 'dead', trunk: '#1a1422', rows: [{ n: 12, x0: -700, step: 220, z: -500, zJ: 300, s: 1.4, sJ: 0.6 }, { n: 14, x0: -1600, step: 300, z: -1300, zJ: 400, s: 2.2, sJ: 0.8 }] });
      const T2 = K.T, stoneM = K.toon('#4a4458'), bxG = new T2.BoxGeometry(1, 1, 1);
      for (let i = 0; i < 26; i++) { const s = new T2.Mesh(bxG, stoneM); s.scale.set(16, 22 + rnd() * 14, 6); s.position.set(-500 + rnd() * 1900, -470, -80 - rnd() * 500); s.rotation.z = (rnd() - 0.5) * 0.3; s.castShadow = true; K.scene.add(s); K.contact(s.position.x, -480, s.position.z, 16, 8, 0.45); }
      const houseM = K.toon('#1e1828'), house = new T2.Mesh(bxG, houseM); house.scale.set(420, 380, 260); house.position.set(1200, -480 + 190, -1500); K.scene.add(house);
      const roof = new T2.Mesh(new T2.ConeGeometry(320, 240, 4), houseM); roof.position.set(1200, -480 + 500, -1500); roof.rotation.y = Math.PI / 4; K.scene.add(roof);
      const winM = K.basic('#ffb040', { fog: false });
      for (const [wx, wy] of [[-110, 100], [110, 100], [-110, 250], [110, 250]]) { const w = new T2.Mesh(bxG, winM); w.scale.set(60, 80, 4); w.position.set(1200 + wx, -480 + wy, -1368); K.scene.add(w); glow(K, 1200 + wx, -480 + wy, -1360, 220, 'rgba(255,170,60,'); }
      // Graveyard fence behind the fight: iron pickets between stone posts, a few bent or missing.
      const im = K.toon('#3a3448'), sm = K.toon('#544c64');
      for (let x = -250; x <= 1150; x += 200) { box(K, sm, x, -480, -260, 18, 80, 18, true); box(K, sm, x, -400, -260, 24, 8, 24); }
      box(K, im, 450, -480 + 58, -260, 1400, 4, 3);
      box(K, im, 450, -480 + 20, -260, 1400, 4, 3);
      for (let x = -240; x <= 1140; x += 16) { if (rnd() < 0.08) continue; const pk = box(K, im, x, -480, -260, 3, 66 + (x % 3) * 4, 3); pk.rotation.z = rnd() < 0.1 ? (rnd() - 0.5) * 0.4 : 0; }
    },
  }));

  // Cyberpunk: black-violet towers with pink and cyan neon, hazard-striped ledges.
  def('cyberpunk', (T, K) => ({
    sky: [[0, '#03020a'], [0.5, '#0c0618'], [1, '#2a0e3a']],
    fog: '#160a26',
    light: { sky: '#8a70ff', ground: '#200a30', hemi: 0.95, key: '#d8c8ff', keyI: 1.1 },
    ground: { top: '#1a1a2a', backTop: '#141422', face: ['#22223a', '#18182a', '#2a2a44', '#0a0a14'], deep: '#121220' , trim: { color: '#24243a', steps: [[0, 8, 6], [8, 30, 2]] } },
    plat: { kind: 'block', top: '#2a2a3a', lip: '#ffb020', body: '#18182a', glow: '#2ad8ff', depth: [50, 80], topH: 5 },
    platDress: piers({ style: 'girder', color: '#3a3a58', cap: '#4a4a6a', glow: '#2ad8ff', r: 10, brace: true }),
    dress(scene, K, rnd) {
      buildings(K, rnd, { colors: ['#1a1230', '#22163a', '#140e26'], win: ['#4ad8ff', '#ff4aa8', '#b06aff'], style: 'bands', winP: 0.16, neon: ['#ff2a8a', '#2ad8ff', '#b46cff', '#ffb020'], neonP: 0.7,
        rows: [{ n: 14, x0: -1000, step: 210, z: -1150, zJ: 250, wMin: 120, wMax: 190, hMin: 420, hMax: 950 },
               { n: 20, x0: -2400, step: 280, z: -1900, zJ: 400, wMin: 160, wMax: 260, hMin: 800, hMax: 1700 },
               { n: 18, x0: -4200, step: 500, z: -3000, zJ: 600, wMin: 300, wMax: 460, hMin: 1200, hMax: 2600, glow: 0.7 }] });
      // Guard rail along the deck's back edge: posts, a neon top rail, the gap to the towers below.
      const pm = K.toon('#2a2a42'), nm = K.basic('#ff2a8a', { fog: false });
      box(K, pm, 450, -480, -210, 1400, 12, 18);
      box(K, nm, 450, -480 + 64, -210, 1400, 3, 4);
      for (let x = -230; x <= 1130; x += 80) box(K, pm, x, -480 + 12, -210, 5, 52, 5, true);
    },
  }));

  // Neon Grid: black void, green grid running to the horizon, a striped green sun, wire ridges.
  def('neonGrid', (T, K) => ({
    sky: [[0, '#000000'], [0.6, '#00110a'], [1, '#00301a']],
    fog: '#001a0c', fogSpan: 4000,
    light: { sky: '#40ff90', ground: '#002010', hemi: 0.7, key: '#b0ffd0', keyI: 0.9 },
    ground: { top: '#04140a', backTop: '#04140a', face: ['#06200f', '#041a0c', '#0a2a14', '#30ff80'], deep: '#041a0c' },
    plat: { kind: 'block', top: '#0a1a0f', lip: '#30ff80', body: '#06140a', glow: '#30ff80', depth: [50, 80], topH: 5 },
    dress(scene, K, rnd) {
      const T2 = K.T, grid = K.canvasTex(64, 64, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#30ff80'; g.fillRect(0, 0, 64, 2); g.fillRect(0, 0, 2, 64); });
      grid.wrapS = grid.wrapT = T2.RepeatWrapping; grid.repeat.set(175, 125);
      const gp = new T2.Mesh(new T2.PlaneGeometry(7000, 5000), new T2.MeshBasicMaterial({ map: grid, blending: T2.AdditiveBlending, transparent: true, depthWrite: false }));
      gp.rotation.x = -Math.PI / 2; gp.position.set(450, -479.4, -800); gp.renderOrder = 1; K.scene.add(gp);
      const sunT = K.canvasTex(256, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#9affb8'); gr.addColorStop(1, '#10a040'); g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.globalCompositeOperation = 'destination-out'; for (let y = 140; y < 256; y += 16) g.fillRect(0, y, 256, 3 + (y - 140) / 14); });
      const sunM = new T2.Mesh(new T2.PlaneGeometry(2600, 2600), new T2.MeshBasicMaterial({ map: sunT, transparent: true, fog: false, depthWrite: false }));
      sunM.position.set(450, 200, -9000); sunM.renderOrder = -0.9; K.scene.add(sunM);
      const wire = range(K, rnd, { n: 14, x0: -6000, step: 900, z: -6500, zJ: 1000, hMin: 500, hMax: 1100, lit: '#02140a', shade: '#010a05', foot: '#00200f' });
      const edges = new T2.LineSegments(new T2.EdgesGeometry(wire.geometry, 1), new T2.LineBasicMaterial({ color: '#30ff80', fog: false }));
      K.scene.add(edges);
    },
  }));

  // Mirror: dark blue hall, drifting glass shards, a fan of pale light beams, glossy dark floor.
  let _shards = null;
  def('mirror', (T, K) => ({
    sky: [[0, '#02050c'], [0.5, '#050a15'], [1, '#0e1c3a']],
    fog: '#0a1530',
    light: { sky: '#8aa8ff', ground: '#0a1530', hemi: 1.05, key: '#d8e4ff', keyI: 1.3 },
    ground: { top: '#16243a', backTop: '#121e32', face: ['#0d1a2a', '#0a1422', '#142236', '#a0c8ff'], deep: '#0a1422' },
    plat: { kind: 'block', top: '#3a5a80', lip: '#a0c8ff', body: '#1a2a3a', glow: '#a0c8ff', depth: [50, 80], topH: 5 },
    dress(scene, K, rnd) {
      _shards = floaters(K, rnd, { geo: 'shard', n: 50, colors: ['#a0c8ff', '#d0e0ff', '#7090d0'], opacity: 0.22, sMin: 30, sMax: 120, x0: -900, x1: 1800, y0: -460, y1: 500, z0: -1600, z1: -150 });
      const T2 = K.T, beamT = K.canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(170,200,255,0.5)'); gr.addColorStop(1, 'rgba(170,200,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2 - 3, h); g.lineTo(0, 0); g.lineTo(w, 0); g.lineTo(w / 2 + 3, h); g.fill(); });
      const beamM = new T2.MeshBasicMaterial({ map: beamT, transparent: true, blending: T2.AdditiveBlending, depthWrite: false, fog: false, side: T2.DoubleSide });
      for (let i = 0; i < 9; i++) { const b = new T2.Mesh(new T2.PlaneGeometry(160, 1600), beamM); b.position.set(450, -480 + 800, -1700); b.rotation.z = (i - 4) * 0.16; b.geometry.translate(0, 0, 0); b.position.x += Math.sin(b.rotation.z) * -800; b.position.y -= (1 - Math.cos(b.rotation.z)) * 800; b.renderOrder = 4; K.scene.add(b); }
    },
    update(f) { if (_shards) drift(_shards, f, 14); },
  }));

  // Desert: orange afternoon, flat-topped mesas, dunes, cacti, a low sun with rays.
  def('desert', (T, K) => ({
    sky: [[0, '#d0702a'], [0.5, '#e89a48'], [1, '#f8d28a']],
    fog: '#f0b868',
    light: { sky: '#ffd8a0', ground: '#c08040', hemi: 1.4, key: '#fff0c8', keyI: 1.9 },
    sun: { dir: [-0.38, 0.32, -1], rays: true, color: '#fff6dc', size: 620, glow: 'rgba(255,230,170,' },
    ground: { top: '#e8b870', backTop: '#e0ae66', face: ['#c89050', '#b07840', '#d8a060', '#8a5a30'], deep: '#b07840' },
    plat: { kind: 'block', top: '#f0c880', lip: '#d8a860', body: '#c89050', depth: [50, 90] },
    platDress: piers({ style: 'block', color: '#d0985a', cap: '#e0b070', r: 14, brace: true }),
    dress(scene, K, rnd) {
      range(K, rnd, { mesa: true, n: 10, x0: -5000, step: 1100, z: -5200, zJ: 1600, hMin: 400, hMax: 900, wide: 1.6, lit: '#d88a4a', shade: '#a8603a', foot: '#f0b070' });
      hills(K, rnd, { n: 9, x0: -2000, step: 520, z: -1600, zJ: 700, r: 400, h: 70, color: '#e8b46a' });
      const T2 = K.T, cm = K.toon('#3a8a4a'), cg = new T2.CapsuleGeometry(1, 1, 4, 8);
      for (let i = 0; i < 16; i++) {
        const x = -700 + rnd() * 2300, z = -200 - rnd() * 900, h = 50 + rnd() * 70;
        const t = new T2.Mesh(cg, cm); t.scale.set(9, h / 2, 9); t.position.set(x, -480 + h / 2, z); t.castShadow = true; K.scene.add(t);
        for (const sd of [-1, 1]) if (rnd() < 0.7) { const a = new T2.Mesh(cg, cm), ah = 14 + rnd() * 16; a.scale.set(6, ah / 2, 6); a.position.set(x + sd * 18, -480 + h * (0.5 + rnd() * 0.3), z); a.castShadow = true; K.scene.add(a); }
      }
      // Ruined adobe wall in the middle ground: broken segments with stepped tops, sand drifted at the foot.
      const wm = K.toon('#c88a52'), dm = K.toon('#e0ae66');
      for (const [x, w, h] of [[-260, 220, 120], [10, 160, 70], [380, 260, 150], [720, 140, 90], [980, 240, 130]]) {
        box(K, wm, x, -480, -420, w, h, 34, true);
        box(K, wm, x - w * 0.2, -480 + h, -420, w * 0.45, 22, 34);
        const drift = new T.Mesh(new T.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), dm); drift.scale.set(w * 0.6, 22, 40); drift.position.set(x, -480, -396); K.scene.add(drift);
      }
    },
  }));

  // Sewer: arched brick tunnel, light falling from grates, rafts on the green flow.
  def('sewer', (T, K) => ({
    sky: [[0, '#060a08'], [0.5, '#0d1410'], [1, '#1a241c']],
    fog: '#1a241c',
    light: { sky: '#c8d890', ground: '#2a3018', hemi: 1.05, key: '#fff0b0', keyI: 1.25 },
    plat: { kind: 'block', top: '#5a5340', lip: '#7d6f4e', body: '#3a3428', depth: [60, 100] },
    rafts: true,
    platDress(g, pl, d, K) {
      // The heap under the deck down past the surface, junk on top, a barrel on wide rafts (as the 2D flow drew them).
      const T = K.T, surf = (currentArena && currentArena.sewageY) || 470, box = new T.BoxGeometry(1, 1, 1);
      const mass = new T.Mesh(box, K.toon('#3b3a24')), mh = Math.max(10, surf + 24 - pl.y);
      mass.scale.set(pl.w + 8, mh, d * 0.9); mass.position.set(pl.w / 2, -mh / 2 - 4, 0); g.add(mass);
      const junkM = K.toon('#4a4630'), seed = Math.abs(Math.round(pl.w)) % 7;
      for (let j = 0; j < 3; j++) {
        const jw = 14 + ((j + seed) % 3) * 8, jh = 8 + ((j + seed) % 3) * 5, jx = 16 + ((j * 53 + seed * 29) % Math.max(20, pl.w - 40));
        const b = new T.Mesh(box, junkM); b.scale.set(jw, jh, jw * 0.8); b.position.set(jx + jw / 2, jh / 2, -d * 0.2 + j * 8); b.castShadow = true; g.add(b);
      }
      if (pl.w > 160) { const br = new T.Mesh(new T.CylinderGeometry(10, 10, 26, 12), K.toon('#4f5230')); br.position.set(pl.w - 34, 13, -d * 0.15); br.castShadow = true; g.add(br); }
    },
    liquid: { y: 470, kind: 'sewage', color: '#3a4a1c', veins: ['rgba(140,170,60,0.35)', 'rgba(20,30,10,0.4)'], flowX: -0.0012, flowZ: 0 },
    dress(scene, K, rnd) {
      const brick = (g, w, h) => { g.fillStyle = '#24301f'; g.fillRect(0, 0, w, h); g.fillStyle = '#121a10'; for (let y = 0; y < h; y += 16) { g.fillRect(0, y, w, 2); for (let x = (y / 16) % 2 ? 0 : 16; x < w; x += 32) g.fillRect(x, y, 2, 16); } };
      wall(K, { w: 9000, h: 2400, x: 900, y: 300, z: -700, paint: brick, tw: 64, th: 64, rx: 140, ry: 38 });
      const T2 = K.T, pipeM = K.toon('#4a5a3a'), pg = new T2.CylinderGeometry(1, 1, 1, 14);
      for (let i = 0; i < 9; i++) { const p = new T2.Mesh(pg, pipeM); p.scale.set(26, 3000, 26); p.rotation.z = Math.PI / 2; p.position.set(900, -100 + i * 60 - rnd() * 20, -650 + rnd() * 30); if (i % 3) continue; K.scene.add(p); }
      shafts(K, rnd, { n: 6, color: 'rgba(230,230,140,', x0: -200, x1: 2000, top: 500, h: 1100, w: 90, z0: -600, z1: -300, opacity: 0.45, tilt: -0.1 });
    },
  }));

  // ---------- Boss arenas (apex beings: reality-fracture and code visuals are allowed here) ----------
  // Their 2D painters also draw gameplay (floor hazards, the Creator's walls, the Circuit's voids), so each set
  // runs that painter as an overlay on top of the 3D image, plus the floor-hazard countdown and flash.
  function bossFloorFlash() {
    if (typeof bossFloorState === 'undefined' || bossFloorState !== 'warning' || !currentArena) return;
    if (Math.sin(frameCount * 0.35) > 0) {
      const fl = (currentArena.platforms || []).find(p => p.isFloor && !p.isFloorDisabled);
      if (fl) { ctx.fillStyle = bossFloorType === 'lava' ? 'rgba(255,70,0,0.55)' : 'rgba(20,0,60,0.70)'; ctx.fillRect(fl.x, fl.y, fl.w, fl.h); }
    }
  }
  function bossOverlay(paint) {
    return () => {
      if (typeof paint === 'function') paint();
      bossFloorFlash();
      if (typeof drawBossFloorWarningText === 'function') drawBossFloorWarningText();
    };
  }
  // Lava and void hazards as 3D surfaces at the hazard line, shown while the boss floor is a hazard.
  function hazardPlanes(K) {
    const T = K.T, mk = (color, glowC) => {
      const tex = K.canvasTex(128, 128, (g, w, h) => { g.fillStyle = color; g.fillRect(0, 0, w, h); g.strokeStyle = glowC; g.lineWidth = 2;
        const r = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(3); for (let i = 0; i < 12; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); } });
      tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(40, 30);
      const m = new T.Mesh(new T.PlaneGeometry(6000, 4500), K.basic(0xffffff, { map: tex }));
      m.rotation.x = -Math.PI / 2; m.position.set(450, -462, -1000); m.visible = false; K.scene.add(m);
      return m;
    };
    return { lava: mk('#c2340a', 'rgba(255,214,110,0.9)'), void: mk('#0c0420', 'rgba(140,60,255,0.9)') };
  }
  function syncHazard(hz, f) {
    if (!hz) return;
    const on = typeof bossFloorState !== 'undefined' && bossFloorState === 'hazard';
    const voidOpen = on && bossFloorType === 'void' || (typeof tfFloorRemoved !== 'undefined' && tfFloorRemoved);
    hz.lava.visible = on && bossFloorType === 'lava';
    hz.void.visible = !!voidOpen;
    for (const m of [hz.lava, hz.void]) if (m.visible) m.material.map.offset.set(f * 0.0005, f * 0.0003);
  }

  // Creator: violet fracture space. Cracked floor with violet seams, floating crystal shards, rift glows.
  let _crShards = null, _crHz = null, _crRifts = null;
  def('creator', (T, K) => ({
    sky: [[0, '#040010'], [0.55, '#140028'], [0.85, '#2a0848'], [1, '#4a1070']],
    fog: '#1a0030', fogSpan: 3200,
    light: { sky: '#b080ff', ground: '#3a0a5a', hemi: 1.1, key: '#e8d0ff', keyI: 1.3 },
    ground: { top: '#2a0a3a', backTop: '#200830', face: ['#2a0a3a', '#1a0628', '#3a1050', '#c060ff'], deep: '#1a0628', edge: '#c060ff',
      tile: { size: 160, paint: (g, w, h) => { g.strokeStyle = '#a040f0'; g.lineWidth = 2; const r = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(8);
        for (let i = 0; i < 7; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 70; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); } } } },
    plat: { kind: 'block', top: '#3a0055', lip: '#c060ff', body: '#22003a', glow: '#b000ff', depth: [50, 90], topH: 5 },
    dress(scene, K, rnd) {
      stars(K, rnd, { n: 500, size: 1.6, minEl: -0.2, colors: ['#e0c0ff', '#ffffff', '#b080ff'] });
      _crShards = crystals(K, rnd, { n: 26, colors: ['#7a2aff', '#c060ff', '#4a10a0'], hMin: 40, hMax: 220, x0: -1200, x1: 2100, z0: -2600, z1: -500, y: 100, glow: 0.45 });
      for (const m of _crShards) { m.position.y += rnd() * 700 - 300; m.userData.y = m.position.y; m.userData.ph = rnd() * 6; m.userData.spin = (rnd() - 0.5) * 0.004; }
      floaters(K, rnd, { geo: 'shard', n: 40, colors: ['#c060ff', '#ff80ff', '#8040ff'], opacity: 0.18, sMin: 60, sMax: 240, x0: -1500, x1: 2400, y0: -400, y1: 900, z0: -3000, z1: -700 });
      _crRifts = [];
      for (let i = 0; i < 6; i++) _crRifts.push(glow(K, -900 + i * 520 + rnd() * 200, 80 + rnd() * 500, -1800 - rnd() * 900, 600, 'rgba(200,60,255,'));
      _crHz = hazardPlanes(K);
    },
    update(f) {
      if (_crShards) drift(_crShards, f, 16);
      if (_crRifts) _crRifts.forEach((g, i) => { const s = 600 + Math.sin(f * 0.019 + i) * 140; g.scale.set(s, s, 1); });
      syncHazard(_crHz, f);
    },
    overlay: bossOverlay(() => { if (typeof drawCreatorArena === 'function') drawCreatorArena(); }),
  }));

  // Void: nothing at all. A black slab with a white rim floating in black, a faint grey glow behind, slow motes.
  let _vMotes = null, _vHz = null;
  def('void', (T, K) => ({
    sky: [[0, '#000000'], [0.7, '#030306'], [1, '#08080e']],
    fog: '#000000', fogSpan: 5000,
    light: { sky: '#8a8aa0', ground: '#000000', hemi: 0.55, key: '#ffffff', keyI: 0.9 },
    ground: { top: '#060608', face: ['#030304', '#020203', '#050507', '#ffffff'], deep: '#020203', back: false, front: 220, edge: '#ffffff' },
    plat: { kind: 'block', top: '#050505', lip: '#ffffff', body: '#020202', glow: '#ffffff', depth: [50, 80], topH: 4 },
    dress(scene, K, rnd) {
      glow(K, 450, 40, -2600, 3000, 'rgba(70,60,110,');
      stars(K, rnd, { n: 140, size: 1.2, minEl: -0.4, colors: ['#8a8aa0', '#5a5a70'] });
      _vMotes = floaters(K, rnd, { geo: 'shard', n: 60, colors: ['#ffffff'], opacity: 0.12, sMin: 2, sMax: 5, x0: -600, x1: 1500, y0: -470, y1: 200, z0: -1200, z1: -80 });
      _vHz = hazardPlanes(K);
    },
    update(f) {
      if (_vMotes) for (const m of _vMotes) { m.position.y = m.userData.y + ((f * 0.15 + m.userData.ph * 100) % 600); }
      syncHazard(_vHz, f);
    },
    overlay: bossOverlay(() => { if (typeof drawVoidArena === 'function') drawVoidArena(); }),
  }));

  // Sovereign ("The Circuit"): a red-on-black circuit hall. Traced floor plate, a wall of boards and chips,
  // concentric target rings behind the centre. The plate's voids stay the 2D CircuitPlate (gameplay).
  let _svRing = null;
  def('sovereign', (T, K) => ({
    sky: [[0, '#020003'], [0.6, '#0a0008'], [1, '#1a0008']],
    fog: '#0c0006', fogSpan: 3000,
    light: { sky: '#ff6050', ground: '#200004', hemi: 0.9, key: '#ffd0c8', keyI: 1.1 },
    ground: { top: '#0e0008', backTop: '#0a0006', face: ['#140008', '#0c0005', '#1c000c', '#ff2a10'], deep: '#0c0005', edge: '#d01808',
      tile: { size: 120, paint: (g, w, h) => { g.strokeStyle = 'rgba(200,20,10,0.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 30); g.lineTo(50, 30); g.lineTo(70, 50); g.lineTo(128, 50); g.moveTo(20, 128); g.lineTo(20, 90); g.lineTo(40, 70); g.lineTo(40, 0); g.moveTo(90, 128); g.lineTo(90, 96); g.lineTo(128, 96); g.stroke(); g.fillStyle = 'rgba(255,40,20,0.8)'; for (const [x, y] of [[50, 30], [70, 50], [40, 70], [90, 96]]) g.fillRect(x - 2, y - 2, 4, 4); } } },
    plat: { kind: 'block', top: '#1a0010', lip: '#ff2a10', body: '#0c0006', glow: '#c01408', depth: [50, 80], topH: 5 },
    dress(scene, K, rnd) {
      const board = (g, w, h) => {
        g.fillStyle = '#0a0006'; g.fillRect(0, 0, w, h);
        const r = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(19);
        g.strokeStyle = 'rgba(150,10,10,0.6)'; g.lineWidth = 1.5;
        for (let i = 0; i < 26; i++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) { if (r() < 0.5) x += (r() - 0.5) * 120; else y += (r() - 0.5) * 120; g.lineTo(x, y); } g.stroke(); g.fillStyle = 'rgba(255,30,20,0.85)'; g.fillRect(x - 2, y - 2, 4, 4); }
        g.fillStyle = '#16000c'; g.strokeStyle = 'rgba(170,20,10,0.7)';
        for (let i = 0; i < 5; i++) { const x = r() * (w - 50), y = r() * (h - 40), cw = 24 + r() * 30, ch = 18 + r() * 22; g.fillRect(x, y, cw, ch); g.strokeRect(x, y, cw, ch); }
      };
      wall(K, { w: 7000, h: 2400, x: 450, y: 300, z: -1100, paint: board, tw: 256, th: 256, rx: 18, ry: 6 });
      const ringT = K.canvasTex(512, 512, (g) => { g.translate(256, 256); for (const [r, a, lw] of [[240, 0.5, 3], [190, 0.35, 2], [130, 0.6, 3], [70, 0.4, 2]]) { g.strokeStyle = 'rgba(220,20,10,' + a + ')'; g.lineWidth = lw; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); } g.fillStyle = 'rgba(255,40,20,0.9)'; g.fillRect(-3, -40, 6, 26); });
      _svRing = new T.Mesh(new T.PlaneGeometry(900, 900), new T.MeshBasicMaterial({ map: ringT, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
      _svRing.position.set(450, 60, -1090); scene.add(_svRing);
      columns(K, rnd, { color: '#140008', capColor: '#2a0010', rows: [{ n: 8, x0: -900, step: 400, z: -1000, h: 1100, r: 30 }] });
    },
    update(f) { if (_svRing) _svRing.rotation.z = f * 0.0012; },
    overlay: bossOverlay(() => { if (typeof drawSovereignArena === 'function') drawSovereignArena(); }),
  }));

  // ---------- Story arenas and the remaining apex arenas ----------

  // The arena's playable span, padded: wide story maps (3600 to 5880 px) need scenery along their whole length.
  function span(pad) {
    const A = typeof currentArena !== 'undefined' && currentArena ? currentArena : {};
    const L = A.mapLeft != null ? A.mapLeft : 0, R = A.mapRight != null ? A.mapRight : (A.worldWidth || 900) + L;
    return { L: L - (pad || 1200), R: R + (pad || 1200) };
  }
  // Rows laid along the span: n from the step.
  function rowsAlong(pad, list) { const s = span(pad); return list.map(r => Object.assign({ x0: s.L, n: Math.ceil((s.R - s.L) / r.step) }, r)); }
  function box(K, mat, x, y, z, w, h, d, cast) {
    const m = new K.T.Mesh(box._g || (box._g = new K.T.BoxGeometry(1, 1, 1)), mat);
    m.scale.set(w, h, d); m.position.set(x, y + h / 2, z); m.receiveShadow = true; m.castShadow = !!cast;
    K.scene.add(m); return m;
  }
  function wire(K, geo, color, x, y, z, s, op) {
    const T = K.T, l = new T.LineSegments(new T.EdgesGeometry(geo), new T.LineBasicMaterial({ color, transparent: op != null, opacity: op != null ? op : 1, fog: false }));
    l.position.set(x, y, z); l.scale.setScalar(s); K.scene.add(l); return l;
  }
  // A house: walls, a pitched roof, a door and windows (lit at night).
  function house(K, x, z, w, h, o) {
    const T = K.T, base = -480;
    box(K, K.toon(o.wall), x, base, z, w, h, w * 0.7, true);
    const roof = new T.Mesh(new T.ConeGeometry(w * 0.78, h * 0.6, 4), K.toon(o.roof)); roof.rotation.y = Math.PI / 4; roof.scale.z = 0.7;
    roof.position.set(x, base + h + h * 0.3, z); roof.castShadow = true; K.scene.add(roof);
    const winM = o.lit ? K.basic(o.lit, { fog: false }) : K.toon(o.win || '#f4f0e0');
    box(K, K.toon(o.door || '#6a4028'), x - w * 0.15, base, z + w * 0.35 + 1, w * 0.16, h * 0.45, 2);
    for (const wx of [-0.32, 0.22]) box(K, winM, x + wx * w, base + h * 0.5, z + w * 0.35 + 1, w * 0.18, h * 0.22, 2);
  }
  const AP = 'rgba(';   // glow() colours are passed as 'rgba(r,g,b,'

  // Damnation: red-black hell. Jagged spires, ember glow from below, red-rimmed ledges.
  let _dmEmbers = null;
  def('damnation', (T, K) => ({
    sky: [[0, '#050000'], [0.6, '#140002'], [0.9, '#2a0404'], [1, '#4a0a04']],
    fog: '#1a0202', fogSpan: 2600,
    light: { sky: '#ff6040', ground: '#300000', hemi: 0.9, key: '#ffb090', keyI: 1.2 },
    ground: { top: '#1a0606', backTop: '#140404', face: ['#1a0404', '#100202', '#240606', '#ff2200'], deep: '#100202', edge: '#ff2200' },
    plat: { kind: 'block', top: '#3a0010', lip: '#ff2200', body: '#1a0006', glow: '#ff3300', depth: [50, 80], topH: 5 },
    dress(scene, K, rnd) {
      range(K, rnd, { n: 18, x0: -5000, step: 600, z: -3600, zJ: 1600, hMin: 500, hMax: 1500, wide: 0.35, lit: '#2a0606', shade: '#120202', foot: '#6a1004' });
      range(K, rnd, { n: 14, x0: -1600, step: 300, z: -1300, zJ: 500, hMin: 200, hMax: 600, wide: 0.3, lit: '#1e0404', shade: '#0c0101', foot: '#a01a04' });
      for (let i = 0; i < 7; i++) glow(K, -1500 + i * 600, -380, -1800 - rnd() * 800, 900, 'rgba(255,60,10,');
      _dmEmbers = floaters(K, rnd, { geo: 'shard', n: 70, colors: ['#ff6a20', '#ffaa40'], opacity: 0.7, sMin: 2, sMax: 5, x0: -700, x1: 1600, y0: -480, y1: 300, z0: -1400, z1: -60 });
    },
    update(f) { if (_dmEmbers) for (const m of _dmEmbers) m.position.y = m.userData.y + ((f * 0.6 + m.userData.ph * 120) % 780) - 100; },
  }));

  // God's domain: blinding gold above, void below. Marble floor, gold pillars and halo rings, gold light falling.
  // Order fractures as God weakens: the halo rings tilt off true and the void glow rises with lost HP.
  let _gdRings = null, _gdHz = null, _gdVoid = null;
  function _godChaos() {
    if (typeof gameMode === 'undefined' || gameMode !== 'god' || typeof minions === 'undefined' || !Array.isArray(minions)) return 0;
    const g = minions.find(m => m && m.isGod); return g && g.maxHealth > 0 ? 1 - Math.max(0, Math.min(1, g.health / g.maxHealth)) : 0;
  }
  def('god_domain', (T, K) => ({
    sky: [[0, '#fffbe6'], [0.35, '#fff0b8'], [0.7, '#c8a050'], [1, '#2a1a10']],
    fog: '#f6e6b8', fogSpan: 3400,
    light: { sky: '#fff6d8', ground: '#a07838', hemi: 1.5, key: '#fff4d0', keyI: 1.8 },
    sun: { dir: [0, 0.75, -1], rays: true, color: '#fffdf0', size: 700, glow: 'rgba(255,240,190,' },
    ground: { top: '#f5f0d8', backTop: '#ece2c0', face: ['#e8dcb8', '#d8c898', '#f0e6c8', '#c89820'], deep: '#c8b080', edge: '#e0b040',
      tile: { size: 90, paint: (g, w, h) => { g.strokeStyle = 'rgba(200,152,32,0.55)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); g.strokeStyle = 'rgba(180,170,150,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(10, 30); g.bezierCurveTo(40, 50, 70, 20, 118, 60); g.stroke(); } } },
    plat: { kind: 'block', top: '#f0ead0', lip: '#e0b040', body: '#d8cca8', glow: '#ffd060', depth: [50, 90], topH: 5 },
    dress(scene, K, rnd) {
      columns(K, rnd, { color: '#f4ecd4', capColor: '#e0b040', rows: [{ n: 9, x0: -900, step: 330, z: -700, h: 900, r: 26 }, { n: 10, x0: -1900, step: 560, z: -1700, h: 1500, r: 44, lintel: true }] });
      _gdRings = [];
      for (let i = 0; i < 4; i++) {
        const r = new T.Mesh(new T.TorusGeometry(260 + i * 150, 6, 8, 80), K.basic(i % 2 ? '#e0b040' : '#fff0b0', { fog: false }));
        r.position.set(450, 300, -1500 - i * 80); r.userData.ph = i; scene.add(r); _gdRings.push(r);
      }
      shafts(K, rnd, { n: 8, color: 'rgba(255,236,170,', x0: -400, x1: 1300, top: 900, h: 1600, w: 90, z0: -900, z1: -200, opacity: 0.45, tilt: 0 });
      _gdVoid = glow(K, 450, -700, -1200, 2400, 'rgba(40,10,60,');
      _gdHz = hazardPlanes(K);
    },
    update(f) {
      const c = _godChaos();
      if (_gdRings) _gdRings.forEach(r => { r.rotation.x = Math.sin(f * 0.004 + r.userData.ph) * (0.1 + c * 0.9); r.rotation.y = Math.cos(f * 0.003 + r.userData.ph) * (0.15 + c * 0.8); });
      if (_gdVoid) { const s = 2400 + c * 2600; _gdVoid.scale.set(s, s, 1); }
      syncHazard(_gdHz, f);
    },
    overlay: bossOverlay(null),
  }));

  // The Fracture Point (Absolute Axiom): a dark breach. Seven biome panes hang along the 3600 px world, each a
  // window onto a world Axiom broke (grass, city, forest, ice, desert, lava, void); they crack wider as it weakens.
  let _aaPanes = null, _aaBeams = null;
  function _aaChaos() {
    if (typeof minions === 'undefined' || !Array.isArray(minions)) return 0.2;
    const a = minions.find(m => m && m.isAbsoluteAxiom && m.health > 0); return a && a.maxHealth > 0 ? 1 - Math.max(0, Math.min(1, a.health / a.maxHealth)) : 0.2;
  }
  def('absolute_axiom_domain', (T, K) => ({
    sky: [[0, '#000003'], [0.6, '#060010'], [1, '#14002a']],
    fog: '#05000c', fogSpan: 3600,
    light: { sky: '#c060ff', ground: '#200008', hemi: 0.9, key: '#ffd0e0', keyI: 1.2 },
    ground: { top: '#221832', backTop: '#140c20', face: ['#100818', '#08040c', '#180c22', '#cc0044'], deep: '#08040c', edge: '#cc0044',
      tile: { size: 150, paint: (g, w, h) => { g.strokeStyle = 'rgba(204,0,68,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 90); g.lineTo(50, 70); g.lineTo(90, 110); g.lineTo(128, 80); g.moveTo(60, 0); g.lineTo(70, 40); g.lineTo(50, 70); g.stroke(); } } },
    plat: { kind: 'block', top: '#180828', lip: '#cc0044', body: '#0c0414', glow: '#ff1a5a', depth: [50, 80], topH: 5 },
    dress(scene, K, rnd) {
      stars(K, rnd, { n: 600, size: 1.6, minEl: -0.2, colors: ['#ffffff', '#ff80b0', '#a080ff'] });
      const zones = [['#5aae4e', '#1d63c4'], ['#ffd27a', '#1a1d44'], ['#2f8034', '#0e2a14'], ['#eef6fb', '#6aa8d8'], ['#e8b870', '#d0702a'], ['#ff5a10', '#3d0800'], ['#ffffff', '#000000']];
      _aaPanes = [];
      zones.forEach(([a, b], i) => {
        const tex = K.canvasTex(128, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, b); gr.addColorStop(1, a); g.fillStyle = gr; g.fillRect(0, 0, w, h);
          g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 2; const r = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(i + 5); for (let k = 0; k < 5; k++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); } });
        const p = new T.Mesh(new T.PlaneGeometry(380, 760), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.55, fog: false, side: T.DoubleSide }));
        p.position.set(-900 + 257 + i * 514, 80, -1500 - (i % 2) * 300); p.rotation.z = (rnd() - 0.5) * 0.25; p.userData.r = p.rotation.z; p.userData.ph = rnd() * 6;
        scene.add(p); _aaPanes.push(p);
        wire(K, new T.PlaneGeometry(380, 760), '#ff1a5a', 0, 0, 0, 1).position.copy(p.position);
      });
      _aaBeams = shafts(K, rnd, { n: 6, color: 'rgba(255,40,100,', x0: -900, x1: 2700, top: 700, h: 1400, w: 60, z0: -900, z1: -300, opacity: 0.4, tilt: 0.2 });
      shafts(K, rnd, { n: 5, color: 'rgba(120,140,255,', x0: -900, x1: 2700, top: 700, h: 1400, w: 60, z0: -900, z1: -300, opacity: 0.35, tilt: -0.22 });
    },
    update(f) {
      const c = _aaChaos();
      if (_aaPanes) for (const p of _aaPanes) { p.rotation.z = p.userData.r * (1 + c * 3) + Math.sin(f * 0.01 + p.userData.ph) * 0.04 * c; p.material.opacity = 0.4 + c * 0.45; }
    },
    overlay: bossOverlay(null),
  }));

  // Megacity: a wide night skyline, blue-violet, towers with lit windows, steel walkways.
  def('megacity', (T, K) => ({
    sky: [[0, '#05050f'], [0.5, '#120a26'], [0.85, '#1a1a40'], [1, '#2a2a5a']],
    fog: '#1a1a3a',
    light: { sky: '#7a88d8', ground: '#1a1a30', hemi: 1.05, key: '#c8d4ff', keyI: 1.15 },
    ground: { top: '#3a3d52', backTop: '#30334a', face: ['#4a4d62', '#3a3d50', '#55586e', '#22242e'], deep: '#2a2c3a' },
    plat: { kind: 'block', top: '#5a6090', lip: '#9aa4d8', body: '#2e3250', depth: [50, 80], topH: 5 },
    platDress: piers({ style: 'girder', color: '#5a6080', cap: '#6a7090', r: 10, brace: true }),
    dress(scene, K, rnd) {
      stars(K, rnd, { n: 220, size: 1.5, minEl: 0.3 });
      buildings(K, rnd, { colors: ['#161a30', '#1c2038', '#12152a'], win: ['#ffd27a', '#b8d0ff', '#ffe9b0'], winP: 0.24, neon: ['#6a8aff', '#ff6ab0'], neonP: 0.2,
        rows: rowsAlong(1500, [{ step: 200, z: -1250, zJ: 250, wMin: 120, wMax: 190, hMin: 320, hMax: 760 }, { step: 280, z: -2100, zJ: 400, wMin: 180, wMax: 280, hMin: 600, hMax: 1500, glow: 0.8 }, { step: 520, z: -3600, zJ: 600, wMin: 300, wMax: 460, hMin: 900, hMax: 2200, glow: 0.6 }]) });
    },
  }));

  // Warpzone: violet space around a warp ring of tilted orbits, glassy violet ledges.
  let _wzRings = null;
  def('warpzone', (T, K) => ({
    sky: [[0, '#04000e'], [0.5, '#0d0024'], [0.85, '#1a0038'], [1, '#2a0858']],
    fog: '#120028', fogSpan: 4000,
    light: { sky: '#a080ff', ground: '#1a0838', hemi: 1.05, key: '#d8c8ff', keyI: 1.2 },
    ground: { top: '#2a1450', backTop: '#200c40', face: ['#2a1450', '#1a0838', '#3a1c68', '#b080ff'], deep: '#1a0838', edge: '#b080ff' },
    plat: { kind: 'block', top: '#4a2a8a', lip: '#b080ff', body: '#22104a', glow: '#9a60ff', depth: [50, 80], topH: 5 },
    dress(scene, K, rnd) {
      stars(K, rnd, { n: 800, size: 1.7, minEl: -0.2, colors: ['#ffffff', '#c8b0ff', '#80c8ff'] });
      const s = span(0);
      _wzRings = [];
      for (let k = 0; k < Math.ceil((s.R - s.L) / 1400); k++) {
        const cx = s.L + 700 + k * 1400;
        for (let i = 0; i < 4; i++) {
          const r = new T.Mesh(new T.TorusGeometry(260 + i * 40, 3, 6, 90), K.basic(i % 2 ? '#80c8ff' : '#c8a0ff', { fog: false }));
          r.position.set(cx, 220, -1900); r.rotation.set(1.1 + i * 0.3, i * 0.7, 0); r.userData.ph = i; scene.add(r); _wzRings.push(r);
        }
        glow(K, cx, 220, -1910, 700, 'rgba(90,160,255,');
      }
    },
    update(f) { if (_wzRings) _wzRings.forEach(r => { r.rotation.y += 0.004 + r.userData.ph * 0.001; }); },
  }));

  // Colosseum at night (the tenth-ring arena): torchlit arches, red banners, dark sand.
  function arcade(K, rnd, o) {
    const arches = (g, w, h) => {
      g.fillStyle = o.stone; g.fillRect(0, 0, w, h);
      for (const [top, ah] of [[18, 100], [140, 96]]) {
        g.fillStyle = o.hole; g.beginPath(); g.moveTo(24, top + ah); g.lineTo(24, top + 32); g.arc(w / 2, top + 32, w / 2 - 24, Math.PI, 0); g.lineTo(w - 24, top + ah); g.fill();
        g.fillStyle = o.ledge; g.fillRect(0, top + ah, w, 8);
      }
    };
    const s = span(1500), W = s.R - s.L;
    wall(K, { w: W, h: 560, x: (s.L + s.R) / 2, y: -480 + 280, z: -900, paint: arches, tw: 128, th: 256, rx: W / 256, ry: 1 });
    columns(K, rnd, { color: o.col, capColor: o.cap, rows: [{ n: Math.ceil(W / 256), x0: s.L + 128, step: 256, z: -870, h: 250, r: 13 }] });
    const T = K.T;
    for (let x = s.L + 256; x < s.R; x += 384) {
      const b = new T.Mesh(new T.PlaneGeometry(46, 150), new T.MeshToonMaterial({ color: o.banner, side: T.DoubleSide })); b.position.set(x, -480 + 420, -885); K.scene.add(b);
      if (o.torch) { box(K, K.toon('#3a2010'), x + 128, -480 + 150, -880, 8, 40, 8); glow(K, x + 128, -480 + 200, -870, 160, 'rgba(255,170,60,'); }
    }
  }
  def('colosseum10', (T, K) => ({
    sky: [[0, '#0a0400'], [0.5, '#1a0800'], [0.85, '#2d1000'], [1, '#4a2208']],
    fog: '#2d1404',
    light: { sky: '#ffb070', ground: '#3a1a08', hemi: 1.05, key: '#ffc890', keyI: 1.35 },
    ground: { top: '#8a5a30', backTop: '#7a4e28', face: ['#6a4020', '#5a3418', '#7a4a26', '#3a2010'], deep: '#4a2c14' },
    plat: { kind: 'block', top: '#a87040', lip: '#c88a50', body: '#6a4020', depth: [50, 90] },
    platDress: piers({ style: 'column', color: '#a87448', cap: '#c08a58', r: 14 }),
    dress(scene, K, rnd) {
      stars(K, rnd, { n: 160, size: 1.4, minEl: 0.35 });
      arcade(K, rnd, { stone: '#6a4428', hole: '#1a0a04', ledge: '#5a3820', col: '#8a5a34', cap: '#a06a3c', banner: '#a01a14', torch: true });
    },
  }));

  // Backyard (home): siding wall with windows and a sliding door, a fence along the top, lawn, a tree, flowers.
  def('homeYard', (T, K) => ({
    sky: [[0, '#5aaee8'], [0.6, '#9ad4f4'], [1, '#d0eeff']],
    fog: '#d0eaf8', fogNear: 400,
    sun: { dir: [-0.4, 0.6, -1], rays: false, size: 420 },
    ground: { top: '#78b850', face: ['#8f6038', '#7a5030', '#9c6a3e', '#4a2f1b'], deep: '#7a5232' },
    plat: { kind: 'block', top: '#c89a68', lip: '#e0b888', body: '#a07848', depth: [40, 70], topH: 5 },
    blades: ['#5a9a3a', '#7ac850', '#4a8a30'], floorBlades: 1200,
    dress(scene, K, rnd) {
      const siding = (g, w, h) => { g.fillStyle = '#e8d8b8'; g.fillRect(0, 0, w, h); g.fillStyle = '#d4c09c'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 2); };
      wall(K, { w: 1600, h: 420, x: 450, y: -480 + 210, z: -420, paint: siding, tw: 64, th: 64, rx: 25, ry: 7 });
      box(K, K.toon('#a8c8d8'), 450, -480, -418, 220, 260, 4); box(K, K.toon('#f0f0f0'), 450, -480 + 255, -417, 230, 8, 5);
      for (const x of [140, 760]) { box(K, K.toon('#f8f4e8'), x, -480 + 150, -418, 140, 120, 4); box(K, K.toon('#b8d4e4'), x, -480 + 158, -416, 120, 104, 4); }
      const fence = (g, w, h) => { g.fillStyle = '#c89a68'; g.fillRect(0, 0, w, h); g.fillStyle = '#a07848'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 2, h); g.fillRect(0, 10, w, 4); };
      wall(K, { w: 3000, h: 120, x: 450, y: -480 + 480, z: -430, paint: fence, tw: 64, th: 64, rx: 47, ry: 2 });
      trees(K, rnd, { shape: 'round', trunk: '#6a4428', crowns: ['#4a9a3c', '#5aae46'], rows: [{ n: 1, x0: 980, step: 1, z: -300, s: 2.2 }, { n: 14, x0: -1600, step: 300, z: -1400, zJ: 300, s: 2.4 }] });
      const fl = ['#ff6a8a', '#ffd04a', '#c86aff', '#ffffff'].map(c => K.toon(c));
      for (let i = 0; i < 18; i++) box(K, fl[i % 4], 40 + i * 9, -480 + 8, -360 + (i % 3) * 8, 6, 6, 6);
      box(K, K.toon('#7a5030'), 110, -480, -370, 180, 10, 30);
    },
  }));

  // Rooftop at night: tar roof, skyline beyond, a wooden water tower and vent units.
  def('homeRooftop', (T, K) => ({
    sky: [[0, '#06080f'], [0.5, '#0a0d18'], [0.85, '#141a28'], [1, '#2a3048']],
    fog: '#141a28',
    light: { sky: '#8a98c8', ground: '#1a1e28', hemi: 1.05, key: '#c8d4ff', keyI: 1.15 },
    sun: { dir: [-0.5, 0.55, -1], color: '#f4f1e0', size: 300, glow: 'rgba(200,215,255,' },
    ground: { top: '#3a3d44', backTop: '#33363c', face: ['#5a4a40', '#4a3c34', '#6a564a', '#22242a'], deep: '#3a302a', back: false, front: 260 },
    plat: { kind: 'block', top: '#4a4e58', lip: '#7a808c', body: '#30333c', depth: [50, 80], topH: 5 },
    dress(scene, K, rnd) {
      stars(K, rnd, { n: 200, size: 1.4, minEl: 0.3 });
      buildings(K, rnd, { colors: ['#141826', '#1a1e2e'], win: ['#ffd27a', '#ffe9b0'], winP: 0.24, base: -900,
        rows: rowsAlong(1500, [{ step: 220, z: -900, zJ: 300, wMin: 140, wMax: 200, hMin: 500, hMax: 1000 }, { step: 380, z: -2200, zJ: 500, wMin: 240, wMax: 380, hMin: 900, hMax: 1900, glow: 0.7 }]) });
      const s = span(0), wood = K.toon('#6a4a30');
      for (let x = s.L + 300; x < s.R; x += 1100) {
        box(K, wood, x, -480 + 90, -200, 70, 90, 70, true);
        const roof = new T.Mesh(new T.ConeGeometry(52, 40, 10), K.toon('#4a3a2a')); roof.position.set(x, -480 + 200, -200); scene.add(roof);
        for (const dx of [-28, 28]) box(K, K.toon('#2a2a2a'), x + dx, -480, -200, 4, 90, 4);
        box(K, K.toon('#5a5e66'), x + 500, -480, -180, 90, 50, 60, true);
      }
    },
  }));

  // Alley: brick walls close behind, green dumpsters, a door under a green lamp, pipes and a steam vent.
  def('homeAlley', (T, K) => ({
    sky: [[0, '#0e1220'], [0.6, '#1a2030'], [1, '#3a4050']],
    fog: '#1e2430', fogNear: 200,
    light: { sky: '#a0a8c0', ground: '#2a2a30', hemi: 1.1, key: '#ffe8c0', keyI: 1.2 },
    ground: { top: '#4a4c52', backTop: '#3e4046', face: ['#4a4c52', '#3a3c42', '#55575e', '#22242a'], deep: '#30323a' },
    plat: { kind: 'block', top: '#5a5c62', lip: '#7a7c84', body: '#3a3c42', depth: [40, 70], topH: 5 },
    dress(scene, K, rnd) {
      const brick = (g, w, h) => { g.fillStyle = '#5a3a32'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a2420'; for (let y = 0; y < h; y += 16) { g.fillRect(0, y, w, 2); for (let x = (y / 16) % 2 ? 0 : 16; x < w; x += 32) g.fillRect(x, y, 2, 16); } };
      const s = span(800);
      wall(K, { w: s.R - s.L, h: 1600, x: (s.L + s.R) / 2, y: -480 + 800, z: -260, paint: brick, tw: 64, th: 64, rx: (s.R - s.L) / 64, ry: 25 });
      const dump = K.toon('#2a8a3a');
      for (const x of [60, 840]) { box(K, dump, x, -480, -200, 110, 50, 60, true); box(K, K.toon('#1f6a2c'), x, -430, -200, 116, 6, 64); }
      box(K, K.toon('#2a4a3a'), 640, -480, -258, 70, 120, 4); box(K, K.basic('#60ff90', { fog: false }), 640, -480 + 132, -256, 30, 8, 4);
      glow(K, 640, -480 + 136, -250, 160, 'rgba(90,255,140,');
      const pipe = K.toon('#6a6a70');
      for (const x of [260, 520]) box(K, pipe, x, -480, -250, 8, 900, 8);
      glow(K, 470, -480 + 360, -250, 220, 'rgba(255,230,170,');
    },
  }));

  // Suburb: daytime street. Houses with gable roofs, round trees, street lamps, hills behind.
  def('suburb', (T, K) => ({
    sky: [[0, '#5aaee8'], [0.6, '#aad8f0'], [1, '#d8f0ff']],
    fog: '#cfe8f8',
    sun: { dir: [-0.45, 0.55, -1], rays: false, size: 420 },
    ground: { top: '#7cbf62', backTop: '#86c06c', face: ['#8f6038', '#7a5030', '#9c6a3e', '#4a2f1b'], deep: '#7a5232' },
    plat: { kind: 'block', top: '#9a9ca4', lip: '#c0c2c8', body: '#6a6c74', depth: [40, 70], topH: 5 },
    blades: ['#5a9a3a', '#7ac850', '#4a8a30'], floorBlades: 1000,
    dress(scene, K, rnd) {
      const s = span(900);
      box(K, K.toon('#8a8c92'), (s.L + s.R) / 2, -480, -260, s.R - s.L, 1, 120);
      const walls = ['#e8d8c0', '#d8b8a0', '#e0e0d0', '#c8a888'], roofs = ['#8a4a3a', '#6a4a40', '#a05a40', '#5a5a60'];
      let i = 0;
      for (let x = s.L + 200; x < s.R; x += 330 + rnd() * 120, i++) house(K, x, -560 - rnd() * 60, 170 + rnd() * 50, 130 + rnd() * 40, { wall: walls[i % 4], roof: roofs[i % 4] });
      trees(K, rnd, { shape: 'round', trunk: '#6a4428', crowns: ['#3f9a3c', '#52ad46', '#2f8034'], rows: rowsAlong(900, [{ step: 260, z: -420, zJ: 60, s: 1.4 }, { step: 300, z: -1300, zJ: 300, s: 2 }]) });
      hills(K, rnd, { n: 9, x0: -2500, step: 700, z: -2600, r: 600, h: 260, color: '#86c06c' });
      for (let x = s.L + 150; x < s.R; x += 520) { box(K, K.toon('#3a3c44'), x, -480, -330, 5, 140, 5); box(K, K.basic('#fff4d0'), x, -480 + 136, -330, 14, 6, 10); }
    },
  }));

  // Rural: golden hour farm. Red barn, grain silo, windmill, wheat field, low sun.
  let _ruBlades = null;
  def('rural', (T, K) => ({
    sky: [[0, '#e0801a'], [0.5, '#f0b030'], [1, '#f8d880']],
    fog: '#f0c060',
    light: { sky: '#ffd890', ground: '#a06a30', hemi: 1.35, key: '#fff0c0', keyI: 1.8 },
    sun: { dir: [0.35, 0.28, -1], rays: true, color: '#fff6d0', size: 760, glow: 'rgba(255,230,150,' },
    ground: { top: '#c8a058', backTop: '#d8b060', face: ['#8a6038', '#7a5030', '#9a6a40', '#4a2f1b'], deep: '#7a5232' },
    plat: { kind: 'block', top: '#a87848', lip: '#c89860', body: '#7a5230', depth: [40, 70], topH: 5 },
    blades: ['#e0b048', '#c89838', '#f0c860'], floorBlades: 1800,
    dress(scene, K, rnd) {
      const barnM = K.toon('#a8281c');
      box(K, barnM, 450, -480, -700, 360, 220, 240, true);
      const roof = new T.Mesh(new T.CylinderGeometry(150, 150, 362, 3, 1), K.toon('#4a2a20')); roof.rotation.z = Math.PI / 2; roof.rotation.x = Math.PI / 6; roof.position.set(450, -480 + 260, -700); roof.scale.set(1, 1, 1.15); scene.add(roof);
      box(K, K.toon('#f0e8d8'), 450, -480, -578, 120, 150, 2); box(K, barnM, 450, -480, -577, 100, 130, 2);
      const silo = new T.Mesh(new T.CylinderGeometry(70, 70, 380, 20), K.toon('#c8c4b8')); silo.position.set(760, -480 + 190, -760); silo.castShadow = true; scene.add(silo);
      const dome = new T.Mesh(new T.SphereGeometry(70, 20, 10, 0, 7, 0, Math.PI / 2), K.toon('#a8a49c')); dome.position.set(760, -480 + 380, -760); scene.add(dome);
      for (const [x, z] of [[100, -900]]) {
        box(K, K.toon('#3a3028'), x, -480, z, 8, 360, 8);
        const hub = new T.Group(); hub.position.set(x, -480 + 360, z + 8); scene.add(hub);
        for (let k = 0; k < 8; k++) { const b = new T.Mesh(new T.BoxGeometry(4, 120, 1), K.toon('#3a3028')); b.position.y = 60; const p = new T.Group(); p.rotation.z = k * Math.PI / 4; p.add(b); hub.add(p); }
        _ruBlades = hub;
      }
      hills(K, rnd, { n: 9, x0: -2500, step: 700, z: -2200, r: 600, h: 160, color: '#d8a850' });
    },
    update(f) { if (_ruBlades) _ruBlades.rotation.z = f * 0.01; },
  }));

  // Portal Edge: violet night at the world's rim. Black crystal spires, stars, a shooting star.
  def('portalEdge', (T, K) => ({
    sky: [[0, '#030008'], [0.5, '#100030'], [0.85, '#1a0050'], [1, '#3a0a80']],
    fog: '#1a0040',
    light: { sky: '#a070ff', ground: '#1a0838', hemi: 1.05, key: '#d8c8ff', keyI: 1.2 },
    ground: { top: '#2a1a4a', backTop: '#22143c', face: ['#22143c', '#180c2c', '#2e1c50', '#9a60ff'], deep: '#180c2c' },
    plat: { kind: 'block', top: '#3a2a6a', lip: '#8a6ad8', body: '#1e1238', depth: [50, 80], topH: 5 },
    dress(scene, K, rnd) {
      stars(K, rnd, { n: 900, size: 1.7, minEl: 0.05, colors: ['#ffffff', '#d0c0ff'] });
      const s = span(1500);
      crystals(K, rnd, { n: Math.round((s.R - s.L) / 120), colors: ['#140828', '#1e0c3a', '#2a1050'], hMin: 120, hMax: 520, x0: s.L, x1: s.R, z0: -1600, z1: -400, glow: 0.05 });
      glow(K, 450, -500, -3000, 5000, 'rgba(140,60,255,');
    },
  }));

  // Realm Entry: the threshold under deep blue light, glowing seams in the floor, light curtains.
  def('realmEntry', (T, K) => ({
    sky: [[0, '#000510'], [0.5, '#000e2a'], [1, '#00245a']],
    fog: '#001a40', fogSpan: 2400,
    light: { sky: '#60a0ff', ground: '#001030', hemi: 1.2, key: '#b0d0ff', keyI: 1.3 },
    ground: { top: '#0a2a5a', backTop: '#08224a', face: ['#082048', '#061838', '#0c2a5a', '#4ab0ff'], deep: '#061838', edge: '#4ab0ff',
      tile: { size: 140, paint: (g, w, h) => { g.strokeStyle = 'rgba(90,180,255,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 70); g.lineTo(60, 70); g.lineTo(80, 30); g.lineTo(128, 30); g.stroke(); } } },
    plat: { kind: 'block', top: '#1a4a8a', lip: '#6ac0ff', body: '#0a2a5a', glow: '#4ab0ff', depth: [50, 80], topH: 5 },
    dress(scene, K, rnd) {
      const s = span(1200);
      shafts(K, rnd, { n: Math.round((s.R - s.L) / 260), color: 'rgba(90,170,255,', x0: s.L, x1: s.R, top: 800, h: 1600, w: 50, z0: -1200, z1: -300, opacity: 0.35, tilt: 0 });
      crystals(K, rnd, { n: Math.round((s.R - s.L) / 160), colors: ['#1a5aaa', '#2a7ad8'], hMin: 60, hMax: 260, x0: s.L, x1: s.R, z0: -1400, z1: -500, glow: 0.4 });
    },
  }));

  // Boss Sanctum: crimson hall. Tall pillars, braziers, floating embers, red-rimmed ledges.
  let _bsEmbers = null;
  def('bossSanctum', (T, K) => ({
    sky: [[0, '#050001'], [0.5, '#120006'], [1, '#30000e']],
    fog: '#1a0008', fogNear: 200,
    light: { sky: '#ff6070', ground: '#200008', hemi: 1.0, key: '#ffc0b0', keyI: 1.25 },
    ground: { top: '#3a1018', backTop: '#2a0a12', face: ['#2a0a12', '#1c060c', '#3a0e18', '#ff2a4a'], deep: '#1c060c', edge: '#c01030' },
    plat: { kind: 'block', top: '#4a1424', lip: '#ff3a5a', body: '#24080e', glow: '#d01838', depth: [50, 80], topH: 5 },
    dress(scene, K, rnd) {
      columns(K, rnd, { color: '#3a0e16', capColor: '#5a1a24', rows: rowsAlong(1200, [{ step: 360, z: -500, h: 1200, r: 34 }, { step: 600, z: -1300, h: 1800, r: 60, lintel: true }]) });
      const s = span(400);
      for (let x = s.L + 200; x < s.R; x += 600) { box(K, K.toon('#2a0a10'), x, -480, -300, 26, 60, 26); glow(K, x, -480 + 80, -295, 220, 'rgba(255,120,40,'); }
      _bsEmbers = floaters(K, rnd, { geo: 'shard', n: 70, colors: ['#ff3a3a', '#ff8a40'], opacity: 0.7, sMin: 2, sMax: 5, x0: s.L, x1: s.R, y0: -480, y1: 300, z0: -1200, z1: -80 });
    },
    update(f) { if (_bsEmbers) for (const m of _bsEmbers) m.position.y = m.userData.y + ((f * 0.4 + m.userData.ph * 120) % 780) - 100; },
  }));

  // Shared concrete floor for the story interiors.
  const CONCRETE = { top: '#5a5d62', backTop: '#4a4d52', face: ['#4a4d52', '#3a3d42', '#55585e', '#22242a'], deep: '#33363a' };
  const SLAB = { kind: 'block', top: '#7a7d84', lip: '#9a9da4', body: '#4a4d54', depth: [50, 80], topH: 5 };

  // Lab: green-grey hall. Glass specimen tubes (one holds a figure), monitors, a hazard stripe along the wall.
  def('storyLab', (T, K) => ({
    sky: [[0, '#080b0c'], [0.6, '#121819'], [1, '#1e2628']],
    fog: '#141a1c', fogNear: 200,
    light: { sky: '#b0d8d0', ground: '#1a2020', hemi: 1.2, key: '#e0fff0', keyI: 1.3 },
    ground: CONCRETE, plat: SLAB,
    platDress: piers({ style: 'girder', color: '#5a6a68', cap: '#6a7a78', r: 10, brace: true }),
    dress(scene, K, rnd) {
      const panel = (g, w, h) => { g.fillStyle = '#2a3234'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1a2022'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4); g.fillStyle = '#e0b020'; for (let x = -h; x < w; x += 24) { g.save(); g.beginPath(); g.rect(0, h - 18, w, 18); g.clip(); g.fillRect(x, h - 18, 12, 18); g.restore(); } };
      wall(K, { w: 4000, h: 700, x: 450, y: -480 + 350, z: -500, paint: panel, tw: 128, th: 128, rx: 31, ry: 5 });
      const glass = new T.MeshPhongMaterial({ color: '#60d0b0', transparent: true, opacity: 0.35, shininess: 90 });
      for (const x of [120, 340, 560, 780]) {
        const t = new T.Mesh(new T.CylinderGeometry(42, 42, 300, 24, 1, true), glass); t.position.set(x, -480 + 150, -420); scene.add(t);
        box(K, K.toon('#3a4446'), x, -480, -420, 100, 14, 100); box(K, K.toon('#3a4446'), x, -480 + 300, -420, 100, 14, 100);
        glow(K, x, -480 + 150, -410, 260, 'rgba(90,255,200,');
      }
      for (const x of [-250, 1150]) { box(K, K.basic('#2a9a60', { fog: false }), x, -480 + 200, -495, 220, 130, 4); }
    },
  }));

  // Relay: a lattice transmission tower over a fenced yard, city silhouette at dusk.
  def('storyRelay', (T, K) => ({
    sky: [[0, '#0a0e16'], [0.6, '#141b26'], [1, '#2a3646']],
    fog: '#1f2a36',
    light: { sky: '#a0b4d0', ground: '#1a1e26', hemi: 1.1, key: '#d8e4ff', keyI: 1.2 },
    ground: CONCRETE, plat: SLAB,
    platDress: piers({ style: 'girder', color: '#5a6478', cap: '#6a7488', r: 9, brace: true }),
    dress(scene, K, rnd) {
      buildings(K, rnd, { colors: ['#121822', '#161e2a'], win: ['#ffd27a'], winP: 0.12, rows: [{ n: 20, x0: -2400, step: 280, z: -2200, zJ: 400, wMin: 180, wMax: 280, hMin: 300, hMax: 800, glow: 0.6 }] });
      const steel = '#3a4250';
      const tower = new T.Group(); scene.add(tower); tower.position.set(200, -480, -700);
      const legs = [[-90, -90], [90, -90], [-90, 90], [90, 90]];
      const lm = new T.LineBasicMaterial({ color: steel }), pts = [];
      for (let i = 0; i < 8; i++) { const y0 = i * 80, y1 = y0 + 80, k0 = 1 - i * 0.11, k1 = 1 - (i + 1) * 0.11;
        for (let j = 0; j < 4; j++) { const a = legs[j], b = legs[(j + 1) % 4]; pts.push(a[0] * k0, y0, a[1] * k0, a[0] * k1, y1, a[1] * k1, a[0] * k0, y0, a[1] * k0, b[0] * k1, y1, b[1] * k1, a[0] * k1, y1, a[1] * k1, b[0] * k1, y1, b[1] * k1); } }
      pts.push(-160, 560, 0, 160, 560, 0, -120, 620, 0, 120, 620, 0);
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pts, 3)); tower.add(new T.LineSegments(g, lm));
      const fence = (gg, w, h) => { gg.clearRect(0, 0, w, h); gg.strokeStyle = 'rgba(90,100,110,0.9)'; gg.lineWidth = 1.5; for (let x = -h; x < w; x += 10) { gg.beginPath(); gg.moveTo(x, h); gg.lineTo(x + h, 0); gg.moveTo(x + h, h); gg.lineTo(x, 0); gg.stroke(); } };
      const f = wall(K, { w: 3000, h: 90, x: 450, y: -480 + 45, z: -330, paint: fence, tw: 64, th: 64, rx: 47, ry: 1 }); f.material.transparent = true;
      box(K, K.toon('#4a4e56'), 560, -480, -420, 220, 120, 120, true); box(K, K.basic('#ffc860'), 520, -480 + 60, -359, 40, 24, 2); box(K, K.basic('#ffc860'), 600, -480 + 60, -359, 40, 24, 2);
    },
  }));

  // Core: a dark machine hall around a hanging orb in orbit rings.
  let _coRings = null;
  def('storyCore', (T, K) => ({
    sky: [[0, '#04030a'], [0.6, '#0d0b1a'], [1, '#1a1630']],
    fog: '#100e1e', fogNear: 200,
    light: { sky: '#a0a0e0', ground: '#14121e', hemi: 1.05, key: '#d8d8ff', keyI: 1.2 },
    ground: CONCRETE, plat: SLAB,
    dress(scene, K, rnd) {
      columns(K, rnd, { color: '#1e1c2e', capColor: '#2a2840', rows: [{ n: 9, x0: -700, step: 300, z: -600, h: 1100, r: 22 }] });
      const orb = new T.Mesh(new T.SphereGeometry(110, 32, 20), new T.MeshToonMaterial({ color: '#2a2a48', emissive: '#4a4a90', emissiveIntensity: 0.4 }));
      orb.position.set(450, 0, -900); scene.add(orb); glow(K, 450, 0, -890, 500, 'rgba(160,160,255,');
      _coRings = [0, 1, 2].map(i => { const r = new T.Mesh(new T.TorusGeometry(220 + i * 70, 2.5, 6, 100), K.basic('#c8c8ff', { fog: false })); r.position.copy(orb.position); r.rotation.set(1.3 + i * 0.15, 0.2 * i, 0); scene.add(r); return r; });
    },
    update(f) { if (_coRings) _coRings.forEach((r, i) => { r.rotation.z = f * (0.003 + i * 0.001); }); },
  }));

  // Assembly: grey stone hall, heavy pillars, hanging banners (blue, gold, green, red), a dais.
  def('storyAssembly', (T, K) => ({
    sky: [[0, '#141518'], [0.6, '#2a2c32'], [1, '#3a3c42']],
    fog: '#2a2c32', fogNear: 200,
    light: { sky: '#d0d4e0', ground: '#2a2a30', hemi: 1.25, key: '#fff4e0', keyI: 1.35 },
    ground: CONCRETE, plat: SLAB,
    platDress: piers({ style: 'block', color: '#8a8c96', cap: '#a0a2ac', r: 15 }),
    dress(scene, K, rnd) {
      columns(K, rnd, { color: '#4a4c54', capColor: '#5a5c64', rows: [{ n: 7, x0: -300, step: 250, z: -500, h: 1000, r: 34, lintel: true }] });
      box(K, K.toon('#33353c'), 450, -480, -700, 4000, 1200, 20);
      const cols = ['#4a6a9a', '#d0a040', '#4a8a5a', '#a03a30'];
      [-175, 75, 825, 1075].forEach((x, i) => { const b = new T.Mesh(new T.PlaneGeometry(70, 260), new T.MeshToonMaterial({ color: cols[i], side: T.DoubleSide })); b.position.set(x, -480 + 520, -480); scene.add(b); });
      box(K, K.toon('#5a5c64'), 450, -480, -620, 300, 20, 100); box(K, K.toon('#5a5c64'), 450, -460, -640, 220, 20, 60);
    },
  }));

  // Interference: night city in black and grey, red searchlights sweeping, red signal bands on the towers.
  let _inBeams = null;
  def('storyInterference', (T, K) => ({
    sky: [[0, '#040306'], [0.6, '#110d14'], [1, '#221a26']],
    fog: '#1a1219',
    light: { sky: '#c0a0b0', ground: '#14101a', hemi: 1.0, key: '#ffd8e0', keyI: 1.1 },
    ground: CONCRETE, plat: SLAB,
    dress(scene, K, rnd) {
      buildings(K, rnd, { colors: ['#1a1620', '#221c2a', '#141018'], win: ['#c02030', '#601018'], style: 'bands', winP: 0.1,
        rows: [{ n: 16, x0: -1100, step: 190, z: -900, zJ: 250, wMin: 120, wMax: 180, hMin: 400, hMax: 900 }, { n: 20, x0: -2400, step: 280, z: -1900, zJ: 400, wMin: 180, wMax: 280, hMin: 700, hMax: 1500, glow: 0.7 }] });
      _inBeams = shafts(K, rnd, { n: 3, color: 'rgba(255,40,60,', x0: -200, x1: 1100, top: 1100, h: 1700, w: 120, z0: -800, z1: -500, opacity: 0.4, tilt: 0.3 });
    },
    update(f) { if (_inBeams) _inBeams.forEach((b, i) => { b.rotation.z = Math.sin(f * 0.006 + i * 2) * 0.45; }); },
  }));

  // War: smoke-orange dusk over a front line. Sandbags, wire, a tank silhouette, smoke columns, a torn flag.
  def('storyWar', (T, K) => ({
    sky: [[0, '#1a0e08'], [0.5, '#3a1e10'], [0.85, '#6a3a1c'], [1, '#a05a28']],
    fog: '#5a321a',
    light: { sky: '#ffb080', ground: '#3a2010', hemi: 1.1, key: '#ffd0a0', keyI: 1.4 },
    ground: { top: '#5a4a3a', backTop: '#4a3c2e', face: ['#4a3a2a', '#3a2c20', '#5a4632', '#22180e'], deep: '#33261a' },
    plat: { kind: 'block', top: '#6a5a48', lip: '#8a7860', body: '#4a3c2e', depth: [50, 80], topH: 5 },
    platDress: piers({ style: 'post', color: '#6a5440', cap: '#7a6450', r: 9 }),
    dress(scene, K, rnd) {
      const bag = new T.SphereGeometry(1, 12, 8), bagM = K.toon('#8a7858');
      for (let i = 0; i < 40; i++) { const b = new T.Mesh(bag, bagM); b.scale.set(22, 11, 14); b.position.set(-100 + (i % 20) * 30 + (i >= 20 ? 15 : 0), -480 + 10 + (i >= 20 ? 18 : 0), -300); b.castShadow = true; scene.add(b); }
      const tank = K.toon('#2a2018');
      box(K, tank, 800, -480, -650, 300, 70, 160, true); box(K, tank, 780, -410, -650, 160, 50, 120, true);
      const gun = new T.Mesh(new T.CylinderGeometry(7, 7, 220, 8), tank); gun.rotation.z = Math.PI / 2 - 0.2; gun.position.set(650, -370, -650); scene.add(gun);
      for (let i = 0; i < 5; i++) shafts(K, rnd, { n: 1, color: 'rgba(60,40,30,', x0: -800 + i * 600, x1: -700 + i * 600, top: 900, h: 1400, w: 160, z0: -1800, z1: -1200, opacity: 0.7, tilt: 0.15 }).forEach(m => { m.material.blending = T.NormalBlending; });
      box(K, K.toon('#3a3028'), -150, -480, -350, 5, 220, 5);
      const flag = new T.Mesh(new T.PlaneGeometry(90, 50), new T.MeshToonMaterial({ color: '#8a2a20', side: T.DoubleSide })); flag.position.set(-105, -480 + 195, -350); scene.add(flag);
      glow(K, 450, -300, -2600, 2600, 'rgba(255,120,40,');
    },
  }));

  // Flux: teal-grey dusk where land has come loose. Inverted floating islands, a waterfall falling from one.
  let _fxIsles = null;
  def('storyFlux', (T, K) => ({
    sky: [[0, '#0e1a26'], [0.5, '#1a2e40'], [1, '#3c5a70']],
    fog: '#2c4658',
    light: { sky: '#b0d8f0', ground: '#2a3a40', hemi: 1.25, key: '#e8f4ff', keyI: 1.4 },
    ground: CONCRETE, plat: SLAB,
    dress(scene, K, rnd) {
      _fxIsles = [];
      for (let i = 0; i < 9; i++) {
        const g = new T.Group(), w = 120 + rnd() * 200;
        const top = new T.Mesh(new T.CylinderGeometry(w * 0.5, w * 0.5, 14, 9), K.toon('#4a7a4a'));
        const rock = new T.Mesh(new T.ConeGeometry(w * 0.48, w * 0.9, 7), K.toon('#4a4a50')); rock.rotation.x = Math.PI; rock.position.y = -w * 0.45 - 7;
        g.add(top, rock); g.position.set(-900 + i * 340 + rnd() * 120, 100 + rnd() * 500, -900 - rnd() * 900); g.userData.y = g.position.y; g.userData.ph = rnd() * 6;
        scene.add(g); _fxIsles.push(g);
      }
      shafts(K, rnd, { n: 1, color: 'rgba(170,220,255,', x0: 640, x1: 640, top: 380, h: 860, w: 50, z0: -600, z1: -600, opacity: 0.8, tilt: 0 });
      glow(K, 640, -470, -590, 260, 'rgba(170,220,255,');
      const ring = new T.Mesh(new T.TorusGeometry(700, 2, 6, 120), K.basic('#a0c8e0', { transparent: true, opacity: 0.4, fog: false })); ring.position.set(450, 200, -1400); ring.rotation.x = 1.35; scene.add(ring);
    },
    update(f) { if (_fxIsles) for (const g of _fxIsles) { g.position.y = g.userData.y + Math.sin(f * 0.01 + g.userData.ph) * 12; g.rotation.y += 0.0008; } },
  }));

  // Shadow: near-black gothic hall, pointed arches, a single pale light from above.
  def('storyShadow', (T, K) => ({
    sky: [[0, '#010102'], [0.6, '#07070b'], [1, '#12121a']],
    fog: '#0a0a10', fogNear: 100,
    light: { sky: '#8088a8', ground: '#08080c', hemi: 0.9, key: '#d0d8ff', keyI: 1.1 },
    ground: CONCRETE, plat: SLAB,
    platDress: piers({ style: 'column', color: '#4a4a5c', cap: '#5a5a6e', r: 13 }),
    dress(scene, K, rnd) {
      const arch = (g, w, h) => { g.fillStyle = '#121218'; g.fillRect(0, 0, w, h); g.fillStyle = '#050507'; g.beginPath(); g.moveTo(30, h); g.lineTo(30, h * 0.45); g.quadraticCurveTo(w / 2, -h * 0.05, w - 30, h * 0.45); g.lineTo(w - 30, h); g.fill(); };
      wall(K, { w: 4800, h: 900, x: 450, y: -480 + 450, z: -600, paint: arch, tw: 128, th: 256, rx: 24, ry: 1 });
      columns(K, rnd, { color: '#16161e', capColor: '#1e1e28', rows: [{ n: 24, x0: -1950, step: 200, z: -580, h: 700, r: 12 }] });
      shafts(K, rnd, { n: 1, color: 'rgba(200,210,255,', x0: 450, x1: 450, top: 800, h: 1400, w: 260, z0: -500, z1: -500, opacity: 0.35, tilt: 0 });
    },
  }));

  // Titan: brown dust plain of a fallen giant. Broken pillars, a huge sword driven into the ground, a helm.
  def('storyTitan', (T, K) => ({
    sky: [[0, '#2a1a12'], [0.5, '#4a2e1e'], [1, '#8a6a48']],
    fog: '#6a4630',
    light: { sky: '#ffd8b0', ground: '#4a3020', hemi: 1.25, key: '#fff0d8', keyI: 1.6 },
    ground: { top: '#8a6a4a', backTop: '#7a5c40', face: ['#6a4c34', '#5a4028', '#7a5a3e', '#3a2818'], deep: '#4a3424' },
    plat: { kind: 'block', top: '#9a8060', lip: '#b89a78', body: '#6a5440', depth: [50, 80], topH: 5 },
    platDress: piers({ style: 'column', color: '#9a7e60', cap: '#b09474', r: 14 }),
    dress(scene, K, rnd) {
      columns(K, rnd, { color: '#a08868', capColor: '#b89c7c', broken: 0.5, rows: [{ n: 3, x0: 40, step: 120, z: -420, h: 480, r: 36 }, { n: 8, x0: -1400, step: 500, z: -1600, h: 900, r: 60 }] });
      const steel = K.toon('#8a94a0');
      const blade = new T.Mesh(new T.BoxGeometry(70, 900, 14), steel); blade.position.set(640, -480 + 300, -700); blade.rotation.z = -0.35; blade.castShadow = true; scene.add(blade);
      const guard = new T.Mesh(new T.BoxGeometry(260, 30, 30), K.toon('#5a4a3a')); guard.position.set(640 + Math.sin(0.35) * 450, -480 + 300 + Math.cos(0.35) * 450, -700); guard.rotation.z = -0.35; scene.add(guard);
      const helm = new T.Mesh(new T.SphereGeometry(140, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), K.toon('#9a8a70')); helm.position.set(600, -480, -420); helm.rotation.z = 0.2; helm.castShadow = true; scene.add(helm);
    },
  }));

  // Null: a blueprint void. Faint grid walls, wireframe solids hanging in the air, pale ledges.
  let _nuShapes = null;
  def('storyNull', (T, K) => ({
    sky: [[0, '#04030c'], [0.6, '#080614'], [1, '#141030']],
    fog: '#0c0a1e', fogSpan: 3200,
    light: { sky: '#a0a8ff', ground: '#0c0a1e', hemi: 1.0, key: '#d8dcff', keyI: 1.1 },
    ground: { top: '#1a1838', backTop: '#141230', face: ['#14122e', '#0e0c24', '#1c1a3c', '#8088c8'], deep: '#0e0c24', edge: '#8088c8',
      tile: { size: 60, paint: (g, w, h) => { g.strokeStyle = 'rgba(130,140,220,0.45)'; g.lineWidth = 1.5; g.strokeRect(0, 0, w, h); } } },
    plat: { kind: 'block', top: '#3a3a6a', lip: '#a0a8e8', body: '#1c1c3a', depth: [50, 80], topH: 5 },
    dress(scene, K, rnd) {
      const grid = (g, w, h) => { g.fillStyle = '#0a0818'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(120,130,220,0.35)'; g.lineWidth = 1; g.strokeRect(0, 0, w, h); };
      wall(K, { w: 5000, h: 1800, x: 450, y: 300, z: -1300, paint: grid, tw: 64, th: 64, rx: 80, ry: 28 });
      _nuShapes = [];
      const geos = [new T.BoxGeometry(1, 1, 1), new T.IcosahedronGeometry(0.7, 1), new T.ConeGeometry(0.6, 1, 4), new T.SphereGeometry(0.6, 12, 8), new T.TorusGeometry(0.5, 0.15, 6, 16)];
      for (let i = 0; i < 14; i++) { const l = wire(K, geos[i % geos.length], '#a0a8ff', -700 + rnd() * 2400, -200 + rnd() * 700, -1100 + rnd() * 700, 60 + rnd() * 90, 0.7); l.userData.s = (rnd() - 0.5) * 0.01; _nuShapes.push(l); }
    },
    update() { if (_nuShapes) for (const l of _nuShapes) { l.rotation.y += l.userData.s; l.rotation.x += l.userData.s * 0.5; } },
  }));

  // Quiet: still teal night. Dead trees, leaning power poles with slack wires, mist on the ground.
  def('storyQuiet', (T, K) => ({
    sky: [[0, '#010506'], [0.6, '#051216'], [1, '#12282c']],
    fog: '#0a1c20', fogNear: 100,
    light: { sky: '#90c0c0', ground: '#0a1414', hemi: 1.0, key: '#d0f0f0', keyI: 1.0 },
    ground: { top: '#2a3a3a', backTop: '#223030', face: ['#223030', '#182424', '#2a3838', '#0a1010'], deep: '#182424' },
    plat: { kind: 'block', top: '#4a5a5a', lip: '#6a7c7c', body: '#2a3838', depth: [50, 80], topH: 5 },
    platDress: piers({ style: 'post', color: '#4e6060', cap: '#5e7070', r: 8 }),
    dress(scene, K, rnd) {
      trees(K, rnd, { shape: 'dead', trunk: '#0e1a1a', rows: [{ n: 10, x0: -800, step: 300, z: -500, zJ: 300, s: 1.5, sJ: 0.6 }, { n: 12, x0: -1800, step: 380, z: -1400, zJ: 400, s: 2.4, sJ: 0.8 }] });
      const pole = K.toon('#1a2626'), wpts = [];
      for (let i = 0; i < 7; i++) { const x = -600 + i * 360, h = 380; const p = box(K, pole, x, -480, -350, 6, h, 6); p.rotation.z = (rnd() - 0.5) * 0.12; box(K, pole, x, -480 + h - 30, -350, 70, 5, 5);
        if (i) for (const dy of [-30, -18]) { const x0 = x - 360; for (let k = 0; k < 10; k++) { const t0 = k / 10, t1 = (k + 1) / 10; wpts.push(x0 + 360 * t0, -480 + h + dy - Math.sin(t0 * Math.PI) * 30, -350, x0 + 360 * t1, -480 + h + dy - Math.sin(t1 * Math.PI) * 30, -350); } } }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(wpts, 3)); scene.add(new T.LineSegments(g, new T.LineBasicMaterial({ color: '#2a4040' })));
    },
  }));

  // Coast: moonlit sea under a giant curling wave, a dark headland on the left.
  let _coWave = null;
  def('storyCoast', (T, K) => ({
    sky: [[0, '#01030a'], [0.5, '#06102a'], [1, '#1a2c50']],
    fog: '#0e1c3a',
    light: { sky: '#90b0ff', ground: '#0a1430', hemi: 1.1, key: '#d8e4ff', keyI: 1.2 },
    sun: { dir: [0.2, 0.5, -1], color: '#f4f6ff', size: 300, glow: 'rgba(200,220,255,' },
    ground: { top: '#3a4048', backTop: '#30363e', face: ['#3a4048', '#2c3238', '#444a52', '#1a1e24'], deep: '#2c3238', back: false },
    plat: { kind: 'block', top: '#5a6068', lip: '#7a8088', body: '#3a4048', depth: [50, 80], topH: 5 },
    platDress: piers({ style: 'post', color: '#5a5450', cap: '#6a6460', r: 9 }),
    liquid: { y: 500, kind: 'water', color: '#0a1e40', veins: ['rgba(120,170,255,0.25)', 'rgba(0,10,30,0.4)'], flowX: 0.0002, flowZ: 0.0006 },
    dress(scene, K, rnd) {
      stars(K, rnd, { n: 300, size: 1.4, minEl: 0.3 });
      const wave = new T.Mesh(new T.TorusGeometry(700, 260, 16, 48, Math.PI * 1.1), new T.MeshToonMaterial({ color: '#2a5a9a', emissive: '#0a2a5a', emissiveIntensity: 0.4 }));
      wave.position.set(700, -200, -3200); wave.rotation.set(0, 0, 0.1); wave.scale.set(1.4, 1, 0.6); scene.add(wave); _coWave = wave;
      const crest = new T.Mesh(new T.TorusGeometry(700, 40, 8, 48, Math.PI * 1.1), K.basic('#e0f0ff', { fog: false })); crest.position.copy(wave.position); crest.scale.copy(wave.scale); crest.position.y += 4; scene.add(crest);
      range(K, rnd, { n: 3, x0: -1400, step: 300, z: -900, zJ: 200, hMin: 500, hMax: 900, wide: 0.9, base: -500, lit: '#1a2230', shade: '#0e141c', foot: '#1a2438' });
    },
  }));

  // Collision: burnt orange sky as worlds hit. A tilted tower, a slab of green land jammed into the plain, meteors.
  let _clRocks = null;
  def('storyCollision', (T, K) => ({
    sky: [[0, '#100400'], [0.5, '#241006'], [0.85, '#44200c'], [1, '#8a4418']],
    fog: '#44200c',
    light: { sky: '#ffa060', ground: '#2a1006', hemi: 1.1, key: '#ffc890', keyI: 1.4 },
    ground: { top: '#6a4a30', backTop: '#5a3e28', face: ['#5a3e28', '#4a301e', '#6a4a30', '#2a180c'], deep: '#4a301e' },
    plat: { kind: 'block', top: '#7a5a3e', lip: '#9a7656', body: '#4a3424', depth: [50, 80], topH: 5 },
    platDress: piers({ style: 'prism', color: '#6a4c36', cap: '#7c5c44', r: 14 }),
    dress(scene, K, rnd) {
      const tw = box(K, new T.MeshToonMaterial({ color: '#3a3a40', emissive: '#ffffff', emissiveMap: (() => { const t = K.canvasTex(64, 128, (g) => { g.fillStyle = '#000'; g.fillRect(0, 0, 64, 128); g.fillStyle = '#ffb860'; for (let y = 6; y < 120; y += 14) for (let x = 6; x < 60; x += 12) if ((x * y) % 7 < 3) g.fillRect(x, y, 6, 7); }); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, 4); return t; })() }), -150, -520, -700, 220, 700, 200, true);
      tw.rotation.z = 0.32;
      const slab2 = box(K, K.toon('#5a7a3a'), 720, -520, -600, 420, 60, 220, true); slab2.rotation.z = -0.25;
      box(K, K.toon('#5a3e28'), 720, -580, -600, 400, 60, 200).rotation.z = -0.25;
      _clRocks = floaters(K, rnd, { n: 12, colors: ['#3a2a20', '#4a3626'], sMin: 14, sMax: 40, x0: -600, x1: 1600, y0: 200, y1: 900, z0: -2000, z1: -900 });
      for (const r of _clRocks) r.userData.v = 2 + rnd() * 3;
      glow(K, 450, -300, -2600, 2600, 'rgba(255,110,30,');
    },
    update(f) { if (_clRocks) for (const r of _clRocks) { r.position.y -= r.userData.v; r.position.x += r.userData.v * 0.6; r.rotation.x += 0.02; if (r.position.y < -500) { r.position.y = 900; r.position.x -= 1300; } } },
  }));
})();
