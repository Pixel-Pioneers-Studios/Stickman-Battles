'use strict';

// Cinematic store-cover capture. This is deliberately assembled from the real
// Fighter renderer and authored canvas effects; it is not generated artwork.
const fs = require('fs');
const path = require('path');
const { launch } = require('./harness');

const OUT = process.argv[2] || '/tmp/smb-cinematic-cover.png';
const W = +(process.argv[3] || 3840);
const H = +(process.argv[4] || 2160);

(async () => {
  const h = await launch({ width: W, height: H, port: 8151 });

  await h.eval(() => {
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value; };
    selectMode('2p');
    p1IsBot = false; p2IsBot = false; p2IsNone = false;
    set('p1Weapon', 'sword'); set('p1Class', 'none');
    set('p2Weapon', 'sword'); set('p2Class', 'none');
    selectArena('creator');
    startGame();
  });
  await new Promise(resolve => setTimeout(resolve, 2500));
  await h.manual();

  await h.eval(() => {
    // Store art is a clean key-art frame, not a gameplay HUD screenshot.
    for (let n = canvas; n.parentElement && n !== document.body; n = n.parentElement) {
      for (const sibling of n.parentElement.children) {
        if (sibling !== n && sibling.tagName !== 'SCRIPT') sibling.style.visibility = 'hidden';
      }
    }
    settings.dmgNums = false;
    window.drawEntityOverlays = () => {
      // The engine's regular sword sprite is intentionally supplemented here
      // with a larger hero-readable clash mark for cover scale. It is still
      // authored vector/canvas art, aligned to the real fighters' hands.
      const ix = innerWidth * 0.44;
      const iy = innerHeight * 0.46;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.globalCompositeOperation = 'screen';
      const impact = ctx.createRadialGradient(ix, iy, 0, ix, iy, 70);
      impact.addColorStop(0, 'rgba(255,255,245,0.95)');
      impact.addColorStop(0.18, 'rgba(255,194,96,0.72)');
      impact.addColorStop(1, 'rgba(255,90,30,0)');
      ctx.fillStyle = impact; ctx.beginPath(); ctx.arc(ix, iy, 70, 0, Math.PI * 2); ctx.fill();

      const blade = (x0, y0, x1, y1, warm) => {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, warm ? '#6f1e27' : '#29384d');
        g.addColorStop(0.42, warm ? '#ff9b54' : '#e5f5ff');
        g.addColorStop(0.62, '#ffffff');
        g.addColorStop(1, warm ? '#c53a2d' : '#8eb5d9');
        ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.shadowColor = warm ? '#ff6a35' : '#77c9ff'; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(x0, y0 - 1.5); ctx.lineTo(x1, y1 - 1.5); ctx.stroke();
      };
      // Two readable crossed blades, angled into the impact from each fighter.
      // The earlier near-horizontal strokes looked like laser beams at cover
      // scale, even though they were meant to be weapons.
      blade(ix - innerWidth * 0.045, iy + 42, ix + 12, iy - 5, false);
      blade(ix + innerWidth * 0.11, iy + 42, ix - 12, iy + 7, true);

      // Guard silhouettes at the hands make the crossing read as held weapons.
      ctx.strokeStyle = '#c5d1df'; ctx.lineWidth = 5; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(ix - innerWidth * 0.045, iy + 24); ctx.lineTo(ix - innerWidth * 0.045 + 10, iy + 50); ctx.stroke();
      ctx.strokeStyle = '#ff9d65';
      ctx.beginPath(); ctx.moveTo(ix + innerWidth * 0.11, iy + 24); ctx.lineTo(ix + innerWidth * 0.11 - 10, iy + 50); ctx.stroke();

      ctx.shadowColor = '#fff2bf'; ctx.shadowBlur = 16; ctx.fillStyle = '#fff6d0';
      ctx.beginPath(); ctx.arc(ix, iy, 7, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 22; i++) {
        const a = i * 2.399963; const r = 18 + (i % 5) * 10;
        const x = ix + Math.cos(a) * r, y = iy + Math.sin(a) * r;
        ctx.strokeStyle = i % 3 ? '#ff9b43' : '#f4e6ff'; ctx.lineWidth = 3 + (i % 2);
        ctx.beginPath(); ctx.moveTo(ix + Math.cos(a) * 10, iy + Math.sin(a) * 10); ctx.lineTo(x, y); ctx.stroke();
      }
      ctx.restore();
    };
    if (typeof DomainManager !== 'undefined') {
      DomainManager.drawSpeechBubbles = () => {};
      DomainManager.drawHUD = () => {};
    }
    window.queueAnnouncement = () => {};

    // Add a controlled cinematic energy field behind the real arena art.
    const originalBackground = window.drawBackground;
    window.drawBackground = function () {
      originalBackground.apply(this, arguments);
      const cx = GAME_W * 0.5, cy = 238;
      const pulse = 0.92 + Math.sin(frameCount * 0.06) * 0.04;
      const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 410);
      glow.addColorStop(0, 'rgba(255,245,220,0.42)');
      glow.addColorStop(0.12, 'rgba(255,142,44,0.20)');
      glow.addColorStop(0.46, 'rgba(100,54,210,0.12)');
      glow.addColorStop(1, 'rgba(10,0,30,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, 410 * pulse, 0, Math.PI * 2); ctx.fill();

      // Blue and orange converging energy lanes establish the same readable
      // left/right conflict as the reference image.
      for (let i = 0; i < 12; i++) {
        const y = 55 + i * 31;
        const spread = 190 + i * 12;
        const side = i % 2 ? -1 : 1;
        ctx.globalAlpha = 0.16 - i * 0.006;
        ctx.strokeStyle = side < 0 ? '#54b9ff' : '#ff8238';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.5 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(cx + side * spread, y + 100);
        ctx.lineTo(cx + side * 90, cy + (i - 5) * 4);
        ctx.lineTo(cx + side * 16, cy + (i - 5) * 2);
        ctx.stroke();
      }

      // Branching fracture/lightning lines make the collision read as an event,
      // not a row of straight decorative beams.
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = '#fff7e6'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 18;
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI * 0.92 + i * Math.PI * 0.23;
        const r0 = 20 + (i % 3) * 5;
        const r1 = 108 + (i % 4) * 18;
        const bend = 0.08 * (i % 2 ? -1 : 1);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a + bend) * (r0 + 24), cy + Math.sin(a + bend) * (r0 + 24));
        ctx.lineTo(cx + Math.cos(a - bend * 0.6) * (r1 * 0.70), cy + Math.sin(a - bend * 0.6) * (r1 * 0.70));
        ctx.lineTo(cx + Math.cos(a + bend * 0.35) * r1, cy + Math.sin(a + bend * 0.35) * r1);
        ctx.stroke();

        // Two short offshoots per main crack: unmistakable branching energy,
        // kept subtle enough that the fighters and title remain dominant.
        if (i % 2 === 0) {
          const bx = cx + Math.cos(a - bend * 0.6) * (r1 * 0.70);
          const by = cy + Math.sin(a - bend * 0.6) * (r1 * 0.70);
          for (const branch of [-0.34, 0.27]) {
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(cx + Math.cos(a + branch) * (r1 * 0.92), cy + Math.sin(a + branch) * (r1 * 0.92));
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    };

    const [hero, rival] = players;
    const freeze = fighter => {
      fighter.update = function () {};
      fighter.vx = fighter.vy = 0;
      fighter.onGround = false;
      fighter.health = fighter.maxHealth = 150;
      fighter.invincible = 0;
    };

    // Foreground collision: close enough that the blades visibly overlap the
    // impact point, with faces turned toward the exchange.
    hero.x = 365; hero.y = 170; hero.facing = 1; hero._coverLean = 15;
    hero.color = '#42bfff'; hero.expressionState = 'intense';
    hero.weapon = WEAPONS.sword; hero.weaponKey = 'sword';
    hero.state = 'attacking'; hero.attackTimer = 5; hero.attackDuration = 12;
    hero._finPoseP = 0.72; hero._finPoseState = 'attacking';
    rival.x = 455; rival.y = 166; rival.facing = -1; rival._coverLean = 15;
    rival.color = '#d22a42'; rival.expressionState = 'intense';
    rival.weapon = WEAPONS.sword; rival.weaponKey = 'sword';
    rival.state = 'attacking'; rival.attackTimer = 7; rival.attackDuration = 12;
    rival._finPoseP = 0.42; rival._finPoseState = 'attacking';
    freeze(hero); freeze(rival);

    // Supporting silhouettes use the same renderer, but sit farther back and
    // are intentionally less bright so the central collision owns the frame.
    const makeSupport = (x, y, color, weapon, facing, scale, alpha, pose) => {
      const f = new Fighter(x, y, color, weapon, {}, false, 'medium');
      f.facing = facing; f.expressionState = 'focused';
      f._finPoseP = pose; f._finPoseState = 'attacking';
      f.weapon = WEAPONS[weapon]; f.weaponKey = weapon;
      f._coverScale = scale; f._coverAlpha = alpha;
      freeze(f);
      const originalDraw = f.draw;
      f.draw = function () {
        const px = this.cx(), py = this.cy();
        ctx.save();
        ctx.globalAlpha *= this._coverAlpha;
        ctx.translate(px, py); ctx.scale(this._coverScale, this._coverScale); ctx.translate(-px, -py);
        originalDraw.call(this);
        ctx.restore();
      };
      players.push(f);
    };
    makeSupport(245, 150, '#7c5dff', 'electricstaff', 1, 0.78, 0.52, 0.32);
    makeSupport(635, 142, '#ff9a3d', 'scythe', -1, 0.83, 0.48, 0.58);
    makeSupport(690, 275, '#bb4dff', 'spear', -1, 0.63, 0.30, 0.18);

    // Pin the composition and remove non-essential platform bars from the shot.
    currentArena.platforms = currentArena.platforms.filter(platform => platform.isFloor);
    window.__camLock = { x: 450, y: 220, zoom: 2.30 };
    const originalCamera = window.updateCamera;
    window.updateCamera = function () {
      camXCur = camXTarget = window.__camLock.x;
      camYCur = camYTarget = window.__camLock.y;
      camZoomCur = camZoomTarget = window.__camLock.zoom;
    };
    void originalCamera;
  });

  await h.step(8);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await h.shot(OUT);
  console.log(OUT);
  if (h.errors.length) console.log('errors', h.errors.slice(0, 8));
  await h.close();
})().catch(error => { console.error(error); process.exit(1); });
