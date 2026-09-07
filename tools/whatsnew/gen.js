#!/usr/bin/env node
'use strict';
// tools/whatsnew/gen.js — build the "test the latest update" manifest.
//
//   npm run whatsnew                 # everything not yet pushed (origin/main..HEAD)
//   npm run whatsnew -- --since v4.1 # explicit base ref
//   npm run whatsnew -- --last 3     # the last 3 commits
//
// Writes js/smb-whatsnew-data.js, which js/smb-whatsnew.js reads to draw the
// F6 panel. Regenerate after every update; the panel then only ever offers what
// that update actually touched.
//
// WHY "not yet pushed" IS THE DEFAULT: it is the one range that means "the work
// since the last thing that shipped" without anyone having to remember to tag or
// pass a ref. Push, and the next run automatically scopes to the next batch.

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT  = path.join(ROOT, 'js', 'smb-whatsnew-data.js');

const git = (cmd) => execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim();
const gitQuiet = (cmd) => { try { return git(cmd); } catch (e) { return null; } };

// ── Range ────────────────────────────────────────────────────────────────────
function resolveBase(argv) {
  const iSince = argv.indexOf('--since');
  if (iSince !== -1 && argv[iSince + 1]) return argv[iSince + 1];
  const iLast = argv.indexOf('--last');
  if (iLast !== -1 && argv[iLast + 1]) return `HEAD~${parseInt(argv[iLast + 1], 10)}`;
  // Default: everything not yet pushed.
  const upstream = gitQuiet('rev-parse --verify --quiet origin/main');
  if (upstream) {
    const ahead = gitQuiet('rev-list --count origin/main..HEAD');
    if (ahead && +ahead > 0) return 'origin/main';
  }
  return 'HEAD~1';
}

const argv = process.argv.slice(2);
const BASE = resolveBase(argv);
const headSha = git('rev-parse HEAD');

let changed = [];
try {
  changed = git(`diff --name-only ${BASE}..HEAD`).split('\n').filter(Boolean);
} catch (e) {
  console.error(`whatsnew: cannot diff ${BASE}..HEAD — ${e.message}`);
  process.exit(1);
}
const commits = (gitQuiet(`log --format=%h%s ${BASE}..HEAD`) || '')
  .split('\n').filter(Boolean)
  .map(l => { const [sha, subject] = l.split(''); return { sha, subject }; });

// Changed line numbers per file, so a target can be traced to the exact chapter
// a hunk lands in rather than to "this file changed somewhere".
function changedLines(file) {
  const out = new Set();
  const patch = gitQuiet(`diff -U0 ${BASE}..HEAD -- "${file}"`);
  if (!patch) return out;
  for (const m of patch.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)) {
    const start = +m[1], count = m[2] === undefined ? 1 : +m[2];
    for (let i = 0; i < count; i++) out.add(start + i);
  }
  return out;
}

// Block-content comparison across the whole range.
//
// Comparing CHANGED LINES is wrong the moment an update moves code: splitting
// smb-story-scenes.js into 11 per-act files reported all 113 chapters as
// changed, when the split altered nothing. So instead build id -> normalised
// block text at BASE and at HEAD across every file that can hold such a block,
// and report only the ids whose CONTENT actually differs. Moves, splits and
// renames then produce no targets, which is the correct answer.
function filesAt(ref, pathspec) {
  const out = gitQuiet(`ls-tree -r --name-only ${ref} -- ${pathspec}`);
  return out ? out.split('\n').filter(f => f.endsWith('.js')) : [];
}

function blockMapAt(ref, pathspec, re) {
  const map = new Map();
  for (const f of filesAt(ref, pathspec)) {
    let src;
    try { src = git(`show ${ref}:"${f}"`); } catch (e) { continue; }
    const lines = src.split('\n');
    const starts = [];
    lines.forEach((l, i) => { const m = l.match(re); if (m) starts.push({ id: m[1], line: i }); });
    starts.forEach((s, k) => {
      const to = k + 1 < starts.length ? starts[k + 1].line : lines.length;
      // Normalise whitespace so reindentation alone is not a change.
      const text = lines.slice(s.line, to).join('\n').replace(/\s+/g, ' ').trim();
      map.set(s.id, text);
    });
  }
  return map;
}

