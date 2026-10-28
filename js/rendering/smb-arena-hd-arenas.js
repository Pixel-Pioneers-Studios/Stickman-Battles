'use strict';
// smb-arena-hd-arenas.js: HD entries for the base arenas other than Grass.
// Each ARENA_HD entry (smb-arena-hd.js) gives front() (world-anchored atmosphere, drawn behind
// platforms and fighters) and material (a _HD_MATERIALS dressing).
// Every particle goes through _hdField so it stays in world space when the camera moves.
// Load after smb-arena-hd.js. Only called at draw time.

// Shared painting helpers

function _hdItems(seed, n, make) { const R = _hdRand(seed); return Array.from({ length: n }, (_, i) => make(R, i)); }

function _hdFloorY() {
  const fl = currentArena && currentArena.platforms && currentArena.platforms.find(p => p.isFloor);
  return fl ? fl.y : GAME_H - 40;
}

// Glows: a cached 64px sprite per colour. drawImage is far cheaper than a scaled radial gradient.
function _hdGlowSprite(rgb, flat) {
  const c = _hdGlowSprite.c || (_hdGlowSprite.c = {});
  const k = rgb + (flat ? 'f' : '');
  if (!c[k]) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const o = cv.getContext('2d');
    const g = o.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (flat) { g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(0.55, 'rgba(' + rgb + ',0.6)'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); }
    else      { g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(0.3, 'rgba(' + rgb + ',0.4)'); g.addColorStop(1, 'rgba(' + rgb + ',0)'); }
    o.fillStyle = g; o.fillRect(0, 0, 64, 64);
    c[k] = cv;
  }
  return c[k];
}
function _hdGlow(x, y, rx, ry, rgb, a, flat) {
  if (a <= 0.004) return;
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(_hdGlowSprite(rgb, flat), x - rx, y - ry, rx * 2, ry * 2);
  ctx.globalAlpha = 1;
}

// Light shafts fixed in the world, breathing slowly.
function _hdShafts(list, rgb) {
  const f = frameCount;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of list) {
    const a = s.a * (0.7 + 0.3 * Math.sin(f * 0.012 + s.ph));
    const g = ctx.createLinearGradient(0, s.top, 0, s.top + s.len);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(s.x, s.top);
    ctx.lineTo(s.x + s.w, s.top);
    ctx.lineTo(s.x + s.w * 1.9 + s.lean, s.top + s.len);
    ctx.lineTo(s.x - s.w * 0.5 + s.lean, s.top + s.len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Rolling fog: big flat glows drifting sideways along a band.
function _hdFog(items, rgb, PW) {
  _hdField(items, PW, 100000, (b, x) => _hdGlow(x, b.y + Math.sin(frameCount * 0.004 + b.ph) * 6, b.rx, b.ry, rgb, b.a, true));
}

function _hdSparkle(x, y, r, col, a) {
  ctx.globalAlpha = a;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.22, y - r * 0.22); ctx.lineTo(x + r, y);
  ctx.lineTo(x + r * 0.22, y + r * 0.22); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.22, y + r * 0.22);
  ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.22, y - r * 0.22);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
}

// Particles that fall or rise: drawn only above the floor line.
function _hdMotes(items, PW, PH, draw) {
  const fy = _hdFloorY() + 4;
  _hdField(items, PW, PH, (it, x, y) => { if (y < fy) draw(it, x, y); });
}

// Platform dressing helpers

function _dSegs(pl) { return pl._segTop || [[pl.x, pl.x + pl.w]]; }

// Tint the lower part of the body (soil, rock, sludge...).
function _dressUnder(pl, c0, c1, from) {
  ctx.save();
  ctx.beginPath(); ctx.rect(pl.x, pl.y, pl.w, pl.h); ctx.clip();
  const y0 = pl.y + pl.h * from;
  const g = ctx.createLinearGradient(0, y0, 0, pl.y + pl.h);
  g.addColorStop(0, c0.replace(/,[\d.]+\)$/, ',0)'));
  g.addColorStop(0.35, c0);
  g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.fillRect(pl.x, y0, pl.w, pl.y + pl.h - y0);
  ctx.restore();
}

// Blades / tufts along the exposed top edge.
function _dressFringe(pl, layers) {
  const f = frameCount;
  for (const L of layers) {
    ctx.fillStyle = L.col;
    ctx.beginPath();
    for (const sp of _dSegs(pl)) {
      for (let x = sp[0] + 1; x < sp[1] - 1; x += L.step) {
        const nz = _platNoise(x * 1.3 + L.ph, pl.y);
        const h = L.h0 + nz * L.h1;
        const sw = L.sway ? Math.sin(f * 0.035 + x * 0.05 + L.ph) * L.sway : 0;
        ctx.moveTo(x - L.w, pl.y + 1.5);
        ctx.lineTo(x + sw, pl.y - h);
        ctx.lineTo(x + L.w, pl.y + 1.5);
      }
    }
    ctx.fill();
  }
}

// Spikes hanging under the platform (icicles, stalactites, slime, coral).
function _dressHang(pl, every, len0, len1, fill, wide) {
  const y2 = pl.y + pl.h;
  const n = Math.max(1, Math.floor(pl.w / every));
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const t = _platNoise(pl.x + i * 13.7, pl.y + 2);
    const x = pl.x + 6 + (i + t * 0.8) * ((pl.w - 12) / n);
    const len = len0 + _platNoise(x, y2) * len1;
    const w = (wide || 3) + _platNoise(y2, x) * (wide || 3);
    ctx.moveTo(x - w, y2 - 1);
    ctx.quadraticCurveTo(x - w * 0.3, y2 + len * 0.55, x, y2 + len);
    ctx.quadraticCurveTo(x + w * 0.3, y2 + len * 0.55, x + w, y2 - 1);
  }
  ctx.fill();
}

// Cracks: short jagged polylines inside the body. glow = draw additively.
function _dressCracks(pl, col, lw, glow) {
  const n = Math.max(1, Math.floor(pl.w / 70));
  ctx.save();
  ctx.beginPath(); ctx.rect(pl.x, pl.y, pl.w, pl.h); ctx.clip();
  if (glow) ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    let x = pl.x + 10 + _platNoise(pl.x + i * 31, pl.y) * (pl.w - 20);
    let y = pl.y + pl.h * (0.25 + _platNoise(i * 7, pl.x) * 0.4);
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += 5 + _platNoise(x, k) * 9;
      y += (_platNoise(k * 3, x) - 0.45) * 9;
      ctx.lineTo(x, Math.min(pl.y + pl.h - 1, Math.max(pl.y + 2, y)));
    }
  }
  ctx.stroke();
  ctx.restore();
}

// Calls fn(x, y) at deterministic spots along the exposed top.
function _dressSprouts(pl, every, fn) {
  for (const sp of _dSegs(pl)) {
    const span = sp[1] - sp[0];
    const n = Math.floor(span / every);
    for (let i = 0; i < n; i++) {
      const x = sp[0] + 8 + (i + _platNoise(sp[0] + i * 5.1, pl.y) * 0.7) * ((span - 16) / Math.max(1, n));
      fn(x, pl.y, _platNoise(x, pl.y + i));
    }
  }
}

// A bumpy cap riding on top (snow, sand, cloud).
function _dressCap(pl, fill, thick, bump) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (const sp of _dSegs(pl)) {
    ctx.moveTo(sp[0] - 1, pl.y + thick);
    for (let x = sp[0]; x <= sp[1]; x += 6) {
      ctx.lineTo(x, pl.y - bump * _platNoise(x * 0.37, pl.y) - (Math.sin(x * 0.09) * 0.5 + 0.5) * bump * 0.6);
    }
    ctx.lineTo(sp[1] + 1, pl.y + thick);
    ctx.quadraticCurveTo((sp[0] + sp[1]) / 2, pl.y + thick + 2, sp[0] - 1, pl.y + thick);
  }
  ctx.fill();
}

