'use strict';

// ─── Raw key state ────────────────────────────────────────────────────────────
const keys = {};
let _frameKeys = [];   // keys pressed this frame (cleared each tick)

window.addEventListener('keydown', e => {
  if (!keys[e.code]) _frameKeys.push(e.code);
  keys[e.code] = true;
  // Prevent arrow keys from scrolling page
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
    e.preventDefault();
  }
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
});

// ─── Action bindings ──────────────────────────────────────────────────────────
const BINDINGS = {
  left:   ['ArrowLeft',  'KeyA'],
  right:  ['ArrowRight', 'KeyD'],
  jump:   ['ArrowUp',    'KeyW', 'Space'],
  light:  ['KeyJ', 'KeyZ'],          // jab / combo
  heavy:  ['KeyK', 'KeyX'],          // power strike
  grab:   ['KeyL', 'KeyC'],          // grab / throw
  dodge:  ['ShiftLeft', 'ShiftRight'],
  pickup: ['KeyE', 'KeyF'],          // pick up / drop weapon
  super:  ['KeyQ'],                  // void pulse (when super meter is full)
  pause:  ['Escape', 'KeyP'],
  confirm:['Enter', 'Space', 'KeyJ'],
  back:   ['Escape', 'Backspace'],
};

// Is the action currently held?
function held(action) {
  return BINDINGS[action].some(c => keys[c]);
}

// Was the action pressed this frame (edge trigger)?
function just(action) {
  return BINDINGS[action].some(c => _frameKeys.includes(c));
}

// Call once per game-loop tick — clears the just-pressed buffer
function clearFrameInput() {
  _frameKeys = [];
}
