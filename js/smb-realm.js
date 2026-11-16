'use strict';
// smb-realm.js: Realm mode. A connected world of rooms joined by doors, the first step of the God of War
// direction (docs/god-of-war-plan.md). Rooms are data in REALM_DEFS; one room is the live arena at a time.
// The realm remembers where you have been, which chests you opened and the last checkpoint door you came
// through, per account, so leaving a room and coming back finds it as you left it.
//
// Door kinds:
//   edge  side: 'l' | 'r'. Walk into the room's left or right wall.
//   arch  x (and optional y, the ledge it stands on). Press F in front of it. Leads into the background
//         or up a ladder; the art says which.
//   drop  x0..x1, a hole in the floor. Fall through it to the room below.
//   fall  x. Arrival only: where a drop lands you, from above.
// npcs: [{ kind: 'shop', x }]. The shopkeeper: F opens the story shop (openShopFromWorld, smb-story-engine-ui.js).
// Room flags: back (an interior behind the outdoor rooms: stone back wall), dark (0-1, dims the backdrop),
// wall (back-wall colour).
//
// Story host: REALM_STORY attaches side rooms to walkable story chapters (gameMode 'exploration'). The chapter's
// world stays the main room. Entering a side room sets the world, its enemies and projectiles aside and
// updateExploration pauses (realmInSideRoom); leaving puts them back. A door whose target is '@main' returns to
// the chapter world at the named entrance. Entrances can wait on a save flag (needs), or open only from the room
// side (oneWay). Gates are walls in the chapter world that a terminal opens once the player holds an item.
// A door with checkpoint: true records itself as the respawn point when you arrive through it.
//
// Depends on: smb-globals.js, smb-state.js (account flags), smb-particles-core.js, smb-fighter.js,
// smb-pathfinding.js (buildGraphForCurrentArena). Hooks: smb-menu-startcore.js (arena + player),
// smb-loop-core.js (update and the three draw layers), smb-camera.js, smb-input.js (F).

const REALM_FLOOR_Y = 560;
const REALM_FLOOR_H = 220;       // floor slabs run deep, so holes read as holes
const REALM_EDGE_ZONE = 18;      // px from a wall that counts as walking out through it
const REALM_FADE_F = 26;
const REALM_ARCH_W = 92, REALM_ARCH_H = 150;
const REALM_REACH = 46;          // horizontal reach for F on arches and chests
const REALM_DEATH_Y = 1200;   // low enough that a drop finishes its fade before the fall kills

const REALM_DEFS = {
  old_ruins: {
    name: 'The Old Ruins',
    theme: 'ruins',
    start: { room: 'courtyard', door: 'start' },
    rooms: {
      courtyard: {
        name: 'Courtyard', gx: 0, gy: 0, w: 1800,
        ledges: [[260, 440, 180], [560, 360, 160], [1180, 420, 200], [1460, 330, 150]],
        doors: [
          { id: 'start', kind: 'fall', x: 200 },
          { id: 'east',  kind: 'edge', side: 'r', to: ['hall', 'west'] },
          { id: 'shrine', kind: 'arch', x: 900, art: 'temple', checkpoint: true, to: ['shrine', 'out'] },
        ],
        chests: [{ id: 'c1', x: 620, y: 360, gives: 'health' }],
        npcs: [{ kind: 'shop', x: 1560 }],
      },
      hall: {
        name: 'Collapsed Hall', gx: 1, gy: 0, w: 2100,
        floor: [[0, 900], [1060, 1480], [1640, 2100]],
        ledges: [[380, 430, 170], [1240, 400, 160], [1500, 440, 120], [1820, 380, 180]],
        doors: [
          { id: 'west', kind: 'edge', side: 'l', checkpoint: true, to: ['courtyard', 'east'] },
          { id: 'hole', kind: 'drop', x0: 900, x1: 1060, to: ['undercroft', 'top'] },
          { id: 'ladder', kind: 'arch', x: 1720, art: 'hatch', to: ['undercroft', 'up'] },
        ],
        // 1480-1640 has no door: a plain pit. Dying there sends you back to the last checkpoint.
        chests: [{ id: 'c2', x: 1900, y: 380, gives: 'weapon:katana' }],
      },
      undercroft: {
        name: 'Undercroft', gx: 1, gy: 1, w: 1500, dark: 0.5,
        ledges: [[300, 440, 160], [640, 380, 180], [1040, 430, 160]],
        doors: [
          { id: 'top', kind: 'fall', x: 980, checkpoint: true },
          { id: 'up', kind: 'arch', x: 1360, art: 'ladder', to: ['hall', 'ladder'] },
        ],
        chests: [{ id: 'c3', x: 730, y: 380, gives: 'health' }],
      },
      shrine: {
        name: 'Inner Shrine', gx: 0, gy: -1, w: 1100, back: true,
        ledges: [[200, 420, 150], [750, 420, 150], [470, 320, 160]],
        doors: [
          { id: 'out', kind: 'arch', x: 550, art: 'out', to: ['courtyard', 'shrine'] },
        ],
        chests: [{ id: 'c4', x: 550, y: 320, gives: 'weapon:axe' }],
      },
    },
  },
  // Side rooms of the Abandoned Research Facility (story ids 66-69). Entrances live in REALM_STORY.facility.
  facility: {
    name: 'Abandoned Research Facility',
    theme: 'storyLab',
    start: { room: 'supply', door: 'out' },
    rooms: {
      supply: {
        name: 'Supply Room', gx: 0, gy: 0, w: 1000, back: true, wall: '#262d2f',
        ledges: [[300, 450, 140], [520, 400, 120]],
        doors: [{ id: 'out', kind: 'arch', x: 110, art: 'labdoor', to: ['@main', 'supply'] }],
        chests: [{ id: 'rations', x: 370, y: 450, gives: 'health' }],
        npcs: [{ kind: 'shop', x: 760 }],
      },
      records: {
        name: 'Records Office', gx: 0, gy: 1, w: 1300, back: true, wall: '#25302b', dark: 0.25,
        ledges: [[280, 450, 160], [560, 370, 200], [900, 440, 170]],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'labdoor', to: ['@main', 'records'] },
          { id: 'up', kind: 'arch', x: 1200, art: 'ladder', to: ['@main', 'shaft'] },
        ],
        chests: [{ id: 'key', x: 660, y: 370, gives: 'item:oldKey', label: 'OLD ACCESS KEY' }],
      },
    },
  },
};

