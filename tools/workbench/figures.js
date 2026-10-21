'use strict';
// Figure studio (DEV ONLY): poses, clips and story scenes for the story-scene figures.
// Injected into index.html by tools/workbench/server.js; open /index.html?wb=figures.
//
//   Pose   drag the joints of a big figure drawn by the real scene renderer
//          (window._sceneDrawFigure). Edits go live into FigureRig.POSES.
//   Clip   keyframe timeline over FigureRig.CLIPS: pose, ease and timing per key,
//          onion skins, slow motion, and a scene-size preview beside the big figure.
//   Scene  plays any chapter's narrative scene with pause, frame step and beat jumps.
//          Saving a scene file or the rig in an editor reloads it here, at the same beat.
//
// Save writes edited poses/clips into js/smb-figure-rig.js (tools/workbench/rig-patch.js).
// window.__wbFig is the API tools/workbench/figure-shot.js drives headless.
(function () {
  if (window.__wbFig) return;

  const RAF = window.requestAnimationFrame.bind(window);   // before the scene viewer swaps it
  const NOW = performance.now.bind(performance);
  const UI_ON = /[?&]wb=figures\b/.test(location.search) && !/[?&]wbheadless\b/.test(location.search);

  const CH = ['spine', 'headTilt', 'upperArmF', 'foreArmF', 'upperArmB', 'foreArmB',
    'thighF', 'shinF', 'thighB', 'shinB', 'rootY', 'rootX', 'rootRot', 'squash', 'lean'];
  const RANGE = { rootY: [-30, 30, 0.1], rootX: [-20, 20, 0.1], lean: [-15, 15, 0.1], squash: [-0.3, 0.3, 0.005],
    rootRot: [-1, 1, 0.01], headTilt: [-1, 1, 0.01] };
  const EASES = ['linear', 'none', 'sine.inOut', 'sine.out', 'sine.in', 'quad.out', 'cubic.in', 'cubic.out', 'cubic.inOut',
    'expo.out', 'expo.in', 'back.in', 'back.out', 'elastic.out', 'power2.out', 'power3.out', 'power2.inOut'];
  const COLORS = [['Kael', '#4488ff'], ['Veran', '#3ddc84'], ['Entity', '#8844ff'], ['Creator', '#ff8822'],
    ['Enforcer', '#cc2244'], ['Fourth', '#d8a050'], ['Fallen God', '#e8b84a'], ['White', '#dde3ee']];
  const TMP_POSE = '__wbPose', TMP_CLIP = '__wbClip';

  const fig = {
    tab: 'pose', poseName: 'stand', clipName: 'idle',
    dirtyPoses: {}, dirtyClips: {}, base: null,
    frame: 0, playing: true, speed: 1, selKey: 0,
    facing: 1, color: '#4488ff', onion: true,
    hover: null, drag: null, undo: [],
    scene: { id: null, after: false, running: false, voice: false, guides: true, auto: true },
    ui: null,
  };

  const R = () => window.FigureRig;
  // A top-level const in the game, so not a window property.
  const registry = () => (typeof STORY_CHAPTER_REGISTRY !== 'undefined' ? STORY_CHAPTER_REGISTRY : null);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clone = o => JSON.parse(JSON.stringify(o));
  const userPoses = () => Object.keys(R().POSES).filter(n => !n.startsWith('__wb'));
  const userClips = () => Object.keys(R().CLIPS).filter(n => !n.startsWith('__wb'));

  function log(msg, cls) {
    if (!fig.ui) { console.log('[figures]', msg); return; }
    const d = document.createElement('div');
    d.textContent = msg; if (cls) d.className = cls;
    fig.ui.log.prepend(d);
    while (fig.ui.log.childNodes.length > 40) fig.ui.log.lastChild.remove();
  }

  function snapshotBase() { fig.base = { poses: clone(R().POSES), clips: clone(R().CLIPS) }; }

  // ---------- drawing ----------

  // Single-key clip around a pose, so _drawFigure renders exactly that pose.
  function ensureTemp(pose) {
    const rig = R();
    rig.POSES[TMP_POSE] = pose || rig.POSES[fig.poseName] || {};
    if (!rig.CLIPS[TMP_CLIP]) rig.CLIPS[TMP_CLIP] = { loop: false, dur: 1, keys: [{ t: 0, pose: TMP_POSE }] };
  }

  // x is snapped to a multiple of 40: _drawFigure phases ambient loops by (x*7)%40.
  const snap40 = x => Math.round(x / 40) * 40;
  // The rig's anchor is not at the feet: a standing figure's feet land ~13 units below y.
  // Studio and sheets put the feet of the standing pose on the floor line instead.
  let _foot = null;
  function footOff() {
    if (_foot === null) { const j = R().solve(Object.assign({}, R().BASE), 0, 0, 1, 1); _foot = Math.max(j.footF.y, j.footB.y); }
    return _foot;
  }
  const anchorY = (floorY, s) => floorY - footOff() * s;

  // y is the floor line in all of these.
  function drawPose(c, pose, x, y, scale, facing, color, alpha) {
    ensureTemp(pose);
    if (window._sceneSetBeatT) _sceneSetBeatT(0);
    _sceneDrawFigure(c, snap40(x), anchorY(y, scale), color, facing, TMP_CLIP, 0, alpha == null ? 1 : alpha, scale);
  }
  function drawClip(c, name, frame, x, y, scale, facing, color, alpha) {
    if (window._sceneSetBeatT) _sceneSetBeatT(frame);
    _sceneDrawFigure(c, snap40(x), anchorY(y, scale), color, facing, name, frame, alpha == null ? 1 : alpha, scale);
  }

  function joints(pose, x, y, s, facing) { return R().solve(pose, snap40(x), anchorY(y, s), s, facing); }

  // ---------- pose editing ----------

  function curPose() {
    if (fig.tab === 'clip') {
      const k = curClip().keys[fig.selKey];
      return k ? k.pose : null;
    }
    return fig.poseName;
  }
  function curClip() { return R().CLIPS[fig.clipName]; }

  function pushUndo() {
    const name = curPose();
    if (!name) return;
    fig.undo.push({ kind: 'pose', name, before: clone(R().POSES[name] || {}), dirty: !!fig.dirtyPoses[name] });
    if (fig.undo.length > 100) fig.undo.shift();
  }
  function pushUndoClip() {
    fig.undo.push({ kind: 'clip', name: fig.clipName, before: clone(curClip()), dirty: !!fig.dirtyClips[fig.clipName] });
  }
  function undo() {
    const u = fig.undo.pop();
    if (!u) return;
    if (u.kind === 'pose') { R().POSES[u.name] = u.before; if (!u.dirty) delete fig.dirtyPoses[u.name]; }
    else { R().CLIPS[u.name] = u.before; if (!u.dirty) delete fig.dirtyClips[u.name]; }
    refresh();
  }

  function setChannel(name, ch, v) {
    const p = R().POSES[name];
    if (!p) return;
    if (v === null) delete p[ch]; else p[ch] = v;
    fig.dirtyPoses[name] = true;
  }

  // Angle nearest to `ref` among a + 2*PI*k, so dragging past +-PI doesn't jump a full turn.
  function near(a, ref) {
    if (typeof ref !== 'number') return a;
    while (a - ref > Math.PI) a -= 2 * Math.PI;
    while (ref - a > Math.PI) a += 2 * Math.PI;
    return a;
  }

  // Inverse of solve()'s step(): the facing-right channel angle that points from p to m.
  function channelAngle(J, p, m, sy, pose) {
    const sq = pose.squash || 0, vx = 1 - sq * 0.55;
    const world = Math.atan2((m.y - p.y) / sy, (m.x - p.x) / vx);
    const a = world - J.rot;
    return J.facing > 0 ? a : Math.PI - a;
  }

  // Which joint a drag moves, and what it writes.
  const HANDLES = [
    ['head', 'chest', 'headTilt'], ['chest', 'hip', 'spine'], ['hip', null, 'hip'],
    ['elbowF', 'shoulder', 'upperArmF'], ['handF', 'elbowF', 'foreArmF'],
    ['elbowB', 'shoulder', 'upperArmB'], ['handB', 'elbowB', 'foreArmB'],
    ['kneeF', 'hip', 'thighF'], ['footF', 'kneeF', 'shinF'],
    ['kneeB', 'hip', 'thighB'], ['footB', 'kneeB', 'shinB'],
  ];

  function applyDrag(m) {
    const name = curPose(), d = fig.drag, st = fig.stage;
    const pose = R().POSES[name];
    if (!pose || !d) return;
    const full = Object.assign({}, R().BASE, pose);
    const J = joints(full, st.x, st.y, st.s, fig.facing);
    const sq = full.squash || 0, vy = 1 + sq;
    if (d.ch === 'hip') {
      const L = R().LENGTHS;
      setChannel(name, 'lean', Math.round(((m.x - snap40(st.x)) / (J.facing * st.s) - (full.rootX || 0)) * 10) / 10);
      setChannel(name, 'rootY', Math.round(((m.y - anchorY(st.y, st.s)) / st.s + L.hipRise * vy) * 10) / 10);
    } else if (d.ch === 'headTilt') {
      const th = channelAngle(J, J.chest, m, vy, full);
      setChannel(name, 'headTilt', Math.round(((near(th, full.spine) - full.spine) * J.facing) * 100) / 100);
    } else {
      const sy = d.ch === 'spine' ? vy : 1;
      const th = channelAngle(J, J[d.from], m, sy, full);
      setChannel(name, d.ch, Math.round(near(th, full[d.ch]) * 100) / 100);
    }
    syncPoseFields();
  }

  // ---------- clip editing ----------

  function sortKeys(clip) {
    const sel = clip.keys[fig.selKey];
    clip.keys.sort((a, b) => a.t - b.t);
    fig.selKey = Math.max(0, clip.keys.indexOf(sel));
  }
  function clipEdit(fn) {
    pushUndoClip();
    fn(curClip());
    fig.dirtyClips[fig.clipName] = true;
    refresh();
  }
  function clipLen(clip) { return clip.loop ? clip.dur : clip.dur + (clip.hold ? 50 : 30); }

  // ---------- save / reload ----------

  async function save() {
    const poses = {}, clips = {};
    for (const n in fig.dirtyPoses) if (R().POSES[n]) poses[n] = R().POSES[n];
    for (const n in fig.dirtyClips) if (R().CLIPS[n]) clips[n] = R().CLIPS[n];
    if (!Object.keys(poses).length && !Object.keys(clips).length) { log('nothing to save'); return { changed: [] }; }
    const r = await fetch('/wb/rig/save', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poses, clips }) });
    const j = await r.json();
    if (!r.ok) { log(j.error, 'err'); throw new Error(j.error); }
    for (const c of j.changed) log(c, 'ok');
    fig.dirtyPoses = {}; fig.dirtyClips = {};
    fig._ignoreRigEvent = NOW();
    snapshotBase();
    refresh();
    return j;
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      let err = null;
      const onErr = e => { if (e.filename && e.filename.includes(src.split('/').pop())) err = e.message + ' (line ' + e.lineno + ')'; };
      window.addEventListener('error', onErr);
      const s = document.createElement('script');
      s.src = './' + src + '?wbt=' + Date.now();
      s.onload = () => { window.removeEventListener('error', onErr); s.remove(); err ? rej(new Error(err)) : res(); };
      s.onerror = () => { window.removeEventListener('error', onErr); s.remove(); rej(new Error('could not load ' + src)); };
      document.head.append(s);
    });
  }

  // Unsaved studio edits win over the file for the entries they touch.
  async function reloadRig() {
    const keepP = {}, keepC = {};
    for (const n in fig.dirtyPoses) keepP[n] = clone(R().POSES[n]);
    for (const n in fig.dirtyClips) keepC[n] = clone(R().CLIPS[n]);
    await loadScript('js/smb-figure-rig.js');
    snapshotBase();
    Object.assign(R().POSES, keepP);
    Object.assign(R().CLIPS, keepC);
    const kept = Object.keys(keepP).length + Object.keys(keepC).length;
    log('rig reloaded from disk' + (kept ? `, ${kept} unsaved studio edit(s) kept on top` : ''), 'ok');
    refresh();
  }

  function listen() {
    try {
      const es = new EventSource('/wb/events');
      es.addEventListener('rig', () => {
        if (fig._ignoreRigEvent && NOW() - fig._ignoreRigEvent < 1500) return;   // our own save
        reloadRig().then(() => { if (fig.scene.running) restartScene(sceneState() ? sceneState().beat : 0); })
          .catch(e => log('rig: ' + e.message, 'err'));
      });
      es.addEventListener('scene', ev => {
        if (!fig.scene.auto) return;
        const { src } = JSON.parse(ev.data);
        loadScript(src).then(() => {
          log(`${src.split('/').pop()} reloaded`, 'ok');
          if (fig.scene.running) restartScene(sceneState() ? sceneState().beat : 0);
        }).catch(e => log(`${src.split('/').pop()}: ${e.message}`, 'err'));
      });
    } catch (e) {}
  }

  // ---------- scene viewer: a virtual clock over requestAnimationFrame ----------

  const vc = { on: false, q: [], now: 0, playing: true, speed: 1, acc: 0 };
  function vcInstall() {
    if (vc.on) return;
    vc.on = true; vc.q = []; vc.now = NOW(); vc.acc = 0;
    window.requestAnimationFrame = cb => { vc.q.push(cb); return vc.q.length; };
    performance.now = () => vc.now;
    const tick = () => {
      if (!vc.on) return;
      if (vc.playing) { vc.acc += vc.speed; while (vc.acc >= 1) { vc.acc -= 1; vcStep(); } }
      fitScene();
      drawGuides();
      RAF(tick);
    };
    RAF(tick);
  }
  function vcStep(n = 1) {
    for (let i = 0; i < n; i++) {
      vc.now += 1000 / 60;
      const q = vc.q; vc.q = [];
      for (const cb of q) { try { cb(vc.now); } catch (e) { console.error('[figures] frame error', e); } }
    }
  }
  function vcUninstall() {
    if (!vc.on) return;
    vc.on = false;
    window.requestAnimationFrame = RAF;
    delete performance.now;
    const q = vc.q; vc.q = [];
    for (const cb of q) RAF(cb);
  }

  const sceneCanvas = () => [...document.querySelectorAll('canvas')].filter(c => c.style.zIndex === '9100').pop() || null;
  const sceneState = () => (window._sceneDebugState ? _sceneDebugState() : null);

  function sceneChapters() {
    const specs = window.STORY_SCENE_SPECS || {};
    return (registry() || [])
      .filter(c => specs[c.id] && (c.narrative || c.lines || c.text))
      .map(c => ({ id: c.id, title: c.title || '', after: !!c.afterNarrative }));
  }

  function startScene(id, after) {
    const ch0 = STORY_CHAPTER_REGISTRY.find(c => c.id === id);
    if (!ch0) throw new Error('no chapter ' + id);
    let ch = ch0, lines = ch0.narrative || ch0.lines || ch0.text;
    if (after && ch0.afterNarrative) {
      const off = window._storyBeatCount(lines);
      lines = ch0.afterNarrative;
      ch = Object.assign({}, ch0, { noFight: true, _sceneBeatOffset: off });
    }
    try { if (typeof tutorialActive !== 'undefined') tutorialActive = false; } catch (e) {}
    try {
      if (typeof settings !== 'undefined') {
        if (fig.scene.voicePrev === undefined) fig.scene.voicePrev = settings.storyVoice;
        settings.storyVoice = fig.scene.voice;
      }
    } catch (e) {}
    vcInstall();
    fig.scene.id = id; fig.scene.after = !!after; fig.scene.running = true;
    showNarrativeScene(lines, ch, () => { fig.scene.running = false; refreshScene(); }, { cinematic: true, holdLastBeat: true });
    vcStep(1);
  }

  // Click forward to beat b. A click finishes the typing first, then advances.
  function toBeat(b) {
    const cv = sceneCanvas();
    for (let guard = 0; guard < 400; guard++) {
      const s = sceneState();
      if (!s || !cv || s.beat >= b) break;
      cv.dispatchEvent(new MouseEvent('click', { clientX: 4, clientY: 4, bubbles: true }));
    }
    vcStep(1);
  }

  function restartScene(beat) {
    if (fig.scene.id == null) return;
    startScene(fig.scene.id, fig.scene.after);
    if (beat > 0) toBeat(beat);
    refreshScene();
  }

  function closeScene() {
    const cv = sceneCanvas();
    if (cv) { vc.playing = true; try { cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); } catch (e) {} vcStep(2); }
    const left = sceneCanvas();
    if (left) left.remove();
    fig.scene.running = false;
    vcUninstall();
    try { if (fig.scene.voicePrev !== undefined) { settings.storyVoice = fig.scene.voicePrev; fig.scene.voicePrev = undefined; } } catch (e) {}
    clearGuides();
  }

  // The scene canvas is full-window; in the studio it is scaled to the space left of the
  // panel. Its click handling reads its own on-screen rect, so clicks still land right.
  const SIDE_W = 360;
  function fitScene() {
    const cv = sceneCanvas();
    if (!cv || !fig.ui || fig.tab !== 'scene') return;
    const W = Math.max(200, innerWidth - SIDE_W), H = W * cv.height / cv.width;
    const top = Math.max(0, (innerHeight - H) / 2);
    const want = `${W}px|${H}px|${top}px`;
    if (cv._wbFit === want) return;
    cv._wbFit = want;
    Object.assign(cv.style, { left: '0px', top: top + 'px', right: 'auto', bottom: 'auto', width: W + 'px', height: H + 'px' });
  }

  function drawGuides() {
    const g = fig.ui && fig.ui.guides;
    if (!g) return;
    const w = innerWidth, h = innerHeight, dpr = devicePixelRatio || 1;
    if (g.width !== w * dpr) { g.width = w * dpr; g.height = h * dpr; }
    const c = g.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const cv = sceneCanvas();
    if (!fig.scene.guides || !fig.scene.running || !cv) return;
    const r = cv.getBoundingClientRect();
    c.lineWidth = 1; c.font = '11px ui-monospace, Menlo, monospace';
    const line = (fy, col, label) => {
      const y = r.top + r.height * fy;
      c.strokeStyle = col; c.setLineDash([6, 6]);
      c.beginPath(); c.moveTo(r.left, y); c.lineTo(r.right, y); c.stroke(); c.setLineDash([]);
      c.fillStyle = col; c.fillText(label, r.left + 8, y - 4);
    };
    line(0.74, 'rgba(120,255,170,.7)', 'footY 0.74: rig anchor at zoom 1 (feet stand ~13 x scale below it)');
    line(0.82, 'rgba(255,200,90,.7)', 'caption 0.82');
    c.strokeStyle = 'rgba(255,255,255,.22)';
    for (const fx of [0.15, 0.85]) { const x = r.left + r.width * fx; c.beginPath(); c.moveTo(x, r.top); c.lineTo(x, r.bottom); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,.4)'; c.fillText('0.15', r.left + r.width * 0.15 + 4, r.top + 14); c.fillText('0.85', r.left + r.width * 0.85 + 4, r.top + 14);
  }
  function clearGuides() { const g = fig.ui && fig.ui.guides; if (g) g.getContext('2d').clearRect(0, 0, g.width, g.height); }

  // ---------- stage ----------

  function stageLayout() {
    const cv = fig.ui.stage, r = cv.getBoundingClientRect();
    const tl = fig.tab === 'clip' ? 104 : 0;
    const h = r.height - tl;
    const s = Math.max(2, Math.min(6.2, h * 0.62 / 92));
    fig.stage = { w: r.width, h: r.height, x: r.width * 0.40, y: h * 0.80, s, tl };
    return fig.stage;
  }

  function stagePose() {
    // The figure on stage: the edited pose, or the clip frame (exact key pose while paused on a key).
    if (fig.tab === 'pose') return { pose: R().POSES[fig.poseName] };
    const clip = curClip(), k = clip && clip.keys[fig.selKey];
    if (!fig.playing && k && Math.round(fig.frame) === k.t) return { pose: R().POSES[k.pose], onKey: true };
    return { clipFrame: fig.frame };
  }

  function drawStage() {
    const ui = fig.ui, cv = ui.stage, dpr = devicePixelRatio || 1;
    const st = stageLayout();
    if (cv.width !== Math.round(st.w * dpr) || cv.height !== Math.round(st.h * dpr)) {
      cv.width = Math.round(st.w * dpr); cv.height = Math.round(st.h * dpr);
    }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, st.h);
    g.addColorStop(0, '#141826'); g.addColorStop(1, '#0a0c12');
    c.fillStyle = g; c.fillRect(0, 0, st.w, st.h);
    // Floor and a light grid for reading angles.
    c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1;
    for (let gx = snap40(st.x) % 40; gx < st.w; gx += 40) { c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, st.y); c.stroke(); }
    c.strokeStyle = 'rgba(160,190,255,.35)'; c.beginPath(); c.moveTo(0, st.y); c.lineTo(st.w, st.y); c.stroke();

    const what = stagePose();
    const clip = fig.tab === 'clip' ? curClip() : null;
    // Onion skins: the keys either side of the playhead.
    if (clip && fig.onion) {
      const ks = clip.keys;
      let prev = null, next = null;
      for (const k of ks) { if (k.t < fig.frame - 0.01) prev = k; else if (k.t > fig.frame + 0.01 && !next) next = k; }
      if (prev) drawPose(c, Object.assign({}, R().POSES[prev.pose]), st.x, st.y, st.s, fig.facing, '#ff6a6a', 0.22);
      if (next) drawPose(c, Object.assign({}, R().POSES[next.pose]), st.x, st.y, st.s, fig.facing, '#6aff9a', 0.22);
    }
    if (what.pose) drawPose(c, what.pose, st.x, st.y, st.s, fig.facing, fig.color, 1);
    else drawClip(c, fig.clipName, what.clipFrame, st.x, st.y, st.s, fig.facing, fig.color, 1);

    // Scene-size preview: the size the figure is actually drawn in a scene on this screen.
    const ss = Math.max(1, Math.min(2.4, innerHeight / 430));
    const px = st.w * 0.82, py = st.y;
    c.fillStyle = 'rgba(255,255,255,.35)'; c.font = '11px ui-monospace, Menlo, monospace';
    c.fillText('scene size', px - 30, py + 18);
    if (what.pose) drawPose(c, what.pose, px, py, ss, fig.facing, fig.color, 1);
    else drawClip(c, fig.clipName, what.clipFrame, px, py, ss, fig.facing, fig.color, 1);

    // Joint handles, when the pose on stage is editable.
    fig.handles = null;
    const editName = curPose();
    if (what.pose && editName && R().POSES[editName]) {
      const full = Object.assign({}, R().BASE, R().POSES[editName]);
      const J = joints(full, st.x, st.y, st.s, fig.facing);
      fig.handles = HANDLES.map(([j, from, ch]) => ({ j, from, ch, x: J[j].x, y: J[j].y, back: /B$/.test(j) }));
      for (const hd of fig.handles) {
        const on = fig.hover === hd || (fig.drag && fig.drag.j === hd.j);
        c.beginPath(); c.arc(hd.x, hd.y, on ? 8 : 6, 0, Math.PI * 2);
        c.lineWidth = 2; c.strokeStyle = on ? '#ffe066' : (hd.back ? '#8fa3c8' : '#ffffff');
        c.fillStyle = hd.back ? 'rgba(0,0,0,.4)' : (on ? 'rgba(255,224,102,.5)' : 'rgba(255,255,255,.25)');
        c.fill(); c.stroke();
      }
      if (fig.hover || fig.drag) {
        const hd = fig.drag ? fig.handles.find(h => h.j === fig.drag.j) : fig.hover;
        const v = hd.ch === 'hip' ? `lean ${full.lean}  rootY ${full.rootY}` : `${hd.ch} ${(+full[hd.ch]).toFixed(2)}`;
        c.fillStyle = '#ffe066'; c.font = '12px ui-monospace, Menlo, monospace'; c.fillText(v, hd.x + 12, hd.y - 10);
      }
    }
    // Title strip.
    c.fillStyle = '#cfd6e6'; c.font = 'bold 14px ui-monospace, Menlo, monospace';
    const title = fig.tab === 'pose' ? `pose  ${fig.poseName}` :
      `clip  ${fig.clipName}   f ${Math.floor(fig.frame)} / ${clip ? clip.dur : 0}${what.onKey ? '   (editing key ' + fig.selKey + ': ' + editName + ')' : ''}`;
    c.fillText(title, 16, 26);
    c.font = '11px ui-monospace, Menlo, monospace'; c.fillStyle = 'rgba(207,214,230,.5)';
    c.fillText(fig.tab === 'pose' ? 'drag joints · hollow = far limbs · ctrl+z undo · ctrl+s save'
      : 'space play · ←/→ frame · [ ] keys · click a key to edit its pose · red/green = prev/next key', 16, 44);

    if (fig.tab === 'clip') drawTimeline(c, st);
  }

  function tlGeom(st) {
    const x0 = 24, x1 = st.w - 24, y0 = st.h - st.tl + 26, y1 = st.h - 14;
    return { x0, x1, y0, y1, fx: f => x0 + (x1 - x0) * f / Math.max(1, clipLen(curClip())) };
  }
  function drawTimeline(c, st) {
    const clip = curClip(); if (!clip) return;
    const T = tlGeom(st), len = clipLen(clip);
    c.fillStyle = 'rgba(255,255,255,.04)'; c.fillRect(T.x0, T.y0, T.x1 - T.x0, T.y1 - T.y0);
    // Past dur (non-loop): where the last pose holds.
    if (!clip.loop) { c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(T.fx(clip.dur), T.y0, T.x1 - T.fx(clip.dur), T.y1 - T.y0); }
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.fillStyle = 'rgba(255,255,255,.35)'; c.font = '10px ui-monospace, Menlo, monospace';
    for (let f = 0; f <= len; f += 10) {
      const x = T.fx(f);
      c.beginPath(); c.moveTo(x, T.y1 - (f % 60 ? 4 : 10)); c.lineTo(x, T.y1); c.stroke();
      if (f % 60 === 0) c.fillText(String(f), x + 2, T.y1 - 2);
    }
    clip.keys.forEach((k, i) => {
      const x = T.fx(k.t), y = (T.y0 + T.y1) / 2 - 6, sel = i === fig.selKey;
      c.save(); c.translate(x, y); c.rotate(Math.PI / 4);
      c.fillStyle = sel ? '#ffe066' : (fig.dirtyPoses[k.pose] ? '#ffb347' : '#9fb4e0');
      c.fillRect(-6, -6, 12, 12); c.restore();
      c.fillStyle = sel ? '#ffe066' : 'rgba(207,214,230,.7)';
      c.fillText(k.pose + (k.ease ? ' · ' + k.ease : ''), x + 9, y - 8 - (i % 3) * 11);
    });
    const px = T.fx(fig.frame);
    c.strokeStyle = '#ff5577'; c.lineWidth = 2; c.beginPath(); c.moveTo(px, T.y0 - 6); c.lineTo(px, T.y1); c.stroke();
    fig.tl = T;
  }

  function stageMouse(e) {
    const r = fig.ui.stage.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function hitHandle(m) {
    if (!fig.handles) return null;
    let best = null, bd = 14 * 14;
    for (const hd of fig.handles) { const d = (hd.x - m.x) ** 2 + (hd.y - m.y) ** 2; if (d < bd) { bd = d; best = hd; } }
    return best;
  }
  function onDown(e) {
    const m = stageMouse(e);
    const hd = hitHandle(m);
    if (hd) { pushUndo(); fig.drag = hd; e.preventDefault(); return; }
    if (fig.tab === 'clip' && fig.tl && m.y > fig.tl.y0 - 10) {
      const clip = curClip();
      const ki = clip.keys.findIndex(k => Math.abs(fig.tl.fx(k.t) - m.x) < 9);
      fig.playing = false;
      if (ki >= 0) { fig.selKey = ki; fig.frame = clip.keys[ki].t; fig.tlDrag = { ki, moved: false }; pushUndoClip(); }
      else fig.frame = Math.max(0, Math.round((m.x - fig.tl.x0) / (fig.tl.x1 - fig.tl.x0) * clipLen(clip)));
      fig.tlScrub = ki < 0;
      refresh();
    }
  }
  function onMove(e) {
    const m = stageMouse(e);
    if (fig.drag) { applyDrag(m); return; }
    if (fig.tlDrag) {
      const clip = curClip(), k = clip.keys[fig.tlDrag.ki];
      const t = Math.max(0, Math.min(clip.dur, Math.round((m.x - fig.tl.x0) / (fig.tl.x1 - fig.tl.x0) * clipLen(clip))));
      if (t !== k.t && fig.tlDrag.ki !== 0) { k.t = t; fig.frame = t; fig.tlDrag.moved = true; fig.dirtyClips[fig.clipName] = true; }
      return;
    }
    if (fig.tlScrub) { fig.frame = Math.max(0, Math.round((m.x - fig.tl.x0) / (fig.tl.x1 - fig.tl.x0) * clipLen(curClip()))); return; }
    fig.hover = hitHandle(m);
    fig.ui.stage.style.cursor = fig.hover ? 'grab' : 'default';
  }
  function onUp() {
    if (fig.drag) { fig.drag = null; refresh(); }
    if (fig.tlDrag) { if (fig.tlDrag.moved) { sortKeys(curClip()); } else fig.undo.pop(); fig.tlDrag = null; refresh(); }
    fig.tlScrub = false;
  }

  function loop() {
    if (fig.ui && fig.ui.root.style.display !== 'none' && fig.tab !== 'scene') {
      if (fig.tab === 'clip' && fig.playing && curClip()) {
        fig.frame += fig.speed;
        const len = clipLen(curClip());
        if (fig.frame >= len) fig.frame = curClip().loop ? fig.frame % len : 0;
      }
      try { drawStage(); } catch (e) { console.error(e); }
    }
    if (fig.tab === 'scene' && fig.ui) refreshSceneReadout();
    RAF(loop);
  }

  // ---------- UI ----------

  const CSS = `
  #wbFig{position:fixed;inset:0;z-index:2147483000;display:flex;background:#0a0c12;font:12px/1.35 ui-monospace,Menlo,monospace;color:#d8dce6}
  #wbFig.scene{background:transparent;pointer-events:none;justify-content:flex-end}
  #wbFig.scene #wbFigStage{display:none}
  #wbFigStage{flex:1;min-width:0;height:100%;display:block}
  #wbFigSide{width:360px;height:100%;overflow-y:auto;box-sizing:border-box;padding:10px 12px 40px;background:#12141b;border-left:1px solid #2a2f3d;pointer-events:auto}
  #wbFigSide h3{margin:12px 0 6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7f8aa3}
  #wbFigSide .tabs{display:flex;gap:4px;margin:6px 0}
  #wbFigSide .row{display:grid;grid-template-columns:84px 1fr 62px 16px;gap:5px;align-items:center;margin:2px 0}
  #wbFigSide .row.base label{color:#5d6680} #wbFigSide .row.d label{color:#ffd84a}
  #wbFigSide input[type=range]{width:100%}
  #wbFigSide input[type=number],#wbFigSide input[type=text],#wbFigSide select{width:100%;box-sizing:border-box;background:#1c2030;color:#e8ebf2;border:1px solid #333a4d;border-radius:3px;padding:2px 4px;font:inherit}
  #wbFigSide button{background:#232a3d;color:#e8ebf2;border:1px solid #3a4360;border-radius:4px;padding:4px 8px;font:inherit;cursor:pointer}
  #wbFigSide button.on{background:#2f5bd8;border-color:#2f5bd8} #wbFigSide button.go{background:#1f8a4c;border-color:#1f8a4c}
  #wbFigSide button.x{padding:0 3px;border:none;background:none;color:#7f8aa3}
  #wbFigSide .btns{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0}
  #wbFigSide .note{color:#7f8aa3;font-size:11px;margin:3px 0}
  #wbFigSide .warn{color:#ffb347;font-size:11px;margin:3px 0}
  #wbFigSide .kv{display:grid;grid-template-columns:70px 1fr;gap:4px;margin:3px 0;align-items:center}
  #wbFigSide .text{background:#0d0f16;border:1px solid #232838;border-radius:4px;padding:6px;margin:4px 0;white-space:pre-wrap;max-height:120px;overflow:auto}
  #wbFigLog div{padding:1px 0;border-bottom:1px solid #1d2130} #wbFigLog .ok{color:#7ee2a0} #wbFigLog .err{color:#ff8a8a}
  #wbFigGuides{position:fixed;inset:0;z-index:9101;pointer-events:none}`;

  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      if (k === 'on') for (const ev in attrs.on) e.addEventListener(ev, attrs.on[ev]);
      else if (k === 'checked' || k === 'value' || k === 'textContent' || k === 'className' || k === 'disabled' || k === 'title') e[k] = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    for (const c of kids) if (c != null) e.append(c);
    return e;
  }
  const btn = (label, fn, cls) => el('button', { textContent: label, className: cls || '', on: { click: fn } });
  const opt = (v, label) => el('option', { value: v, textContent: label || v });

  function fillSelect(sel, items, value) {
    sel.innerHTML = '';
    for (const it of items) sel.append(Array.isArray(it) ? opt(it[0], it[1]) : opt(it));
    if (value != null) sel.value = value;
  }

  function channelRow(ch) {
    const [lo, hi, step] = RANGE[ch] || [-3.5, 4.8, 0.01];
    const rng = el('input', { type: 'range', min: lo, max: hi, step });
    const num = el('input', { type: 'number', step });
    const clr = el('button', { className: 'x', textContent: '×', title: 'back to base' });
    const row = el('div', { className: 'row' }, el('label', { textContent: ch }), rng, num, clr);
    const set = v => { const name = curPose(); if (!name) return; setChannel(name, ch, v); syncPoseFields(); };
    rng.addEventListener('pointerdown', pushUndo);
    rng.addEventListener('input', () => set(+rng.value));
    num.addEventListener('change', () => { pushUndo(); if (num.value !== '' && isFinite(+num.value)) set(+num.value); });
    clr.addEventListener('click', () => { pushUndo(); set(null); });
    row._sync = () => {
      const name = curPose(), p = name && R().POSES[name];
      const own = p && typeof p[ch] === 'number';
      const v = own ? p[ch] : R().BASE[ch];
      num.value = Math.round(v * 1000) / 1000; rng.value = v;
      row.className = 'row' + (own ? '' : ' base');
    };
    return row;
  }

  function syncPoseFields() {
    if (!fig.ui) return;
    for (const r of fig.ui.chRows) r._sync();
    const name = curPose();
    const used = userClips().filter(c => R().CLIPS[c].keys.some(k => k.pose === name));
    fig.ui.usedBy.textContent = name ? `used by: ${used.length ? used.join(', ') : 'no clip'}` : '';
    fig.ui.shared.textContent = fig.tab === 'clip' && used.length > 1 ? `Editing '${name}' changes all ${used.length} clips that use it. Fork it to change only this clip.` : '';
    markDirty();
  }

  function markDirty() {
    const n = Object.keys(fig.dirtyPoses).length + Object.keys(fig.dirtyClips).length;
    fig.ui.save.textContent = n ? `Save ${n}` : 'Save';
    fig.ui.save.classList.toggle('go', n > 0);
    fig.ui.dirtyList.textContent = n ? 'unsaved: ' + [...Object.keys(fig.dirtyPoses).map(p => 'pose ' + p),
      ...Object.keys(fig.dirtyClips).map(c => 'clip ' + c)].join(', ') : '';
  }

  function refreshClip() {
    const u = fig.ui, clip = curClip();
    if (!clip) return;
    fillSelect(u.clipSel, userClips(), fig.clipName);
    u.dur.value = clip.dur; u.loop.checked = !!clip.loop; u.hold.checked = !!clip.hold;
    fig.selKey = Math.min(fig.selKey, clip.keys.length - 1);
    const k = clip.keys[fig.selKey];
    fillSelect(u.keyPose, userPoses(), k.pose);
    fillSelect(u.keyEase, [['', '(none: sine.inOut)'], ...EASES.map(e => [e, e])], k.ease || '');
    u.keyT.value = k.t;
    u.keyT.disabled = fig.selKey === 0;
    u.keyLabel.textContent = `key ${fig.selKey + 1} of ${clip.keys.length}`;
    u.play.textContent = fig.playing ? 'Pause' : 'Play';
    for (const b of u.speedBtns) b.classList.toggle('on', +b.dataset.s === fig.speed);
  }

  function refresh() {
    if (!fig.ui) return;
    const u = fig.ui;
    for (const t of ['pose', 'clip', 'scene']) u.tabBtn[t].classList.toggle('on', fig.tab === t);
    u.root.classList.toggle('scene', fig.tab === 'scene');
    u.poseBox.style.display = fig.tab === 'pose' ? '' : 'none';
    u.clipBox.style.display = fig.tab === 'clip' ? '' : 'none';
    u.chBox.style.display = fig.tab === 'scene' ? 'none' : '';
    u.sceneBox.style.display = fig.tab === 'scene' ? '' : 'none';
    u.colorRow.style.display = fig.tab === 'scene' ? 'none' : '';
    fillSelect(u.poseSel, userPoses(), fig.poseName);
    if (fig.tab === 'clip') refreshClip();
    u.chTitle.textContent = fig.tab === 'clip' ? `Pose of the selected key` : 'Channels';
    syncPoseFields();
    refreshScene();
  }

  function refreshScene() {
    const u = fig.ui; if (!u) return;
    u.sceneRun.textContent = fig.scene.running ? 'Restart' : 'Play scene';
    u.scenePause.textContent = vc.playing ? 'Pause' : 'Resume';
    u.voice.classList.toggle('on', fig.scene.voice);
    u.guidesBtn.classList.toggle('on', fig.scene.guides);
    u.autoBtn.classList.toggle('on', fig.scene.auto);
    for (const b of u.sceneSpeedBtns) b.classList.toggle('on', +b.dataset.s === vc.speed);
  }

  function refreshSceneReadout() {
    const u = fig.ui, s = sceneState();
    if (!s) { u.sceneInfo.textContent = fig.scene.running ? 'scene ended' : 'not playing'; u.sceneText.textContent = ''; u.sceneSpec.textContent = ''; return; }
    const specIdx = s.beat + s.offset;
    const mism = s.staged && s.staged !== s.beats + s.offset ? `  ·  staged beats ${s.staged} vs text ${s.beats + s.offset}` : '';
    u.sceneInfo.textContent = `beat ${s.beat + 1}/${s.beats}  ·  frame ${s.beatT}${s.typed ? '' : '  ·  typing'}${mism}`;
    u.sceneInfo.className = mism ? 'warn' : 'note';
    const txt = (s.speaker && s.speaker !== 'none' ? `[${s.speaker}] ` : '') + s.text;
    if (u.sceneText.textContent !== txt) u.sceneText.textContent = txt;
    const spec = window.STORY_SCENE_SPECS && STORY_SCENE_SPECS[fig.scene.id];
    const bs = spec && spec.beats && (spec.beats[specIdx] || spec.beats[spec.beats.length - 1]);
    const sum = bs ? specSummary(bs, specIdx >= spec.beats.length) : '(no staged beat)';
    if (u.sceneSpec.textContent !== sum) u.sceneSpec.textContent = sum;
  }

  function specSummary(bs, reused) {
    const keys = arr => (arr || []).map(k => `${k.at}:${k.state || '·'}@${k.x != null ? k.x : '·'}${k.alpha === 0 ? '(hidden)' : ''}`).join('  ');
    const lines = [];
    if (reused) lines.push('(text has more beats than staging: reusing the last staged beat)');
    if (bs.playerPos) lines.push('Kael  ' + keys(bs.playerPos));
    if (bs.npcPos) lines.push('npc   ' + keys(bs.npcPos));
    (bs.extraFigures || []).forEach((f, i) => { if (f.pos && f.pos.some(k => k.alpha !== 0)) lines.push(`x${i}    ` + keys(f.pos)); });
    if (bs.camAnim) lines.push('cam   ' + bs.camAnim.map(k => `${k.at}:z${k.zoom}`).join(' '));
    const fx = (bs.effectsBehind || []).concat(bs.effects || []).map(e => `${e.type}@${e.startFrame || 0}`);
    if (fx.length) lines.push('fx    ' + fx.join(' '));
    return lines.join('\n');
  }

  function buildUI() {
    document.head.append(el('style', { textContent: CSS }));
    const u = fig.ui = {};
    u.stage = el('canvas', { id: 'wbFigStage' });
    u.guides = el('canvas', { id: 'wbFigGuides' });
    u.log = el('div', { id: 'wbFigLog' });

    u.tabBtn = {};
    const tabs = el('div', { className: 'tabs' }, ...['pose', 'clip', 'scene'].map(t => (u.tabBtn[t] = btn(t[0].toUpperCase() + t.slice(1), () => setTab(t)))));

    // Pose box
    u.poseSel = el('select', { on: { change: () => { fig.poseName = u.poseSel.value; refresh(); } } });
    u.usedBy = el('div', { className: 'note' });
    u.poseBox = el('div', {},
      el('h3', { textContent: 'Pose' }), u.poseSel,
      el('div', { className: 'btns' },
        btn('New from this', () => newPose(fig.poseName)),
        btn('Revert', () => revertPose(fig.poseName)),
        btn('Mirror check', () => { fig.facing *= -1; })));

    // Clip box
    u.clipSel = el('select', { on: { change: () => { fig.clipName = u.clipSel.value; fig.selKey = 0; fig.frame = 0; refresh(); } } });
    u.dur = el('input', { type: 'number', min: 1, step: 1, on: { change: () => clipEdit(c => { c.dur = Math.max(1, Math.round(+u.dur.value)); c.keys.forEach(k => { if (k.t > c.dur) k.t = c.dur; }); }) } });
    u.loop = el('input', { type: 'checkbox', on: { change: () => clipEdit(c => { c.loop = u.loop.checked; if (c.loop) delete c.hold; }) } });
    u.hold = el('input', { type: 'checkbox', on: { change: () => clipEdit(c => { if (u.hold.checked) { c.hold = true; c.loop = false; } else delete c.hold; }) } });
    u.play = btn('Pause', () => { fig.playing = !fig.playing; refresh(); });
    u.speedBtns = [1, 0.5, 0.25].map(s => { const b = btn(s + 'x', () => { fig.speed = s; refresh(); }); b.dataset.s = s; return b; });
    u.keyLabel = el('div', { className: 'note' });
    u.keyT = el('input', { type: 'number', min: 0, step: 1, on: { change: () => clipEdit(c => { c.keys[fig.selKey].t = Math.max(1, Math.min(c.dur, Math.round(+u.keyT.value))); sortKeys(c); fig.frame = c.keys[fig.selKey].t; }) } });
    u.keyPose = el('select', { on: { change: () => clipEdit(c => { c.keys[fig.selKey].pose = u.keyPose.value; }) } });
    u.keyEase = el('select', { on: { change: () => clipEdit(c => { if (u.keyEase.value) c.keys[fig.selKey].ease = u.keyEase.value; else delete c.keys[fig.selKey].ease; }) } });
    u.shared = el('div', { className: 'warn' });
    u.clipBox = el('div', {},
      el('h3', { textContent: 'Clip' }), u.clipSel,
      el('div', { className: 'kv' }, el('span', { textContent: 'dur' }), u.dur),
      el('div', { className: 'btns' }, el('label', {}, u.loop, ' loop'), el('label', {}, u.hold, ' hold last pose')),
      el('div', { className: 'btns' }, u.play, ...u.speedBtns, btn('Onion', function () { fig.onion = !fig.onion; this.classList.toggle('on', fig.onion); }, 'on'),
        btn('Mirror', () => { fig.facing *= -1; })),
      el('div', { className: 'btns' }, btn('New clip', newClip)),
      el('h3', { textContent: 'Key' }), u.keyLabel,
      el('div', { className: 'kv' }, el('span', { textContent: 't (frame)' }), u.keyT),
      el('div', { className: 'kv' }, el('span', { textContent: 'pose' }), u.keyPose),
      el('div', { className: 'kv' }, el('span', { textContent: 'ease in' }), u.keyEase),
      el('div', { className: 'btns' },
        btn('Add key here', addKey), btn('Delete key', delKey), btn('Fork pose', forkPose)),
      el('div', { className: 'note', textContent: 'A key\'s ease shapes the move INTO it. Hold = a second key with the same pose.' }));

    // Channels (shared by pose and clip tabs)
    u.chRows = CH.map(channelRow);
    u.chTitle = el('h3');
    u.chBox = el('div', {}, u.chTitle, u.shared, ...u.chRows, u.usedBy);

    // Scene box
    u.sceneSel = el('select');
    u.sceneAfter = el('input', { type: 'checkbox' });
    u.sceneRun = btn('Play scene', () => { try { const id = +u.sceneSel.value; startScene(id, u.sceneAfter.checked); vc.playing = true; refreshScene(); } catch (e) { log(e.message, 'err'); } });
    u.scenePause = btn('Pause', () => { vc.playing = !vc.playing; refreshScene(); });
    u.sceneSpeedBtns = [2, 1, 0.5, 0.25].map(s => { const b = btn(s + 'x', () => { vc.speed = s; refreshScene(); }); b.dataset.s = s; return b; });
    u.voice = btn('Voice', () => { fig.scene.voice = !fig.scene.voice; try { settings.storyVoice = fig.scene.voice; } catch (e) {} refreshScene(); });
    u.guidesBtn = btn('Guides', () => { fig.scene.guides = !fig.scene.guides; refreshScene(); });
    u.autoBtn = btn('Auto reload', () => { fig.scene.auto = !fig.scene.auto; refreshScene(); });
    u.sceneInfo = el('div', { className: 'note' });
    u.sceneText = el('div', { className: 'text' });
    u.sceneSpec = el('div', { className: 'text' });
    u.sceneBox = el('div', {},
      el('h3', { textContent: 'Scene (registry id; the player\'s chapter N is id N-1)' }), u.sceneSel,
      el('div', { className: 'btns' }, el('label', {}, u.sceneAfter, ' after-fight part')),
      el('div', { className: 'btns' }, u.sceneRun, u.scenePause, btn('Close', () => { closeScene(); refreshScene(); })),
      el('div', { className: 'btns' },
        btn('◀ beat', () => { const s = sceneState(); restartScene(Math.max(0, (s ? s.beat : 0) - 1)); }),
        btn('beat ▶', () => { const s = sceneState(); if (s) toBeat(s.beat + 1); }),
        btn('Replay beat', () => { const s = sceneState(); restartScene(s ? s.beat : 0); }),
        btn('+1f', () => { vc.playing = false; vcStep(1); refreshScene(); }),
        btn('+10f', () => { vc.playing = false; vcStep(10); refreshScene(); })),
      el('div', { className: 'btns' }, ...u.sceneSpeedBtns),
      el('div', { className: 'btns' }, u.voice, u.guidesBtn, u.autoBtn),
      u.sceneInfo, u.sceneText,
      el('h3', { textContent: 'Staged beat' }), u.sceneSpec,
      el('div', { className: 'note', textContent: 'Save a file in js/story/scenes/ (or the rig) and the scene reloads at this beat.' }));

    u.save = btn('Save', () => save().catch(() => {}));
    u.dirtyList = el('div', { className: 'note' });
    u.colorSel = el('select', { on: { change: () => { fig.color = u.colorSel.value; } } });
    fillSelect(u.colorSel, COLORS.map(([n, c]) => [c, n]), fig.color);

    const side = el('div', { id: 'wbFigSide' },
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center' },
        el('b', { textContent: 'Figure studio', style: 'color:#fff;font-size:13px' }),
        el('a', { href: location.pathname, textContent: 'weapons →', style: 'color:#7fa8ff;font-size:11px' })),
      tabs, u.poseBox, u.clipBox, u.sceneBox, u.chBox,
      (u.colorRow = el('div', { className: 'kv' }, el('span', { textContent: 'colour' }), u.colorSel)),
      el('h3', { textContent: 'Save' }),
      el('div', { className: 'btns' }, u.save, btn('Undo', undo)),
      u.dirtyList,
      el('div', { className: 'note', textContent: 'Writes edited poses and clips into js/smb-figure-rig.js, changing only what you changed.' }),
      u.log);
    u.root = el('div', { id: 'wbFig' }, u.stage, side);
    document.body.append(u.root, u.guides);

    u.stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    // Typing in the panel must not reach the game's key handlers (bubble phase, after the input got it).
    for (const ev of ['keydown', 'keyup', 'keypress']) side.addEventListener(ev, e => e.stopPropagation());
    // Studio shortcuts. Capture phase so the game underneath never sees them.
    window.addEventListener('keydown', e => {
      if (fig.tab === 'scene') return;
      const typing = /INPUT|SELECT|TEXTAREA/.test((e.target && e.target.tagName) || '');
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 's') { e.preventDefault(); save().catch(() => {}); }
      else if (mod && e.key === 'z' && !typing) { e.preventDefault(); undo(); }
      else if (typing) return;
      else if (fig.tab === 'clip' && curClip()) {
        const clip = curClip();
        if (e.key === ' ') { e.preventDefault(); fig.playing = !fig.playing; refresh(); }
        else if (e.key === 'ArrowRight') { fig.playing = false; fig.frame = Math.min(clipLen(clip), Math.floor(fig.frame) + 1); }
        else if (e.key === 'ArrowLeft') { fig.playing = false; fig.frame = Math.max(0, Math.ceil(fig.frame) - 1); }
        else if (e.key === ']' || e.key === '[') {
          fig.playing = false;
          fig.selKey = Math.max(0, Math.min(clip.keys.length - 1, fig.selKey + (e.key === ']' ? 1 : -1)));
          fig.frame = clip.keys[fig.selKey].t; refresh();
        }
      }
      e.stopImmediatePropagation();
    }, true);

    fillSelect(u.sceneSel, sceneChapters().map(c => [c.id, `${c.id} · ${c.title}${c.after ? ' (+after)' : ''}`]));
    refresh();
  }

  function setTab(t) {
    if (fig.tab === 'scene' && t !== 'scene') closeScene();
    fig.tab = t;
    if (t === 'clip') fig.playing = true;
    refresh();
  }

  function askName(what, suggestion) {
    const n = prompt(`Name for the new ${what}`, suggestion);
    if (!n) return null;
    if (!/^[A-Za-z_$][\w$]*$/.test(n) || n.startsWith('__wb')) { log('names are letters, digits and _ (no spaces)', 'err'); return null; }
    return n;
  }
  function newPose(from) {
    const n = askName('pose', from + '2'); if (!n) return;
    if (R().POSES[n]) { log(`pose ${n} already exists`, 'err'); return; }
    R().POSES[n] = clone(R().POSES[from] || {});
    fig.dirtyPoses[n] = true; fig.poseName = n; refresh();
  }
  function revertPose(name) {
    if (!fig.base.poses[name]) { delete R().POSES[name]; delete fig.dirtyPoses[name]; fig.poseName = 'stand'; }
    else { pushUndo(); R().POSES[name] = clone(fig.base.poses[name]); delete fig.dirtyPoses[name]; }
    refresh();
  }
  function newClip() {
    const n = askName('clip', 'myClip'); if (!n) return;
    if (R().CLIPS[n]) { log(`clip ${n} already exists`, 'err'); return; }
    R().CLIPS[n] = { loop: false, hold: true, dur: 120, keys: [{ t: 0, pose: 'stand' }, { t: 20, pose: fig.poseName, ease: 'cubic.out' }, { t: 120, pose: fig.poseName }] };
    fig.dirtyClips[n] = true; fig.clipName = n; fig.selKey = 1; fig.frame = 0; refresh();
  }
  function addKey() {
    clipEdit(c => {
      const t = Math.max(1, Math.min(c.dur, Math.round(fig.frame)));
      if (c.keys.some(k => k.t === t)) return;
      const prev = [...c.keys].reverse().find(k => k.t < t) || c.keys[0];
      c.keys.push({ t, pose: prev.pose, ease: 'sine.inOut' });
      fig.selKey = c.keys.length - 1; sortKeys(c);
    });
  }
  function delKey() {
    clipEdit(c => { if (c.keys.length > 1 && fig.selKey > 0) { c.keys.splice(fig.selKey, 1); fig.selKey = Math.max(0, fig.selKey - 1); } });
  }
  function forkPose() {
    const k = curClip().keys[fig.selKey];
    const n = askName('pose', `${fig.clipName}${k.pose[0].toUpperCase()}${k.pose.slice(1)}`); if (!n) return;
    if (R().POSES[n]) { log(`pose ${n} already exists`, 'err'); return; }
    R().POSES[n] = clone(R().POSES[k.pose]);
    fig.dirtyPoses[n] = true;
    clipEdit(c => { c.keys[fig.selKey].pose = n; });
  }

  // ---------- contact sheets (figure-shot.js) ----------

  // opts: { poses:[names] } or { clip:name, frames:n }; facing, color, scale.
  function sheet(opts) {
    const facing = opts.facing || 1, color = opts.color || '#4488ff';
    const S = opts.scale || 3.2, SS = opts.sceneScale || 1.67;
    const cells = [];
    if (opts.poses) for (const n of opts.poses) {
      if (!R().POSES[n]) throw new Error('no pose ' + n);
      cells.push({ label: n, pose: R().POSES[n] });
    }
    if (opts.clip) {
      const clip = R().CLIPS[opts.clip];
      if (!clip) throw new Error('no clip ' + opts.clip);
      const len = clip.loop ? clip.dur : clip.dur + (clip.hold ? 40 : 20);
      const n = Math.max(2, opts.frames || 12);
      const fr = new Set();
      for (let i = 0; i < n; i++) fr.add(Math.round(len * i / (n - 1)));
      if (opts.keys !== false) for (const k of clip.keys) fr.add(k.t);
      for (const f of [...fr].sort((a, b) => a - b)) {
        const k = clip.keys.find(k => k.t === f);
        cells.push({ label: `f${f}${k ? '  ◆ ' + k.pose : ''}`, frame: f, key: !!k });
      }
    }
    const CW = Math.round(60 * S + 40 + 44 * SS), CH = Math.round(112 * S + 40), COLS = Math.min(opts.cols || 6, cells.length);
    const rows = Math.ceil(cells.length / COLS);
    const out = document.createElement('canvas');
    out.width = CW * COLS; out.height = CH * rows + 36;
    const c = out.getContext('2d');
    c.fillStyle = '#10131b'; c.fillRect(0, 0, out.width, out.height);
    c.fillStyle = '#fff'; c.font = 'bold 18px monospace';
    c.fillText(opts.clip ? `clip ${opts.clip}  (dur ${R().CLIPS[opts.clip].dur}${R().CLIPS[opts.clip].loop ? ', loop' : R().CLIPS[opts.clip].hold ? ', hold' : ''})` : 'poses', 10, 24);
    cells.forEach((cell, i) => {
      const gx = (i % COLS) * CW, gy = 36 + Math.floor(i / COLS) * CH;
      c.fillStyle = cell.key ? '#171c2a' : '#131722'; c.fillRect(gx + 2, gy + 2, CW - 4, CH - 4);
      const fy = gy + CH - 12 - 18 * S * 0.4;
      c.strokeStyle = 'rgba(160,190,255,.3)'; c.beginPath(); c.moveTo(gx + 6, fy); c.lineTo(gx + CW - 6, fy); c.stroke();
      const bx = gx + 20 + 30 * S, sx = gx + CW - 22 - 18 * SS;
      if (cell.pose) { drawPose(c, cell.pose, bx, fy, S, facing, color); drawPose(c, cell.pose, sx, fy, SS, facing, color); }
      else { drawClip(c, opts.clip, cell.frame, bx, fy, S, facing, color); drawClip(c, opts.clip, cell.frame, sx, fy, SS, facing, color); }
      c.fillStyle = cell.key ? '#ffe066' : '#cfd5e2'; c.font = '14px monospace'; c.fillText(cell.label, gx + 8, gy + 20);
    });
    return out.toDataURL('image/png').split(',')[1];
  }

  window.__wbFig = {
    sheet, save, setChannel: (n, ch, v) => setChannel(n, ch, v),
    setClip: (n, clip) => { R().CLIPS[n] = clip; fig.dirtyClips[n] = true; },
    setPose: (n, pose) => { R().POSES[n] = pose; fig.dirtyPoses[n] = true; },
    scene: (id, beat) => { startScene(id, false); if (beat) toBeat(beat); return sceneState(); },
    sceneState, state: fig,
  };

  async function boot() {
    for (let i = 0; i < 200 && !(window.FigureRig && window._sceneDrawFigure && registry()); i++) await sleep(50);
    if (!window.FigureRig || !window._sceneDrawFigure) { console.error('[figures] rig or scene renderer never appeared'); return; }
    snapshotBase();
    window.__wbFigReady = true;
    if (!UI_ON) return;
    buildUI();
    listen();
    RAF(loop);
  }
  boot();
})();
