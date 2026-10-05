'use strict';
/*
 * tools/br-watch.js — watch a real Battle Royale match and log what the awake bots
 * are actually doing (DEV ONLY).
 *
 * The local player becomes an untargetable observer: godmode (so the duelling
 * brain's _acquireAITarget skips it) and hidden from BR's own foe scan for the
 * duration of _brUpdateBots. It is parked on the densest cluster of living bots,
 * so the camera — and therefore the set of bots that run a real brain — sits where
 * the fighting is. Everything else is the shipped game loop, frame-stepped.
 *
 * Usage: node tools/br-watch.js [--frames=21600] [--shots=dir] [--port=8151] [--seed=1]
 */
const fs = require('fs'), path = require('path');
const { launch } = require('./showcase/harness');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const FRAMES = parseInt(args.frames, 10) || 21600;
const SHOTS  = args.shots || null;
const SEED   = parseInt(args.seed, 10) || 1;

(async () => {
  const overrides = args.override ? { '/js/smb-battleroyale.js': path.resolve(args.override) } : undefined;
  const h = await launch({ width: 900, height: 520, port: parseInt(args.port, 10) || 8151, settleMs: 2500, overrides });
  await h.eval((seed) => {
    let s = seed >>> 0;
    Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, SEED);
  // startGame() runs a real-time transition (setTimeout), so the match has to go
  // live on the real clock before the loop is handed to the manual queue.
  await h.eval(() => { selectMode('battleroyale'); startGame(); });
  for (let i = 0; i < 100; i++) {
    if (await h.eval(() => brActive && gameRunning)) break;
    await new Promise(r => setTimeout(r, 100));
  }
  await h.manual();
  await h.step(30);
  // Jump when the plane is over the middle of the map.
  for (let i = 0; i < 200; i++) {
    const x = await h.eval(() => brPlaneX);
    if (x > 5500) break;
    await h.step(10);
  }
  await h.eval(() => { keysDown.add(' '); });
  await h.step(20);
  await h.eval(() => { keysDown.delete(' '); });
  await h.step(400);

  // ── Instrumentation ──────────────────────────────────────────────────────
  await h.eval(() => {
    const W = window.__watch = {
      samples: 0, nav: 0, navStuck: 0, fight: 0, fightIdle: 0, fightFar: 0, storm: 0,
      airborne: 0, shielding: 0,
      swings: 0, whiffs: 0, abilities: 0, supers: 0, hitsLanded: 0,
      deaths: { bot: 0, wildlife: 0, player: 0, env: 0, dormantEnv: 0, skirmish: 0 },
      fightTargets: { bot: 0, wildlife: 0, player: 0 },
      engagements: [], log: [],
    };
    const p1 = players[0];
    p1.godmode = true; p1.health = p1.maxHealth;
    const origUB = window._brUpdateBots;
    window._brUpdateBots = function () {
      const was = p1._brOnPlane; p1._brOnPlane = true;
      try { return origUB.apply(this, arguments); } finally { p1._brOnPlane = was; }
    };
    const reach = (f) => (f.weapon && f.weapon.range) || 60;
    const oa = Fighter.prototype.attack;
    Fighter.prototype.attack = function (t) {
      const cd0 = this.cooldown || 0;
      const r = oa.apply(this, arguments);
      if (this._brBot && !this._brSleep && cd0 <= 0 && (this.cooldown || 0) > 0) {
        W.swings++;
        const tg = this.target;
        if (!tg || !tg.cx || (tg.playerNum === -1 && tg.health === 999999) || Math.abs(tg.cx() - this.cx()) > reach(this) * 1.6 + 30 ||
            Math.abs(tg.cy() - this.cy()) > 110) W.whiffs++;
      }
      return r;
    };
    const ab = Fighter.prototype.ability;
    Fighter.prototype.ability = function () {
      const c0 = this.abilityCooldown || 0;
      const r = ab.apply(this, arguments);
      if (this._brBot && !this._brSleep && c0 <= 0 && (this.abilityCooldown || 0) > 0) W.abilities++;
      return r;
    };
    const us = Fighter.prototype.useSuper;
    if (us) Fighter.prototype.useSuper = function () {
      const r0 = this.superReady;
      const r = us.apply(this, arguments);
      if (this._brBot && r0 && !this.superReady) W.supers++;
      return r;
    };
    const oc = window._brCreditElimination;
    window._brCreditElimination = function (a, t) {
      if (t && !t._brKillCounted && !t._brWildlife) {
        if (!a && t._brFoe && t.__skStart !== undefined) { (W.sk = W.sk || []).push([frameCount - t.__skStart, t.__skHp]); }
        if (!a) W.deaths[t._brFoe ? 'skirmish' : t._brSleep ? 'dormantEnv' : 'env']++;
        else if (a._brWildlife) W.deaths.wildlife++;
        else if (a._brBot) W.deaths.bot++;
        else W.deaths.player++;
      }
      return oc.apply(this, arguments);
    };
  });

  if (args.static) await h.eval(() => { window.__static = true; });
  const t0 = Date.now();
  let shotN = 0, top10 = null, winner = null;
  for (let f = 0; f < FRAMES; f += 6) {
    await h.step(6);
    const st = await h.eval((f) => {
      const W = window.__watch, p1 = players[0];
      if (!brActive) return { over: true };
      const live = minions.filter(b => b._brBot && b.health > 0 && b._brLanded);
      // Park the observer on the densest cluster every 10 s.
      if (window.__static) { if (!W.anchor) W.anchor = { x: p1.x, y: p1.y }; p1.x = W.anchor.x; p1.y = W.anchor.y; p1.vx = p1.vy = 0; }
      else if (f % 600 === 0 || !W.focus || W.focus.health <= 0) {
        let best = null, bestN = -1;
        for (const b of live) {
          let n = 0; for (const o of live) if (Math.abs(o.cx() - b.cx()) < 1400 && Math.abs(o.cy() - b.cy()) < 500) n++;
          if (n > bestN) { bestN = n; best = b; }
        }
        W.focus = best;
      }
      if (W.focus && !window.__static) { p1.x = W.focus.cx() - 15; p1.y = W.focus.y - 160; p1.vx = p1.vy = 0; }
      p1.health = p1.maxHealth;
      for (const b of live) {
        if (b._brFoe) { if (b.__skStart === undefined) { b.__skStart = frameCount; b.__skHp = Math.round(b.health); } } else b.__skStart = undefined;
        if (b._brSleep) continue;
        W.samples++;
        const tg = b.target;
        if (!b.onGround) W.airborne++;
        if (b.shielding) W.shielding++;
        if (b.cx() < brZoneLeft || b.cx() > brZoneRight) W.storm++;
        const moved = Math.abs(b.x - (b.__lx !== undefined ? b.__lx : b.x));
        b.__hist = (b.__hist || []); b.__hist.push(b.x); if (b.__hist.length > 20) b.__hist.shift();
        b.__lx = b.x;
        if (b._brNavLock) {
          W.nav++;
          const _tg = b.target, _gd = _tg ? Math.abs(_tg.cx() - b.cx()) + Math.abs(_tg.cy() - b.cy()) : 0;
          if (b.__hist.length === 20 && Math.abs(b.__hist[19] - b.__hist[0]) < 25 && _gd > 80) {
            W.navStuck++;
            const where = (typeof brLandmarkAt === 'function' && brLandmarkAt(b.cx(), b.cy()) || {}).name || '?';
            const key = where + (_tg.cy() < b.cy() - 60 ? ' (goal above)' : _tg.cy() > b.cy() + 60 ? ' (goal below)' : ' (goal level)');
            W.stuckAt = W.stuckAt || {}; W.stuckAt[key] = (W.stuckAt[key] || 0) + 1;
            if (!W.stuckEx || W.stuckEx.length < 8) (W.stuckEx = W.stuckEx || []).push([Math.round(b.cx()), Math.round(b.cy()), Math.round(_tg.cx()), Math.round(_tg.cy()), b.onGround ? 'g' : 'a']);
          }
        } else if (tg && tg.health > 0 && !(tg.playerNum === -1 && tg.health === 999999)) {
          W.fight++;
          W.fightTargets[tg._brWildlife ? 'wildlife' : tg._brBot ? 'bot' : 'player']++;
          const d = Math.hypot(tg.cx() - b.cx(), tg.cy() - b.cy());
          if (d > 260) W.fightFar++;
          if (Math.abs(b.vx) < 0.4 && b.onGround && !(b.attackTimer > 0) && d > 120) W.fightIdle++;
        }
      }
      return { over: false, alive: brAlive, awake: live.filter(b => !b._brSleep).length, zone: brZonePhase + ':' + brZoneState };
    }, f);
    if (st.over) { console.log('match over at frame', f); break; }
    if (f % 1800 === 0) {
      const w = await h.eval(() => { const W = window.__watch; return { s: W.samples, deaths: W.deaths }; });
      console.log(`f=${f} alive=${st.alive} awake=${st.awake} zone=${st.zone} deaths=${JSON.stringify(w.deaths)} (${((Date.now() - t0) / 1000) | 0}s)`);
      if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await h.shot(path.join(SHOTS, `f${String(shotN++).padStart(2, '0')}.png`)); }
    }
    if (st.alive <= 11 && !top10) top10 = await h.eval(() => minions.filter(b => b._brBot && b.health > 0).map(b => b.aiDiff));
    if (st.alive <= 2) { winner = await h.eval(() => (minions.find(b => b._brBot && b.health > 0) || {}).aiDiff); console.log('winner decided at frame', f); break; }
  }
  const W = await h.eval(() => { const W = window.__watch; delete W.focus; return W; });
  const pct = (a) => (100 * a / Math.max(1, W.samples)).toFixed(1) + '%';
  console.log('\n── awake-bot time split ──');
  console.log(' travelling (nav-lock):', pct(W.nav), ' of which stuck:', (100 * W.navStuck / Math.max(1, W.nav)).toFixed(1) + '%');
  console.log(' fighting:', pct(W.fight), ' fight standing idle:', (100 * W.fightIdle / Math.max(1, W.fight)).toFixed(1) + '%',
              ' fight target >260px:', (100 * W.fightFar / Math.max(1, W.fight)).toFixed(1) + '%');
  console.log(' fight targets:', JSON.stringify(W.fightTargets));
  console.log(' airborne:', pct(W.airborne), ' shielding:', pct(W.shielding), ' in storm:', pct(W.storm));
  console.log(' swings:', W.swings, ' whiffs (target out of reach):', W.whiffs, `(${(100 * W.whiffs / Math.max(1, W.swings)).toFixed(0)}%)`,
              ' abilities:', W.abilities, ' supers:', W.supers);
  console.log(' deaths:', JSON.stringify(W.deaths));
  console.log(' stuck at:', JSON.stringify(W.stuckAt || {}));
  console.log(' stuck examples [x,y -> gx,gy]:', JSON.stringify(W.stuckEx || []));
  if (W.sk && W.sk.length) { const d = W.sk.map(x => x[0]).sort((a, b) => a - b), hp = W.sk.map(x => x[1]).sort((a, b) => a - b);
    console.log(' skirmish kills: n=' + d.length, 'median secs', (d[d.length >> 1] / 60).toFixed(1), 'median loser start hp', hp[hp.length >> 1]); }
  console.log('RESULT ' + JSON.stringify({ top10, winner, deaths: W.deaths }));
  if (h.errors.length) console.log('errors:', h.errors.slice(0, 5));
  await h.close();
})();
