#!/usr/bin/env node
'use strict';
// tools/dev/where.js — where is a global defined, and who loads before it?
//
//   node tools/dev/where.js dealDamage
//   node tools/dev/where.js SovereignMK2 --refs     # also list every referencing file
//
// Load position comes from the <script> order in index.html. A reference from a file
// loaded EARLIER than the definition is only safe inside a function that runs after
// load; at top level it is undefined (CLAUDE.md rule 3).

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const name = process.argv[2];
const showRefs = process.argv.includes('--refs');
if (!name || name.startsWith('--')) {
  console.log('usage: node tools/dev/where.js <globalName> [--refs]');
  process.exit(1);
}

const html  = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const order = [...html.matchAll(/<script[^>]+src=["']([^"'?]+)/g)].map(m => m[1].replace(/^\.\//, '')).filter(s => s.startsWith('js/'));
const pos   = new Map(order.map((f, i) => [f, i + 1]));

const esc   = name.replace(/[$]/g, '\\$');
const defRe = new RegExp(
  `^\\s*(?:async\\s+)?(?:function\\s*\\*?\\s*${esc}\\s*\\(|(?:const|let|var|class)\\s+${esc}\\b|window\\.${esc}\\s*=(?!=))`, 'm');
const refRe = new RegExp(`(?<![\\w$.])${esc}(?![\\w$])`);

const defs = [], refs = [];
for (const f of order) {
  let src;
  try { src = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { continue; }
  const lines = src.split('\n');
  let defLine = 0;
  const m = src.match(defRe);
  if (m) defLine = src.slice(0, m.index + m[0].search(/\S/)).split('\n').length;
  if (defLine) defs.push({ f, line: defLine, text: lines[defLine - 1].trim() });
  else if (refRe.test(src)) refs.push(f);
}

if (!defs.length) {
  console.log(`No top-level definition of "${name}" found in any loaded script.`);
} else {
  console.log(`"${name}" is defined in:`);
  for (const d of defs) console.log(`  #${pos.get(d.f)}  ${d.f}:${d.line}   ${d.text.slice(0, 100)}`);
  if (defs.length > 1) console.log('  (more than one definition: the LAST loaded wins for function declarations)');
}

const firstDef = defs.length ? pos.get(defs[0].f) : Infinity;
const early = refs.filter(f => pos.get(f) < firstDef);
console.log(`\nReferenced by ${refs.length} other loaded file(s).`);
if (early.length && defs.length) {
  console.log(`Loaded BEFORE the definition (safe only inside functions called after load):`);
  for (const f of early) console.log(`  #${pos.get(f)}  ${f}`);
}
if (showRefs) for (const f of refs) console.log(`  #${pos.get(f)}  ${f}`);
