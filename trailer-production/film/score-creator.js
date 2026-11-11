'use strict';
// "Kael vs The Creator": the score, written to picture. Every hit is on a measured frame of the cut
// (node film/run.js times <shot> ...; shot starts from the capture frame counts below).
//
// Four ideas:
//   Kael      film 1's theme, moved to E minor; it turns to E major when the blade goes into the core.
//   Creator   glass bells stacked in fifths: something being built. Its stairs play it descending.
//   Sovereign film 1's low D and his "wrong notes" cluster, in the cold open's last shard and under the sting.
//   Starlight a high shimmering cluster: the Cosmic form under the shell.
//
//   node film/score-creator.js   → work/film-creator-score.wav
const path = require('path');

// Shot starts (frames at 60 fps), in cut order: c0-observer 985, c1-gate 769, c1-fight 1337, c2-pieces 771,
// c2-undone 926, c2-escalate 631, c3-lock 425, c3-key 798, c3-shell 642, c4-sting 721, title 300.
const LEN = { c0: 985, gate: 769, fight: 1337, pieces: 771, undone: 926, esc: 631, lock: 425, key: 798, shell: 642, sting: 721, title: 300 };
const START = {}; let acc = 0; for (const k in LEN) { START[k] = acc; acc += LEN[k]; }
const DUR = acc / 60 + 0.5;
const at = (shot, frame) => (START[shot] + frame) / 60;          // a measured frame inside a shot
const atc = (shot, c) => (START[shot] + c * 60) / 60;            // a choreography time in a shot with no speed ramps
const OUT = path.join(__dirname, '..', 'work', 'film-creator-score.wav');

const V = require('./score-voices')(DUR, 0xc4ea7042);
const { synth, chord, kick, snare, hat, tom, riser, crash, drone, rumble, hit, heartbeat } = V;

// ── harmony (E minor; E major for the key) ──
const CH = { Em: [52, 55, 59], C: [48, 52, 55], D: [50, 54, 57], B: [47, 51, 54], Am: [45, 48, 52], G: [43, 47, 50],
  E: [52, 56, 59], A: [45, 49, 52], Cm: [48, 51, 55], Fs: [42, 46, 49], Dm: [50, 53, 57] };
const BASS = { Em: 40, C: 36, D: 38, B: 35, Am: 33, G: 31, E: 40, A: 33, Cm: 36, Fs: 30, Dm: 38 };
const KAEL = [[76, 71, 76, 79, 78], [76, 74, 72, 67], [78, 81, 79, 78, 74], [75, 71]];
const KAEL_MAJOR = [[76, 71, 76, 80, 78], [76, 75, 73, 68], [78, 81, 80, 78, 75], [80, 76]];
const KAEL_FLAT = KAEL.flat();
const BUILD = [52, 59, 66, 73, 80];                            // the Creator: stacked fifths
const SOV = [50, 51, 57, 58];
const STAR = [88, 90, 95, 97];

