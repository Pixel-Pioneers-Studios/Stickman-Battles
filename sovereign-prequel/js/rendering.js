'use strict';

// ─── Backgrounds ──────────────────────────────────────────────────────────────
// Three palettes for the three built chapters. Parallax is per-layer; nothing
// here may draw below the floor line — the ground fill covers it anyway.

// Value structure, not colour: `far` is the LIGHTEST mass (atmospheric
// perspective), `hill` sits mid, and the figures are darker than both so they
// read as silhouettes at every point on the walk. `haze` is the band of lit air
// that sits directly behind the actors' bodies — without it everything at foot
// height collapses into one value and the figures disappear.
const BG_PALETTES = {
  village_dusk:   { sky: ['#2b2a33', '#4a4038', '#7a6046'], ground: '#241f18',
                    hill: '#352d27', far: '#4e4034', haze: 'rgba(196,148,92,0.30)' },
  village_square: { sky: ['#3a3a3e', '#5f584e', '#8c806a'], ground: '#282318',
                    hill: '#3b342c', far: '#54493c', haze: 'rgba(200,180,140,0.24)' },
  fields_dawn:    { sky: ['#232935', '#54524a', '#a08a5e'], ground: '#221f15',
                    hill: '#322c23', far: '#4b4132', haze: 'rgba(214,176,112,0.30)' },
  channel_noon:   { sky: ['#7d8794', '#a8a08c', '#cdbb98'], ground: '#3a3222',
                    hill: '#5d5343', far: '#7d6f5a', haze: 'rgba(238,222,186,0.22)',
                    vignette: 0.30 },
  market_day:     { sky: ['#87919e', '#b0a692', '#d4c2a2'], ground: '#3d3424',
                    hill: '#60564a', far: '#857668', haze: 'rgba(244,228,192,0.22)',
                    vignette: 0.28 },
  town_dusk:      { sky: ['#2f3140', '#584c48', '#8a6a50'], ground: '#26211a',
                    hill: '#3c332c', far: '#574739', haze: 'rgba(216,152,96,0.28)',
                    vignette: 0.42 },
  // Night is blue-grey with a warm ground light, NOT black. A palette dark
  // enough to be "realistic" at night just deletes the figures.
  lane_night:     { sky: ['#232838', '#333949', '#4c4a50'], ground: '#241f1a',
                    hill: '#343039', far: '#4a444b', haze: 'rgba(206,166,112,0.26)',
                    vignette: 0.42 },
  // The pocket. Warm, close, hand-made — NOT cosmic. A man built this by hand
  // over years; it should read as a room somebody lives in, not a dimension.
  pocket:         { sky: ['#1a1714', '#2b2420', '#40342a'], ground: '#241c15',
                    hill: '#2e2620', far: '#3d332a', haze: 'rgba(212,150,84,0.30)',
                    vignette: 0.50, structures: 'room' },
  // Quarantine. The colour going out of the world, not the light.
  quarantine:     { sky: ['#31343a', '#43454a', '#56565a'], ground: '#2a2a2b',
                    hill: '#38383b', far: '#47474a', haze: 'rgba(170,172,176,0.20)',
                    vignette: 0.44 },
};

function drawBackground(key) {
  const pal = BG_PALETTES[key] || BG_PALETTES.village_dusk;
  const floorY = _floorY();

  const g = ctx.createLinearGradient(0, 0, 0, floorY);
  g.addColorStop(0,    pal.sky[0]);
  g.addColorStop(0.62, pal.sky[1]);
  g.addColorStop(1,    pal.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, GAME_W, floorY + 2);

  _ridge(pal.far,  0.18, floorY, 118, 260, 7);
  _ridge(pal.hill, 0.38, floorY,  74, 170, 13);
  _structures(key, pal, floorY);

  // Lit air along the horizon — the band the figures silhouette against
  const hz = ctx.createLinearGradient(0, floorY - 108, 0, floorY);
  hz.addColorStop(0, 'transparent');
  hz.addColorStop(1, pal.haze);
  ctx.fillStyle = hz;
  ctx.fillRect(0, floorY - 108, GAME_W, 108);

  // Vignette
  const v = ctx.createRadialGradient(GAME_W/2, GAME_H*0.45, GAME_H*0.30,
                                     GAME_W/2, GAME_H*0.45, GAME_H*0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,' + (pal.vignette ?? 0.46) + ')');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
}

