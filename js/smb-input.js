'use strict';
// smb-input.js: keyboard handlers, _normKey, _clearAllKeys, SCROLL_BLOCK, processInput().
// Depends on smb-globals.js and smb-data-weapons.js (WEAPONS).
const keysDown      = new Set();
const keyHeldFrames = {};   // key → frames held continuously
const ATTACK_MASH_LOCK = 16; // frames the attack key stays dead after a mashed recovery (outlasts STRING_STUN_PAD)

// Last input device for on-screen prompts: 'keyboard' | 'touch' | 'gamepad'. Synthetic touch keydowns don't count as keyboard.
let lastInputDevice = ('ontouchstart' in window && !window.matchMedia('(pointer:fine)').matches) ? 'touch' : 'keyboard';
document.addEventListener('keydown', e => { if (e.isTrusted) lastInputDevice = 'keyboard'; }, true);
document.addEventListener('pointerdown', e => { lastInputDevice = (e.pointerType === 'touch' || e.pointerType === 'pen') ? 'touch' : (e.pointerType === 'mouse' && lastInputDevice === 'touch' ? 'keyboard' : lastInputDevice); }, true);
window.addEventListener('gamepadconnected', () => { lastInputDevice = 'gamepad'; });
function pollInputDevice() {
  try {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const g of pads) {
      if (g && (g.buttons.some(b => b.pressed) || g.axes.some(v => Math.abs(v) > 0.6))) { lastInputDevice = 'gamepad'; break; }
    }
  } catch (e) {}
  return lastInputDevice;
}

const SCROLL_BLOCK = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 's', '/']);

// Lowercase single letters so caps lock and shift don't break bindings. Everything else passes through.
function _normKey(k) {
  if (!k) return k;
  return (k.length === 1 && k >= 'A' && k <= 'Z') ? k.toLowerCase() : k;
}

// Letter bindings use the physical key (e.code), so WASD is the same keys on every layout.
// Portals serve every European locale. Non-letter keys still come from e.key.
function _rawEventKey(e) {
  const c = e.code;
  if (c && c.length === 4 && c.slice(0, 3) === 'Key') {
    const ch = c.charAt(3);
    if (ch >= 'A' && ch <= 'Z') return ch.toLowerCase();
  }
  if (c === 'Semicolon') return ';';   // P2 attack: the key right of L on any layout
  return _normKey(e.key);
}

// Custom keybinds are applied here, at the event: a bound key is reported as the default key of
// its action, so every Fighter.controls table, touch button, gamepad and hint keeps the defaults.
// Synthetic events (touch, gamepad) already send defaults and are never remapped.
const KEYBIND_ACTIONS  = ['left', 'right', 'jump', 'shield', 'attack', 'ability', 'super'];
// Battle Royale / Endless item keys. Shared by both players; pickup/drop also accept/decline a creature form.
const KEYBIND_ITEM_ACTIONS = ['pickup', 'drop', 'use'];
const KEYBIND_SLOT_ACTIONS = { p1: KEYBIND_ACTIONS, p2: KEYBIND_ACTIONS, items: KEYBIND_ITEM_ACTIONS };
const KEYBIND_DEFAULTS = {
  p1: { left: 'a', right: 'd', jump: 'w', attack: ' ', shield: 's', ability: 'q', super: 'e' },
  p2: { left: 'j', right: 'l', jump: 'i', attack: ';', shield: 'k', ability: 'o', super: 'u' },
  items: { pickup: 'f', drop: 'g', use: 'r' },
};
// Pause, menus and the dev F-keys own these. 1-5 are Battle Royale inventory slots, read from e.key before any binding.
const KEYBIND_RESERVED = new Set(['Escape', 'p', 'Tab', '1', '2', '3', '4', '5', 'Control', 'Meta', 'Alt', 'AltGraph', 'CapsLock', 'ContextMenu',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'Unidentified', 'Dead', 'Process']);
let keybinds = null;
const _keybindRemap = new Map();   // pressed key -> default key it stands for