function pad(c, t0, len, vol = 0.06, o = {}) { chord(CH[c], t0, len, { wave: 'string', volume: vol, attack: o.attack ?? 0.8, release: o.release ?? 0.9, send: 0.3, ...o }); }
function glass(notes, t0, step, o = {}) { notes.forEach((n, i) => synth(n, t0 + i * step, o.len ?? 2.6, { wave: 'glass', volume: o.vol ?? 0.05, attack: 0.002, release: o.len ? o.len * 0.85 : 2.2, send: 0.5, pan: (i - (notes.length - 1) / 2) * 0.25 })); }
function stars(t0, len, vol = 0.03) { STAR.forEach((n, i) => synth(n, t0 + i * 0.05, len, { wave: 'sine', volume: vol, attack: 0.6, release: Math.min(len * 0.6, 2), send: 0.6, vibrato: 0.003, pan: (i - 1.5) * 0.3 })); }
// A driving section of bars at bpm from t0 to t1 (same shape as film 1's).
function section(t0, t1, bpm, prog, o = {}) {
  const beat = 60 / bpm, bar = beat * 4;
  for (let k = 0, s = t0; s < t1 - 0.05; k++, s += bar) {
    const c = prog[k % prog.length];
    chord(CH[c], s, Math.min(bar, t1 - s) * 0.99, { wave: 'string', volume: o.pad ?? 0.06, attack: 0.1, release: 0.2, send: 0.2 });
    if (o.bass !== false) for (let i = 0; i < 8; i++) { const ts = s + i * beat / 2; if (ts < t1) synth(BASS[c] + (i === 2 || i === 5 ? 12 : 0), ts, beat * 0.39, { wave: 'square', volume: o.bassVol ?? 0.1, attack: 0.005, release: 0.035 }); }
    if (o.stabs) [0, 1.5, 2, 3, 3.5].forEach(q => { const ts = s + q * beat; if (ts < t1) chord([BASS[c] + 12, BASS[c] + 19, BASS[c] + 24], ts, beat * 0.3, { wave: 'saw', volume: 0.038, attack: 0.004, release: 0.04, send: 0.04 }); });
    if (o.arp) { const a = [CH[c][0], CH[c][1], CH[c][2], CH[c][0] + 12, CH[c][2], CH[c][1], CH[c][2], CH[c][0] + 12]; a.forEach((n, i) => { const ts = s + i * beat / 2; if (ts < t1) synth(n + 12, ts, beat * 0.26, { wave: o.arpWave || 'pluck', volume: 0.045, attack: 0.002, release: 0.1, pan: i % 2 ? 0.22 : -0.22, send: 0.17 }); }); }
    if (o.lead) { const line = (o.leadLine || KAEL)[k % 4]; line.forEach((n, i) => { const ts = s + i * bar / line.length; if (ts < t1) synth(n + (o.leadShift || 0), ts, bar * 0.9 / line.length, { wave: o.leadWave || 'saw', volume: o.leadVol ?? 0.08, attack: 0.02, release: 0.08, vibrato: 0.0015, send: 0.22 }); }); }
    const st = o.drums || 'main';
    if (st !== 'none') {
      const hats = st === 'half' ? [0, 4, 8, 12] : st === 'drive' ? Array.from({ length: 16 }, (_, i) => i) : [0, 2, 4, 6, 8, 10, 12, 14];
      hats.forEach(q => { const ts = s + q * beat / 4; if (ts < t1) hat(ts, st === 'drive' ? 0.1 : 0.11, q === 14 && st !== 'half'); });
      if (st === 'half') { kick(s, 0.55); if (s + beat * 2 < t1) snare(s + beat * 2, 0.4); if (s + beat * 2.5 < t1) kick(s + beat * 2.5, 0.34); }
      else { [0, 6, 8, 11, 14].forEach(q => { const ts = s + q * beat / 4; if (ts < t1) kick(ts, q === 0 ? 0.66 : 0.42); }); [4, 12].forEach(q => { const ts = s + q * beat / 4; if (ts < t1) snare(ts, 0.4); }); }
    }
  }
}

// ── COLD OPEN: the observer ─────────────────────────────────────────────────
drone(28, 0.3, 13.0, 0.09);                                      // the Creator's domain: a low E, no rain here
glass([BUILD[0] + 12, BUILD[2] + 12], 0.9, 0.9, { vol: 0.03 });
// Each shard: a measuring tone, and film 1 heard as a memory (D minor, far away).
[[2.6, [50, 53, 57]], [5.0, [46, 50, 53]], [7.4, [45, 48, 52]]].forEach(([t, ch]) => {
  synth(88, atc('c0', t), 1.6, { wave: 'glass', volume: 0.035, attack: 0.002, release: 1.3, send: 0.5 });
  chord(ch, atc('c0', t) + 0.05, 2.2, { wave: 'string', volume: 0.028, attack: 0.2, release: 1.4, send: 0.45 });
});
kick(atc('c0', 2.6) + 0.1, 0.25);                                // the clash, muffled
[69, 72, 76, 79, 76, 72].forEach((n, i) => synth(n, atc('c0', 7.5) + i * 0.3, 0.6, { wave: 'sine', volume: 0.04, attack: 0.05, release: 0.35, send: 0.5 }));   // the ninety-four
// Sovereign's shard: his low D, his wrong notes. He turns and looks out.
drone(26, atc('c0', 9.8), 3.0, 0.08);
chord(SOV, atc('c0', 10.2), 2.1, { wave: 'string', volume: 0.035, attack: 0.5, release: 0.8, send: 0.35, vibrato: 0.004 });
synth(86, atc('c0', 12.15), 2.4, { wave: 'bell', volume: 0.08, attack: 0.002, release: 2.2, send: 0.45 });
synth(26, atc('c0', 12.15), 0.9, { wave: 'sine', volume: 0.2, attack: 0.004, release: 0.7 });
// The shard goes black: one beat of nothing. Then the Creator's motif, and the crush.
glass(BUILD, atc('c0', 13.25), 0.22, { vol: 0.05, len: 3 });
riser(atc('c0', 13.7), 0.75, 0.12);
hit(atc('c0', 14.45), [40, 47, 52], 0.9);
pad('Em', atc('c0', 14.6), 1.6, 0.04, { attack: 0.1 });
riser(atc('c0', 15.3), 1.1, 0.1);

