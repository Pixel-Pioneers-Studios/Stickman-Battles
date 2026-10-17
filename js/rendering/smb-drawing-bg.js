'use strict';
// smb-drawing-bg.js: generateBgElements, drawBackground, boundary portals, explore background tiles
// Depends on: smb-globals.js, smb-data-arenas.js, smb-particles-core.js

  // Background generation, pre-computed to avoid flicker.
function generateBgElements() {
  bgStars = Array.from({ length: 110 }, () => ({
    x:       Math.random() * 900,
    y:       Math.random() * 420,
    r:       0.4 + Math.random() * 1.8,
    phase:   Math.random() * Math.PI * 2,
    speed:   0.02 + Math.random() * 0.04
  }));

  bgBuildings = [];
  let bx = 0;
  while (bx < 940) {
    const bw = 55 + Math.random() * 85;
    const bh = 110 + Math.random() * 260;
    const wins = [];
    for (let wy = GAME_H - bh + 14; wy < GAME_H - 18; wy += 17) {
      for (let wx = bx + 8; wx < bx + bw - 8; wx += 14) {
        wins.push({ x: wx, y: wy, on: Math.random() > 0.28 });
      }
    }
    bgBuildings.push({ x: bx, w: bw, h: bh, wins });
    bx += bw + 4;
  }
}

function drawBackground() {
  const a = currentArena;
  if (!a) return;
  // Fill the full world width (plus overdraw) so no void shows on wide maps.
  const _bgX = a.mapLeft  !== undefined ? a.mapLeft  - 3000 : -3000;
  const _bgW = a.worldWidth ? a.worldWidth + 6000 : GAME_W + 6000;
  const _bgH = GAME_H + 3000; // covers zoom-out void below the floor
  // Solid base fill for the bottom overflow area.
  ctx.fillStyle = SMBPal.grade(a.sky[a.sky.length - 1], 0.45);
  ctx.fillRect(_bgX, 0, _bgW, _bgH);
  // Gradient layer over the visible area, cached per arena key. Explore worlds share '__explore__', so the palette must be in the key.
  const _gradKey = currentArenaKey + '|' + (a.themeKey || '') + '|' + a.sky.join(',') + '|' + (a.groundColor || '');
  if (!drawBackground._skyGradCache || drawBackground._skyGradKey !== _gradKey) {
    drawBackground._skyGradCache = ctx.createLinearGradient(0, 0, 0, GAME_H);
    // Skies get a lighter grade than terrain, or every arena turns overcast.
    drawBackground._skyGradCache.addColorStop(0, SMBPal.grade(a.sky[0], 0.45));
    drawBackground._skyGradCache.addColorStop(1, SMBPal.grade(a.sky[a.sky.length - 1], 0.45));
    drawBackground._skyGradKey = _gradKey;
  }
  ctx.fillStyle = drawBackground._skyGradCache;
  ctx.fillRect(_bgX, 0, _bgW, GAME_H);
  // Continue the arena's sky colour upward, so a high jump doesn't show a hard edge at the top.
  ctx.fillStyle = (typeof _arenaSkyTop === 'function' && _arenaSkyTop(currentArenaKey)) || SMBPal.grade(a.sky[0], 0.45);
  ctx.fillRect(_bgX, -3000, _bgW, 3001);
  // HD backdrop layers (smb-arena-hd.js) paint over the visible rect.
  if (typeof drawArenaHDBack === 'function') {
    const _hdFloor = a.platforms && a.platforms.find(pl => pl.isFloor);
    drawArenaHDBack(a.designerBase || currentArenaKey, _hdFloor ? _hdFloor.y : GAME_H - 60);
  }
  // Ground fill below the floor, so zoomed-out maps don't show raw canvas.
  if (a.groundColor && !a.noGroundFill) {
    const floorPl = a.platforms && a.platforms.find(pl => pl.isFloor);
    const groundTop = floorPl ? floorPl.y : GAME_H - 60;

    // Depth layers sit between sky and ground, so the ground occludes ridges.
    if (typeof drawArenaDepth === 'function') drawArenaDepth(a, _bgX, _bgW, _bgH, groundTop);

    // Grade the ground so it catches light and falls off with depth.
    if (!drawBackground._groundGradCache || drawBackground._groundGradKey !== _gradKey) {
      // Same material range as the platforms on it. See SMBPal.grade().
      const _gc = SMBPal.gradeHex(a.groundColor);
      const g = ctx.createLinearGradient(0, groundTop, 0, groundTop + 260);
      g.addColorStop(0,    _dpMix(_gc, '#ffffff', 0.16));
      g.addColorStop(0.14, _gc);
      g.addColorStop(1,    _dpMix(_gc, '#000000', 0.42));
      drawBackground._groundGradCache = g;
      drawBackground._groundGradKey   = _gradKey;
    }
    ctx.fillStyle = drawBackground._groundGradCache;
    ctx.fillRect(_bgX, groundTop, _bgW, _bgH - groundTop);
  }

  // Creator maps ('_custom_*') wear their base arena's art. Lava brings its pool on any base.
  const _dBase = currentArena && currentArena.designerBase;
  _drawArenaThemeArt(_dBase || currentArenaKey);
  if (typeof drawArenaHDFront === 'function' && !a.isExploreArena && !a.isBRBanded) drawArenaHDFront(_dBase || currentArenaKey);
  if (_dBase && _dBase !== 'lava' && currentArena.hasLava) drawLava();
  // Story arena fights: a chapter's authored arena brings its own art
  if (a.storyLevel != null && !a.isExploreArena && typeof drawStoryLevelBackdrop === 'function') {
    drawStoryLevelBackdrop(a);
    drawStoryLevelBack(a);
  }

  // Exploration: tile the style-appropriate background across world width
  if (currentArena && currentArena.isExploreArena) {
    _drawExploreThemeArt(currentArena);
    if (typeof drawStoryLevelBack === 'function') drawStoryLevelBack(currentArena);
  }

  // Battle Royale: one authored arena backdrop per landmark band.
  if (currentArena && currentArena.isBRBanded) {
    _drawBRBandArt();
  }

  // Boundary portals: visible warp rifts at map edges for large story maps
  if (currentArena && currentArena.boundaryPortals) {
    _drawBoundaryPortals(currentArena);
  }
}