// ids whose content differs between BASE and HEAD (added or edited).
function idsChanged(pathspec, re) {
  const before = blockMapAt(BASE, pathspec, re);
  const after  = blockMapAt('HEAD', pathspec, re);
  const out = [];
  for (const [id, text] of after) if (before.get(id) !== text) out.push(id);
  return out;
}

// ── Chapter titles, for labels ───────────────────────────────────────────────
const chapterTitle = {};
(function loadTitles() {
  const dir = path.join(ROOT, 'js', 'story', 'acts');
  if (!fs.existsSync(dir)) return;
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : (e.name.endsWith('.js') ? [p] : []);
  });
  for (const f of walk(dir)) {
    const src = fs.readFileSync(f, 'utf8');
    // Titles contain escaped apostrophes ("What Veran Didn\'t Say"), so a naive
    // [^']* stops at the backslash and truncates the label mid-word.
    for (const m of src.matchAll(/^[ \t]*id:\s*(\d+),\s*title:\s*'((?:[^'\\]|\\.)*)'/gm)) {
      chapterTitle[+m[1]] = m[2].replace(/\\(.)/g, '$1');
    }
  }
})();

// ── Classify ─────────────────────────────────────────────────────────────────
const targets = [];
const seen = new Set();
// Every file that produced SOME target. `t.why` only records the first file that
// triggered a given button, so using it to decide what was "unmapped" listed
// files that did map — smb-boss.js and smb-fighter.js both showed up under
// "nothing to click" while their buttons sat right above.
const mappedFiles = new Set();
function add(t) {
  if (t.why) mappedFiles.add(t.why);
  const key = `${t.kind}:${t.arg}`;
  if (seen.has(key)) return;
  seen.add(key);
  targets.push(t);
}

const storyIds = new Set();

