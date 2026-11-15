'use strict';
// smb-home-v2.js — the home screen as a game screen, not a page of cards.
//
// Layout: one-word mode list on the left (only the selected one shows its line),
// your fighter on a rooftop ledge in the moon scene, and one PLAY banner bottom-right
// that always starts the next Fight Ladder rung (or the Weekly Challenge once the
// ladder is beaten). Clicking a list item opens that mode directly, so nothing takes
// more clicks than the old cards did.
//
// Patches over the existing hub: the old card markup stays in #pathCards (hidden by
// CSS) because refreshHomeHub(), refreshLadderCard() and WeeklyChallenge.refreshCard()
// keep writing to it; the banner mirrors those elements and clicks #hubLadderBtn.
// ?classichome turns the whole layer off.
//
// Globals: _homeV2On, _homeV2Scene(ctx, W, H, t) (drawn by the home canvas loop in
// smb-menu-ui.js). Loads after smb-figure-rig.js; uses FigureSkin, FIG_* sizes,
// WEAPON_SPRITES and the menu functions at call time only.

var _homeV2On = !/[?&]classichome\b/.test(location.search);

var HOME_V2_MODES = [
  { k: 'story',   label: 'Story',         desc: function () { return _h2Text('hubStoryDesc') || 'Chapters, skill tree and shop.'; }, run: function () { openStoryPath(); } },
  { k: 'ladder',  label: 'Fight Ladder',  desc: 'Ten 1v1 fights, each one harder. Pick any rung you have reached.', run: function () { openLadderRungs(); } },
  { k: 'quick',   label: 'Quick Fight',   desc: 'Instant match. Random arena, weapon and class.', run: function () { quickFight(); } },
  { k: 'endless', label: 'Endless',       desc: 'Clear the block, take the teleporter. How far can you get?', badge: 'New', run: function () { selectMode('endless'); } },
  { k: 'br',      label: 'Battle Royale', desc: '94 bearers. One survivor.', run: function () { selectMode('battleroyale'); } },
  { k: 'versus',  label: 'Versus',        desc: 'Local duels and bot fights.', run: function () { selectMode('2p'); } },
  { k: 'online',  label: 'Online',        desc: 'Lobbies of 10. Invite friends by link.', run: function () { selectMode('online'); } },
  { k: 'sim',     label: 'Simulator',     desc: 'Refights, minigames and training.', run: function () { openSimulator(); } },
  { k: 'prequel', label: 'Prequels',      desc: 'Two stories from before The 95th.', run: function () { openPrequels(); } }
];

var _h2Sel = 0;          // selected list row (hover / focus)
var _h2PlayHot = false;  // pointer is on PLAY: the fighter raises the weapon

function _h2Text(id) {
  var el = document.getElementById(id);
  return el ? (el.textContent || '').trim() : '';
}

function _h2Desc(m) { return typeof m.desc === 'function' ? m.desc() : m.desc; }

function _h2Select(i) {
  _h2Sel = i;
  var rows = document.querySelectorAll('#h2Modes .h2-item');
  for (var r = 0; r < rows.length; r++) rows[r].classList.toggle('is-sel', r === i);
  var d = rows[i] && rows[i].querySelector('.h2-desc');
  if (d) d.textContent = _h2Desc(HOME_V2_MODES[i]);
}

// The banner copies the hidden ladder card, which the ladder and weekly code keep current.
function _h2Sync() {
  var kick = document.getElementById('h2PlayKicker');
  if (!kick) return;
  kick.textContent = _h2Text('hubLadderKicker') || 'Fight Ladder';
  var go = document.getElementById('h2PlayGo');
  if (go) go.textContent = _h2Text('hubLadderBtn') || 'Fight';
  var sub = document.getElementById('h2PlaySub');
  if (sub) sub.textContent = _h2Text('hubLadderTitle');
  var cnt = document.getElementById('h2PlayCount');
  if (cnt) {
    var c = _h2Text('hubLadderCount');
    cnt.textContent = c ? c.replace(/\s+/g, ' ') : '';
  }
  _h2Select(_h2Sel);
}

