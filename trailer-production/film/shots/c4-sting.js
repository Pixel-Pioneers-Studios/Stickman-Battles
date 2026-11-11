'use strict';
// Sting. The bookend to the cold open: the Creator watched Sovereign through a shard; now Sovereign, in his own
// arena, blade planted, watches the Creator fall through a pane edged in red (Kael's blade in its chest, the rift
// torn open). A few lines to himself: Kael got better (canon: he files, he never concedes). On the last word his
// eye catches, he pulls the blade out of the floor, and the pane goes dark. Then the title card (cut.js).
// LINES are drafts awaiting the user's approval.
module.exports = {
  arena: 'sovereign', frames: 800, endC: 12.0,
  install: function (H) {
    const L = FILM, G = H.D.G, P = Math.PI;
    const red = '#ff3311', cyan = '#00d4ff', violet = '#cc00ee';
    const LINES = [
      [1.2, 3.6, 'He stopped answering the room.'],
      [3.9, 6.3, 'Now the room answers him.'],
      [6.7, 9.0, 'The file is out of date.'],
      [9.6, 11.0, 'Good.'],
    ];
    currentArena.platforms = currentArena.platforms.filter(p => p.isFloor);
    const SX = 330, PX = 585, PY = G - 128, PW = 230, PH = 132;
    // Stand-ins inside the pane: Kael with his blade in the Creator.
    const K = players[0];
    const C = Object.create(players[1]); C.weaponKey = 'gauntlet'; C.weapon = WEAPONS.gauntlet; C.color = violet;
    const pane = (c, cc) => {
      const dark = Math.max(0, Math.min(1, (cc - 10.6) / 0.4));
      c.save();
      c.beginPath(); c.rect(PX - PW / 2, PY - PH / 2, PW, PH); c.save(); c.clip();
      c.fillStyle = '#0a0418'; c.fillRect(PX - PW / 2, PY - PH / 2, PW, PH);
      c.save(); c.translate(PX - 10, PY + 34); c.scale(0.55, 0.55);
      const tx = 30, ty = -92;
      const g = c.createRadialGradient(tx, ty, 4, tx, ty, 220); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(120,40,200,0)');
      c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(-220, -320, 440, 400);
      c.fillStyle = '#ffffff'; c.shadowColor = '#c080ff'; c.shadowBlur = 24;
      c.beginPath(); c.moveTo(tx, ty - 260); c.lineTo(tx + 12 + Math.sin(cc * 6) * 3, ty); c.lineTo(tx, ty + 120); c.lineTo(tx - 12, ty); c.closePath(); c.fill();
      c.globalCompositeOperation = 'source-over'; c.shadowBlur = 0;
      // The Creator floating, run through: Kael hangs from the hilt, the blade's tip placed in its chest.
      const CJ = L.drawFig(C, L.resolve('crGrip'), 60, -60, -1, { scale: 1.32 });
      const chest = { x: (CJ.neck.x + CJ.hip.x) / 2, y: (CJ.neck.y + CJ.hip.y) / 2 };
      const sw = typeof WEAPON_SWINGS !== 'undefined' && WEAPON_SWINGS.katana, tilt = (sw && sw.carry && sw.carry.tilt) || 0;
      const spr = typeof WEAPON_SPRITES !== 'undefined' && WEAPON_SPRITES.katana, len = spr ? spr.len * (1 - spr.anchor) * 1.5 * 0.9 : 60;
      const an = -0.22, tip = { x: chest.x + Math.cos(an) * 10, y: chest.y + Math.sin(an) * 10 };
      const hand = { x: tip.x - Math.cos(an) * len, y: tip.y - Math.sin(an) * len };
      const kq = Object.assign({}, L.resolve('hangThrust'), { rFore: an - tilt });
      const m = Object.assign({}, kq, { x: 0, y: 0, facing: 1, scale: 0.9, headScale: 0.77 }); const KJ = CinRig.joints(m);
      L.drawFig(K, kq, hand.x - KJ.rHand.x, hand.y - KJ.rHand.y, 1, {});
      c.restore();
      c.fillStyle = 'rgba(120,10,0,0.14)'; c.fillRect(PX - PW / 2, PY - PH / 2, PW, PH);
      if (dark) { c.fillStyle = 'rgba(0,0,0,' + dark + ')'; c.fillRect(PX - PW / 2, PY - PH / 2, PW, PH); }
      c.restore();
      c.beginPath(); c.rect(PX - PW / 2, PY - PH / 2, PW, PH);
      c.strokeStyle = red; c.lineWidth = 1.4; c.shadowColor = red; c.shadowBlur = 12; c.globalAlpha = 1 - dark * 0.8; c.stroke();
      c.restore();
    };
    L.setup(H, {
      tempo: 1, vignette: 0.66,
      fade: [[0, 1], [1.0, 0, 'sine'], [11.2, 0], [12.0, 1, 'sine']],
      backdrop: (c, L) => pane(c, L.D.c),
      actors: {
        k: { beats: [[0, 'stand']], pos: [[0, -400, 0]], hidden: [[0, true]] },
        s: {
          scale: 1.08, z: 1, wAbs: true,
          beats: [[0, 'sovPlant'], [9.55, 'sovPlant'], [9.7, 'sovPlantLook', 'io'], [10.2, 'sovPlant', 'io'], [10.3, 'sovRaise', 'xout'], [10.65, 'sovRaise'], [11.2, 'sovReady', 'io'], [12.0, 'sovReady']],
          pos: [[0, SX, 0]], face: [[0, 1]],
          sink: [[0, true], [10.3, false]],
          breath: [[0, 0], [10.3, 0], [11.2, 1]],
          aura: [[0, 0], [10.3, 0], [10.6, 0.45], [12.0, 0.3]], auraColor: red,
        },
      },
      cam: [
        [0, 452, 112, 1.95], [9.45, 440, 108, 2.3, 'sine'],
        [9.46, SX + 6, 64, 4.3, 'hold'], [10.25, SX + 6, 64, 4.5, 'sine'],
        [10.26, 420, 100, 2.3, 'hold'], [12.0, 415, 98, 2.45, 'sine'],
      ],
      ev: [
        [0.05, L => { L.sfx('stingLow', 0.5, 0.6); }],
        [9.6, L => {
          L.sfx('hitZap', 0.45, 0.7); L.sfx('stingLow', 0.5);
          L.add({ t: 'draw', life: 40, fn: (c, k) => {
            const J = L.joints('s'), x = J.head.x + J.headR * 0.42, y = J.head.y - J.headR * 0.12;
            const r = J.headR * (0.4 + Math.sin(Math.min(1, k * 3) * P) * 1.6);
            c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - k; c.fillStyle = '#ffd0c0'; c.shadowColor = red; c.shadowBlur = 20;
            c.beginPath(); for (let i = 0; i < 8; i++) { const an = i * P / 4, rr = i % 2 ? r * 0.16 : r; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(an) * rr, y + Math.sin(an) * rr); } c.closePath(); c.fill();
          } });
        }],
        [10.3, L => {
          L.sfx('swingHeavy', 0.9, 0.8); L.sfx('clang', 0.6, 0.6); L.shake(10);
          L.crack(SX, 60, { col: red, life: 140 }); L.debris(SX, G - 2, 16, { v: 8, spread: 50, col: '#ff6a40', kind: 'spark', r: 3, life: 26, g: 0.2 });
          L.surge('s', red, 1.0);
        }],
        [10.6, L => { L.sfx('phaseUp', 0.4, 0.5); }],
      ],
    });
    // The lines, in the lower letterbox bar, after the grade.
    H.D.screen.push((c, W, Hh) => {
      const cc = L.D.c;
      for (const [a, b, text] of LINES) {
        if (cc < a || cc > b) continue;
        const k = Math.min(1, (cc - a) / 0.35) * Math.min(1, (b - cc) / 0.35);
        c.globalAlpha = k; c.fillStyle = '#ece6e6'; c.shadowColor = red; c.shadowBlur = 10 * W / 1920;
        c.font = '500 ' + Math.round(34 * W / 1920) + 'px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(text, W / 2, Hh - Hh * 0.095 / 2);
      }
      c.globalAlpha = 1; c.shadowBlur = 0;
    });
  },
  tick: function (H) { FILM.tick(H); },
};
