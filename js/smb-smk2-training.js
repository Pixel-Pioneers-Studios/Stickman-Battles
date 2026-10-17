'use strict';
// smb-smk2-training.js: Sovereign genome trainer (Sovereign vs melee bots). Needs smb-smk2-data.js and smb-smk2-class.js.
// Opponents are randomized melee bots. The aim is to observe Sovereign's spatial pressure, not a fair fight.
// Champion and challenger face the same bot loadouts per generation (same seed), so only the genome differs.
// Console: sovereign:train, sovereign:stress, sovereign:genome, sovereign:reset, sovereign:stop.

const SMK2Trainer = (() => {
  const LS_KEY = 'smk2_champion_v1';
  let _running  = false;

  // Melee only: Sovereign only adapts to melee patterns. Natural affinities plus cross-class pairings.
  const _LOADOUTS = [
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
    // Several melee weapons were missing from the pool, so Sovereign never saw them.
    // Knight is excluded on purpose: a joke class barred from boss fights (see _rerollTrollClass).
    { w: 'spear',      c: 'none'       },
    { w: 'spear',      c: 'kratos'     },
    { w: 'flail',      c: 'berserker'  },
    { w: 'whip',       c: 'none'       },
    { w: 'electricstaff', c: 'none'    },
    { w: 'fryingpan',  c: 'none'       },
    { w: 'combat',     c: 'ninja'      },
  ];

  // Duel pool: the loadouts that actually threaten him 1v1. Narrower and nastier than the crowd pool.
  const _DUEL_LOADOUTS = [
    { w: 'hammer', c: 'thor'       },
    { w: 'katana', c: 'ronin'      },
    { w: 'scythe', c: 'reaper'     },
    { w: 'axe',    c: 'kratos'     },
    { w: 'sword',  c: 'ninja'      },
    { w: 'combat', c: 'pugilist'   },
    { w: 'flail',  c: 'berserker'  },
  ];

  // Duel opponent calibration. Exposed on the API so it can be retuned.
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

  function _makeRng(seed) {
    let s = (seed * 2654435761) >>> 0;
    return () => {
      s += 0x6D2B79F5;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

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

  // Game globals are lexical `let`s, not window properties: mutate arrays in place and assign scalars bare.
  // (Functions like spawnParticles are window-backed, so window stubs still work for those.)
  let _saved = null;

  // Writes the headless sim env into the real game globals. Used by _stubEnv (once) and _runMatch (per match).
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
    // Side-effect and guard functions (window-backed, so window stubs work here)
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
    // Snapshot the real game state so it can be restored after the run (the trainer runs from the console).
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

  function _tickWorld() {
    try {
      if (typeof projectiles !== 'undefined') {
        projectiles.forEach(p => p.update());
        projectiles = projectiles.filter(p => p.active);
      }
      if (typeof minions !== 'undefined') {
        minions.forEach(m => { if (m.health > 0) m.update(); });
        minions = minions.filter(m => m.health > 0);
      }
    } catch (e) {}
  }

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

  // Opponents are scripted policies, not Fighter AIs. Fighter AIs behave the same as each other (measured),
  // so a genome trained on them only learns to beat the bot. Physics and damage still run; only the decision is replaced.
  // Every panel member uses the same kit, so the policy is the only variable.
  const SMK2_PANEL = [
    { name: 'turtle', w: 'sword', c: 'none', policy: 'turtle' },
    { name: 'rusher', w: 'sword', c: 'none', policy: 'rusher' },
    { name: 'zoner',  w: 'sword', c: 'none', policy: 'zoner'  },
    { name: 'aerial', w: 'sword', c: 'none', policy: 'aerial' },
  ];

  // Policies must use abilities too. Earlier sweeps never spent one, so no ability-based result was measurable.
  // Returns true when it consumed the frame's offensive action.
  function _policyUseKit(f, t, d, rate) {
    if (!f || !t || t.health <= 0) return false;
    if ((f.stunTimer || 0) > 0 || (f.ragdollTimer || 0) > 0) return false;
    const R = (f.weapon && f.weapon.range) || 90;
    // Super first: it is the biggest swing available and a real player spends it.
    if (f.superReady && d < R * 2.6 && typeof f.useSuper === 'function' &&
        Math.random() < (rate.sup !== undefined ? rate.sup : 0.012)) {
      f.shielding = false; f.useSuper(t); return true;
    }
    if ((f.abilityCooldown || 0) <= 0 && typeof f.ability === 'function' &&
        d < R * (rate.abiRange || 2.2) &&
        Math.random() < (rate.abi !== undefined ? rate.abi : 0.03)) {
      f.shielding = false; f.ability(t); return true;
    }
    return false;
  }
  // Exposed so smb-sov-scenarios.js upgrades stress policies through the same path.
  if (typeof window !== 'undefined') window._policyUseKit = _policyUseKit;

  function _applyPolicy(f, policy) {
    if (!f || !policy) return;
    f._policy = policy;
    // Extension hook: smb-sov-scenarios.js registers stress policies here. Checked before the switch, so the original four stay as measured.
    if (typeof SovScenarios !== 'undefined' && SovScenarios.policyFn) {
      const ext = SovScenarios.policyFn(policy);
      if (ext) { f.updateAI = ext; return; }
    }
    f.updateAI = function () {
      const t = this.target;
      if (!t || t.health <= 0) return;
      const dx = t.cx() - this.cx();
      const d  = Math.abs(dx);
      const dir = Math.sign(dx) || 1;
      this.facing = dir;
      const spd = 4.6;
      // Recover from launches, or one knockback strands the puppet airborne for the whole match.
      if (!this.onGround && this.canDoubleJump && this.vy > 2) { this.vy = -12; this.canDoubleJump = false; }
      switch (policy) {
        case 'turtle':
          // Defensive kit use: spends the ability to create space when pressured.
          if (d < 200 && _policyUseKit(this, t, d, { abi: 0.035, sup: 0.010 })) break;
          this.shielding = d < 170;
          if (d < 130) this.vx = -dir * spd * 0.8; else this.vx *= 0.8;
          if (d < 85 && this.cooldown <= 0 && Math.random() < 0.25) { this.shielding = false; this.attack(t); }
          break;
        case 'rusher':
          // Burst kit use: closes and dumps the ability at point-blank.
          if (_policyUseKit(this, t, d, { abi: 0.055, sup: 0.016, abiRange: 1.6 })) break;
          this.shielding = false;
          this.vx = dir * spd * 1.15;
          if (this.onGround && Math.random() < 0.02) this.vy = -13;
          if (d < 95 && this.cooldown <= 0) this.attack(t);
          break;
        case 'zoner':
          // The ability IS the poke for a zoner, used at the top of its range.
          if (_policyUseKit(this, t, d, { abi: 0.06, sup: 0.014, abiRange: 3.0 })) break;
      // Band tied to the weapon's own reach, so 'stay at the edge of my range' holds for any kit.
          this.shielding = false;
          { const R = (this.weapon && this.weapon.range) || 90;
            if (d < R * 0.95) this.vx = -dir * spd;
            else if (d > R * 1.9) this.vx = dir * spd * 0.6;
            else this.vx *= 0.7;
            if (d < R * 1.05 && this.cooldown <= 0) this.attack(t); }
          break;
        case 'aerial':
          if (_policyUseKit(this, t, d, { abi: 0.045, sup: 0.014, abiRange: 2.4 })) break;
          this.shielding = false;
          this.vx = dir * spd * 0.9;
          if (this.onGround) this.vy = -15;
          if (d < 110 && this.cooldown <= 0) this.attack(t);
          break;
      }
    };
  }

  let _matchSeq = 0;

  // Sovereign (genome) vs numBots melee bots. Bots respawn and matches run MAX_FRAMES, so fitness is kill throughput.
  // seed fixes the loadout picks, so the same seed gives the same opponents.
  function _runMatch(genome, numBots, seed, opts) {
    const _o    = opts || {};
    const duel  = !!_o.duel;
    // opts.lives / opts.maxFrames: overrides for calibration runs (e.g. 10 lives, ~24000 frames).
    const SOV_LIVES  = _o.lives || 5;
    const OPP_LIVES  = _o.lives || 5;    // duel only, crowd bots keep unlimited lives
    const MAX_FRAMES = _o.maxFrames || 7200; // ~2 min sim time with full-rate AI
    const matchId    = ++_matchSeq;
    // Full sim-env reset every match. Writes the real globals (see _applySimEnv).
    _applySimEnv();

    // Applied after _applySimEnv, so scenarios state only their differences. Clone the arena: ARENAS.sovereign is shipped.
    if (_o.env) {
      const base = currentArena;
      const a = Object.assign({}, base, { platforms: (base.platforms || []).map(p => Object.assign({}, p)) });
      if (_o.env.floorWidth) {
        const W = Math.max(200, Math.min(900, _o.env.floorWidth));
        // Keep one isFloor platform, or pickSafeSpawn() returns null and respawn crashes.
        const floor = a.platforms.find(p => p.isFloor) || { y: 460, h: 60, isFloor: true };
        a.platforms = [Object.assign({}, floor, { x: (900 - W) / 2, w: W, isFloor: true })];
      }
      if (_o.env.gravity) {
        const g = _o.env.gravity;
        a.isLowGravity   = g < 0.85;
        a.isHeavyGravity = g > 1.15;
        a.earthPhysics   = false;
      }
      currentArena = a;
    }

    // Circuit floor is at y=460; spawn above it so fighters fall into position
    const SPAWN_Y = 380;

    // Sovereign at the centre of the Circuit
    const sov = new SovereignMK2(450, SPAWN_Y, '#ff2200', 'sword');
    sov.isAI   = true;
    sov.lives  = SOV_LIVES;
    sov._teamId = 'sim_sov';  // bots must not be allied with him
    sov.applyGenome(genome);
    // opts.sovKit pins his weapon and class for calibration. Stat-only: his moves come from SovereignMK2.
    if (_o.sovKit && _o.sovKit.w && typeof WEAPONS !== 'undefined' && WEAPONS[_o.sovKit.w]) {
      sov.weaponKey = _o.sovKit.w;
      sov.weapon    = WEAPONS[_o.sovKit.w];
    }
    if (_o.sovKit && _o.sovKit.c) _applyBotClass(sov, _o.sovKit.c);
    // Lock the loadout, or _ensureMatchLoadout() re-picks on his first frame and overwrites the pin.
    if (_o.sovKit && (_o.sovKit.w || _o.sovKit.c)) sov._loadoutLocked = true;

    const rng    = _makeRng(seed);
    const spawns = _BOT_SPAWNS[Math.min(numBots, _BOT_SPAWNS.length - 1)];
    const colors = ['#4488ff', '#44dd44', '#dd44dd', '#44dddd', '#dddd44', '#ff8844'];
    const bots   = [];

    const pool = duel ? _DUEL_LOADOUTS : _LOADOUTS;
    // panel: one scripted opponent of a named archetype. Implies duel.
    const panel = _o.panel || null;
    // roster: per-bot specs from smb-sov-scenarios.js. Takes precedence over panel and applies to every bot.
    const roster = Array.isArray(_o.roster) ? _o.roster : null;
    for (let i = 0; i < numBots; i++) {
      const rs  = roster ? roster[i % roster.length] : null;
      // opp: a fair opponent with a named kit and its own AI, no policy or stat multipliers (tools/sov-discover.js).
      const ld  = rs ? { w: rs.w, c: rs.c }
                : (_o.opp && i === 0) ? { w: _o.opp.w, c: _o.opp.c || 'none' }
                : (panel && i === 0) ? { w: panel.w, c: panel.c }
                : pool[Math.floor(rng() * pool.length)];
      const _bx = duel ? 700 : (spawns[i] || 300 + i * 120);
      // DUEL_BUFF is a calibration knob. Sim bots hit far less hard than real players, so stats are buffed to
      // match human damage taken and lockout. Tune it against real-match numbers.
      const bot = new Fighter(_bx, SPAWN_Y, colors[i % colors.length], ld.w);
      bot.isAI         = true;
      bot.aiDiff       = duel ? 'expert' : 'hard';
      bot.intelligence = duel ? 0.99 : 0.92;
      if (duel) {
        // noBuff is a control arm: DUEL_BUFF multiplies every attack, so the buff and the archetype must be separable.
        // A roster entry carries its own hp/dmg multipliers, which replace DUEL_BUFF rather than stack with it.
        const _bf = rs ? { dmg: rs.dmg || 1, hp: rs.hp || 1 }
                  : _o.noBuff ? { dmg: 1, hp: 1 } : DUEL_BUFF;
        bot.dmgMult = _bf.dmg;
        bot.maxHealth = Math.round(bot.maxHealth * _bf.hp);
        bot.health    = bot.maxHealth;
        // Scenario rosters always drop the whiff-guard. Lockout comes from chained hits, and the guard stops bots chaining.
        // scenarioGuard:'keep' leaves it in, as the control arm.
        bot._noWhiffGuard = (_o.scenarioGuard === 'keep') ? false
                          : rs ? true : !_o.noBuff;
      }
      bot._teamId      = 'sim_bots';  // shared team: bots don't hurt each other
      // AdaptiveAI names itself SOVEREIGN in its constructor, so rename it to keep logs readable.
      bot.name         = rs ? ('SCN:' + rs.policy + (roster.length > 1 ? (i + 1) : ''))
                       : (panel && i === 0) ? ('PANEL:' + panel.name) : (duel ? ('DUEL:' + ld.c) : ('BOT' + (i + 1)));
      bot.target       = sov;
      if (duel) bot.lives = OPP_LIVES;
      _applyBotClass(bot, ld.c);
      // oppHpMult: calibration knob for the human proxy (tools/human-proxy.js). Its defence is about 2x a human's,
      // so its health is scaled until its stock trade matches the human replays. Applied after _applyBotClass.
      if (_o.oppHpMult && i === 0) {
        bot.maxHealth = Math.round(bot.maxHealth * _o.oppHpMult);
        bot.health    = bot.maxHealth;
      }
      // Applied last: _applyBotClass can't touch the decision function, so the policy wins.
      if (rs) _applyPolicy(bot, rs.policy);
      else if (panel && i === 0) _applyPolicy(bot, panel.policy);
      // oppAI: an external per-frame controller for bot 0 (tools/ghost-core.js). Every frame, no whiff-guard.
      if (typeof _o.oppAI === 'function' && i === 0) {
        bot.updateAI = _o.oppAI;
        bot.aiTickInterval = 1;
        bot._noWhiffGuard = true;
      }
      bots.push(bot);
    }

    if (bots.length > 0) sov.target = bots[0];
    players.length = 0; players.push(sov, ...bots);  // in place, so the real `players` is updated

    let kills      = 0;
    let _errSample = null;
    // lockedFrames predicts stock results (32% locked lost, 11.9% locked won), so fitness has to see it.
    let lockedFrames = 0;
    let dmgTaken     = 0;
    let dmgDealt     = 0;
    let oppDeaths    = 0;
    let prevSovHp    = sov.health;
    const prevBotHp  = new Map(bots.map(b => [b, b.health]));
    let framesRun    = 0;

    // opts.record: capture frames in the .smbreplay schema so tools/proxy-stats.js can score sim matches. Duel mode, bots[0] and sov only.
    const REC_EVERY_N = 3;
    const rec = (_o.record && bots.length) ? { frames: [], events: [], recordEveryN: REC_EVERY_N } : null;
    const _snap = f => ({
      x: f.x, y: f.y, vx: f.vx || 0, vy: f.vy || 0, hp: f.health, mhp: f.maxHealth,
      atk: (f.attackTimer || 0) > 0 ? 1 : 0, sh: f.shielding ? 1 : 0, g: f.onGround ? 1 : 0,
      stn: f.stunTimer || 0, rag: f.ragdollTimer || 0, inv: f.invincible || 0, el: 0,
      lives: f.lives, wk: f.weaponKey, cls: f.charClass || 'none',
    });

    // DomainManager owns _domainRiseTimer and the sim never called it. Without a tick, Absolute Dominion rises forever
    // with gravity off, so matches were scored with a fighter who had left the arena.
    try { if (typeof DomainManager !== 'undefined' && DomainManager.reset) DomainManager.reset(); } catch (e) {}
    for (let f = 0; f < MAX_FRAMES; f++) {   // crowd mode always runs full duration
      hitStopFrames = 0;
      slowMotion    = 1;
      aiTick        = f;  // real AI cadence: every AI_TICK_INTERVAL frames
      frameCount    = f;
      framesRun     = f + 1;
      // Drawing stays stubbed; only the simulation half is advanced.
      try { if (typeof DomainManager !== 'undefined' && DomainManager.update) DomainManager.update(); } catch (e) {}

      // Sovereign re-targets nearest living bot each frame
      const living = bots.filter(b => b.health > 0);
      if (living.length > 0) {
        sov.target = living.reduce((n, b) =>
          Math.abs(b.cx() - sov.cx()) < Math.abs(n.cx() - sov.cx()) ? b : n);
      }

      // Same order as gameLoop. Without it the familiar and the Gunner's death burst never act, skewing those scores.
      _tickWorld();

      try { sov.update(); } catch (e) { if (!_errSample) _errSample = 'sov:' + e.message; }
      for (const b of bots) {
        try { b.update(); } catch (e) { if (!_errSample) _errSample = 'bot:' + e.message; }
      }

      // Sample AFTER the updates so timers reflect this frame's hits.
      if (sov.stunTimer > 0 || sov.ragdollTimer > 0) lockedFrames++;
      // Health deltas, ignoring the jump back up on respawn.
      if (sov.health < prevSovHp) {
        dmgTaken += prevSovHp - sov.health;
        if (rec) rec.events.push({ t: 'dmg', fi: f / REC_EVERY_N, fc: f, p: 1, v: prevSovHp - sov.health, hp: sov.health });
      }
      prevSovHp = sov.health;
      for (const b of bots) {
        const ph = prevBotHp.get(b);
        if (b.health < ph) {
          dmgDealt += ph - b.health;
          if (rec && b === bots[0]) rec.events.push({ t: 'dmg', fi: f / REC_EVERY_N, fc: f, p: 0, v: ph - b.health, hp: b.health });
        }
        prevBotHp.set(b, b.health);
      }
      if (rec && f % REC_EVERY_N === 0) rec.frames.push([_snap(bots[0]), _snap(sov)]);

      // Sovereign death, respawn, limited lives
      if (sov.health <= 0) {
        if (rec) rec.events.push({ t: 'ko', fi: f / REC_EVERY_N, fc: f, p: 1 });
        sov.lives--;
        if (sov.lives <= 0) break;
        try { sov.onDeath(); } catch (_) {}
        // Per-life class state Fighter.respawn() resets in the real game.
        sov.classPerkUsed = false; sov.spartanRageTimer = 0; sov.rageStacks = 0;
        sov.health = sov.maxHealth;
        sov.x = 450; sov.y = SPAWN_Y;
        sov.vx = sov.vy = 0;
        sov.ragdollTimer = sov.stunTimer = sov.hurtTimer = 0;
        sov.shielding = false; sov.state = 'idle';
      }

      // Bot deaths. Crowd: unlimited lives. Duel: finite stocks, as in the real game.
      let _duelOver = false;
      for (const b of bots) {
        if (b.health <= 0) {
          if (rec && b === bots[0]) rec.events.push({ t: 'ko', fi: f / REC_EVERY_N, fc: f, p: 0 });
          kills++;
          if (duel) {
            b.lives--;
            oppDeaths++;
            if (b.lives <= 0) { _duelOver = true; break; }
          }
          try { b.onDeath(); } catch (_) {}
          b.classPerkUsed = false; b.spartanRageTimer = 0; b.rageStacks = 0;
          b.health = b.maxHealth;
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

    // Close his arsenal sample and inference counts here: the sim never runs endGame.
    try { if (sov._arsenalCommit) sov._arsenalCommit('end'); } catch (e) {}
    try { if (sov._commitMech) sov._commitMech(); } catch (e) {}
    players.length = 0;  // restored in _restoreEnv
    gameRunning    = false;

    // Fitness: deaths cost more, damage taken counts, and lockedFrames (being juggled) is scored.
    // Over a 7200-frame match dmgDealt is ~500-2000 and lockedFrames ~500-2500, so the 0.25 weight is meaningful.
    const sovLivesLost = SOV_LIVES - sov.lives;
    const lockedPct    = framesRun > 0 ? lockedFrames / framesRun : 0;

    let fitness;
    if (duel) {
      // Duel: the stock differential is the result, so it dominates. Damage and lockout break ties.
      const stockDiff = oppDeaths - sovLivesLost;
      fitness = stockDiff * 400
              + dmgDealt * 0.5
              - dmgTaken * 0.5
              - lockedFrames * 0.25;
    } else {
      // Crowd: kill throughput still leads, but survival counts.
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
      // Surfaced so training output shows why a genome scored what it did.
      lockedPct: Math.round(lockedPct * 1000) / 10,
      dmgDealt:  Math.round(dmgDealt),
      dmgTaken:  Math.round(dmgTaken),
      // Damage per 1000 frames, so matches of different length compare fairly with replays.
      framesRun,
      oppDeaths,
      duel,
      // The grid's learned state, surfaced so tools/sov-vector.js can accumulate it into data/sov-artifact.json.
      grid: sov._tacticGrid || {},
      // Times the grid released the super bank early. Surfaced so a null result and a gate that never ran look different.
      gridSupers: sov._gridSupers || 0,
      // Plans completed and swings a plan held, for the tactic-plan layer.
      planCount:  sov._planCount  || 0,
      planVetoed: sov._planVetoed || 0,
      planStat:   sov._planStat   || {},
      baitHeld:   sov._baitHeld   || 0,
      killCredits: sov._killCredits || 0,
      swarmSeen:   sov._swarmSeen   || 0,
      rec,
    };
  }

  // Runs gA and gB on the same seeds, so only the genome differs. Returns summed fitness, kills and per-match win counts.
  // Half the seeds are 1v1 duels against the strong pool, half crowd fights. Swarm-only training tuned for farming weak bots.
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

  // A challenger is better only if it wins more paired matches, not on summed fitness (outlier kill-heavy matches skew it).
  function _challengerBeats(r) {
    const need = Math.max(2, Math.ceil(r.n * 0.15)); // must win ≥15% of n more matches
    return (r.bWins - r.aWins) >= need && r.bFit >= r.aFit;
  }

  // Champion vs mutated challenger on the same seeds. A challenger is promoted only after it wins a fresh confirmation batch too.
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
        // Persist the evolved genome only if it beats the starting genome on a large fresh batch, so training never regresses.
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

      // Batch 1: champion vs challenger, paired seeds.
      const r1 = _evalPair(champion, challenger, numBots, _mkSeeds());

      let promote = false, r2 = null;
      if (_challengerBeats(r1)) {
        // Confirmation batch, fresh seeds; must win AGAIN to promote.
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

  // Bots have unlimited lives, so this reports kills per match and survival rate per level.
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

  // Checks whether the trained genome really beats the old one. Same seeds, so the comparison is apples to apples.
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

  // runMatch is exported so one match can be inspected directly, e.g. SMK2Trainer.runMatch(SMK2Trainer.loadChampion(), 1, 12345, { duel: true }).
  function runMatch(genome, numBots, seed, opts) {
    _stubEnv();
    try { return _runMatch(genome || loadChampion(), numBots || 1, seed || (Math.random() * 1e9 | 0), opts); }
    finally { _restoreEnv(); }
  }

  // Panel evolution: crossover over a behavioural opponent panel.
  // run() is a (1+1) hill-climber against one pool, so it can only learn 'beats this bot'.
  // Here each genome is scored against every panel archetype and ranked by its WORST panel score.
  // Parents are picked to complement each other and crossed gene by gene. The panel is four scripted policies, not humans.

  function crossover(a, b, rng) {
    const R = rng || Math.random;
    const out = {};
    for (const key of Object.keys(SMK2_DEFAULT_GENOME)) {
      const [lo, hi] = SMK2_GENOME_RANGES[key];
      // Blend crossover: children can land just outside the parents' span, so the population doesn't stall on the box corners.
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

  // Pick parents that cover for each other: the best overall, then whoever is strongest where the first is weakest.
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

      // Elitism: both parents survive, since a crossover can be worse than either. Plus children and one fresh mutant.
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

  // Adopt the last panel winner as champion only if it beats the incumbent on a fresh panel batch.
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
           DUEL_BUFF,
           // For drills that build their own two-fighter scene (tools/sov-movelab.js).
           simEnv: { stub: _stubEnv, apply: _applySimEnv, restore: _restoreEnv, tickWorld: _tickWorld, applyClass: _applyBotClass } };
})();