function _h2Build() {
  var menu = document.getElementById('menu');
  var cards = document.getElementById('pathCards');
  if (!menu || !cards || document.getElementById('h2Modes')) return;
  menu.classList.add('home-v2');

  var list = document.createElement('nav');
  list.id = 'h2Modes';
  list.className = 'h2-modes';
  list.setAttribute('aria-label', 'Modes');
  HOME_V2_MODES.forEach(function (m, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'h2-item';
    b.style.setProperty('--h2-i', i);
    b.innerHTML = '<span class="h2-label"></span>' +
      (m.badge ? '<span class="h2-badge"></span>' : '') +
      '<span class="h2-desc"></span>';
    b.querySelector('.h2-label').textContent = m.label;
    if (m.badge) b.querySelector('.h2-badge').textContent = m.badge;
    b.addEventListener('mouseenter', function () { _h2Select(i); });
    b.addEventListener('focus', function () { _h2Select(i); });
    b.addEventListener('click', function () {
      try { if (typeof SoundManager !== 'undefined' && SoundManager.uiClick) SoundManager.uiClick(); } catch (e) {}
      m.run();
    });
    list.appendChild(b);
  });
  cards.appendChild(list);

  var play = document.createElement('button');
  play.type = 'button';
  play.id = 'h2Play';
  play.className = 'h2-play';
  play.innerHTML =
    '<span class="h2-play-kicker" id="h2PlayKicker">Fight Ladder</span>' +
    '<span class="h2-play-go" id="h2PlayGo">Fight</span>' +
    '<span class="h2-play-sub"><span id="h2PlaySub"></span><span class="h2-play-count" id="h2PlayCount"></span></span>';
  play.addEventListener('click', function () {
    var btn = document.getElementById('hubLadderBtn');
    if (btn) btn.click();
  });
  play.addEventListener('mouseenter', function () { _h2PlayHot = true; });
  play.addEventListener('mouseleave', function () { _h2PlayHot = false; });
  play.addEventListener('focus', function () { _h2PlayHot = true; });
  play.addEventListener('blur', function () { _h2PlayHot = false; });
  cards.appendChild(play);

  // Coins join the icon row top-right, like a game's currency bar.
  var coins = document.getElementById('hubCoins');
  var nav = document.querySelector('#menuHomeContent .home-quicknav');
  if (coins && nav) nav.insertBefore(coins, nav.firstChild);

  // Sub-panels (story, simulator, prequels) hide #pathCards. The logo goes back to its
  // old place above them, or it would sit on their headings.
  var syncSub = function () { menu.classList.toggle('h2-sub', cards.style.display === 'none'); };
  syncSub();
  if (window.MutationObserver) new MutationObserver(syncSub).observe(cards, { attributes: true, attributeFilter: ['style'] });

  // Mirror the ladder card whenever its text changes.
  if (window.MutationObserver) {
    var mo = new MutationObserver(_h2Sync);
    ['hubLadderKicker', 'hubLadderTitle', 'hubLadderBtn', 'hubLadderCount', 'hubStoryDesc'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) mo.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }
  _h2Select(0);
  _h2Sync();
}

if (_homeV2On) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _h2Build);
  else _h2Build();
}

// ─── Canvas: ledge + your fighter ────────────────────────────────────────────

var _h2Ledge = { W: 0, H: 0, img: null };

// Fighter feet and size, in canvas px. One place so the ledge and the figure agree.
function _h2Place(W, H) {
  var narrow = W < H * 1.15;
  var s = Math.min(H * 0.0050, W * 0.0036);
  return {
    x: narrow ? W * 0.70 : W * 0.615,
    y: H * (narrow ? 0.66 : 0.735),
    s: s
  };
}

