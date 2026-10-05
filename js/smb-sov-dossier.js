// ============================================================
// SOVEREIGN DOSSIER — persistent, generalizing opponent memory
// ============================================================
// Why this exists:
//
// SovereignMK2 already reads his opponent well (`_getCounterStrategy` scores
// jump/attack/shield/dodge rates; `_strategyFail` scores whether the counter he
// picked actually stopped the bleeding). None of that survived contact with
// reality, for three separate reasons:
//
//   1. `_oppMemory` is a Map keyed on the FIGHTER OBJECT. Every match builds new
//      Fighter instances, so the same human returning for round 2 is a total
//      stranger. In a 1v1 `_switchTarget` also fires exactly once — at spawn,
//      from a null target — so the map is written to zero times in the mode he
//      is actually fought in.
//   2. `_strategyFail` — the only genuinely learned counter-knowledge in the
//      class — is a bare object rebuilt per match and never keyed to WHO it was
//      learned against.
//   3. Measured (tools/sov-adapt-probe.js, 9 trials): his four aiMemory dials
//      converge to the same endpoint against a hammer berserker, a katana
//      assassin and a spear zoner. Between-opponent SD was SMALLER than
//      rep-to-rep noise on all four. He was adapting to the scoreline, never to
//      the person.
//
// This module is the persistent half of the fix. It files what he learns under a
// STABLE fingerprint that survives match restarts and page reloads, and — more
// importantly — under a behavioural archetype as well as an exact kit, so an
// opponent he has never seen still inherits what he learned from opponents who
// FOUGHT like them. That generalization is the whole point: "adapts to anyone"
// is not achievable by memorizing individuals.
//
// Globals-based, no modules. Loaded before smb-smk2-class.js.

const SOV_DOSSIER_KEY     = 'sov_dossier_v1';
// Raised 64 -> 128 on 2026-09-20: _dossierKeys now files a third, JOINT
// kit|behaviour record per opponent (see the note there), so the same number of
// distinct opponents costs 50% more records. At 64 the coldest were being evicted
// after roughly 21 opponents, which would have thrown away the specialised build
// memory first — it is always the youngest.
const SOV_DOSSIER_MAX     = 128;     // records before the coldest are evicted
const SOV_DOSSIER_DECAY   = 0.94;    // applied to counts on load — old reads fade
const SOV_ARCHETYPES      = ['rusher', 'turtle', 'zoner', 'aerial', 'mixed'];

