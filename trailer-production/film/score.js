'use strict';
// The film's score, scored to picture: every hit is placed on a measured frame of the cut (node film/run.js times).
// Same synth voices as the game's soundtrack (tools/music/render-soundtrack.js: string/pluck/saw/square/sine,
// kick/snare/hat/tom/riser, cross-fed delay), written on an absolute timeline in seconds instead of bars.
//
//   node film/score.js   → work/film-score.wav
const fs = require('fs'), path = require('path');

const SR = 48000, TAU = Math.PI * 2;
const DUR = 124.4;
const OUT = path.join(__dirname, '..', 'work', 'film-score.wav');
let rs = 0x5eed1234;
const rand = () => (rs = (rs * 1664525 + 1013904223) >>> 0) / 0x100000000;
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
const softClip = n => n / (1 + Math.abs(n));

const N = Math.ceil(DUR * SR);
const L = new Float32Array(N), R = new Float32Array(N), BL = new Float32Array(N), BR = new Float32Array(N);

function mix(start, seconds, fn, volume = 1, pan = 0, send = 0.08) {
  const s = Math.max(0, Math.floor(start * SR)), e = Math.min(N, s + Math.floor(seconds * SR));
  const pl = 1 - Math.max(0, pan) * 0.45, pr = 1 + Math.min(0, pan) * 0.45;
  for (let i = s; i < e; i++) {
    const t = (i - s) / SR, v = fn(t, (i - s) / (e - s)) * volume;
    L[i] += v * pl; R[i] += v * pr;
    BL[i] += v * send * (0.85 - pan * 0.15); BR[i] += v * send * (0.85 + pan * 0.15);
  }
}
function synth(note, start, seconds, o = {}) {
  const f = midi(note), wave = o.wave || 'saw', attack = o.attack ?? 0.012, release = o.release ?? 0.09, detune = o.detune ?? 0, vib = o.vibrato ?? 0;
  mix(start, seconds, (t, p) => {
    const env = Math.min(1, t / attack) * Math.min(1, (1 - p) / Math.max(0.001, release / seconds));
    const ph = TAU * (f * (1 + detune) * t + vib * Math.sin(TAU * 5 * t));
    let out;
    if (wave === 'sine') out = Math.sin(ph);
    else if (wave === 'square') out = Math.sign(Math.sin(ph));
    else if (wave === 'pluck') out = (Math.sin(ph) + 0.4 * Math.sin(ph * 2)) * Math.exp(-t * 5.8);
    else if (wave === 'bell') out = (Math.sin(ph) + 0.5 * Math.sin(ph * 2.76) + 0.25 * Math.sin(ph * 5.4)) * Math.exp(-t * 2.2);
    else if (wave === 'string') out = (Math.sin(ph) + 0.22 * Math.sin(ph * 2) + 0.10 * Math.sin(ph * 3)) * (0.82 + 0.18 * Math.sin(TAU * 1.4 * t));
    else out = 2 * ((f * (1 + detune) * t) % 1) - 1;
    return out * env;
  }, o.volume ?? 0.12, o.pan ?? 0, o.send ?? 0.08);
}
function chord(notes, start, seconds, o = {}) {
  notes.forEach((n, i) => synth(n, start, seconds, { ...o, pan: (o.pan || 0) + (i - (notes.length - 1) / 2) * 0.16, detune: (o.detune || 0) + (i % 2 ? 0.0018 : -0.0018) }));
}
function kick(start, amp = 0.65) { mix(start, 0.27, t => Math.sin(TAU * (132 * Math.exp(-t * 14) + 42) * t) * Math.exp(-t * 16), amp, 0, 0.015); }
function snare(start, amp = 0.38) { let pv = 0; mix(start, 0.22, t => { const n = rand() * 2 - 1, hi = n - pv * 0.72; pv = n; return (hi * 0.85 + Math.sin(TAU * 185 * t) * 0.26) * Math.exp(-t * 23); }, amp, 0, 0.12); }
function hat(start, amp = 0.16, open = false) { let pv = 0; mix(start, open ? 0.36 : 0.08, t => { const n = rand() * 2 - 1, hi = n - pv * 0.92; pv = n; return hi * Math.exp(-t * (open ? 8 : 52)); }, amp, 0.1, 0.03); }
function tom(start, note, amp = 0.32) { mix(start, 0.34, t => Math.sin(TAU * (midi(note) * (1.5 - t * 0.8)) * t) * Math.exp(-t * 9), amp, 0, 0.04); }
function riser(start, seconds, amp = 0.16) { let pv = 0; mix(start, seconds, (t, p) => { const n = rand() * 2 - 1, hi = n - pv * (0.72 + p * 0.2); pv = n; return hi * p * p * (0.32 + 0.68 * Math.sin(TAU * (150 + 950 * p) * t)); }, amp, 0, 0.34); }
// A cymbal-like wash.
function crash(start, amp = 0.2, len = 1.6) { let pv = 0; mix(start, len, t => { const n = rand() * 2 - 1, hi = n - pv * 0.95; pv = n; return hi * Math.exp(-t * 2.6); }, amp, 0, 0.3); }
// Rain: soft filtered noise, swelling slowly.
function rain(start, seconds, amp = 0.05) { let a = 0, b = 0; mix(start, seconds, (t, p) => { const n = rand() * 2 - 1; a += (n - a) * 0.35; b += (a - b) * 0.5; const f = Math.min(1, t / 1.5) * Math.min(1, (1 - p) * seconds / 1.5); return (a - b) * 3 * f * (0.8 + 0.2 * Math.sin(TAU * 0.3 * t)); }, amp, 0, 0.05); }
// A sub drone with slow beating.
function drone(note, start, seconds, amp = 0.12) { const f = midi(note); mix(start, seconds, (t, p) => { const f2 = Math.min(1, t / 2) * Math.min(1, (1 - p) * seconds / 2); return (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.003 * t) + 0.2 * Math.sin(TAU * f * 2 * t)) * f2; }, amp, 0, 0.1); }
// The big hit: kick, low chord, crash, a short sub tail.
function hit(at, notes, amp = 1) {
  kick(at, 0.85 * amp); kick(at + 0.01, 0.5 * amp); snare(at, 0.3 * amp); crash(at, 0.22 * amp, 2.2);
  chord(notes, at, 2.4, { wave: 'saw', volume: 0.05 * amp, attack: 0.005, release: 1.6, send: 0.3 });
  synth(notes[0] - 12, at, 2.0, { wave: 'sine', volume: 0.22 * amp, attack: 0.004, release: 1.4 });
}

