'use strict';
// Store preview video: real gameplay, captured frame by frame off #gameCanvas.
// Player 1 is played by Sovereign's AI (what F7 does) in every shot, so the
// footage shows the game played well rather than a bot flailing.
//
//   node tools/showcase/trailer.js <workDir> [W H] [shot,shot…] [cropW]
//
// Portrait: record wide (2880x1620) and pass cropW=1080. The game letterboxes
// a tall viewport into a thin band, so the portrait cut is a slice that follows
// the fight instead.
//
// Each shot runs in a fresh page, records longer than it needs, and keeps the
// window with the most going on (damage dealt, a goal, a domain arriving).
// Frames land in <workDir>/<shot>/ with the chosen window in <shot>.json;
// assemble with tools/showcase/trailer-assemble.js.
const fs = require('fs'), path = require('path');
const { openSession } = require('./session');

const FPS = 30;
const hpProbe = () => {
  const all = players.concat(typeof minions !== 'undefined' ? minions : []);
  let hp = 0; for (const p of all) if (p) hp += Math.max(0, p.health);
  return { hp, n: all.length };
};

// Silence the story captions and tutorial prompts: the portal allows no text
// beyond the game's name, and those are instructions, not gameplay.
const quiet = s => s.eval(() => {
  window.drawStorySubtitle = () => {}; window.drawTutorial = () => {}; window.drawObjectiveHUD = () => {};
  window.drawStoryOpponentHUD = () => {}; window.drawExploreHUD = () => {};
  window.drawBattleRoyaleHUD = () => {}; window.drawEdgeIndicators = () => {};
  window.drawScavengeHUD = () => {};
  window.drawAchievementPopups = () => {}; window.drawAbilityUnlockToast = () => {};
});

// Story chapter shot. Exploration enemies only appear as you walk the level,
// and Sovereign won't walk without a target — so give him two ahead to chase.
const storyShot = (id, zoom, ahead) => ({
  secs: 3.0, rec: 12,
  async setup(s) {
    await s.startStory(id, 5000);
    await quiet(s);
    await s.sovereignP1();
    await s.eval(ahead => {
      const p = players[0];
      for (const dx of (ahead || [520, 760])) { const m = new Minion(p.x + dx, p.y - 40); m.target = p; minions.push(m); }
    }, ahead);
    await s.trailerCam(zoom || 0);
  },
});

// Staged move shot: Player 1 casts chosen Q/E moves at an idle opponent, the
// pair reset face to face on the main floor before each one (the resets are
// the cuts). A `kill` entry leaves the opponent on 1 HP so the move's own
// finisher plays. Entries: [weapon, 'q'|'e', frames, kill].
const stagedProbe = () => {
  const f = (window.__sf = (window.__sf || 0) + 1);
  const a = (window.__seq || []).find(a => a.at === f);
  const p1 = players[0], p2 = players[1];
  if (a) {
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
    if (!a.k) {}
    else if (a.k === 'e') { p1.superMeter = 100; p1.superReady = true; p1.useSuper(p2); } else p1.ability(p2);
  }
  return { fin: !!activeFinisher };
};
const stagedShot = (arena, zoom, seq) => {
  // Frame 1 only places the pair, so the camera has settled before the first cast.
  let at = 24;
  const plan = [{ at: 1, w: seq[0][0], k: null }].concat(seq.map(([w, k, len, kill]) => { const a = { at, w, k, kill: !!kill }; at += len; return a; }));
  return {
    staged: plan, rec: (at + 15) / FPS, secs: (at - 24) / FPS, probe: stagedProbe,
    async setup(s) {
      await s.startMatch({ mode: '2p', arena, p1: 'katana', p2: 'sword', p1Bot: false, p2Bot: false });
      await s.trailerCam(zoom); await quiet(s);
      await s.eval(plan => { window.__seq = plan; window.__sf = 0; }, plan);
    },
  };
};