// Story chapters that carry side rooms. Entrance x and gate x are in the chapter world's coordinates.
const REALM_STORY = {
  facility: {
    chapters: [66, 67, 68, 69],
    entrances: [
      { id: 'supply',  ch: 66, x: 1000, art: 'labdoor', room: 'supply',  door: 'out' },
      { id: 'records', ch: 67, x: 470,  art: 'labdoor', room: 'records', door: 'in',
        needs: 'power', lockedText: 'No power. The door will not move.' },
      { id: 'shaft',   ch: 67, x: 1800, art: 'hatch',   room: 'records', door: 'up', oneWay: true,
        lockedText: 'Bolted from the other side.' },
    ],
    gates: [
      { id: 'blast', ch: 67, x: 2015, termX: 1930, needs: 'oldKey',
        deniedFirst: 'ACCESS DENIED: older protocol. Power rerouted to the Records Office.',
        denied: 'ACCESS DENIED. The key is in the Records Office.',
        opened: 'Old protocol accepted. The blast door opens.',
        setsFlag: 'power',
        alarm: [
          { x: 700, name: 'Facility Drone', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', color: '#446688' },
          { x: 840, name: 'Facility Drone', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'hard', color: '#445577' },
        ] },
    ],
  },
};

var realmActive  = false;
var realmKey     = 'old_ruins';
var realmHost    = 'realm'; // 'realm' (the standalone mode) or 'story' (side rooms of a story chapter)
var _realmStash  = null;    // story: the chapter world set aside while in a side room
var _realmStoryArena = null;
var _realmStoryChId  = null;
var _realmStoryFrom  = null; // entrance id the player came in through
var realmRoomKey = null;
var realmSave    = null;   // { room, checkpoint: {room, door}, looted: {room:{chest:true}}, visited: {room:true} }
var realmFade    = 0;      // >0 fading out toward a door, <0 fading in
var realmPending = null;   // { room, door } to enter when the fade-out finishes
var realmBanner  = 0;
var _realmDead   = false;
var _realmView   = null;
var _realmNear   = null;   // { kind: 'arch'|'chest'|'npc', ref } the F prompt points at
var _realmSay    = null;   // { npc, text, t } a line the shopkeeper is saying
var _realmSaidIn = null;   // room key the shopkeeper last greeted you in
var _realmSayIdx = 0;
const REALM_SHOP_LINES = [
  'You again. Or the first time. It is hard to tell with you.',
  'Everything here was left behind by someone. Now it is for sale.',
  'Tokens. I do not ask where you found them.',
  'Spend it while you can. Nobody carries anything out.',
];

function _realmDef() { return REALM_DEFS[realmKey]; }
function _realmRoom(k) { var d = _realmDef(); return d && d.rooms[k || realmRoomKey]; }

// Save, per account, with a localStorage fallback (the Endless best-score pattern).
function _realmLoad() {
  var s = null;
  try {
    var acct = (typeof GameState !== 'undefined' && GameState.getActiveAccount) ? GameState.getActiveAccount() : null;
    s = acct && acct.data && acct.data.unlocks && acct.data.unlocks.realm ? acct.data.unlocks.realm[realmKey] : null;
    if (!s) { var raw = localStorage.getItem('smb_realm_' + realmKey); if (raw) s = JSON.parse(raw); }
  } catch (e) { s = null; }
  var def = _realmDef();
  if (!s || !s.checkpoint || !def.rooms[s.checkpoint.room]) {
    s = { checkpoint: { room: def.start.room, door: def.start.door }, looted: {}, visited: {} };
  }
  s.looted = s.looted || {};
  s.visited = s.visited || {};
  s.items = s.items || {};
  s.flags = s.flags || {};
  return s;
}

function _realmStore() {
  if (!realmSave) return;
  var copy = JSON.parse(JSON.stringify(realmSave));
  try {
    if (typeof setAccountFlagWithRuntime === 'function') setAccountFlagWithRuntime(['unlocks', 'realm', realmKey], copy, function () {});
  } catch (e) {}
  try { localStorage.setItem('smb_realm_' + realmKey, JSON.stringify(copy)); } catch (e) {}
}

// Console: realmReset() starts the realm over.
function realmReset() {
  try { localStorage.removeItem('smb_realm_' + realmKey); } catch (e) {}
  realmSave = { checkpoint: { room: _realmDef().start.room, door: _realmDef().start.door }, looted: {}, visited: {} };
  _realmStore();
}

function realmMakeArena(roomKey) {
  var R = _realmRoom(roomKey);
  var platforms = [];
  (R.floor || [[0, R.w]]).forEach(function (s) {
    platforms.push({ x: s[0], y: REALM_FLOOR_Y, w: s[1] - s[0], h: REALM_FLOOR_H, isFloor: true });
  });
  (R.ledges || []).forEach(function (l) {
    platforms.push({ x: l[0], y: l[1], w: l[2], h: 16, passUnder: true });
  });
  var src = (typeof ARENAS !== 'undefined' && ARENAS[_realmDef().theme]) || {};
  return {
    id: '__realm__',
    name: R.name,
    sky: R.back ? ['#120a06', '#24160c'] : (src.sky || ['#1f1008', '#3a2418']),
    groundColor: src.groundColor || '#7a6445',
    platColor: src.platColor || '#8a7455', platEdge: src.platEdge || '#5a4432',
    deathY: REALM_DEATH_Y,
    worldWidth: R.w, mapLeft: 0, mapRight: R.w,
    isBossArena: false,
    isExploreArena: !R.back,
    themeKey: _realmDef().theme,
    themeFloorY: ((src.platforms || []).find(function (pl) { return pl.isFloor; }) || {}).y || null,
    platforms: platforms,
  };
}

// Where a door puts you when you arrive through it.
function _realmArrival(R, door) {
  if (door.kind === 'edge') return { x: door.side === 'l' ? 70 : R.w - 70, y: REALM_FLOOR_Y, facing: door.side === 'l' ? 1 : -1 };
  if (door.kind === 'fall') return { x: door.x, y: REALM_FLOOR_Y - 380, facing: 1 };
  if (door.kind === 'arch') return { x: door.x, y: door.y || REALM_FLOOR_Y, facing: 1 };
  if (door.kind === 'drop') return { x: (door.x0 + door.x1) / 2, y: REALM_FLOOR_Y - 380, facing: 1 };
  return { x: 100, y: REALM_FLOOR_Y, facing: 1 };
}

function _realmEnterRoom(roomKey, doorId) {
  var R = _realmRoom(roomKey);
  if (!R) return;
  realmRoomKey = roomKey;
  ARENAS.__realm__ = realmMakeArena(roomKey);
  currentArena = ARENAS.__realm__;
  if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();
  if (typeof minions !== 'undefined') minions.length = 0;
  if (typeof projectiles !== 'undefined') projectiles = [];

  var door = (R.doors || []).find(function (d) { return d.id === doorId; }) || R.doors[0];
  var a = _realmArrival(R, door);
  var p = players[0];
  if (p) {
    p.x = a.x - p.w / 2;
    p.y = a.y - p.h;
    p.vx = 0; p.vy = 0;
    p.facing = a.facing;
    p.spawnX = a.x; p.spawnY = REALM_FLOOR_Y;
    if (typeof camXCur !== 'undefined') {
      camXCur = camXTarget = _realmCamX(p.cx(), 1);
      camYCur = camYTarget = _realmCamY(p.cy(), 1);
    }
  }

  if (!realmSave.visited[roomKey]) realmBanner = 150;
  realmSave.visited[roomKey] = true;
  _realmSaidIn = null;
  _realmSay = null;
  realmSave.room = roomKey;
  if (door.checkpoint) {
    var was = realmSave.checkpoint;
    realmSave.checkpoint = { room: roomKey, door: door.id };
    if (p && (!was || was.room !== roomKey || was.door !== door.id) && typeof DamageText !== 'undefined') {
      damageTexts.push(new DamageText(p.cx(), p.y - 40, 'CHECKPOINT', '#ffd27a'));
    }
  }
  _realmStore();
}

// Called by _startGameCore before players exist: builds the room the save says to start in.
function realmBeginRun() {
  realmSave = _realmLoad();
  realmRoomKey = realmSave.checkpoint.room;
  return realmMakeArena(realmRoomKey);
}

// Called by _startGameCore once players[] holds P1.
function initRealm() {
  realmActive  = true;
  realmFade    = -REALM_FADE_F;
  realmPending = null;
  _realmDead   = false;
  realmBanner  = 0;
  _realmEnterRoom(realmSave.checkpoint.room, realmSave.checkpoint.door);
  realmBanner  = 150;
}

function realmResetState() {
  realmActive  = false;
  realmFade    = 0;
  realmPending = null;
  _realmDead   = false;
  _realmNear   = null;
  realmHost    = 'realm';
  realmRoomKey = null;
  _realmStash  = null;
  _realmStoryArena = null;
  _realmStoryChId  = null;
}

function _realmGo(target) {
  if (realmFade !== 0 || !target) return;
  realmPending = { room: target[0], door: target[1] };
  realmFade = REALM_FADE_F;
}

function _realmLooted(id) { var l = realmSave.looted[realmRoomKey]; return !!(l && l[id]); }

function _realmOpenChest(c, p) {
  if (!realmSave.looted[realmRoomKey]) realmSave.looted[realmRoomKey] = {};
  realmSave.looted[realmRoomKey][c.id] = true;
  _realmStore();
  if (typeof spawnParticles === 'function') spawnParticles(c.x, c.y - 20, '#ffd27a', 22);
  var label = '';
  if (c.gives === 'health') {
    p.health = p.maxHealth;
    label = 'HEALED';
  } else if (c.gives && c.gives.indexOf('item:') === 0) {
    realmSave.items[c.gives.slice(5)] = true;
    _realmStore();
    label = c.label || 'FOUND';
  } else if (c.gives && c.gives.indexOf('weapon:') === 0) {
    var wk = c.gives.slice(7);
    if (typeof WEAPONS !== 'undefined' && WEAPONS[wk]) {
      p.weaponKey = wk; p.weapon = WEAPONS[wk]; p.cooldown = 0;
      label = (typeof getWeaponDisplayName === 'function' ? getWeaponDisplayName(wk) : WEAPONS[wk].name) || wk;
    }
  }
  if (label && typeof DamageText !== 'undefined') damageTexts.push(new DamageText(p.cx(), p.y - 35, label, '#ffd27a'));
}

// F: open a chest or go through an arch, whichever is in front of you.
function realmInteract() {
  var p = players[0];
  if (!realmActive || !p || p.health <= 0 || realmFade !== 0 || !_realmNear) return false;
  if (realmHost === 'story' && !realmRoomKey) return _realmStoryInteract(p);
  if (_realmNear.kind === 'chest') { _realmOpenChest(_realmNear.ref, p); return true; }
  if (_realmNear.kind === 'arch') { _realmGo(_realmNear.ref.to); return true; }
  if (_realmNear.kind === 'npc' && _realmNear.ref.kind === 'shop' && typeof openShopFromWorld === 'function') { openShopFromWorld(); return true; }
  return false;
}

function _realmFindNear(p) {
  var R = _realmRoom();
  var best = null, bestD = REALM_REACH;
  var feet = p.y + p.h;
  (R.chests || []).forEach(function (c) {
    if (_realmLooted(c.id)) return;
    var cy = c.y || REALM_FLOOR_Y;
    var d = Math.abs(p.cx() - c.x);
    if (d < bestD && Math.abs(feet - cy) < 30) { best = { kind: 'chest', ref: c }; bestD = d; }
  });
  (R.doors || []).forEach(function (dr) {
    if (dr.kind !== 'arch') return;
    var d = Math.abs(p.cx() - dr.x);
    if (d < bestD && Math.abs(feet - (dr.y || REALM_FLOOR_Y)) < 30) { best = { kind: 'arch', ref: dr }; bestD = d; }
  });
  (R.npcs || []).forEach(function (n) {
    var d = Math.abs(p.cx() - n.x);
    if (d < 70 && Math.abs(feet - REALM_FLOOR_Y) < 30) { best = { kind: 'npc', ref: n }; bestD = d; }
  });
  return best;
}

// Per frame, after minions update.
function updateRealm() {
  if (gameMode === 'exploration') _realmStoryAttach();
  if (!realmActive || !gameRunning) return;
  var p = players[0];
  if (!p) return;
  if (realmHost === 'realm') p.lives = 99;
  if (realmBanner > 0) realmBanner--;

  if (realmFade > 0) {
    p.invincible = Math.max(p.invincible, 2);
    if (--realmFade === 0) {
      var pd = realmPending;
      realmPending = null;
      if (pd && realmHost === 'story') {
        if (pd.room === '@main') _realmStoryReturn(pd.door); else _realmStoryEnterRoom(pd.room, pd.door);
      } else if (pd) {
        _realmEnterRoom(pd.room, pd.door);
      }
      realmFade = -REALM_FADE_F;
    }
    return;
  }
  if (realmFade < 0) realmFade++;

  if (realmHost === 'story' && !realmRoomKey) {
    // A closed gate holds the player on the near side. Q/E move scenes place the fighter directly and skip
    // platform collision, so a lunge at a foe behind the door would otherwise carry them through it.
    _realmStoryGates().forEach(function (g) {
      if (realmSave.flags['gate_' + g.id]) return;
      var edge = g.x - 25;
      if (p.x + p.w > edge) { p.x = edge - p.w; if (p.vx > 0) p.vx = 0; }
    });
    _realmNear = _realmStoryFindNear(p);
    return;
  }

  // Death: the game respawns P1 in place. Realm mode moves them to the last checkpoint door; a story side
  // room sends them back out to the chapter world at the door they came in by.
  if (p.health <= 0) { _realmDead = true; _realmNear = null; return; }
  if (_realmDead) {
    _realmDead = false;
    if (realmHost === 'story') _realmStoryReturn(_realmStoryFrom);
    else _realmEnterRoom(realmSave.checkpoint.room, realmSave.checkpoint.door);
    realmFade = -REALM_FADE_F;
    return;
  }

  var R = _realmRoom();
  var feet = p.y + p.h;
  for (var i = 0; i < (R.doors || []).length; i++) {
    var d = R.doors[i];
    if (!d.to) continue;
    if (d.kind === 'edge') {
      var out = d.side === 'l' ? p.x <= REALM_EDGE_ZONE : p.x + p.w >= R.w - REALM_EDGE_ZONE;
      if (out) { _realmGo(d.to); return; }
    } else if (d.kind === 'drop') {
      if (feet > REALM_FLOOR_Y + 60 && p.cx() > d.x0 && p.cx() < d.x1) { _realmGo(d.to); return; }
    }
  }
  _realmNear = _realmFindNear(p);

  // The shopkeeper speaks once each time you come into his room and walk near him.
  if (_realmSay && ++_realmSay.t > 260) _realmSay = null;
  (R.npcs || []).forEach(function (n) {
    if (_realmSaidIn === realmRoomKey || Math.abs(p.cx() - n.x) > 260) return;
    _realmSaidIn = realmRoomKey;
    _realmSay = { npc: n, text: REALM_SHOP_LINES[_realmSayIdx++ % REALM_SHOP_LINES.length], t: 0 };
  });
}

// Camera: follow P1, held inside the room so the view never shows past its walls.
function _realmCamX(x, zoom) {
  var R = _realmRoom();
  var half = GAME_W / (2 * zoom);
  if (!R || R.w <= half * 2) return R ? R.w / 2 : x;
  return Math.max(half, Math.min(R.w - half, x));
}
function _realmCamY(y, zoom) {
  var half = GAME_H / (2 * zoom);
  return Math.min(REALM_FLOOR_Y + 70 - half, y - 70);
}
function realmCameraTarget(p, zoom) {
  return { x: _realmCamX(p.cx() + p.facing * 40, zoom), y: _realmCamY(p.cy(), zoom) };
}

// Draw: world space, behind the platforms.
// Story: the attached chapter stops owning the screen as soon as the next chapter starts loading.
function _realmStaleStory() {
  return realmHost === 'story' && typeof _activeStory2Chapter !== 'undefined' &&
    (!_activeStory2Chapter || _activeStory2Chapter.id !== _realmStoryChId);
}

function drawRealmBack() {
  if (!realmActive || _realmStaleStory()) return;
  if (realmHost === 'story' && !realmRoomKey) { _realmStoryDrawMain(); return; }
  var R = _realmRoom();
  if (!R) return;
  ctx.save();
  // Underground rooms reuse the theme backdrop, dimmed, so they read as below the rooms above them.
  if (R.dark) {
    ctx.fillStyle = 'rgba(4,2,1,' + R.dark + ')';
    ctx.fillRect(-400, REALM_FLOOR_Y - 1400, R.w + 800, 1400);
  }
  if (R.back) {
    // Background rooms are interiors: a back wall of stone courses.
    var top = REALM_FLOOR_Y - 1400;
    ctx.fillStyle = R.wall || '#2a1d13';
    ctx.fillRect(-200, top, R.w + 400, 1400);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
    for (var cy = REALM_FLOOR_Y - 40; cy > top; cy -= 40) {
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(R.w, cy); ctx.stroke();
      var off = ((REALM_FLOOR_Y - cy) / 40) % 2 ? 0 : 45;
      for (var bx = off; bx < R.w; bx += 90) { ctx.beginPath(); ctx.moveTo(bx, cy); ctx.lineTo(bx, cy + 40); ctx.stroke(); }
    }
  }
  // Holes in the floor: dark shafts, so a gap reads as a way down rather than missing art.
  var segs = (R.floor || [[0, R.w]]).slice().sort(function (a, b) { return a[0] - b[0]; });
  // A drop door glows faintly from the room below; a plain pit is black with spikes just under the lip.
  for (var i = 0; i + 1 < segs.length; i++) {
    var x0 = segs[i][1], x1 = segs[i + 1][0];
    var isDrop = (R.doors || []).some(function (d) { return d.kind === 'drop' && d.x0 < x1 && d.x1 > x0; });
    var g = ctx.createLinearGradient(0, REALM_FLOOR_Y, 0, REALM_FLOOR_Y + REALM_FLOOR_H);
    if (isDrop) { g.addColorStop(0, '#120a06'); g.addColorStop(1, '#4a3018'); }
    else        { g.addColorStop(0, '#0a0503'); g.addColorStop(1, '#000000'); }
    ctx.fillStyle = g;
    ctx.fillRect(x0, REALM_FLOOR_Y, x1 - x0, REALM_FLOOR_H + 200);
    if (!isDrop) {
      ctx.fillStyle = '#6b5a48';
      for (var sx = x0 + 4; sx + 16 <= x1; sx += 18) {
        ctx.beginPath();
        ctx.moveTo(sx, REALM_FLOOR_Y + 64); ctx.lineTo(sx + 8, REALM_FLOOR_Y + 30); ctx.lineTo(sx + 16, REALM_FLOOR_Y + 64);
        ctx.closePath(); ctx.fill();
      }
    }
  }
  (R.doors || []).forEach(function (d) { if (d.kind === 'arch') _realmDrawArch(d); });
  ctx.restore();
}

function _realmDrawArch(d) {
  var f = typeof frameCount !== 'undefined' ? frameCount : 0;
  var x = d.x, y = d.y || REALM_FLOOR_Y;
  var w = REALM_ARCH_W, h = REALM_ARCH_H;
  var lit = realmSave && realmSave.checkpoint && realmSave.checkpoint.room === realmRoomKey && realmSave.checkpoint.door === d.id;
  if (d.art === 'ladder') {
    ctx.fillStyle = '#0c0705';
    ctx.fillRect(x - 34, y - 420, 68, 420);
    ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 22, y - 420); ctx.moveTo(x + 22, y); ctx.lineTo(x + 22, y - 420); ctx.stroke();
    ctx.lineWidth = 4;
    for (var ry = y - 20; ry > y - 420; ry -= 34) { ctx.beginPath(); ctx.moveTo(x - 22, ry); ctx.lineTo(x + 22, ry); ctx.stroke(); }
    return;
  }
  if (d.art === 'labdoor') {
    // Facility door: steel frame, dark doorway, a status light (red while it will not open).
    ctx.fillStyle = '#1e2426';
    ctx.fillRect(x - 50, y - 152, 100, 152);
    ctx.fillStyle = '#050708';
    ctx.fillRect(x - 38, y - 140, 76, 140);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(x - 38, y - 140, 76, 6);
    ctx.fillStyle = d._locked ? '#ff4433' : '#44ff99';
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(f * 0.08);
    ctx.beginPath(); ctx.arc(x, y - 162, 5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
  if (d.art === 'hatch' && d._closed) {
    // A floor hatch bolted shut from below.
    ctx.fillStyle = '#3a4044';
    ctx.fillRect(x - 32, y - 6, 64, 8);
    ctx.fillStyle = '#1a1e20';
    for (var bk = -24; bk <= 24; bk += 16) ctx.fillRect(x + bk - 2, y - 5, 4, 4);
    return;
  }
  if (d.art === 'hatch') {
    // The top of a ladder down, through a hole in the floor.
    ctx.fillStyle = '#0c0705';
    ctx.fillRect(x - 30, y - 4, 60, 8);
    ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 22, y - 56); ctx.moveTo(x + 22, y); ctx.lineTo(x + 22, y - 56); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x - 22, y - 22); ctx.lineTo(x + 22, y - 22); ctx.moveTo(x - 22, y - 50); ctx.lineTo(x + 22, y - 50); ctx.stroke();
    return;
  }
  // Stone frame with a dark doorway; the inner glow says whether it is your checkpoint.
  ctx.fillStyle = '#5a4432';
  ctx.fillRect(x - w / 2 - 14, y - h - 22, w + 28, h + 22);
  ctx.fillStyle = '#0a0604';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x - w / 2, y - h + w / 2);
  ctx.arc(x, y - h + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w / 2, y);
  ctx.closePath();
  ctx.fill();
  if (d.checkpoint) {
    var pulse = 0.5 + 0.5 * Math.sin(f * 0.06);
    ctx.fillStyle = lit ? 'rgba(255,200,110,' + (0.35 + 0.35 * pulse) + ')' : 'rgba(140,110,80,0.35)';
    ctx.beginPath(); ctx.arc(x, y - h - 4, 8, 0, Math.PI * 2); ctx.fill();
  }
}

