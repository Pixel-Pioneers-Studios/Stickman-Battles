// Collects every story line StoryVoice speaks and writes tools/voice/lines.json.
// Keys must match StoryVoice._key() in js/smb-storyvoice.js.
// Run from the repo root: node tools/voice/extract-lines.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.resolve(__dirname, '../..');

function key(speaker, text) {
  const s = (speaker || 'none') + '|' + String(text).replace(/\s+/g, ' ').trim();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// The scene's own beat parser, lifted from source so narration splits exactly as it plays.
const sceneSrc = fs.readFileSync(path.join(ROOT, 'js/smb-story-narrative-scene.js'), 'utf8');
const m = sceneSrc.match(/function _parseBeats\(lines\) \{[\s\S]*?\n  \}\n/);
if (!m) throw new Error('_parseBeats not found in smb-story-narrative-scene.js');
const parseBeats = vm.runInNewContext('(' + m[0] + ')');

function walk(d) {
  let o = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) o = o.concat(walk(p)); else if (e.name.endsWith('.js')) o.push(p);
  }
  return o;
}
const ctx = { STORY_CHAPTER_REGISTRY: [], console };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of walk(path.join(ROOT, 'js/story/acts'))) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });

const out = new Map();
function add(speaker, text) {
  if (!text || !String(text).trim()) return;
  const k = key(speaker, text);
  if (!out.has(k)) out.set(k, { key: k, speaker: speaker || 'none', text: String(text).replace(/\s+/g, ' ').trim() });
}
function addScene(lines) {
  if (!Array.isArray(lines) || !lines.length) return;
  for (const b of parseBeats(lines)) add(b.speaker, b.lines.join(' '));
}

for (const ch of ctx.STORY_CHAPTER_REGISTRY) {
  for (const c of [ch, ch.beat].filter(Boolean)) {
    const base = c.narrative || [];
    addScene(base);
    if (Array.isArray(c.sagaColdOpen)) addScene([...c.sagaColdOpen, '', ...base]);
    if (c.preText) addScene([...base, ...[].concat(c.preText)]);
    addScene(c.afterNarrative);
    for (const e of (c.fightScript || [])) if (e && e.speaker) add(e.speaker, e.text);
    for (const d of (c.dialogues || [])) if (d) add(d.speaker || 'none', d.text);
  }
}

const list = [...out.values()];
fs.writeFileSync(path.join(__dirname, 'lines.json'), JSON.stringify(list, null, 1));
const chars = list.reduce((a, l) => a + l.text.length, 0);
console.log(`${list.length} lines, ${chars} chars from ${ctx.STORY_CHAPTER_REGISTRY.length} chapters`);
