'use strict';
/* global BalanceSim */
/*
 * tools/bot-perch.js — how fast does a stock bot reach a player on another
 * platform? DEV ONLY.
 *
 * bot-duel.js fights on one floor, so it never sees the case a real arena is
 * made of: the player a level up or down. Here a passive stand-in is put on one
 * platform of a real arena after another, and the bot has to come to it. Each
 * time the bot is level with it and inside reach, the stand-in moves on.
 *
 * Reports, per kind of trip (up / down / same height), how long the bot took
 * and how often it never arrived, and how much of the time apart it spent
 * standing still.
 *
 * Usage:
 *   node tools/bot-perch.js [--n=6] [--diff=expert] [--bot=ronin] [--botw=katana]
 *                           [--arena=colosseum] [--cap=600] [--port=8105]
 *                           [--off=level]   switch BOT_TACTICS dials off for an A/B
 *                           [--trace]       print each trip
 *                           [--watch=2]     dump the bot's path on trips it never finished
 *                           [--ai]          the stand-in counts as a bot, not a person
 */
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const N = parseInt(args.n, 10) || 6, PORT = parseInt(args.port, 10) || 8105;
const O = { diff: String(args.diff || 'expert'), bot: String(args.bot || 'ronin'), botw: String(args.botw || 'katana'),
  arena: String(args.arena || 'colosseum'), cap: parseInt(args.cap, 10) || 600,
  watch: !!args.watch, ai: !!args.ai,
  off: args.off ? String(args.off).split(',') : [] };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