// Harmony (D minor, with a D major for the end).
const CH = { Dm: [50, 53, 57], Bb: [46, 50, 53], C: [48, 52, 55], A: [45, 49, 52], Gm: [43, 46, 50], F: [41, 45, 48], Eb: [51, 55, 58], D: [50, 54, 57], G: [43, 47, 50], Am: [45, 48, 52] };
const BASS = { Dm: 38, Bb: 34, C: 36, A: 33, Gm: 31, F: 29, Eb: 39, D: 38, G: 31, Am: 33 };
const THEME = [[74, 69, 74, 77, 76], [74, 72, 70, 65], [76, 79, 77, 76, 72], [73, 69]];

// A driving section: bars of `bpm` from t0 to t1 over a progression; style main/drive/half; with an optional lead.
function section(t0, t1, bpm, prog, o = {}) {
  const beat = 60 / bpm, bar = beat * 4;
  for (let k = 0, s = t0; s < t1 - 0.05; k++, s += bar) {
    const c = prog[k % prog.length], len = Math.min(bar, t1 - s);
    chord(CH[c], s, len * 0.99, { wave: 'string', volume: o.pad ?? 0.065, attack: 0.1, release: 0.2, send: 0.2 });
    if (o.bass !== false) for (let i = 0; i < 8; i++) { const ts = s + i * beat / 2; if (ts < t1) synth(BASS[c] + (i === 2 || i === 5 ? 12 : 0), ts, beat * 0.39, { wave: 'square', volume: o.bassVol ?? 0.11, attack: 0.005, release: 0.035 }); }
    if (o.stabs) [0, 1.5, 2, 3, 3.5].forEach(q => { const ts = s + q * beat; if (ts < t1) chord([BASS[c] + 12, BASS[c] + 19, BASS[c] + 24], ts, beat * 0.3, { wave: 'saw', volume: 0.04, attack: 0.004, release: 0.04, send: 0.04 }); });
    if (o.arp) { const a = [CH[c][0], CH[c][1], CH[c][2], CH[c][0] + 12, CH[c][2], CH[c][1], CH[c][2], CH[c][0] + 12]; a.forEach((n, i) => { const ts = s + i * beat / 2; if (ts < t1) synth(n + 12, ts, beat * 0.26, { wave: 'pluck', volume: 0.05, attack: 0.002, release: 0.1, pan: i % 2 ? 0.22 : -0.22, send: 0.17 }); }); }
    if (o.lead) { const line = (o.leadLine || THEME)[k % 4]; line.forEach((n, i) => { const ts = s + i * bar / line.length; if (ts < t1) synth(n + (o.leadShift || 0), ts, bar * 0.9 / line.length, { wave: o.leadWave || 'saw', volume: o.leadVol ?? 0.085, attack: 0.02, release: 0.08, vibrato: 0.0015, send: 0.22 }); }); }
    // Drums.
    const st = o.drums || 'main';
    if (st !== 'none') {
      const hats = st === 'half' ? [0, 4, 8, 12] : st === 'drive' ? Array.from({ length: 16 }, (_, i) => i) : [0, 2, 4, 6, 8, 10, 12, 14];
      hats.forEach(q => { const ts = s + q * beat / 4; if (ts < t1) hat(ts, st === 'drive' ? 0.11 : 0.12, q === 14 && st !== 'half'); });
      if (st === 'half') { kick(s, 0.55); if (s + beat * 2 < t1) snare(s + beat * 2, 0.4); if (s + beat * 2.5 < t1) kick(s + beat * 2.5, 0.34); }
      else { [0, 6, 8, 11, 14].forEach(q => { const ts = s + q * beat / 4; if (ts < t1) kick(ts, q === 0 ? 0.66 : 0.42); }); [4, 12].forEach(q => { const ts = s + q * beat / 4; if (ts < t1) snare(ts, 0.4); }); }
    }
  }
}
function pad(c, t0, len, vol = 0.06, o = {}) { chord(CH[c], t0, len, { wave: 'string', volume: vol, attack: o.attack ?? 0.8, release: o.release ?? 0.9, send: 0.3, ...o }); }
function heartbeat(t0, t1, every = 1.1, amp = 0.4) { for (let t = t0; t < t1; t += every) { kick(t, amp); kick(t + 0.22, amp * 0.6); } }

