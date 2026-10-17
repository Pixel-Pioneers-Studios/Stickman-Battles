'use strict';
// Records the trailer's raw gameplay shots from the real game.
//
//   node capture.js <land|vert> [shot,shot,...|all]
//
// land: 1920x1080 off the game canvas. vert: the game runs at 3414x1920 and a
// 1080-wide full-height slice follows the fight (the game letterboxes a tall
// viewport into a thin band, so native portrait would be tiny).
//
// Every shot is the live game: free-play shots have Player 1 driven by the
// game's own Sovereign AI (the F7 "plays for me" toggle); staged shots have
// Player 1 cast a chosen move at an idle opponent. Clips land in
// work/<profile>/<shot>.mov (60fps, with the game's sound effects) and a
// <shot>.json log used by edit.js to choose windows.
const fs = require('fs'), path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
const { hookAudio, record } = require('./lib/recorder');

const PROFILES = {
  land: { width: 1920, height: 1080, cropW: 0, zoomMul: 1, port: 8171 },
  vert: { width: 3414, height: 1920, cropW: 1080, zoomMul: 0.85, port: 8172 },
  // Small and quick: for measuring a change to the game, not for the edit.
  audit: { width: 960, height: 540, cropW: 0, zoomMul: 1, port: 8173 },
};
const FPS = 60;

const baseProbe = () => {
  const all = players.concat(typeof minions !== 'undefined' ? minions : []);
  let hp = 0; for (const p of all) if (p) hp += Math.max(0, p.health);
  return { hp, n: all.length, fin: !!activeFinisher, cin: !!activeCinematic,
    dom: typeof DomainManager !== 'undefined' ? DomainManager.domains.length : 0,
    score: typeof sportsScore !== 'undefined' && sportsScore ? sportsScore[0] + sportsScore[1] : 0,
    sf: window.__sf || 0 };
};

// Tutorial prompts, objective bars and popups are instructions, not gameplay.
const quiet = s => s.eval(() => {
  window.drawStorySubtitle = () => {}; window.drawTutorial = () => {}; window.drawObjectiveHUD = () => {};
  window.drawStoryOpponentHUD = () => {}; window.drawExploreHUD = () => {};
  window.drawBattleRoyaleHUD = () => {}; window.drawEdgeIndicators = () => {};
  window.drawScavengeHUD = () => {}; window.drawHitEffectivenessHUD = () => {}; window.drawMatchAnnouncer = () => {}; window._drawAnnouncer = () => {};   // streak labels and announcer bursts (FIRST BLOOD)
  window.drawAchievementPopups = () => {}; window.drawAbilityUnlockToast = () => {};
  // Damage numbers, floating labels and the name + health plate over each
  // fighter: the wounds show who is losing, nothing should compete with them.
  settings.dmgNumbers = false;
  DamageText.prototype.draw = () => {};
  window.drawEntityOverlays = () => {};
  // superFlashTimer only drives the floating "SUPER!" text.
  // A prototype accessor also catches the constructor's own assignment.
  Object.defineProperty(Fighter.prototype, 'superFlashTimer', { get: () => 0, set() {}, configurable: true });
  for (const p of players.concat(typeof minions !== 'undefined' ? minions : [])) if (p) delete p.superFlashTimer;
});

const duel = (arena, p1, p2, zoom, extra) => ({
  rec: 11,
  async setup(s, z) {
    await s.startMatch(Object.assign({ mode: '2p', arena, p1, p2, p1Bot: false, p2Bot: true, p2Diff: 'hard' }, extra || {}));
    await s.sovereignP1(); await s.trailerCam(zoom * z); await quiet(s);
  },
});

const story = (id, zoom, ahead) => ({
  rec: 11,
  async setup(s, z) {
    await s.startStory(id, 5000);
    await quiet(s);
    await s.sovereignP1();
    await s.eval(ahead => {
      const p = players[0];
      for (const dx of ahead) { const m = new Minion(p.x + dx, p.y - 40); m.target = p; minions.push(m); }
    }, ahead || [220, 380, 560]);
    await s.trailerCam(zoom * z);
  },
});

