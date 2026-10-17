'use strict';
// smb-data-mapperks.js: MAP_PERK_DEFS, spawn helpers, updateMapPerks.
// Needs smb-data-arenas.js and smb-globals.js first. Load before smb-data-mapperks-draw.js.

const MAP_PERK_DEFS = {
  ruins: {
    items: [
      { baseX: 135, baseY: 400 },
      { baseX: 450, baseY: 400 },
      { baseX: 765, baseY: 400 },
    ],
    types: ['speed','power','heal','shield','maxhp','curse_slow','curse_weak','curse_fragile','curse_maxhp_perm']
  },
  forest: {
    healZones: [{ x: 0, w: 900, healRate: 60 }]  // 60-frame heal tick
  },
  city: {
    carCooldown: 600  // frames between car runs
  },
  lava: {
    eruptionCooldown: 480
  },
  cave: {
    stalactites:       [],
    stalactiteCooldown: 0
  },
  volcano: {
    geysers:       [],
    geyserCooldown: 0
  },
  haunted: {
    ghosts:       [],
    ghostCooldown: 0
  },
  cyberpunk: {
    zapTimer:  0,
    zapActive: false,
    zapLine:   0
  },
  neonGrid: {
    boostPads: [{ x: 180, y: 478 }, { x: 540, y: 478 }, { x: 750, y: 478 }]
  },
  sovereign: {
    // The Circuit borrows three perk systems so the bot's map-tactics layer has inputs to read.
    // Deck tops are y=335 / 320 / 335.
    items: [
      { baseX: 177, baseY: 335 },
      { baseX: 450, baseY: 320 },
      { baseX: 722, baseY: 335 },
    ],
    // Same pool as ruins, curses included. The bot scores curses at 0 and never takes one.
    types: ['speed','power','heal','shield','maxhp','curse_slow','curse_weak','curse_fragile','curse_maxhp_perm']
  }
};

// Perk systems The Circuit opts into, keyed by system so per-arena blocks stay untouched.
// Items is off: curses hit only the player, and heals undid their damage.
const SOVEREIGN_PERK_SYSTEMS = { items: false, blizzard: true, meteors: true };

// True when `arena` runs `system`, natively or borrowed by The Circuit.
// Creator Studio maps opt in by name via `designerPerks` (blizzard, meteors, beast, yeti).
function _designerPerk(name) {
  return !!(currentArena && currentArena.designerPerks && currentArena.designerPerks[name]);
}

function arenaRunsPerk(key, system) {
  if (currentArenaKey === key) return true;
  if (_designerPerk(system)) return true;
  return currentArenaKey === 'sovereign' && !!SOVEREIGN_PERK_SYSTEMS[system];
}

let mapPerkState = {};

