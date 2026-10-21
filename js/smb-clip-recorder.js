'use strict';
// smb-clip-recorder.js: one-key gameplay recorder for promo footage.
//
//   Alt+R (Option+R on Mac)   start / stop
//   console: rec | rec start [raw] [hd] | rec stop | rec status
//
// Records #gameCanvas plus the game's sound effects (everything the
// SoundManager plays through Web Audio) and downloads the clip on stop. Music
// and story voice play through <audio> elements and are not in the clip; the
// edit lays its own music bed. The DOM HUD is not part of the canvas, so the
// footage is clean of it, and the REC badge is DOM too.
//
// By default recording is "clean", per the trailer rules: no damage numbers,
// no name/health plates over fighters, no floating "SUPER!" text. Everything is
// restored on stop. `raw` keeps them. `hd` doubles the canvas backing store for
// the clip (sharper on a Retina screen, costs frame rate).
//
// Auto performance mode is held off while recording, so particles and HD
// backdrops don't switch off mid-clip.
// Needs smb-globals.js, smb-debug-console.js and smb-fighter.js first.

const ClipRecorder = (() => {
  let _rec = null;         // { mr, chunks, t0, restore[], mime }
  let _badge = null, _badgeTimer = 0;

  // Web Audio tap: every node later connected to a context's destination is also
  // connected to that context's recording bus. Installed at load, before any
  // sound plays (audio needs a user gesture), so nothing is missed.
  const _taps = new WeakMap();
  let _lastCtx = null;     // SoundManager's context, seen through its first connect
  function _tapFor(ctx) {
    _lastCtx = ctx;
    let t = _taps.get(ctx);
    if (!t) {
      try { t = ctx.createMediaStreamDestination(); } catch (e) { return null; }
      _taps.set(ctx, t);
    }
    return t;
  }
  (function _installTap() {
    if (typeof AudioNode === 'undefined' || AudioNode.prototype.__clipTap) return;
    const con = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest) {
      const r = con.apply(this, arguments);
      try {
        if (typeof AudioDestinationNode !== 'undefined' && dest instanceof AudioDestinationNode) {
          const t = _tapFor(this.context);
          if (t) con.call(this, t);
        }
      } catch (e) {}
      return r;
    };
    AudioNode.prototype.__clipTap = true;
  })();

  function _pickMime() {
    const list = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4',
      'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (const m of list) if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
    return '';
  }

  function _stamp() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  function _showBadge(on) {
    if (on) {
      if (!_badge) {
        _badge = document.createElement('div');
        _badge.style.cssText = 'position:fixed;top:10px;right:12px;z-index:99999;pointer-events:none;' +
          'font:600 13px/1 system-ui,sans-serif;color:#fff;background:rgba(0,0,0,0.55);padding:6px 9px;border-radius:6px;';
        document.body.appendChild(_badge);
      }
      const tick = () => {
        if (!_rec) return;
        const s = Math.floor((performance.now() - _rec.t0) / 1000);
        _badge.innerHTML = '<span style="color:#ff3b3b">●</span> REC ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      };
      tick(); _badgeTimer = setInterval(tick, 500);
      _badge.style.display = 'block';
    } else {
      clearInterval(_badgeTimer);
      if (_badge) _badge.style.display = 'none';
    }
  }

  // Each step returns its own undo, run in reverse on stop.
  function _cleanFrame() {
    const undo = [];
    const prevDmg = settings.dmgNumbers;
    settings.dmgNumbers = false;
    if (typeof damageTexts !== 'undefined') damageTexts.length = 0;
    undo.push(() => { settings.dmgNumbers = prevDmg; });
    if (typeof window.drawEntityOverlays === 'function') {
      const orig = window.drawEntityOverlays;
      window.drawEntityOverlays = function () {};   // still a function, so fighters don't fall back to their own tags
      undo.push(() => { window.drawEntityOverlays = orig; });
    }
    if (typeof Fighter !== 'undefined') {
      // superFlashTimer only drives the "SUPER!" text. A prototype accessor also
      // catches assignments in the constructor; own copies are dropped so it applies.
      Object.defineProperty(Fighter.prototype, 'superFlashTimer', { get: () => 0, set() {}, configurable: true });
      if (typeof players !== 'undefined') for (const p of players) if (p) delete p.superFlashTimer;
      undo.push(() => { delete Fighter.prototype.superFlashTimer; });
    }
    return undo;
  }

  function _hdCanvas() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (dpr <= 1) return [];
    const apply = () => { canvas.width = Math.round(window.innerWidth * dpr); canvas.height = Math.round(window.innerHeight * dpr); };
    apply();
    // resizeCanvas (smb-globals.js) sets 1:1 on resize; re-apply after it.
    const onResize = () => setTimeout(apply, 0);
    window.addEventListener('resize', onResize);
    return [() => { window.removeEventListener('resize', onResize); resizeCanvas(); }];
  }

  function start(opts) {
    opts = opts || {};
    if (_rec) return 'Already recording.';
    if (!window.MediaRecorder || !canvas.captureStream) return 'This browser cannot record the canvas.';
    // A canvas that has drawn images from file:// is not origin-clean and the
    // browser refuses to capture it. Ask first, before touching any settings.
    let stream;
    try { stream = canvas.captureStream(60); }
    catch (e) {
      return location.protocol === 'file:'
        ? 'Cannot record a game opened from a file. Serve it instead: python3 -m http.server 8080, then open http://localhost:8080/index.html'
        : 'Cannot record the canvas: ' + (e && e.message || e);
    }
    const mime = _pickMime();
    const restore = [];
    const prevAuto = settings.autoPerf;
    settings.autoPerf = false;
    restore.push(() => { settings.autoPerf = prevAuto; });
    if (!opts.raw) restore.push(..._cleanFrame());
    if (opts.hd) restore.push(..._hdCanvas());

    const tap = _lastCtx ? _tapFor(_lastCtx) : null;
    if (tap) for (const tr of tap.stream.getAudioTracks()) stream.addTrack(tr);

    const mr = new MediaRecorder(stream, Object.assign({ videoBitsPerSecond: opts.hd ? 24e6 : 14e6, audioBitsPerSecond: 256000 },
      mime ? { mimeType: mime } : {}));
    const chunks = [];
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = () => {
      const type = mr.mimeType || mime || 'video/webm';
      const blob = new Blob(chunks, { type });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'stickman-rec-' + _stamp() + (type.indexOf('mp4') >= 0 ? '.mp4' : '.webm');
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    };
    mr.start(1000);
    _rec = { mr, chunks, t0: performance.now(), restore, mime: mr.mimeType || mime, audio: !!tap };
    _showBadge(true);
    return 'Recording' + (opts.raw ? ' (raw)' : ' (clean)') + (opts.hd ? ' HD' : '') + ' — ' + canvas.width + 'x' + canvas.height +
      ', ' + (_rec.mime || 'default format') + (tap ? ', with game sound' : ', NO SOUND (play a sound first so audio starts)');
  }

  function stop() {
    if (!_rec) return 'Not recording.';
    const r = _rec; _rec = null;
    const secs = (performance.now() - r.t0) / 1000;
    try { r.mr.stop(); } catch (e) {}
    for (let i = r.restore.length - 1; i >= 0; i--) { try { r.restore[i](); } catch (e) {} }
    _showBadge(false);
    return 'Stopped after ' + secs.toFixed(1) + 's — the clip is downloading.';
  }

  function toggle(opts) { return _rec ? stop() : start(opts); }
  function status() { return _rec ? 'Recording, ' + ((performance.now() - _rec.t0) / 1000).toFixed(0) + 's, ' + _rec.mime : 'Idle.'; }

  return { start, stop, toggle, status, get active() { return !!_rec; } };
})();