function _floorY() {
  let y = GAME_H;
  for (const p of platforms) if (p.isFloor) y = Math.min(y, p.y);
  return y === GAME_H ? GAME_H - 80 : y;
}

function _ridge(color, par, floorY, amp, period, seed) {
  const off = camX * par;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  for (let x = 0; x <= GAME_W; x += 8) {
    const w = (x + off) / period;
    const y = floorY - amp * (0.55 + 0.45 * Math.sin(w + seed) * Math.cos(w * 0.41 + seed));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(GAME_W, floorY);
  ctx.closePath();
  ctx.fill();
}

function _structures(key, pal, floorY) {
  // The pocket is a room one man built, not a settlement. Drawing the village
  // roof silhouettes in there makes it read as another outdoor level.
  if (pal.structures === 'room') return _roomInterior(pal, floorY);

  const off = camX * 0.62;
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  // Low roofs. Deterministic from index so they don't crawl between frames.
  for (let i = 0; i < 26; i++) {
    const wx = i * 240 + (i % 3) * 63;
    const sx = wx - off;
    if (sx < -180 || sx > GAME_W + 180) continue;
    const w = 90 + (i % 4) * 26;
    const h = 52 + (i % 5) * 14;
    const y = floorY - h;
    ctx.fillRect(sx, y, w, h);
    ctx.beginPath();
    ctx.moveTo(sx - 9, y);
    ctx.lineTo(sx + w / 2, y - 24 - (i % 3) * 6);
    ctx.lineTo(sx + w + 9, y);
    ctx.closePath();
    ctx.fill();
  }
  if (key === 'fields_dawn') {
    ctx.strokeStyle = 'rgba(0,0,0,0.30)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 60; i++) {
      const sx = i * 96 - camX * 0.85;
      if (sx < -20 || sx > GAME_W + 20) continue;
      ctx.beginPath();
      ctx.moveTo(sx, floorY);
      ctx.lineTo(sx + 3, floorY - 26 - (i % 4) * 5);
      ctx.stroke();
    }
  }
}

// ─── Platforms ────────────────────────────────────────────────────────────────
function drawPlatforms() {
  for (const p of platforms) {
    const sx = p.x - camX;
    if (sx > GAME_W || sx + p.w < 0) continue;
    const pal = BG_PALETTES[CHAPTERS[currentChapter]?.background] || BG_PALETTES.village_dusk;
    ctx.fillStyle = pal.ground;
    ctx.fillRect(sx, p.y, p.w, p.h);
    // The floor catches the sky; a thin ledge in mid-air should not glow like
    // a lit strip, so it gets a fraction of the same light.
    const lit = p.isFloor ? 0.42 : 0.16;
    const g = ctx.createLinearGradient(0, p.y, 0, p.y + Math.min(p.h, 30));
    g.addColorStop(0, 'rgba(186,160,112,' + lit + ')');
    g.addColorStop(1, 'rgba(186,160,112,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx, p.y, p.w, Math.min(p.h, 26));
  }
}

// The far wall of the archive: uneven courses of stone he laid himself, a low
// lamp line, and nothing on the horizon at all, because there is no horizon.
function _roomInterior(pal, floorY) {
  const off = camX * 0.5;

  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(0, floorY - 250, GAME_W, 250);

  ctx.strokeStyle = 'rgba(0,0,0,0.26)';
  ctx.lineWidth = 2;
  for (let r = 0; r < 7; r++) {
    const y = floorY - 18 - r * 32;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(GAME_W, y);
    ctx.stroke();
    for (let c = 0; c < 12; c++) {
      const bx = c * 96 + (r % 2 ? 48 : 0) - (off % 96);
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx, y - 32);
      ctx.stroke();
    }
  }

  // Lamps. He put them where he works, not where they would look even.
  for (let i = 0; i < 9; i++) {
    const lx = i * 420 + (i % 3) * 110 - off;
    if (lx < -160 || lx > GAME_W + 160) continue;
    const ly = floorY - 150 - (i % 3) * 22;
    const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, 150);
    g.addColorStop(0, 'rgba(240,186,110,0.34)');
    g.addColorStop(1, 'rgba(240,186,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(lx - 150, ly - 150, 300, 300);
    ctx.fillStyle = 'rgba(248,206,140,0.75)';
    ctx.fillRect(lx - 2, ly - 2, 4, 4);
  }
}

