'use strict';

const CAM_LEAD   = 180;   // how far ahead of Axiom the camera looks
const CAM_LERP   = 0.07;  // smoothing factor

let _camTarget = 0;

function updateCamera() {
  if (!axiomPlayer) return;
  const center  = axiomPlayer.x + axiomPlayer.w / 2;
  const ideal   = center + axiomPlayer.facing * CAM_LEAD - GAME_W / 2;
  _camTarget    = lerp(_camTarget, ideal, CAM_LERP);
  camX          = clamp(_camTarget, 0, Math.max(0, levelWidth - GAME_W));
}

function resetCamera() {
  if (!axiomPlayer) { camX = 0; _camTarget = 0; return; }
  _camTarget = axiomPlayer.x - GAME_W / 2;
  camX       = clamp(_camTarget, 0, Math.max(0, levelWidth - GAME_W));
}
