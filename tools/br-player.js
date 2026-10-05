'use strict';
/* global HumanProxy */
/*
 * tools/br-player.js — a simulated player plays a real Battle Royale match (DEV ONLY)
 *
 * How hard is BR for the PLAYER? The local fighter is driven by a per-frame hook
 * (no keyboard): the calibrated human proxy (tools/human-proxy.js, v4 params incl.
 * its hpMult defence fudge) fights whatever is near, and a plain player-shaped plan
 * handles the rest — rotate with the storm, loot when under-equipped, otherwise go
 * find someone. Travel uses the game's own _brNavStep, i.e. the same platform-graph
 * routing the bots get. Items: best weapon equipped, medkits drunk when calm,
 * shields raised on contact.
 *
 * Output per match: placement, survival time, player kills, and who the player's
 * health went to (bots / wildlife / storm).
 *
 * Usage: node tools/br-player.js [--seeds=1,2,3] [--override=path/to/smb-battleroyale.js]
 *                                [--port=8171] [--frames=30000] [--override-fighter=path/to/smb-fighter.js]
 */
const fs = require('fs'), path = require('path');
const { launch } = require('./showcase/harness');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
}));
const SEEDS  = String(args.seeds || '1').split(',').map(Number);
const FRAMES = parseInt(args.frames, 10) || 30000;
const PORT   = parseInt(args.port, 10) || 8171;
const params = JSON.parse(fs.readFileSync(path.join(__dirname, 'human-proxy-params-v4.json'), 'utf8'));