function _keybindsEach(fn) {
  for (const slot in KEYBIND_SLOT_ACTIONS) for (const a of KEYBIND_SLOT_ACTIONS[slot]) fn(slot, a);
}
function _keybindsRebuild() {
  _keybindRemap.clear();
  _keybindsEach((slot, a) => {
    const k = keybinds[slot][a], d = KEYBIND_DEFAULTS[slot][a];
    if (k && k !== d) _keybindRemap.set(k, d);
  });
}
function _keybindsLoad() {
  keybinds = {};
  for (const slot in KEYBIND_DEFAULTS) keybinds[slot] = { ...KEYBIND_DEFAULTS[slot] };
  try {
    const s = JSON.parse(localStorage.getItem('smc_keybinds') || 'null');
    if (s) {
      _keybindsEach((slot, a) => {
        const k = s[slot] && s[slot][a];
        if (typeof k === 'string' && k && !KEYBIND_RESERVED.has(k)) keybinds[slot][a] = k;
      });
      // A hand-edited or older save can bind one key twice; fall back to defaults rather than guess.
      const used = new Set();
      let dup = false;
      _keybindsEach((slot, a) => { const k = keybinds[slot][a]; if (used.has(k)) dup = true; used.add(k); });
      if (dup) for (const slot in KEYBIND_DEFAULTS) keybinds[slot] = { ...KEYBIND_DEFAULTS[slot] };
    }
  } catch (e) {}
  _keybindsRebuild();
}
function _keybindsSave() {
  try { localStorage.setItem('smc_keybinds', JSON.stringify(keybinds)); } catch (e) {}
  _keybindsRebuild();
}
// Bind an action. A key already held by another action (any table) is swapped onto it, so no key does two things.
function setKeybind(slot, action, key) {
  if (!keybinds[slot] || !KEYBIND_SLOT_ACTIONS[slot].includes(action) || !key || KEYBIND_RESERVED.has(key)) return false;
  const old = keybinds[slot][action];
  _keybindsEach((s, a) => {
    if ((s !== slot || a !== action) && keybinds[s][a] === key) keybinds[s][a] = old;
  });
  keybinds[slot][action] = key;
  _keybindsSave();
  return true;
}
function resetKeybinds(slot) {
  for (const s of (slot ? [slot] : Object.keys(KEYBIND_DEFAULTS))) keybinds[s] = { ...KEYBIND_DEFAULTS[s] };
  _keybindsSave();
}
// Display name for a key, or for the key currently bound to a default key (keyLabelFor(' ') -> 'Space').
function keyLabel(k) {
  if (k === ' ') return 'Space';
  const arrows = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };
  if (arrows[k]) return arrows[k];
  return (k && k.length === 1) ? k.toUpperCase() : (k || '?');
}
function keyLabelFor(defaultKey) {
  for (const slot in KEYBIND_SLOT_ACTIONS) for (const a of KEYBIND_SLOT_ACTIONS[slot]) {
    if (KEYBIND_DEFAULTS[slot][a] === defaultKey) return keyLabel(keybinds[slot][a]);
  }
  return keyLabel(defaultKey);
}
_keybindsLoad();

function _eventKey(e) {
  const k = _rawEventKey(e);
  return (e.isTrusted && _keybindRemap.has(k)) ? _keybindRemap.get(k) : k;
}

// Who a human's attack/Q/E aims at. With no second player (Battle Royale), use the nearest foe.
// minions[0] is often far off, which made range-gated moves like Iaijutsu never fire.
function _inputTarget(p, i) {
  const other = players[i === 0 ? 1 : 0];
  if (other) return other;
  let best = null, bestD = Infinity;
  for (const f of [...players, ...trainingDummies, ...minions]) {
    if (!f || f === p || f.health <= 0 || !isHostileTarget(p, f)) continue;
    const d = Math.hypot(f.cx() - p.cx(), f.cy() - p.cy());
    if (d < bestD) { bestD = d; best = f; }
  }
  return best || undefined;
}