// Bespoke per-arena backdrop art, split out of drawBackground so explore worlds can use it. See _drawExploreThemeArt.
function _drawArenaThemeArt(currentArenaKey) {
  if (currentArenaKey === 'space')      drawStars();
  if (currentArenaKey === 'grass')      drawClouds();
  if (currentArenaKey === 'lava')       drawLava();
  if (currentArenaKey === 'city')       drawCityBuildings();
  if (currentArenaKey === 'creator')    drawCreatorArena();
  if (currentArenaKey === 'forest')     drawForest();
  if (currentArenaKey === 'ice')        drawIce();
  if (currentArenaKey === 'ruins')      drawRuins();
  if (currentArenaKey === 'void')       drawVoidArena();
  if (currentArenaKey === 'sovereign')  drawSovereignArena();
  if (currentArenaKey === 'soccer')     drawSoccerArena();
  if (currentArenaKey === 'nexus')      drawNexusArena();
  if (currentArenaKey === 'cave')       drawCaveArena();
  if (currentArenaKey === 'mirror')     drawMirrorArena();
  if (currentArenaKey === 'underwater') drawUnderwaterArena();
  if (currentArenaKey === 'volcano')    drawVolcanoArena();
  if (currentArenaKey === 'colosseum')  drawColosseumArena();
  if (currentArenaKey === 'cyberpunk')  drawCyberpunkArena();
  if (currentArenaKey === 'haunted')    drawHauntedArena();
  if (currentArenaKey === 'clouds')     drawCloudsArena();
  if (currentArenaKey === 'neonGrid')   drawNeonGridArena();
  if (currentArenaKey === 'mushroom')   drawMushroomArena();
  if (currentArenaKey === 'desert')     drawDesertArena();
  if (currentArenaKey === 'megacity')   drawMegacityArena();
  if (currentArenaKey === 'warpzone')   drawWarpzoneArena();
  if (currentArenaKey === 'colosseum10') drawColosseum10Arena();
  if (currentArenaKey === 'homeYard')    drawHomeYardArena();
  if (currentArenaKey === 'homeAlley')   drawHomeAlleyArena();
  if (currentArenaKey === 'homeRooftop') drawHomeRooftopArena();
  if (currentArenaKey === 'suburb')      drawSuburbArena();
  if (currentArenaKey === 'rural')       drawRuralArena();
  if (currentArenaKey === 'portalEdge')  drawPortalEdgeArena();
  if (currentArenaKey === 'realmEntry')  drawRealmEntryArena();
  if (currentArenaKey === 'bossSanctum') drawBossSanctumArena();
  if (currentArenaKey === 'god_domain')  drawGodDomainArena();
  if (currentArenaKey === 'absolute_axiom_domain') drawAbsoluteAxiomArena();
  if (currentArena.isAAWorld && typeof drawAAWorldArena === 'function') drawAAWorldArena();
  if (currentArenaKey === 'studio')               drawStudioArena();
  if (currentArenaKey === 'sewer')      drawSewerArena();
  if (currentArenaKey === 'storyLab') drawStoryLabArena();
  if (currentArenaKey === 'storyRelay') drawStoryRelayArena();
  if (currentArenaKey === 'storyCore') drawStoryCoreArena();
  if (currentArenaKey === 'storyAssembly') drawStoryAssemblyArena();
  if (currentArenaKey === 'storyInterference') drawStoryInterferenceArena();
  if (currentArenaKey === 'storyWar') drawStoryWarArena();
  if (currentArenaKey === 'storyFlux') drawStoryFluxArena();
  if (currentArenaKey === 'storyShadow') drawStoryShadowArena();
  if (currentArenaKey === 'storyTitan') drawStoryTitanArena();
  if (currentArenaKey === 'storyNull') drawStoryNullArena();
  if (currentArenaKey === 'storyQuiet') drawStoryQuietArena();
  if (currentArenaKey === 'storyCoast') drawStoryCoastArena();
  if (currentArenaKey === 'storyCollision') drawStoryCollisionArena();
}

