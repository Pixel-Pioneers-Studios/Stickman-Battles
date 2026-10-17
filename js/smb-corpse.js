'use strict';
// smb-corpse.js: how a body looks once the death animation lets go of it.
// VerletRagdoll (smb-verlet.js) owns the physics, this file owns the look.
// Depends on smb-verlet.js, smb-figure-skin.js and smb-globals.js.
// The style comes from the finisher that landed (corpseStampFinisher, via triggerFinisher),
// or from the killer's weapon for ordinary kills, where destructive styles are toned down (CORPSE_MILD).
//
// A style: { k, color, cuts, n, shaft }
//   k      plain look when absent; else char | sliced | shattered | blast | shock |
//          pierced | riddled | crushed | void | scarred | ko | frozen
//   cuts   for sliced / shattered / blast: any of head, armR, armL, legR, legL, waist
//   n      how many shafts / holes / scars
//   shaft  for pierced: arrow | bolt | knife | spear | plane

const CORPSE_LIFE_STYLED = 380;     // frames a marked corpse stays (plain: VerletRagdoll's 240)

const CORPSE_BY_WEAPON = {
  sword:         { k: 'sliced', cuts: ['waist'] },
  katana:        { k: 'sliced', cuts: ['waist', 'armR'] },
  axe:           { k: 'sliced', cuts: ['armR', 'legL'] },
  scythe:        { k: 'sliced', cuts: ['head'] },
  glassblade:    { k: 'shattered', cuts: ['armR', 'legL', 'waist'] },
  nullblade:     { k: 'void', color: '#ff4422' },
  voidblade:     { k: 'void', color: '#b060ff' },
  gauntlet:      { k: 'void', color: '#b060ff' },
  fragment:      { k: 'char', color: '#8fd8ff' },
  knives:        { k: 'pierced', shaft: 'knife', n: 4 },
  spear:         { k: 'pierced', shaft: 'spear', n: 1 },
  bow:           { k: 'pierced', shaft: 'arrow', n: 4 },
  crossbow:      { k: 'pierced', shaft: 'bolt', n: 3 },
  paperairplane: { k: 'pierced', shaft: 'plane', n: 5 },
  hammer:        { k: 'crushed' },
  anchor:        { k: 'crushed' },
  flail:         { k: 'crushed' },
  mkgauntlet:    { k: 'crushed' },
  fryingpan:     { k: 'ko' },
  combat:        { k: 'ko' },
  shield:        { k: 'ko' },
  broomstick:    { k: 'ko' },
  slingshot:     { k: 'ko' },
  boomerang:     { k: 'scarred', n: 2 },
  whip:          { k: 'scarred', n: 4, color: '#ffbe3c' },
  gun:           { k: 'riddled', n: 4 },
  peashooter:    { k: 'riddled', n: 6, color: '#7be07b' },
  shockrifle:    { k: 'shock' },
  electricstaff: { k: 'shock' },
  flamethrower:  { k: 'char' },
  lantern:       { k: 'char', color: '#ffd070' },
  bomb:          { k: 'blast', cuts: ['armL', 'legR'] },
};

// Moves whose ending differs from their weapon's usual one.
const CORPSE_BY_MOVE = {
  'katana:e':     { k: 'sliced', cuts: ['head', 'armR', 'armL', 'waist', 'legL'] },
  'sword:e':      { k: 'sliced', cuts: ['waist', 'armL'] },
  'axe:q':        { k: 'sliced', cuts: ['armR'] },
  'axe:e':        { k: 'sliced', cuts: ['waist'] },
  'scythe:e':     { k: 'sliced', cuts: ['waist', 'head'] },
  'hammer:e':     { k: 'shock' },
  'spear:e':      { k: 'pierced', shaft: 'spear', n: 1 },
  'bow:e':        { k: 'pierced', shaft: 'arrow', n: 7 },
  'gun:q':        { k: 'riddled', n: 3, head: true },
  'fragment:q':   { k: 'ko' },
  'anchor:q':     { k: 'ko' },
  'lantern:e':    { k: 'char', color: '#ffd070' },
  'gauntlet:q':   { k: 'crushed' },
  'gauntlet:e':   { k: 'void', color: '#b060ff' },
  'voidblade:q':  { k: 'sliced', cuts: ['waist'] },
  'nullblade:q':  { k: 'sliced', cuts: ['armR', 'waist'] },
};

