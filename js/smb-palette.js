'use strict';
/*
 * smb-palette.js — the game-wide colour grade.
 *
 * One place that decides what "grounded" means numerically, so the figure, the
 * terrain and (later) the HUD cannot drift apart into three different looks.
 * Everything here is a pure function of an authored colour; nothing is stored
 * and nothing is mutated, so a system can be graded by wrapping its existing
 * colour lookup and reverted by removing the wrap.
 *
 * Why grade instead of re-authoring the source colours: there are ~40 arenas
 * with a platColor/platEdge pair plus runtime-built Battle Royale and custom
 * maps that have no authored palette at all. Editing 80 hex literals by hand
 * would miss the runtime maps entirely, destroy the relative value structure
 * each arena was tuned with, and give no single knob to tune afterwards.
 *
 * Load order: immediately after smb-globals.js. Depends on nothing.
 */

const SMBPal = (function () {

  const _NEUTRAL = [140, 140, 150];

  function hex2rgb(h) {
    if (typeof h !== 'string') return _NEUTRAL.slice();
    let s = h.trim();
    // rgb()/rgba() appears in places that predate the hex convention.
    if (s[0] === 'r') {
      const m = s.match(/(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)/);
      return m ? [+m[1] | 0, +m[2] | 0, +m[3] | 0] : _NEUTRAL.slice();
    }
    if (s[0] === '#') s = s.slice(1);
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    if (s.length < 6) return _NEUTRAL.slice();
    const n = parseInt(s.slice(0, 6), 16);
    if (Number.isNaN(n)) return _NEUTRAL.slice();
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r)      h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else               h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }

  function hsl2css(h, s, l, a) {
    const _f = (n) => {
      const k = (n + h * 12) % 12;
      const c = s * Math.min(l, 1 - l);
      return Math.round(255 * (l - c * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))));
    };
    const r = _f(0), g = _f(8), b = _f(4);
    return (a === undefined || a >= 1) ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
  }

  function hsl(hex) { const c = hex2rgb(hex); return rgb2hsl(c[0], c[1], c[2]); }

  // ── The grade ─────────────────────────────────────────────────────────────

  const _cache = new Map();

  /**
   * Pull an authored colour into the grounded material range.
   *
   * Two rules, and only two:
   *   - Saturation is compressed. Poster-paint chroma is the loudest "free
   *     flash game" signal there is, and it is what makes a realistic weapon or
   *     a shaded figure look pasted onto the scene.
   *   - Lightness is compressed only at the TOP. Bright colours get pulled down
   *     (lime green -> field green); dark colours are left alone, because the
   *     dark arenas are already grounded and crushing them further just makes
   *     them muddy and unreadable.
   *
   * Hue is never touched: it is the authored identity of the arena and of the
   * player, and shifting it would silently redesign 40 levels.
   *
   * @param hex   authored colour
   * @param amt   0 = untouched, 1 = full grade (default 1)
   */
  function grade(hex, amt) {
    const k = (amt === undefined) ? 1 : amt;
    const key = hex + '|' + k;
    const hit = _cache.get(key);
    if (hit) return hit;

    const [h, s0, l0] = hsl(hex);
    const sG = s0 * 0.66;
    // Only the top of the range is compressed — see above.
    const lG = l0 > 0.50 ? 0.50 + (l0 - 0.50) * 0.62 : l0;
    const out = hsl2css(h, s0 + (sG - s0) * k, l0 + (lG - l0) * k);
    _cache.set(key, out);
    return out;
  }

  /**
   * Is this edge colour meant to GLOW rather than to outline?
   *
   * Several arenas deliberately rim their platforms with neon — cyberpunk's
   * cyan, the matrix green, the void's white, the Circuit's red. Those are
   * authored light sources, not keylines, and grading them into a low-contrast
   * dark line would erase the whole look of those levels. An edge that is
   * clearly lighter or much more saturated than the body is one of those.
   */
  function isEmissiveEdge(edgeHex, baseHex) {
    if (typeof edgeHex !== 'string' || typeof baseHex !== 'string') return false;
    const [, es, el] = hsl(edgeHex);
    const [, bs, bl] = hsl(baseHex);
    return (el > bl + 0.12) || (es > bs + 0.30 && el >= bl);
  }

  /**
   * Hex form of grade().
   *
   * Most of the game's older colour helpers (_platRGB/_platShade, _dpMix) parse
   * HEX ONLY and fall back to a neutral grey on anything else — so handing them
   * an 'rgb(...)' string silently repaints whole arenas grey rather than
   * throwing. Any graded colour that flows into one of those must come from
   * here, not from grade().
   */
  function gradeHex(hex, amt) {
    const key = 'H' + hex + '|' + (amt === undefined ? 1 : amt);
    const hit = _cache.get(key);
    if (hit) return hit;
    const m = grade(hex, amt).match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    const out = m
      ? '#' + [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join('')
      : hex;
    _cache.set(key, out);
    return out;
  }

  return { hex2rgb, rgb2hsl, hsl2css, hsl, grade, gradeHex, isEmissiveEdge };
})();
