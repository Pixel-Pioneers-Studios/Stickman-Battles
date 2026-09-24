'use strict';
/*
 * tools/ghost-core.js — THE HUMAN MIMIC. DEV ONLY. Shared by the builder
 * (node, require) and the lab runtime (browser, injected with addScriptTag).
 *
 * One definition of "situation" and "action" for both sides, so what the
 * builder learns from replays is exactly what the runtime looks up.
 *
 *   situation  what a human could perceive ~12 frames ago: distance band,
 *              height relation, who is grounded, whether the opponent is
 *              swinging / guarding / locked, own HP band, super ready, back
 *              to the wall.
 *   action     per 3-frame step (replay sampling): move toward / away / none,
 *              jump, attack start, shield held, super.
 *   mode       a ~1.5 s label on the human's play (press, poke, guard,
 *              retreat, air, neutral) — the menu the HYBRID chooses from.
 *
 * Two controllers:
 *   ghost   — static mimic: human action frequencies per situation.
 *   hybrid  — same human hands, but WHICH mode's hands is chosen by a
 *             Sovereign-style ledger (net damage per situation x mode,
 *             Thompson sampling), capped at human limits: it perceives with
 *             the same lag and may switch mode at most every 30 frames.
 */
(function (root) {

  const LAG = 12;          // frames of perception delay (~200 ms)
  const STEP = 3;          // decision granularity == replay sampling
  const MODES = ['press', 'poke', 'guard', 'retreat', 'air', 'neutral'];
  const D_EDGES = [45, 80, 120, 170, 260, 400];

  const dBin = d => { let i = 0; while (i < D_EDGES.length && d >= D_EDGES[i]) i++; return i; };

  // s / o: { x, y, vx, vy, atk, sh, g, stn, rag, hp, mhp, sm }
  function situation(s, o) {
    const d = Math.abs(o.x - s.x);
    const dy = o.y - s.y;
    const dirTo = Math.sign(o.x - s.x) || 1;
    const wall = (dirTo > 0 && s.x < 90) || (dirTo < 0 && s.x > 810) ? 'W' : '-';
    const hpf = (s.hp || 0) / Math.max(1, s.mhp || 100);
    const f = {
      d: dBin(d),
      dy: dy < -60 ? 'A' : dy > 60 ? 'B' : 'L',
      sg: s.g ? 1 : 0, og: o.g ? 1 : 0,
      oa: o.atk ? 1 : 0, os: o.sh ? 1 : 0, ol: (o.stn > 0 || o.rag > 0) ? 1 : 0,
      hp: hpf < 0.3 ? 0 : hpf < 0.65 ? 1 : 2,
      sr: (s.sm || 0) >= 100 ? 1 : 0,
      wall,
      // He is rushing in: the cue a human reads BEFORE his swing flag is up.
      // Without it the ghost was hit 3-9x as often as a human at the same
      // distance on the ground (1b EXPOSURE in ghost-test).
      oc: (Math.sign(o.vx || 0) === -dirTo && Math.abs(o.vx || 0) > 3) ? 1 : 0,
    };
    return [
      `${f.d}|${f.dy}|${f.sg}${f.og}|${f.oa}${f.os}${f.ol}${f.oc}|${f.hp}${f.sr}|${f.wall}`,
      `${f.d}|${f.dy}|${f.sg}|${f.oa}${f.os}${f.ol}${f.oc}`,
      `${f.d}|${f.dy}|${f.oa}${f.oc}`,
      `${f.d}`,
      '*',
    ];
  }

  // Persistence. A human HOLDS a key for hundreds of ms; sampling each 3-frame
  // step independently made the first ghost jitter toward/away every step and
  // turn around mid-swing (it moved 93% of the time vs a human's 74% and fought
  // 40px closer). Every lookup is therefore conditioned on what the hands were
  // already doing, falling back to the unconditioned levels when that is thin.
  function keysWithPrev(keys, prev) {
    const p = (prev && prev.mv || 'n') + (prev && prev.sh ? 1 : 0) + ':';
    return keys.slice(0, -1).map(k => p + k).concat(keys);
  }

  // Action taken between samples a and b (3 frames apart) by fighter s vs o.
  function action(sa, sb, oa) {
    const dirTo = Math.sign(oa.x - sa.x) || 1;
    const vx = sb.vx || 0;
    const mv = Math.abs(vx) < 1.5 ? 'n' : (Math.sign(vx) === dirTo ? 't' : 'a');
    return {
      mv,
      jmp: (sb.vy <= -10 && sa.vy > -8) ? 1 : 0,
      atk: (sb.atk && !sa.atk) ? 1 : 0,
      sh: sb.sh ? 1 : 0,
      sup: ((sa.sm || 0) >= 100 && (sb.sm || 0) < 50) ? 1 : 0,
    };
  }

  // Mode label for sample i from a +-15 sample window of the SAME fighter.
  function modeAt(S, O, i) {
    const lo = Math.max(1, i - 15), hi = Math.min(S.length - 1, i + 15);
    let n = 0, sh = 0, air = 0, atk = 0, dsum = 0, dd = 0;
    for (let k = lo; k <= hi; k++) {
      const s = S[k], o = O[k], sp = S[k - 1], op = O[k - 1];
      if (!s || !o || !sp || !op) continue;
      n++; sh += s.sh ? 1 : 0; air += s.g ? 0 : 1; atk += (s.atk && !sp.atk) ? 1 : 0;
      const d = Math.abs(o.x - s.x); dsum += d; dd += d - Math.abs(op.x - sp.x);
    }
    if (!n) return 'neutral';
    const shR = sh / n, airR = air / n, atkR = atk / n, dMean = dsum / n, close = dd / n;
    // Intent first, movement last: humans on this stage are airborne most of
    // the time, so testing 'air' first labelled 77% of all play 'air' and left
    // the hybrid nothing to choose between.
    if (shR >= 0.35) return 'guard';
    if (close < -1.0 || (dMean < 90 && atkR >= 0.12)) return 'press';
    if (close > 1.0 && atkR < 0.05) return 'retreat';
    if (dMean >= 70 && dMean <= 170 && atkR >= 0.05) return 'poke';
    if (airR >= 0.6) return 'air';
    return 'neutral';
  }

  function blankCell() { return { n: 0, t: 0, a: 0, jmp: 0, atk: 0, sh: 0, sup: 0 }; }
  function addTo(tbl, keys, act) {
    for (const k of keys) {
      const c = tbl[k] || (tbl[k] = blankCell());
      c.n++; if (act.mv === 't') c.t++; else if (act.mv === 'a') c.a++;
      c.jmp += act.jmp; c.atk += act.atk; c.sh += act.sh; c.sup += act.sup;
    }
  }

  // Replay-format fighter stream -> training samples. `me`/`opp` are indices.
  // Lagged: the situation is what the human could see LAG frames before acting.
  // `inputAt(i)` (optional) returns the recorded input mask over frames
  // (i*STEP, (i+1)*STEP] for replays that carry an input track; when present it
  // replaces the state-inferred attack / jump / shield / move.
  function extract(frames, me, opp, sink, inputAt) {
    const lagS = Math.round(LAG / STEP);
    const S = frames.map(f => f && f[me]), O = frames.map(f => f && f[opp]);
    for (let i = lagS + 1; i < frames.length - 1; i++) {
      const s0 = S[i - lagS], o0 = O[i - lagS], sa = S[i], sb = S[i + 1], oa = O[i];
      if (!s0 || !o0 || !sa || !sb || !oa) continue;
      if (sa.stn > 0 || sa.rag > 0 || sb.stn > 0 || sb.rag > 0) continue;   // not acting
      if (sa.hp <= 1 || (sa.inv || 0) > 500) continue;                       // death freeze / finisher
      const act = action(sa, sb, oa);
      if (inputAt) {
        const m = inputAt(i);
        if (m) {
          const dirTo = Math.sign(oa.x - sa.x) || 1;
          const dx = ((m.held & 2) ? 1 : 0) - ((m.held & 1) ? 1 : 0);
          act.mv = dx === 0 ? 'n' : (dx === dirTo ? 't' : 'a');
          act.atk = (m.pressed & 32) ? 1 : 0;
          act.jmp = m.jumpEdge ? 1 : 0;
          act.sh  = (m.held & 8) ? 1 : 0;
          act.sup = (m.pressed & 128) ? 1 : 0;
        }
      }
      const sp = S[i - 1], op = O[i - 1];
      const prev = (sp && op && !(sp.stn > 0 || sp.rag > 0)) ? action(sp, sa, op) : null;
      sink(keysWithPrev(situation(s0, o0), prev), act, modeAt(S, O, i));
    }
  }

  // ── Runtime ────────────────────────────────────────────────────────────────
  function snap(f) {
    return { x: f.x, y: f.y, vx: f.vx || 0, vy: f.vy || 0, atk: (f.attackTimer || 0) > 0 ? 1 : 0,
             sh: f.shielding ? 1 : 0, g: f.onGround ? 1 : 0, stn: f.stunTimer || 0, rag: f.ragdollTimer || 0,
             hp: f.health, mhp: f.maxHealth, sm: f.superMeter || 0, inv: f.invincible || 0 };
  }

  function lookup(tbl, keys) {
    for (const k of keys) { const c = tbl && tbl[k]; if (c && c.n >= 8) return c; }
    return tbl && tbl['*'];
  }

  // Build an updateAI for `self` (a Fighter with aiTickInterval = 1).
  //   model: { global, modes: {mode: table}, modeFreq: {mode: p} }
  //   opts:  { kind: 'ghost' | 'modes' | 'hybrid', ledger, log }
  function controller(model, opts) {
    const o = opts || {};
    const hist = [];                 // [{me, op}] per frame, for perception lag
    const rec = [];                  // replay-shaped samples for validation stats
    let held = { mv: 'n', sh: 0 };
    let mode = 'neutral', modeUntil = 0, modeStart = 0, modeKey = null, dmg0 = 0, taken0 = 0;
    let frame = 0;
    const pickFreq = () => {
      let r = Math.random(), acc = 0;
      for (const m of MODES) { acc += (model.modeFreq[m] || 0); if (r <= acc) return m; }
      return 'neutral';
    };
    const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random();
                          return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

    function closeMode(self, tgt) {
      if (!modeKey || !o.ledger) return;
      const dur = Math.max(1, frame - modeStart);
      const dealt = (self._ghostDealt || 0) - dmg0, taken = (self._ghostTaken || 0) - taken0;
      const r = (dealt - taken) / dur * 60;             // net damage per second in that mode
      const row = o.ledger[modeKey] || (o.ledger[modeKey] = {});
      const c = row[mode] || (row[mode] = { n: 0, r: 0, r2: 0 });
      c.n++; c.r += r; c.r2 += r * r;
    }
    function chooseMode(self, perc) {
      const k = situation(perc.me, perc.op)[2];          // coarse: distance | height | they swing
      if (o.kind === 'modes') return { m: pickFreq(), k };
      // hybrid: a quarter of choices stay with human habit so it never stops
      // looking human; the rest are the ledger's call.
      if (Math.random() < 0.25) return { m: pickFreq(), k };
      const row = (o.ledger && o.ledger[k]) || {};
      let best = 'neutral', bd = -Infinity;
      for (const m of MODES) {
        if (!(model.modeFreq[m] > 0.01)) continue;
        const c = row[m];
        const n = c ? c.n : 0, mean = n ? c.r / n : 0;
        const sd = n > 2 ? Math.sqrt(Math.max(1, c.r2 / n - mean * mean)) : 20;
        const draw = mean + (sd / Math.sqrt(n + 1)) * gauss();
        if (draw > bd) { bd = draw; best = m; }
      }
      return { m: best, k };
    }

    return function ghostAI() {
      const self = this, tgt = this.target;
      if (!tgt || tgt.health <= 0 || self.health <= 0) return;
      frame++;
      if (!self._ghostRec) self._ghostRec = rec;
      const me = snap(self), op = snap(tgt);
      hist.push({ me, op }); if (hist.length > LAG + 2) hist.shift();
      if (frame % STEP === 0) rec.push([me, op]);
      // Damage bookkeeping for the ledger (health deltas, respawn refills ignored).
      if (self._gPrevOpHp !== undefined && tgt.health < self._gPrevOpHp) self._ghostDealt = (self._ghostDealt || 0) + (self._gPrevOpHp - tgt.health);
      if (self._gPrevHp !== undefined && self.health < self._gPrevHp) self._ghostTaken = (self._ghostTaken || 0) + (self._gPrevHp - self.health);
      self._gPrevOpHp = tgt.health; self._gPrevHp = self.health;

      const incap = (self.stunTimer || 0) > 0 || (self.ragdollTimer || 0) > 0;
      const perc = hist[0];
      const spd = 5.2 * (self.classSpeedMult || 1);
      const dirTo = Math.sign(tgt.x - self.x) || 1;

      if (frame % STEP === 0 && !incap) {
        if (o.kind !== 'ghost' && frame >= modeUntil) {
          closeMode(self, tgt);
          const c = chooseMode(self, perc);
          mode = c.m; modeKey = c.k; modeStart = frame; modeUntil = frame + 30 + Math.floor(Math.random() * 60);
          dmg0 = self._ghostDealt || 0; taken0 = self._ghostTaken || 0;
          if (o.log) o.log[mode] = (o.log[mode] || 0) + 1;
        }
        const keys = keysWithPrev(situation(perc.me, perc.op), held);
        const tbl = (o.kind === 'ghost') ? model.global : (model.modes[mode] || model.global);
        let c = lookup(tbl, keys);
        if (!c || c.n < 8) c = lookup(model.global, keys);
        if (c && c.n > 0) {
          const r = Math.random();
          held.mv = r < c.t / c.n ? 't' : r < (c.t + c.a) / c.n ? 'a' : 'n';
          held.sh = Math.random() < c.sh / c.n ? 1 : 0;
          if (Math.random() < c.jmp / c.n) {
            if (self.onGround || (self.coyoteFrames > 0 && !self.canDoubleJump)) { self.vy = -17; self.canDoubleJump = true; self.coyoteFrames = 0; }
            else if (self.canDoubleJump) { self.vy = -13; self.canDoubleJump = false; }
          }
          if (!held.sh && Math.random() < c.atk / c.n && (self.cooldown || 0) <= 0) self.attack(tgt);
          if (self.superReady && Math.random() < c.sup / c.n) self.useSuper(tgt);
        }
      }
      if (incap) { self.shielding = false; return; }
      // Held inputs apply every frame, the way keysDown does.
      if (held.mv === 't') { self.vx = dirTo * spd; self.facing = dirTo; }
      else if (held.mv === 'a') { self.vx = -dirTo * spd; self.facing = -dirTo; }
      self.shielding = !!held.sh;
    };
  }

  // Replay-shaped stats, so ghost matches and human replays are scored by the
  // same code. rec: [[me, op], ...] at 3-frame sampling.
  function stats(rec) {
    let n = 0, atk = 0, jmp = 0, sh = 0, air = 0, dsum = 0, sup = 0, tw = 0, aw = 0;
    let gj = 0, aj = 0, stints = 0, stintLen = 0, cur = 0, hitAir = 0, hits = 0;
    const expo = {};   // distance band + ground/air -> time spent, hits taken
    for (let i = 1; i < rec.length; i++) {
      const [a, oa] = rec[i - 1], [b] = rec[i];
      if (!a || !b || !oa) continue;
      if (a.stn > 0 || a.rag > 0 || a.hp <= 1) continue;
      const act = action(a, b, oa);
      n++; atk += act.atk; jmp += act.jmp; sh += act.sh; air += b.g ? 0 : 1; sup += act.sup;
      if (act.jmp) { if (a.g) gj++; else aj++; }
      if (!b.g) cur++; else if (cur) { stints++; stintLen += cur; cur = 0; }
      if (b.hp < a.hp) { hits++; if (!a.g) hitAir++; }
      const ek = dBin(Math.abs(oa.x - a.x)) + (a.g ? 'g' : 'a');
      const ec = expo[ek] || (expo[ek] = { n: 0, hits: 0 });
      ec.n++; if (b.hp < a.hp) ec.hits++;
      dsum += Math.abs(oa.x - a.x); if (act.mv === 't') tw++; else if (act.mv === 'a') aw++;
    }
    const per1k = v => +(v / Math.max(1, n * STEP) * 1000).toFixed(2);
    return { samples: n, atkPer1k: per1k(atk), jumpPer1k: per1k(jmp), superPer1k: per1k(sup),
             shieldPct: +(100 * sh / Math.max(1, n)).toFixed(1), airPct: +(100 * air / Math.max(1, n)).toFixed(1),
             meanDist: Math.round(dsum / Math.max(1, n)),
             towardPct: +(100 * tw / Math.max(1, n)).toFixed(1), awayPct: +(100 * aw / Math.max(1, n)).toFixed(1),
             groundJumpPer1k: per1k(gj), airJumpPer1k: per1k(aj),
             airStintFrames: Math.round(STEP * stintLen / Math.max(1, stints)),
             hitWhileAirPct: +(100 * hitAir / Math.max(1, hits)).toFixed(1), expo };
  }

  const api = { LAG, STEP, MODES, situation, action, modeAt, extract, addTo, blankCell, controller, stats, snap };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.HumanGhost = api;
})(typeof window !== 'undefined' ? window : this);
