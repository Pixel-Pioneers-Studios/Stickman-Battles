'use strict';
// Writes figure-studio edits back into js/smb-figure-rig.js with the smallest possible
// diff. An existing pose or clip is edited in place: only channels (or key fields) whose
// value changed get new text, so layout, ordering and comments survive. A clip whose
// key count changed is rewritten whole (its inner comments are reported as dropped).
// New poses and clips are appended to the end of their table.
//
// After writing, the file is loaded in a sandbox and every saved entry is compared
// with what was asked for. On any mismatch nothing is written.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { scan } = require('./source-patch');

const ROOT = path.resolve(__dirname, '../..');
const F_RIG = path.join(ROOT, 'js/smb-figure-rig.js');

const CH = ['spine', 'headTilt', 'upperArmF', 'foreArmF', 'upperArmB', 'foreArmB',
  'thighF', 'shinF', 'thighB', 'shinB', 'rootY', 'rootX', 'rootRot', 'squash', 'lean'];
const LINEAR = { rootY: 1, rootX: 1, lean: 1, squash: 1, rootRot: 1, headTilt: 1 };
const LIMB = { upperArmF: 1, foreArmF: 1, upperArmB: 1, foreArmB: 1, thighF: 1, shinF: 1, thighB: 1, shinB: 1 };

function num(v, dp) {
  const s = (Math.round(v * Math.pow(10, dp)) / Math.pow(10, dp)).toFixed(dp);
  return s.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '') || '0';
}

// Limbs read as offsets from straight down (Math.PI/2 +- d), the spine from straight up,
// like the hand-written table. Values near zero stay plain.
function fmtChannel(k, v) {
  if (LINEAR[k]) return num(v, 3);
  const H = Math.PI / 2;
  let base = null, label = '';
  if (LIMB[k] && Math.abs(v - H) <= 2.4 && Math.abs(v) >= 0.6) { base = H; label = 'Math.PI/2'; }
  if (k === 'spine' && Math.abs(v + H) <= 1.2) { base = -H; label = '-Math.PI/2'; }
  if (base === null) return num(v, 3);
  const d = Math.round((v - base) * 1000) / 1000;
  if (d === 0) return label;
  const a = Math.abs(d);
  return `${label} ${d < 0 ? '-' : '+'} ${a.toFixed(a * 100 % 1 ? 3 : 2)}`;
}

function evalExpr(expr) {
  return Function('Math', `"use strict"; return (${expr});`)(Math);
}

// Depth-1 fields of an object literal's text (text starts at its '{').
// Returns [{ name, start, end }] where start..end is the value expression.
function fields(text) {
  const out = [];
  let cur = null;
  const re = /([A-Za-z_$][\w$]*)\s*:\s*/y;
  scan(text, 0, (i, depth, c) => {
    if (depth !== 1) return false;
    if (cur && (c === ',' || c === '}')) { let e = i; while (/\s/.test(text[e - 1])) e--; cur.end = e; out.push(cur); cur = null; }
    if (!cur && c !== ',' && c !== '{' && !/\s/.test(c)) {
      re.lastIndex = i;
      const m = re.exec(text);
      if (m) cur = { name: m[1], start: i + m[0].length };
    }
    return false;
  });
  // The closing brace of the object itself is visited at depth 1 too, which closes the last field.
  return out;
}

// Replace / insert / remove depth-1 fields of an object literal's text.
// edits: { name: newExprText | null(remove) }
function editObject(text, edits) {
  let fs_ = fields(text);
  const names = new Set(fs_.map(f => f.name));
  // Work right to left so earlier offsets stay valid.
  const ops = [];
  for (const [name, expr] of Object.entries(edits)) {
    const f = fs_.find(x => x.name === name);
    if (f && expr === null) {
      // Remove "name: expr" plus one adjoining comma.
      const keyStart = text.lastIndexOf(name, f.start);
      let a = keyStart, b = f.end;
      const after = text.slice(b).match(/^\s*,\s*/);
      if (after) b += after[0].length;
      else { const before = text.slice(0, a).match(/,\s*$/); if (before) a -= before[0].length; }
      ops.push([a, b, '']);
    } else if (f) ops.push([f.start, f.end, expr]);
  }
  ops.sort((x, y) => y[0] - x[0]);
  for (const [a, b, s] of ops) text = text.slice(0, a) + s + text.slice(b);
  const adds = Object.entries(edits).filter(([n, e]) => e !== null && !names.has(n));
  if (adds.length) {
    let p = text.lastIndexOf('}');
    let q = p; while (/\s/.test(text[q - 1])) q--;
    const empty = text[q - 1] === '{';
    const ins = adds.map(([n, e]) => `${n}: ${e}`).join(', ');
    text = text.slice(0, q) + (empty ? ' ' : ', ') + ins + (empty ? ' ' : '') + text.slice(q);
  }
  return text;
}

