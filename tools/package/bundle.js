// bundle.js — merge the staged index.html's ~430 <script src="./js/..."> tags into a few files.
//
// Usage:  node tools/package/bundle.js <stage dir>
//
// Called by the build scripts on the staged copy, never on the repo. Fewer requests is
// what makes a portal load fast; the game itself still has no build step.
//
// Rules, so every file runs exactly as it did as its own <script>:
//  - Only runs of consecutive plain tags are merged. Anything else between two tags
//    (an inline <script>, markup) ends the run, so execution order is unchanged.
//  - A bundle never mixes strict and sloppy files. 'use strict' only counts at the very
//    top of a script, so each bundle starts with a file that sets the mode for all of it.
//  - Each bundle must compile on its own. Two separate scripts may each declare the same
//    top-level let/const (the second just fails); one bundle can't, so a clash starts a
//    new bundle and the second file keeps failing alone, as before.
//  - Files are joined with ";" so a missing semicolon can't glue two statements together.
// The original js/ files stay in the stage: the prequels load some of them directly.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const acorn = require('acorn');

const TAG = /<script src="\.\/(js\/[^"?]+\.js)(?:\?[^"]*)?"><\/script>/g;
const GAP_OK = /^(?:\s|<!--[\s\S]*?-->)*$/;   // only whitespace and HTML comments between tags

function isStrict(src) {
  const body = src.replace(/^﻿/, '').replace(/^(?:\s+|\/\/[^\n]*\n?|\/\*[\s\S]*?\*\/)*/, '');
  return /^(['"])use strict\1/.test(body);
}

function compiles(code, name) {
  try { new vm.Script(code, { filename: name }); return null; }
  catch (e) { return e; }
}

// Top-level names a script declares. let/const/class can't be redeclared by a later
// script, and nothing can redeclare them; var/function only clash with those.
function topNames(src) {
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true }); }
  catch (e) { return null; }
  const lex = [], vars = [];
  const add = (list, pat) => {
    if (!pat) return;
    if (pat.type === 'Identifier') list.push(pat.name);
    else if (pat.type === 'ObjectPattern') pat.properties.forEach(p => add(list, p.value || p.argument));
    else if (pat.type === 'ArrayPattern') pat.elements.forEach(e => add(list, e));
    else if (pat.type === 'RestElement') add(list, pat.argument);
    else if (pat.type === 'AssignmentPattern') add(list, pat.left);
  };
  for (const n of ast.body) {
    if (n.type === 'VariableDeclaration') n.declarations.forEach(d => add(n.kind === 'var' ? vars : lex, d.id));
    else if (n.type === 'ClassDeclaration') lex.push(n.id.name);
    else if (n.type === 'FunctionDeclaration') vars.push(n.id.name);
  }
  // Every identifier the script could resolve as a variable. Property names (a.b, {b: 1},
  // class members, labels) never touch a binding, so they don't count. Local shadowing
  // still counts, which only over-splits. Used for the hoisting rule below.
  const refs = new Set();
  const skipKey = (node, k) =>
    (k === 'property' && node.type === 'MemberExpression' && !node.computed) ||
    (k === 'key' && (node.type === 'Property' || node.type === 'MethodDefinition' ||
                     node.type === 'PropertyDefinition') && !node.computed && !node.shorthand) ||
    (k === 'label');
  (function walk(node) {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'Identifier') refs.add(node.name);
    for (const k in node) {
      if (skipKey(node, k)) continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object' && typeof v.type === 'string') walk(v);
    }
  })(ast);
  return { lex, vars, refs };
}

// Would this script fail to load given what earlier scripts declared? Same check the
// browser makes when it runs a new classic script.
const seenLex = new Set(), seenVar = new Set();
function clashes(names) {
  return names.lex.some(n => seenLex.has(n) || seenVar.has(n)) || names.vars.some(n => seenLex.has(n));
}
function declare(names) {
  names.lex.forEach(n => seenLex.add(n));
  names.vars.forEach(n => seenVar.add(n));
}

