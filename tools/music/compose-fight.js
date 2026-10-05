#!/usr/bin/env node
// Writes tools/music/out/fight-loop.mid — the Quick Fight loop, as a format-1
// multi-track MIDI meant to be imported into a DAW (BandLab) for sound design.
//
// D minor, 140 BPM, 4/4, 48 bars (~82s). The whole file is the loop: the last
// bar's fill lands on bar 1's crash, and no note rings past the final barline.
//
//   bars  1-8   A   groove only            Dm Bb C A x2
//   bars  9-16  A2  + lead theme
//   bars 17-24  B   lift                   Gm Bb F A | Gm Bb C A
//   bars 25-32  A3  theme + 16th arp
//   bars 33-40  BD  half-time breakdown, snare build in 39-40
//   bars 41-48  F   theme + arp, tom fill into the loop point
//
// Usage: node tools/music/compose-fight.js

'use strict';
const fs = require('fs');
const path = require('path');

const PPQ = 480;
const BPM = 140;
const S16 = PPQ / 4;          // one 16th
const E8 = PPQ / 2;           // one 8th
const BAR = PPQ * 4;
const TOTAL_BARS = 48;
const END = TOTAL_BARS * BAR;

// ── Harmony ────────────────────────────────────────────────────────────────
// Each chord: bass root (octave 1-2), power-chord root (octave 2-3), pad voicing.
const CH = {
  Dm: { bass: 38, pow: 50, pad: [62, 65, 69] },
  Bb: { bass: 34, pow: 46, pad: [62, 65, 70] },
  C:  { bass: 36, pow: 48, pad: [64, 67, 72] },
  A:  { bass: 33, pow: 45, pad: [64, 69, 73] },
  Gm: { bass: 43, pow: 43, pad: [62, 67, 70] },
  F:  { bass: 41, pow: 41, pad: [60, 65, 69] },
};
const PROG_A = ['Dm', 'Bb', 'C', 'A', 'Dm', 'Bb', 'C', 'A'];
const PROG_B = ['Gm', 'Bb', 'F', 'A', 'Gm', 'Bb', 'C', 'A'];

const SECTIONS = [
  { name: 'A',  prog: PROG_A, lead: null,    arp: false, drums: 'main', fill: false },
  { name: 'A2', prog: PROG_A, lead: 'theme', arp: false, drums: 'main', fill: true  },
  { name: 'B',  prog: PROG_B, lead: 'lift',  arp: false, drums: 'drive', fill: true },
  { name: 'A3', prog: PROG_A, lead: 'theme', arp: true,  drums: 'drive', fill: false },
  { name: 'BD', prog: PROG_A, lead: null,    arp: true,  drums: 'half', fill: false },
  { name: 'F',  prog: PROG_A, lead: 'theme', arp: true,  drums: 'drive', fill: true },
];

// Melodies as [note, lengthIn8ths] per bar; each bar sums to 8.
const THEME = [
  [[74, 2], [69, 1], [74, 1], [77, 2], [76, 2]],
  [[74, 3], [72, 1], [70, 2], [65, 2]],
  [[76, 2], [79, 2], [77, 1], [76, 1], [72, 2]],
  [[73, 6], [69, 2]],
  [[74, 2], [69, 1], [74, 1], [77, 2], [76, 2]],
  [[74, 2], [77, 2], [82, 3], [81, 1]],
  [[79, 2], [76, 2], [72, 2], [76, 2]],
  [[81, 4], [76, 2], [73, 2]],
];
const LIFT = [
  [[70, 2], [74, 2], [79, 4]],
  [[77, 6], [74, 2]],
  [[72, 2], [77, 2], [81, 4]],
  [[79, 2], [76, 2], [73, 4]],
  [[82, 4], [81, 2], [79, 2]],
  [[77, 6], [74, 2]],
  [[76, 2], [79, 2], [84, 2], [79, 2]],
  [[81, 8]],
];

// ── Tracks ─────────────────────────────────────────────────────────────────
// GM programs are placeholders so the file plays sensibly anywhere; swap them
// for real instruments in the DAW.
const tracks = {
  drums:  { name: 'Drums',            ch: 9, prog: 0,  ev: [] },
  bass:   { name: 'Bass (synth)',     ch: 0, prog: 38, ev: [] },
  gtr:    { name: 'Rhythm (power)',   ch: 1, prog: 30, ev: [] },
  pad:    { name: 'Pad / Strings',    ch: 2, prog: 48, ev: [] },
  lead:   { name: 'Lead',             ch: 3, prog: 81, ev: [] },
  arp:    { name: 'Arp',              ch: 4, prog: 81, ev: [] },
};

