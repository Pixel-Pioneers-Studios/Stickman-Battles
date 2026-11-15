'use strict';

const CAM_LEAD   = 110;   // how far ahead of Axiom the camera looks
const CAM_LERP   = 0.07;  // smoothing factor

// The world layer (ground, figures, effects) is drawn zoomed in about the floor
// line, so the figures read at a size near the main game's and the empty sky is
// cropped. Backgrounds stay unzoomed: they are parallax layers already.
// The zoom pulls back to keep the companions in frame: in a Vanguard chapter the
// people you are protecting must stay visible.
const CAM_ZOOM_MAX = 1.6;
const CAM_ZOOM_MIN = 1.15;
const CAM_GROUP_PAD = 150;    // world px kept either side of the group
const CAM_GROUP_REACH = 700;  // companions further than this are left to the HUD

let camZoom = CAM_ZOOM_MAX;
let VIEW_W  = GAME_W / camZoom;   // world px across the screen

let _camTarget = 0;

// World x-span the camera should hold: Axiom plus nearby living companions.
function _groupSpan() {
  const ax = axiomPlayer.x + axiomPlayer.w / 2;
  let lo = ax, hi = ax;
  for (const c of companions) {
    if (c.state === 'dead' || c.health <= 0) continue;
    const cx = c.x + c.w / 2;
    if (Math.abs(cx - ax) > CAM_GROUP_REACH) continue;
    lo = Math.min(lo, cx); hi = Math.max(hi, cx);
  }
  return [lo, hi];
}

function updateCamera() {
  if (!axiomPlayer) return;
  const [lo, hi] = _groupSpan();
  const wantZoom = clamp(GAME_W / (hi - lo + CAM_GROUP_PAD * 2), CAM_ZOOM_MIN, CAM_ZOOM_MAX);
  camZoom = lerp(camZoom, wantZoom, 0.04);
  VIEW_W  = GAME_W / camZoom;

  const center  = axiomPlayer.x + axiomPlayer.w / 2;
  let ideal     = center + axiomPlayer.facing * CAM_LEAD - VIEW_W / 2;
  // Keep the group inside the frame before honouring the look-ahead — but only
  // when it fits. When it doesn't, the bounds cross and clamp() kept the far
  // companion, walking Axiom off the screen edge (the collectors in The Network
  // are fixed in place); the HUD bars cover anyone left out.
  const keepLo = hi + CAM_GROUP_PAD - VIEW_W, keepHi = lo - CAM_GROUP_PAD;
  if (keepLo <= keepHi) ideal = clamp(ideal, keepLo, keepHi);
  // Axiom himself always stays in frame.
  ideal = clamp(ideal, center + 120 - VIEW_W, center - 120);
  _camTarget    = lerp(_camTarget, ideal, CAM_LERP);
  camX          = clamp(_camTarget, 0, Math.max(0, levelWidth - VIEW_W));
}

function resetCamera() {
  if (!axiomPlayer) { camX = 0; _camTarget = 0; return; }
  camZoom    = CAM_ZOOM_MAX;
  VIEW_W     = GAME_W / camZoom;
  _camTarget = axiomPlayer.x + axiomPlayer.w / 2 - VIEW_W / 2;
  camX       = clamp(_camTarget, 0, Math.max(0, levelWidth - VIEW_W));
}

// The floor is the widest platform in the chapter.
function _zoomLineY() {
  let best = null;
  for (const p of platforms) if (!best || p.w > best.w) best = p;
  return best ? best.y : GAME_H - 80;
}

function beginWorldZoom() {
  const ly = _zoomLineY();
  ctx.save();
  ctx.translate(0, ly);
  ctx.scale(camZoom, camZoom);
  ctx.translate(0, -ly);
}
function endWorldZoom() { ctx.restore(); }

// World point to screen point, for overlays drawn outside the zoomed layer.
function toScreenX(x) { return (x - camX) * camZoom; }
function toScreenY(y) { const ly = _zoomLineY(); return ly + (y - ly) * camZoom; }
