'use strict';
// Game-session helpers for trailer capture, on top of harness.js.
//
// A shot is set up in REAL time (menus, loading overlays and startGame's
// timers all run on setTimeout), then the loop is switched to manual stepping
// and every frame is read straight off #gameCanvas. Canvas capture leaves the
// DOM HUD out, which is what the portal wants: no promotional text.
//
//   const s = await openSession({ width: 1920, height: 1080 });
//   await s.startMatch({ mode: '2p', arena: 'volcano', p1: 'katana', p2: 'glassblade' });
//   await s.sovereignP1();              // what F7 does: Sovereign plays Player 1
//   await s.record('shots/a', 90, 2);   // 90 frames, 2 game ticks per frame (30fps)
const fs = require('fs'), path = require('path');
const { launch } = require('./harness');

async function openSession(opts) {
  const h = await launch(Object.assign({ offline: true, port: 8170 }, opts));
  await h.eval(() => {
    // Real-time mode by default; manual only while recording.
    window.__auto = function () {
      window.__manual = false;
      const q = window.__rafQ; window.__rafQ = [];
      for (const cb of q) requestAnimationFrame(cb);
    };
  });

  const s = {
    h, page: h.page, errors: h.errors,
    eval: (fn, ...a) => h.eval(fn, ...a),
    wait: ms => new Promise(r => setTimeout(r, ms)),

    // Configure and launch a match the way the menu does, then let the loading
    // overlay and spawn timers finish in real time.
    async startMatch(o) {
      await h.eval(() => window.__auto());
      await h.eval(o => {
        const set = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) el.value = v; };
        try { if (gameRunning && typeof backToMenu === 'function') backToMenu(); } catch (e) {}
        try { skipTutorial(); } catch (e) {}
        if (o.minigame) minigameType = o.minigame;
        selectMode(o.mode || '2p');
        if (o.p1Bot !== undefined) p1IsBot = o.p1Bot;
        if (o.p2Bot !== undefined) p2IsBot = o.p2Bot;
        p2IsNone = false;
        set('p1Weapon', o.p1); set('p1Class', o.p1Class || 'none');
        set('p2Weapon', o.p2); set('p2Class', o.p2Class || 'none');
        if (o.p1Color) set('p1Color', o.p1Color);
        if (o.p2Color) set('p2Color', o.p2Color);
        if (o.p2Diff) set('p2Difficulty', o.p2Diff);
        if (o.arena) selectArena(o.arena);
        if (o.before) (new Function(o.before))();
        startGame(true);
      }, o);
      await s.wait(o.settleMs || 3000);
    },

    // Story chapter by registry id, through the same funnel as the level select.
    async startStory(id, settleMs) {
      await h.eval(() => window.__auto());
      await h.eval(id => {
        try { if (gameRunning && typeof backToMenu === 'function') backToMenu(); } catch (e) {}
        try { skipTutorial(); } catch (e) {}
        selectMode('story');
        // Skip the chapter's narrative scene (the retry path): straight to play.
        if (typeof _seenNarrativeIds !== 'undefined') _seenNarrativeIds.add(id);
        startStoryFromMenu(id);
      }, id);
      await s.wait(settleMs || 4000);
    },

    // F7: Sovereign's brain on Player 1's own fighter.
    async sovereignP1() {
      return h.eval(() => !!(typeof SovereignControl !== 'undefined' && SovereignControl.engage()));
    },

    // Trailer framing: the DOM HUD is not in the capture, so hide it (the
    // camera otherwise shifts down to clear it), and hold the camera at or
    // above a minimum zoom so the fighters read at video size.
    async trailerCam(zoomFloor) {
      await h.eval(z => {
        const hud = document.getElementById('hud');
        if (hud) hud.style.display = 'none';
        window.__zoomFloor = z;
        if (!window.updateCamera.__trailer) {
          const orig = window.updateCamera;
          window.updateCamera = function () {
            orig.apply(this, arguments);
            // updateCamera has already eased camZoomCur toward its own target,
            // so the floor has to be applied to the current zoom as well.
            if (window.__zoomFloor && !activeFinisher) {
              camZoomTarget = Math.max(camZoomTarget, window.__zoomFloor);
              camZoomCur += (Math.max(camZoomCur, window.__zoomFloor) - camZoomCur) * 0.2;
            }
          };
          window.updateCamera.__trailer = true;
        }
      }, zoomFloor || 0);
    },

    async manual() { await h.manual(); },
    async auto() { await h.eval(() => window.__auto()); },
    step: n => h.step(n),

    // Record `frames` frames into dir as JPEGs, advancing `ticks` game frames
    // between each (2 = 30fps real speed). `probe` runs in the page after every
    // frame and its return value is logged per frame (for picking windows).
    //
    // `cropW` (optional): export only a cropW-wide full-height slice that
    // follows Player 1 and whoever he is fighting, with an eased follow so the
    // framing moves like an operator, not a tracker. Used to cut the portrait
    // video out of a wide capture instead of letting the game letterbox.
    async record(dir, frames, ticks, probe, q, cropW) {
      fs.mkdirSync(dir, { recursive: true });
      await h.eval(() => { window.__cropX = null; });
      await h.manual();
      const log = [];
      for (let i = 0; i < frames; i++) {
        await h.step(ticks || 2);
        const r = await h.eval((probeSrc, quality, cw) => {
          let url;
          if (cw) {
            const k = Math.min(canvas.width / GAME_W, canvas.height / GAME_H) * camZoomCur;
            const sx = wx => canvas.width / 2 + (wx - camXCur) * k;
            const p1 = players[0];
            let fx = canvas.width / 2;
            if (p1) {
              fx = sx(p1.cx());
              const t = p1.target;
              if (t && t.health > 0 && Math.abs(sx(t.cx()) - fx) < cw * 0.75) fx = (fx + sx(t.cx())) / 2;
            }
            // Stay as near screen centre as the fight allows (centred banners and
            // titles then survive the crop), keeping the focus inside the middle
            // half of the slice.
            const want = Math.max(fx - cw * 0.75, Math.min(fx - cw * 0.25, canvas.width / 2 - cw / 2));
            window.__cropX = window.__cropX == null ? want : window.__cropX + (want - window.__cropX) * 0.12;
            const x0 = Math.max(0, Math.min(canvas.width - cw, Math.round(window.__cropX)));
            const oc = window.__cropCv || (window.__cropCv = document.createElement('canvas'));
            oc.width = cw; oc.height = canvas.height;
            oc.getContext('2d').drawImage(canvas, x0, 0, cw, canvas.height, 0, 0, cw, canvas.height);
            url = oc.toDataURL('image/jpeg', quality);
          } else {
            url = canvas.toDataURL('image/jpeg', quality);
          }
          let p = null;
          if (probeSrc) { try { p = (new Function('return (' + probeSrc + ')()'))(); } catch (e) { p = String(e); } }
          return { url, p };
        }, probe ? probe.toString() : null, q || 0.92, cropW || 0);
        fs.writeFileSync(path.join(dir, String(i).padStart(5, '0') + '.jpg'), Buffer.from(r.url.split(',')[1], 'base64'));
        log.push(r.p);
      }
      await s.auto();
      return log;
    },

    async still(file, q) {
      const url = await h.eval(q => canvas.toDataURL('image/jpeg', q), q || 0.9);
      fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    },

    close: () => h.close(),
  };
  return s;
}

module.exports = { openSession };
