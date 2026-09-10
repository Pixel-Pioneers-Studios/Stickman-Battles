'use strict';
/*
 * tools/split-saga.js — build the standalone saga games from this one tree.
 *
 * The story ships as a single codebase; `ACTIVE_SAGA` in
 * js/story/smb-saga-structure.js selects which slice a build presents. This
 * script stamps that const into a clean copy of the static game so each saga
 * can be uploaded to CrazyGames as its own title.
 *
 * Usage:
 *   node tools/split-saga.js                 # build all four targets
 *   node tools/split-saga.js saga1 saga3     # build only these
 *   node tools/split-saga.js --zip           # also produce dist/<name>.zip
 *   node tools/split-saga.js --list          # show targets and exit
 *
 * Everything lands in dist/<slug>/ and dist/ is gitignored.
 */

const fs   = require('fs');
const path = require('path');
const cp   = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SAGA_FILE = path.join('js', 'story', 'smb-saga-structure.js');

// Only what the browser actually loads. images/store (CrazyGames listing art)
// and images/unused are deliberately excluded — nothing references them and
// together they are ~25MB of the 33MB images tree.
const INCLUDE = [
  'index.html', 'SMB.css', 'favicon.svg', 'live-config.json',
  'mega-knight-evolution.mp3', 'fonts', 'images', 'js',
];
const EXCLUDE_DIRS = new Set(['store', 'unused']);

// macOS Finder / iCloud duplicates ("js 3", "index 2.html") silently doubled the
// hand-built bundles and risked shipping a stale index. Never copy them.
const isJunk = name =>
  name === '.DS_Store' || /(^| )\d+(\.[A-Za-z0-9]+)?$/.test(name) && / \d+(\.|$)/.test(name);

function readSagaDefs() {
  const src = fs.readFileSync(path.join(ROOT, SAGA_FILE), 'utf8');
  const defs = [];
  const re = /id:\s*'(saga\d)'\s*,\s*title:\s*'([^']+)'[\s\S]*?tagline:\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(src))) defs.push({ saga: m[1], title: m[2], tagline: m[3] });
  return defs;
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildTargets() {
  const defs = readSagaDefs();
  const out = [{ saga: 'full', slug: 'crazygames', title: null }];
  defs.forEach((d, i) => {
    out.push({
      saga: d.saga, slug: `${d.saga}-${slugify(d.title)}`,
      title: d.title, tagline: d.tagline, part: i + 1, ofParts: defs.length,
    });
  });
  return out;
}

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }

let copied = 0;
function copyInto(src, dest) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    if (EXCLUDE_DIRS.has(path.basename(src))) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      if (isJunk(name)) continue;
      copyInto(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.copyFileSync(src, dest);
    copied++;
  }
}

function dirSize(p) {
  let total = 0;
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const fp = path.join(p, e.name);
    total += e.isDirectory() ? dirSize(fp) : fs.statSync(fp).size;
  }
  return total;
}
const mb = b => (b / 1024 / 1024).toFixed(1) + 'MB';