// Draw: world space, over the platforms (chests, F prompts).
function drawRealmWorld() {
  if (!realmActive || _realmStaleStory()) return;
  _realmView = (typeof ctx.getTransform === 'function') ? ctx.getTransform() : null;
  if (realmHost === 'story' && !realmRoomKey) { _realmStoryDrawPrompt(); return; }
  var R = _realmRoom();
  if (!R) return;
  ctx.save();
  (R.chests || []).forEach(function (c) {
    var open = _realmLooted(c.id);
    var x = c.x, y = c.y || REALM_FLOOR_Y;
    if (c.gives && c.gives.indexOf('item:') === 0) {
      // A key item rests on a small stand and glows until taken.
      ctx.fillStyle = '#2a3236';
      ctx.fillRect(x - 12, y - 30, 24, 30);
      if (!open) {
        var gl = 0.6 + 0.4 * Math.sin((typeof frameCount !== 'undefined' ? frameCount : 0) * 0.09);
        ctx.fillStyle = 'rgba(255,214,120,' + (0.25 * gl) + ')';
        ctx.beginPath(); ctx.arc(x, y - 44, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8c86a';
        ctx.fillRect(x - 9, y - 50, 18, 12);
        ctx.fillStyle = '#5a4420';
        ctx.fillRect(x - 5, y - 46, 10, 3);
      }
      return;
    }
    ctx.fillStyle = '#3b2412';
    ctx.fillRect(x - 22, y - 26, 44, 26);
    ctx.fillStyle = open ? '#1a0f07' : '#c9a24a';
    ctx.fillRect(x - 22, y - 26, 44, 4);
    if (open) {
      ctx.fillStyle = '#3b2412';
      ctx.fillRect(x - 22, y - 40, 44, 6);
    } else {
      ctx.fillStyle = '#5a3a1c';
      ctx.fillRect(x - 24, y - 36, 48, 12);
      ctx.fillStyle = '#ffd27a';
      ctx.fillRect(x - 4, y - 28, 8, 8);
    }
  });
  var p = players[0];
  (R.npcs || []).forEach(function (n) { _realmDrawShopkeeper(n, p); });
  if (_realmSay) {
    var a = _realmSay.t < 20 ? _realmSay.t / 20 : _realmSay.t > 230 ? (260 - _realmSay.t) / 30 : 1;
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = 'italic 14px Georgia, serif'; ctx.textAlign = 'center';
    var tw = ctx.measureText(_realmSay.text).width;
    var sx = Math.max(tw / 2 + 12, Math.min(R.w - tw / 2 - 12, _realmSay.npc.x));
    ctx.fillStyle = 'rgba(8,6,12,0.72)';
    ctx.fillRect(sx - tw / 2 - 10, REALM_FLOOR_Y - 214, tw + 20, 26);
    ctx.fillStyle = '#e9ddff';
    ctx.fillText(_realmSay.text, sx, REALM_FLOOR_Y - 196);
    ctx.globalAlpha = 1;
  }
  if (_realmNear && p && p.health > 0 && realmFade === 0) {
    var n = _realmNear.ref;
    var ny = n.y || REALM_FLOOR_Y;
    if (_realmNear.kind === 'npc') ny = REALM_FLOOR_Y;
    var isItem = _realmNear.kind === 'chest' && n.gives && n.gives.indexOf('item:') === 0;
    var py = _realmNear.kind === 'npc' ? ny - 168 : isItem ? ny - 84 : _realmNear.kind === 'chest' ? ny - 54 : n.art === 'hatch' ? ny - 80 : n.art === 'ladder' ? ny - 130 : ny - REALM_ARCH_H - 34;
    var verb = _realmNear.kind === 'npc' ? 'Trade' : isItem ? 'Take' : _realmNear.kind === 'chest' ? 'Open' : (n.art === 'ladder' || n.art === 'hatch') ? 'Climb' : 'Enter';
    ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(n.x - 34, py - 14, 68, 20);
    ctx.fillStyle = '#ffd27a';
    ctx.fillText('F  ' + verb, n.x, py);
  }
  ctx.restore();
}

// The shopkeeper: a tall hooded shape with no body to speak of, two pale eyes, and a lantern on a staff.
// He turns to face you and sways a little; the lantern is the only warm light on him.
function _realmDrawShopkeeper(n, p) {
  var f = typeof frameCount !== 'undefined' ? frameCount : 0;
  var x = n.x, g = REALM_FLOOR_Y;
  var face = p && p.cx() < x ? -1 : 1;
  var sway = Math.sin(f * 0.025) * 2.5;
  var flick = 0.75 + 0.25 * Math.sin(f * 0.31) * Math.sin(f * 0.17);
  ctx.save();
  // Lantern glow on the ground and the cloak.
  var lx = x + face * 30 + sway, ly = g - 96;
  var lg = ctx.createRadialGradient(lx, ly, 2, lx, ly, 120);
  lg.addColorStop(0, 'rgba(255,190,110,' + (0.30 * flick) + ')');
  lg.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = lg;
  ctx.fillRect(lx - 120, ly - 120, 240, 240);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath(); ctx.ellipse(x, g + 1, 34, 6, 0, 0, Math.PI * 2); ctx.fill();
  // Cloak: a long tapering robe, hem ragged.
  ctx.translate(x, g);
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  for (var i = 0; i <= 6; i++) ctx.lineTo(-26 + i * (52 / 6), (i % 2 ? -5 : 0) + Math.sin(f * 0.05 + i) * 1.5);
  ctx.lineTo(16 + sway * 0.6, -96);
  ctx.quadraticCurveTo(14 + sway, -140, sway, -146);
  ctx.quadraticCurveTo(-14 + sway, -140, -16 + sway * 0.6, -96);
  ctx.closePath();
  ctx.fillStyle = '#07060b';
  ctx.fill();
  ctx.strokeStyle = 'rgba(190,170,255,0.55)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Hood opening: darker than the cloak, with the eyes inside.
  ctx.beginPath();
  ctx.ellipse(sway + face * 3, -126, 8, 11, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();
  ctx.fillStyle = 'rgba(220,210,255,' + (0.75 + 0.25 * Math.sin(f * 0.04)) + ')';
  ctx.beginPath(); ctx.arc(sway + face * 3 - 3, -128, 1.6, 0, Math.PI * 2); ctx.arc(sway + face * 3 + 3, -128, 1.6, 0, Math.PI * 2); ctx.fill();
  // Staff and lantern.
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(face * 24, 0); ctx.lineTo(face * 30 + sway, -118); ctx.stroke();
  ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(face * 30 + sway, -118); ctx.lineTo(face * 30 + sway, -104); ctx.stroke();
  ctx.fillStyle = 'rgba(255,200,120,' + flick + ')';
  ctx.fillRect(face * 30 + sway - 5, -104, 10, 13);
  ctx.strokeStyle = '#2a2018';
  ctx.strokeRect(face * 30 + sway - 5, -104, 10, 13);
  ctx.restore();
}

// Draw: screen space, over everything.
function drawRealmHUD() {
  if (!realmActive || !gameRunning) return;
  var R = _realmRoom();
  ctx.save();
  ctx.setTransform(canvas.width / GAME_W, 0, 0, canvas.height / GAME_H, 0, 0);
  if (realmHost === 'story') { _realmDrawFadeAndBanner(R); ctx.restore(); return; }
  if (!R) { ctx.restore(); return; }

  // Minimap: one box per visited room on the realm grid, the current one lit.
  var def = _realmDef(), S = 18, G = 4;
  var keys = Object.keys(def.rooms);
  var minX = Infinity, maxX = -Infinity, minY = Infinity;
  keys.forEach(function (k) { var r = def.rooms[k]; minX = Math.min(minX, r.gx); maxX = Math.max(maxX, r.gx); minY = Math.min(minY, r.gy); });
  var ox = GAME_W - 18 - (maxX - minX + 1) * (S + G), oy = 58;
  keys.forEach(function (k) {
    if (!realmSave.visited[k]) return;
    var r = def.rooms[k];
    var x = ox + (r.gx - minX) * (S + G), y = oy + (r.gy - minY) * (S + G);
    ctx.fillStyle = k === realmRoomKey ? '#ffd27a' : 'rgba(255,210,122,0.25)';
    ctx.fillRect(x, y, S, S);
    ctx.strokeStyle = 'rgba(255,210,122,0.8)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, S - 1, S - 1);
  });
  ctx.font = 'bold 12px Arial'; ctx.textAlign = 'right'; ctx.fillStyle = '#ffd27a';
  ctx.fillText(R.name, GAME_W - 18, oy - 8);

  if (realmBanner > 0) {
    ctx.globalAlpha = realmBanner > 120 ? (150 - realmBanner) / 30 : Math.min(1, realmBanner / 30);
    ctx.textAlign = 'center';
    ctx.font = 'bold 34px Arial';
    ctx.fillStyle = '#fff1d6';
    ctx.shadowColor = '#ffb347'; ctx.shadowBlur = 14;
    ctx.fillText(R.name.toUpperCase(), GAME_W / 2, GAME_H * 0.3);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 13px Arial';
    ctx.fillStyle = '#e6cfa6';
    ctx.fillText(def.name, GAME_W / 2, GAME_H * 0.3 + 24);
    ctx.globalAlpha = 1;
  }

  if (realmFade !== 0) {
    var fa = realmFade > 0 ? 1 - realmFade / REALM_FADE_F : -realmFade / REALM_FADE_F;
    ctx.globalAlpha = Math.max(0, Math.min(1, fa));
    ctx.fillStyle = '#050302';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ── Story host ──────────────────────────────────────────────────────────────────────────────────────────────

function realmInSideRoom() { return realmActive && realmHost === 'story' && !!realmRoomKey; }

function _realmStoryDefFor(chId) {
  for (var k in REALM_STORY) if (REALM_STORY[k].chapters.indexOf(chId) >= 0) return k;
  return null;
}
function _realmStoryEntrances() {
  var d = REALM_STORY[realmKey];
  return d ? (d.entrances || []).filter(function (e) { return e.ch === _realmStoryChId; }) : [];
}
function _realmStoryGates() {
  var d = REALM_STORY[realmKey];
  return d ? (d.gates || []).filter(function (g) { return g.ch === _realmStoryChId; }) : [];
}

// Top of the chapter world's floor at x (authored floors step up and down).
function _realmMainFloorY(x) {
  var best = null;
  ((currentArena && currentArena.platforms) || []).forEach(function (pl) {
    if (!pl.isFloor || x < pl.x || x > pl.x + pl.w) return;
    if (best === null || pl.y < best) best = pl.y;
  });
  return best === null ? 440 : best;
}

function _realmTell(text, color) {
  if (typeof storyFightSubtitle === 'undefined' || !text) return;
  storyFightSubtitle = { text: text, timer: 180, maxTimer: 180, color: color || '#ffd27a' };
}

// Each chapter launch builds a new world, so the realm re-attaches whenever the world object changes.
function _realmStoryAttach() {
  if (realmRoomKey || realmFade !== 0) return;
  var ch = (typeof _activeStory2Chapter !== 'undefined') ? _activeStory2Chapter : null;
  var live = typeof exploreActive !== 'undefined' && exploreActive;
  var key = ch && live ? _realmStoryDefFor(ch.id) : null;
  if (!key) { if (realmHost === 'story') realmResetState(); return; }
  if (realmHost === 'story' && realmActive && _realmStoryArena === currentArena && _realmStoryChId === ch.id) return;
  realmHost = 'story';
  realmKey = key;
  realmSave = _realmLoad();
  realmActive = true;
  realmFade = 0; realmPending = null; _realmDead = false; _realmNear = null; _realmStash = null;
  _realmStoryArena = currentArena;
  _realmStoryChId = ch.id;
  // Closed gates are walls. 50 wide: pickSafeSpawn only spawns on ledges wider than 50.
  var plats = currentArena.platforms;
  _realmStoryGates().forEach(function (g) {
    if (realmSave.flags['gate_' + g.id] || plats.some(function (pl) { return pl._realmGate === g.id; })) return;
    var fy = Math.max(_realmMainFloorY(g.x - 40), _realmMainFloorY(g.x + 40));
    plats.push({ x: g.x - 25, y: -600, w: 50, h: 600 + fy, noDraw: true, _realmGate: g.id });
  });
  if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();
}

// Spawns that would land behind a closed gate come in on the player's side of it instead.
function realmClampSpawnX(x, p) {
  if (!realmActive || realmHost !== 'story' || realmRoomKey || !p) return x;
  _realmStoryGates().forEach(function (g) {
    if (realmSave.flags['gate_' + g.id] || p.cx() > g.x) return;
    if (x > g.x - 60) x = g.x - 90;
  });
  return x;
}

function _realmStoryThreat(p) {
  if (typeof exploreArenaLock !== 'undefined' && exploreArenaLock) return true;
  return minions.some(function (m) {
    if (m.health <= 0 || Math.abs(m.cx() - p.cx()) > 520) return false;
    return typeof isHostileTarget === 'function' ? isHostileTarget(p, m) : true;
  });
}

function _realmStoryFindNear(p) {
  var feet = p.y + p.h, best = null, bestD = REALM_REACH;
  _realmStoryEntrances().forEach(function (e) {
    var d = Math.abs(p.cx() - e.x);
    if (d < bestD && Math.abs(feet - _realmMainFloorY(e.x)) < 30) { best = { kind: 'entrance', ref: e }; bestD = d; }
  });
  _realmStoryGates().forEach(function (g) {
    if (realmSave.flags['gate_' + g.id]) return;
    var d = Math.abs(p.cx() - g.termX);
    if (d < bestD && Math.abs(feet - _realmMainFloorY(g.termX)) < 30) { best = { kind: 'terminal', ref: g }; bestD = d; }
  });
  return best;
}

function _realmStoryInteract(p) {
  var n = _realmNear;
  if (n.kind === 'entrance') {
    var e = n.ref;
    if (e.needs && !realmSave.flags[e.needs]) { _realmTell(e.lockedText, '#ff7766'); return true; }
    if (e.oneWay && !realmSave.flags['open_' + e.id]) { _realmTell(e.lockedText, '#ff7766'); return true; }
    if (_realmStoryThreat(p)) { _realmTell('Not with enemies this close.', '#ff7766'); return true; }
    _realmStoryFrom = e.id;
    _realmGo([e.room, e.door]);
    return true;
  }
  if (n.kind === 'terminal') {
    var g = n.ref;
    if (realmSave.items[g.needs]) {
      realmSave.flags['gate_' + g.id] = true;
      _realmStore();
      var plats = currentArena.platforms;
      for (var i = plats.length - 1; i >= 0; i--) if (plats[i]._realmGate === g.id) plats.splice(i, 1);
      if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();
      if (typeof spawnParticles === 'function') spawnParticles(g.x, _realmMainFloorY(g.x) - 120, '#ffd27a', 30);
      if (typeof screenShake !== 'undefined') screenShake = Math.max(screenShake, 14);
      _realmTell(g.opened, '#88ffcc');
    } else if (g.setsFlag && !realmSave.flags[g.setsFlag]) {
      realmSave.flags[g.setsFlag] = true;
      _realmStore();
      _realmTell(g.deniedFirst, '#ff9966');
      // Rerouting power wakes the corridor behind you, so the walk back is not the walk you made.
      if (typeof _exploreSpawnEnemy === 'function') {
        (g.alarm || []).forEach(function (a) {
          _exploreSpawnEnemy({ wx: a.x, exactX: a.x, name: a.name, weaponKey: a.weaponKey, classKey: a.classKey,
            aiDiff: a.aiDiff, color: a.color }, p);
        });
      }
    } else {
      _realmTell(g.denied, '#ff9966');
    }
    return true;
  }
  return false;
}

function _realmStoryEnterRoom(roomKey, doorId) {
  var R = _realmRoom(roomKey);
  var p = players[0];
  if (!R || !p) return;
  if (!realmRoomKey) {
    _realmStash = { arena: currentArena, minions: minions.splice(0), projectiles: projectiles, spawnX: p.spawnX, spawnY: p.spawnY };
    projectiles = [];
  }
  realmRoomKey = roomKey;
  ARENAS.__realmroom__ = realmMakeArena(roomKey);
  currentArena = ARENAS.__realmroom__;
  if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();
  var door = (R.doors || []).find(function (d) { return d.id === doorId; }) || R.doors[0];
  var a = _realmArrival(R, door);
  p.x = a.x - p.w / 2; p.y = a.y - p.h; p.vx = 0; p.vy = 0;
  p.facing = a.facing;
  p.spawnX = a.x; p.spawnY = REALM_FLOOR_Y;
  if (typeof camXCur !== 'undefined') {
    camXCur = camXTarget = _realmCamX(p.cx(), 1);
    camYCur = camYTarget = _realmCamY(p.cy(), 1);
  }
  realmSave.visited[roomKey] = true;
  _realmSaidIn = null; _realmSay = null;
  realmBanner = 120;
  _realmStore();
}

function _realmStoryReturn(entranceId) {
  var p = players[0];
  var ents = _realmStoryEntrances();
  var e = ents.find(function (q) { return q.id === entranceId; }) || ents[0];
  if (_realmStash) {
    currentArena = _realmStash.arena;
    minions.length = 0;
    Array.prototype.push.apply(minions, _realmStash.minions);
    projectiles = _realmStash.projectiles || [];
    if (p) { p.spawnX = _realmStash.spawnX; p.spawnY = _realmStash.spawnY; }
    _realmStash = null;
  }
  realmRoomKey = null;
  _realmSay = null;
  if (typeof buildGraphForCurrentArena === 'function') buildGraphForCurrentArena();
  if (e && e.oneWay && !realmSave.flags['open_' + e.id]) {
    realmSave.flags['open_' + e.id] = true;
    _realmTell('The hatch unbolts from this side. A way back.', '#88ffcc');
  }
  _realmStore();
  if (!p || !e) return;
  p.x = e.x - p.w / 2; p.y = _realmMainFloorY(e.x) - p.h; p.vx = 0; p.vy = 0;
  if (typeof camXCur !== 'undefined') { camXCur = camXTarget = p.cx(); camYCur = camYTarget = p.cy() - 30; }
}

// Chapter world: entrances, blast doors and their terminals, behind the fighters.
function _realmStoryDrawMain() {
  var f = typeof frameCount !== 'undefined' ? frameCount : 0;
  ctx.save();
  _realmStoryEntrances().forEach(function (e) {
    var locked = (e.needs && !realmSave.flags[e.needs]) || (e.oneWay && !realmSave.flags['open_' + e.id]);
    _realmDrawArch({ x: e.x, y: _realmMainFloorY(e.x), art: e.art, _locked: locked, _closed: e.art === 'hatch' && locked });
  });
  _realmStoryGates().forEach(function (g) {
    var open = !!realmSave.flags['gate_' + g.id];
    var fy = _realmMainFloorY(g.x - 40);
    var top = fy - 260;
    ctx.fillStyle = '#15191b';
    ctx.fillRect(g.x - 40, top - 16, 80, 16);
    if (!open) {
      ctx.fillStyle = '#4a5256';
      ctx.fillRect(g.x - 30, top, 60, fy - top);
      ctx.fillStyle = '#c9a23a';
      for (var sy = top + 10; sy < fy - 10; sy += 34) {
        ctx.beginPath(); ctx.moveTo(g.x - 30, sy); ctx.lineTo(g.x - 30 + 14, sy); ctx.lineTo(g.x - 30, sy + 14); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = '#22282a'; ctx.lineWidth = 2;
      ctx.strokeRect(g.x - 30, top, 60, fy - top);
    } else {
      ctx.fillStyle = '#4a5256';
      ctx.fillRect(g.x - 30, top, 60, 22);
    }
    // Terminal.
    var tx = g.termX, ty = _realmMainFloorY(tx);
    ctx.fillStyle = '#1e2426';
    ctx.fillRect(tx - 6, ty - 70, 12, 70);
    ctx.fillRect(tx - 18, ty - 92, 36, 26);
    var has = !!realmSave.items[g.needs];
    ctx.fillStyle = open ? '#2a6a4a' : has ? '#d6b04a' : '#a8342a';
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(f * 0.1);
    ctx.fillRect(tx - 14, ty - 88, 28, 18);
    ctx.globalAlpha = 1;
  });
  ctx.restore();
}

function _realmPrompt(x, y, verb) {
  ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - 34, y - 14, 68, 20);
  ctx.fillStyle = '#ffd27a';
  ctx.fillText('F  ' + verb, x, y);
}

function _realmStoryDrawPrompt() {
  var p = players[0];
  if (!_realmNear || !p || p.health <= 0 || realmFade !== 0) return;
  ctx.save();
  var n = _realmNear.ref;
  if (_realmNear.kind === 'entrance') {
    var y = _realmMainFloorY(n.x);
    _realmPrompt(n.x, n.art === 'hatch' ? y - 70 : y - 184, n.art === 'hatch' ? 'Climb' : 'Enter');
  } else if (_realmNear.kind === 'terminal') {
    _realmPrompt(n.termX, _realmMainFloorY(n.termX) - 132, 'Use');
  }
  ctx.restore();
}

// Story HUD: the room name on the way in, and the fade. Screen space; the caller set the transform.
function _realmDrawFadeAndBanner(R) {
  if (realmBanner > 0 && R && realmRoomKey) {
    ctx.globalAlpha = realmBanner > 90 ? (120 - realmBanner) / 30 : Math.min(1, realmBanner / 30);
    ctx.textAlign = 'center';
    ctx.font = 'bold 26px Arial';
    ctx.fillStyle = '#e8f2ee';
    ctx.shadowColor = '#5fd8a8'; ctx.shadowBlur = 12;
    ctx.fillText(R.name.toUpperCase(), GAME_W / 2, GAME_H * 0.26);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  if (realmFade !== 0) {
    var fa = realmFade > 0 ? 1 - realmFade / REALM_FADE_F : -realmFade / REALM_FADE_F;
    ctx.globalAlpha = Math.max(0, Math.min(1, fa));
    ctx.fillStyle = '#050302';
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.globalAlpha = 1;
  }
}