document.addEventListener('keydown', e => {
  // Don't intercept keys when typing in any text input (chat, console, etc.)
  const ae = document.activeElement;
  const inputFocused = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
  if (inputFocused) return; // let the input receive all keystrokes unmodified
// A between-level narrative scene owns the keyboard. Escape here would skip the scene and open
// the pause menu under it, and queued movement would fire when the match resumes.
  if (window._storySceneHold) return;
  if (tfEndingScene && tfEndingScene.skippable && tfEndingScene.phase === 'powers') { trySkipTFEnding(); return; }
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { pauseGame(); return; }
  // Cheat code: type TRUEFORM anywhere in menu to unlock True Form.
  // (Typing GAMECONSOLE no longer opens the console. It is Ctrl+Shift+O then Ctrl+Shift+X, smb-debug-overlay.js.)
  if (e.key && e.key.length === 1) {
    _cheatBuffer = ((_cheatBuffer || '') + e.key.toUpperCase()).slice(-20);
  }
  if (!gameRunning && e.key && e.key.length === 1) {
    if (_cheatBuffer.endsWith('TRUEFORM')) {
      _cheatBuffer = '';
      if (!unlockedTrueBoss) {
        if (typeof setAccountFlagWithRuntime === 'function') {
          setAccountFlagWithRuntime(['unlocks', 'trueform'], true, function(v) { unlockedTrueBoss = v; });
          [0,1,2,3,4,5,6,7].forEach(function(id) { if (typeof addLetter === 'function') addLetter(id); });
        } else {
          unlockedTrueBoss = true;
          [0,1,2,3,4,5,6,7].forEach(function(id) { collectedLetterIds.add(id); });
        }
        syncCodeInput();
        const card = document.getElementById('modeTrueForm');
        if (card) card.style.display = '';
        spawnParticles && spawnParticles(450, 260, '#cc00ff', 30);
        spawnParticles && spawnParticles(450, 260, '#ffffff', 20);
        showBossDialogue && showBossDialogue('Cosmic Axiom Unlocked!', 180);
        const notif = document.createElement('div');
        notif.textContent = '⚡ COSMIC AXIOM UNLOCKED ⚡';
        notif.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(160,0,255,0.92);color:#fff;padding:16px 32px;border-radius:12px;font-size:1.2rem;font-weight:900;letter-spacing:3px;z-index:9999;pointer-events:none;text-align:center;box-shadow:0 0 40px #cc00ff;';
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
      }
    }
    // SOVEREIGN cheat: type UNLOCKSOVEREIGN in menu
    if (_cheatBuffer.endsWith('UNLOCKSOVEREIGN')) {
      _cheatBuffer = '';
      if (!sovereignBeaten) {
        if (typeof setAccountFlagWithRuntime === 'function') {
          setAccountFlagWithRuntime(['unlocks', 'sovereignBeaten'], true, function(v) { sovereignBeaten = v; });
        } else {
          sovereignBeaten = true;
        }
        const adCard  = document.getElementById('modeAdaptive');
        const sovCard = document.getElementById('modeSovereign');
        if (adCard)  adCard.style.display  = '';
        if (sovCard) sovCard.style.display = '';
        const notif = document.createElement('div');
        notif.textContent = '⚡ SOVEREIGN UNLOCKED ⚡';
        notif.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(100,0,200,0.92);color:#fff;padding:16px 32px;border-radius:12px;font-size:1.2rem;font-weight:900;letter-spacing:3px;z-index:9999;pointer-events:none;text-align:center;box-shadow:0 0 40px #8800ff;';
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
      }
    }
    // KNIGHT cheat: type CLASSKNIGHT in menu (the old CLASSMEGAKNIGHT still works)
    if (_cheatBuffer.endsWith('CLASSKNIGHT') || _cheatBuffer.endsWith('CLASSMEGAKNIGHT')) {
      _cheatBuffer = '';
      if (typeof setAccountFlagWithRuntime === 'function') {
        setAccountFlagWithRuntime(['unlocks', 'megaknight'], true, function(v) { unlockedMegaknight = v; });
      } else {
        unlockedMegaknight = true;
      }
      ['p1Class','p2Class'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel && !sel.querySelector('option[value="megaknight"]')) {
          const opt = document.createElement('option'); opt.value = 'megaknight'; opt.textContent = 'Class: Knight ★'; sel.appendChild(opt);
        }
      });
      const notif2 = document.createElement('div');
      notif2.textContent = '★ Class: KNIGHT UNLOCKED ★';
      notif2.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(80,0,160,0.95);color:#fff;padding:14px 32px;border-radius:12px;font-size:1.2rem;font-weight:900;letter-spacing:2px;z-index:9999;pointer-events:none;text-align:center;box-shadow:0 0 40px #8844ff;';
      document.body.appendChild(notif2);
      setTimeout(() => notif2.remove(), 3000);
    }
    // ABSOLUTE AXIOM cheat: type AXIOMSQUARED in menu
    if (_cheatBuffer.endsWith('AXIOMSQUARED')) {
      _cheatBuffer = '';
      if (!absoluteAxiomUnlocked) {
        if (typeof setAccountFlagWithRuntime === 'function') {
          setAccountFlagWithRuntime(['unlocks', 'absoluteAxiomUnlocked'], true, function(v) { absoluteAxiomUnlocked = v; });
        } else {
          absoluteAxiomUnlocked = true;
        }
        if (typeof saveGame === 'function') saveGame();
        const aaCard = document.getElementById('modeAbsoluteAxiom');
        if (aaCard) aaCard.style.display = '';
        const notif3 = document.createElement('div');
        notif3.textContent = '⚠ ABSOLUTE AXIOM UNLOCKED ⚠';
        notif3.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);background:rgba(180,50,0,0.95);color:#fff;padding:14px 32px;border-radius:12px;font-size:1.2rem;font-weight:900;letter-spacing:2px;z-index:9999;pointer-events:none;text-align:center;box-shadow:0 0 40px #ff4400;';
        document.body.appendChild(notif3);
        setTimeout(() => notif3.remove(), 3000);
      }
    }
  }
  const _nk = _eventKey(e);
  if (SCROLL_BLOCK.has(_nk) || (gameRunning && e.isTrusted && _keybindRemap.has(_rawEventKey(e)))) e.preventDefault();
  if (keysDown.has(_nk)) return; // already tracked: let held-frame counter run
  keysDown.add(_nk);

  // Battle Royale inventory: 1-5 select slot (weapons auto-swap, consumables just highlight)
  if (gameRunning && !paused && gameMode === 'battleroyale' && e.key >= '1' && e.key <= '5') {
    if (typeof selectBRSlot === 'function') selectBRSlot(parseInt(e.key, 10) - 1);
    return;
  }
  // Battle Royale item actions (only when alive, not spectating)
  if (gameRunning && !paused && gameMode === 'battleroyale' && typeof brSpectating !== 'undefined' && !brSpectating) {
    if (_nk === 'r') { if (typeof consumeBRActiveSlot === 'function') consumeBRActiveSlot(); return; }
    // A pending beast/yeti offer takes F and G until it is answered or expires.
    if (_nk === 'f' && typeof brAcceptFormOffer  === 'function' && brAcceptFormOffer())  return;
    if (_nk === 'g' && typeof brDeclineFormOffer === 'function' && brDeclineFormOffer()) return;
    if (_nk === 'g') { if (typeof dropBRActiveSlot    === 'function') dropBRActiveSlot();    return; }
    if (_nk === 'f') { if (typeof _brPickupNearbyGroundItem === 'function') _brPickupNearbyGroundItem(); return; }
  }
  if (gameRunning && !paused && gameMode === 'endless' && _nk === 'f' && typeof endlessPickup === 'function' && endlessPickup()) return;
  // Battle Royale spectate: Q = prev, E = next
  if (gameRunning && gameMode === 'battleroyale' && typeof brSpectating !== 'undefined' && brSpectating) {
    if (_nk === 'q') { if (typeof _brCycleSpectate === 'function') _brCycleSpectate(-1); return; }
    if (_nk === 'e') { if (typeof _brCycleSpectate === 'function') _brCycleSpectate(1);  return; }
  }

  if (!gameRunning || paused) return;
  // Block attack/ability/super keydown events during the TF opening cinematic (after free period)
  if (typeof tfOpeningFightActive !== 'undefined' && tfOpeningFightActive
      && (typeof _tfOpeningFreeFrames === 'undefined' || _tfOpeningFreeFrames <= 0)) return;
    // Also blocked during a finisher: it freezes the world, but this path calls attack/ability/useSuper
    // directly. Without this, a super pressed mid-execution spent meter on a domain the death cancelled.
  if (typeof activeFinisher !== 'undefined' && activeFinisher) return;
  if (typeof activeWorldFinisher !== 'undefined' && activeWorldFinisher) return;

  players.forEach((p, i) => {
    if (p.isAI || p.health <= 0) return;
    const other         = _inputTarget(p, i);
    const incapacitated = p.ragdollTimer > 0 || p.stunTimer > 0;
    // Paradox Fusion: block all direct player actions while Paradox owns controls
    if (p._fusionAIOverride) return;
    if (_nk === p.controls.attack) {
      e.preventDefault();
      // Combo Strike aim window: the attack key commits the kick, not a normal swing.
      if (p._comboSuper && p._comboSuper.phase === 3) { p._comboSuper.fire = true; return; }
      // A press during the swing's cooldown is buffered, so a combo follow-up can land in the window
      // after recovery. Pressing again inside the recovery is mashing: it drops the buffer and locks
      // the attack key for ATTACK_MASH_LOCK frames past recovery.
      const _recovering = p.cooldown > 0 || (!p.isBoss && p.attackEndlag > 0);
      if (frameCount < (p._attackMashUntil || 0)) { /* mashed: ignored */ }
      else if (!incapacitated && !_recovering) { p.attack(other); }
      else if (_recovering && !incapacitated && p._inputBuffer && p._inputBuffer.action === 'attack') {
        p._inputBuffer = null;
        p._attackMashUntil = frameCount + Math.max(p.cooldown, p.attackEndlag || 0) + ATTACK_MASH_LOCK;
      }
      else { p._inputBuffer = { action: 'attack', frame: frameCount }; }
    }
    if (_nk === p.controls.ability) {
      e.preventDefault();
      // Depth phase: Q = move toward background layer (-Z): not bufferable
      if (typeof tfDepthPhaseActive !== 'undefined' && tfDepthPhaseActive &&
          typeof tfDepthEnabled !== 'undefined' && tfDepthEnabled && !p.isAI) {
        p.z = Math.max(-1, (p.z || 0) - 0.3);
        spawnParticles(p.cx(), p.cy(), '#8844ff', 4);
      } else if (p._storyNoAbility) {
        // ability locked in story: silently ignore
      } else if (!incapacitated) {
        p.ability(other);
      } else {
        p._inputBuffer = { action: 'ability', frame: frameCount };
      }
    }
    if (p.controls.super && _nk === p.controls.super) {
      e.preventDefault();
      // Depth phase: E = move toward foreground layer (+Z): not bufferable
      if (typeof tfDepthPhaseActive !== 'undefined' && tfDepthPhaseActive &&
          typeof tfDepthEnabled !== 'undefined' && tfDepthEnabled && !p.isAI) {
        p.z = Math.min(1, (p.z || 0) + 0.3);
        spawnParticles(p.cx(), p.cy(), '#00aaff', 4);
      } else if (p._storyNoSuper) {
        // super locked in story: silently ignore
      } else if (!incapacitated || (p.stunTimer > 0 && !(p.ragdollTimer > 0) && p.superReady)) {
        // Stunned with a full meter: two presses of useSuper() burst out of the combo.
        checkSecretLetterCollect(p);
        // A banked Conviction waits on the key: processInput() fires it once E is held
        // CONVICTION_HOLD_FRAMES, and an earlier release is a normal super. Sovereign decides for himself.
        const _holdPick = !incapacitated && p.superReady && !p._autoConviction &&
          !(typeof SovereignMK2 !== 'undefined' && p instanceof SovereignMK2) && p.convictionBanked();
        if (_holdPick) p._convHoldAt = frameCount;
        else p.useSuper(other);
      } else {
        p._inputBuffer = { action: 'super', frame: frameCount };
      }
    }
  });
});

