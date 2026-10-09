'use strict';
// smb-move-preview.js — Weapon / class move previews
// -------------------------------------------------------
// A small play button on every weapon and class card in the loadout screen
// starts a preview: a real Training match (real moves, real move scenes, real
// supers) where P1 is driven by a script instead of the keyboard, a caption
// overlay says what each move is, and Back returns to the exact loadout
// screen the player came from with their selections untouched.
//
// Weapon preview: that weapon, class None.
// Class preview:  that class with its ideal weapon (CLASSES[k].weapon, or
//                 MP_IDEAL_WEAPON for the any-weapon classes).
//
// Nothing here writes health. P1 only ever calls attack / ability / useSuper;
// every point of damage goes through dealDamage() as in a normal match.
//
// Depends on: smb-globals.js, smb-data-weapons.js, smb-fighter.js,
//             smb-move-scenes.js, smb-menu-ui.js (selectMode, _enterConfigView),
//             smb-menu-select.js (showDesc, _syncSelCards),
//             smb-menu-spawn.js (startGame), rendering/smb-drawing-arenas.js (backToMenu)
// Ticked by:  smb-loop-core.js  → updateMovePreview()
// Called by:  the preview buttons built in smb-menu-select.js _buildSelCardGrid
// -------------------------------------------------------

// Classes with no fixed weapon get the one that shows them best.
const MP_IDEAL_WEAPON = { warrior: 'sword', berserker: 'axe', summoner: 'sword' };

// The Knight is not in CLASS_DESCS (its fist and moves are built into Fighter).
const MP_CLASS_FALLBACK = {
  megaknight: {
    title: 'Knight',
    weapon: 'mkgauntlet',
    what: 'Legendary knight. Slow, enormous, and built to crush.',
    attack: 'Uppercut Slam: an upward swing with a huge reach that launches whoever it catches.',
    ability: 'Q: Grand Slam. A slam that craters everyone nearby straight up.',
    super: 'E: Mega Jump. Leap into the sky and land with a shockwave.',
    perk: null,
  },
};

const MP_GAP_FAR = 300;   // walk-in / ranged spacing, px between centers
const MP_GAP_NEAR = 150;  // melee Q / E spacing

let _mp = null;           // active preview state, or null
let _mpKeyHooked = false;

function _mpClassInfo(key) {
  const d = (typeof CLASS_DESCS !== 'undefined' && CLASS_DESCS[key]) || null;
  const fb = MP_CLASS_FALLBACK[key] || null;
  return { d, fb };
}

function mpCanPreview(type, key) {
  if (!key || key === 'random') return false;
  if (type === 'weapon') {
    return typeof WEAPON_DESCS !== 'undefined' && !!WEAPON_DESCS[key] && !String(key).startsWith('_custom_');
  }
  if (key === 'none') return false;
  return !!((typeof CLASS_DESCS !== 'undefined' && CLASS_DESCS[key]) || MP_CLASS_FALLBACK[key]);
}

function _mpWeaponForClass(key) {
  const fb = MP_CLASS_FALLBACK[key];
  if (fb && fb.weapon) return fb.weapon;
  const c = (typeof CLASSES !== 'undefined') ? CLASSES[key] : null;
  if (c && c.weapon) return c.weapon;
  return MP_IDEAL_WEAPON[key] || 'sword';
}

// First sentence(s) of a desc's `how` that describe the plain attack.
function _mpBasicHow(how) {
  if (!how) return '';
  const m = String(how).match(/Base[^.]*\./);
  return m ? m[0] : '';
}

function _mpBuildSteps(type, key, weaponKey) {
  const wd = (typeof WEAPON_DESCS !== 'undefined' && WEAPON_DESCS[weaponKey]) || null;
  const { d: cd, fb } = _mpClassInfo(key);
  const steps = [];
  if (type === 'class' && fb) {
    steps.push({ id: 'basic', name: 'Attack', title: 'Basic attack', body: fb.attack });
    steps.push({ id: 'q', name: 'Q', title: 'Q ability', body: fb.ability });
    steps.push({ id: 'e', name: 'E', title: 'E super', body: fb.super });
  } else {
    const basicBody = ((wd && wd.what) || '') + (wd && _mpBasicHow(wd.how) ? ' ' + _mpBasicHow(wd.how) : '');
    steps.push({ id: 'basic', name: 'Attack', title: 'Basic attack', body: basicBody });
    steps.push({ id: 'q', name: 'Q', title: 'Q ability', body: (wd && wd.ability) || 'No ability.' });
    steps.push({ id: 'e', name: 'E', title: 'E super', body: (wd && wd.super) || 'No super.' });
  }
  if (type === 'class') {
    const src = cd || fb || {};
    steps.push({
      id: 'perk', name: 'Class', title: (src.title || key) + ' class',
      body: (src.what || '') + (src.perk ? '  ' + src.perk : ''),
    });
  }
  return steps;
}