// ─── Channel ──────────────────────────────────────────────────────────────────
// A read that tells the player about a water channel and a ford has to show
// them one. Declared per chapter as `channel: { from, to, ford: [x1, x2] }`;
// the ford is the gap in the water, which is where people cross.

function drawChannel(ch) {
  const c = ch?.channel;
  if (!c) return;
  const floorY = _floorY();
  const depth  = c.depth ?? 20;
  const full   = props.some(p => p.kind === 'gate' && p.open);

  const segs = [[c.from, c.ford[0]], [c.ford[1], c.to]];
  for (const [x0, x1] of segs) {
    const sx = x0 - camX, w = x1 - x0;
    if (sx > GAME_W || sx + w < 0) continue;

    ctx.fillStyle = 'rgba(18,26,28,0.85)';
    ctx.fillRect(sx, floorY, w, depth);

    const g = ctx.createLinearGradient(0, floorY, 0, floorY + depth);
    g.addColorStop(0, full ? 'rgba(150,180,188,0.45)' : 'rgba(120,140,140,0.22)');
    g.addColorStop(1, 'rgba(120,140,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx, floorY, w, depth);

    ctx.strokeStyle = full ? 'rgba(190,212,214,0.42)' : 'rgba(160,176,176,0.22)';
    ctx.lineWidth = 1;
    for (let i = 0; i < w / 46; i++) {
      const lx = sx + i * 46 + Math.sin(frameCount * 0.02 + i) * 5;
      ctx.beginPath();
      ctx.moveTo(lx, floorY + 5 + (i % 3) * 4);
      ctx.lineTo(lx + 26, floorY + 5 + (i % 3) * 4);
      ctx.stroke();
    }
  }

  // The ford — packed stones, the only place across
  const fx = c.ford[0] - camX, fw = c.ford[1] - c.ford[0];
  if (fx < GAME_W && fx + fw > 0) {
    ctx.fillStyle = 'rgba(52,46,36,0.9)';
    ctx.fillRect(fx, floorY, fw, depth * 0.55);
    ctx.fillStyle = 'rgba(96,86,68,0.5)';
    for (let i = 0; i < fw / 18; i++) {
      ctx.beginPath();
      ctx.ellipse(fx + 9 + i * 18, floorY + 5, 6, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────
// Deliberately plain shapes. A prop the player is asked to notice during a read
// has to be identifiable at a glance from across the level.

function drawProps() {
  for (const p of props) {
    const sx = p.x - camX;
    if (sx < -140 || sx > GAME_W + 140) continue;
    ctx.save();
    ctx.strokeStyle = '#181510';
    ctx.fillStyle   = '#181510';
    ctx.lineWidth   = 4;
    ctx.lineCap     = 'round';

    if (p.kind === 'gate') {
      ctx.beginPath(); ctx.moveTo(sx - 26, p.y + 80); ctx.lineTo(sx - 26, p.y - 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + 26, p.y + 80); ctx.lineTo(sx + 26, p.y - 4); ctx.stroke();
      ctx.lineWidth = 3;
      if (p.open) {
        // Swung back against the post
        ctx.beginPath(); ctx.moveTo(sx - 24, p.y + 10); ctx.lineTo(sx - 24, p.y + 66); ctx.stroke();
        ctx.strokeStyle = 'rgba(150,178,186,0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const y = p.y + 58 + i * 5;
          ctx.beginPath(); ctx.moveTo(sx - 18, y); ctx.lineTo(sx + 60 + i * 12, y); ctx.stroke();
        }
      } else {
        for (let i = 0; i < 4; i++) {
          const y = p.y + 12 + i * 18;
          ctx.beginPath(); ctx.moveTo(sx - 24, y); ctx.lineTo(sx + 24, y); ctx.stroke();
        }
      }
    } else if (p.kind === 'cart') {
      ctx.fillRect(sx - 34, p.y - 6, 68, 16);
      ctx.beginPath(); ctx.arc(sx - 20, p.y + 20, 11, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 20, p.y + 20, 11, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sx + 32, p.y - 2); ctx.lineTo(sx + 58, p.y - 14); ctx.stroke();
    } else if (p.kind === 'stall') {
      // Posts + awning. `down` is the same stall after its rope has been cut.
      ctx.beginPath(); ctx.moveTo(sx - 40, p.y + 70); ctx.lineTo(sx - 40, p.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + 40, p.y + 70); ctx.lineTo(sx + 40, p.y); ctx.stroke();
      ctx.lineWidth = 3;
      if (p.down) {
        ctx.beginPath();
        ctx.moveTo(sx - 42, p.y + 2);
        ctx.lineTo(sx + 10, p.y + 62);
        ctx.lineTo(sx + 44, p.y + 66);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(sx - 46, p.y + 4);
        ctx.quadraticCurveTo(sx, p.y - 14, sx + 46, p.y + 4);
        ctx.stroke();
        ctx.fillRect(sx - 34, p.y + 40, 68, 8);
      }
    } else if (p.kind === 'shelf') {
      // A shelf of kept law. Uneven, hand-cut, no two alike — this archive was
      // made by one person over years, not generated by a system.
      const h = p.h ?? 96, w = p.w ?? 74;
      ctx.fillRect(sx - w / 2, p.y, w, 4);
      ctx.fillRect(sx - w / 2, p.y + h * 0.52, w, 4);
      ctx.fillRect(sx - w / 2 - 3, p.y, 4, h);
      ctx.fillRect(sx + w / 2 - 1, p.y, 4, h);
      ctx.fillStyle = 'rgba(214,176,112,0.24)';
      for (let i = 0; i < 6; i++) {
        const bw = 6 + ((i * 7 + Math.round(p.x)) % 5) * 2;
        const bh = 16 + ((i * 3 + Math.round(p.x)) % 4) * 4;
        const row = i < 3 ? p.y + 4 : p.y + h * 0.52 + 4;
        const col = (i % 3) * (w / 3) - w / 2 + 6;
        ctx.fillRect(sx + col, row, bw, bh);
      }
    } else if (p.kind === 'barrel') {
      ctx.fillRect(sx - 12, p.y, 24, 30);
      ctx.strokeStyle = 'rgba(120,108,86,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx - 12, p.y + 9);  ctx.lineTo(sx + 12, p.y + 9);  ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx - 12, p.y + 21); ctx.lineTo(sx + 12, p.y + 21); ctx.stroke();
    } else if (p.kind === 'well') {
      ctx.fillRect(sx - 22, p.y + 22, 44, 30);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(sx - 18, p.y + 22); ctx.lineTo(sx - 12, p.y - 16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + 18, p.y + 22); ctx.lineTo(sx + 12, p.y - 16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx - 14, p.y - 16); ctx.lineTo(sx + 14, p.y - 16); ctx.stroke();
    }
    ctx.restore();
  }
}

// ─── Chapter title card ───────────────────────────────────────────────────────
let titleCardTimer = 0;

function showChapterTitle() { titleCardTimer = 200; }
function updateChapterTitle() { if (titleCardTimer > 0) titleCardTimer--; }

function drawChapterTitle() {
  if (titleCardTimer <= 0) return;
  const ch = CHAPTERS[currentChapter];
  if (!ch) return;
  const t = 200 - titleCardTimer;
  const a = Math.min(1, t / 30) * (titleCardTimer < 45 ? titleCardTimer / 45 : 1);

  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8b8069';
  ctx.font      = 'bold 13px Courier New';
  ctx.fillText(ch.title, GAME_W / 2, GAME_H * 0.42);
  ctx.fillStyle = '#e0d7c2';
  ctx.font      = 'bold 30px Courier New';
  ctx.fillText(ch.subtitle, GAME_W / 2, GAME_H * 0.42 + 36);
  ctx.fillStyle = '#4a4436';
  ctx.fillRect(GAME_W / 2 - 90, GAME_H * 0.42 + 54, 180, 1);
  ctx.restore();
}
