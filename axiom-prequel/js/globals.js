'use strict';

// ─── Canvas ───────────────────────────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

const GAME_W = 960;
const GAME_H = 540;
// Backing store at screen resolution; every draw call stays in GAME_W x GAME_H units.
const RENDER_SCALE = Math.min(3, Math.ceil((window.devicePixelRatio || 1) * Math.max(1, screen.width / GAME_W)));
canvas.width  = GAME_W * RENDER_SCALE;
canvas.height = GAME_H * RENDER_SCALE;
canvas.style.width  = GAME_W + 'px';
canvas.style.height = GAME_H + 'px';
ctx.scale(RENDER_SCALE, RENDER_SCALE);

// ─── Chapter progress ─────────────────────────────────────────────────────────
// Chapters unlock in order. Inside Stickman Evolution the main game owns the
// save (per account) and sends it in on load; standalone play keeps its own copy.
const PREQUEL_KEY = 'axiom';
let chaptersCleared = 0;
try { chaptersCleared = Number(localStorage.getItem('smbPrequel_' + PREQUEL_KEY)) || 0; } catch (e) {}

// Inside Stickman Evolution the main story also gates chapters, so nothing here
// shows a twist before The 95th reveals it. The main game sends how many chapters
// its story progress allows (storyCap) and what to finish next (storyCapNote).
// Framed, everything stays shut until that message arrives; standalone, it's all open.
let storyCap     = window.parent !== window ? 0 : Infinity;
let storyCapNote = '';

function isChapterUnlocked(idx) { return idx <= chaptersCleared && idx < storyCap; }

// Why a chapter is shut, for the chapter-select note.
function chapterLockText(idx) {
  if (idx >= storyCap) return storyCapNote || 'LOCKED \u2014 KEEP PLAYING THE 95TH';
  return 'LOCKED \u2014 FINISH THE CHAPTER BEFORE IT';
}

function recordChapterCleared(idx) {
  if (idx + 1 > chaptersCleared) {
    chaptersCleared = idx + 1;
    try { localStorage.setItem('smbPrequel_' + PREQUEL_KEY, String(chaptersCleared)); } catch (e) {}
  }
  if (window.parent !== window) window.parent.postMessage({ smbPrequel: PREQUEL_KEY, cleared: idx + 1 }, '*');
}

window.addEventListener('message', e => {
  const n = e.data && e.data.smbPrequelProgress;
  if (typeof n === 'number') chaptersCleared = n;
  const cap = e.data && e.data.smbPrequelStoryCap;
  if (typeof cap === 'number') storyCap = cap;
  const note = e.data && e.data.smbPrequelStoryNote;
  if (typeof note === 'string') storyCapNote = note;
});

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
