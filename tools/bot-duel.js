'use strict';
/* global BalanceSim, HumanProxy */
/*
 * tools/bot-duel.js — how does a stock bot hold up against a human? DEV ONLY.
 *
 * Runs 3-stock versus duels in BalanceSim (tools/class-balance.js): the
 * calibrated human proxy (tools/human-proxy.js, v4 params) against one stock
 * bot, on the `ledge` arena so ring-outs count. Defaults reproduce the Fight
 * Ladder's Champion: an expert katana Ronin against a sword Warrior.
 *
 * Besides who won, it reports what the bot DID, which is what a player reads:
 * time with the guard up, damage per landed hit, Q and E casts, how long it
 * stood free and idle inside reach, deaths by ring-out, and how long it took
 * to act after a stun let go.
 *
 * Usage:
 *   node tools/bot-duel.js [--n=24] [--diff=expert] [--bot=ronin] [--botw=katana]
 *                          [--me=warrior] [--mew=sword] [--arena=ledge] [--port=8104]
 *                          [--vs=sov]   Sovereign plays the human's side (a strong attacker)
 *                          [--vs=bot]   another stock bot plays it (bot against bot)
 *                          --arena also takes any real arena key, e.g. colosseum
 *                          [--off=guard,recover]   switch BOT_TACTICS dials off for an A/B
 *                          [--tune=0.2,10,70]   the bot's _btTune: skill, think, hesitate (as a ladder rung sets it)
 *                          [--mehp=1.5]   the proxy's max HP multiplier (a ladder rung's p1HpMul)
 *                          [--params=file.json]   proxy params instead of human-proxy-params-v4.json
 */
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const N = parseInt(args.n, 10) || 24, PORT = parseInt(args.port, 10) || 8104;
const O = { diff: String(args.diff || 'expert'), bot: String(args.bot || 'ronin'), botw: String(args.botw || 'katana'),
  me: String(args.me || 'warrior'), mew: String(args.mew || 'sword'), arena: String(args.arena || 'ledge'),
  vs: String(args.vs || 'proxy'), off: args.off ? String(args.off).split(',') : [],
  tune: args.tune ? (([skill, think, hesitate]) => ({ skill, think, hesitate }))(String(args.tune).split(',').map(Number)) : null };
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
  await page.addScriptTag({ path: path.join(__dirname, 'human-proxy.js') });
  const params = JSON.parse(fs.readFileSync(args.params ? path.resolve(String(args.params)) : path.join(__dirname, 'human-proxy-params-v4.json'), 'utf8'));

  const r = await page.evaluate((N, O, params, args) => {
    const S = { n: 0, meWins: 0, botWins: 0, timeouts: 0, stocksMe: 0, stocksBot: 0, frames: 0, live: 0,
      shield: 0, reach: 0, idleReach: 0, air: 0, botHits: 0, botDmg: 0, meHits: 0, meDmg: 0, q: 0, e: 0,
      ring: 0, botDeaths: 0, gaps: [], tac: 0, errs: [] };
    for (const k of O.off) BOT_TACTICS[k] = false;
    const seen = new WeakSet();
    let me = null, bot = null, pMe = 0, pBot = 0, wasLock = false, gap = -1;
    const up = Fighter.prototype.update, ab = Fighter.prototype.ability, su = Fighter.prototype.useSuper;
    Fighter.prototype.ability = function () {
      const c0 = this.abilityCooldown || 0; const out = ab.apply(this, arguments);
      if (this === bot && (this.abilityCooldown || 0) > c0) S.q++;
      return out;
    };
    Fighter.prototype.useSuper = function () {
      const m0 = this.superMeter; const out = su.apply(this, arguments);
      if (this === bot && this.superMeter < m0 - 40) S.e++;
      return out;
    };
    Fighter.prototype.update = function () {
      if (!seen.has(this)) {
        seen.add(this);
        if (this.color === '#00d4ff') {
          // The proxy plays this side: its own controller, and no bot tactics.
          if (args.mehp) { this.maxHealth = Math.round(this.maxHealth * Number(args.mehp)); this.health = this.maxHealth; }
          me = this; pMe = this.health;
          if (O.vs === 'proxy') {
            this._botIQ = 0; this.updateAI = HumanProxy.controller(params);
            this.aiTickInterval = 1; this._noWhiffGuard = true;
          }
        } else { bot = this; pBot = this.health; wasLock = false; gap = -1; if (O.tune) this._btTune = O.tune; }
      }
      const out = up.apply(this, arguments);
      if (this === bot && me && bot.health > 0 && me.health > 0) {
        S.live++;
        if (typeof botTacSkill === 'function' && botTacSkill(bot)) S.tac++;
        if (bot.shielding) S.shield++;
        if (!bot.onGround) S.air++;
        const lock = bot.stunTimer > 0 || bot.ragdollTimer > 0;
        const busy = lock || bot.attackTimer > 0 || bot.attackEndlag > 0 || bot.shielding ||
                     (typeof MoveScene !== 'undefined' && MoveScene.isBusy(bot));
        if (Math.abs(bot.cx() - me.cx()) < 110 && Math.abs(bot.y - me.y) < 60) { S.reach++; if (!busy && bot.onGround) S.idleReach++; }
        // Frames from a stun letting go to the bot's next swing, guard or cast.
        if (wasLock && !lock) gap = 0;
        else if (gap >= 0) {
          if (lock) gap = -1;
          else if (busy) { S.gaps.push(gap); gap = -1; }
          else if (++gap > 180) { S.gaps.push(180); gap = -1; }
        }
        wasLock = lock;
      }
      if (this === bot || this === me) {
        if (me && me.health < pMe) { S.botHits++; S.botDmg += pMe - me.health; }
        if (bot && bot.health < pBot) {
          S.meHits++; S.meDmg += pBot - bot.health;
          if (bot.health <= 0) { S.botDeaths++; if (bot.y + bot.h > 480 || bot.cx() < 150 || bot.cx() > 750) S.ring++; }
        }
        if (me) pMe = me.health; if (bot) pBot = bot.health;
      }
      return out;
    };
    for (let i = 0; i < N; i++) {
      me = null; bot = null;
      const m = BalanceSim.runMatch(O.me, O.bot, 1000 + i * 7919, { stocks: 3, diff: O.diff, arena: O.arena, swap: i % 2 === 1,
        wA: O.mew, wB: O.botw, brain: 'fighter', brainA: O.vs === 'sov' ? 'sovereign' : 'fighter', maxFrames: 14400 });
      S.n++; S.frames += m.frames; S.stocksMe += m.deathsB; S.stocksBot += m.deathsA;
      if (m.timeout) S.timeouts++; else if (m.stockDiff > 0) S.meWins++; else if (m.stockDiff < 0) S.botWins++;
      if (m.err && S.errs.length < 3) S.errs.push(m.err);
    }
    Fighter.prototype.update = up; Fighter.prototype.ability = ab; Fighter.prototype.useSuper = su;
    return S;
  }, N, O, params, args);

  const pc = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '-';
  const g = r.gaps.slice().sort((a, b) => a - b), med = g.length ? g[g.length >> 1] : 0;
  console.log(`${O.diff} ${O.bot}/${O.botw} bot vs ${O.vs} ${O.me}/${O.mew}, ${r.n} matches on ${O.arena}` + (O.off.length ? '  [off: ' + O.off.join(',') + ']' : '') + (O.tune ? '  [tune: ' + args.tune + ']' : '') + (args.mehp ? '  [mehp: ' + args.mehp + ']' : '') + (args.params ? '  [params: ' + path.basename(String(args.params)) + ']' : ''));
  console.log(`  proxy wins ${r.meWins}  bot wins ${r.botWins}  timeouts ${r.timeouts}   stocks taken: proxy ${r.stocksMe}, bot ${r.stocksBot}   avg ${(r.frames / r.n / 60).toFixed(0)}s`);
  console.log(`  tactics layer active ${pc(r.tac, r.live)} of bot frames`);
  console.log(`  bot guard up ${pc(r.shield, r.live)}   airborne ${pc(r.air, r.live)}   in reach ${pc(r.reach, r.live)}, of that free and idle ${pc(r.idleReach, r.reach)}`);
  console.log(`  bot: ${r.botHits} hits, ${(r.botDmg / Math.max(1, r.botHits)).toFixed(1)} dmg each; Q casts ${(r.q / r.n).toFixed(1)}/match, E casts ${(r.e / r.n).toFixed(1)}/match`);
  console.log(`  proxy: ${r.meHits} hits, ${(r.meDmg / Math.max(1, r.meHits)).toFixed(1)} dmg each`);
  console.log(`  bot deaths ${r.botDeaths}, by ring-out ${r.ring} (${pc(r.ring, r.botDeaths)})`);
  console.log(`  after a stun: median ${med}f to act, ${pc(g.filter(x => x >= 30).length, g.length)} took 30f or more (n=${g.length})`);
  if (r.errs.length || errs.length) console.log('  errors:', r.errs.concat(errs.slice(0, 3)).join(' | '));
  if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(Object.assign({ opts: O }, r)));
  await browser.close(); server.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
