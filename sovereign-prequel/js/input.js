'use strict';

// ─── Raw key state ────────────────────────────────────────────────────────────
// Keys are tracked the way Stickman Evolution names them (smb-input.js): letters by
// physical key, lowercased; everything else by e.key. That lets the prequels read
// the player's keybinds straight from the main game's save.
const keys = {};
let _frameKeys = [];   // keys pressed this frame (cleared each tick)

function _keyName(e) {
  const c = e.code;
  if (c && c.length === 4 && c.slice(0, 3) === 'Key') return c.charAt(3).toLowerCase();
  return (e.key && e.key.length === 1) ? e.key.toLowerCase() : e.key;
}

window.addEventListener('keydown', e => {
  const k = _keyName(e);
  if (!keys[k]) _frameKeys.push(k);
  keys[k] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[_keyName(e)] = false; });
// A key released while the frame lost focus would otherwise stay held.
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// Player 1's binds from the main game (Settings > Controls), else its defaults.
const MAIN_KEYS = (() => {
  const b = { left: 'a', right: 'd', jump: 'w', attack: ' ', shield: 's', ability: 'q', super: 'e' };
  try {
    const s = JSON.parse(localStorage.getItem('smc_keybinds') || 'null');
    const p1 = s && s.p1;
    if (p1) for (const a in b) if (typeof p1[a] === 'string' && p1[a]) b[a] = p1[a];
  } catch (e) {}
  return b;
})();

// On-screen name of the first key bound to an action.
function keyLabel(action) {
  const k = (BINDINGS[action] ?? [])[0];
  if (k === ' ') return 'SPACE';
  const arrows = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };
  return arrows[k] ?? String(k).toUpperCase();
}

// Same keys as the main game: attack strikes, ability invokes a law.
const BINDINGS = {
  left:    [MAIN_KEYS.left,  'ArrowLeft'],
  right:   [MAIN_KEYS.right, 'ArrowRight'],
  jump:    [MAIN_KEYS.jump,  'ArrowUp'],
  light:   [MAIN_KEYS.attack],
  law:     [MAIN_KEYS.ability],
  confirm: [MAIN_KEYS.attack, 'Enter'],
  back:    ['Escape', 'Backspace'],
  pause:   ['Escape', 'p'],
};

// A typo'd action name must not be able to take down the frame — an exception
// thrown inside gameLoop leaves the canvas frozen on the last good frame, which
// looks like "the game went back to the menu" and is miserable to track down.
function held(action) { return (BINDINGS[action] ?? []).some(c => keys[c]); }
function just(action) { return (BINDINGS[action] ?? []).some(c => _frameKeys.includes(c)); }
function clearFrameInput() { _frameKeys = []; }