function _h2BuildLedge(W, H) {
  var c = document.createElement('canvas');
  c.width = W; c.height = H;
  var g = c.getContext('2d');
  var p = _h2Place(W, H);
  var top = p.y + 2;
  var x0 = p.x - 150 * p.s;

  // Rock slab: a broken rooftop edge running off the right side.
  g.beginPath();
  g.moveTo(x0 - 30 * p.s, H);
  g.lineTo(x0 - 6 * p.s, top + 40 * p.s);
  g.lineTo(x0 + 6 * p.s, top + 6 * p.s);
  g.lineTo(x0 + 40 * p.s, top);
  g.lineTo(p.x + 70 * p.s, top - 2 * p.s);
  g.lineTo(p.x + 120 * p.s, top + 3 * p.s);
  g.lineTo(p.x + 150 * p.s, top - 1 * p.s);
  g.lineTo(W, top + 6 * p.s);
  g.lineTo(W, H);
  g.closePath();
  var body = g.createLinearGradient(0, top, 0, H);
  body.addColorStop(0, '#120c1b');
  body.addColorStop(0.35, '#0a0710');
  body.addColorStop(1, '#050409');
  g.fillStyle = body;
  g.fill();

  // Moonlit rim along the top edge.
  g.save();
  g.clip();
  var rim = g.createLinearGradient(0, top - 4 * p.s, 0, top + 14 * p.s);
  rim.addColorStop(0, 'rgba(255,196,120,0.55)');
  rim.addColorStop(0.25, 'rgba(236,140,70,0.22)');
  rim.addColorStop(1, 'rgba(236,140,70,0)');
  g.fillStyle = rim;
  g.fillRect(0, top - 6 * p.s, W, 22 * p.s);
  // Cracks.
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.lineWidth = Math.max(1, 1.4 * p.s);
  g.beginPath();
  g.moveTo(p.x + 40 * p.s, top);       g.lineTo(p.x + 46 * p.s, top + 18 * p.s); g.lineTo(p.x + 38 * p.s, top + 34 * p.s);
  g.moveTo(x0 + 20 * p.s, top + 2 * p.s); g.lineTo(x0 + 30 * p.s, top + 26 * p.s);
  g.moveTo(p.x + 104 * p.s, top + 2 * p.s); g.lineTo(p.x + 98 * p.s, top + 22 * p.s);
  g.stroke();
  g.restore();

  // Edge highlight line.
  g.strokeStyle = 'rgba(255,205,140,0.45)';
  g.lineWidth = Math.max(1, 1.2 * p.s);
  g.beginPath();
  g.moveTo(x0 + 6 * p.s, top + 6 * p.s);
  g.lineTo(x0 + 40 * p.s, top);
  g.lineTo(p.x + 70 * p.s, top - 2 * p.s);
  g.lineTo(p.x + 120 * p.s, top + 3 * p.s);
  g.lineTo(p.x + 150 * p.s, top - 1 * p.s);
  g.lineTo(W, top + 6 * p.s);
  g.stroke();

  _h2Ledge = { W: W, H: H, img: c };
}

// Poses, authored facing right (the figure is mirrored to face the menu). Same angle
// convention as FigureRig (absolute, radians from +X, +Y down), solved with the in-game
// body (FIG_* in smb-globals.js) so it matches the fighter you play, not the story rig.
var _H2_REST = {
  spine: -Math.PI / 2 + 0.05, headTilt: 0.08, lean: 1,
  upperArmF: Math.PI / 2 - 0.22, foreArmF: Math.PI / 2 - 0.80,
  upperArmB: Math.PI / 2 + 0.62, foreArmB: Math.PI / 2 + 0.30,
  thighF: Math.PI / 2 - 0.52, shinF: Math.PI / 2 - 0.12,
  thighB: Math.PI / 2 + 0.55, shinB: Math.PI / 2 + 0.22
};
var _H2_READY = {
  spine: -Math.PI / 2 + 0.14, headTilt: 0.12, lean: 3,
  upperArmF: -0.55, foreArmF: -1.05,
  upperArmB: Math.PI / 2 - 0.80, foreArmB: -0.30,
  thighF: Math.PI / 2 - 0.62, shinF: Math.PI / 2 + 0.18,
  thighB: Math.PI / 2 + 0.60, shinB: Math.PI / 2 + 0.22
};
var _H2_W_REST = 0.78, _H2_W_READY = -1.15;   // weapon direction from the hand

