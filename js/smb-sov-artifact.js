'use strict';
/*
 * smb-sov-artifact.js — the shipping link for everything Sovereign learns.
 *
 * THE PROBLEM THIS CLOSES
 * tools/sov-evolved-genome.json has existed for months: a finished, evolved
 * parameter set with per-archetype fitness. Nothing in js/ or index.html has
 * ever read it. The trainer ran, the artifact was produced, and the loop was
 * never closed — so every improvement found offline died in a file. This module
 * is the missing half: the game loads what training wrote, at boot, every time.
 *
 * WHAT AN ARTIFACT HOLDS
 *   grid     — situation x action priors, the same shape SovereignMK2._tacticGrid
 *              uses. Discrete CHOICES, which is the only thing that compounds;
 *              the genome's eleven continuous dials saturate ~6s into any fight
 *              (measured: A/B against frozen-at-max was a wash, Welch t=0.18).
 *   tactics  — the named tactic library. Doubles as the enum VECTOR's structured
 *              output is constrained to, so a small model is structurally unable
 *              to emit a tactic that does not exist.
 *   findings — confirmed prose findings. Prose survives into the next Sovereign
 *              in a way `aggression: 0.9503743252384134` does not, and a human
 *              can read it and disagree.
 *   genome   — optional dial priors, kept for completeness. Low value; see above.
 *
 * THE PRIOR CAP IS THE DESIGN, NOT A DETAIL
 * An artifact accumulated over a thousand overnight matches would carry cells
 * with tens of thousands of tries. Merged raw, a match's own 200 bookings could
 * never move them and Sovereign would be a lookup table wearing a learner's
 * coat — the exact failure the "clean slate every fight" idea was reacting to.
 * So priors are scaled down to PRIOR_CAP tries on load: strong enough to be an
 * informed opening opinion, weak enough that one fight's evidence can overturn
 * it. He starts knowing the game and knowing nothing about YOU.
 */

const SovArtifact = (function () {

  const PATH      = './data/sov-artifact.json';
  const LS_KEY    = 'smb_sov_artifact';
  const PRIOR_CAP = 6;    // max effective tries any loaded cell contributes

  let _data   = null;
  let _loaded = false;

  const EMPTY = { version: 0, generated: null, matches: 0, grid: {}, tactics: [], findings: [], genome: null };

  // ── Tactic library ────────────────────────────────────────────────────────
  // Sovereign's live vocabulary is six verbs (attack, shield, super,
  // approach_air, and two movement keys). A grid over six actions can only ever
  // express intensity, which is why "he adapts" has never been visible: the
  // machine was right and there was nothing to choose between. These are the
  // named plans VECTOR selects among and proposes additions to. Anything listed
  // here must be executable by _executeTactic in smb-smk2-class.js or it is
  // decoration.
  const BASE_TACTICS = [
    'pressure_ground',    'bait_whiff_punish',  'anti_air_hold',
    'corner_carry',       'ledge_deny',         'spacing_poke',
    'shield_break',       'super_bait',         'landing_trap',
    'disengage_reset',    'platform_trap',      'cross_up',
  ];

  function _merge(raw) {
    const d = Object.assign({}, EMPTY, raw || {});
    d.grid     = d.grid     && typeof d.grid === 'object' ? d.grid : {};
    d.tactics  = Array.isArray(d.tactics)  ? d.tactics  : [];
    d.findings = Array.isArray(d.findings) ? d.findings : [];
    // Library is the union: a file can add tactics but never silently drop the
    // base set out from under code that references it.
    const seen = new Set(BASE_TACTICS);
    d.tactics = BASE_TACTICS.concat(d.tactics.filter(t => typeof t === 'string' && !seen.has(t) && seen.add(t)));
    return d;
  }

  async function load() {
    if (_loaded) return _data;
    _loaded = true;
    let raw = null;
    try {
      const r = await fetch(PATH + '?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) raw = await r.json();
    } catch (e) { /* file:// or missing — fall through */ }
    if (!raw) {
      try { const s = localStorage.getItem(LS_KEY); if (s) raw = JSON.parse(s); } catch (e) {}
    }
    _data = _merge(raw);
    if (raw) console.log(`[SovArtifact] loaded v${_data.version} — ${Object.keys(_data.grid).length} cells, ` +
                         `${_data.tactics.length} tactics, ${_data.findings.length} findings, ${_data.matches} matches trained`);
    else     console.log('[SovArtifact] no artifact found — Sovereign starts from the base library');
    return _data;
  }

  function data() { return _data || (_data = _merge(null)); }

  // Grid priors, scaled to PRIOR_CAP. Returns the same shape SovereignMK2
  // already merges from SovDossier, so the seeding path stays one code path.
  function gridPrior() {
    const g = data().grid, out = {};
    for (const sit of Object.keys(g)) {
      const row = g[sit]; const dst = out[sit] = {};
      for (const act of Object.keys(row)) {
        const c = row[act];
        if (!c || !(c.tries > 0)) continue;
        const k = Math.min(1, PRIOR_CAP / c.tries);   // preserve the RATIO, shrink the weight
        dst[act] = { tries: c.tries * k, taken: c.taken * k, dealt: c.dealt * k };
      }
    }
    return out;
  }

  function tactics()  { return data().tactics.slice(); }
  function findings() { return data().findings.slice(); }

  // Findings relevant to a situation cell or weapon — the tight-retrieval brief
  // that goes to a small model, instead of the whole ledger.
  function brief(filter) {
    const f = String(filter || '').toLowerCase();
    if (!f) return findings().slice(-8);
    return findings().filter(x => JSON.stringify(x).toLowerCase().includes(f)).slice(-8);
  }

  // ── Write-back ────────────────────────────────────────────────────────────
  // Called by the VECTOR loop through the console/page bridge. Accumulates
  // rather than replaces: a training run adds evidence, it does not erase what
  // earlier runs proved.
  function absorb(delta) {
    const d = data();
    if (!delta) return d;
    if (delta.grid) {
      for (const sit of Object.keys(delta.grid)) {
        const src = delta.grid[sit]; const dst = d.grid[sit] || (d.grid[sit] = {});
        for (const act of Object.keys(src)) {
          const s = src[act]; if (!s) continue;
          const c = dst[act] || (dst[act] = { tries: 0, taken: 0, dealt: 0 });
          c.tries += s.tries || 0; c.taken += s.taken || 0; c.dealt += s.dealt || 0;
        }
      }
    }
    if (Array.isArray(delta.findings)) {
      for (const f of delta.findings) if (f && f.claim) d.findings.push(f);
    }
    if (Array.isArray(delta.tactics)) {
      const have = new Set(d.tactics);
      for (const t of delta.tactics) if (typeof t === 'string' && !have.has(t)) { d.tactics.push(t); have.add(t); }
    }
    if (delta.genome) d.genome = delta.genome;
    d.matches  = (d.matches || 0) + (delta.matches || 0);
    d.version  = (d.version || 0) + 1;
    d.generated = new Date().toISOString();
    try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch (e) {}
    return d;
  }

  function exportJSON() { return JSON.stringify(data(), null, 1); }

  // Auto-load at boot. Non-blocking: a Sovereign constructed before the fetch
  // resolves simply seeds from an empty artifact, which is the current behaviour.
  if (typeof window !== 'undefined') { try { load(); } catch (e) {} }

  return { load, data, gridPrior, tactics, findings, brief, absorb, exportJSON, BASE_TACTICS, PRIOR_CAP };
})();

if (typeof window !== 'undefined') window.SovArtifact = SovArtifact;
