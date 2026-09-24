'use strict';

// ─── Canvas ───────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

const GAME_W = 960;
const GAME_H = 540;
canvas.width  = GAME_W;
canvas.height = GAME_H;

// ─── Physics ──────────────────────────────────────────────────────────────────
const GRAVITY  = 0.55;
const MAX_FALL = 20;
const FRICTION = 0.78;
const AIR_FRIC = 0.92;

// ─── Game state ───────────────────────────────────────────────────────────────
// Phases: 'menu' | 'interlude' | 'playing' | 'read' | 'ledger'
let gamePhase      = 'menu';
let currentChapter = 0;
let frameCount     = 0;
let screenShake    = 0;
let paused         = false;

// ─── Active entities ──────────────────────────────────────────────────────────
let sov        = null;   // the player — never named on screen
let actors     = [];     // everyone who isn't the player: speakers, proxies, combatants
let particles  = [];

// ─── Level ────────────────────────────────────────────────────────────────────
let platforms  = [];
let props      = [];     // gates, carts, wells — things a read is allowed to move

// Verbs the world has stopped letting him do. Quarantine takes these away one
// at a time: the walls in Act V are options going missing, not geometry.
let revoked    = new Set();
// Laws currently being asserted AGAINST him by something else in the room.
let contested  = new Set();
let camX       = 0;
let levelWidth = 2000;

// ─── Utilities ────────────────────────────────────────────────────────────────
function lerp(a, b, t)        { return a + (b - a) * t; }
function clamp(v, lo, hi)     { return v < lo ? lo : v > hi ? hi : v; }
function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx*dx + dy*dy); }
function rnd(lo, hi)          { return lo + Math.random() * (hi - lo); }

function shake(amount) { screenShake = Math.max(screenShake, amount); }

function applyScreenShake() {
  if (screenShake <= 0.1) { screenShake = 0; return; }
  ctx.translate(rnd(-screenShake, screenShake), rnd(-screenShake, screenShake));
  screenShake *= 0.88;
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
