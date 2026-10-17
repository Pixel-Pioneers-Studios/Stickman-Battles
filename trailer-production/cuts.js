'use strict';
// The five edits. All times are in frames at 60fps.
//
// Cuts sit on the music's beat grid: boss-threshold.mp3 is 144 BPM (25 frames
// a beat, 100 a bar) and battle-royale.mp3 is 150 BPM (24 a beat, 96 a bar).
// `at` is the first source frame of a window inside the recorded shot; the
// windows were chosen from the contact sheets and `node review.js windows`.
// Shots are re-recorded unseeded, so after re-running capture.js for a
// free-play shot (duel*, story*, boss, br, soccer, domain) re-check its `at`.
//
// Every number in the captions is read from the running game by info.js:
// 25 selectable weapons, 15 default classes (Adept, the Fragment class, is locked by default), 186 story chapters.

const URL = 'wronglysod.itch.io/stickman-evolution';
const CTA = 'PLAY FREE IN YOUR BROWSER';
const BOSS = 'audio/music/boss-threshold.mp3', BR = 'audio/music/battle-royale.mp3';

const slam = (from, to, text, y, size, extra) => Object.assign({ type: 'slam', from, to, text, y, size }, extra || {});
const tag = (from, to, text, x, y, extra) => Object.assign({ type: 'tag', from, to, text, x, y, align: 'left', size: 62 }, extra || {});
// Up to the end card. Landscape: bottom-right. Shorts: above the channel/caption stack.
const ingame = (to, vert) => vert ? { type: 'ingame', from: 0, to, x: 0.07, y: 0.72, align: 'left', size: 30 } : { type: 'ingame', from: 0, to, x: 0.965, y: 0.94 };

// Last-bars montage: eight finisher impacts, half a bar each.
const FIN_HITS = [['finAnchor', 85], ['finFists', 100], ['finAxe', 82], ['finGlass', 352], ['duel3', 590], ['finHammer', 100], ['finStaff', 82], ['finKatana', 112]];

function endCard(t0, len, o) {
  return [
    { type: 'scrim', from: t0, to: t0 + len, a: 0.8, fade: 6 },
    Object.assign({ type: 'logo', from: t0, to: t0 + len, y: 0.34, size: 150, cta: CTA, url: URL, ctaAt: 24 }, o || {}),
  ];
}

