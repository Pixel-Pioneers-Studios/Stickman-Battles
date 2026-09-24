'use strict';
/*
 * tools/proxy-stats.js — shared stats extractor for human-vs-Sovereign matches.
 *
 * Used on BOTH real .smbreplay files and simulated matches (via _runMatch's
 * recorder, see js/smb-smk2-training.js `opts.record`) so a proxy's outcome
 * statistics can be compared against a human's on identical ground.
 *
 * Input shape (both replays and sim recordings use this):
 *   frames: array, sampled every `recordEveryN` real frames. frames[i] is
 *           either null (no data that sample) or [f0, f1] where each f is
 *           { x, y, vx, vy, hp, mhp, atk, sh, lives, g, stn, rag, inv, el }
 *   events: array of { t: 'dmg'|'ko'|'stock'|'respawn', fi, fc, p, v, hp, ... }
 *           fi = sample index (float), fc = real frame count, p = player index
 *   recordEveryN: real frames per sample (usually 3)
 *   meIdx / oppIdx: which of the two indices is "me" (usually the human/proxy)
 *                   and which is Sovereign, for directional stats.
 *
 * Output: damage/1000 live frames each way, lockout%, airborne% each, both-
 * grounded%, mean distance, hits/opening each way, kills each way, seconds.
 */

const GAP_FRAMES = 60; // an "opening" ends when the next hit on the same target is >60 real frames later

// Distance bands, matching tools/ghost-core.js exactly so exposure numbers
// are comparable across the ghost/proxy/human lineage (see ghost-test.js's
// "1b. EXPOSURE" table — d0 <45px ... d6 >400px; g ground, a air).
const D_EDGES = [45, 80, 120, 170, 260, 400];
function dBin(d) { let i = 0; while (i < D_EDGES.length && d >= D_EDGES[i]) i++; return i; }

function isLive(f) {
  if (!f) return false;
  if ((f.hp || 0) <= 0) return false;
  if (f.hp === 1 && (f.inv || 0) > 500) return false; // finisher lock
  return true;
}

function extractStats(rec, meIdx, oppIdx) {
  const frames = rec.frames || [];
  const events = Array.isArray(rec.events) ? rec.events : [];
  const N = frames.length;

  let liveN = 0, bothGround = 0, meAir = 0, oppAir = 0, lockN = 0, distSum = 0, distN = 0;
  // Exposure: where "me" (the human/proxy) spends time and gets hit — banded
  // by distance x own ground/air state. Hit detection is consecutive-sample
  // hp drop (same method as ghost-core.js `stats()`), not the event log, so
  // it lines up with the per-sample time-share denominator.
  const exposure = {}; // key = band + 'g'|'a' -> { n, hits }
  for (let i = 0; i < N; i++) {
    const fr = frames[i]; if (!fr) continue;
    const me = fr[meIdx], op = fr[oppIdx];
    if (!isLive(me) || !isLive(op)) continue;
    liveN++;
    if (!me.g) meAir++;
    if (!op.g) oppAir++;
    if (me.g && op.g) bothGround++;
    if ((me.stn > 0 || me.rag > 0) || (op.stn > 0 || op.rag > 0)) lockN++;
    const dist = Math.abs(op.x - me.x);
    distSum += dist; distN++;
    const prevFr = i > 0 ? frames[i - 1] : null;
    const prevMe = prevFr ? prevFr[meIdx] : null;
    if (prevMe && isLive(prevMe)) {
      const key = dBin(dist) + (me.g ? 'g' : 'a');
      const c = exposure[key] || (exposure[key] = { n: 0, hits: 0 });
      c.n++;
      if (me.hp < prevMe.hp) c.hits++;
    }
  }

  // Damage + kills from events, directional by which player index was hit.
  let dmgToMe = 0, dmgToOpp = 0, killsMe = 0, killsOpp = 0;
  const hitsOnMe = [], hitsOnOpp = []; // sorted fc of hits taken by that side
  for (const e of events) {
    if (e.t === 'dmg') {
      if (e.p === meIdx) { dmgToMe += e.v; hitsOnMe.push(e.fc); }
      else if (e.p === oppIdx) { dmgToOpp += e.v; hitsOnOpp.push(e.fc); }
    } else if (e.t === 'ko') {
      if (e.p === meIdx) killsMe++;
      else if (e.p === oppIdx) killsOpp++;
    }
  }
  const openings = hits => {
    if (!hits.length) return { chains: 0, hits: 0 };
    let chains = 1;
    for (let i = 1; i < hits.length; i++) if (hits[i] - hits[i - 1] > GAP_FRAMES) chains++;
    return { chains, hits: hits.length };
  };
  const openMe = openings(hitsOnMe), openOpp = openings(hitsOnOpp);

  const realFrames = N * (rec.recordEveryN || 3);
  const per1k = v => liveN > 0 ? 1000 * v / (liveN * (rec.recordEveryN || 3)) : 0;

  return {
    matchSeconds: +(realFrames / 60).toFixed(1),
    liveFrames: liveN * (rec.recordEveryN || 3),
    dmgToMePer1k: +per1k(dmgToMe).toFixed(2),
    dmgToOppPer1k: +per1k(dmgToOpp).toFixed(2),
    lockoutPct: +(100 * lockN / Math.max(1, liveN)).toFixed(1),
    meAirPct: +(100 * meAir / Math.max(1, liveN)).toFixed(1),
    oppAirPct: +(100 * oppAir / Math.max(1, liveN)).toFixed(1),
    bothGroundPct: +(100 * bothGround / Math.max(1, liveN)).toFixed(1),
    meanDist: distN ? Math.round(distSum / distN) : 0,
    hitsPerOpeningOnMe: +(openMe.hits / Math.max(1, openMe.chains)).toFixed(2),
    hitsPerOpeningOnOpp: +(openOpp.hits / Math.max(1, openOpp.chains)).toFixed(2),
    openingsOnMe: openMe.chains,
    openingsOnOpp: openOpp.chains,
    killsMe,      // times "me" (human/proxy) died
    killsOpp,     // times Sovereign died
    exposure,     // { 'Ng'|'Na': {n, hits} } for "me" — see D_EDGES/dBin above
  };
}