// Hoisting rule. Inside one bundle every top-level name exists from the bundle's first
// line: let/const/class uninitialised (even `typeof X` throws), function declarations
// already callable, vars as undefined. As separate scripts, earlier code saw none of
// them. So a file whose top-level names were mentioned by any earlier script must start
// its own bundle: then nothing runs before its declarations that couldn't already see
// them as separate scripts, and earlier code can't call into it before it has set up.
const mentioned = new Set();
function mentionedEarlier(names) { return names.lex.concat(names.vars).some(n => mentioned.has(n)); }
function mention(names) { names.refs.forEach(n => mentioned.add(n)); }

function piece(rel, src) {
  return '/* ' + rel + ' */\n' + src + '\n;\n';
}

const stage = process.argv[2];
if (!stage) { console.error('usage: bundle.js <stage dir>'); process.exit(1); }
const htmlPath = path.join(stage, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Collect tags, then group into runs of adjacent tags. Inline scripts are kept in
// order too: they declare globals that later files can clash with.
const tags = [];
let m;
while ((m = TAG.exec(html))) tags.push({ rel: m[1], start: m.index, end: m.index + m[0].length });
const INLINE = /<script>([\s\S]*?)<\/script>/g;
const inlines = [];
while ((m = INLINE.exec(html))) inlines.push({ start: m.index, src: m[1] });
const runs = [];
for (const t of tags) {
  const last = runs[runs.length - 1];
  if (last && GAP_OK.test(html.slice(last[last.length - 1].end, t.start))) last.push(t);
  else runs.push([t]);
}
let inl = 0;
function declareInlinesBefore(pos) {
  while (inl < inlines.length && inlines[inl].start < pos) {
    const names = topNames(inlines[inl].src);
    if (names && !clashes(names)) declare(names);
    if (names) mention(names);
    inl++;
  }
}

const bundles = [];            // { name, files: [tag], code, strict }
let solo = 0;
for (const run of runs) {
  let cur = null;
  declareInlinesBefore(run[0].start);
  for (const t of run) {
    const file = path.join(stage, t.rel);
    if (!fs.existsSync(file)) { console.error('bundle: missing ' + t.rel); process.exit(1); }
    const src = fs.readFileSync(file, 'utf8');
    const strict = isStrict(src);
    // A file that doesn't compile, can't be parsed, or redeclares an earlier global stays
    // its own tag, failing alone as it always did.
    const names = topNames(src);
    if (compiles(src, t.rel) || !names || clashes(names)) {
      cur = null; solo++;
      console.log('  kept alone: ' + t.rel + (names && clashes(names) ? ' (redeclares an earlier global)' : ''));
      continue;
    }
    declare(names);
    const mustLead = mentionedEarlier(names);
    mention(names);
    if (cur && cur.strict === strict && !mustLead) {
      const next = cur.code + piece(t.rel, src);
      if (!compiles(next, cur.name)) { cur.code = next; cur.files.push(t); continue; }
    }
    cur = { files: [t], code: piece(t.rel, src), strict: strict };
    cur.name = 'js/bundle-' + String(bundles.length + 1).padStart(2, '0') + '.js';
    bundles.push(cur);
  }
}

// Rewrite index.html back to front so earlier offsets stay valid.
let out = html;
const edits = [];
for (const b of bundles) {
  if (b.files.length < 2) continue;      // a bundle of one is just the original tag
  const first = b.files[0], last = b.files[b.files.length - 1];
  edits.push({ start: first.start, end: last.end, text: '<script src="./' + b.name + '"></script>' });
  fs.writeFileSync(path.join(stage, b.name), b.code);
}
edits.sort((a, b) => b.start - a.start);
for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
fs.writeFileSync(htmlPath, out);

const merged = bundles.filter(b => b.files.length > 1);
const left = (out.match(/<script src="\.\/js\//g) || []).length;
console.log('bundled ' + tags.length + ' script tags into ' + merged.length + ' bundles; ' +
  left + ' local <script> tags remain (' + solo + ' kept alone because they do not compile)');