// ── ACT 1 ────────────────────────────────────────────────────────────────────
rain(0, 79.8, 0.045);
drone(26, 0.5, 13.4, 0.1);
pad('Dm', 0.4, 5.3, 0.045); pad('Bb', 5.65, 3.1, 0.05);
hit(5.65, CH.Dm.map(n => n - 12), 0.7);                         // he lands
synth(86, 8.77, 2.5, { wave: 'bell', volume: 0.07, attack: 0.002, release: 2.2, send: 0.4 });   // the eye
[74, 77, 81, 86, 89].forEach((n, i) => synth(n, 9.27 + i * 0.07, 1.2, { wave: 'pluck', volume: 0.05, attack: 0.002, release: 0.9, send: 0.4, pan: (i - 2) * 0.2 }));   // the blade forming
pad('Dm', 9.1, 1.2, 0.05);
chord([50, 51, 57, 58], 10.3, 2.6, { wave: 'string', volume: 0.04, attack: 0.3, release: 0.8, send: 0.3, vibrato: 0.004 });   // the catalogue: wrong notes
tom(13.4, 45, 0.5);                                              // the stance
hit(13.85, CH.Dm, 0.9); hit(14.43, CH.Bb, 0.6);                 // both draw
riser(14.6, 2.7, 0.15);
// The clash, then the lock in slow motion: no groove, a held breath and a heartbeat.
hit(17.37, CH.Dm, 1.2);
drone(38, 17.4, 5.0, 0.1); pad('Dm', 17.5, 2.5, 0.05); pad('Eb', 20.0, 2.3, 0.05);
heartbeat(18.2, 22.2, 0.9, 0.35); riser(20.6, 1.7, 0.14);
section(22.3, 28.33, 140, ['Dm', 'Bb', 'C', 'A'], { drums: 'drive', stabs: true, lead: true, leadShift: -12 });
// The catch: the floor drops out.
synth(38, 28.33, 3.6, { wave: 'sine', volume: 0.16, attack: 0.01, release: 3 }); chord([62, 63], 28.33, 3.4, { wave: 'string', volume: 0.04, attack: 0.05, release: 2.5, send: 0.4 });
riser(30.6, 1.4, 0.13);
hit(32.05, CH.Dm.map(n => n - 12), 1.3);                        // the palm
drone(26, 33, 5.0, 0.11); heartbeat(34.6, 38.0, 1.3, 0.3); pad('Gm', 34.6, 3.4, 0.045);

