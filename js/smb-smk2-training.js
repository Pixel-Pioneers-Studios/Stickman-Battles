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
    // ── Coverage gaps (added 2026-08-23) ──────────────────────────────────
    // Several melee weapons were missing despite the pool being documented as
    // melee-only — you cannot adapt to a pattern you never see.
    //
    // Megaknight is deliberately NOT here. It is a troll class with intentionally
    // absurd stats, and it is barred from boss fights entirely (see
    // _rerollTrollClass in smb-menu-spawn.js). Training against a joke loadout
    // would drag the genome toward countering something Sovereign never faces.
    { w: 'spear',      c: 'none'       },
    { w: 'spear',      c: 'kratos'     },
    { w: 'flail',      c: 'berserker'  },
    { w: 'whip',       c: 'none'       },
    { w: 'electricstaff', c: 'none'    },
    { w: 'fryingpan',  c: 'none'       },
    { w: 'combat',     c: 'ninja'      },
  ];

  // Duel-mode pool: the loadouts that actually threaten him 1v1. Deliberately
  // narrower and nastier than the crowd pool — duel training is about surviving
  // a strong single opponent, not managing a swarm.
  const _DUEL_LOADOUTS = [
    { w: 'hammer', c: 'thor'       },
    { w: 'katana', c: 'ronin'      },
    { w: 'scythe', c: 'reaper'     },
    { w: 'axe',    c: 'kratos'     },
    { w: 'sword',  c: 'ninja'      },
    { w: 'combat', c: 'pugilist'   },
    { w: 'flail',  c: 'berserker'  },
  ];

  // Duel opponent calibration — see the note at the bot-construction site.
  // Exposed on the API so it can be retuned without editing the file.
  const DUEL_BUFF = { dmg: 2.2, hp: 1.6 };

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
  // CRITICAL: game globals (players, currentArena, gameMode, frameCount, …) are
  // lexical `let` bindings, NOT window properties — `window.X = …` creates a
  // SEPARATE property the game never reads, so the old stub left the real
  // `players` empty and every bot's _acquireAITarget() returned null → bots
  // stood idle (0 swings) and the trainer was just Sovereign farming dummies.
  // Fix: mutate arrays IN PLACE (`players.length=0; players.push(…)`) and write
  // scalars via BARE assignment. (Functions like spawnParticles/isCombatLocked
  // ARE window-backed, so window stubs still work for those.)
  let _saved = null;

  // Write the headless sim environment into the real (lexical) game globals.
  // Shared by _stubEnv (once) and _runMatch (per match).
  function _applySimEnv() {
    const _noop = () => {};
    currentArena = (typeof ARENAS !== 'undefined' && ARENAS.sovereign)
      ? ARENAS.sovereign
      : { id: 'sim', bgColor: '#000', platforms: [{ x: 0, y: 460, w: 900, h: 60, isFloor: true }] };
    players.length = 0;
    if (typeof minions          !== 'undefined') minions.length         = 0;
    if (typeof trainingDummies  !== 'undefined') trainingDummies.length = 0;
    if (typeof verletRagdolls   !== 'undefined') verletRagdolls.length  = 0;
    if (typeof projectiles      !== 'undefined') projectiles.length     = 0;
    if (typeof damageTexts      !== 'undefined') damageTexts.length     = 0;
    hitStopFrames   = 0;
    slowMotion      = 1;   // a prior hit-stop/finisher may have set this to 0
    screenShake     = 0;
    isCinematic     = false;
    activeCinematic = null;
    storyModeActive = false;
    gameRunning     = true;
    gameMode        = 'sovereign';
    onlineMode      = false;
    if (typeof trainingMode      !== 'undefined') trainingMode      = false;
    if (typeof trainingChaosMode !== 'undefined') trainingChaosMode = false;
    if (typeof activeFinisher    !== 'undefined') activeFinisher    = null;
    if (typeof qteActive         !== 'undefined') qteActive         = false;
    if (typeof settings !== 'undefined') { settings.finishers = false; settings.dmgNumbers = false; }
    if (typeof combatLock !== 'undefined' && combatLock && combatLock.blocks) {
      Object.keys(combatLock.blocks).forEach(k => { combatLock.blocks[k] = false; });
    }
    // Side-effect / guard functions (window-backed — window stubs work here)
    window.spawnParticles   = _noop;
    window.showBossDialogue = _noop;
    if (typeof spawnBullet        !== 'undefined') window.spawnBullet        = _noop;
    if (typeof unlockAchievement  !== 'undefined') window.unlockAchievement  = _noop;
    if (typeof pickSafeSpawn      !== 'undefined') window.pickSafeSpawn      = () => null;
    if (typeof spawnLightningBolt !== 'undefined') window.spawnLightningBolt = _noop;
    if (typeof isCombatLocked     !== 'undefined') window.isCombatLocked     = () => false;
    if (typeof isCutsceneActive   !== 'undefined') window.isCutsceneActive   = () => false;
    if (typeof SoundManager !== 'undefined') {
      for (const k of Object.keys(SoundManager)) {
        if (typeof SoundManager[k] === 'function') SoundManager[k] = _noop;
      }
    }
  }

  function _stubEnv() {
    // Snapshot the REAL game state (bare reads / array copies) so we can restore
    // it after the run — the trainer is launched from the in-game console.
    _saved = {
      players:          players.slice(),
      minions:          (typeof minions !== 'undefined')         ? minions.slice()         : undefined,
      trainingDummies:  (typeof trainingDummies !== 'undefined') ? trainingDummies.slice() : undefined,
      verletRagdolls:   (typeof verletRagdolls !== 'undefined')  ? verletRagdolls.slice()  : undefined,
      projectiles:      (typeof projectiles !== 'undefined')     ? projectiles.slice()     : undefined,
      damageTexts:      (typeof damageTexts !== 'undefined')     ? damageTexts.slice()     : undefined,
      isCinematic, activeCinematic, hitStopFrames, slowMotion, screenShake,
      storyModeActive, gameRunning, gameMode, onlineMode, currentArena, aiTick, frameCount,
      trainingMode:      (typeof trainingMode !== 'undefined')      ? trainingMode      : undefined,
      trainingChaosMode: (typeof trainingChaosMode !== 'undefined') ? trainingChaosMode : undefined,
      spawnParticles:    (typeof window.spawnParticles   !== 'undefined') ? window.spawnParticles   : undefined,
      spawnBullet:       (typeof window.spawnBullet      !== 'undefined') ? window.spawnBullet      : undefined,
      showBossDialogue:  (typeof window.showBossDialogue !== 'undefined') ? window.showBossDialogue : undefined,
      unlockAchievement: (typeof window.unlockAchievement!== 'undefined') ? window.unlockAchievement: undefined,
      pickSafeSpawn:     (typeof window.pickSafeSpawn    !== 'undefined') ? window.pickSafeSpawn    : undefined,
      spawnLightningBolt:(typeof window.spawnLightningBolt!=='undefined') ? window.spawnLightningBolt: undefined,
      isCombatLocked:    (typeof window.isCombatLocked   !== 'undefined') ? window.isCombatLocked   : undefined,
      isCutsceneActive:  (typeof window.isCutsceneActive !== 'undefined') ? window.isCutsceneActive : undefined,
      finishers:         (typeof settings !== 'undefined') ? settings.finishers : undefined,
      dmgNumbers:        (typeof settings !== 'undefined') ? settings.dmgNumbers : undefined,
      smSounds:          {},
    };
    if (typeof SoundManager !== 'undefined') {
      for (const k of Object.keys(SoundManager)) {
        if (typeof SoundManager[k] === 'function') _saved.smSounds[k] = SoundManager[k];
      }
    }
    _applySimEnv();
  }

  function _restoreEnv() {
    if (!_saved) return;
    const s = _saved;
    const _restoreArr = (cond, arr, saved) => { if (cond && saved !== undefined) { arr.length = 0; arr.push(...saved); } };
    _restoreArr(true, players, s.players);
    _restoreArr(typeof minions !== 'undefined',         (typeof minions !== 'undefined') ? minions : [],                 s.minions);
    _restoreArr(typeof trainingDummies !== 'undefined', (typeof trainingDummies !== 'undefined') ? trainingDummies : [], s.trainingDummies);
    _restoreArr(typeof verletRagdolls !== 'undefined',  (typeof verletRagdolls !== 'undefined') ? verletRagdolls : [],   s.verletRagdolls);
    _restoreArr(typeof projectiles !== 'undefined',     (typeof projectiles !== 'undefined') ? projectiles : [],         s.projectiles);
    _restoreArr(typeof damageTexts !== 'undefined',     (typeof damageTexts !== 'undefined') ? damageTexts : [],         s.damageTexts);
    isCinematic = s.isCinematic; activeCinematic = s.activeCinematic;
    hitStopFrames = s.hitStopFrames; slowMotion = s.slowMotion; screenShake = s.screenShake;
    storyModeActive = s.storyModeActive; gameRunning = s.gameRunning;
    gameMode = s.gameMode; onlineMode = s.onlineMode; currentArena = s.currentArena;
    aiTick = s.aiTick; frameCount = s.frameCount;
    if (typeof trainingMode !== 'undefined'      && s.trainingMode      !== undefined) trainingMode      = s.trainingMode;
    if (typeof trainingChaosMode !== 'undefined' && s.trainingChaosMode !== undefined) trainingChaosMode = s.trainingChaosMode;
    const _rf = (n, v) => { if (v !== undefined) window[n] = v; };
    _rf('spawnParticles',    s.spawnParticles);
    _rf('spawnBullet',       s.spawnBullet);
    _rf('showBossDialogue',  s.showBossDialogue);
    _rf('unlockAchievement', s.unlockAchievement);
    _rf('pickSafeSpawn',     s.pickSafeSpawn);
    _rf('spawnLightningBolt',s.spawnLightningBolt);
    _rf('isCombatLocked',    s.isCombatLocked);
    _rf('isCutsceneActive',  s.isCutsceneActive);
    if (typeof settings !== 'undefined') {
      if (s.finishers  !== undefined) settings.finishers  = s.finishers;
      if (s.dmgNumbers !== undefined) settings.dmgNumbers = s.dmgNumbers;
    }
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
  // ── SCRIPTED ARCHETYPE PANEL ────────────────────────────────────────────
  // Why this exists: the trainer's duel opponent is one Fighter AI holding a
  // random weapon, and measurement showed those opponents are behaviourally
  // IDENTICAL to each other — across 12 trials their attack rate (0.02-0.09),
  // airborne share (0.22-0.87) and close share (0.53-0.94) overlapped almost
  // completely. A genome trained against them can only learn "beat the bot",
  // which is why the champion generalizes to nothing. Real opponents differ by
  // BEHAVIOUR, so the panel supplies behaviour directly.
  //
  // Physics, damage, collision and every combat rule still run normally — only
  // the decision function is replaced, so each panel member is a real fighter
  // that happens to be predictable in a specific, nameable way.
  // EVERY panel member carries the SAME kit. The first version varied weapon and
  // class alongside policy, which made the panel measure nothing cleanly — and it
  // shipped a live bug while doing so: `assassin` is not a key in CLASSES, so
  // applyClass() bailed silently (the same silent-bail that once left 104 story
  // enemies classless) and that puppet kept default 150 HP against the
  // berserker's 130. After the 1.6x duel buff that is 240 vs 208, so the
  // archetype that "beat" Sovereign 10-0 was also the one carrying 15% more
  // health. Holding the kit fixed is what makes a difference in win rate
  // attributable to BEHAVIOUR, which is the only thing this panel is for.
  const SMK2_PANEL = [
    { name: 'turtle', w: 'sword', c: 'none', policy: 'turtle' },
    { name: 'rusher', w: 'sword', c: 'none', policy: 'rusher' },
    { name: 'zoner',  w: 'sword', c: 'none', policy: 'zoner'  },
    { name: 'aerial', w: 'sword', c: 'none', policy: 'aerial' },
  ];

  function _applyPolicy(f, policy) {
    if (!f || !policy) return;
    f._policy = policy;
    f.updateAI = function () {
      const t = this.target;
      if (!t || t.health <= 0) return;
      const dx = t.cx() - this.cx();
      const d  = Math.abs(dx);
      const dir = Math.sign(dx) || 1;
      this.facing = dir;
      const spd = 4.6;
      // Every policy can recover from a launch. Without this a single knockback
      // strands the puppet airborne for the rest of the match and the sample is
      // worthless (measured: one trial spent 100% of its frames off the ground).
      if (!this.onGround && this.canDoubleJump && this.vy > 2) { this.vy = -12; this.canDoubleJump = false; }
      switch (policy) {
        case 'turtle':
          this.shielding = d < 170;
          if (d < 130) this.vx = -dir * spd * 0.8; else this.vx *= 0.8;
          if (d < 85 && this.cooldown <= 0 && Math.random() < 0.25) { this.shielding = false; this.attack(t); }
          break;
        case 'rusher':
          this.shielding = false;
          this.vx = dir * spd * 1.15;
          if (this.onGround && Math.random() < 0.02) this.vy = -13;
          if (d < 95 && this.cooldown <= 0) this.attack(t);
          break;
        case 'zoner':
          // Band is tied to the weapon's own reach rather than to fixed pixels, so
          // the policy still means "stay at the edge of my range" whatever kit the
          // panel holds.
          this.shielding = false;
          { const R = (this.weapon && this.weapon.range) || 90;
            if (d < R * 0.95) this.vx = -dir * spd;
            else if (d > R * 1.9) this.vx = dir * spd * 0.6;
            else this.vx *= 0.7;
            if (d < R * 1.05 && this.cooldown <= 0) this.attack(t); }
          break;
        case 'aerial':
          this.shielding = false;
          this.vx = dir * spd * 0.9;
          if (this.onGround) this.vy = -15;
          if (d < 110 && this.cooldown <= 0) this.attack(t);
          break;
      }
    };
  }

  let _matchSeq = 0;

  // ── Single headless match ───────────────────────────────────────────────
  // Sovereign (genome) vs numBots melee bots (unlimited lives — bots respawn).
  // Matches always run MAX_FRAMES so fitness is kill throughput, not a win/loss.
  // seed controls loadout picks — same seed = same opponents for fair comparison.
  function _runMatch(genome, numBots, seed, opts) {
    const _o    = opts || {};
    const duel  = !!_o.duel;
    const SOV_LIVES  = 5;
    const OPP_LIVES  = 5;    // duel only — crowd bots keep unlimited lives
    const MAX_FRAMES = 7200; // ~2 min sim time with full-rate AI
    const matchId    = ++_matchSeq;
    // Full sim-env reset every match — guards against game-loop interference
    // during setTimeout yields AND against state accumulated by prior matches.
    // Writes the real (lexical) globals via in-place array mutation + bare
    // assignment so Fighter.update() actually reads them (see _applySimEnv note).
    _applySimEnv();

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

    const pool = duel ? _DUEL_LOADOUTS : _LOADOUTS;
    // Panel mode: one scripted opponent of a named archetype, instead of a
    // seeded random loadout. Implies duel.
    const panel = _o.panel || null;
    for (let i = 0; i < numBots; i++) {
      const ld  = (panel && i === 0) ? { w: panel.w, c: panel.c } : pool[Math.floor(rng() * pool.length)];
      const _bx = duel ? 700 : (spawns[i] || 300 + i * 120);
      // ── Duel opponent strength ────────────────────────────────────────────
      // The sim's core problem, measured 2026-08-23: no AI opponent available
      // here comes close to a real player. A real Megaknight match did 1210
      // damage to Sovereign and locked him 32% of the time. The sim's best
      // efforts: expert Fighter duel 192 damage / 1.9% locked; 50 crowd bots
      // 268 damage and LESS lockout than 3 bots; AdaptiveAI duel opponent a
      // mere 19 damage (it baits — stands still to invite a punish — which is
      // free damage against a Sovereign who never hesitates).
      //
      // Since no available brain supplies the pressure, it is supplied by
      // stats instead. DUEL_BUFF is a calibration knob, not a fantasy: it
      // exists purely to drag sim damage-taken and lockout toward what a human
      // actually inflicts, so the fitness terms measuring those have something
      // to select against. Tune it against real-match numbers, not vibes.
      const bot = new Fighter(_bx, SPAWN_Y, colors[i % colors.length], ld.w);
      bot.isAI         = true;
      bot.aiDiff       = duel ? 'expert' : 'hard';
      bot.intelligence = duel ? 0.99 : 0.92;
      if (duel) {
        // `noBuff` exists as a CONTROL, not a convenience. The panel archetypes
        // differ in how often they attack, and DUEL_BUFF multiplies every attack
        // by 2.2 — so "Sovereign loses to aggressive archetypes" and "Sovereign
        // loses to whichever archetype cashes in the damage buff most often" are
        // the same measurement unless the buff can be switched off. Any claim
        // about a behavioural weakness has to survive this control.
        const _bf = _o.noBuff ? { dmg: 1, hp: 1 } : DUEL_BUFF;
        bot.dmgMult = _bf.dmg;
        bot.maxHealth = Math.round(bot.maxHealth * _bf.hp);
        bot.health    = bot.maxHealth;
        // THE important one. Stat buffs barely moved lockout (5.7% -> 4.1% as
        // damage went 2.2x -> 5x) because lockout comes from CHAINED hits, not
        // big ones — and the AI whiff-guard makes bots hold their swing unless a
        // hit is plausible, so they never chain. A human does. Removing the
        // guard for the opponent alone roughly doubled lockout. Per-fighter, so
        // Sovereign keeps his own guard intact.
        bot._noWhiffGuard = !_o.noBuff;
      }
      bot._teamId      = 'sim_bots'; // shared team → areAlliedEntities() blocks bot-vs-bot damage
      // AdaptiveAI names itself 'SOVEREIGN' in its constructor — rename so match
      // logs don't show two of him.
      bot.name         = (panel && i === 0) ? ('PANEL:' + panel.name) : (duel ? ('DUEL:' + ld.c) : ('BOT' + (i + 1)));
      bot.target       = sov;
      if (duel) bot.lives = OPP_LIVES;
      _applyBotClass(bot, ld.c);
      // Applied AFTER class setup: _applyBotClass can touch stats but never the
      // decision function, and the policy must be the last word on updateAI.
      if (panel && i === 0) _applyPolicy(bot, panel.policy);
      bots.push(bot);
    }

    if (bots.length > 0) sov.target = bots[0];
    players.length = 0; players.push(sov, ...bots); // in-place → real lexical `players`

    let kills      = 0;
    let _errSample = null;
    // ── Outcome tracking ────────────────────────────────────────────────────
    // lockedFrames is the important one. A full-match measurement on 2026-08-23
    // showed it predicting both results cleanly: 32% locked -> Sovereign lost
    // 10-8; 11.9% locked -> he won 10-0. The old fitness could not see it at all,
    // so the GA had no way to select against being juggled.
    let lockedFrames = 0;
    let dmgTaken     = 0;
    let dmgDealt     = 0;
    let oppDeaths    = 0;
    let prevSovHp    = sov.health;
    const prevBotHp  = new Map(bots.map(b => [b, b.health]));
    let framesRun    = 0;

    for (let f = 0; f < MAX_FRAMES; f++) {   // crowd mode always runs full duration
      hitStopFrames = 0;
      slowMotion    = 1;
      aiTick        = f;   // REAL cadence: AI re-decides every AI_TICK_INTERVAL frames (was 0 = every frame)
      frameCount    = f;
      framesRun     = f + 1;

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

      // Sample AFTER the updates so timers reflect this frame's hits.
      if (sov.stunTimer > 0 || sov.ragdollTimer > 0) lockedFrames++;
      // Health deltas, ignoring the jump back up on respawn.
      if (sov.health < prevSovHp) dmgTaken += prevSovHp - sov.health;
      prevSovHp = sov.health;
      for (const b of bots) {
        const ph = prevBotHp.get(b);
        if (b.health < ph) dmgDealt += ph - b.health;
        prevBotHp.set(b, b.health);
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

      // Bot deaths. Crowd mode: unlimited lives, respawn forever (kill throughput).
      // Duel mode: finite stocks, so the match is a real win/loss like the game.
      let _duelOver = false;
      for (const b of bots) {
        if (b.health <= 0) {
          kills++;
          if (duel) {
            b.lives--;
            oppDeaths++;
            if (b.lives <= 0) { _duelOver = true; break; }
          }
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
      if (_duelOver) break;
    }

    players.length = 0;   // clear lexical `players` (final restore happens in _restoreEnv)
    gameRunning    = false;

    // ── FITNESS ─────────────────────────────────────────────────────────────
    // The old function was `kills * 200 + partialDmg * 0.1 - sovLivesLost * 20`,
    // which made one kill worth TEN of Sovereign's own deaths. Against bots with
    // unlimited lives that is coherent, but the real fight is stock-based, where
    // dying is precisely how he loses — so the GA was being rewarded for exactly
    // the behaviour that loses real matches.
    //
    // Three corrections:
    //   · deaths are now expensive enough to actually constrain the search
    //   · damage TAKEN is counted, not just damage dealt
    //   · lockedFrames enters the score, so "don't get juggled" is finally
    //     something the GA can select for. It could not see this before.
    //
    // Scale note: over a 7200-frame match dmgDealt lands ~500-2000 and
    // lockedFrames ~500-2500, so the 0.25 weight keeps lockout meaningful
    // without letting a purely evasive genome outscore one that fights.
    const sovLivesLost = SOV_LIVES - sov.lives;
    const lockedPct    = framesRun > 0 ? lockedFrames / framesRun : 0;

    let fitness;
    if (duel) {
      // Duel: stock differential is the match result, so it dominates. Damage
      // and lockout break ties between genomes that go the same stocks.
      const stockDiff = oppDeaths - sovLivesLost;
      fitness = stockDiff * 400
              + dmgDealt * 0.5
              - dmgTaken * 0.5
              - lockedFrames * 0.25;
    } else {
      // Crowd: kill throughput still leads, but survival now genuinely competes.
      fitness = kills * 120
              + dmgDealt * 0.3
              - dmgTaken * 0.6
              - lockedFrames * 0.25
              - sovLivesLost * 250;
    }

    if (matchId <= 12 && _errSample) {
      console.warn(`[sim #${matchId}] ERR: ${_errSample}`);
    }

    return {
      kills,
      fitness,
      sovLivesLeft: sov.lives,
      // Surfaced so training output can show WHY a genome scored what it did.
      lockedPct: Math.round(lockedPct * 1000) / 10,
      dmgDealt:  Math.round(dmgDealt),
      dmgTaken:  Math.round(dmgTaken),
      oppDeaths,
      duel,
    };
  }

  // ── Paired genome evaluation ────────────────────────────────────────────
  // Runs gA and gB on the SAME seeds (identical bot loadouts) so the only
  // variable is the genome. Returns summed fitness/kills plus per-match win
  // counts — the win count is a variance-robust signal (a genome that wins on
  // lucky seeds by a huge margin doesn't dominate the tally).
  // Half the seeds are evaluated as 1v1 duels against the strong pool and half as
  // crowd fights, so a promoted genome has to be good at BOTH. Training purely on
  // swarms is what produced a champion tuned for farming weak respawning bots —
  // a different skill from surviving one strong opponent, which is the real fight.
  function _evalPair(gA, gB, numBots, seeds) {
    let aFit = 0, bFit = 0, aKills = 0, bKills = 0, aWins = 0, bWins = 0;
    let aLock = 0, bLock = 0;
    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i];
      const asDuel = (i % 2 === 1);
      const opts = asDuel ? { duel: true } : null;
      const n    = asDuel ? 1 : numBots;
      const ra = _runMatch(gA, n, seed, opts);
      const rb = _runMatch(gB, n, seed, opts);
      aFit += ra.fitness; bFit += rb.fitness;
      aKills += ra.kills; bKills += rb.kills;
      aLock += ra.lockedPct; bLock += rb.lockedPct;
      if (ra.fitness > rb.fitness) aWins++; else if (rb.fitness > ra.fitness) bWins++;
    }
    const n = seeds.length;
    return { aFit, bFit, aKills, bKills, aWins, bWins, n,
             aLock: Math.round(aLock / n * 10) / 10,
             bLock: Math.round(bLock / n * 10) / 10 };
  }

  // A challenger is "better" only if it wins clearly MORE individual (paired)
  // matches — NOT if it has higher summed fitness. Fitness sums are dominated by
  // a few outlier high-kill matches, so a genome can "win on fitness" while
  // actually tying or losing the head-to-head; that's how training drifts into
  // degenerate bot-farming genomes (max aggression/speed) that are worse vs a
  // real player. Win-count is one vote per match → variance-robust.
  function _challengerBeats(r) {
    const need = Math.max(2, Math.ceil(r.n * 0.15)); // must win ≥15% of n more matches
    return (r.bWins - r.aWins) >= need && r.bFit >= r.aFit;
  }

  // ── Async training loop ─────────────────────────────────────────────────
  // Each generation: champion vs a mutated challenger on the SAME seeds. A
  // challenger is promoted ONLY if it beats the champion by the margin AND wins
  // the per-match tally — then it must REPEAT that on a fresh confirmation batch.
  // Requiring two independent wins squares the false-positive rate, so noisy
  // lucky-seed challengers no longer cause genome drift (the old loop's flaw).
  function run(gens = 20, matchesPerGen = 10, numBots = 2) {
    if (_running) { console.warn('[SMK2Trainer] Already running.'); return; }
    _running  = true;
    _matchSeq = 0;
    _stubEnv();

    let champion = loadChampion();
    const _initial = champion;   // reference to the genome we started from (promotions reassign `champion`)
    let gen      = 0;

    console.log(`[SMK2Trainer] Starting ${gens} gen × ${matchesPerGen} matches vs ${numBots} bot(s).`);
    console.log('[SMK2Trainer] Base champion:', JSON.stringify(champion));

    function _tick() {
      if (!_running || gen >= gens) {
        // ── FINAL GATEKEEPER ──────────────────────────────────────────────
        // Per-gen selection is noisy; over many gens the champion can drift
        // WORSE than where it started (the genome sits near a local optimum, so
        // the landscape is flatter than the variance). Only persist the evolved
        // genome if it beats the STARTING genome on a large fresh batch —
        // training must never regress what's saved.
        let kept = champion;
        if (champion !== _initial) {
          const gate = _evalPair(_initial, champion, numBots,
            Array.from({ length: Math.max(60, matchesPerGen * 5) }, () => Math.random() * 1e9 | 0));
          if (_challengerBeats(gate)) {
            console.log(`[SMK2Trainer] Final check: evolved genome CONFIRMED better than start ` +
              `(${Math.round(gate.bFit)} vs ${Math.round(gate.aFit)}, wins ${gate.bWins}-${gate.aWins}).`);
          } else {
            kept = _initial;
            console.log(`[SMK2Trainer] Final check: evolved genome did NOT beat the starting genome ` +
              `(${Math.round(gate.bFit)} vs ${Math.round(gate.aFit)}, wins ${gate.bWins}-${gate.aWins}) — KEEPING ORIGINAL.`);
          }
        }
        _restoreEnv();
        _running = false;
        saveChampion(kept);
        console.log(`[SMK2Trainer] Done (${gen} gen). Champion saved.`, JSON.stringify(kept));
        return;
      }

      const _mkSeeds = () => Array.from({ length: matchesPerGen }, () => Math.random() * 1e9 | 0);
      const challenger = mutate(champion);

      // Batch 1 — champion vs challenger, paired on identical seeds.
      const r1 = _evalPair(champion, challenger, numBots, _mkSeeds());

      let promote = false, r2 = null;
      if (_challengerBeats(r1)) {
        // Confirmation batch — fresh seeds; must win AGAIN to promote.
        r2 = _evalPair(champion, challenger, numBots, _mkSeeds());
        promote = _challengerBeats(r2);
      }

      if (promote) {
        champion = challenger;
        console.log(`[SMK2Trainer] Gen ${gen + 1}: NEW CHAMPION (confirmed)  ` +
          `b1 ${Math.round(r1.bFit)}>${Math.round(r1.aFit)} (${r1.bWins}-${r1.aWins}), ` +
          `b2 ${Math.round(r2.bFit)}>${Math.round(r2.aFit)} (${r2.bWins}-${r2.aWins})`, JSON.stringify(challenger));
      } else {
        const why = r2 ? 'confirmation failed' : 'below margin';
        console.log(`[SMK2Trainer] Gen ${gen + 1}: holds (${why})  ` +
          `champ ${Math.round(r1.aFit)} vs chal ${Math.round(r1.bFit)} (wins ${r1.aWins}-${r1.bWins}, ` +
          `kills ${r1.aKills}/${r1.bKills}, locked ${r1.aLock}%/${r1.bLock}%)`);
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

  // ── Controlled A/B: saved champion vs DEFAULT genome ─────────────────────
  // The honest "is my trained genome actually better?" check — both genomes run
  // on the SAME seeds (identical matchups), so the comparison is apples-to-apples
  // (unlike the per-generation log, where seeds differ every gen). Reports avg
  // fitness/kills and per-match win counts.
  function evalVsDefault(numBots = 2, matches = 40) {
    if (_running) { console.warn('[SMK2Trainer] Already running.'); return; }
    _running = true;
    _matchSeq = 0;
    _stubEnv();
    const champ = loadChampion();
    const def   = { ...SMK2_DEFAULT_GENOME };
    const seeds = Array.from({ length: matches }, () => Math.random() * 1e9 | 0);
    let i = 0, cFit = 0, dFit = 0, cK = 0, dK = 0, cW = 0, dW = 0;
    console.log(`[SMK2Trainer] Eval: CHAMPION vs DEFAULT — ${matches} paired matches vs ${numBots} bot(s).`);
    function _chunk() {
      if (!_running || i >= seeds.length) {
        _restoreEnv();
        _running = false;
        const delta = ((cFit - dFit) / Math.max(1, Math.abs(dFit)) * 100).toFixed(1);
        console.log(`[SMK2Trainer] ── EVAL COMPLETE ──`);
        console.log(`  CHAMPION: avg fit ${(cFit / matches).toFixed(0)}, avg kills ${(cK / matches).toFixed(2)}, match-wins ${cW}/${matches}`);
        console.log(`  DEFAULT : avg fit ${(dFit / matches).toFixed(0)}, avg kills ${(dK / matches).toFixed(2)}, match-wins ${dW}/${matches}`);
        console.log(`  → Champion is ${delta}% ${cFit >= dFit ? 'BETTER' : 'WORSE'} than default (total fitness).`);
        return;
      }
      const end = Math.min(i + 4, seeds.length); // chunk to keep the page responsive
      for (; i < end; i++) {
        const rc = _runMatch(champ, numBots, seeds[i]);
        const rd = _runMatch(def,   numBots, seeds[i]);
        cFit += rc.fitness; dFit += rd.fitness; cK += rc.kills; dK += rd.kills;
        if (rc.fitness > rd.fitness) cW++; else if (rd.fitness > rc.fitness) dW++;
      }
      setTimeout(_chunk, 0);
    }
    setTimeout(_chunk, 0);
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

  // runMatch is exported so a single match can be inspected directly — the per-gen
  // log only shows aggregates, and diagnosing "is the duel path even running"
  // otherwise means editing the file.
  //   SMK2Trainer.runMatch(SMK2Trainer.loadChampion(), 1, 12345, { duel: true })
  function runMatch(genome, numBots, seed, opts) {
    _stubEnv();
    try { return _runMatch(genome || loadChampion(), numBots || 1, seed || (Math.random() * 1e9 | 0), opts); }
    finally { _restoreEnv(); }
  }

  // ══ PANEL EVOLUTION — crossover over a behavioural opponent panel ══════════
  //
  // The existing run() is a (1+1) hill-climber: one champion, one mutated
  // challenger, promote or hold. It has no population and no crossover, so the
  // only way it can combine two good ideas is to stumble on both in the same
  // random mutation. And it evaluates against a single opponent pool, so what it
  // selects for is "beats this bot" rather than "beats anyone".
  //
  // This is the other thing. Each genome is scored against EVERY panel archetype
  // and carries a fitness VECTOR. Two facts follow from that, and both matter:
  //
  //   • Ranking is by WORST-CASE panel score, not the mean. "Beats everyone" is a
  //     worst-case property. A genome that dismantles three archetypes and folds
  //     to the fourth has an excellent mean and is exactly the genome that loses
  //     to the one player who happens to fight that way.
  //
  //   • Parents are chosen to be COMPLEMENTARY — one strong where the other is
  //     weak — and crossed gene by gene. That is the "pair a Sovereign adapted to
  //     one opponent with a Sovereign adapted to another" idea: the pairing is
  //     what lets a strength discovered against a turtle combine with one
  //     discovered against a rusher, instead of the two competing.
  //
  // Honest limits, stated up front: the panel is four scripted policies, not four
  // humans. Selecting for worst-case over THIS panel proves robustness across
  // these four behaviours and nothing wider. A human who fights in a way the
  // panel does not contain is outside what this measures.

  function crossover(a, b, rng) {
    const R = rng || Math.random;
    const out = {};
    for (const key of Object.keys(SMK2_DEFAULT_GENOME)) {
      const [lo, hi] = SMK2_GENOME_RANGES[key];
      // Blend crossover (BLX): sample between the parents with a little overshoot
      // so the child can land just outside the segment they span. Pure gene-swap
      // uniform crossover can only ever produce corners of the box the parents
      // define, which stalls the moment the population converges on each axis.
      const t = R() * 1.4 - 0.2;
      out[key] = Math.max(lo, Math.min(hi, a[key] + (b[key] - a[key]) * t));
    }
    return out;
  }

  // Score one genome against the whole panel. Returns { vec, worst, mean }.
  function _evalPanel(genome, seeds) {
    const vec = {};
    for (const p of SMK2_PANEL) {
      let sum = 0;
      for (const seed of seeds) {
        const r = _runMatch(genome, 1, seed, { duel: true, panel: p });
        sum += r.fitness;
      }
      vec[p.name] = sum / seeds.length;
    }
    const vals = Object.values(vec);
    return { vec, worst: Math.min(...vals), mean: vals.reduce((a, b) => a + b, 0) / vals.length };
  }

  // Pick two parents that cover for each other: the best overall, then whoever is
  // strongest on the panel member the first one is WORST against.
  function _pickComplementaryParents(scored) {
    const a = scored[0];
    let weakest = null, weakestVal = Infinity;
    for (const k of Object.keys(a.score.vec)) {
      if (a.score.vec[k] < weakestVal) { weakestVal = a.score.vec[k]; weakest = k; }
    }
    let b = null, bestOnWeak = -Infinity;
    for (const c of scored.slice(1)) {
      if (c.score.vec[weakest] > bestOnWeak) { bestOnWeak = c.score.vec[weakest]; b = c; }
    }
    return { a, b: b || scored[1] || scored[0], weakest };
  }

  function evolvePanel(gens = 8, matchesPer = 2, popSize = 6) {
    if (_running) { console.warn('[SMK2Trainer] Already running.'); return; }
    _running = true; _matchSeq = 0; _stubEnv();

    const start = loadChampion();
    let pop = [start, ...Array.from({ length: popSize - 1 }, () => mutate(start, 0.12))];
    let gen = 0;
    let best = { g: start, score: null };

    console.log(`[SMK2Trainer] PANEL evolution: ${gens} gen x pop ${popSize} x ${matchesPer} matches x ${SMK2_PANEL.length} archetypes`);
    console.log(`[SMK2Trainer] = ${gens * popSize * matchesPer * SMK2_PANEL.length} sim matches. Ranking by WORST-CASE panel score.`);

    function _tick() {
      if (!_running || gen >= gens) {
        _restoreEnv(); _running = false;
        if (best.score) {
          console.log('[SMK2Trainer] Panel evolution done. Best worst-case:', Math.round(best.score.worst));
          console.log('  per-archetype:', Object.entries(best.score.vec).map(([k, v]) => `${k} ${Math.round(v)}`).join('  '));
          console.log('  genome:', JSON.stringify(best.g));
          console.log('  NOT saved as champion — call SMK2Trainer.saveChampion(g) to adopt it.');
        }
        _panelResult = best;
        // Surfaced for the headless driver (tools/sov-evolve.js) to read.
        try { window.__sovEvolveBest = best.score ? { genome: best.g, vec: best.score.vec, worst: best.score.worst } : null;
              window.__sovEvolveDone = true; } catch (e) {}
        return;
      }
      const seeds = Array.from({ length: matchesPer }, () => Math.random() * 1e9 | 0);
      const scored = pop.map(g => ({ g, score: _evalPanel(g, seeds) }))
                        .sort((x, y) => y.score.worst - x.score.worst);

      if (!best.score || scored[0].score.worst > best.score.worst) best = scored[0];

      const { a, b, weakest } = _pickComplementaryParents(scored);
      console.log(`[SMK2Trainer] Gen ${gen + 1}: worst-case ${Math.round(scored[0].score.worst)} ` +
        `(${Object.entries(scored[0].score.vec).map(([k, v]) => `${k} ${Math.round(v)}`).join(' ')})  ` +
        `| pairing best with strongest-vs-${weakest}`);

      // Next generation: both parents survive intact (elitism — a crossover can
      // be worse than either parent and losing them to it wastes the generation),
      // plus crossed children, plus one fresh mutant for diversity.
      const next = [a.g, b.g];
      while (next.length < popSize - 1) next.push(mutate(crossover(a.g, b.g), 0.05));
      next.push(mutate(start, 0.15));
      pop = next;
      gen++;
      setTimeout(_tick, 0);
    }
    setTimeout(_tick, 0);
  }

  let _panelResult = null;

  // Adopt the last panel-evolution winner as champion, but only after it beats
  // the incumbent on a fresh panel batch. Same discipline as run()'s final
  // gatekeeper: training must never regress what is saved.
  function adoptPanelWinner(matchesPer = 3) {
    if (!_panelResult || !_panelResult.g) { console.warn('[SMK2Trainer] No panel result — run evolvePanel() first.'); return false; }
    _stubEnv();
    const seeds = Array.from({ length: matchesPer }, () => Math.random() * 1e9 | 0);
    const inc = _evalPanel(loadChampion(), seeds);
    const chal = _evalPanel(_panelResult.g, seeds);
    _restoreEnv();
    console.log(`[SMK2Trainer] adopt check — incumbent worst ${Math.round(inc.worst)}, challenger worst ${Math.round(chal.worst)}`);
    if (chal.worst > inc.worst) { saveChampion(_panelResult.g); console.log('[SMK2Trainer] ADOPTED.'); return true; }
    console.log('[SMK2Trainer] rejected — incumbent keeps the slot.');
    return false;
  }

  return { run, stop, stressTest, evalVsDefault, mutate, saveChampion, loadChampion, resetChampion, runMatch, evolvePanel, adoptPanelWinner, crossover, SMK2_PANEL,
           DUEL_BUFF };
})();
