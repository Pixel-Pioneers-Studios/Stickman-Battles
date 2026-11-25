'use strict';
// smb-ambience.js: a quiet ambient bed per arena (visual overhaul Phase 5, sound).
// Each bed is synthesized: one shared looped noise buffer through filters, with slow gain and filter
// wobble, plus an optional low drone. No audio files. Beds crossfade when the arena changes and fade
// out in menus, on pause and when sound is muted. Level follows the SFX volume, kept well under music.
// Polled twice a second (no per-frame work). Depends on SoundManager.audioCtx() (smb-audio.js).

const AMBIENT_BEDS = {
  //            noise layers: [filter type, freq, Q, gain, wobble Hz, wobble depth]   drone: [Hz, gain]
  grass:      { layers: [['lowpass', 650, 0.7, 0.9, 0.07, 0.45]] },
  forest:     { layers: [['lowpass', 900, 0.7, 0.8, 0.05, 0.5], ['bandpass', 3200, 1.2, 0.12, 0.13, 0.6]] },
  ruins:      { layers: [['lowpass', 520, 0.7, 0.7, 0.06, 0.5]] },
  colosseum:  { layers: [['bandpass', 480, 0.9, 0.7, 0.11, 0.35], ['lowpass', 300, 0.7, 0.4, 0.04, 0.3]] },
  desert:     { layers: [['bandpass', 1500, 0.8, 0.6, 0.09, 0.55]] },
  ice:        { layers: [['bandpass', 1200, 1.1, 0.7, 0.06, 0.6]] },
  clouds:     { layers: [['bandpass', 900, 0.8, 0.8, 0.05, 0.55]] },
  haunted:    { layers: [['bandpass', 480, 3.0, 0.9, 0.04, 0.7]], drone: [49, 0.10] },
  city:       { layers: [['lowpass', 190, 0.7, 1.0, 0.03, 0.25]], drone: [60, 0.05] },
  cyberpunk:  { layers: [['lowpass', 200, 0.7, 0.8, 0.03, 0.25], ['highpass', 4200, 0.7, 0.35, 0.2, 0.15]], drone: [60, 0.05] },
  megacity:   { layers: [['lowpass', 190, 0.7, 1.0, 0.03, 0.25]], drone: [60, 0.05] },
  lava:       { layers: [['lowpass', 110, 0.8, 1.3, 0.05, 0.4]] },
  volcano:    { layers: [['lowpass', 90, 0.8, 1.5, 0.07, 0.5], ['bandpass', 700, 0.9, 0.12, 0.15, 0.6]] },
  cave:       { layers: [['lowpass', 260, 0.7, 0.6, 0.04, 0.3]], drone: [55, 0.06] },
  sewer:      { layers: [['bandpass', 780, 0.9, 0.7, 0.18, 0.3], ['lowpass', 220, 0.7, 0.6, 0.05, 0.3]] },
  underwater: { layers: [['lowpass', 280, 0.9, 1.1, 0.08, 0.55]] },
  space:      { layers: [], drone: [55, 0.12] },
  neonGrid:   { layers: [['highpass', 6000, 0.7, 0.08, 0.5, 0.3]], drone: [65, 0.10] },
  mirror:     { layers: [['bandpass', 2400, 4.0, 0.15, 0.04, 0.6]], drone: [73, 0.08] },
  mushroom:   { layers: [['bandpass', 1800, 2.0, 0.18, 0.06, 0.6]], drone: [62, 0.08] },
};

const Ambience = (function () {
  let ctx = null, noiseBuf = null, master = null;
  let activeKey = null, activeBed = null;
  const LEVEL = 0.13;      // times the SFX volume (0.35 default), so about 0.045 at the mixer

  function _ensure() {
    if (ctx) return true;
    if (typeof SoundManager === 'undefined' || !SoundManager.audioCtx) return false;
    try { ctx = SoundManager.audioCtx(); } catch (e) { return false; }
    if (!ctx) return false;
    const len = ctx.sampleRate * 3;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    // Soft (brownish) noise: wind and rumble, not hiss.
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.035 * (Math.random() * 2 - 1)) / 1.035; d[i] = last * 3.2; }
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    return true;
  }

  function _build(cfg) {
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(master);
    const nodes = [];
    for (const [type, freq, q, gain, wHz, wDepth] of (cfg.layers || [])) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      src.playbackRate.value = 0.9 + Math.random() * 0.2;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = gain;
      // Slow wobble on the layer's level, so the bed breathes instead of droning.
      const lfo = ctx.createOscillator(); lfo.frequency.value = wHz;
      const lg = ctx.createGain(); lg.gain.value = gain * wDepth;
      lfo.connect(lg); lg.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(out);
      src.start(ctx.currentTime, Math.random() * 2.5); lfo.start();
      nodes.push(src, lfo);
    }
    if (cfg.drone) {
      for (const det of [0, 0.4]) {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = cfg.drone[0] + det;
        const g = ctx.createGain(); g.gain.value = cfg.drone[1];
        o.connect(g); g.connect(out); o.start();
        nodes.push(o);
      }
    }
    return { out, nodes };
  }

  function _fadeOut(bed) {
    if (!bed) return;
    const t = ctx.currentTime;
    bed.out.gain.cancelScheduledValues(t);
    bed.out.gain.setValueAtTime(bed.out.gain.value, t);
    bed.out.gain.linearRampToValueAtTime(0, t + 1.2);
    setTimeout(() => { for (const n of bed.nodes) { try { n.stop(); } catch (e) {} } try { bed.out.disconnect(); } catch (e) {} }, 1400);
  }

  function _want() {
    if (typeof gameRunning === 'undefined' || !gameRunning) return null;
    if (typeof paused !== 'undefined' && paused) return null;
    if (SoundManager.isMuted && SoundManager.isMuted()) return null;
    const a = typeof currentArena !== 'undefined' ? currentArena : null;
    const key = (a && a.designerBase) || (typeof currentArenaKey !== 'undefined' ? currentArenaKey : null);
    return key && AMBIENT_BEDS[key] ? key : null;
  }

  function tick() {
    const want = _want();
    if (want === activeKey && (!want || ctx)) {
      if (master && want) master.gain.value = LEVEL * (SoundManager.getVolume ? SoundManager.getVolume() : 0.35);
      return;
    }
    if (!want && !ctx) { activeKey = null; return; }
    if (!_ensure()) return;
    if (ctx.state !== 'running') return;          // no user gesture yet: try again next tick
    _fadeOut(activeBed);
    activeBed = null; activeKey = want;
    master.gain.value = LEVEL * (SoundManager.getVolume ? SoundManager.getVolume() : 0.35);
    if (!want) return;
    activeBed = _build(AMBIENT_BEDS[want]);
    const t = ctx.currentTime;
    activeBed.out.gain.setValueAtTime(0, t);
    activeBed.out.gain.linearRampToValueAtTime(1, t + 1.5);
  }

  setInterval(tick, 500);
  return { tick, active: () => activeKey };
})();
