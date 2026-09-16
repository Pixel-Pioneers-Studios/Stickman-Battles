'use strict';
// tools/audit/check.js — mechanical invariant checks for the main game.
//
// Run from the repo root:  node tools/audit/check.js
//
// Every rule here encodes something from CLAUDE.md's failure table or a bug that
// has actually shipped. Findings are candidates, not verdicts: the load-order
// rule in particular cannot see that a reference inside a function body is fine
// when the call happens after load. Read before believing.
//
// Exit code is 1 if any ERROR-level rule fires, so this can gate CI later.

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const findings = [];

// Known and accepted. Each needs a reason, and each is still printed — the point
// is that a NEW violation of the same rule fails the run while these do not.
// Delete an entry when the underlying thing is actually fixed.
const ACCEPTED = [
  {
    rule: 'cin-in-damage', where: 'js/smb-combat.js',
    why: 'triggerFinisher() has always run inline on the killing blow. Deferring it '
       + 'to frame start would restructure the kill path for every weapon and class '
       + 'at once. The concrete symptom — the victim being knocked out of the '
       + "finisher's staging by the same hit — is handled where knockback is applied.",
  },
  {
    rule: 'no-floor', where: 'js/smb-data-arenas.js:45',
    why: 'lava arena — the hazard is the floor, by design.',
  },
  {
    rule: 'no-floor', where: 'js/smb-data-arenas.js:341',
    why: 'volcano arena — same as lava, hazard floor by design.',
  },
];

function report(level, rule, msg, where) {
  const known = ACCEPTED.find(a => a.rule === rule && a.where === where);
  findings.push(known ? { level: 'ACCEPTED', rule, msg, where, why: known.why }
                      : { level, rule, msg, where });
}

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const rel      = p => path.relative(ROOT, p).replace(/\\/g, '/');
const jsFiles  = walk(path.join(ROOT, 'js'));
const html     = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const srcOf    = new Map(jsFiles.map(f => [rel(f), fs.readFileSync(f, 'utf8')]));

// Ordered list of script srcs as index.html loads them, normalised to repo-root
// relative paths — the tags are written './js/...'.
const loadOrder = [...html.matchAll(/<script[^>]+src="([^"?]+)[^"]*"/g)]
  .map(m => m[1].replace(/^\.\//, ''));

// ── 0. Syntax ────────────────────────────────────────────────────────────────
// Parsed in-process rather than by spawning `node --check` 180 times. This is
// the whole tree, not the seven files package.json's build step covers.
{
  const vm = require('vm');
  for (const [f, src] of srcOf) {
    try { new vm.Script(src, { filename: f }); }
    catch (e) { report('ERROR', 'syntax', e.message.split('\n')[0], f); }
  }
}

// ── 1. Script tag coverage ───────────────────────────────────────────────────
// A js/ file with no tag is dead weight; a tag with no file is a 404 that
// silently removes every global the file was meant to define.
{
  const tagged = new Set(loadOrder);
  for (const f of srcOf.keys()) {
    if (!tagged.has(f)) report('ERROR', 'untagged-file', 'no <script> tag in index.html', f);
  }
  for (const src of loadOrder) {
    if (!src.startsWith('js/')) continue;
    if (!fs.existsSync(path.join(ROOT, src))) {
      report('ERROR', 'missing-file', 'script tag points at a file that does not exist', src);
    }
  }
}

// ── 2. ES module syntax ──────────────────────────────────────────────────────
// One import/export breaks every file loaded after it — the game goes silent.
for (const [f, src] of srcOf) {
  const m = src.match(/^\s*(import|export)\s+[^(]/m);
  if (m) report('ERROR', 'es-module', `'${m[1]}' statement in a globals-based file`, f);
}

// ── 3. Damage must route through dealDamage() ────────────────────────────────
// Direct mutation skips multipliers, shields, online sync, hit-stop, achievements.
// `this.health` (self-regen) and destructible props that merely borrow the field
// name are not fighters, so they are not the failure this rule is about.
const NOT_A_FIGHTER = /^(this|box|crate|chest|barrel|prop|node|rift|core|door|gate)$/i;
for (const [f, src] of srcOf) {
  if (f === 'js/smb-combat.js') continue;
  src.split('\n').forEach((line, i) => {
    if (/^\s*(\/\/|\*)/.test(line)) return;
    const m = line.match(/\b([A-Za-z_$][\w$]*)\.health\s*(?:-=|\+=)/);
    if (m && !NOT_A_FIGHTER.test(m[1])) {
      report('WARN', 'direct-health', `${m[1]}.health mutated outside dealDamage()`, `${f}:${i + 1}`);
    }
  });
}

// ── 4. Cinematics must not be triggered inside dealDamage() ──────────────────
{
  const src = srcOf.get('js/smb-combat.js') || '';
  const start = src.indexOf('function dealDamage');
  if (start !== -1) {
    // Crude brace match is enough — dealDamage is top-level.
    let depth = 0, end = start;
    for (let i = src.indexOf('{', start); i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}' && --depth === 0) { end = i; break; }
    }
    const body = src.slice(start, end);
    const m = body.match(/\b(startBoss\w*Cinematic|triggerFinisher|startTFEnding|cinScript)\s*\(/);
    if (m) report('ERROR', 'cin-in-damage', `${m[1]}() called inside dealDamage()`, 'js/smb-combat.js');
  }
}

// ── 5. Story registry ids contiguous ─────────────────────────────────────────
{
  const ids = [];
  for (const f of walk(path.join(ROOT, 'js', 'story', 'acts'))) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/^\s*id:\s*(\d+),/gm)) ids.push(+m[1]);
  }
  ids.sort((a, b) => a - b);
  const dup = [...new Set(ids.filter((v, i) => ids[i + 1] === v))];
  if (dup.length) report('ERROR', 'story-dup-id', `duplicate chapter ids: ${dup.join(', ')}`, 'js/story/acts');
  for (let i = 0; i <= (ids.at(-1) ?? -1); i++) {
    if (!ids.includes(i)) report('ERROR', 'story-gap', `no chapter with id ${i}`, 'js/story/acts');
  }
}