// ── ACT 1: the gate ─────────────────────────────────────────────────────────
synth(28, atc('gate', 0.5), 4.0, { wave: 'sine', volume: 0.14, attack: 0.3, release: 2.5 });     // the rift opens
crash(atc('gate', 0.5), 0.08, 3.0);
pad('Em', atc('gate', 1.4), 3.6, 0.04);
heartbeat(atc('gate', 1.6), atc('gate', 4.6), 1.02, 0.22);       // his walk
pad('C', atc('gate', 5.0), 3.6, 0.045);
// The stairs: each step lands on a glass note, the motif coming down.
const STEP_NOTES = [80, 78, 76, 73, 71, 66, 64, 59];
STEP_NOTES.forEach((n, i) => synth(n, atc('gate', 5.2 + (i + 1) * 0.42 - 0.063), 1.4, { wave: 'glass', volume: 0.05, attack: 0.002, release: 1.2, send: 0.5, pan: 0.3 - i * 0.08 }));
hit(atc('gate', 8.56), [40, 47, 52], 0.8);                       // it reaches the floor
pad('Em', atc('gate', 8.7), 1.6, 0.045);
// His blade forms (film 1's figure, a step up).
[76, 79, 83, 88, 91].forEach((n, i) => synth(n, atc('gate', 9.3) + i * 0.07, 1.2, { wave: 'pluck', volume: 0.05, attack: 0.002, release: 0.9, send: 0.4, pan: (i - 2) * 0.2 }));
// The hand rises; the cracks run at him.
drone(40, atc('gate', 10.7), 2.1, 0.09); chord([52, 53, 59], atc('gate', 10.7), 2.0, { wave: 'string', volume: 0.04, attack: 0.3, release: 0.6, send: 0.3 });
for (let i = 0; i < 9; i++) tom(atc('gate', 11.0) + i * 0.14, 40 + i, 0.18 + i * 0.02);
riser(atc('gate', 11.6), 1.2, 0.15);

// ── ACT 1: the world changes ────────────────────────────────────────────────
const F = f => at('fight', f);
hit(F(0), [40, 47, 52], 1.0);                                    // spikes run
section(F(0), F(328), 150, ['Em', 'C', 'D', 'B'], { drums: 'drive', stabs: true });
hit(F(142), CH.Em, 0.6);                                         // the blade on the wall
hit(F(185), [36, 43, 48], 1.0);                                  // the wall throws him
tom(F(282), 40, 0.4); tom(F(286), 43, 0.4);                      // the walls rise
hit(F(328), [40, 46, 52], 1.2);                                  // they clap shut
section(F(340), F(411), 150, ['Am', 'B'], { drums: 'drive', arp: true });
riser(F(369), (411 - 369) / 60, 0.16);                           // the dive
// It builds a blade in an instant: the motif, fast. The bind, in slow motion.
glass(BUILD, F(378), 0.04, { vol: 0.04, len: 1.6 });
hit(F(411), [40, 47, 52, 55], 1.3);
drone(28, F(415), (693 - 415) / 60, 0.1); heartbeat(F(440), F(690), 0.95, 0.3);
chord([52, 59, 64], F(430), 4.4, { wave: 'string', volume: 0.04, attack: 0.6, release: 1.2, send: 0.35 });
// Three cuts drive him back.
section(F(693), F(837), 150, ['Em', 'Cm', 'B', 'B'], { drums: 'half', bassVol: 0.12, stabs: true });
hit(F(708), CH.Cm, 0.7); hit(F(758), CH.B, 0.8); riser(F(789), (837 - 789) / 60, 0.15);
// The katana breaks. Silence, and one high glass note that does not fade.
hit(F(837), [35, 42, 47, 54], 1.5); crash(F(837), 0.3, 3.0);
synth(88, F(845), 5.5, { wave: 'sine', volume: 0.022, attack: 0.6, release: 2.0, send: 0.6 });
drone(28, F(1094), (1337 - 1094) / 60, 0.08);
pad('Am', F(1115), 1.6, 0.04); pad('Em', F(1211) - 0.1, 1.4, 0.04);
// The pieces answer once.
[64, 71, 76, 83].forEach((n, i) => synth(n, F(1211) + i * 0.06, 1.0, { wave: 'pluck', volume: 0.04, attack: 0.002, release: 0.8, send: 0.5 }));
chord([40, 41], F(1304), (1337 - 1304) / 60 + 0.2, { wave: 'string', volume: 0.05, attack: 0.05, release: 0.15 });
riser(F(1260), (1337 - 1260) / 60, 0.14);

