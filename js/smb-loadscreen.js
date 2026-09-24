'use strict';
// smb-loadscreen.js — animated per-mode loading screens (LoadScene)
// Depends on: smb-globals.js (GAME_W/GAME_H not required — this is screen-space)
// Must load AFTER smb-menu-ui.js, BEFORE smb-menu-spawn.js (which drives it).
//
// Replaces the three AI-generated stills (Boss-Page.png / True-Form.png /
// Game-Page.png) that covered six different modes between them — Battle Royale
// and Online had no art of their own at all. Each mode now gets an authored,
// animated scene built from the same stickman vocabulary as the home screen, so
// the loading screen reads as part of the game rather than as stock art.
//
// Every scene keeps its action in the UPPER ~62% of the canvas: the overlay's
// title, subtitle and progress bar are anchored to the bottom over a scrim.

var LoadScene = (function () {

  // ── Figure ────────────────────────────────────────────────────────────────
  // Same proportions as the home-screen hero (~92 units tall, 60 of leg below
  // the hip, head meeting the neck) so both screens draw the same species of
  // figure. Poses are joint tables, not one hardcoded stance.
  var POSES = {
    // [shoulder, head, leadKnee, leadFoot, trailKnee, trailFoot,
    //  leadElbow, leadHand, trailElbow, trailHand]
    dash:  [[8,-34],[14,-48],[22,10],[34,26],[-16,18],[-34,34],[26,-26],[40,-34],[-14,-22],[-26,-14]],
    leap:  [[6,-36],[12,-50],[26,2],[44,10],[-10,16],[-26,36],[22,-34],[34,-50],[-16,-18],[-30,-4]],
    clash: [[10,-33],[16,-47],[18,14],[30,32],[-18,14],[-34,32],[30,-30],[46,-40],[-10,-14],[-16,2]],
    guard: [[2,-35],[6,-49],[14,16],[20,34],[-14,16],[-22,34],[16,-22],[22,-36],[-8,-20],[-14,-30]],
    idle:  [[2,-35],[5,-49],[8,16],[10,34],[-8,16],[-12,34],[10,-18],[14,-2],[-10,-18],[-14,-2]],
    fall:  [[4,-32],[8,-46],[20,8],[26,28],[-18,6],[-32,20],[28,-34],[42,-44],[-20,-26],[-34,-34]],
    // Colossus stance: planted wide, weapon shouldered, free arm out but not
    // splayed. Two earlier tries failed for instructive reasons — arms hanging
    // BELOW the hip read as extra legs once the horizon cropped the real ones
    // (a tripod lamp), and arms fully spread at shoulder height ran off-frame
    // and read as a scarecrow. Keep the span inside the body's own footprint.
    loom:  [[0,-40],[3,-58],[24,14],[32,36],[-24,14],[-32,36],[26,-30],[36,-8],[-26,-34],[-34,-52]]
  };

  // o = { u, face, pose, dark, rim, weapon, alpha, scarf, eye, t }
  function fig(ctx, hx, hy, o) {
    var u = o.u, f = o.face || 1, t = o.t || 0;
    var p = POSES[o.pose] || POSES.dash;
    var DARK = o.dark || '#07040d';
    var RIM  = o.rim  || 'rgba(255,255,255,0.62)';
    var P = function (a) { return [hx + a[0] * f * u, hy + a[1] * u]; };
    var sh = P(p[0]), head = P(p[1]);
    var lk = P(p[2]), lf = P(p[3]), tk = P(p[4]), tf = P(p[5]);
    var le = P(p[6]), lh = P(p[7]), te = P(p[8]), th = P(p[9]);

    var hr = 11 * u;
    // Neck ends on the head's CIRCUMFERENCE — running it to the centre draws a
    // line across the face, since the body is stroked before the head.
    var ndx = head[0] - sh[0], ndy = head[1] - sh[1];
    var nl = Math.sqrt(ndx * ndx + ndy * ndy) || 1;
    var neck = [head[0] - (ndx / nl) * hr, head[1] - (ndy / nl) * hr];

    ctx.save();
    ctx.globalAlpha = (o.alpha === undefined) ? 1 : o.alpha;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    function body() {
      ctx.beginPath();
      ctx.moveTo(hx, hy);       ctx.lineTo(sh[0], sh[1]);
      ctx.moveTo(sh[0], sh[1]); ctx.lineTo(neck[0], neck[1]);
      ctx.moveTo(hx, hy);       ctx.lineTo(lk[0], lk[1]); ctx.lineTo(lf[0], lf[1]);
      ctx.moveTo(hx, hy);       ctx.lineTo(tk[0], tk[1]); ctx.lineTo(tf[0], tf[1]);
      ctx.moveTo(sh[0], sh[1]); ctx.lineTo(le[0], le[1]); ctx.lineTo(lh[0], lh[1]);
      ctx.moveTo(sh[0], sh[1]); ctx.lineTo(te[0], te[1]); ctx.lineTo(th[0], th[1]);
    }
    function weapon() {
      if (!o.weapon) return;
      ctx.beginPath();
      var W = o.weapon;
      if (W === 'sword' || W === 'katana') {
        var a = [p[9][0] - 38, p[9][1] - 26], b = [p[9][0] - 6, p[9][1] - 12];
        ctx.moveTo(th[0], th[1]); ctx.lineTo(P(a)[0], P(a)[1]);
        var g1 = P([p[9][0] - 6, p[9][1] - 20]), g2 = P([p[9][0] - 14, p[9][1] - 4]);
        ctx.moveTo(g1[0], g1[1]); ctx.lineTo(g2[0], g2[1]);
      } else if (W === 'axe') {
        var ah = P([p[9][0] - 30, p[9][1] - 24]);
        ctx.moveTo(th[0], th[1]); ctx.lineTo(ah[0], ah[1]);
        var b1 = P([p[9][0] - 22, p[9][1] - 36]), b2 = P([p[9][0] - 36, p[9][1] - 16]);
        ctx.moveTo(b1[0], b1[1]); ctx.lineTo(ah[0], ah[1]); ctx.lineTo(b2[0], b2[1]);
      } else if (W === 'spear') {
        ctx.moveTo(P([p[9][0] + 44, p[9][1] + 10])[0], P([p[9][0] + 44, p[9][1] + 10])[1]);
        ctx.lineTo(P([p[9][0] - 44, p[9][1] - 30])[0], P([p[9][0] - 44, p[9][1] - 30])[1]);
      } else if (W === 'hammer') {
        var hh = P([p[9][0] - 30, p[9][1] - 26]);
        ctx.moveTo(th[0], th[1]); ctx.lineTo(hh[0], hh[1]);
        var m1 = P([p[9][0] - 22, p[9][1] - 36]), m2 = P([p[9][0] - 38, p[9][1] - 18]);
        ctx.moveTo(m1[0], m1[1]); ctx.lineTo(m2[0], m2[1]);
      }
    }

    body();   ctx.strokeStyle = RIM;  ctx.lineWidth = 5.4 * u; ctx.stroke();
    weapon(); ctx.strokeStyle = RIM;  ctx.lineWidth = 4.0 * u; ctx.stroke();
    body();   ctx.strokeStyle = DARK; ctx.lineWidth = 4.2 * u; ctx.stroke();
    weapon(); ctx.strokeStyle = DARK; ctx.lineWidth = 2.8 * u; ctx.stroke();

    // Head last, opaque, so it always covers the neck join.
    ctx.beginPath(); ctx.arc(head[0], head[1], hr, 0, Math.PI * 2);
    ctx.fillStyle = DARK; ctx.fill();
    ctx.lineWidth = 1.6 * u; ctx.strokeStyle = RIM; ctx.stroke();

    if (o.eye) {
      ctx.save();
      ctx.fillStyle = o.eye; ctx.shadowColor = o.eye; ctx.shadowBlur = 8 * u;
      var eyes = o.twoEyes ? [-3.6, 3.6] : [3];
      for (var ei = 0; ei < eyes.length; ei++) {
        ctx.beginPath();
        ctx.arc(head[0] + eyes[ei] * f * u, head[1] - 1 * u, 1.8 * u, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (o.scarf) {
      var w1 = Math.sin(t * 2.2) * 5 * u, w2 = Math.sin(t * 2.2 + 1.2) * 9 * u;
      var nk = P([6, -38]);
      var g = ctx.createLinearGradient(nk[0], nk[1], hx - 86 * f * u, hy - 34 * u);
      g.addColorStop(0, 'rgba(255,58,58,0.98)');
      g.addColorStop(0.55, 'rgba(222,30,30,0.72)');
      g.addColorStop(1, 'rgba(150,20,20,0)');
      ctx.beginPath(); ctx.moveTo(nk[0], nk[1]);
      ctx.bezierCurveTo(hx - 28 * f * u, hy - 34 * u + w1,
                        hx - 58 * f * u, hy - 40 * u + w2,
                        hx - 86 * f * u, hy - 34 * u + w2);
      ctx.strokeStyle = g; ctx.lineWidth = 3.8 * u;
      ctx.shadowColor = '#ff2a2a'; ctx.shadowBlur = 9 * u; ctx.stroke(); ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  // ── Shared backdrop pieces ────────────────────────────────────────────────

  // Layered ridges receding into haze — cheap parallax depth under any scene.
  function ridges(ctx, W, H, t, c1, c2, horizon) {
    var hy = H * (horizon || 0.60);
    for (var L = 0; L < 3; L++) {
      var amp = (26 - L * 7), yo = hy - L * H * 0.055, drift = t * (4 + L * 3);
      ctx.beginPath(); ctx.moveTo(0, H);
      for (var x = 0; x <= W + 20; x += 20) {
        var y = yo - Math.sin((x + drift) * 0.004 + L * 1.7) * amp
                   - Math.sin((x + drift) * 0.011 + L) * amp * 0.45;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H); ctx.closePath();
      ctx.fillStyle = L === 0 ? c1 : (L === 1 ? c2 : 'rgba(6,6,16,0.92)');
      ctx.fill();
    }
  }

  function glow(ctx, x, y, r, col, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col.replace('ALPHA', a));
    g.addColorStop(1, col.replace('ALPHA', 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  // Impact star — the clash marker used by the fight-forward scenes.
  // A hit, not an asterisk. The first version stroked thin mid-alpha rays that
  // composited to a muddy brown; energy needs a white core and saturated,
  // thicker rays that fall off, with 'lighter' so overlaps brighten.
  function impact(ctx, x, y, r, t, col) {
    var p = 0.62 + Math.sin(t * 5) * 0.38;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, r * 1.7, 'rgba(' + col + ',ALPHA)', 0.42 * p);
    glow(ctx, x, y, r * 0.42, 'rgba(255,255,255,ALPHA)', 0.80 * p);
    ctx.lineCap = 'round';
    for (var i = 0; i < 10; i++) {
      var a = (i / 10) * Math.PI * 2 + t * 0.5;
      var l = r * (i % 2 ? 0.48 : 1.0) * (0.78 + p * 0.34);
      var lg = ctx.createLinearGradient(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
      lg.addColorStop(0,   'rgba(255,255,255,' + (0.95 * p).toFixed(2) + ')');
      lg.addColorStop(0.35,'rgba(' + col + ',' + (0.85 * p).toFixed(2) + ')');
      lg.addColorStop(1,   'rgba(' + col + ',0)');
      ctx.strokeStyle = lg;
      ctx.lineWidth = Math.max(1.5, r * 0.085);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }
    ctx.restore();
  }

  function speedLines(ctx, W, H, t, col, n, dir) {
    ctx.save(); ctx.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var ph = ((t * 0.7) + i / n) % 1;
      var y  = H * (0.10 + (i / n) * 0.50) + Math.sin(i * 3.1) * H * 0.02;
      var x  = dir > 0 ? W * (ph * 1.2 - 0.1) : W * (1.1 - ph * 1.2);
      var len = W * (0.05 + (i % 3) * 0.035);
      var a   = 0.26 * Math.sin(Math.PI * ph);
      var g   = ctx.createLinearGradient(x - len * dir, y, x, y);
      g.addColorStop(0, col.replace('ALPHA', 0));
      g.addColorStop(1, col.replace('ALPHA', a.toFixed(3)));
      ctx.strokeStyle = g; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - len * dir, y); ctx.lineTo(x, y); ctx.stroke();
    }
    ctx.restore();
  }

  // ── Scenes ────────────────────────────────────────────────────────────────
  // One per situation. Each owns its palette, its backdrop and its staging.
  var SCENES = {

    // STORY — the rift behind, the road ahead. Motion is forward, not combat.
    story: function (ctx, W, H, t, u) {
      var sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#150c2e'); sky.addColorStop(0.55, '#0c0a1e'); sky.addColorStop(1, '#05050e');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      glow(ctx, W * 0.20, H * 0.34, H * 0.42, 'rgba(150,70,255,ALPHA)', 0.30);

      // The tear he stepped out of
      var rx = W * 0.19, ry = H * 0.34, rh = H * 0.34, rw = rh * 0.085;
      var fl = 0.85 + Math.sin(t * 2.4) * 0.1;
      ctx.beginPath();
      for (var i = 0; i <= 26; i++) {
        var a = (i / 26) * Math.PI * 2;
        var j = 1 + Math.sin(a * 7 + t * 1.6) * 0.07;
        var px = rx + Math.sin(a) * rw * j, py = ry - Math.cos(a) * rh * 0.5 * j;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      var cg = ctx.createLinearGradient(rx - rw, ry, rx + rw, ry);
      cg.addColorStop(0, 'rgba(40,8,90,0)'); cg.addColorStop(0.5, 'rgba(244,226,255,' + fl + ')');
      cg.addColorStop(1, 'rgba(40,8,90,0)');
      ctx.fillStyle = cg; ctx.fill();

      ridges(ctx, W, H, t, 'rgba(26,16,54,0.95)', 'rgba(14,10,32,0.95)', 0.66);
      speedLines(ctx, W, H, t, 'rgba(200,160,255,ALPHA)', 7, 1);

      // Hero striding out, afterimages trailing to the rift
      var hx = W * 0.42, hy = H * 0.50, hu = u * 1.5;
      for (var k = 3; k >= 1; k--) {
        fig(ctx, hx - k * 30 * u, hy + k * 3 * u, {
          u: hu, face: 1, pose: 'dash', t: t, weapon: 'sword',
          alpha: 0.09 * (4 - k), dark: 'rgba(130,80,215,0.6)', rim: 'rgba(190,150,255,0.3)' });
      }
      fig(ctx, hx, hy + Math.sin(t * 1.2) * 3 * u, {
        u: hu, face: 1, pose: 'dash', t: t, weapon: 'sword', scarf: true });
    },

    // BOSS — scale. A vast silhouette; the player is small and looking up.
    boss: function (ctx, W, H, t, u) {
      var sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#2a0708'); sky.addColorStop(0.5, '#15060f'); sky.addColorStop(1, '#070308');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      glow(ctx, W * 0.72, H * 0.30, H * 0.60, 'rgba(255,60,40,ALPHA)', 0.26);

      // Colossus: the same figure vocabulary as everything else, at ~6x scale
      // and cropped by the ridge. The first version was a rounded mound with
      // triangular horns and two flat discs for eyes — it read as a cat.
      var bu = u * 3.6;
      var bHip = H * 0.70 - 36 * bu;          // feet land on the ridge line
      fig(ctx, W * 0.70, bHip + Math.sin(t * 0.7) * 3 * u, {
        u: bu, face: -1, pose: 'loom', t: t, weapon: 'hammer',
        dark: '#080308', rim: 'rgba(255,95,58,0.55)', eye: '#ff4a28', twoEyes: true
      });

      ridges(ctx, W, H, t, 'rgba(46,10,14,0.95)', 'rgba(22,6,10,0.96)', 0.70);

      // Embers rising
      ctx.save();
      for (var i = 0; i < 26; i++) {
        var ph = ((t * 0.20) + i / 26) % 1;
        var ex = (i * 137.5) % W;
        var ey = H * 0.92 - ph * H * 0.7;
        ctx.globalAlpha = 0.5 * Math.sin(Math.PI * ph);
        ctx.fillStyle = '#ff7a3c';
        ctx.beginPath(); ctx.arc(ex, ey, (1 + (i % 3) * 0.7) * u, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      // The player — small, guarded, looking up at it
      fig(ctx, W * 0.23, H * 0.64, { u: u * 0.95, face: 1, pose: 'guard', t: t,
        weapon: 'sword', scarf: true });
    },

    // TRUE FORM — reality coming apart. Inverted, mirrored, unstable.
    trueform: function (ctx, W, H, t, u) {
      ctx.fillStyle = '#06030f'; ctx.fillRect(0, 0, W, H);
      glow(ctx, W * 0.5, H * 0.36, H * 0.62, 'rgba(190,60,255,ALPHA)', 0.24);

      // Shattered plates drifting
      ctx.save();
      for (var i = 0; i < 12; i++) {
        var a = i * 0.9 + t * 0.14;
        var px = W * 0.5 + Math.cos(a) * W * (0.12 + (i % 4) * 0.09);
        var py = H * 0.36 + Math.sin(a * 1.3) * H * (0.10 + (i % 3) * 0.07);
        var s  = (12 + (i % 5) * 11) * u;
        ctx.save(); ctx.translate(px, py); ctx.rotate(a * 0.7);
        ctx.strokeStyle = 'rgba(210,150,255,0.30)'; ctx.lineWidth = 1.4 * u;
        ctx.fillStyle = 'rgba(40,12,80,0.38)';
        ctx.beginPath();
        ctx.moveTo(-s, -s * 0.5); ctx.lineTo(s * 0.7, -s * 0.8);
        ctx.lineTo(s, s * 0.6);   ctx.lineTo(-s * 0.5, s * 0.9);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // Three of him at once, one upside down — the mode's whole idea
      var cx = W * 0.5, cy = H * 0.46;
      fig(ctx, cx - W * 0.20, cy - H * 0.06, { u: u * 1.05, face: 1, pose: 'fall', t: t,
        weapon: 'sword', alpha: 0.34, dark: 'rgba(120,50,210,0.8)', rim: 'rgba(210,160,255,0.45)' });
      ctx.save();
      ctx.translate(cx + W * 0.19, cy - H * 0.02); ctx.scale(1, -1); ctx.translate(-(cx + W * 0.19), -(cy - H * 0.02));
      fig(ctx, cx + W * 0.19, cy - H * 0.02, { u: u * 1.05, face: -1, pose: 'dash', t: t,
        weapon: 'sword', alpha: 0.40, dark: 'rgba(120,50,210,0.8)', rim: 'rgba(210,160,255,0.45)' });
      ctx.restore();
      fig(ctx, cx, cy + Math.sin(t * 1.4) * 4 * u, { u: u * 1.5, face: 1, pose: 'leap', t: t,
        weapon: 'sword', eye: '#e06bff', dark: '#0a0418', rim: 'rgba(238,200,255,0.85)' });

      impact(ctx, cx, cy - H * 0.05, H * 0.16, t, '226,140,255');
    },

    // BATTLE ROYALE — many, and a ring closing on all of them.
    battleroyale: function (ctx, W, H, t, u) {
      var sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#2a1406'); sky.addColorStop(0.5, '#140d12'); sky.addColorStop(1, '#06050c');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      // The closing ring — a wall of light sweeping inward from both edges
      var sweep = (Math.sin(t * 0.5) * 0.5 + 0.5);
      var inset = W * (0.02 + sweep * 0.10);
      var lw = ctx.createLinearGradient(0, 0, inset + W * 0.10, 0);
      lw.addColorStop(0, 'rgba(255,130,50,0.42)'); lw.addColorStop(1, 'rgba(255,130,50,0)');
      ctx.fillStyle = lw; ctx.fillRect(0, 0, inset + W * 0.10, H);
      var rw = ctx.createLinearGradient(W, 0, W - inset - W * 0.10, 0);
      rw.addColorStop(0, 'rgba(255,130,50,0.42)'); rw.addColorStop(1, 'rgba(255,130,50,0)');
      ctx.fillStyle = rw; ctx.fillRect(W - inset - W * 0.10, 0, inset + W * 0.10, H);

      ridges(ctx, W, H, t, 'rgba(40,22,10,0.95)', 'rgba(18,12,10,0.96)', 0.68);

      // A crowd. Depth via scale + alpha; every figure on its own cycle so the
      // field never pulses in unison.
      var N = 14;
      for (var i = 0; i < N; i++) {
        var seed = i * 2.399;
        var depth = 0.34 + ((i * 7) % 10) / 10 * 0.9;
        var fx = W * (0.08 + ((i * 6.37) % 10) / 10 * 0.84);
        var fy = H * (0.34 + ((i * 3.11) % 10) / 10 * 0.30);
        var face = (i % 2) ? 1 : -1;
        var pose = (i % 3 === 0) ? 'leap' : (i % 3 === 1) ? 'dash' : 'clash';
        var wp   = ['sword', 'axe', 'spear', 'hammer'][i % 4];
        fig(ctx, fx, fy + Math.sin(t * (0.8 + (i % 4) * 0.2) + seed) * 5 * u, {
          u: u * depth * 0.95, face: face, pose: pose, t: t, weapon: wp,
          alpha: Math.min(1, 0.36 + depth * 0.5),
          dark: '#05030a', rim: 'rgba(255,150,70,0.66)', eye: 'rgba(255,90,50,0.9)'
        });
      }
      // The last one standing, front and centre, brighter than the rest
      fig(ctx, W * 0.47, H * 0.58, { u: u * 1.45, face: 1, pose: 'clash', t: t,
        weapon: 'sword', scarf: true });
    },

    // MINIGAMES — the light one. Bright, bouncy, no menace.
    minigames: function (ctx, W, H, t, u) {
      var sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#07283a'); sky.addColorStop(0.55, '#062030'); sky.addColorStop(1, '#04121c');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      glow(ctx, W * 0.5, H * 0.32, H * 0.5, 'rgba(60,220,255,ALPHA)', 0.20);

      // Confetti
      ctx.save();
      var cols = ['#4ad6ff', '#ffd23f', '#5ef2a0', '#ff7ab8'];
      for (var i = 0; i < 30; i++) {
        var ph = ((t * 0.28) + i / 30) % 1;
        var cx2 = ((i * 97.3) % W);
        var cy2 = -20 + ph * (H * 0.95);
        ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(t * 2 + i);
        ctx.globalAlpha = 0.75 * Math.sin(Math.PI * ph);
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(-3 * u, -2 * u, 6 * u, 4 * u);
        ctx.restore();
      }
      ctx.restore();

      ridges(ctx, W, H, t, 'rgba(10,54,74,0.95)', 'rgba(6,34,50,0.96)', 0.70);

      // Two figures chasing a bouncing ball
      var bx = W * 0.5 + Math.sin(t * 1.5) * W * 0.16;
      var by = H * 0.40 - Math.abs(Math.sin(t * 3)) * H * 0.16;
      fig(ctx, W * 0.33, H * 0.60, { u: u * 1.25, face: 1, pose: 'leap', t: t,
        dark: '#04131c', rim: 'rgba(150,240,255,0.85)' });
      fig(ctx, W * 0.67, H * 0.60, { u: u * 1.25, face: -1, pose: 'dash', t: t,
        dark: '#04131c', rim: 'rgba(255,215,90,0.85)' });
      glow(ctx, bx, by, 26 * u, 'rgba(255,225,90,ALPHA)', 0.55);
      ctx.beginPath(); ctx.arc(bx, by, 9 * u, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe15a'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.6 * u; ctx.stroke();
    },

    // TRAINING — calm, measured, diagnostic. A dummy and a clean rep.
    training: function (ctx, W, H, t, u) {
      ctx.fillStyle = '#080b14'; ctx.fillRect(0, 0, W, H);
      // Measurement grid
      ctx.save(); ctx.strokeStyle = 'rgba(90,150,220,0.12)'; ctx.lineWidth = 1;
      for (var x = 0; x < W; x += 46) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (var y = 0; y < H; y += 46) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();
      glow(ctx, W * 0.5, H * 0.40, H * 0.45, 'rgba(70,140,255,ALPHA)', 0.16);

      // Floor line
      ctx.strokeStyle = 'rgba(120,180,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, H * 0.66); ctx.lineTo(W, H * 0.66); ctx.stroke();

      // Dummy: a post with a weighted base
      var dx = W * 0.63, dy = H * 0.66;
      ctx.save();
      ctx.strokeStyle = 'rgba(160,200,255,0.55)'; ctx.lineWidth = 7 * u; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx, dy - 78 * u); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx - 26 * u, dy - 58 * u); ctx.lineTo(dx + 26 * u, dy - 58 * u); ctx.stroke();
      ctx.beginPath(); ctx.arc(dx, dy - 92 * u, 13 * u, 0, Math.PI * 2);
      ctx.fillStyle = '#0a1120'; ctx.fill(); ctx.lineWidth = 2 * u; ctx.stroke();
      ctx.restore();

      var hit = Math.max(0, Math.sin(t * 2.2));
      impact(ctx, dx - 22 * u, dy - 60 * u, 34 * u * (0.4 + hit * 0.8), t, '120,200,255');
      fig(ctx, W * 0.40, dy, { u: u * 1.3, face: 1, pose: 'clash', t: t, weapon: 'sword',
        dark: '#060a14', rim: 'rgba(170,215,255,0.9)' });
    },

    // ONLINE — two players, one seam between them.
    online: function (ctx, W, H, t, u) {
      var sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#071a2e'); sky.addColorStop(0.6, '#050f20'); sky.addColorStop(1, '#03060f');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      // Link arcs across the middle — the connection, drawn as signal
      ctx.save();
      for (var i = 0; i < 5; i++) {
        var ph = ((t * 0.5) + i / 5) % 1;
        var amp = H * (0.05 + i * 0.03);
        ctx.strokeStyle = 'rgba(80,200,255,' + (0.30 * Math.sin(Math.PI * ph)).toFixed(3) + ')';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(W * 0.30, H * 0.40);
        ctx.quadraticCurveTo(W * 0.5, H * 0.40 - amp, W * 0.70, H * 0.40);
        ctx.stroke();
      }
      // Packet travelling the link
      var pp = (t * 0.55) % 1;
      var px2 = W * 0.30 + (W * 0.40) * pp;
      var py2 = H * 0.40 - Math.sin(Math.PI * pp) * H * 0.09;
      glow(ctx, px2, py2, 22 * u, 'rgba(90,220,255,ALPHA)', 0.7);
      ctx.restore();

      ridges(ctx, W, H, t, 'rgba(8,32,56,0.95)', 'rgba(5,18,34,0.96)', 0.70);

      fig(ctx, W * 0.27, H * 0.62, { u: u * 1.35, face: 1, pose: 'dash', t: t, weapon: 'sword',
        dark: '#04101e', rim: 'rgba(120,225,255,0.9)' });
      fig(ctx, W * 0.73, H * 0.62, { u: u * 1.35, face: -1, pose: 'dash', t: t, weapon: 'axe',
        dark: '#1a0a10', rim: 'rgba(255,120,120,0.9)' });
    },

    // VERSUS — the default. Two fighters meeting in the middle, mid-air.
    versus: function (ctx, W, H, t, u) {
      var sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#20102e'); sky.addColorStop(0.55, '#120a1c'); sky.addColorStop(1, '#05040b');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      speedLines(ctx, W, H, t, 'rgba(255,150,80,ALPHA)', 6, 1);
      speedLines(ctx, W, H, t, 'rgba(120,200,255,ALPHA)', 6, -1);
      ridges(ctx, W, H, t, 'rgba(30,16,42,0.95)', 'rgba(16,10,26,0.96)', 0.70);

      var cx = W * 0.5, cy = H * 0.44;
      var close = Math.sin(t * 1.1) * W * 0.012;
      fig(ctx, cx - W * 0.105 - close, cy + H * 0.12, {
        u: u * 1.5, face: 1, pose: 'clash', t: t, weapon: 'sword', scarf: true });
      fig(ctx, cx + W * 0.105 + close, cy + H * 0.12, {
        u: u * 1.5, face: -1, pose: 'clash', t: t, weapon: 'axe',
        dark: '#100408', rim: 'rgba(255,130,110,0.9)', eye: '#ff4030' });
      // Flash drawn OVER the fighters — it is the point of contact between them.
      impact(ctx, cx, cy + H * 0.02, H * 0.15, t, '255,170,90');
    },

    // SPLASH — the opening clash. This replaces the old stock/AI splash still
    // with the same stickman vocabulary used by every authored loading scene.
    // The composition intentionally echoes the reference: cool bearer versus
    // warm rival, both converging on a bright fracture in reality.
    splash: function (ctx, W, H, t, u) {
      var sky = ctx.createRadialGradient(W * 0.5, H * 0.42, 0, W * 0.5, H * 0.42, H * 0.90);
      sky.addColorStop(0, '#1b1534');
      sky.addColorStop(0.42, '#0b1023');
      sky.addColorStop(1, '#02030a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

      // Split-color energy fields behind the fighters.
      var leftGlow = ctx.createRadialGradient(W * 0.18, H * 0.46, 0, W * 0.18, H * 0.46, W * 0.58);
      leftGlow.addColorStop(0, 'rgba(32,178,255,0.40)');
      leftGlow.addColorStop(0.55, 'rgba(21,77,170,0.14)');
      leftGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = leftGlow; ctx.fillRect(0, 0, W * 0.68, H);
      var rightGlow = ctx.createRadialGradient(W * 0.82, H * 0.46, 0, W * 0.82, H * 0.46, W * 0.58);
      rightGlow.addColorStop(0, 'rgba(255,112,38,0.40)');
      rightGlow.addColorStop(0.55, 'rgba(180,38,18,0.14)');
      rightGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rightGlow; ctx.fillRect(W * 0.32, 0, W * 0.68, H);

      // Fracture rays — lightweight, deterministic, and alive.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (var i = 0; i < 20; i++) {
        var a = (i / 20) * Math.PI * 2 + Math.sin(t * 0.22) * 0.05;
        var inner = H * (0.05 + (i % 3) * 0.02);
        var outer = H * (0.40 + (i % 5) * 0.10);
        var ex = W * 0.5 + Math.cos(a) * outer;
        var ey = H * 0.43 + Math.sin(a) * outer;
        var col = i % 2 ? '255,118,54' : '73,202,255';
        var ray = ctx.createLinearGradient(W * 0.5, H * 0.43, ex, ey);
        ray.addColorStop(0, 'rgba(255,255,255,0.80)');
        ray.addColorStop(0.18, 'rgba(' + col + ',0.52)');
        ray.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.strokeStyle = ray;
        ctx.lineWidth = (i % 4 === 0 ? 3.2 : 1.2) * u;
        ctx.beginPath();
        ctx.moveTo(W * 0.5 + Math.cos(a) * inner, H * 0.43 + Math.sin(a) * inner);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      ctx.restore();

      // Floating debris gives the scene scale without looking like a photo.
      ctx.save();
      for (var d = 0; d < 22; d++) {
        var dp = (t * (0.04 + (d % 4) * 0.008) + d / 22) % 1;
        var side = d % 2 ? 1 : -1;
        var dx = W * 0.5 + side * (W * (0.10 + (d % 6) * 0.06) + Math.sin(d * 4.2) * 18 * u);
        var dy = H * (0.16 + dp * 0.72);
        var ds = (2 + (d % 4) * 1.4) * u;
        ctx.globalAlpha = 0.18 + 0.28 * Math.sin(Math.PI * dp);
        ctx.fillStyle = d % 2 ? '#ff8a4a' : '#72d8ff';
        ctx.save(); ctx.translate(dx, dy); ctx.rotate(t * 0.8 + d);
        ctx.beginPath();
        ctx.moveTo(-ds, -ds * 0.55); ctx.lineTo(ds * 0.8, -ds);
        ctx.lineTo(ds, ds * 0.65); ctx.lineTo(-ds * 0.5, ds);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // The actual game figures: broad, readable, weapon-bearing silhouettes.
      var clashY = H * 0.67 + Math.sin(t * 1.2) * 4 * u;
      fig(ctx, W * 0.31, clashY, {
        u: u * 2.05, face: 1, pose: 'clash', t: t, weapon: 'sword', eye: '#80e8ff',
        dark: '#050b18', rim: 'rgba(132,224,255,0.94)'
      });
      fig(ctx, W * 0.69, clashY, {
        u: u * 2.05, face: -1, pose: 'clash', t: t, weapon: 'axe', eye: '#ffba70',
        dark: '#160608', rim: 'rgba(255,137,77,0.94)'
      });
      impact(ctx, W * 0.5, H * 0.49, H * 0.19, t, '255,205,126');

      // Foreground vignette keeps the splash legible and makes the game canvas
      // feel like a deliberate title-card surface.
      var vignette = ctx.createRadialGradient(W * 0.5, H * 0.43, H * 0.16, W * 0.5, H * 0.43, H * 0.78);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.66)');
      ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
    }
  };

  // ── Runtime ───────────────────────────────────────────────────────────────
  var _raf = null, _t0 = 0, _key = 'versus';

  function start(sceneKey) {
    var cv = document.getElementById('loadModeCanvas');
    if (!cv) return;
    _key = SCENES[sceneKey] ? sceneKey : 'versus';
    var ctx = cv.getContext('2d');
    // Cap the backing store: this runs for ~800ms behind a fade, so a full
    // retina buffer is wasted work on a frame nobody inspects closely.
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    function resize() {
      cv.width  = Math.floor(cv.clientWidth  * dpr) || Math.floor(window.innerWidth * dpr);
      cv.height = Math.floor(cv.clientHeight * dpr) || Math.floor(window.innerHeight * dpr);
    }
    resize();
    if (_raf) cancelAnimationFrame(_raf);
    _t0 = performance.now();

    function frame() {
      if (cv.clientWidth && Math.abs(cv.width - cv.clientWidth * dpr) > 2) resize();
      var W = cv.width, H = cv.height;
      var t = (performance.now() - _t0) / 1000;
      var u = Math.min(W, H) / 560;      // scene unit
      ctx.clearRect(0, 0, W, H);
      try { SCENES[_key](ctx, W, H, t, u); } catch (e) { /* never break a launch */ }

      // Bottom scrim — the overlay's title, subtitle and bar sit here.
      var sc = ctx.createLinearGradient(0, H * 0.45, 0, H);
      sc.addColorStop(0, 'rgba(4,4,11,0)');
      sc.addColorStop(0.62, 'rgba(4,4,11,0.72)');
      sc.addColorStop(1, 'rgba(4,4,11,0.94)');
      ctx.fillStyle = sc; ctx.fillRect(0, H * 0.45, W, H * 0.55);

      _raf = requestAnimationFrame(frame);
    }
    _raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
  }

  return { start: start, stop: stop, scenes: SCENES };
})();