document.addEventListener('keyup', e => {
  const _nk = _eventKey(e);
  keysDown.delete(_nk);
  delete keyHeldFrames[_nk];
  // Release the printed character too, so a key tracked under e.key can't stick down.
  const _pk = _normKey(e.key);
  if (_pk !== _nk && !(e.isTrusted && _keybindRemap.has(_rawEventKey(e)))) { keysDown.delete(_pk); delete keyHeldFrames[_pk]; }
});

// Tab lost focus: clear held keys so nothing stays held (floating, invincibility timer freeze).
function _clearAllKeys() {
  keysDown.clear();
  for (const k in keyHeldFrames) delete keyHeldFrames[k];
}
window.addEventListener('blur', _clearAllKeys);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) _clearAllKeys();
});

const SHIELD_MAX    = 140;  // max frames shield stays up (~2.3 s)
const SHIELD_CD     = 180; // 3-second cooldown at 60 fps
const FAST_FALL_VY  = 13;  // shield key in the air; the fall cap (19) still applies

function processInput() {
  if (!gameRunning || paused) return;
  if (gameLoading) return; // freeze input while loading screen is visible
  if (activeCinematic) return; // freeze player controls during boss cinematics
  if (gameFrozen) return;      // hard freeze during cinematics: halts all input
  if (tfAbsorptionScene) return; // freeze all input during absorption cinematic
  if (typeof isCutsceneActive === 'function' && isCutsceneActive()) return; // freeze during cutscenes
  // Combat lock: highest-priority phase (cinematic/finisher) blocks all player input
  if (typeof isCombatLocked === 'function' && isCombatLocked('input')) return;
  // Lock player input only after the 5-second free period has elapsed
  if (typeof tfOpeningFightActive !== 'undefined' && tfOpeningFightActive
      && (typeof _tfOpeningFreeFrames === 'undefined' || _tfOpeningFreeFrames <= 0)) return;

  // Fused with Paradox, the player keeps the controls: Paradox is power (paradoxPlayerUseAbility),
  // not a second pilot. The old timed handover took control away every few seconds with no warning.
  if (typeof tfParadoxFused !== 'undefined' && tfParadoxFused) {
    controlState = 'player';
    controlTimer = 0;
    tfFusionControlMode = 'player';
    if (players[0] && !players[0].isBoss) players[0]._fusionAIOverride = false;
  }

  for (const k of keysDown) keyHeldFrames[k] = (keyHeldFrames[k] || 0) + 1;

  players.forEach(p => {
    if (p.isAI || p.health <= 0) return;
    if (p._fusionAIOverride) return; // Paradox Fusion: AI handles movement, skip keyboard input
    // Inside a move scene (smb-move-scenes.js) the scene moves the body; a held
    // victim's one way out is the super key, handled on keydown.
    if (p._msScene || p._msLock || p._msNetHold) { p.shielding = false; return; }
    // Guard burst (smb-combat.js): a fresh shield press 2+ hits into a stun breaks
    // it and raises the guard, then this frame's input runs as normal.
    const _burst = p.stunTimer > 0 && (keyHeldFrames[p.controls.shield] || 0) === 1 && guardBurst(p);
    if (!_burst && (p.ragdollTimer > 0 || p.stunTimer > 0)) {
      // Expire stale buffer so it can't fire far outside the intended window
      if (p._inputBuffer && (frameCount - p._inputBuffer.frame) > 8) p._inputBuffer = null;
      p.shielding = false;
      return;
    }
    // Input buffer: if a buffered action was queued while incapacitated and the
    // window (~133ms / 8 frames) hasn't expired, execute it now and clear.
    const _bufWait = p._inputBuffer && p._inputBuffer.action === 'attack' &&
                     (p.cooldown > 0 || (!p.isBoss && p.attackEndlag > 0));
    if (p._inputBuffer && !_bufWait) {
      if ((frameCount - p._inputBuffer.frame) <= 8) {
        const _buf      = p._inputBuffer;
        const _pi       = players.indexOf(p);
        const _bufOther = _inputTarget(p, _pi);
        p._inputBuffer  = null;
        if      (_buf.action === 'attack')  p.attack(_bufOther);
        else if (_buf.action === 'ability' && !p._storyNoAbility) p.ability(_bufOther);
        else if (_buf.action === 'super'   && !p._storyNoSuper)   { checkSecretLetterCollect(p); p.useSuper(_bufOther); }
      } else {
        p._inputBuffer = null; // window expired
      }
    }
    // Banked Conviction (super keydown above): held long enough fires it, let go early is a normal super.
    if (p._convHoldAt != null) {
      const _held = keysDown.has(p.controls.super);
      if (!_held || frameCount - p._convHoldAt >= CONVICTION_HOLD_FRAMES) {
        p._convHoldAt = null;
        p._convictionHeld = _held;
        if (!p._storyNoSuper) p.useSuper(_inputTarget(p, players.indexOf(p)));
        p._convictionHeld = false;
      }
    }

    const hasCurseSlow = p.curses && p.curses.some(c => c.type === 'curse_slow');
    const _chaosSpeed = gameMode === 'minigames' && currentChaosModifiers.has('speedy') ? 1.4 : 1.0;
    const _underwaterSlow = currentArena && currentArena.isSlowMovement ? 0.72 : 1.0;
    const _earthSlow      = currentArena && currentArena.earthPhysics   ? 0.70 : 1.0;
    // Anti-kite decay (0.70-1.0), shooting penalty (0.85 while firing ranged / 0.78 post-burst)
    const _kiteMult    = (p._kiteSpeedMult != null) ? p._kiteSpeedMult : 1.0;
    const _isRanged    = p.weapon && p.weapon.type === 'ranged';
    const _tfAntiBoss  = typeof getTrueFormAntiRangedBoss === 'function' ? getTrueFormAntiRangedBoss() : null;
    const _rangeLockMult = _tfAntiBoss && !p.isBoss
      ? (Math.abs(p.cx() - _tfAntiBoss.cx()) > (_tfAntiBoss._antiRangedFieldR || 220)
          ? (_isRanged ? 0.58 : 0.72)
          : 1.0)
      : 1.0;
    const _shootingMult = _isRanged && p.attackTimer > 0   ? 0.78
                        : _isRanged && p._rangedMovePenalty > 0 ? 0.70 : 1.0;
    const _commitMult  = _isRanged && p._rangedCommitTimer > 0 ? 0.64 : 1.0;
    const spd  = 5.2 * (p.classSpeedMult || 1.0) * (p._speedBuff > 0 ? 1.35 : 1.0) * (hasCurseSlow ? 0.6 : 1.0) * _chaosSpeed * _underwaterSlow * _earthSlow * _kiteMult * _shootingMult * _commitMult * _rangeLockMult;
    const wHeld = keyHeldFrames[p.controls.jump]  || 0;


    // True Form: inverted controls for human players only
    const _ctrlInv  = (!p.isAI) && ((gameMode === 'trueform' && tfControlsInverted) || (currentArenaKey === 'mirror' && mirrorFlipped));
    const _leftKey  = _ctrlInv ? p.controls.right : p.controls.left;
    const _rightKey = _ctrlInv ? p.controls.left  : p.controls.right;
    const movingLeft  = keysDown.has(_leftKey);
    const movingRight = keysDown.has(_rightKey);
    if (movingLeft) {
      p.vx = -spd;
      p.facing = -1; // face direction of last key pressed
    }
    if (movingRight) {
      p.vx =  spd;
      p.facing = 1;  // face direction of last key pressed
    }
    // Decay acceleration ramp when no direction key held

    if (wHeld === 1) {
      // Knight gets higher jump power
      const jumpPower = p.charClass === 'megaknight' ? -22 : -17;
      const dblPower  = p.charClass === 'megaknight' ? -16 : -13;
      if (p.onGround || (p.coyoteFrames > 0 && !p.canDoubleJump) || p._lavaJumpGrace > 0) {
        // Ground jump (or coyote jump: briefly after walking off a platform,
        // or lava-bounce grace so players can always jump back out of lava)
        p.vy = jumpPower;
        p.canDoubleJump = true; // enable one double-jump after leaving ground
        p.coyoteFrames  = 0;   // consume coyote window
        p._lavaJumpGrace = 0;  // consume lava-bounce grace
        if (p._rd) PlayerRagdoll.applyJump(p);
        spawnParticles(p.cx(), p.y + p.h, '#ffffff', 5);
        if (p.charClass === 'megaknight') spawnParticles(p.cx(), p.y + p.h, '#8844ff', 5);
        SoundManager.jump();
      } else if (p.canDoubleJump && !p._noDoubleJump) {
        // Double jump in air: gated by skill flag in story mode
        p.vy = dblPower;
        p.canDoubleJump = false;
        spawnParticles(p.cx(), p.cy(), p.color,  8);
        spawnParticles(p.cx(), p.cy(), '#ffffff', 5);
        SoundManager.doubleJump();
      } else if (p._wxExtraJumps > 0 && !p._noDoubleJump) {
        // Fragment Overdrive: third jump, refilled on landing by smb-weapons-ext.js
        p.vy = dblPower;
        p._wxExtraJumps--;
        spawnParticles(p.cx(), p.cy(), '#8fd8ff', 10);
        SoundManager.doubleJump();
      }
    }
    // --- S / ArrowDown = shield (degrades per consecutive deployment; re-press required after break) ---
    // Tiers: stacks 1→30HP, 2→15HP, 3→5HP, 4→80% block, 5→50% block, 6→20% block, 7+→no effect
    const sHeld     = keysDown.has(p.controls.shield);
    // _shieldOosLatch: an attack out of shield dropped the guard (Fighter.attack);
    // it stays down until the key is released, or a held key would re-raise it.
    const sNewPress = sHeld && (p.shieldHoldTimer || 0) === 0 && !p.shieldBroken && !p._shieldOosLatch;
    if (p._brShieldTimer > 0) {
      p._brShieldTimer--;
      if (p._brShieldTimer <= 0) { p.shielding = false; p._brShieldTimer = 0; }
    }
    if (!p.onGround && !p._brShieldTimer) {
      // Airborne the same key is also fast-fall, past the apex only so it can't
      // cancel a jump's rise. With SHIELD_AIR it raises the air guard as well.
      const _gDir = ((gameMode === 'trueform' || gameMode === 'story') && tfGravityInverted) ? -1 : 1;
      if (sHeld && (keyHeldFrames[p.controls.shield] || 0) === 1 && p.vy * _gDir > -2) {
        p.vy = _gDir * Math.max(p.vy * _gDir, FAST_FALL_VY);
      }
    }
    if ((p._landLag > 0 || (!p.onGround && !SHIELD_AIR)) && !p._brShieldTimer) {
      // No guard out of landing lag (or in the air with SHIELD_AIR off). Fighter.update()
      // drops any guard still up; the hold timer stays 0 so holding it through
      // raises the guard as a fresh press.
      p.shielding = false;
      p.shieldHoldTimer = 0;
    } else if (!sHeld && !p._brShieldTimer) {
      // Key released: clear shield state and allow fresh activation on next press
      p.shielding       = false;
      p.shieldHoldTimer = 0;
      p.shieldBroken    = false;
      p._shieldOosLatch = false;
      p._shieldRaiseDelay = 0;
    } else if (sNewPress && p._domainSlowFactor > 0 && p._domainSlowFactor < 1 &&
               (p._shieldRaiseDelay || 0) < Math.round(8 / p._domainSlowFactor - 8)) {
      // Shadow Realm time dilation: the shield comes up late: keep holding through the raise
      p._shieldRaiseDelay = (p._shieldRaiseDelay || 0) + 1;
    } else if (sNewPress && !(p.weapon && p.weapon.type === 'ranged' && p._rangedCommitTimer > 0)) {
      // New key-press: book it under the active shield rules (smb-combat.js shieldRaise)
      if (shieldRaise(p)) {
        p.shielding       = true;
        p.shieldHoldTimer = 1;
        if (SoundManager.shieldUp) SoundManager.shieldUp();
      }
    } else if (sHeld && p.shielding) {
      p.shieldHoldTimer = (p.shieldHoldTimer || 0) + 1;
      if (p.shieldHoldTimer >= SHIELD_MAX) {
        // Max continuous hold: force re-press for next activation
        p.shielding       = false;
        p.shieldHoldTimer = 0;
        p.shieldBroken    = true;
      }
    }
    // Paradox Fusion: ability key triggers paradox abilities during player control phase
    if (typeof tfParadoxFused !== 'undefined' && tfParadoxFused &&
        typeof tfFusionControlMode !== 'undefined' && tfFusionControlMode === 'player' &&
        !p._fusionAIOverride) {
      const _abilityHeldFrames = keyHeldFrames[p.controls.ability] || 0;
      if (_abilityHeldFrames === 1 && typeof paradoxPlayerUseAbility === 'function') {
        paradoxPlayerUseAbility(p);
      }
    }
    // Fracture interaction: E key (super) or ability key on P1 near an unlocked fracture
    if (!p.isAI && p === players[0] && typeof checkFractureInteraction === 'function') {
      const _ePressed = (keyHeldFrames[p.controls.super] || 0) === 1;
      checkFractureInteraction(p, _ePressed);
    }
  });
}

