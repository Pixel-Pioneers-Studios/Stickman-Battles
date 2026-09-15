const { AXIS, G, ramp, bladeRamp, gripL, fitting, haft, nicks, fist } = require('./parts-grim');

// Each def: { gripX, build() -> { defs, svg } }.
// build() is a function so the gradient-id counter produces fresh ids per render.

const DEFS = {

  sword: {
    gripX: 118,
    build() {
      const blade  = bladeRamp(23);
      const guard  = fitting(150, 18, 92, 5);
      const grip   = gripL(88, 150, 21, 3);
      const pommel = ramp(AXIS - 17, AXIS + 17, [
        [0, G.bronzeL], [0.32, G.bronze], [0.72, G.bronzeD], [1, '#251c0e'],
      ]);
      return {
        defs: blade.def + guard.defs + grip.defs + pommel.def,
        svg: `
          <!-- pommel: a worn wheel, flattened on the underside -->
          <path d="M 92 ${AXIS - 17} L 74 ${AXIS - 15} Q 62 ${AXIS} 75 ${AXIS + 16}
                   L 92 ${AXIS + 17} Z" fill="url(#${pommel.id})"/>
          <path d="M 78 ${AXIS - 10} Q 70 ${AXIS - 2} 76 ${AXIS + 6}"
                stroke="${G.bronzeL}" stroke-width="2.4" fill="none" opacity="0.5"/>
          ${grip.svg}
          <!-- crossguard: a straight bar, swept a touch toward the blade, with the
               lower arm slightly longer so it isn't a mirrored shape -->
          <path d="M 150 ${AXIS - 48} L 168 ${AXIS - 42} L 172 ${AXIS - 10}
                   L 172 ${AXIS + 10} L 168 ${AXIS + 46} L 150 ${AXIS + 52}
                   L 144 ${AXIS + 46} L 148 ${AXIS + 8} L 148 ${AXIS - 8}
                   L 144 ${AXIS - 42} Z"
                fill="url(#${guard.id})" stroke="#1b1408" stroke-width="2" stroke-linejoin="round"/>
          <path d="M 152 ${AXIS - 44} L 152 ${AXIS + 46}"
                stroke="${G.bronzeL}" stroke-width="2.2" opacity="0.45"/>
          <!-- ricasso -->
          <rect x="166" y="${AXIS - 16}" width="16" height="32" rx="2" fill="${G.steelD}"/>
          <!-- blade: long taper, point off the axis so it isn't a mirrored wedge -->
          <path d="M 178 ${AXIS - 23}
                   L 414 ${AXIS - 19} L 500 ${AXIS - 1} L 412 ${AXIS + 20}
                   L 178 ${AXIS + 23} Z" fill="url(#${blade.id})"
                stroke="#11151a" stroke-width="2" stroke-linejoin="round" opacity="0.85"/>
          <!-- fuller: a recessed groove, dark with a lit lower lip -->
          <path d="M 196 ${AXIS - 7} L 404 ${AXIS - 5} L 404 ${AXIS + 3} L 196 ${AXIS + 5} Z"
                fill="${G.steelD}" opacity="0.8"/>
          <path d="M 198 ${AXIS + 4} L 402 ${AXIS + 2}"
                stroke="${G.steelM}" stroke-width="1.6" opacity="0.7"/>
          <!-- sharpened edges: a bright hairline up top, bounce below -->
          <path d="M 180 ${AXIS - 22} L 412 ${AXIS - 18} L 498 ${AXIS - 1.5}"
                stroke="${G.steelS}" stroke-width="2.2" fill="none" opacity="0.95"/>
          ${nicks(230, 400, AXIS + 22, 1, 3, 11)}
          <path d="M 182 ${AXIS + 22} L 410 ${AXIS + 19}"
                stroke="#9aa5af" stroke-width="1.4" fill="none" opacity="0.6"/>`,
      };
    },
  },

  katana: {
    gripX: 112,
    build() {
      const blade = ramp(AXIS - 52, AXIS + 12, [
        [0.00, '#828d97'], [0.10, G.steelS], [0.34, G.steelL],
        [0.62, '#6b7681'], [0.86, '#454e57'], [1.00, '#2a3138'],
      ]);
      const tsuka = ramp(AXIS - 11, AXIS + 11, [
        [0, '#4a4036'], [0.3, '#2f2620'], [1, '#1a1512'],
      ]);
      let wrap = '';
      for (let i = 0; i < 6; i++) {
        const x = 78 + i * 14;
        wrap += `<path d="M ${x} ${AXIS - 10} L ${x + 11} ${AXIS + 10} M ${x + 11} ${AXIS - 10} L ${x} ${AXIS + 10}"
                   stroke="#0f0c0a" stroke-width="3.4" fill="none" opacity="0.9"/>
                 <path d="M ${x + 1.4} ${AXIS - 9} L ${x + 12.4} ${AXIS + 9}"
                   stroke="#6b5f50" stroke-width="1.3" fill="none" opacity="0.45"/>`;
      }
      return {
        defs: blade.def + tsuka.def,
        svg: `
          <path d="M 72 ${AXIS - 12} L 62 ${AXIS - 9} L 62 ${AXIS + 9} L 72 ${AXIS + 12} Z"
                fill="#241d18"/>
          <rect x="70" y="${AXIS - 11}" width="86" height="22" rx="3" fill="url(#${tsuka.id})"/>
          ${wrap}
          <!-- tsuba: iron, dark, thin in profile -->
          <ellipse cx="164" cy="${AXIS}" rx="7" ry="31" fill="#2b2b31"/>
          <ellipse cx="162" cy="${AXIS}" rx="3" ry="27" fill="#54545e" opacity="0.8"/>
          <!-- habaki -->
          <rect x="170" y="${AXIS - 12}" width="14" height="24" rx="2" fill="${G.bronze}"/>
          <!-- blade: single edge on the underside, spine sweeping up to the kissaki -->
          <path d="M 182 ${AXIS - 11}
                   Q 330 ${AXIS - 27} 500 ${AXIS - 50}
                   Q 474 ${AXIS - 19} 436 ${AXIS - 3}
                   Q 318 ${AXIS + 8} 182 ${AXIS + 11} Z" fill="url(#${blade.id})"
                stroke="#11151a" stroke-width="2" stroke-linejoin="round" opacity="0.85"/>
          <!-- shinogi ridge -->
          <path d="M 188 ${AXIS - 5} Q 330 ${AXIS - 19} 470 ${AXIS - 38}"
                stroke="#5a656f" stroke-width="2.4" fill="none" opacity="0.8"/>
          <!-- hamon: the temper line, irregular, following the edge -->
          <path d="M 190 ${AXIS + 6} Q 250 ${AXIS + 1} 290 ${AXIS + 4}
                   Q 340 ${AXIS - 1} 386 ${AXIS - 8} Q 420 ${AXIS - 12} 448 ${AXIS - 20}"
                stroke="${G.steelS}" stroke-width="3" fill="none" opacity="0.55"/>
          <!-- edge hairline -->
          <path d="M 184 ${AXIS + 10} Q 318 ${AXIS + 7} 436 ${AXIS - 4}"
                stroke="#fbfdff" stroke-width="1.8" fill="none" opacity="0.95"/>`,
      };
    },
  },

  hammer: {
    gripX: 96,
    build() {
      const face = ramp(AXIS - 64, AXIS + 64, [
        [0.00, G.steelL], [0.16, G.steelM], [0.50, '#515b65'],
        [0.80, G.steelD], [1.00, '#252b32'],
      ]);
      const cheek = ramp(AXIS - 56, AXIS + 56, [
        [0, '#6e7983'], [0.5, '#434c55'], [1, '#22272d'],
      ]);
      const grip = gripL(70, 178, 21, 5);
      const h    = haft(174, 358, 17);
      const coll = fitting(348, 26, 34, 4);
      return {
        defs: face.def + cheek.def + grip.defs + h.defs + coll.defs,
        svg: `
          <path d="M 76 ${AXIS - 15} L 60 ${AXIS - 12} L 60 ${AXIS + 12} L 76 ${AXIS + 15} Z"
                fill="#2a2010"/>
          ${grip.svg}
          ${h.svg}
          ${coll.svg}
          <!-- head: a forged block, wider at the striking face, with a flat poll -->
          <path d="M 372 ${AXIS - 58} L 458 ${AXIS - 64} L 500 ${AXIS - 46}
                   L 500 ${AXIS + 46} L 458 ${AXIS + 64} L 372 ${AXIS + 58} Z"
                fill="url(#${face.id})" stroke="#11151a" stroke-width="2.2" stroke-linejoin="round" opacity="0.85"/>
          <!-- the cheek plane facing us, one value step down from the face -->
          <path d="M 372 ${AXIS - 58} L 440 ${AXIS - 56} L 440 ${AXIS + 56} L 372 ${AXIS + 58} Z"
                fill="url(#${cheek.id})"/>
          <!-- banding straps -->
          <path d="M 386 ${AXIS - 57} L 386 ${AXIS + 57}" stroke="${G.bronzeD}" stroke-width="9"/>
          <path d="M 386 ${AXIS - 57} L 386 ${AXIS + 57}" stroke="${G.bronze}" stroke-width="4" opacity="0.8"/>
          <!-- struck face: chipped corners and a bright worn rim -->
          <path d="M 458 ${AXIS - 64} L 500 ${AXIS - 46} L 500 ${AXIS + 46} L 458 ${AXIS + 64} Z"
                fill="#8d99a4" opacity="0.55"/>
          <path d="M 462 ${AXIS - 58} L 496 ${AXIS - 42}" stroke="${G.steelS}" stroke-width="2.6" opacity="0.8"/>
          <path d="M 476 ${AXIS - 20} l 9 6 l -7 7 Z" fill="${G.steelD}" opacity="0.7"/>
          <path d="M 482 ${AXIS + 18} l 8 5 l -6 7 Z" fill="${G.steelD}" opacity="0.6"/>
          <!-- top edge catch light -->
          <path d="M 374 ${AXIS - 57} L 457 ${AXIS - 63} L 498 ${AXIS - 45}"
                stroke="${G.steelS}" stroke-width="2" fill="none" opacity="0.7"/>`,
      };
    },
  },
  spear: {
    gripX: 150,
    build() {
      const head = ramp(AXIS - 46, AXIS + 46, [
        [0.00, G.steelL], [0.13, G.steelS], [0.44, G.steelM],
        [0.54, G.steelD], [0.82, '#4b545d'], [1.00, '#7e8992'],
      ]);
      const h    = haft(60, 404, 14);
      const lang = fitting(392, 30, 22, 3);
      const butt = fitting(52, 22, 18, 3);
      const grip = gripL(118, 200, 19, 11);
      return {
        defs: head.def + h.defs + lang.defs + butt.defs + grip.defs,
        svg: `
          ${butt.svg}
          ${h.svg}
          ${grip.svg}
          ${lang.svg}
          <!-- leaf head: widest a third up, long taper to the point -->
          <path d="M 414 ${AXIS - 11}
                   Q 446 ${AXIS - 44} 504 ${AXIS}
                   Q 446 ${AXIS + 44} 414 ${AXIS + 11} Z"
                fill="url(#${head.id})" stroke="#11151a" stroke-width="2" stroke-linejoin="round" opacity="0.9"/>
          <path d="M 420 ${AXIS} L 496 ${AXIS}" stroke="${G.steelD}" stroke-width="3" opacity="0.8"/>
          <path d="M 426 ${AXIS - 13} Q 458 ${AXIS - 25} 490 ${AXIS - 5}"
                stroke="${G.steelS}" stroke-width="2.4" fill="none" opacity="0.9"/>
          ${nicks(430, 486, AXIS + 12, 1, 2, 5)}`,
      };
    },
  },

  gun: {
    gripX: 128,
    build() {
      const slide = ramp(AXIS - 36, AXIS - 2, [
        [0, '#8a929b'], [0.22, '#5c646d'], [0.7, '#3c434a'], [1, '#22272c'],
      ]);
      const frame = ramp(AXIS - 4, AXIS + 62, [
        [0, '#4a5158'], [0.4, '#2e343a'], [1, '#191d21'],
      ]);
      const checker = [0, 1, 2, 3].map(i =>
        `<path d="M 112 ${AXIS + 10 + i * 13} L 144 ${AXIS + 8 + i * 13}"
               stroke="#6a727a" stroke-width="3" opacity="0.5"/>`).join('');
      const serrations = [0, 1, 2, 3, 4].map(i =>
        `<rect x="${112 + i * 13}" y="${AXIS - 32}" width="5" height="22" rx="2"
               fill="#12161a" opacity="0.6"/>`).join('');
      return {
        defs: slide.def + frame.def,
        svg: `
          <!-- grip: raked back, checkered panel -->
          <path d="M 104 ${AXIS - 2} L 158 ${AXIS - 2} L 148 ${AXIS + 64} L 104 ${AXIS + 58} Z"
                fill="url(#${frame.id})" stroke="#0e1114" stroke-width="2" stroke-linejoin="round"/>
          ${checker}
          <!-- trigger guard + trigger -->
          <path d="M 158 ${AXIS + 8} Q 188 ${AXIS + 46} 216 ${AXIS + 6}"
                fill="none" stroke="#1b2024" stroke-width="9" stroke-linecap="round"/>
          <path d="M 172 ${AXIS + 10} L 178 ${AXIS + 30}" stroke="#7c848c" stroke-width="6" stroke-linecap="round"/>
          <!-- frame + slide -->
          <rect x="100" y="${AXIS - 8}" width="300" height="16" rx="3" fill="#33393f"/>
          <rect x="100" y="${AXIS - 36}" width="344" height="30" rx="4"
                fill="url(#${slide.id})" stroke="#0e1114" stroke-width="2"/>
          ${serrations}
          <!-- ejection port -->
          <rect x="258" y="${AXIS - 31}" width="72" height="15" rx="3" fill="#15191d"/>
          <path d="M 108 ${AXIS - 34} L 438 ${AXIS - 34}" stroke="#aeb6bf" stroke-width="2" opacity="0.65"/>
          <!-- muzzle + bore -->
          <rect x="436" y="${AXIS - 32}" width="66" height="26" rx="3" fill="#262b30" stroke="#0e1114" stroke-width="2"/>
          <circle cx="488" cy="${AXIS - 19}" r="7" fill="#0a0c0e"/>
          <circle cx="488" cy="${AXIS - 19}" r="7" fill="none" stroke="#7c848c" stroke-width="2"/>
          <!-- sights -->
          <path d="M 424 ${AXIS - 36} l 12 0 l 0 -11 l -10 0 Z" fill="#1b2024"/>
          <path d="M 126 ${AXIS - 36} l 14 0 l 0 -10 l -12 0 Z" fill="#1b2024"/>`,
      };
    },
  },

  flail: {
    gripX: 92,
    build() {
      const ball = ramp(AXIS - 48, AXIS + 48, [
        [0, '#7d8791'], [0.2, '#5a636c'], [0.55, '#3a4249'], [1, '#1d2226'],
      ]);
      const grip = gripL(70, 190, 21, 17);
      const fer  = fitting(186, 22, 20, 3);
      // Uniform overlapping links. Alternating flat/edge-on links looked like a
      // row of glyphs once downscaled; overlap is what reads as "chain".
      const chain = [0, 1, 2, 3, 4, 5].map(i => {
        const cx = 218 + i * 21;
        return `<ellipse cx="${cx}" cy="${AXIS}" rx="15" ry="11"
                  fill="none" stroke="#12161a" stroke-width="12"/>
                <ellipse cx="${cx}" cy="${AXIS}" rx="15" ry="11"
                  fill="none" stroke="#59616a" stroke-width="6"/>
                <path d="M ${cx - 11} ${AXIS - 8} A 15 11 0 0 1 ${cx + 11} ${AXIS - 8}"
                  fill="none" stroke="#98a1aa" stroke-width="2.2" opacity="0.65"/>`;
      }).join('');
      // Spikes forged into the ball, not stuck on: they start inside the radius.
      const spikes = [0, 1, 2, 3, 4, 5, 6, 7].map(i => {
        const a = i * Math.PI / 4, cx = 428, cy = AXIS;
        return `<path d="M ${cx + Math.cos(a - 0.30) * 42} ${cy + Math.sin(a - 0.30) * 42}
                         L ${cx + Math.cos(a) * 72} ${cy + Math.sin(a) * 72}
                         L ${cx + Math.cos(a + 0.30) * 42} ${cy + Math.sin(a + 0.30) * 42} Z"
                  fill="#4a525a" stroke="#12161a" stroke-width="2" stroke-linejoin="round"/>`;
      }).join('');
      return {
        defs: ball.def + grip.defs + fer.defs,
        svg: `
          <path d="M 74 ${AXIS - 15} L 58 ${AXIS - 12} L 58 ${AXIS + 12} L 74 ${AXIS + 15} Z" fill="#241a10"/>
          ${grip.svg}
          ${fer.svg}
          ${chain}
          ${spikes}
          <circle cx="428" cy="${AXIS}" r="46" fill="url(#${ball.id})" stroke="#12161a" stroke-width="2.4"/>
          <circle cx="412" cy="${AXIS - 17}" r="13" fill="#aab3bc" opacity="0.45"/>`,
      };
    },
  },

  bow: {
    gripX: 250,
    // A bow is genuinely tall and narrow; len is the WIDTH, so it has to be small
    // or the sprite towers over the ~84px fighter.
    len: 20,
    build() {
      const riser = gripL(232, 282, 26, 23);
      return {
        defs: riser.defs,
        svg: `
          <!-- Drawn side-on: the limbs sweep away from the riser in y and the
               string runs behind, so +x still points toward the target. -->
          <path d="M 262 ${AXIS - 18}
                   C 300 ${AXIS - 60} 300 ${AXIS - 92} 250 ${AXIS - 112}
                   C 296 ${AXIS - 88} 312 ${AXIS - 56} 276 ${AXIS - 14} Z"
                fill="#5a412a" stroke="#1d140c" stroke-width="2.4" stroke-linejoin="round"/>
          <path d="M 262 ${AXIS + 18}
                   C 300 ${AXIS + 60} 300 ${AXIS + 92} 250 ${AXIS + 112}
                   C 296 ${AXIS + 88} 312 ${AXIS + 56} 276 ${AXIS + 14} Z"
                fill="#4d3723" stroke="#1d140c" stroke-width="2.4" stroke-linejoin="round"/>
          <!-- horn nocks -->
          <path d="M 252 ${AXIS - 112} l 12 -8 l 4 10 l -12 6 Z" fill="#cbb896"/>
          <path d="M 252 ${AXIS + 112} l 12 8 l 4 -10 l -12 -6 Z" fill="#cbb896"/>
          <!-- string, with the serving where an arrow nocks -->
          <path d="M 256 ${AXIS - 112} L 240 ${AXIS} L 256 ${AXIS + 112}"
                fill="none" stroke="#0f1215" stroke-width="4"/>
          <path d="M 256 ${AXIS - 112} L 240 ${AXIS} L 256 ${AXIS + 112}"
                fill="none" stroke="#c9cdd2" stroke-width="1.8" opacity="0.65"/>
          <rect x="235" y="${AXIS - 14}" width="9" height="28" rx="3" fill="#3a2f22"/>
          ${riser.svg}
          <path d="M 272 ${AXIS - 30} C 296 ${AXIS - 70} 296 ${AXIS - 112} 262 ${AXIS - 104}"
                fill="none" stroke="#9a7a52" stroke-width="2" opacity="0.6"/>`,
      };
    },
  },
  shield: {
    gripX: 60,
    len: 34,
    build() {
      const face = ramp(AXIS - 104, AXIS + 104, [
        [0.00, '#6d7783'], [0.16, '#8e98a4'], [0.46, '#565f6a'],
        [0.74, '#3a424b'], [1.00, '#23292f'],
      ]);
      const boss = ramp(AXIS - 34, AXIS + 34, [
        [0, '#b6bfc8'], [0.35, '#79838d'], [1, '#2c3238'],
      ]);
      const rivets = [0, 1, 2, 3].map(i =>
        `<circle cx="${110 + i}" cy="${AXIS - 74 + i * 52}" r="5.5" fill="#1b2026"/>
         <circle cx="${109 + i}" cy="${AXIS - 76 + i * 52}" r="2.4" fill="#9aa3ac" opacity="0.8"/>`).join('');
      return {
        defs: face.def + boss.def,
        svg: `
          <!-- Heater shield face-on. The hand sits behind the boss, so the grip
               anchor is near the left edge and the plate extends forward. -->
          <path d="M 44 ${AXIS - 104} L 176 ${AXIS - 96}
                   Q 196 ${AXIS - 20} 150 ${AXIS + 96}
                   L 96 ${AXIS + 112} L 44 ${AXIS + 104} Z"
                fill="url(#${face.id})" stroke="#11151a" stroke-width="3" stroke-linejoin="round"/>
          <path d="M 44 ${AXIS - 104} L 176 ${AXIS - 96} Q 196 ${AXIS - 20} 150 ${AXIS + 96}
                   L 96 ${AXIS + 112} L 44 ${AXIS + 104}"
                fill="none" stroke="#1f252b" stroke-width="10" stroke-linejoin="round"/>
          <path d="M 48 ${AXIS - 99} L 172 ${AXIS - 91}" stroke="#a4aeb8" stroke-width="3" opacity="0.6"/>
          <!-- vertical reinforcing band -->
          <path d="M 108 ${AXIS - 100} L 114 ${AXIS + 104}" stroke="#2b3238" stroke-width="22"/>
          <path d="M 108 ${AXIS - 100} L 114 ${AXIS + 104}" stroke="#4d565f" stroke-width="12" opacity="0.7"/>
          ${rivets}
          <circle cx="82" cy="${AXIS}" r="34" fill="url(#${boss.id})" stroke="#11151a" stroke-width="2.6"/>
          <circle cx="74" cy="${AXIS - 10}" r="11" fill="#d2dae2" opacity="0.5"/>
          <!-- battle scars: this shield has been used -->
          <path d="M 132 ${AXIS - 56} l 26 16" stroke="#1b2026" stroke-width="3.4" opacity="0.8"/>
          <path d="M 126 ${AXIS + 34} l 32 12" stroke="#1b2026" stroke-width="3" opacity="0.7"/>
          <path d="M 150 ${AXIS - 12} l 18 20" stroke="#1b2026" stroke-width="2.6" opacity="0.6"/>`,
      };
    },
  },

  fryingpan: {
    gripX: 84,
    build() {
      const pan = ramp(AXIS - 70, AXIS + 70, [
        [0.00, '#4e5257'], [0.14, '#3a3e43'], [0.48, '#24272b'],
        [0.80, '#15181b'], [1.00, '#2e3237'],
      ]);
      const hdl = ramp(AXIS - 11, AXIS + 11, [
        [0, '#3c3f44'], [0.35, '#24272b'], [1, '#121416'],
      ]);
      return {
        defs: pan.def + hdl.def,
        svg: `
          <!-- Cast iron: nearly black. The only bright value is the cooking face,
               polished by use — that contrast is what sells the material. -->
          <path d="M 62 ${AXIS - 13} L 300 ${AXIS - 11} L 300 ${AXIS + 11} L 62 ${AXIS + 13} Z"
                fill="url(#${hdl.id})" stroke="#0c0e10" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="74" cy="${AXIS}" r="8" fill="#0c0e10"/>
          <circle cx="74" cy="${AXIS}" r="3.4" fill="#5c6167"/>
          <path d="M 292 ${AXIS - 30}
                   C 300 ${AXIS - 78} 382 ${AXIS - 96} 428 ${AXIS - 72}
                   C 478 ${AXIS - 46} 478 ${AXIS + 46} 428 ${AXIS + 72}
                   C 382 ${AXIS + 96} 300 ${AXIS + 78} 292 ${AXIS + 30} Z"
                fill="url(#${pan.id})" stroke="#0c0e10" stroke-width="2.6" stroke-linejoin="round"/>
          <path d="M 300 ${AXIS - 42} C 312 ${AXIS - 80} 384 ${AXIS - 92} 426 ${AXIS - 68}"
                fill="none" stroke="#7d848c" stroke-width="3.4" opacity="0.8"/>
          <path d="M 306 ${AXIS + 52} C 350 ${AXIS + 84} 396 ${AXIS + 80} 426 ${AXIS + 66}"
                fill="none" stroke="#585f66" stroke-width="2.4" opacity="0.45"/>
          <ellipse cx="388" cy="${AXIS - 2}" rx="54" ry="48" fill="#565b61" opacity="0.35"/>
          <ellipse cx="376" cy="${AXIS - 18}" rx="26" ry="19" fill="#868d95" opacity="0.3"/>`,
      };
    },
  },

  broomstick: {
    gripX: 110,
    build() {
      const h    = haft(50, 344, 15);
      const bind = fitting(332, 26, 26, 4);
      let r = 7919;
      const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
      let twigs = '';
      for (let i = 0; i < 26; i++) {
        const t  = i / 25;
        const y0 = AXIS - 12 + t * 24;
        const y1 = AXIS - 54 + t * 108 + (rnd() - 0.5) * 14;
        const x1 = 474 + rnd() * 30;
        const c  = ['#6b5433', '#7d6239', '#57432a', '#8a6d42'][i % 4];
        twigs += `<path d="M 354 ${y0} Q ${(354 + x1) / 2} ${(y0 + y1) / 2 - 6} ${x1} ${y1}"
                    fill="none" stroke="${c}" stroke-width="${(2.4 + rnd() * 2).toFixed(2)}" stroke-linecap="round"/>`;
      }
      const twine = [0, 1, 2].map(i =>
        `<path d="M ${338 + i * 8} ${AXIS - 15} L ${338 + i * 8} ${AXIS + 15}"
               stroke="#2a2114" stroke-width="4"/>`).join('');
      return {
        defs: h.defs + bind.defs,
        svg: `
          ${h.svg}
          ${twigs}
          ${bind.svg}
          ${twine}
          <path d="M 332 ${AXIS - 9} L 358 ${AXIS - 9}" stroke="#a8875a" stroke-width="2.4" opacity="0.6"/>`,
      };
    },
  },

  whip: {
    gripX: 96,
    build() {
      const grip = gripL(66, 168, 22, 29);
      const fer  = fitting(164, 18, 24, 3);
      // A braided fall, tapering along a slack curve rather than lying straight.
      let braid = '';
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        const x = 182 + t * 320;
        const y = AXIS + Math.sin(t * Math.PI * 1.6) * 46 * (0.35 + t * 0.65);
        pts.push([x, y]);
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const t = i / (pts.length - 1);
        const w = 15 * (1 - t) + 2.2;
        braid += `<path d="M ${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}
                           L ${pts[i + 1][0].toFixed(1)} ${pts[i + 1][1].toFixed(1)}"
                    stroke="#1d1510" stroke-width="${w.toFixed(2)}" stroke-linecap="round"/>`;
      }
      // Plait highlights, spaced along the fall so it reads as braided leather.
      let plait = '';
      for (let i = 2; i < pts.length - 2; i += 3) {
        const t = i / (pts.length - 1);
        plait += `<circle cx="${pts[i][0].toFixed(1)}" cy="${(pts[i][1] - 2).toFixed(1)}"
                    r="${(4.4 * (1 - t) + 0.9).toFixed(2)}" fill="#6b5137" opacity="0.55"/>`;
      }
      return {
        defs: grip.defs + fer.defs,
        svg: `
          <path d="M 70 ${AXIS - 16} L 54 ${AXIS - 12} L 54 ${AXIS + 12} L 70 ${AXIS + 16} Z" fill="#241a10"/>
          ${grip.svg}
          ${fer.svg}
          ${braid}
          ${plait}
          <!-- cracker at the tip -->
          <path d="M ${pts[pts.length - 1][0].toFixed(1)} ${pts[pts.length - 1][1].toFixed(1)}
                   l 16 6 l -3 -9 Z" fill="#8a7050"/>`,
      };
    },
  },

  boomerang: {
    gripX: 150,
    len: 46,
    build() {
      const wing = ramp(AXIS - 96, AXIS + 96, [
        [0, '#8a6a42'], [0.22, '#6d5132'], [0.6, '#4a3620'], [1, '#2b1e11'],
      ]);
      return {
        defs: wing.def,
        svg: `
          <!-- Carved hardwood, held at the elbow of the V. The airfoil edge is
               the lit side; the trailing edge stays dark so it reads as shaped. -->
          <!-- One continuous V: outer edge sweeps tip to tip, inner edge notches
               back to the elbow. Two separate wings crossed and read as a bird. -->
          <path d="M 470 ${AXIS - 98}
                   C 372 ${AXIS - 86} 232 ${AXIS - 40} 148 ${AXIS + 2}
                   C 232 ${AXIS + 44} 372 ${AXIS + 90} 470 ${AXIS + 102}
                   C 452 ${AXIS + 76} 420 ${AXIS + 60} 316 ${AXIS + 26}
                   C 250 ${AXIS + 6} 228 ${AXIS + 2} 214 ${AXIS}
                   C 228 ${AXIS - 2} 250 ${AXIS - 6} 316 ${AXIS - 26}
                   C 420 ${AXIS - 58} 452 ${AXIS - 74} 470 ${AXIS - 98} Z"
                fill="url(#${wing.id})" stroke="#150e08" stroke-width="2.6" stroke-linejoin="round"/>
          <!-- lit leading edge along the top arm only -->
          <path d="M 462 ${AXIS - 92} C 370 ${AXIS - 80} 240 ${AXIS - 36} 162 ${AXIS + 2}"
                fill="none" stroke="#b08c5c" stroke-width="3.2" opacity="0.75"/>
          <path d="M 300 ${AXIS + 22} C 380 ${AXIS + 48} 430 ${AXIS + 72} 458 ${AXIS + 94}"
                fill="none" stroke="#2b1e11" stroke-width="3" opacity="0.6"/>
          <!-- burn-etched bands -->
          <path d="M 330 ${AXIS - 44} l 10 -20" stroke="#2b1e11" stroke-width="4.4" opacity="0.8"/>
          <path d="M 368 ${AXIS - 54} l 10 -20" stroke="#2b1e11" stroke-width="4.4" opacity="0.8"/>
          <path d="M 352 ${AXIS + 48} l 10 20" stroke="#2b1e11" stroke-width="4" opacity="0.7"/>
          <!-- worn grip at the elbow -->
          <ellipse cx="196" cy="${AXIS}" rx="17" ry="13" fill="#3b2a18" opacity="0.75"/>`,
      };
    },
  },

  slingshot: {
    gripX: 96,
    build() {
      const fork = ramp(AXIS - 80, AXIS + 80, [
        [0, '#8a6a42'], [0.26, '#6d5132'], [0.7, '#4a3620'], [1, '#2b1e11'],
      ]);
      return {
        defs: fork.def,
        svg: `
          <!-- Forked hardwood with the bark left on the handle, bands hooked to
               the tine tips and a stitched leather pouch at full draw. -->
          <path d="M 70 ${AXIS - 13} L 236 ${AXIS - 12} L 236 ${AXIS + 12} L 70 ${AXIS + 13} Z"
                fill="url(#${fork.id})" stroke="#150e08" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M 228 ${AXIS - 10} C 268 ${AXIS - 26} 288 ${AXIS - 58} 292 ${AXIS - 86}
                   L 268 ${AXIS - 88} C 262 ${AXIS - 60} 248 ${AXIS - 34} 220 ${AXIS - 18} Z"
                fill="url(#${fork.id})" stroke="#150e08" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M 228 ${AXIS + 10} C 268 ${AXIS + 26} 288 ${AXIS + 58} 292 ${AXIS + 86}
                   L 268 ${AXIS + 88} C 262 ${AXIS + 60} 248 ${AXIS + 34} 220 ${AXIS + 18} Z"
                fill="#573f26" stroke="#150e08" stroke-width="2.2" stroke-linejoin="round"/>
          <!-- binding at the tine tips -->
          <path d="M 268 ${AXIS - 84} L 292 ${AXIS - 86}" stroke="#241a10" stroke-width="7"/>
          <path d="M 268 ${AXIS + 84} L 292 ${AXIS + 86}" stroke="#241a10" stroke-width="7"/>
          <!-- rubber bands, drawn back to the pouch -->
          <path d="M 282 ${AXIS - 84} C 352 ${AXIS - 76} 398 ${AXIS - 62} 424 ${AXIS - 40}"
                fill="none" stroke="#2f2a26" stroke-width="10" stroke-linecap="round"/>
          <path d="M 282 ${AXIS + 84} C 352 ${AXIS + 76} 398 ${AXIS + 62} 424 ${AXIS + 40}"
                fill="none" stroke="#2f2a26" stroke-width="10" stroke-linecap="round"/>
          <path d="M 288 ${AXIS - 80} C 354 ${AXIS - 72} 396 ${AXIS - 58} 420 ${AXIS - 38}"
                fill="none" stroke="#5e554d" stroke-width="2.8" opacity="0.5"/>
          <!-- leather pouch slung between the two bands -->
          <path d="M 420 ${AXIS - 46} C 470 ${AXIS - 34} 470 ${AXIS + 34} 420 ${AXIS + 46}
                   C 446 ${AXIS + 18} 446 ${AXIS - 18} 420 ${AXIS - 46} Z"
                fill="#4a3628" stroke="#1d150e" stroke-width="2.6" stroke-linejoin="round"/>
          <path d="M 428 ${AXIS - 34} C 456 ${AXIS - 18} 456 ${AXIS + 18} 428 ${AXIS + 34}"
                fill="none" stroke="#7a5c42" stroke-width="2.4" opacity="0.65"/>
          <!-- bark texture on the handle -->
          <path d="M 96 ${AXIS - 6} L 210 ${AXIS - 5}" stroke="#a8875a" stroke-width="2" opacity="0.4"/>`,
      };
    },
  },

  paperairplane: {
    gripX: 120,
    build() {
      return {
        defs: '',
        svg: `
          <!-- Folded paper: no gradients, only flat planes at different values.
               Crisp creases are what make paper read as paper, not soft shading. -->
          <path d="M 96 ${AXIS + 4} L 500 ${AXIS - 46} L 246 ${AXIS + 16} Z"
                fill="#e8e6e0" stroke="#2c2a26" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M 96 ${AXIS + 4} L 246 ${AXIS + 16} L 190 ${AXIS + 52} Z"
                fill="#b9b6ae" stroke="#2c2a26" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M 246 ${AXIS + 16} L 500 ${AXIS - 46} L 330 ${AXIS + 40} Z"
                fill="#cfccc4" stroke="#2c2a26" stroke-width="2.2" stroke-linejoin="round"/>
          <!-- keel crease -->
          <path d="M 96 ${AXIS + 4} L 500 ${AXIS - 46}" stroke="#2c2a26" stroke-width="2.6"/>
          <path d="M 110 ${AXIS + 2} L 492 ${AXIS - 43}" stroke="#ffffff" stroke-width="1.6" opacity="0.8"/>
          <!-- secondary folds -->
          <path d="M 246 ${AXIS + 16} L 300 ${AXIS - 8}" stroke="#2c2a26" stroke-width="1.6" opacity="0.5"/>
          <path d="M 190 ${AXIS + 52} L 246 ${AXIS + 16}" stroke="#8d8a83" stroke-width="1.8" opacity="0.7"/>`,
      };
    },
  },
  // NOTE: no `combat` def. Bare hands must tint to the fighter's colour, which
  // only the procedural branch in drawWeapon() can do — see smb-weapon-sprites.js.

  peashooter: {
    gripX: 110,
    build() {
      const tube = ramp(AXIS - 22, AXIS + 22, [
        [0, '#6f7a68'], [0.2, '#4e5849'], [0.62, '#333b30'], [1, '#1b201a'],
      ]);
      const grip = gripL(84, 152, 20, 31);
      const peas = [0, 1, 2].map(i =>
        `<circle cx="${226 + i * 17}" cy="${AXIS - 52 + (i % 2) * 9}" r="6.5"
                 fill="#5c7a3a" stroke="#2c3a1c" stroke-width="1.6"/>`).join('');
      const bands = [0, 1].map(i =>
        `<rect x="${330 + i * 54}" y="${AXIS - 25}" width="12" height="50" rx="3" fill="#232a21"/>`).join('');
      return {
        defs: tube.def + grip.defs,
        svg: `
          <!-- A machined pea gun: brass hopper, blued steel tube. Played straight;
               the joke is what it fires, not the object. -->
          ${grip.svg}
          <rect x="146" y="${AXIS - 22}" width="300" height="44" rx="8"
                fill="url(#${tube.id})" stroke="#0e1210" stroke-width="2.4"/>
          <path d="M 158 ${AXIS - 17} L 434 ${AXIS - 17}" stroke="#9aa694" stroke-width="2.6" opacity="0.6"/>
          <path d="M 214 ${AXIS - 22} L 206 ${AXIS - 66} L 286 ${AXIS - 66} L 274 ${AXIS - 22} Z"
                fill="#7d6234" stroke="#2a2010" stroke-width="2.4" stroke-linejoin="round"/>
          <path d="M 214 ${AXIS - 60} L 280 ${AXIS - 60}" stroke="#bc9a60" stroke-width="3" opacity="0.7"/>
          <ellipse cx="243" cy="${AXIS - 66}" rx="40" ry="7" fill="#2a2010"/>
          ${peas}
          ${bands}
          <rect x="440" y="${AXIS - 17}" width="60" height="34" rx="5"
                fill="#2a3227" stroke="#0e1210" stroke-width="2.2"/>
          <circle cx="486" cy="${AXIS}" r="9" fill="#0b0e0a"/>`,
      };
    },
  },

  flamethrower: {
    gripX: 116,
    build() {
      const body = ramp(AXIS - 34, AXIS + 34, [
        [0, '#7b7168'], [0.2, '#554d46'], [0.62, '#37312c'], [1, '#1d1a17'],
      ]);
      const grip = gripL(88, 158, 20, 37);
      // Scorch builds toward the muzzle — the business end is the burnt one.
      const scorch = [0, 1, 2, 3].map(i =>
        `<ellipse cx="${372 + i * 34}" cy="${AXIS + (i % 2 ? -9 : 11)}" rx="${18 - i * 2}" ry="9"
                  fill="#17110d" opacity="${(0.3 + i * 0.14).toFixed(2)}"/>`).join('');
      return {
        defs: body.def + grip.defs,
        svg: `
          <!-- Industrial: pressure tank, braided fuel line, scorched nozzle.
               The pilot flame is the ONLY lit element and it stays inside the
               silhouette — a halo out here would inflate the trim box. -->
          ${grip.svg}
          <rect x="150" y="${AXIS - 34}" width="228" height="68" rx="9"
                fill="url(#${body.id})" stroke="#0f0d0b" stroke-width="2.6"/>
          <path d="M 162 ${AXIS - 28} L 366 ${AXIS - 28}" stroke="#a49a90" stroke-width="3" opacity="0.6"/>
          <!-- pressure tank slung under -->
          <rect x="182" y="${AXIS + 26} " width="150" height="34" rx="17"
                fill="#4a4038" stroke="#0f0d0b" stroke-width="2.4"/>
          <path d="M 196 ${AXIS + 34} L 320 ${AXIS + 34}" stroke="#8a7f74" stroke-width="2.6" opacity="0.5"/>
          <!-- gauge -->
          <circle cx="206" cy="${AXIS - 6}" r="15" fill="#22201d" stroke="#0f0d0b" stroke-width="2.2"/>
          <circle cx="206" cy="${AXIS - 6}" r="8" fill="#6f6a62"/>
          <path d="M 206 ${AXIS - 6} l 5 -6" stroke="#d8d2c4" stroke-width="2"/>
          <!-- braided fuel line -->
          <path d="M 240 ${AXIS + 26} C 268 ${AXIS + 4} 300 ${AXIS + 4} 330 ${AXIS + 14}"
                fill="none" stroke="#191614" stroke-width="11" stroke-linecap="round"/>
          <path d="M 240 ${AXIS + 26} C 268 ${AXIS + 4} 300 ${AXIS + 4} 330 ${AXIS + 14}"
                fill="none" stroke="#5e564e" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
          <!-- barrel + muzzle -->
          <rect x="374" y="${AXIS - 21}" width="104" height="42" rx="5"
                fill="#3a342e" stroke="#0f0d0b" stroke-width="2.4"/>
          ${scorch}
          <rect x="466" y="${AXIS - 26}" width="34" height="52" rx="5"
                fill="#241f1b" stroke="#0f0d0b" stroke-width="2.4"/>
          <!-- pilot flame, contained inside the muzzle mouth -->
          <path d="M 486 ${AXIS + 11} Q 475 ${AXIS} 486 ${AXIS - 13}
                   Q 497 ${AXIS} 486 ${AXIS + 11} Z" fill="#d4652a"/>
          <path d="M 486 ${AXIS + 6} Q 480 ${AXIS} 486 ${AXIS - 7}
                   Q 492 ${AXIS} 486 ${AXIS + 6} Z" fill="#f6c46a"/>`,
      };
    },
  },

  electricstaff: {
    gripX: 140,
    build() {
      const rod  = ramp(AXIS - 9, AXIS + 9, [
        [0, '#6a737c'], [0.28, '#454d55'], [0.72, '#2a3036'], [1, '#161a1e'],
      ]);
      const grip = gripL(112, 208, 20, 41);
      const butt = fitting(48, 24, 20, 3);
      return {
        defs: rod.def + grip.defs + butt.defs,
        svg: `
          <!-- Blued steel rod with an arc contained between two prongs. The glow
               is tight and inside the fork so it reads as restrained power. -->
          ${butt.svg}
          <rect x="60" y="${AXIS - 9}" width="330" height="18" rx="9"
                fill="url(#${rod.id})" stroke="#0e1114" stroke-width="2"/>
          <path d="M 76 ${AXIS - 5} L 376 ${AXIS - 5}" stroke="#8d959d" stroke-width="2" opacity="0.5"/>
          ${grip.svg}
          <!-- copper binding below the head -->
          <rect x="382" y="${AXIS - 16}" width="26" height="32" rx="4"
                fill="#7d5a34" stroke="#1d1509" stroke-width="2"/>
          <path d="M 386 ${AXIS - 11} L 404 ${AXIS - 11}" stroke="#c99a5e" stroke-width="2.4" opacity="0.7"/>
          <!-- fork -->
          <path d="M 406 ${AXIS - 10} C 442 ${AXIS - 30} 470 ${AXIS - 54} 486 ${AXIS - 74}
                   L 470 ${AXIS - 82} C 452 ${AXIS - 58} 428 ${AXIS - 32} 400 ${AXIS - 16} Z"
                fill="#3a424a" stroke="#0e1114" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M 406 ${AXIS + 10} C 442 ${AXIS + 30} 470 ${AXIS + 54} 486 ${AXIS + 74}
                   L 470 ${AXIS + 82} C 452 ${AXIS + 58} 428 ${AXIS + 32} 400 ${AXIS + 16} Z"
                fill="#2e353c" stroke="#0e1114" stroke-width="2.2" stroke-linejoin="round"/>
          <!-- arc between the prongs -->
          <path d="M 478 ${AXIS - 78} L 452 ${AXIS - 30} L 470 ${AXIS - 18}
                   L 446 ${AXIS + 22} L 466 ${AXIS + 40} L 478 ${AXIS + 78}"
                fill="none" stroke="#2f7f96" stroke-width="7" stroke-linejoin="round" opacity="0.55"/>
          <path d="M 478 ${AXIS - 78} L 452 ${AXIS - 30} L 470 ${AXIS - 18}
                   L 446 ${AXIS + 22} L 466 ${AXIS + 40} L 478 ${AXIS + 78}"
                fill="none" stroke="#bfeef6" stroke-width="2.6" stroke-linejoin="round"/>
          <circle cx="455" cy="${AXIS}" r="7" fill="#e8fbff" opacity="0.9"/>`,
      };
    },
  },
  gauntlet: {
    // gripX sits INSIDE the fist mass, not behind it on a cuff: an armoured fist
    // is worn ON the hand, so the sprite has to straddle the hand joint rather
    // than extend forward from it like a held object.
    gripX: 250,
    len: 30,
    build() {
      const plate = ramp(AXIS - 56, AXIS + 56, [
        [0, '#5b5266'], [0.2, '#3f374d'], [0.6, '#2a2438'], [1, '#161222'],
      ]);
      const cuff = [0, 1].map(i =>
        `<path d="M ${172 + i * 20} ${AXIS - 44} L ${168 + i * 20} ${AXIS + 44}"
               stroke="#0d0a16" stroke-width="4" opacity="0.8"/>`).join('');
      return {
        defs: plate.def,
        svg: `
          <!-- Short cuff only — just enough to cover the wrist behind the fist. -->
          <path d="M 156 ${AXIS - 38} L 210 ${AXIS - 46} L 210 ${AXIS + 46} L 156 ${AXIS + 38} Z"
                fill="url(#${plate.id})" stroke="#0d0a16" stroke-width="2.6" stroke-linejoin="round"/>
          ${cuff}
          ${fist(210, 134, 112, `url(#${plate.id})`, '#0d0a16', '#9a8fb0')}
          <!-- lit seams -->
          <path d="M 238 ${AXIS - 42} L 246 ${AXIS + 44}" stroke="#7b4fd6" stroke-width="3.4" opacity="0.85"/>
          <!-- core set into the back of the hand -->
          <circle cx="292" cy="${AXIS - 4}" r="16" fill="#120d22" stroke="#0d0a16" stroke-width="2.4"/>
          <circle cx="292" cy="${AXIS - 4}" r="9.5" fill="#6a3fc8"/>
          <circle cx="292" cy="${AXIS - 4}" r="4.2" fill="#d9c4ff"/>`,
      };
    },
  },

  mkgauntlet: {
    // Same rule as `gauntlet`: the grip is inside the fist so it is worn, not held.
    gripX: 252,
    len: 34,
    build() {
      const plate = ramp(AXIS - 64, AXIS + 64, [
        [0, '#b3bcc6'], [0.16, '#8c96a1'], [0.5, '#5a636d'], [0.82, '#343c45'], [1, '#1d232a'],
      ]);
      const cuff = [0, 1].map(i =>
        `<path d="M ${176 + i * 22} ${AXIS - 50} L ${172 + i * 22} ${AXIS + 50}"
               stroke="#10141a" stroke-width="4.4" opacity="0.75"/>`).join('');
      // One stud per knuckle on the scalloped leading edge of fist(212, 148, 124).
      const studs = [0, 1, 2, 3].map(i => {
        const k = 124 * 0.25;
        const cy = AXIS - 62 + k * (i + 0.5);
        const cx = 344 + Math.sin((i + 0.5) / 4 * Math.PI) * 13;
        return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="7"
                  fill="#2b3239" stroke="#10141a" stroke-width="2"/>
                <circle cx="${(cx - 2).toFixed(1)}" cy="${(cy - 2).toFixed(1)}" r="2.6"
                  fill="#c3ccd6" opacity="0.85"/>`;
      }).join('');
      return {
        defs: plate.def,
        svg: `
          <path d="M 158 ${AXIS - 42} L 212 ${AXIS - 52} L 212 ${AXIS + 52} L 158 ${AXIS + 42} Z"
                fill="url(#${plate.id})" stroke="#10141a" stroke-width="2.8" stroke-linejoin="round"/>
          <path d="M 162 ${AXIS - 42} L 174 ${AXIS - 44} L 174 ${AXIS + 44} L 162 ${AXIS + 42} Z"
                fill="#a5823f" stroke="#2a2010" stroke-width="2.2"/>
          ${cuff}
          ${fist(212, 148, 124, `url(#${plate.id})`, '#10141a', '#e2e9f0')}
          ${studs}
          <!-- crest plate on the back of the hand -->
          <path d="M 258 ${AXIS - 28} L 296 ${AXIS - 32} L 302 ${AXIS + 6} L 264 ${AXIS + 12} Z"
                fill="#a5823f" stroke="#2a2010" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M 266 ${AXIS - 22} L 294 ${AXIS - 25}" stroke="#dcc084" stroke-width="2.4" opacity="0.8"/>`,
      };
    },
  },

  nullblade: {
    gripX: 116,
    build() {
      // Sovereign's blade: black steel that drinks light, with the ONLY colour a
      // hairline along the edge. Restraint is the character note.
      const blade = ramp(AXIS - 20, AXIS + 20, [
        [0.00, '#3a3134'], [0.12, '#4d4247'], [0.46, '#241e21'],
        [0.72, '#161214'], [1.00, '#2b2427'],
      ]);
      const grip = gripL(84, 148, 20, 43);
      return {
        defs: blade.def + grip.defs,
        svg: `
          <path d="M 88 ${AXIS - 16} L 70 ${AXIS - 12} L 70 ${AXIS + 12} L 88 ${AXIS + 16} Z"
                fill="#141012" stroke="#0a0709" stroke-width="2"/>
          ${grip.svg}
          <!-- guard: a single swept bar, no symmetry -->
          <path d="M 146 ${AXIS - 40} L 168 ${AXIS - 34} L 170 ${AXIS + 30}
                   L 150 ${AXIS + 40} L 142 ${AXIS + 32} L 148 ${AXIS - 30} Z"
                fill="#241d20" stroke="#0a0709" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M 152 ${AXIS - 34} L 154 ${AXIS + 32}" stroke="#cc2200" stroke-width="2" opacity="0.7"/>
          <!-- blade -->
          <path d="M 170 ${AXIS - 20} L 420 ${AXIS - 17} L 502 ${AXIS - 2}
                   L 418 ${AXIS + 18} L 170 ${AXIS + 20} Z"
                fill="url(#${blade.id})" stroke="#0a0709" stroke-width="2" stroke-linejoin="round"/>
          <!-- the one lit line: the cutting edge -->
          <path d="M 174 ${AXIS - 19} L 419 ${AXIS - 16} L 500 ${AXIS - 2}"
                stroke="#cc2200" stroke-width="2.4" fill="none" opacity="0.95"/>
          <path d="M 178 ${AXIS - 17} L 416 ${AXIS - 14}"
                stroke="#ff7a52" stroke-width="1.2" fill="none" opacity="0.7"/>
          <!-- faint fuller -->
          <path d="M 190 ${AXIS - 2} L 404 ${AXIS + 1}" stroke="#0e0b0d" stroke-width="5" opacity="0.8"/>`,
      };
    },
  },

  voidblade: {
    gripX: 116,
    build() {
      const blade = ramp(AXIS - 24, AXIS + 24, [
        [0.00, '#4a3d63'], [0.14, '#5f4f7d'], [0.48, '#2c2440'],
        [0.76, '#1a152a'], [1.00, '#322a4a'],
      ]);
      const grip = gripL(86, 150, 20, 47);
      // The blade is eaten away toward the tip — void, not steel.
      const erosion = [0, 1, 2, 3].map(i =>
        `<path d="M ${330 + i * 40} ${AXIS + 20} q 9 -8 18 -1 Z"
               fill="#1a152a" opacity="0.9"/>`).join('');
      return {
        defs: blade.def + grip.defs,
        svg: `
          <path d="M 90 ${AXIS - 15} L 72 ${AXIS - 11} L 72 ${AXIS + 11} L 90 ${AXIS + 15} Z" fill="#1a152a"/>
          ${grip.svg}
          <path d="M 148 ${AXIS - 36} L 172 ${AXIS - 28} L 172 ${AXIS + 28}
                   L 148 ${AXIS + 36} L 142 ${AXIS + 28} L 142 ${AXIS - 28} Z"
                fill="#2c2440" stroke="#0d0a16" stroke-width="2.2" stroke-linejoin="round"/>
          <circle cx="157" cy="${AXIS}" r="7" fill="#9933ff" opacity="0.85"/>
          <path d="M 172 ${AXIS - 24} L 400 ${AXIS - 19} L 496 ${AXIS - 2}
                   L 398 ${AXIS + 20} L 172 ${AXIS + 24} Z"
                fill="url(#${blade.id})" stroke="#0d0a16" stroke-width="2" stroke-linejoin="round"/>
          ${erosion}
          <path d="M 176 ${AXIS - 22} L 399 ${AXIS - 18} L 494 ${AXIS - 2}"
                stroke="#b062ff" stroke-width="2.4" fill="none" opacity="0.9"/>
          <path d="M 192 ${AXIS - 4} L 384 ${AXIS}" stroke="#120e1e" stroke-width="6" opacity="0.75"/>
          <path d="M 196 ${AXIS + 3} L 380 ${AXIS + 6}" stroke="#7a4fc0" stroke-width="1.6" opacity="0.45"/>`,
      };
    },
  },

  shockrifle: {
    gripX: 122,
    build() {
      const body = ramp(AXIS - 34, AXIS + 10, [
        [0, '#7d8891'], [0.22, '#515b64'], [0.66, '#333b42'], [1, '#1b2126'],
      ]);
      const grip = gripL(96, 156, 20, 53);
      const fins = [0, 1, 2].map(i =>
        `<rect x="${330 + i * 30}" y="${AXIS - 40}" width="10" height="26" rx="3" fill="#232a30"/>`).join('');
      return {
        defs: body.def + grip.defs,
        svg: `
          <!-- Industrial energy rifle: the charge is a contained line inside the
               receiver, visible through a slot, not a glowing aura. -->
          <path d="M 104 ${AXIS + 4} L 162 ${AXIS + 4} L 150 ${AXIS + 62} L 108 ${AXIS + 56} Z"
                fill="#262c32" stroke="#0e1114" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="M 156 ${AXIS + 12} Q 186 ${AXIS + 46} 214 ${AXIS + 8}"
                fill="none" stroke="#1b2024" stroke-width="8" stroke-linecap="round"/>
          <rect x="100" y="${AXIS - 34}" width="330" height="44" rx="6"
                fill="url(#${body.id})" stroke="#0e1114" stroke-width="2.4"/>
          <path d="M 112 ${AXIS - 29} L 418 ${AXIS - 29}" stroke="#aab3bc" stroke-width="2.4" opacity="0.6"/>
          <!-- charge slot -->
          <rect x="196" y="${AXIS - 18}" width="132" height="12" rx="6" fill="#08161b"/>
          <rect x="200" y="${AXIS - 16}" width="124" height="8" rx="4" fill="#125f75"/>
          <rect x="204" y="${AXIS - 15}" width="92" height="5" rx="2.5" fill="#7fe4f6"/>
          <!-- stock -->
          <path d="M 100 ${AXIS - 30} L 62 ${AXIS - 22} L 62 ${AXIS + 2} L 100 ${AXIS + 6} Z"
                fill="#2b3238" stroke="#0e1114" stroke-width="2.2" stroke-linejoin="round"/>
          ${fins}
          <!-- emitter -->
          <rect x="424" y="${AXIS - 26}" width="52" height="30" rx="4"
                fill="#2a3138" stroke="#0e1114" stroke-width="2.2"/>
          <path d="M 476 ${AXIS - 22} L 500 ${AXIS - 14} L 500 ${AXIS - 2} L 476 ${AXIS + 2} Z"
                fill="#1b2126" stroke="#0e1114" stroke-width="2"/>
          <circle cx="488" cy="${AXIS - 8}" r="6" fill="#7fe4f6"/>
          <circle cx="488" cy="${AXIS - 8}" r="2.4" fill="#e8fbff"/>`,
      };
    },
  },

  lantern: {
    gripX: 96,
    build() {
      const glass = ramp(AXIS - 52, AXIS + 48, [
        [0, '#6b5a34'], [0.2, '#8a7440'], [0.6, '#5c4c2c'], [1, '#33291a'],
      ]);
      const frame = fitting(198, 34, 14, 3);
      const grip  = gripL(70, 158, 18, 59);
      return {
        defs: glass.def + frame.defs + grip.defs,
        svg: `
          <!-- Iron and brass storm lantern. No halo: the game draws the light,
               and a glow here would inflate the alpha-trim box and shrink it. -->
          ${grip.svg}
          <circle cx="182" cy="${AXIS}" r="19" fill="none" stroke="#1d1710" stroke-width="9"/>
          <circle cx="182" cy="${AXIS}" r="19" fill="none" stroke="#7d6234" stroke-width="4"/>
          ${frame.svg}
          <!-- cap -->
          <path d="M 296 ${AXIS - 76} L 442 ${AXIS - 76} L 424 ${AXIS - 52} L 314 ${AXIS - 52} Z"
                fill="#4a3a20" stroke="#181208" stroke-width="2.4" stroke-linejoin="round"/>
          <path d="M 302 ${AXIS - 71} L 436 ${AXIS - 71}" stroke="#a5823f" stroke-width="2.6" opacity="0.7"/>
          <!-- glass housing -->
          <path d="M 314 ${AXIS - 52} L 424 ${AXIS - 52} L 434 ${AXIS + 44} L 304 ${AXIS + 44} Z"
                fill="url(#${glass.id})" stroke="#181208" stroke-width="2.4" stroke-linejoin="round"/>
          <!-- corner posts -->
          <path d="M 318 ${AXIS - 50} L 328 ${AXIS + 42}" stroke="#241b0e" stroke-width="7"/>
          <path d="M 420 ${AXIS - 50} L 430 ${AXIS + 42}" stroke="#241b0e" stroke-width="7"/>
          <path d="M 352 ${AXIS - 50} L 358 ${AXIS + 42}" stroke="#2e2412" stroke-width="4" opacity="0.7"/>
          <path d="M 386 ${AXIS - 50} L 392 ${AXIS + 42}" stroke="#2e2412" stroke-width="4" opacity="0.7"/>
          <!-- wick flame, contained -->
          <path d="M 370 ${AXIS + 26} Q 348 ${AXIS + 2} 370 ${AXIS - 30}
                   Q 392 ${AXIS + 2} 370 ${AXIS + 26} Z" fill="#c2701c"/>
          <path d="M 370 ${AXIS + 16} Q 358 ${AXIS} 370 ${AXIS - 18}
                   Q 382 ${AXIS} 370 ${AXIS + 16} Z" fill="#ffe3a0"/>
          <!-- base -->
          <path d="M 300 ${AXIS + 44} L 438 ${AXIS + 44} L 426 ${AXIS + 70} L 312 ${AXIS + 70} Z"
                fill="#4a3a20" stroke="#181208" stroke-width="2.4" stroke-linejoin="round"/>
          <path d="M 306 ${AXIS + 49} L 432 ${AXIS + 49}" stroke="#a5823f" stroke-width="2.4" opacity="0.6"/>`,
      };
    },
  },
};

module.exports = DEFS;