// Arenas with a full bespoke backdrop, inherited by explore worlds. Excludes thin overlays and the training/studio arenas.
const EXPLORE_THEME_ARENAS = new Set([
  'space', 'grass', 'lava', 'city', 'creator', 'forest', 'ice', 'ruins', 'void',
  'sovereign', 'cave', 'mirror', 'underwater', 'volcano', 'colosseum',
  'cyberpunk', 'haunted', 'clouds', 'neonGrid', 'mushroom', 'desert',
  'megacity', 'warpzone', 'colosseum10', 'homeYard', 'homeAlley', 'homeRooftop',
  'suburb', 'rural', 'portalEdge', 'realmEntry', 'bossSanctum', 'god_domain',
  'absolute_axiom_domain',
  'storyLab', 'storyRelay', 'storyCore', 'storyAssembly', 'storyInterference', 'storyWar', 'storyFlux',
  'storyShadow', 'storyTitan', 'storyNull', 'storyQuiet', 'storyCoast', 'storyCollision',
]);

// Explore worlds are 5000-9000px wide, but arena art is authored for 900x520. Draw it in viewport space with slow parallax, two 900px panels each clipped to its own band.
const _EXPLORE_THEME_PARALLAX = 0.28;
const _EXPLORE_THEME_EDGE = 44;   // px cropped from each side of a 900px panel

