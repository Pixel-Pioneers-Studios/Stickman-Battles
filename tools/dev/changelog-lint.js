#!/usr/bin/env node
'use strict';
// tools/dev/changelog-lint.js — catch CHANGELOG lines that spoil secret content.
//
//   node tools/dev/changelog-lint.js            # check every entry
//   node tools/dev/changelog-lint.js --latest   # only the newest entry
//
// Rules (from how existing entries are gated):
//   • a change line naming a tier-N term needs spoilerLevel >= N (or a spoilerAct gate)
//   • title / flavor can't be gated at all, so any term there is an error unless the
//     whole entry has requiredProgress
// Findings are candidates: "God" in "a god-tier combo" is fine. Read before fixing.

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const src  = fs.readFileSync(path.join(ROOT, 'js', 'smb-globals.js'), 'utf8');

const TERMS = [
  { re: /\bAbsolute Axiom\b/i,          tier: 3 },
  { re: /\bfinal secret boss\b/i,       tier: 3 },
  { re: /\bGod\b/,                      tier: 2 },
  { re: /\bTrue ?Form\b/i,              tier: 2 },
  { re: /\bCosmic Axiom\b/i,            tier: 2 },
  { re: /\bParadox\b/,                  tier: 2 },
  { re: /\bninety-four\b|\b94 (?:bearers|before)\b/i, tier: 2 },
];

// Pull out `const CHANGELOG = [ ... ];` by bracket matching, then evaluate it alone.
const start = src.indexOf('const CHANGELOG = [');
if (start === -1) { console.error('CHANGELOG not found in js/smb-globals.js'); process.exit(1); }
let i = src.indexOf('[', start), depth = 0, quote = null;
for (; i < src.length; i++) {
  const c = src[i];
  if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
  if (c === '"' || c === "'" || c === '`') quote = c;
  else if (c === '/' && src[i + 1] === '/') i = src.indexOf('\n', i);
  else if (c === '[') depth++;
  else if (c === ']' && --depth === 0) break;
}
const body = src.slice(src.indexOf('[', start), i + 1);
const CHANGELOG = vm.runInNewContext('(' + body + ')');
// Source may escape quotes, so locate by the longest leading run without quote/backslash.
const lineOf = text => {
  const key = (text || '').split(/['"\\`]/)[0].slice(0, 60);
  const at = src.indexOf(key, start);
  return at === -1 ? '?' : src.slice(0, at).split('\n').length;
};

const entries = process.argv.includes('--latest') ? CHANGELOG.slice(0, 1) : CHANGELOG;
let errors = 0;
const hit = text => TERMS.filter(t => t.re.test(text || ''));

for (const e of entries) {
  if (e.requiredProgress) continue;
  for (const field of ['title', 'flavor']) {
    for (const t of hit(e[field])) {
      errors++;
      console.log(`ERROR ${e.version} ${field} (smb-globals.js:${lineOf(e[field])}) names a tier-${t.tier} term ${t.re} — ${field} can't be gated`);
    }
  }
  for (const c of e.changes || []) {
    if (c.spoilerAct) continue;
    const need = Math.max(0, ...hit(c.text).map(t => t.tier));
    if (need && (c.spoilerLevel || 0) < need) {
      errors++;
      console.log(`ERROR ${e.version} smb-globals.js:${lineOf(c.text)} needs spoilerLevel ${need} (has ${c.spoilerLevel || 'none'}): ${c.text.slice(0, 90)}…`);
    }
  }
}

const latest = CHANGELOG.filter(e => e.isLatest).length;
if (latest !== 1) { errors++; console.log(`ERROR ${latest} entries have isLatest: true (need exactly 1)`); }
const gv = (src.match(/const GAME_VERSION\s*=\s*'([^']+)'/) || [])[1];
if (gv && CHANGELOG[0].version !== gv) { errors++; console.log(`ERROR CHANGELOG[0].version ${CHANGELOG[0].version} != GAME_VERSION ${gv}`); }

console.log(errors ? `\n${errors} finding(s) across ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}.` : `Clean: ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} checked.`);
process.exit(errors ? 1 : 0);
