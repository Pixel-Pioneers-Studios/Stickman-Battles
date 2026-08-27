'use strict';
/* tools/sov-evolve.js — drive SMK2Trainer.evolvePanel headlessly (DEV ONLY)
 * Usage: node tools/sov-evolve.js [--gens=6] [--matches=2] [--pop=6] [--port=8120] */
const fs = require('fs'), path = require('path'), http = require('http');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true]; }));
const GENS = parseInt(args.gens, 10) || 6, MPG = parseInt(args.matches, 10) || 2;
const POP = parseInt(args.pop, 10) || 6, PORT = parseInt(args.port, 10) || 8120;
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json' };
function startServer() { return new Promise(res => {
  const s = http.createServer((req, rs) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rs.writeHead(404); rs.end('nf'); return; }
    rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(rs);
  }); s.listen(PORT, () => res(s)); }); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const server = await startServer();
  const opts = { headless: 'new', args: ['--no-sandbox','--disable-gpu','--mute-audio'] };
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chrome)) opts.executablePath = chrome;
  const browser = await puppeteer.launch(opts);
  const page = await browser.newPage();
  page.on('console', m => { const t = m.text(); if (/SMK2Trainer/.test(t)) console.log(t); });
  page.on('pageerror', e => console.log('[pageerror]', String(e && e.message || e)));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await sleep(2500);
  await page.evaluate(() => { try { backToHome(); } catch (e) {} });
  await page.evaluate((g, m, p) => { SMK2Trainer.evolvePanel(g, m, p); }, GENS, MPG, POP);
  await page.waitForFunction(() => !!window.__sovEvolveDone, { timeout: 3600000, polling: 2000 })
    .catch(() => console.log('[evolve] timed out waiting for completion'));
  const best = await page.evaluate(() => window.__sovEvolveBest || null);
  if (best) {
    fs.writeFileSync(path.join(ROOT, 'tools', 'sov-evolved-genome.json'), JSON.stringify(best, null, 1));
    console.log('\nwrote tools/sov-evolved-genome.json');
  }
  await browser.close(); server.close();
})();