// ── Start ────────────────────────────────────────────────────────────────────
function startMovePreview(type, key) {
  if (_mp) return;
  if (typeof NetworkManager !== 'undefined' && NetworkManager.connected) {
    if (NetworkManager.showToast) NetworkManager.showToast('Leave the room to watch previews');
    return;
  }
  if (typeof storyModeActive !== 'undefined' && storyModeActive) return;
  if (!mpCanPreview(type, key)) return;
  const wSel = document.getElementById('p1Weapon');
  const cSel = document.getElementById('p1Class');
  if (!wSel || !cSel) return;

  const weaponKey = type === 'weapon' ? key : _mpWeaponForClass(key);
  const classKey  = type === 'weapon' ? 'none' : key;
  const wOpt = [...wSel.options].some(o => o.value === weaponKey);
  const cOpt = [...cSel.options].some(o => o.value === classKey);
  if (!cOpt) return;
  if (!wOpt) {
    // mkgauntlet etc. are not selectable: the class forces its own fist.
    if (type === 'weapon') return;
  }

  const descPanel = document.getElementById('p1Desc');
  _mp = {
    type, key, weaponKey, classKey,
    saved: {
      mode: gameMode,
      weapon: wSel.value, weaponPicked: wSel.dataset.userPicked,
      cls: cSel.value, clsPicked: cSel.dataset.userPicked,
      training2P: training2P,
      dummyBehavior: (typeof dummyBehavior !== 'undefined') ? dummyBehavior : 'stand',
      descDisplay: descPanel ? descPanel.style.display : '',
      descTitle: (document.getElementById('p1DescTitle') || {}).textContent,
      descBody: (document.getElementById('p1DescBody') || {}).innerHTML,
    },
    live: false,          // true once the match is running and P1 is scripted
    t: 0, startedAt: Date.now(),
    steps: _mpBuildSteps(type, key, weaponKey),
    si: 0, ph: 'enter', pt: 0,
    swings: 0, lastHitFrame: null,
    stats: { hits: 0, q: false, e: false, loops: 0, qFail: false, eFail: false },
    capKey: -1,
  };

  if (!_mpKeyHooked) {
    _mpKeyHooked = true;
    // Capture phase on window: runs before smb-input.js, which would pause.
    window.addEventListener('keydown', e => {
      if (!_mp || !_mp.live || paused) return;
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      endMovePreview();
    }, true);
    // Cleanup net for exits that bypass Back (pause → quit, etc.).
    setInterval(_mpWatch, 250);
  }

  if (wOpt) { wSel.value = weaponKey; wSel.dataset.userPicked = 'true'; }
  else wSel.value = 'random';  // not a pickable weapon: applyClass() hands the class its own fist
  cSel.value = classKey;
  gameMode = 'training';
  training2P = false;
  if (typeof dummyBehavior !== 'undefined') dummyBehavior = 'stand';
  startGame(true);
}

// ── Lifecycle ────────────────────────────────────────────────────────────────
function _mpRestoreSelects(s) {
  const wSel = document.getElementById('p1Weapon');
  const cSel = document.getElementById('p1Class');
  if (wSel) {
    wSel.value = s.weapon;
    if (s.weaponPicked === undefined) delete wSel.dataset.userPicked; else wSel.dataset.userPicked = s.weaponPicked;
  }
  if (cSel) {
    cSel.value = s.cls;
    if (s.clsPicked === undefined) delete cSel.dataset.userPicked; else cSel.dataset.userPicked = s.clsPicked;
  }
}

