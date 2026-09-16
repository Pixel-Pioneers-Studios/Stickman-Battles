// Grounded drawing vocabulary — the "real weapon" style.
//
// Differs from parts.js on four points, all of them deliberate:
//   1. No uniform black outline. Shapes are separated by VALUE, with at most a
//      thin dark-tinted contact line. At 128px an outline eats the pixels a
//      gradient needs.
//   2. Every metal surface is a ramp, not a fill: core shadow -> midtone ->
//      specular band, lit consistently from the upper left.
//   3. Desaturated materials (gunmetal, oiled leather, dark bronze) with ONE
//      restrained accent used as a small inlay, never as a whole grip.
//   4. Edges carry wear: nicks, uneven tapers, a worn spot on the pommel.

const AXIS = 110;

const G = {
  ink:      '#15171d',   // contact line — desaturated, never pure black
  steelD:   '#353d47',
  steelM:   '#78848f',
  steelL:   '#bcc7d1',
  steelS:   '#eef3f7',   // specular, warm-neutral rather than pure white
  leather:  '#33261f',
  leatherL: '#563f31',
  leatherS: '#7a5b45',
  bronzeD:  '#3e3018',
  bronze:   '#7d6234',
  bronzeL:  '#bc9a60',
  wood:     '#4a3524',
  woodL:    '#6d4f36',
  accent:   '#6fc4c0',   // used sparingly — an inlay, not a colour scheme
  accentL:  '#a8e5e2',
};

let _uid = 0;
const uid = (p) => `${p}${++_uid}`;

// Vertical value ramp across a band — the workhorse for anything metal.
// `stops` is [[offset, colour], ...] top to bottom.
function ramp(y0, y1, stops) {
  const id = uid('g');
  const s = stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('');
  return {
    id,
    def: `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}">${s}</linearGradient>`,
  };
}

// Standard double-bevelled blade ramp: lit upper bevel, dark lower bevel,
// with the fuller reading as a darker band just under the ridge.
function bladeRamp(halfH) {
  return ramp(AXIS - halfH, AXIS + halfH, [
    [0.00, G.steelL],   // top edge catches light
    [0.14, G.steelS],   // upper bevel — the specular band
    [0.40, G.steelM],
    [0.52, G.steelD],   // fuller / core shadow just below the ridge
    [0.78, '#5d6872'],
    [1.00, '#8f9aa4'],  // bounce light on the lower edge keeps it from going dead
  ]);
}

// Oiled leather grip. Wrap lines are jittered so it doesn't read as a vector band.
function gripL(x0, x1, th = 20, seed = 1) {
  const y = AXIS - th / 2;
  const g = ramp(y, y + th, [
    [0.00, G.leatherS], [0.22, G.leatherL], [0.62, G.leather], [1.00, '#241a15'],
  ]);
  let wraps = '';
  let r = seed * 9301;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let x = x0 + 6; x < x1 - 4; x += 9 + rnd() * 3) {
    const j = (rnd() - 0.5) * 2.2;
    wraps += `<path d="M ${x + j} ${y + 1} L ${x - 1.5 + j} ${y + th - 1}"
                stroke="#1d1510" stroke-width="2.6" opacity="0.75"/>
              <path d="M ${x + 2.4 + j} ${y + 1.5} L ${x + 0.9 + j} ${y + th - 1.5}"
                stroke="${G.leatherS}" stroke-width="1.5" opacity="0.4"/>`;
  }
  return {
    defs: g.def,
    svg: `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${th}" rx="${th * 0.28}" fill="url(#${g.id})"/>
          ${wraps}
          <rect x="${x0}" y="${y}" width="${x1 - x0}" height="${th}" rx="${th * 0.28}"
                fill="none" stroke="${G.ink}" stroke-width="1.6" opacity="0.55"/>`,
  };
}

// Dark bronze fitting — collar, ferrule, guard block.
function fitting(x, w, th, rx = 3) {
  const y = AXIS - th / 2;
  const g = ramp(y, y + th, [
    [0.00, G.bronzeL], [0.30, G.bronze], [0.70, G.bronzeD], [1.00, '#2a2010'],
  ]);
  return {
    id: g.id,
    defs: g.def,
    svg: `<rect x="${x}" y="${y}" width="${w}" height="${th}" rx="${rx}" fill="url(#${g.id})"/>
          <rect x="${x + 1.5}" y="${y + 1.5}" width="${w - 3}" height="2" rx="1"
                fill="${G.bronzeL}" opacity="0.55"/>`,
  };
}