(async () => {
  const server = await new Promise(res => {
    const s = http.createServer((rq, rs) => {
      let p = decodeURIComponent(rq.url.split('?')[0]); if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { rs.writeHead(404); return rs.end(); }
      rs.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(rs);
    }).listen(PORT, () => res(s));
  });
  const puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer'));
  const lo = { headless: 'new', protocolTimeout: 900000, args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] };
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chrome)) lo.executablePath = chrome;
  const browser = await puppeteer.launch(lo);
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2500));
  await page.evaluate(() => { try { if (typeof backToHome === 'function') backToHome(); } catch (e) {} });
  const SIM = fs.readFileSync(path.join(ROOT, 'tools', 'class-balance.js'), 'utf8').match(/const SIM_SRC = `([\s\S]*?)\n`;/)[1];
  await page.addScriptTag({ content: SIM });

  const r = await page.evaluate((N, O) => {
    const S = { trips: [], apart: 0, still: 0, tac: 0, live: 0, botFalls: 0, errs: [] };
    for (const k of O.off) BOT_TACTICS[k] = false;
    const seen = new WeakSet();
    let me = null, bot = null, spots = [], si = 0, t0 = 0, from = null, fr = 0, rnd = null, pBotY = 0, cur = [];
    const up = Fighter.prototype.update;
    const place = () => {
      const s = spots[si % spots.length]; si++;
      from = { botFeet: bot.y + bot.h, botX: bot.cx() };
      me.x = s.x - me.w / 2; me.y = s.y - me.h; me.vx = 0; me.vy = 0; me._spot = s;
      t0 = fr; cur = [];
    };
    Fighter.prototype.update = function () {
      if (!seen.has(this)) {
        seen.add(this);
        if (this.color === '#00d4ff') { me = this; this._botIQ = 0; this.updateAI = function () {}; this.isAI = !!O.ai; }   // bots chase a person differently
        else bot = this;
        if (me && bot) {
          // Every platform is a perch; a wide one is two.
          spots = [];
          for (const pl of currentArena.platforms) {
            if (pl.isFloorDisabled || pl.isCeiling) continue;
            const a = Math.max(pl.x, 40), b = Math.min(pl.x + pl.w, 860);
            if (b - a > 500) spots.push({ x: a + (b - a) * 0.25, y: pl.y }, { x: a + (b - a) * 0.75, y: pl.y });
            else spots.push({ x: (a + b) / 2, y: pl.y });
          }
          for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
          si = 0; fr = 0; place();
        }
      }
      if (this === me && me._spot) {
        // A stand-in, not a fighter: it holds its perch and cannot be hurt.
        me.health = me.maxHealth; me.stunTimer = 0; me.ragdollTimer = 0; me.hurtTimer = 0;
        if (Math.abs(me.cx() - me._spot.x) > 30 || Math.abs(me.y + me.h - me._spot.y) > 30) {
          me.x = me._spot.x - me.w / 2; me.y = me._spot.y - me.h; me.vx = 0; me.vy = 0;
        }
      }
      const out = up.apply(this, arguments);
      if (this === bot && me && me._spot) {
        fr++; S.live++;
        bot.health = bot.maxHealth;
        if (typeof botTacSkill === 'function' && botTacSkill(bot)) S.tac++;
        const dy = Math.abs((bot.y + bot.h) - (me.y + me.h)), dx = Math.abs(bot.cx() - me.cx());
        if (dy > 45) { S.apart++; if (bot.onGround && Math.abs(bot.vx) < 0.6) S.still++; }
        const below = bot.y > (currentArena.deathY || 640) - 40;   // off the bottom of the arena
        if (below && !pBotY) S.botFalls++;
        pBotY = below ? 1 : 0;
        // A move scene can drag the stand-in to the bot; that is not an arrival.
        const home = Math.abs(me.cx() - me._spot.x) <= 30 && Math.abs(me.y + me.h - me._spot.y) <= 30;
        if (O.watch && fr % 10 === 0) cur.push([fr - t0, Math.round(bot.cx()), Math.round(bot.y + bot.h), +bot.vx.toFixed(1), +bot.vy.toFixed(1), bot.onGround ? 'G' : 'a',
          (bot._aiClimbSteer ? 'steer ' : '') + (bot._aiHop ? 'hop ' : '') + (bot._wanderTimer > 0 ? 'wander ' : '') + (bot._btNavFc >= frameCount - 1 ? (bot._btJump ? 'fly ' : 'nav ') : '') + ' ' + (bot._aiState || bot.aiState || '')].join(' '));
        const done = home && dy <= 45 && dx <= 110 && bot.onGround;
        if (done || fr - t0 >= O.cap) {
          const rise = from.botFeet - me._spot.y;
          S.trips.push({ log: done ? null : cur, spot: me._spot, kind: rise > 45 ? 'up' : rise < -45 ? 'down' : 'level', rise: Math.round(rise),
            dx: Math.round(Math.abs(from.botX - me._spot.x)), f: fr - t0, ok: done });
          place();
        }
      }
      return out;
    };
    for (let i = 0; i < N; i++) {
      me = null; bot = null;
      let s = (1000 + i * 7919) >>> 0; rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
      const m = BalanceSim.runMatch('warrior', O.bot, 1000 + i * 7919, { stocks: 3, diff: O.diff, arena: O.arena, swap: i % 2 === 1,
        wA: 'sword', wB: O.botw, brain: 'fighter', maxFrames: 7200 });
      if (m.err && S.errs.length < 3) S.errs.push(m.err);
    }
    Fighter.prototype.update = up;
    return S;
  }, N, O);

  const pc = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '-';
  console.log(`${O.diff} ${O.bot}/${O.botw} bot chasing a perched stand-in on ${O.arena}, ${N} runs of 2 min` + (O.off.length ? '  [off: ' + O.off.join(',') + ']' : ''));
  for (const kind of ['up', 'down', 'level']) {
    const t = r.trips.filter(x => x.kind === kind), ok = t.filter(x => x.ok).map(x => x.f).sort((a, b) => a - b);
    if (!t.length) continue;
    console.log(`  ${kind.padEnd(5)} ${String(t.length).padStart(3)} trips   arrived ${pc(ok.length, t.length).padStart(6)}   median ${ok.length ? (ok[ok.length >> 1] / 60).toFixed(1) : '-'}s   slowest ${ok.length ? (ok[ok.length - 1] / 60).toFixed(1) : '-'}s`);
  }
  console.log(`  trips completed ${r.trips.filter(x => x.ok).length} (${(r.trips.filter(x => x.ok).length / N).toFixed(1)} per run)`);
  console.log(`  apart in height ${pc(r.apart, r.live)} of the time; of that, standing still ${pc(r.still, r.apart)}`);
  console.log(`  tactics layer eligible ${pc(r.tac, r.live)}   bot falls ${r.botFalls}`);
  if (args.trace) for (const t of r.trips) console.log(`    ${t.kind.padEnd(5)} rise ${String(t.rise).padStart(4)}  dx ${String(t.dx).padStart(3)}  ${t.ok ? (t.f / 60).toFixed(1) + 's' : 'NEVER'}`);
  if (args.watch) for (const t of r.trips.filter(x => !x.ok).slice(0, parseInt(args.watch, 10) || 2)) {
    console.log(`  -- never arrived: ${t.kind} rise ${t.rise} dx ${t.dx}, stand-in at ${Math.round(t.spot.x)},${t.spot.y}  (frame x feet vx vy ground flags)`);
    for (const l of t.log) console.log('     ' + l);
  }
  if (r.errs.length || errs.length) console.log('  errors:', r.errs.concat(errs.slice(0, 3)).join(' | '));
  if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(Object.assign({ opts: O }, r)));
  await browser.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