// Staged casts. seq entries: [weapon, 'q'|'e', ticks, kill]. The pair is reset
// face to face before each cast (the resets are the cuts); a kill entry leaves
// the opponent on 1 HP so the move's own finisher plays.
const stagedTick = () => {
  const f = (window.__sf = (window.__sf || 0) + 1);
  const a = (window.__seq || []).find(a => a.at === f);
  if (!a) return;
  const p1 = players[0], p2 = players[1];
  for (const p of players) {
    p.lives = 99; p.vx = 0; p.vy = 0; p.stunTimer = 0; p.ragdollTimer = 0; p.invincible = 0;
    p.cooldown = 0; p.abilityCooldown = 0; p.health = p.maxHealth;
  }
  p1.weaponKey = a.w; p1.weapon = WEAPONS[a.w];
  const fl = currentArena.platforms.filter(pl => !pl.isFloorDisabled).sort((x, y) => y.w - x.w)[0];
  const x1 = fl.x + fl.w * 0.42;
  p1.x = x1; p1.y = fl.y - p1.h; p1.facing = 1; p1.onGround = true;
  p2.x = x1 + 110; p2.y = fl.y - p2.h; p2.facing = -1; p2.onGround = true;
  p1.target = p2;
  if (a.kill) p2.health = 1;
  if (a.k === 'e') { p1.superMeter = 100; p1.superReady = true; p1.useSuper(p2); }
  else if (a.k === 'q') p1.ability(p2);
};
const staged = (arena, zoom, seq, p2w) => {
  let at = 40;
  const plan = [{ at: 1, w: seq[0][0], k: null }].concat(seq.map(([w, k, len, kill]) => { const a = { at, w, k, kill: !!kill }; at += len; return a; }));
  return {
    rec: (at + 40) / FPS, plan,
    async setup(s, z) {
      await s.startMatch({ mode: '2p', arena, p1: seq[0][0], p2: p2w || 'sword', p1Bot: false, p2Bot: false });
      await s.trailerCam(zoom * z); await quiet(s);
      await s.eval((plan, tickSrc) => {
        window.__seq = plan; window.__sf = 0;
        // Run the staging on the game's own frame, before the probe reads it.
        const tick = new Function('return (' + tickSrc + ')')();
        const orig = window.__step;
        window.__step = function (n) { for (let i = 0; i < n; i++) { if (window.__manual) tick(); orig(1); } };
      }, plan, stagedTick.toString());
    },
  };
};
const fin = (arena, w, k, p2w) => staged(arena, 1.8, [[w, k, 330, true]], p2w);

