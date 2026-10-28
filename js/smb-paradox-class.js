'use strict';
// Paradox entity class and global state.
// Depends on: smb-globals.js.

// Paradox: multiversal being. Visual only, no AI, no hitbox, not in players[].

let paradoxEntity        = null;  // active Paradox visual instance
let paradoxReviveActive  = false; // paradox revive sequence running
let paradoxReviveTimer   = 0;
let paradoxRevivePlayer  = null;  // player being revived

// Opening fight: player and Paradox vs TF, 1000 total damage.
let tfOpeningFightActive   = false;
let tfOpeningDamageDealt   = 0;     // total damage dealt to TF so far (free + scripted)
let _tfOpeningParadoxAtkCd = 0;     // frames until next Paradox attack
let _tfOpeningHeroAtkCd    = 90;    // frames until next scripted hero attack
let _tfOpeningTFRef        = null;  // reference to TrueForm entity
let _tfOpeningPhase        = 0;     // 0=slow buildup, 1=building, 2=climax
let _tfOpeningDialogueFired = new Set(); // which scripted lines have been shown
let _paradoxVx             = 0;    // smoothed horizontal velocity for Paradox movement
let _tfOpeningHeroReactDelay = 0;  // frames hero has been in back-off zone (reaction delay)
let _tfOpeningFreeFrames   = 0;    // countdown: player controls active during this many frames
let _tfOpeningTFStartHealth = 0;   // TF HP at fight start: used to pin the exact opening damage
// 10% of his starting HP (1000 of the standalone 10000), so story's scaled HP keeps the same share.
const TF_OPENING_DAMAGE_FRAC = 0.10;
function _tfOpeningDamageThreshold() { return Math.round((_tfOpeningTFStartHealth || 10000) * TF_OPENING_DAMAGE_FRAC); }

// Absorption state: after Paradox dies and enters the player.
let _tfAbsorptionState = null; // { timer, boss, hero }

// Declarative absorption cinematic state.
let tfAbsorptionScene = null; // { timer, maxTimer, playerRef, paradoxRef, bossRef, phase, memoryIndex, flashAlpha, absorbed }

// Fragmented flashes of Paradox's origin, shown during the absorption scene.
const _TF_ABSORPTION_MEMORIES = [
  'Built to fight beside him.',
  'Something went wrong.',
  '"I was not supposed to be the enemy."',
  'The error was never fixed.',
  '"I fought because that is what I was made to do."',
  'It was always going to end here.',
  '"Remember what I was before the mistake."',
];

// TF-kills-Paradox overlay state.
let playerParadoxAbsorbed = false; // permanent: player carries Paradox energy
let _tfKCOverlay = null;           // visual overlay for the kills-Paradox cinematic

// TrueForm damage lock phase
let tfDamageLocked     = false; // true = player deals 0 dmg to TrueForm
let tfDamageLockTimer  = 0;     // frames until auto-unlock (counts down)

// Empowerment, activated after the damage lock ends.
let tfParadoxEmpowered = false;
let tfEmpowerTimer     = 0;
const TF_EMPOWER_DURATION = 900; // 15 seconds at 60 fps

// Boss fight foreshadowing state
let bossParadoxForeshadow = {
  active:     false,
  timer:      0,
  cooldown:   0,    // frames before next event can trigger
  punchFired: false // one-time boss-punches-paradox scripted moment
};

// TrueForm 30% final cinematic
let tfFinalParadoxFired = false;

const _PARADOX_REVIVE_LINES = [
  "You're not done.",
  "Not this outcome.",
  "Try again."
];

// Visual entity: no physics, no combat. Drawn as a posed CinRig figure at fighter size.
// Cinematics may set `pose` (a partial CIN_POSE, or a CIN_PERF_POSES name) and push world-space
// effects onto `fx`: { type: 'rift'|'slash'|'beam'|'ring', ..., life, max }.
class Paradox {
  constructor(x, y) {
    this.x        = x;
    this.y        = y;
    this.w        = 34;
    this.h        = 84;
    this.alpha    = 0;      // fades in on spawn
    this.facing   = 1;      // +1 right, -1 left
    this.vy       = 0;
    this.done     = false;  // set true to begin fade-out
    this._flicker = 0;
    this._glitchX = 0;
    this._glitchTick = 0;
    this.attackAnim  = 0;   // 0-1 punch animation progress
    this.pose     = null;
    this.expr     = 'intense';
    this.noGravity = false;
    this.fx       = [];
  }

  cx() { return this.x + this.w / 2; }
  cy() { return this.y + this.h / 2; }

  update() {
    if (!this.done) this.alpha = Math.min(1, this.alpha + 0.05);
    else            this.alpha = Math.max(0, this.alpha - 0.06);

    this._flicker++;
    this._glitchTick--;
    if (this._glitchTick <= 0) {
      this._glitchTick = 4 + Math.floor(Math.random() * 12);
      this._glitchX    = (Math.random() < 0.28) ? (Math.random() - 0.5) * 10 : 0;
    }

    if (!this.noGravity) {
      this.vy += 0.55;
      this.y  += this.vy;
      const fl = currentArena && currentArena.platforms && currentArena.platforms.find(p => p.isFloor && !p.isFloorDisabled);
      const floor = fl ? fl.y : GAME_H - 72;
      if (this.y + this.h > floor) { this.y = floor - this.h; this.vy = 0; }
    }

    if (settings.particles && Math.random() < 0.22 && this.alpha > 0.25 && particles.length < MAX_PARTICLES) {
      const _p = _getParticle();
      _p.x     = this.cx() + (Math.random() - 0.5) * 18;
      _p.y     = this.cy() + (Math.random() - 0.5) * 40;
      _p.vx    = (Math.random() - 0.5) * 1.4;
      _p.vy    = -0.8 - Math.random() * 1.8;
      _p.color = Math.random() < 0.55 ? '#00ffff' : '#ffffff';
      _p.size  = 1 + Math.random() * 2;
      _p.life  = 16 + Math.random() * 18;
      _p.maxLife = 34;
      particles.push(_p);
    }

    if (this.attackAnim > 0) this.attackAnim = Math.max(0, this.attackAnim - 0.07);
    for (const e of this.fx) e.life--;
    this.fx = this.fx.filter(e => e.life > 0);
  }

