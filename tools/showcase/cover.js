'use strict';
// Store cover: two unnamed fighters clashing inside a rising domain, rendered by
// the real engine. Weapons are swapped for 4x re-renders of the same vector art
// (tools/weapon-sprites, SPRITE_W=512) so blades stay crisp at cover size.
//
// Poses use the finisher pose channel (_finPoseP = swing progress 0..1), which
// Fighter.draw renders as a mid-swing without starting an attack — no hitboxes,
// no damage, no i-frame shimmer. Every variant re-stages the same frozen instant.
//
//   node tools/showcase/cover.js <outDir> [--w 3840 --h 2160] [--arena void]
//        [--rise 200] [--poses heroP:villainP[:gap],...] [--colors "#e8ecf2:#b3202a"]
//        [--zoom 2.3] [--dy 0] [--gap 64] [--hires <spriteDir>] [--name cover]
const fs = require('fs'), path = require('path');
const { launch } = require('./harness');

const A = process.argv.slice(2);
const opt = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const OUT = A[0];
const W = +opt('w', 1920), H = +opt('h', 1080);
const ARENA = opt('arena', 'void');
const RISE = +opt('rise', 200);
const POSES = opt('poses', '0.3:0.4').split(',').map(s => s.split(':').map(Number));
const COLORS = opt('colors', '#e8ecf2:#b3202a').split(',').map(s => s.split(':'));
const ZOOM = +opt('zoom', 2.3);
const DY = +opt('dy', 0);          // camera vertical offset, game units
const GAP = +opt('gap', 120);      // distance between the two fighters
const SPARKS = +opt('sparks', 12);  // clash spark count (engine uses 14 + 10)
const SETTLE = +opt('settle', 6);   // frames the sparks fly before the shot
const HIRES = opt('hires', null);
const NAME = opt('name', 'cover');
const HERO_W = opt('hero', 'katana'), VILLAIN_W = opt('villain', 'nullblade');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const overrides = {};
  if (HIRES) for (const f of fs.readdirSync(HIRES)) overrides['/images/weapons/' + f] = path.join(HIRES, f);
  const h = await launch({ width: W, height: H, overrides });

  await h.eval((arena) => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    selectMode('2p'); p1IsBot = false; p2IsBot = false; p2IsNone = false;
    set('p1Weapon', 'sword'); set('p1Class', 'none'); set('p2Weapon', 'sword'); set('p2Class', 'none');
    selectArena(arena); startGame();
  }, ARENA);
  await new Promise(r => setTimeout(r, 2500));
  await h.manual();

  await h.eval((heroW, villainW) => {
    // Nothing on screen but the fight.
    for (let n = canvas; n.parentElement && n !== document.body; n = n.parentElement)
      for (const sib of n.parentElement.children) if (sib !== n && sib.tagName !== 'SCRIPT') sib.style.visibility = 'hidden';
    settings.dmgNums = false;
    window.drawEntityOverlays = () => {};
    DomainManager.drawSpeechBubbles = () => {};
    DomainManager.drawHUD = () => {};
    if (typeof CinFX !== 'undefined') CinFX.nameCard = () => {};
    window.queueAnnouncement = () => {};
    // Camera lock, read every frame.
    const orig = window.updateCamera;
    window.updateCamera = function () {
      const P = window.__pin;
      if (P) for (const [f, x, y] of P) { f.x = x; f.y = y; f.vx = f.vy = 0; }
      const L = window.__camLock;
      if (!L) return orig.apply(this, arguments);
      camXCur = camXTarget = L.x; camYCur = camYTarget = L.y; camZoomCur = camZoomTarget = L.zoom;
    };
    const [a, b] = players;
    const give = (f, k) => { f.weapon = WEAPONS[k]; f.weaponKey = k; };
    give(a, heroW); give(b, villainW);
    a.x = 380; b.x = 470; a.facing = 1; b.facing = -1;
    b._domainKey = 'sovereign';
    DomainManager.triggerExpansion(b);
  }, HERO_W, VILLAIN_W);

  await h.step(RISE);
  // Freeze bodies from here on (hit-stop would also stop drawing); the domain
  // and particles keep animating. Floating platforms go — they are layout, not
  // subject, and read as UI bars at this zoom.
  await h.eval((gap) => {
    const [a, b] = players;
    a.update = b.update = function () {};
    currentArena.platforms = currentArena.platforms.filter(p => p.isFloor);
    a.x = b.x - gap; a.y = b.y + 4;
    a.onGround = false; a.facing = 1; b.facing = -1;
    window.__pin = [[a, a.x, a.y], [b, b.x, b.y]];
  }, GAP);

  for (const [ca, cb] of COLORS) {
    for (const [pa, pb, gp] of POSES) {
      await h.eval((ca, cb, pa, pb, gap, zoom, dy, sparks) => {
        const [a, b] = players;
        const P = window.__pin;
        P[0][1] = P[1][1] - gap; a.x = P[0][1];
        a.color = ca; b.color = cb;
        a.invincible = b.invincible = 0;
        a._finPoseP = pa; b._finPoseP = pb;
        const mx = (a.cx() + b.cx()) / 2, my = (a.cy() + b.cy()) / 2;
        if (typeof particles !== 'undefined') particles.length = 0;
        spawnParticles(mx, my - 8, '#ffffff', sparks);
        spawnParticles(mx, my - 8, '#ffd27a', Math.round(sparks * 0.6));
        if (typeof spawnRing === 'function') spawnRing(mx, my - 8);
        window.__camLock = { x: mx, y: my + dy, zoom };
      }, ca, cb, pa, pb, gp || GAP, ZOOM, DY, SPARKS);
      await h.step(SETTLE);
      const f = path.join(OUT, `${NAME}_${ca.slice(1)}_${cb.slice(1)}_${pa}_${pb}_${gp || GAP}.png`);
      await h.shot(f);
      console.log(f);
    }
  }
  if (h.errors.length) console.log('errors', h.errors.slice(0, 5));
  await h.close();
})().catch(e => { console.error(e); process.exit(1); });
