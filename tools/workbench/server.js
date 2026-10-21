'use strict';
// Weapon workbench dev server (DEV ONLY, never shipped).
//
//   node tools/workbench/server.js [--port=8140] [--no-open]
//   open http://localhost:8140/index.html
//
// Serves the repo like any static server, but injects tools/workbench/panel.js into
// index.html, so the workbench runs on the real game. The panel edits weapons live and
// Save writes the changes back into the game's source tables (see source-patch.js).
//
// Art: edit tools/weapon-sprites/defs-ornate.js (or parts-ornate.js) in your editor.
// The server watches both files and the panel re-renders the open weapon's sprite on
// save, previewed in hand. "Ship art" writes images/weapons/<key>.png and re-fits the
// sprite def so the blade's reach stays where it was.

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFile } = require('child_process');
const SP = require('./source-patch');
const RP = require('./rig-patch');

const ROOT = path.resolve(__dirname, '../..');
const RENDER = path.join(ROOT, 'tools/weapon-sprites/render.js');
const ART_FILES = ['defs-ornate.js', 'parts-ornate.js'].map(f => path.join(ROOT, 'tools/weapon-sprites', f));
const CACHE = path.join(os.tmpdir(), 'smb-workbench-art');
// Figure studio: the rig and the scene specs reload in the page when saved.
const RIG_FILE = path.join(ROOT, 'js/smb-figure-rig.js');
const SCENE_DIR = path.join(ROOT, 'js/story/scenes');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4' };

function ornateKeys() {
  const p = require.resolve('../weapon-sprites/defs-ornate');
  delete require.cache[p];
  delete require.cache[require.resolve('../weapon-sprites/parts-ornate')];
  return Object.keys(require(p));
}

// Renders one ornate def to CACHE via the existing render.js, returns its measured fit.
function renderArt(key) {
  return new Promise((resolve, reject) => {
    if (!ornateKeys().includes(key)) return reject(new Error(`${key} has no ornate SVG def (tools/weapon-sprites/defs-ornate.js)`));
    fs.mkdirSync(CACHE, { recursive: true });
    execFile(process.execPath, [RENDER, '--ornate', '--out', CACHE, key], { cwd: ROOT, timeout: 60000 }, (err, out, errOut) => {
      if (err) return reject(new Error((errOut || err.message).trim().split('\n').slice(-3).join(' ')));
      const m = /anchor: ([\d.]+), shaftY: ([\d.]+) \/ (\d+) \},\s*\/\/ (\d+)x(\d+)/.exec(out);
      if (!m) return reject(new Error('render.js output not understood: ' + out.trim()));
      const file = path.join(CACHE, key + '.png');
      resolve({ file, anchor: +m[1], shaftPx: +m[2], h: +m[3], w: +m[4],
        shaftY: +m[2] / +m[3], png: fs.readFileSync(file).toString('base64') });
    });
  });
}

function readBody(rq) {
  return new Promise((res, rej) => {
    let s = '';
    rq.on('data', c => { s += c; if (s.length > 2e6) rq.destroy(); });
    rq.on('end', () => { try { res(s ? JSON.parse(s) : {}); } catch (e) { rej(e); } });
  });
}