// ── ACT 2: the pieces ───────────────────────────────────────────────────────
const P = f => at('pieces', f);
// The pieces fly home: film 1's forming figure, up through two octaves.
[64, 67, 71, 76, 79, 83, 88, 91].forEach((n, i) => synth(n, P(19) + i * 0.09, 1.0, { wave: 'pluck', volume: 0.05, attack: 0.002, release: 0.8, send: 0.45, pan: (i - 3.5) * 0.12 }));
hit(P(70), [40, 47, 52, 59], 1.4);                               // and stop the cut
drone(40, P(74), (291 - 74) / 60, 0.08); chord([64, 71, 76], P(90), 3.4, { wave: 'string', volume: 0.035, attack: 0.5, release: 1.0, send: 0.4 });
hit(P(342), CH.Em, 0.7);                                         // he pushes it off
// The unmaking: a cluster pressing down. It fails: the cluster breaks open into a major chord.
chord([52, 53, 54, 59, 60], P(393), (522 - 393) / 60, { wave: 'choir', volume: 0.03, attack: 0.6, release: 0.3, send: 0.4, vibrato: 0.003 });
rumble(P(393), (522 - 393) / 60, 0.06);
hit(P(522), [40, 47, 52, 56], 1.1); chord([64, 68, 71], P(522), 2.0, { wave: 'string', volume: 0.045, attack: 0.02, release: 1.6, send: 0.4 });
// The halo stutters: the motif, broken.
[80, 73, 80, 66].forEach((n, i) => synth(n, P(531) + i * 0.11 + (i === 2 ? 0.05 : 0), 0.4, { wave: 'glass', volume: 0.035, attack: 0.002, release: 0.3, send: 0.4 }));
// He looks at the blade, and walks at it: Kael's theme, alone.
KAEL[0].forEach((n, i) => synth(n - 12, P(615) + i * 0.32, 0.5, { wave: 'sine', volume: 0.06, attack: 0.04, release: 0.3, send: 0.4 }));
heartbeat(P(672), P(771), 0.7, 0.22);

// ── ACT 2: undone ───────────────────────────────────────────────────────────
const U = f => at('undone', f);
glass([80, 73, 66, 59], U(19), 0.06, { vol: 0.035, len: 1.2 });  // it comes apart
glass(BUILD, U(43), 0.05, { vol: 0.04, len: 1.6 });              // and builds itself again
rumble(U(73), 3.0, 0.07); drone(28, U(73), 3.4, 0.08);           // the floor unmade
// Each foothold rings one note of his theme.
for (let k = 0; k < 9; k++) synth(KAEL_FLAT[k], atc('undone', 0.66 + k * 0.35), 0.9, { wave: 'pluck', volume: 0.055, attack: 0.002, release: 0.7, send: 0.45 });
pad('C', U(73), 3.0, 0.035); pad('D', U(253), 0.6, 0.04);
// The forest: a held breath.
for (let i = 0; i < 8; i++) tom(U(271) + i * 0.05, 52 - i, 0.16);
chord([52, 53], U(271), (315 - 271) / 60, { wave: 'string', volume: 0.05, attack: 0.05, release: 0.05 });
// The plant: the theme arrives in full.
hit(U(315), [40, 47, 52, 59], 1.6); crash(U(315), 0.3, 3.0);
synth(28, U(315), 2.0, { wave: 'sine', volume: 0.22, attack: 0.004, release: 1.6 });
section(U(318), U(746), 150, ['Em', 'C', 'G', 'D'], { drums: 'drive', arp: true, lead: true, leadShift: -12, leadVol: 0.085 });
hit(U(553), CH.C, 0.7); hit(U(602), CH.G, 0.7); hit(U(651), CH.D, 0.8);   // the walls come apart
// It steps back: everything stops on one chord.
hit(U(746), [40, 47, 52, 55], 0.9);
pad('Em', U(750), (926 - 750) / 60, 0.05, { attack: 0.2 });
synth(83, U(776), 2.6, { wave: 'glass', volume: 0.04, attack: 0.002, release: 2.2, send: 0.5 });