function initMapPerks(key) {
  mapItems    = [];
  mapPerkState = {};
  // Public Server lobbies have no perks. Pickups and beasts would differ per browser.
  if (window._pubHubActive) return;
  if (key === 'ruins') {
    const def = MAP_PERK_DEFS.ruins;
    for (const pos of def.items) {
      mapItems.push({
        x: pos.baseX, y: pos.baseY - 22,
        type: def.types[Math.floor(Math.random() * def.types.length)],
        collected: false, respawnIn: 0, radius: 14, animPhase: Math.random() * Math.PI * 2
      });
    }
    mapPerkState.crates       = [];
    mapPerkState.crateCooldown = 300; // first crate after 5s
  }
  if (key === 'sovereign') {
    const def = MAP_PERK_DEFS.sovereign;
    if (SOVEREIGN_PERK_SYSTEMS.items) for (const pos of def.items) {
      mapItems.push({
        x: pos.baseX, y: pos.baseY - 22,
        type: def.types[Math.floor(Math.random() * def.types.length)],
        collected: false, respawnIn: 0, radius: 14, animPhase: Math.random() * Math.PI * 2
      });
    }
    mapPerkState.crates        = [];
    mapPerkState.crateCooldown = 300;
    // Meteors and gale start on a long fuse so the opening reads as a duel.
    mapPerkState.meteors        = [];
    mapPerkState.meteorCooldown = 1500;
    mapPerkState.blizzardTimer  = 1500;
    mapPerkState.blizzardActive = false;
    mapPerkState.blizzardDir    = 1;
  }
  if (key === 'city') {
    mapPerkState.carCooldown = MAP_PERK_DEFS.city.carCooldown;
    mapPerkState.cars        = [];
  }
  if (key === 'lava') {
    mapPerkState.eruptCooldown = MAP_PERK_DEFS.lava.eruptionCooldown;
    mapPerkState.eruptions     = [];
  }
  if (key === 'cave') {
    mapPerkState.stalactites       = [];
    mapPerkState.stalactiteCooldown = 480; // first drop after ~8s
  }
  if (key === 'volcano') {
    mapPerkState.geysers       = [];
    mapPerkState.geyserCooldown = 420;
  }
  if (key === 'haunted') {
    mapPerkState.ghosts       = [];
    mapPerkState.ghostCooldown = 600;
  }
  if (key === 'cyberpunk') {
    mapPerkState.zapTimer  = 900; // first zap after 15s
    mapPerkState.zapActive = false;
    mapPerkState.zapLine   = GAME_W / 2;
  }
  if (key === 'underwater') {
    mapPerkState.bubbles = Array.from({ length: 18 }, (_, i) => ({
      x: 30 + i * 50, y: 480 + Math.random() * 40, speed: 0.6 + Math.random() * 0.8
    }));
  }
}

// Used by the forest encounter logic and the Director.
function spawnForestBeastNow() {
  if (!currentArena || forestBeast || forestBeastCooldown > 0 || window._pubHubActive) return;
  const pls = currentArena.platforms;
  if (!pls || pls.length === 0) return;
  const pl  = pls[Math.floor(Math.random() * pls.length)];
  const spawnX = pl.x + Math.random() * pl.w;
  const spawnY = pl.y - 62;
  forestBeast = new ForestBeast(spawnX, spawnY);
  // 1/10 chance: spawn as raged beast (lower HP, higher everything else)
  if (Math.random() < 0.10) {
    forestBeast.isRaged     = true;
    forestBeast.health      = 180;
    forestBeast.maxHealth   = 180;
    forestBeast.dmgMult     = 2.2;
    forestBeast.kbBonus     = 1.8;
    forestBeast.kbResist    = 0.25;
    forestBeast.color       = '#ff2200';
    forestBeast.name        = 'RAGED BEAST';
    forestBeast.dashCooldown = 60;
  }
  const livingPlayers = players.filter(p => !p.isBoss && p.health > 0);
  if (livingPlayers.length > 0) {
    forestBeast.target = livingPlayers.reduce((a, b) => a.health < b.health ? a : b);
  }
  minions.push(forestBeast);
  spawnParticles(spawnX, spawnY, forestBeast.isRaged ? '#ff2200' : '#1a8a2e', 20);
  if (settings.screenShake) screenShake = Math.max(screenShake, 10);
  const beastLabel = forestBeast.isRaged ? 'RAGED BEAST!' : 'BEAST APPEARS!';
  if (settings.dmgNumbers) damageTexts.push(new DamageText(spawnX, spawnY - 20, beastLabel, forestBeast.isRaged ? '#ff4400' : '#1aff3a'));
}

// Used by the ice encounter logic and the Director.
function spawnYetiNow() {
  if (!currentArena || yeti || yetiCooldown > 0) return;
  const spawnX = Math.random() < 0.5 ? 60 : GAME_W - 60;
  yeti = new Yeti(spawnX, 200);
  const living = players.filter(p => !p.isBoss && p.health > 0);
  yeti.target = living[0] || players[0];
  minions.push(yeti);
  spawnParticles(spawnX, 200, '#88ccff', 20);
  if (settings.dmgNumbers) damageTexts.push(new DamageText(GAME_W / 2, 80, 'A YETI APPEARS!', '#88ccff'));
}