const sseClients = new Set();
function broadcast(ev, data) {
  for (const rs of sseClients) rs.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`);
}

// Directories are watched rather than files: an editor that saves by replacing the
// file would leave a file watch attached to the old one.
function watchArt() {
  // Editors save in several writes; one event per file per quiet period.
  const timers = {};
  const later = (key, ev, data) => { clearTimeout(timers[key]); timers[key] = setTimeout(() => broadcast(ev, data), 150); };
  const artNames = ART_FILES.map(f => path.basename(f));
  fs.watch(path.dirname(ART_FILES[0]), (_e, name) => { if (artNames.includes(name)) later('art', 'art', { file: name }); });
  fs.watch(path.dirname(RIG_FILE), (_e, name) => { if (name === path.basename(RIG_FILE)) later('rig', 'rig', { src: 'js/smb-figure-rig.js' }); });
  if (fs.existsSync(SCENE_DIR)) fs.watch(SCENE_DIR, (_e, name) => {
    if (name && name.endsWith('.js')) later('scene:' + name, 'scene', { src: 'js/story/scenes/' + name });
  });
}

async function api(rq, rs, url) {
  const send = (code, obj) => { rs.writeHead(code, { 'Content-Type': 'application/json' }); rs.end(JSON.stringify(obj)); };
  try {
    if (url.pathname === '/wb/ping') return send(200, { ok: true, root: ROOT });
    if (url.pathname === '/wb/events') {
      rs.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      rs.write('event: hello\ndata: {}\n\n');
      sseClients.add(rs);
      rq.on('close', () => sseClients.delete(rs));
      return;
    }
    if (url.pathname === '/wb/source') return send(200, SP.readSource(url.searchParams.get('key')));
    if (url.pathname === '/wb/art/keys') return send(200, ornateKeys());
    if (rq.method !== 'POST') return send(404, { error: 'unknown endpoint' });

    const b = await readBody(rq);
    if (url.pathname === '/wb/rig/save') {
      const r = RP.saveRig({ poses: b.poses || {}, clips: b.clips || {} });
      console.log('[workbench] rig saved', JSON.stringify(r.changed));
      return send(200, r);
    }
    if (!b.key || !/^[a-z0-9_]+$/i.test(b.key)) return send(400, { error: 'bad key' });

    if (url.pathname === '/wb/save') {
      const out = {};
      if (b.stats)  out.stats  = SP.saveStats(b.key, b.stats);
      if (b.swing)  out.swing  = SP.saveSwing(b.key, b.swing);
      if (b.sprite) out.sprite = SP.saveSprite(b.key, b.sprite, b.sprite.imgH);
      if (b.edge)   out.edge   = SP.saveEdgeProfile(b.key, b.edge);
      console.log('[workbench] saved', b.key, JSON.stringify(out));
      return send(200, out);
    }
    if (url.pathname === '/wb/art/preview') {
      const r = await renderArt(b.key);
      return send(200, { anchor: r.anchor, shaftY: r.shaftY, w: r.w, h: r.h, png: r.png });
    }
    if (url.pathname === '/wb/art/ship') {
      // Re-render rather than trusting a stale preview, then keep the reach in front of
      // the hand (len * (1 - anchor)) unchanged, since melee hit reach is derived from it.
      const r = await renderArt(b.key);
      const reach = b.len * (1 - b.anchor);
      const len = Math.round(reach / (1 - r.anchor) * 10) / 10;
      fs.copyFileSync(r.file, path.join(ROOT, 'images/weapons', b.key + '.png'));
      const sprite = SP.saveSprite(b.key, { len, anchor: r.anchor, shaftY: r.shaftY }, r.h);
      const ver = SP.bumpSpriteVer();
      console.log('[workbench] shipped art', b.key, JSON.stringify(sprite), 'WEAPON_SPRITE_VER', ver);
      return send(200, { len, anchor: r.anchor, shaftY: r.shaftY, h: r.h, sprite, ver,
        note: sprite.error ? 'PNG written, but no WEAPON_SPRITE_DEFS line exists for this key. Add one by hand.' : null });
    }
    return send(404, { error: 'unknown endpoint' });
  } catch (e) {
    console.error('[workbench]', e.message);
    return send(500, { error: e.message });
  }
}

const PANEL_TAG = '\n<script src="./tools/workbench/panel.js"></script>\n<script src="./tools/workbench/figures.js"></script>\n';

function start({ port = 8140, quiet = false } = {}) {
  const server = http.createServer((rq, rs) => {
    const url = new URL(rq.url, 'http://x');
    if (url.pathname.startsWith('/wb/')) return api(rq, rs, url);
    let p = decodeURIComponent(url.pathname);
    if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rs.writeHead(404); rs.end(); return; }
    const head = { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' };
    if (p === '/index.html') {
      const html = fs.readFileSync(fp, 'utf8').replace(/<\/body>(?![\s\S]*<\/body>)/, PANEL_TAG + '</body>');
      rs.writeHead(200, head); rs.end(html); return;
    }
    rs.writeHead(200, head);
    fs.createReadStream(fp).pipe(rs);
  });
  return new Promise((res, rej) => {
    server.on('error', rej);
    server.listen(port, () => {
      watchArt();
      if (!quiet) {
        console.log(`[workbench] weapons: http://localhost:${port}/index.html`);
        console.log(`[workbench] figures: http://localhost:${port}/index.html?wb=figures`);
      }
      res(server);
    });
  });
}

module.exports = { start, renderArt };

if (require.main === module) {
  const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
  const port = parseInt(args.port, 10) || 8140;
  start({ port }).then(() => {
    if (!args['no-open'] && process.platform === 'darwin') execFile('open', [`http://localhost:${port}/index.html`]);
  }).catch(e => { console.error(e.message); process.exit(1); });
}