// Moving diagonal sheen across the body (glass, ice, polished metal).
function _dressSheen(pl, a) {
  const f = frameCount;
  const span = pl.w + 300;
  const sx = pl.x - 150 + ((f * 1.6 + pl.x * 3) % span);
  ctx.save();
  ctx.beginPath(); ctx.rect(pl.x, pl.y, pl.w, pl.h); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(sx - 30, 0, sx + 30, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,255,255,' + a + ')');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(sx - 30, pl.y + pl.h); ctx.lineTo(sx - 30 + pl.h * 0.6, pl.y);
  ctx.lineTo(sx + 30 + pl.h * 0.6, pl.y); ctx.lineTo(sx + 30, pl.y + pl.h);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function _dressTopLight(pl, rgba, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba;
  for (const sp of _dSegs(pl)) ctx.fillRect(sp[0], pl.y, sp[1] - sp[0], h);
  ctx.restore();
}

// Materials

Object.assign(_HD_MATERIALS, {
  moss(pl) {
    if (!pl.isFloor) _dressUnder(pl, 'rgba(70,58,36,0.9)', 'rgba(38,30,18,1)', 0.5);
    _dressFringe(pl, [{ col: '#2f6a2a', step: 3.4, h0: 3, h1: 6, w: 1.4, sway: 1.2, ph: 0 },
                      { col: '#5aa040', step: 4.4, h0: 2, h1: 4, w: 1.3, sway: 1.2, ph: 2 }]);
    if (!pl.isFloor) _dressHang(pl, 22, 6, 14, 'rgba(60,110,50,0.8)', 1.2);
  },
  frost(pl) {
    _dressSheen(pl, 0.22);
    if (!pl.isFloor) _dressHang(pl, 16, 6, 16, 'rgba(214,238,255,0.92)', 2.6);
    _dressCap(pl, '#f6fbff', 4, 4);
    _dressTopLight(pl, 'rgba(255,255,255,0.35)', 1.2);
  },
  stone(pl) {
    _dressCracks(pl, 'rgba(30,22,14,0.55)', 1.1, false);
    _dressSprouts(pl, 60, (x, y, n) => {
      if (n < 0.45) return;
      ctx.fillStyle = 'rgba(92,128,58,0.9)';
      ctx.beginPath(); ctx.ellipse(x, y + 1, 7 + n * 8, 2.6, 0, Math.PI, 0); ctx.fill();
    });
    if (!pl.isFloor) _dressHang(pl, 40, 3, 7, 'rgba(70,96,46,0.75)', 1);
  },
  sandstone(pl) {
    // carved band and a lighter worn top
    ctx.fillStyle = 'rgba(120,84,46,0.35)';
    ctx.fillRect(pl.x + 2, pl.y + Math.min(pl.h * 0.55, 12), pl.w - 4, 1.4);
    _dressCracks(pl, 'rgba(90,60,30,0.4)', 1, false);
    _dressTopLight(pl, 'rgba(255,236,190,0.28)', 2);
  },
  magma(pl) {
    _dressUnder(pl, 'rgba(40,12,4,0.8)', 'rgba(20,6,2,1)', 0.35);
    const p = 0.55 + 0.45 * Math.sin(frameCount * 0.05 + pl.x * 0.01);
    _dressCracks(pl, 'rgba(255,' + Math.round(110 + p * 60) + ',30,' + (0.55 + p * 0.35) + ')', 1.6, true);
    if (!pl.isFloor) {
      _dressHang(pl, 30, 3, 8, 'rgba(40,14,6,0.95)', 2.4);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      _hdGlow(pl.x + pl.w / 2, pl.y + pl.h + 4, pl.w * 0.55, 12, '255,90,20', 0.18 * p, true);
      ctx.restore();
    }
  },
  asteroid(pl) {
    for (let i = 0; i < Math.max(1, pl.w / 50); i++) {
      const x = pl.x + 10 + _platNoise(pl.x + i * 9, pl.y) * (pl.w - 20);
      const y = pl.y + pl.h * (0.35 + _platNoise(i, pl.x) * 0.35);
      const r = 2 + _platNoise(x, y) * 3.5;
      ctx.fillStyle = 'rgba(10,10,30,0.45)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(170,180,255,0.3)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
    }
    _dressTopLight(pl, 'rgba(150,170,255,0.4)', 1.6);
    if (!pl.isFloor) _dressHang(pl, 34, 3, 8, 'rgba(40,40,80,0.9)', 3);
  },
  crystal(pl) {
    _dressUnder(pl, 'rgba(24,14,10,0.7)', 'rgba(12,8,6,1)', 0.45);
    const cols = ['120,220,255', '190,120,255', '110,255,190'];
    _dressSprouts(pl, 70, (x, y, n) => {
      if (n < 0.35) return;
      const c = cols[Math.floor(n * 9) % 3];
      const h = 7 + n * 9;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      _hdGlow(x, y - h * 0.4, 12, 12, c, 0.25 + 0.15 * Math.sin(frameCount * 0.04 + x));
      ctx.restore();
      ctx.fillStyle = 'rgba(' + c + ',0.9)';
      ctx.beginPath(); ctx.moveTo(x - 3, y + 1); ctx.lineTo(x - 1, y - h); ctx.lineTo(x + 2.5, y + 1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + 5, y - h * 0.6); ctx.lineTo(x + 6, y + 1); ctx.closePath(); ctx.fill();
    });
    if (!pl.isFloor) _dressHang(pl, 18, 5, 12, 'rgba(48,32,24,0.95)', 2.4);
  },
  coral(pl) {
    _dressUnder(pl, 'rgba(10,50,80,0.6)', 'rgba(4,24,44,0.95)', 0.45);
    const cols = ['#ff7a9c', '#ffa25a', '#c58cff', '#5ee0c8'];
    _dressSprouts(pl, 34, (x, y, n) => {
      ctx.strokeStyle = cols[Math.floor(n * 7) % 4];
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      const h = 5 + n * 9, sw = Math.sin(frameCount * 0.03 + x) * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y + 1); ctx.quadraticCurveTo(x + sw, y - h * 0.6, x + sw * 1.5, y - h);
      ctx.moveTo(x, y - h * 0.4); ctx.lineTo(x - 3 + sw, y - h * 0.75);
      ctx.moveTo(x, y - h * 0.3); ctx.lineTo(x + 3 + sw, y - h * 0.6);
      ctx.stroke();
    });
    if (!pl.isFloor) _dressHang(pl, 26, 8, 16, 'rgba(40,130,90,0.7)', 1.2);
  },
  cloud(pl) {
    const f = frameCount;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    for (const sp of _dSegs(pl)) {
      for (let x = sp[0] + 6; x < sp[1] - 4; x += 13) {
        const r = 5 + _platNoise(x, pl.y) * 5 + Math.sin(f * 0.02 + x) * 0.6;
        ctx.moveTo(x + r, pl.y + 2); ctx.arc(x, pl.y + 2, r, Math.PI, 0);
      }
    }
    ctx.fill();
    if (!pl.isFloor) {
      ctx.fillStyle = 'rgba(214,230,250,0.9)';
      ctx.beginPath();
      for (let x = pl.x + 8; x < pl.x + pl.w - 6; x += 15) {
        const r = 4 + _platNoise(pl.y, x) * 4;
        ctx.moveTo(x + r, pl.y + pl.h - 2); ctx.arc(x, pl.y + pl.h - 2, r, 0, Math.PI);
      }
      ctx.fill();
    }
  },
  mycel(pl) {
    _dressFringe(pl, [{ col: '#7a3aa8', step: 3.6, h0: 2, h1: 5, w: 1.3, sway: 1, ph: 0 }]);
    const cols = ['255,120,220', '120,230,255', '255,220,110'];
    _dressSprouts(pl, 46, (x, y, n) => {
      if (n < 0.3) return;
      const c = cols[Math.floor(n * 11) % 3];
      const h = 4 + n * 6;
      ctx.fillStyle = 'rgba(235,225,240,0.9)';
      ctx.fillRect(x - 0.8, y - h, 1.6, h + 1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      _hdGlow(x, y - h, 9, 7, c, 0.35 + 0.2 * Math.sin(frameCount * 0.05 + x));
      ctx.restore();
      ctx.fillStyle = 'rgba(' + c + ',0.95)';
      ctx.beginPath(); ctx.ellipse(x, y - h, 3.6 + n * 1.5, 2.4, 0, Math.PI, 0); ctx.fill();
    });
    if (!pl.isFloor) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      _dressHang(pl, 20, 6, 14, 'rgba(200,110,255,0.45)', 0.9);
      ctx.restore();
    }
  },
  grave(pl) {
    _dressCracks(pl, 'rgba(8,4,12,0.6)', 1.1, false);
    // cobwebs in the lower corners of floating ledges
    if (!pl.isFloor) {
      ctx.strokeStyle = 'rgba(220,210,240,0.28)';
      ctx.lineWidth = 0.7;
      for (const [cx, dir] of [[pl.x + 2, 1], [pl.x + pl.w - 2, -1]]) {
        const y = pl.y + pl.h;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) { ctx.moveTo(cx, y); ctx.lineTo(cx + dir * (6 + k * 5), y + 12 - k * 3); }
        for (let r = 5; r <= 15; r += 5) { ctx.moveTo(cx + dir * r * 0.5, y + r * 0.7); ctx.quadraticCurveTo(cx + dir * r * 0.8, y + r * 0.35, cx + dir * r, y + 1); }
        ctx.stroke();
      }
      _dressHang(pl, 30, 3, 6, 'rgba(30,20,36,0.9)', 2);
    }
    _dressTopLight(pl, 'rgba(160,120,220,0.18)', 1.4);
  },
  neonmetal(pl) {
    // panel seams and hazard stripes at the ends
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let x = pl.x + 40; x < pl.x + pl.w - 10; x += 60) ctx.fillRect(x, pl.y + 3, 1, pl.h - 4);
    if (!pl.isFloor) {
      ctx.save();
      ctx.beginPath(); ctx.rect(pl.x, pl.y + pl.h - 5, pl.w, 5); ctx.clip();
      ctx.fillStyle = 'rgba(255,200,0,0.75)';
      for (const ex of [pl.x, pl.x + pl.w - 22]) for (let k = 0; k < 3; k++) {
        ctx.beginPath(); ctx.moveTo(ex + k * 8, pl.y + pl.h); ctx.lineTo(ex + k * 8 + 4, pl.y + pl.h - 5); ctx.lineTo(ex + k * 8 + 8, pl.y + pl.h - 5); ctx.lineTo(ex + k * 8 + 4, pl.y + pl.h); ctx.fill();
      }
      ctx.restore();
    }
    _dressSheen(pl, 0.12);
  },
  neon(pl) {
    ctx.save();
    ctx.beginPath(); ctx.rect(pl.x, pl.y, pl.w, pl.h); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(0,255,90,0.28)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const n = Math.max(1, Math.floor(pl.w / 40));
    for (let i = 0; i < n; i++) {
      const x = pl.x + 10 + _platNoise(i, pl.y) * (pl.w - 20);
      const y = pl.y + pl.h * 0.5;
      ctx.moveTo(x, pl.y + 3); ctx.lineTo(x, y); ctx.lineTo(x + 14, y); ctx.lineTo(x + 14, pl.y + pl.h);
    }
    ctx.stroke();
    // a pulse running along the top edge
    const span = pl.w + 80;
    const px = pl.x - 40 + ((frameCount * 3 + pl.x) % span);
    const g = ctx.createLinearGradient(px - 40, 0, px + 40, 0);
    g.addColorStop(0, 'rgba(120,255,160,0)'); g.addColorStop(0.5, 'rgba(160,255,190,0.85)'); g.addColorStop(1, 'rgba(120,255,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px - 40, pl.y, 80, 2);
    ctx.restore();
  },
  glass(pl) {
    _dressSheen(pl, 0.3);
    _dressTopLight(pl, 'rgba(180,220,255,0.35)', 1.2);
    if (!pl.isFloor) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      _hdGlow(pl.x + pl.w / 2, pl.y + pl.h + 3, pl.w * 0.5, 8, '120,170,255', 0.14, true);
      ctx.restore();
    }
  },
  sand(pl) {
    ctx.strokeStyle = 'rgba(150,104,52,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 1; k <= 2; k++) {
      const y = pl.y + pl.h * (0.3 + k * 0.22);
      if (y > pl.y + pl.h - 2) continue;
      ctx.moveTo(pl.x + 2, y);
      for (let x = pl.x + 2; x < pl.x + pl.w - 2; x += 10) ctx.lineTo(x, y + Math.sin(x * 0.05 + k) * 1.2);
    }
    ctx.stroke();
    _dressCap(pl, '#f2d49a', 3, 3.5);
    if (!pl.isFloor) _dressHang(pl, 28, 2, 6, 'rgba(232,196,128,0.8)', 3);
  },
  brick(pl) {
    ctx.save();
    ctx.beginPath(); ctx.rect(pl.x, pl.y, pl.w, pl.h); ctx.clip();
    ctx.strokeStyle = 'rgba(20,16,10,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let row = 0, y = pl.y + 6; y < pl.y + pl.h; row++, y += 8) {
      ctx.moveTo(pl.x, y); ctx.lineTo(pl.x + pl.w, y);
      for (let x = pl.x + (row % 2 ? 9 : 0); x < pl.x + pl.w; x += 18) { ctx.moveTo(x, y); ctx.lineTo(x, Math.min(y + 8, pl.y + pl.h)); }
    }
    ctx.stroke();
    ctx.restore();
    // slime dripping over the edge
    ctx.fillStyle = 'rgba(140,200,40,0.85)';
    ctx.beginPath();
    for (const sp of _dSegs(pl)) {
      ctx.moveTo(sp[0], pl.y - 1);
      for (let x = sp[0]; x <= sp[1]; x += 5) {
        const n = _platNoise(x * 0.5, pl.y);
        const d = n > 0.82 ? 4 + (n - 0.82) * 60 * (0.8 + 0.2 * Math.sin(frameCount * 0.03 + x)) : 2.2;
        ctx.lineTo(x, pl.y + d);
      }
      ctx.lineTo(sp[1], pl.y - 1);
    }
    ctx.fill();
  },
});