function _drawExploreThemeArt(a) {
  if (typeof drawStoryLevelBackdrop === 'function' && drawStoryLevelBackdrop(a)) {
    _drawExploreUnderground();
    return;
  }
  const key = a.themeKey;
  if (!key || !EXPLORE_THEME_ARENAS.has(key)) {
    _drawExploreBgTiles(a.exploreStyle);
    return;
  }

  // Visible world rect comes from the live transform (camera locals live in gameLoop).
  const m = (typeof ctx.getTransform === 'function') ? ctx.getTransform() : null;
  if (!m || !m.a || !m.d) { _drawExploreBgTiles(a.exploreStyle); return; }
  const viewW = canvas.width  / m.a;
  const viewH = canvas.height / m.d;
  const viewX = -m.e / m.a;
  const viewY = -m.f / m.d;
  // A zero or NaN scale mid-transition would make panel coords non-finite.
  if (![viewW, viewH, viewX, viewY].every(Number.isFinite)) { _drawExploreBgTiles(a.exploreStyle); return; }

  // Align the arena's floor line with the explore world's floor line.
  const floorPl = (a.platforms || []).find(pl => pl.isFloor);
  const dy = (floorPl && a.themeFloorY != null) ? (floorPl.y - a.themeFloorY) : 0;

  const scX = viewW / GAME_W;
  const scY = viewH / GAME_H;

  // Crop the arena's edge walls (picket fences, energy barriers), which read as fake walls mid-world. Lay panels at the cropped pitch.
  const pitch = GAME_W - _EXPLORE_THEME_EDGE * 2;
  const scroll = viewX * _EXPLORE_THEME_PARALLAX;
  const k0 = Math.floor(scroll / pitch);
  const off = scroll - k0 * pitch;
  const panels = Math.ceil(GAME_W / pitch) + 1;

  // Never paint backdrop art below the explore floor. The arena's own decoration is authored for a different floor height.
  const clipTop = -dy;
  const clipBot = (floorPl ? ((floorPl.y - viewY) / viewH) * GAME_H - dy : GAME_H);

  for (let i = 0; i < panels; i++) {
    const L = i * pitch - off;
    // Mirror odd panels so the art meets itself at each seam. A plain repeat cuts hard at the crop edge.
    const mirrored = (((k0 + i) % 2) + 2) % 2 === 1;
    ctx.save();
    ctx.translate(viewX, viewY);
    ctx.scale(scX, scY);
    if (mirrored) { ctx.translate(L + GAME_W - _EXPLORE_THEME_EDGE, dy); ctx.scale(-1, 1); }
    else          { ctx.translate(L - _EXPLORE_THEME_EDGE, dy); }
    ctx.beginPath();
    ctx.rect(_EXPLORE_THEME_EDGE, clipTop, pitch, Math.max(0, clipBot - clipTop));
    ctx.clip();
    _drawArenaThemeArt(key);
    ctx.restore();
  }

  // Carve tunnels here too, or a themed world never draws its caches (or advances _ugRevealCur).
  _drawExploreUnderground();
}

// Battle Royale: a left-to-right sequence of landmark bands, each with a real arena backdrop anchored to its own world rect.
const _BR_ART_VSCALE = 1.55;   // authored 480px-tall art -> 744px of world sky

// Vertical band each layer owns. Clipped per layer so skies and rock don't paint over each other.
function _brLayerRect(layer) {
  if (layer === 'sky')   return { top: -600,                        bot: BR_SKY_FLOOR_Y + 200 };
  if (layer === 'under') return { top: BR_GROUND_Y + BR_CRUST_H,    bot: BR_CAVE_FLOOR_Y };
  return { top: BR_SKY_FLOOR_Y + 200, bot: BR_GROUND_Y };
}

