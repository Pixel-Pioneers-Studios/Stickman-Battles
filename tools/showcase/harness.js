'use strict';
// Frame-stepped capture harness for store art and the trailer.
//
// The game is driven by requestAnimationFrame and simulates one tick per call,
// so replacing rAF with a queue we drain by hand makes every frame exact and
// repeatable: a 4K screenshot can take as long as it likes and the game waits.
//
//   const h = await launch({ width: 3840, height: 2160 });
//   await h.manual();           // take over the loop
//   await h.step(30);           // advance 30 game frames
//   await h.shot('out.png');
//   await h.close();
const fs = require('fs'), path = require('path'), http = require('http');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };

function serve(port, overrides) {
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const fp = (overrides && overrides[p]) || path.join(ROOT, p);
      if (!fp.startsWith('/') || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(rsp);
    }).listen(port, () => res(s));
  });
}

// Runs in the page before any game script.
function _pageShim() {
  const realRaf = window.requestAnimationFrame.bind(window);
  window.__rafQ = [];
  window.__manual = false;
  window.__t = 0;
  window.requestAnimationFrame = function (cb) {
    if (window.__manual) { window.__rafQ.push(cb); return window.__rafQ.length; }
    return realRaf(cb);
  };
  window.__step = function (n) {
    for (let i = 0; i < n; i++) {
      window.__t += 1000 / 60;
      const q = window.__rafQ; window.__rafQ = [];
      for (const cb of q) { try { cb(window.__t); } catch (e) { console.error('frame error', e && e.message); } }
    }
  };
}

async function launch(opts = {}) {
  const width = opts.width || 1920, height = opts.height || 1080, port = opts.port || 8150;
  const server = await serve(port, opts.overrides);
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const lo = { headless: 'new', pipe: true, timeout: 120000, protocolTimeout: 600000,
    args: ['--no-sandbox', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] };
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chrome)) lo.executablePath = chrome;
  const browser = await puppeteer.launch(lo);
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /frame error/.test(m.text())) errors.push(m.text()); });
  await page.evaluateOnNewDocument(_pageShim);
  // offline: answer every non-local request (CDN SDKs, GSAP, PeerJS) with an
  // empty script, so a capture never waits on the network. Nothing a still
  // frame paints depends on them.
  if (opts.offline) {
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (req.url().startsWith(`http://localhost:${port}/`)) req.continue();
      else req.respond({ status: 200, contentType: 'text/javascript', body: '' });
    });
  }
  await page.goto(`http://localhost:${port}/index.html`, { waitUntil: 'load', timeout: 180000 });
  await new Promise(r => setTimeout(r, opts.settleMs || 3500));
  await page.evaluate(() => { try { skipTutorial(); } catch (e) {} });

  return {
    page, errors,
    eval: (fn, ...a) => page.evaluate(fn, ...a),
    // Switch the game loop onto the manual queue. Real rAF callbacks already in
    // flight re-register through the patched function on their next frame.
    manual: async () => {
      await page.evaluate(() => { window.__t = performance.now(); window.__manual = true; });
      await new Promise(r => setTimeout(r, 100));
    },
    step: n => page.evaluate(k => window.__step(k), n),
    shot: (file, clip) => page.screenshot({ path: file, type: 'png', clip }),
    close: async () => { await browser.close(); server.close(); },
  };
}

module.exports = { launch, ROOT };
