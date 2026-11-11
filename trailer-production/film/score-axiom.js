'use strict';
// "Kael vs Cosmic Axiom": the score, written to picture. Each hit is keyed in a shot's choreography time and placed on the
// frame the render reached it (work/timemap/<shot>.json from node film/run.js timemap <shot>), so hit-stops can't drift it.
//
// Five ideas:
//   Kael      the theme of films 1-2 in E minor; the major of film 2's core returns when he holds the channel open.
//   Laws      bare open fifths and a low C pedal with no third in it: force with no term for a self. Starlight over it.
//   The man   a small street tune. Hard and dry when he fights with his hands; gentle and in major when he walks out gold.
//   The kept  film 2's "ninety-four" figure, far off, coming closer each time the crust comes off.
//   Sovereign film 1's low D, his wrong notes and his bell, at the top of the sky.
//
//   node film/score-axiom.js   → work/film-axiom-score.wav
const fs = require('fs'), path = require('path');

const ORDER = ['x0-husk', 'x1-void', 'x2-down', 'x2h-hands', 'x3-light', 'x4-noise', 'x5-excavate', 'x5h-brawl', 'x6-holes', 'x6h-sky', 'x7-nova', 'x8-resonance', 'x9-free', 'x10-watcher'];
const MAP = {}; let acc = 0;
for (const s of ORDER) { const cs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'work', 'timemap', s + '.json'), 'utf8')); MAP[s] = { start: acc, cs }; acc += cs.length; }
const TITLE = acc / 60, DUR = TITLE + 5.5;
// Timeline seconds at which shot s reaches choreography time c.
const at = s => c => { const m = MAP[s], i = m.cs.findIndex(v => v >= c - 1e-6); return (m.start + (i < 0 ? m.cs.length : i)) / 60; };
const OUT = path.join(__dirname, '..', 'work', 'film-axiom-score.wav');

const V = require('./score-voices')(DUR, 0xa710a95e);
const { synth, chord, kick, snare, hat, tom, riser, crash, drone, rumble, hit, heartbeat } = V;

const CH = { Em: [52, 55, 59], C: [48, 52, 55], D: [50, 54, 57], B: [47, 51, 54], Am: [45, 48, 52], G: [43, 47, 50], E: [52, 56, 59], A: [45, 49, 52], Fs: [42, 46, 49], Cm: [48, 51, 55], Bb: [46, 50, 53], F: [41, 45, 48] };
const BASS = { Em: 40, C: 36, D: 38, B: 35, Am: 33, G: 31, E: 40, A: 33, Fs: 30, Cm: 36, Bb: 34, F: 29 };
const KAEL = [[76, 71, 76, 79, 78], [76, 74, 72, 67], [78, 81, 79, 78, 74], [75, 71]];
const KAEL_MAJOR = [[76, 71, 76, 80, 78], [76, 75, 73, 68], [78, 81, 80, 78, 75], [80, 76]];
const SOV = [50, 51, 57, 58], STAR = [88, 90, 95, 97], KEPT = [69, 72, 76, 79, 76, 72];
const MAN = [57, 60, 62, 60, 57, 55, 57];                         // the street tune (A minor)
const MAN_GOLD = [64, 68, 69, 68, 64, 62, 64];                    // the same tune, in E major

function pad(c, t0, len, vol = 0.05, o = {}) { chord(CH[c], t0, len, { wave: 'string', volume: vol, attack: o.attack ?? 0.8, release: o.release ?? 0.9, send: 0.3, ...o }); }
function stars(t0, len, vol = 0.03) { STAR.forEach((n, i) => synth(n, t0 + i * 0.05, len, { wave: 'sine', volume: vol, attack: 0.6, release: Math.min(len * 0.6, 2), send: 0.6, vibrato: 0.003, pan: (i - 1.5) * 0.25 })); }
// The Laws: an open fifth, no third.
function laws(t0, len, vol = 0.1) { drone(24, t0, len, vol); chord([36, 43, 48], t0, len, { wave: 'choir', volume: vol * 0.45, attack: Math.min(1.2, len / 3), release: Math.min(1.2, len / 3), send: 0.35 }); }
function kept(t0, vol = 0.04, step = 0.3, up = 0) { KEPT.forEach((n, i) => synth(n + up, t0 + i * step, step * 2, { wave: 'sine', volume: vol, attack: 0.05, release: step * 1.1, send: 0.55 })); }
function man(t0, step, o = {}) { (o.line || MAN).forEach((n, i) => synth(n + (o.shift || 0), t0 + i * step, step * (o.len || 0.8), { wave: o.wave || 'square', volume: o.vol ?? 0.05, attack: 0.004, release: step * 0.3, send: o.send ?? 0.12 })); }