const SovDossier = (() => {
  let _store = null;    // { [key]: record }
  let _dirty = false;
  let _saveTimer = 0;

  function _blank(key) {
    return {
      key,
      n: 0,              // engagements filed under this record
      frames: 0,         // live frames observed
      strat: {},         // strategy -> { used, leaked, stopped }
      dials: null,       // { agg, def, spc, rxn } running mean of endpoints
      loadout: {},       // loadoutKey -> { n, dmg } running mean of damage/life
      grid: null,        // sit -> action -> { tries, taken, dealt } (SMK2 tactic grid)
      lastSeen: 0,
    };
  }

  function load() {
    if (_store) return _store;
    _store = {};
    try {
      const raw = localStorage.getItem(SOV_DOSSIER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          for (const k of Object.keys(parsed)) {
            const r = parsed[k];
            if (!r || typeof r !== 'object') continue;
            // Decay on load, not on write: a record that keeps being confirmed
            // stays sharp, one that is never revisited quietly loses authority
            // instead of asserting a stale read forever.
            r.n = (r.n || 0) * SOV_DOSSIER_DECAY;
            for (const s of Object.keys(r.strat || {})) {
              const e = r.strat[s];
              e.used = (e.used || 0) * SOV_DOSSIER_DECAY;
              e.leaked = (e.leaked || 0) * SOV_DOSSIER_DECAY;
              e.stopped = (e.stopped || 0) * SOV_DOSSIER_DECAY;
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
      // Evict the coldest records rather than growing without bound.
      const keys = Object.keys(s);
      if (keys.length > SOV_DOSSIER_MAX) {
        keys.sort((a, b) => (s[a].lastSeen || 0) - (s[b].lastSeen || 0));
        for (const k of keys.slice(0, keys.length - SOV_DOSSIER_MAX)) delete s[k];
      }
      localStorage.setItem(SOV_DOSSIER_KEY, JSON.stringify(s));
      _dirty = false;
    } catch (e) { /* quota / private mode — memory-only is a valid degrade */ }
  }

  // ── Fingerprinting ────────────────────────────────────────────────────────
  // TWO keys per opponent, deliberately.
  //
  // `kit:<weapon>/<class>` is exact and high-confidence but only matches someone
  // holding the identical loadout. `beh:<archetype>` is coarse and matches anyone
  // who FIGHTS the same way regardless of kit. Reads blend them weighted by
  // sample count, so a familiar kit dominates when he has seen it and the
  // behavioural record carries him against a stranger. Without the second key he
  // would be helpless against every unseen loadout, which is precisely the
  // "adapts to anyone" requirement.
  function kitKey(f) {
    if (!f) return 'kit:unknown/none';
    return 'kit:' + (f.weaponKey || 'none') + '/' + (f.charClass || 'none');
  }

  // Archetype from measured behaviour, not from kit. Rates are 0..1 shares of
  // observed non-idle actions; `air` is the share of frames spent off the ground.
  // Cut points are calibrated against measured frame shares, not guessed, and the
  // ORDER matters as much as the values. Measured across scripted opponents:
  //
  //   turtle  shield 0.30  air 0.13  close 0.37  dist 185  attack 0.00
  //   rusher  shield 0.00  air 0.35  close 0.66  dist 131  attack 0.07  appr>>retr
  //   zoner   shield 0.00  air 0.20  close 0.55  dist 190  attack low
  //   aerial  shield 0.00  air 0.83  close 0.84  dist  92  attack 0.05
  //
  // The first version tested `air > 0.42` first and classified EVERY opponent as
  // aerial, including a turtle holding shield 30% of the fight — ordinary play
  // spends more time off the ground than the guess assumed. Guard is checked
  // first now because it is the least ambiguous signal a fighter emits: nothing
  // except a turtle holds block.
  function archetype(rates) {
    if (!rates) return 'mixed';
    const { attack = 0, shield = 0, dodge = 0, air = 0, closeShare = 0,
            approach = 0, retreat = 0, avgDist = 0 } = rates;
    if (shield + dodge * 0.5 > 0.20)                       return 'turtle';
    if (air > 0.65)                                        return 'aerial';
    if (avgDist > 175 && retreat >= approach * 0.9)        return 'zoner';
    if (approach > retreat * 1.4 && closeShare > 0.55 && attack > 0.035) return 'rusher';
    return 'mixed';
  }

  function behKey(arch) { return 'beh:' + (SOV_ARCHETYPES.includes(arch) ? arch : 'mixed'); }

  function get(key) {
    const s = load();
    if (!s[key]) s[key] = _blank(key);
    return s[key];
  }

  // ── Strategy scoring ──────────────────────────────────────────────────────
  // Called when a locked counter-strategy expires. `leaked` is how many hits got
  // through while it was held — the same signal `_strategyFail` already used, now
  // recorded permanently and per-opponent.
  function recordStrategy(keys, strategy, leaked) {
    if (!strategy) return;
    for (const key of keys) {
      const r = get(key);
      const e = r.strat[strategy] || (r.strat[strategy] = { used: 0, leaked: 0, stopped: 0 });
      e.used++;
      if (leaked >= 3) e.leaked++;
      else if (leaked <= 1) e.stopped++;
      r.lastSeen = Date.now();
    }
    _dirty = true;
  }

  // Prior failure weight for a strategy against this opponent: >0 means it has a
  // track record of leaking. Blended across the two keys by sample count so the
  // exact-kit record outvotes the archetype record once it has evidence.
  function strategyBias(keys, strategy) {
    let num = 0, den = 0;
    for (const key of keys) {
      const r = get(key);
      const e = r.strat[strategy];
      if (!e || e.used < 2) continue;
      const w = Math.min(8, e.used);
      num += w * ((e.leaked - e.stopped) / e.used);
      den += w;
    }
    return den ? num / den : 0;
  }

  // Best-known strategy against this opponent, or null when nothing is proven.
  function bestStrategy(keys, candidates) {
    let best = null, bestScore = 0.15;   // require a real edge, not noise
    for (const c of candidates) {
      const s = -strategyBias(keys, c);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return best;
  }

  // ── Dial endpoints ────────────────────────────────────────────────────────
  // The place a fight drove his dials to IS the learned answer to that opponent.
  // Storing it lets the next fight START there instead of spending 40 seconds
  // rediscovering it — which is what makes the adaptation visible within one life
  // rather than across ten.
  function recordDials(keys, dials, weight) {
    const w = Math.max(0.1, Math.min(3, weight || 1));
    for (const key of keys) {
      const r = get(key);
      if (!r.dials) { r.dials = { ...dials }; r.n = w; }
      else {
        const a = Math.min(0.5, w / (r.n + w));   // running mean, capped step
        for (const k of Object.keys(dials)) {
          if (typeof r.dials[k] !== 'number') r.dials[k] = dials[k];
          else r.dials[k] += (dials[k] - r.dials[k]) * a;
        }
        r.n += w;
      }
      r.lastSeen = Date.now();
    }
    _dirty = true;
  }

  function dialPrior(keys) {
    let acc = null, den = 0;
    for (const key of keys) {
      const r = get(key);
      if (!r.dials || r.n < 0.75) continue;
      const w = Math.min(6, r.n);
      if (!acc) acc = { agg: 0, def: 0, spc: 0, rxn: 0 };
      for (const k of Object.keys(acc)) acc[k] += w * (r.dials[k] || 0);
      den += w;
    }
    if (!acc || !den) return null;
    for (const k of Object.keys(acc)) acc[k] /= den;
    acc._confidence = Math.min(1, den / 6);
    return acc;
  }

  // ── Tactic grid, keyed by opponent ────────────────────────────────────────
  // The dial endpoints above answer "how hard do I fight this person". The grid
  // answers "what works on them, WHERE" — 9 situations x 6 actions, scored by
  // measured consequence. It is the only record here that can express a counter
  // rather than an intensity, and it is the slowest to fill, which is exactly why
  // it has to survive the match that filled it.
  //
  // Merged rather than replaced: a returning opponent's grid is the old one plus
  // the new evidence, with the stored side decayed so a stale read loses to a
  // fresh one. Cells are capped so a long match cannot pin a cell forever.
  function recordGrid(keys, grid) {
    if (!grid) return;
    for (const key of keys) {
      const r = get(key);
      if (!r.grid) r.grid = {};
      for (const sit of Object.keys(grid)) {
        const src = grid[sit];
        const dst = r.grid[sit] || (r.grid[sit] = {});
        for (const act of Object.keys(src)) {
          const a = src[act];
          if (!a || !(a.tries > 0)) continue;
          const c = dst[act] || (dst[act] = { tries: 0, taken: 0, dealt: 0 });
          c.tries = c.tries * SOV_DOSSIER_DECAY + a.tries;
          c.taken = c.taken * SOV_DOSSIER_DECAY + a.taken;
          c.dealt = c.dealt * SOV_DOSSIER_DECAY + a.dealt;
          if (c.tries > 20) { const k = 20 / c.tries; c.tries *= k; c.taken *= k; c.dealt *= k; }
        }
      }
      r.lastSeen = Date.now();
    }
    _dirty = true;
  }

  // Blended across the keys by evidence, so the exact-kit record outvotes the
  // archetype record once it has any — and an opponent he has never met still
  // starts from what people who FIGHT like them taught him.
  function gridPrior(keys) {
    let out = null;
    for (const key of keys) {
      const r = get(key);
      if (!r.grid) continue;
      out = out || {};
      for (const sit of Object.keys(r.grid)) {
        const dst = out[sit] || (out[sit] = {});
        for (const act of Object.keys(r.grid[sit])) {
          const a = r.grid[sit][act];
          const c = dst[act] || (dst[act] = { tries: 0, taken: 0, dealt: 0 });
          c.tries += a.tries; c.taken += a.taken; c.dealt += a.dealt;
        }
      }
    }
    return out;
  }

  // ── Loadout results, keyed by opponent ────────────────────────────────────
  // The bandit added in 4.0.26 learns damage-per-life globally. Against a real
  // person the right kit is a function of THEIR kit, so the record is filed per
  // opponent and read back as a prior on the next encounter.
  function recordLoadout(keys, loadoutKey, dmg) {
    if (!loadoutKey) return;
    for (const key of keys) {
      const r = get(key);
      const e = r.loadout[loadoutKey] || (r.loadout[loadoutKey] = { n: 0, dmg: 0 });
      e.n++;
      e.dmg += (dmg - e.dmg) / e.n;
      r.lastSeen = Date.now();
    }
    _dirty = true;
  }

  function loadoutPrior(keys, loadoutKey) {
    let num = 0, den = 0;
    for (const key of keys) {
      const r = get(key);
      const e = r.loadout[loadoutKey];
      if (!e || !e.n) continue;
      const w = Math.min(5, e.n);
      num += w * e.dmg; den += w;
    }
    return den ? { mean: num / den, weight: den } : null;
  }

  // ── Mechanics, keyed to NOTHING ───────────────────────────────────────────
  // Everything above is about a person. This is about the game: what his
  // prediction-failure engine (_inferTick) has learned about how exchanges
  // resolve. The clash rule is the same against everyone, so filing it per
  // opponent would split one law of physics into 128 thin samples. One record,
  // under a key _dossierKeys can never produce.
  //
  // Without this the engine starts every match at n=0 and needs 12 predicted
  // swings before it states a single rule, so an action path could only ever
  // work in a long lab sweep, never in a real fight.
  //
  // Callers pass DELTAS (counts accrued since their last commit) so a Sovereign
  // seeded from this record never files the same swing twice.
  const SOV_MECH_KEY = '__mech';
  const SOV_MECH_CAP = 3000;   // predicted swings retained (~100 matches); older evidence scales down

  function _addCell(dst, src) {
    for (const f of ['n', 'miss', 'missClean', 'missHit']) dst[f] = (dst[f] || 0) + (src[f] || 0);
  }

  function recordMech(delta) {
    if (!delta || !(delta.n > 0)) return;
    const r = get(SOV_MECH_KEY);
    const m = r.mech || (r.mech = { n: 0, miss: 0, missHitTotal: 0, feat: {}, pair: {} });
    m.n += delta.n; m.miss += delta.miss || 0; m.missHitTotal += delta.missHitTotal || 0;
    for (const bucket of ['feat', 'pair']) {
      const src = delta[bucket] || {};
      for (const k of Object.keys(src)) _addCell(m[bucket][k] || (m[bucket][k] = {}), src[k]);
    }
    // Bounded, so a rule that stops being true (a rebalance) can be unlearned.
    if (m.n > SOV_MECH_CAP) {
      const s = SOV_MECH_CAP / m.n;
      m.n *= s; m.miss *= s; m.missHitTotal *= s;
      for (const bucket of ['feat', 'pair']) for (const k of Object.keys(m[bucket])) {
        const c = m[bucket][k];
        for (const f of ['n', 'miss', 'missClean', 'missHit']) c[f] = (c[f] || 0) * s;
      }
    }
    r.lastSeen = Date.now();
    _dirty = true;
  }

  function mechPrior() {
    const s = load();
    const r = s[SOV_MECH_KEY];
    return (r && r.mech) ? JSON.parse(JSON.stringify(r.mech)) : null;
  }

  // ── Arsenal: what he has measured about every weapon and class ────────────
  // The curated SMK2_LOADOUTS list and its hand-written priors are OUR opinion
  // of what is strong. This is his: one sample per life he fought, filed under
  // what he held and what the opponent held, scored by net damage per 1000
  // frames. Keys: 'any', 'ow:<opponent weapon>', 'oc:<opponent class>'.
  // Cells keep sum and sum of squares of the per-life rate, so the picker can
  // tell "bad" from "barely tried" (see _pickOpenLoadout).
  const SOV_ARSENAL_KEY = '__arsenal';

  function _addSample(tbl, k, s) {
    const c = tbl[k] || (tbl[k] = { n: 0, r: 0, r2: 0, net: 0, frames: 0, dealt: 0, taken: 0 });
    c.n++; c.r += s.rate; c.r2 += s.rate * s.rate;
    c.net += s.net; c.frames += s.frames; c.dealt += s.dealt; c.taken += s.taken;
  }

  function recordArsenal(s) {
    if (!s || !s.w || !(s.frames > 0) || !isFinite(s.rate)) return;
    const r = get(SOV_ARSENAL_KEY);
    const A = r.arsenal || (r.arsenal = {});
    const keys = ['any'];
    if (s.ow) keys.push('ow:' + s.ow);
    if (s.oc) keys.push('oc:' + s.oc);
    for (const key of keys) {
      const b = A[key] || (A[key] = { weapon: {}, cls: {}, combo: {} });
      _addSample(b.weapon, s.w, s);
      _addSample(b.cls, s.c || 'none', s);
      _addSample(b.combo, s.w + '|' + (s.c || 'none'), s);
    }
    r.lastSeen = Date.now();
    _dirty = true;
  }

  function arsenalPrior() {
    const s = load();
    const r = s[SOV_ARSENAL_KEY];
    return (r && r.arsenal) ? r.arsenal : null;
  }

  // ── Move book: his own results with combo routes and counters ─────────────
  // js/smb-sov-combo.js reads these over the lab's SOV_MOVEBOOK. One cell per
  // situation and action: [tries, successes, value sum]. Bounded, so a
  // rebalance that breaks a route can be unlearned.
  const SOV_MOVES_KEY = '__moves';
  const SOV_MOVES_CAP = 60;

  function recordMove(table, key, action, succ, value) {
    if (!table || !key || !action) return;
    const r = get(SOV_MOVES_KEY);
    const M = r.moves || (r.moves = {});
    const T = M[table] || (M[table] = {});
    const row = T[key] || (T[key] = {});
    const c = row[action] || (row[action] = [0, 0, 0]);
    c[0]++; c[1] += succ ? 1 : 0; c[2] += isFinite(value) ? value : 0;
    if (c[0] > SOV_MOVES_CAP) { const k = SOV_MOVES_CAP / c[0]; c[0] *= k; c[1] *= k; c[2] *= k; }
    r.lastSeen = Date.now();
    _dirty = true;
  }

  function moveEvidence(table) {
    const r = load()[SOV_MOVES_KEY];
    return (r && r.moves && r.moves[table]) || null;
  }

  function tick() {
    if (++_saveTimer >= 600) { _saveTimer = 0; save(); }   // ~10s
  }

  function reset() {
    _store = {}; _dirty = true;
    try { localStorage.removeItem(SOV_DOSSIER_KEY); } catch (e) {}
    console.log('[SovDossier] cleared.');
  }

  function dump() {
    const s = load();
    console.log('[SovDossier]', Object.keys(s).length, 'records');
    for (const k of Object.keys(s)) {
      const r = s[k];
      console.log(` ${k}  n=${(r.n || 0).toFixed(1)}  dials=${r.dials ?
        Object.keys(r.dials).filter(x => x[0] !== '_').map(x => x + ':' + r.dials[x].toFixed(2)).join(' ') : '—'}`);
      for (const st of Object.keys(r.strat)) {
        const e = r.strat[st];
        console.log(`    ${st}: used ${e.used.toFixed(1)} stopped ${e.stopped.toFixed(1)} leaked ${e.leaked.toFixed(1)}`);
      }
    }
    return s;
  }

  return { load, save, kitKey, behKey, archetype, get, recordStrategy, strategyBias,
           bestStrategy, recordDials, dialPrior, recordGrid, gridPrior, recordLoadout, loadoutPrior,
           recordMech, mechPrior, recordArsenal, arsenalPrior, recordMove, moveEvidence,
           tick, reset, dump, _raw: () => load() };
})();