const CORPSE_BY_CLASS = {
  thor:       { k: 'shock' },
  kratos:     { k: 'sliced', cuts: ['waist'] },
  ninja:      { k: 'sliced', cuts: ['head'] },
  gunner:     { k: 'riddled', n: 5 },
  paladin:    { k: 'char', color: '#fff078' },
  berserker:  { k: 'sliced', cuts: ['armR', 'legR'] },
  archer:     { k: 'pierced', shaft: 'arrow', n: 6 },
  megaknight: { k: 'crushed' },
  nullblade:  { k: 'void', color: '#ff4422' },
};

const CORPSE_BY_BOSS = {
  trueform: { k: 'void', color: '#e8e8ff' },
  creator:  { k: 'void', color: '#b060ff' },
  yeti:     { k: 'frozen' },
  beast:    { k: 'scarred', n: 3, claw: true, color: '#ff5040' },
};

// An ordinary kill with the same weapon: undefined keeps the style, a string
// swaps it, null leaves the body unmarked.
const CORPSE_MILD = { sliced: 'scarred', shattered: 'scarred', blast: 'char', crushed: null, ko: null };

function corpseStampFinisher(att, tgt, def) {
  if (!att || !tgt || !def) return;
  let st;
  if (def.moveKey) st = CORPSE_BY_MOVE[def.moveKey] || CORPSE_BY_WEAPON[def.moveKey.split(':')[0]];
  else if (att.isTrueForm) st = CORPSE_BY_BOSS.trueform;
  else if (att.isYeti)     st = CORPSE_BY_BOSS.yeti;
  else if (att.isBeast)    st = CORPSE_BY_BOSS.beast;
  else if (att.isBoss)     st = CORPSE_BY_BOSS.creator;
  else {
    const cls = typeof CLASS_FINISHERS !== 'undefined'
      ? Object.keys(CLASS_FINISHERS).find(k => CLASS_FINISHERS[k] === def) : null;
    st = (cls && CORPSE_BY_CLASS[cls]) || CORPSE_BY_WEAPON[att.weaponKey];
  }
  tgt._killFin = {
    style: st ? Object.assign({ color: def.accentColor }, st) : null,
    frame: typeof frameCount !== 'undefined' ? frameCount : 0,
  };
}

function corpseStyleFor(f) {
  const fc = typeof frameCount !== 'undefined' ? frameCount : 0;
  const kf = f._killFin;
  if (kf && fc - kf.frame < 900) return kf.style;
  const hit  = f._lastHitCtx;
  const base = hit && hit.wk ? CORPSE_BY_WEAPON[hit.wk] : null;
  if (!base) return null;
  const mild = CORPSE_MILD[base.k];
  if (mild === null) return null;
  return mild ? Object.assign({}, base, { k: mild, n: 2 }) : base;
}