function _drawBRBandArt() {
  if (typeof BR_LANDMARKS === 'undefined' || typeof BR_GROUND_Y === 'undefined') return;

  // Visible world rect from the live transform (see _drawExploreThemeArt).
  const m = (typeof ctx.getTransform === 'function') ? ctx.getTransform() : null;
  if (!m || !m.a || !m.d) return;
  const viewW = canvas.width / m.a;
  const viewX = -m.e / m.a;
  if (![viewW, viewX].every(Number.isFinite)) return;

  // Drawers apply their own camera parallax, written for a 900px arena. Neutralise the camera: bands are already world-anchored.
  const _camSave = camXCur;
  camXCur = 450;

  try {
    for (let i = 0; i < BR_LANDMARKS.length; i++) {
      const L = BR_LANDMARKS[i];
      // Cull bands outside the view (+ a margin for the seam haze).
      if (L.x + L.w < viewX - 200 || L.x > viewX + viewW + 200) continue;
      if (!EXPLORE_THEME_ARENAS.has(L.themeKey)) continue;

      const rect = _brLayerRect(L.layer);
      // The art's own floor line (authored y=480) lands on this layer's floor.
      const artTop = rect.bot - 480 * _BR_ART_VSCALE;
      const clipTop = Math.max(artTop - 400, rect.top);

      ctx.save();
      ctx.beginPath();
      ctx.rect(L.x, clipTop, L.w, Math.max(0, rect.bot - clipTop));
      ctx.clip();
      ctx.translate(L.x, artTop);
      ctx.scale(L.w / GAME_W, _BR_ART_VSCALE);
      _drawArenaThemeArt(L.themeKey);
      ctx.restore();
    }
  } finally {
    camXCur = _camSave;
  }

  // Soft haze over each band join, so a hard cut reads as distance, not a render error.
  for (let i = 0; i < BR_LANDMARKS.length; i++) {
    const L = BR_LANDMARKS[i];
    if (L.x <= 0) continue;
    if (L.x < viewX - 200 || L.x > viewX + viewW + 200) continue;
    const rect = _brLayerRect(L.layer);
    const top  = Math.max(rect.bot - 480 * _BR_ART_VSCALE, rect.top);
    const hz = 150;
    const g = ctx.createLinearGradient(L.x - hz, 0, L.x + hz, 0);
    g.addColorStop(0,   'rgba(150,170,195,0)');
    g.addColorStop(0.5, 'rgba(150,170,195,0.26)');
    g.addColorStop(1,   'rgba(150,170,195,0)');
    ctx.fillStyle = g;
    ctx.fillRect(L.x - hz, top, hz * 2, Math.max(0, rect.bot - top));
  }
}

