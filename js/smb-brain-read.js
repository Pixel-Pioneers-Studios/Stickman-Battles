'use strict';
// smb-brain-read.js — THE READ: in-match habit reading layered on THE BRAIN.
// Depends on: smb-brain.js (Brain), smb-combat.js (SHIELD_PARRY_REST), at call time only.
//
// The network is a reflex: one frame in, keys out, plus 17 slow tallies. It can't
// notice "you always swing 14 frames after you land" and act on it inside a match.
// This layer can. It watches the opponent every frame, keeps short decayed tables
// of WHEN their swings come (measured from four anchors) and HOW LONG they hold
// their guard, and when a habit is clear it overrides the net's keys for that
// moment only:
//
//   guard  raise the shield just before a predicted swing (a fresh guard held
//          <= 8 frames at the hit is a 65% parry), and stop the net tapping
//          the shield while one is coming so the guard is rested for it.
//   drop   don't swing into a guard the opponent is about to keep up (blocked
//          swings are minus); swing when their usual hold time runs out.
//
// No swing has startup, so a guard raised after the swing starts is a superhuman
// reflex, not a read. Every prediction uses only what happened BEFORE the swing.
// Tables decay with a ~12 s half-life: drop a habit and the read lets go of it.

const BrainRead = (() => {
  const DECAY   = Math.pow(0.5, 1 / 1200);  // 1200 frames = 20 s half-life
  const BIN     = 2, NB = 30;                // swing clock: 2-frame bins over 60 frames
  const ANCHORS = ['cad', 'land', 'reach', 'mine'];
  const ANCHOR_TEXT = {
    cad:   'swings on a rhythm',
    land:  'swings right after landing',
    reach: 'swings the moment it is in reach',
    mine:  'answers my swing on cue',
  };
  const HBIN    = 4, NHB = 36;               // guard hold: 4-frame bins over 144 frames
  const K       = 4;                         // prior strength (frames of base-rate evidence per bin)
  const EV_MIN  = 2;                         // decayed swings in the window before a read counts
  // Guard read thresholds (CFG so tools/brain/readeval.js can sweep them).
  const CFG = { raiseP: 0.6, raiseLift: 1.6, rest: true, drop: true };  // 0.6: ~55-64% of read guards meet a swing (0.45: ~30-45%)
  const HOLD_P  = 0.35;                      // "a swing is coming soon" — keep the guard rested
  const GUARD_FRAMES = 9;                    // a read guard stays up this long (parry window is 8)
  const DROP_EV = 3, DROP_P = 0.45, WAIT_P = 0.3;

  let enabled = false;  // console: `read on` / `read off` (off until playtested in the shipping fight)

  function create() {
    const z = n => new Float64Array(n);
    const R = _create(z);
    if (BrainRead.debug) { R.dbg = BrainRead.dbgAll || (BrainRead.dbgAll = { calls: 0, noGuard: 0, far: 0, swinging: 0, eval: 0, withEv: 0, pSum: 0, liftSum: 0, pOk: 0, liftOk: 0, both: 0, rested: 0 }); BrainRead.last = R; }
    return R;
  }
  function _create(z) {
    return {
      opp: null, t: 0,
      clk: { cad: -1e9, land: -1e9, reach: -1e9, mine: -1e9 },
      sw: ANCHORS.map(() => z(NB)), ex: ANCHORS.map(() => z(NB)),
      baseSw: 0, baseEx: 0,
      hd: z(NHB), hx: z(NHB), oShStart: -1,
      p: null,
      guardUntil: -1, guardAnchor: null, dropSwingAt: -1,
      lineCd: 0, said: {},
      stats: { guards: 0, guardSwung: 0, guardBlocks: 0, guardParries: 0, guardHit: 0, rested: 0,
               heldSwings: 0, dropSwings: 0, dropHits: 0 },
    };
  }

  const reachOf = f => ((f.weapon && f.weapon.range) || 60) * 1.4 + 20;
  const busy = f => (f.stunTimer || 0) > 0 || (f.ragdollTimer || 0) > 0 || f._msScene || f._msLock || f.health <= 0;

  // Once per frame, before the frame's input. Updates the tables from what the
  // opponent did since last frame and books what the read's own keys achieved.
  function frame(R, me, opp) {
    if (!R || !me || !opp) return;
    if (R.opp !== opp) {
      const fresh = create();
      fresh.stats = R.stats; fresh.said = R.said; fresh.dbg = R.dbg;
      Object.assign(R, fresh, { opp });
      if (R.dbg) BrainRead.last = R;
    }
    const t = ++R.t;
    for (let a = 0; a < ANCHORS.length; a++) {
      const s = R.sw[a], e = R.ex[a];
      for (let b = 0; b < NB; b++) { s[b] *= DECAY; e[b] *= DECAY; }
    }
    for (let b = 0; b < NHB; b++) { R.hd[b] *= DECAY; R.hx[b] *= DECAY; }
    R.baseSw *= DECAY; R.baseEx *= DECAY;
    if (R.lineCd > 0) R.lineCd--;

    const dx = Math.abs(opp.cx() - me.cx()), dy = Math.abs(opp.cy() - me.cy());
    const opR = reachOf(opp), myR = reachOf(me);
    const now = {
      oAtk: opp.attackTimer || 0, oG: !!opp.onGround, oSh: !!opp.shielding,
      inR: dx < opR * 1.15 && dy < 110, near: dx < opR * 1.6 && dy < 140,
      able: !(opp.attackTimer > 0) && !(opp.attackEndlag > 0) && !busy(opp) && !(opp._landLag > 0),
      mAtk: me.attackTimer || 0, mHp: me.health, mSh: me.shieldHP || 0, oHp: opp.health,
      oVuln: opp._parryVulnFrames || 0, mShield: !!me.shielding,
    };
    const p = R.p;
    if (p) {
      // A chained swing restarts the timer before it reaches 0, so any rise is a new swing.
      const swingStart = now.oAtk > p.oAtk;
      // Swing hazard tables: every frame the opponent COULD have started a swing
      // near me is exposure; the frames it did (in reach) are events.
      if (p.near && (p.able || swingStart)) {
        const hit = swingStart && p.inR ? 1 : 0;
        R.baseEx += 1; R.baseSw += hit;
        for (let a = 0; a < ANCHORS.length; a++) {
          const c = t - 1 - R.clk[ANCHORS[a]];
          if (c < 0 || c >= NB * BIN) continue;
          const b = (c / BIN) | 0;
          R.ex[a][b] += 1; R.sw[a][b] += hit;
        }
      }
      if (R.dbg && swingStart) {
        const d = R.dbg; d.sw = (d.sw || 0) + 1;
        if (p.inR) {
          const st = (me.stunTimer > 0 || me.ragdollTimer > 0) ? 'stun' : !me.onGround ? 'air' : (me.attackTimer > 0 || me.attackEndlag > 0) ? 'atk' : me._landLag > 0 ? 'land' : 'open';
          d['inR_' + st] = (d['inR_' + st] || 0) + 1;
          if (!p.able) d.inR_notAble = (d.inR_notAble || 0) + 1;
        }
      }
      if (R.dbg && now.mHp < p.mHp) {
        const d = R.dbg;
        const src = opp._msScene || opp._msLock ? 'scene' : now.oAtk > 0 ? 'swing' : (opp.abilityCooldown || 0) > 0 && p.oAtk === 0 ? 'abiOrOther' : 'other';
        const st = (me.stunTimer > 0 || me.ragdollTimer > 0) ? 'stun' : !me.onGround ? 'air' : (me.attackTimer > 0 || me.attackEndlag > 0) ? 'atk' : me._landLag > 0 ? 'land' : me._msScene ? 'myscene' : 'open';
        d['hit_' + src + '_' + st] = (d['hit_' + src + '_' + st] || 0) + 1;
        if (src === 'swing') d['swingAge_' + Math.min(12, t - R.clk.cad)] = (d['swingAge_' + Math.min(12, t - R.clk.cad)] || 0) + 1;
      }
      if (swingStart) R.clk.cad = t;
      if (!p.oG && now.oG) R.clk.land = t;
      if (now.inR && !p.inR) R.clk.reach = t;
      if (now.mAtk > 0 && p.mAtk === 0) R.clk.mine = t;

      // Guard hold table: how long its guard stays up while I am close enough to punish.
      if (now.oSh && !p.oSh) R.oShStart = t;
      if (p.oSh && R.oShStart >= 0 && dx < myR * 1.4) {
        const b = Math.min(NHB - 1, ((t - 1 - R.oShStart) / HBIN) | 0);
        R.hx[b] += 1;
        if (!now.oSh) R.hd[b] += 1;
      }
      if (!now.oSh) R.oShStart = -1;

      // Outcomes of the read's own guard.
      if (R.guardUntil >= 0) {
        // Precision: did a swing actually come, in reach, while the read's guard was up?
        if (swingStart && p.inR) R.stats.guardSwung++;
        if (now.oVuln > p.oVuln) { R.stats.guardParries++; _say(R, me, R.guardAnchor); }
        else if (now.mShield && now.mSh < p.mSh - 0.5) R.stats.guardBlocks++;
        if (now.mHp < p.mHp) R.stats.guardHit++;
      }
      if (R.dropSwingAt >= 0) {
        if (now.oHp < p.oHp) { R.stats.dropHits++; R.dropSwingAt = -1; _say(R, me, 'drop'); }
        else if (t - R.dropSwingAt > 14) R.dropSwingAt = -1;
      }
    }
    R.p = now;
  }

  // P(a swing in reach within frames [lo, hi] from now), from the best anchor.
  function predict(R, lo, hi) {
    const base = (R.baseSw + 0.02 * K) / (R.baseEx + K);
    const pBase = 1 - Math.pow(1 - base, hi - lo + 1);
    let best = { p: 0, lift: 0, anchor: null, ev: 0 };
    for (let a = 0; a < ANCHORS.length; a++) {
      const c0 = R.t - R.clk[ANCHORS[a]];
      if (c0 + lo >= NB * BIN) continue;
      let logq = 0, ev = 0;
      const cEnd = Math.min(c0 + hi, NB * BIN - 1);
      for (let c = c0 + lo; c <= cEnd; c++) {
        const h = Math.min(0.95, (R.sw[a][(c / BIN) | 0] + base * K) / (R.ex[a][(c / BIN) | 0] + K));
        logq += Math.log(1 - h);
      }
      for (let b = ((c0 + lo) / BIN) | 0; b <= ((cEnd / BIN) | 0); b++) ev += R.sw[a][b];
      const pr = 1 - Math.exp(logq);
      if (ev >= EV_MIN && pr > best.p) best = { p: pr, lift: pr / pBase, anchor: ANCHORS[a], ev };
    }
    return best;
  }

  // P(its guard drops within [lo, hi] frames from now), given it has held h frames.
  function predictDrop(R, h, lo, hi) {
    let logq = 0, ev = 0;
    for (let c = h + lo; c <= h + hi; c++) {
      const b = Math.min(NHB - 1, (c / HBIN) | 0);
      const hz = Math.min(0.95, (R.hd[b] + 0.03 * K) / (R.hx[b] + K));
      logq += Math.log(1 - hz);
    }
    for (let b = 0; b < NHB; b++) ev += R.hd[b];
    return { p: 1 - Math.exp(logq), ev };
  }

  // After the net picks its keys, before they are pressed. act = [move, jump, shield, button].
  function adjust(R, me, opp, act) {
    if (!enabled || !R || !me || !opp || R.opp !== opp) return;
    const t = R.t;
    if (busy(me) || busy(opp)) { R.guardUntil = -1; return; }
    const dx = Math.abs(opp.cx() - me.cx()), dy = Math.abs(opp.cy() - me.cy());
    const opR = reachOf(opp), myR = reachOf(me);

    // ── guard read ──
    if (R.guardUntil >= 0) {
      if (t < R.guardUntil) { act[2] = 1; if (act[3] === 1) act[3] = 0; act[0] = 1; return; }
      R.guardUntil = -1;
      act[2] = 0;   // let it rest: the next parry needs SHIELD_PARRY_REST frames down
    }
    const restNeed = typeof SHIELD_PARRY_REST !== 'undefined' ? SHIELD_PARRY_REST : 20;
    // Air guards count (SHIELD_AIR): most hits land on an airborne fighter. They drain
    // the meter 1.5x, so the air needs more of it left.
    const canGuard = !(me._landLag > 0) && !(me.attackTimer > 0) && (me.shieldHP || 0) >= (me.onGround ? 15 : 22);
    const oppSwinging = (opp.attackTimer || 0) > 0;
    if (R.dbg) { R.dbg.calls++; if (!canGuard) R.dbg.noGuard++; else if (!(dx < opR * 1.3 && dy < 120)) R.dbg.far++; else if (oppSwinging) R.dbg.swinging++; }
    if (canGuard && dx < opR * 1.3 && dy < 120 && !oppSwinging) {
      const soon = predict(R, 1, 7);
      if (R.dbg) { const d = R.dbg; d.eval++; if (soon.anchor) { d.withEv++; d.pSum += soon.p; d.liftSum += soon.lift;
        if (soon.p >= CFG.raiseP) d.pOk++; if (soon.lift >= CFG.raiseLift) d.liftOk++; }
        if (!me.shielding && (me._shieldDownFrames || 0) >= restNeed) d.rested++; }
      // Rested = this raise can parry. Unrested still blocks, which saves the hit and
      // leaves the swing minus, so the read guards either way (or keeps a held guard up).
      if (soon.p >= CFG.raiseP && soon.lift >= CFG.raiseLift) {
        R.guardUntil = t + GUARD_FRAMES; R.guardAnchor = soon.anchor; R.stats.guards++;
        act[2] = 1; if (act[3] === 1) act[3] = 0; act[0] = 1;
        return;
      }
      // A read swing is coming but not yet: keep the net from spending the guard early.
      if (CFG.rest && act[2] === 1 && !me.shielding) {
        const later = predict(R, 1, 24);
        if (later.p >= HOLD_P && later.lift >= CFG.raiseLift) { act[2] = 0; R.stats.rested++; }
      }
    }

    // ── guard-drop read ──
    const canSwing = !(me.attackTimer > 0) && !(me.attackEndlag > 0);
    if (CFG.drop && opp.shielding && R.oShStart >= 0 && canSwing && dx < myR * 1.1 && dy < 100) {
      const h = t - R.oShStart;
      const d = predictDrop(R, h, 1, 5);
      // One hit from breaking: the net's swing is the right call regardless.
      const breakable = (opp.shieldHP || 0) <= 12;
      if (d.ev >= DROP_EV && !breakable) {
        if (act[3] === 1 && d.p < WAIT_P) { act[3] = 0; R.stats.heldSwings++; }
        else if (act[3] !== 1 && d.p >= DROP_P) { act[3] = 1; act[2] = 0; R.stats.dropSwings++; R.dropSwingAt = t; }
      }
    }
  }

  // Sovereign names the habit the first time a read pays off against it (live only).
  const LINES = {
    cad:   'Same rhythm every time. I can count it.',
    land:  'You swing the instant your feet touch down.',
    reach: 'Step in, swing. Step in, swing.',
    mine:  'You answer my swing on cue.',
    drop:  'You always lower your guard at the same moment.',
  };
  function _say(R, me, key) {
    if (!R.live || !key || R.said[key] || R.lineCd > 0) return;
    if (typeof showBossDialogue !== 'function' || !me || me.name === 'BRAIN') return;
    R.said[key] = true; R.lineCd = 600;
    try { showBossDialogue(LINES[key], 180); } catch (e) {}
  }

  // What it currently believes about the opponent, strongest first (console `read`).
  function describe(R) {
    if (!R) return [];
    const out = [];
    const base = (R.baseSw + 0.02 * K) / (R.baseEx + K);
    for (let a = 0; a < ANCHORS.length; a++) {
      let bestB = -1, bestH = 0, n = 0;
      for (let b = 0; b < NB; b++) {
        const h = (R.sw[a][b] + base * K) / (R.ex[a][b] + K);
        if (R.sw[a][b] >= 1 && h > bestH) { bestH = h; bestB = b; n = R.sw[a][b]; }
      }
      if (bestB >= 0) out.push({ read: ANCHOR_TEXT[ANCHORS[a]], at: `${bestB * BIN}-${bestB * BIN + BIN - 1}f`,
        strength: +(bestH / base).toFixed(1), evidence: +n.toFixed(1) });
    }
    let hb = -1, hh = 0, hn = 0;
    for (let b = 0; b < NHB; b++) {
      const h = (R.hd[b] + 0.03 * K) / (R.hx[b] + K);
      if (R.hd[b] >= 1 && h > hh) { hh = h; hb = b; hn = R.hd[b]; }
    }
    if (hb >= 0) out.push({ read: 'drops its guard after', at: `${hb * HBIN}-${hb * HBIN + HBIN - 1}f`, strength: +hh.toFixed(2), evidence: +hn.toFixed(1) });
    return out.sort((x, y) => y.strength - x.strength);
  }

  return {
    create, frame, adjust, predict, describe, CFG,
    get enabled() { return enabled; }, set enabled(v) { enabled = !!v; },
  };
})();
