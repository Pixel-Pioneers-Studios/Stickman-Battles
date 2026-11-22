#!/usr/bin/env node
'use strict';
// Style audit: flags visual drift from docs/style-guide.md.
//
// Old debt is recorded in style-baseline.json, so only NEW drift fails. A count that goes up
// for any (rule, file) pair fails the run and prints the offending lines.
//
//   npm run style                  check against the baseline
//   npm run style -- --list RULE   print every match for one rule
//   npm run style -- --update      rewrite the baseline (only after paying debt down, or with approval)

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..', '..');
const BASELINE = path.join(__dirname, 'style-baseline.json');

// The palette from docs/style-guide.md (lower-case, 6-digit). Player identity colours count too.
const PALETTE = new Set([
  '#07060c', '#15111d', '#211a2b', '#2a2136', '#3a2a38',            // ink, panels
  '#e2b255', '#8c5e1f', '#f3e8d2', '#b9ac93', '#d8cdb6',            // gold, gold-deep, bone, bone-dim, pale bone
  '#b8301f', '#e5452b', '#f2762b', '#ff9a4a', '#c23a1c', '#d98a4a', // crimson, ember ramp, token copper
  '#ffe9a8', '#f6b63c', '#ee6a1f', '#fff6e0',                       // fire gradient stops (brush marks only), banner text
  '#7b4bd6',                                                        // void
  '#00e5ff', '#ff2233', '#ffffff', '#000000',                       // P1, P2, pure white/black
]);