function fmtPose(pose) {
  const keys = Object.keys(pose).filter(k => CH.includes(k) && typeof pose[k] === 'number' && isFinite(pose[k]));
  if (!keys.length) return 'P({})';
  const parts = keys.map(k => `${k}: ${fmtChannel(k, pose[k])}`);
  if (parts.length <= 3) return `P({ ${parts.join(', ')} })`;
  const lines = [];
  for (let i = 0; i < parts.length; i += 3) lines.push(parts.slice(i, i + 3).join(', '));
  return 'P({\n      ' + lines.join(',\n      ') + '\n    })';
}

function fmtKey(k) {
  const t = `t: ${Math.round(k.t)},`.padEnd(8);
  return `{ ${t} pose: '${k.pose}'${k.ease ? `, ease: '${k.ease}'` : ''} }`;
}

function fmtClip(clip) {
  const head = [`loop: ${!!clip.loop}`];
  if (clip.hold) head.push('hold: true');
  head.push(`dur: ${Math.round(clip.dur)}`);
  return `{ ${head.join(', ')}, keys: [\n${clip.keys.map(k => '      ' + fmtKey(k)).join(',\n')}\n    ]}`;
}

// [start, end) of the value of `key:` in `var TABLE = {`, or the table's closing brace.
function locate(src, table, key) {
  const m = new RegExp(`(?:var|let|const) ${table} = \\{`).exec(src);
  if (!m) throw new Error(`${table} not found in smb-figure-rig.js`);
  const open = m.index + m[0].length - 1;
  const re = new RegExp(`^\\s*${key}\\s*:\\s*`);
  let valStart = -1, close = -1;
  scan(src, open, (i, depth, c) => {
    if (c === '}' && depth === 1) { close = i; return true; }
    if (depth === 1 && src[i - 1] === '\n') {
      const mm = re.exec(src.slice(i, src.indexOf('\n', i) + 1));
      if (mm) { valStart = i + mm[0].length; return true; }
    }
    return false;
  });
  if (valStart < 0) return { close };
  let end = -1;
  scan(src, valStart, (i, depth, c) => {
    if ((c === ',' || c === '}') && depth === 0) { end = i; return true; }
    return false;
  });
  if (end < 0) throw new Error(`could not find the end of ${table}.${key}`);
  let e = end;
  while (/\s/.test(src[e - 1])) e--;
  return { valStart, valEnd: e };
}

function append(src, table, key, text) {
  const { close } = locate(src, table, key);
  let p = close;
  while (/\s/.test(src[p - 1])) p--;
  const comma = src[p - 1] === ',' || src[p - 1] === '{' ? '' : ',';
  return src.slice(0, p) + comma + `\n    ${key}: ${text}` + src.slice(p);
}

// Pose: change only the channels whose value differs from what the file evaluates to.
function patchPose(src, name, pose) {
  const loc = locate(src, 'POSES', name);
  if (loc.valStart === undefined) return { src: append(src, 'POSES', name, fmtPose(pose)), note: 'new' };
  const val = src.slice(loc.valStart, loc.valEnd);
  const ob = val.indexOf('{'), cb = val.lastIndexOf('}');
  if (ob < 0 || cb < 0) throw new Error(`pose ${name} is not a P({...}) literal`);
  const obj = val.slice(ob, cb + 1);
  const edits = {};
  const have = {};
  for (const f of fields(obj)) have[f.name] = evalExpr(obj.slice(f.start, f.end));
  for (const k of CH) {
    const want = pose[k];
    if (typeof want !== 'number' || !isFinite(want)) { if (k in have) edits[k] = null; continue; }
    if (k in have && Math.abs(have[k] - want) < 1e-9) continue;
    edits[k] = fmtChannel(k, want);
  }
  if (!Object.keys(edits).length) return { src, note: null };
  const next = val.slice(0, ob) + editObject(obj, edits) + val.slice(cb + 1);
  return { src: src.slice(0, loc.valStart) + next + src.slice(loc.valEnd), note: Object.keys(edits).join(', ') };
}