// ── ACT 2 ────────────────────────────────────────────────────────────────────
pad('Dm', 38.0, 2.1, 0.04);
section(40.12, 51.3, 140, ['Gm', 'Eb', 'Dm', 'A'], { drums: 'main', arp: true });
hit(41.8, CH.Gm, 0.8); hit(43.5, CH.Dm, 0.8); hit(47.77, CH.A, 0.9);
// The domain: a drop, a rise, the expansion, and a heavy half-time in D phrygian.
drone(26, 51.4, 1.8, 0.12); riser(51.6, 1.55, 0.17);
hit(53.17, [38, 39, 45, 50], 1.4);
section(53.3, 59.24, 140, ['Dm', 'Eb', 'Dm', 'Eb'], { drums: 'half', bassVol: 0.13, stabs: true });
hit(58.52, CH.Eb, 0.9); hit(59.24, [38, 39, 45], 1.2);
pad('Dm', 59.4, 5.4, 0.05); riser(63.3, 1.5, 0.12);
// The fall.
section(64.85, 72.75, 150, ['Dm', 'Bb', 'Gm', 'A'], { drums: 'drive', arp: true, lead: true, leadShift: 0, leadVol: 0.07 });
rain(64.85, 8, 0.07);
hit(69.0, CH.Dm, 0.8); riser(71.0, 1.75, 0.2);
hit(73.0, CH.Dm.map(n => n - 12), 1.5);                         // the street
synth(26, 73.0, 3.5, { wave: 'sine', volume: 0.2, attack: 0.01, release: 3 }); pad('Dm', 73.5, 3.0, 0.035);