function _mpRestoreMenu(s) {
  training2P = s.training2P;
  if (typeof dummyBehavior !== 'undefined') dummyBehavior = s.dummyBehavior;
  _mpRestoreSelects(s);
  if (s.mode !== 'training' || gameMode !== 'training') selectMode(s.mode);
  if (typeof _enterConfigView === 'function' && s.mode !== 'story') _enterConfigView(s.mode);
  _mpRestoreSelects(s);
  _syncSelCards('p1WeaponCards', s.weapon);
  _syncSelCards('p1ClassCards', s.cls);
  if (typeof applyBossRangedLock === 'function') applyBossRangedLock(s.mode);
  const panel = document.getElementById('p1Desc');
  if (panel) {
    panel.style.display = s.descDisplay;
    const t = document.getElementById('p1DescTitle');
    const b = document.getElementById('p1DescBody');
    if (t && s.descTitle != null) t.textContent = s.descTitle;
    if (b && s.descBody != null) b.innerHTML = s.descBody;
  }
}

function _mpTeardownUI() {
  document.body.classList.remove('mp-active');
  const ov = document.getElementById('mpOverlay');
  if (ov) ov.remove();
  const hud = document.getElementById('trainingHud');
  if (hud) hud.style.display = 'none';
  const ctl = document.getElementById('trainingControls');
  if (ctl) ctl.style.display = 'none';
  const exp = document.getElementById('trainingExpandPanel');
  if (exp) exp.style.display = 'none';
}

function endMovePreview() {
  const s = _mp;
  if (!s) return;
  _mp = null;
  const p = (typeof players !== 'undefined') ? players[0] : null;
  if (p && p._mpOwned) p.controls = p._mpControls || p.controls;
  _mpTeardownUI();
  if (gameRunning) backToMenu();
  _mpRestoreMenu(s.saved);
}

// Watcher: detects the match starting (restores selects as soon as they have
// been read) and any exit that did not go through endMovePreview().
function _mpWatch() {
  if (!_mp) return;
  const running = gameRunning && !gameLoading && trainingMode &&
    typeof players !== 'undefined' && players[0] && trainingDummies && trainingDummies[0];
  if (!_mp.live) {
    if (running) {
      _mpGoLive();
    } else if (Date.now() - _mp.startedAt > 12000) {
      // The match never started: put the menu back.
      const s = _mp.saved; _mp = null; _mpTeardownUI(); _mpRestoreMenu(s);
    }
    return;
  }
  if (!gameRunning) {
    // Left through the pause menu (quit) or the match ended: menu is already
    // showing the Training screen, so only the leftovers need to go.
    const s = _mp.saved; _mp = null; _mpTeardownUI(); _mpRestoreMenu(s);
  }
}

function _mpGoLive() {
  const p = players[0];
  _mp.live = true;
  // The selects have been read; hand them back right away.
  _mpRestoreSelects(_mp.saved);
  if (typeof ReplaySystem !== 'undefined' && ReplaySystem.discardRecording) ReplaySystem.discardRecording();
  p._mpControls = p.controls;
  p.controls = {};            // keyboard matches nothing: the script drives P1
  p._mpOwned = true;
  p.isAI = false;
  p.lives = 999;
  const p2n = document.getElementById('p2HudName');
  if (p2n) p2n.textContent = 'DUMMY';
  document.body.classList.add('mp-active');
  _mpBuildOverlay();
}

// ── Overlay ──────────────────────────────────────────────────────────────────
function _mpEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function _mpBuildOverlay() {
  const old = document.getElementById('mpOverlay');
  if (old) old.remove();
  const ov = document.createElement('div');
  ov.id = 'mpOverlay';
  let name = _mp.key;
  if (_mp.type === 'weapon') name = (WEAPON_DESCS[_mp.key] || {}).title || _mp.key;
  else name = ((CLASS_DESCS[_mp.key] || MP_CLASS_FALLBACK[_mp.key] || {}).title) || _mp.key;
  ov.innerHTML =
    '<div class="mp-top">' +
      '<span class="mp-kind">' + (_mp.type === 'weapon' ? 'WEAPON PREVIEW' : 'CLASS PREVIEW') + '</span>' +
      '<span class="mp-name">' + _mpEsc(name) + '</span>' +
      '<span class="mp-steps">' + _mp.steps.map((st, i) => '<span class="mp-step" data-i="' + i + '">' + _mpEsc(st.name) + '</span>').join('') + '</span>' +
      '<span class="mp-btns">' +
        '<button type="button" class="mp-btn" id="mpReplay">Replay</button>' +
        '<button type="button" class="mp-btn mp-back" id="mpBack">Back</button>' +
      '</span>' +
    '</div>' +
    '<div class="mp-cap"><div class="mp-cap-title" id="mpCapTitle"></div><div class="mp-cap-body" id="mpCapBody"></div></div>';
  document.body.appendChild(ov);
  document.getElementById('mpReplay').addEventListener('click', _mpReplay);
  document.getElementById('mpBack').addEventListener('click', endMovePreview);
  _mp.capKey = -1;
}