// ── Main trailer, 64s ───────────────────────────────────────────────────────
// Framed by the standoff (standoff.js): it opens on Kael and Sovereign facing
// off, and closes on them charging, cut to black on the frame their fists meet.
// The music comes in on bar 2, so the track's half-time drop (its bar 24) lands
// on the two full finishers at bar 26.
function main() {
  const B = 100;
  const segs = [
    // bars 0-2 — the standoff, held
    { shot: 'standoff', at: 0, len: 3 * B },
    // bars 3-5 — the 94 bearers behind Kael
    { shot: 'bearers', at: 20, len: 3 * B },
    // bar 6 — close on Kael; bar 7 — the logo over the standoff
    { shot: 'standoff-close', at: 0, len: B },
    { shot: 'standoff', at: 300, len: B },
    // bars 8-15 — the fight: duel, four moves, duel, the Reaper's domain
    { shot: 'duel', at: 330, len: 2 * B },
    { shot: 'moves', at: 45, len: 50 }, { shot: 'moves', at: 129, len: 50 },
    { shot: 'moves4', at: 62, len: 50 }, { shot: 'moves2', at: 45, len: 50 },
    { shot: 'duel4', at: 210, len: 2 * B },
    { shot: 'domain', at: 350, len: 2 * B },
    // bars 16-19 — the world
    { shot: 'story', at: 450, len: B }, { shot: 'story2', at: 390, len: B },
    { shot: 'story3', at: 90, len: B }, { shot: 'story4', at: 480, len: B },
    // bars 20-23 — the Creator
    { shot: 'boss', at: 560, len: 2 * B, zoom: { z: 1.25, cx: 0.5, cy: 0.8 } },
    { shot: 'boss', at: 140, len: B, zoom: { z: 1.25, cx: 0.5, cy: 0.8 } },
    { shot: 'boss', at: 330, len: B, zoom: { z: 1.25, cx: 0.5, cy: 0.8 } },
    // bars 24-25 — modes
    { shot: 'br', at: 548, len: B },
    { shot: 'soccer', at: 240, len: 50 }, { shot: 'duel3', at: 480, len: 50 },
    // bars 26-29 — the music drops to half time: two finishers in full
    { shot: 'finStaff', at: 40, len: 2 * B }, { shot: 'finScythe', at: 45, len: 2 * B },
    // bars 30-33 — eight impacts
    ...FIN_HITS.map(([shot, at]) => ({ shot, at, len: 50 })),
    // bars 34-35 — back to the standoff: both charge; the clip ends on the contact
    { shot: 'standoff-charge', at: 0, len: 2 * B },
    // six frames of black and silence, then the end card over the standoff
    { len: 6 },
    { shot: 'standoff', at: 120, len: 244 },
  ];
  const C = 3600, E = 3606;
  const overlays = [
    { type: 'vignette', a: 0.35 },
    { type: 'fade', from: 0, to: 30 },
    slam(306, 446, '94 CAME BEFORE YOU', 0.17, 112),
    slam(456, 596, 'NONE SURVIVED', 0.17, 112),
    slam(604, 698, 'YOU ARE THE 95TH', 0.5, 150, { fill: 'logo', glow: 'rgba(255,110,30,0.45)' }),
    { type: 'scrim', from: 700, to: 800, a: 0.74, fade: 4 },
    { type: 'logo', from: 700, to: 800, y: 0.42, size: 148 },
    slam(810, 990, '25 WEAPONS', 0.17, 130),
    tag(1004, 1048, 'HAMMER', 0.05, 0.88), tag(1054, 1098, 'SCYTHE', 0.05, 0.88),
    tag(1104, 1148, 'BOW', 0.05, 0.88), tag(1154, 1198, 'FRYING PAN', 0.05, 0.88),
    slam(1410, 1590, '15 CLASSES', 0.82, 130),
    slam(1610, 1790, '186 STORY CHAPTERS', 0.82, 112),
    slam(1810, 1990, 'EXPLORE. FIGHT. EVOLVE.', 0.82, 96),
    slam(2010, 2190, 'FACE THE CREATOR', 0.17, 122),
    tag(2406, 2496, 'BATTLE ROYALE', 0.05, 0.88),
    slam(2506, 2596, 'PLAY WITH FRIENDS', 0.82, 112),
    slam(2610, 2790, ['EVERY WEAPON HAS', 'ITS OWN FINISHER'], 0.78, 92),
    slam(3004, 3098, 'FIGHT.', 0.82, 150, { bar: false }),
    slam(3104, 3198, 'EVOLVE.', 0.82, 150, { bar: false }),
    slam(3204, 3298, 'SURVIVE.', 0.82, 150, { bar: false }),
    slam(3304, 3398, 'BE THE 95TH.', 0.82, 150, { bar: false, fill: 'logo' }),
    ingame(C),
    ...endCard(E, 244),
    { type: 'fade', from: E + 224, to: E + 244, out: true },
  ];
  return { name: 'stickman-evolution-trailer-main-1080p60', profile: 'land', W: 1920, H: 1080, segs, overlays,
    music: { file: BOSS, from: 0, at: 2 * B / 60, end: C / 60, fadeIn: 1.2, fadeOut: 0.03, gain: 1.0 },
    stingers: [{ k: 'stingLow', at: 0, g: 1.2 }, { k: 'stingImpact', at: 700, g: 1.3 }, { k: 'stingRise', at: 2950, g: 1.0 },
      { k: 'jump', at: 3520, g: 1.4 }, { k: 'swingHeavy', at: 3570, g: 1.2 },
      { k: 'stingImpact', at: E, g: 1.6 }, { k: 'explosion', at: E, g: 1.0 }, { k: 'stingLow', at: E + 4, g: 1.4 }] };
}

