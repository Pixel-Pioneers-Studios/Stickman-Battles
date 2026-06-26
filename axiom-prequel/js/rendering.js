'use strict';

// ─── Background rendering ─────────────────────────────────────────────────────
// Each background key maps to a draw function.
// The camera offset (camX) is already applied for world-space elements.

function drawBackground(key) {
  switch (key) {
    case 'alley':       _drawAlley();      break;
    case 'street':      _drawStreet();     break;
    case 'street_day':  _drawStreetDay();  break;
    case 'market':      _drawMarket();     break;
    case 'warehouse':   _drawWarehouse();  break;
    case 'plaza':       _drawPlaza();      break;
    case 'portal':      _drawPortalBg();   break;
    default:            _drawAlley();
  }
}

// ── Alley (Ch 0) ─────────────────────────────────────────────────────────────
function _drawAlley() {
  // Sky — deep night
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Distant city glow (bottom of sky)
  const sg = ctx.createLinearGradient(0, GAME_H * 0.35, 0, GAME_H * 0.7);
  sg.addColorStop(0, 'transparent');
  sg.addColorStop(1, 'rgba(20,30,60,0.6)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Back wall bricks
  const wallY = 80;
  const brickW = 60, brickH = 22;
  for (let row = 0; row * brickH + wallY < GAME_H - 80; row++) {
    for (let col = -1; col < Math.ceil((levelWidth) / brickW) + 1; col++) {
      const bx = col * brickW + (row % 2 === 0 ? 0 : brickW / 2) - (camX * 0.6) % brickW;
      const by = row * brickH + wallY;
      ctx.fillStyle   = row % 3 === 1 ? '#1c1c1c' : '#181818';
      ctx.fillRect(bx + 1, by + 1, brickW - 2, brickH - 2);
    }
  }

  // Streetlamps (parallax at 0.7x)
  const lampPositions = [180, 550, 950, 1300];
  for (const lx of lampPositions) {
    const sx = lx - camX * 0.7;
    if (sx < -40 || sx > GAME_W + 40) continue;
    ctx.strokeStyle = '#444';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(sx, GAME_H - 80);
    ctx.lineTo(sx, GAME_H * 0.35);
    ctx.lineTo(sx + 30, GAME_H * 0.3);
    ctx.stroke();
    // Lamp cone
    const lg = ctx.createRadialGradient(sx + 30, GAME_H * 0.3, 0, sx + 30, GAME_H * 0.3, 90);
    lg.addColorStop(0, 'rgba(200,180,100,0.18)');
    lg.addColorStop(1, 'transparent');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(sx + 30, GAME_H * 0.3, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffeeaa';
    ctx.beginPath();
    ctx.arc(sx + 30, GAME_H * 0.3, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dumpsters (world space)
  _drawDumpster(310 - camX, GAME_H - 120);
  _drawDumpster(690 - camX, GAME_H - 120);
}

function _drawDumpster(sx, sy) {
  ctx.fillStyle   = '#1e3a1e';
  ctx.strokeStyle = '#111';
  ctx.lineWidth   = 1.5;
  ctx.fillRect(sx, sy, 90, 42);
  ctx.strokeRect(sx, sy, 90, 42);
  ctx.fillStyle = '#163016';
  ctx.fillRect(sx + 2, sy + 2, 86, 12);
  ctx.fillStyle = '#333';
  ctx.fillRect(sx + 30, sy + 16, 30, 4);
}

// ── Street Day (Prologue interlude) ───────────────────────────────────────────
function _drawStreetDay() {
  // Overcast mid-morning — grey-blue sky, muted warmth
  const skyG = ctx.createLinearGradient(0, 0, 0, GAME_H * 0.55);
  skyG.addColorStop(0, '#2a3040');
  skyG.addColorStop(1, '#3a3830');
  ctx.fillStyle = skyG;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Diffuse ambient light (not bright — city feels ordinary, not hopeful)
  ctx.fillStyle = 'rgba(200,190,160,0.06)';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Buildings (parallax 0.4x) — daytime colours, slightly more detail visible
  const buildings = [
    { x: 0,    w: 180, h: 200, c: '#282830' },
    { x: 200,  w: 140, h: 260, c: '#2c2c34' },
    { x: 370,  w: 200, h: 180, c: '#242428' },
    { x: 600,  w: 160, h: 300, c: '#282834' },
    { x: 800,  w: 190, h: 220, c: '#2a2a30' },
    { x: 1020, w: 150, h: 280, c: '#242430' },
    { x: 1200, w: 200, h: 200, c: '#28282e' },
  ];
  for (const b of buildings) {
    const bsx = b.x - camX * 0.4;
    if (bsx > GAME_W + 10 || bsx + b.w < -10) continue;
    ctx.fillStyle = b.c;
    ctx.fillRect(bsx, GAME_H - 80 - b.h, b.w, b.h);
    // Windows — daytime, fewer lit
    for (let wy = 16; wy < b.h - 16; wy += 28) {
      for (let wx = 12; wx < b.w - 12; wx += 22) {
        const lit = ((b.x + wx + wy) * 13) % 7 < 1;
        ctx.fillStyle = lit ? 'rgba(200,190,160,0.15)' : 'rgba(20,20,30,0.7)';
        ctx.fillRect(bsx + wx, GAME_H - 80 - b.h + wy, 10, 16);
      }
    }
  }

  // Road
  ctx.fillStyle = '#111';
  ctx.fillRect(0, GAME_H - 82, GAME_W, 4);
  ctx.strokeStyle = 'rgba(200,190,160,0.12)';
  ctx.lineWidth   = 3;
  ctx.setLineDash([40, 30]);
  ctx.beginPath();
  ctx.moveTo(-camX % 70, GAME_H - 60);
  ctx.lineTo(GAME_W, GAME_H - 60);
  ctx.stroke();
  ctx.setLineDash([]);

  // Parked cars
  _drawCar(200 - camX, GAME_H - 120, '#303028');
  _drawCar(500 - camX, GAME_H - 120, '#282828');
  _drawCar(820 - camX, GAME_H - 120, '#302828');
  _drawCar(1100 - camX, GAME_H - 120, '#283028');
}

// ── Street (Ch 1) ─────────────────────────────────────────────────────────────
function _drawStreet() {
  // Grey dusk sky
  const skyG = ctx.createLinearGradient(0, 0, 0, GAME_H * 0.55);
  skyG.addColorStop(0, '#1a1f2e');
  skyG.addColorStop(1, '#2d2a3a');
  ctx.fillStyle = skyG;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Buildings (parallax 0.4x)
  const buildings = [
    { x: 0,    w: 180, h: 200, c: '#1a1a22' },
    { x: 200,  w: 140, h: 260, c: '#1e1e2a' },
    { x: 370,  w: 200, h: 180, c: '#181820' },
    { x: 600,  w: 160, h: 300, c: '#1a1a28' },
    { x: 800,  w: 190, h: 220, c: '#1e1e24' },
    { x: 1020, w: 150, h: 280, c: '#181826' },
    { x: 1200, w: 200, h: 200, c: '#1c1c22' },
  ];
  for (const b of buildings) {
    const bsx = b.x - camX * 0.4;
    if (bsx > GAME_W + 10 || bsx + b.w < -10) continue;
    ctx.fillStyle = b.c;
    ctx.fillRect(bsx, GAME_H - 80 - b.h, b.w, b.h);
    // Windows
    for (let wy = 16; wy < b.h - 16; wy += 28) {
      for (let wx = 12; wx < b.w - 12; wx += 22) {
        const lit = ((b.x + wx + wy) * 13) % 7 < 3;
        ctx.fillStyle = lit ? 'rgba(255,220,100,0.25)' : 'rgba(30,30,50,0.6)';
        ctx.fillRect(bsx + wx, GAME_H - 80 - b.h + wy, 10, 16);
      }
    }
  }

  // Road markings
  ctx.fillStyle = '#111';
  ctx.fillRect(0, GAME_H - 82, GAME_W, 4);
  ctx.strokeStyle = 'rgba(255,220,80,0.25)';
  ctx.lineWidth   = 3;
  ctx.setLineDash([40, 30]);
  ctx.beginPath();
  ctx.moveTo(-camX % 70, GAME_H - 60);
  ctx.lineTo(GAME_W, GAME_H - 60);
  ctx.stroke();
  ctx.setLineDash([]);

  // Parked cars (world space elements at parallax 1x)
  _drawCar(260 - camX, GAME_H - 120, '#2a3a2a');
  _drawCar(560 - camX, GAME_H - 120, '#3a2a2a');
  _drawCar(870 - camX, GAME_H - 120, '#2a2a3a');
  _drawCar(1170 - camX, GAME_H - 120, '#3a3020');
}

function _drawCar(sx, sy, color) {
  if (sx < -120 || sx > GAME_W + 10) return;
  ctx.fillStyle   = color;
  ctx.strokeStyle = '#111';
  ctx.lineWidth   = 1.5;
  ctx.fillRect(sx, sy + 14, 100, 26);
  ctx.strokeRect(sx, sy + 14, 100, 26);
  // Roof
  ctx.fillRect(sx + 16, sy + 4, 68, 14);
  ctx.strokeRect(sx + 16, sy + 4, 68, 14);
  // Wheels
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(sx + 20, sy + 40, 9, 0, Math.PI * 2);
  ctx.arc(sx + 80, sy + 40, 9, 0, Math.PI * 2);
  ctx.fill();
}

// ── Market (Ch 2) ─────────────────────────────────────────────────────────────
function _drawMarket() {
  // Warm afternoon sky
  const skyG = ctx.createLinearGradient(0, 0, 0, GAME_H * 0.5);
  skyG.addColorStop(0, '#1a1220');
  skyG.addColorStop(1, '#3d2a1a');
  ctx.fillStyle = skyG;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Market stall awnings (parallax 0.5x)
  const stalls = [
    { x: 60,   color: '#883322' },
    { x: 300,  color: '#224433' },
    { x: 520,  color: '#223355' },
    { x: 760,  color: '#553322' },
    { x: 1000, color: '#334422' },
    { x: 1240, color: '#442233' },
    { x: 1480, color: '#334422' },
  ];
  for (const s of stalls) {
    const sx = s.x - camX * 0.5;
    if (sx < -120 || sx > GAME_W + 10) continue;
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.moveTo(sx - 10, GAME_H * 0.35);
    ctx.lineTo(sx + 90, GAME_H * 0.35);
    ctx.lineTo(sx + 80, GAME_H * 0.44);
    ctx.lineTo(sx,      GAME_H * 0.44);
    ctx.closePath();
    ctx.fill();
    // Stripe
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(sx + i * 16, GAME_H * 0.35, 8, GAME_H * 0.09);
    }
  }
}

// ── Warehouse (Ch 3) ──────────────────────────────────────────────────────────
function _drawWarehouse() {
  ctx.fillStyle = '#0d0d10';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Industrial ceiling trusses (parallax 0.3x)
  ctx.strokeStyle = '#1a1a1e';
  ctx.lineWidth   = 3;
  const trussSpacing = 220;
  for (let tx = -trussSpacing; tx < GAME_W + trussSpacing; tx += trussSpacing) {
    const bx = tx - (camX * 0.3) % trussSpacing;
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx, 70);
    ctx.lineTo(bx + trussSpacing, 70);
    ctx.lineTo(bx + trussSpacing, 0);
    ctx.stroke();
    // Diagonal
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx + trussSpacing, 70);
    ctx.stroke();
  }

  // Overhead lights
  const lightPositions = [180, 520, 860, 1200, 1540, 1880];
  for (const lx of lightPositions) {
    const sx = lx - camX * 0.6;
    if (sx < -60 || sx > GAME_W + 60) continue;
    const flicker = 0.7 + Math.sin(frameCount * 0.15 + lx) * 0.05;
    const lg = ctx.createRadialGradient(sx, 70, 0, sx, 70, 180);
    lg.addColorStop(0, `rgba(180,160,100,${0.14 * flicker})`);
    lg.addColorStop(1, 'transparent');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.arc(sx, 70, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(200,180,120,${0.8 * flicker})`;
    ctx.fillRect(sx - 18, 62, 36, 6);
  }

  // Stack of crates (world space)
  _drawCrates(380 - camX, GAME_H - 170);
  _drawCrates(800 - camX, GAME_H - 170);
  _drawCrates(1280 - camX, GAME_H - 170);
}

function _drawCrates(sx, sy) {
  if (sx < -80 || sx > GAME_W + 10) return;
  ctx.fillStyle   = '#2a1e0e';
  ctx.strokeStyle = '#1a1208';
  ctx.lineWidth   = 1;
  // 3 stack
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(sx + (i % 2) * 8, sy - i * 32, 60, 30);
    ctx.strokeRect(sx + (i % 2) * 8, sy - i * 32, 60, 30);
    ctx.strokeRect(sx + (i % 2) * 8 + 14, sy - i * 32 + 8, 32, 14);
  }
}

// ── Plaza (Ch 4) ──────────────────────────────────────────────────────────────
let _riftGlow = 0;
function _drawPlaza() {
  // Night sky
  ctx.fillStyle = '#080812';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Stars (parallax 0.1x)
  ctx.fillStyle = 'rgba(200,200,220,0.6)';
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 137 + 50) % levelWidth) - camX * 0.1;
    if (sx < 0 || sx > GAME_W) continue;
    const sy = (i * 79 + 30) % (GAME_H * 0.55);
    const r  = 0.5 + (i % 3) * 0.5;
    ctx.beginPath();
    ctx.arc(sx % GAME_W, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // THE FRACTURE — growing dimensional rift visible far right
  _riftGlow = (_riftGlow + 0.025) % (Math.PI * 2);
  const riftX = GAME_W - 80 - camX * 0.05;
  const pulse = 0.5 + Math.sin(_riftGlow) * 0.15;

  if (riftX > -100 && riftX < GAME_W + 100) {
    const rg = ctx.createRadialGradient(riftX, GAME_H * 0.45, 0, riftX, GAME_H * 0.45, 140 * pulse);
    rg.addColorStop(0, `rgba(100,60,255,${0.6 * pulse})`);
    rg.addColorStop(0.3, `rgba(60,20,180,${0.3 * pulse})`);
    rg.addColorStop(1, 'transparent');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // Rift crack lines
    ctx.save();
    ctx.strokeStyle = `rgba(160,120,255,${0.5 * pulse})`;
    ctx.lineWidth   = 2;
    const cracks = [
      [-30, -80, 10, -20], [10, -90, -20, -10], [20, -60, 40, 0], [-10, -40, -40, 20],
    ];
    for (const [x1, y1, x2, y2] of cracks) {
      ctx.beginPath();
      ctx.moveTo(riftX + x1, GAME_H * 0.45 + y1);
      ctx.lineTo(riftX + x2, GAME_H * 0.45 + y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // City silhouette (parallax 0.25x)
  ctx.fillStyle = '#0d0d16';
  for (let i = 0; i < 14; i++) {
    const bx  = i * 160 - (camX * 0.25) % 160;
    const bh  = 80 + (i * 53) % 140;
    const bw  = 100 + (i * 31) % 60;
    ctx.fillRect(bx, GAME_H - 80 - bh, bw, bh);
  }
}

// ── Portal bg (Ch 5) ─────────────────────────────────────────────────────────
let _portalBgPulse = 0;
function _drawPortalBg() {
  // Void — the fracture fills everything
  _portalBgPulse += 0.03;

  ctx.fillStyle = '#04030a';
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // Large central portal
  const px = GAME_W * 0.82 - camX * 0.02;
  const py = GAME_H * 0.48;
  const pr = 120 + Math.sin(_portalBgPulse) * 15;

  const gr = ctx.createRadialGradient(px, py, 0, px, py, pr);
  gr.addColorStop(0, `rgba(140,80,255,${0.8 + Math.sin(_portalBgPulse) * 0.1})`);
  gr.addColorStop(0.35, `rgba(60,30,180,0.5)`);
  gr.addColorStop(0.7, `rgba(20,10,80,0.25)`);
  gr.addColorStop(1, 'transparent');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.arc(px, py, pr * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Outer rings
  for (let r = 0; r < 4; r++) {
    const radius = pr + r * 35 + Math.sin(_portalBgPulse + r * 0.7) * 10;
    ctx.globalAlpha = (0.3 - r * 0.06) * (0.8 + Math.sin(_portalBgPulse) * 0.2);
    ctx.strokeStyle = r % 2 === 0 ? '#8866ff' : '#6644cc';
    ctx.lineWidth   = 2 - r * 0.3;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Floating debris
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + _portalBgPulse * (i % 2 === 0 ? 0.4 : -0.3);
    const rad   = pr * 0.5 + (i % 4) * 18;
    const dbx   = px + Math.cos(angle) * rad;
    const dby   = py + Math.sin(angle) * rad * 0.6;
    ctx.globalAlpha = 0.4 + Math.sin(angle + frameCount * 0.05) * 0.15;
    ctx.fillStyle   = '#9977ff';
    ctx.beginPath();
    ctx.arc(dbx, dby, 2 + i % 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Ground void fog
  const fog = ctx.createLinearGradient(0, GAME_H - 100, 0, GAME_H);
  fog.addColorStop(0, 'transparent');
  fog.addColorStop(1, 'rgba(30,10,80,0.6)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
}

// ─── Platform rendering ───────────────────────────────────────────────────────
function drawPlatforms() {
  const ch = CHAPTERS[currentChapter];
  const bg = ch?.background ?? 'alley';

  for (const p of platforms) {
    const sx = p.x - camX;
    if (sx + p.w < -10 || sx > GAME_W + 10) continue;

    // Ground / surface color per environment
    let topColor  = '#2a2a2a';
    let bodyColor = '#1e1e1e';

    if (bg === 'alley')     { topColor = '#252520'; bodyColor = '#1a1a16'; }
    if (bg === 'street')    { topColor = '#2a2a28'; bodyColor = '#1e1e1c'; }
    if (bg === 'market')    { topColor = '#2e261a'; bodyColor = '#221c12'; }
    if (bg === 'warehouse') { topColor = '#1e1c1a'; bodyColor = '#161412'; }
    if (bg === 'plaza')     { topColor = '#1e1e2a'; bodyColor = '#141418'; }
    if (bg === 'portal')    { topColor = '#1a1028'; bodyColor = '#100a1e'; }

    ctx.fillStyle = bodyColor;
    ctx.fillRect(sx, p.y + 4, p.w, p.h);
    ctx.fillStyle = topColor;
    ctx.fillRect(sx, p.y, p.w, 4);

    // Edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(sx, p.y, p.w, 1);
  }
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function drawHUD() {
  if (!axiomPlayer) return;

  const ax = axiomPlayer;
  const p  = 14;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur  = 6;

  // Health bar
  const hbW = 190, hbH = 9;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(p - 3, p - 3, hbW + 6, hbH + 6);
  ctx.fillStyle = '#2a0000';
  ctx.fillRect(p, p, hbW, hbH);
  const hRatio = ax.health / ax.maxHealth;
  ctx.fillStyle = hRatio > 0.5 ? '#dd2222' : hRatio > 0.25 ? '#dd6622' : '#ff3333';
  ctx.fillRect(p, p, hbW * hRatio, hbH);

  ctx.fillStyle = '#ccaa88';
  ctx.font      = 'bold 12px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText('HEALTH', p, p - 4);

  // Super bar
  const sbY = p + hbH + 12;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(p - 3, sbY - 3, hbW + 6, 7);
  ctx.fillStyle = '#00112a';
  ctx.fillRect(p, sbY, hbW, 5);
  const superRatio = ax.superMeter / ax.maxSuper;
  ctx.fillStyle = superRatio >= 1 ? '#6699ff' : '#3355aa';
  ctx.fillRect(p, sbY, hbW * superRatio, 5);
  if (superRatio >= 1) {
    // Pulsing glow when ready
    const pulse = 0.2 + Math.sin(frameCount * 0.2) * 0.12;
    ctx.fillStyle = `rgba(100,150,255,${pulse + 0.2})`;
    ctx.fillRect(p - 1, sbY - 1, hbW + 2, 7);
    // "READY" label
    const readyLabel = frameCount % 40 < 20 ? 'SUPER  [Q]' : '▶ SUPER  [Q] ◀';
    ctx.fillStyle = '#aabbff';
    ctx.font      = 'bold 10px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(readyLabel, p, sbY + 14);
  }

  // Weapon indicator — sit below super bar; drop further if super READY label is visible
  if (ax.weapon) {
    const _wLabelY = superRatio >= 1 ? sbY + 28 : sbY + 20;
    ctx.fillStyle = ax.weapon === 'chain' ? '#ddbb44' : '#aaaadd';
    ctx.font      = 'bold 13px Courier New';
    ctx.fillText(ax.weapon.toUpperCase() + '  ×' + ax.weaponDurability, p, _wLabelY);
  }

  // Companion health bars (top-right)
  for (let i = 0; i < companions.length; i++) {
    const c   = companions[i];
    const bw  = 100;
    const bx  = GAME_W - p - bw;
    const by  = p + i * 26;

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(bx - 3, by - 3, bw + 6, 11);
    ctx.fillStyle = '#002a18';
    ctx.fillRect(bx, by, bw, 7);
    ctx.fillStyle = '#2a7a4a';
    ctx.fillRect(bx, by, bw * (c.health / c.maxHealth), 7);

    ctx.fillStyle = '#88bb99';
    ctx.font      = 'bold 11px Courier New';
    ctx.textAlign = 'right';
    ctx.fillText(c.name, bx - 6, by + 7);
  }

  // Enemy count
  const alive = enemies.filter(e => e.health > 0 && e.state !== 'dead').length;
  if (alive > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(GAME_W / 2 - 84, 5, 168, 24);
    ctx.strokeStyle = 'rgba(180,60,60,0.4)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(GAME_W / 2 - 84, 5, 168, 24);
    ctx.fillStyle = '#ee5555';
    ctx.font      = 'bold 13px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`${alive} REMAINING`, GAME_W / 2, 22);
  }

  // Combo counter — drop shadow for readability over any background
  if (comboDisplayTimer > 0) {
    comboDisplayTimer--;
    const cAlpha = Math.min(1, comboDisplayTimer / 30);
    ctx.globalAlpha = cAlpha;
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = comboCount >= 10 ? '#ff7755' : '#ffdd55';
    ctx.font        = `bold ${Math.min(32, 16 + comboCount)}px Courier New`;
    ctx.textAlign   = 'left';
    ctx.fillText(`${comboCount} HIT`, p, GAME_H - 52);
    ctx.fillStyle   = comboCount >= 10 ? '#ff4422' : '#ddaa22';
    ctx.font        = 'bold 11px Courier New';
    ctx.fillText('COMBO', p, GAME_H - 34);
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
  }

  // Control hints (fade in at chapter start, fade out)
  if (titleCardTimer > 60) {
    const a = Math.min(1, (titleCardTimer - 60) / 30) * 0.65;
    ctx.globalAlpha = a;
    ctx.fillStyle   = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, GAME_H - 26, GAME_W, 26);
    ctx.fillStyle   = '#ccbb99';
    ctx.font        = '13px Courier New';
    ctx.textAlign   = 'center';
    ctx.fillText('J — LIGHT   K — HEAVY   L — GRAB   SHIFT — DODGE   Q — SUPER   E — PICK UP', GAME_W / 2, GAME_H - 8);
    ctx.globalAlpha = 1;
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

// ─── Screen shake ─────────────────────────────────────────────────────────────
function applyScreenShake() {
  if (screenShake <= 0) return;
  const ox = (Math.random() - 0.5) * screenShake * 2;
  const oy = (Math.random() - 0.5) * screenShake * 2;
  ctx.translate(ox, oy);
  screenShake = Math.max(0, screenShake - 0.8);
}

// ─── Chapter title card ────────────────────────────────────────────────────────
// Also draws interlude label when relevant.
function drawChapterTitle() {
  if (titleCardTimer <= 0) return;
  const ch    = CHAPTERS[currentChapter];
  const alpha = titleCardTimer > 30
    ? Math.min(1, (180 - titleCardTimer) / 30) * 0.9
    : (titleCardTimer / 30) * 0.9;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur  = 10;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, GAME_W, 68);
  ctx.fillRect(0, GAME_H - 52, GAME_W, 52);

  ctx.fillStyle = ch.type === 'interlude' ? '#557766' : '#776655';
  ctx.font      = '12px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText(ch.type === 'interlude' ? '— INTERLUDE' : ch.title, 36, 30);

  ctx.fillStyle = '#eeeecc';
  ctx.font      = 'bold 22px Courier New';
  ctx.fillText(ch.subtitle, 36, 58);

  ctx.shadowBlur  = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ─── Super activation flash ───────────────────────────────────────────────────
// Full-screen void flash when Axiom fires his super move.
function drawSuperFlash() {
  if (superFlashTimer <= 0) return;
  superFlashTimer--;
  const a = (superFlashTimer / 28) * 0.65;
  ctx.fillStyle = `rgba(140,100,255,${a})`;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  // Radial burst centred on Axiom
  if (axiomPlayer) {
    const cx = axiomPlayer.cx() - camX;
    const cy = axiomPlayer.cy();
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300);
    gr.addColorStop(0, `rgba(255,240,255,${a * 0.8})`);
    gr.addColorStop(1, 'transparent');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(cx, cy, 300, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Death / game-over overlay ────────────────────────────────────────────────
let gameOverTimer = 0;

function drawGameOver() {
  if (!axiomPlayer || axiomPlayer.health > 0) { gameOverTimer = 0; return; }
  gameOverTimer++;
  const a = Math.min(1, gameOverTimer / 90);
  ctx.fillStyle = `rgba(0,0,0,${a * 0.78})`;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  if (gameOverTimer > 60) {
    const ta = Math.min(1, (gameOverTimer - 60) / 30);
    ctx.save();
    ctx.globalAlpha = ta;
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = '#dd3333';
    ctx.font        = 'bold 36px Courier New';
    ctx.textAlign   = 'center';
    ctx.fillText('FALLEN', GAME_W / 2, GAME_H / 2);
    ctx.fillStyle   = '#aaaaaa';
    ctx.font        = '15px Courier New';
    ctx.fillText('[J]  TRY AGAIN', GAME_W / 2, GAME_H / 2 + 44);
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