function build(target, opts) {
  const dest = path.join(DIST, target.slug);
  rmrf(dest);
  fs.mkdirSync(dest, { recursive: true });

  copied = 0;
  for (const entry of INCLUDE) {
    const src = path.join(ROOT, entry);
    if (!fs.existsSync(src)) { console.log(`   ! missing, skipped: ${entry}`); continue; }
    copyInto(src, path.join(dest, entry));
  }

  // ── Stamp the saga selector ────────────────────────────────────────────────
  const sagaPath = path.join(dest, SAGA_FILE);
  let saga = fs.readFileSync(sagaPath, 'utf8');
  const DECL = /^const ACTIVE_SAGA = '[^']*';/m;
  // Test the pattern, don't compare before/after: the 'full' target's value is
  // already 'full' in source, so an equality check false-fails on a good build.
  if (!DECL.test(saga)) throw new Error(`ACTIVE_SAGA declaration not found in ${target.slug}`);
  saga = saga.replace(DECL, `const ACTIVE_SAGA = '${target.saga}';`);
  fs.writeFileSync(sagaPath, saga);

  // Verify the stamp took rather than trusting the replace.
  const check = fs.readFileSync(sagaPath, 'utf8').match(/^const ACTIVE_SAGA = '([^']*)';/m);
  if (!check || check[1] !== target.saga) {
    throw new Error(`stamp verification failed for ${target.slug}: got ${check && check[1]}`);
  }

  // ── Re-brand the page for a standalone saga ────────────────────────────────
  // Each saga is listed as its OWN game, so every piece of identity metadata has
  // to move with it. Rewriting only <title> left og:/twitter: cards announcing
  // "The 95th — 184-chapter story" on all three listings.
  if (target.title) {
    const idxPath = path.join(dest, 'index.html');
    let html = fs.readFileSync(idxPath, 'utf8');
    const name = `Stickman Evolution: ${target.title}`;
    const desc = `${target.tagline} Part ${target.part} of ${target.ofParts} in the `
      + `Stickman Evolution saga — a fast, brutal action fighter you can play free `
      + `in your browser. No download, no sign-up.`;
    const subs = [
      [/<title>[^<]*<\/title>/,                                  `<title>${name}</title>`],
      [/(<meta name="description" content=")[^"]*(")/,           `$1${desc}$2`],
      [/(<meta property="og:site_name" content=")[^"]*(")/,      `$1${name}$2`],
      [/(<meta property="og:title" content=")[^"]*(")/,          `$1${name}$2`],
      [/(<meta property="og:description" content=")[^"]*(")/,    `$1${desc}$2`],
      [/(<meta name="twitter:title" content=")[^"]*(")/,         `$1${name}$2`],
      [/(<meta name="twitter:description" content=")[^"]*(")/,   `$1${desc}$2`],
    ];
    const missed = [];
    for (const [re, rep] of subs) {
      if (!re.test(html)) { missed.push(String(re).slice(0, 46)); continue; }
      html = html.replace(re, rep);
    }
    // A canonical/og:url pointing at the full game tells search engines this
    // saga is a duplicate of it. Until each saga has its own public URL, having
    // no canonical is strictly better than having a wrong one.
    html = html.replace(/^\s*<link rel="canonical"[^>]*>\s*$/m, '');
    html = html.replace(/^\s*<meta property="og:url"[^>]*>\s*$/m, '');
    fs.writeFileSync(idxPath, html);
    if (missed.length) console.log(`   ! metadata tags not found: ${missed.join(', ')}`);
  }

  const size = dirSize(dest);
  console.log(`   ${target.slug.padEnd(28)} ACTIVE_SAGA='${target.saga}'  ${String(copied).padStart(4)} files  ${mb(size)}`);

  if (opts.zip) {
    const zip = path.join(DIST, `stickman-evolution-${target.slug}.zip`);
    fs.rmSync(zip, { force: true });
    cp.execFileSync('zip', ['-qr', zip, '.'], { cwd: dest });
    console.log(`   ${''.padEnd(28)} -> ${path.basename(zip)}  ${mb(fs.statSync(zip).size)}`);
  }
  return { slug: target.slug, size };
}

const args = process.argv.slice(2);
const opts = { zip: args.includes('--zip') };
const named = args.filter(a => !a.startsWith('--'));
const all = buildTargets();

if (args.includes('--list')) {
  for (const t of all) console.log(`${t.saga.padEnd(6)} -> dist/${t.slug}`);
  process.exit(0);
}

const targets = named.length
  ? all.filter(t => named.includes(t.saga) || named.includes(t.slug))
  : all;

if (!targets.length) {
  console.error(`no target matched ${named.join(', ')}. Known: ${all.map(t => t.saga).join(', ')}`);
  process.exit(1);
}

fs.mkdirSync(DIST, { recursive: true });

// iCloud Drive syncs ~/Documents and resurrects files this script deletes as
// numbered conflict copies ("… 2.zip", "js 3"). That is where the junk in the
// earlier hand-made bundles came from, and a stale "… 2.zip" sitting next to a
// fresh one is exactly how the wrong build gets uploaded. Sweep them each run.
{
  const stale = fs.readdirSync(DIST).filter(isJunk);
  for (const name of stale) {
    rmrf(path.join(DIST, name));
    console.log(`   purged stale copy: ${name}`);
  }
}

console.log(`building ${targets.length} target(s) into dist/`);
for (const t of targets) build(t, opts);
console.log('done.');
