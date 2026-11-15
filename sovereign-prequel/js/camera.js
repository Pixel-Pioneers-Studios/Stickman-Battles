'use strict';

const CAM_LEAD = 100;
const CAM_LERP = 0.07;

// The world layer (ground, props, figures) is drawn zoomed in about the floor
// line, so the figures read at a size near the main game's and the empty sky is
// cropped. Backgrounds stay unzoomed: they are parallax layers already.
const CAM_ZOOM = 1.25;
const VIEW_W   = GAME_W / CAM_ZOOM;   // world px across the screen

let _camTarget = 0;

function updateCamera() {
  if (!sov) return;
  const ideal = sov.cx() + sov.facing * CAM_LEAD - VIEW_W / 2;
  _camTarget  = lerp(_camTarget, ideal, CAM_LERP);
  camX        = clampCamX(_camTarget);
}

function resetCamera() {
  if (!sov) { camX = 0; _camTarget = 0; return; }
  _camTarget = sov.cx() - VIEW_W / 2;
  camX       = clampCamX(_camTarget);
}

function clampCamX(x) { return clamp(x, 0, Math.max(0, levelWidth - VIEW_W)); }

function beginWorldZoom() {
  const ly = _floorY();
  ctx.save();
  ctx.translate(0, ly);
  ctx.scale(CAM_ZOOM, CAM_ZOOM);
  ctx.translate(0, -ly);
}
function endWorldZoom() { ctx.restore(); }

// World point to screen point, for overlays drawn outside the zoomed layer.
function toScreenX(x) { return (x - camX) * CAM_ZOOM; }
function toScreenY(y) { const ly = _floorY(); return ly + (y - ly) * CAM_ZOOM; }