// Arenas

// CITY: night skyline: sweeping searchlights, a warm horizon, aircraft lights.
const _HD_CITY = {
  lights: [{ x: 160, ph: 0 }, { x: 760, ph: 2.1 }, { x: 470, ph: 4.0 }],
  planes: _hdItems(311, 3, R => ({ x: R() * 1600, y: 30 + R() * 110, vx: 0.18 + R() * 0.12, ph: R() * 6 })),
  dust: _hdItems(312, 26, R => ({ x: R() * 1200, y: R() * 600, vx: 0.15, vy: -0.08, ph: R() * 6 })),
};
ARENA_HD.city = { material: 'neonmetal', front() {
  const f = frameCount, v = arenaViewRect(); if (!v) return;
  ctx.globalCompositeOperation = 'lighter';
  const hz = ctx.createLinearGradient(0, 300, 0, 440);
  hz.addColorStop(0, 'rgba(255,140,70,0)'); hz.addColorStop(1, 'rgba(255,140,70,0.16)');
  ctx.fillStyle = hz; ctx.fillRect(v.x, 300, v.w, 140);
  for (const L of _HD_CITY.lights) {
    const a = -Math.PI / 2 + Math.sin(f * 0.006 + L.ph) * 0.42;
    const len = 760, spread = 0.055;
    const g = ctx.createRadialGradient(L.x, 470, 10, L.x, 470, len);
    g.addColorStop(0, 'rgba(200,220,255,0.14)'); g.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(L.x, 470); ctx.arc(L.x, 470, len, a - spread, a + spread); ctx.closePath(); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  _hdField(_HD_CITY.planes, 1600, 100000, (p, x) => {
    const on = Math.sin(f * 0.12 + p.ph) > 0.6;
    ctx.fillStyle = on ? 'rgba(255,70,70,0.95)' : 'rgba(255,255,255,0.5)';
    ctx.fillRect(x, p.y, 2, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(x - 6, p.y + 1, 1.5, 1.5);
  });
  _hdMotes(_HD_CITY.dust, 1200, 600, (d, x, y) => { ctx.fillStyle = 'rgba(255,220,180,0.25)'; ctx.fillRect(x, y, 1.5, 1.5); });
} };

// SPACE: nebula glow, drifting dust, shooting stars.
const _HD_SPACE = {
  neb: [{ x: 180, y: 160, rx: 300, ry: 200, c: '200,60,200', a: 0.13 }, { x: 720, y: 280, rx: 340, ry: 220, c: '40,170,220', a: 0.12 },
        { x: 470, y: 40, rx: 260, ry: 150, c: '120,80,255', a: 0.12 }, { x: -200, y: 300, rx: 300, ry: 200, c: '60,120,255', a: 0.1 },
        { x: 1150, y: 120, rx: 300, ry: 200, c: '220,80,160', a: 0.1 }],
  dust: _hdItems(401, 60, R => ({ x: R() * 1200, y: R() * 800, vx: 0.06 + R() * 0.08, vy: 0.02, r: 0.6 + R() * 1.2, ph: R() * 6 })),
};
ARENA_HD.space = { material: 'asteroid', skyTop: '#02010a',
  // Deep field above the arena: the drawer's nebulae and stars stop at y=0.
  back() {
    const v = arenaViewRect(); if (!v || v.y >= 0) return;
    const g = ctx.createLinearGradient(0, -600, 0, 0);
    g.addColorStop(0, '#02010a'); g.addColorStop(1, '#000010');
    ctx.fillStyle = g; ctx.fillRect(v.x - 20, Math.min(v.y, -600) - 10, v.w + 40, -Math.min(v.y, -600) + 12);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const n of [[120, -340, '150,60,220'], [640, -420, '40,120,220'], [980, -320, '200,60,160'], [-300, -380, '60,90,220']])
      _hdGlow(n[0] - _hdCamOff() * 0.03, n[1], 340, 170, n[2], 0.07, true);
    ctx.restore();
  },
  front() {
  const f = frameCount;
  ctx.globalCompositeOperation = 'lighter';
  const sh = _hdCamOff() * 0.03;
  for (const n of _HD_SPACE.neb) _hdGlow(n.x - sh, n.y, n.rx, n.ry, n.c, n.a * (0.85 + 0.15 * Math.sin(f * 0.004 + n.x)), true);
  _hdField(_HD_SPACE.dust, 1200, 800, (d, x, y) => { ctx.globalAlpha = 0.4 + 0.4 * Math.sin(f * 0.05 + d.ph); ctx.fillStyle = '#dfe6ff'; ctx.fillRect(x, y, d.r, d.r); });
  ctx.globalAlpha = 1;
  const t = f % 320;
  if (t < 46) {
    const k = Math.floor(f / 320);
    const sx = 80 + (k * 397) % 700 + t * 11, sy = 20 + (k * 131) % 140 + t * 4.5;
    const g = ctx.createLinearGradient(sx - 90, sy - 37, sx, sy);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,' + (0.9 * (1 - t / 46)) + ')');
    ctx.strokeStyle = g; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx - 90, sy - 37); ctx.lineTo(sx, sy); ctx.stroke();
  }
} };

// LAVA / VOLCANO: embers rising on the heat, ash falling, a heat glow.
const _HD_EMBERS = _hdItems(501, 70, R => ({ x: R() * 1000, y: R() * 700, vx: 0.2, vy: -(0.7 + R() * 1.2), r: 0.8 + R() * 1.6, ph: R() * 6, hot: R() }));
const _HD_ASH = _hdItems(502, 40, R => ({ x: R() * 1000, y: R() * 700, vx: 0.35, vy: 0.45 + R() * 0.4, r: 1 + R() * 1.8, ph: R() * 6 }));
function _hdHeatFront(ash) {
  const f = frameCount, v = arenaViewRect(); if (!v) return;
  const fy = _hdFloorY();
  ctx.globalCompositeOperation = 'lighter';
  const hz = ctx.createLinearGradient(0, fy - 160, 0, fy + 20);
  hz.addColorStop(0, 'rgba(255,90,20,0)'); hz.addColorStop(1, 'rgba(255,90,20,' + (0.18 + 0.05 * Math.sin(f * 0.03)) + ')');
  ctx.fillStyle = hz; ctx.fillRect(v.x, fy - 160, v.w, 180);
  _hdMotes(_HD_EMBERS, 1000, 700, (e, x, y) => {
    const wob = Math.sin(f * 0.04 + e.ph) * 8;
    const fl = 0.55 + 0.45 * Math.sin(f * 0.15 + e.ph);
    _hdGlow(x + wob, y, e.r * 4, e.r * 4, e.hot > 0.5 ? '255,170,60' : '255,90,30', 0.35 * fl);
    ctx.fillStyle = e.hot > 0.5 ? '#ffe08a' : '#ff8a3a';
    ctx.globalAlpha = 0.9 * fl; ctx.fillRect(x + wob, y, e.r, e.r); ctx.globalAlpha = 1;
  });
  ctx.globalCompositeOperation = 'source-over';
  if (ash) _hdMotes(_HD_ASH, 1000, 700, (a, x, y) => {
    ctx.fillStyle = 'rgba(70,60,60,0.55)';
    ctx.beginPath(); ctx.ellipse(x + Math.sin(f * 0.03 + a.ph) * 10, y, a.r, a.r * 0.6, f * 0.02 + a.ph, 0, Math.PI * 2); ctx.fill();
  });
}
ARENA_HD.lava = { material: 'magma', front() { _hdHeatFront(false); } };
ARENA_HD.volcano = { material: 'magma', front() { _hdHeatFront(true); } };

