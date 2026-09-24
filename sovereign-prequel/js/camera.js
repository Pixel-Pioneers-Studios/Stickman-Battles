'use strict';

const CAM_LEAD = 150;
const CAM_LERP = 0.07;

let _camTarget = 0;

function updateCamera() {
  if (!sov) return;
  const ideal = sov.cx() + sov.facing * CAM_LEAD - GAME_W / 2;
  _camTarget  = lerp(_camTarget, ideal, CAM_LERP);
  camX        = clamp(_camTarget, 0, Math.max(0, levelWidth - GAME_W));
}

function resetCamera() {
  if (!sov) { camX = 0; _camTarget = 0; return; }
  _camTarget = sov.x - GAME_W / 2;
  camX       = clamp(_camTarget, 0, Math.max(0, levelWidth - GAME_W));
}