// A driving section (film 1's shape).
function section(t0, t1, bpm, prog, o = {}) {
  const beat = 60 / bpm, bar = beat * 4;
  for (let k = 0, s = t0; s < t1 - 0.05; k++, s += bar) {
    const c = prog[k % prog.length];
    chord(CH[c], s, Math.min(bar, t1 - s) * 0.99, { wave: 'string', volume: o.pad ?? 0.055, attack: 0.1, release: 0.2, send: 0.2 });
    if (o.bass !== false) for (let i = 0; i < 8; i++) { const ts = s + i * beat / 2; if (ts < t1) synth(BASS[c] + (i === 2 || i === 5 ? 12 : 0), ts, beat * 0.39, { wave: 'square', volume: o.bassVol ?? 0.1, attack: 0.004, release: 0.05, send: 0.05 }); }
    if (o.stabs) [0, 1.5, 2, 3, 3.5].forEach(q => { const ts = s + q * beat; if (ts < t1) chord([BASS[c] + 12, BASS[c] + 19, BASS[c] + 24], ts, beat * 0.3, { wave: 'saw', volume: 0.034, attack: 0.004, release: 0.06, send: 0.12 }); });
    if (o.arp) { const a = [CH[c][0], CH[c][1], CH[c][2], CH[c][0] + 12, CH[c][2], CH[c][1], CH[c][2], CH[c][0] + 12]; a.forEach((n, i) => { const ts = s + i * beat / 2; if (ts < t1) synth(n + 12, ts, beat * 0.42, { wave: 'pluck', volume: 0.05, attack: 0.002, release: 0.1, send: 0.25, pan: i % 2 ? 0.25 : -0.25 }); }); }
    if (o.lead) { const line = (o.leadLine || KAEL)[k % 4]; line.forEach((n, i) => { const ts = s + i * bar / line.length; if (ts < t1) synth(n + (o.leadShift || 0), ts, bar * 0.9 / line.length, { wave: 'saw', volume: o.leadVol ?? 0.07, attack: 0.012, release: 0.09, send: 0.25, vibrato: 0.002 }); }); }
    const st = o.drums || 'main';
    if (st !== 'none') {
      const hats = st === 'half' ? [0, 4, 8, 12] : st === 'drive' ? Array.from({ length: 16 }, (_, i) => i) : [0, 2, 4, 6, 8, 10, 12, 14];
      hats.forEach(q => { const ts = s + q * beat / 4; if (ts < t1) hat(ts, st === 'drive' ? 0.1 : 0.11, q === 14 && st !== 'half'); });
      if (st === 'half') { kick(s, 0.55); if (s + beat * 2 < t1) snare(s + beat * 2, 0.4); if (s + beat * 2.5 < t1) kick(s + beat * 2.5, 0.34); }
      else { [0, 6, 8, 11, 14].forEach(q => { const ts = s + q * beat / 4; if (ts < t1) kick(ts, q === 0 ? 0.66 : 0.42); }); [4, 12].forEach(q => { const ts = s + q * beat / 4; if (ts < t1) snare(ts, 0.4); }); }
    }
  }
}
// The street: no strings at all. Bass, a dry back-beat, and the tune.
function street(t0, t1, bpm, o = {}) {
  const beat = 60 / bpm, bar = beat * 4;
  for (let k = 0, s = t0; s < t1 - 0.05; k++, s += bar) {
    const root = (o.roots || [33, 33, 36, 31])[k % 4];
    for (let i = 0; i < 8; i++) { const ts = s + i * beat / 2; if (ts < t1) synth(root + (i === 3 || i === 6 ? 12 : 0), ts, beat * 0.3, { wave: 'square', volume: o.bassVol ?? 0.11, attack: 0.003, release: 0.04, send: 0.03 }); }
    [0, 3, 8, 10].forEach(q => { const ts = s + q * beat / 4; if (ts < t1) kick(ts, 0.6); });
    [4, 12].forEach(q => { const ts = s + q * beat / 4; if (ts < t1) { snare(ts, 0.42); tom(ts, 47, 0.14); } });
    for (let q = 2; q < 16; q += 4) { const ts = s + q * beat / 4; if (ts < t1) hat(ts, 0.1); }
    if (o.tune && k % 2 === 0 && s + beat * 3.5 < t1) man(s, beat / 2, { vol: o.tuneVol ?? 0.05, shift: o.shift ?? 12 });
  }
}

