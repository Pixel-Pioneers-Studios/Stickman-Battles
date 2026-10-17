#!/usr/bin/env node
'use strict';
// tools/dev/chapter.js — find a story chapter by number or title.
//
//   node tools/dev/chapter.js 11          # YOUR chapter 11 (= registry id 10)
//   node tools/dev/chapter.js --id 10     # registry id directly
//   node tools/dev/chapter.js lava        # title search
//
// Chapter numbers people say are 1-based; registry ids are 0-based.

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const ACTS = path.join(ROOT, 'js', 'story', 'acts');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);

const chapters = [];
for (const f of walk(ACTS)) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/^\s*id:\s*(\d+),\s*title:\s*(['"`])((?:\\.|(?!\2).)*)\2/gm)) {
    const line = src.slice(0, m.index).split('\n').length + 1;
    const after = src.slice(m.index, m.index + 3000);
    const arena = (after.match(/\barena:\s*'([^']+)'/) || [])[1];
    chapters.push({ id: +m[1], title: m[3], file: path.relative(ROOT, f), line, arena });
  }
}
chapters.sort((a, b) => a.id - b.id);

const a = process.argv.slice(2);
const level = fs.existsSync(path.join(ROOT, 'js', 'story', 'levels'))
  ? new Set(fs.readdirSync(path.join(ROOT, 'js', 'story', 'levels')).map(n => +(n.match(/^ch(\d+)/) || [])[1]))
  : new Set();
const show = c => console.log(`chapter ${c.id + 1}  (id ${c.id})  "${c.title}"\n  ${c.file}:${c.line}` +
  (c.arena ? `\n  arena: ${c.arena}` : '') + `\n  authored map: ${level.has(c.id) ? 'js/story/levels/ch' + String(c.id).padStart(2, '0') + '.js' : 'no (seeded generator)'}`);

if (!a.length) { console.log(`usage: chapter.js <number> | --id <id> | <title words>   (${chapters.length} chapters)`); process.exit(1); }
let found;
if (a[0] === '--id') found = chapters.filter(c => c.id === +a[1]);
else if (/^\d+$/.test(a[0])) found = chapters.filter(c => c.id === +a[0] - 1);
else { const q = a.join(' ').toLowerCase(); found = chapters.filter(c => c.title.toLowerCase().includes(q)); }

if (!found.length) { console.log('No match.'); process.exit(1); }
found.slice(0, 15).forEach(show);
if (found.length > 15) console.log(`…and ${found.length - 15} more`);
