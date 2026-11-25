'use strict';
/*
 * tools/brain/approxsim.js: Sovereign's approximate simulator. DEV ONLY for now.
 *
 * A small deterministic model of two fighters, cheap enough to fork hundreds of times a second in a live match.
 * It does not touch game objects: a fork copies a few numbers. tools/brain/lookahead.js measured the ceiling with
 * real-game forks; this is the stand-in that has to keep as much of that as it can.
 *
 * Runs in Node (offline scoring against recorded traces, tools/brain/approxcheck.js) and in the page (injected
 * by lookahead.js --sim=approx). Plain functions over plain objects; no game globals inside step().
 *
 * Physics follow smb-input.js processInput() and smb-fighter.js update()/checkPlatform() on the sim arena
 * (gravity 0.65, friction 0.78 ground / 0.94 air, vx cap 13, vy -20..19, jumps -17 / -13, fast fall 13,
 * swing recovery slows vx x0.72). Combat is fitted per weapon from traces (PARAMS), not read from code.
 */
(function (root) {
  const G = 0.65, FR_GROUND = 0.78, FR_AIR = 0.94, VX_MAX = 13, VY_MIN = -20, VY_MAX = 19;
  const JUMP = -17, JUMP2 = -13, JUMP_KNIGHT = -22, JUMP2_KNIGHT = -16, FAST_FALL = 13, ENDLAG_SLOW = 0.72;

  // Per weapon. Melee (t 'm'): damage, cooldown, endlag, swing dur and startup from WEAPONS / WEAPON_SWINGS /
  // swingStartupFrames; stun = median stunTimer seen after a hit in 200 recorded matches (+2 for the decision lag).
  // Ranged (t 'r'): projectile speed, launch vy and damage measured from the same traces. Weapons missing here
  // (bomb, knives, crossbow, boomerang, paper airplane: they fire outside the projectile list) are not modelled.
  const PARAMS = {"sword":{"t":"m","dmg":14,"cd":30,"endlag":11,"dur":9,"su":4,"range":84,"stun":31},
    "hammer":{"t":"m","dmg":24,"cd":54,"endlag":18,"dur":15,"su":6,"range":72,"stun":43},
    "gun":{"t":"r","cd":22,"endlag":6,"stun":20,"spd":13,"vy":0,"dmg":12},
    "axe":{"t":"m","dmg":19,"cd":36,"endlag":16,"dur":12,"su":5,"range":98,"stun":33},
    "spear":{"t":"m","dmg":15,"cd":42,"endlag":13,"dur":10,"su":4,"range":130,"stun":30},
    "bow":{"t":"r","cd":40,"endlag":4,"stun":20,"spd":13,"vy":0,"dmg":18},
    "shield":{"t":"m","dmg":18,"cd":30,"endlag":9,"dur":8,"su":3,"range":68,"stun":27},
    "scythe":{"t":"m","dmg":15,"cd":39,"endlag":13,"dur":14,"su":6,"range":100,"stun":36},
    "fryingpan":{"t":"m","dmg":22,"cd":46,"endlag":15,"dur":12,"su":5,"range":65,"stun":38},
    "broomstick":{"t":"m","dmg":12,"cd":36,"endlag":8,"dur":8,"su":3,"range":105,"stun":28},
    "combat":{"t":"m","dmg":20,"cd":21,"endlag":5,"dur":5,"su":2,"range":60,"stun":28},
    "peashooter":{"t":"r","cd":12,"endlag":5,"stun":20,"spd":15,"vy":0,"dmg":6},
    "slingshot":{"t":"r","cd":30,"endlag":5,"stun":20,"spd":9,"vy":-4.5,"dmg":15,"g":true},
    "flail":{"t":"m","dmg":24,"cd":57,"endlag":18,"dur":16,"su":6,"range":70,"stun":41},
    "whip":{"t":"m","dmg":11,"cd":42,"endlag":13,"dur":11,"su":4,"range":125,"stun":33},
    "katana":{"t":"m","dmg":13,"cd":42,"endlag":11,"dur":7,"su":3,"range":98,"stun":28},
    "flamethrower":{"t":"r","cd":4,"endlag":3,"stun":20,"spd":7.4,"vy":0,"dmg":5,"life":30},
    "electricstaff":{"t":"m","dmg":16,"cd":39,"endlag":12,"dur":11,"su":4,"range":112,"stun":30},
    "mkgauntlet":{"t":"m","dmg":30,"cd":21,"endlag":0,"dur":12,"su":4,"range":90,"stun":16},
    "glassblade":{"t":"m","dmg":24,"cd":21,"endlag":6,"dur":6,"su":2,"range":92,"stun":19},
    "anchor":{"t":"m","dmg":28,"cd":39,"endlag":15,"dur":13,"su":5,"range":80,"stun":37}};
  // Melee cd above = the 25th-percentile gap between real swing starts (move strings chain faster than the table
  // cooldown), from 200 recorded matches; the table value where a weapon had under 30 samples.
  // Fitted against traces (approxcheck.js --fit): reach as a share of the table range, measured centre to centre.
  const TUNE = { reach: 0.4, back: 0, dy: 40, suOff: 0, clash: 4, inv: 16, blockAny: true, blockEndlag: 14, projStun: 20 };
  const covers = wk => !!PARAMS[wk];

  // A fighter from a recorded state object (lookahead.js --record stateOf) or a live Fighter.
  function fromState(s) {
    return {
      x: s.x, y: s.y, vx: s.vx, vy: s.vy, w: s.w, h: s.h, g: s.g !== undefined ? !!s.g : !!s.onGround,
      dj: s.dj !== undefined ? !!s.dj : !!s.canDoubleJump, coy: s.coyoteFrames || 0, facing: s.facing < 0 ? -1 : 1,
      spd: 5.2 * (s.classSpeedMult || 1), knight: (s.cls || s.charClass) === 'megaknight',
      hp: s.health, maxHp: s.maxHealth, atk: s.attackTimer || 0, cd: s.cooldown || 0, endlag: s.attackEndlag || 0,
      stun: Math.max(s.stunTimer || 0, s.ragdollTimer || 0), inv: s.invincible || 0, sh: s.sh !== undefined ? !!s.sh : !!s.shielding,
      wk: s.wk || s.weaponKey, st0: -999, prevJump: 0, prevShield: 0, prevBtn: 0, su: -1, swingHit: false,
      dmgMult: s.dmgMult || 1,
      // A swing already under way at the snapshot can still connect: treat it as live for its remaining frames.
    };
  }
  const clone = f => Object.assign({}, f);
  function liveSwing(f, s) {
    const P = PARAMS[f.wk];
    if (P && P.t === 'm' && f.atk > 0) {
      const age = (P.dur - f.atk);
      f.su = Math.max(0, P.su + TUNE.suOff - age);
      f.st0 = -age;
    }
    return f;
  }

  // One frame of movement for one fighter, keys = [move 0/1/2, jump 0/1, shield 0/1, button 0..3].
  // jumpEdge / shieldEdge: the key went down this frame (the game acts on keyHeldFrames === 1).
  function moveFrame(f, keys, jumpEdge, shieldEdge, plats) {
    if (f.stun <= 0) {
      if (keys[0] === 0) { f.vx = -f.spd; f.facing = -1; }
      else if (keys[0] === 2) { f.vx = f.spd; f.facing = 1; }
      if (jumpEdge) {
        if (f.g || (f.coy > 0 && !f.dj)) { f.vy = f.knight ? JUMP_KNIGHT : JUMP; f.dj = true; f.coy = 0; }
        else if (f.dj) { f.vy = f.knight ? JUMP2_KNIGHT : JUMP2; f.dj = false; }
      }
      if (!f.g && shieldEdge && f.vy > -2) f.vy = Math.max(f.vy, FAST_FALL);
      f.sh = keys[2] === 1 && f.g;
    } else f.sh = false;
    if (f.endlag > 0) f.vx *= ENDLAG_SLOW;
    f.vy += G;
    f.x += f.vx;
    f.y += f.vy;
    f.vx *= f.g ? FR_GROUND : FR_AIR;
    f.vx = Math.max(-VX_MAX, Math.min(VX_MAX, f.vx));
    f.vy = Math.max(VY_MIN, Math.min(VY_MAX, f.vy));
    const wasG = f.g;
    f.g = false;
    for (const pl of plats) collide(f, pl);
    if (wasG && !f.g && f.vy > -5 && f.coy === 0) f.coy = 6;
    if (wasG && !f.g && f.vy <= -5) f.dj = true;
    if (f.coy > 0 && !f.g) f.coy--;
    if (f.stun > 0) f.stun--;
    if (f.inv > 0) f.inv--;
    if (f.endlag > 0) f.endlag--;
    if (f.cd > 0) f.cd--;
    if (f.atk > 0) f.atk--;
  }

  function collide(f, pl) {
    if (pl.off) return;
    if (f.x + f.w <= pl.x || f.x >= pl.x + pl.w || f.y + f.h <= pl.y || f.y >= pl.y + pl.h) return;
    if (pl.oneWay && (f.vy < 0 || f.y + f.h - f.vy > pl.y + 2)) return;
    const dTop = f.y + f.h - pl.y, dBottom = pl.y + pl.h - f.y, dLeft = f.x + f.w - pl.x, dRight = pl.x + pl.w - f.x;
    const m = Math.min(dTop, dBottom, dLeft, dRight);
    if (m === dTop && f.vy >= 0) { f.y = pl.y - f.h; f.vy = 0; f.g = true; f.dj = false; }
    else if (m === dBottom && f.vy <= 0) { f.y = pl.y + pl.h; f.vy = Math.abs(f.vy) * 0.1; }
    else if (m === dLeft) { f.x = pl.x - f.w; f.vx = Math.min(f.vx, 0); }
    else if (m === dRight) { f.x = pl.x + pl.w; f.vx = Math.max(f.vx, 0); }
  }

  // World = { a, b, plats }. Advance one decision (frames frames) with each side holding its keys.
  function stepDecision(W, ka, kb, frames) {
    for (let i = 0; i < frames; i++) {
      for (const [f, k, o] of [[W.a, ka, W.b], [W.b, kb, W.a]]) {
        // The attack key acts on keydown: a press this decision that wasn't held last decision.
        if (i === 0 && k[3] === 1 && f.prevBtn !== 1) startAttack(W, f, o);
        const jEdge = i === 0 && k[1] === 1 && !f.prevJump, sEdge = i === 0 && k[2] === 1 && !f.prevShield;
        moveFrame(f, k, jEdge, sEdge, W.plats);
        swingFrame(f, o);
      }
      projFrame(W);
      W.t = (W.t || 0) + 1;
    }
    W.a.prevJump = ka[1]; W.a.prevShield = ka[2]; W.a.prevBtn = ka[3];
    W.b.prevJump = kb[1]; W.b.prevShield = kb[2]; W.b.prevBtn = kb[3];
  }

  function startAttack(W, f, o) {
    const P = PARAMS[f.wk];
    if (!P || f.cd > 0 || f.endlag > 0 || f.stun > 0 || f.hp <= 0) return;
    if (f.sh) f.sh = false;                      // attacking out of the pool shield drops it
    f.cd = P.cd;
    if (P.t === 'm') { f.atk = P.dur; f.su = Math.max(0, P.su + TUNE.suOff); f.swingHit = false; f.st0 = W.t || 0; }
    else {
      W.p = W.p || [];
      W.p.push({ x: f.x + f.w / 2 + f.facing * 20, y: f.y + f.h * 0.4, vx: f.facing * P.spd, vy: P.vy, g: !!P.g, dmg: P.dmg,
        own: f, life: P.life || 90, stun: TUNE.projStun });
      f.endlag = Math.max(f.endlag, P.endlag);
    }
  }

  // Contact: from the startup frame to the end of the swing, the first frame the target is in the reach box.
  function swingFrame(f, o) {
    if (f.su < 0) return;
    if (f.su > 0) { f.su--; return; }
    const P = PARAMS[f.wk];
    if (!P || f.stun > 0 || f.atk <= 0) { f.su = -1; return; }
    const dx = ((o.x + o.w / 2) - (f.x + f.w / 2)) * f.facing, dy = (o.y + o.h / 2) - (f.y + f.h / 2);
    if (dx > P.range * TUNE.reach + o.w / 2 || dx < -TUNE.back || Math.abs(dy) > TUNE.dy) return;
    f.su = -1;
    // Melee trade (smb-fighter.js melee resolver): a target mid-swing and facing us cancels the later swing;
    // two swings started within the clash window cancel each other.
    const Po = PARAMS[o.wk];
    if (Po && Po.t === 'm' && o.atk > 0 && o.facing * ((f.x + f.w / 2) - (o.x + o.w / 2)) >= 0) {
      if (Math.abs(f.st0 - o.st0) <= TUNE.clash) { f.atk = 0; o.atk = 0; o.su = -1; return; }
      if (f.st0 >= o.st0) { f.atk = 0; return; }
    }
    hit(f, o, P.dmg * f.dmgMult, P.stun);
    f.endlag = Math.max(f.endlag, P.endlag);
  }

  function hit(f, o, dmg, stun) {
    if (o.hp <= 0 || o.inv > 0) return;            // ~16 f of invincibility after each hit (measured: 14-16 a decision later)
    // A raised guard blocks: no damage, the attacker eats block endlag.
    if (o.sh && (TUNE.blockAny || o.facing === (f.x < o.x ? -1 : 1))) { f.endlag = Math.max(f.endlag, TUNE.blockEndlag); return; }
    o.hp -= dmg; o.stun = Math.max(o.stun, stun); o.vx = 0; o.sh = false; o.su = -1; o.inv = TUNE.inv;
  }

  function projFrame(W) {
    if (!W.p || !W.p.length) return;
    for (let i = W.p.length - 1; i >= 0; i--) {
      const q = W.p[i];
      q.x += q.vx; q.y += q.vy; if (q.g) q.vy += 0.3;
      const o = q.own === W.a ? W.b : W.a;
      if (q.x > o.x - 4 && q.x < o.x + o.w + 4 && q.y > o.y && q.y < o.y + o.h) { hit(q.own, o, q.dmg, q.stun); W.p.splice(i, 1); continue; }
      if (--q.life <= 0 || q.x < -100 || q.x > 1000 || q.y > 520) W.p.splice(i, 1);
    }
  }

  // projs: recorded/live projectiles [{x, y, vx, vy, own: 0 = a, 1 = b, dmg}].
  function world(a, b, plats, projs) {
    const W = { a: liveSwing(fromState(a), a), b: liveSwing(fromState(b), b), plats, p: [] };
    for (const q of projs || []) W.p.push({ x: q.x, y: q.y, vx: q.vx, vy: q.vy, g: false, dmg: q.dmg || 10, own: q.own === 0 ? W.a : W.b, life: 90, stun: TUNE.projStun });
    return W;
  }
  function forkWorld(W) {
    const a = clone(W.a), b = clone(W.b);
    return { a, b, plats: W.plats, p: (W.p || []).map(q => Object.assign({}, q, { own: q.own === W.a ? a : b })) };
  }

  const api = { fromState, world, forkWorld, stepDecision, moveFrame, covers, PARAMS, TUNE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ApproxSim = api;
})(typeof window !== 'undefined' ? window : globalThis);