const SHOTS = {
  duel: duel('lava', 'katana', 'glassblade', 1.5),
  duel2: duel('cyberpunk', 'scythe', 'spear', 1.5),
  duel3: duel('ice', 'hammer', 'axe', 1.5),
  duel4: duel('haunted', 'electricstaff', 'whip', 1.5),
  boss: {
    rec: 16, warm: 120,
    async setup(s, z) {
      await s.startMatch({ mode: 'boss', p1: 'katana', p1Bot: false, settleMs: 3500 });
      await s.sovereignP1(); await s.trailerCam(1.15 * z); await quiet(s);
    },
  },
  trueform: {
    rec: 16, warm: 120,
    async setup(s, z) {
      await s.startMatch({ mode: 'trueform', p1: 'katana', p1Bot: false, settleMs: 4500 });
      await s.sovereignP1(); await s.trailerCam(1.15 * z); await quiet(s);
    },
  },
  story: story(1, 1.2, [220, 380]),
  story2: story(5, 1.2, [220, 380]),
  story3: story(24, 1.2),
  story4: story(12, 1.2),
  br: {
    rec: 11, warm: 12 * 60,
    async setup(s, z) {
      await s.startMatch({ mode: 'battleroyale', p1: 'katana', p1Bot: false, settleMs: 3500 });
      await s.sovereignP1(); await s.trailerCam(0); await quiet(s);
    },
  },
  soccer: {
    rec: 18,
    async setup(s, z) {
      await s.startMatch({ mode: 'minigames', minigame: 'sports', p1: 'katana', p2: 'hammer', p1Bot: false, p2Bot: true, p2Diff: 'hard', settleMs: 3500 });
      await s.sovereignP1(); await s.trailerCam(0); await quiet(s);
    },
  },
  domain: {
    rec: 11,
    async setup(s, z) {
      await s.startMatch({ mode: '2p', arena: 'mushroom', p1: 'katana', p1Class: 'reaper', p2: 'hammer', p1Bot: false, p2Bot: true, p2Diff: 'hard' });
      await s.sovereignP1(); await s.trailerCam(0); await quiet(s);
      await s.eval(() => DomainManager.triggerExpansion(players[0]));
    },
  },
  moves: staged('colosseum', 1.8, [['hammer', 'e', 84], ['scythe', 'e', 84], ['electricstaff', 'q', 68], ['katana', 'q', 68]]),
  moves2: staged('cyberpunk', 1.8, [['fryingpan', 'e', 84], ['whip', 'q', 76], ['glassblade', 'e', 84], ['flail', 'e', 84]]),
  moves3: staged('forest', 1.8, [['axe', 'e', 84], ['spear', 'e', 84], ['anchor', 'e', 90], ['flamethrower', 'e', 84]]),
  moves4: staged('ice', 1.8, [['bow', 'e', 84], ['knives', 'e', 84], ['boomerang', 'q', 76], ['bomb', 'e', 90]]),
  finKatana: fin('colosseum', 'katana', 'e'),
  finStaff: fin('cyberpunk', 'electricstaff', 'e'),
  finHammer: fin('forest', 'hammer', 'e'),
  finScythe: fin('haunted', 'scythe', 'e'),
  finGlass: fin('ice', 'glassblade', 'e'),
  finAnchor: fin('lava', 'anchor', 'e'),
  finFists: fin('city', 'combat', 'e'),
  finAxe: fin('volcano', 'axe', 'q'),
};

(async () => {
  const profName = process.argv[2] || 'land';
  const prof = PROFILES[profName];
  const only = process.argv[3] && process.argv[3] !== 'all' ? process.argv[3].split(',') : Object.keys(SHOTS);
  const work = path.join(__dirname, 'work', profName);
  fs.mkdirSync(work, { recursive: true });
  for (const name of only) {
    const shot = SHOTS[name];
    if (!shot) { console.log(name, 'UNKNOWN'); continue; }
    const t0 = Date.now();
    let s;
    try {
      s = await openSession({ width: prof.width, height: prof.height, port: prof.port });
      await hookAudio(s);
      await shot.setup(s, prof.zoomMul);
      if (shot.warm) { await s.manual(); await s.step(shot.warm); await s.auto(); }
      const frames = Math.round(shot.rec * FPS);
      const { log, sfx } = await record(s, path.join(work, name), frames, { fps: FPS, probe: baseProbe, cropW: prof.cropW });
      if (shot.plan) {
        const j = JSON.parse(fs.readFileSync(path.join(work, name + '.json'), 'utf8'));
        j.plan = shot.plan; fs.writeFileSync(path.join(work, name + '.json'), JSON.stringify(j));
      }
      console.log(name, 'ok', frames, 'frames', sfx.length, 'sfx', ((Date.now() - t0) / 1000).toFixed(0) + 's',
        s.errors.length ? 'errors: ' + s.errors.slice(0, 3).join(' | ') : '');
    } catch (e) {
      console.log(name, 'FAILED', e.message);
    }
    if (s) await s.close().catch(() => {});
  }
  // PeerJS/socket handles from the page's server can keep Node alive.
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