const SHOTS = {
  duel: {
    secs: 3.0, rec: 14,
    async setup(s) {
      await s.startMatch({ mode: '2p', arena: 'lava', p1: 'katana', p2: 'glassblade', p1Bot: false, p2Bot: true, p2Diff: 'hard' });
      await s.sovereignP1(); await s.trailerCam(1.5); await quiet(s);
    },
  },
  boss: {
    secs: 3.0, rec: 14, warm: 60,
    async setup(s) {
      await s.startMatch({ mode: 'boss', p1: 'katana', p1Bot: false, settleMs: 3500 });
      await s.sovereignP1(); await s.trailerCam(1.15); await quiet(s);
    },
  },
  story: storyShot(1, 1.15, [220, 380]),
  story2: storyShot(5, 1.15, [220, 380]),
  story3: storyShot(24, 1.15),
  br: {
    secs: 2.5, rec: 12, warm: 12 * 60,   // past the drop from the bus
    async setup(s) {
      await s.startMatch({ mode: 'battleroyale', p1: 'katana', p1Bot: false, settleMs: 3500 });
      await s.sovereignP1(); await s.trailerCam(0); await quiet(s);
    },
  },
  soccer: {
    secs: 2.5, rec: 16, goal: true,
    probe: () => ({ score: sportsScore[0] + sportsScore[1] }),
    async setup(s) {
      await s.startMatch({ mode: 'minigames', minigame: 'sports', p1: 'katana', p2: 'hammer', p1Bot: false, p2Bot: true, p2Diff: 'hard', settleMs: 3500 });
      await s.sovereignP1(); await s.trailerCam(0); await quiet(s);
    },
  },
  moves: stagedShot('colosseum', 1.8, [['hammer', 'e', 40], ['scythe', 'e', 40], ['electricstaff', 'q', 32]]),
  moves2: stagedShot('colosseum', 1.8, [['katana', 'q', 32], ['fryingpan', 'e', 40], ['whip', 'q', 36]]),
  finisher: stagedShot('colosseum', 1.8, [['katana', 'e', 140, true]]),
  finisher2: stagedShot('cyberpunk', 1.8, [['electricstaff', 'e', 140, true]]),
  finisher3: stagedShot('forest', 1.8, [['hammer', 'e', 140, true]]),
  domain: {
    secs: 3.0, rec: 11, domain: true,
    probe: () => ({ dom: DomainManager.domains.length }),
    async setup(s) {
      await s.startMatch({ mode: '2p', arena: 'mushroom', p1: 'katana', p1Class: 'reaper', p2: 'hammer', p1Bot: false, p2Bot: true, p2Diff: 'hard' });
      await s.sovereignP1(); await s.trailerCam(1.3); await quiet(s);
      await s.eval(() => DomainManager.triggerExpansion(players[0]));
    },
  },
};

function pickWindow(log, len, shot) {
  if (shot.staged) return shot.staged[1].at;
  if (log.length <= len) return 0;
  if (shot.domain) {
    // Open just before the domain lands, so the title card and the first kill
    // after it are both in.
    const i = log.findIndex(e => e.dom > 0);
    return Math.max(0, Math.min(log.length - len, (i < 0 ? 0 : i) - 12));
  }
  if (shot.goal) {
    const i = log.findIndex((e, k) => k > 0 && e.score > log[k - 1].score);
    if (i >= 0) return Math.max(0, Math.min(log.length - len, i - Math.round(len * 0.6)));
  }
  // Most damage dealt inside the window.
  const d = log.map((e, k) => k ? Math.abs(e.hp - log[k - 1].hp) : 0);
  let best = 0, bestAt = 0, run = 0;
  for (let k = 0; k < log.length; k++) {
    run += d[k]; if (k >= len) run -= d[k - len];
    if (k >= len - 1 && run > best) { best = run; bestAt = k - len + 1; }
  }
  return bestAt;
}

(async () => {
  const work = process.argv[2] || '/tmp/smb-trailer';
  const W = +(process.argv[3] || 1920), H = +(process.argv[4] || 1080);
  const only = process.argv[5] && process.argv[5] !== 'all' ? process.argv[5].split(',') : Object.keys(SHOTS);
  const cropW = +(process.argv[6] || 0);
  fs.mkdirSync(work, { recursive: true });
  for (const name of only) {
    const shot = SHOTS[name];
    const s = await openSession({ width: W, height: H });
    try {
      await shot.setup(s);
      if (shot.warm) { await s.manual(); await s.step(shot.warm); await s.auto(); }
      const dir = path.join(work, name);
      fs.rmSync(dir, { recursive: true, force: true });
      const probeSrc = shot.probe
        ? `() => Object.assign((${hpProbe.toString()})(), (${shot.probe.toString()})())`
        : hpProbe.toString();
      const log = await s.record(dir, Math.round(shot.rec * FPS), 60 / FPS, new Function('return ' + probeSrc)(), 0.93, cropW);
      let len = Math.round(shot.secs * FPS);
      // A finisher shot ends a beat after the finisher hands the camera back.
      const lastFin = log.map(e => e && e.fin).lastIndexOf(true);
      if (shot.staged && lastFin > 0) len = Math.min(log.length, lastFin + 4) - shot.staged[1].at;
      const start = pickWindow(log, len, shot);
      fs.writeFileSync(path.join(work, name + '.json'), JSON.stringify({ start, len, log }, null, 0));
      console.log(name, 'window', start, '+', len, 'of', log.length, s.errors.length ? 'errors ' + s.errors.slice(0, 3) : '');
    } catch (e) {
      console.log(name, 'FAILED', e.message);
    }
    await s.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