for (const f of changed) {
  if (!f.startsWith('js/')) continue;
  if (/smb-whatsnew/.test(f)) continue;   // the tool's own files are not content

  // Story chapters and scene specs are resolved by content below, not per-file.
  if (/^js\/story\/(acts|scenes)\//.test(f) || /smb-story-scenes\.js/.test(f)) continue;
  // Bosses
  if (/^js\/boss\/smb-trueform/.test(f) || /trueform/i.test(f)) {
    add({ kind: 'boss', arg: 'trueform', label: 'True Form fight', why: f });
    continue;
  }
  if (/^js\/boss\//.test(f)) {
    add({ kind: 'boss', arg: 'boss', label: 'Boss fight (3 phases)', why: f });
    continue;
  }
  if (/smk2|adaptive-ai|behavior-model/.test(f)) {
    add({ kind: 'mode', arg: 'sovereign', label: 'Sovereign fight', why: f });
    continue;
  }
  if (/smb-god\.js/.test(f))        { add({ kind: 'mode', arg: 'god', label: 'God encounter', why: f }); continue; }
  if (/paradox/.test(f))            { add({ kind: 'mode', arg: 'trueform', label: 'True Form / Paradox', why: f }); continue; }
  // Finishers
  if (/smb-finisher/.test(f)) {
    add({ kind: 'finisher', arg: 'preview', label: 'Finisher preview (forces one on P2)', why: f });
    continue;
  }
  // Domains — one button per domain, so the preview gets a real class key.
  // DOMAIN_DEFS keys are read by brace depth rather than by a bare indent regex,
  // which would also match every other 2-space object key in the file.
  if (/smb-domain/.test(f)) {
    const abs = path.join(ROOT, 'js', 'smb-domain.js');
    if (fs.existsSync(abs)) {
      const lines = fs.readFileSync(abs, 'utf8').split('\n');
      const start = lines.findIndex(l => /DOMAIN_DEFS\s*=/.test(l));
      let depth = 0;
      for (let i = start; i >= 0 && i < lines.length; i++) {
        if (i > start) {
          const mm = lines[i].match(/^ {2}([a-zA-Z_][\w]*):\s*\{/);
          if (mm && depth === 1 && mm[1] !== 'none') {
            add({ kind: 'domain', arg: mm[1], label: 'Domain — ' + mm[1], why: f });
          }
        }
        for (const ch of lines[i]) { if (ch === '{') depth++; else if (ch === '}') depth--; }
        if (i > start && depth <= 0) break;
      }
    }
    continue;
  }
  // Trials — jump to the chapters that carry one.
  if (/smb-trials/.test(f)) {
    const dir = path.join(ROOT, 'js', 'story', 'acts');
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
      const p = path.join(d, e.name);
      return e.isDirectory() ? walk(p) : (e.name.endsWith('.js') ? [p] : []);
    });
    for (const af of walk(dir)) {
      const src = fs.readFileSync(af, 'utf8').split('\n');
      src.forEach((l, i) => {
        if (!/^\s*trial:\s*'/.test(l)) return;
        for (let j = i; j >= 0 && j > i - 40; j--) {
          const m = src[j].match(/^[ \t]*id:\s*(\d+),/);
          if (m) { storyIds.add(+m[1]); break; }
        }
      });
    }
    continue;
  }
  // Arenas — by content, so a reordering of the table is not 30 targets.
  if (/smb-data-arenas\.js/.test(f)) {
    for (const k of idsChanged('js/smb-data-arenas.js', /^ {2}([a-zA-Z0-9_]+):\s*\{/))
      add({ kind: 'arena', arg: k, label: `Arena — ${k}`, why: f });
    continue;
  }
  // Anything touching how a fighter moves, dies, or deals damage: a plain match shows it.
  if (/smb-fighter|smb-anim|smb-death-anim|smb-verlet|smb-combat\.js|smb-loop-core|smb-input|smb-weapons|smb-data-weapons/.test(f)) {
    add({ kind: 'match', arg: '2p', label: 'Local match (movement, damage, deaths)', why: f });
    continue;
  }
  if (/smb-minigames/.test(f))   { add({ kind: 'mode', arg: 'minigames', label: 'Minigames', why: f }); continue; }
  if (/smb-multiverse/.test(f))  { add({ kind: 'mode', arg: 'damnation', label: 'Multiverse / Damnation', why: f }); continue; }
}

// Story chapters + scene specs, by content across the whole range.
for (const id of idsChanged('js/story/acts', /^[ \t]*id:\s*(\d+),/)) storyIds.add(+id);
for (const id of idsChanged('js/story/scenes js/smb-story-scenes.js', /^\s*S\[(\d+)\]\s*=/)) storyIds.add(+id);

for (const id of [...storyIds].sort((a, b) => a - b)) {
  targets.push({
    kind: 'story', arg: id,
    label: `Ch ${id}${chapterTitle[id] ? ' — ' + chapterTitle[id] : ''}`,
    why: 'story',
  });
}

// Files that changed but map to nothing runnable — listed so the panel can be
// honest about what it is NOT offering to test.
const unmapped = changed.filter(f =>
  f.startsWith('js/') && !mappedFiles.has(f) &&
  !/smb-whatsnew/.test(f) &&
  !/smb-story-scenes\.js/.test(f) &&
  !/^js\/story\/(acts|scenes)\//.test(f));

const data = {
  generated: new Date().toISOString(),
  base: BASE,
  baseSha: gitQuiet(`rev-parse ${BASE}`) || null,
  headSha,
  commits,
  targets,
  changedFiles: changed,
  unmapped,
  nonJs: changed.filter(f => !f.startsWith('js/')),
};

fs.writeFileSync(OUT,
  "'use strict';\n" +
  '// GENERATED by tools/whatsnew/gen.js — do not edit by hand.\n' +
  `// Range: ${BASE}..HEAD  (${commits.length} commit${commits.length === 1 ? '' : 's'})\n` +
  '// Regenerate with: npm run whatsnew\n\n' +
  'window.WHATS_NEW = ' + JSON.stringify(data, null, 1) + ';\n');

console.log(`whatsnew: ${BASE}..HEAD — ${commits.length} commit(s), ${changed.length} file(s) changed`);
console.log(`  ${targets.length} testable target(s):`);
for (const t of targets) console.log(`    [${t.kind}] ${t.label}`);
if (unmapped.length) console.log(`  ${unmapped.length} changed js file(s) with no runnable target (listed in the panel)`);
console.log(`  wrote ${path.relative(ROOT, OUT)}`);