// ── 30-second cut ───────────────────────────────────────────────────────────
// The same frame, one shot per feature: exactly 1800 frames.
function cut30() {
  const B = 100, C = 1600, E = 1606;
  const segs = [
    { shot: 'standoff', at: 100, len: 2 * B },
    { shot: 'standoff-close', at: 0, len: B },
    { shot: 'standoff', at: 300, len: B },
    { shot: 'duel', at: 330, len: 2 * B },
    { shot: 'moves', at: 45, len: 50 }, { shot: 'moves', at: 129, len: 50 },
    { shot: 'moves4', at: 62, len: 50 }, { shot: 'moves2', at: 45, len: 50 },
    { shot: 'story', at: 450, len: B },
    { shot: 'domain', at: 380, len: B },
    { shot: 'boss', at: 560, len: 2 * B, zoom: { z: 1.25, cx: 0.5, cy: 0.8 } },
    { shot: 'br', at: 560, len: 50 }, { shot: 'soccer', at: 240, len: 50 },
    ...FIN_HITS.slice(0, 4).map(([shot, at]) => ({ shot, at, len: 50 })),
    { shot: 'standoff-charge', at: 100, len: B },
    { len: 6 },
    { shot: 'standoff', at: 120, len: 194 },
  ];
  const overlays = [
    { type: 'vignette', a: 0.35 },
    { type: 'fade', from: 0, to: 20 },
    slam(204, 298, 'YOU ARE THE 95TH', 0.5, 150, { fill: 'logo', glow: 'rgba(255,110,30,0.45)' }),
    { type: 'scrim', from: 300, to: 400, a: 0.74, fade: 4 },
    { type: 'logo', from: 300, to: 400, y: 0.42, size: 148 },
    slam(406, 596, '25 WEAPONS', 0.17, 130),
    tag(604, 648, 'HAMMER', 0.05, 0.88), tag(654, 698, 'SCYTHE', 0.05, 0.88),
    tag(704, 748, 'BOW', 0.05, 0.88), tag(754, 798, 'FRYING PAN', 0.05, 0.88),
    slam(806, 896, '186 STORY CHAPTERS', 0.82, 112),
    slam(906, 996, '15 CLASSES', 0.82, 130),
    slam(1006, 1196, 'FACE THE CREATOR', 0.17, 122),
    slam(1206, 1296, 'PLAY WITH FRIENDS', 0.82, 112),
    slam(1304, 1398, 'FIGHT.', 0.82, 150, { bar: false }),
    slam(1404, 1498, 'EVOLVE.', 0.82, 150, { bar: false }),
    ingame(C),
    ...endCard(E, 194, { ctaAt: 18 }),
    { type: 'fade', from: E + 178, to: E + 194, out: true },
  ];
  return { name: 'stickman-evolution-trailer-30s-1080p60', profile: 'land', W: 1920, H: 1080, segs, overlays,
    music: { file: BOSS, from: 16 * 240 / 144, end: C / 60, fadeIn: 0.6, fadeOut: 0.03, gain: 1.0 },
    stingers: [{ k: 'stingLow', at: 0, g: 1.2 }, { k: 'stingImpact', at: 300, g: 1.3 },
      { k: 'jump', at: 1520, g: 1.4 }, { k: 'swingHeavy', at: 1570, g: 1.2 },
      { k: 'stingImpact', at: E, g: 1.6 }, { k: 'explosion', at: E, g: 1.0 }, { k: 'stingLow', at: E + 4, g: 1.4 }] };
}

// ── Shorts, 1080x1920 ───────────────────────────────────────────────────────
// Captions stay between 12% and 70% of the height: clear of the Shorts title
// bar at the top and the channel/caption/button stack at the bottom and right.
const VZ = { z: 1.35, cx: 0.5, cy: 0.92 };   // punch in on the fighters; also crops the game's own (clipped) banner
function vEnd(t0, len) {
  return [
    { type: 'scrim', from: t0, to: t0 + len, a: 0.82, fade: 6 },
    { type: 'logo', from: t0, to: t0 + len, y: 0.3, size: 128, lines: ['STICKMAN', 'EVOLUTION'], cta: 'PLAY FREE IN BROWSER', ctaSize: 58, url: URL, ctaAt: 18 },
    { type: 'fade', from: t0 + len - 14, to: t0 + len, out: true },
  ];
}