// Alt+R / Option+R. Capture phase, so the game never sees the key.
window.addEventListener('keydown', e => {
  if (!e.altKey || e.code !== 'KeyR' || e.repeat) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const msg = ClipRecorder.toggle();
  if (typeof showToast === 'function') showToast(msg, 2500);
  console.log('[rec]', msg);
}, true);

// Console: rec | rec start [raw] [hd] | rec stop | rec status
(function () {
  const _origExec = window._consoleExec;
  if (typeof _origExec !== 'function') return;
  window._consoleExec = function (raw) {
    const up = (raw || '').toUpperCase().trim();
    if (up === 'REC' || up.startsWith('REC ')) {
      const words = up.split(/\s+/).slice(1);
      const opts = { raw: words.includes('RAW'), hd: words.includes('HD') };
      let msg;
      if (words[0] === 'STOP') msg = ClipRecorder.stop();
      else if (words[0] === 'STATUS') msg = ClipRecorder.status();
      else if (words[0] === 'START') msg = ClipRecorder.start(opts);
      else msg = ClipRecorder.toggle(opts);
      _consoleOk(msg);
      return;
    }
    if (up === 'HELP') {
      _origExec(raw);
      _consolePrint('── Recording ─────────────────────────────────────────────', '#556688');
      _consolePrint('rec                     — start/stop recording (also Alt/Option+R)', '#88bbff');
      _consolePrint('rec start [raw] [hd]    — raw keeps damage numbers/name plates; hd = 2x resolution', '#88bbff');
      _consolePrint('rec stop | rec status', '#88bbff');
      return;
    }
    return _origExec(raw);
  };
})();
