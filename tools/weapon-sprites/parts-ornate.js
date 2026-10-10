// Ornate drawing vocabulary — the style of the original axe and scythe art
// (images/weapons/src/), which the rest of the arsenal is rebuilt to match:
//   1. Flat cel fills, no gradients. Form comes from a second, lighter or darker
//      flat shape laid over the first.
//   2. A dark ink outline around every shape.
//   3. One saturated signature colour per weapon plus a metal (gold or steel),
//      so each weapon is recognisable by colour alone at 58px.
//   4. Ornament where a plain weapon has nothing: a wrapped collar, rings, a
//      gem, a shaped pommel, spurs on the head.
//
// Same authoring frame as the other styles: 512x220, shaft along +x with the
// head at the right, shaft axis on AXIS.

const AXIS = 110;
const INK  = '#0d0e14';
const SW   = 4;          // survives the 4x downscale as a ~1px line

const C = {
  gold: '#f2c230', goldL: '#ffe680', goldD: '#b07c10',
  steel: '#aeb8c8', steelL: '#eef3fa', steelD: '#6c7688',
  iron: '#3a3f4e', ironL: '#5c6478',
  wood: '#8a4a1c', woodL: '#c07a34', woodD: '#5a2e10',
  black: '#15161c',
  red: '#e02a3a', redL: '#ff7a80', blue: '#2a50e0', blueL: '#7aa8ff', blueD: '#1a2a90',
  teal: '#22c8c8', tealL: '#a8f6f2', green: '#3cc050', greenL: '#a0f090', greenD: '#1c7a34',
  violet: '#8a4ae8', violetL: '#d0a8ff', violetD: '#3c1c80',
  orange: '#ff8a1e', orangeL: '#ffd070',
};

const path = (d, fill, sw = SW) =>
  `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
// An unoutlined shape: the light or dark facet laid over an outlined one.
const facet = (d, fill, op = 1) => `<path d="${d}" fill="${fill}" opacity="${op}"/>`;
const line = (d, col, w, op = 1) =>
  `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;
const rect = (x, y, w, h, fill, rx = 0, sw = SW) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
const circ = (cx, cy, r, fill, sw = SW) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;
const ell = (cx, cy, rx, ry, fill, sw = SW) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`;

// Pole centred on the axis, with a highlight along its upper third.
function pole(x0, x1, th, fill, hi) {
  const y = AXIS - th / 2;
  return rect(x0, y, x1 - x0, th, fill, th * 0.3) +
    (hi ? line(`M ${x0 + 6} ${y + th * 0.32} L ${x1 - 6} ${y + th * 0.32}`, hi, Math.max(1.6, th * 0.18), 0.9) : '');
}

// Ring / ferrule around the pole.
function ring(x, w, h, fill = C.gold, hi = C.goldL) {
  return rect(x, AXIS - h / 2, w, h, fill, Math.min(w, h) * 0.3) +
    line(`M ${x + w * 0.3} ${AXIS - h / 2 + 4} L ${x + w * 0.3} ${AXIS - h * 0.05}`, hi, Math.max(1.6, w * 0.16));
}

// Faceted gem: a diamond with a lit upper-left facet.
function gem(cx, cy, r, fill, hi = '#ffffff') {
  return path(`M ${cx - r} ${cy} L ${cx} ${cy - r} L ${cx + r} ${cy} L ${cx} ${cy + r} Z`, fill, 3) +
    facet(`M ${cx - r * 0.55} ${cy - r * 0.05} L ${cx} ${cy - r * 0.6} L ${cx + r * 0.1} ${cy - r * 0.1} Z`, hi, 0.85);
}

// Round stone / orb with a crescent highlight.
function orb(cx, cy, r, fill, hi = '#ffffff') {
  return circ(cx, cy, r, fill) +
    line(`M ${cx - r * 0.55} ${cy - r * 0.15} A ${r * 0.6} ${r * 0.6} 0 0 1 ${cx - r * 0.05} ${cy - r * 0.6}`, hi, Math.max(2, r * 0.2), 0.9);
}

// Spiral-wrapped grip section: a base colour with slanted bands across it.
function wrap(x0, x1, th, base, band, step = 16) {
  const y = AXIS - th / 2;
  let out = rect(x0, y, x1 - x0, th, base, th * 0.25);
  for (let x = x0 + 5; x + step * 0.55 < x1 - 3; x += step) {
    out += facet(`M ${x} ${y + 2} L ${x + step * 0.42} ${y + 2} L ${x + step * 0.42 + th * 0.35} ${y + th - 2} L ${x + th * 0.35} ${y + th - 2} Z`, band);
  }
  return out + `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${th}" rx="${th * 0.25}" fill="none" stroke="${INK}" stroke-width="${SW}"/>`;
}

// Triangle spur from a base point to a tip.
function spike(bx, by, tx, ty, w, fill) {
  const dx = tx - bx, dy = ty - by, m = Math.hypot(dx, dy) || 1;
  const nx = -dy / m * w / 2, ny = dx / m * w / 2;
  return path(`M ${bx + nx} ${by + ny} L ${tx} ${ty} L ${bx - nx} ${by - ny} Z`, fill, 3);
}

// Crescent pommel opening away from the weapon, with a gem in its cup — the
// scythe's butt end.
function crescent(x, r, fill = C.gold, gemFill = C.red) {
  return path(`M ${x + r * 0.9} ${AXIS - r} A ${r} ${r} 0 0 0 ${x + r * 0.9} ${AXIS + r}
               A ${r * 1.5} ${r * 1.5} 0 0 1 ${x + r * 0.9} ${AXIS - r} Z`, fill) +
    gem(x + r * 0.95, AXIS, r * 0.36, gemFill);
}

// Elongated crystal: pommel tip or spearhead of gemstone — the axe's butt end.
function crystal(x0, x1, h, fill, hi) {
  const m = x0 + (x1 - x0) * 0.35;
  return path(`M ${x0} ${AXIS} L ${m} ${AXIS - h / 2} L ${x1} ${AXIS} L ${m} ${AXIS + h / 2} Z`, fill) +
    facet(`M ${x0 + 5} ${AXIS - 1} L ${m} ${AXIS - h / 2 + 4} L ${m + (x1 - m) * 0.45} ${AXIS - 1} Z`, hi, 0.9);
}

module.exports = { AXIS, INK, SW, C, path, facet, line, rect, circ, ell, pole, ring, gem, orb, wrap, spike, crescent, crystal };