// Merge exposure tables from several extractStats() outputs (e.g. across replays).
function mergeExposure(list) {
  const o = {};
  for (const st of list) for (const [k, c] of Object.entries(st.exposure || {})) {
    const d = o[k] || (o[k] = { n: 0, hits: 0 });
    d.n += c.n; d.hits += c.hits;
  }
  return o;
}
function printExposure(label, exp, recordEveryN) {
  const ren = recordEveryN || 3;
  const keys = []; for (let d = 0; d <= D_EDGES.length; d++) for (const g of ['g', 'a']) keys.push(d + g);
  const tot = Object.values(exp).reduce((a, c) => a + c.n, 0) || 1;
  console.log(`  ${label.padEnd(10)}` + keys.map(k => {
    const c = exp[k] || { n: 0, hits: 0 };
    const share = (100 * c.n / tot).toFixed(0);
    const rate = c.n ? (1000 * c.hits / (c.n * ren)).toFixed(0) : '-';
    return `${share}/${rate}`.padStart(9);
  }).join(''));
}

// ── Replay file loader ──────────────────────────────────────────────────────
function statsFromReplay(filePath) {
  const fs = require('fs');
  const r = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const players = r.meta.players || [];
  const meIdx = players.findIndex(p => !p.ai);
  const oppIdx = meIdx === 0 ? 1 : 0;
  if (meIdx < 0) return null;
  if (r.meta.mode !== 'sovereign') return null;
  if (!Array.isArray(r.events)) return null; // pre-event-log replay, can't score
  const stats = extractStats({ frames: r.frames, events: r.events, recordEveryN: r.meta.recordEveryN || 3 }, meIdx, oppIdx);
  const firstFrame = r.frames.find(f => f);
  const kits = firstFrame ? [meIdx, oppIdx].map(i => `${firstFrame[i].wk}/${firstFrame[i].cls}`) : ['?', '?'];
  return { file: filePath, meta: r.meta, meIdx, oppIdx, kits, stats };
}

if (require.main === module) {
  const path = require('path');
  const glob = process.argv.slice(2);
  const files = glob.length ? glob : (() => {
    const { execSync } = require('child_process');
    const os = require('os');
    // Scoped to known replay locations (repo root/replays + Downloads/Desktop),
    // not a full home-directory walk — `find $HOME` was measured hanging/timing
    // out (20s+, sometimes 0 results) once cloud-synced folders are in the mix.
    const roots = [path.resolve(__dirname, '..'), path.join(os.homedir(), 'Downloads'), path.join(os.homedir(), 'Desktop')]
      .filter(p => { try { return require('fs').statSync(p).isDirectory(); } catch (e) { return false; } });
    let out = '';
    try { out = execSync(`find ${roots.map(r => `"${r}"`).join(' ')} -name "*.smbreplay" 2>/dev/null`, { maxBuffer: 1 << 24 }).toString(); }
    catch (e) { out = (e.stdout || '').toString(); }
    return out.split('\n').filter(Boolean);
  })();

  const rows = [];
  for (const f of files) {
    try {
      const r = statsFromReplay(f);
      if (r) rows.push(r);
    } catch (e) { console.error('skip', f, e.message); }
  }
  console.log(`\n${rows.length} scoreable human-vs-Sovereign replays\n`);
  const hdr = ['file', 'kits', 'sec', 'dmg->me/1k', 'dmg->sov/1k', 'lock%', 'meAir%', 'sovAir%', 'bothGnd%', 'dist', 'hits/open(me hit)', 'hits/open(sov hit)', 'sovKOs', 'meKOs'];
  console.log(hdr.join('\t'));
  for (const r of rows) {
    const kits = `${r.kits[0]} vs ${r.kits[1]}`;
    const s = r.stats;
    console.log([path.basename(r.file), kits, s.matchSeconds, s.dmgToMePer1k, s.dmgToOppPer1k, s.lockoutPct,
                 s.meAirPct, s.oppAirPct, s.bothGroundPct, s.meanDist, s.hitsPerOpeningOnMe, s.hitsPerOpeningOnOpp,
                 s.killsOpp, s.killsMe].join('\t'));
  }
  if (rows.length) {
    const mean = k => +(rows.reduce((a, r) => a + r.stats[k], 0) / rows.length).toFixed(2);
    console.log('\nMEANS across all scoreable replays (the calibration TARGET):');
    for (const k of ['dmgToMePer1k','dmgToOppPer1k','lockoutPct','meAirPct','oppAirPct','bothGroundPct','meanDist','hitsPerOpeningOnMe','hitsPerOpeningOnOpp','killsOpp','killsMe']) {
      console.log(`  ${k.padEnd(22)} ${mean(k)}`);
    }
    console.log('\nEXPOSURE (human): time share % / hits per 1000 frames there   (0 <45px ... 6 >400px; g ground, a air)');
    const keys = []; for (let d = 0; d <= D_EDGES.length; d++) for (const g of ['g', 'a']) keys.push(d + g);
    console.log('  ' + ''.padEnd(10) + keys.map(k => k.padStart(9)).join(''));
    printExposure('human', mergeExposure(rows.map(r => r.stats)));
  }
}

module.exports = { extractStats, statsFromReplay, isLive, GAP_FRAMES, D_EDGES, dBin, mergeExposure, printExposure };
