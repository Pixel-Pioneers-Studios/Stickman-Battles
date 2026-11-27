'use strict';
// smb-stage3d.js: the 2.5D view, opened with ?3d. Same fights, same physics; only the drawing changes.
//
// How it fits the 2D pipeline (the Getaway City approach: the simulation stays 2D, a 3D camera looks at it):
//  - WebGL draws into an offscreen canvas. Each 3D layer is copied into the game canvas with drawImage at
//    the point the 2D layer it replaces would have painted, so the 2D canvas stays the only output and
//    every 2D layer (weapons, faces, effects, HUD, recorder, replays) still stacks the same way.
//  - The camera is built so the gameplay plane (z = 0) lands on exactly the pixels the 2D transform puts it
//    on. The eye sits above the plane with an off-axis lens, so depth recedes and platform tops show while
//    anything drawn in 2D on the plane stays aligned with the 3D set.
//  - Fighter bodies: FigureSkin hands over the solved joints (no pose math here). Each body is rendered as
//    lit capsules with an accent-coloured hull outline and composited in the body's own draw slot.
//  - Arena sets: one per base arena (js/smb-stage3d-sets.js). Other arenas keep their 2D art; bodies are 3D anywhere.
// Three.js r159 (js/vendor/three-0.159.0.min.js) is fetched only when ?3d is on, so normal play pays nothing.
// Load order: after smb-figure-skin.js. Uses canvas/ctx/currentArena/currentArenaKey at call time only.

