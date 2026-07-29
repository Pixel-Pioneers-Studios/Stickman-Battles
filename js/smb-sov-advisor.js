'use strict';
// smb-sov-advisor.js — SovereignAdvisor: slow strategic layer above SovereignMK2.
// Depends on: smb-globals.js, smb-smk2-class.js (SovereignMK2), smb-ai-console.js (_AI_URL)
// Loaded after smb-smk2-class.js.
//
// WHAT THIS IS
// Sovereign's own brain is a per-FRAME tactical engine — reads, punishes, spacing.
// It has no slow loop: nothing ever steps back and asks "this whole approach is
// losing, try a different one". This module is that loop. Every ~15 seconds it
// summarises the fight, asks a small local model (Ollama, same server VECTOR uses)
// which direction to take, and applies the answer as a BIAS on systems Sovereign
// already has. It is an advisor, not a driver: it never issues per-frame commands.
//
// HARD RULES
//  • Never blocks the game loop — one in-flight request, fully async, short timeout.
//  • Never touches safety systems (edge avoidance, void recovery, spawn protection).
//  • Any failure — Ollama down, timeout, malformed reply, unknown value — is a
//    silent no-op and Sovereign plays exactly as he does without this file.
//  • Output is validated against a strict allowlist; the model cannot inject
//    arbitrary state, only choose from options the engine already supports.