function _mpSetCaption() {
  if (_mp.capKey === _mp.si) return;
  _mp.capKey = _mp.si;
  const st = _mp.steps[_mp.si];
  const t = document.getElementById('mpCapTitle');
  const b = document.getElementById('mpCapBody');
  if (t) t.textContent = st.title;
  if (b) b.textContent = st.body;
  document.querySelectorAll('#mpOverlay .mp-step').forEach(el =>
    el.classList.toggle('on', +el.dataset.i === _mp.si));
}

function _mpReplay() {
  if (!_mp || !_mp.live) return;
  _mp.si = 0; _mp.ph = 'enter'; _mp.pt = 0; _mp.swings = 0;
}

// ── Script driver ────────────────────────────────────────────────────────────
function _mpFloorTop() {
  let top = null;
  const pls = (currentArena && currentArena.platforms) || [];
  for (const pl of pls) {
    if (pl.isFloorDisabled) continue;
    if (pl.isFloor && (top === null || pl.y < top)) top = pl.y;
  }
  if (top === null) {
    for (const pl of pls) if (top === null || pl.y > top) top = pl.y;
  }
  return top === null ? GAME_H - 60 : top;
}

function _mpPlace(p, d, gap) {
  const fy = _mpFloorTop();
  const mid = GAME_W / 2;
  p.x = mid - gap / 2 - p.w / 2; p.y = fy - p.h; p.vx = 0; p.vy = 0; p.facing = 1;
  d.x = mid + gap / 2 - d.w / 2; d.y = fy - d.h; d.vx = 0; d.vy = 0;
  d.spawnX = d.x; d.spawnY = d.y + d.h;
  d.stunTimer = 0; d.ragdollTimer = 0; d.ragdollAngle = 0; d.ragdollSpin = 0;
  p.stunTimer = 0; p.ragdollTimer = 0;
}

function _mpIdle(p, d) {
  if (typeof MoveScene !== 'undefined' && MoveScene.isBusy(p)) return false;
  if (p.attackTimer > 0 || p.attackEndlag > 0 || p._megaJumping || p.superActive) return false;
  if (p.stunTimer > 0 || p.ragdollTimer > 0 || !p.onGround) return false;
  if (d.ragdollTimer > 0 || d.stunTimer > 0 || !d.onGround) return false;
  if (typeof activeFinisher !== 'undefined' && activeFinisher) return false;
  if (typeof activeWorldFinisher !== 'undefined' && activeWorldFinisher) return false;
  if (typeof isCinematic !== 'undefined' && isCinematic) return false;
  if (typeof hitStopFrames !== 'undefined' && hitStopFrames > 0) return false;
  return true;
}

// Spacing for a ranged weapon: far enough to read as ranged, but inside its
// own reach (the flamethrower's stream dies at 180px).
function _mpRangedGap(p) {
  const r = (p.weapon && p.weapon.range) || 300;
  return Math.max(140, Math.min(MP_GAP_FAR, Math.round(r * 0.75)));
}

function _mpIsMelee(p) { return !!(p.weapon && p.weapon.type !== 'ranged'); }

function _mpWalk(p, dir) {
  const spd = 5.2 * (p.classSpeedMult || 1);
  p.vx = dir * spd; p.facing = dir;
}

function _mpNext() {
  if (_mp.si === 0 && _mp.stats.basicHits == null) _mp.stats.basicHits = _mp.stats.hits;
  _mp.si++; _mp.ph = 'enter'; _mp.pt = 0; _mp.swings = 0;
  if (_mp.si >= _mp.steps.length) {
    _mp.si = 0; _mp.ph = 'loop'; _mp.pt = 0;
    _mp.stats.loops++;
  }
}