// ── 6. Arena platform sets need a floor ──────────────────────────────────────
// pickSafeSpawn() returns null without one, which crashes on respawn.
// Bracket-walked rather than regex-capped: platform arrays run long, and a fixed
// character budget truncates before reaching the floor entry at the bottom.
for (const [f, src] of srcOf) {
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/platforms\s*:\s*\[/.test(lines[i])) continue;
    let depth = 0, j = i;
    const body = [];
    for (; j < lines.length; j++) {
      for (const c of lines[j]) { if (c === '[') depth++; else if (c === ']') depth--; }
      body.push(lines[j]);
      if (depth <= 0 && j > i) break;
    }
    const txt = body.join('\n');
    // A lava/void arena can legitimately have no solid floor — the hazard is the
    // floor — so this stays a warning to read, not an error to fix blindly.
    if (/\{/.test(txt) && !/isFloor\s*:\s*true/.test(txt)) {
      report('WARN', 'no-floor', 'platforms array with no isFloor:true entry', `${f}:${i + 1}`);
    }
    i = j;
  }
}

// ── 7. Cache-bust tags ───────────────────────────────────────────────────────
// A changed file served under its old ?v= keeps stale JS in players' caches.
{
  const untagged = loadOrder.filter(s => s.startsWith('js/') &&
    !new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\?v=').test(html.replace(/\.\//g, '')));
  for (const s of untagged) report('WARN', 'no-cachebust', 'script tag has no ?v= suffix', s);
}

// ── 8. GAME_VERSION must match CHANGELOG[0] ──────────────────────────────────
{
  const g = srcOf.get('js/smb-globals.js') || '';
  const gv = (g.match(/GAME_VERSION\s*=\s*'([\d.]+)'/) || [])[1];
  const cv = (g.match(/const CHANGELOG = \[\s*\{\s*version:\s*'([\d.]+)'/) || [])[1];
  const latest = (g.match(/isLatest:\s*true/g) || []).length;
  if (gv && cv && gv !== cv) {
    report('ERROR', 'version-mismatch', `GAME_VERSION ${gv} but CHANGELOG[0] is ${cv}`, 'js/smb-globals.js');
  }
  if (latest !== 1) {
    report('ERROR', 'latest-count', `${latest} changelog entries marked isLatest (expected 1)`, 'js/smb-globals.js');
  }
}

// ── 9. Load order: top-level globals referenced before they are defined ──────
// The one hard architectural rule. Definitions are collected per file from
// top-level declarations; references are counted only outside function bodies,
// since anything inside one runs after the whole page has loaded.
{
  const declRe = /^(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)|class\s+([A-Za-z_$][\w$]*))/gm;
  const definedIn = new Map();               // symbol -> first load index
  const order = loadOrder.filter(s => s.startsWith('js/'));

  order.forEach((src, idx) => {
    const code = srcOf.get(src);
    if (!code) return;
    for (const m of code.matchAll(declRe)) {
      const name = m[1] || m[2] || m[3];
      if (name && !definedIn.has(name)) definedIn.set(name, idx);
    }
  });

  // Strip function bodies so only genuinely top-level (load-time) code remains.
  function topLevelOnly(code) {
    let out = '', depth = 0;
    for (let i = 0; i < code.length; i++) {
      const c = code[i];
      if (c === '{') { depth++; continue; }
      if (c === '}') { if (depth > 0) depth--; continue; }
      if (depth === 0) out += c;
    }
    return out;
  }

  order.forEach((src, idx) => {
    const code = srcOf.get(src);
    if (!code) return;
    // Strings go too — help text and console banners name globals in prose and
    // would otherwise read as load-time calls.
    const stripped = code
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/`(?:\\.|[^`\\])*`/g, '``')
      .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
      .replace(/"(?:\\.|[^"\\\n])*"/g, '""');
    const top = topLevelOnly(stripped);
    for (const m of top.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = m[1];
      const at = definedIn.get(name);
      if (at !== undefined && at > idx) {
        report('WARN', 'load-order',
          `calls ${name}() at load time, but it is defined in ${order[at]} (loaded later)`, src);
      }
    }
  });
}

// ── 10. Authored keys must exist ─────────────────────────────────────────────
// classKey/weaponKey/arena are looked up by string. applyClass() bails silently
// on an unknown key, so a typo does not throw — the enemy just spawns with no
// class at all. 'tank' and 'assassin' shipped this way across 104 sites.
{
  // Depth-1 property names of a top-level object literal, brace-walked.
  function topKeys(src, declRe) {
    const m = src.match(declRe);
    if (!m) return null;
    const open = src.indexOf('{', m.index);
    if (open === -1) return null;
    const keys = new Set();
    let depth = 0;
    for (let i = open; i < src.length; i++) {
      const c = src[i];
      if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') { depth--; if (depth === 0) break; }
      else if (depth === 1 && /[A-Za-z_$]/.test(c)) {
        const rest = src.slice(i);
        const k = rest.match(/^([A-Za-z_$][\w$]*)\s*:/);
        if (k) { keys.add(k[1]); i += k[1].length; }
      }
    }
    return keys.size ? keys : null;
  }

  const dataW = srcOf.get('js/smb-data-weapons.js') || '';
  const dataA = srcOf.get('js/smb-data-arenas.js')  || '';
  const known = {
    classKey:  topKeys(dataW, /const\s+CLASSES\s*=/),
    weaponKey: topKeys(dataW, /const\s+WEAPONS\s*=/),
    arena:     topKeys(dataA, /const\s+ARENAS\s*=/),
  };

  for (const [field, valid] of Object.entries(known)) {
    if (!valid) continue;
    for (const [f, src] of srcOf) {
      // The definition files themselves, and the menus that enumerate options.
      if (f === 'js/smb-data-weapons.js' || f === 'js/smb-data-arenas.js') continue;
      src.split('\n').forEach((line, i) => {
        const m = line.match(new RegExp(field + "\\s*:\\s*'([a-zA-Z_$][\\w$]*)'"));
        if (!m) return;
        const key = m[1];
        if (key === 'none' || key === 'random' || valid.has(key)) return;
        report('ERROR', 'unknown-key',
          `${field}: '${key}' is not defined in ${field === 'arena' ? 'ARENAS' : field === 'classKey' ? 'CLASSES' : 'WEAPONS'}`,
          `${f}:${i + 1}`);
      });
    }
  }
}

// ── 11. applyClass() overwrites an authored health ───────────────────────────
// applyClass() assigns maxHealth and health from the class table unconditionally.
// A spawn that sets a deliberate per-entity health first and never restores it
// afterwards silently gets the class default instead — the entity is a different
// fighter than the one that was authored, and nothing throws.
{
  const LOOK_BACK    = 16;   // spawn blocks set health well above the applyClass line
  const LOOK_FORWARD = 6;    // a restore, if there is one, follows immediately

  for (const [f, src] of srcOf) {
    if (f === 'js/smb-enemies-class.js') continue;
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      const call = line.match(/\bapplyClass\s*\(\s*([A-Za-z_$][\w$]*)\s*,/);
      if (!call) return;
      const v    = call[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const setRe = new RegExp(`\\b${v}\\.(?:max)?[Hh]ealth\\s*=[^=]`);

      const before = lines.slice(Math.max(0, i - LOOK_BACK), i).some(l => setRe.test(l));
      if (!before) return;
      const after = lines.slice(i + 1, i + 1 + LOOK_FORWARD).some(l => setRe.test(l));
      if (after) return;

      report('ERROR', 'class-clobbers-health',
        `${call[1]}.health is set before applyClass() and never restored — the class default wins`,
        `${f}:${i + 1}`);
    });
  }
}

// ── Story scene spec coverage ────────────────────────────────────────────────
// A chapter with narrative text but no scene spec plays as bare captions with no
// staging; a spec whose chapter id no longer exists is dead weight that also
// signals a renumber went through without the specs following it. The second
// case has actually shipped — commit cee0148 existed to realign STORY_SCENE_SPECS
// with the chapters they were authored for after ids moved underneath them.
//
// Specs live in js/story/scenes/<act>.js, chapters in js/story/acts/<act>/*.js.
{
  const chapterIds  = new Set();
  const narrativeOf = new Map();   // id -> act dir, for chapters carrying narrative

  for (const [f, src] of srcOf) {
    const m = f.match(/^js\/story\/acts\/([^/]+)\//);
    if (!m) continue;
    const act = m[1];
    // Chapters are object literals pushed into the registry. Anchor on the `id:`
    // LINE, not on `{ id:` adjacency — many chapters open with comment lines
    // between the brace and the id, and matching the brace form silently misses
    // them (it reported ch106 and ch117 as having no chapter at all). This is the
    // same line-anchored form as the registry contiguity scan in CLAUDE.md.
    const idLine = /^[ \t]*id:\s*(\d+),/gm;
    const hits = [...src.matchAll(idLine)];
    hits.forEach((h, k) => {
      const id  = +h[1];
      const blk = src.slice(h.index, k + 1 < hits.length ? hits[k + 1].index : src.length);
      chapterIds.add(id);
      if (/^[ \t]*narrative:\s*\[/m.test(blk)) narrativeOf.set(id, act);
    });
  }

  const specOf = new Map();        // id -> file that defines it
  for (const [f, src] of srcOf) {
    if (!/^js\/story\/scenes\//.test(f)) continue;
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      const sm = line.match(/^\s*S\[(\d+)\]\s*=/);
      if (sm) specOf.set(+sm[1], `${f}:${i + 1}`);
    });
  }

  // The rule is only meaningful once both tables have been found. If a future
  // reorganisation moves either one, say so rather than silently passing.
  if (!chapterIds.size || !specOf.size) {
    report('WARN', 'scene-coverage',
      `could not locate ${!chapterIds.size ? 'chapters in js/story/acts/' : 'specs in js/story/scenes/'} — this rule is not checking anything`,
      'tools/audit/check.js');
  } else {
    for (const [id, act] of [...narrativeOf].sort((a, b) => a[0] - b[0])) {
      if (!specOf.has(id)) {
        report('WARN', 'scene-coverage',
          `chapter ${id} has narrative text but no scene spec — it plays as bare captions; add S[${id}] to js/story/scenes/${act}.js`,
          `js/story/acts/${act}`);
      }
    }
    for (const [id, where] of [...specOf].sort((a, b) => a[0] - b[0])) {
      if (!chapterIds.has(id)) {
        report('WARN', 'scene-orphan',
          `scene spec S[${id}] has no chapter with that id — dead spec, or a renumber the specs did not follow`,
          where);
      }
    }
  }
}

// ── Output ───────────────────────────────────────────────────────────────────
const order = { ERROR: 0, WARN: 1, ACCEPTED: 2 };
findings.sort((a, b) => order[a.level] - order[b.level] || a.rule.localeCompare(b.rule));

const errors = findings.filter(f => f.level === 'ERROR').length;
const warns  = findings.filter(f => f.level === 'WARN').length;

if (!errors && !warns) {
  console.log(`audit: clean — ${findings.length} accepted exception(s), no new findings.`);
} else {
  let lastRule = '';
  for (const f of findings) {
    if (f.rule !== lastRule) { console.log(`\n[${f.level}] ${f.rule}`); lastRule = f.rule; }
    console.log(`  ${f.where}\n      ${f.msg}`);
    if (f.why) console.log(`      accepted: ${f.why}`);
  }
  console.log(`\n${errors} error, ${warns} warning, ${findings.length - errors - warns} accepted.`);
}
process.exit(errors ? 1 : 0);