function _drawBoundaryPortals(arena) {
  const t = (frameCount || 0) * 0.04;
  const portalH = 420;
  const portalW = 30;
  const groundY = 480; // top of floor

  // Portal color adapts to arena theme
  const skyBase = arena.sky ? arena.sky[0] : '#000';
  // Use complementary glow: dark arenas get cyan/purple, bright arenas get deep blue/magenta
  const isDark = parseInt(skyBase.replace('#',''), 16) < 0x404040;
  const innerCol  = isDark ? 'rgba(80,220,255,0.9)'  : 'rgba(160,0,255,0.9)';
  const outerCol  = isDark ? 'rgba(0,150,220,0.0)'   : 'rgba(100,0,180,0.0)';
  const coreCol   = isDark ? 'rgba(180,240,255,1)'   : 'rgba(230,180,255,1)';
  const runeCol   = isDark ? 'rgba(100,200,255,0.7)' : 'rgba(200,100,255,0.7)';

  const edges = [
    { x: arena.mapLeft + 10 },
    { x: arena.mapRight - 10 },
  ];

  for (const edge of edges) {
    const cx = edge.x;
    const topY = groundY - portalH;

    ctx.save();

    const halo = ctx.createRadialGradient(cx, topY + portalH * 0.5, 0, cx, topY + portalH * 0.5, portalW * 2.5);
    halo.addColorStop(0, innerCol.replace('0.9)', '0.25)'));
    halo.addColorStop(1, outerCol);
    ctx.fillStyle = halo;
    ctx.fillRect(cx - portalW * 2.5, topY, portalW * 5, portalH);

    const grad = ctx.createLinearGradient(cx - portalW, 0, cx + portalW, 0);
    grad.addColorStop(0,   outerCol);
    grad.addColorStop(0.3, innerCol);
    grad.addColorStop(0.5, coreCol);
    grad.addColorStop(0.7, innerCol);
    grad.addColorStop(1,   outerCol);
    ctx.fillStyle = grad;
    ctx.fillRect(cx - portalW, topY, portalW * 2, portalH);

    ctx.save();
    ctx.rect(cx - portalW, topY, portalW * 2, portalH);
    ctx.clip();
    for (let i = 0; i < 6; i++) {
      const ry = topY + ((t * 80 + i * (portalH / 6)) % portalH);
      const rg = ctx.createLinearGradient(0, ry - 10, 0, ry + 10);
      rg.addColorStop(0, 'rgba(255,255,255,0)');
      rg.addColorStop(0.5, 'rgba(255,255,255,0.25)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(cx - portalW, ry - 10, portalW * 2, 20);
    }
    ctx.restore();

    ctx.fillStyle = runeCol;
    ctx.font = `bold ${Math.round(portalW * 0.9)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyphs = ['⌬', '◈', '⌬'];
    for (let g = 0; g < glyphs.length; g++) {
      const gy = topY + portalH * (0.25 + g * 0.25);
      const pulse = 0.6 + 0.4 * Math.sin(t * 2 + g * 1.2);
      ctx.globalAlpha = pulse;
      ctx.fillText(glyphs[g], cx, gy);
    }
    ctx.globalAlpha = 1;

    ctx.font = `bold 9px monospace`;
    ctx.fillStyle = coreCol;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 1.5);
    ctx.fillText('RIFT', cx, topY - 12);
    ctx.globalAlpha = 1;

    const capGrad = ctx.createRadialGradient(cx, topY, 0, cx, topY, portalW * 1.8);
    capGrad.addColorStop(0, coreCol);
    capGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.ellipse(cx, topY, portalW * 1.8, portalW * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function _drawExploreBgTiles(style) {
  // Tiles across the full worldWidth. The camera transform handles positioning.
  const tileW = GAME_W;
  const numTiles = Math.ceil(exploreWorldLen / tileW) + 1;
  for (let i = 0; i < numTiles; i++) {
    const tx = i * tileW;
    ctx.save();
    ctx.translate(tx, 0);
    if (style === 'city')        _expTileCity(i);
    else if (style === 'forest') _expTileForest(i);
    else if (style === 'ruins')  _expTileRuins(i);
    else                         _expTileCity(i); // fallback
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 440); ctx.lineTo(exploreWorldLen, 440); ctx.stroke();

  _drawExploreUnderground();
}

// Carve shafts and tunnel chambers out of the ground fill. Chambers stay covered until the player drops below the surface. Shafts stay visible as a hint.
function _drawExploreUnderground() {
  if (currentArena && currentArena.undergroundRects) {
    const _p1 = (typeof players !== 'undefined') ? players[0] : null;
    const _tgt = (_p1 && _p1.health > 0 && _p1.y + (_p1.h || 50) > 500) ? 1 : 0;
    window._ugRevealCur = (window._ugRevealCur || 0) + (_tgt - (window._ugRevealCur || 0)) * 0.10;
    const reveal = window._ugRevealCur;
    for (const r of currentArena.undergroundRects) {
      // Cave interior: near-black with a slight depth gradient
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      g.addColorStop(0, '#101018');
      g.addColorStop(1, '#07070c');
      ctx.fillStyle = g;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      if (r.kind === 'chamber') {
        // Torch glow spots along the chamber ceiling
        for (let tx = r.x + 90; tx < r.x + r.w - 60; tx += 190) {
          const flick = 0.55 + 0.2 * Math.sin(frameCount * 0.11 + tx);
          const tg = ctx.createRadialGradient(tx, r.y + 24, 0, tx, r.y + 24, 70);
          tg.addColorStop(0, `rgba(255,170,70,${0.30 * flick})`);
          tg.addColorStop(1, 'rgba(255,140,40,0)');
          ctx.fillStyle = tg;
          ctx.fillRect(tx - 70, r.y, 140, r.h);
          ctx.fillStyle = `rgba(255,200,110,${0.75 * flick})`;
          ctx.fillRect(tx - 2, r.y + 16, 4, 10);
        }
        // Black fog-of-war cover until the player goes underground. Ground colour would hide the cache entirely.
        if (reveal < 0.98) {
          ctx.globalAlpha = 1 - reveal;
          ctx.fillStyle = '#030305';
          ctx.fillRect(r.x, r.y, r.w, r.h);
          ctx.globalAlpha = 1;
        }
      } else if (reveal < 0.97) {
        // Pitch-black shaft opening. Paving colour would hide the cache.
        ctx.globalAlpha = 1 - reveal;
        ctx.fillStyle = '#030305';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.globalAlpha = 1;
      }
    }
  }
}

function _expTileCity(i) {
  const seed = i * 7 + 3;
  for (let b = 0; b < 5; b++) {
    const bx = (seed * 37 + b * 183) % GAME_W;
    const bh = 120 + (seed * 13 + b * 71) % 200;
    const bw = 50 + (seed * 11 + b * 43) % 80;
    ctx.fillStyle = 'rgba(20,20,35,0.9)';
    ctx.fillRect(bx, 440 - bh, bw, bh);
    ctx.fillStyle = 'rgba(180,200,255,0.18)';
    for (let wy = 440 - bh + 12; wy < 430; wy += 16) {
      for (let wx2 = bx + 6; wx2 < bx + bw - 6; wx2 += 12) {
        if ((wy * 3 + wx2 + seed) % 3 !== 0) ctx.fillRect(wx2, wy, 5, 7);
      }
    }
  }
  const lx = (seed * 59) % GAME_W;
  ctx.fillStyle = '#555560';
  ctx.fillRect(lx, 390, 4, 52);
  ctx.fillStyle = 'rgba(255,230,100,0.7)';
  ctx.beginPath(); ctx.arc(lx + 2, 392, 8, 0, Math.PI * 2); ctx.fill();
}

function _expTileForest(i) {
  const seed = i * 11 + 5;
  for (let t = 0; t < 6; t++) {
    const tx2 = (seed * 41 + t * 151) % GAME_W;
    const th  = 80 + (seed * 17 + t * 61) % 140;
    const alpha = 0.3 + (t % 3) * 0.2;
    ctx.fillStyle = `rgba(10,40,10,${alpha})`;
    ctx.fillRect(tx2, 440 - th, 8, th);
    ctx.beginPath();
    ctx.arc(tx2 + 4, 440 - th, 22 + (seed * 7 + t * 31) % 20, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(15,55,12,${alpha + 0.15})`;
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(200,200,180,0.25)';
  for (let a = 0; a < 8; a++) {
    const ax = (seed * 53 + a * 97) % GAME_W;
    const ay = 60 + (seed * 19 + a * 113) % 320;
    ctx.beginPath(); ctx.arc(ax, ay, 1.5, 0, Math.PI * 2); ctx.fill();
  }
}

function _expTileRuins(i) {
  const seed = i * 13 + 7;
  for (let p = 0; p < 4; p++) {
    const px2 = (seed * 43 + p * 197) % GAME_W;
    const ph  = 60 + (seed * 23 + p * 79) % 160;
    ctx.fillStyle = 'rgba(60,50,35,0.85)';
    ctx.fillRect(px2, 440 - ph, 22, ph);
    ctx.fillStyle = 'rgba(80,70,50,0.7)';
    ctx.fillRect(px2 - 4, 440 - ph - 8, 30, 10);
  }
  ctx.fillStyle = 'rgba(100,85,60,0.5)';
  for (let r = 0; r < 5; r++) {
    const rx = (seed * 67 + r * 113) % GAME_W;
    ctx.fillRect(rx, 435, 6 + r * 2, 5);
  }
}


// Shared depth layers: far ridges, a horizon haze and a shaded ground, all from the arena's own palette.
// Indoor arenas (void, cave, space, domains) are not in the table: ridges under a cave ceiling read as a bug.
const ARENA_DEPTH = {
  grass:      { hills: 3 }, clouds:   { hills: 2 }, ice:      { hills: 3 },
  soccer:     { hills: 2 },
  colosseum10: { hills: 2 },
  suburb:     { hills: 2 }, rural:    { hills: 3 },
  homeYard:   { hills: 2 }, homeAlley: { hills: 1 },
  city:       { hills: 2 }, megacity: { hills: 2 },
};

// Accepts '#rgb', '#rrggbb' and 'rgb(r,g,b)'. _dpMix returns rgb(), so without this a nested _dpMix() gives NaN and canvas keeps the old fill.
function _dpRgb(col) {
  const s = String(col || '#000').trim();
  const m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  const h = s.replace('#', '');
  const n = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h.padEnd(6, '0').slice(0, 6);
  return { r: parseInt(n.slice(0,2),16) || 0, g: parseInt(n.slice(2,4),16) || 0, b: parseInt(n.slice(4,6),16) || 0 };
}
function _dpMix(c1, c2, t) {
  const a = _dpRgb(c1), b = _dpRgb(c2), k = Math.max(0, Math.min(1, t));
  return 'rgb(' + Math.round(a.r + (b.r - a.r) * k) + ',' +
                  Math.round(a.g + (b.g - a.g) * k) + ',' +
                  Math.round(a.b + (b.b - a.b) * k) + ')';
}
function _dpHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

// Ridge silhouettes are static: build the points once per arena and layer.
function _dpRidge(key, layer, bgX, bgW, baseY, amp) {
  _dpRidge._cache = _dpRidge._cache || {};
  const ck = key + '|' + layer + '|' + Math.round(bgX) + '|' + Math.round(bgW) + '|' + Math.round(baseY);
  if (_dpRidge._cache[ck]) return _dpRidge._cache[ck];
  const seed = _dpHash(key + layer) * 100;
  const pts = [];
  for (let x = bgX; x <= bgX + bgW; x += 34) {
    const y = baseY
      - Math.sin((x * 0.0031) + seed) * amp
      - Math.sin((x * 0.0087) + seed * 2.3) * amp * 0.42
      - Math.sin((x * 0.019)  + seed * 4.1) * amp * 0.16;
    pts.push({ x, y });
  }
  _dpRidge._cache[ck] = pts;
  return pts;
}

function drawArenaDepth(a, bgX, bgW, bgH, groundTop) {
  const cfg = ARENA_DEPTH[currentArenaKey];
  if (!cfg) return;
  const skyLow = a.sky[a.sky.length - 1];
  const ground = a.groundColor || skyLow;
  const n = cfg.hills;

  // Haze: distance mixes toward the sky colour, which separates far from near.
  const hazeTop = Math.max(0, groundTop - 150);
  const haze = ctx.createLinearGradient(0, hazeTop, 0, groundTop);
  haze.addColorStop(0, _dpMix(skyLow, '#ffffff', 0.0).replace('rgb', 'rgba').replace(')', ',0)'));
  haze.addColorStop(1, _dpMix(skyLow, '#ffffff', 0.38).replace('rgb', 'rgba').replace(')', ',0.55)'));
  ctx.fillStyle = haze;
  ctx.fillRect(bgX, hazeTop, bgW, groundTop - hazeTop);

  // Far to near: farther ridges sit higher, are flatter, and mix more toward the sky.
  for (let i = 0; i < n; i++) {
    const t     = n === 1 ? 1 : (i / (n - 1));       // 0 = farthest
    const baseY = groundTop - 96 + t * 74;
    const amp   = 30 - t * 17;
    const par   = 0.05 + t * 0.10;                    // nearer parallaxes more
    const shift = -(typeof camXCur === 'number' ? camXCur - 450 : 0) * par;

    ctx.save();
    ctx.translate(shift, 0);
    ctx.fillStyle = _dpMix(skyLow, ground, 0.30 + t * 0.55);
    ctx.beginPath();
    const pts = _dpRidge(currentArenaKey, i, bgX - 400, bgW + 800, baseY, amp);
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p].x, pts[p].y);
    ctx.lineTo(pts[pts.length - 1].x, bgH);
    ctx.lineTo(pts[0].x, bgH);
    ctx.closePath();
    ctx.fill();
    // Sunlit crest: a hairline of lift along the top edge reads as form.
    ctx.strokeStyle = _dpMix(_dpMix(skyLow, ground, 0.3 + t * 0.55), '#ffffff', 0.22);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let p = 1; p < pts.length; p++) ctx.lineTo(pts[p].x, pts[p].y);
    ctx.stroke();
    ctx.restore();
  }
}
