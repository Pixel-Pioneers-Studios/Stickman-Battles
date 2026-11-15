'use strict';
// "Kael vs Sovereign" edit: the film's shots in order → out/film-kael-vs-sovereign-1080p60.mp4
//
//   node film/cut.js [act1]
//
// Each shot is used whole (the choreography already holds its own cuts). The music bed is pre-mixed to
// work/film-bed.wav from the game's own soundtrack, so it can change track at a shot boundary.
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { render, shotLog, WORK } = require('../lib/engine');
const { ROOT } = require('../lib/recorder');

const CUTS = {
  full: {
    name: 'film-kael-vs-sovereign-1080p60',
    // [shot, frames used] (a3-final was captured long; its last frame is black).
    shots: [['film-a1-open', 980], ['film-a1-clash', 1300], ['film-a2-patterns', 808], ['film-a2-dominion', 803], ['film-a2-fall', 700],
      ['film-a3-bearers', 841], ['film-a3-unwritten', 536], ['film-a3-final', 1188]],
    score: 'work/film-score.wav',
    title: 300,
  },
  act1: {
    name: 'film-act1-draft-1080p60',
    shots: ['film-a1-open', 'film-a1-clash'],
    // [file, timeline second it starts, second in the file it starts from, gain, fade in s, fade out at timeline s, fade length]
    bed: [['audio/music/story-embers.mp3', 0, 0, 0.75, 1.5, 12.8, 1.2], ['audio/music/boss-threshold.mp3', 13.3, 0, 0.8, 0.05, null, 1.5]],
  },
  // "Kael vs The Creator", full draft: cold open, three acts, Sovereign's sting, then the title (temp bed).
  creator: {
    name: 'film-kael-vs-creator-1080p60',
    shots: ['film-c0-observer', 'film-c1-gate', 'film-c1-fight', 'film-c2-pieces', 'film-c2-undone', 'film-c2-escalate',
      'film-c3-lock', 'film-c3-key', 'film-c3-shell', 'film-c4-sting'],
    score: 'work/film-creator-score.wav',
    title: 300,
  },
  creatorAct2: {
    name: 'film-creator-act1-2-draft-1080p60',
    shots: ['film-c0-observer', 'film-c1-gate', 'film-c1-fight', 'film-c2-pieces', 'film-c2-undone', 'film-c2-escalate'],
    bed: [['audio/music/story-embers.mp3', 0, 0, 0.7, 1.5, 15.6, 1.2], ['audio/music/boss-threshold.mp3', 16.4, 0, 0.75, 1.0, null, 1.5]],
  },
  // "Kael vs Cosmic Axiom", three acts, then the title (scored by film/score-axiom.js; the resonance starts at 135.1 s).
  axiom: {
    name: 'film-kael-vs-axiom-1080p60',
    shots: ['film-x0-husk', 'film-x1-void', 'film-x2-down', 'film-x2h-hands', 'film-x3-light', 'film-x4-noise', 'film-x5-excavate', 'film-x5h-brawl', 'film-x6-holes', 'film-x6h-sky', 'film-x7-nova',
      'film-x8-resonance', 'film-x9-free', 'film-x10-watcher'],
    score: 'work/film-axiom-score.wav',
    title: 300,
  },
  // "Kael vs Cosmic Axiom" draft: the husk, the Void, Act 1 (temp bed: embers to the landing, threshold from the fight).
  axiomAct1: {
    name: 'film-axiom-act1-draft-1080p60',
    shots: ['film-x0-husk', 'film-x1-void', 'film-x2-down', 'film-x3-light'],
    bed: [['audio/music/story-embers.mp3', 0, 0, 0.7, 1.5, 19.6, 1.0], ['audio/music/boss-threshold.mp3', 20.4, 0, 0.75, 0.6, null, 1.5]],
  },
  // "Kael vs Awakened Sovereign" draft: cold open + the first stage (temp bed until it is scored).
  sovereignAct1: {
    name: 'film-sovereign-act1-draft-1080p60',
    shots: ['film-z0-gallery', 'film-z1-observe'],
    bed: [['audio/music/story-embers.mp3', 0, 0, 0.55, 1.5, 21.0, 1.2], ['audio/music/boss-threshold.mp3', 22.0, 0, 0.72, 0.4, null, 1.5]],
  },
  // The same, through the Reading stage: the whole prediction, then what happened, in pieces (the pieces are [shot, frames, start frame]).
  sovereignAct2: {
    name: 'film-sovereign-act2-draft-1080p60',
    shots: ['film-z0-gallery', 'film-z1-observe', 'film-z2a-predict', ['film-z2b-real', 170, 31], ['film-z2b-real', 390, 288], ['film-z2b-real', 345, 750]],
    bed: [['audio/music/story-embers.mp3', 0, 0, 0.55, 1.5, 21.0, 1.2], ['audio/music/boss-threshold.mp3', 22.0, 0, 0.72, 0.4, 41.2, 1.2], ['audio/music/story-embers.mp3', 42.2, 0, 0.5, 1.0, 62.0, 0.5], ['audio/music/boss-threshold.mp3', 62.4, 0, 0.78, 0.1, null, 1.5]],
  },
  // The same, through the Dominating stage (ends on TYRANT, 1).
  sovereignAct3: {
    name: 'film-sovereign-act3-draft-1080p60',
    shots: [['film-z0-gallery', 1291], ['film-z1-observe', 1196], 'film-z2a-predict', ['film-z2b-real', 170, 31], ['film-z2b-real', 390, 288], ['film-z2b-real', 345, 750], 'film-z3-dominate'],
    bed: [['audio/music/story-embers.mp3', 0, 0, 0.55, 1.5, 21.0, 1.2], ['audio/music/boss-threshold.mp3', 22.0, 0, 0.72, 0.4, 41.2, 1.2], ['audio/music/story-embers.mp3', 42.2, 0, 0.5, 1.0, 62.0, 0.5], ['audio/music/boss-threshold.mp3', 62.4, 0, 0.78, 0.1, null, 1.5]],
  },
  // The whole film through TYRANT and the fall, title card last. The fight bed cuts out on the last cut (115.0 s) and the
  // aftermath plays on embers.
  sovereignAct4: {
    name: 'film-sovereign-act4-draft-1080p60',
    shots: [['film-z0-gallery', 1291], ['film-z1-observe', 1196], 'film-z2a-predict', ['film-z2b-real', 170, 31], ['film-z2b-real', 390, 288], ['film-z2b-real', 345, 750], 'film-z3-dominate', 'film-z4-tyrant'],
    title: 240,
    bed: [['audio/music/story-embers.mp3', 0, 0, 0.55, 1.5, 21.0, 1.2], ['audio/music/boss-threshold.mp3', 22.0, 0, 0.72, 0.4, 41.2, 1.2], ['audio/music/story-embers.mp3', 42.2, 0, 0.5, 1.0, 62.0, 0.5], ['audio/music/boss-threshold.mp3', 62.4, 0, 0.78, 0.1, 114.9, 0.25], ['audio/music/story-embers.mp3', 115.6, 0, 0.42, 2.5, null, 2.5]],
  },
  // "Kael vs The Creator" draft: cold open + Act 1 (game tracks as a temp bed until it is scored).
  creatorAct1: {
    name: 'film-creator-act1-draft-1080p60',
    shots: ['film-c0-observer', 'film-c1-gate', 'film-c1-fight'],
    bed: [['audio/music/story-embers.mp3', 0, 0, 0.7, 1.5, 15.6, 1.2], ['audio/music/boss-threshold.mp3', 16.4, 0, 0.75, 1.0, null, 1.5]],
  },
};

