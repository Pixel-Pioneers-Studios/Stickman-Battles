'use strict';
// Step-based cutscenes. Each step runs once and advances when its timer runs out.
// While active, input and Fighter.updateAI() are skipped and physics is frozen.
// data.steps holds { duration, onEnter, onTick, onExit } objects. data.update(cs) replaces
// the step logic entirely.

let activeCutscene = null;  // null when inactive; object while running


/** Apply the control-lock: freeze physics and suppress input/AI. */
function _cutsceneLock() {
  gameFrozen = true;
}

/** Lift the control-lock: unfreeze physics and restore input/AI. */
function _cutsceneUnlock() {
  gameFrozen = false;
}


/**
 * Start a cutscene.
 *
 * @param {object} data  Arbitrary cutscene descriptor.  Recognised keys:
 *   steps   {Array}    — Array of step objects { duration, onEnter, onTick, onExit }
 *   update  {Function} — Custom per-frame function(cs); overrides step-array logic.
 *   onEnd   {Function} — Called by endCutscene() just before control is restored.
 */
function startCutscene(data) {
  if (activeCutscene && activeCutscene.running) {
    endCutscene();
  }

  activeCutscene = {
    step:     0,
    timer:    0,
    running:  true,
    _entered: false,  // onEnter has run for this step
    data:     data || {},
  };

  _cutsceneLock();
}

/**
 * End the active cutscene and restore player/AI control.
 * Safe to call even when no cutscene is active.
 */
function endCutscene() {
  if (!activeCutscene) return;

  // Call the final-step's onExit if it hasn't been called yet
  const cs  = activeCutscene;
  const def = cs.data.steps && cs.data.steps[cs.step];
  if (def && def.onExit) {
    try { def.onExit(cs); } catch(e) { console.warn('[cutscene] onExit error', e); }
  }

  if (cs.data.onEnd) {
    try { cs.data.onEnd(cs); } catch(e) { console.warn('[cutscene] onEnd error', e); }
  }

  cs.running    = false;
  activeCutscene = null;

  _cutsceneUnlock();
}

function isCutsceneActive() {
  return activeCutscene !== null && activeCutscene.running;
}


/**
 * Advance the active cutscene by one frame.
 * Called unconditionally from gameLoop; exits immediately when inactive.
 */
function updateCutscene() {
  const cs = activeCutscene;
  if (!cs || !cs.running) return;

  if (typeof cs.data.update === 'function') {
    try { cs.data.update(cs); } catch(e) { console.warn('[cutscene] update error', e); }
    return;
  }

  const steps = cs.data.steps;
  if (!steps || steps.length === 0) {
    endCutscene();
    return;
  }

  if (cs.step >= steps.length) {
    endCutscene();
    return;
  }

  const def = steps[cs.step];

  // onEnter runs once, on arrival at the step
  if (!cs._entered) {
    cs._entered = true;
    cs.timer    = (def.duration != null) ? def.duration : 60;
    if (typeof def.onEnter === 'function') {
      try { def.onEnter(cs); } catch(e) { console.warn('[cutscene] onEnter error', e); }
    }
  }

  if (typeof def.onTick === 'function') {
    try { def.onTick(cs); } catch(e) { console.warn('[cutscene] onTick error', e); }
  }

  cs.timer--;
  if (cs.timer <= 0) {
    if (typeof def.onExit === 'function') {
      try { def.onExit(cs); } catch(e) { console.warn('[cutscene] onExit error', e); }
    }
    cs.step++;
    cs._entered = false;
  }
}


/**
 * Draw cutscene overlays in screen-space.
 * Call after ctx.setTransform(1,0,0,1,0,0) in the render loop.
 * The active step's onDraw(cs, ctx, cw, ch) is invoked if defined.
 */
function drawCutscene(ctx, cw, ch) {
  const cs = activeCutscene;
  if (!cs || !cs.running) return;

  const steps = cs.data.steps;
  const def   = steps && steps[cs.step];
  if (def && typeof def.onDraw === 'function') {
    ctx.save();
    try { def.onDraw(cs, ctx, cw, ch); } catch(e) { console.warn('[cutscene] onDraw error', e); }
    ctx.restore();
  }

  if (typeof cs.data.onDraw === 'function') {
    ctx.save();
    try { cs.data.onDraw(cs, ctx, cw, ch); } catch(e) { console.warn('[cutscene] data.onDraw error', e); }
    ctx.restore();
  }
}