// Gamepad: standard-mapping pads send the same synthetic keydown/keyup as the keyboard and touch pads.
// Pad 1 is the first local human, pad 2 the second (local 2P only). Own rAF loop, so menus work too.
//   Stick/D-pad L/R = move, up or A = jump, down or LB/RB/LT/RT = shield, X = attack, Y = ability (Q), B = super (E).
//   Start = Esc. Outside a match the D-pad moves a focus ring and A clicks it; in a story scene A advances (Enter).
// Only keys the pad itself pressed get released by the pad, so it never fights the keyboard.
const _GP_ON = 0.35, _GP_OFF = 0.25;
const _GP_P2_KEYS = KEYBIND_DEFAULTS.p2;
const _GP_P1_KEYS = KEYBIND_DEFAULTS.p1;
const _gpHeld = [{}, {}];        // per pad: action -> key we sent keydown for
const _gpAct  = [{}, {}];        // per pad: action -> latched on/off (hysteresis)
const _gpPrev = [{}, {}];        // per pad: button index -> was pressed (menu edges)
let _gpFocusEl = null, _gpNavNext = 0, _gpNavDir = '';

function _gpSend(type, key) {
  try { document.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true })); } catch (e) {}
}
function _gpReleaseAll(i) {
  const h = _gpHeld[i];
  for (const a in h) { _gpSend('keyup', h[a]); delete h[a]; }
  _gpAct[i] = {};
}
function _gpReleaseEverything() { _gpReleaseAll(0); _gpReleaseAll(1); }

