'use strict';

// ─── Weapon pickup object ─────────────────────────────────────────────────────
class WeaponPickup {
  constructor(x, y, weaponType, durability, label) {
    this.x          = x;
    this.y          = y;
    this.w          = 20;
    this.h          = 6;
    this.weaponType = weaponType;
    this.durability = durability;
    this.label      = label;
    this.collected  = false;
    this.bobTimer   = Math.random() * Math.PI * 2;
  }

  update() {
    this.bobTimer += 0.06;
    if (axiomPlayer && !axiomPlayer.weapon) {
      const d = dist(axiomPlayer.cx(), axiomPlayer.cy(),
                     this.x + this.w / 2, this.y + this.h / 2);
      if (d < 55) {
        axiomPlayer.nearPickup = this;
      } else if (axiomPlayer.nearPickup === this) {
        axiomPlayer.nearPickup = null;
      }
    }
  }

  draw() {
    if (this.collected) return;
    const sx  = this.x - camX;
    const bob = Math.sin(this.bobTimer) * 3;

    ctx.save();
    ctx.globalAlpha = 0.22 + Math.sin(this.bobTimer) * 0.08;
    ctx.fillStyle   = this.weaponType === 'chain' ? '#cc9900' : '#8888cc';
    ctx.beginPath();
    ctx.arc(sx + this.w / 2, this.y + bob, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (this.weaponType === 'chain') {
      ctx.strokeStyle = '#ccaa44';
      ctx.lineWidth   = 3;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(sx + 2, this.y + bob + 3);
      ctx.lineTo(sx + 18, this.y + bob + 3);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#aa8822';
      ctx.beginPath();
      ctx.arc(sx + 18, this.y + bob + 3, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#c8c8e8';
      ctx.lineWidth   = 3;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(sx + 3, this.y + bob + 3);
      ctx.lineTo(sx + 18, this.y + bob + 3);
      ctx.stroke();
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur  = 6;
    ctx.fillStyle   = 'rgba(255,220,80,0.9)';
    ctx.font        = 'bold 11px Courier New';
    ctx.textAlign   = 'center';
    ctx.fillText(this.label, sx + this.w / 2, this.y + bob - 10);
    ctx.restore();

    ctx.restore();
  }
}

let weaponPickups = [];

function updateWeaponPickups() {
  for (let i = weaponPickups.length - 1; i >= 0; i--) {
    const w = weaponPickups[i];
    if (w.collected) { weaponPickups.splice(i, 1); continue; }
    w.update();
  }
}

function drawWeaponPickups() {
  for (const w of weaponPickups) w.draw();
}

// ─── Chapter definitions ──────────────────────────────────────────────────────
//
// type: 'interlude' — walking chapter, dialogue triggers, no enemies
//       'play'      — combat chapter with enemies
//
// Interlude chapters complete when Axiom reaches endTriggerX and all dialogue fired.
// Play chapters complete when all enemies are dead.
//
// Ground y and entity spawn y formula:
//   ground platform y = G
//   axiom (h=52) start y = G - 54
//   companion (h=48) start y = G - 50
//   enemy (h=50) start y = G - 52
//   lieutenant (h=56) start y = G - 58

const CHAPTERS = [

  // ══════════════════════════════════════════════════════════════════════════
  // 0 — PROLOGUE INTERLUDE: "Tuesday"
  // Axiom alone. His last ordinary day. No companions.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 0, type: 'interlude',
    title: 'BEFORE', subtitle: 'Tuesday',
    width: 1800, background: 'street_day',
    axiomStart:    { x: 80, y: 386 },
    platforms:     [{ x: 0, y: 440, w: 1800, h: 80 }],
    enemies:       [],
    companionNames: [],
    companionStarts: [],
    weaponPickups:  [],
    endTriggerX:   1680,
    dialogues: [
      { x: 140,  text: 'Home City.',                      duration: 180 },
      { x: 280,  text: 'Tuesday.',                        duration: 160 },
      { x: 500,  text: 'Nothing about this day was supposed to matter.', duration: 240 },
      { x: 750,  text: 'You had groceries.',              duration: 180 },
      { x: 980,  text: 'Three blocks from home.',         duration: 200 },
      { x: 1220, text: 'He came from the left.',          duration: 200 },
      { x: 1460, text: 'You weren\'t looking for a fight.', duration: 220 },
    ],
    preText: null, postText: null,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 1 — PLAY: "No Name"
  // The alley. The robbery. It begins.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 1, type: 'play',
    title: 'ACT I', subtitle: 'No Name',
    width: 1400, background: 'alley',
    axiomStart: { x: 120, y: 406 },
    platforms: [
      { x: 0,    y: 460, w: 1400, h: 80 },
      { x: 320,  y: 400, w: 90,  h: 20 },
      { x: 700,  y: 400, w: 80,  h: 20 },
      { x: 1000, y: 380, w: 120, h: 30 },
    ],
    enemies: [
      { type: 'mugger', x: 900,  y: 408 },
      { type: 'mugger', x: 1100, y: 408 },
    ],
    companionNames: [],
    companionStarts: [],
    weaponPickups:  [],
    preText: null,
    postText: [
      { text: 'You didn\'t take back what he stole.' },
      { text: 'You stopped when he stopped moving.' },
      { text: 'You walked home.',                    pause: 2800 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 2 — INTERLUDE: "Word Spreads"
  // Anders finds him the next evening. They walk.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 2, type: 'interlude',
    title: 'ACT I', subtitle: 'Word Spreads',
    width: 1800, background: 'street',
    axiomStart:      { x: 80, y: 386 },
    platforms:       [{ x: 0, y: 440, w: 1800, h: 80 }],
    enemies:         [],
    companionNames:  ['anders'],
    companionStarts: [{ name: 'anders', x: 680, y: 390 }],
    weaponPickups:   [],
    endTriggerX: 1680,
    dialogues: [
      { x: 480, speaker: 'anders', text: 'I heard about the alley.',          duration: 230 },
      { x: 640, speaker: 'axiom',  text: '...',                               duration: 150 },
      { x: 760, speaker: 'anders', text: 'That\'s all I needed to know.',     duration: 230 },
      { x: 980, speaker: 'anders', text: 'There are people like you. More than you think.', duration: 260 },
      { x: 1160, speaker: 'axiom', text: 'Why does that matter?',             duration: 220 },
      { x: 1340, speaker: 'anders', text: 'Walk with me. I\'ll show you.',    duration: 240 },
    ],
    preText: null, postText: null,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 3 — PLAY: "The District"
  // Five thugs running a protection racket. Axiom and Anders together.
  // Anders picks up the chain Axiom left in the alley.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 3, type: 'play',
    title: 'ACT I', subtitle: 'The District',
    width: 2600, background: 'street',
    axiomStart: { x: 100, y: 386 },
    platforms: [
      { x: 0,    y: 440, w: 2600, h: 80 },
      { x: 280,  y: 380, w: 100, h: 18 },
      { x: 580,  y: 380, w: 100, h: 18 },
      { x: 900,  y: 360, w: 120, h: 18 },
      { x: 1200, y: 380, w: 100, h: 18 },
      { x: 1550, y: 370, w: 130, h: 18 },
      { x: 1900, y: 380, w: 100, h: 18 },
      { x: 2200, y: 360, w: 150, h: 18 },
    ],
    enemies: [
      { type: 'thug', x: 700,  y: 388 },
      { type: 'thug', x: 1000, y: 388 },
      { type: 'thug', x: 1400, y: 388 },
      { type: 'thug', x: 1700, y: 388 },
      { type: 'thug', x: 2100, y: 388 },
    ],
    companionNames:  ['anders'],
    companionStarts: [{ name: 'anders', x: 180, y: 390 }],
    weaponPickups: [
      { x: 580, y: 360, type: 'chain', durability: 15, label: 'CHAIN' },
    ],
    preText: null,
    postText: [
      { text: 'Anders: "They\'ll send more."' },
      { text: 'You said nothing.' },
      { text: 'He understood.',  pause: 2600 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 4 — INTERLUDE: "She Was There First"
  // They walk to the market. Seraph joins mid-walk.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 4, type: 'interlude',
    title: 'ACT I', subtitle: 'She Was There First',
    width: 1800, background: 'market',
    axiomStart:      { x: 80, y: 348 },
    platforms:       [{ x: 0, y: 400, w: 1800, h: 80 }],
    enemies:         [],
    companionNames:  ['anders', 'seraph'],
    companionStarts: [
      { name: 'anders', x: 200,  y: 350 },
      { name: 'seraph', x: 1100, y: 350 },
    ],
    weaponPickups: [],
    endTriggerX: 1680,
    dialogues: [
      { x: 300,  speaker: 'anders', text: 'Seraph\'s been here longer than us.',            duration: 250 },
      { x: 530,  speaker: 'anders', text: 'She was giving things away before we were fighting for them.', duration: 270 },
      { x: 820,  speaker: 'seraph', text: 'You didn\'t have to come.',                      duration: 230 },
      { x: 1000, speaker: 'anders', text: 'Yes we did.',                                    duration: 190 },
      { x: 1180, speaker: 'seraph', text: 'I don\'t know how to fight.',                    duration: 240 },
      { x: 1380, speaker: 'axiom',  text: 'You don\'t have to.',                            duration: 220 },
    ],
    preText: null, postText: null,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 5 — PLAY: "Made to Give"
  // Enforcers shaking down the market. All three together.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 5, type: 'play',
    title: 'ACT I', subtitle: 'Made to Give',
    width: 2200, background: 'market',
    axiomStart: { x: 100, y: 346 },
    platforms: [
      { x: 0,    y: 400, w: 2200, h: 80 },
      { x: 200,  y: 340, w: 80,  h: 16 },
      { x: 500,  y: 320, w: 100, h: 16 },
      { x: 780,  y: 340, w: 90,  h: 16 },
      { x: 1050, y: 310, w: 110, h: 16 },
      { x: 1350, y: 340, w: 100, h: 16 },
      { x: 1650, y: 320, w: 120, h: 16 },
      { x: 1950, y: 340, w: 90,  h: 16 },
    ],
    enemies: [
      { type: 'enforcer', x: 600,  y: 348 },
      { type: 'thug',     x: 800,  y: 348 },
      { type: 'enforcer', x: 1100, y: 348 },
      { type: 'thug',     x: 1300, y: 348 },
      { type: 'enforcer', x: 1600, y: 348 },
      { type: 'thug',     x: 1900, y: 348 },
    ],
    companionNames:  ['anders', 'seraph'],
    companionStarts: [
      { name: 'anders', x: 180, y: 350 },
      { name: 'seraph', x: 240, y: 350 },
    ],
    weaponPickups: [],
    preText: null,
    postText: [
      { text: 'Seraph: "You didn\'t have to do that."' },
      { text: 'Anders: "Yes we did."',  pause: 2600 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 6 — INTERLUDE: "The One Who Goes First"
  // VAEL is already ahead. The others catch up.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 6, type: 'interlude',
    title: 'ACT II', subtitle: 'The One Who Goes First',
    width: 1800, background: 'warehouse',
    axiomStart:      { x: 80, y: 328 },
    platforms:       [{ x: 0, y: 380, w: 1800, h: 80 }],
    enemies:         [],
    companionNames:  ['anders', 'seraph', 'vael'],
    companionStarts: [
      { name: 'anders', x: 200,  y: 330 },
      { name: 'seraph', x: 280,  y: 330 },
      { name: 'vael',   x: 900,  y: 330 },
    ],
    weaponPickups: [],
    endTriggerX: 1680,
    dialogues: [
      { x: 320,  speaker: 'vael',   text: 'Three blocks north. Something\'s wrong with it.', duration: 250 },
      { x: 530,  speaker: 'anders', text: 'VAEL. Slow down.',                                duration: 200 },
      { x: 660,  speaker: 'vael',   text: 'I\'ll go ahead.',                                 duration: 200 },
      { x: 840,  speaker: 'anders', text: 'That\'s what you always say.',                    duration: 230 },
      { x: 1040, speaker: 'vael',   text: 'And I\'m always right.',                          duration: 200 },
      { x: 1260, speaker: 'seraph', text: 'He\'s not wrong.',                                duration: 210 },
      { x: 1460, speaker: 'anders', text: '...no. He\'s not.',                               duration: 220 },
    ],
    preText: null, postText: null,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 7 — PLAY: "First Through Every Door"
  // Warehouse. VAEL already inside. Lieutenant at the end.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 7, type: 'play',
    title: 'ACT II', subtitle: 'First Through Every Door',
    width: 2400, background: 'warehouse',
    axiomStart: { x: 100, y: 326 },
    platforms: [
      { x: 0,    y: 380, w: 2400, h: 80 },
      { x: 150,  y: 290, w: 200, h: 16 },
      { x: 550,  y: 270, w: 180, h: 16 },
      { x: 850,  y: 290, w: 160, h: 16 },
      { x: 1150, y: 260, w: 200, h: 16 },
      { x: 1480, y: 280, w: 180, h: 16 },
      { x: 1780, y: 260, w: 200, h: 16 },
      { x: 2100, y: 280, w: 180, h: 16 },
    ],
    enemies: [
      { type: 'enforcer',   x: 400,  y: 328 },
      { type: 'thug',       x: 650,  y: 328 },
      { type: 'enforcer',   x: 950,  y: 328 },
      { type: 'thug',       x: 1200, y: 328 },
      { type: 'enforcer',   x: 1500, y: 328 },
      { type: 'thug',       x: 1750, y: 328 },
      { type: 'enforcer',   x: 2000, y: 328 },
      { type: 'lieutenant', x: 2250, y: 322 },
    ],
    companionNames:  ['anders', 'seraph', 'vael'],
    companionStarts: [
      { name: 'anders', x: 170, y: 330 },
      { name: 'seraph', x: 230, y: 330 },
      { name: 'vael',   x: 2150, y: 330 },
    ],
    weaponPickups: [
      { x: 1820, y: 240, type: 'sword', durability: 9, label: 'SWORD' },
    ],
    preText: null,
    postText: [
      { text: '"There\'s something wrong with the walls in there."' },
      { text: '"Like they\'re not fully real."',  pause: 2600 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 8 — INTERLUDE: "The Crack"
  // They walk away from the warehouse. The fracture is the subject.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 8, type: 'interlude',
    title: 'ACT II', subtitle: 'The Crack',
    width: 1900, background: 'plaza',
    axiomStart:      { x: 80, y: 386 },
    platforms:       [{ x: 0, y: 440, w: 1900, h: 80 }],
    enemies:         [],
    companionNames:  ['anders', 'seraph', 'vael'],
    companionStarts: [
      { name: 'anders', x: 200, y: 390 },
      { name: 'seraph', x: 290, y: 390 },
      { name: 'vael',   x: 140, y: 390 },
    ],
    weaponPickups: [],
    endTriggerX: 1760,
    dialogues: [
      { x: 200,  speaker: 'vael',   text: 'The walls in there. Did you feel it?',            duration: 240 },
      { x: 430,  speaker: 'anders', text: 'Like they were made of something that wanted to be nothing.', duration: 280 },
      { x: 680,  speaker: 'seraph', text: 'A fracture. In the dimensional layer.',           duration: 250 },
      { x: 900,  speaker: 'axiom',  text: 'You know what that is?',                          duration: 220 },
      { x: 1070, speaker: 'seraph', text: 'I\'ve read about it. I didn\'t think it was real.', duration: 250 },
      { x: 1280, speaker: 'anders', text: 'What\'s on the other side?',                      duration: 230 },
      { x: 1480, speaker: 'seraph', text: 'Something that doesn\'t want us to find out.',    duration: 260 },
      { x: 1650, speaker: 'vael',   text: 'Good.',                                           duration: 180 },
    ],
    preText: null, postText: null,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 9 — PLAY: "Something Breaks Through"
  // City plaza. Thugs, then Dimensional Scouts from the rift.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 9, type: 'play',
    title: 'ACT III', subtitle: 'Something Breaks Through',
    width: 3000, background: 'plaza',
    axiomStart: { x: 100, y: 386 },
    platforms: [
      { x: 0,    y: 440, w: 3000, h: 80 },
      { x: 300,  y: 380, w: 120, h: 18 },
      { x: 650,  y: 360, w: 140, h: 18 },
      { x: 1000, y: 350, w: 120, h: 18 },
      { x: 1350, y: 370, w: 130, h: 18 },
      { x: 1700, y: 350, w: 150, h: 18 },
      { x: 2050, y: 360, w: 120, h: 18 },
      { x: 2400, y: 350, w: 140, h: 18 },
      { x: 2720, y: 370, w: 160, h: 18 },
    ],
    enemies: [
      { type: 'thug',     x: 500,  y: 388 },
      { type: 'enforcer', x: 700,  y: 388 },
      { type: 'thug',     x: 900,  y: 388 },
      { type: 'scout',    x: 1400, y: 388 },
      { type: 'scout',    x: 1650, y: 388 },
      { type: 'scout',    x: 1900, y: 388 },
      { type: 'thug',     x: 2200, y: 388 },
      { type: 'scout',    x: 2500, y: 388 },
      { type: 'scout',    x: 2750, y: 388 },
    ],
    companionNames:  ['anders', 'seraph', 'vael'],
    companionStarts: [
      { name: 'anders', x: 170, y: 390 },
      { name: 'seraph', x: 240, y: 390 },
      { name: 'vael',   x: 300, y: 390 },
    ],
    weaponPickups: [],
    preText: null,
    postText: [
      { text: 'The crack in the air didn\'t close.' },
      { text: 'VAEL: "I want to go through."',  pause: 2800 },
      { text: 'Nobody disagreed.',              pause: 3000 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 10 — INTERLUDE: "The Night Before"
  // Near the fracture. No enemies. Last real conversation.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 10, type: 'interlude',
    title: 'ACT III', subtitle: 'The Night Before',
    width: 1900, background: 'portal',
    axiomStart:      { x: 80, y: 376 },
    platforms:       [{ x: 0, y: 430, w: 1900, h: 80 }],
    enemies:         [],
    companionNames:  ['anders', 'seraph', 'vael'],
    companionStarts: [
      { name: 'anders', x: 900,  y: 380 },
      { name: 'seraph', x: 1020, y: 380 },
      { name: 'vael',   x: 800,  y: 380 },
    ],
    weaponPickups: [],
    endTriggerX: 1780,
    dialogues: [
      { x: 180,  text: 'The fracture was larger than yesterday.',   duration: 240 },
      { x: 380,  text: 'Nobody said anything about it.',            duration: 220 },
      { x: 620,  speaker: 'vael',   text: 'I want to go through.',  duration: 210 },
      { x: 780,  speaker: 'anders', text: 'We know.',               duration: 180 },
      { x: 920,  speaker: 'seraph', text: 'Whatever\'s on the other side —', duration: 220 },
      { x: 1060, speaker: 'seraph', text: 'it needs what we have.',  duration: 220 },
      { x: 1210, speaker: 'anders', text: 'Or we have what it needs.', duration: 230 },
      { x: 1380, text: 'You didn\'t sleep.',                        duration: 200 },
      { x: 1540, speaker: 'axiom',  text: '...',                    duration: 200 },
      { x: 1660, text: 'None of you did.',                          duration: 250 },
    ],
    preText: null, postText: null,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 11 — PLAY: "The Step"
  // Last fight. Then the portal. Then nothing.
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 11, type: 'play',
    title: 'ACT III', subtitle: 'The Step',
    width: 1800, background: 'portal',
    axiomStart: { x: 100, y: 376 },
    platforms: [
      { x: 0,    y: 430, w: 1800, h: 80 },
      { x: 250,  y: 370, w: 110, h: 18 },
      { x: 550,  y: 350, w: 130, h: 18 },
      { x: 900,  y: 340, w: 150, h: 18 },
      { x: 1250, y: 350, w: 130, h: 18 },
      { x: 1550, y: 360, w: 120, h: 18 },
    ],
    enemies: [
      { type: 'scout', x: 400,  y: 378 },
      { type: 'scout', x: 650,  y: 378 },
      { type: 'scout', x: 850,  y: 378 },
      { type: 'scout', x: 1100, y: 378 },
      { type: 'scout', x: 1350, y: 378 },
      { type: 'scout', x: 1600, y: 378 },
    ],
    companionNames:  ['anders', 'seraph', 'vael'],
    companionStarts: [
      { name: 'anders', x: 170, y: 380 },
      { name: 'seraph', x: 240, y: 380 },
      { name: 'vael',   x: 300, y: 380 },
    ],
    weaponPickups: [],
    preText: [
      { text: 'They came through the night before you did.' },
      { text: 'You fought them back.',                        pause: 2400 },
      { text: 'Then you stood at the edge.',                  pause: 2600 },
      { text: 'Anders: "I trust you."',                       pause: 2800 },
      { text: 'VAEL: "I should go first."',                   pause: 2400 },
      { text: 'You shook your head.',                         pause: 2600 },
    ],
    postText:  null,
    isEnding:  true,
  },
];

// ─── Chapter loader ───────────────────────────────────────────────────────────
function loadChapter(idx) {
  const ch = CHAPTERS[idx];
  if (!ch) return;

  levelWidth    = ch.width;
  platforms     = [...ch.platforms];
  enemies       = (ch.enemies ?? []).map(e => createEnemy(e.type, e.x, e.y));
  weaponPickups = (ch.weaponPickups ?? []).map(
    w => new WeaponPickup(w.x, w.y, w.type, w.durability, w.label)
  );

  axiomPlayer = new Axiom(ch.axiomStart.x, ch.axiomStart.y);

  companions = [];
  for (const cs of (ch.companionStarts ?? [])) {
    companions.push(createCompanion(cs.name, cs.x, cs.y));
  }

  resetCamera();
}