var Stage3D = (function () {
  const WANT = typeof location !== 'undefined' && /[?&]3d\b/.test(location.search || '');
  // ?3d: three-quarter camera on arenas with a set. ?3d=high: swung further round and raised, a chase-style
  // view from above. ?3d=side: the side-on camera locked to the 2D view.
  // Nov 27: the side camera is the default (owner's pick); ?3d=angle is the three-quarter view.
  const _q3 = (typeof location !== 'undefined' && (location.search || '').match(/[?&]3d=(side|high|angle)\b/)) || null;
  // On file:// every local image is cross-origin, so the game canvas is tainted and WebGL can't upload it as
  // the three-quarter card (weapons and effects vanish). There the side view, which needs no card, stands in.
  const CARD_OK = typeof location === 'undefined' || location.protocol !== 'file:';
  const MODE = _q3 && (_q3[1] === 'angle' || _q3[1] === 'high') && CARD_OK ? 'angle' : 'side';
  let angleFrame = false;       // this frame uses the three-quarter camera
  let T = null;                 // THREE, once loaded
  let ok = false;               // renderer built
  let renderer = null, gl = null, camera = null, bodyScene = null;
  let rig = [];                 // lights and shadow proxies, moved into whichever set scene is drawing
  let W0 = null, W0inv = null;  // world transform for this frame, and its inverse
  let cw = 0, ch = 0;           // canvas pixel size this frame
  let ctx0 = null;              // the game context this frame (paint hooks only fire for it)
  let inWorld = false;
  let ownsThisFrame = false;

  // Camera shape, in units of the visible world height. D: eye distance. LIFT: eye height above centre.
  const CAM_D = 1.6, CAM_LIFT = 0.17;
  // Body depth: near limbs come toward the camera, far limbs go back. Units are world px.
  const Z_NEAR = 4, Z_FAR = -5;
  let OUTLINE = 1.0;          // hull thickness, world px (the 2D stroke is 1.85 wide, centred)
  // Three-quarter camera: swung round to the right and raised, looking at the 2D camera's centre.
  const HIGH = !!(_q3 && _q3[1] === 'high');
  let ANG_YAW = HIGH ? 0.80 : 0.30, ANG_PITCH = HIGH ? 0.62 : 0.10, ANG_FOV = HIGH ? 24 : 30, ANG_FRAME = HIGH ? 1.05 : 1.12;
  // Dev tuning: &cam=yaw,pitch[,fov[,frame]] overrides the three-quarter camera.
  const _camQ = typeof location !== 'undefined' && (location.search || '').match(/[?&]cam=([-\d.,]+)/);
  if (_camQ) {
    const v = _camQ[1].split(',').map(Number);
    if (isFinite(v[0])) ANG_YAW = v[0];
    if (isFinite(v[1])) ANG_PITCH = v[1];
    if (isFinite(v[2])) ANG_FOV = v[2];
    if (isFinite(v[3])) ANG_FRAME = v[3];
  }

  function load() {
    if (typeof document === 'undefined') return;
    const s = document.createElement('script');
    s.src = './js/vendor/three-0.159.0.min.js';
    if (!CARD_OK) console.warn('[Stage3D] opened from file://, so the three-quarter view is off; serve over http for it');
    s.onload = () => { try { init(); } catch (e) { console.warn('[Stage3D] init failed', e); ok = false; } };
    s.onerror = () => console.warn('[Stage3D] could not load three.js; staying 2D');
    document.head.appendChild(s);
  }

  // ---------- Setup ----------

  let sun = null, bodySun = null, hemiL = null;
  let cyl = null, sph = null, cylO = null, sphO = null;      // body pass: fill + outline
  let pCyl = null, pSph = null;                              // shadow proxies in the world pass
  const MAX_PARTS = 64, MAX_PROXY = 1200, MAX_BATCH = 1500;
  let bCyl = null, bSph = null, bCylO = null, bSphO = null;  // three-quarter mode: all bodies, one batch
  let cardCanvas = null, cardCtx = null, cardTex = null, cardMesh = null;
  // Held weapons in the three-quarter view: the sprite as a thick slab at the hand (see paintWeapon).
  const MAX_WEAP = 24, WEAP_LAYERS = 7, WEAP_Z = Z_NEAR + 2.5, WEAP_THICK = 4;
  let weapPool = [], weapN = 0, weapGeo = null, glowPool = [], glowGeo = null;
  const _weapMats = new WeakMap(), _weapGlows = new WeakMap(), _weapCrops = new WeakMap();
  const GLOW_W = 6;             // glow reach, world px (the 2D shadowBlur halo)
  // Whip rope (three-quarter view): tapered capsules with an ink hull, like the bodies.
  const MAX_ROPE = 160;
  let ropeT = null, braidM = null, braidN = 0;
  const BRAID_COL = 0xc07a34, CRACK_COL = 0xf2c230;
  let sideT = null, batchT = null, tgt = null;
  let _m4, _q, _v, _s, _up, _col;

  function init() {
    T = window.THREE;
    if (!T) return;
    gl = document.createElement('canvas');
    gl.width = 900; gl.height = 520;
    renderer = new T.WebGLRenderer({ canvas: gl, alpha: true, antialias: true, premultipliedAlpha: true });
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.info.autoReset = false;     // counted per frame (reset in beginFrame), so the dev readout covers every pass
    renderer.shadowMap.autoUpdate = true;

    camera = new T.PerspectiveCamera(30, 900 / 520, 10, 20000);
    camera.matrixAutoUpdate = true;

    _m4 = new T.Matrix4(); _q = new T.Quaternion(); _v = new T.Vector3(); _s = new T.Vector3();
    _up = new T.Vector3(0, 1, 0); _col = new T.Color();

    // World pass: the arena set, lit from the upper left (style guide: lighting), with soft shadows.
    const hemi = new T.HemisphereLight(0xd8ecff, 0x8a7448, 1.45);   // warm bounce keeps island bellies brown, not black
    sun = new T.DirectionalLight(0xfff1d8, 1.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.6;
    sun.shadow.camera.layers.enable(1);          // proxies live on layer 1: shadow-only

    // Body pass: same light direction, no shadows (bodies are tiny, and they cast into the world pass instead).
    bodyScene = new T.Scene();
    bodyScene.add(new T.HemisphereLight(0xbcd6ff, 0x20242c, 0.55));
    bodySun = new T.DirectionalLight(0xfff1d8, 2.6);
    bodyScene.add(bodySun, bodySun.target);

    const cg = new T.CylinderGeometry(1, 1, 1, 12, 1, true);
    const sg = new T.SphereGeometry(1, 16, 10);
    // Locked fighter look: near-black body, neon outline in the accent. Specular gives the volume.
    const fill = new T.MeshStandardMaterial({ color: 0x0b0e1c, roughness: 0.34, metalness: 0.05 });
    const line = new T.MeshBasicMaterial({ color: 0xffffff, side: T.BackSide });
    cyl  = new T.InstancedMesh(cg, fill, MAX_PARTS);
    sph  = new T.InstancedMesh(sg, fill, MAX_PARTS);
    cylO = new T.InstancedMesh(cg, line, MAX_PARTS);
    sphO = new T.InstancedMesh(sg, line, MAX_PARTS);
    for (const m of [cyl, sph, cylO, sphO]) { m.frustumCulled = false; m.count = 0; bodyScene.add(m); }
    cylO.setColorAt(0, _col.set(0xffffff)); sphO.setColorAt(0, _col);

    const shadowMat = new T.MeshBasicMaterial({ color: 0x000000 });
    pCyl = new T.InstancedMesh(cg, shadowMat, MAX_PROXY);
    pSph = new T.InstancedMesh(sg, shadowMat, MAX_PROXY);
    for (const m of [pCyl, pSph]) {
      m.frustumCulled = false; m.count = 0; m.castShadow = true; m.layers.set(1);
    }
    // Three-quarter mode: every body this frame goes into one batch in the world scene (real shadows),
    // and the 2D world layers (weapons, faces, effects) ride on a card at z = 0.
    const fillW = fill.clone();
    bCyl  = new T.InstancedMesh(cg, fillW, MAX_BATCH);
    bSph  = new T.InstancedMesh(sg, fillW, MAX_BATCH);
    bCylO = new T.InstancedMesh(cg, line, MAX_BATCH);
    bSphO = new T.InstancedMesh(sg, line, MAX_BATCH);
    for (const m of [bCyl, bSph, bCylO, bSphO]) { m.frustumCulled = false; m.count = 0; }
    bCyl.castShadow = bSph.castShadow = true;
    bCylO.setColorAt(0, _col.set(0xffffff)); bSphO.setColorAt(0, _col);
    cardCanvas = document.createElement('canvas');
    cardCtx = cardCanvas.getContext('2d');
    cardMesh = new T.Mesh(new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
    cardMesh.frustumCulled = false;
    cardMesh.renderOrder = 999;
    cardMesh.visible = false;
    sideT  = { cyl, sph, cylO, sphO, max: MAX_PARTS, nc: 0, ns: 0, proxy: true, ac: null };
    batchT = { cyl: bCyl, sph: bSph, cylO: bCylO, sphO: bSphO, max: MAX_BATCH, nc: 0, ns: 0, proxy: false, ac: null };
    hemiL = hemi;
    _initWeapons();
    rig = [hemi, sun, sun.target, pCyl, pSph, bCyl, bSph, bCylO, bSphO, cardMesh, ...weapPool, ...glowPool,
           ropeT.cyl, ropeT.sph, ropeT.cylO, ropeT.sphO, braidM];
    ok = true;
  }

  // ---------- Camera: the z = 0 plane maps exactly onto the 2D world transform ----------

  let _vh = 520, _cx = 450, _cy = 260;
  let _fogNear = 1150;          // where haze starts this frame: just behind the farthest point of the play plane in view
  function placeCamera() {
    const s = Math.hypot(W0.a, W0.b) || 1;
    const roll = Math.atan2(W0.b, W0.a);
    const c = W0inv.transformPoint({ x: cw / 2, y: ch / 2 });
    _cx = c.x; _cy = c.y;
    const vh = ch / s; _vh = vh;
    const D = vh * CAM_D, lift = vh * CAM_LIFT;
    _fogNear = D + 320;
    // y-down world to y-up 3D. A clockwise canvas roll is a camera roll the same way round.
    const ux = -Math.sin(roll), uy = Math.cos(roll);
    camera.position.set(_cx + ux * lift, -_cy + uy * lift, D);
    camera.rotation.set(0, 0, roll);
    camera.updateMatrixWorld(true);
    const n = Math.max(4, D * 0.04), k = n / D;
    const hw = cw / (2 * s), hh = ch / (2 * s);
    camera.near = n; camera.far = D + 12000;
    camera.projectionMatrix.makePerspective(-hw * k, hw * k, (hh - lift) * k, (-hh - lift) * k, n, D + 12000);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();

    // Key light from the upper left and in front, following the shot so the shadow map stays sharp.
    const L = vh * 2.2;
    for (const lt of [sun, bodySun]) {
      // Upper left, from the side and high: tops lit, fronts a step down, right sides in shade, and
      // platforms drop their shadow onto the floor under them.
      lt.position.set(_cx - L * 0.7, -_cy + L * 0.95, L * 0.3);
      lt.target.position.set(_cx, -_cy, 0);
      lt.target.updateMatrixWorld();
    }
    const sc = sun.shadow.camera, half = Math.max(500, vh * 1.25);
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half;
    sc.near = 10; sc.far = L * 4;
    sc.updateProjectionMatrix();
  }

  // ---------- Frame hooks (smb-loop-core.js) ----------

  function ready() { return ok; }

  function beginFrame(m, w, h) {
    if (!ok) return;
    W0 = m; W0inv = m.inverse(); cw = w; ch = h; ctx0 = ctx;
    renderer.info.reset();
    if (gl.width !== w || gl.height !== h) renderer.setSize(w, h, false);
    placeCamera();
    inWorld = true;
    ownsThisFrame = !!(currentArena && _sets[currentArenaKey] && !currentArena.designerBase
                       && currentArena.storyLevel == null && !currentArena.isExploreArena);
    _proxyN = 0;
    angleFrame = MODE === 'angle' && ownsThisFrame;
    if (typeof frameCount === 'number') { if (frameCount - _fit.f > 2) _fit.live = false; if (angleFrame) _fit.f = frameCount; }
    if (angleFrame) {
      // The 2D world layers draw onto a clear canvas this frame; endFrame() lifts them onto the card.
      placeCameraAngle();
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h); ctx.restore();
      batchT.nc = batchT.ns = 0;
      weapN = 0; ropeT.nc = ropeT.ns = 0; braidN = 0;
      _hookText(ctx); _textN = 0; _deferText = true;
    }
  }

  function _aimCamera(x, y, d) {
    camera.position.set(x + Math.sin(ANG_YAW) * Math.cos(ANG_PITCH) * d,
                        -y + Math.sin(ANG_PITCH) * d,
                        Math.cos(ANG_YAW) * Math.cos(ANG_PITCH) * d);
    camera.up.set(0, 1, 0);
    camera.lookAt(x, -y, 0);
    camera.updateMatrixWorld(true);
  }
  // Live fighters' box in world px, padded for weapons over the head; null when nobody is up.
  const _fit = { live: false, d: 0, x: 0, y: 0, f: -9 };
  function _fighterBox() {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of (typeof players !== 'undefined' ? players : [])) {
      if (!p || p.health <= 0 || !isFinite(p.x) || !isFinite(p.y)) continue;
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x + (p.w || 0));
      y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y + (p.h || 0));
    }
    if (x0 === Infinity) return null;
    return { x0: x0 - 50, x1: x1 + 50, y0: y0 - 45, y1: y1 + 12 };
  }

  function placeCameraAngle() {
    const s = Math.hypot(W0.a, W0.b) || 1;
    const c = W0inv.transformPoint({ x: cw / 2, y: ch / 2 });
    _cx = c.x; _cy = c.y;
    let vh = ch / s; _vh = vh;
    if (HIGH) {
      // From above, the 2D framing's headroom pushes the fighters off-centre: aim mostly at them instead.
      let n = 0, mx = 0, my = 0;
      for (const p of (typeof players !== 'undefined' ? players : [])) {
        if (!p || p.health <= 0) continue;
        mx += p.x + (p.w || 0) / 2; my += p.y + (p.h || 0) / 2; n++;
      }
      if (n) { _cx += (mx / n - _cx) * 0.7; _cy += (my / n - _cy) * 0.7; }
    }
    camera.fov = ANG_FOV; camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
    const dist2D = (vh * 0.5 * ANG_FRAME) / Math.tan(ANG_FOV * Math.PI / 360);
    let dist = dist2D;
    if (!HIGH) {
      // Frame the fighters, not the 2D shot: at a low angle the ground in front and the sky above fill the
      // frame, so the 2D zoom leaves fighters small. Fit their box through the real projection, low in the
      // frame so the sky shows, never wider than the 2D shot and at most 1.5x closer (the card of weapons and
      // effects is 2D-resolution and blurs past that).
      const b = _fighterBox();
      if (b) {
        const th = Math.tan(ANG_FOV * Math.PI / 360);
        let d = dist2D, ax = 0, ay = 0;
        for (let it = 0; it < 3; it++) {
          ax = (b.x0 + b.x1) / 2; ay = (b.y0 + b.y1) / 2 - d * th * 0.22;
          _aimCamera(ax, ay, d);
          let need = 0.01;
          for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) {
            _v.set(x, -y, 0).project(camera);
            need = Math.max(need, Math.abs(_v.x) / 0.80, _v.y > 0 ? _v.y / 0.62 : -_v.y / 0.80);
          }
          d = Math.min(dist2D, Math.max(dist2D / 1.5, d * need));
        }
        if (!_fit.live) { _fit.d = d; _fit.x = ax; _fit.y = ay; }
        else { _fit.d += (d - _fit.d) * 0.08; _fit.x += (ax - _fit.x) * 0.10; _fit.y += (ay - _fit.y) * 0.10; }
        _fit.live = true;
        dist = _fit.d; _cx = _fit.x; _cy = _fit.y;
        _vh = vh = dist * th * 2 / ANG_FRAME;
      } else _fit.live = false;
    }
    camera.near = Math.max(4, dist * 0.04); camera.far = dist + 20000;
    // Haze starts just behind the play plane.
    _fogNear = dist + 120;
    camera.updateProjectionMatrix();
    _aimCamera(_cx, _cy, dist);
    const L = vh * 2.2;
    // Raking key: still upper left, but from the side, not over the camera's shoulder. Tops lit, camera-facing
    // fronts a step down, right-hand sides in shade, so every box and column shows three values, not one.
    sun.position.set(_cx - L * 0.85, -_cy + L * 0.8, L * 0.22);
    sun.target.position.set(_cx, -_cy, 0);
    sun.target.updateMatrixWorld();
    const sc = sun.shadow.camera, half = Math.max(500, vh * 1.25);
    sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half;
    sc.near = 10; sc.far = L * 4;
    sc.updateProjectionMatrix();
  }

  // Lift the frame's 2D world layers onto the card, then draw the whole 3D scene in their place.
  function _compositeAngle() {
    const set = _sets[currentArenaKey];
    if (!set) return;
    if (cardCanvas.width !== cw || cardCanvas.height !== ch) {
      cardCanvas.width = cw; cardCanvas.height = ch;
      if (cardTex) cardTex.dispose();
      cardTex = new T.CanvasTexture(cardCanvas);
      cardTex.colorSpace = T.SRGBColorSpace;
      cardMesh.material.map = cardTex; cardMesh.material.needsUpdate = true;
    }
    cardCtx.setTransform(1, 0, 0, 1, 0, 0);
    cardCtx.clearRect(0, 0, cw, ch);
    cardCtx.drawImage(canvas, 0, 0);
    cardTex.needsUpdate = true;
    // Card corners: the canvas corners, back through the 2D transform onto the z = 0 plane.
    const pos = cardMesh.geometry.attributes.position;
    const corners = [[0, 0], [cw, 0], [0, ch], [cw, ch]];          // PlaneGeometry order: TL TR BL BR
    for (let i = 0; i < 4; i++) {
      const pt = W0inv.transformPoint({ x: corners[i][0], y: corners[i][1] });
      pos.setXYZ(i, pt.x, -pt.y, 0.5);
    }
    pos.needsUpdate = true;
    cardMesh.visible = true;
    for (const t of [batchT]) {
      t.cyl.count = t.cylO.count = t.nc; t.sph.count = t.sphO.count = t.ns;
      for (const m of [t.cyl, t.sph, t.cylO, t.sphO]) {
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
    }
    pCyl.count = pSph.count = 0;
    for (let i = 0; i < weapPool.length; i++) { weapPool[i].visible = i < weapN; if (i >= weapN) glowPool[i].visible = false; }
    ropeT.cyl.count = ropeT.cylO.count = ropeT.nc; ropeT.sph.count = ropeT.sphO.count = ropeT.ns;
    for (const m of [ropeT.cyl, ropeT.sph, ropeT.cylO, ropeT.sphO]) m.instanceMatrix.needsUpdate = true;
    braidM.count = braidN; braidM.instanceMatrix.needsUpdate = true;
    if (braidM.instanceColor) braidM.instanceColor.needsUpdate = true;
    _paintDecals(set.scene);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, cw, ch);
    renderer.render(set.scene, camera);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(gl, 0, 0);
    ctx.restore();
    _replayText();
  }

  // ---------- Text in the three-quarter view ----------
  // On the card, labels (damage numbers, names, ammo, READY) would skew and shrink with the angle. While an
  // angle frame draws, text on the game context is held back with its full drawing state, then redrawn
  // after the 3D render: same size and style as the 2D view, facing the screen, at the projected point.
  let _deferText = false, _textN = 0;
  const _texts = [];
  const _TEXT_STATE = ['font', 'fillStyle', 'strokeStyle', 'lineWidth', 'lineJoin', 'miterLimit', 'textAlign',
    'textBaseline', 'globalAlpha', 'globalCompositeOperation', 'shadowColor', 'shadowBlur', 'shadowOffsetX',
    'shadowOffsetY', 'filter', 'letterSpacing', 'direction'];
  function _hookText(c) {
    if (c._s3Text) return;
    c._s3Text = true;
    const fill = c.fillText, stroke = c.strokeText;
    c.fillText = function (t, x, y, mw) {
      if (_deferText && this === ctx0) { _holdText(this, 0, t, x, y, mw); return; }
      return mw === undefined ? fill.call(this, t, x, y) : fill.call(this, t, x, y, mw);
    };
    c.strokeText = function (t, x, y, mw) {
      if (_deferText && this === ctx0) { _holdText(this, 1, t, x, y, mw); return; }
      return mw === undefined ? stroke.call(this, t, x, y) : stroke.call(this, t, x, y, mw);
    };
    c._s3Fill = fill; c._s3Stroke = stroke;
  }
  function _holdText(c, op, t, x, y, mw) {
    let e = _texts[_textN];
    if (!e) { e = { st: {} }; _texts[_textN] = e; }
    _textN++;
    e.op = op; e.t = t; e.x = x; e.y = y; e.mw = mw; e.M = c.getTransform();
    for (const k of _TEXT_STATE) e.st[k] = c[k];
  }
  function _replayText() {
    _deferText = false;
    if (!_textN) return;
    const c = ctx;
    c.save();
    for (let i = 0; i < _textN; i++) {
      const e = _texts[i], M = e.M;
      const lx = M.a * e.x + M.c * e.y, ly = M.b * e.x + M.d * e.y;
      let px = lx + M.e, py = ly + M.f;
      // A transform with no translation is screen space (HUD text drawn in the world pass): it stays put.
      if (M.e !== 0 || M.f !== 0) {
        const w = W0inv.transformPoint({ x: px, y: py });
        _v.set(w.x, -w.y, 0.5).project(camera);
        if (_v.z > 1 || _v.z < -1) continue;
        px = (_v.x + 1) * 0.5 * cw; py = (1 - _v.y) * 0.5 * ch;
      }
      c.setTransform(M.a, M.b, M.c, M.d, px - lx, py - ly);
      for (const k of _TEXT_STATE) if (c[k] !== e.st[k] && e.st[k] !== undefined) c[k] = e.st[k];
      const f = e.op ? c._s3Stroke : c._s3Fill;
      if (e.mw === undefined) f.call(c, e.t, e.x, e.y); else f.call(c, e.t, e.x, e.y, e.mw);
    }
    c.restore();
    _textN = 0;
  }

  function ownsArena() { return ok && inWorld && ownsThisFrame; }

  // Where a world point lands on screen in this frame's three-quarter view, or null when the view is
  // side-on (the 2D camera math already holds). For screen-space overlays drawn after endFrame().
  const _sp = { x: 0, y: 0 };
  function screenPoint(wx, wy) {
    if (!ok || !angleFrame) return null;
    _v.set(wx, -wy, 0.5).project(camera);
    if (_v.z > 1 || _v.z < -1) return null;
    _sp.x = (_v.x + 1) * 0.5 * cw; _sp.y = (1 - _v.y) * 0.5 * ch;
    return _sp;
  }

  // ---------- Ground marks in the three-quarter view ----------
  // Blood stains, impact scars, skid scuffs and meteor scorch would stand upright on the card. In angle frames
  // the 2D painters skip them (groundDecals()) and each surface with marks gets a canvas texture lying on its
  // top: x stays x, and the mark's thin 2D height is spread into depth. No marks: every decal hides, no painting.
  const DEC_DEPTH = 56;          // world px of top surface the texture covers, centred on the fighters' line
  const DEC_EVERY = 4;           // repaint at most this often unless the mark count changes (fades are slow)
  const _decals = new Map();     // platform -> { cv, cx, tex, mesh, k, used }
  let _decN = -1, _decAge = 0;

  function groundDecals() { return ok && inWorld && angleFrame; }

  function _surfaceAt(x, y) {
    const pls = currentArena && currentArena.platforms;
    if (!pls) return null;
    for (const pl of pls) {
      if (!pl.isFloorDisabled && !pl.noDraw && Math.abs(pl.y - y) < 2 && x >= pl.x - 2 && x <= pl.x + pl.w + 2) return pl;
    }
    return null;
  }
  function _decalFor(pl, scene) {
    let d = _decals.get(pl);
    const k = Math.min(2, 2048 / Math.max(1, pl.w));
    if (d && d.k !== k) { _dropDecal(pl, d); d = null; }
    if (!d) {
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(pl.w * k); cv.height = Math.ceil(DEC_DEPTH * k);
      const tex = new T.CanvasTexture(cv);
      tex.colorSpace = T.SRGBColorSpace;
      const mat = toon(0xffffff);
      mat.map = tex; mat.transparent = true; mat.depthWrite = false;
      mat.polygonOffset = true; mat.polygonOffsetFactor = -2; mat.polygonOffsetUnits = -2;
      const mesh = new T.Mesh(new T.PlaneGeometry(1, 1), mat);
      mesh.rotation.x = -Math.PI / 2;      // texture top = back of the surface, bottom = toward the camera
      mesh.receiveShadow = true;
      mesh.renderOrder = 1;
      d = { cv, cx: cv.getContext('2d'), tex, mesh, k, used: false };
      _decals.set(pl, d);
    }
    if (d.mesh.parent !== scene) scene.add(d.mesh);
    return d;
  }
  function _dropDecal(pl, d) {
    if (d.mesh.parent) d.mesh.parent.remove(d.mesh);
    d.mesh.geometry.dispose(); d.mesh.material.dispose(); d.tex.dispose();
    _decals.delete(pl);
  }
  // Depth for a mark that has none: stable per x, so a stain doesn't wander as it fades.
  function _zj(x, span) { const s = Math.sin(x * 12.9898) * 43758.5453; return (s - Math.floor(s) - 0.5) * span; }

  function _paintDecals(scene) {
    const stains = typeof bloodStains !== 'undefined' ? bloodStains : null;
    const scars = typeof surfaceScars !== 'undefined' ? surfaceScars : null;
    const scuffs = typeof _wrScuffs !== 'undefined' ? _wrScuffs : null;
    const cx = typeof cxEffects !== 'undefined' ? cxEffects : null;
    let n = (stains ? stains.length : 0) + (scars ? scars.length : 0) + (scuffs ? scuffs.length : 0);
    if (cx) for (const e of cx) if (e.craters) n += e.craters.length;
    // Performance Mode turns particles off; marks go with them.
    if (!n || (typeof settings !== 'undefined' && settings.particles === false)) {
      if (_decN !== 0) for (const d of _decals.values()) d.mesh.visible = false;
      _decN = 0;
      return;
    }
    for (const [pl, d] of _decals) {
      if (currentArena.platforms.indexOf(pl) < 0) _dropDecal(pl, d);
      else d.mesh.position.set(pl.x + pl.w / 2, -pl.y + 0.4, 0);
    }
    if (n === _decN && ++_decAge < DEC_EVERY) return;
    _decN = n; _decAge = 0;
    for (const d of _decals.values()) d.used = false;
    const begin = (pl) => {
      if (!pl || pl.isFloorDisabled || pl.noDraw || currentArena.platforms.indexOf(pl) < 0) return null;
      const d = _decalFor(pl, scene);
      if (!d.used) {
        d.used = true;
        d.cx.setTransform(1, 0, 0, 1, 0, 0);
        d.cx.clearRect(0, 0, d.cv.width, d.cv.height);
        d.mesh.scale.set(pl.w, DEC_DEPTH, 1);
        d.mesh.position.set(pl.x + pl.w / 2, -pl.y + 0.4, 0);
      }
      // Surface space: x along the platform from its left end, z toward the camera from the fighters' line.
      d.cx.setTransform(d.k, 0, 0, d.k, 0, DEC_DEPTH / 2 * d.k);
      return d.cx;
    };

    if (stains) for (const s of stains) {
      const pl = _surfaceAt(s.x, s.y), g = pl && begin(pl);
      if (!g) continue;
      g.globalAlpha = Math.min(0.55, (s.life / s.maxLife) * 0.7);
      g.fillStyle = '#660000';
      g.beginPath();
      g.ellipse(s.x - pl.x, _zj(s.x, 22), s.r, s.r * 0.72, 0, 0, Math.PI * 2);
      g.fill();
    }
    if (scars) for (const s of scars) {
      if (s.v) continue;                         // wall cracks stay on the card
      const g = begin(s.pl);
      if (!g) continue;
      const t = s.life / s.maxLife, alpha = t > 0.75 ? 1 : t / 0.75;
      // Cracks were built with their spread squashed to the slab's 2D thickness; on the top they open out.
      const ox = s.lx, Z = 2.6;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.globalAlpha = 0.13 * alpha;
      g.fillStyle = s.crackColor || '#000000';
      g.beginPath();
      g.ellipse(ox, 0, 3 + s.power * 4, 2.6 + s.power * 3, 0, 0, Math.PI * 2);
      g.fill();
      for (const arm of s.arms) {
        const P = arm.pts;
        g.globalAlpha = (s.rimAlpha == null ? 0.13 : s.rimAlpha) * alpha;
        g.strokeStyle = s.rimColor || '#ffffff';
        g.lineWidth = 1.1;
        g.beginPath();
        g.moveTo(ox + P[0].x + 0.6, P[0].y * Z + 0.6);
        for (let i = 1; i < P.length; i++) g.lineTo(ox + P[i].x + 0.6, P[i].y * Z + 0.6);
        g.stroke();
        g.globalAlpha = 0.46 * alpha;
        g.strokeStyle = s.crackColor || '#000000';
        for (let i = 1; i < P.length; i++) {
          g.lineWidth = Math.max(0.35, (1.4 + s.power * 0.4) * (1 - (i - 0.5) / P.length));
          g.beginPath();
          g.moveTo(ox + P[i - 1].x, P[i - 1].y * Z);
          g.lineTo(ox + P[i].x, P[i].y * Z);
          g.stroke();
        }
        if (arm.branch) {
          const B = arm.branch;
          g.globalAlpha = 0.32 * alpha;
          g.lineWidth = 0.8;
          g.beginPath();
          g.moveTo(ox + B[0].x, B[0].y * Z);
          for (let i = 1; i < B.length; i++) g.lineTo(ox + B[i].x, B[i].y * Z);
          g.stroke();
        }
      }
    }
    if (scuffs) for (const s of scuffs) {
      const g = begin(s.pl);
      if (!g || s.lx1 - s.lx0 < 1) continue;
      const t = s.life / s.maxLife, a = t > 0.7 ? 1 : t / 0.7;
      g.globalAlpha = 0.5 * a;
      g.fillStyle = s.color;
      g.fillRect(s.lx0, -s.w, s.lx1 - s.lx0, s.w * 2);
      g.globalAlpha = 0.28 * a;
      g.fillRect(s.lx0 + 2, s.w + 1, Math.max(0, s.lx1 - s.lx0 - 4), 0.8);
    }
    if (cx) for (const e of cx) if (e.craters) for (const C of e.craters) {
      const pl = _surfaceAt(C.x, C.y), g = pl && begin(pl);
      if (!g) continue;
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 46);
      gr.addColorStop(0, 'rgba(255,120,40,1)'); gr.addColorStop(0.7, 'rgba(255,120,40,0.85)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
      g.save();
      g.translate(C.x - pl.x, 0); g.scale(1, DEC_DEPTH / 2 / 46);
      g.globalAlpha = C.life / 80 * 0.6;
      g.fillStyle = gr;
      g.fillRect(-46, -46, 92, 92);
      g.restore();
    }
    for (const d of _decals.values()) {
      d.mesh.visible = d.used;
      if (d.used) { d.cx.globalAlpha = 1; d.tex.needsUpdate = true; }
    }
  }

  // Replaces drawBackground() + drawPlatforms() for an arena with a 3D set.
  function drawWorld() {
    const set = _sets[currentArenaKey];
    if (!set) return;
    set.sync(currentArena);
    for (const o of rig) if (o.parent !== set.scene) set.scene.add(o);
    // 2D gameplay layers the set keeps (hazard floors, warnings, boss walls). In the angle view they land on
    // the card with the other world layers; in the side view they paint over the set like the 2D backdrop.
    if (angleFrame) { if (set.overlay) set.overlay(); return; }   // the set is drawn at endFrame
    cardMesh.visible = false;
    bCyl.count = bSph.count = bCylO.count = bSphO.count = 0;
    commitProxies();
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, cw, ch);
    renderer.render(set.scene, camera);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(gl, 0, 0);
    ctx.restore();
    if (set.overlay) set.overlay();
  }

  function endFrame() {
    if (!ok) return;
    if (_pendingFar) _renderBodies(null);
    if (angleFrame) _compositeAngle();
    if (weapN) { for (let i = 0; i < weapN; i++) weapPool[i].visible = glowPool[i].visible = false; weapN = 0; }   // never left in a side-view render
    if (ropeT && (ropeT.nc || ropeT.ns)) { ropeT.nc = ropeT.ns = 0; for (const m of [ropeT.cyl, ropeT.sph, ropeT.cylO, ropeT.sphO]) m.count = 0; }
    if (braidN) { braidN = 0; braidM.count = 0; }
    _deferText = false; _textN = 0;
    inWorld = false;
    _lastProxyN = _proxyN;
  }

  // ---------- Bodies (smb-figure-skin.js hooks) ----------

  // A body record: chains of joints with radii, plus spheres. Filled by FigureSkin while it builds.
  function wantsRecord() { return ok && inWorld && ctx === ctx0; }

  let _pendingFar = null;
  // Called from FigureSkin.paint(). Returns true when the 3D view took the body (skip the 2D paint).
  function paintBody(b, p, far, g, alpha) {
    if (!ok || !inWorld || g || ctx !== ctx0 || !b.r3) return false;
    if ((alpha !== undefined && alpha < 1) || p.fill) return false;    // ghosts and tinted art stay 2D
    const rec = { r3: b.r3, accent: p.accent, far: !!far, M: ctx.getTransform() };
    if (angleFrame) {
      tgt = batchT; tgt.ac = _accent(p.accent);
      _addRec(rec);
      return true;
    }
    if (far) {
      if (_pendingFar) _renderBodies(null);
      _pendingFar = rec;
      return true;
    }
    _renderBodies(rec);
    return true;
  }

  // Shadow proxies: every body this frame becomes a shadow caster for the next world pass.
  let _proxyN = 0, _lastProxyN = 0;
  const _proxyBuf = [];          // [kind, x, y, z, r, len, qx, qy, qz, qw] flattened per part
  function commitProxies() {
    // Proxies from the previous frame's bodies (bodies are solved after the world pass).
    let nc = 0, ns = 0;
    for (let i = 0; i < _lastProxyN; i++) {
      const e = _proxyBuf[i];
      if (!e) continue;
      if (e.k === 0 && nc < MAX_PROXY) { pCyl.setMatrixAt(nc++, e.m); }
      else if (e.k === 1 && ns < MAX_PROXY) { pSph.setMatrixAt(ns++, e.m); }
    }
    pCyl.count = nc; pSph.count = ns;
    pCyl.instanceMatrix.needsUpdate = true; pSph.instanceMatrix.needsUpdate = true;
  }
  function _pushProxy(k, m) {
    if (!ownsThisFrame) return;
    let e = _proxyBuf[_proxyN];
    if (!e) { e = { k: 0, m: new T.Matrix4() }; _proxyBuf[_proxyN] = e; }
    e.k = k; e.m.copy(m);
    _proxyN++;
  }

  const _cache = new Map();
  function _accent(hex) {
    let c = _cache.get(hex);
    if (!c) { c = new T.Color(); try { c.setStyle(hex || '#888'); } catch (e) { c.set(0x888888); } _cache.set(hex, c); }
    return c;
  }

  let _bx0, _by0, _bx1, _by1;
  function _bound(px, py, pr) {
    if (px - pr < _bx0) _bx0 = px - pr;
    if (py - pr < _by0) _by0 = py - pr;
    if (px + pr > _bx1) _bx1 = px + pr;
    if (py + pr > _by1) _by1 = py + pr;
  }
  // One body (far + near), one render, one composite. Bounds keep the clear and copy small.
  function _renderBodies(near) {
    const far = _pendingFar; _pendingFar = null;
    tgt = sideT; tgt.nc = 0; tgt.ns = 0; tgt.ac = null;
    _bx0 = Infinity; _by0 = Infinity; _bx1 = -Infinity; _by1 = -Infinity;
    let accent = null;
    if (far) { _addRec(far); accent = far.accent; }
    if (near) { _addRec(near); accent = near.accent; }
    const _nc = tgt.nc, _ns = tgt.ns;
    if (!_nc && !_ns) return;
    const ac = _accent(accent);
    for (let i = 0; i < _nc; i++) cylO.setColorAt(i, ac);
    for (let i = 0; i < _ns; i++) sphO.setColorAt(i, ac);
    cyl.count = cylO.count = _nc; sph.count = sphO.count = _ns;
    for (const m of [cyl, sph, cylO, sphO]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    const x0 = Math.max(0, Math.floor(_bx0 - 3)), y0 = Math.max(0, Math.floor(_by0 - 3));
    const x1 = Math.min(cw, Math.ceil(_bx1 + 3)), y1 = Math.min(ch, Math.ceil(_by1 + 3));
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    renderer.setViewport(0, 0, cw, ch);
    renderer.setScissor(x0, ch - y1, w, h);
    renderer.setScissorTest(true);
    renderer.render(bodyScene, camera);
    renderer.setScissorTest(false);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(gl, x0, y0, w, h, x0, y0, w, h);
    ctx.restore();
  }

  function _addRec(rec) {
    const M = rec.M;
    // local (fighter draw space) to world: W0^-1 * M. Local to pixels: M.
    const Q = W0inv.multiply(M);
    const rs = Math.sqrt(Math.abs(Q.a * Q.d - Q.b * Q.c)) || 1;
    const ps = Math.sqrt(Math.abs(M.a * M.d - M.b * M.c)) || 1;
    const wx = (x, y) => Q.a * x + Q.c * y + Q.e;
    const wy = (x, y) => Q.b * x + Q.d * y + Q.f;
    for (const c of rec.r3.chains) {
      const z = rec.far ? Z_FAR : (c.limb ? Z_NEAR : 0);
      const n = c.pts.length;
      for (let i = 0; i < n; i++) {
        const pt = c.pts[i], r = c.r[i];
        _sphere(wx(pt.x, pt.y), wy(pt.x, pt.y), z, r * rs);
        _bound(M.a * pt.x + M.c * pt.y + M.e, M.b * pt.x + M.d * pt.y + M.f, (r + OUTLINE + 1) * ps);
        if (i < n - 1) {
          const q = c.pts[i + 1];
          _bone(wx(pt.x, pt.y), wy(pt.x, pt.y), wx(q.x, q.y), wy(q.x, q.y), z, (r + c.r[i + 1]) * 0.5 * rs);
        }
      }
    }
    for (const s of rec.r3.balls) {
      _sphere(wx(s.x, s.y), wy(s.x, s.y), rec.far ? Z_FAR : 0, s.r * rs);
      _bound(M.a * s.x + M.c * s.y + M.e, M.b * s.x + M.d * s.y + M.f, (s.r + OUTLINE + 1) * ps);
    }
  }

  function _sphere(x, y, z, r) {
    const t = tgt;
    if (t.ns >= t.max) return;
    _v.set(x, -y, z); _q.identity(); _s.set(r, r, r);
    _m4.compose(_v, _q, _s); t.sph.setMatrixAt(t.ns, _m4); if (t.proxy) _pushProxy(1, _m4);
    _s.set(r + OUTLINE, r + OUTLINE, r + OUTLINE);
    _m4.compose(_v, _q, _s); t.sphO.setMatrixAt(t.ns, _m4);
    if (t.ac) t.sphO.setColorAt(t.ns, t.ac);
    t.ns++;
  }
  function _bone(x0, y0, x1, y1, z, r) {
    const t = tgt;
    if (t.nc >= t.max) return;
    const dx = x1 - x0, dy = -(y1 - y0), len = Math.hypot(dx, dy);
    if (len < 0.01) return;
    _v.set(dx / len, dy / len, 0);
    _q.setFromUnitVectors(_up, _v);
    _v.set((x0 + x1) * 0.5, -(y0 + y1) * 0.5, z);
    _s.set(r, len, r);
    _m4.compose(_v, _q, _s); t.cyl.setMatrixAt(t.nc, _m4); if (t.proxy) _pushProxy(0, _m4);
    _s.set(r + OUTLINE, len, r + OUTLINE);
    _m4.compose(_v, _q, _s); t.cylO.setMatrixAt(t.nc, _m4);
    if (t.ac) t.cylO.setColorAt(t.nc, t.ac);
    t.nc++;
  }

  // ---------- Held weapons (three-quarter view) ----------
  // On the card a weapon is a flat decal: no depth, drawn over every body, no shadow. In angle frames
  // drawWeapon() hands its sprite here instead. The sprite becomes a stack of layers WEAP_THICK deep at
  // the near hand's depth: the outer two faces carry the painted art, the inner ones are darkened so the
  // edge reads as the weapon's thickness. Unlit, so the art keeps its painted look; it casts a shadow.
  function _initWeapons() {
    const P = [], U = [], C = [], I = [];
    for (let l = 0; l < WEAP_LAYERS; l++) {
      const w = l / (WEAP_LAYERS - 1) - 0.5;
      const edge = l === 0 || l === WEAP_LAYERS - 1;
      const sh = edge ? 1 : 0.42;
      const b = P.length / 3;
      for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { P.push(u, v, w); U.push(u, 1 - v); C.push(sh, sh, sh); }
      I.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
    weapGeo = new T.BufferGeometry();
    weapGeo.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    weapGeo.setAttribute('uv', new T.Float32BufferAttribute(U, 2));
    weapGeo.setAttribute('color', new T.Float32BufferAttribute(C, 3));
    weapGeo.setIndex(I);
    glowGeo = new T.BufferGeometry();
    glowGeo.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0], 3));
    glowGeo.setAttribute('uv', new T.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2));
    glowGeo.setIndex([0, 2, 1, 1, 2, 3]);
    for (let i = 0; i < MAX_WEAP; i++) {
      const m = new T.Mesh(weapGeo, null);
      m.matrixAutoUpdate = false; m.frustumCulled = false; m.visible = false; m.castShadow = true;
      weapPool.push(m);
      const g = new T.Mesh(glowGeo, new T.MeshBasicMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide,
        fog: false, toneMapped: false }));
      g.matrixAutoUpdate = false; g.frustumCulled = false; g.visible = false;
      glowPool.push(g);
    }
    const cg = new T.CylinderGeometry(1, 1, 1, 8, 1, true), sg = new T.SphereGeometry(1, 8, 6);
    const hide = new T.MeshStandardMaterial({ color: 0x8a4a1c, roughness: 0.6 });
    const ink = new T.MeshBasicMaterial({ color: 0x15161c, side: T.BackSide });
    ropeT = { cyl: new T.InstancedMesh(cg, hide, MAX_ROPE), sph: new T.InstancedMesh(sg, hide, MAX_ROPE),
      cylO: new T.InstancedMesh(cg, ink, MAX_ROPE), sphO: new T.InstancedMesh(sg, ink, MAX_ROPE),
      max: MAX_ROPE, nc: 0, ns: 0, proxy: false, ac: null, outline: 0.7 };
    for (const m of [ropeT.cyl, ropeT.sph, ropeT.cylO, ropeT.sphO]) { m.frustumCulled = false; m.count = 0; }
    ropeT.cyl.castShadow = ropeT.sph.castShadow = true;
    // Braid dashes and the cracker: round-capped strokes (capsule = cylinder + 2 caps) on the rope's near side.
    braidM = new T.InstancedMesh(new T.CapsuleGeometry(1, 1, 3, 6), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }), MAX_ROPE);
    braidM.frustumCulled = false; braidM.count = 0;
    braidM.setColorAt(0, _col.set(BRAID_COL));
  }
  // The weapon's silhouette, blurred: tinted and faded per draw to stand in for the 2D shadowBlur glow.
  function _weapGlow(img, dw) {
    let e = _weapGlows.get(img);
    if (!e) {
      const iw = img.width, ih = img.height, bpx = Math.max(1, GLOW_W * iw / dw * 0.5), pad = Math.ceil(bpx * 2.5);
      const cv = document.createElement('canvas');
      cv.width = iw + pad * 2; cv.height = ih + pad * 2;
      const g = cv.getContext('2d');
      g.filter = 'blur(' + bpx.toFixed(1) + 'px)';
      g.drawImage(img, pad, pad); g.drawImage(img, pad, pad);
      g.filter = 'none';
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
      const tex = new T.CanvasTexture(cv);
      tex.colorSpace = T.SRGBColorSpace;
      e = { tex, pu: pad / iw, pv: pad / ih };
      _weapGlows.set(img, e);
    }
    return e;
  }
  // Left part of a sprite (the whip handle out of a swing), as its own image.
  function _weapCrop(img, u1) {
    let cv = _weapCrops.get(img);
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * u1)); cv.height = img.height;
      cv.getContext('2d').drawImage(img, 0, 0);
      _weapCrops.set(img, cv);
    }
    return cv;
  }
  function _weapMat(img) {
    let m = _weapMats.get(img);
    if (!m) {
      const tex = new T.Texture(img);
      tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4; tex.needsUpdate = true;
      m = new T.MeshBasicMaterial({ map: tex, alphaTest: 0.45, alphaToCoverage: true, side: T.DoubleSide, vertexColors: true, toneMapped: false });
      _weapMats.set(img, m);
    }
    return m;
  }
  // Called from Fighter.drawWeapon() in place of ctx.drawImage(img, dx, dy, dw, dh). True = the 3D view took it.
  // u1 < 1 keeps only the left u1 of the sprite (the whip handle). The ctx's shadowColor/shadowBlur become the glow.
  function paintWeapon(c, img, dx, dy, dw, dh, u1) {
    if (!ok || !inWorld || !angleFrame || c !== ctx0 || !img || weapN >= MAX_WEAP) return false;
    if (c.globalAlpha < 1 || (c.filter && c.filter !== 'none') || c.globalCompositeOperation !== 'source-over') return false;
    if (img.complete === false || !(img.width > 0)) return false;
    if (u1 !== undefined && u1 < 1) { img = _weapCrop(img, u1); dw *= u1; }
    const Q = W0inv.multiply(c.getTransform());       // weapon local space to world
    const blur = c.shadowBlur || 0;
    const gm = glowPool[weapN];
    if (blur > 0.5 && c.shadowColor && !/^(transparent|rgba\([^)]*,\s*0\))$/.test(c.shadowColor)) {
      const G = _weapGlow(img, dw);
      // 2D shadowBlur 5-10 idle, 15-32 swinging: reach and strength grow with it.
      const k = Math.min(1.7, Math.max(0.7, blur / 12));
      const ex = G.pu * dw * k, ey = G.pv * dh * k, gx = dx - ex, gy = dy - ey, gw = dw + ex * 2, gh = dh + ey * 2;
      gm.material.map = G.tex; gm.material.color.copy(_accent(c.shadowColor));
      gm.material.opacity = Math.min(0.95, 0.3 + blur / 30);
      gm.matrix.set(
        Q.a * gw, Q.c * gh, 0, Q.a * gx + Q.c * gy + Q.e,
        -Q.b * gw, -Q.d * gh, 0, -(Q.b * gx + Q.d * gy + Q.f),
        0, 0, 1, WEAP_Z - WEAP_THICK * 0.5 - 0.6,
        0, 0, 0, 1);
      gm.matrixWorldNeedsUpdate = true;
      gm.visible = true;
    } else gm.visible = false;
    const m = weapPool[weapN++];
    m.material = _weapMat(img);
    m.matrix.set(
      Q.a * dw, Q.c * dh, 0, Q.a * dx + Q.c * dy + Q.e,
      -Q.b * dw, -Q.d * dh, 0, -(Q.b * dx + Q.d * dy + Q.f),
      0, 0, WEAP_THICK, WEAP_Z,
      0, 0, 0, 1);
    m.matrixWorldNeedsUpdate = true;
    return true;
  }

  // Whip rope: P are the rope points in the T0 frame (Fighter._whipLashDraw), tapering from the handle.
  function paintRope(c, T0, P) {
    if (!ok || !inWorld || !angleFrame || c !== ctx0 || !P || P.length < 2) return false;
    if (c.globalAlpha < 1) return false;
    const Q = W0inv.multiply(T0);
    const n = P.length - 1, keep = tgt, keepO = OUTLINE;
    tgt = ropeT; OUTLINE = ropeT.outline;
    const W = _ropeW; W.length = 0;
    for (let i = 0; i <= n; i++) W.push(Q.a * P[i].x + Q.c * P[i].y + Q.e, Q.b * P[i].x + Q.d * P[i].y + Q.f);
    for (let i = 0; i <= n; i++) {
      const r = 2.0 - 1.15 * (i / n);
      if (i > 0) _bone(W[i * 2 - 2], W[i * 2 - 1], W[i * 2], W[i * 2 + 1], WEAP_Z, r + 0.06);
      _sphere(W[i * 2], W[i * 2 + 1], WEAP_Z, r);
    }
    tgt = keep; OUTLINE = keepO;
    // Braid: 2.2 on, 2.4 off along the rope (the 2D dash), on the side facing the camera.
    let along = 0, i = 0, segL = 0, sx = 0, sy = 0, ux = 0, uy = 0;
    const total = n;
    for (let d = 0; ; d += 4.6) {
      while (i < n && along + segL <= d) {
        along += segL; i++;
        sx = W[i * 2 - 2]; sy = W[i * 2 - 1];
        const ex = W[i * 2] - sx, ey = W[i * 2 + 1] - sy;
        segL = Math.hypot(ex, ey); ux = segL ? ex / segL : 0; uy = segL ? ey / segL : 0;
      }
      if (i >= n && along + segL < d + 2.2) break;
      const t = d - along, r = 2.0 - 1.15 * ((i - 1 + t / (segL || 1)) / total);
      const x0 = sx + ux * t, y0 = sy + uy * t;
      _braid(x0, y0, x0 + ux * 2.2, y0 + uy * 2.2, WEAP_Z + r * 0.8, 0.5, BRAID_COL);
    }
    // Cracker: a short pale tail off the last link.
    // Direction from the nearest point that is apart from the tip (links resting on a floor can coincide).
    const tx = W[n * 2], ty = W[n * 2 + 1];
    let j = n - 1;
    while (j > 0 && Math.hypot(tx - W[j * 2], ty - W[j * 2 + 1]) < 0.5) j--;
    const dx = tx - W[j * 2], dy = ty - W[j * 2 + 1], tl = Math.hypot(dx, dy) || 1;
    _braid(tx, ty, tx + dx / tl * 9, ty + dy / tl * 9, WEAP_Z + 1.2, 1.15, CRACK_COL);   // larger than the 2D 4 px: it has to read past the grass
    return true;
  }
  const _ropeW = [];
  // One round-capped stroke into braidM (2D world coords, like _bone).
  function _braid(x0, y0, x1, y1, z, r, col) {
    if (braidN >= MAX_ROPE) return;
    const dx = x1 - x0, dy = -(y1 - y0), len = Math.hypot(dx, dy);
    if (len < 0.01) return;
    _v.set(dx / len, dy / len, 0);
    _q.setFromUnitVectors(_up, _v);
    _v.set((x0 + x1) * 0.5, -(y0 + y1) * 0.5, z);
    _s.set(r, (len + 2 * r) / 3, r);              // CapsuleGeometry(1, 1) is 3 tall (body 1 + two caps of 1)
    _m4.compose(_v, _q, _s);
    braidM.setMatrixAt(braidN, _m4);
    braidM.setColorAt(braidN, _col.set(col));
    braidN++;
  }

  // ---------- Arena sets ----------

  const _sets = {};

  // Toon ramp: three flat steps, the shonen-cel read for the set.
  let _ramp = null;
  function toon(color) {
    if (!_ramp) {
      const d = new Uint8Array([88, 172, 255]);    // three values a step apart: shade, half light, lit
      _ramp = new T.DataTexture(d, 3, 1, T.RedFormat);
      _ramp.minFilter = _ramp.magFilter = T.NearestFilter;
      _ramp.needsUpdate = true;
    }
    return new T.MeshToonMaterial({ color, gradientMap: _ramp });
  }
  function seeded(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

  function skyTexture(stops) {
    const c = document.createElement('canvas'); c.width = 2; c.height = 256;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    for (const [t, col] of stops) gr.addColorStop(t, col);
    g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  }

  // Painted backdrop pieces: unlit, coloured per face by a stepped light read from the upper left, so far
  // shapes read like the 2D brushwork (flat lit and shadow masses) instead of smooth CG shading.
  const _PAINT_SUN = { x: -0.55, y: 0.9, z: 0.6 };
  (function () { const l = Math.hypot(_PAINT_SUN.x, _PAINT_SUN.y, _PAINT_SUN.z); _PAINT_SUN.x /= l; _PAINT_SUN.y /= l; _PAINT_SUN.z /= l; })();
  // parts: [{ geo, m: Matrix4 }]. shade(lit, y, ny) returns a Color: lit is the face's dot with the sun,
  // y the face's world height, ny its normal's up component.
  function paintedMesh(parts, shade, flat) {
    const pos = [], col = [];
    const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), n = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3();
    const vn = [new T.Vector3(), new T.Vector3(), new T.Vector3()], nm = new T.Matrix3();
    for (const p of parts) {
      const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
      g.applyMatrix4(p.m);
      if (!flat) g.computeVertexNormals();
      const P = g.attributes.position, N = g.attributes.normal;
      for (let i = 0; i < P.count; i += 3) {
        a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2);
        n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)).normalize();
        for (let k = 0; k < 3; k++) {
          const v = k === 0 ? a : k === 1 ? b : c;
          const nn = flat || !N ? n : vn[k].fromBufferAttribute(N, i + k).normalize();
          const lit = nn.x * _PAINT_SUN.x + nn.y * _PAINT_SUN.y + nn.z * _PAINT_SUN.z;
          const cc = shade(lit, flat ? (a.y + b.y + c.y) / 3 : v.y, nn.y);
          pos.push(v.x, v.y, v.z); col.push(cc.r, cc.g, cc.b);
        }
      }
      g.dispose();
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    return new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, fog: false }));
  }

  // ---------- Arena sets ----------
  // Each arena's set is data (js/smb-stage3d-sets.js calls Stage3D.defineSet). makeSet owns what every set
  // shares: sky dome, haze, the light rig's colours, land under the floor, platform slabs, grass blades,
  // a backdrop sun or moon, and a lava or liquid surface. The arena's own dressing comes from spec.dress.
  //
  // spec fields (all optional except sky):
  //   sky: [[t, '#hex'], ...] top (0) to horizon (1)     fog: '#hex'
  //   light: { sky, ground, hemi, key, keyI }            sun: { dir: [x,y,z], color, size, rays, glow }
  //   ground: { top, face: [base, bandA, bandB, rootline], deep, back } (no ground: floors become slabs)
  //   plat: { kind: 'island'|'block'|'cloud', top, lip, body, under, glow, drips, depth: [min, max] }
  //   blades: ['#hex', ...]   liquid: { y, kind: 'lava'|'sewage'|'water', color, glow }
  //   dress(scene, kit, rnd)  update(frame, kit)
  const LAND_FRONT = 150;        // the land's front face in the side view
  const LAND_FRONT_ANGLE = 3200; // three-quarter view: the land runs past the camera, so no edge shows
  const LAND_BACK = 420;         // where a floor's tongue joins the wide land behind it (z = -LAND_BACK)

  function makeSet(factory) {
    let spec = null, scene = null, skyTex = null, skyDome = null, plats = [], key = '', lands = [], trims = [], fShadows = [], pierBatch = [], backLand = null;
    let landMats = null, mats = null, sunRays = null, sunDisc = null, tufts = null, SUN_DIR = null, liquid = null;
    let _clodG = null, _dripG = null, _contactTex = null, _dressing = false;
    const _contactMats = {};
    const kit = {}, occ = [];
    // Contact shadow: a soft dark oval lying on a surface at world (x, y, z), rx by rz wide. Sells where an
    // object meets the ground, which the shadow map's soft edge alone doesn't.
    // Static batching: scenery the kit marks static (userData.st: columns, trees, boxes, contact shadows) is
    // merged into one mesh per material after dress(), so a set of hundreds of pieces costs a few draw calls.
    function mergeStatic() {
      scene.updateMatrixWorld(true);
      const groups = new Map();
      for (const m of scene.children.slice()) {
        if (!m.isMesh || !m.userData.st || Array.isArray(m.material) || m.isInstancedMesh) continue;
        const a = m.geometry.attributes;
        if (!a.position || !a.normal || !a.uv || Object.keys(a).length !== 3) continue;
        const k = m.material.uuid + '|' + m.castShadow + m.receiveShadow + '|' + m.renderOrder;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(m);
      }
      for (const list of groups.values()) {
        if (list.length < 2) continue;
        const mm = mergeList(list, true);
        for (const m of list) scene.remove(m);
        scene.add(mm);
      }
    }
    // One mesh from same-material meshes (position/normal/uv only), baked with each mesh's world matrix (or its
    // local matrix when it has no parent yet: kit.merge for platform dressing).
    function mergeList(list, world) {
      {
        const pos = [], nor = [], uv = [];
        for (const m of list) {
          const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
          if (!world) m.updateMatrix();
          g.applyMatrix4(world ? m.matrixWorld : m.matrix);
          pos.push(g.attributes.position.array); nor.push(g.attributes.normal.array); uv.push(g.attributes.uv.array);
          g.dispose();
        }
        const cat = (arrs) => { let n = 0; for (const x of arrs) n += x.length; const out = new Float32Array(n); let o = 0; for (const x of arrs) { out.set(x, o); o += x.length; } return out; };
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(cat(pos), 3));
        geo.setAttribute('normal', new T.BufferAttribute(cat(nor), 3));
        geo.setAttribute('uv', new T.BufferAttribute(cat(uv), 2));
        const f = list[0], mm = new T.Mesh(geo, f.material);
        mm.castShadow = f.castShadow; mm.receiveShadow = f.receiveShadow; mm.renderOrder = f.renderOrder;
        return mm;
      }
    }
    // kit.merge(meshes): loose (unparented) meshes to one mesh per material and shadow flags.
    function merge(meshes) {
      const by = new Map(), out = [];
      for (const m of meshes) {
        const a = m.geometry.attributes;
        if (Array.isArray(m.material) || !a.position || !a.normal || !a.uv || Object.keys(a).length !== 3) { out.push(m); continue; }
        const k = m.material.uuid + '|' + m.castShadow + m.receiveShadow;
        if (!by.has(k)) by.set(k, []);
        by.get(k).push(m);
      }
      for (const list of by.values()) out.push(list.length > 1 ? mergeList(list, false) : list[0]);
      return out;
    }
    function contactMesh(rx, rz, op) { const d = _dressing; _dressing = true; const m = contact(0, 0, 0, rx, rz, op); _dressing = d; delete m.userData.st; scene.remove(m); m.position.y = 0.6; return m; }   // shared material per opacity: these never change
    function contact(x, y, z, rx, rz, op) {
      if (!_contactTex) _contactTex = canvasTex(64, 64, (g2, w, h) => {
        const gr = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g2.fillStyle = gr; g2.fillRect(0, 0, w, h);
      });
      const o = op != null ? op : 0.5;
      const mk = () => new T.MeshBasicMaterial({ map: _contactTex, color: 0x000000, transparent: true,
        opacity: o, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      // Scenery shadows share a material per opacity (so they batch); live ones (platform blobs, fighters) own theirs.
      const m = new T.Mesh(new T.PlaneGeometry(1, 1), _dressing ? (_contactMats[o] || (_contactMats[o] = mk())) : mk());
      if (_dressing) m.userData.st = true;
      m.rotation.x = -Math.PI / 2; m.scale.set(rx * 2, rz * 2, 1); m.position.set(x, y + 0.6, z);
      m.renderOrder = 1;
      scene.add(m);
      return m;
    }
    // Foreground pieces between the camera and the fight. They frame the shot and overlap the set, and fade
    // to a ghost whenever they cover a fighter, so they never hide play.
    function occluder(mesh) {
      mesh.updateMatrixWorld(true);
      const b = new T.Box3().setFromObject(mesh), mats = [];
      mesh.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
      occ.push({ mesh, b, mats, a: 1 });
      return mesh;
    }
    let _ob = null;
    function _ndcBox(pts) {
      if (!_ob) _ob = new T.Vector3();
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (const p of pts) { _ob.copy(p).project(camera); x0 = Math.min(x0, _ob.x); x1 = Math.max(x1, _ob.x); y0 = Math.min(y0, _ob.y); y1 = Math.max(y1, _ob.y); }
      return [x0, x1, y0, y1];
    }
    function fadeOccluders() {
      if (!occ.length) return;

      // Each live fighter's own screen box (padded for the weapon), not the box around all of them.
      const Fs = [];
      for (const p of (typeof players !== 'undefined' ? players : [])) {
        if (!p || p.health <= 0 || !isFinite(p.x) || !isFinite(p.y)) continue;
        const x0 = p.x - 30, x1 = p.x + (p.w || 0) + 30, y0 = p.y - 40, y1 = p.y + (p.h || 0);
        Fs.push(_ndcBox([new T.Vector3(x0, -y0, 0), new T.Vector3(x1, -y0, 0), new T.Vector3(x0, -y1, 0), new T.Vector3(x1, -y1, 0)]));
      }
      for (const o of occ) {
        const B = o.b, c = [];
        for (const x of [B.min.x, B.max.x]) for (const y of [B.min.y, B.max.y]) for (const z of [B.min.z, B.max.z]) c.push(new T.Vector3(x, y, z));
        const N = _ndcBox(c);
        const hit = Fs.some(F => N[0] < F[1] && N[1] > F[0] && N[2] < F[3] && N[3] > F[2]);
        o.a += ((hit ? 0.2 : 1) - o.a) * 0.15;
        for (const m of o.mats) { m.opacity = o.a; m.depthWrite = o.a > 0.95; }
      }
    }

    function build() {
      scene = new T.Scene();
      Object.assign(kit, { T, scene, toon, seeded, paintedMesh, bladeMesh, canvasTex, basic, occluder, contact, contactMesh, merge });
      spec = factory(T, kit);
      const sky = spec.sky;
      scene.background = skyTex = skyTexture(sky);
      // Sky dome for the three-quarter view: the gradient follows the horizon, not the screen.
      {
        const g = new T.SphereGeometry(16000, 32, 16), pos = g.attributes.position, cols = [];
        const st = sky.map(([t, c]) => [(1 - t) * 0.85, new T.Color(c)]).sort((a, b) => a[0] - b[0]);
        const c = new T.Color();
        for (let i = 0; i < pos.count; i++) {
          const t = Math.max(0, pos.getY(i) / 16000);
          let k = 0; while (k < st.length - 2 && t > st[k + 1][0]) k++;
          const [t0, c0] = st[k], [t1, c1] = st[k + 1] || st[k];
          c.copy(c0).lerp(c1, t1 > t0 ? Math.min(1, Math.max(0, (t - t0) / (t1 - t0))) : 0);
          cols.push(c.r, c.g, c.b);
        }
        g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
        skyDome = new T.Mesh(g, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
        skyDome.renderOrder = -1;
        skyDome.visible = false;
        scene.add(skyDome);
      }
      // Haze starts just behind the play plane, so the set steps back in value and the fighters stay the loudest thing.
      scene.fog = new T.Fog(spec.fog || sky[sky.length - 1][1], 1150, 4200);

      const rnd = seeded(20261125);
      if (spec.ground) {
        const gd = spec.ground, f = gd.face || ['#8f6038', '#7a5030', '#9c6a3e', '#4a2f1b'];
        // Cliff faces carry strata: faint bands with a dark line under the top surface.
        const strata = canvasTex(4, 256, g => {
          const r = seeded(77);
          g.fillStyle = f[0]; g.fillRect(0, 0, 4, 256);
          for (let y = 18; y < 256; y += 40 + r() * 60) { g.fillStyle = r() < 0.6 ? f[1] : f[2]; g.fillRect(0, y, 4, 2 + r() * 5); }
          g.fillStyle = f[3]; g.fillRect(0, 0, 4, 5);
        });
        strata.wrapS = strata.wrapT = T.RepeatWrapping; strata.magFilter = T.NearestFilter;
        strata.repeat.set(1, 6);
        const face = toon(0xffffff); face.map = strata;
        const deep = toon(gd.deep || '#7a5232'), top = toon(gd.tile ? 0xffffff : gd.top);
        if (gd.tile) {
          top.map = canvasTex(128, 128, (g, w, h) => { g.fillStyle = gd.top; g.fillRect(0, 0, w, h); gd.tile.paint(g, w, h); });
          top.map.wrapS = top.map.wrapT = T.RepeatWrapping;
        }
        landMats = [deep, deep, top, deep, face, deep];                      // +x -x +y -y +z -z
        if (gd.back !== false) {
          backLand = new T.Mesh(new T.BoxGeometry(14000, 3000, 6000 - LAND_BACK), [deep, deep, toon(gd.backTop || gd.top), deep, face, deep]);
          backLand.position.set(450, -480 - 1500, (-6000 - LAND_BACK) / 2);
          backLand.receiveShadow = true;
          scene.add(backLand);
        }
      }
      if (spec.liquid) liquid = liquidSurface(spec.liquid);
      _dressing = true;
      try { if (spec.dress) spec.dress(scene, kit, rnd); } finally { _dressing = false; }
      mergeStatic();
      if (spec.sun) {
        const s = spec.sun;
        SUN_DIR = new T.Vector3(...(s.dir || [-0.42, 0.58, -1])).normalize();
        const glowCol = s.glow || 'rgba(255,248,214,';
        const tex = canvasTex(512, 512, g => {
          g.translate(256, 256);
          if (s.rays) for (let i = 0; i < 14; i++) {
            const a = i * (Math.PI * 2 / 14), sp = 0.05 + (i % 3) * 0.025;
            const rg = g.createRadialGradient(0, 0, 10, 0, 0, 256);
            rg.addColorStop(0, glowCol + (0.5 - (i % 3) * 0.12) + ')'); rg.addColorStop(1, glowCol + '0)');
            g.fillStyle = rg; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 256, a - sp, a + sp); g.closePath(); g.fill();
          }
          const gl = g.createRadialGradient(0, 0, 18, 0, 0, s.rays ? 90 : 200);
          gl.addColorStop(0, glowCol + '0.85)'); gl.addColorStop(1, glowCol + '0)');
          g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 256, 0, Math.PI * 2); g.fill();
        });
        sunRays = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({
          map: tex, transparent: true, blending: T.AdditiveBlending, fog: false, depthWrite: false }));
        sunRays.scale.setScalar(s.rays ? 9000 : 4200);
        sunRays.renderOrder = -0.8; sunRays.frustumCulled = false;
        sunDisc = new T.Mesh(new T.CircleGeometry(1, 40), new T.MeshBasicMaterial({ color: s.color || 0xfffbe8, fog: false, depthWrite: false }));
        sunDisc.scale.setScalar(s.size || 520);
        sunDisc.renderOrder = -0.9;
        scene.add(sunRays, sunDisc);
      }
    }

    function canvasTex(w, h, draw) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
      return t;
    }
    function basic(color, extra) { return new T.MeshBasicMaterial(Object.assign({ color }, extra || {})); }

    // A lit liquid surface (lava, sewage, water) at a world y: a wide plane whose texture drifts.
    function liquidSurface(lq) {
      const tex = canvasTex(256, 256, (g, w, h) => {
        const r = seeded(lq.kind === 'lava' ? 5 : 9);
        g.fillStyle = lq.color; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 70; i++) {
          g.fillStyle = (lq.veins || ['rgba(255,220,120,0.55)', 'rgba(120,20,0,0.35)'])[i % 2];
          g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 26, 2 + r() * 6, r() * 3, 0, Math.PI * 2); g.fill();
        }
        if (lq.cracks) {
          // Crust: molten seams between dark plates.
          g.strokeStyle = lq.cracks; g.lineWidth = 2.2; g.lineCap = 'round';
          for (let i = 0; i < 26; i++) {
            let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y);
            for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); }
            g.stroke();
          }
        }
      });
      tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(24, 18);
      const m = new T.Mesh(new T.PlaneGeometry(9000, 6000), basic(0xffffff, { map: tex }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(450, -lq.y, -1500);
      m.renderOrder = -0.2;
      scene.add(m);
      return { m, tex, lq };
    }

    // Grass blade clumps, the 3D form of the 2D blade fringe: three crossed blades, instanced per surface.
    let _bladeG = null, _bladeM = null;
    function bladeMesh(n, place, cols) {
      cols = cols || spec.blades || ['#3f8a36', '#7fcf5a', '#5cae45', '#4f9a3e'];
      if (!_bladeG) {
        const p = [];
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI / 3 + 0.3, ca = Math.cos(a) * 1.3, sa = Math.sin(a) * 1.3, lx = (i - 1) * 0.9, lean = (i - 1) * 0.35;
          p.push(-ca + lx, 0, -sa, ca + lx, 0, sa, lx + lean, 1, 0);
        }
        _bladeG = new T.BufferGeometry();
        _bladeG.setAttribute('position', new T.Float32BufferAttribute(p, 3));
        _bladeG.computeVertexNormals();
        _bladeM = toon(0xffffff); _bladeM.side = T.DoubleSide;
      }
      const m = new T.InstancedMesh(_bladeG, _bladeM, n), r = seeded(n * 31 + 7), M = new T.Matrix4();
      const q = new T.Quaternion(), v = new T.Vector3(), sc = new T.Vector3(), up = new T.Vector3(0, 1, 0), c = new T.Color();
      for (let i = 0; i < n; i++) {
        const [x, y, z, h] = place(r, i);
        M.compose(v.set(x, y, z), q.setFromAxisAngle(up, r() * 6.28), sc.set(1 + r() * 0.6, h, 1 + r() * 0.6));
        m.setMatrixAt(i, M);
        m.setColorAt(i, c.set(cols[Math.floor(r() * cols.length)]));
      }
      m.receiveShadow = true;
      return m;
    }

    // Platforms are rebuilt when the layout changes and moved every frame (moving platforms).
    function slab(pl) {
      const g = new T.Group();
      const P = spec.plat || {};
      if (!mats) mats = { top: toon(P.top || '#5aae4e'), lip: toon(P.lip || P.top || '#3a7030'), body: toon(P.body || '#9a6a3e'),
                          under: toon(P.under || P.body || '#7a5232'), glow: P.glow ? basic(P.glow, { fog: false }) : null,
                          drips: P.drips ? toon(P.drips) : null };
      if (pl.isFloor && spec.ground) return g;     // the floor is a land block's top, placed in sync()
      const kind = P.kind || 'island';
      const big = pl.isFloor && !spec.rafts;     // rafts (sewer) float: no deep block under the floor raft
      const dr = P.depth || [60, 110];
      const d = big ? 340 : Math.min(dr[1], Math.max(dr[0], pl.w * 0.55));
      const parts = [];
      let rake = null;
      if (kind === 'cloud') {
        // Packed puffs, flat on top where fighters stand.
        const puff = _clodG || (_clodG = new T.DodecahedronGeometry(1, 1));
        const n = Math.max(3, Math.round(pl.w / 26)), r = seeded(pl.w * 7 + pl.h);
        const top = new T.Mesh(new T.BoxGeometry(pl.w, 6, d * 0.8), mats.top);
        top.position.set(pl.w / 2, -3, 0); parts.push(top);
        for (let i = 0; i < n; i++) {
          const p = new T.Mesh(puff, i % 3 ? mats.body : mats.under), rr = 10 + r() * 10;
          p.scale.set(rr * 1.4, rr, rr * 1.2);
          p.position.set(6 + (i + 0.5) * (pl.w - 12) / n, -4 - rr * 0.45, (r() - 0.5) * d * 0.5);
          parts.push(p);
        }
      } else {
        const topH = P.topH || 6;
        // Raked top (side camera): the walking surface tips toward the eye about the play line (z = 0), so
        // fighters' feet stay on the collision height while the top reads as a surface, not a line.
        if (MODE === 'side' && !big) { rake = new T.Group(); rake.rotation.x = 0.2; g.add(rake); }
        const top = new T.Mesh(new T.BoxGeometry(pl.w, topH, d), mats.top);
        top.position.set(pl.w / 2, -topH / 2, 0);
        const lip = new T.Mesh(new T.BoxGeometry(pl.w + 4, 3, d + 4), mats.lip);
        lip.position.set(pl.w / 2, -topH - 0.5, 0);
        // Draw-only depth below the collision box: the body reads as a chunk, not a plank.
        const bodyH = big ? 600 : kind === 'block' ? Math.max(30, pl.h + 14) : Math.max(14, pl.h + 4);
        const body = new T.Mesh(new T.BoxGeometry(pl.w - 4, bodyH, d - 6), mats.body);
        body.position.set(pl.w / 2, -topH - bodyH / 2, 0);
        top.userData.rk = lip.userData.rk = true;
        parts.push(top, lip, body);
        if (kind === 'block' && !big) {
          // Underside band a value down, inset: the slab reads as a cut block seen from below, not a plank.
          const u = new T.Mesh(new T.BoxGeometry(pl.w - 14, 8, d - 16), mats.under);
          u.position.set(pl.w / 2, -topH - bodyH - 3, 0); parts.push(u);
        }
        if (kind === 'island' && !big) {
          // Underside: a rough clod, wider than tall, not a spike.
          const root = new T.Mesh(_clodG || (_clodG = new T.DodecahedronGeometry(1, 0)), mats.under);
          const rh = 8 + pl.w * 0.05;
          root.scale.set(pl.w * 0.40, rh, d * 0.36);
          root.position.set(pl.w / 2, -topH - bodyH - rh * 0.25, 0);
          parts.push(root);
        }
        if (mats.glow) {
          // Neon edge: a thin unlit strip along the front and back of the top.
          for (const z of [d / 2 + 1, -d / 2 - 1]) {
            const s = new T.Mesh(new T.BoxGeometry(pl.w, 2, 1), mats.glow);
            s.position.set(pl.w / 2, -topH + 0.5, z); s.userData.rk = true; parts.push(s);
          }
        }
        if (mats.drips && !big) {
          // Icicles or drips hanging off the front lip.
          const cone = _dripG || (_dripG = new T.ConeGeometry(1, 1, 5));
          const r = seeded(pl.x * 3 + pl.y), n = Math.round(pl.w / 14);
          for (let i = 0; i < n; i++) {
            const c = new T.Mesh(cone, mats.drips), h = 6 + r() * 14;
            c.scale.set(2 + r() * 1.5, h, 2 + r() * 1.5); c.rotation.x = Math.PI;
            c.position.set(4 + r() * (pl.w - 8), -topH - bodyH - h / 2 + 2, d / 2 - 4 - r() * 10);
            parts.push(c);
          }
        }
      }
      for (const m of parts) { m.castShadow = true; m.receiveShadow = true; }
      // One mesh per material (drips and puffs are dozens of pieces), raked top parts kept in their own group.
      for (const m of merge(parts.filter(m => !(rake && m.userData.rk)))) g.add(m);
      if (rake) for (const m of merge(parts.filter(m => m.userData.rk))) rake.add(m);
      g.userData.d = d;
      if (spec.blades && !big) {
        // Blades over the top and thicker along the front and back lips, where the 2D fringe sits.
        (rake || g).add(bladeMesh(Math.round(pl.w * 0.9), (r, i) => {
          const edge = i % 3 === 0, z = edge ? (r() < 0.5 ? -1 : 1) * (d / 2 - r() * 4) : (r() - 0.5) * d;
          return [2 + r() * (pl.w - 4), 0, z, 4 + r() * 7];
        }));
      }
      if (spec.platDress) spec.platDress(g, pl, d, kit);
      return g;
    }

    function sync(arena) {
      if (!scene) build();
      const list = (arena.platforms || []).filter(pl => !pl.isFloorDisabled && !pl.noDraw);
      const k = list.map(pl => pl.w + 'x' + pl.h + (pl.isFloor ? 'F' : '')).join('|');
      if (k !== key) {
        for (const e of plats) {
          scene.remove(e.g);
          if (e.blob) { scene.remove(e.blob); e.blob.geometry.dispose(); e.blob.material.dispose(); }
          e.g.traverse(o => { if (o.geometry && o.geometry !== _clodG && o.geometry !== _dripG && o.geometry !== _bladeG) o.geometry.dispose(); });
        }
        plats = list.map(pl => { const g = slab(pl); scene.add(g); return { pl, g }; });
        key = k;
        // Supports on a stage whose platforms never move: merge every platform's pier pieces across the set
        // (26 platforms on Megacity were ~80 extra draw calls).
        for (const m of pierBatch) { scene.remove(m); m.geometry.dispose(); }
        pierBatch = [];
        if (!list.some(pl => pl.oscX || pl.oscY)) {
          for (const e of plats) e.g.position.set(e.pl.x, -e.pl.y, 0);
          scene.updateMatrixWorld(true);
          const by = new Map();
          for (const e of plats) e.g.traverse(o => {
            if (!o.isMesh || !o.userData.pier || Array.isArray(o.material)) return;
            const k2 = o.material.uuid + '|' + o.castShadow + o.receiveShadow + '|' + o.renderOrder;
            if (!by.has(k2)) by.set(k2, []);
            by.get(k2).push(o);
          });
          for (const l of by.values()) {
            if (l.length < 2) continue;
            const mm = mergeList(l, true);
            for (const o of l) o.parent.remove(o);
            scene.add(mm); pierBatch.push(mm);
          }
        }
      } else {
        for (let i = 0; i < list.length; i++) plats[i].pl = list[i];
      }
      for (const e of plats) e.g.position.set(e.pl.x, -e.pl.y, 0);
      // Each raised platform darkens the floor straight under it: stronger the lower it hangs.
      for (const e of plats) {
        const pl = e.pl;
        if (pl.isFloor) continue;
        const cx = pl.x + pl.w / 2;
        let fy = Infinity;
        for (const q of list) if (q.isFloor && cx >= q.x && cx <= q.x + q.w && q.y > pl.y && q.y < fy) fy = q.y;
        if (!e.blob && fy < Infinity) e.blob = contact(0, 0, 0, 1, 1, 0.5);
        if (!e.blob) continue;
        e.blob.visible = fy < Infinity;
        if (!e.blob.visible) continue;
        const k = Math.max(0.3, Math.min(1, 1 - (fy - pl.y) / 520));
        e.blob.position.set(cx, -fy + 0.6, 0);
        e.blob.scale.set(pl.w * (1.25 - k * 0.15), (e.g.userData.d || 80) * (1.7 - k * 0.3), 1);
        e.blob.material.opacity = 0.62 * k;
      }

      // Land: each floor platform is the top of its own block (pits between floors stay open), running
      // down past any zoom. The 2D game fills ground under the floor (drawBackground), so the set does too.
      const floors = spec.ground ? list.filter(pl => pl.isFloor) : [];
      while (lands.length < floors.length) {
        let mm = landMats;
        if (spec.ground.tile) {
          // A tiled top (flagstones, planks) keeps its world scale: each land gets its own copy of the map.
          const top = landMats[2].clone(); top.map = landMats[2].map.clone(); top.map.needsUpdate = true;
          mm = landMats.slice(); mm[2] = top;
        }
        const m = new T.Mesh(new T.BoxGeometry(1, 3000, 1), mm);
        m.receiveShadow = true; scene.add(m); lands.push(m);
        if (spec.ground.edge) {
          // Lit rim along the top's front and back edges (the void's white line). Children of the block, so
          // they follow its scale; sized in sync().
          const eM = basic(spec.ground.edge, { fog: false });
          for (const side of [1, -1]) { const e = new T.Mesh(new T.BoxGeometry(1, 1, 1), eM); e.userData.side = side; m.add(e); }
        }
      }
      const front = spec.ground && spec.ground.front ? spec.ground.front : angleFrame ? LAND_FRONT_ANGLE : LAND_FRONT;
      for (let i = 0; i < lands.length; i++) {
        const fl = floors[i], m = lands[i];
        m.visible = !!fl;
        if (!fl) continue;
        m.scale.set(fl.w, 1, front + LAND_BACK + 2);
        if (spec.ground.tile) m.material[2].map.repeat.set(fl.w / spec.ground.tile.size, (front + LAND_BACK) / spec.ground.tile.size);
        m.position.set(fl.x + fl.w / 2, -fl.y - 1500, (front - LAND_BACK - 2) / 2);
        for (const e of m.children) {
          // In block units (the block is 3000 tall unscaled): x spans the floor, a 1.5 px rim at the top, z at a face.
          e.scale.set(1, 1.5, 2 / (front + LAND_BACK + 2));
          e.position.set(0, 1500 - 0.75, e.userData.side * 0.5);
        }
      }
      // Foundation trim (side camera): stepped courses along each floor's front face, so the floor reads as a
      // built footing, not a cut block. ground.trim = { color, steps: [[drop, height, out], ...] }.
      const tr = spec.ground && spec.ground.trim;
      if (tr) {
        while (trims.length < floors.length) {
          const g = new T.Group(), m = toon(tr.color);
          for (const st of tr.steps) { const b = new T.Mesh(new T.BoxGeometry(1, 1, 1), m); b.userData.st = st; b.castShadow = b.receiveShadow = true; g.add(b); }
          scene.add(g); trims.push(g);
        }
        for (let i = 0; i < trims.length; i++) {
          const fl = floors[i], g = trims[i];
          g.visible = !!fl && !angleFrame;
          if (!g.visible) continue;
          for (const b of g.children) {
            const [drop, h, out] = b.userData.st;
            b.scale.set(fl.w + out * 2, h, out + 10);
            b.position.set(fl.x + fl.w / 2, -fl.y - drop - h / 2, front + out / 2 - 5);
          }
        }
      }
      const floor = floors.slice().sort((a, b) => b.w - a.w)[0];
      if (backLand) { backLand.visible = !!floor; if (floor) backLand.position.y = -floor.y - 1500; }
      if (spec.blades && spec.floorBlades !== 0 && floor && (!tufts || tufts.userData.k !== floor.x + ':' + floor.w)) {
        if (tufts) { scene.remove(tufts); tufts.dispose(); }
        // Floor blades: scattered across the ground, packed along the play line and the front lip.
        tufts = bladeMesh(spec.floorBlades || 1700, (r, i) => {
          const z = i % 3 === 0 ? (r() - 0.5) * 50 : i % 3 === 1 ? LAND_FRONT - r() * 14 : -LAND_BACK + r() * (LAND_BACK + 700);
          return [floor.x + 3 + r() * (floor.w - 6), 0, z, i % 3 === 2 ? 3 + r() * 4 : 4 + r() * 7];
        });
        tufts.userData.k = floor.x + ':' + floor.w;
        scene.add(tufts);
      }
      if (tufts) { tufts.visible = !!floor; if (floor) tufts.position.y = -floor.y; }

      // The light rig is shared by every set: take this set's colours.
      const L = spec.light || {};
      hemiL.color.set(L.sky || 0xd8ecff); hemiL.groundColor.set(L.ground || 0x8a7448); hemiL.intensity = (L.hemi != null ? L.hemi : 1.45) * 0.72;   // less fill: shade sides and shadows must read
      sun.color.set(L.key || 0xfff1d8); sun.intensity = L.keyI != null ? L.keyI : 1.8;

      skyDome.visible = angleFrame;
      skyDome.position.copy(camera.position);
      skyDome.scale.setScalar(Math.min(1, camera.far * 0.9 / 16000));
      scene.fog.near = _fogNear + (spec.fogNear || 0);
      scene.fog.far = scene.fog.near + (spec.fogSpan || (angleFrame ? 2000 : 2300));   // far rows lose contrast
      scene.background = angleFrame ? null : skyTex;
      const f = typeof frameCount === 'number' ? frameCount : 0;
      if (sunDisc) {
        // The sky sun sits at a fixed direction from the eye, faces it, and its rays turn slowly.
        sunDisc.position.copy(camera.position).addScaledVector(SUN_DIR, 11000);
        sunRays.position.copy(camera.position).addScaledVector(SUN_DIR, 10990);
        sunDisc.quaternion.copy(camera.quaternion);
        sunRays.quaternion.copy(camera.quaternion);
        sunRays.rotateZ(f * 0.0009);
      }
      if (liquid) {
        const y = arena.lavaY != null ? arena.lavaY : arena.sewageY != null ? arena.sewageY : liquid.lq.y;
        liquid.m.position.y = -y;
        liquid.tex.offset.set(f * (liquid.lq.flowX || 0.0004), f * (liquid.lq.flowZ || 0.0002));
      }
      if (spec.update) spec.update(f, kit);
      fadeOccluders();
      // Fighter contact shadows: a soft oval on the surface under each fighter (not at the feet), darkest when
      // standing, wider and fainter with height, so a jump reads as distance from the ground.
      let fi = 0;
      for (const p of (typeof players !== 'undefined' ? players : [])) {
        if (!p || p.health <= 0 || !isFinite(p.x) || !isFinite(p.y) || p.isBoss) continue;
        const cx = p.x + (p.w || 0) / 2, feet = p.y + (p.h || 0);
        let sy = Infinity;
        for (const q of list) if (cx >= q.x && cx <= q.x + q.w && q.y >= feet - 4 && q.y < sy) sy = q.y;
        if (sy === Infinity) continue;
        const gap = sy - feet;
        if (gap > 420) continue;
        if (!fShadows[fi]) fShadows[fi] = contact(0, 0, 0, 1, 1, 0.5);
        const m = fShadows[fi++], k = Math.max(0, 1 - gap / 420);
        m.visible = true;
        m.position.set(cx, -sy + 0.8, 0);
        m.scale.set(2 * (17 + (1 - k) * 14), 2 * (12 + (1 - k) * 8), 1);
        m.material.opacity = 0.55 * k * k;
      }
      for (; fi < fShadows.length; fi++) fShadows[fi].visible = false;
    }

    function overlay() {
      if (!spec || !spec.overlay) return;
      ctx.save();
      try { spec.overlay(); } catch (e) { if (!overlay._warned) { overlay._warned = true; console.warn('[Stage3D] overlay', e); } }
      ctx.restore();
    }

    return { sync, overlay, get scene() { if (!scene) build(); return scene; } };
  }

  function defineSet(key, factory) { _sets[key] = makeSet(factory); }

  if (WANT) load();

  return {
    get wanted() { return WANT; },
    get info() { return renderer ? { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries } : null; },   // dev: draw cost
    ready, beginFrame, endFrame, ownsArena, drawWorld, paintBody, paintWeapon, paintRope, wantsRecord, screenPoint, groundDecals, defineSet,
  };
})();
