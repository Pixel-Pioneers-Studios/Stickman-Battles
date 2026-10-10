// Weapon defs in the ornate style (see parts-ornate.js). Rendered with
//   node tools/weapon-sprites/render.js --ornate [key ...]
// Each def: { gripX, len?, svg }. gripX and len match defs-grim.js so the hand
// position and the in-game size of every weapon stay where they were.

const { AXIS: A, INK, C, path, facet, line, rect, circ, ell, pole, ring, gem, orb, wrap, spike, crescent, crystal } = require('./parts-ornate');

const DEFS = {

  // Knightly sword: sapphire-and-gold hilt, winged guard, bright two-tone blade.
  sword: {
    gripX: 118,
    svg: `
      ${crystal(34, 76, 34, C.blue, C.blueL)}
      ${ring(72, 12, 28)}
      ${wrap(82, 152, 20, C.blueD, C.gold, 15)}
      ${path(`M 150 ${A - 16} L 162 ${A - 62} L 192 ${A - 74} L 178 ${A - 46} L 184 ${A - 14}
              L 184 ${A + 14} L 178 ${A + 46} L 192 ${A + 74} L 162 ${A + 62} L 150 ${A + 16} Z`, C.gold)}
      ${line(`M 158 ${A - 14} L 167 ${A - 56}`, C.goldL, 4)}
      ${gem(167, A, 12, C.blue, C.blueL)}
      ${path(`M 184 ${A - 24} L 430 ${A - 20} L 504 ${A} L 430 ${A + 20} L 184 ${A + 24} Z`, C.steel)}
      ${facet(`M 187 ${A - 21} L 429 ${A - 17} L 494 ${A - 1} L 187 ${A - 1} Z`, C.steelL)}
      ${line(`M 198 ${A} L 410 ${A}`, C.steelD, 5)}
      ${line(`M 198 ${A - 3} L 410 ${A - 3}`, '#ffffff', 2, 0.8)}
      ${path(`M 190 ${A - 12} L 214 ${A} L 190 ${A + 12} Z`, C.gold, 3)}`,
  },

  // Katana: crimson wrap, gold tsuba, pale blade with a bright temper line.
  katana: {
    gripX: 112,
    svg: `
      ${line(`M 62 ${A + 6} Q 46 ${A + 30} 56 ${A + 54}`, INK, 9)}
      ${line(`M 62 ${A + 6} Q 46 ${A + 30} 56 ${A + 54}`, C.red, 5)}
      ${path(`M 50 ${A + 50} L 62 ${A + 50} L 66 ${A + 78} L 46 ${A + 78} Z`, C.red, 3)}
      ${ring(56, 14, 26)}
      ${wrap(68, 158, 22, C.black, C.red, 15)}
      ${ell(166, A, 9, 36, C.gold)}
      ${line(`M 163 ${A - 26} L 163 ${A + 10}`, C.goldL, 3)}
      ${rect(174, A - 13, 16, 26, C.gold, 2)}
      ${path(`M 188 ${A - 12} Q 340 ${A - 30} 504 ${A - 58} Q 478 ${A - 20} 440 ${A - 2}
              Q 320 ${A + 10} 188 ${A + 12} Z`, C.steelL)}
      ${facet(`M 190 ${A - 10} Q 340 ${A - 28} 496 ${A - 54} Q 480 ${A - 38} 462 ${A - 28}
               Q 330 ${A - 10} 190 ${A - 2} Z`, C.steel)}
      ${line(`M 196 ${A + 6} Q 250 ${A - 2} 292 ${A + 3} Q 340 ${A - 4} 388 ${A - 9} Q 424 ${A - 13} 452 ${A - 22}`, '#ffffff', 4)}
      ${line(`M 192 ${A - 4} Q 330 ${A - 20} 470 ${A - 42}`, C.steelD, 2.4, 0.8)}`,
  },

  // War hammer: banded steel head with an ember rune, spurs top and bottom.
  hammer: {
    gripX: 96,
    svg: `
      ${crescent(18, 20, C.gold, C.orange)}
      ${wrap(42, 170, 20, C.woodD, C.gold, 18)}
      ${pole(168, 352, 14, C.black, C.ironL)}
      ${ring(196, 12, 24)}
      ${ring(336, 26, 36)}
      ${gem(349, A, 9, C.orange, C.orangeL)}
      ${spike(430, A - 60, 430, A - 104, 28, C.gold)}
      ${spike(430, A + 60, 430, A + 104, 28, C.gold)}
      ${path(`M 362 ${A - 54} L 388 ${A - 66} L 474 ${A - 66} L 500 ${A - 52} L 500 ${A + 52}
              L 474 ${A + 66} L 388 ${A + 66} L 362 ${A + 54} Z`, C.steel)}
      ${facet(`M 366 ${A - 52} L 389 ${A - 63} L 473 ${A - 63} L 496 ${A - 51} L 496 ${A - 26} L 366 ${A - 26} Z`, C.steelL)}
      ${facet(`M 366 ${A + 30} L 496 ${A + 30} L 496 ${A + 51} L 473 ${A + 63} L 389 ${A + 63} L 366 ${A + 52} Z`, C.steelD)}
      ${rect(376, A - 67, 16, 134, C.gold, 3)}
      ${rect(470, A - 67, 16, 134, C.gold, 3)}
      ${gem(431, A, 22, C.orange, C.orangeL)}`,
  },

  // Winged spear: leaf blade of pale steel, gold lugs, a red tassel at the socket.
  spear: {
    gripX: 150,
    svg: `
      ${spike(26, A, 4, A, 16, C.gold)}
      ${pole(24, 392, 11, C.wood, C.woodL)}
      ${ring(112, 10, 20)}
      ${wrap(122, 196, 16, C.red, C.gold, 14)}
      ${ring(196, 10, 20)}
      ${path(`M 384 ${A + 6} Q 372 ${A + 34} 388 ${A + 62} Q 404 ${A + 36} 398 ${A + 6} Z`, C.red, 3)}
      ${line(`M 388 ${A + 16} L 388 ${A + 46}`, C.redL, 3)}
      ${ring(380, 26, 26)}
      ${path(`M 404 ${A - 8} L 396 ${A - 44} L 430 ${A - 16} Z`, C.gold, 3)}
      ${path(`M 404 ${A + 8} L 396 ${A + 44} L 430 ${A + 16} Z`, C.gold, 3)}
      ${path(`M 404 ${A - 10} Q 440 ${A - 34} 462 ${A - 22} L 506 ${A} L 462 ${A + 22}
              Q 440 ${A + 34} 404 ${A + 10} Z`, C.steel)}
      ${facet(`M 408 ${A - 9} Q 440 ${A - 30} 461 ${A - 19} L 498 ${A - 1} L 408 ${A - 1} Z`, C.steelL)}
      ${line(`M 412 ${A} L 486 ${A}`, C.steelD, 3)}`,
  },

  // Flintlock: brass frame and bands on a dark barrel, carved red-wood grip.
  gun: {
    gripX: 128,
    svg: `
      ${path(`M 104 ${A - 4} L 168 ${A - 4} L 160 ${A + 30} Q 150 ${A + 62} 132 ${A + 84}
              L 92 ${A + 84} Q 104 ${A + 50} 104 ${A + 20} Z`, C.wood)}
      ${facet(`M 110 ${A + 2} L 128 ${A + 2} L 120 ${A + 50} L 104 ${A + 78} L 98 ${A + 78} Q 110 ${A + 48} 110 ${A + 20} Z`, C.woodL)}
      ${path(`M 88 ${A + 76} L 138 ${A + 76} L 134 ${A + 96} L 84 ${A + 96} Z`, C.gold, 3)}
      ${gem(132, A + 36, 9, C.red, C.redL)}
      ${line(`M 176 ${A + 14} Q 200 ${A + 52} 232 ${A + 16}`, INK, 10)}
      ${line(`M 176 ${A + 14} Q 200 ${A + 52} 232 ${A + 16}`, C.gold, 5)}
      ${rect(204, A - 28, 300, 30, C.iron, 5)}
      ${line(`M 212 ${A - 21} L 494 ${A - 21}`, C.ironL, 5)}
      ${path(`M 96 ${A - 34} L 250 ${A - 34} L 262 ${A - 16} L 262 ${A + 12} L 96 ${A + 12} Z`, C.gold)}
      ${facet(`M 100 ${A - 30} L 248 ${A - 30} L 254 ${A - 20} L 100 ${A - 20} Z`, C.goldL)}
      ${path(`M 150 ${A - 34} Q 150 ${A - 62} 178 ${A - 56} L 172 ${A - 34} Z`, C.iron, 3)}
      ${circ(200, A - 10, 10, C.goldD, 3)}
      ${rect(330, A - 32, 16, 38, C.gold, 3)}
      ${rect(470, A - 34, 24, 42, C.gold, 4)}
      ${rect(494, A - 26, 12, 26, C.black, 3)}`,
  },

  // Morning star: violet-steel ball ringed with gold spikes on a linked chain.
  flail: {
    gripX: 92,
    svg: (() => {
      let chain = '';
      for (let i = 0; i < 6; i++) {
        const x = 204 + i * 28, flat = i % 2 === 0;
        chain += ell(x, A + Math.sin(i * 0.9) * 3, flat ? 17 : 9, flat ? 9 : 14, 'none', 7).replace(INK, INK) +
                 `<ellipse cx="${x}" cy="${A + Math.sin(i * 0.9) * 3}" rx="${flat ? 17 : 9}" ry="${flat ? 9 : 14}" fill="none" stroke="${C.steel}" stroke-width="3.5"/>`;
      }
      let spikes = '';
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4 + 0.2, r0 = 42, r1 = 76;
        spikes += spike(432 + Math.cos(a) * r0, A + Math.sin(a) * r0, 432 + Math.cos(a) * r1, A + Math.sin(a) * r1, 24, C.gold);
      }
      return `
        ${orb(22, A, 16, C.violet, C.violetL)}
        ${wrap(36, 168, 22, C.black, C.violet, 16)}
        ${ring(164, 18, 32)}
        ${chain}
        ${spikes}
        ${circ(432, A, 50, C.violet)}
        ${facet(`M 392 ${A - 8} A 42 42 0 0 1 444 ${A - 44} A 60 60 0 0 0 392 ${A - 8} Z`, C.violetL)}
        ${facet(`M 472 ${A + 12} A 42 42 0 0 1 424 ${A + 44} A 62 62 0 0 0 472 ${A + 12} Z`, C.violetD)}
        ${circ(432, A, 13, C.gold, 3)}`;
    })(),
  },

  // Recurve bow: emerald limbs tipped in gold, a gem set in the grip.
  bow: {
    gripX: 250, len: 20,
    svg: `
      ${line(`M 238 6 L 238 214`, INK, 5)}
      ${line(`M 238 6 L 238 214`, '#f4f0e0', 2.2)}
      ${path(`M 240 4 Q 232 14 246 26 Q 300 60 262 ${A - 14} L 246 ${A - 14} Q 280 62 236 30 Q 222 16 240 4 Z`, C.green)}
      ${path(`M 240 216 Q 232 206 246 194 Q 300 160 262 ${A + 14} L 246 ${A + 14} Q 280 158 236 190 Q 222 204 240 216 Z`, C.green)}
      ${line(`M 252 36 Q 284 62 262 ${A - 22}`, C.greenL, 3)}
      ${line(`M 252 184 Q 284 158 262 ${A + 22}`, C.greenD, 3)}
      ${path(`M 228 2 L 252 2 L 248 22 L 232 22 Z`, C.gold, 3)}
      ${path(`M 228 218 L 252 218 L 248 198 L 232 198 Z`, C.gold, 3)}
      ${rect(240, A - 22, 26, 44, C.gold, 6)}
      ${gem(253, A, 9, C.red, C.redL)}`,
  },

  // Heater shield: blue field, gold rim and boss, a white chevron.
  shield: {
    gripX: 76, len: 34,
    svg: `
      ${path(`M 66 6 L 150 4 Q 206 60 204 ${A} Q 204 164 150 216 L 66 214 Q 56 ${A} 66 6 Z`, C.gold)}
      ${path(`M 80 22 L 142 20 Q 186 66 185 ${A} Q 185 156 142 200 L 80 198 Q 72 ${A} 80 22 Z`, C.blue, 3)}
      ${facet(`M 84 26 L 140 24 Q 168 54 178 92 L 84 92 Z`, C.blueL, 0.55)}
      ${path(`M 82 ${A + 34} L 132 ${A + 2} L 182 ${A + 22} L 178 ${A + 44} L 132 ${A + 26} L 84 ${A + 58} Z`, '#f4f6ff', 3)}
      ${circ(132, A - 28, 26, C.gold)}
      ${gem(132, A - 28, 13, C.red, C.redL)}
      ${circ(92, 34, 5, C.goldL, 2)} ${circ(92, 186, 5, C.goldL, 2)} ${circ(168, A, 5, C.goldL, 2)}`,
  },

  // Copper skillet: bright pan, riveted black handle with a brass hanging ring.
  fryingpan: {
    gripX: 84,
    svg: `
      ${circ(26, A, 16, 'none', 9)}
      ${`<circle cx="26" cy="${A}" r="16" fill="none" stroke="${C.gold}" stroke-width="4.5"/>`}
      ${rect(40, A - 12, 252, 24, C.black, 8)}
      ${line(`M 50 ${A - 5} L 282 ${A - 5}`, C.ironL, 4)}
      ${circ(70, A, 6, C.gold, 2.5)} ${circ(150, A, 6, C.gold, 2.5)} ${circ(230, A, 6, C.gold, 2.5)}
      ${rect(278, A - 20, 30, 40, C.gold, 5)}
      ${circ(402, A, 102, C.orange)}
      ${circ(402, A, 82, '#7a3410', 3)}
      ${facet(`M 336 ${A - 22} A 70 70 0 0 1 402 ${A - 70} A 96 96 0 0 0 336 ${A - 22} Z`, C.orangeL, 0.9)}
      ${ell(388, A - 14, 30, 22, '#a04a18', 0)}`,
  },

  // Witch's broom: gold-banded pole, straw bound with red cord, a hanging star.
  broomstick: {
    gripX: 110,
    svg: (() => {
      let straw = '';
      for (let i = 0; i < 7; i++) {
        const y = A - 42 + i * 14;
        straw += line(`M 372 ${A + (y - A) * 0.3} L 500 ${y}`, C.goldD, 2.6, 0.9);
      }
      return `
        ${orb(18, A, 12, C.violet, C.violetL)}
        ${pole(26, 356, 12, C.wood, C.woodL)}
        ${ring(84, 10, 20)} ${ring(150, 10, 20)}
        ${path(`M 356 ${A - 14} L 388 ${A - 20} L 506 ${A - 52} L 500 ${A - 14} L 508 ${A + 16} L 498 ${A + 54}
                L 388 ${A + 20} L 356 ${A + 14} Z`, C.gold)}
        ${facet(`M 388 ${A - 17} L 500 ${A - 47} L 497 ${A - 16} L 388 ${A - 2} Z`, C.goldL)}
        ${straw}
        ${rect(350, A - 18, 16, 36, C.gold, 3)}
        ${rect(380, A - 24, 14, 48, C.red, 3)}
        ${line(`M 388 ${A + 24} L 384 ${A + 50}`, INK, 3)}
        ${path(`M 384 ${A + 46} l 5 10 l 11 1 l -8 8 l 2 11 l -10 -6 l -10 6 l 2 -11 l -8 -8 l 11 -1 Z`, C.goldL, 2.5)}`;
    })(),
  },

  // Braided whip: ringed handle with a ruby pommel, a gold barb at the tip.
  whip: {
    gripX: 96,
    svg: (() => {
      const lash = `M 150 ${A} C 220 ${A + 4} 250 ${A + 44} 310 ${A + 30} S 400 ${A - 40} 492 ${A - 44}`;
      return `
        ${gem(22, A, 16, C.red, C.redL)}
        ${wrap(34, 148, 24, C.black, C.orange, 15)}
        ${ring(34, 12, 32)} ${ring(140, 14, 34)}
        ${line(lash, INK, 17)}
        ${line(lash, C.wood, 10)}
        ${`<path d="${lash}" fill="none" stroke="${C.woodL}" stroke-width="4" stroke-dasharray="9 9" stroke-linecap="round"/>`}
        ${path(`M 484 ${A - 56} L 510 ${A - 46} L 486 ${A - 32} Z`, C.gold, 3)}`;
    })(),
  },

  // Carved boomerang: warm wood, turquoise inlay bands, gold tips.
  boomerang: {
    gripX: 150, len: 46,
    svg: `
      ${path(`M 150 ${A} Q 156 ${A - 14} 180 ${A - 22} L 470 ${A - 98} Q 500 ${A - 102} 492 ${A - 84}
              L 250 ${A - 4} L 250 ${A + 4} L 492 ${A + 84} Q 500 ${A + 102} 470 ${A + 98}
              L 180 ${A + 22} Q 156 ${A + 14} 150 ${A} Z`, C.woodL)}
      ${facet(`M 182 ${A - 19} L 468 ${A - 94} L 480 ${A - 90} L 230 ${A - 8} Z`, '#e8a860')}
      ${facet(`M 182 ${A + 19} L 468 ${A + 94} L 486 ${A + 86} L 250 ${A + 8} Z`, C.wood)}
      ${path(`M 300 ${A - 55} L 322 ${A - 61} L 330 ${A - 31} L 308 ${A - 24} Z`, C.teal, 3)}
      ${path(`M 380 ${A - 76} L 402 ${A - 82} L 410 ${A - 57} L 388 ${A - 50} Z`, C.teal, 3)}
      ${path(`M 300 ${A + 55} L 322 ${A + 61} L 330 ${A + 31} L 308 ${A + 24} Z`, C.teal, 3)}
      ${path(`M 380 ${A + 76} L 402 ${A + 82} L 410 ${A + 57} L 388 ${A + 50} Z`, C.teal, 3)}
      ${path(`M 452 ${A - 95} L 470 ${A - 99} Q 502 ${A - 104} 492 ${A - 84} L 464 ${A - 74} Z`, C.gold, 3)}
      ${path(`M 452 ${A + 95} L 470 ${A + 99} Q 502 ${A + 104} 492 ${A + 84} L 464 ${A + 74} Z`, C.gold, 3)}
      ${gem(190, A, 13, C.teal, C.tealL)}`,
  },

  // Slingshot: gold-capped fork, red bands, a studded pouch.
  slingshot: {
    gripX: 96,
    svg: `
      ${orb(22, A, 14, C.gold, C.goldL)}
      ${wrap(32, 190, 24, C.woodD, C.red, 17)}
      ${line(`M 318 ${A - 92} Q 500 ${A - 70} 496 ${A} Q 500 ${A + 70} 318 ${A + 92}`, INK, 13)}
      ${line(`M 318 ${A - 92} Q 500 ${A - 70} 496 ${A} Q 500 ${A + 70} 318 ${A + 92}`, C.red, 7)}
      ${path(`M 186 ${A - 13} L 230 ${A - 13} Q 262 ${A - 30} 296 ${A - 96} L 322 ${A - 88} Q 300 ${A - 22} 252 ${A}
              Q 300 ${A + 22} 322 ${A + 88} L 296 ${A + 96} Q 262 ${A + 30} 230 ${A + 13} L 186 ${A + 13} Z`, C.woodL)}
      ${facet(`M 190 ${A - 10} L 232 ${A - 10} Q 266 ${A - 28} 298 ${A - 90} L 306 ${A - 88} Q 274 ${A - 22} 236 ${A - 2} L 190 ${A - 2} Z`, '#e8a860')}
      ${path(`M 288 ${A - 104} L 328 ${A - 94} L 322 ${A - 76} L 284 ${A - 86} Z`, C.gold, 3)}
      ${path(`M 288 ${A + 104} L 328 ${A + 94} L 322 ${A + 76} L 284 ${A + 86} Z`, C.gold, 3)}
      ${rect(476, A - 22, 28, 44, C.wood, 6)}
      ${circ(490, A, 6, C.gold, 2.5)}
      ${ring(182, 14, 34)}`,
  },

  // Paper dart: crisp white with blue fold shadows and a red nose stripe.
  paperairplane: {
    gripX: 120,
    svg: `
      ${path(`M 20 ${A - 44} L 506 ${A} L 20 ${A + 44} L 110 ${A} Z`, '#ffffff')}
      ${path(`M 110 ${A} L 506 ${A} L 150 ${A + 62} L 176 ${A + 8} Z`, C.blueL, 3)}
      ${facet(`M 24 ${A + 40} L 110 ${A} L 498 ${A + 1} Z`, '#cfdcf4')}
      ${line(`M 110 ${A} L 500 ${A}`, C.blue, 3)}
      ${path(`M 400 ${A - 9.5} L 440 ${A - 6} L 440 ${A + 6} L 400 ${A + 9.5} Z`, C.red, 2.5)}
      ${line(`M 60 ${A - 30} L 300 ${A - 12}`, C.blueL, 2.5)}`,
  },

  // Peashooter: leaf-green barrel with gold bands, the plant pot riding on top.
  peashooter: {
    gripX: 110,
    svg: `
      ${wrap(14, 96, 20, C.woodD, C.gold, 15)}
      ${path(`M 150 ${A - 16} L 250 ${A - 16} L 236 ${A - 62} L 164 ${A - 62} Z`, C.orange)}
      ${rect(154, A - 76, 92, 18, C.orangeL, 4)}
      ${path(`M 176 ${A - 76} Q 170 ${A - 106} 200 ${A - 96} Q 204 ${A - 108} 228 ${A - 100} Q 232 ${A - 84} 222 ${A - 76} Z`, C.green, 3)}
      ${rect(92, A - 18, 380, 36, C.green, 10)}
      ${line(`M 104 ${A - 9} L 460 ${A - 9}`, C.greenL, 5)}
      ${facet(`M 100 ${A + 6} L 464 ${A + 6} L 464 ${A + 14} L 100 ${A + 14} Z`, C.greenD, 0.8)}
      ${ring(282, 16, 46)} ${ring(346, 16, 46)}
      ${path(`M 452 ${A - 24} L 496 ${A - 34} Q 510 ${A} 496 ${A + 34} L 452 ${A + 24} Z`, C.greenD)}
      ${ell(492, A, 8, 22, C.black, 3)}
      ${path(`M 118 ${A + 16} Q 150 ${A + 56} 190 ${A + 22} Q 156 ${A + 30} 136 ${A + 16} Z`, C.greenL, 3)}`,
  },

  // Flamethrower: red tank slung under a brass barrel, a live pilot flame.
  flamethrower: {
    gripX: 116,
    svg: `
      ${wrap(14, 92, 20, C.black, C.orange, 15)}
      ${rect(190, A + 18, 190, 46, C.red, 22)}
      ${facet(`M 212 ${A + 24} L 358 ${A + 24} Q 368 ${A + 28} 370 ${A + 34} L 200 ${A + 34} Q 202 ${A + 28} 212 ${A + 24} Z`, C.redL)}
      ${rect(256, A + 14, 16, 54, C.gold, 3)} ${rect(318, A + 14, 16, 54, C.gold, 3)}
      ${rect(84, A - 30, 300, 56, C.gold, 12)}
      ${facet(`M 96 ${A - 24} L 372 ${A - 24} L 372 ${A - 12} L 96 ${A - 12} Z`, C.goldL)}
      ${facet(`M 96 ${A + 10} L 372 ${A + 10} L 372 ${A + 20} L 96 ${A + 20} Z`, C.goldD)}
      ${circ(150, A - 2, 17, C.iron)}
      ${circ(150, A - 2, 7, C.red, 2.5)}
      ${rect(376, A - 20, 100, 36, C.iron, 5)}
      ${line(`M 386 ${A - 12} L 466 ${A - 12}`, C.ironL, 4)}
      ${rect(404, A - 24, 12, 44, C.gold, 3)}
      ${rect(468, A - 28, 26, 52, C.gold, 5)}
      ${path(`M 492 ${A + 14} Q 478 ${A - 4} 494 ${A - 26} Q 500 ${A - 10} 510 ${A - 14} Q 512 ${A + 6} 500 ${A + 16} Z`, C.orange, 2.5)}
      ${facet(`M 495 ${A + 10} Q 488 ${A - 2} 496 ${A - 12} Q 504 ${A} 500 ${A + 11} Z`, C.orangeL)}`,
  },

  // Storm staff: gold coil up a dark pole, twin prongs caging a lightning crystal.
  electricstaff: {
    gripX: 140,
    svg: (() => {
      let coil = '';
      for (let x = 214; x < 356; x += 22) coil += facet(`M ${x} ${A - 7} L ${x + 9} ${A - 7} L ${x + 15} ${A + 7} L ${x + 6} ${A + 7} Z`, C.gold);
      return `
        ${crystal(6, 44, 26, C.teal, C.tealL)}
        ${pole(38, 372, 14, C.black, C.ironL)}
        ${ring(100, 10, 24)}
        ${wrap(110, 196, 18, C.blueD, C.teal, 14)}
        ${ring(196, 10, 24)}
        ${coil}
        ${ring(362, 26, 34)}
        ${path(`M 384 ${A - 12} Q 420 ${A - 30} 440 ${A - 64} Q 462 ${A - 92} 504 ${A - 96}
                Q 478 ${A - 78} 466 ${A - 52} Q 450 ${A - 14} 408 ${A - 4} Z`, C.gold)}
        ${path(`M 384 ${A + 12} Q 420 ${A + 30} 440 ${A + 64} Q 462 ${A + 92} 504 ${A + 96}
                Q 478 ${A + 78} 466 ${A + 52} Q 450 ${A + 14} 408 ${A + 4} Z`, C.gold)}
        ${line(`M 396 ${A - 14} Q 428 ${A - 30} 448 ${A - 64}`, C.goldL, 3.5)}
        ${path(`M 430 ${A} L 462 ${A - 30} L 500 ${A} L 462 ${A + 30} Z`, C.teal)}
        ${facet(`M 438 ${A - 2} L 462 ${A - 25} L 480 ${A - 10} L 458 ${A - 2} Z`, C.tealL)}
        ${line(`M 448 ${A + 2} L 462 ${A - 8} L 460 ${A + 4} L 478 ${A - 4}`, '#ffffff', 3.2)}`;
    })(),
  },

  // Boss gauntlet: amethyst plate over a dark cuff, gold knuckles, a void gem.
  gauntlet: {
    gripX: 278, len: 30,
    svg: `
      ${path(`M 150 ${A - 62} L 232 ${A - 74} L 232 ${A + 74} L 150 ${A + 62} Z`, C.violetD)}
      ${line(`M 176 ${A - 62} L 176 ${A + 62}`, C.gold, 6)} ${line(`M 206 ${A - 68} L 206 ${A + 68}`, C.gold, 6)}
      ${path(`M 228 ${A - 86} Q 290 ${A - 106} 356 ${A - 98} Q 384 ${A - 94} 388 ${A - 72} Q 402 ${A - 30} 394 ${A}
              Q 402 ${A + 30} 388 ${A + 72} Q 384 ${A + 94} 356 ${A + 98} Q 290 ${A + 106} 228 ${A + 86} Z`, C.violet)}
      ${facet(`M 234 ${A - 82} Q 290 ${A - 101} 354 ${A - 93} Q 376 ${A - 90} 381 ${A - 72} L 386 ${A - 46} L 234 ${A - 46} Z`, C.violetL)}
      ${facet(`M 234 ${A + 50} L 386 ${A + 50} L 381 ${A + 72} Q 376 ${A + 90} 354 ${A + 93} Q 290 ${A + 101} 234 ${A + 82} Z`, C.violetD, 0.85)}
      ${circ(388, A - 62, 17, C.gold)} ${circ(398, A - 21, 17, C.gold)} ${circ(398, A + 21, 17, C.gold)} ${circ(388, A + 62, 17, C.gold)}
      ${line(`M 300 ${A + 58} Q 340 ${A + 76} 372 ${A + 48}`, INK, 9)}
      ${circ(300, A - 6, 30, C.gold)}
      ${gem(300, A - 6, 19, '#e040ff', '#ffffff')}`,
  },

  // Knight's gauntlet: polished steel, royal-blue cuff, spiked gold knuckles.
  mkgauntlet: {
    gripX: 276, len: 34,
    svg: `
      ${path(`M 150 ${A - 64} L 236 ${A - 78} L 236 ${A + 78} L 150 ${A + 64} Z`, C.blue)}
      ${facet(`M 154 ${A - 60} L 232 ${A - 73} L 232 ${A - 44} L 154 ${A - 36} Z`, C.blueL)}
      ${rect(144, A - 68, 18, 136, C.gold, 4)}
      ${path(`M 232 ${A - 88} Q 292 ${A - 106} 356 ${A - 98} Q 382 ${A - 94} 386 ${A - 72} Q 398 ${A - 30} 390 ${A}
              Q 398 ${A + 30} 386 ${A + 72} Q 382 ${A + 94} 356 ${A + 98} Q 292 ${A + 106} 232 ${A + 88} Z`, C.steel)}
      ${facet(`M 238 ${A - 84} Q 292 ${A - 101} 354 ${A - 93} Q 374 ${A - 90} 379 ${A - 72} L 384 ${A - 44} L 238 ${A - 44} Z`, C.steelL)}
      ${facet(`M 238 ${A + 50} L 384 ${A + 50} L 379 ${A + 72} Q 374 ${A + 90} 354 ${A + 93} Q 292 ${A + 101} 238 ${A + 84} Z`, C.steelD, 0.85)}
      ${spike(384, A - 62, 420, A - 70, 26, C.gold)} ${spike(392, A - 21, 430, A - 24, 26, C.gold)}
      ${spike(392, A + 21, 430, A + 24, 26, C.gold)} ${spike(384, A + 62, 420, A + 70, 26, C.gold)}
      ${line(`M 300 ${A + 58} Q 340 ${A + 76} 370 ${A + 48}`, INK, 9)}
      ${path(`M 270 ${A - 40} L 330 ${A - 40} L 330 ${A + 4} L 300 ${A + 30} L 270 ${A + 4} Z`, C.gold)}
      ${gem(300, A - 12, 15, C.blue, C.blueL)}`,
  },

  // Null Blade: black serrated blade with a crimson core, bone horns for a guard.
  nullblade: {
    gripX: 116,
    svg: `
      ${spike(44, A, 14, A, 22, '#ece6d6')}
      ${ring(42, 14, 26, '#ece6d6', '#ffffff')}
      ${wrap(54, 150, 20, C.black, C.red, 15)}
      ${path(`M 148 ${A - 14} Q 150 ${A - 50} 196 ${A - 76} Q 178 ${A - 44} 184 ${A - 14}
              L 184 ${A + 14} Q 178 ${A + 44} 196 ${A + 76} Q 150 ${A + 50} 148 ${A + 14} Z`, '#ece6d6')}
      ${gem(166, A, 12, C.red, C.redL)}
      ${path(`M 184 ${A - 24} L 250 ${A - 28} L 262 ${A - 16} L 320 ${A - 26} L 332 ${A - 14} L 392 ${A - 22}
              L 404 ${A - 10} L 450 ${A - 14} L 506 ${A + 2} L 430 ${A + 20} L 184 ${A + 24} Z`, C.black)}
      ${path(`M 196 ${A - 5} L 440 ${A - 2} L 484 ${A + 2} L 440 ${A + 6} L 196 ${A + 7} Z`, C.red, 2.5)}
      ${line(`M 204 ${A} L 440 ${A + 1}`, C.redL, 2.5)}
      ${line(`M 190 ${A + 20} L 428 ${A + 17}`, C.ironL, 2.5)}`,
  },

  // Void Blade: a faceted amethyst blade on a dark crescent guard, gold star set in it.
  voidblade: {
    gripX: 116,
    svg: `
      ${orb(30, A, 15, C.violet, C.violetL)}
      ${wrap(42, 150, 20, C.black, C.violet, 15)}
      ${path(`M 150 ${A - 20} Q 190 ${A - 34} 204 ${A - 70} Q 216 ${A - 30} 192 ${A}
              Q 216 ${A + 30} 204 ${A + 70} Q 190 ${A + 34} 150 ${A + 20} Z`, C.iron)}
      ${path(`M 170 ${A} l 6 -13 l 6 13 l 13 0 l -10 8 l 4 13 l -13 -8 l -13 8 l 4 -13 l -10 -8 Z`, C.gold, 2.5)}
      ${path(`M 196 ${A - 22} L 300 ${A - 30} L 420 ${A - 22} L 506 ${A} L 420 ${A + 22} L 300 ${A + 30} L 196 ${A + 22} Z`, C.violet)}
      ${facet(`M 200 ${A - 19} L 300 ${A - 27} L 318 ${A - 1} L 200 ${A - 1} Z`, C.violetL)}
      ${facet(`M 318 ${A - 1} L 300 ${A - 27} L 419 ${A - 19} L 440 ${A - 1} Z`, '#b47aff')}
      ${facet(`M 200 ${A + 2} L 318 ${A + 2} L 300 ${A + 27} L 200 ${A + 19} Z`, C.violetD)}
      ${facet(`M 440 ${A - 1} L 419 ${A - 19} L 498 ${A - 1} Z`, '#f0deff')}
      ${line(`M 200 ${A} L 498 ${A}`, INK, 2)}
      ${line(`M 300 ${A - 28} L 318 ${A} L 300 ${A + 28}`, INK, 2)}
      ${line(`M 420 ${A - 20} L 440 ${A} L 420 ${A + 20}`, INK, 2)}`,
  },

  // Shock rifle: dark alloy with gold trim, a glowing cell and a forked emitter.
  shockrifle: {
    gripX: 122,
    svg: `
      ${path(`M 96 ${A + 10} L 168 ${A + 10} L 156 ${A + 84} L 104 ${A + 84} Z`, C.iron)}
      ${facet(`M 104 ${A + 16} L 124 ${A + 16} L 118 ${A + 78} L 108 ${A + 78} Z`, C.ironL)}
      ${rect(100, A + 74, 60, 14, C.gold, 3)}
      ${line(`M 178 ${A + 14} Q 204 ${A + 50} 236 ${A + 14}`, INK, 10)}
      ${line(`M 178 ${A + 14} Q 204 ${A + 50} 236 ${A + 14}`, C.gold, 5)}
      ${path(`M 14 ${A - 22} L 80 ${A - 30} L 80 ${A + 14} L 14 ${A + 20} Z`, C.iron)}
      ${rect(8, A - 28, 14, 54, C.gold, 3)}
      ${path(`M 76 ${A - 36} L 420 ${A - 36} L 440 ${A - 22} L 440 ${A + 6} L 420 ${A + 16} L 76 ${A + 16} Z`, C.iron)}
      ${facet(`M 82 ${A - 31} L 418 ${A - 31} L 428 ${A - 23} L 82 ${A - 23} Z`, C.ironL)}
      ${rect(190, A - 18, 180, 22, C.teal, 9, 3)}
      ${line(`M 202 ${A - 11} L 356 ${A - 11}`, '#ffffff', 4)}
      ${rect(150, A - 42, 14, 64, C.gold, 3)} ${rect(388, A - 42, 14, 64, C.gold, 3)}
      ${rect(300, A - 52, 12, 18, C.gold, 2.5)} ${rect(330, A - 52, 12, 18, C.gold, 2.5)}
      ${path(`M 436 ${A - 22} L 500 ${A - 34} L 506 ${A - 20} L 462 ${A - 10} L 462 ${A - 4} L 506 ${A + 4} L 500 ${A + 18} L 436 ${A + 6} Z`, C.gold)}
      ${circ(486, A - 8, 9, C.teal, 2.5)}
      ${circ(486, A - 8, 3.5, '#ffffff', 0)}`,
  },

  // Lantern: wrapped haft and brass hook, a gold cage around warm glass.
  lantern: {
    gripX: 96,
    svg: `
      ${orb(18, A, 12, C.gold, C.goldL)}
      ${wrap(28, 150, 20, C.woodD, C.gold, 16)}
      ${ring(146, 12, 30)}
      ${circ(182, A, 24, 'none', 13)}
      ${`<circle cx="182" cy="${A}" r="24" fill="none" stroke="${C.gold}" stroke-width="7"/>`}
      ${rect(204, A - 7, 110, 14, C.gold, 4)}
      ${path(`M 312 ${A - 76} L 500 ${A - 76} L 480 ${A - 50} L 332 ${A - 50} Z`, C.gold)}
      ${path(`M 384 ${A - 76} L 428 ${A - 76} L 420 ${A - 98} L 392 ${A - 98} Z`, C.gold, 3)}
      ${path(`M 334 ${A - 50} L 478 ${A - 50} L 490 ${A + 56} L 322 ${A + 56} Z`, C.orangeL)}
      ${path(`M 406 ${A - 36} Q 372 ${A + 6} 396 ${A + 40} Q 406 ${A + 50} 416 ${A + 40} Q 440 ${A + 6} 406 ${A - 36} Z`, C.orange, 3)}
      ${facet(`M 406 ${A - 8} Q 392 ${A + 16} 402 ${A + 34} Q 406 ${A + 38} 410 ${A + 34} Q 420 ${A + 16} 406 ${A - 8} Z`, '#fff6c8')}
      ${rect(326, A - 52, 14, 110, C.gold, 3)} ${rect(472, A - 52, 14, 110, C.gold, 3)}
      ${path(`M 312 ${A + 54} L 500 ${A + 54} L 488 ${A + 84} L 324 ${A + 84} Z`, C.gold)}
      ${facet(`M 320 ${A - 72} L 492 ${A - 72} L 486 ${A - 64} L 326 ${A - 64} Z`, C.goldL)}
      ${gem(406, A + 69, 10, C.red, C.redL)}`,
  },
};

module.exports = DEFS;
