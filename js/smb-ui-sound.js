'use strict';
// smb-ui-sound.js: press and hover sounds for every menu control (visual overhaul Phase 5).
// One delegated listener on the document, so new screens get sounds without wiring each button.
// The home list (smb-home-v2.js) and the story map play their own, so they are skipped here.
// Costs nothing while idle: two passive listeners, no per-frame work. Depends on SoundManager (smb-audio.js).

(function () {
  if (typeof document === 'undefined') return;
  var SEL = 'button, .b, .btn, .path-card, .sel-card, .mode-card, [role="button"], select';
  // #mobileControls: in-fight touch buttons are inputs, not menu presses.
  var SKIP = '.h2-item, #gameCanvas, #mobileControls, .story-map, [data-nosound]';
  var lastHover = null, lastHoverAt = 0;

  // forHover: the home list plays its own press sound but not a hover one, so it still ticks on hover.
  function control(t, forHover) {
    if (!t || !t.closest) return null;
    var el = t.closest(forHover ? SEL + ', .h2-item' : SEL);
    if (!el || el.closest(forHover ? SKIP.replace('.h2-item, ', '') : SKIP)) return null;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return null;
    return el;
  }

  document.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    if (!control(e.target)) return;
    try { if (typeof SoundManager !== 'undefined' && SoundManager.uiClick) SoundManager.uiClick(); } catch (err) {}
  }, { capture: true, passive: true });

  document.addEventListener('pointerover', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    var el = control(e.target, true);
    if (!el || el === lastHover) return;
    lastHover = el;
    var now = performance.now();
    if (now - lastHoverAt < 70) return;   // sweeping across a grid ticks, it doesn't buzz
    lastHoverAt = now;
    try { if (typeof SoundManager !== 'undefined' && SoundManager.uiHover) SoundManager.uiHover(); } catch (err) {}
  }, { capture: true, passive: true });
})();