function updateMovePreview() {
  if (!_mp || !_mp.live || !gameRunning || paused) return;
  const p = players[0];
  const d = trainingDummies[0];
  if (!p || !d) return;

  // Training panels stay hidden for the whole preview.
  const hud = document.getElementById('trainingHud');
  if (hud && hud.style.display !== 'none') hud.style.display = 'none';
  const ctl = document.getElementById('trainingControls');
  if (ctl && ctl.style.display !== 'none') ctl.style.display = 'none';

  _mp.t++; _mp.pt++;
  // Hit tally: the dummy stamps the frame of every hit it takes.
  if (d._lastAttackerFrame != null && d._lastAttackerFrame !== _mp.lastHitFrame) {
    _mp.lastHitFrame = d._lastAttackerFrame;
    _mp.stats.hits++;
  }
  // Never wander off the arena.
  if (p.y > GAME_H + 20 || p.x < -40 || p.x > GAME_W + 40) _mpPlace(p, d, MP_GAP_FAR);

  const st = _mp.steps[_mp.si];
  _mpSetCaption();
  const melee = _mpIsMelee(p);
  const dir = (d.cx() >= p.cx()) ? 1 : -1;

  if (_mp.ph === 'loop') {
    if (_mp.pt > 90) { _mp.ph = 'enter'; _mp.pt = 0; }
    return;
  }

  if (_mp.ph === 'enter') {
    // Wait for everything to come to rest, then stage the move.
    if (!_mpIdle(p, d) && _mp.pt < 240) return;
    if (d.invincible > 0 && _mp.pt < 240) return;
    const near = st.id !== 'basic' && st.id !== 'perk' && melee;
    _mpPlace(p, d, near ? MP_GAP_NEAR : (melee || st.id === 'basic' ? MP_GAP_FAR : _mpRangedGap(p)));
    p.cooldown = 0; p.attackEndlag = 0;
    if (st.id === 'q') p.abilityCooldown = 0;
    if (st.id === 'e') { p._domainSuperCount = 0; p.superMeter = 100; p.superReady = true; }
    _mp.ph = 'act'; _mp.pt = 0; _mp.swings = 0;
    return;
  }

  if (_mp.ph === 'act') {
    if (st.id === 'basic') {
      if (_mp.pt > 540 || _mp.swings >= 3) { _mp.ph = 'settle'; _mp.pt = 0; return; }
      const dx = Math.abs(d.cx() - p.cx());
      const reach = melee ? p._meleeReachDist(d) : 0;
      const ready = p.cooldown <= 0 && p.attackEndlag <= 0 && p.attackTimer <= 0 && p.stunTimer <= 0;
      p.facing = dir;
      if (melee && dx > reach * 0.85) { if (p.attackTimer <= 0) _mpWalk(p, dir); return; }
      if (!melee) {
        const want = _mpRangedGap(p);
        if (dx > want + 30) { if (p.attackTimer <= 0) _mpWalk(p, dir); return; }
        if (dx < want - 50 && p.attackTimer <= 0) _mpWalk(p, -dir);
      }
      if (ready && !MoveScene.isBusy(p)) {
        p.attack(d);
        if (p.cooldown > 0 || p.attackTimer > 0) _mp.swings++;
      }
      return;
    }
    if (st.id === 'q') {
      p.facing = dir;
      p.ability(d);
      if (p.abilityCooldown > 0 || MoveScene.isBusy(p)) { _mp.stats.q = true; _mp.ph = 'settle'; _mp.pt = 0; }
      else if (_mp.pt > 90) { _mp.stats.qFail = true; _mp.ph = 'settle'; _mp.pt = 0; }
      return;
    }
    if (st.id === 'e') {
      p.facing = dir;
      p._domainSuperCount = 0;
      p.useSuper(d);
      if (!p.superReady || MoveScene.isBusy(p)) { _mp.stats.e = true; _mp.ph = 'settle'; _mp.pt = 0; }
      else if (_mp.pt > 90) { _mp.stats.eFail = true; _mp.ph = 'settle'; _mp.pt = 0; }
      return;
    }
    // perk / caption-only step
    if (_mp.pt > 330) { _mp.ph = 'hold'; _mp.pt = 0; }
    return;
  }

  if (_mp.ph === 'settle') {
    const done = _mp.pt > 40 && _mpIdle(p, d) && (projectiles.length === 0 || _mp.pt > 240);
    if (done || _mp.pt > 720) { _mp.ph = 'hold'; _mp.pt = 0; }
    return;
  }

  if (_mp.ph === 'hold') {
    if (_mp.pt > 60) _mpNext();
  }
}

// The card grids are first built before this file loads, so rebuild them once
// now that mpCanPreview() exists and the buttons can be attached.
if (typeof _initSelCardGrids === 'function') { try { _initSelCardGrids(); } catch (e) { /* menu not ready */ } }