// Wooden haft with a long grain highlight.
function haft(x0, x1, th = 13) {
  const y = AXIS - th / 2;
  const g = ramp(y, y + th, [
    [0.00, G.woodL], [0.26, '#5c4229'], [0.70, G.wood], [1.00, '#2e2015'],
  ]);
  return {
    defs: g.def,
    svg: `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${th}" rx="${th * 0.34}" fill="url(#${g.id})"/>
          <rect x="${x0 + 8}" y="${y + th * 0.18}" width="${x1 - x0 - 16}" height="1.8" rx="0.9"
                fill="${G.woodL}" opacity="0.5"/>`,
  };
}

// Chips taken out of a cutting edge. `edgeY` is the edge line, `dir` +1 if the
// edge faces down. Kept sparse — at 128px more than a few turns to mush.
function nicks(x0, x1, edgeY, dir = 1, count = 3, seed = 7) {
  let r = seed * 4177, out = '';
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < count; i++) {
    const x = x0 + (x1 - x0) * (0.15 + rnd() * 0.75);
    const w = 5 + rnd() * 6, d = (3 + rnd() * 3) * -dir;
    out += `<path d="M ${x} ${edgeY} Q ${x + w / 2} ${edgeY + d} ${x + w} ${edgeY} Z"
              fill="${G.steelD}" opacity="0.85"/>`;
  }
  return out;
}

// A CLOSED fist seen from the side. The silhouette is the whole trick: the
// leading edge is scalloped into four knuckle bumps and the fingers are curled
// UNDER, read as short creases on the near face. Fingers drawn as forward
// segments make a mitten, not a fist — that was the first version's mistake.
// `x0` is the wrist end; `len`/`h` the fist mass.
function fist(x0, len, h, fill, line, hi) {
  const x1 = x0 + len;
  const top = AXIS - h * 0.5, bot = AXIS + h * 0.5;
  const k = h * 0.25;                       // one knuckle's height
  // Scalloped leading edge: four bumps from top to bottom, tallest in the middle.
  let edge = '';
  for (let i = 0; i < 4; i++) {
    const y0 = top + i * k, y1 = top + (i + 1) * k;
    const out = 1 - Math.abs(i - 1.5) / 3.2;          // middle knuckles lead
    // Amplitude has to be large: a subtle scallop disappears entirely once the
    // sprite is downscaled to 128px, which is what made this read as a cylinder.
    edge += ` Q ${x1 + len * 0.17 * out} ${(y0 + y1) / 2} ${x1 - len * 0.07} ${y1}`;
  }
  // Curled fingers: creases on the near face, each shorter than the one above.
  let creases = '';
  for (let i = 0; i < 3; i++) {
    const y = top + k * (1.05 + i);
    const w = len * (0.30 - i * 0.045);
    creases += `<path d="M ${x1 - len * 0.06 - w} ${y} L ${x1 - len * 0.10} ${y}"
                  fill="none" stroke="${line}" stroke-width="2.6" opacity="0.75"/>`;
  }
  // Dark wedges in the valleys between knuckles, so the bumps read as separate
  // digits rather than one wavy outline.
  let valleys = '';
  for (let i = 1; i < 4; i++) {
    const y = top + i * k;
    valleys += `<path d="M ${x1 - len * 0.07} ${y} l ${-len * 0.11} ${-k * 0.16} l 0 ${k * 0.32} Z"
                  fill="${line}" opacity="0.55"/>`;
  }
  return `
    <path d="M ${x0} ${top + h * 0.06}
             Q ${x0 + len * 0.30} ${top - h * 0.05} ${x1 - len * 0.10} ${top}
             ${edge}
             Q ${x0 + len * 0.30} ${bot + h * 0.05} ${x0} ${bot - h * 0.06} Z"
          fill="${fill}" stroke="${line}" stroke-width="2.6" stroke-linejoin="round"/>
    ${valleys}
    ${creases}
    <!-- thumb folded across the curled fingers, low and short -->
    <path d="M ${x0 + len * 0.34} ${AXIS + h * 0.34}
             Q ${x0 + len * 0.66} ${AXIS + h * 0.50} ${x1 - len * 0.22} ${AXIS + h * 0.30}"
          fill="none" stroke="${line}" stroke-width="9" stroke-linecap="round"/>
    <path d="M ${x0 + len * 0.34} ${AXIS + h * 0.32}
             Q ${x0 + len * 0.66} ${AXIS + h * 0.47} ${x1 - len * 0.22} ${AXIS + h * 0.28}"
          fill="none" stroke="${hi}" stroke-width="4.5" stroke-linecap="round" opacity="0.5"/>
    <!-- light catches the knuckle ridge, which is what says "fist" fastest -->
    <path d="M ${x1 - len * 0.05} ${top + k * 0.5}
             Q ${x1 + len * 0.04} ${AXIS} ${x1 - len * 0.05} ${bot - k * 0.5}"
          fill="none" stroke="${hi}" stroke-width="3.6" opacity="0.85"/>`;
}

module.exports = { AXIS, G, ramp, bladeRamp, gripL, fitting, haft, nicks, fist, uid };
