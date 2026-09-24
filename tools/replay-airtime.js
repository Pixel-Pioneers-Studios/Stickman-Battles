'use strict';
/*
 * tools/replay-airtime.js — how much of a fight happens in the air. DEV ONLY.
 *
 *   node tools/replay-airtime.js <file.smbreplay> [...]
 *
 * Reads the per-sample onGround flag (`g`). Damage is bucketed by the victim's
 * state BEFORE the hit, because the hit itself usually launches them. HP drops
 * between samples (every 3rd frame) stand in for hits, so damage is approximate.
 *
 * Reference, 5 human-vs-Sovereign replays Jul 28 - Sep 21 2026 (before landing
 * lag / ground-only shield / fast-fall): each fighter airborne 63-73%, both
 * grounded together 11-14%, both airborne 46-54%.
 */
const fs = require('fs');

for (const file of process.argv.slice(2)) {
  const r = JSON.parse(fs.readFileSync(file, 'utf8'));
  const fr = r.frames.filter(Boolean);
  const names = r.meta.players.map(p => p.name);
  const S = names.map(() => ({ alive: 0, air: 0, dmgAir: 0, dmgGnd: 0 }));
  let bothAir = 0, bothGnd = 0, joint = 0;
  for (let i = 1; i < fr.length; i++) {
    const a = fr[i], b = fr[i - 1];
    const live = a.map(p => p && p.hp > 0 && !p.rag);
    if (names.length === 2 && live.every(Boolean)) {
      joint++;
      if (!a[0].g && !a[1].g) bothAir++; else if (a[0].g && a[1].g) bothGnd++;
    }
    a.forEach((p, k) => {
      if (!live[k]) return;
      const s = S[k], q = b[k];
      s.alive++;
      if (!p.g) s.air++;
      if (q && q.hp > p.hp && q.hp - p.hp < 80 && p.lives === q.lives) {
        if (q.g) s.dmgGnd += q.hp - p.hp; else s.dmgAir += q.hp - p.hp;
      }
    });
  }
  const pct = (n, d) => (100 * n / Math.max(1, d)).toFixed(0) + '%';
  console.log(`\n${file.split('/').pop()}  ${r.meta.durationSec}s` +
    (joint ? `  both grounded ${pct(bothGnd, joint)}  both airborne ${pct(bothAir, joint)}` : ''));
  S.forEach((s, k) => console.log(`  ${names[k].padEnd(12)} airborne ${pct(s.air, s.alive)}` +
    `  damage taken grounded/airborne ${Math.round(s.dmgGnd)}/${Math.round(s.dmgAir)}`));
}
