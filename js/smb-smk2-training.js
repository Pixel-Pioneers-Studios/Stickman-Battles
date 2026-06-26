'use strict';
// smb-smk2-training.js — Sovereign genome trainer: Sovereign vs melee bots
// Depends on: smb-smk2-data.js, smb-smk2-class.js
//
// Design rationale:
//   Opponent = randomized melee bots (diverse weapon/class loadouts, including
//   cross-class affinities). Bots are individually weak — the point is NOT a fair
//   fight, it is observing how Sovereign manages spatial pressure from multiple
//   simultaneous threats and what the genome actually causes it to prioritize.
//
//   Fairness: champion and challenger run against IDENTICAL bot loadouts per
//   generation (same seed → same random picks). Only the genome differs.
//
// Console commands (smb-debug-console.js):
//   sovereign:train [gens=20] [matches=10] [bots=2]
//   sovereign:stress [maxBots=6] [matches=5]
//   sovereign:genome
//   sovereign:reset
//   sovereign:stop

const SMK2Trainer = (() => {
  const LS_KEY = 'smk2_champion_v1';
  let _running  = false;

  // ── Melee loadout pool ──────────────────────────────────────────────────
  // All melee only — Sovereign only adapts to melee patterns.
  // Includes natural affinities AND cross-class pairings (affinity update).
  const _LOADOUTS = [
    // Natural
    { w: 'sword',  c: 'none'       },
    { w: 'sword',  c: 'ninja'      },
    { w: 'sword',  c: 'berserker'  },
    { w: 'axe',    c: 'kratos'     },
    { w: 'axe',    c: 'berserker'  },
    { w: 'hammer', c: 'thor'       },
    { w: 'katana', c: 'ronin'      },
    { w: 'katana', c: 'ninja'      },
    { w: 'scythe', c: 'reaper'     },
    { w: 'combat', c: 'pugilist'   },
    // Cross-class (affinity system)
    { w: 'hammer', c: 'kratos'     },
    { w: 'hammer', c: 'ninja'      },
    { w: 'axe',    c: 'thor'       },
    { w: 'katana', c: 'berserker'  },
    { w: 'sword',  c: 'ronin'      },
    { w: 'scythe', c: 'berserker'  },
    { w: 'axe',    c: 'ronin'      },
    { w: 'katana', c: 'kratos'     },
  ];

  // Fixed spawn positions per number of bots (spread across arena)
  const _BOT_SPAWNS = [
    [],
    [700],
    [600, 770],
    [180, 550, 760],
    [130, 380, 580, 800],
    [100, 280, 470, 650, 820],
    [80,  220, 380, 540, 700, 850],
  ];

  // ── Seeded RNG (mulberry32) ─────────────────────────────────────────────
  function _makeRng(seed) {
    let s = (seed * 2654435761) >>> 0;
    return () => {
      s += 0x6D2B79F5;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── Gaussian mutation ───────────────────────────────────────────────────
  function _randn() {
    const u = Math.random() || 1e-10;
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
  }

  function mutate(genome, sigma = 0.08) {
    const out = {};
    for (const key of Object.keys(SMK2_DEFAULT_GENOME)) {
      const [lo, hi] = SMK2_GENOME_RANGES[key];
      out[key] = Math.max(lo, Math.min(hi, genome[key] + _randn() * sigma * (hi - lo)));
    }
    return out;
  }

  // ── Environment stub / restore ──────────────────────────────────────────
  let _saved = null;

  function _stubEnv() {
    const _g = (n) => (typeof window[n] !== 'undefined' ? window[n] : undefined);
    _saved = {
      players:          _g('players'),
      minions:          _g('minions'),
      trainingDummies:  _g('trainingDummies'),
      verletRagdolls:   _g('verletRagdolls'),
      projectiles:      _g('projectiles'),
      damageTexts:      _g('damageTexts'),
      isCinematic:      _g('isCinematic'),
      activeCinematic:  _g('activeCinematic'),
      hitStopFrames:    _g('hitStopFrames'),
      storyModeActive:  _g('storyModeActive'),
      gameRunning:      _g('gameRunning'),
      gameMode:         _g('gameMode'),
      onlineMode:       _g('onlineMode'),
      currentArena:     _g('currentArena'),
      aiTick:           _g('aiTick'),
      frameCount:       _g('frameCount'),
      spawnParticles:   _g('spawnParticles'),
      spawnBullet:      _g('spawnBullet'),
      showBossDialogue: _g('showBossDialogue'),
      unlockAchievement:_g('unlockAchievement'),
      pickSafeSpawn:    _g('pickSafeSpawn'),
      dmgNumbers:       settings.dmgNumbers,
      smSounds:         {},
    };
    if (typeof SoundManager !== 'undefined') {
      for (const k of Object.keys(SoundManager)) {
        if (typeof SoundManager[k] === 'function') _saved.smSounds[k] = SoundManager[k];
      }
    }

    window.currentArena    = (typeof ARENAS !== 'undefined' && ARENAS.sovereign)
      ? ARENAS.sovereign
      : { id: 'sim', bgColor: '#000', platforms: [{ x: 0, y: 460, w: 900, h: 60, isFloor: true }] };
    window.players         = [];
    window.minions         = [];
    window.trainingDummies = [];
    if (_saved.verletRagdolls !== undefined) window.verletRagdolls  = [];
    if (_saved.projectiles    !== undefined) window.projectiles     = [];
    if (_saved.damageTexts    !== undefined) window.damageTexts     = [];
    window.isCinematic         = false;
    window.activeCinematic     = null;
    window.hitStopFrames       = 0;
    window.storyModeActive     = false;
    window.gameRunning         = true;
    window.gameMode            = 'sovereign';
    window.onlineMode          = false;
    settings.dmgNumbers        = false;

    const _noop = () => {};
    window.spawnParticles      = _noop;
    if (_saved.spawnBullet        !== undefined) window.spawnBullet       = _noop;
    window.showBossDialogue    = _noop;
    if (_saved.unlockAchievement  !== undefined) window.unlockAchievement = _noop;
    if (_saved.pickSafeSpawn      !== undefined) window.pickSafeSpawn     = () => null;
    if (typeof SoundManager !== 'undefined') {
      for (const k of Object.keys(SoundManager)) {
        if (typeof SoundManager[k] === 'function') SoundManager[k] = _noop;
      }
    }
    // Stub combat-lock / cutscene guards — if these return true, Fighter skips all AI
    if (typeof isCombatLocked   !== 'undefined') window.isCombatLocked   = () => false;
    if (typeof isCutsceneActive !== 'undefined') window.isCutsceneActive = () => false;
  }

  function _restoreEnv() {
    if (!_saved) return;
    const s = _saved;
    const _r = (n, v) => { if (v !== undefined) window[n] = v; };
    _r('players',          s.players);
    _r('minions',          s.minions);
    _r('trainingDummies',  s.trainingDummies);
    _r('verletRagdolls',   s.verletRagdolls);
    _r('projectiles',      s.projectiles);
    _r('damageTexts',      s.damageTexts);
    _r('isCinematic',      s.isCinematic);
    _r('activeCinematic',  s.activeCinematic);
    _r('hitStopFrames',    s.hitStopFrames);
    _r('storyModeActive',  s.storyModeActive);
    _r('gameRunning',      s.gameRunning);
    _r('gameMode',         s.gameMode);
    _r('onlineMode',       s.onlineMode);
    _r('currentArena',     s.currentArena);
    _r('aiTick',           s.aiTick);
    _r('frameCount',       s.frameCount);
    _r('spawnParticles',   s.spawnParticles);
    _r('spawnBullet',      s.spawnBullet);
    _r('showBossDialogue', s.showBossDialogue);
    _r('unlockAchievement',s.unlockAchievement);
    _r('pickSafeSpawn',    s.pickSafeSpawn);
    settings.dmgNumbers = s.dmgNumbers;
    if (typeof SoundManager !== 'undefined') {
      for (const [k, fn] of Object.entries(s.smSounds)) SoundManager[k] = fn;
    }
    _saved = null;
  }

  // ── Apply class stats to a bot (no side effects) ────────────────────────
  function _applyBotClass(bot, className) {
    if (!className || className === 'none') return;
    if (typeof CLASSES === 'undefined' || !CLASSES[className]) return;
    const cls = CLASSES[className];
    bot.charClass      = className;
    bot.classSpeedMult = cls.speedMult || 1.0;
    const hp = cls.hp || 150;
    bot.maxHealth = hp;
    bot.health    = hp;
  }

  // ── Diagnostic match counter (shared across all _runMatch calls) ─────────
  let _matchSeq = 0;

  // ── Single headless match ───────────────────────────────────────────────
  // Sovereign (genome) vs numBots melee bots (unlimited lives — bots respawn).
  // Matches always run MAX_FRAMES so fitness is kill throughput, not a win/loss.
  // seed controls loadout picks — same seed = same opponents for fair comparison.
  function _runMatch(genome, numBots, seed) {
    const SOV_LIVES  = 5;
    const MAX_FRAMES = 7200; // ~2 min sim time with full-rate AI
    const matchId    = ++_matchSeq;
    const _noop      = () => {};

    // Full sim-env reset every match — guards against game-loop interference
    // during setTimeout yields AND against state accumulated by prior matches.
    window.currentArena    = (typeof ARENAS !== 'undefined' && ARENAS.sovereign)
      ? ARENAS.sovereign
      : { id: 'sim', bgColor: '#000', platforms: [{ x: 0, y: 460, w: 900, h: 60, isFloor: true }] };
    window.players         = [];
    window.minions         = [];
    window.trainingDummies = [];
    if (typeof verletRagdolls !== 'undefined') window.verletRagdolls  = [];
    if (typeof projectiles    !== 'undefined') window.projectiles     = [];
    if (typeof damageTexts    !== 'undefined') window.damageTexts     = [];
    window.hitStopFrames   = 0;
    window.slowMotion      = 1;   // must reset — a hit-stop or finisher in a prior match sets this to 0
    window.screenShake     = 0;
    window.isCinematic     = false;
    window.activeCinematic = null;
    window.storyModeActive = false;
    window.gameRunning     = true;
    window.gameMode        = 'sovereign';
    window.onlineMode      = false;
    // Stub side-effect functions every match so a prior match can't have unregistered them
    window.spawnParticles   = _noop;
    window.showBossDialogue = _noop;
    if (typeof spawnBullet        !== 'undefined') window.spawnBullet        = _noop;
    if (typeof unlockAchievement  !== 'undefined') window.unlockAchievement  = _noop;
    if (typeof pickSafeSpawn      !== 'undefined') window.pickSafeSpawn      = () => null;
    if (typeof spawnLightningBolt !== 'undefined') window.spawnLightningBolt = _noop;
    if (typeof SoundManager !== 'undefined') {
      for (const k of Object.keys(SoundManager)) {
        if (typeof SoundManager[k] === 'function') SoundManager[k] = _noop;
      }
    }
    if (typeof isCombatLocked   !== 'undefined') window.isCombatLocked   = () => false;
    if (typeof isCutsceneActive !== 'undefined') window.isCutsceneActive = () => false;
    if (typeof activeFinisher   !== 'undefined') window.activeFinisher   = null;
    if (typeof qteActive        !== 'undefined') window.qteActive        = false;
    // Disable finishers: triggerFinisher sets slowMotion=0 and freezes the target at health=1
    // which breaks subsequent matches. No finisher animations are meaningful in a headless sim.
    if (typeof settings !== 'undefined') settings.finishers = false;
    if (typeof combatLock !== 'undefined' && combatLock && combatLock.blocks) {
      Object.keys(combatLock.blocks).forEach(k => { combatLock.blocks[k] = false; });
    }

    // Circuit floor is at y=460; spawn above it so fighters fall into position
    const SPAWN_Y = 380;

    // Build Sovereign — center of the Circuit
    const sov = new SovereignMK2(450, SPAWN_Y, '#ff2200', 'sword');
    sov.isAI   = true;
    sov.lives  = SOV_LIVES;
    sov._teamId = 'sim_sov'; // distinct — bots must NOT be allied with Sovereign
    sov.applyGenome(genome);

    // Build bots from seeded loadout selection
    const rng    = _makeRng(seed);
    const spawns = _BOT_SPAWNS[Math.min(numBots, _BOT_SPAWNS.length - 1)];
    const colors = ['#4488ff', '#44dd44', '#dd44dd', '#44dddd', '#dddd44', '#ff8844'];
    const bots   = [];

    for (let i = 0; i < numBots; i++) {
      const ld  = _LOADOUTS[Math.floor(rng() * _LOADOUTS.length)];
      const bot = new Fighter(spawns[i] || 300 + i * 120, SPAWN_Y, colors[i % colors.length], ld.w);
      bot.isAI         = true;
      bot.intelligence = 0.92; // hard — near peak Fighter AI
      bot._teamId      = 'sim_bots'; // shared team → areAlliedEntities() blocks bot-vs-bot damage
      bot.target       = sov;
      _applyBotClass(bot, ld.c);
      bots.push(bot);
    }

    if (bots.length > 0) sov.target = bots[0];
    window.players = [sov, ...bots];

    let kills      = 0;
    let _errSample = null;

    for (let f = 0; f < MAX_FRAMES; f++) {   // always runs full duration
      window.hitStopFrames = 0;
      window.slowMotion    = 1;
      window.aiTick        = 0;
      window.frameCount    = f;

      // Sovereign re-targets nearest living bot each frame
      const living = bots.filter(b => b.health > 0);
      if (living.length > 0) {
        sov.target = living.reduce((n, b) =>
          Math.abs(b.cx() - sov.cx()) < Math.abs(n.cx() - sov.cx()) ? b : n);
      }

      try { sov.update(); } catch (e) { if (!_errSample) _errSample = 'sov:' + e.message; }
      for (const b of bots) {
        try { b.update(); } catch (e) { if (!_errSample) _errSample = 'bot:' + e.message; }
      }

      // Sovereign death — respawn, limited lives
      if (sov.health <= 0) {
        sov.lives--;
        if (sov.lives <= 0) break;
        try { sov.onDeath(); } catch (_) {}
        sov.health = sov.maxHealth;
        sov.x = 450; sov.y = SPAWN_Y;
        sov.vx = sov.vy = 0;
        sov.ragdollTimer = sov.stunTimer = sov.hurtTimer = 0;
        sov.shielding = false; sov.state = 'idle';
      }

      // Bot deaths — always respawn (unlimited lives), count each kill
      for (const b of bots) {
        if (b.health <= 0) {
          kills++;
          try { b.onDeath(); } catch (_) {}
          b.health = b.maxHealth;
          // Respawn on opposite side from Sovereign to maintain pressure
          b.x = sov.cx() < GAME_W / 2
            ? 600 + Math.floor(rng() * 200)
            : 100 + Math.floor(rng() * 200);
          b.y = SPAWN_Y;
          b.vx = b.vy = 0;
          b.ragdollTimer = b.stunTimer = b.hurtTimer = 0;
          b.shielding = false; b.state = 'idle';
          b.target = sov;
        }
      }
    }

    window.players     = [];
    window.gameRunning = false;

    // Fitness = kill throughput over fixed duration.
    // Bots have unlimited lives so every match runs MAX_FRAMES.
    // Kills dominate; partial damage is a weak tiebreaker for zero-kill gens.
    // Dying costs Sovereign lives — mild penalty so it doesn't play suicidally.
    const partialDmg   = bots.reduce((sum, b) => sum + (b.maxHealth - b.health), 0);
    const sovLivesLost = SOV_LIVES - sov.lives;
    const fitness      = kills * 200 + partialDmg * 0.1 - sovLivesLost * 20;

    if (matchId <= 12 && _errSample) {
      console.warn(`[sim #${matchId}] ERR: ${_errSample}`);
    }

    return {
      kills,
      fitness,
      sovLivesLeft: sov.lives,
    };
  }

  // ── Async training loop ─────────────────────────────────────────────────
  // Each generation: generate K match seeds, run champion and challenger on
  // the SAME seeds (same bot loadouts), compare total kills. Higher score wins.
  function run(gens = 20, matchesPerGen = 10, numBots = 2) {
    if (_running) { console.warn('[SMK2Trainer] Already running.'); return; }
    _running  = true;
    _matchSeq = 0;
    _stubEnv();

    let champion = loadChampion();
    let gen      = 0;

    console.log(`[SMK2Trainer] Starting ${gens} gen × ${matchesPerGen} matches vs ${numBots} bot(s).`);
    console.log('[SMK2Trainer] Base champion:', JSON.stringify(champion));

    function _tick() {
      if (!_running || gen >= gens) {
        _restoreEnv();
        _running = false;
        saveChampion(champion);
        console.log(`[SMK2Trainer] Done (${gen} gen). Champion saved.`, JSON.stringify(champion));
        return;
      }

      // Fixed seeds for this generation — ensures fair comparison
      const seeds      = Array.from({ length: matchesPerGen }, () => Math.random() * 1e9 | 0);
      const challenger = mutate(champion);

      let cScore = 0, chScore = 0;
      let cKills = 0, chKills = 0;
      for (const seed of seeds) {
        const cr  = _runMatch(champion,   numBots, seed);
        const chr = _runMatch(challenger, numBots, seed);
        cScore  += cr.fitness;  cKills  += cr.kills;
        chScore += chr.fitness; chKills += chr.kills;
      }

      if (chScore > cScore) {
        champion = challenger;
        console.log(`[SMK2Trainer] Gen ${gen + 1}: NEW CHAMPION  fit ${chScore} vs ${cScore} (kills ${chKills}/${cKills})`, JSON.stringify(challenger));
      } else {
        console.log(`[SMK2Trainer] Gen ${gen + 1}: holds          fit ${cScore} vs ${chScore} (kills ${cKills}/${chKills})`);
      }

      gen++;
      setTimeout(_tick, 0);
    }

    setTimeout(_tick, 0);
  }

  // ── Stress test: throughput at each bot count ──────────────────────────
  // Bots have unlimited lives, so we measure kills-per-match at each level.
  // Reports avg kills and Sovereign survival rate across matchesPerLevel matches.
  function stressTest(maxBots = 6, matchesPerLevel = 8) {
    if (_running) { console.warn('[SMK2Trainer] Already running.'); return; }
    _running = true;
    _stubEnv();

    const champion = loadChampion();
    let numBots    = 1;

    console.log(`[SMK2Trainer] Stress test (unlimited lives): 1 → ${maxBots} bots, ${matchesPerLevel} matches/level.`);

    function _testLevel() {
      if (!_running || numBots > maxBots) {
        _restoreEnv();
        _running = false;
        console.log(`[SMK2Trainer] ── STRESS TEST COMPLETE ──`);
        return;
      }

      let totalKills = 0, totalSovLives = 0;
      for (let m = 0; m < matchesPerLevel; m++) {
        const seed = Math.random() * 1e9 | 0;
        const r    = _runMatch(champion, numBots, seed);
        totalKills    += r.kills;
        totalSovLives += r.sovLivesLeft;
      }

      const avgKills    = (totalKills / matchesPerLevel).toFixed(1);
      const avgSovLives = (totalSovLives / matchesPerLevel).toFixed(1);

      console.log(
        `[SMK2Trainer] vs ${numBots} bot(s): ` +
        `avg ${avgKills} kills/match, ` +
        `Sov avg ${avgSovLives}/5 lives remaining`
      );

      numBots++;
      setTimeout(_testLevel, 0);
    }

    setTimeout(_testLevel, 0);
  }

  function stop() {
    if (!_running) return;
    _running = false;
    _restoreEnv();
    console.log('[SMK2Trainer] Stopped.');
  }

  // ── Persistence ─────────────────────────────────────────────────────────
  function saveChampion(g) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(g)); } catch (_) {}
  }

  function loadChampion() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return { ...SMK2_DEFAULT_GENOME };
      const g   = JSON.parse(raw);
      const out = {};
      for (const k of Object.keys(SMK2_DEFAULT_GENOME)) {
        const [lo, hi] = SMK2_GENOME_RANGES[k];
        out[k] = (typeof g[k] === 'number')
          ? Math.max(lo, Math.min(hi, g[k]))
          : SMK2_DEFAULT_GENOME[k];
      }
      return out;
    } catch (_) {
      return { ...SMK2_DEFAULT_GENOME };
    }
  }

  function resetChampion() {
    try { localStorage.removeItem(LS_KEY); } catch (_) {}
    console.log('[SMK2Trainer] Genome reset to defaults.');
  }

  return { run, stop, stressTest, mutate, saveChampion, loadChampion, resetChampion };
})();