// ── COLD OPEN: the husk ─────────────────────────────────────────────────────
{ const c = at('x0-husk');
  // Film 2's last chord still ringing, then it bends: E major to minor to no third at all.
  chord([64, 68, 71], 0, c(1.3), { wave: 'choir', volume: 0.035, attack: 0.5, release: 1.0, send: 0.45 });
  chord([64, 67, 71], c(1.3), 1.4, { wave: 'string', volume: 0.04, attack: 0.3, release: 0.8, send: 0.4 });
  laws(c(2.2), c(5.05) - c(2.2) + 0.5, 0.1);
  [1.3, 1.9, 2.5, 3.0].forEach((t, i) => tom(c(t), 42 - i * 3, 0.22));   // plates letting go
  stars(c(2.4), c(5.0) - c(2.4), 0.03);
  synth(26, c(3.6), 2.0, { wave: 'sine', volume: 0.16, attack: 0.2, release: 1.2 });   // the eyes come up
  hit(c(4.55), [36, 42, 48], 0.8);                                // the collar
  riser(c(4.6), c(5.05) - c(4.6), 0.2);
  hit(c(5.05), [24, 36, 43, 48], 1.5); crash(c(5.05), 0.3, 3.0);  // the throw
  stars(c(5.8), 1.8, 0.02);
}
// ── ACT 1: the Void ─────────────────────────────────────────────────────────
{ const c = at('x1-void');
  riser(c(0), c(2.25) - c(0), 0.12); synth(40, c(0), c(2.2) - c(0), { wave: 'sine', volume: 0.05, attack: 1.2, release: 0.1 });
  hit(c(2.3), [40, 47, 52], 1.2);                                 // he lands
  pad('Em', c(3.2), c(4.9) - c(3.2), 0.035, { attack: 1.0 });     // alone: a galaxy, nothing else
  KAEL[0].forEach((n, i) => synth(n - 12, c(3.5) + i * 0.42, 0.7, { wave: 'sine', volume: 0.045, attack: 0.05, release: 0.4, send: 0.5 }));
  laws(c(4.4), c(10.2) - c(4.4), 0.1);
  stars(c(4.9), c(10.2) - c(4.9), 0.03);
  hit(c(5.25), [36, 43, 48], 0.6);                                // the star opens
  heartbeat(c(7.0), c(10.0), 0.95, 0.24);
  KAEL[0].forEach((n, i) => synth(n - 12, c(8.2) + i * 0.16, 0.4, { wave: 'saw', volume: 0.045, attack: 0.01, release: 0.2, send: 0.3 }));
  riser(c(9.5), c(10.2) - c(9.5), 0.14);
}
// ── ACT 1: down ─────────────────────────────────────────────────────────────
{ const c = at('x2-down');
  section(c(0), c(2.45), 150, ['Em', 'C'], { drums: 'drive', stabs: true });
  [0.58, 0.97, 1.3].forEach(t => chord([72, 79], c(t), 0.5, { wave: 'glass', volume: 0.05, attack: 0.002, release: 0.4, send: 0.5 }));   // each cut bends off him
  hit(c(2.5), [36, 43, 48], 1.1);                                 // "down" turns
  laws(c(2.6), c(5.9) - c(2.6), 0.13); rumble(c(2.6), c(5.3) - c(2.6), 0.06);
  [2.95].forEach(t => hit(c(t), CH.Em, 0.6));                     // the plant
  KAEL[1].forEach((n, i) => synth(n - 12, c(3.5) + i * 0.4, 0.6, { wave: 'string', volume: 0.05, attack: 0.05, release: 0.3, send: 0.35 }));
  hit(c(5.3), CH.B, 0.7); riser(c(5.3), c(5.95) - c(5.3), 0.2);
  hit(c(5.95), [24, 36, 43, 48], 2.0); crash(c(5.95), 0.35, 3.5); synth(24, c(5.95), 3.0, { wave: 'sine', volume: 0.2, attack: 0.004, release: 2.4 });   // the slam
  drone(28, c(7.0), c(9.4) - c(7.0), 0.07); pad('Am', c(7.4), c(9.4) - c(7.4), 0.03);
}
// ── ACT 1: hands. The street, then the laws ─────────────────────────────────
{ const c = at('x2h-hands');
  synth(45, c(1.0), 0.6, { wave: 'sine', volume: 0.2, attack: 0.004, release: 0.5 });   // his foot on the floor
  man(c(1.25), 0.11, { vol: 0.045, wave: 'pluck', shift: 12, send: 0.2 });              // the fists come up: the tune, first time
  street(c(2.0), c(5.2), 138, { tune: true, tuneVol: 0.045 });
  hit(c(2.23), [33, 45, 52], 0.5);                                // the katana goes
  [2.36, 2.52].forEach(t => tom(c(t), 52, 0.3)); hit(c(2.7), [33, 40, 45], 0.7);
  hit(c(4.08), [33, 40, 45], 0.45); tom(c(4.31), 45, 0.4); hit(c(4.54), [33, 40, 45], 0.6); hit(c(4.76), [31, 38, 43], 0.7); kick(c(4.82), 0.7);
  // The mark, the blinks: the street stops; three stabs of the laws.
  synth(88, c(5.05), 0.5, { wave: 'glass', volume: 0.05, attack: 0.002, release: 0.4, send: 0.5 });
  hit(c(5.41), [36, 43, 48], 0.7); hit(c(5.63), [38, 45, 50], 0.8); hit(c(5.85), [41, 48, 53], 0.9);
  hit(c(5.97), [24, 36, 43], 1.6);
  drone(33, c(6.05), c(6.72) - c(6.05), 0.07);
  hit(c(6.72), [36, 42, 48], 0.9); rumble(c(6.72), c(7.0) - c(6.72), 0.08);             // the grasp
  // The chain slam, the street's bass under each swing.
  [[7.0, 33], [7.48, 36], [7.95, 33], [8.4, 31]].forEach(([t, n]) => { for (let i = 0; i < 4; i++) synth(n, c(t) + i * 0.1, 0.08, { wave: 'square', volume: 0.1, attack: 0.003, release: 0.03 }); });
  riser(c(7.25), c(7.76) - c(7.25), 0.14); riser(c(7.95), c(8.21) - c(7.95), 0.14);
  hit(c(7.76), [24, 36, 43], 1.5); hit(c(8.21), [24, 36, 43], 1.6); riser(c(8.4), c(8.6) - c(8.4), 0.16); hit(c(8.6), CH.Am, 0.7);
  drone(28, c(9.15), c(10.8) - c(9.15), 0.07);
  KAEL[0].forEach((n, i) => synth(n - 12, c(9.5) + i * 0.13, 0.3, { wave: 'pluck', volume: 0.06, attack: 0.002, release: 0.25, send: 0.5 }));
  hit(c(10.12), CH.Em, 0.6);                                      // the blade comes out of the floor
  pad('Em', c(10.12), c(10.8) - c(10.12), 0.04, { attack: 0.1 });
}
// ── ACT 1: light ────────────────────────────────────────────────────────────
{ const c = at('x3-light');
  laws(c(0), c(1.6) - c(0), 0.09); stars(c(0.9), c(1.6) - c(0.9), 0.04); riser(c(0.9), c(1.6) - c(0.9), 0.16);
  hit(c(1.6), [24, 36, 42, 48], 1.6); synth(24, c(1.6), 2.5, { wave: 'sine', volume: 0.24, attack: 0.004, release: 2.0 });   // a star, in a heartbeat
  chord([48, 49, 54], c(1.8), c(2.55) - c(1.8), { wave: 'choir', volume: 0.04, attack: 0.2, release: 0.2, send: 0.4 }); rumble(c(1.8), c(3.2) - c(1.8), 0.08);
  section(c(2.55), c(3.72), 160, ['Em', 'B'], { drums: 'drive', arp: true });
  hit(c(3.72), [36, 43, 48, 55], 1.5);                            // the beam
  synth(79, c(3.75), c(5.8) - c(3.75), { wave: 'saw', volume: 0.03, attack: 0.02, release: 0.3, vibrato: 0.006, send: 0.3 }); chord([36, 43], c(3.75), c(5.8) - c(3.75), { wave: 'square', volume: 0.05, attack: 0.02, release: 0.3 });
  hit(c(5.2), CH.Em, 0.4);
  pad('Em', c(5.9), c(7.2) - c(5.9), 0.035, { attack: 0.5 });
  // He grows: the fifth, a step at a time, into the floor.
  [36, 31, 29, 24].forEach((n, i) => { chord([n, n + 7, n + 12], c(7.2) + i * ((c(9.4) - c(7.2)) / 4), (c(11.25) - c(7.2)), { wave: 'choir', volume: 0.04, attack: 1, release: 0.4, send: 0.4 }); tom(c(7.2) + i * ((c(9.4) - c(7.2)) / 4), 30 - i * 2, 0.5); });
  drone(24, c(7.2), c(11.25) - c(7.2), 0.16);
  V.mute(c(11.3), c(11.6) + 0.25);                                // black
}
// ── ACT 2: noise ────────────────────────────────────────────────────────────
{ const c = at('x4-noise');
  laws(c(0.3), c(1.1) - c(0.3), 0.12);
  hit(c(1.1), [24, 36, 43], 1.3);
  // It should have killed him. It comes apart: the fifth gets a third, the first since the void, and it is his.
  synth(76, c(1.3), c(3.4) - c(1.3), { wave: 'glass', volume: 0.04, attack: 0.01, release: 1.2, send: 0.6 });
  chord([64, 67, 71], c(1.5), c(3.6) - c(1.5), { wave: 'string', volume: 0.05, attack: 0.5, release: 0.8, send: 0.4 });
  KAEL[0].forEach((n, i) => synth(n - 12, c(2.5) + i * 0.3, 0.5, { wave: 'sine', volume: 0.055, attack: 0.04, release: 0.3, send: 0.45 }));
  hit(c(3.8), [24, 36, 43], 1.6); rumble(c(3.8), c(4.2) - c(3.8), 0.1);
  [4.2, 4.27, 4.34, 4.42, 4.5, 4.58, 4.66].forEach((t, i) => chord([36 + (i * 5) % 12, 43 + (i * 5) % 12], c(t), 0.2, { wave: 'saw', volume: 0.05, attack: 0.002, release: 0.08 }));   // the size stutters
  hit(c(4.95), [40, 47, 52], 1.2);
  pad('C', c(5.2), c(6.4) - c(5.2), 0.04); heartbeat(c(5.4), c(6.4), 0.5, 0.2);
  section(c(6.4), c(10), 120, ['Em', 'C', 'Em', 'D'], { drums: 'half', bassVol: 0.1 });
  KAEL.slice(0, 2).forEach((l, k) => l.forEach((n, i) => synth(n - 12, c(6.8) + k * 1.6 + i * 1.6 / l.length, 1.5 / l.length, { wave: 'string', volume: 0.055, attack: 0.04, release: 0.15, send: 0.35 })));
  riser(c(9.2), c(10) - c(9.2), 0.16);
}
// ── ACT 2: excavation ───────────────────────────────────────────────────────
{ const c = at('x5-excavate');
  section(c(0), c(2.95), 150, ['Em', 'C', 'G', 'D'], { drums: 'drive', stabs: true, lead: true, leadShift: -12, leadVol: 0.07 });
  hit(c(0.67), CH.C, 0.9); kept(c(0.7), 0.025, 0.14);             // the first plate; someone in there
  hit(c(2.0), CH.D, 0.9); kept(c(2.05), 0.03, 0.14);
  hit(c(2.97), [40, 47, 52], 1.2);
  pad('Em', c(3.2), c(5.4) - c(3.2), 0.04); drone(28, c(3.2), c(8.6) - c(3.2), 0.06);
  stars(c(4.2), c(8.6) - c(4.2), 0.02);
  kept(c(5.45), 0.05, 0.42);                                      // the close-up: the kept, film 2's figure
  chord([57, 60, 64], c(5.5), c(8.6) - c(5.5), { wave: 'choir', volume: 0.03, attack: 1.0, release: 0.8, send: 0.5 });
}
// ── ACT 2: the brawl ────────────────────────────────────────────────────────
{ const c = at('x5h-brawl');
  man(c(0.4), 0.3, { vol: 0.05, wave: 'string', shift: 0, len: 1 }); drone(33, c(0), c(1.05) - c(0), 0.08);   // he stops looking at his arm
  hit(c(1.05), [33, 45, 52], 0.8);
  street(c(1.1), c(2.45), 150);
  hit(c(1.66), [45, 52], 0.5); hit(c(1.97), [33, 40, 45], 0.9);
  // Kael's eyes shut. One tone goes out and comes back from the real one.
  hit(c(2.5), [33, 45], 0.4); drone(28, c(2.6), c(3.34) - c(2.6), 0.08);
  synth(88, c(3.0), 1.4, { wave: 'glass', volume: 0.07, attack: 0.002, release: 1.2, send: 0.7 }); synth(88, c(3.1), 1.0, { wave: 'glass', volume: 0.05, attack: 0.002, release: 0.9, send: 0.5, pan: 0.5 });
  riser(c(3.05), c(3.39) - c(3.05), 0.14);
  hit(c(3.39), [40, 47, 52, 59], 1.5); kept(c(3.42), 0.04, 0.1);
  // Even now: the street and his theme on top of each other.
  street(c(3.72), c(5.86), 150, { roots: [40, 36, 43, 38], bassVol: 0.1, tune: true, shift: 24, tuneVol: 0.03 });
  KAEL[0].concat(KAEL[1]).forEach((n, i) => synth(n - 12, c(3.8) + i * 0.27, 0.25, { wave: 'saw', volume: 0.055, attack: 0.008, release: 0.08, send: 0.25, vibrato: 0.002 }));
  hit(c(4.14), [40, 47, 52], 1.1); hit(c(5.6), [36, 43, 48], 1.0);
  hit(c(5.88), [33, 40], 0.4);                                    // gone through the rift
  drone(28, c(5.95), c(7.3) - c(5.95), 0.08);                     // silence, and the lenses opening
  [[6.45, 76], [6.72, 74], [7.0, 71]].forEach(([t, n]) => { synth(n + 12, c(t) - 0.3, 0.4, { wave: 'glass', volume: 0.04, attack: 0.002, release: 0.3, send: 0.6 }); hit(c(t) + 0.05, [33, 40, 45], t === 7.0 ? 1.0 : 0.6); });
  hit(c(7.37), [40, 47, 52], 0.9);                                // the wrist, caught
  riser(c(7.37), c(7.78) - c(7.37), 0.16);
  hit(c(7.84), [28, 40, 47, 52, 59], 1.7); kept(c(7.9), 0.045, 0.12);
  section(c(8.0), c(9.8), 120, ['Em', 'D'], { drums: 'none', bass: false, pad: 0.05 });
  riser(c(9.0), c(9.8) - c(9.0), 0.12);
}
// ── ACT 2: the holes ────────────────────────────────────────────────────────
{ const c = at('x6-holes');
  laws(c(0.2), c(1.5) - c(0.2), 0.1);
  [1.0, 1.15, 1.3, 1.42, 1.55].forEach((t, i) => { synth(24 + i, c(t), 0.8, { wave: 'sine', volume: 0.14, attack: 0.004, release: 0.6 }); chord([72 + i, 79 + i], c(t), 0.4, { wave: 'glass', volume: 0.03, attack: 0.002, release: 0.3, send: 0.4 }); });
  section(c(1.5), c(3.45), 160, ['Em', 'C', 'Am', 'B'], { drums: 'drive', stabs: true, lead: true, leadShift: -12, leadVol: 0.07 });
  hit(c(2.05), CH.C, 0.6); riser(c(2.6), c(3.45) - c(2.6), 0.2);
  hit(c(3.5), [28, 40, 47, 52], 1.8); crash(c(3.5), 0.3, 3.0); kept(c(3.55), 0.05, 0.14);
  pad('Em', c(3.9), c(8) - c(3.9), 0.04); stars(c(5.2), c(8) - c(5.2), 0.02); kept(c(6.3), 0.045, 0.3);
  riser(c(7.2), c(8) - c(7.2), 0.1);
}
// ── ACT 2: the sky ──────────────────────────────────────────────────────────
{ const c = at('x6h-sky');
  laws(c(0), c(0.95) - c(0), 0.1); riser(c(0.2), c(0.95) - c(0.2), 0.12);
  hit(c(0.95), [24, 36, 43], 1.4); rumble(c(0.95), c(1.6) - c(0.95), 0.1);    // the floor
  section(c(1.1), c(3.6), 168, ['Em', 'C', 'D', 'B'], { drums: 'drive', arp: true, stabs: true });
  // Each rock he lands on rings a note of his theme, climbing.
  [[1.62, 76], [2.3, 79], [2.98, 83]].forEach(([t, n]) => synth(n, c(t), 0.9, { wave: 'pluck', volume: 0.08, attack: 0.002, release: 0.7, send: 0.45 }));
  hit(c(2.65), CH.Em, 1.0);                                       // the big rock, cut
  riser(c(3.14), c(3.5) - c(3.14), 0.16);
  // "I was already there": everything stops for the line.
  V.mute(c(3.52), c(3.6));
  hit(c(3.62), [36, 37, 43, 48], 1.7); crash(c(3.62), 0.35, 2.5); hit(c(3.85), [33, 40, 45], 1.0);
  section(c(3.95), c(4.5), 150, ['Am'], { drums: 'half', bassVol: 0.1 });
  hit(c(4.3), CH.Am, 0.5);
  // The sweep: a choir turning, one note climbing with it. It parts round him.
  laws(c(4.5), c(5.54) - c(4.5), 0.1);
  for (let i = 0; i < 8; i++) synth(60 + i, c(4.5) + i * 0.14 * 1.2, 0.6, { wave: 'choir', volume: 0.05, attack: 0.1, release: 0.3, send: 0.45, pan: Math.sin(i) * 0.6 });
  hit(c(5.54), [40, 47, 52], 1.1); chord([64, 67, 71], c(5.54), c(5.9) - c(5.54), { wave: 'string', volume: 0.06, attack: 0.02, release: 0.2, send: 0.4 });
  // In along the arm: fists in the air, the street on his theme's harmony.
  section(c(5.9), c(7.0), 168, ['Em', 'B'], { drums: 'drive', stabs: true, lead: true, leadShift: -12, leadVol: 0.08 });
  hit(c(6.36), CH.Em, 0.45); hit(c(6.52), CH.B, 0.45); hit(c(6.82), [35, 42, 47], 0.8);
  // Down points up: the whole score stops pulling. High, weightless, the kept above everything.
  hit(c(7.0), [24, 36, 43], 1.4);
  chord([72, 79, 84], c(7.1), c(8.3) - c(7.1), { wave: 'choir', volume: 0.05, attack: 0.3, release: 0.3, send: 0.6 }); stars(c(7.1), c(8.3) - c(7.1), 0.035);
  KAEL[0].forEach((n, i) => synth(n, c(7.75) + i * 0.13, 0.3, { wave: 'saw', volume: 0.05, attack: 0.01, release: 0.1, send: 0.35 }));
  riser(c(8.2), c(8.62) - c(8.2), 0.24);
  hit(c(8.62), [28, 40, 47, 52, 59], 2.2); crash(c(8.62), 0.4, 4.0); synth(28, c(8.62), 3.0, { wave: 'sine', volume: 0.24, attack: 0.004, release: 2.4 }); kept(c(8.7), 0.05, 0.14);
  hit(c(9.72), [40, 47, 52], 1.0);
  pad('Em', c(9.8), c(11) - c(9.8), 0.04, { attack: 0.3 });
}
// ── ACT 2: the supernova ────────────────────────────────────────────────────
{ const c = at('x7-nova');
  // Every star in him running in: everything drawn to one note, and silence around it.
  drone(24, c(0.5), c(3.0) - c(0.5), 0.18); riser(c(0.9), c(3.0) - c(0.9), 0.26);
  for (let i = 0; i < 12; i++) synth(96 - i * 3, c(0.9) + i * (c(3) - c(0.9)) / 12, 0.5, { wave: 'glass', volume: 0.03, attack: 0.002, release: 0.4, send: 0.5 });
  V.mute(c(2.96), c(3.0));
  hit(c(3.0), [24, 36, 43, 48, 55], 2.4); crash(c(3.0), 0.45, 5.0); rumble(c(3.0), c(5.7) - c(3.0), 0.12); synth(24, c(3.0), c(5.7) - c(3.0), { wave: 'sine', volume: 0.24, attack: 0.004, release: 1.4 });
  // Inside it: Kael's walk, the theme slowly, in the only quiet place there is.
  heartbeat(c(3.3), c(5.6), 0.62, 0.3);
  KAEL[0].concat(KAEL[1]).forEach((n, i) => synth(n - 12, c(3.45) + i * 0.46, 0.44, { wave: 'string', volume: 0.075, attack: 0.05, release: 0.18, send: 0.4, vibrato: 0.002 }));
  riser(c(5.7), c(6.05) - c(5.7), 0.24);
  hit(c(6.05), [28, 40, 47, 52, 59], 2.4); crash(c(6.05), 0.4, 3.0);
  synth(83, c(6.75), 2.5, { wave: 'glass', volume: 0.06, attack: 0.002, release: 2.2, send: 0.6 });   // the crust on his face cracks
  drone(28, c(6.8), c(11) - c(6.8), 0.07); chord([52, 59, 64], c(6.8), c(11) - c(6.8), { wave: 'string', volume: 0.035, attack: 1.0, release: 1.2, send: 0.4 });
  kept(c(8.4), 0.04, 0.34);
  kick(c(9.6), 0.5); synth(40, c(9.6), 1.2, { wave: 'sine', volume: 0.12, attack: 0.004, release: 1.0 });
}
// ── ACT 3: resonance ────────────────────────────────────────────────────────
{ const c = at('x8-resonance');
  drone(28, c(0), c(3.6) - c(0), 0.07);
  laws(c(1.6), c(3.55) - c(1.6), 0.07);                           // one more command
  V.mute(c(3.5), c(3.6));
  // Not an attack: one soft, enormous note.
  synth(40, c(3.6), 4.0, { wave: 'sine', volume: 0.24, attack: 0.02, release: 3.2 }); synth(76, c(3.6), 3.5, { wave: 'glass', volume: 0.09, attack: 0.002, release: 3.0, send: 0.7 }); crash(c(3.6), 0.14, 3.0);
  // The thread: two notes, a fifth apart, that find each other.
  synth(76, c(4.0), c(14.5) - c(4.0), { wave: 'sine', volume: 0.028, attack: 1.2, release: 2.0, send: 0.6, pan: -0.3 });
  synth(83, c(4.3), c(14.5) - c(4.3), { wave: 'sine', volume: 0.024, attack: 1.6, release: 2.0, send: 0.6, pan: 0.3 });
  // The kept turn, step out: the figure, full, for the first time with strings under it.
  chord([45, 52, 57], c(5.2), c(9.0) - c(5.2), { wave: 'string', volume: 0.05, attack: 1.2, release: 1.2, send: 0.45 });
  kept(c(5.2), 0.07, 0.42); chord([48, 55, 60], c(8.4), c(12.2) - c(8.4), { wave: 'choir', volume: 0.045, attack: 1.4, release: 1.0, send: 0.5 });
  kept(c(8.2), 0.075, 0.42, 12);
  chord([64, 67, 71], c(11.0), c(12.2) - c(11.0), { wave: 'string', volume: 0.055, attack: 0.8, release: 0.3, send: 0.45 }); riser(c(11.2), c(12.2) - c(11.2), 0.12);
  // The face. The minor gives way.
  hit(c(12.2), [40, 47, 52, 56], 1.0); chord([64, 68, 71], c(12.2), c(14.5) - c(12.2), { wave: 'string', volume: 0.055, attack: 0.05, release: 1.4, send: 0.45 }); synth(88, c(12.3), 2.4, { wave: 'bell', volume: 0.05, attack: 0.002, release: 2.2, send: 0.5 });
}
// ── ACT 3: the freeing ──────────────────────────────────────────────────────
{ const c = at('x9-free');
  chord(CH.E.map(n => n + 12), c(0) - 0.4, c(5.0) - c(0) + 0.4, { wave: 'choir', volume: 0.035, attack: 1.4, release: 1.2, send: 0.45 });
  // He walks in: film 2's major theme, slow, alone.
  KAEL_MAJOR.forEach((l, k) => l.forEach((n, i) => synth(n - 12, c(1.0) + k * 1.05 + i * 1.05 / l.length, 1.05 / l.length, { wave: 'sine', volume: 0.05, attack: 0.05, release: 0.2, send: 0.5 })));
  // The open hand. The whole theme, strings, E major.
  chord([64, 68, 71], c(5.0), c(8.4) - c(5.0), { wave: 'string', volume: 0.05, attack: 0.5, release: 1.0, send: 0.45 });
  synth(40, c(5.0), c(8.4) - c(5.0), { wave: 'sine', volume: 0.12, attack: 0.6, release: 1.2 });
  KAEL_MAJOR.slice(0, 2).forEach((l, k) => l.forEach((n, i) => synth(n, c(5.1) + k * 1.5 + i * 1.5 / l.length, 1.5 / l.length * 0.95, { wave: 'string', volume: 0.075, attack: 0.08, release: 0.2, vibrato: 0.003, send: 0.5 })));
  // The kept go: the figure, thinning, note by note.
  KEPT.forEach((n, i) => synth(n + 12, c(7.0) + i * 0.45, 2.0, { wave: 'glass', volume: 0.035 - i * 0.003, attack: 0.002, release: 1.8, send: 0.7 }));
  // The form goes dark: the fifth, and it stops, with nothing after it. It has no term for this.
  chord([36, 43, 48], c(8.4), c(10.0) - c(8.4), { wave: 'choir', volume: 0.05, attack: 0.3, release: 1.4, send: 0.4 }); drone(24, c(8.4), c(10.0) - c(8.4), 0.1);
  // The man: his tune, the street's tune, gentle, gold. Nothing else.
  synth(52, c(10.2), c(17) - c(10.2), { wave: 'sine', volume: 0.04, attack: 1.2, release: 2.0, send: 0.5 });
  man(c(10.5), 0.5, { line: MAN_GOLD, vol: 0.075, wave: 'pluck', shift: 12, len: 1.3, send: 0.55 });
  chord([64, 68, 71], c(12.0), c(17) - c(12.0), { wave: 'string', volume: 0.04, attack: 1.2, release: 1.6, send: 0.45 });
  man(c(13.2), 0.5, { line: MAN_GOLD, vol: 0.05, wave: 'string', shift: 12, len: 1.0, send: 0.5 });
  KAEL_MAJOR[3].forEach((n, i) => synth(n - 12, c(15.0) + i * 0.8, 1.2, { wave: 'sine', volume: 0.05, attack: 0.05, release: 0.8, send: 0.5 }));
}
// ── ACT 3: the watcher ──────────────────────────────────────────────────────
{ const c = at('x10-watcher');
  chord([64, 68, 71], c(0), c(1.8) - c(0), { wave: 'string', volume: 0.03, attack: 0.3, release: 1.2, send: 0.5 });
  // The camera rises; the warmth drains: E major to his D.
  drone(26, c(1.6), c(8.2) - c(1.6), 0.09);
  chord(SOV, c(2.4), c(7.9) - c(2.4), { wave: 'string', volume: 0.035, attack: 1.2, release: 1.2, send: 0.4, vibrato: 0.004 });
  synth(86, c(4.2), 2.4, { wave: 'bell', volume: 0.08, attack: 0.002, release: 2.2, send: 0.45 }); synth(26, c(4.2), 1.0, { wave: 'sine', volume: 0.18, attack: 0.004, release: 0.8 });   // seen
  [50, 51, 57, 58].forEach((n, i) => synth(n + 24, c(6.1) + i * 0.3, 0.5, { wave: 'glass', volume: 0.035, attack: 0.002, release: 0.4, send: 0.45 }));   // the mark, closing
  synth(86, c(7.6), 1.6, { wave: 'bell', volume: 0.05, attack: 0.002, release: 1.4, send: 0.5 });
  // Gone. Kael looks up, late: the first bar of his theme, unanswered.
  KAEL[0].forEach((n, i) => synth(n - 12, c(9.0) + i * 0.5, 0.8, { wave: 'sine', volume: 0.05, attack: 0.05, release: 0.5, send: 0.55 }));
  synth(52, c(8.8), c(12.4) - c(8.8), { wave: 'sine', volume: 0.03, attack: 1.0, release: 1.6, send: 0.5 });
}
// ── TITLE ───────────────────────────────────────────────────────────────────
pad('E', TITLE + 0.1, 4.8, 0.05, { attack: 0.6, release: 2.5 });
synth(40, TITLE + 0.1, 4.8, { wave: 'sine', volume: 0.1, attack: 0.6, release: 2.5 });
[76, 80, 83, 88].forEach((n, i) => synth(n, TITLE + 0.3 + i * 0.45, 2.6, { wave: 'glass', volume: 0.045, attack: 0.002, release: 2.2, send: 0.5 }));

V.write(OUT);
console.log(OUT, DUR.toFixed(2) + 's');