function shortFinishers() {
  const B = 96, list = [['finKatana', 'KATANA', 34], ['finStaff', 'ELECTRIC STAFF', 34], ['finHammer', 'HAMMER', 34],
    ['finScythe', 'SCYTHE', 36], ['finAnchor', 'ANCHOR', 30], ['finFists', 'COMBAT', 34]];
  const segs = list.map(([shot, , at]) => ({ shot, at, len: 2 * B, zoom: VZ }));
  const E = segs.length * 2 * B;
  segs.push({ shot: 'duel', at: 220, len: 180, zoom: VZ });
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(4, 2 * B - 6, ['EVERY WEAPON', 'HAS ITS OWN', 'FINISHER'], 0.2, 104, { bar: false }),
    ...list.map(([, name], i) => tag(i * 2 * B + 6, (i + 1) * 2 * B - 4, name, 0.07, i === 0 ? 0.4 : 0.2, { size: 66 })),
    ingame(E, true),
    ...vEnd(E, 180),
  ];
  return { name: 'short-1-finishers-1080x1920', profile: 'vert', W: 1080, H: 1920, segs, overlays,
    music: { file: BR, from: 4 * 1.6, fadeOut: 2.0, gain: 1.0, fadeIn: 0.2 },
    stingers: [{ k: 'stingImpact', at: E, g: 1.6 }, { k: 'explosion', at: E, g: 1.0 }] };
}

function shortBoss() {
  const B = 100, E = 6 * B;
  const segs = [
    { shot: 'boss', at: 120, len: 2 * B, zoom: VZ },
    { shot: 'boss', at: 320, len: 2 * B, zoom: VZ },
    { shot: 'boss', at: 520, len: 2 * B, zoom: VZ },
    { shot: 'duel', at: 220, len: 190, zoom: VZ },
  ];
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(4, 196, ['CAN YOU BEAT', 'THE CREATOR?'], 0.2, 112, { bar: false }),
    slam(206, 396, ['3-PHASE', 'BOSS FIGHT'], 0.2, 112, { bar: false }),
    slam(406, 596, ['IT HITS', 'BACK'], 0.2, 124, { bar: false }),
    ingame(E, true),
    ...vEnd(E, 190),
  ];
  return { name: 'short-2-boss-1080x1920', profile: 'vert', W: 1080, H: 1920, segs, overlays,
    music: { file: BOSS, from: 16 * 240 / 144, fadeOut: 2.0, gain: 1.0, fadeIn: 0.2 },
    stingers: [{ k: 'stingLow', at: 0, g: 1.2 }, { k: 'stingImpact', at: E, g: 1.6 }, { k: 'explosion', at: E, g: 1.0 }] };
}

function shortWeapons() {
  const B = 96;
  const casts = [['moves', 39, 'HAMMER'], ['moves', 123, 'SCYTHE'], ['moves', 207, 'ELECTRIC STAFF'], ['moves', 275, 'KATANA'],
    ['moves2', 39, 'FRYING PAN'], ['moves2', 123, 'WHIP'], ['moves2', 199, 'GLASS BLADE'], ['moves2', 283, 'FLAIL'],
    ['moves3', 39, 'AXE'], ['moves3', 123, 'SPEAR'], ['moves3', 207, 'ANCHOR'], ['moves3', 297, 'FLAMETHROWER']];
  const segs = [{ shot: 'duel', at: 215, len: B, zoom: VZ }];
  casts.forEach(([shot, at]) => segs.push({ shot, at: at + 4, len: 48, zoom: VZ }));
  segs.push({ shot: 'duel2', at: 300, len: 2 * B, zoom: VZ });
  const E = B + 12 * 48 + 2 * B;
  segs.push({ shot: 'duel', at: 330, len: 180, zoom: VZ });
  const overlays = [
    { type: 'vignette', a: 0.3 },
    slam(4, B - 4, ['25', 'WEAPONS'], 0.2, 150, { bar: false }),
    ...casts.map(([, , name], i) => tag(B + i * 48 + 2, B + (i + 1) * 48 - 2, name, 0.07, 0.2, { size: 70 })),
    slam(B + 12 * 48 + 6, E - 4, ['PICK', 'YOURS'], 0.2, 150, { bar: false, fill: 'logo' }),
    ingame(E, true),
    ...vEnd(E, 180),
  ];
  return { name: 'short-3-weapons-1080x1920', profile: 'vert', W: 1080, H: 1920, segs, overlays,
    music: { file: BR, from: 16 * 1.6, fadeOut: 2.0, gain: 1.0, fadeIn: 0.15 },
    stingers: [{ k: 'stingImpact', at: E, g: 1.6 }, { k: 'explosion', at: E, g: 1.0 }] };
}

module.exports = { main, cut30, shortFinishers, shortBoss, shortWeapons };
