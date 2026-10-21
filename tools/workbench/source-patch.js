'use strict';
// Writes workbench edits back into the game's own source tables. The tables stay the
// source of truth; this edits only the fields that changed, in place, and leaves
// comments, ability code and formatting alone.
//
//   WEAPONS[key]             js/smb-data-weapons.js    stats (damage, range, ...)
//   WEAPON_SWINGS[key]       js/smb-data-weapons.js    swing (dur, a0, a1, tilt, tipLen, ease)
//   WEAPON_SPRITE_DEFS[key]  js/smb-weapon-sprites.js  sprite fit (len, anchor, shaftY)
//   WEAPON_EDGE_PROFILE[key] js/smb-weapon-sprites.js  measured blade extent
//   WEAPON_SPRITE_VER        js/smb-weapon-sprites.js  PNG cache-bust
//
// Only depth-1 fields of an entry are touched, so `tilt` inside `carry: {...}` or a
// `damage:` inside ability code is never matched.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const F_WEAPONS = path.join(ROOT, 'js/smb-data-weapons.js');
const F_SPRITES = path.join(ROOT, 'js/smb-weapon-sprites.js');

const STAT_FIELDS  = ['damage', 'range', 'cooldown', 'endlag', 'kb', 'abilityCooldown', 'superDmgMult', 'abilityDmgMult'];
const SWING_FIELDS = ['dur', 'a0', 'a1', 'tilt', 'tipLen', 'ease'];
const EASES = ['linear', 'snap', 'iai', 'heavy', 'sweep', 'thrust', 'jab', 'crack', 'recoil'];

// Walks src from `from`, calling visit(i, depth) for each code char (strings and comments skipped).
// Returns the index where visit returned true, or -1.
function scan(src, from, visit) {
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (c === '/' && n === '/') { i = src.indexOf('\n', i); if (i < 0) return -1; continue; }
    if (c === '/' && n === '*') { i = src.indexOf('*/', i + 2) + 1; if (i <= 0) return -1; continue; }
    if (c === '"' || c === "'" || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (c === '{' || c === '[' || c === '(') depth++;
    if (visit(i, depth, c)) return i;
    if (c === '}' || c === ']' || c === ')') depth--;
  }
  return -1;
}

// [start, end) of the `{...}` body of `key:` inside `const TABLE = {`.
function findEntry(src, table, key) {
  const t = src.indexOf(`const ${table} = {`);
  if (t < 0) throw new Error(`${table} not found`);
  const open = src.indexOf('{', t);
  let hit = -1;
  // Depth 1 inside the table: look for the key at line start.
  const re = new RegExp(`^\\s*${key}\\s*:\\s*\\{`, 'm');
  scan(src, open, (i, depth, c) => {
    if (c === '}' && depth === 1) return true;              // end of table
    if (depth === 1 && (i === open + 1 || src[i - 1] === '\n')) {
      const m = re.exec(src.slice(i, src.indexOf('\n', i) + 1));
      if (m && m.index === 0) { hit = i + m[0].length - 1; return true; }
    }
    return false;
  });
  if (hit < 0) return null;
  const close = scan(src, hit, (i, depth, c) => c === '}' && depth === 1);
  return [hit, close + 1];
}

const NUM = String.raw`-?\d+(?:\.\d+)?`;

function fmt(v) {
  if (typeof v === 'string') return `'${v}'`;
  const r = Math.round(v * 1000) / 1000;
  return String(r);
}