// Clip: header fields and per-key fields in place when the key count is unchanged.
function patchClip(src, name, clip) {
  const loc = locate(src, 'CLIPS', name);
  if (loc.valStart === undefined) return { src: append(src, 'CLIPS', name, fmtClip(clip)), note: 'new' };
  const val = src.slice(loc.valStart, loc.valEnd);
  const old = Function('"use strict"; return (' + val + ');')();
  if (!old.keys || old.keys.length !== clip.keys.length) {
    return { src: src.slice(0, loc.valStart) + fmtClip(clip) + src.slice(loc.valEnd),
      note: 'rewritten' + (/\/\//.test(val) ? ' (inner comments dropped)' : '') };
  }
  // Key objects: depth-2 '{' inside the keys array, in order.
  const keySpans = [];
  const kStart = val.indexOf('[', val.search(/\bkeys\s*:/));
  scan(val, kStart, (i, depth, c) => {
    if (c === '{' && depth === 2) keySpans.push([i]);
    if (c === '}' && depth === 2) keySpans[keySpans.length - 1].push(i + 1);
    if (c === ']' && depth === 1) return true;
    return false;
  });
  if (keySpans.length !== clip.keys.length) throw new Error(`clip ${name}: could not read its keys`);
  let text = val;
  const notes = [];
  for (let i = keySpans.length - 1; i >= 0; i--) {
    const [a, b] = keySpans[i];
    const o = old.keys[i], n = clip.keys[i], ed = {};
    if (Math.round(n.t) !== o.t) ed.t = String(Math.round(n.t));
    if (n.pose !== o.pose) ed.pose = `'${n.pose}'`;
    if ((n.ease || null) !== (o.ease || null)) ed.ease = n.ease ? `'${n.ease}'` : null;
    if (Object.keys(ed).length) { text = text.slice(0, a) + editObject(text.slice(a, b), ed) + text.slice(b); notes.push(`key ${i}`); }
  }
  const hed = {};
  if (Math.round(clip.dur) !== old.dur) hed.dur = String(Math.round(clip.dur));
  if (!!clip.loop !== !!old.loop) hed.loop = String(!!clip.loop);
  if (!!clip.hold !== !!old.hold) hed.hold = clip.hold ? 'true' : null;
  if (Object.keys(hed).length) { text = editObject(text, hed); notes.push(Object.keys(hed).join(', ')); }
  if (text === val) return { src, note: null };
  return { src: src.slice(0, loc.valStart) + text + src.slice(loc.valEnd), note: notes.join(', ') };
}

function loadRig(src) {
  const win = {};
  vm.runInNewContext(src, { window: win, Math }, { filename: 'smb-figure-rig.js', timeout: 2000 });
  if (!win.FigureRig) throw new Error('FigureRig did not load');
  return win.FigureRig;
}

const NAME = /^[A-Za-z_$][\w$]*$/;

// poses: { name: {channel: value} }, clips: { name: {loop, hold, dur, keys:[{t,pose,ease}]} }
function saveRig({ poses = {}, clips = {} } = {}) {
  const orig = fs.readFileSync(F_RIG, 'utf8');
  let src = orig;
  const changed = [];
  for (const [name, pose] of Object.entries(poses)) {
    if (!NAME.test(name) || name.startsWith('__wb')) throw new Error(`bad pose name ${name}`);
    const r = patchPose(src, name, pose);
    src = r.src;
    if (r.note) changed.push(`pose ${name}: ${r.note}`);
  }
  const posesAfter = loadRig(src).POSES;
  for (const [name, clip] of Object.entries(clips)) {
    if (!NAME.test(name) || name.startsWith('__wb')) throw new Error(`bad clip name ${name}`);
    if (!Array.isArray(clip.keys) || !clip.keys.length) throw new Error(`clip ${name} has no keys`);
    for (const k of clip.keys) if (!posesAfter[k.pose]) throw new Error(`clip ${name} uses pose '${k.pose}', which is not saved`);
    const r = patchClip(src, name, clip);
    src = r.src;
    if (r.note) changed.push(`clip ${name}: ${r.note}`);
  }
  if (src === orig) return { changed: [] };

  const rig = loadRig(src);
  const bad = [];
  for (const [name, pose] of Object.entries(poses)) {
    for (const k of CH) {
      const want = pose[k], got = rig.POSES[name] && rig.POSES[name][k];
      if (typeof want === 'number' && !(Math.abs(want - got) < 0.0006)) bad.push(`${name}.${k} ${want} != ${got}`);
    }
  }
  for (const [name, clip] of Object.entries(clips)) {
    const got = rig.CLIPS[name];
    const same = got && got.dur === Math.round(clip.dur) && !!got.loop === !!clip.loop && !!got.hold === !!clip.hold &&
      got.keys.length === clip.keys.length &&
      got.keys.every((k, i) => k.t === Math.round(clip.keys[i].t) && k.pose === clip.keys[i].pose && (k.ease || null) === (clip.keys[i].ease || null));
    if (!same) bad.push(`clip ${name}`);
  }
  if (bad.length) throw new Error('round-trip check failed, file left unchanged: ' + bad.slice(0, 4).join('; '));
  fs.writeFileSync(F_RIG, src);
  return { changed };
}

module.exports = { saveRig, fmtPose, fmtClip, fmtChannel, editObject, fields, F_RIG, CH };