const SovereignAdvisor = (() => {

  const URL_BASE = (typeof _AI_URL !== 'undefined' && _AI_URL) ? _AI_URL : 'http://localhost:11434';

  // Deliberately biased toward SMALL models — "like VECTOR but weaker". This runs
  // during live combat, so a 2-3B model answering in <2s beats a 7B answering in 8.
  const PREFERRED = ['llama3.2:1b', 'qwen2.5:1.5b', 'gemma2:2b', 'phi3:mini', 'llama3.2',
                     'qwen2.5:3b', 'phi3', 'qwen2.5', 'mistral', 'llama3'];

  const INTERVAL_FRAMES = 900;   // ~15s at 60fps — the advisory cadence
  // Measured on real local models: llama3.2:3b ≈ 5s, qwen2.5-coder:7b ≈ 10s, and
  // the first call of a session also pays model load. 11s keeps the 7b usable;
  // anything slower is dropped, which costs one advisory and nothing else.
  const REQUEST_TIMEOUT = 11000;
  const WINDOW_FRAMES   = 900;   // telemetry covers the last window only

  // ── Allowlists — the model may only pick from these ────────────────────────
  const STRATEGIES = ['anti-air', 'parry', 'guard-break', 'intercept', 'pressure', 'none'];
  const PRESSURES  = ['study', 'suffocate'];

  let _enabled   = true;      // master switch (SovereignAdvisor.off() to disable)
  let _model     = null;
  let _probed    = false;     // have we checked Ollama availability this session?
  let _available = false;
  let _inFlight  = false;
  let _nextAt    = 0;         // frameCount of next advisory
  let _log       = [];        // recent directives, for inspection
  let _stats     = { asked: 0, applied: 0, failed: 0 };

  // Rolling telemetry, reset each window
  let _w = null;
  function _resetWindow() {
    _w = { dealt: 0, taken: 0, sovSwings: 0, sovHits: 0, pSwings: 0, pHits: 0,
           pAir: 0, frames: 0, pStunned: 0, sovKO: 0, pKO: 0, pRingout: 0,
           prevSovHp: null, prevPHp: null, prevSovAtk: 0, prevPAtk: 0,
           prevSovLives: null, prevPLives: null };
  }
  _resetWindow();

  function _sov() {
    if (typeof players === 'undefined' || !Array.isArray(players)) return null;
    return players.find(p => p && p.isSovereignMK2 && p.health > 0) || null;
  }
  function _foe(s) {
    if (!s || typeof players === 'undefined') return null;
    return players.find(p => p && p !== s && !p.isSovereignMK2 && !p.isBoss) || null;
  }

  // ── Per-frame telemetry sampling (cheap; no allocation in the common path) ──
  function tick() {
    if (!_enabled) return;
    if (typeof gameRunning === 'undefined' || !gameRunning) return;
    if (typeof paused !== 'undefined' && paused) return;
    const s = _sov(); if (!s) return;
    const p = _foe(s);  if (!p) return;

    _w.frames++;
    if (_w.prevSovHp !== null && s.health < _w.prevSovHp) _w.taken += _w.prevSovHp - s.health;
    if (_w.prevPHp   !== null && p.health < _w.prevPHp)   _w.dealt += _w.prevPHp   - p.health;
    if (_w.prevPHp   !== null && p.health < _w.prevPHp)   _w.sovHits++;
    if (_w.prevSovHp !== null && s.health < _w.prevSovHp) _w.pHits++;
    if ((s.attackTimer > 0) && !_w.prevSovAtk) _w.sovSwings++;
    if ((p.attackTimer > 0) && !_w.prevPAtk)   _w.pSwings++;
    if (!p.onGround) _w.pAir++;
    if ((p.stunTimer > 0) || (p.ragdollTimer > 0)) _w.pStunned++;
    if (_w.prevSovLives !== null && s.lives < _w.prevSovLives) _w.sovKO++;
    if (_w.prevPLives   !== null && p.lives < _w.prevPLives)   _w.pKO++;

    _w.prevSovHp = s.health; _w.prevPHp = p.health;
    _w.prevSovAtk = s.attackTimer > 0 ? 1 : 0;
    _w.prevPAtk   = p.attackTimer > 0 ? 1 : 0;
    _w.prevSovLives = s.lives; _w.prevPLives = p.lives;

    if (typeof frameCount === 'undefined') return;
    if (_nextAt === 0) { _nextAt = frameCount + INTERVAL_FRAMES; return; }
    if (frameCount >= _nextAt && !_inFlight) {
      _nextAt = frameCount + INTERVAL_FRAMES;
      _advise(s, p);          // fire-and-forget; never awaited by the caller
    }
  }

  // ── Build the compact fight report the model reasons over ──────────────────
  function _report(s, p) {
    const f = Math.max(1, _w.frames);
    const pct = v => Math.round(100 * v / f);
    const rate = (a, b) => b > 0 ? Math.round(100 * a / b) : 0;
    return {
      sovereign_hp_pct: Math.round(100 * s.health / Math.max(1, s.maxHealth)),
      sovereign_lives:  s.lives,
      player_hp_pct:    Math.round(100 * p.health / Math.max(1, p.maxHealth)),
      player_lives:     p.lives,
      player_weapon:    p.weaponKey || '?',
      player_class:     p.charClass || 'none',
      window_damage_dealt: Math.round(_w.dealt),
      window_damage_taken: Math.round(_w.taken),
      sovereign_swings:  _w.sovSwings,
      sovereign_hit_pct: rate(_w.sovHits, _w.sovSwings),
      player_swings:     _w.pSwings,
      player_hit_pct:    rate(_w.pHits, _w.pSwings),
      player_airborne_pct: pct(_w.pAir),
      player_stunned_pct:  pct(_w.pStunned),
      stocks_lost_this_window: { sovereign: _w.sovKO, player: _w.pKO },
      current_strategy:  s._lockedCounterStrategy || 'none',
      current_pressure:  s._pressureMode || 'study',
      evolution_stage:   s._evolutionStage || 0,
      limiter_broken:    !!s._limiterBroken,
      failed_strategies: Object.keys(s._strategyFail || {}).filter(k => (s._strategyFail[k] || 0) >= 2),
    };
  }

  const SYSTEM = [
    'You are the strategic advisor for SOVEREIGN, a boss in a 2D fighting game.',
    'You do NOT control him frame to frame. You set direction for the next ~15 seconds.',
    'You receive a fight report. Reply with ONE line of raw JSON and nothing else.',
    'Schema: {"strategy":X,"pressure":Y,"spacing":Z,"edge":B,"reason":S}',
    '  strategy: one of anti-air, parry, guard-break, intercept, pressure, none',
    '    anti-air   = punish a player who is airborne a lot',
    '    parry      = counter a player who swings often and predictably',
    '    guard-break= counter a player who blocks/shields a lot',
    '    intercept  = cut off a player who keeps retreating or repositioning',
    '    pressure   = relentless close-range offence',
    '  pressure: study (observe, keep spacing) or suffocate (close and smother)',
    '  spacing: number -1 to 1. negative = fight closer, positive = fight further out',
    '  edge: true to prioritise pushing the player toward the stage edge, else false',
    '  reason: under 12 words',
    'Rules: if damage_taken exceeds damage_dealt, CHANGE approach. Do not repeat a',
    'strategy listed in failed_strategies. If player_airborne_pct is high prefer anti-air.',
    'If player_hit_pct is high, stop trading — prefer parry or more spacing.',
    'Output raw JSON only. No markdown, no code fence, no commentary.',
  ].join('\n');

  async function _probe() {
    _probed = true;
    try {
      const r = await fetch(URL_BASE + '/api/tags', { signal: AbortSignal.timeout(2500) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const models = ((await r.json()).models) || [];
      if (!models.length) return false;
      let best = null;
      for (const pref of PREFERRED) {
        best = models.find(m => m.name.toLowerCase().startsWith(pref));
        if (best) break;
      }
      if (!best) best = models[0];
      _model = best.name;
      _available = true;
      if (typeof console !== 'undefined')
        console.log('[SovAdvisor] online — model: ' + _model);
      return true;
    } catch (e) {
      _available = false;
      return false;
    }
  }

  async function _advise(s, p) {
    if (_inFlight) return;
    if (!_probed) { _inFlight = true; const ok = await _probe(); _inFlight = false; if (!ok) { _resetWindow(); return; } }
    if (!_available) { _resetWindow(); return; }

    const report = _report(s, p);
    _resetWindow();               // start the next window immediately
    _inFlight = true; _stats.asked++;
    try {
      const resp = await fetch(URL_BASE + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: _model,
          messages: [{ role: 'system', content: SYSTEM },
                     { role: 'user',   content: JSON.stringify(report) }],
          stream: false,
          options: { temperature: 0.4, num_predict: 120 },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const data  = await resp.json();
      const reply = ((data.message && data.message.content) || '').trim();
      const dir   = _parse(reply);
      if (dir) { _apply(dir); _stats.applied++; _log.push({ at: frameCount, dir, report }); if (_log.length > 40) _log.shift(); }
      else     { _stats.failed++; }
    } catch (e) {
      _stats.failed++;            // Ollama down / slow / refused — Sovereign is unaffected
    } finally {
      _inFlight = false;
    }
  }

  // Strict validation. A small model WILL occasionally emit prose, fences, or
  // invented enum values; every one of those paths must end as a no-op.
  function _parse(text) {
    if (!text) return null;
    let raw = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
    if (a < 0 || b <= a) return null;
    let o;
    try { o = JSON.parse(raw.slice(a, b + 1)); } catch (e) { return null; }
    if (!o || typeof o !== 'object') return null;

    // If the model supplied an enum we don't recognise, treat the WHOLE reply as
    // untrusted rather than salvaging the numeric fields — a reply that invents
    // "omega-slam" has no more claim to a correct spacing value than to a correct
    // strategy, and salvaging let a pure hallucination apply a max spacing bias.
    if (o.strategy != null && !STRATEGIES.includes(o.strategy)) return null;
    if (o.pressure != null && !PRESSURES.includes(o.pressure)) return null;

    const strategy = STRATEGIES.includes(o.strategy) ? o.strategy : null;
    const pressure = PRESSURES.includes(o.pressure) ? o.pressure : null;
    let spacing = Number(o.spacing);
    if (!isFinite(spacing)) spacing = 0;
    spacing = Math.max(-1, Math.min(1, spacing));
    const edge = o.edge === true;
    if (!strategy && !pressure && !spacing && !edge) return null;   // nothing usable
    return { strategy, pressure, spacing, edge,
             reason: typeof o.reason === 'string' ? o.reason.slice(0, 80) : '' };
  }

  // Apply as BIAS only. Every field maps onto a knob Sovereign already exposes;
  // nothing here can disable edge avoidance, recovery, or spawn protection.
  function _apply(dir) {
    const s = _sov(); if (!s) return;
    s._advisorStrategy = (dir.strategy && dir.strategy !== 'none') ? dir.strategy : null;
    s._advisorSpacing  = dir.spacing * 26;      // px of prefDist bias — deliberately small
    s._advisorEdge     = dir.edge;
    if (dir.pressure) { s._pressureMode = dir.pressure; s._pressureHoldTimer = 240; }
    s._advisorReason   = dir.reason;
    s._advisorAppliedAt = (typeof frameCount !== 'undefined') ? frameCount : 0;
  }

  function reset() {
    _resetWindow(); _nextAt = 0; _log = [];
    const s = _sov();
    if (s) { s._advisorStrategy = null; s._advisorSpacing = 0; s._advisorEdge = false; }
  }

  return {
    tick, reset,
    on()  { _enabled = true;  return 'SovereignAdvisor ON'; },
    off() { _enabled = false; const s=_sov(); if(s){s._advisorStrategy=null;s._advisorSpacing=0;s._advisorEdge=false;} return 'SovereignAdvisor OFF'; },
    status() {
      return { enabled: _enabled, available: _available, model: _model,
               inFlight: _inFlight, stats: Object.assign({}, _stats),
               last: _log.length ? _log[_log.length - 1] : null };
    },
    history() { return _log.slice(); },
    // Test seam: apply a directive without a model, to verify the bias plumbing.
    _debugApply(dir) { const d=_parse(typeof dir==='string'?dir:JSON.stringify(dir)); if(d){_apply(d);return d;} return null; },
  };
})();