function _h2Blend(a, b, k) {
  var o = {};
  for (var key in a) o[key] = a[key] + (b[key] - a[key]) * k;
  return o;
}

// Joints in body units, feet planted on y = 0.
function _h2Solve(P) {
  var HR = (typeof FIG_HEAD_R !== 'undefined') ? FIG_HEAD_R : 9;
  var NECK = (typeof FIG_NECK !== 'undefined') ? FIG_NECK : 5;
  var ARM = ((typeof FIG_ARM_LEN !== 'undefined') ? FIG_ARM_LEN : 24) / 2;
  var LEG = ((typeof FIG_LEG_LEN !== 'undefined') ? FIG_LEG_LEN : 31) / 2;
  var TORSO = 30;
  var at = function (o, a, l) { return { x: o.x + Math.cos(a) * l, y: o.y + Math.sin(a) * l }; };
  var hip = { x: P.lean || 0, y: 0 };
  var shoulder = at(hip, P.spine, TORSO);
  var hdA = P.spine + (P.headTilt || 0);
  var head = at(shoulder, hdA, NECK + HR);
  var neck = at(head, hdA + Math.PI, HR * 0.8);
  var elbowF = at(shoulder, P.upperArmF, ARM), handF = at(elbowF, P.foreArmF, ARM);
  var elbowB = at(shoulder, P.upperArmB, ARM), handB = at(elbowB, P.foreArmB, ARM);
  var kneeF = at(hip, P.thighF, LEG), footF = at(kneeF, P.shinF, LEG);
  var kneeB = at(hip, P.thighB, LEG), footB = at(kneeB, P.shinB, LEG);
  var j = { hip: hip, shoulder: shoulder, head: head, headR: HR, neck: neck,
            elbowF: elbowF, handF: handF, elbowB: elbowB, handB: handB,
            kneeF: kneeF, footF: footF, kneeB: kneeB, footB: footB };
  var dy = -Math.max(footF.y, footB.y);
  for (var n in j) if (j[n] && typeof j[n] === 'object') j[n].y += dy;
  return j;
}

var _h2Ready = 0;     // 0 rest .. 1 weapon raised (eased each frame)
var _h2LastT = 0;
var _h2Embers = [];

function _h2Env(t) {
  // Every 9 s: raise the weapon, hold, lower. PLAY hover holds it up.
  var c = t % 9;
  var auto = c < 0.35 ? c / 0.35 : c < 1.9 ? 1 : c < 2.6 ? 1 - (c - 1.9) / 0.7 : 0;
  auto = auto * auto * (3 - 2 * auto);
  return _h2PlayHot ? 1 : auto;
}

