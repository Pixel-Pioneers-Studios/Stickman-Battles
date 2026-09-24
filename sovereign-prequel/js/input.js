'use strict';

const keys = {};
let _frameKeys = [];

window.addEventListener('keydown', e => {
  if (!keys[e.code]) _frameKeys.push(e.code);
  keys[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

const BINDINGS = {
  left:    ['ArrowLeft',  'KeyA'],
  right:   ['ArrowRight', 'KeyD'],
  jump:    ['ArrowUp',    'KeyW', 'Space'],
  light:   ['KeyJ', 'KeyZ'],
  law:     ['KeyK'],
  confirm: ['Enter', 'Space', 'KeyJ'],
  back:    ['Escape', 'Backspace'],
  pause:   ['Escape', 'KeyP'],
};

// A typo'd action name must not be able to take down the frame — an exception
// thrown inside gameLoop leaves the canvas frozen on the last good frame, which
// looks like "the game went back to the menu" and is miserable to track down.
function held(action) { return (BINDINGS[action] ?? []).some(c => keys[c]); }
function just(action) { return (BINDINGS[action] ?? []).some(c => _frameKeys.includes(c)); }
function clearFrameInput() { _frameKeys = []; }
