'use strict';
/* global HumanProxy */
/*
 * tools/br-duel.js — how hard is a Battle Royale bot to beat, one on one? (DEV ONLY)
 *
 * Loads the real game page headless and runs single-life duels on a flat floor:
 * the calibrated human proxy (tools/human-proxy.js + human-proxy-params-v4.json)
 * against ONE bot configured exactly the way _brSpawnBots() configures the field
 * (difficulty tier, aiTickInterval 6, no class, one life, domains suppressed).
 * Both fighters hold the same weapon so the result measures the BRAIN, not loot.
 *
 * The number that matters for a Battle Royale is not win rate alone. The player
 * has one life for the whole match, so the real cost of a fight is how much of
 * that life the win took: `hpLost` (fraction of the proxy's health spent per
 * duel) and `killsPerLife` (1 / hpLost, how many such fights one life buys).
 *
 * Usage:
 *   node tools/br-duel.js [--n=12] [--tiers=easy,medium,hard,expert,sov]
 *                         [--weapons=combat,sword,axe,katana] [--port=8101]
 *
 * `sov` is a reference arm: SovereignMK2 in the same slot, i.e. what a genuinely
 * good brain does with the same kit.
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/);
  return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const N       = parseInt(args.n, 10) || 12;
const TIERS   = String(args.tiers || 'easy,medium,hard,expert,sov').split(',');
const WEAPONS_ = String(args.weapons || 'combat,sword,axe,katana').split(',');
const PORT    = parseInt(args.port, 10) || 8101;
const SEED    = parseInt(args.seed, 10) || 1;
// --a=<tier>: put a brain in the player's slot instead of the human proxy, for
// head-to-head brain comparisons (win rate is then A's).
const A_TIER  = args.a || null;

const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const fp = path.join(ROOT, p);
      if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
        res.writeHead(404); res.end('not found'); return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' });
      fs.createReadStream(fp).pipe(res);
    });
    server.listen(PORT, () => resolve(server));
  });
}

(async () => {
  let puppeteer;
  try { puppeteer = require(path.join(ROOT, 'node_modules', 'puppeteer')); }
  catch { puppeteer = require('/tmp/node_modules/puppeteer'); }
  const server  = await startServer();
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--mute-audio'] });
  const page    = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => typeof Fighter !== 'undefined' && typeof SovereignMK2 !== 'undefined', { timeout: 60000 });
  await page.addScriptTag({ path: path.join(__dirname, 'human-proxy.js') });
  const params = JSON.parse(fs.readFileSync(path.join(__dirname, 'human-proxy-params-v4.json'), 'utf8'));

  if (args.order === 'ba') await page.evaluate(() => { window.__ORDER_BA_FLAG = true; });
  const rows = [];
  for (const w of WEAPONS_) for (const tier of TIERS) {
    const r = await page.evaluate((tier, w, N, params, seed, aTier) => {
      // Deterministic RNG for the whole run so arms are comparable.
      let s = (seed * 2654435761 + tier.length * 97 + w.length * 13) >>> 0;
      const _rand = Math.random;
      Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      window.__orderBA = !!window.__ORDER_BA_FLAG;
      const noop = () => {};
      window.spawnParticles = noop; window.showBossDialogue = noop;
      if (typeof spawnBullet !== 'undefined') window.spawnBullet = noop;
      window.unlockAchievement = noop;
      window.isCombatLocked = () => false; window.isCutsceneActive = () => false;
      if (typeof SoundManager !== 'undefined') for (const k of Object.keys(SoundManager))
        if (typeof SoundManager[k] === 'function') SoundManager[k] = noop;

      const out = { tier, w, wins: 0, losses: 0, draws: 0, hpLost: 0, frames: 0,
                    botSwings: 0, botHits: 0, proxySwings: 0, proxyHits: 0, errs: [] };
      const origAtk = Fighter.prototype.attack;
      let proxy, bot;
      Fighter.prototype.attack = function (t) {
        const cd0 = this.cooldown;
        const r = origAtk.apply(this, arguments);
        if ((this.cooldown || 0) > 0 && !(cd0 > 0)) {
          if (this === bot) out.botSwings++; else if (this === proxy) out.proxySwings++;
        }
        return r;
      };

      for (let m = 0; m < N; m++) {
        currentArena = { id: 'sim', bgColor: '#000', worldWidth: 900,
          platforms: [{ x: 0, y: 460, w: 900, h: 60, isFloor: true }] };
        players.length = 0; minions.length = 0;
        if (typeof trainingDummies !== 'undefined') trainingDummies.length = 0;
        if (typeof projectiles !== 'undefined') projectiles.length = 0;
        hitStopFrames = 0; slowMotion = 1; isCinematic = false; activeCinematic = null;
        storyModeActive = false; gameRunning = true; gameMode = 'battleroyale'; onlineMode = false;
        trainingMode = false; brActive = true; brZoneLeft = 0; brZoneRight = 900;
        if (typeof settings !== 'undefined') { settings.finishers = false; settings.dmgNumbers = false; }
        try { if (typeof DomainManager !== 'undefined' && DomainManager.reset) DomainManager.reset(); } catch (e) {}

        const left = m % 2 === 0;
        const NOCTL = { left: null, right: null, jump: null, attack: null, ability: null, super: null };
        const makeBrain = (t, x, col) => {
          let b;
          if (t === 'sov') {
            b = new SovereignMK2(x, 380, col, w);
            b.isAI = true; b._loadoutLocked = true; b.weaponKey = w; b.weapon = WEAPONS[w];
          } else if (t === 'adaptive') {
            b = new AdaptiveAI(x, 380, col, w); b.isAI = true;
          } else if (typeof window.__makeBrain === 'function' && window.__makeBrain(t, x, col, w)) {
            b = window.__makeBrain(t, x, col, w);
          } else {
            b = new Fighter(x, 380, col, w, NOCTL, true, t);
            b.aiTickInterval = 6; b._brBot = true;
          }
          return b;
        };
        if (aTier) {
          proxy = makeBrain(aTier, left ? 250 : 650, '#4488ff');
        } else {
          proxy = new Fighter(left ? 250 : 650, 380, '#4488ff', w, NOCTL, true, 'expert');
          proxy.maxHealth = Math.round(proxy.maxHealth * (params.hpMult || 1)); proxy.health = proxy.maxHealth;
          proxy.updateAI = HumanProxy.controller(params);
          proxy.aiTickInterval = 1; proxy._noWhiffGuard = true;
        }
        proxy.name = 'A'; proxy.lives = 1; proxy._teamId = 'sim_p';
        bot = makeBrain(tier, left ? 650 : 250, '#ff4444');
        bot.lives = 1; bot._teamId = 'sim_b'; bot.name = 'BOT';
        proxy.target = bot; bot.target = proxy;
        players.push(proxy, bot);

        let php = proxy.health, bhp = bot.health, f;
        for (f = 0; f < 5400; f++) {
          hitStopFrames = 0; slowMotion = 1; aiTick = f; frameCount = f;
          try { if (typeof DomainManager !== 'undefined' && DomainManager.update) DomainManager.update(); } catch (e) {}
          try {
            if (typeof projectiles !== 'undefined') { projectiles.forEach(p => p.update()); projectiles = projectiles.filter(p => p.active); }
          } catch (e) {}
          // --order=ba updates the bot first (update order is a measured factor).
          const _first = window.__orderBA ? bot : proxy, _second = window.__orderBA ? proxy : bot;
          try { _first.update(); } catch (e) { if (out.errs.length < 3) out.errs.push('1:' + e.message); }
          try { _second.update(); } catch (e) { if (out.errs.length < 3) out.errs.push('2:' + e.message); }
          if (proxy.health < php) out.botHits++;
          if (bot.health < bhp) out.proxyHits++;
          php = proxy.health; bhp = bot.health;
          // Ring-out counts as a death, like the storm/void in BR.
          if (proxy.y > 900) proxy.health = 0;
          if (bot.y > 900) bot.health = 0;
          if (proxy.health <= 0 || bot.health <= 0) break;
        }
        out.frames += f;
        const lost = 1 - Math.max(0, proxy.health) / proxy.maxHealth;
        out.hpLost += lost;
        if (bot.health <= 0 && proxy.health > 0) out.wins++;
        else if (proxy.health <= 0) out.losses++;
        else out.draws++;
      }
      Fighter.prototype.attack = origAtk;
      Math.random = _rand;
      return out;
    }, tier, w, N, params, SEED, A_TIER);
    const hl = r.hpLost / N;
    const row = {
      weapon: w, tier,
      proxyWin: +(r.wins / N).toFixed(2),
      draw: +(r.draws / N).toFixed(2),
      hpLost: +hl.toFixed(3),
      killsPerLife: +(1 / Math.max(hl, 0.01)).toFixed(1),
      secs: +(r.frames / N / 60).toFixed(1),
      botHitRate: r.botSwings ? +(r.botHits / r.botSwings).toFixed(2) : 0,
      botSwingsPerSec: +(r.botSwings / (r.frames / 60)).toFixed(2),
      proxyHitRate: r.proxySwings ? +(r.proxyHits / r.proxySwings).toFixed(2) : 0,
      errs: r.errs.join(' | '),
    };
    rows.push(row);
    console.log(JSON.stringify(row));
  }
  if (errs.length) console.log('page errors:', errs.slice(0, 5));
  if (args.out) fs.writeFileSync(args.out, JSON.stringify(rows, null, 2));
  await browser.close(); server.close();
})();