function mixBed(parts, dur, out) {
  const args = ['-loglevel', 'error', '-y'];
  const f = [];
  parts.forEach(([file, at, from, gain, fin, foutAt, flen], i) => {
    args.push('-stream_loop', '-1', '-ss', String(from), '-i', path.join(ROOT, file));
    const end = (foutAt === null ? dur : foutAt + flen) - at;
    f.push(`[${i}:a]aresample=48000,atrim=end=${end.toFixed(3)},afade=t=in:d=${fin},afade=t=out:st=${(end - flen).toFixed(3)}:d=${flen},volume=${gain},adelay=${Math.round(at * 1000)}:all=1,apad=whole_dur=${dur.toFixed(3)}[a${i}]`);
  });
  f.push(parts.map((p, i) => `[a${i}]`).join('') + `amix=inputs=${parts.length}:normalize=0,atrim=end=${dur.toFixed(3)}[out]`);
  args.push('-filter_complex', f.join(';'), '-map', '[out]', '-ac', '2', out);
  execFileSync('ffmpeg', args);
}

(async () => {
  const C = CUTS[process.argv[2] || 'full'];
  const segs = C.shots.map(s => Array.isArray(s) ? { shot: s[0], at: s[2] || 0, len: s[1] } : { shot: s, at: 0, len: shotLog('land', s).frames });
  const T = segs.reduce((a, s) => a + s.len, 0);
  if (C.title) segs.push({ len: C.title });
  const total = T + (C.title || 0);
  let music;
  if (C.score) music = { file: path.join('trailer-production', C.score), at: 0, gain: 0.9, fadeIn: 0.02, fadeOut: 0.6, end: total / 60 };
  else {
    const bed = path.join(WORK, 'film-bed.wav');
    mixBed(C.bed, total / 60 + 0.5, bed);
    music = { file: path.relative(ROOT, bed), at: 0, gain: 1, fadeIn: 0.02, fadeOut: 1.2, end: total / 60 };
  }
  const overlays = C.title
    ? [{ type: 'logo', from: T + 20, to: total, y: 0.42, size: 120, lines: ['STICKMAN', 'EVOLUTION'], fadeOut: 40 }, { type: 'fade', from: total - 30, to: total, out: true }]
    : [{ type: 'fade', from: total - 40, to: total, out: true }];
  const r = await render({ W: 1920, H: 1080, name: C.name, profile: 'land', segs, overlays, music, sfxGain: 0.85, stingers: [] });
  console.log(r.out, r.frames, 'frames', r.secs.toFixed(1) + 's');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
