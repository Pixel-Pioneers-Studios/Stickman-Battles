'use strict';
// Realm studio save (DEV ONLY): writes one edited room back into REALM_DEFS in js/smb-realm.js.
// The room's object literal is replaced whole, so comments inside that one room are lost; everything
// outside it (other rooms, other realms, REALM_STORY, code) is untouched.

const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '../../js/smb-realm.js');

// Index just past the brace that closes the one opening at `open` (string- and comment-aware).
function matchBrace(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 1; continue; }
    if (c === '\'' || c === '"' || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
      continue;
    }
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') { depth--; if (depth === 0) return i + 1; }
  }
  throw new Error('unbalanced braces');
}

function lit(v) {
  if (typeof v === 'string') return '\'' + v.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/\n/g, '\\n') + '\'';
  if (typeof v === 'number') return String(Math.round(v * 1000) / 1000);
  if (typeof v === 'boolean' || v === null) return String(v);
  if (Array.isArray(v)) return '[' + v.map(lit).join(', ') + ']';
  const keys = Object.keys(v).filter(k => v[k] !== undefined);
  return '{ ' + keys.map(k => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : lit(k)) + ': ' + lit(v[k])).join(', ') + ' }';
}

// The room as source, in the file's style: header fields on one line, one line per part list.
const HEAD = ['name', 'gx', 'gy', 'w', 'back', 'wall', 'dark', 'stone'];
function roomSource(key, room, ind) {
  const pad = ' '.repeat(ind), in2 = pad + '  ', in3 = in2 + '  ';
  const head = HEAD.filter(k => room[k] !== undefined).map(k => k + ': ' + lit(room[k])).join(', ');
  const lines = [pad + key + ': {', in2 + head + ','];
  for (const k of Object.keys(room)) {
    if (HEAD.includes(k) || room[k] === undefined) continue;
    const v = room[k];
    if (Array.isArray(v) && v.length && v.some(x => x && typeof x === 'object' && !Array.isArray(x)) &&
        lit(v).length > 100) {
      lines.push(in2 + k + ': [');
      v.forEach(x => lines.push(in3 + lit(x) + ','));
      lines.push(in2 + '],');
    } else {
      lines.push(in2 + k + ': ' + lit(v) + ',');
    }
  }
  lines.push(pad + '}');
  return lines.join('\n');
}

function saveRoom(realmKey, roomKey, room) {
  if (!/^\w+$/.test(realmKey) || !/^\w+$/.test(roomKey)) throw new Error('bad key');
  let src = fs.readFileSync(FILE, 'utf8');
  const defsAt = src.indexOf('const REALM_DEFS = {');
  if (defsAt < 0) throw new Error('REALM_DEFS not found');
  const defsEnd = matchBrace(src, src.indexOf('{', defsAt));
  const realmRe = new RegExp('\\n  ' + realmKey + ': \\{', 'g');
  realmRe.lastIndex = defsAt;
  const rm = realmRe.exec(src);
  if (!rm || rm.index > defsEnd) throw new Error('realm ' + realmKey + ' not found');
  const realmOpen = rm.index + rm[0].length - 1;
  const realmEnd = matchBrace(src, realmOpen);
  const roomsAt = src.indexOf('rooms: {', realmOpen);
  if (roomsAt < 0 || roomsAt > realmEnd) throw new Error('rooms of ' + realmKey + ' not found');
  const roomRe = new RegExp('\\n( +)' + roomKey + ': \\{', 'g');
  roomRe.lastIndex = roomsAt;
  const m = roomRe.exec(src);
  let text = roomSource(roomKey, room, 6);
  if (m && m.index < realmEnd) {
    const start = m.index + 1, open = m.index + m[0].length - 1;
    const end = matchBrace(src, open);
    text = roomSource(roomKey, room, m[1].length);
    src = src.slice(0, start) + text + src.slice(end);
  } else {
    // A new room goes at the end of the realm's rooms block.
    const roomsEnd = matchBrace(src, src.indexOf('{', roomsAt));
    const close = src.lastIndexOf('}', roomsEnd - 1);
    const lineStart = src.lastIndexOf('\n', close) + 1;
    src = src.slice(0, lineStart) + text + ',\n' + src.slice(lineStart);
  }
  fs.writeFileSync(FILE, src);
  return { ok: true, file: 'js/smb-realm.js', realm: realmKey, room: roomKey, isNew: !m };
}

module.exports = { saveRoom, roomSource, matchBrace };