function note(tr, tick, n, len, vel) {
  const end = Math.min(tick + len, END);
  if (end <= tick) return;
  tr.ev.push({ t: tick, on: true, n, v: vel });
  tr.ev.push({ t: end, on: false, n, v: 0 });
}

const K = 36, SN = 38, HH = 42, OH = 46, CR = 49, T_HI = 50, T_HM = 48, T_LM = 47, T_LO = 45;

function drumBar(bar0, style, opts) {
  const d = tracks.drums;
  const at = s => bar0 + s * S16;
  if (opts.crash) note(d, at(0), CR, E8, 110);
  if (style === 'half') {
    note(d, at(0), K, S16, 105);
    note(d, at(8), SN, S16, 100);
    for (let s = 0; s < 16; s += 4) note(d, at(s), HH, S16, 60);
    return;
  }
  for (const s of [0, 6, 8, 14]) if (!(opts.fill && s >= 8)) note(d, at(s), K, S16, 110);
  for (const s of [4, 12]) if (!(opts.fill && s >= 8)) note(d, at(s), SN, S16, 112);
  const hatStep = style === 'drive' ? 1 : 2;
  const hatEnd = opts.fill ? 8 : 16;
  for (let s = 0; s < hatEnd; s += hatStep) {
    const openHere = opts.openHat && s === 14;
    note(d, at(s), openHere ? OH : HH, S16, s % 4 === 0 ? 82 : s % 2 === 0 ? 66 : 48);
  }
  if (opts.fill) {
    const toms = [T_HI, T_HI, T_HM, T_HM, T_LM, T_LM, T_LO, T_LO];
    toms.forEach((t, i) => note(d, at(8 + i), t, S16, 92 + i * 3));
    note(d, at(8), K, S16, 105);
    note(d, at(12), K, S16, 105);
  }
}

function snareBuild(bar0, sixteenths) {
  const step = sixteenths ? 1 : 2;
  for (let s = 0; s < 16; s += step) {
    const v = sixteenths ? 60 + Math.round((s / 15) * 62) : 72 + s * 2;
    note(tracks.drums, bar0 + s * S16, SN, S16, v);
  }
  note(tracks.drums, bar0, K, S16, 100);
}

function bassBar(bar0, chord, nextChord, style) {
  const r = CH[chord].bass;
  if (style === 'hold') { note(tracks.bass, bar0, r, BAR - 20, 96); return; }
  const pat = [r, r, r + 12, r, r, r + 12, r, r];
  if (chord === 'A' && nextChord && nextChord !== 'A') {
    // Walk up into the next root: E -> C# lands on D, otherwise just the 5th.
    pat[6] = 40; pat[7] = nextChord === 'Dm' ? 37 : 40;
  }
  pat.forEach((n, i) => note(tracks.bass, bar0 + i * E8, n, E8 - 30, i % 2 === 0 ? 104 : 88));
}

function gtrBar(bar0, chord) {
  const r = CH[chord].pow;
  const gallop = [0, 2, 3, 4, 6, 8, 10, 11, 12, 14];
  for (const s of gallop) {
    const accent = s === 0 || s === 8;
    for (const n of [r, r + 7, r + 12]) note(tracks.gtr, bar0 + s * S16, n, accent ? E8 : S16 - 20, accent ? 102 : 78);
  }
}

function padBar(bar0, chord, vel) {
  for (const n of CH[chord].pad) note(tracks.pad, bar0, n, BAR - 10, vel);
}

function arpBar(bar0, chord) {
  const [a, b, c] = CH[chord].pad;
  const pat = [a, b, c, a + 12, c, b, a + 12, c];
  for (let s = 0; s < 16; s++) note(tracks.arp, bar0 + s * S16, pat[s % 8] , S16 - 15, s % 4 === 0 ? 76 : 58);
}

function melodyBar(bar0, cells, vel) {
  let t = bar0;
  for (const [n, len8] of cells) {
    note(tracks.lead, t, n, len8 * E8 - 25, vel);
    t += len8 * E8;
  }
}