// ── ACT 2: escalation ───────────────────────────────────────────────────────
const E = c => atc('esc', c);
drone(26, E(0), 1.2, 0.08); chord([62, 63], E(0.6), 0.4, { wave: 'glass', volume: 0.04, attack: 0.002, release: 0.3 });
hit(E(1.0), [36, 42, 48, 54], 1.6); crash(E(1.0), 0.35, 3.5);    // magenta: the third phase (a tritone)
// It rises: strings climbing a half-step at a time.
[[48, 52, 55], [49, 53, 56], [50, 54, 57], [51, 55, 58]].forEach((c, i) => chord(c, E(1.4 + i * 0.55), 0.6, { wave: 'choir', volume: 0.04, attack: 0.1, release: 0.2, send: 0.35 }));
// The vault laid overhead: the motif, enormous, with timpani under it.
drone(28, E(3.6), 4.2, 0.12);
[0, 1, 2, 3, 4].forEach(i => { glass([BUILD[i], BUILD[i] + 12], E(3.6 + i * 0.76), 0.04, { vol: 0.06, len: 2.4 }); tom(E(3.6 + i * 0.76), 36 + i * 2, 0.5); });
hit(E(5.0), [36, 43, 48], 0.6); hit(E(6.3), [38, 45, 50], 0.7); hit(E(7.3), [35, 42, 47], 0.9);
// Kael looks up; his eyes light.
pad('Em', E(7.4), 3.1, 0.05);
KAEL[0].forEach((n, i) => synth(n - 12, E(8.4) + i * 0.16, 0.4, { wave: 'saw', volume: 0.05, attack: 0.01, release: 0.2, send: 0.3 }));
synth(88, E(9.25), 1.6, { wave: 'bell', volume: 0.06, attack: 0.002, release: 1.4, send: 0.45 });
riser(E(9.4), 1.1, 0.18);

// ── ACT 3: the Lock ─────────────────────────────────────────────────────────
const K = f => at('lock', f);
glass(BUILD.slice(0, 3), K(12), 0.25, { vol: 0.05, len: 1.4 });  // three rings lock
hit(K(91), [40, 46, 52], 1.3);                                   // the pulse
section(K(163), K(339), 160, ['Em', 'C', 'Am', 'B'], { drums: 'drive', stabs: true, lead: true, leadShift: 0, leadVol: 0.075 });
[202, 250, 292].forEach(f => { snare(K(f), 0.45); crash(K(f), 0.12, 0.9); });   // the plates, cut
riser(K(292), (339 - 292) / 60 + 0.1, 0.17);
hit(K(339), CH.B, 1.0);                                          // he leaps