// Replace depth-1 `field: value` pairs inside an entry body. Missing fields are
// inserted after `insertAfter` when given, else reported.
function patchFields(body, fields, opts = {}) {
  const changed = [], missing = [];
  for (const [field, val] of Object.entries(fields)) {
    let pos = -1, len = 0, old = null;
    const re = new RegExp(`\\b${field}\\s*:\\s*(${opts.valueRe || NUM}|'[^']*')`, 'y');
    scan(body, 0, (i, depth) => {
      if (depth !== 1) return false;
      if (i > 0 && /[\w$]/.test(body[i - 1])) return false;
      re.lastIndex = i;
      const m = re.exec(body);
      if (m) { pos = i; len = m[0].length; old = m[1]; return true; }
      return false;
    });
    const text = `${field}: ${opts.render ? opts.render(field, val) : fmt(val)}`;
    if (pos >= 0) {
      if (old.replace(/\s+/g, ' ') === text.slice(field.length + 2)) continue;
      if (typeof val === 'number' && !/\//.test(old) && Number(old) === val) continue;
      body = body.slice(0, pos) + text + body.slice(pos + len);
      changed.push(`${field} ${old} -> ${text.slice(field.length + 2)}`);
    } else if (opts.insertAfter) {
      const m = new RegExp(`\\b${opts.insertAfter}\\s*:\\s*${NUM},?`).exec(body);
      if (!m) { missing.push(field); continue; }
      const at = m.index + m[0].length;
      const lead = m[0].endsWith(',') ? ' ' : ', ';
      body = body.slice(0, at) + lead + text + (m[0].endsWith(',') ? ',' : '') + body.slice(at);
      changed.push(`${field} (added) ${text.slice(field.length + 2)}`);
    } else missing.push(field);
  }
  return { body, changed, missing };
}

function patchEntry(file, table, key, fields, opts) {
  const src = fs.readFileSync(file, 'utf8');
  const span = findEntry(src, table, key);
  if (!span) return { changed: [], missing: Object.keys(fields), error: `${table}.${key} not in source` };
  const r = patchFields(src.slice(span[0], span[1]), fields, opts);
  if (r.changed.length) fs.writeFileSync(file, src.slice(0, span[0]) + r.body + src.slice(span[1]));
  return { changed: r.changed, missing: r.missing };
}

function pick(obj, keys) {
  const o = {};
  for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') o[k] = obj[k];
  return o;
}

function saveStats(key, stats) {
  const f = pick(stats, STAT_FIELDS);
  for (const k in f) if (typeof f[k] !== 'number' || !isFinite(f[k])) throw new Error(`stat ${k} must be a number`);
  return patchEntry(F_WEAPONS, 'WEAPONS', key, f, { insertAfter: 'kb' });
}

function saveSwing(key, swing) {
  const f = pick(swing, SWING_FIELDS);
  if (f.ease !== undefined && !EASES.includes(f.ease)) throw new Error(`unknown ease ${f.ease}`);
  return patchEntry(F_WEAPONS, 'WEAPON_SWINGS', key, f, { insertAfter: 'a1' });
}

// shaftY is written as `px / h` like the rest of the table when the PNG height is known.
function saveSprite(key, sprite, imgH) {
  const f = pick(sprite, ['len', 'anchor', 'shaftY']);
  return patchEntry(F_SPRITES, 'WEAPON_SPRITE_DEFS', key, f, {
    valueRe: String.raw`-?\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?`,
    render: (k, v) => {
      if (k === 'shaftY' && imgH) return `${(v * imgH).toFixed(1)} / ${imgH}`;
      if (k === 'anchor') return v.toFixed(2);
      return fmt(v);
    },
  });
}

function saveEdgeProfile(key, profile) {
  if (!Array.isArray(profile) || profile.length !== 8) throw new Error('edge profile must be 8 [above, below] pairs');
  const r1 = (n) => String(Math.round(n * 10) / 10);
  const arr = '[' + profile.map(([a, b]) => `[${r1(a)},${r1(b)}]`).join(',') + ']';
  let src = fs.readFileSync(F_SPRITES, 'utf8');
  const lineRe = new RegExp(`^(\\s*${key}:\\s*)\\[\\[.*\\]\\],?\\s*$`, 'm');
  const m = lineRe.exec(src);
  if (m) {
    const next = `${m[1]}${arr},`;
    if (m[0] === next) return { changed: [] };
    src = src.slice(0, m.index) + next + src.slice(m.index + m[0].length);
  } else {
    const t = src.indexOf('const WEAPON_EDGE_PROFILE = {');
    if (t < 0) throw new Error('WEAPON_EDGE_PROFILE not found');
    const end = src.indexOf('\n};', t);
    src = src.slice(0, end) + `\n  ${(key + ':').padEnd(14)} ${arr},` + src.slice(end);
  }
  fs.writeFileSync(F_SPRITES, src);
  return { changed: [`edge profile ${arr}`] };
}

function bumpSpriteVer() {
  let src = fs.readFileSync(F_SPRITES, 'utf8');
  let v = null;
  src = src.replace(/const WEAPON_SPRITE_VER = (\d+);/, (_, n) => { v = +n + 1; return `const WEAPON_SPRITE_VER = ${v};`; });
  if (v == null) throw new Error('WEAPON_SPRITE_VER not found');
  fs.writeFileSync(F_SPRITES, src);
  return v;
}

// Current source values, for the CLI and for diffing.
function readSource(key) {
  const out = {};
  const grab = (file, table, fields, valueRe) => {
    const src = fs.readFileSync(file, 'utf8');
    const span = findEntry(src, table, key);
    if (!span) return null;
    const body = src.slice(span[0], span[1]);
    const o = {};
    for (const field of fields) {
      const re = new RegExp(`\\b${field}\\s*:\\s*(${valueRe || NUM}|'[^']*')`, 'y');
      scan(body, 0, (i, depth) => {
        if (depth !== 1 || (i > 0 && /[\w$]/.test(body[i - 1]))) return false;
        re.lastIndex = i;
        const m = re.exec(body);
        if (m) { o[field] = m[1]; return true; }
        return false;
      });
    }
    return o;
  };
  out.stats  = grab(F_WEAPONS, 'WEAPONS', STAT_FIELDS);
  out.swing  = grab(F_WEAPONS, 'WEAPON_SWINGS', SWING_FIELDS);
  out.sprite = grab(F_SPRITES, 'WEAPON_SPRITE_DEFS', ['len', 'anchor', 'shaftY'],
    String.raw`-?\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?`);
  return out;
}

module.exports = { saveStats, saveSwing, saveSprite, saveEdgeProfile, bumpSpriteVer, readSource,
  scan, findEntry, patchFields, STAT_FIELDS, SWING_FIELDS, EASES, F_WEAPONS, F_SPRITES };