// ── Arrange ────────────────────────────────────────────────────────────────
let bar = 0;
SECTIONS.forEach((sec, si) => {
  sec.prog.forEach((chord, bi) => {
    const t0 = bar * BAR;
    const lastBar = bi === sec.prog.length - 1;
    const nextChord = !lastBar ? sec.prog[bi + 1] : SECTIONS[(si + 1) % SECTIONS.length].prog[0];

    if (sec.drums === 'half') {
      if (bi === 6) snareBuild(t0, false);
      else if (bi === 7) snareBuild(t0, true);
      else drumBar(t0, 'half', { crash: bi === 0 });
    } else {
      drumBar(t0, sec.drums, { crash: bi === 0, fill: sec.fill && lastBar, openHat: bi % 4 === 3 });
    }

    bassBar(t0, chord, nextChord, sec.drums === 'half' && bi < 4 ? 'hold' : 'drive');
    if (!(sec.drums === 'half' && bi < 4)) gtrBar(t0, chord);
    padBar(t0, chord, sec.drums === 'half' ? 84 : 66);
    if (sec.arp) arpBar(t0, chord);
    if (sec.lead === 'theme') melodyBar(t0, THEME[bi], 100);
    if (sec.lead === 'lift') melodyBar(t0, LIFT[bi], 104);
    bar++;
  });
});
if (bar !== TOTAL_BARS) throw new Error('arranged ' + bar + ' bars, expected ' + TOTAL_BARS);

// ── MIDI encode ────────────────────────────────────────────────────────────
function vlq(n) {
  const out = [n & 0x7f];
  while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
  return out;
}
function metaText(type, s) { const b = Buffer.from(s, 'utf8'); return [0xff, type, ...vlq(b.length), ...b]; }
function chunk(id, bytes) {
  const h = Buffer.alloc(8); h.write(id, 0, 'ascii'); h.writeUInt32BE(bytes.length, 4);
  return Buffer.concat([h, Buffer.from(bytes)]);
}
function encodeTrack(events, endTick) {
  const out = [];
  let last = 0;
  for (const e of events) { out.push(...vlq(e.t - last), ...e.bytes); last = e.t; }
  out.push(...vlq(Math.max(0, endTick - last)), 0xff, 0x2f, 0x00);
  return out;
}

const usPerQ = Math.round(60e6 / BPM);
const conductor = [
  { t: 0, bytes: metaText(0x03, 'Stickman Evolution - Fight Loop') },
  { t: 0, bytes: [0xff, 0x51, 0x03, (usPerQ >> 16) & 0xff, (usPerQ >> 8) & 0xff, usPerQ & 0xff] },
  { t: 0, bytes: [0xff, 0x58, 0x04, 4, 2, 24, 8] },
  { t: 0, bytes: [0xff, 0x59, 0x02, 0xff, 0x01] }, // key signature: 1 flat, minor (D minor)
];
const chunks = [chunk('MTrk', encodeTrack(conductor, END))];
const summary = [];
for (const tr of Object.values(tracks)) {
  // Note-offs sort before note-ons at the same tick so repeated pitches retrigger.
  tr.ev.sort((a, b) => a.t - b.t || (a.on === b.on ? 0 : a.on ? 1 : -1));
  const evs = [
    { t: 0, bytes: metaText(0x03, tr.name) },
    { t: 0, bytes: [0xc0 | tr.ch, tr.prog] },
    ...tr.ev.map(e => ({ t: e.t, bytes: [(e.on ? 0x90 : 0x80) | tr.ch, e.n, e.v] })),
  ];
  chunks.push(chunk('MTrk', encodeTrack(evs, END)));
  summary.push(`${tr.name.padEnd(16)} ${tr.ev.length / 2} notes`);
}
const header = Buffer.alloc(14);
header.write('MThd', 0, 'ascii');
header.writeUInt32BE(6, 4);
header.writeUInt16BE(1, 8);
header.writeUInt16BE(chunks.length, 10);
header.writeUInt16BE(PPQ, 12);

const outDir = path.join(__dirname, 'out');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'fight-loop.mid');
fs.writeFileSync(outFile, Buffer.concat([header, ...chunks]));
console.log(summary.join('\n'));
console.log(`${TOTAL_BARS} bars @ ${BPM} BPM = ${(TOTAL_BARS * 4 * 60 / BPM).toFixed(1)}s -> ${path.relative(process.cwd(), outFile)}`);
