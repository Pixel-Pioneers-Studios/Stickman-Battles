// Shared drawing vocabulary for the weapon sprite set.
// Every weapon is authored horizontally in a 512 x 220 box with the shaft axis
// on y = AXIS and the blade/head at the right edge — the same local frame
// drawWeapon() uses, so no rotation step is needed at export time.

const AXIS = 110;

const P = {
  line:    '#141428',   // outline, matches the source art's near-black
  wood:    '#8a5a2b',
  woodHi:  '#b07a41',
  woodLo:  '#5e3c1c',
  steel:   '#dfe9f2',
  steelHi: '#ffffff',
  steelLo: '#93a7ba',
  blue:    '#2a2ab8',
  blueHi:  '#4a4ae0',
  cyan:    '#6fe3e3',
  cyanLo:  '#2fa8b8',
  gold:    '#e0b04a',
  dark:    '#2a2a3e',
};

const S = (w) => `stroke="${P.line}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// Wooden or metal pole running from x0 to x1 along the axis.
function shaft(x0, x1, th = 13, fill = P.wood, hi = P.woodHi, lo = P.woodLo) {
  const y = AXIS - th / 2;
  return `
    <rect x="${x0}" y="${y}" width="${x1 - x0}" height="${th}" rx="${th / 2}" fill="${fill}" ${S(4)}/>
    <rect x="${x0 + 6}" y="${y + 2.5}" width="${x1 - x0 - 12}" height="${th * 0.22}" rx="2" fill="${hi}" opacity="0.9"/>
    <rect x="${x0 + 6}" y="${y + th - 4}" width="${x1 - x0 - 12}" height="${th * 0.18}" rx="2" fill="${lo}" opacity="0.7"/>`;
}

// Banded grip wrap centred on the axis.
function grip(x0, x1, th = 19) {
  const y = AXIS - th / 2;
  let bands = '';
  for (let x = x0 + 7; x < x1 - 5; x += 11) {
    bands += `<rect x="${x}" y="${y + 3}" width="5" height="${th - 6}" rx="2" fill="${P.blueHi}" opacity="0.85"/>`;
  }
  return `
    <rect x="${x0}" y="${y}" width="${x1 - x0}" height="${th}" rx="5" fill="${P.blue}" ${S(4)}/>
    ${bands}
    <rect x="${x0 + 4}" y="${y + 2.5}" width="${x1 - x0 - 8}" height="3" rx="1.5" fill="${P.cyan}" opacity="0.55"/>`;
}

// Butt cap / pommel at the left end.
function pommel(x, r = 15) {
  return `
    <path d="M ${x + r} ${AXIS - r} L ${x - 2} ${AXIS - r * 0.55} L ${x - 2} ${AXIS + r * 0.55} L ${x + r} ${AXIS + r} Z"
          fill="${P.blue}" ${S(4)}/>
    <circle cx="${x + 4}" cy="${AXIS}" r="${r * 0.3}" fill="${P.cyan}" ${S(3)}/>`;
}

// Collar where a head meets the shaft.
function collar(x, w = 20, th = 26) {
  return `<rect x="${x}" y="${AXIS - th / 2}" width="${w}" height="${th}" rx="4" fill="${P.blue}" ${S(4)}/>
          <rect x="${x + 4}" y="${AXIS - th / 2 + 4}" width="${w - 8}" height="${th - 8}" rx="2" fill="${P.cyan}" opacity="0.6"/>`;
}

// Bevel highlight polyline for a blade — a lighter inset echo of its outline.
function bevel(d, opacity = 0.75) {
  return `<path d="${d}" fill="none" stroke="${P.steelHi}" stroke-width="4" stroke-linecap="round" opacity="${opacity}"/>`;
}

module.exports = { AXIS, P, S, shaft, grip, pommel, collar, bevel };