// Files whose job is drawing the world (arenas, effects, fighters, cinematics) choose their own
// colours: the guide gives each arena and being its own palette. Only UI code is held to the palette.
const UI_FILE = /(smb-drawing-hud|smb-tutorial|smb-achievements|smb-menu|smb-home|smb-mentor|smb-ladder|story\/smb-story-(config|engine-ui|engine-match|engine-events|map)|smb-network|smb-liveops|smb-icons|smb-settings|smb-store|smb-accounts|smb-public-hub)\.js$/;
// Developer-only screens are exempt from every rule.
const DEV_FILE = /(smb-admin|smb-debug|smb-cheats|smb-owner|smb-dev)/;

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2B50}\u{23F0}-\u{23FF}]/u;
// Plain text marks that read as type, not stock art, are allowed (guide: Icons).
const TEXT_MARKS = /[✓✕✗★☆▶↺✦❖⚠⚔⚡]/gu;
const LITERAL_FAMILY = /(Arial|Segoe UI|Helvetica|Verdana|Tahoma|Trebuchet|Impact|Potta One|Baloo|['"]Russo One['"]|['"]Rajdhani['"]|SE Logo Brush)/;

const RULES = {
  'literal-font': {
    why: 'Use FONT_UI / FONT_DISPLAY / FONT_LOGO in canvas code, var(--font-ui) / var(--sh-font-head) in CSS and inline styles.',
    js(line) { return /(\.font\s*=|font-family|font:)/.test(line) && LITERAL_FAMILY.test(line) && !/FONT_(UI|DISPLAY|LOGO)\s*=/.test(line); },
    css(line, ctx) { return !ctx.inRoot && !ctx.inFontFace && /font-family\s*:/.test(line) && LITERAL_FAMILY.test(line); },
  },
  'emoji': {
    why: 'UI icons come from js/smb-icons.js (smbIcon / smbIconOrText), never stock emoji.',
    js(line) { return EMOJI.test(line.replace(TEXT_MARKS, '')); },
  },
  'off-palette-hex': {
    why: 'UI colours come from the --sh-* tokens (see the palette table in the guide).',
    js(line, ctx) {
      if (!ctx.ui || !/(style|cssText|innerHTML|fillStyle|strokeStyle|color)/.test(line)) return false;
      return hexes(line).some(h => !PALETTE.has(h));
    },
    css(line, ctx) { return !ctx.inRoot && hexes(line).some(h => !PALETTE.has(h)); },
  },
  'round-corners': {
    why: 'Plates and buttons use 2px corners. Circles (50%) for round icon buttons are fine.',
    js(line) { return radii(line).some(r => r > 2 && r < 40); },
    css(line) { return /border-radius/.test(line) && radii(line).some(r => r > 2 && r < 40); },
  },
  'gradient-text': {
    why: 'The fire gradient fill is for brush-font marks only (logo, story Victory, ladder result).',
    js(line) { return /background-clip\s*:\s*text/.test(line); },
    css(line, ctx) { return /background-clip\s*:\s*text/.test(line) && !/game-title|storyVictoryOverlay|ladderResult|splashLogo|sl-title/.test(ctx.selector); },
  },
  'ui-glow': {
    why: 'No glow in UI drawing: use an ink stroke and a hard drop shadow instead.',
    js(line, ctx) { return ctx.ui && /shadowBlur\s*=\s*(?!0\b)[\d(]/.test(line); },
  },
};

function hexes(line) {
  const out = [];
  for (const m of line.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    let h = m[1].toLowerCase();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    out.push('#' + h);
  }
  return out;
}
function radii(line) {
  const out = [];
  for (const m of line.matchAll(/border-radius\s*:\s*([^;'"`}]+)/g)) {
    for (const v of m[1].matchAll(/(\d+(?:\.\d+)?)px/g)) out.push(parseFloat(v[1]));
  }
  for (const m of line.matchAll(/roundRect\([^)]*?,\s*(\d+(?:\.\d+)?)\s*\)/g)) out.push(parseFloat(m[1]));
  return out;
}

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'vendor') walk(p, acc); }
    else if (e.name.endsWith('.js')) acc.push(p);
  }
  return acc;
}

function scan() {
  const hits = {}; // rule -> file -> [ "line: text" ]
  const add = (rule, file, n, text) => {
    ((hits[rule] = hits[rule] || {})[file] = hits[rule][file] || []).push(`${n}: ${text.trim().slice(0, 140)}`);
  };
  for (const abs of walk(path.join(ROOT, 'js'), [])) {
    const file = path.relative(ROOT, abs);
    if (DEV_FILE.test(file)) continue;
    const ctx = { ui: UI_FILE.test(file) };
    fs.readFileSync(abs, 'utf8').split('\n').forEach((line, i) => {
      const t = line.trim();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      for (const [name, r] of Object.entries(RULES)) if (r.js && r.js(line, ctx)) add(name, file, i + 1, line);
    });
  }
  const css = fs.readFileSync(path.join(ROOT, 'SMB.css'), 'utf8').split('\n');
  const ctx = { inRoot: false, inFontFace: false, selector: '' };
  css.forEach((line, i) => {
    if (/\{/.test(line)) {
      ctx.selector = line;
      ctx.inRoot = /^\s*:root\b/.test(line);
      ctx.inFontFace = /@font-face/.test(line);
    }
    for (const [name, r] of Object.entries(RULES)) if (r.css && r.css(line, ctx)) add(name, 'SMB.css', i + 1, line);
    if (/\}/.test(line)) { ctx.inRoot = false; ctx.inFontFace = false; }
  });
  return hits;
}

function counts(hits) {
  const out = {};
  for (const [rule, files] of Object.entries(hits)) {
    out[rule] = {};
    for (const [f, lines] of Object.entries(files)) out[rule][f] = lines.length;
  }
  return out;
}

const args = process.argv.slice(2);
const hits = scan();
const now  = counts(hits);

if (args[0] === '--list') {
  const rule = args[1];
  if (!RULES[rule]) { console.error('Rules: ' + Object.keys(RULES).join(', ')); process.exit(2); }
  for (const [f, lines] of Object.entries(hits[rule] || {})) { console.log(f); lines.forEach(l => console.log('  ' + l)); }
  process.exit(0);
}
if (args[0] === '--update') {
  fs.writeFileSync(BASELINE, JSON.stringify(now, null, 1) + '\n');
  console.log('Style baseline written: ' + path.relative(ROOT, BASELINE));
  process.exit(0);
}

const base = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : {};
let failed = 0, paid = 0;
for (const rule of Object.keys(RULES)) {
  const files = new Set([...Object.keys(now[rule] || {}), ...Object.keys(base[rule] || {})]);
  for (const f of files) {
    const n = (now[rule] || {})[f] || 0, b = (base[rule] || {})[f] || 0;
    if (n > b) {
      failed++;
      console.log(`\n[${rule}] ${f}: ${b} -> ${n}   ${RULES[rule].why}`);
      hits[rule][f].forEach(l => console.log('    ' + l));
    } else if (n < b) paid += b - n;
  }
}
const total = r => Object.values(now[r] || {}).reduce((a, b) => a + b, 0);
console.log('\nStyle debt: ' + Object.keys(RULES).map(r => `${r} ${total(r)}`).join(' | '));
if (paid) console.log(`${paid} old issue(s) fixed since the baseline. Run "npm run style -- --update" to lock that in.`);
if (failed) { console.log(`\n${failed} new drift(s). Fix them, or propose a guide amendment (docs/style-guide.md).`); process.exit(1); }
console.log('No new drift.');