// ── ACT 3 ────────────────────────────────────────────────────────────────────
heartbeat(76.6, 79.6, 1.2, 0.3); drone(26, 76.5, 3.4, 0.1);
synth(45, 79.37, 0.5, { wave: 'saw', volume: 0.06, attack: 0.01, release: 0.4 });
// The world stops: everything cuts. The ninety-four.
const NINETY = [69, 72, 76, 79, 76, 72, 69, 67, 69, 72, 76, 81, 79, 76, 72, 69];
pad('Am', 79.85, 1.6, 0.05, { attack: 1.2 }); pad('F', 81.4, 1.1, 0.05); pad('C', 82.5, 1.0, 0.055); pad('G', 83.5, 1.2, 0.06);
NINETY.slice(0, 12).forEach((n, i) => synth(n, 80.2 + i * 0.36, 0.7, { wave: 'sine', volume: 0.07, attack: 0.05, release: 0.4, send: 0.45, vibrato: 0.002 }));
[69, 72, 76, 81, 84].forEach((n, i) => synth(n, 83.5 + i * 0.12, 1.4, { wave: 'pluck', volume: 0.05, attack: 0.002, release: 1.1, send: 0.45 }));   // his eyes
riser(83.9, 0.8, 0.16);
hit(84.7, CH.D, 1.3);                                            // the bare hand, and a major chord
drone(38, 85.0, 3.6, 0.1); chord([62, 66, 69], 85.0, 3.4, { wave: 'string', volume: 0.04, attack: 0.4, release: 1.2, send: 0.3 }); rain(84.7, 22, 0.04);
hit(88.6, CH.D, 0.9);
// Not in the file.
section(90.6, 95.2, 150, ['D', 'C', 'G', 'D'], { drums: 'drive', stabs: true });
hit(92.0, CH.D, 0.6); hit(93.3, CH.G, 0.6); riser(93.9, 1.25, 0.15);
hit(95.2, [38, 39, 45], 1.0);                                    // his domain
hit(95.57, CH.D, 1.3);                                           // Death's Dojo
section(95.6, 99.4, 150, ['D', 'Bb', 'C', 'D'], { drums: 'drive', arp: true, lead: true, leadShift: 0, leadVol: 0.09, leadLine: [[74, 78, 81, 86], [84, 81, 77, 74], [76, 79, 84, 81], [86, 81, 78, 74]] });
// The super. Shadow Step.
riser(99.47, 1.0, 0.18); synth(26, 99.5, 1.9, { wave: 'sine', volume: 0.14, attack: 0.3, release: 0.6 });
tom(100.48, 50, 0.45); tom(100.72, 52, 0.45); tom(100.87, 55, 0.5); tom(101.03, 57, 0.55);
hit(101.33, CH.D, 1.0);
// Silence: one held harmonic.
synth(93, 101.5, 5.0, { wave: 'sine', volume: 0.025, attack: 1.0, release: 1.5, send: 0.5 });
// The sheath decides.
hit(106.6, [38, 45, 50, 54, 57], 1.7); crash(106.6, 0.3, 3.5);
// Healing: a clean zero, recovery.
const heal = ['D', 'G', 'D', 'A'];
for (let i = 0; i < 4; i++) pad(heal[i], 109.8 + i * 0.95, 1.0, 0.055, { attack: 0.3, release: 0.5 });
[62, 66, 69, 74, 69, 66, 62, 66, 69, 74, 78, 74].forEach((n, i) => synth(n + 12, 109.9 + i * 0.3, 0.5, { wave: 'pluck', volume: 0.05, attack: 0.003, release: 0.35, send: 0.35, pan: i % 2 ? 0.2 : -0.2 }));
// He rises: the minor undercurrent.
drone(26, 113.4, 3.2, 0.12); synth(39, 113.5, 1.4, { wave: 'saw', volume: 0.06, attack: 0.05, release: 1.0 }); chord([50, 51], 114.8, 1.8, { wave: 'string', volume: 0.04, attack: 0.3, release: 1.0, send: 0.4, vibrato: 0.004 });
rain(110.5, 13.5, 0.04);
// Gone. The end.
pad('D', 116.4, 7.8, 0.06, { attack: 1.5, release: 4 });
[74, 76, 78, 81, 78, 74].forEach((n, i) => synth(n, 117.0 + i * 0.75, 1.4, { wave: 'sine', volume: 0.07, attack: 0.08, release: 0.9, send: 0.45 }));
synth(86, 119.3, 4.5, { wave: 'bell', volume: 0.07, attack: 0.002, release: 3.8, send: 0.5 });
synth(38, 116.4, 7.8, { wave: 'sine', volume: 0.12, attack: 1.5, release: 4 });

// ── delay/reverb and write ──
const taps = [[0.155, 0.19], [0.317, 0.13], [0.491, 0.09], [0.73, 0.06]];
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  let dl = 0, dr = 0;
  for (const [sec, g] of taps) { const j = i - Math.floor(sec * SR); if (j >= 0) { dl += BR[j] * g; dr += BL[j] * g; } }
  data.writeInt16LE(Math.round(softClip((L[i] + dl) * 0.86) * 32767), i * 4);
  data.writeInt16LE(Math.round(softClip((R[i] + dr) * 0.86) * 32767), i * 4 + 2);
}
const head = Buffer.alloc(44);
head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8); head.write('fmt ', 12); head.writeUInt32LE(16, 16);
head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22); head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 4, 28); head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34);
head.write('data', 36); head.writeUInt32LE(data.length, 40);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat([head, data]));
console.log(OUT, DUR + 's');
