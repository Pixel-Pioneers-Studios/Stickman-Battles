'use strict';
// ============================================================
// SOV HABITS — cross-fight posture ledger (habit engine, Phase 1)
// ============================================================
// Why this exists: docs/sovereign-adaptive-project.md, 2026-09-23. Across 794
// human openers in 16 replays, 54% landed while Sovereign was AIRBORNE. He is
// airborne ~60% of every match and it never changes — his own jump habit is
// the player's single biggest damage source, and nothing before this measured
// or acted on it.
//
// This module is the PLAYER MODEL half of the fix: a per-opponent ledger of
// "when the WATCHER (whoever is fighting them) holds posture P, how often does
// the opponent punish it, and how often does the watcher land a hit from it".
// It is filled by every fight — story enemies, versus bots, training, and
// Sovereign's own matches — not only Sovereign's, because the user's own idea
// was "the other bots scout for him". Consumers (currently just C1, the launch
// veto in smb-smk2-class.js's _habitGate) read it back per opponent.
//
// Globals-based, no modules. Loaded right after smb-sov-dossier.js, before
// smb-smk2-class.js. Depends on nothing beyond a Fighter-shaped object
// (health, onGround, cx/cy, timers) and, optionally, AccountManager/frameCount.

const SOV_HABIT_KEY   = 'sov_habits_v1';
const SOV_HABIT_MAX   = 32;     // records before the coldest are evicted (human keys only)
const SOV_HABIT_DECAY = 0.94;
// Innate prior for C2 descent arms, {win, loss, none} pseudo-counts worth ~30
// descents. Measured 2026-09-23 vs the calibrated human proxy (240 rematch pairs):
// strike +0.18 win-loss, dive +0.02, default -0.05, drift -0.10. A new opponent is
// met with that population knowledge; their own ~30 descents outvote it.
const SOV_DESCENT_PRIOR = {
  strike:  [14.5,  9.2, 6.3],
  dive:    [10.9, 10.3, 8.8],
  default: [10.5, 12.0, 7.5],
  drift:   [ 7.2, 10.2, 12.6],
};
const SOV_DESCENT_WINDOW = 150;   // per-arm decisions kept at full weight   // applied to counts on load — old reads fade, mirrors SovDossier
const SOV_HABIT_POSTURES = ['air', 'landing', 'committed', 'ground'];
// Weak Gamma-Poisson prior: alpha=1 opener, beta=10 seconds of exposure. Two or
// three real observations should be enough to move it off the prior.
const SOV_HABIT_PRIOR_A = 1;
const SOV_HABIT_PRIOR_B = 10;

// C2 (see docs/sovereign-adaptive-project.md, "C2 design: descent control", and
// _descentControl in smb-smk2-class.js): a per-opponent Thompson-sampling
// gambler over what to do the instant he starts falling near a target with no
// attack out — his single worst moment, measured as 30% of every opener the
// player lands. Counts are Dirichlet(1+win,1+loss,1+none) per arm; outcome is
// "who opens first within 45 frames of the decision" (+1 him, -1 opponent, 0
// neither).
const SOV_HABIT_DESCENT_ARMS = ['default', 'strike', 'dive', 'drift'];