const Corpse = {

  /** Give a fresh VerletRagdoll its fighter's look and its killer's mark. */
  dress(vr, f) {
    vr.fig = { facing: f.facing >= 0 ? 1 : -1 };
    vr.age = 0;
    vr.headRot = 0;
    vr.cut = {};
    vr.ext = {};
    vr.head.r = vr.headR * 0.85;
    const st = corpseStyleFor(f);
    f._killFin = null;
    if (!st) return;

    const fx = vr.fx = { k: st.k, color: st.color || null, marks: [], pt: [], sq: 0, zap: 0 };
    vr.timer = CORPSE_LIFE_STYLED;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const bones = [
      { t: 'torso' }, { t: 'torso' },
      { a: vr.rShoulder, b: vr.rElbow }, { a: vr.lShoulder, b: vr.lElbow },
      { a: vr.rHip, b: vr.rKnee }, { a: vr.lHip, b: vr.lKnee },
    ];
    const onBody = (i, lo, hi) => Object.assign({ u: rnd(lo === undefined ? 0.15 : lo, hi === undefined ? 0.85 : hi) },
      bones[i === undefined ? Math.floor(Math.random() * bones.length) : i]);

    if (st.cuts && (st.k === 'sliced' || st.k === 'shattered' || st.k === 'blast')) {
      for (const c of st.cuts) Corpse._sever(vr, c);
      Corpse._prune(vr);
      if (typeof spawnParticles === 'function') spawnParticles(f.cx(), f.cy(), vr.color, 14);
    }
    if (st.k === 'char' || st.k === 'blast') {
      for (let i = 0; i < 9; i++) fx.marks.push(Object.assign(onBody(), { ang: rnd(-1.2, 1.2), len: rnd(3, 7), ph: rnd(0, 6) }));
    } else if (st.k === 'pierced') {
      const n = st.n || 3;
      for (let i = 0; i < n; i++) {
        // Shafts come in from the killer's side and stand off the body at a spread.
        const m = onBody(i < 3 ? 0 : undefined, 0.12, 0.8);
        m.ang = rnd(-0.55, 0.55) + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
        m.len = st.shaft === 'spear' ? 46 : st.shaft === 'knife' ? 9 : st.shaft === 'plane' ? 10 : rnd(15, 21);
        fx.marks.push(m);
      }
      fx.shaft = st.shaft || 'arrow';
    } else if (st.k === 'riddled') {
      const n = st.n || 4;
      for (let i = 0; i < n; i++) fx.marks.push(i === 0 && st.head ? { t: 'head' } : onBody(i < 3 ? 0 : undefined, 0.1, 0.9));
    } else if (st.k === 'scarred') {
      const n = st.n || 2;
      const a0 = rnd(0.5, 1.0) * (Math.random() < 0.5 ? 1 : -1);
      for (let i = 0; i < n; i++) {
        fx.marks.push(st.claw
          ? { t: 'torso', u: 0.22 + i * 0.16, ang: a0, len: 12 }
          : Object.assign(onBody(i < 2 ? 0 : undefined, 0.15, 0.85), { ang: rnd(0.4, 1.1) * (i % 2 ? 1 : -1), len: rnd(8, 13) }));
      }
    } else if (st.k === 'frozen') {
      for (let i = 0; i < 7; i++) fx.marks.push(Object.assign(onBody(), { len: rnd(4, 9) }));
    }
  },

  // Take one piece off the rig. Cut limbs keep their far half: a new point at
  // the cut carries it, so the piece is its own small ragdoll.
  _sever(vr, where) {
    if (vr.cut[where]) return;
    const drop = (a, b) => { vr.sticks = vr.sticks.filter(s => !((s.a === a && s.b === b) || (s.a === b && s.b === a))); };
    const add  = (a, b) => vr.sticks.push(new VerletStick(a, b));
    const pt   = (x, y) => { const p = new VerletPoint(x, y); vr.points.push(p); return p; };
    const kick = (ps, ix, iy) => { for (const p of ps) p.impulse(ix, iy); };
    const side = Math.random() < 0.5 ? 1 : -1;

    if (where === 'head') {
      drop(vr.head, vr.neck);
      kick([vr.head], side * (1.5 + Math.random() * 2), -3 - Math.random() * 2);
    } else if (where === 'armR' || where === 'armL' || where === 'legR' || where === 'legL') {
      const R = where.endsWith('R'), arm = where.startsWith('arm');
      const root = arm ? (R ? vr.rShoulder : vr.lShoulder) : (R ? vr.rHip : vr.lHip);
      const mid  = arm ? (R ? vr.rElbow : vr.lElbow) : (R ? vr.rKnee : vr.lKnee);
      const end  = arm ? (R ? vr.rHand : vr.lHand) : (R ? vr.rFoot : vr.lFoot);
      drop(root, mid);
      const stub = pt(root.x + (mid.x - root.x) * 0.45, root.y + (mid.y - root.y) * 0.45);
      add(stub, mid);
      vr.ext[where] = stub;
      kick([stub, mid, end], (R ? 1 : -1) * (1.5 + Math.random() * 2), -2.5 - Math.random() * 2);
    } else if (where === 'waist') {
      const L = (a, b, u) => [a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u];
      const ul = L(vr.lShoulder, vr.lHip, 0.55), ur = L(vr.rShoulder, vr.rHip, 0.55);
      drop(vr.lShoulder, vr.lHip); drop(vr.rShoulder, vr.rHip);
      drop(vr.neck, vr.lHip);      drop(vr.neck, vr.rHip);
      const uL = pt(ul[0], ul[1]), uR = pt(ur[0], ur[1]), dL = pt(ul[0], ul[1]), dR = pt(ur[0], ur[1]);
      add(vr.lShoulder, uL); add(vr.rShoulder, uR); add(uL, uR);
      add(vr.lShoulder, uR); add(vr.rShoulder, uL); add(vr.neck, uL); add(vr.neck, uR);
      add(vr.lHip, dL); add(vr.rHip, dR); add(dL, dR); add(vr.lHip, dR); add(vr.rHip, dL);
      Object.assign(vr.ext, { uL, uR, dL, dR });
      kick([vr.head, vr.neck, vr.lShoulder, vr.rShoulder, uL, uR], side * 2.2, -2.5);
      kick([vr.lHip, vr.rHip, dL, dR], -side * 1.2, 0);
    } else return;
    vr.cut[where] = true;
  },

  // Drop every joint limit that now spans two separate pieces.
  _prune(vr) {
    const id = new Map(vr.points.map((p, i) => [p, i]));
    const find = i => { while (id.get(vr.points[i]) !== i) i = id.get(vr.points[i]); return i; };
    for (const s of vr.sticks) {
      const a = find(vr.points.indexOf(s.a)), b = find(vr.points.indexOf(s.b));
      if (a !== b) id.set(vr.points[a], b);
    }
    const g = p => find(vr.points.indexOf(p));
    vr.angles = (vr.angles || []).filter(c => g(c.a) === g(c.pivot) && g(c.b) === g(c.pivot));
  },

  update(vr) {
    vr.age++;
    if (vr.cut.head) vr.headRot += (vr.head.x - vr.head.ox) / Math.max(4, vr.headR);
    const fx = vr.fx;
    if (!fx) return;
    const any = () => vr.points[Math.floor(Math.random() * vr.points.length)];

    if (fx.k === 'shock') {
      fx.zap = Math.max(0, fx.zap - 1);
      if (vr.age < 130 && Math.random() < 0.16 * (1 - vr.age / 130)) {
        const ends = [vr.lHand, vr.rHand, vr.lFoot, vr.rFoot, vr.head];
        ends[Math.floor(Math.random() * ends.length)].impulse((Math.random() - 0.5) * 5, -1.5 - Math.random() * 2.5);
        fx.zap = 4;
      }
    } else if (fx.k === 'char' || fx.k === 'blast') {
      if (vr.age < 200 && vr.age % 4 === 0) {
        const p = any();
        fx.pt.push({ x: p.x, y: p.y - 2, vx: (Math.random() - 0.5) * 0.5, vy: -0.5 - Math.random() * 0.6,
                     life: 0, max: 50 + Math.random() * 30, smoke: vr.age > 30 && Math.random() < 0.6 });
      }
    } else if (fx.k === 'void') {
      if (vr.age % 2 === 0 && vr.timer > 40) {
        const p = any();
        fx.pt.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 0.8, vy: -0.6 - Math.random() * 1.1, life: 0, max: 34 + Math.random() * 20 });
      }
    } else if (fx.k === 'crushed') {
      let sp = 0, cx = 0, gy = -Infinity;
      for (const p of vr.points) { sp += Math.abs(p.y - p.oy) + Math.abs(p.x - p.ox); cx += p.x; if (p.y > gy) gy = p.y; }
      if (vr.age > 4 && sp / vr.points.length < 2.2) {
        if (!fx.sq) {
          fx.crack = { x: cx / vr.points.length, y: gy + 2, r: [] };
          for (let i = 0; i < 9; i++) fx.crack.r.push([Math.PI * (0.04 + 0.92 * Math.random()), 14 + Math.random() * 26, (Math.random() - 0.5) * 0.7]);
          if (typeof animDust === 'function') { animDust(fx.crack.x, fx.crack.y, 1, 8); animDust(fx.crack.x, fx.crack.y, -1, 8); }
        }
        fx.sq = Math.min(1, fx.sq + 0.22);
      }
    }
    for (let i = fx.pt.length - 1; i >= 0; i--) {
      const q = fx.pt[i];
      q.life++; q.x += q.vx; q.y += q.vy; q.vx += (Math.random() - 0.5) * 0.08;
      if (q.life >= q.max) fx.pt.splice(i, 1);
    }
  },

  _pos(vr, m) {
    if (m.t === 'head') return { x: vr.head.x, y: vr.head.y, ang: 0 };
    let a = m.a, b = m.b;
    if (m.t === 'torso') { a = vr.neck; b = { x: (vr.lHip.x + vr.rHip.x) / 2, y: (vr.lHip.y + vr.rHip.y) / 2 }; }
    return { x: a.x + (b.x - a.x) * m.u, y: a.y + (b.y - a.y) * m.u, ang: Math.atan2(b.y - a.y, b.x - a.x) };
  },

  _mix(a, b, t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`;
  },

  _rgb(c) {
    if (Array.isArray(c)) return c;
    const m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (m) return m[1].split(',').slice(0, 3).map(Number);
    const h = String(c || '#ffffff').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16) || 0xffffff;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },

  // Outline colour the style imposes, or null for the fighter's own.
  _tint(vr) {
    const fx = vr.fx, k = fx.k;
    if (k === 'char' || k === 'blast') {
      const hot = Corpse._rgb(fx.k === 'char' && fx.color ? fx.color : '#ff7a1e');
      const flick = 0.12 * Math.sin(vr.age * 0.7) * Math.max(0, 1 - vr.age / 90);
      return Corpse._mix(hot, [74, 66, 62], vr.age / 170 + flick);
    }
    if (k === 'shock')     return fx.zap > 0 ? '#ffffff' : Corpse._mix(Corpse._rgb(vr.color), [70, 78, 92], vr.age / 260);
    if (k === 'frozen')    return '#c8f0ff';
    if (k === 'shattered') return '#dff6ff';
    if (k === 'void')      return fx.color || '#b060ff';
    return null;
  },

  /** Paint `vr`. Returns false when the old stick drawing should be used instead. */
  draw(vr) {
    if (!vr.fig || typeof FigureSkin === 'undefined' || FigureSkin.quality() === 0) return false;
    const fx = vr.fx, k = fx ? fx.k : null;
    const f  = vr.fig.facing;
    const LW = FIG_LINE_W * (vr.limbW / 5);
    const A  = vr.alpha;
    const base = FigureSkin.pal(vr.color);
    const tint = fx ? Corpse._tint(vr) : null;
    const pal  = tint ? { accent: tint, eye: base.eye } : base;
    const cut  = vr.cut, ext = vr.ext;
    const mid  = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

    // Void: the body goes from the ends inward.
    const d = k === 'void' ? vr.age / (CORPSE_LIFE_STYLED * 0.72) : 0;

    ctx.save();
    if (k === 'crushed' && fx.crack) {
      const c = fx.crack;
      ctx.save();
      ctx.globalAlpha = A * 0.7 * fx.sq;
      ctx.strokeStyle = 'rgba(8,8,14,0.9)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (const [a, len, bend] of c.r) {
        const L = len * fx.sq, ca = Math.cos(a), sa = Math.sin(a) * 0.4;
        ctx.moveTo(c.x + ca * 5, c.y + 1);
        ctx.lineTo(c.x + ca * L * 0.55 + bend * 4, c.y + 1 + sa * L * 0.55);
        ctx.lineTo(c.x + ca * L, c.y + 1 + sa * L);
      }
      ctx.stroke();
      ctx.restore();
      ctx.translate(c.x, c.y);
      ctx.scale(1 + 0.22 * fx.sq, 1 - 0.56 * fx.sq);
      ctx.translate(-c.x, -c.y);
    }

    const near = FigureSkin.begin(), far = FigureSkin.begin();
    const H  = mid(vr.lHip, vr.rHip, 0.5);
    const Sh = mid(vr.neck, H, 0.12);
    const faces = [];   // cut cross-sections: [x, y, dirX, dirY, width]
    const face = (p, toward, w) => {
      const dx = toward.x - p.x, dy = toward.y - p.y, m = Math.hypot(dx, dy) || 1;
      faces.push([p.x, p.y, dx / m, dy / m, w]);
    };

    const headGone = d > 0.86;
    if (!headGone) {
      FigureSkin.head(near, vr.head.x, vr.head.y, vr.headR, f);
      if (!cut.head) FigureSkin.segment(near, [mid(vr.head, vr.neck, 0.55), vr.neck], [LW * 0.55, LW * 0.92]);
    }
    if (cut.head) face(vr.neck, H, LW * 1.0);

    if (!cut.waist) {
      FigureSkin.segment(near, [vr.neck, mid(vr.neck, H, 0.5), H], [LW * 1.85, LW * 1.45, LW * 1.30]);
    } else {
      const U = mid(ext.uL, ext.uR, 0.5), D = mid(ext.dL, ext.dR, 0.5);
      FigureSkin.segment(near, [vr.neck, U], [LW * 1.85, LW * 1.55]);
      FigureSkin.segment(near, [D, H], [LW * 1.50, LW * 1.30]);
      face(U, vr.neck, LW * 1.75); face(D, H, LW * 1.7);
    }

    const limb = (b, key, root, a, e, ws, arm, gone) => {
      if (d > gone + 0.22) return;
      const start = cut[key] ? ext[key] : root;
      const short = d > gone;                         // the far half has already gone
      FigureSkin.segment(b, short ? [start, a] : [start, a, e], short ? ws.slice(0, 2) : ws, b === near);
      if (cut[key]) face(start, a, ws[0] * 1.05);
      if (short) return;
      if (arm) FigureSkin.hand(b, e.x, e.y, 0, f, b === near ? 1 : 0.85);
      else {
        const sx = e.x - a.x, sy = e.y - a.y, m = Math.hypot(sx, sy) || 1;
        FigureSkin.segment(b, [e, { x: e.x + (sy / m) * f * 6, y: e.y - (sx / m) * f * 6 }], [LW * 1.25, LW * 0.85]);
      }
    };
    limb(far,  'armL', Sh, vr.lElbow, vr.lHand, [LW * 1.02, LW * 0.82, LW * 0.62], true,  0.18);
    limb(far,  'legL', H,  vr.lKnee,  vr.lFoot, [LW * 1.16, LW * 0.90, LW * 0.68], false, 0.34);
    limb(near, 'armR', Sh, vr.rElbow, vr.rHand, [LW * 1.15, LW * 0.92, LW * 0.70], true,  0.26);
    limb(near, 'legR', H,  vr.rKnee,  vr.rFoot, [LW * 1.30, LW * 1.00, LW * 0.76], false, 0.44);

    FigureSkin.paint(far,  pal, true,  null, A);
    FigureSkin.paint(near, pal, false, null, A);

    // Material over the skin: soot is matte, ice and glass catch light.
    const coat = (k === 'char' || k === 'blast') ? `rgba(9,7,6,${0.9 * Math.min(1, vr.age / 20 + 0.5)})`
               : k === 'frozen' ? 'rgba(150,215,255,0.30)'
               : k === 'shattered' ? 'rgba(200,240,255,0.24)' : null;
    if (coat) {
      ctx.globalAlpha = A;
      ctx.fillStyle = coat;
      for (const q of far.parts)  ctx.fill(q);
      for (const q of near.parts) ctx.fill(q);
    }

    if (!headGone) {
      const rot = cut.head ? vr.headRot : Math.atan2(vr.head.y - vr.neck.y, vr.head.x - vr.neck.x) + Math.PI / 2;
      ctx.save();
      ctx.translate(vr.head.x, vr.head.y);
      ctx.rotate(rot);
      FigureSkin.face(pal, 0, 0, vr.headR, f, { blink: 1, alpha: A });
      if (cut.head) {
        ctx.globalAlpha = A;
        ctx.strokeStyle = vr.color; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-LW * 0.5, vr.headR * 0.98); ctx.lineTo(LW * 0.5, vr.headR * 0.98); ctx.stroke();
      }
      ctx.restore();
    }

    // Cut faces: the outline colour runs straight across the cut, hot at first.
    if (faces.length) {
      const heat = Math.max(0, 1 - vr.age / 80);
      ctx.lineCap = 'round';
      for (const [x, y, dx, dy, w] of faces) {
        const hx = -dy * w * 0.5, hy = dx * w * 0.5;
        ctx.globalAlpha = A * (0.55 + 0.45 * heat);
        ctx.strokeStyle = vr.color; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(x - hx, y - hy); ctx.lineTo(x + hx, y + hy); ctx.stroke();
        if (heat > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = A * heat * 0.8;
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.moveTo(x - hx * 0.7, y - hy * 0.7); ctx.lineTo(x + hx * 0.7, y + hy * 0.7); ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    }

    if (fx) Corpse._marks(vr, A, LW);
    ctx.restore();
    if (fx) Corpse._air(vr, A);
    return true;
  },

  // Marks that sit ON the body (drawn inside the crush transform).
  _marks(vr, A, LW) {
    const fx = vr.fx, k = fx.k;
    ctx.save();
    ctx.lineCap = 'round';
    if (k === 'char' || k === 'blast') {
      const heat = Math.max(0, 1 - vr.age / 210);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = fx.k === 'char' && fx.color ? fx.color : '#ff8a2a';
      ctx.lineWidth = 1.2;
      for (const m of fx.marks) {
        const p = Corpse._pos(vr, m), a = p.ang + m.ang;
        ctx.globalAlpha = A * heat * (0.45 + 0.45 * Math.sin(vr.age * 0.13 + m.ph));
        ctx.beginPath();
        ctx.moveTo(p.x - Math.cos(a) * m.len * 0.5, p.y - Math.sin(a) * m.len * 0.5);
        ctx.lineTo(p.x + Math.cos(a) * m.len * 0.5, p.y + Math.sin(a) * m.len * 0.5);
        ctx.stroke();
      }
    } else if (k === 'pierced') {
      for (const m of fx.marks) {
        const p = Corpse._pos(vr, m), a = p.ang + m.ang;
        const ca = Math.cos(a), sa = Math.sin(a);
        const x1 = p.x + ca * m.len, y1 = p.y + sa * m.len;
        ctx.globalAlpha = A;
        if (fx.shaft === 'plane') {
          ctx.fillStyle = '#eef4ff'; ctx.strokeStyle = '#8fa4c8'; ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(p.x - ca * 2, p.y - sa * 2);
          ctx.lineTo(x1 - sa * 4, y1 + ca * 4); ctx.lineTo(p.x + ca * m.len * 0.7, p.y + sa * m.len * 0.7);
          ctx.lineTo(x1 + sa * 4, y1 - ca * 4);
          ctx.closePath(); ctx.fill(); ctx.stroke();
          continue;
        }
        if (fx.shaft === 'knife') {
          ctx.strokeStyle = '#cdd6e0'; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + ca * 4, p.y + sa * 4); ctx.stroke();
          ctx.strokeStyle = '#3a2c22'; ctx.lineWidth = 2.8;
          ctx.beginPath(); ctx.moveTo(p.x + ca * 4, p.y + sa * 4); ctx.lineTo(x1, y1); ctx.stroke();
          ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(p.x + ca * 4 - sa * 2.6, p.y + sa * 4 + ca * 2.6); ctx.lineTo(p.x + ca * 4 + sa * 2.6, p.y + sa * 4 - ca * 2.6); ctx.stroke();
          continue;
        }
        const spear = fx.shaft === 'spear';
        ctx.strokeStyle = spear ? '#6d4f36' : '#d8c8a0';
        ctx.lineWidth = spear ? 2.6 : 1.6;
        // The head has gone through: a short length shows on the far side.
        ctx.beginPath(); ctx.moveTo(p.x - ca * (spear ? 12 : 4), p.y - sa * (spear ? 12 : 4)); ctx.lineTo(x1, y1); ctx.stroke();
        if (spear) {
          ctx.fillStyle = '#c8d2dc';
          ctx.beginPath();
          ctx.moveTo(p.x - ca * 20, p.y - sa * 20);
          ctx.lineTo(p.x - ca * 11 - sa * 3, p.y - sa * 11 + ca * 3);
          ctx.lineTo(p.x - ca * 11 + sa * 3, p.y - sa * 11 - ca * 3);
          ctx.closePath(); ctx.fill();
        } else {
          ctx.strokeStyle = fx.shaft === 'bolt' ? '#b0362c' : (fx.color || '#ffffff');
          ctx.lineWidth = 1.3;
          for (const o of [0, 3]) {
            const bx = x1 - ca * o, by = y1 - sa * o;
            ctx.beginPath();
            ctx.moveTo(bx - sa * 2.6 + ca * 2.4, by + ca * 2.6 + sa * 2.4); ctx.lineTo(bx, by);
            ctx.lineTo(bx + sa * 2.6 + ca * 2.4, by - ca * 2.6 + sa * 2.4);
            ctx.stroke();
          }
        }
      }
    } else if (k === 'riddled') {
      // Holes: the arena shows through, with a ring of the outline colour.
      for (const m of fx.marks) {
        const p = Corpse._pos(vr, m);
        ctx.globalAlpha = A;
        ctx.fillStyle = fx.color && m.t !== 'head' && fx.color.charAt(0) === '#' ? fx.color : vr.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 0.8, 0, Math.PI * 2); ctx.fill();
      }
    } else if (k === 'scarred') {
      const heat = Math.max(0.35, 1 - vr.age / 200);
      ctx.strokeStyle = fx.color || vr.color;
      for (const pass of [0, 1]) {
        ctx.globalCompositeOperation = pass ? 'lighter' : 'source-over';
        ctx.lineWidth = pass ? 3.2 : 1.5;
        for (const m of fx.marks) {
          const p = Corpse._pos(vr, m), a = p.ang + m.ang;
          ctx.globalAlpha = A * heat * (pass ? 0.3 : 1);
          ctx.beginPath();
          ctx.moveTo(p.x - Math.cos(a) * m.len * 0.5, p.y - Math.sin(a) * m.len * 0.5);
          ctx.lineTo(p.x + Math.cos(a) * m.len * 0.5, p.y + Math.sin(a) * m.len * 0.5);
          ctx.stroke();
        }
      }
    } else if (k === 'frozen') {
      ctx.fillStyle = '#e4f8ff';
      for (const m of fx.marks) {
        const p = Corpse._pos(vr, m);
        ctx.globalAlpha = A * 0.9;
        ctx.beginPath();
        ctx.moveTo(p.x - 1.8, p.y); ctx.lineTo(p.x + 1.8, p.y); ctx.lineTo(p.x, p.y + m.len);
        ctx.closePath(); ctx.fill();
      }
    } else if (k === 'shattered') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < vr.points.length; i += 2) {
        const p = vr.points[i], tw = Math.sin(vr.age * 0.2 + i * 1.7);
        if (tw < 0.55) continue;
        ctx.globalAlpha = A * (tw - 0.55) * 2;
        ctx.fillRect(p.x - 3, p.y - 0.5, 6, 1); ctx.fillRect(p.x - 0.5, p.y - 3, 1, 6);
      }
    }
    ctx.restore();
  },

  _air(vr, A) {
    const fx = vr.fx, k = fx.k;
    ctx.save();
    if (k === 'char' || k === 'blast' || k === 'void') {
      const hot = k === 'void' ? (fx.color || '#b060ff') : (fx.k === 'char' && fx.color ? fx.color : '#ffb24a');
      for (const q of fx.pt) {
        const u = q.life / q.max;
        if (q.smoke) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = A * 0.20 * (1 - u);
          ctx.fillStyle = '#5a5653';
          ctx.beginPath(); ctx.arc(q.x, q.y, 2 + u * 5, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = A * (1 - u);
          ctx.fillStyle = hot;
          const s = k === 'void' ? 2.2 * (1 - u) + 0.6 : 1.6;
          ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s);
        }
      }
    } else if (k === 'shock' && vr.age < 150 && (fx.zap > 0 || Math.random() < 0.18)) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = fx.zap > 0 ? '#ffffff' : '#7fe6ff';
      ctx.lineWidth = 1.3;
      ctx.globalAlpha = A * 0.9;
      const a = vr.points[Math.floor(Math.random() * 14)], b = vr.points[Math.floor(Math.random() * 14)];
      ctx.beginPath(); ctx.moveTo(a.x, a.y);
      for (let i = 1; i < 4; i++) {
        ctx.lineTo(a.x + (b.x - a.x) * i / 4 + (Math.random() - 0.5) * 9, a.y + (b.y - a.y) * i / 4 + (Math.random() - 0.5) * 9);
      }
      ctx.lineTo(b.x, b.y); ctx.stroke();
    } else if (k === 'ko' && vr.age < 260) {
      const fade = Math.min(1, (260 - vr.age) / 60);
      ctx.fillStyle = '#ffe680';
      for (let i = 0; i < 3; i++) {
        const a = vr.age * 0.09 + i * Math.PI * 2 / 3;
        const x = vr.head.x + Math.cos(a) * (vr.headR + 6), y = vr.head.y - vr.headR - 5 + Math.sin(a) * 3;
        ctx.globalAlpha = A * fade * (Math.sin(a) > 0 ? 1 : 0.5);
        ctx.beginPath();
        for (let j = 0; j < 8; j++) {
          const r = j % 2 ? 1.2 : 3.2, t = j * Math.PI / 4 + vr.age * 0.05;
          ctx.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r);
        }
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  },
};