function updateMapPerks() {
  if (!currentArena || !gameRunning) return;
  if (window._pubHubActive) return;


  // Ruins: artifact pickups
  if (arenaRunsPerk('ruins', 'items')) {
    const _itemDef = MAP_PERK_DEFS[currentArenaKey] || MAP_PERK_DEFS.ruins;
    for (const item of mapItems) {
      item.animPhase += 0.06;
      if (item.collected) {
        item.respawnIn--;
        if (item.respawnIn <= 0) {
          item.collected = false;
          item.type = _itemDef.types[Math.floor(Math.random() * _itemDef.types.length)];
        }
        continue;
      }
      for (const p of players) {
        if (p.isBoss || p.health <= 0) continue;
        const dx = p.cx() - item.x, dy = (p.y + p.h/2) - item.y;
        if (Math.hypot(dx, dy) < 28) {
          item.collected  = true;
          item.respawnIn  = 1800 + Math.random() * 600; // 30–40 s
          applyMapPerk(p, item.type);
          SoundManager.pickup();
          spawnParticles(item.x, item.y, '#ffd700', 16);
          screenShake = Math.max(screenShake, 6);
          if (settings.dmgNumbers) {
            const labels = { speed:'SWIFT!', power:'POWER!', heal:'+30 HP', shield:'SHIELD!', maxhp:'+15 MAX HP' };
            damageTexts.push(new DamageText(item.x, item.y - 20, labels[item.type] || '!', '#ffd700'));
          }
          break;
        }
      }
    }

  // Ruins: crates
    if (!mapPerkState.crates)       mapPerkState.crates       = [];
    if (mapPerkState.crateCooldown === undefined) mapPerkState.crateCooldown = 300;
    if (mapPerkState.crates.length < 3) {
      mapPerkState.crateCooldown--;
      if (mapPerkState.crateCooldown <= 0) {
        const pls = currentArena.platforms.filter(p => !p.isFloor && p.w >= 60);
        if (pls.length > 0) {
          const pl  = pls[Math.floor(Math.random() * pls.length)];
          const cx  = pl.x + 20 + Math.random() * (pl.w - 40);
          const cy  = pl.y;
          // Avoid stacking on existing crates
          const occupied = mapPerkState.crates.some(c => Math.abs(c.x - cx) < 50 && Math.abs(c.y - cy) < 40);
          if (!occupied) {
            const t = _itemDef.types[Math.floor(Math.random() * _itemDef.types.length)];
            mapPerkState.crates.push({ x: cx, y: cy, hp: 50, maxHp: 50, type: t, hitShake: 0, lastHitFrame: -30 });
          }
        }
        mapPerkState.crateCooldown = 1200 + Math.floor(Math.random() * 600); // 20–30 s
      }
    }
  // Crate hits
    for (let ci = mapPerkState.crates.length - 1; ci >= 0; ci--) {
      const crate = mapPerkState.crates[ci];
      if (crate.hitShake > 0) crate.hitShake--;
      for (const p of players) {
        if (p.health <= 0 || p.state !== 'attacking') continue;
        if (frameCount - crate.lastHitFrame < 12) continue;
        const reach = (p.weapon ? (p.weapon.range || 40) : 40) + 20;
        const inX = Math.abs(p.cx() - crate.x) < reach;
        const inY = p.y < crate.y && p.y + p.h + 10 > crate.y;
        if (inX && inY) {
          const dmg = p.weapon ? (p.weapon.damage || 10) : 10;
          crate.hp -= dmg;
          crate.hitShake = 6;
          crate.lastHitFrame = frameCount;
          spawnParticles(crate.x, crate.y - 15, '#8B5E3C', 6);
          if (crate.hp <= 0) {
            applyMapPerk(p, crate.type);
            spawnParticles(crate.x, crate.y - 15, '#ffd700', 20);
            screenShake = Math.max(screenShake, 5);
            if (settings.dmgNumbers) {
              const labels = { speed:'SWIFT!', power:'POWER!', heal:'+30 HP', shield:'SHIELD!', maxhp:'+15 MAX HP' };
              damageTexts.push(new DamageText(crate.x, crate.y - 40, labels[crate.type] || '!', '#ffd700'));
            }
            mapPerkState.crates.splice(ci, 1);
          }
          break;
        }
      }
    }
  }

  // Forest: healing
  if (currentArenaKey === 'forest' && frameCount % 90 === 0) {
    for (const p of players) {
      if (p.isBoss || p.health <= 0 || p.hurtTimer > 0) continue;
      if (p.onGround && p.health < p.maxHealth) {
        p.health = Math.min(p.maxHealth, p.health + 1);
        if (settings.particles && Math.random() < 0.4) {
          spawnParticles(p.cx(), p.y, '#44ff44', 3);
        }
      }
    }
  }

  // Forest: rare beast
  if (currentArenaKey === 'forest' || _designerPerk('beast')) {
    // Beast death starts the cooldown.
    if (forestBeast && forestBeast.health <= 0) {
      _achCheckBeastDead();
      forestBeast = null;
      forestBeastCooldown = SPAWN_CONFIG.forestBeast.respawnDelay;
    }
    if (forestBeastCooldown > 0) forestBeastCooldown--;
    // Fixed interval spawn.
    if (!forestBeast && forestBeastCooldown <= 0 && frameCount % SPAWN_CONFIG.forestBeast.spawnInterval === 0) {
      spawnForestBeastNow();
    }
  }

  // City: occasional car
  if (currentArenaKey === 'city') {
    if (!mapPerkState.cars)        mapPerkState.cars        = [];
    if (!mapPerkState.carCooldown) mapPerkState.carCooldown = MAP_PERK_DEFS.city.carCooldown;
    if (mapPerkState.carCooldown > 0) {
      mapPerkState.carCooldown--;
    } else {
      const fromLeft = Math.random() < 0.5;
      mapPerkState.cars.push({ x: fromLeft ? -60 : GAME_W + 60, y: 432,
        vx: fromLeft ? 9 : -9, warned: false, warnTimer: 60 });
      mapPerkState.carCooldown = 1200 + Math.floor(Math.random() * 800);
    }
    for (let ci = mapPerkState.cars.length - 1; ci >= 0; ci--) {
      const car = mapPerkState.cars[ci];
      if (car.warnTimer > 0) { car.warnTimer--; continue; }
      car.x += car.vx;
      if (car.x < -120 || car.x > GAME_W + 120) {
        mapPerkState.cars.splice(ci, 1); continue;
      }
      let _carExploded = false;
      for (const p of players) {
        if (p.health <= 0 || p.invincible > 0) continue;
        if (Math.abs(p.cx() - car.x) < 40 && Math.abs((p.y + p.h) - car.y) < 60) {
          if (p.isTrueForm) {
            spawnParticles(car.x, car.y - 20, '#ff8800', 16);
            spawnParticles(car.x, car.y - 20, '#ffff00', 8);
            if (settings.screenShake) screenShake = Math.max(screenShake, 14);
            car._exploded = true; _carExploded = true; break;
          }
          dealDamage(players.find(q => q.isBoss) || players[1], p, 18, 16);
        }
      }
      if (_carExploded) { mapPerkState.cars.splice(ci, 1); continue; }
    }
  }

  // Lava: eruptions
  if (currentArenaKey === 'lava') {
    if (!mapPerkState.eruptCooldown) mapPerkState.eruptCooldown = 480;
    if (!mapPerkState.eruptions)     mapPerkState.eruptions     = [];
    mapPerkState.eruptCooldown--;
    if (mapPerkState.eruptCooldown <= 0) {
      const ex = 60 + Math.random() * 780;
      mapPerkState.eruptions.push({ x: ex, timer: 180 });
      mapPerkState.eruptCooldown = 360 + Math.floor(Math.random() * 360);
    }
    for (let ei = mapPerkState.eruptions.length - 1; ei >= 0; ei--) {
      const er = mapPerkState.eruptions[ei];
      er.timer--;
      if (er.timer <= 0) { mapPerkState.eruptions.splice(ei, 1); continue; }
      if (er.timer % 5 === 0 && settings.particles && particles.length < MAX_PARTICLES) {
        const upA = -Math.PI/2 + (Math.random()-0.5)*0.5;
        const _p = _getParticle();
        _p.x = er.x; _p.y = currentArena.lavaY || 442;
        _p.vx = Math.cos(upA)*5; _p.vy = Math.sin(upA)*(8+Math.random()*8);
        _p.color = Math.random() < 0.5 ? '#ff4400' : '#ff8800';
        _p.size = 3+Math.random()*4; _p.life = 30+Math.random()*20; _p.maxLife = 50;
        particles.push(_p);
      }
      // Hit zone: 100px to each side, 250px above the lava.
      for (const p of players) {
        if (p.isBoss || p.health <= 0 || p.invincible > 0) continue;
        if (Math.abs(p.cx() - er.x) < 100 && p.y + p.h > (currentArena.lavaY || 442) - 250) {
          if (er.timer % 10 === 0) dealDamage(players.find(q => q.isBoss) || players[1], p, Math.ceil(p.maxHealth * 0.044), 8);
        }
      }
    }
  }

  // Space: falling meteorites
  if (arenaRunsPerk('space', 'meteors')) {
    const _sovMeteors = currentArenaKey === 'sovereign';
    if (!mapPerkState.meteors)         mapPerkState.meteors        = [];
    if (!mapPerkState.meteorCooldown)  mapPerkState.meteorCooldown = 1800;
    mapPerkState.meteorCooldown--;
    if (mapPerkState.meteorCooldown <= 0) {
      mapPerkState.meteorCooldown = 1200 + Math.floor(Math.random() * 600);
      const mx = 80 + Math.random() * (GAME_W - 160);
      mapPerkState.meteors.push({ x: mx, y: -20, vy: 0, warned: true, warnTimer: 90, landed: false });
    }
    for (let mi = mapPerkState.meteors.length - 1; mi >= 0; mi--) {
      const m = mapPerkState.meteors[mi];
      if (m.warnTimer > 0) { m.warnTimer--; continue; }
      m.vy += 0.55;
      m.y  += m.vy;
      if (m.y > GAME_H + 20) { mapPerkState.meteors.splice(mi, 1); continue; }
      for (const p of players) {
        if (p.health <= 0 || p.invincible > 0) continue;
        if (Math.hypot(p.cx() - m.x, p.cy() - m.y) < 55) {
          spawnParticles(m.x, m.y, '#ff8844', 14);
          // Circuit: meteors pressure position and never close out a stock.
          // A hazard kill would hand the loser a stock neither fighter earned.
          let _mDmg = 28;
          if (_sovMeteors) _mDmg = Math.max(0, Math.min(_mDmg, p.health - 1));
          if (_mDmg > 0) dealDamage(players[1] || players[0], p, _mDmg, 22);
          mapPerkState.meteors.splice(mi, 1);
          if (settings.screenShake) screenShake = Math.max(screenShake, 18);
          break;
        }
      }
      if (mi < mapPerkState.meteors.length && mapPerkState.meteors[mi].y > 455) {
        spawnParticles(m.x, 460, '#ff8844', 20);
        if (settings.screenShake) screenShake = Math.max(screenShake, 14);
        mapPerkState.meteors.splice(mi, 1);
      }
    }
  }

  // City: moving cars
  if (currentArenaKey === 'city') {
    if (!mapPerkState.cityCars)    mapPerkState.cityCars    = [];
    if (mapPerkState.carSpawnCd === undefined) mapPerkState.carSpawnCd = 180;
    mapPerkState.carSpawnCd--;
    if (mapPerkState.carSpawnCd <= 0) {
      mapPerkState.carSpawnCd = 240 + Math.floor(Math.random() * 240);
      const goRight = Math.random() < 0.5;
      mapPerkState.cityCars.push({
        x:      goRight ? -80 : GAME_W + 80,
        y:      438,            // floor level
        w:      55, h: 22,
        vx:     goRight ? 6.5 : -6.5,
        color:  ['#cc2200','#0033cc','#448800','#cc8800'][Math.floor(Math.random() * 4)],
        warned: false,
        hit:    new Set(),  // each player is hit once per car
      });
      if (settings.dmgNumbers) damageTexts.push(new DamageText(GAME_W / 2, 105, 'CAR!', '#ffcc00'));
    }
    for (let ci = mapPerkState.cityCars.length - 1; ci >= 0; ci--) {
      const car = mapPerkState.cityCars[ci];
      car.x += car.vx;
      if (car.x > GAME_W + 120 || car.x < -120) { mapPerkState.cityCars.splice(ci, 1); continue; }
      let _cityCarHit = false;
      for (const p of players) {
        if (p.health <= 0 || p.invincible > 0 || p.isBoss) continue;
        if (car.hit.has(p)) continue;
        const carCX = car.x + car.w / 2;
        const carCY = car.y - car.h / 2;
        if (Math.abs(p.cx() - carCX) < car.w / 2 + p.w / 2 &&
            Math.abs((p.y + p.h / 2) - carCY) < car.h / 2 + p.h / 2) {
          if (p.isTrueForm) {
            spawnParticles(carCX, carCY, '#ff8800', 16);
            spawnParticles(carCX, carCY, '#ffff00', 8);
            if (settings.screenShake) screenShake = Math.max(screenShake, 14);
            _cityCarHit = true; break;
          }
          car.hit.add(p);
          dealDamage(null, p, 20, 28, 1.0, false, 16);
          spawnParticles(p.cx(), p.cy(), '#ffcc00', 12);
          if (settings.screenShake) screenShake = Math.max(screenShake, 12);
          _cityCarHit = true; break;
        }
      }
      if (_cityCarHit) { mapPerkState.cityCars.splice(ci, 1); continue; }
    }
  }

  // Ice: rare yeti
  if (currentArenaKey === 'ice' || _designerPerk('yeti')) {
    if (yeti && yeti.health <= 0) { _achCheckYetiDead(); yeti = null; yetiCooldown = SPAWN_CONFIG.yeti.respawnDelay; }
    if (yetiCooldown > 0) yetiCooldown--;
    if (!yeti && yetiCooldown <= 0 && frameCount >= SPAWN_CONFIG.yeti.minDelay && frameCount % SPAWN_CONFIG.yeti.spawnInterval === 0) {
      spawnYetiNow();
    }
  }

  // Ice/snow: blizzard gusts
  if (arenaRunsPerk('ice', 'blizzard')) {
    const _sovGale = currentArenaKey === 'sovereign';
    if (mapPerkState.blizzardTimer === undefined) mapPerkState.blizzardTimer = 1200;
    if (mapPerkState.blizzardActive === undefined) mapPerkState.blizzardActive = false;
    if (mapPerkState.blizzardDir    === undefined) mapPerkState.blizzardDir    = 1;
    mapPerkState.blizzardTimer--;
    if (!mapPerkState.blizzardActive && mapPerkState.blizzardTimer <= 0) {
      mapPerkState.blizzardActive = true;
      mapPerkState.blizzardDir    = Math.random() < 0.5 ? 1 : -1;
      mapPerkState.blizzardTimer  = 180; // gust lasts 3 seconds
      if (settings.dmgNumbers) damageTexts.push(new DamageText(GAME_W / 2, 80,
        _sovGale ? 'NULL GALE!' : 'BLIZZARD!', _sovGale ? '#ff4422' : '#88ccff'));
    } else if (mapPerkState.blizzardActive && mapPerkState.blizzardTimer <= 0) {
      mapPerkState.blizzardActive = false;
      mapPerkState.blizzardTimer  = 1200 + Math.floor(Math.random() * 600);
    }
    if (mapPerkState.blizzardActive) {
      // Circuit: ring-outs are the main kill there, so a full gust would be the strongest thing on the map.
      // Cut the force, and never push anyone already off the ground.
      const _galeFloor = _sovGale ? (currentArena.platforms || []).find(pl => pl && pl.isFloor) : null;
      const pushForce = (_sovGale ? 0.34 : 1.2) * mapPerkState.blizzardDir;
      for (const p of players) {
        if (p.health <= 0) continue;
        if (_galeFloor) {
          const c = p.cx();
          const outward = (mapPerkState.blizzardDir > 0)
            ? c > _galeFloor.x + _galeFloor.w - 150
            : c < _galeFloor.x + 150;
          if (outward) continue;  // no shoving toward the drop
        }
        p.vx += pushForce;
        if (Math.random() < 0.25 && particles.length < MAX_PARTICLES) {
          const _p = _getParticle();
          _p.x = Math.random() * GAME_W; _p.y = -5;
          _p.vx = -2 * mapPerkState.blizzardDir + (Math.random()-0.5)*2;
          _p.vy = 2 + Math.random() * 2;
          _p.color = _sovGale ? 'rgba(255,80,50,0.65)' : 'rgba(200,230,255,0.7)';
          _p.size = 2 + Math.random() * 2;
          _p.life = 50; _p.maxLife = 50;
          particles.push(_p);
        }
      }
    }
  }

  // Cave: falling stalactites
  if (currentArenaKey === 'cave') {
    if (!mapPerkState.stalactites)        mapPerkState.stalactites        = [];
    if (mapPerkState.stalactiteCooldown === undefined) mapPerkState.stalactiteCooldown = 480;
    mapPerkState.stalactiteCooldown--;
    if (mapPerkState.stalactiteCooldown <= 0 && mapPerkState.stalactites.length < 5) {
      const sx = 60 + Math.random() * (GAME_W - 120);
      mapPerkState.stalactites.push({ x: sx, y: 20, vy: 0, fallen: false, warnTimer: 90 });
      mapPerkState.stalactiteCooldown = 360 + Math.floor(Math.random() * 300);
    }
    for (let si = mapPerkState.stalactites.length - 1; si >= 0; si--) {
      const st = mapPerkState.stalactites[si];
      if (st.warnTimer > 0) { st.warnTimer--; continue; }
      st.vy += 0.6;
      st.y  += st.vy;
      if (st.y > GAME_H + 20) { mapPerkState.stalactites.splice(si, 1); continue; }
      for (const p of players) {
        if (p.health <= 0 || p.invincible > 0 || p.isBoss) continue;
        if (Math.abs(p.cx() - st.x) < 18 && Math.abs((p.y + p.h / 2) - st.y) < 30) {
          dealDamage(null, p, 22, 14);
          spawnParticles(st.x, st.y, '#8a5a3a', 10);
          if (settings.screenShake) screenShake = Math.max(screenShake, 8);
          mapPerkState.stalactites.splice(si, 1);
          break;
        }
      }
    }
  }

  // Volcano: lava geysers
  if (currentArenaKey === 'volcano') {
    if (!mapPerkState.geysers)        mapPerkState.geysers        = [];
    if (mapPerkState.geyserCooldown === undefined) mapPerkState.geyserCooldown = 420;
    mapPerkState.geyserCooldown--;
    if (mapPerkState.geyserCooldown <= 0 && mapPerkState.geysers.length < 4) {
      const gx = 80 + Math.random() * (GAME_W - 160);
      mapPerkState.geysers.push({ x: gx, timer: 200 });
      mapPerkState.geyserCooldown = 300 + Math.floor(Math.random() * 300);
    }
    for (let gi = mapPerkState.geysers.length - 1; gi >= 0; gi--) {
      const gy = mapPerkState.geysers[gi];
      gy.timer--;
      if (gy.timer <= 0) { mapPerkState.geysers.splice(gi, 1); continue; }
      if (gy.timer % 4 === 0 && settings.particles && particles.length < MAX_PARTICLES) {
        const upA = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        const _p = _getParticle();
        _p.x = gy.x; _p.y = currentArena.lavaY || 442;
        _p.vx = Math.cos(upA) * 4; _p.vy = Math.sin(upA) * (9 + Math.random() * 9);
        _p.color = Math.random() < 0.5 ? '#ff5500' : '#ff9900';
        _p.size = 4 + Math.random() * 5; _p.life = 35 + Math.random() * 20; _p.maxLife = 55;
        particles.push(_p);
      }
      for (const p of players) {
        if (p.isBoss || p.health <= 0 || p.invincible > 0) continue;
        if (Math.abs(p.cx() - gy.x) < 90 && p.y + p.h > (currentArena.lavaY || 442) - 280) {
          if (gy.timer % 10 === 0) dealDamage(null, p, Math.ceil(p.maxHealth * 0.04), 7);
        }
      }
    }
  }

  // Haunted: drifting ghost NPCs
  if (currentArenaKey === 'haunted') {
    if (!mapPerkState.ghosts)        mapPerkState.ghosts        = [];
    if (mapPerkState.ghostCooldown === undefined) mapPerkState.ghostCooldown = 600;
    mapPerkState.ghostCooldown--;
    if (mapPerkState.ghostCooldown <= 0 && mapPerkState.ghosts.length < 3) {
      const fromLeft = Math.random() < 0.5;
      mapPerkState.ghosts.push({
        x: fromLeft ? -40 : GAME_W + 40,
        y: 100 + Math.random() * 300,
        vx: fromLeft ? 1.4 : -1.4,
        timer: 480
      });
      mapPerkState.ghostCooldown = 480 + Math.floor(Math.random() * 480);
    }
    for (let ghi = mapPerkState.ghosts.length - 1; ghi >= 0; ghi--) {
      const gh = mapPerkState.ghosts[ghi];
      gh.x += gh.vx;
      gh.timer--;
      if (gh.timer <= 0 || gh.x < -80 || gh.x > GAME_W + 80) {
        mapPerkState.ghosts.splice(ghi, 1); continue;
      }
      for (const p of players) {
        if (p.health <= 0 || p.invincible > 0 || p.isBoss) continue;
        if (Math.hypot(p.cx() - gh.x, p.cy() - gh.y) < 30) {
          dealDamage(null, p, 8, 5);
          spawnParticles(gh.x, gh.y, '#aa88ff', 8);
          mapPerkState.ghosts.splice(ghi, 1);
          break;
        }
      }
    }
  }

  // Neon grid: speed boost pads
  if (currentArenaKey === 'neonGrid') {
    const pads = (mapPerkState.boostPads) || [];
    for (const pad of pads) {
      for (const p of players) {
        if (p.health <= 0 || p.isBoss) continue;
        if (p.onGround && Math.abs(p.cx() - pad.x) < 30) {
          p._speedBuff = Math.max(p._speedBuff || 0, 18); // 0.3s burst
          if (frameCount % 30 === 0) spawnParticles(pad.x, pad.y, '#00ff88', 5);
        }
      }
    }
  }

  // Cyberpunk: periodic floor zap
  if (currentArenaKey === 'cyberpunk') {
    if (mapPerkState.zapTimer === undefined) mapPerkState.zapTimer = 900;
    if (mapPerkState.zapActive === undefined) mapPerkState.zapActive = false;
    mapPerkState.zapTimer--;
    if (!mapPerkState.zapActive && mapPerkState.zapTimer <= 0) {
      mapPerkState.zapActive = true;
      mapPerkState.zapLine   = 60 + Math.random() * (GAME_W - 120);
      mapPerkState.zapTimer  = 120; // zap lasts 2s
      if (settings.dmgNumbers) damageTexts.push(new DamageText(GAME_W / 2, 80, 'ZAP!', '#00eeff'));
    } else if (mapPerkState.zapActive && mapPerkState.zapTimer <= 0) {
      mapPerkState.zapActive = false;
      mapPerkState.zapTimer  = 600 + Math.floor(Math.random() * 600);
    }
    if (mapPerkState.zapActive) {
      for (const p of players) {
        if (p.health <= 0 || p.invincible > 0 || p.isBoss) continue;
        if (Math.abs(p.cx() - mapPerkState.zapLine) < 40 && p.onGround) {
          if (frameCount % 12 === 0) dealDamage(null, p, 10, 6);
        }
      }
    }
  }
}
