#!/usr/bin/env node
'use strict';
// tools/dev/bump-version.js — bump the ?v= cache-bust suffix in index.html.
//
//   node tools/dev/bump-version.js              # tags for files changed vs HEAD (incl. untracked)
//   node tools/dev/bump-version.js --all        # every tag
//   node tools/dev/bump-version.js --to 4.9.60  # explicit version (default: highest + 1 patch)
//   node tools/dev/bump-version.js --dry-run    # print, don't write
//   node tools/dev/bump-version.js js/smb-combat.js SMB.css   # explicit files
//
// Browsers (and the school zip's file:// origin) cache scripts hard, so a changed
// file whose tag wasn't bumped silently runs the old code.

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const HTML = path.join(ROOT, 'index.html');
const argv = process.argv.slice(2);
const flag = f => argv.includes(f);
const iTo  = argv.indexOf('--to');
const toArg = iTo !== -1 ? argv[iTo + 1] : null;
const explicit = argv.filter((a, i) => !a.startsWith('--') && !(iTo !== -1 && i === iTo + 1));

const html = fs.readFileSync(HTML, 'utf8');
const TAG_RE = /((?:src|href)=["'])([^"'?]+)\?v=([0-9.]+)(["'])/g;

const cmpVer = (a, b) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
};

const versions = [...html.matchAll(TAG_RE)].map(m => m[3]);
if (!versions.length) { console.error('No ?v= tags found in index.html'); process.exit(1); }
const highest = versions.slice().sort(cmpVer).pop();
const next = toArg || highest.split('.').map((n, i, a) => i === a.length - 1 ? +n + 1 : n).join('.');

let targets = null;
if (!flag('--all')) {
  if (explicit.length) {
    targets = new Set(explicit.map(f => path.relative(ROOT, path.resolve(f)).replace(/\\/g, '/')));
  } else {
    const git = cmd => execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' });
    targets = new Set([
      ...git('diff --name-only HEAD').split('\n'),
      ...git('ls-files --others --exclude-standard').split('\n'),
    ].filter(Boolean));
    // A tag that already differs from HEAD's index.html was bumped for this change.
    let headHtml = '';
    try { headHtml = git('show HEAD:index.html'); } catch (e) {}
    const headVer = new Map([...headHtml.matchAll(TAG_RE)].map(m => [m[2].replace(/^\.\//, ''), m[3]]));
    for (const m of html.matchAll(TAG_RE)) {
      const f = m[2].replace(/^\.\//, '');
      if (headVer.has(f) && headVer.get(f) !== m[3]) targets.delete(f);
    }
  }
}

const bumped = [];
const out = html.replace(TAG_RE, (all, pre, file, ver, post) => {
  if (targets && !targets.has(file.replace(/^\.\//, ''))) return all;
  if (ver === next) return all;
  bumped.push(`${file}  ${ver} -> ${next}`);
  return `${pre}${file}?v=${next}${post}`;
});

if (!bumped.length) { console.log(`Nothing to bump (target version ${next}).`); process.exit(0); }
console.log(bumped.join('\n'));
console.log(`\n${bumped.length} tag(s) ${flag('--dry-run') ? 'would be' : ''} set to ?v=${next}`);
if (!flag('--dry-run')) fs.writeFileSync(HTML, out);