function _h2Fighter(ctx, p, t) {
  if (typeof FigureSkin === 'undefined') return;
  var dt = Math.min(0.1, Math.max(0, t - _h2LastT)); _h2LastT = t;
  var want = _h2Env(t);
  _h2Ready += (want - _h2Ready) * Math.min(1, dt * (want > _h2Ready ? 14 : 5));
  var k = _h2Ready;

  var pose = _h2Blend(_H2_REST, _H2_READY, k);
  var br = Math.sin(t * 1.6);                                     // breathing: knees give a little
  pose.thighF -= br * 0.025; pose.shinF += br * 0.025;
  pose.thighB += br * 0.025; pose.shinB -= br * 0.02;
  pose.spine += Math.sin(t * 1.6 - 0.6) * 0.015;
  pose.upperArmB += Math.sin(t * 1.1) * 0.05 * (1 - k);
  var j = _h2Solve(pose);

  var colorEl = document.getElementById('p1Color');
  var color = (colorEl && colorEl.value) || '#00d4ff';
  var wEl = document.getElementById('p1Weapon');
  var wk = (wEl && wEl.value) || 'sword';
  if (wk === 'random') wk = 'sword';
  var LW = (typeof FIG_LINE_W !== 'undefined') ? FIG_LINE_W : 3.8;
  var ang = function (a, b) { return Math.atan2(b.y - a.y, b.x - a.x); };

  var near = FigureSkin.begin({ film: true }), far = FigureSkin.begin({ film: true });
  FigureSkin.segment(near, [j.neck, j.shoulder], [LW * 0.55, LW * 0.92]);
  FigureSkin.head(near, j.head.x, j.head.y, j.headR, 1);
  FigureSkin.segment(near, [j.shoulder, { x: (j.shoulder.x + j.hip.x) * 0.5 + 1, y: (j.shoulder.y + j.hip.y) * 0.5 }, j.hip],
    [LW * 1.85, LW * 1.45, LW * 1.30]);
  FigureSkin.segment(near, [j.shoulder, j.elbowF, j.handF], [LW * 1.15, LW * 0.92, LW * 0.70], true);
  FigureSkin.hand(near, j.handF.x, j.handF.y, ang(j.elbowF, j.handF), 1, 1);
  FigureSkin.segment(near, [j.hip, j.kneeF, j.footF], [LW * 1.30, LW * 1.00, LW * 0.76], true);
  FigureSkin.foot(near, j.footF.x, j.footF.y + 1.2, ang(j.kneeF, j.footF), 1);
  FigureSkin.segment(far, [j.shoulder, j.elbowB, j.handB], [LW * 1.02, LW * 0.82, LW * 0.62]);
  FigureSkin.hand(far, j.handB.x, j.handB.y, ang(j.elbowB, j.handB), 1, 0.85);
  FigureSkin.segment(far, [j.hip, j.kneeB, j.footB], [LW * 1.16, LW * 0.90, LW * 0.68]);
  FigureSkin.foot(far, j.footB.x, j.footB.y + 1.2, ang(j.kneeB, j.footB), 1);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(-p.s, p.s);     // face left, toward the menu

  // Ground shadow + aura under the feet.
  var ag = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
  ag.addColorStop(0, 'rgba(0,0,0,0.55)');
  ag.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ag;
  ctx.beginPath(); ctx.ellipse(0, 1, 34, 6, 0, 0, Math.PI * 2); ctx.fill();

  // Scarf streaming back in the wind (behind = -x in this space).
  // Two tails, each a tapering ribbon that ripples along its length.
  for (var tail = 0; tail < 2; tail++) {
    var L = tail ? 34 : 48, ph = tail * 1.9, wid = tail ? 1.6 : 2.3;
    var nx = j.neck.x - 1, ny = j.neck.y + 1.5 + tail * 1.5;
    var top = [], bot = [];
    for (var q = 0; q <= 10; q++) {
      var u = q / 10;
      var sx = nx - L * u;
      var sy = ny + u * (3 + tail * 3) + Math.sin(t * 5.2 - u * 5 + ph) * 3.6 * u + Math.sin(t * 2.1 + ph) * 1.5 * u;
      var hw = wid * (1 - u * 0.85);
      top.push([sx, sy - hw]); bot.push([sx, sy + hw]);
    }
    var sg = ctx.createLinearGradient(nx, ny, nx - L, ny);
    sg.addColorStop(0, 'rgba(255,66,58,0.95)');
    sg.addColorStop(0.65, 'rgba(214,34,34,0.7)');
    sg.addColorStop(1, 'rgba(150,20,20,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    for (q = 1; q < top.length; q++) ctx.lineTo(top[q][0], top[q][1]);
    for (q = bot.length - 1; q >= 0; q--) ctx.lineTo(bot[q][0], bot[q][1]);
    ctx.closePath(); ctx.fill();
  }

  // Neon rim in the player's colour.
  ctx.save();
  ctx.globalAlpha = 0.55 + k * 0.3;
  ctx.shadowColor = color; ctx.shadowBlur = 8 + k * 6;
  ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
  ctx.stroke(near.p);
  ctx.restore();

  var pal = { accent: color };
  FigureSkin.paint(far, pal, true, ctx, 1);

  // The equipped weapon's real sprite, in the front hand.
  var spr = (typeof WEAPON_SPRITES !== 'undefined') ? WEAPON_SPRITES[wk] : null;
  if (spr && spr.ready && spr.img && spr.img.width) {
    var len = spr.len * 1.08, hgt = len * spr.img.height / spr.img.width;
    ctx.save();
    ctx.translate(j.handF.x, j.handF.y);
    ctx.rotate(_H2_W_REST + (_H2_W_READY - _H2_W_REST) * k);
    if (k > 0.6) { ctx.shadowColor = color; ctx.shadowBlur = 10 * (k - 0.6) / 0.4; }
    ctx.drawImage(spr.img, -len * spr.anchor, -hgt * spr.shaftY, len, hgt);
    ctx.restore();
  }

  FigureSkin.paint(near, pal, false, ctx, 1);
  if (FigureSkin.face) {
    try { FigureSkin.face(FigureSkin.pal ? FigureSkin.pal(color) : pal, j.head.x, j.head.y, j.headR, 1, { lookX: 0.6, lookY: 0.1 }, ctx); } catch (e) {}
  }
  ctx.restore();
}

function _h2EmberStep(ctx, W, H, p) {
  if (_h2Embers.length < 26 && Math.random() < 0.25) {
    _h2Embers.push({
      x: p.x + (Math.random() - 0.3) * 260 * p.s, y: p.y + Math.random() * 20,
      vx: -0.3 - Math.random() * 0.9, vy: -0.5 - Math.random() * 0.8,
      life: 1, r: 0.8 + Math.random() * 1.8
    });
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (var i = _h2Embers.length - 1; i >= 0; i--) {
    var e = _h2Embers[i];
    e.x += e.vx * p.s * 0.6; e.y += e.vy * p.s * 0.6; e.life -= 0.006;
    if (e.life <= 0 || e.y < H * 0.2) { _h2Embers.splice(i, 1); continue; }
    ctx.globalAlpha = Math.min(1, e.life * 1.6) * 0.8;
    ctx.fillStyle = '#ffb067';
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r * p.s * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Drawn after _homeArtScene by the home canvas loop. Returns false when it drew nothing.
function _homeV2Scene(ctx, W, H, t) {
  if (!_homeV2On) return false;
  var home = document.getElementById('menuHomeContent');
  if (home && home.style.display === 'none') return false;
  var hub = document.getElementById('pathCards');
  var onHub = !hub || hub.style.display !== 'none';

  // Left scrim so the mode list reads over the sky.
  var sc = ctx.createLinearGradient(0, 0, W * 0.5, 0);
  sc.addColorStop(0, 'rgba(6,4,12,0.80)');
  sc.addColorStop(0.55, 'rgba(6,4,12,0.38)');
  sc.addColorStop(1, 'rgba(6,4,12,0)');
  ctx.fillStyle = sc;
  ctx.fillRect(0, 0, W * 0.5, H);

  if (_h2Ledge.W !== W || _h2Ledge.H !== H || !_h2Ledge.img) _h2BuildLedge(W, H);
  ctx.drawImage(_h2Ledge.img, 0, 0);
  var p = _h2Place(W, H);
  _h2EmberStep(ctx, W, H, p);
  // Sub-panels (story, simulator, prequels) sit over the middle; keep the ledge, drop the figure.
  if (onHub) _h2Fighter(ctx, p, t);

  // Bottom scrim under the banner.
  var bs = ctx.createLinearGradient(0, H * 0.78, 0, H);
  bs.addColorStop(0, 'rgba(6,4,12,0)');
  bs.addColorStop(1, 'rgba(6,4,12,0.55)');
  ctx.fillStyle = bs;
  ctx.fillRect(0, H * 0.78, W, H * 0.22);
  return true;
}