// FOREST: light shafts through the canopy, falling leaves.
const _HD_FOREST = {
  shafts: _hdItems(601, 7, (R, i) => ({ x: -60 + i * 150 + R() * 60, top: -40, w: 26 + R() * 30, len: 560, lean: 120, a: 0.07 + R() * 0.05, ph: R() * 6 })),
  leaves: _hdItems(602, 26, R => ({ x: R() * 1100, y: R() * 700, vx: 0.35 + R() * 0.3, vy: 0.5 + R() * 0.5, s: 2.5 + R() * 2, ph: R() * 6, c: R() < 0.6 ? '#6fbf4a' : '#d6c24a' })),
  flies: _hdItems(603, 18, R => ({ x: R() * 1000, y: 200 + R() * 260, ph: R() * 6 })),
};
ARENA_HD.forest = { material: 'moss', front() {
  const f = frameCount;
  _hdShafts(_HD_FOREST.shafts, '230,255,190');
  _hdMotes(_HD_FOREST.leaves, 1100, 700, (l, x, y) => {
    const m = ctx.getTransform();
    ctx.translate(x + Math.sin(f * 0.03 + l.ph) * 14, y); ctx.rotate(f * 0.04 + l.ph); ctx.scale(1, Math.abs(Math.sin(f * 0.05 + l.ph)) * 0.8 + 0.2);
    ctx.fillStyle = l.c; ctx.beginPath(); ctx.ellipse(0, 0, l.s * 1.6, l.s * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.setTransform(m);
  });
  ctx.globalCompositeOperation = 'lighter';
  _hdField(_HD_FOREST.flies, 1000, 100000, (fl, x, y) => {
    const a = Math.max(0, Math.sin(f * 0.03 + fl.ph));
    _hdGlow(x + Math.sin(f * 0.01 + fl.ph) * 20, y + Math.cos(f * 0.013 + fl.ph) * 14, 7, 7, '220,255,120', 0.6 * a);
  });
} };

// ICE: snowfall, cold mist on the ground.
const _HD_ICE = {
  snow: _hdItems(701, 80, R => ({ x: R() * 1100, y: R() * 800, vx: 0.25 + R() * 0.25, vy: 0.6 + R() * 0.8, r: 1 + R() * 2.2, ph: R() * 6 })),
  mist: _hdItems(702, 10, R => ({ x: R() * 1400, y: 448 + R() * 20, rx: 120 + R() * 120, ry: 22 + R() * 12, vx: 0.18 + R() * 0.1, a: 0.32, ph: R() * 6 })),
};
ARENA_HD.ice = { material: 'frost', front() {
  const f = frameCount;
  _hdMotes(_HD_ICE.snow, 1100, 800, (s, x, y) => {
    ctx.globalAlpha = 0.85; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x + Math.sin(f * 0.02 + s.ph) * 10, y, s.r, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  _hdFog(_HD_ICE.mist, '240,248,255', 1400);
} };

// RUINS: dust hanging in the old light.
const _HD_RUINS = {
  dust: _hdItems(801, 50, R => ({ x: R() * 1000, y: R() * 600, vx: 0.08 + R() * 0.1, vy: -0.05 + R() * 0.1, r: 0.8 + R() * 1.4, ph: R() * 6 })),
  mist: _hdItems(802, 8, R => ({ x: R() * 1400, y: 420 + R() * 20, rx: 140 + R() * 120, ry: 24, vx: 0.12, a: 0.18, ph: R() * 6 })),
};
ARENA_HD.ruins = { material: 'stone', front() {
  const f = frameCount;
  ctx.globalCompositeOperation = 'lighter';
  _hdMotes(_HD_RUINS.dust, 1000, 600, (d, x, y) => { ctx.globalAlpha = 0.35 + 0.3 * Math.sin(f * 0.03 + d.ph); ctx.fillStyle = '#ffe6b0'; ctx.fillRect(x, y, d.r, d.r); });
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  _hdFog(_HD_RUINS.mist, '220,190,140', 1400);
} };

// CAVE: crystal glints, rising spores, mist along the floor, drips.
const _HD_CAVE = {
  glints: _hdItems(901, 22, R => ({ x: R() * 1000, y: 40 + R() * 420, ph: R() * 6, c: ['#9ef0ff', '#d6a8ff', '#a8ffd8'][Math.floor(R() * 3)] })),
  spores: _hdItems(902, 34, R => ({ x: R() * 1000, y: R() * 600, vx: 0.05, vy: -(0.15 + R() * 0.25), ph: R() * 6, c: ['120,220,255', '190,130,255', '120,255,200'][Math.floor(R() * 3)] })),
  mist: _hdItems(903, 9, R => ({ x: R() * 1400, y: 462 + R() * 16, rx: 130 + R() * 120, ry: 20, vx: 0.1, a: 0.2, ph: R() * 6 })),
  drips: _hdItems(904, 8, R => ({ x: R() * 1000, y: R() * 500, vx: 0, vy: 4.5, ph: R() * 6 })),
};
ARENA_HD.cave = { material: 'crystal', front() {
  const f = frameCount;
  _hdFog(_HD_CAVE.mist, '120,140,190', 1400);
  ctx.globalCompositeOperation = 'lighter';
  _hdMotes(_HD_CAVE.spores, 1000, 600, (s, x, y) => _hdGlow(x + Math.sin(f * 0.02 + s.ph) * 10, y, 4, 4, s.c, 0.5));
  _hdField(_HD_CAVE.glints, 1000, 100000, (g, x, y) => {
    const a = Math.pow(Math.max(0, Math.sin(f * 0.025 + g.ph)), 8);
    if (a > 0.02) _hdSparkle(x, y, 6, g.c, a);
  });
  ctx.globalCompositeOperation = 'source-over';
  _hdMotes(_HD_CAVE.drips, 1000, 500, (d, x, y) => { ctx.fillStyle = 'rgba(170,210,255,0.55)'; ctx.fillRect(x, y, 1.2, 5); });
} };

// UNDERWATER: caustic light, rising bubbles, drifting particles.
const _HD_SEA = {
  bubbles: _hdItems(1001, 40, R => ({ x: R() * 1000, y: R() * 700, vx: 0, vy: -(0.6 + R() * 1.0), r: 1.5 + R() * 3, ph: R() * 6 })),
  motes: _hdItems(1002, 40, R => ({ x: R() * 1000, y: R() * 700, vx: 0.08, vy: 0.04, ph: R() * 6 })),
};
ARENA_HD.underwater = { material: 'coral', front() {
  const f = frameCount, v = arenaViewRect(); if (!v) return;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    const y0 = 40 + i * 52;
    ctx.strokeStyle = 'rgba(150,220,255,' + (0.07 - i * 0.007) + ')';
    ctx.beginPath();
    for (let x = Math.floor(v.x / 20) * 20; x <= v.x + v.w + 20; x += 20) {
      const y = y0 + Math.sin(x * 0.021 + f * 0.022 + i) * 7 + Math.sin(x * 0.007 - f * 0.013 + i * 2) * 11;
      if (x === Math.floor(v.x / 20) * 20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  _hdField(_HD_SEA.motes, 1000, 700, (m, x, y) => { ctx.fillStyle = 'rgba(200,240,255,0.25)'; ctx.fillRect(x, y, 1.4, 1.4); });
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineWidth = 1;
  _hdMotes(_HD_SEA.bubbles, 1000, 700, (b, x, y) => {
    const bx = x + Math.sin(f * 0.05 + b.ph) * 4;
    ctx.strokeStyle = 'rgba(210,240,255,0.55)';
    ctx.beginPath(); ctx.arc(bx, y, b.r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(bx - b.r * 0.4, y - b.r * 0.5, 1.2, 1.2);
  });
} };

// COLOSSEUM: sunbeams through the arches, dust, petals thrown by the crowd.
const _HD_COL = {
  shafts: _hdItems(1101, 5, (R, i) => ({ x: 60 + i * 190 + R() * 40, top: 40, w: 40 + R() * 20, len: 460, lean: -110, a: 0.1, ph: R() * 6 })),
  dust: _hdItems(1102, 40, R => ({ x: R() * 1000, y: R() * 600, vx: 0.1, vy: -0.03, r: 1 + R() * 1.3, ph: R() * 6 })),
  petals: _hdItems(1103, 16, R => ({ x: R() * 1100, y: R() * 700, vx: -0.4, vy: 0.7 + R() * 0.4, s: 2 + R() * 1.6, ph: R() * 6 })),
};
ARENA_HD.colosseum = { material: 'sandstone', front() {
  const f = frameCount;
  _hdShafts(_HD_COL.shafts, '255,230,170');
  ctx.globalCompositeOperation = 'lighter';
  _hdMotes(_HD_COL.dust, 1000, 600, (d, x, y) => { ctx.globalAlpha = 0.3 + 0.25 * Math.sin(f * 0.03 + d.ph); ctx.fillStyle = '#ffe2a0'; ctx.fillRect(x, y, d.r, d.r); });
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  _hdMotes(_HD_COL.petals, 1100, 700, (p, x, y) => {
    const m = ctx.getTransform();
    ctx.translate(x + Math.sin(f * 0.03 + p.ph) * 12, y); ctx.rotate(f * 0.05 + p.ph); ctx.scale(1, Math.abs(Math.sin(f * 0.07 + p.ph)) * 0.8 + 0.2);
    ctx.fillStyle = '#e0303a'; ctx.beginPath(); ctx.ellipse(0, 0, p.s * 1.4, p.s * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.setTransform(m);
  });
} };

// CLOUDS: wind streaks and wisps passing through the platforms.
const _HD_SKY = {
  streaks: _hdItems(1201, 8, R => ({ x: R() * 1800, y: R() * 600, len: 100 + R() * 170, vx: 6 + R() * 6, bend: (R() - 0.5) * 14 })),
  wisps: _hdItems(1202, 9, R => ({ x: R() * 1600, y: 60 + R() * 380, rx: 90 + R() * 110, ry: 16 + R() * 10, vx: 0.5 + R() * 0.5, a: 0.35, ph: R() * 6 })),
};
ARENA_HD.clouds = { material: 'cloud', front() {
  _hdFog(_HD_SKY.wisps, '255,255,255', 1600);
  ctx.lineCap = 'round'; ctx.lineWidth = 1.6;
  _hdField(_HD_SKY.streaks, 1800, 600, (s, x, y) => {
    const g = ctx.createLinearGradient(x, 0, x + s.len, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s.len / 2, y + s.bend, x + s.len, y); ctx.stroke();
  });
} };

// MUSHROOM: glowing spores rising, a violet ground glow.
const _HD_MUSH = {
  spores: _hdItems(1301, 60, R => ({ x: R() * 1000, y: R() * 700, vx: 0.08, vy: -(0.25 + R() * 0.4), r: 2 + R() * 3, ph: R() * 6, c: ['255,120,220', '120,230,255', '255,220,110', '170,255,140'][Math.floor(R() * 4)] })),
};
ARENA_HD.mushroom = { material: 'mycel', front() {
  const f = frameCount, v = arenaViewRect(); if (!v) return;
  const fy = _hdFloorY();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, fy - 120, 0, fy + 10);
  g.addColorStop(0, 'rgba(170,60,255,0)'); g.addColorStop(1, 'rgba(170,60,255,0.16)');
  ctx.fillStyle = g; ctx.fillRect(v.x, fy - 120, v.w, 130);
  _hdMotes(_HD_MUSH.spores, 1000, 700, (s, x, y) => {
    const a = 0.45 + 0.35 * Math.sin(f * 0.04 + s.ph);
    _hdGlow(x + Math.sin(f * 0.02 + s.ph) * 12, y, s.r * 2.4, s.r * 2.4, s.c, a);
  });
} };

// HAUNTED: fog rolling through the graveyard, wandering wisps.
const _HD_HAUNT = {
  fogLow: _hdItems(1401, 11, R => ({ x: R() * 1500, y: 452 + R() * 24, rx: 150 + R() * 130, ry: 26 + R() * 14, vx: 0.3 + R() * 0.15, a: 0.34, ph: R() * 6 })),
  fogMid: _hdItems(1402, 7, R => ({ x: R() * 1500, y: 300 + R() * 80, rx: 160 + R() * 100, ry: 18, vx: -0.18, a: 0.14, ph: R() * 6 })),
  wisps: _hdItems(1403, 8, R => ({ x: R() * 1000, y: 120 + R() * 300, ph: R() * 6 })),
};
ARENA_HD.haunted = { material: 'grave', front() {
  const f = frameCount;
  _hdFog(_HD_HAUNT.fogMid, '150,140,180', 1500);
  _hdFog(_HD_HAUNT.fogLow, '170,160,200', 1500);
  ctx.globalCompositeOperation = 'lighter';
  _hdField(_HD_HAUNT.wisps, 1000, 100000, (w, x, y) => {
    const wx = x + Math.sin(f * 0.008 + w.ph) * 60, wy = y + Math.sin(f * 0.02 + w.ph) * 18;
    const a = 0.5 + 0.3 * Math.sin(f * 0.05 + w.ph);
    _hdGlow(wx, wy, 16, 16, '120,255,200', 0.35 * a);
    _hdGlow(wx, wy, 4, 4, '220,255,240', 0.9 * a);
  });
} };

// CYBERPUNK: rain, and neon haze at street level.
const _HD_CYBER = {
  rain: _hdItems(1501, 110, R => ({ x: R() * 1000, y: R() * 700, vx: -1.6, vy: 9 + R() * 3, a: 0.15 + R() * 0.2 })),
};
ARENA_HD.cyberpunk = { material: 'neonmetal', front() {
  const f = frameCount, v = arenaViewRect(); if (!v) return;
  const fy = _hdFloorY();
  ctx.globalCompositeOperation = 'lighter';
  for (const [c, x0] of [['255,40,180', 120], ['0,220,255', 560]]) _hdGlow(x0 + Math.sin(f * 0.004 + x0) * 40, fy - 20, 340, 70, c, 0.13, true);
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineWidth = 1;
  _hdMotes(_HD_CYBER.rain, 1000, 700, (r, x, y) => {
    ctx.strokeStyle = 'rgba(170,210,255,' + r.a + ')';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2.4, y + 15); ctx.stroke();
  });
} };

// NEON GRID: data motes rising, a scan line sweeping down.
const _HD_GRID = {
  bits: _hdItems(1601, 46, R => ({ x: R() * 1000, y: R() * 700, vx: 0, vy: -(0.3 + R() * 0.6), s: 1.5 + R() * 2.5, ph: R() * 6 })),
};
ARENA_HD.neonGrid = { material: 'neon', front() {
  const f = frameCount, v = arenaViewRect(); if (!v) return;
  ctx.globalCompositeOperation = 'lighter';
  _hdMotes(_HD_GRID.bits, 1000, 700, (b, x, y) => { ctx.globalAlpha = 0.35 + 0.35 * Math.sin(f * 0.08 + b.ph); ctx.fillStyle = '#5bff8a'; ctx.fillRect(x, y, b.s, b.s); });
  ctx.globalAlpha = 1;
  const sy = -60 + (f * 1.2) % 620;
  const g = ctx.createLinearGradient(0, sy - 30, 0, sy + 4);
  g.addColorStop(0, 'rgba(0,255,90,0)'); g.addColorStop(1, 'rgba(0,255,90,0.08)');
  ctx.fillStyle = g; ctx.fillRect(v.x, sy - 30, v.w, 34);
} };

// MIRROR: glints flashing on the shards, drifting light.
const _HD_MIRROR = {
  glints: _hdItems(1701, 26, R => ({ x: R() * 1000, y: 30 + R() * 440, ph: R() * 6 })),
  motes: _hdItems(1702, 40, R => ({ x: R() * 1000, y: R() * 600, vx: 0.05, vy: -0.12, r: 1 + R() * 1.4, ph: R() * 6 })),
};
ARENA_HD.mirror = { material: 'glass', front() {
  const f = frameCount;
  ctx.globalCompositeOperation = 'lighter';
  _hdMotes(_HD_MIRROR.motes, 1000, 600, (m, x, y) => { ctx.globalAlpha = 0.3 + 0.3 * Math.sin(f * 0.04 + m.ph); ctx.fillStyle = '#bcd8ff'; ctx.fillRect(x, y, m.r, m.r); });
  ctx.globalAlpha = 1;
  _hdField(_HD_MIRROR.glints, 1000, 100000, (g, x, y) => {
    const a = Math.pow(Math.max(0, Math.sin(f * 0.02 + g.ph)), 10);
    if (a > 0.02) { _hdSparkle(x, y, 9, '#ffffff', a); _hdGlow(x, y, 14, 14, '160,200,255', a * 0.5); }
  });
} };

// DESERT: sand blowing low across the dunes, heat haze.
const _HD_DESERT = {
  grains: _hdItems(1801, 90, R => ({ x: R() * 1200, y: 300 + R() * 190, vx: 2.2 + R() * 2, vy: 0, ph: R() * 6 })),
  gusts: _hdItems(1802, 7, R => ({ x: R() * 1800, y: 330 + R() * 150, len: 120 + R() * 180, vx: 3 + R() * 2 })),
};
ARENA_HD.desert = { material: 'sand', front() {
  const f = frameCount, v = arenaViewRect(); if (!v) return;
  const fy = _hdFloorY();
  const hz = ctx.createLinearGradient(0, fy - 140, 0, fy);
  hz.addColorStop(0, 'rgba(255,214,150,0)'); hz.addColorStop(1, 'rgba(255,214,150,0.22)');
  ctx.fillStyle = hz; ctx.fillRect(v.x, fy - 140, v.w, 140);
  ctx.lineCap = 'round'; ctx.lineWidth = 2;
  _hdField(_HD_DESERT.gusts, 1800, 100000, (s, x) => {
    const g = ctx.createLinearGradient(x, 0, x + s.len, 0);
    g.addColorStop(0, 'rgba(240,200,130,0)'); g.addColorStop(0.6, 'rgba(240,200,130,0.4)'); g.addColorStop(1, 'rgba(240,200,130,0)');
    ctx.strokeStyle = g;
    ctx.beginPath(); ctx.moveTo(x, s.y); ctx.quadraticCurveTo(x + s.len / 2, s.y - 6, x + s.len, s.y + 2); ctx.stroke();
  });
  _hdMotes(_HD_DESERT.grains, 1200, 100000, (g, x, y) => { ctx.fillStyle = 'rgba(230,190,120,0.7)'; ctx.fillRect(x, y + Math.sin(f * 0.1 + g.ph) * 3, 1.6, 1.2); });
} };

// SEWER: drips from above, toxic mist over the water.
const _HD_SEWER = {
  drips: _hdItems(1901, 16, R => ({ x: R() * 1800, y: R() * 600, vx: 0, vy: 5 + R() * 2 })),
  mist: _hdItems(1902, 14, R => ({ x: R() * 2000, y: 440 + R() * 40, rx: 150 + R() * 120, ry: 26, vx: 0.15 + R() * 0.1, a: 0.22, ph: R() * 6 })),
  bubbles: _hdItems(1903, 14, R => ({ x: R() * 1800, y: 0, ph: R() * 6 })),
};
ARENA_HD.sewer = { material: 'brick', front() {
  const f = frameCount;
  _hdFog(_HD_SEWER.mist, '140,200,60', 2000);
  _hdMotes(_HD_SEWER.drips, 1800, 600, (d, x, y) => { ctx.fillStyle = 'rgba(170,220,90,0.6)'; ctx.beginPath(); ctx.ellipse(x, y, 1.3, 3, 0, 0, Math.PI * 2); ctx.fill(); });
  const fy = _hdFloorY();
  _hdField(_HD_SEWER.bubbles, 1800, 100000, (b, x) => {
    const t = (f * 0.012 + b.ph) % 1;
    ctx.strokeStyle = 'rgba(190,240,90,' + (0.6 * (1 - t)) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, fy + 14, 2 + t * 6, Math.PI, 0); ctx.stroke();
  });
} };

// Top-row colours measured with tools/arena-shots/skytop.js: the sky above
// y=0 continues the colour each drawer paints at its own top edge.
for (const [k, c] of Object.entries({
  city: '#070715', forest: '#1f4721', ice: '#93c4e5', cave: '#1c2016', underwater: '#33678d',
  colosseum: '#836738', clouds: '#82cbe9', mushroom: '#260339', haunted: '#050408',
  neonGrid: '#000000', mirror: '#050a15', desert: '#e5a240',
})) if (ARENA_HD[k] && !ARENA_HD[k].skyTop) ARENA_HD[k].skyTop = c;

// CREATOR: the edge of his workshop. A half-made world rises behind the stage, cracked and
// missing a wedge; construction rings turn around it; shards of unmade ground drift up.
// The static layers are baked once (no per-frame gradients); cracks brighten with his phase.
const _HD_CR = {
  X0: -500, Y0: -500, W: 1900, H: 1200, S: 1.4,
  planet: { x: 450, y: 330, r: 340 },
  shards: _hdItems(1301, 34, R => ({ x: R() * 1200, y: R() * 700, vx: 0.04 + R() * 0.06, vy: -(0.18 + R() * 0.3), s: 2 + R() * 4, ph: R() * 6, w: R() < 0.3 })),
  mist: _hdItems(1302, 8, R => ({ x: R() * 1500, y: 456 + R() * 12, rx: 150 + R() * 120, ry: 18, vx: 0.08, a: 0.22, ph: R() * 6 })),
  rocks: _hdItems(1303, 9, R => ({ x: -120 + R() * 1140, y: 40 + R() * 300, r: 6 + R() * 16, ph: R() * 6 })),
};
function _hdCrBake() {
  if (_HD_CR.base) return;
  const C = _HD_CR, mk = () => { const c = document.createElement('canvas'); c.width = Math.round(C.W * C.S); c.height = Math.round(C.H * C.S); const o = c.getContext('2d'); o.scale(C.S, C.S); o.translate(-C.X0, -C.Y0); return [c, o]; };
  const R = _hdRand(1300);
  const P = C.planet;
  // Base: sky, nebulae, stars, the unfinished world.
  const [base, o] = mk();
  let g = o.createLinearGradient(0, C.Y0, 0, C.Y0 + C.H);
  g.addColorStop(0, '#050010'); g.addColorStop(0.45, '#12042a'); g.addColorStop(0.75, '#1c0636'); g.addColorStop(1, '#0a0016');
  o.fillStyle = g; o.fillRect(C.X0, C.Y0, C.W, C.H);
  for (const n of [[160, 120, 360, '120,40,220', 0.22], [760, 60, 320, '200,50,200', 0.16], [450, 420, 520, '90,30,190', 0.2], [-200, 300, 300, '70,40,200', 0.14], [1150, 260, 320, '160,40,220', 0.14]]) {
    const rg = o.createRadialGradient(n[0], n[1], 0, n[0], n[1], n[2]);
    rg.addColorStop(0, 'rgba(' + n[3] + ',' + n[4] + ')'); rg.addColorStop(1, 'rgba(' + n[3] + ',0)');
    o.fillStyle = rg; o.fillRect(n[0] - n[2], n[1] - n[2], n[2] * 2, n[2] * 2);
  }
  for (let i = 0; i < 300; i++) {
    const x = C.X0 + R() * C.W, y = C.Y0 + R() * C.H * 0.8, s = R();
    o.fillStyle = s > 0.9 ? 'rgba(235,215,255,0.9)' : 'rgba(200,180,255,' + (0.25 + s * 0.45) + ')';
    o.fillRect(x, y, s > 0.93 ? 2 : 1.1, s > 0.93 ? 2 : 1.1);
  }
  // The world: lit from the upper left, with a wedge cut out of its lower right.
  const cut = [0.15 * Math.PI, 0.42 * Math.PI];
  o.save();
  o.beginPath();
  o.arc(P.x, P.y, P.r, cut[1], cut[0] + Math.PI * 2);
  // Jagged edge of the missing wedge
  const jag = [];
  for (let k = 0; k <= 7; k++) { const t = k / 7, a = cut[0] + (cut[1] - cut[0]) * t; jag.push([P.x + Math.cos(a) * P.r * (0.32 + R() * 0.22), P.y + Math.sin(a) * P.r * (0.32 + R() * 0.22)]); }
  o.lineTo(P.x + Math.cos(cut[0]) * P.r, P.y + Math.sin(cut[0]) * P.r);
  for (const p of jag) o.lineTo(p[0], p[1]);
  o.closePath();
  o.save(); o.clip();
  g = o.createRadialGradient(P.x - P.r * 0.45, P.y - P.r * 0.5, P.r * 0.1, P.x, P.y, P.r * 1.05);
  g.addColorStop(0, '#24104a'); g.addColorStop(0.5, '#130828'); g.addColorStop(1, '#080316');
  o.fillStyle = g; o.fillRect(P.x - P.r, P.y - P.r, P.r * 2, P.r * 2);
  // Unfinished surface: a few landmass plates, and the bare armature where none were laid.
  o.fillStyle = 'rgba(80,46,130,0.2)';
  for (let k = 0; k < 9; k++) {
    const a = R() * Math.PI * 2, d = R() * P.r * 0.8, cx = P.x + Math.cos(a) * d, cy = P.y + Math.sin(a) * d, rr = 30 + R() * 70;
    o.beginPath();
    for (let j = 0; j < 9; j++) { const b = j / 9 * Math.PI * 2, q = rr * (0.6 + R() * 0.5); o.lineTo(cx + Math.cos(b) * q, cy + Math.sin(b) * q * 0.7); }
    o.closePath(); o.fill();
  }
  o.strokeStyle = 'rgba(190,150,255,0.08)'; o.lineWidth = 1.2;
  for (let k = 1; k < 6; k++) { o.beginPath(); o.ellipse(P.x, P.y, P.r * Math.sin(k / 6 * Math.PI), P.r, 0, 0, Math.PI * 2); o.stroke(); }
  for (let k = 1; k < 6; k++) { const yy = P.y - P.r + k / 6 * P.r * 2, hw = Math.sqrt(Math.max(0, P.r * P.r - (yy - P.y) * (yy - P.y))); o.beginPath(); o.moveTo(P.x - hw, yy); o.lineTo(P.x + hw, yy); o.stroke(); }
  // Night side
  g = o.createLinearGradient(P.x - P.r * 0.4, P.y - P.r * 0.4, P.x + P.r, P.y + P.r);
  g.addColorStop(0, 'rgba(5,0,16,0)'); g.addColorStop(1, 'rgba(5,0,16,0.75)');
  o.fillStyle = g; o.fillRect(P.x - P.r, P.y - P.r, P.r * 2, P.r * 2);
  o.restore();
  // Rim light on the lit limb
  o.strokeStyle = 'rgba(225,200,255,0.4)'; o.lineWidth = 3;
  o.shadowColor = '#b878ff'; o.shadowBlur = 24;
  o.beginPath(); o.arc(P.x, P.y, P.r - 1, Math.PI * 0.9, Math.PI * 1.65); o.stroke();
  o.restore();
  // Chunks broken off the wedge, drifting near it.
  for (let k = 0; k < 7; k++) {
    const a = cut[0] + (cut[1] - cut[0]) * R(), d = P.r * (0.75 + R() * 0.5), cx = P.x + Math.cos(a) * d, cy = P.y + Math.sin(a) * d, rr = 8 + R() * 20;
    o.fillStyle = '#1a0a34'; o.strokeStyle = 'rgba(200,160,255,0.5)'; o.lineWidth = 1.2;
    o.beginPath(); for (let j = 0; j < 6; j++) { const b = j / 6 * Math.PI * 2 + R() * 0.4, q = rr * (0.6 + R() * 0.5); o.lineTo(cx + Math.cos(b) * q, cy + Math.sin(b) * q); } o.closePath(); o.fill(); o.stroke();
  }
  C.base = base;
  // Cracks: drawn additively each frame at a phase-driven alpha.
  const [cr, q] = mk();
  q.lineJoin = 'round'; q.lineCap = 'round';
  const crack = (x, y, a, len, w, depth) => {
    q.lineWidth = w; q.beginPath(); q.moveTo(x, y);
    let cx = x, cy = y;
    const steps = 5 + Math.floor(R() * 4);
    for (let s = 0; s < steps; s++) { a += (R() - 0.5) * 0.9; cx += Math.cos(a) * len / steps; cy += Math.sin(a) * len / steps; q.lineTo(cx, cy); if (depth > 0 && R() < 0.3) crack(cx, cy, a + (R() < 0.5 ? 0.8 : -0.8), len * 0.45, w * 0.6, depth - 1); }
    q.stroke();
  };
  q.strokeStyle = 'rgba(225,195,255,0.95)'; q.shadowColor = '#c080ff'; q.shadowBlur = 10;
  // Across the world, radiating from the wedge.
  const wx = P.x + Math.cos((cut[0] + cut[1]) / 2) * P.r * 0.4, wy = P.y + Math.sin((cut[0] + cut[1]) / 2) * P.r * 0.4;
  for (let k = 0; k < 9; k++) crack(wx, wy, Math.PI + (k / 9 - 0.5) * 2.6, 180 + R() * 160, 2.2, 2);
  // And through the sky.
  for (let k = 0; k < 6; k++) crack(C.X0 + 150 + R() * (C.W - 300), C.Y0 + 380 + R() * 250, Math.PI * 0.5 + (R() - 0.5) * 0.8, 160 + R() * 140, 1.6, 1);
  C.cracks = cr;
}
ARENA_HD.creator = { material: 'fracture', skyTop: '#050010',
  back() {
    if (typeof document === 'undefined') return;
    _hdCrBake();
    const C = _HD_CR, f = frameCount;
    const boss = players.find(p => p && p.isBoss && !p.isTrueForm && !p.isFallenGod);
    const ph = boss && boss.health > 0 && typeof boss.getPhase === 'function' ? boss.getPhase() : 1;
    const px = _hdCamOff() * 0.06;
    ctx.drawImage(C.base, C.X0 + px, C.Y0, C.W, C.H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + 0.5 * Math.sin(f * (0.02 + ph * 0.012));
    ctx.globalAlpha = [0, 0.16, 0.38, 0.65][ph] + pulse * 0.15;
    ctx.drawImage(C.cracks, C.X0 + px, C.Y0, C.W, C.H);
    if (ph >= 3) { ctx.globalAlpha = 1; _hdGlow(C.planet.x + px + 90, C.planet.y + 120, 260, 200, '255,60,200', 0.12 + pulse * 0.08, true); }
    ctx.globalAlpha = 1;
    // Construction rings: tilted ellipses, beads riding them.
    const P = C.planet;
    for (const [rx, ry, tilt, sp, col] of [[P.r * 1.45, P.r * 0.28, -0.22, 0.0025, '200,160,255'], [P.r * 1.2, P.r * 0.18, 0.15, -0.004, '255,140,230']]) {
      ctx.strokeStyle = 'rgba(' + col + ',0.22)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(P.x + px, P.y - 40, rx, ry, tilt, Math.PI, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 5; k++) {
        const a = Math.PI + ((f * sp + k / 5) % 1 + 1) % 1 * Math.PI;
        const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
        _hdGlow(P.x + px + ex * Math.cos(tilt) - ey * Math.sin(tilt), P.y - 40 + ex * Math.sin(tilt) + ey * Math.cos(tilt), 7, 7, col, 0.7);
      }
    }
    ctx.restore();
    // Drifting rocks, slow parallax
    for (const r of C.rocks) {
      const x = r.x + _hdCamOff() * 0.1, y = r.y + Math.sin(f * 0.01 + r.ph) * 6;
      ctx.fillStyle = '#160828'; ctx.strokeStyle = 'rgba(190,150,255,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x, y, r.r, r.r * 0.7, r.ph, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x, y, r.r, r.r * 0.7, r.ph, Math.PI * 1.0, Math.PI * 1.6); ctx.stroke();
    }
  },
  front() {
    const f = frameCount;
    _hdFog(_HD_CR.mist, '150,80,230', 1500);
    _hdMotes(_HD_CR.shards, 1200, 700, (s, x, y) => {
      ctx.translate(x + Math.sin(f * 0.02 + s.ph) * 8, y);
      ctx.rotate(f * 0.015 + s.ph);
      ctx.fillStyle = s.w ? 'rgba(235,220,255,0.75)' : 'rgba(150,90,230,0.7)';
      ctx.beginPath(); ctx.moveTo(0, -s.s); ctx.lineTo(s.s * 0.6, s.s * 0.7); ctx.lineTo(-s.s * 0.5, s.s * 0.4); ctx.closePath(); ctx.fill();
    });
  } };

Object.assign(_HD_MATERIALS, {
  // Obsidian with violet veins; floating slabs shed shards underneath.
  fracture(pl) {
    _dressUnder(pl, 'rgba(14,4,26,0.85)', 'rgba(6,0,14,1)', 0.3);
    const p = 0.55 + 0.45 * Math.sin(frameCount * 0.04 + pl.x * 0.013);
    _dressCracks(pl, 'rgba(200,140,255,' + (0.45 + p * 0.35) + ')', 1.4, true);
    _dressTopLight(pl, 'rgba(230,200,255,0.45)', 1.6);
    if (!pl.isFloor) {
      _dressHang(pl, 26, 5, 14, 'rgba(40,18,70,0.95)', 3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      _hdGlow(pl.x + pl.w / 2, pl.y + pl.h + 6, pl.w * 0.5, 12, '170,90,255', 0.16 * p, true);
      ctx.restore();
    }
  },
});

// VOID (the Cosmic Axiom's arena): the First Laws as a night sky. A far spiral galaxy, bright
// stars joined into constellations, drifting dust. Kept dim so the white platforms stay the
// brightest thing on screen. The galaxy wakes as the Axiom loses health.
const _HD_VOID = {
  X0: -600, Y0: -500, W: 2100, H: 1200, S: 1.3,
  dust: _hdItems(1401, 50, R => ({ x: R() * 1200, y: R() * 700, vx: 0.05 + R() * 0.05, vy: -0.03, r: 0.6 + R() * 1.1, ph: R() * 6 })),
};
function _hdVoidBake() {
  if (_HD_VOID.base) return;
  const C = _HD_VOID, R = _hdRand(1400);
  const cv = document.createElement('canvas'); cv.width = Math.round(C.W * C.S); cv.height = Math.round(C.H * C.S);
  const o = cv.getContext('2d'); o.scale(C.S, C.S); o.translate(-C.X0, -C.Y0);
  for (let i = 0; i < 420; i++) {
    const x = C.X0 + R() * C.W, y = C.Y0 + R() * C.H, s = R();
    o.fillStyle = 'rgba(' + (s > 0.8 ? '255,236,210' : '210,215,255') + ',' + (0.12 + s * 0.35) + ')';
    o.fillRect(x, y, s > 0.96 ? 1.8 : 1, s > 0.96 ? 1.8 : 1);
  }
  // Constellations: a few chains of bright stars with thin joining lines.
  for (let c = 0; c < 7; c++) {
    let x = C.X0 + 200 + R() * (C.W - 400), y = C.Y0 + 300 + R() * 520;
    const pts = [[x, y]];
    for (let k = 0; k < 3 + Math.floor(R() * 3); k++) { x += (R() - 0.5) * 140; y += (R() - 0.5) * 90; pts.push([x, y]); }
    o.strokeStyle = 'rgba(170,180,255,0.14)'; o.lineWidth = 0.8;
    o.beginPath(); pts.forEach((p, i) => i ? o.lineTo(p[0], p[1]) : o.moveTo(p[0], p[1])); o.stroke();
    for (const p of pts) {
      const g = o.createRadialGradient(p[0], p[1], 0, p[0], p[1], 6);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(160,170,255,0)');
      o.fillStyle = g; o.fillRect(p[0] - 6, p[1] - 6, 12, 12);
    }
  }
  C.base = cv;
  // Spiral galaxy, its own small canvas so it can turn and brighten.
  const gc = document.createElement('canvas'); gc.width = gc.height = 520;
  const q = gc.getContext('2d'); q.translate(260, 260);
  const core = q.createRadialGradient(0, 0, 0, 0, 0, 90);
  core.addColorStop(0, 'rgba(255,240,225,0.9)'); core.addColorStop(0.3, 'rgba(200,160,255,0.35)'); core.addColorStop(1, 'rgba(80,40,180,0)');
  q.fillStyle = core; q.fillRect(-90, -90, 180, 180);
  for (let i = 0; i < 2600; i++) {
    const arm = i % 2, t = Math.pow(R(), 0.7) * 4.2, a = t * 1.15 + arm * Math.PI + (R() - 0.5) * 0.5;
    const r = 18 + t * 55, x = Math.cos(a) * r, y = Math.sin(a) * r;
    q.fillStyle = 'rgba(' + (R() < 0.3 ? '255,220,200' : '190,190,255') + ',' + (0.25 + (1 - t / 4.2) * 0.5) * R() + ')';
    q.fillRect(x, y, 1.2, 1.2);
  }
  C.galaxy = gc;
}
ARENA_HD.void = { material: 'law',
  back() {
    if (typeof document === 'undefined') return;
    _hdVoidBake();
    const C = _HD_VOID, f = frameCount;
    const tf = players.find(p => p && p.isTrueForm);
    const wake = tf && tf.health > 0 ? 1 - tf.health / tf.maxHealth : 0;
    ctx.drawImage(C.base, C.X0 + _hdCamOff() * 0.04, C.Y0, C.W, C.H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.4 + wake * 0.4;
    ctx.translate(450 + _hdCamOff() * 0.08, 250);
    ctx.scale(1.35, 0.55);
    ctx.rotate(f * 0.0006 + 0.4);
    ctx.drawImage(C.galaxy, -260, -260);
    ctx.restore();
  },
  front() {
    const f = frameCount;
    ctx.globalCompositeOperation = 'lighter';
    _hdMotes(_HD_VOID.dust, 1200, 700, (d, x, y) => { ctx.globalAlpha = 0.25 + 0.3 * Math.sin(f * 0.04 + d.ph); ctx.fillStyle = '#c8d0ff'; ctx.fillRect(x, y, d.r, d.r); });
    ctx.globalAlpha = 1;
  } };

Object.assign(_HD_MATERIALS, {
  // Starlit slab: a few fixed stars inside the body, a soft glow under floating ones.
  law(pl) {
    ctx.save();
    ctx.beginPath(); ctx.rect(pl.x, pl.y, pl.w, pl.h); ctx.clip();
    for (let i = 0; i < Math.max(2, pl.w / 18); i++) {
      const x = pl.x + 3 + _platNoise(pl.x + i * 11.3, pl.y) * (pl.w - 6), y = pl.y + 3 + _platNoise(i * 5.7, pl.x) * (pl.h - 6);
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(frameCount * 0.03 + x);
      ctx.fillStyle = '#dfe4ff'; ctx.fillRect(x, y, 1.2, 1.2);
    }
    ctx.restore();
    if (!pl.isFloor) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; _hdGlow(pl.x + pl.w / 2, pl.y + pl.h + 4, pl.w * 0.5, 10, '150,150,255', 0.1, true); ctx.restore(); }
  },
});

// SOVEREIGN (The Circuit): the inside of the machine that studies you. A far wall of circuit
// traces with pulses running along them, server stacks at the sides, and his reticle hanging
// over the stage, turned toward the player. Kept dark so the decks and the floor voids read.
const _HD_SOV = {
  X0: -600, Y0: -500, W: 2100, H: 1200, S: 1.3,
  sparks: _hdItems(1501, 36, R => ({ x: R() * 1200, y: R() * 700, vx: (R() - 0.5) * 0.08, vy: -(0.15 + R() * 0.3), s: 0.8 + R() * 1.4, ph: R() * 6 })),
  haze: _hdItems(1502, 7, R => ({ x: R() * 1500, y: 452 + R() * 10, rx: 160 + R() * 110, ry: 16, vx: 0.06, a: 0.2, ph: R() * 6 })),
};
function _hdSovBake() {
  if (_HD_SOV.base) return;
  const C = _HD_SOV, R = _hdRand(1500);
  const cv = document.createElement('canvas'); cv.width = Math.round(C.W * C.S); cv.height = Math.round(C.H * C.S);
  const o = cv.getContext('2d'); o.scale(C.S, C.S); o.translate(-C.X0, -C.Y0);
  let g = o.createLinearGradient(0, C.Y0, 0, C.Y0 + C.H);
  g.addColorStop(0, '#030005'); g.addColorStop(0.55, '#0c0109'); g.addColorStop(0.78, '#1a0308'); g.addColorStop(1, '#050002');
  o.fillStyle = g; o.fillRect(C.X0, C.Y0, C.W, C.H);
  // Traces: right-angle runs with 45-degree bends, ending in pads. Kept for the pulses.
  const traces = [];
  o.lineCap = 'round'; o.lineJoin = 'round';
  for (let i = 0; i < 70; i++) {
    let x = C.X0 + R() * C.W, y = C.Y0 + 260 + R() * 680;
    const pts = [[x, y]];
    let dir = Math.floor(R() * 4);
    for (let k = 0; k < 3 + Math.floor(R() * 4); k++) {
      const len = 30 + R() * 110;
      const dx = [1, 0, -1, 0][dir], dy = [0, 1, 0, -1][dir];
      if (R() < 0.5 && k > 0) { const s = R() < 0.5 ? 1 : -1; x += (dx || s) * 18; y += (dy || s) * 18; pts.push([x, y]); }
      x += dx * len; y += dy * len; pts.push([x, y]);
      dir = (dir + (R() < 0.5 ? 1 : 3)) % 4;
    }
    traces.push(pts);
    o.strokeStyle = 'rgba(150,20,24,' + (0.12 + R() * 0.12) + ')'; o.lineWidth = 1 + R() * 1.2;
    o.beginPath(); pts.forEach((p, j) => j ? o.lineTo(p[0], p[1]) : o.moveTo(p[0], p[1])); o.stroke();
    o.fillStyle = 'rgba(200,40,30,0.35)';
    for (const p of [pts[0], pts[pts.length - 1]]) { o.beginPath(); o.arc(p[0], p[1], 2.4, 0, Math.PI * 2); o.fill(); }
  }
  // Chips: dark blocks with pin rows, sitting on the traces.
  for (let i = 0; i < 16; i++) {
    const x = C.X0 + R() * C.W, y = C.Y0 + 300 + R() * 600, w = 40 + R() * 70, h = 26 + R() * 40;
    o.fillStyle = '#0a0207'; o.fillRect(x, y, w, h);
    o.strokeStyle = 'rgba(170,30,30,0.3)'; o.lineWidth = 1; o.strokeRect(x, y, w, h);
    o.fillStyle = 'rgba(170,30,30,0.28)';
    for (let px = x + 5; px < x + w - 3; px += 7) { o.fillRect(px, y - 4, 2, 4); o.fillRect(px, y + h, 2, 4); }
  }
  // Server stacks flanking the stage, with status lights.
  for (const sx of [-520, -330, -150, 1050, 1230, 1410]) {
    const top = 30 + R() * 90, w = 110;
    o.fillStyle = '#07010a'; o.fillRect(sx, top, w, 460 - top);
    o.strokeStyle = 'rgba(120,14,20,0.4)'; o.strokeRect(sx, top, w, 460 - top);
    for (let y = top + 14; y < 450; y += 22) {
      o.fillStyle = 'rgba(90,10,16,0.35)'; o.fillRect(sx + 8, y, w - 16, 2);
      if (R() < 0.6) { o.fillStyle = R() < 0.25 ? 'rgba(255,170,120,0.8)' : 'rgba(255,50,30,0.6)'; o.fillRect(sx + w - 18, y - 5, 3, 3); }
    }
  }
  // Floor-line haze
  g = o.createLinearGradient(0, 330, 0, 470);
  g.addColorStop(0, 'rgba(120,10,10,0)'); g.addColorStop(1, 'rgba(120,10,10,0.22)');
  o.fillStyle = g; o.fillRect(C.X0, 330, C.W, 140);
  C.base = cv;
  C.traces = traces.filter(t => t.length > 2).map(pts => {
    let L = 0; const seg = [];
    for (let j = 1; j < pts.length; j++) { const d = Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]); seg.push(d); L += d; }
    return { pts, seg, L, sp: 0.6 + R() * 0.9, ph: R() * 1000 };
  });
}
function _hdSovPointOn(tr, d) {
  for (let j = 0; j < tr.seg.length; j++) {
    if (d <= tr.seg[j]) { const a = tr.pts[j], b = tr.pts[j + 1], k = d / tr.seg[j]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
    d -= tr.seg[j];
  }
  return tr.pts[tr.pts.length - 1];
}
ARENA_HD.sovereign = { material: 'circuit', skyTop: '#030005',
  back() {
    if (typeof document === 'undefined') return;
    _hdSovBake();
    const C = _HD_SOV, f = frameCount, px = _hdCamOff() * 0.05;
    ctx.drawImage(C.base, C.X0 + px, C.Y0, C.W, C.H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < C.traces.length; i += 2) {
      const tr = C.traces[i], d = (f * tr.sp + tr.ph) % (tr.L + 200);
      if (d > tr.L) continue;
      const p = _hdSovPointOn(tr, d);
      _hdGlow(p[0] + px, p[1], 9, 9, '255,70,40', 0.55);
    }
    // The reticle: four arcs and an inner ring (his domain's mark), the centre leaning toward the player.
    const sov = players.find(p => p && p.isSovereignMK2 && p.health > 0);
    const foe = players.find(p => p && !p.isSovereignMK2 && p.health > 0 && !p.isMinion);
    const ex = 450 + _hdCamOff() * 0.12, ey = 150;
    const lx = foe ? Math.max(-26, Math.min(26, (foe.cx() - 450) * 0.06)) : 0;
    const ly = foe ? Math.max(-12, Math.min(16, (foe.cy() - 300) * 0.05)) : 0;
    const hot = sov ? 1 - sov.health / sov.maxHealth : 0;
    ctx.strokeStyle = 'rgba(255,60,40,' + (0.16 + hot * 0.12) + ')';
    ctx.lineWidth = 3;
    const spin = f * 0.003;
    for (let q = 0; q < 4; q++) {
      const a = spin + q * Math.PI / 2 + Math.PI / 4;
      ctx.beginPath(); ctx.arc(ex, ey, 120, a - 0.5, a + 0.5); ctx.stroke();
    }
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(ex, ey, 98, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,90,60,' + (0.28 + hot * 0.2) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ex + lx, ey + ly, 34, 0, Math.PI * 2); ctx.stroke();
    _hdGlow(ex + lx, ey + ly, 26, 26, '255,60,30', 0.35 + hot * 0.25 + 0.08 * Math.sin(f * 0.05));
    ctx.fillStyle = 'rgba(255,200,170,' + (0.5 + hot * 0.3) + ')';
    ctx.fillRect(ex + lx - 1.5, ey + ly - 9, 3, 18);
    ctx.restore();
  },
  front() {
    const f = frameCount;
    _hdFog(_HD_SOV.haze, '170,20,20', 1500);
    ctx.globalCompositeOperation = 'lighter';
    _hdMotes(_HD_SOV.sparks, 1200, 700, (s, x, y) => { ctx.globalAlpha = 0.3 + 0.35 * Math.sin(f * 0.06 + s.ph); ctx.fillStyle = '#ff6040'; ctx.fillRect(x, y, s.s, s.s); });
    ctx.globalAlpha = 1;
  } };

Object.assign(_HD_MATERIALS, {
  // Machined plate: etched red traces in the body, a hot top edge, a glow under floating decks.
  circuit(pl) {
    _dressUnder(pl, 'rgba(20,2,8,0.8)', 'rgba(6,0,3,1)', 0.35);
    ctx.save();
    ctx.beginPath(); ctx.rect(pl.x, pl.y, pl.w, pl.h); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(200,30,24,0.32)'; ctx.lineWidth = 1;
    ctx.beginPath();
    const n = Math.max(2, Math.floor(pl.w / 34));
    for (let i = 0; i < n; i++) {
      const x = pl.x + 6 + _platNoise(pl.x + i * 9.1, pl.y) * (pl.w - 12);
      const y = pl.y + 4 + _platNoise(i * 3.3, pl.x) * Math.max(2, pl.h - 8);
      const len = 14 + _platNoise(x, y) * 30;
      ctx.moveTo(x, y); ctx.lineTo(x + len, y);
      if (pl.h > 20) ctx.lineTo(x + len + 6, y + 6);
    }
    ctx.stroke();
    ctx.restore();
    _dressTopLight(pl, 'rgba(255,80,50,0.35)', 1.6);
    if (!pl.isFloor) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; _hdGlow(pl.x + pl.w / 2, pl.y + pl.h + 4, pl.w * 0.5, 10, '255,40,20', 0.14, true); ctx.restore(); }
  },
});
