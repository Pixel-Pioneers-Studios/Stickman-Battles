// smb-camera-trace.js — per-frame camera recorder for diagnosing camera bugs.
// Ring buffer, so you start it, reproduce the problem, then read the report:
// the last CAM_TRACE_LEN frames are always retained.
//
//   camTrace.arm()      record and auto-freeze on the first camera jolt (easiest)
//   camTrace.start()    record continuously (buffer keeps only the last 15s)
//   camTrace.mark('x')  tag the current frame (optional)
//   camTrace.report()   print a diagnosis of the worst stretch in the buffer
//   camTrace.dump()     full JSON for the whole buffer
//   camTrace.stop()

const CAM_TRACE_LEN = 900; // 15s at 60fps

var camTrace = (function () {
  let buf = [];
  let on = false;
  let marks = [];
  let armed = false, armStep = 10, postRoll = 90, caught = null;

  function sample() {
    const p = (typeof players !== 'undefined' && players[0]) ? players[0] : null;
    buf.push({
      f:    (typeof frameCount !== 'undefined') ? frameCount : 0,
      mode: (typeof _camMode !== 'undefined') ? _camMode : '?',
      cx: camXCur, cy: camYCur, cz: camZoomCur,
      tx: camXTarget, ty: camYTarget, tz: camZoomTarget,
      px: p ? Math.round(p.cx()) : null,
      pvx: p ? +(p.vx || 0).toFixed(2) : null,
      pfc: p ? (p.facing || 0) : null,
      gm: (typeof gameMode !== 'undefined') ? gameMode : '?',
      seq: (typeof _camSeq !== 'undefined') && !!_camSeq,
      drama: (typeof camDramaState !== 'undefined') ? camDramaState : '?',
      hz: (typeof camHitZoomTimer !== 'undefined') ? camHitZoomTimer : 0,
      slow: (typeof slowMotion !== 'undefined') ? slowMotion : 1,
      hs: (typeof hitStopFrames !== 'undefined') ? hitStopFrames : 0,
      wide: !!(typeof currentArena !== 'undefined' && currentArena && currentArena.worldWidth),
      py: p ? Math.round(p.cy()) : null,
      pvy: p ? +(p.vy || 0).toFixed(2) : null,
      onGround: p ? !!p.onGround : null,
      snapCd: (typeof _camSnapCooldown !== 'undefined') ? _camSnapCooldown : -1,
      // Every tracked entity, because the failsafe snaps toward the first
      // off-screen one it finds — which is not necessarily the local player.
      ents: (function () {
        const all = [];
        try {
          for (const q of [...players, ...(typeof minions !== 'undefined' ? minions : [])]) {
            if (q && q.health > 0) all.push({ n: q.name, y: Math.round(q.cy()), x: Math.round(q.cx()) });
          }
        } catch (e) {}
        return all;
      })(),
    });
    if (buf.length > CAM_TRACE_LEN) buf.shift();

    // Grace period: the camera legitimately settles hard in the first second of a match.
    if (armed && buf.length > 60) {
      const b = buf[buf.length - 1], a = buf[buf.length - 2];
      if (!caught) {
        const jump = Math.abs(b.cy - a.cy);
        const fired = b.snapCd > a.snapCd;
        if (jump > armStep || fired) {
          caught = { frame: b.f, camYJumpPx: +jump.toFixed(2), failsafeFired: fired, playerY: b.py, vy: b.pvy, airborne: b.onGround === false };
          marks.push({ f: b.f, label: 'CAUGHT ' + (fired ? 'failsafe-snap' : 'camY-jump-' + jump.toFixed(1) + 'px') });
        }
      } else if (--postRoll <= 0) {
        on = false; armed = false;
        console.log('camTrace: caught an event at frame ' + caught.frame + ' — recording stopped. Call camTrace.report()');
      }
    }
  }

  // Wrapping the global keeps this file out of the camera's own logic.
  const _orig = window.updateCamera;
  window.updateCamera = function () {
    const r = _orig.apply(this, arguments);
    if (on) sample();
    return r;
  };

  // Reversals in the per-frame delta are the signature of jitter: a camera that
  // is merely fast has a consistent sign, one that oscillates flips constantly.
  // Axis is analysed independently because the vertical and horizontal paths in
  // updateCamera() are governed by different thresholds and clamps.
  function axis(rows, cur, tgt) {
    let maxStep = 0, sumStep = 0, reversals = 0, prevSign = 0;
    let snaps = 0, maxSnap = 0, frozen = 0, maxLag = 0;
    for (let i = 1; i < rows.length; i++) {
      const d = rows[i][cur] - rows[i - 1][cur];
      const ad = Math.abs(d);
      sumStep += ad;
      if (ad > maxStep) maxStep = ad;
      const s = Math.sign(d);
      if (s !== 0 && prevSign !== 0 && s !== prevSign && ad > 0.35) reversals++;
      if (s !== 0) prevSign = s;

      const dt = Math.abs(rows[i][tgt] - rows[i - 1][tgt]);
      if (dt > 0.5) { snaps++; if (dt > maxSnap) maxSnap = dt; } else { frozen++; }

      const lag = Math.abs(rows[i][tgt] - rows[i][cur]);
      if (lag > maxLag) maxLag = lag;
    }
    const n = Math.max(1, rows.length - 1);
    return {
      maxStepPx: +maxStep.toFixed(2),
      meanStepPx: +(sumStep / n).toFixed(2),
      reversals,
      reversalsPerSec: +(reversals / (rows.length / 60)).toFixed(1),
      targetJumps: snaps,
      maxTargetJumpPx: +maxSnap.toFixed(2),
      framesTargetFrozen: frozen,
      pctTargetFrozen: +(100 * frozen / n).toFixed(0),
      maxLagPx: +maxLag.toFixed(1),
    };
  }

  function analyse(rows) {
    let zoomRev = 0, prevZSign = 0, maxZStep = 0, failsafes = 0, airFrames = 0;
    // Entity extremes: the failsafe chases whoever leaves the view, so how far
    // out of bounds anyone got is usually the whole explanation.
    let eMinX = Infinity, eMaxX = -Infinity, eMinY = Infinity, eMaxY = -Infinity, maxSpread = 0;
    const modeChanges = [];
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1], b = rows[i];
      const dz = b.cz - a.cz;
      if (Math.abs(dz) > maxZStep) maxZStep = Math.abs(dz);
      const zs = Math.sign(dz);
      if (zs !== 0 && prevZSign !== 0 && zs !== prevZSign && Math.abs(dz) > 0.002) zoomRev++;
      if (zs !== 0) prevZSign = zs;
      // The failsafe sets _camSnapCooldown to 10; a rise marks one firing.
      if (b.snapCd > a.snapCd) failsafes++;
      if (b.onGround === false) airFrames++;
      if (b.mode !== a.mode) modeChanges.push(a.mode + '->' + b.mode + '@' + b.f);
      for (const e of (b.ents || [])) {
        if (e.x < eMinX) eMinX = e.x;
        if (e.x > eMaxX) eMaxX = e.x;
        if (e.y < eMinY) eMinY = e.y;
        if (e.y > eMaxY) eMaxY = e.y;
      }
      if (b.ents && b.ents.length > 1) {
        const sp = Math.max(...b.ents.map(e => e.x)) - Math.min(...b.ents.map(e => e.x));
        if (sp > maxSpread) maxSpread = sp;
      }
    }
    const mapL = (typeof currentArena !== 'undefined' && currentArena && currentArena.mapLeft  !== undefined) ? currentArena.mapLeft  : 0;
    const mapR = (typeof currentArena !== 'undefined' && currentArena && currentArena.mapRight !== undefined) ? currentArena.mapRight : GAME_W;
    return {
      frames: rows.length,
      entities: isFinite(eMinX) ? {
        xRange: eMinX + '..' + eMaxX, yRange: eMinY + '..' + eMaxY,
        maxHorizontalSpread: maxSpread,
        mapBounds: mapL + '..' + mapR,
        pxOutsideMapLeft:  Math.max(0, Math.round(mapL - eMinX)),
        pxOutsideMapRight: Math.max(0, Math.round(eMaxX - mapR)),
        pxAboveTop: Math.max(0, -eMinY),
      } : null,
      x: axis(rows, 'cx', 'tx'),
      y: axis(rows, 'cy', 'ty'),
      zoomReversals: zoomRev,
      maxZoomStep: +maxZStep.toFixed(4),
      failsafeSnaps: failsafes,
      airborneFrames: airFrames,
      modeChanges: modeChanges.length,
      modeTransitions: modeChanges.slice(0, 12),
    };
  }

  // Slide a window across the buffer and return the stretch with the most
  // direction reversals — i.e. the worst-looking second of camera motion.
  function worstWindow(win) {
    if (buf.length <= win) return { at: 0, rows: buf.slice() };
    let best = { score: -1, at: 0 };
    for (let i = 0; i + win <= buf.length; i += 10) {
      const a = analyse(buf.slice(i, i + win));
      const score = a.y.reversals * 10 + a.failsafeSnaps * 25 + a.y.maxStepPx;
      if (score > best.score) best = { score, at: i };
    }
    return { at: best.at, rows: buf.slice(best.at, best.at + win) };
  }

  return {
    start() { buf = []; marks = []; on = true; armed = false; return 'camTrace recording (ring of ' + CAM_TRACE_LEN + ' frames)'; },
    stop()  { on = false; armed = false; return 'camTrace stopped, ' + buf.length + ' frames held'; },
    // Records, then freezes itself shortly after the first jolt it sees, so the
    // event is still in the buffer when you get around to reading the report.
    arm(stepPx) {
      buf = []; marks = []; on = true; armed = true; caught = null;
      armStep = stepPx || 20;
      postRoll = 90;
      return 'camTrace armed — will auto-stop ~1.5s after the first camY jump > ' + armStep + 'px or failsafe snap. Reproduce the bug, then call camTrace.report().';
    },
    caught() { return caught; },
    mark(label) { marks.push({ f: (typeof frameCount !== 'undefined') ? frameCount : 0, label: label || '' }); return 'marked'; },
    len()   { return buf.length; },
    report(win) {
      if (!buf.length) return 'camTrace: nothing recorded — call camTrace.start() first';
      const whole = analyse(buf);
      const w = worstWindow(win || 120);
      const worst = analyse(w.rows);
      const first = w.rows[0] || {};
      const out = {
        caught_event: caught,
        whole_buffer: whole,
        worst_2s_window: worst,
        worst_window_starts_at_frame: first.f,
        context_at_worst: {
          gameMode: first.gm, camMode: first.mode, wideArena: first.wide,
          cameraSequence: first.seq, drama: first.drama, slowMotion: first.slow,
        },
        marks,
        sample_rows: w.rows.filter((_, i) => i % 4 === 0).slice(0, 20).map(r =>
          `f${r.f} ${r.mode} camY=${r.cy.toFixed(1)} tgtY=${r.ty.toFixed(1)} zoom=${r.cz.toFixed(3)} playerY=${r.py} vy=${r.pvy} air=${r.onGround === false ? 1 : 0} snapCd=${r.snapCd}`),
      };
      console.log('=== camTrace report ===\n' + JSON.stringify(out, null, 2));
      return out;
    },
    dump() { return JSON.stringify({ marks, rows: buf }); },
  };
})();