// ── ACT 3: the key ──────────────────────────────────────────────────────────
const Y = f => at('key', f);
// Three rings break: three hits climbing.
hit(Y(13), [40, 47, 52], 0.8); hit(Y(45), [43, 50, 55], 0.9); hit(Y(77), [47, 54, 59], 1.0);
hit(Y(132), [40, 46, 52], 1.0);                                  // its blade dies at the contact
glass([80, 73, 66], Y(132), 0.08, { vol: 0.03, len: 0.8 });
drone(40, Y(140), (237 - 140) / 60, 0.08); riser(Y(199), (288 - 199) / 60, 0.2);
// The core. E major: his theme, at last in major, over the tear.
hit(Y(288), [28, 40, 47, 52, 56], 2.0); crash(Y(288), 0.4, 5.0);
synth(28, Y(288), 6.0, { wave: 'sine', volume: 0.2, attack: 0.004, release: 4.5 });
chord(CH.E.map(n => n + 12), Y(300), (798 - 300) / 60, { wave: 'choir', volume: 0.045, attack: 1.2, release: 2.5, send: 0.45 });
KAEL_MAJOR.forEach((line, k) => line.forEach((n, i) => synth(n, Y(330) + k * 1.9 + i * 1.9 / line.length, 1.9 / line.length * 0.95, { wave: 'string', volume: 0.07, attack: 0.08, release: 0.2, vibrato: 0.002, send: 0.35 })));
pad('E', Y(463), 2.6, 0.05); pad('A', Y(620), 1.4, 0.05); pad('E', Y(700), 1.8, 0.05);

// ── ACT 3: the shell ────────────────────────────────────────────────────────
const S = f => at('shell', f);
// The cracks: the major chord bending to minor, then something older underneath.
chord([64, 68, 71], S(0), 1.0, { wave: 'string', volume: 0.04, attack: 0.05, release: 0.8, send: 0.4 });
chord([64, 67, 71], S(31), 1.4, { wave: 'string', volume: 0.04, attack: 0.3, release: 0.8, send: 0.4 });
[31, 91, 161].forEach((f, i) => { synth(28 - i, S(f), 1.4, { wave: 'sine', volume: 0.12, attack: 0.01, release: 1.1 }); tom(S(f), 38 - i * 2, 0.3); });
stars(S(60), (475 - 60) / 60, 0.022);
// Its eyes: starlight. Its hand closes on the blade.
stars(S(301), (475 - 301) / 60, 0.04);
synth(26, S(301), 2.4, { wave: 'sine', volume: 0.18, attack: 0.2, release: 1.4 });
hit(S(376), [37, 38, 44], 1.2);
riser(S(380), (441 - 380) / 60, 0.22);
hit(S(441), [28, 34, 40, 46], 1.8); crash(S(441), 0.4, 0.55);
// Black at frame 475: hard silence until the sting fades up.
V.mute(S(475), at('sting', 30));

// ── STING: Sovereign ────────────────────────────────────────────────────────
const G = c => atc('sting', c);
drone(26, G(0.4), 10.4, 0.07);                                   // his D, film 1's key
chord(SOV, G(1.0), 4.4, { wave: 'string', volume: 0.03, attack: 1.0, release: 1.6, send: 0.4, vibrato: 0.003 });
chord([50, 53, 57], G(5.4), 3.8, { wave: 'string', volume: 0.03, attack: 1.0, release: 1.4, send: 0.4 });
synth(74, G(3.9), 1.8, { wave: 'sine', volume: 0.025, attack: 0.2, release: 1.2, send: 0.5 });
synth(77, G(6.7), 1.8, { wave: 'sine', volume: 0.025, attack: 0.2, release: 1.2, send: 0.5 });
// "Good."
synth(86, G(9.6), 2.4, { wave: 'bell', volume: 0.08, attack: 0.002, release: 2.2, send: 0.45 });
synth(26, G(9.6), 1.0, { wave: 'sine', volume: 0.18, attack: 0.004, release: 0.8 });
hit(G(10.3), [26, 38, 39, 45], 1.1);                             // the blade out of the floor
chord(SOV, G(10.4), 1.6, { wave: 'saw', volume: 0.03, attack: 0.01, release: 1.4, send: 0.3 });

// ── TITLE ───────────────────────────────────────────────────────────────────
const T0 = START.title / 60;
pad('E', T0 + 0.1, 4.8, 0.05, { attack: 0.6, release: 2.5 });
synth(40, T0 + 0.1, 4.8, { wave: 'sine', volume: 0.1, attack: 0.6, release: 2.5 });
[76, 80, 83, 88].forEach((n, i) => synth(n, T0 + 0.3 + i * 0.45, 2.6, { wave: 'glass', volume: 0.045, attack: 0.002, release: 2.2, send: 0.5 }));

V.write(OUT);
console.log(OUT, DUR.toFixed(2) + 's');