const SovHabits = (() => {
  let _store = null;     // { [key]: record }
  let _dirty = false;
  let _saveTimer = 0;
  let _ephCounter = 0;

  function _blankPosture() { return { exp: 0, dealt: 0, taken: 0 }; }
  function _blankDescentArm() { return { win: 0, loss: 0, none: 0, dmgNet: 0 }; }

  function _blank(key) {
    const postures = {};
    for (const p of SOV_HABIT_POSTURES) postures[p] = _blankPosture();
    const descent = {};
    for (const a of SOV_HABIT_DESCENT_ARMS) descent[a] = _blankDescentArm();
    return { key, postures, descent, lastSeen: 0 };
  }

  function _isPersisted(key) { return typeof key === 'string' && key.indexOf('human:') === 0; }

  function load() {
    if (_store) return _store;
    _store = {};
    try {
      const raw = localStorage.getItem(SOV_HABIT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const k of Object.keys(parsed)) {
            const r = parsed[k];
            if (!r || typeof r !== 'object' || !r.postures) continue;
            for (const p of SOV_HABIT_POSTURES) {
              const c = r.postures[p];
              if (!c) { r.postures[p] = _blankPosture(); continue; }
              c.exp   = (c.exp   || 0) * SOV_HABIT_DECAY;
              c.dealt = (c.dealt || 0) * SOV_HABIT_DECAY;
              c.taken = (c.taken || 0) * SOV_HABIT_DECAY;
            }
            if (!r.descent) r.descent = {};
            for (const a of SOV_HABIT_DESCENT_ARMS) {
              const c = r.descent[a];
              if (!c) { r.descent[a] = _blankDescentArm(); continue; }
              c.win    = (c.win    || 0) * SOV_HABIT_DECAY;
              c.loss   = (c.loss   || 0) * SOV_HABIT_DECAY;
              c.none   = (c.none   || 0) * SOV_HABIT_DECAY;
              c.dmgNet = (c.dmgNet || 0) * SOV_HABIT_DECAY;
            }
            _store[k] = r;
          }
        }
      }
    } catch (e) { _store = {}; }
    return _store;
  }

  function save() {
    if (!_dirty) return;
    try {
      const s = load();
      const out = {};
      const keys = Object.keys(s).filter(_isPersisted);
      // Evict the coldest human records rather than growing without bound.
      if (keys.length > SOV_HABIT_MAX) {
        keys.sort((a, b) => (s[a].lastSeen || 0) - (s[b].lastSeen || 0));
        for (const k of keys.slice(0, keys.length - SOV_HABIT_MAX)) delete s[k];
      }
      for (const k of Object.keys(s)) if (_isPersisted(k)) out[k] = s[k];
      localStorage.setItem(SOV_HABIT_KEY, JSON.stringify(out));
      _dirty = false;
    } catch (e) { /* quota / private mode — memory-only is a valid degrade */ }
  }

  function get(key) {
    const s = load();
    if (!s[key]) s[key] = _blank(key);
    return s[key];
  }

  // ── Fingerprinting ────────────────────────────────────────────────────────
  // A human (!isAI) gets a stable, persisted key from the active account, if
  // one exists, else a shared 'local' bucket. Any other fighter gets its own
  // `_habitKey` when one is set (a bespoke enemy with a stable identity), else
  // an in-memory-only per-object key that dies with the page.
  function keyFor(f) {
    if (!f) return 'unknown';
    if (f.isAI === false) {
      let id = 'local';
      try {
        if (typeof AccountManager !== 'undefined' && AccountManager && AccountManager.getActiveAccount) {
          const acc = AccountManager.getActiveAccount();
          if (acc && acc.username) id = String(acc.username);
        }
      } catch (e) { /* AccountManager not ready — fall back to shared bucket */ }
      return 'human:' + id;
    }
    if (f._habitKey) return String(f._habitKey);
    if (!f._habitEphemeralKey) f._habitEphemeralKey = 'obj:' + (++_ephCounter);
    return f._habitEphemeralKey;
  }

  // Idempotent per object per frame: several pairs can call observe() on the
  // same frame and each object's health delta must only be computed once.
  function _hpDelta(obj, frame) {
    if (obj._habitHPFrame !== frame) {
      const prev = (obj._habitHPPrev === undefined) ? obj.health : obj._habitHPPrev;
      obj._habitHPDelta = prev - obj.health;
      obj._habitHPPrev = obj.health;
      obj._habitHPFrame = frame;
    }
    return obj._habitHPDelta || 0;
  }

  // Exact-frame lookup in a small, frame-ordered ring buffer. Returns the
  // posture recorded at `targetFrame`, or null if it fell outside the buffer's
  // (short) coverage or was itself null (juggled, not choosing).
  function _ringLookup(ring, targetFrame) {
    for (let i = ring.length - 1; i >= 0; i--) {
      const e = ring[i];
      if (e.frame === targetFrame) return e.posture;
      if (e.frame < targetFrame - 2) break;
    }
    return null;
  }

  // Called once per frame per (watcher, subject) pair. Records the WATCHER's
  // posture relative to the SUBJECT being modelled, and attributes any opener
  // since the pair's last exchange to the watcher's posture 6 frames before the
  // hit (the frame he committed to it).
  function observe(watcher, subject) {
    if (!watcher || !subject || watcher === subject) return;
    if (!(watcher.health > 0) || !(subject.health > 0)) return;
    if ((watcher.ragdollTimer || 0) > 0 || (subject.ragdollTimer || 0) > 0) return;
    const frame = (typeof frameCount !== 'undefined') ? frameCount : 0;
    if (typeof watcher.cx !== 'function' || typeof subject.cx !== 'function') return;
    const dx = Math.abs(watcher.cx() - subject.cx());
    if (dx >= 220) return;

    // Landing window: frames since this watcher last touched down.
    if (watcher.onGround) watcher._habitGroundFrames = (watcher._habitGroundFrames || 0) + 1;
    else watcher._habitGroundFrames = 0;

    let posture = null;
    if (!watcher.onGround) {
      // Airborne but being juggled is not a choice — exclude it rather than
      // crediting/blaming a posture he did not pick.
      if (!((watcher.stunTimer || 0) > 0 || (watcher.ragdollTimer || 0) > 0)) posture = 'air';
    } else if (watcher._habitGroundFrames <= 20) {
      posture = 'landing';
    } else if ((watcher.attackTimer || 0) > 0 || (watcher.attackEndlag || 0) > 0 || (watcher._landLag || 0) > 0) {
      posture = 'committed';
    } else {
      posture = 'ground';
    }

    const key = keyFor(subject);
    if (posture) {
      const r = get(key);
      r.postures[posture].exp++;
      r.lastSeen = Date.now();
      _dirty = true;
    }

    const ring = watcher._habitRing || (watcher._habitRing = []);
    ring.push({ frame, posture });
    if (ring.length > 24) ring.shift();

    const wDelta = _hpDelta(watcher, frame);
    const sDelta = _hpDelta(subject, frame);
    const dealtHit = sDelta > 0.01;   // watcher hit subject
    const takenHit = wDelta > 0.01;   // subject hit watcher
    if (dealtHit || takenHit) {
      const pairMap = watcher._habitPairMap || (watcher._habitPairMap = new Map());
      const last = pairMap.has(subject) ? pairMap.get(subject) : -9999;
      const isOpener = (frame - last) > 60;
      if (isOpener) {
        const p6 = _ringLookup(ring, frame - 6);
        if (p6) {
          const r = get(key);
          if (dealtHit) r.postures[p6].dealt++;
          if (takenHit) r.postures[p6].taken++;
          r.lastSeen = Date.now();
          _dirty = true;
        }
      }
      pairMap.set(subject, frame);
    }
  }

  // Sum of k iid Exponential(1) is Gamma(k, 1) for integer k, which alpha
  // always is here (1 + an integer opener count). Capped for cost; counts this
  // large never occur given decay, so the cap is a safety rail, not a real path.
  // Gamma(k, 1) for ANY shape k > 0 (Marsaglia-Tsang). The first version summed
  // exponentials, which needs an integer shape: it rounded (decayed counts are
  // fractional) and capped k at 400, so a player with a long history saturated —
  // 1000 wins / 800 losses read the same as 400 / 400 and arms stopped separating.
  function _gammaSample(k) {
    if (!(k > 0)) return 0;
    if (k < 1) return _gammaSample(k + 1) * Math.pow(Math.random() || 1e-12, 1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do {
        const u1 = Math.random() || 1e-12, u2 = Math.random();
        x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random() || 1e-12;
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }

  // dealt-minus-taken opener rate for `posture` against `key`: a posterior draw
  // when `sample` (for Thompson-style decisions), else the posterior mean (for
  // readouts). Positive = this posture has been good for whoever holds it
  // against this opponent; negative = this opponent punishes it.
  function postureValue(key, posture, sample) {
    const r = get(key);
    const c = r.postures[posture];
    if (!c) return 0;
    const expSec = Math.max(0, c.exp / 60);
    const aD = SOV_HABIT_PRIOR_A + c.dealt, bD = SOV_HABIT_PRIOR_B + expSec;
    const aT = SOV_HABIT_PRIOR_A + c.taken, bT = SOV_HABIT_PRIOR_B + expSec;
    let rateD, rateT;
    if (sample) { rateD = _gammaSample(aD) / bD; rateT = _gammaSample(aT) / bT; }
    else { rateD = aD / bD; rateT = aT / bT; }
    return rateD - rateT;
  }

  // ── C2: descent control ─────────────────────────────────────────────────
  // Thompson choice among the AVAILABLE arms for this decision (the caller
  // filters out arms that aren't usable right now, e.g. `strike` off cooldown
  // or `drift` walking off an edge). Draws a Dirichlet(1+win,1+loss,1+none)
  // per arm via three Gamma draws (reuses _gammaSample; all shapes here are
  // 1 + a non-negative integer count, exactly what it already supports), value
  // = p(win) - p(loss) + a damage term, argmax wins.
  function descentArm(key, available) {
    const r = get(key);
    if (!r.descent) r.descent = {};
    const arms = (available && available.length) ? available : SOV_HABIT_DESCENT_ARMS;
    let best = arms[0], bestV = -Infinity;
    for (const a of arms) {
      const c = r.descent[a] || _blankDescentArm();
      const p = SOV_DESCENT_PRIOR[a] || [1, 1, 1];
      const gw = _gammaSample(p[0] + c.win), gl = _gammaSample(p[1] + c.loss), gn = _gammaSample(p[2] + c.none);
      const sum = gw + gl + gn || 1e-9;
      // Who opens first is not the whole price: vs the player, dive won slightly
      // more openers than it lost yet cost 105 damage net over 58 descents. The
      // damage term (per decision, shrunk toward 0 over the first ~10, in units
      // of a ~15-damage exchange) lets that count.
      const n = c.win + c.loss + c.none;
      const dmgOn = !(typeof SMK2_TUNE !== 'undefined' && SMK2_TUNE && SMK2_TUNE.descentDamage === false);
      const v = (gw / sum) - (gl / sum) + (dmgOn ? (c.dmgNet || 0) / (n + 10) / 15 : 0);
      if (v > bestV) { bestV = v; best = a; }
    }
    return best;
  }

  function descentRecord(key, arm, outcome, dmgNet) {
    const r = get(key);
    if (!r.descent) r.descent = {};
    if (!r.descent[arm]) r.descent[arm] = _blankDescentArm();
    const c = r.descent[arm];
    if (outcome === 'win') c.win++;
    else if (outcome === 'loss') c.loss++;
    else c.none++;
    // Rolling window: past SOV_DESCENT_WINDOW decisions on one arm, older evidence
    // is scaled down proportionally. Keeps him a gambler against a player who
    // CHANGES — an unbounded count would take hundreds of losses to turn around.
    const tot = c.win + c.loss + c.none;
    if (tot > SOV_DESCENT_WINDOW) {
      const f = SOV_DESCENT_WINDOW / tot;
      c.win *= f; c.loss *= f; c.none *= f; c.dmgNet *= f;
    }
    c.dmgNet += (dmgNet || 0);
    r.lastSeen = Date.now();
    _dirty = true;
  }

  // No key: the active human. An unknown key used to go through get(), which
  // created a blank record and printed all zeros, reading like "learned nothing".
  function dump(key) {
    if (key === undefined) key = keyFor({ isAI: false });
    if (!load()[key]) {
      console.log('[SovHabits] no record for', key, '- known keys:', Object.keys(load()));
      return null;
    }
    const r = get(key);
    const out = {};
    for (const p of SOV_HABIT_POSTURES) {
      const c = r.postures[p];
      out[p] = {
        exp: +c.exp.toFixed(1), dealt: +c.dealt.toFixed(2), taken: +c.taken.toFixed(2),
        mean: +postureValue(key, p, false).toFixed(4),
      };
    }
    const descent = {};
    for (const a of SOV_HABIT_DESCENT_ARMS) {
      const c = r.descent[a];
      descent[a] = { win: +c.win.toFixed(1), loss: +c.loss.toFixed(1), none: +c.none.toFixed(1), dmgNet: +c.dmgNet.toFixed(1) };
    }
    console.log('[SovHabits]', key, out, descent);
    return { postures: out, descent };
  }

  function tick() {
    if (++_saveTimer >= 600) { _saveTimer = 0; save(); }   // ~10s
  }

  function reset() {
    _store = {}; _dirty = true;
    try { localStorage.removeItem(SOV_HABIT_KEY); } catch (e) {}
  }

  return { load, save, get, keyFor, observe, postureValue, descentArm, descentRecord, dump, tick, reset, _raw: () => load() };
})();