// Controls table for pad i, or null when that pad has no local human to drive.
function _gpControlsFor(i) {
  const locals = (typeof players !== 'undefined' ? players : []).filter(p =>
    p && !p.isAI && !p.isRemote && !p.isBoss && p.controls && p.controls.left);
  const p = locals[i];
  if (p) return p.controls;
  if (i === 0 && !locals.length) return _GP_P1_KEYS;
  return null;
}

function _gpLatch(i, name, val) {   // val in [-1..1] magnitude toward the action; hysteresis
  const on = _gpAct[i][name];
  const r = on ? val > _GP_OFF : val > _GP_ON;
  _gpAct[i][name] = r;
  return r;
}

function _gpFocusables() {
  const out = [];
  document.querySelectorAll('button, [onclick], a[href], [role="button"], select, input[type="checkbox"]').forEach(el => {
    if (el.disabled || el.closest('#mobileControls')) return;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none') return;
    const top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
    if (!top || !(el === top || el.contains(top) || top.contains(el))) return;   // covered by an overlay
    out.push({ el, cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
  });
  return out;
}
function _gpSetFocus(el) {
  if (_gpFocusEl && _gpFocusEl.style) { _gpFocusEl.style.outline = _gpFocusEl._gpOutline || ''; _gpFocusEl.style.outlineOffset = _gpFocusEl._gpOffset || ''; }
  _gpFocusEl = el;
  if (el) {
    el._gpOutline = el.style.outline; el._gpOffset = el.style.outlineOffset;
    el.style.outline = '3px solid #00e5ff'; el.style.outlineOffset = '2px';
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
  }
}
function _gpNavigate(dx, dy) {
  const list = _gpFocusables();
  if (!list.length) return;
  const cur = list.find(c => c.el === _gpFocusEl);
  if (!cur) { list.sort((a, b) => (a.cy - b.cy) || (a.cx - b.cx)); _gpSetFocus(list[0].el); return; }
  let best = null, bestS = Infinity;
  for (const c of list) {
    if (c === cur) continue;
    const mx = (c.cx - cur.cx) * dx + (c.cy - cur.cy) * dy;       // along the pressed direction
    if (mx <= 4) continue;
    const ox = Math.abs((c.cx - cur.cx) * dy) + Math.abs((c.cy - cur.cy) * dx);
    const s = mx + ox * 2;
    if (s < bestS) { bestS = s; best = c; }
  }
  if (best) _gpSetFocus(best.el);
}

function _gpMenuFrame(pad, i, now) {
  const b = n => !!(pad.buttons[n] && pad.buttons[n].pressed);
  const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
  let dir = '';
  if (b(14) || ax < -0.6) dir = 'l'; else if (b(15) || ax > 0.6) dir = 'r';
  else if (b(12) || ay < -0.6) dir = 'u'; else if (b(13) || ay > 0.6) dir = 'd';
  if (dir && i === 0) {
    if (dir !== _gpNavDir) { _gpNavDir = dir; _gpNavNext = now + 380; _gpNavigate(dir === 'r' ? 1 : dir === 'l' ? -1 : 0, dir === 'd' ? 1 : dir === 'u' ? -1 : 0); }
    else if (now >= _gpNavNext) { _gpNavNext = now + 140; _gpNavigate(dir === 'r' ? 1 : dir === 'l' ? -1 : 0, dir === 'd' ? 1 : dir === 'u' ? -1 : 0); }
  } else if (!dir && i === 0) _gpNavDir = '';
  const edge = n => { const p = b(n), was = _gpPrev[i][n]; _gpPrev[i][n] = p; return p && !was; };
  if (edge(0)) {
    if (window._storySceneHold) { _gpSend('keydown', 'Enter'); _gpSend('keyup', 'Enter'); }
    else if (_gpFocusEl && document.contains(_gpFocusEl)) { try { _gpFocusEl.click(); } catch (e) {} }
  }
}

function _gpPoll(now) {
  requestAnimationFrame(_gpPoll);
  let pads = [];
  try { pads = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(g => g && g.connected && g.buttons && g.buttons.length >= 10); } catch (e) {}
  const ae = document.activeElement;
  const typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
  const live = typeof gameRunning !== 'undefined' && gameRunning && !paused && !window._storySceneHold;
  if (!pads.length || document.hidden || !document.hasFocus()) { _gpReleaseEverything(); if (_gpFocusEl) _gpSetFocus(null); return; }
  for (let i = 0; i < 2; i++) {
    const pad = pads[i];
    if (!pad) { _gpReleaseAll(i); continue; }
    const b = n => !!(pad.buttons[n] && pad.buttons[n].pressed);
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    const active = pad.buttons.some(x => x.pressed) || Math.abs(ax) > _GP_ON || Math.abs(ay) > _GP_ON;
    if (active) lastInputDevice = 'gamepad';
    // Start = Esc (pause / back), both in and out of a match
    const st = b(9), stWas = _gpPrev[i][9]; _gpPrev[i][9] = st;
    if (i === 0 && st && !stWas && !typing) { _gpSend('keydown', 'Escape'); _gpSend('keyup', 'Escape'); }
    if (typing) { _gpReleaseAll(i); continue; }
    const ctl = live ? _gpControlsFor(i) : null;
    if (!ctl) {
      _gpReleaseAll(i);
      if (!live) _gpMenuFrame(pad, i, now);
      continue;
    }
    if (_gpFocusEl) _gpSetFocus(null);
    const want = {
      left:   _gpLatch(i, 'left',  b(14) ? 1 : -ax),
      right:  _gpLatch(i, 'right', b(15) ? 1 : ax),
      jump:   b(0) || b(12) || _gpLatch(i, 'jump', -ay),
      shield: b(4) || b(5) || b(6) || b(7) || b(13) || _gpLatch(i, 'shield', ay),
      attack: b(2), ability: b(3), super: b(1),
    };
    if (want.left && want.right) want.left = want.right = false;
    for (const a in want) {
      const held = _gpHeld[i][a];
      if (want[a] && !held && ctl[a]) { _gpHeld[i][a] = ctl[a]; _gpSend('keydown', ctl[a]); }
      else if (!want[a] && held) { _gpSend('keyup', held); delete _gpHeld[i][a]; }
    }
  }
}
window.addEventListener('gamepaddisconnected', _gpReleaseEverything);
window.addEventListener('blur', _gpReleaseEverything);
requestAnimationFrame(_gpPoll);
