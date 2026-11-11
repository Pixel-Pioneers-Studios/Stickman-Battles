'use strict';
// SOVEREIGN LAYER 1: opponent intelligence. Watches one opponent every frame and keeps the same behaviour
// tallies over three timescales (short ~2 s, medium ~8 s, long ~30 s), then scores how far the recent
// windows have drifted from the long one: a sudden change in how the opponent plays. Scripted bookkeeping,
// no weights, no keys. Nothing reads it in a live match yet; Brain.rollout runs it with opts.intel
// (tools/brain/intelbench.js, experiment B). Depends on nothing; Fighter fields only.

const SovIntel = (() => {
  // Half-lives in frames.
  const HALF = { s: 120, m: 480, l: 1800 };
  const DECAY = { s: Math.pow(0.5, 1 / HALF.s), m: Math.pow(0.5, 1 / HALF.m), l: Math.pow(0.5, 1 / HALF.l) };
  const KEYS = ['s', 'm', 'l'];

  // What the opponent does, each measured only when its condition holds (den counts those frames).
  const FEATURES = [
    'approach',      //  0 moving toward me, when it moves
    'distance',      //  1 how far it stays (0..1 of 500 px)
    'airborne',      //  2 time in the air
    'guardOnSwing',  //  3 guard up while I swing in reach
    'guardSit',      //  4 guard up while I am not swinging
    'swingRate',     //  5 swing starts per frame
    'whiff',         //  6 of its swings, thrown out of reach
    'jumpRate',      //  7 jump starts per frame
    'abilityRate',   //  8 ability uses per frame
    'fromAbove',     //  9 of its swings, thrown from above me
    'whiffPunish',   // 10 swings while I am in endlag in its reach
    'antiAir',       // 11 swings as I fall into its reach
    // Habits: what it does in the POST frames after its own whiff or the end of its stun.
    'postGuard',     // 12 guard up
    'postSwing',     // 13 mid-swing
    'postAir',       // 14 in the air
    'postBack',      // 15 moving away from me
  ];
  const POST = 40;
  const NF = FEATURES.length;

  function create() {
    const w = {};
    for (const k of KEYS) w[k] = { num: new Float64Array(NF), den: new Float64Array(NF), sq: new Float64Array(NF) };
    return { w, p: null, n: 0, last: null, post: 0, hp0: 0 };
  }

  // One frame of evidence about `opp`, seen by `me`.
  function frame(S, me, opp) {
    if (!S || !me || !opp || me.health <= 0 || opp.health <= 0) { if (S) S.p = null; return; }
    const now = { ref: opp, oAtk: opp.attackTimer || 0, oG: !!opp.onGround, oAbi: opp.abilityCooldown || 0, oStun: opp.stunTimer || 0 };
    const p = S.p;
    S.p = now;
    if (!p || p.ref !== opp) return;
    const dx = Math.abs(opp.cx() - me.cx()), dy = opp.cy() - me.cy();
    const myR = ((me.weapon && me.weapon.range) || 60) * 1.4 + 20;
    const opR = ((opp.weapon && opp.weapon.range) || 60) * 1.4 + 20;
    const oSwing = now.oAtk > 0 && p.oAtk === 0 ? 1 : 0;
    const towardMe = Math.sign(me.cx() - opp.cx());
    const sh = opp.shielding ? 1 : 0;
    if (now.oAtk > 0 && p.oAtk === 0) S.hp0 = me.health;
    if ((p.oAtk > 0 && now.oAtk === 0 && me.health >= S.hp0) || (p.oStun > 0 && now.oStun === 0)) S.post = POST;
    const inPost = S.post > 0 && now.oStun === 0;
    if (S.post > 0) S.post--;
    const v = _v, c = _c;
    c[0] = Math.abs(opp.vx || 0) > 1.5;          v[0] = Math.sign(opp.vx || 0) === towardMe ? 1 : 0;
    c[1] = true;                                  v[1] = Math.min(1, dx / 500);
    c[2] = true;                                  v[2] = now.oG ? 0 : 1;
    c[3] = (me.attackTimer || 0) > 0 && dx < myR;  v[3] = sh;
    c[4] = !((me.attackTimer || 0) > 0);           v[4] = sh;
    c[5] = true;                                  v[5] = oSwing;
    c[6] = !!oSwing;                              v[6] = dx > opR ? 1 : 0;
    c[7] = true;                                  v[7] = p.oG && !now.oG && (opp.vy || 0) < -8 ? 1 : 0;
    c[8] = true;                                  v[8] = now.oAbi > p.oAbi + 5 ? 1 : 0;
    c[9] = !!oSwing;                              v[9] = dy < -30 ? 1 : 0;
    c[10] = (me.attackEndlag || 0) > 0 && dx < opR; v[10] = oSwing;
    c[11] = !me.onGround && (me.vy || 0) > 0 && dx < opR * 1.2; v[11] = oSwing;
    c[12] = inPost;                               v[12] = sh;
    c[13] = inPost;                               v[13] = now.oAtk > 0 ? 1 : 0;
    c[14] = inPost;                               v[14] = now.oG ? 0 : 1;
    c[15] = inPost;                               v[15] = Math.abs(opp.vx || 0) > 1.5 && Math.sign(opp.vx || 0) !== towardMe ? 1 : 0;
    for (const k of KEYS) {
      const W = S.w[k], d = DECAY[k];
      for (let i = 0; i < NF; i++) {
        if (!c[i]) continue;
        W.num[i] = W.num[i] * d + v[i];
        W.sq[i] = W.sq[i] * d + v[i] * v[i];
        W.den[i] = W.den[i] * d + 1;
      }
    }
    S.n++;
  }
  const _v = new Float64Array(NF), _c = new Array(NF).fill(false);

  // Window value of one feature, or NaN with too little evidence.
  function value(S, k, i, minDen) {
    const W = S.w[k];
    return W.den[i] >= (minDen || 1) ? W.num[i] / W.den[i] : NaN;
  }

  // Drift of window `k` ('s' or 'm') from the long window: per-feature z, combined as the mean z^2
  // over features with enough evidence in both. Variance comes from the long window, floored so a
  // feature that was constant there can't read as infinitely surprising.
  function drift(S, k, out) {
    const A = S.w[k], L = S.w.l;
    let sum = 0, nUsed = 0, maxZ = 0;
    for (let i = 0; i < NF; i++) {
      if (A.den[i] < 8 || L.den[i] < 30) { if (out) out[i] = 0; continue; }
      const ma = A.num[i] / A.den[i], ml = L.num[i] / L.den[i];
      const vl = Math.max(0.002, L.sq[i] / L.den[i] - ml * ml);
      const z = (ma - ml) / Math.sqrt(vl / A.den[i] + vl / L.den[i]);
      if (out) out[i] = z;
      sum += z * z; nUsed++;
      if (Math.abs(z) > maxZ) maxZ = Math.abs(z);
    }
    return { score: nUsed ? sum / nUsed : 0, maxZ, nUsed };
  }

  // Re-anchor the long window to window `k` after a detected change, so it describes the new behaviour
  // instead of averaging old and new for the next 30 s.
  function rebase(S, k) {
    const A = S.w[k], L = S.w.l;
    L.num.set(A.num); L.den.set(A.den); L.sq.set(A.sq);
  }

  return { FEATURES, HALF, create, frame, value, drift, rebase };
})();
