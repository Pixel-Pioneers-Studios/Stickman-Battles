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
// Phases: 'menu' | 'cinematic' | 'playing' | 'chapter_end' | 'ending' | 'credits'
let gamePhase      = 'menu';
let currentChapter = 0;
let frameCount     = 0;
let screenShake    = 0;
let hitStopFrames  = 0;
let paused         = false;

// ─── Active entities ──────────────────────────────────────────────────────────
let axiomPlayer  = null;   // Axiom instance
let companions   = [];     // Anders, Seraph, VAEL instances
let enemies      = [];     // Enemy instances
let particles    = [];     // Particle objects

// ─── Level ────────────────────────────────────────────────────────────────────
let platforms    = [];     // { x, y, w, h, type? }
let camX         = 0;
let levelWidth   = 2000;

// ─── Combat feedback state ─────────────────────────────────────────────────────
let comboCount        = 0;   // current hit streak
let comboDisplayTimer = 0;   // frames until combo counter fades out
let superFlashTimer   = 0;   // full-screen flash on super activation

// ─── Utilities ────────────────────────────────────────────────────────────────
function lerp(a, b, t)        { return a + (b - a) * t; }
function clamp(v, lo, hi)     { return v < lo ? lo : v > hi ? hi : v; }
function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx*dx + dy*dy); }
function rnd(lo, hi)          { return lo + Math.random() * (hi - lo); }
function rndInt(lo, hi)       { return Math.floor(rnd(lo, hi + 1)); }

function shake(amount) {
  screenShake = Math.max(screenShake, amount);
}

function applyHitStop(frames) {
  hitStopFrames = Math.max(hitStopFrames, frames);
}

// ─── Shared drawing util ──────────────────────────────────────────────────────
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