async function one(seed) {
  let overrides;
  if (args.override) (overrides = overrides || {})['/js/smb-battleroyale.js'] = path.resolve(args.override);
  if (args['override-fighter']) (overrides = overrides || {})['/js/smb-fighter.js'] = path.resolve(args['override-fighter']);
  const h = await launch({ width: 900, height: 520, port: PORT, settleMs: 2500, overrides });
  try {
    await h.page.addScriptTag({ path: path.join(__dirname, 'human-proxy.js') });
    await h.eval((seed) => {
      let s = seed >>> 0;
      Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      selectMode('battleroyale'); startGame();
    }, seed);
    for (let i = 0; i < 100; i++) {
      if (await h.eval(() => brActive && gameRunning)) break;
      await new Promise(r => setTimeout(r, 100));
    }
    await h.manual();
    // Drop over a random stretch of the map, like a player picking a spot.
    const dropX = await h.eval(() => 1500 + Math.random() * 9000);
    for (let i = 0; i < 400; i++) {
      if (await h.eval(() => brPlaneX) > dropX) break;
      await h.step(5);
    }
    await h.eval(() => keysDown.add(' '));
    await h.step(20);
    await h.eval(() => keysDown.delete(' '));

    if (args.immortal) await h.eval(() => { window.__immortal = true; });
    await h.eval((params) => {
      const p1 = players[0];
      p1.maxHealth = Math.round(p1.maxHealth * (params.hpMult || 1));
      p1.health = p1.maxHealth;
      const R = window.__br = { kills: 0, dmg: { bot: 0, wildlife: 0, storm: 0 }, diedAt: null, place: null,
                                fights: 0, framesInFight: 0, frames: 0,
                                near: { onMe: 0, onOther: 0, travel: 0, idle: 0, n: 0 } };
      let ctrl = null, ctrlFor = null, lastHp = p1.health, lastFoe = null;
      const oc = window._brCreditElimination;
      window._brCreditElimination = function (a, t) {
        if (a === p1 && t && !t._brKillCounted && !t._brWildlife) R.kills++;
        if (t && !t._brKillCounted && !t._brWildlife && t !== p1) {
          const k = a === p1 ? 'player' : a ? (a._brWildlife ? 'wildlife' : 'botAwake') : t._brFoe ? 'skirmish' : t._brSleep ? 'stormAsleep' : 'stormAwake';
          const slot = Math.floor(frameCount / 1800);
          R.cause = R.cause || {}; R.cause[k] = (R.cause[k] || 0) + 1;
          R.byMin = R.byMin || {}; (R.byMin[slot] = R.byMin[slot] || {})[k] = ((R.byMin[slot] || {})[k] || 0) + 1;
        }
        return oc.apply(this, arguments);
      };
      const od = window.dealDamage;
      // Attribute the player's health loss by source. Wrapping the window binding
      // is enough: every caller reaches dealDamage through the global name.
      window.dealDamage = function (a, t) {
        const before = t === p1 ? p1.health : 0;
        const r = od.apply(this, arguments);
        if (t === p1 && p1.health < before) {
          const k = !a ? 'storm' : a._brWildlife ? 'wildlife' : 'bot';
          R.dmg[k] += before - p1.health;
        }
        return r;
      };
      const reachF = (f) => (f.weapon && f.weapon.range) || 60;
      const orig = window.updateBattleRoyale;
      window.updateBattleRoyale = function () {
        try { drive(); } catch (e) { R.err = R.err || e.message; }
        return orig.apply(this, arguments);
      };
      function enemies() {
        return players.concat(minions).filter(f => f && f !== p1 && f.health > 0 && !f._brOnPlane);
      }
      function drive() {
        if (!brLanded || p1._brOnPlane) return;
        if (p1.health <= 0) {
          if (R.diedAt === null) { R.diedAt = frameCount; R.place = brAlive + 1; }
          return;
        }
        R.frames++;
        // Immortal = permanent i-frames: bots still target and fight it (invincible
        // is not an invalid-target reason), but nothing lands. Reviving a dead
        // fighter instead left the match in a broken state.
        if (window.__immortal) { p1.health = p1.maxHealth; p1.invincible = 9999; }
        const px = p1.cx(), py = p1.cy();
        // Pile-on: how many awake bots are fighting the player right now.
        if (frameCount % 6 === 0) {
          let on = 0;
          for (const b of minions) if (b && b._brBot && b.health > 0 && !b._brSleep && !b._brNavLock && b.target === p1) on++;
          R.pile = R.pile || { sum: 0, n: 0, max: 0, over3: 0 };
          R.pile.sum += on; R.pile.n++; if (on > R.pile.max) R.pile.max = on; if (on > 3) R.pile.over3++;
        }
        // What are the bots near me doing? (every 6 frames)
        if (frameCount % 6 === 0) for (const b of minions) {
          if (!b._brBot || b.health <= 0 || b._brSleep || !b._brLanded) continue;
          if (Math.abs(b.cx() - px) > 350 || Math.abs(b.cy() - py) > 200) continue;
          R.near.n++;
          const t = b.target;
          if (b._brNavLock) R.near.travel++;
          else if (t === p1) R.near.onMe++;
          else if (t && t.health > 0 && t.health < 999999) R.near.onOther++;
          else R.near.idle++;
        }
        // ── Items (every 30 frames) ──
        if (frameCount % 30 === 0) {
          for (let s = 0; s < 5; s++) {
            const it = brInventory[s];
            if (it && it.type === 'weapon' && _brWeaponRank(it.weaponKey) > _brWeaponRank(p1.weaponKey)) {
              _brApplyItem(it, p1); brInventory[s] = null;
            }
          }
        }
        // ── Threat picture ──
        let foe = null, foeD = Infinity;
        for (const f of enemies()) {
          const dx = Math.abs(f.cx() - px), dy = Math.abs(f.cy() - py);
          if (dy > 220) continue;
          const d = dx + dy * 0.5 + (f._brWildlife ? 250 : 0);
          if (d < foeD) { foeD = d; foe = f; }
        }
        if (frameCount % 30 === 0) {
          const hp = p1.health / p1.maxHealth;
          for (let s = 0; s < 5; s++) {
            const it = brInventory[s];
            if (!it) continue;
            if (it.type === 'medkit' && hp < 0.6 && foeD > 600) { _brApplyItem(it, p1); brInventory[s] = null; break; }
            if (it.type === 'shield' && foeD < 300 && !p1._brShieldTimer) { _brApplyItem(it, p1); brInventory[s] = null; break; }
            if (it.type === 'super' && foeD < 250 && !p1.superReady) { _brApplyItem(it, p1); brInventory[s] = null; break; }
          }
        }
        if (frameCount % 10 === 0) _brPickupNearbyGroundItem();

        // ── Combat: the proxy owns the controls while anyone is close ──
        const w = _brSafeWindow();
        const inStorm = px < brZoneLeft + 40 || px > brZoneRight - 40;
        if (foe && foeD < 420 && !inStorm) {
          if (ctrlFor !== foe) { ctrl = HumanProxy.controller(params); ctrlFor = foe; if (lastFoe !== foe) R.fights++; lastFoe = foe; if (!foe._brWildlife) { R.met = R.met || []; if (R.met.indexOf(foe.name) < 0) R.met.push(foe.name); } }
          p1.target = foe;
          ctrl.call(p1);
          R.framesInFight++;
          return;
        }
        ctrlFor = null;
        // ── Travel ──
        if (frameCount % 12 === 0 || !p1.__goal) {
          const pad = 260;
          const needX = Math.max(w.left + pad, Math.min(w.right - pad, px));
          const reach = Math.abs(needX - px) / (5.2 * 0.45);
          if (inStorm || reach > w.frames * 0.7) p1.__goal = [needX, py];
          else {
            const armed = _brWeaponRank(p1.weaponKey);
            const space = brInventory.indexOf(null) !== -1;
            let best = null, bd = armed === 0 ? 2600 : space ? 1200 : 400;
            for (const g of brGroundItems) { const d = Math.hypot(g.x - px, g.y - py); if (d < bd) { bd = d; best = [g.x, g.y]; } }
            for (const b of brLootBoxes) {
              if (b.opened || b.health <= 0 || b.x < w.left + 60 || b.x > w.right - 60) continue;
              const d = Math.hypot(b.x - px, b.y - py); if (d < bd) { bd = d; best = [b.x, b.y - 10]; }
            }
            if (best) p1.__goal = best;
            else {
              let e = null, ed = 3000;
              for (const f of enemies()) { if (f._brWildlife) continue; const d = Math.hypot(f.cx() - px, f.cy() - py); if (d < ed) { ed = d; e = f; } }
              p1.__goal = e ? [e.cx(), e.cy()] : [(w.left + w.right) / 2, py];
            }
          }
        }
        p1.target = _brFakeTarget(p1.__goal[0], p1.__goal[1]);
        _brNavStep(p1);
      }
    }, params);

    let f = 0;
    for (; f < FRAMES; f += 60) {
      await h.step(60);
      const st = await h.eval(() => ({ dead: players[0].health <= 0, alive: brAlive, active: brActive }));
      if (args.debug && f % 600 === 0) console.log('dbg', f, JSON.stringify(await h.eval(() => ({ hp: Math.round(players[0].health), dt: damageTexts.length, parts: (typeof particles !== 'undefined' ? particles.length : -1), gi: brGroundItems.length, mins: minions.length, heap: Math.round(performance.memory ? performance.memory.usedJSHeapSize / 1e6 : -1), spect: brSpectating }))));
      if (f % 1800 === 0) (global.__curve = global.__curve || []).push(st.alive);
      if (st.dead || !st.active || st.alive <= 1) break;
    }
    const R = await h.eval(() => {
      const R = window.__br; const p1 = players[0];
      if (p1.health > 0) { R.place = brAlive <= 1 ? 1 : brAlive; }
      return R;
    });
    R.curve = (global.__curve || []).join(','); global.__curve = [];
    R.seed = seed; R.secsTotal = await h.eval(() => Math.round(frameCount / 60)); R.errors = h.errors.slice(0, 3);
    return R;
  } finally { await h.close(); }
}

(async () => {
  for (const s of SEEDS) {
    const R = await one(s);
    console.log('RESULT ' + JSON.stringify({ seed: s, place: R.place, total: R.secsTotal, secs: +(R.frames / 60).toFixed(0), kills: R.kills,
      curve: R.curve, cause: R.cause, byMin: R.byMin, pile: R.pile && { avg: +(R.pile.sum / R.pile.n).toFixed(2), max: R.pile.max, pctOver3: +(100 * R.pile.over3 / R.pile.n).toFixed(1) }, fights: R.fights, met: (R.met || []).length, dmg: R.dmg, near: R.near, err: R.err, errors: R.errors }));
  }
})();