  punch(dir) {
    this.attackAnim = 1;
    if (dir !== undefined) this.facing = dir;
  }

  _currentPose() {
    const L = typeof CIN_PERF_POSES !== 'undefined' ? CIN_PERF_POSES : null;
    if (this.pose) return typeof this.pose === 'string' ? (L && L[this.pose]) || {} : this.pose;
    if (!L) return {};
    if (this.attackAnim > 0 && typeof cinLerpPose === 'function') return cinLerpPose(L.guard, L.thrust, Math.min(1, this.attackAnim * 1.6));
    if (this._launchVx !== undefined) return L.flail;
    if (Math.abs(this.vy) > 2) return L.lookUp;
    return L.guard;
  }

  _drawFx() {
    for (const e of this.fx) {
      const k = e.life / e.max;
      ctx.save();
      ctx.lineCap = 'round';
      if (e.type === 'rift') {
        // A vertical tear in the air, opening then sealing.
        const open = Math.sin(Math.min(1, (1 - k) * 1.4) * Math.PI * 0.5) * (k < 0.25 ? k / 0.25 : 1);
        const hw = 3 + open * (e.w || 14);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(0,255,255,${0.1 * open})`;
        ctx.beginPath(); ctx.ellipse(e.x, e.y, hw * 2.0, e.h * 0.56, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = `rgba(200,255,255,${open})`; ctx.lineWidth = 2;
        ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y - e.h / 2);
        ctx.quadraticCurveTo(e.x + hw, e.y, e.x, e.y + e.h / 2);
        ctx.quadraticCurveTo(e.x - hw, e.y, e.x, e.y - e.h / 2);
        ctx.fill(); ctx.stroke();
      } else if (e.type === 'slash') {
        // A thin bright crescent between two points, fading from the tail.
        ctx.globalAlpha = k;
        ctx.strokeStyle = e.color || '#e0ffff';
        ctx.shadowColor = e.glow || '#00ffff'; ctx.shadowBlur = 16;
        ctx.lineWidth = (e.lw || 5) * (0.4 + k * 0.6);
        const mx = (e.x0 + e.x1) / 2 + (e.bend || 0) * -(e.y1 - e.y0) * 0.3;
        const my = (e.y0 + e.y1) / 2 + (e.bend || 0) * (e.x1 - e.x0) * 0.3;
        ctx.beginPath(); ctx.moveTo(e.x0, e.y0); ctx.quadraticCurveTo(mx, my, e.x1, e.y1); ctx.stroke();
      } else if (e.type === 'beam') {
        // Straight burst from x0,y0 through x1,y1: a white core in a gold sheath.
        const a = Math.min(1, k * 2.2);
        const ang = Math.atan2(e.y1 - e.y0, e.x1 - e.x0), len = Math.hypot(e.x1 - e.x0, e.y1 - e.y0);
        ctx.translate(e.x0, e.y0); ctx.rotate(ang);
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(0, -e.r, 0, e.r);
        g.addColorStop(0, 'rgba(255,190,60,0)'); g.addColorStop(0.5, `rgba(255,220,120,${0.85 * a})`); g.addColorStop(1, 'rgba(255,190,60,0)');
        ctx.fillStyle = g; ctx.fillRect(0, -e.r, len, e.r * 2);
        ctx.fillStyle = `rgba(255,255,245,${a})`; ctx.fillRect(0, -e.r * 0.22, len, e.r * 0.44);
      } else if (e.type === 'ring') {
        ctx.globalAlpha = k;
        ctx.strokeStyle = e.color || '#00ffff'; ctx.lineWidth = 3 * k + 1;
        ctx.shadowColor = e.color || '#00ffff'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.ellipse(e.x, e.y, (1 - k) * e.r, (1 - k) * e.r * (e.flat || 1), 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
  }

  draw() {
    this._drawFx();
    if (this.alpha <= 0 || typeof CinRig === 'undefined') return;
    // Unstable, not a strobe: a gentle shimmer plus the occasional sideways glitch.
    const shimmer = 0.85 + Math.sin(this._flicker * 0.33) * 0.15;
    const pose = Object.assign({}, this._currentPose());
    pose.x = this.cx() + this._glitchX;
    pose.y = this.y + this.h;
    pose.facing = this.facing;
    pose.scale = 0.9 * (pose.scale || 1);
    pose.headScale = (pose.headScale || 1) * 0.77;
    ctx.save();
    CinRig.draw(ctx, pose, '#00ffff', { width: 5.2, alpha: this.alpha * shimmer, glow: '#00ffff', glowBlur: 14, expr: this.expr, outline: 1.3 });
    if (this._glitchX !== 0) {
      // Offset copy on a glitch frame
      pose.x += this._glitchX * 1.6;
      CinRig.draw(ctx, pose, '#00ffff', { width: 5.2, alpha: this.alpha * 0.25, face: false });
    }
    ctx.restore();
  }
}

