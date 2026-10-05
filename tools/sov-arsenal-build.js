'use strict';
/*
 * tools/sov-arsenal-build.js — WRITE js/smb-sov-arsenal.js. DEV ONLY.
 *
 * The kit half of Sovereign's innate knowledge (js/smb-sov-memory.js is the
 * mechanics half). tools/sov-discover.js runs independent lineages in which he
 * picks any melee weapon and class and learns from his own per-life results;
 * this merges those lineages' arsenal records and writes them out as a plain
 * script, so a real match opens with what the lab concluded instead of an empty
 * record and 260 untried kits.
 *
 * Every option is scaled down to at most CAP lives (mean and spread preserved),
 * so a few matches against a real opponent can outvote the lab. Only the
 * buckets _pickOpenLoadout reads are kept: 'any' and 'ow:<opponent weapon>'.
 *
 * Re-run after any balance change, from a fresh discovery run:
 *   node tools/sov-discover.js --lineages=5 --matches=1000
 *   node tools/sov-arsenal-build.js data/discover/<stamp> [--cap=20]
 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return [m[1], m[2] === undefined ? true : m[2]];
}));
// One or more runs: an ordinary discovery run and a --pairs run are merged, so
// the marginal tables and the weapon x class table come from all of it.
const dirs = process.argv.slice(2).filter(a => !a.startsWith('--'));
const dir = dirs[0];
if (!dir) { console.error('usage: node tools/sov-arsenal-build.js data/discover/<stamp> [more stamps] [--cap=20]'); process.exit(1); }
const CAP = parseFloat(args.cap) || 20;
const OUT = path.join(ROOT, 'js', 'smb-sov-arsenal.js');

const files = [];
for (const d of dirs) for (const f of fs.readdirSync(d)) if (/^lineage-\d+\.json$/.test(f)) files.push(path.join(d, f));
if (!files.length) { console.error('no lineage-*.json in ' + dirs.join(', ')); process.exit(1); }
const merged = {};
let matches = 0;
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  matches += d.matches || 0;
  for (const [bk, b] of Object.entries(d.arsenal || {})) {
    if (bk !== 'any' && !bk.startsWith('ow:')) continue;
    const dst = merged[bk] || (merged[bk] = { weapon: {}, cls: {}, combo: {} });
    for (const field of ['weapon', 'cls', 'combo']) {
      for (const [k, c] of Object.entries(b[field] || {})) {
        const e = dst[field][k] || (dst[field][k] = { n: 0, r: 0, r2: 0 });
        e.n += c.n || 0; e.r += c.r || 0; e.r2 += c.r2 || 0;
      }
    }
  }
}
// Pairs are kept for 'any' only: split again by opponent weapon they average
// about two lives a cell, which is noise the picker would read as signal.
for (const [bk, b] of Object.entries(merged)) if (bk !== 'any') delete b.combo;
const round = v => Math.round(v * 1000) / 1000;
for (const b of Object.values(merged)) {
  for (const field of ['weapon', 'cls', 'combo']) {
    for (const [k, e] of Object.entries(b[field] || {})) {
      if (!(e.n > 0)) { delete b[field][k]; continue; }
      const s = Math.min(1, CAP / e.n);
      b[field][k] = { n: round(e.n * s), r: round(e.r * s), r2: round(e.r2 * s) };
    }
  }
}

const rank = tbl => Object.entries(tbl).map(([k, e]) => [k, e.r / e.n]).sort((a, b) => b[1] - a[1]);
const any = merged.any || { weapon: {}, cls: {} };
const top = (tbl, n) => rank(tbl).slice(0, n).map(([k, m]) => `${k} ${m >= 0 ? '+' : ''}${m.toFixed(0)}`).join(', ');
const built = new Date().toISOString().slice(0, 10);
const header = `// ============================================================
// SOVEREIGN — INNATE ARSENAL. GENERATED; DO NOT EDIT BY HAND.
// ============================================================
// Regenerate with: node tools/sov-arsenal-build.js data/discover/<stamp>
//
// Which kits he already knows are strong before this machine ever runs him:
// the per-life results of ${files.length} independent discovery lineages (${matches} lab
// matches, ${dirs.map(d => path.basename(d)).join(' + ')}), each option scaled to at most ${CAP} lives.
// combo: the same per-life results filed by weapon|class, which is how
// _pickOpenLoadout chooses the class FOR the weapon it picked.
// SovereignMK2._pickOpenLoadout adds it under his local arsenal record every
// match and never writes it back, so his results against YOU outvote it.
//
// Built ${built}. Net damage per 1000 frames, all opponents:
//   weapons: ${top(any.weapon, 6)}
//   classes: ${top(any.cls, 6)}
`;
fs.writeFileSync(OUT, header + '\nconst SOV_ARSENAL = ' +
  JSON.stringify({ built, matches, lineages: files.length, cap: CAP, source: dirs.map(d => path.basename(d)).join('+'), arsenal: merged }) + ';\n');
console.log(`[arsenal] wrote ${path.relative(ROOT, OUT)} — ${Object.keys(merged).length} buckets from ${files.length} lineages`);
console.log('  weapons:', top(any.weapon, 8));
console.log('  classes:', top(any.cls, 8));
