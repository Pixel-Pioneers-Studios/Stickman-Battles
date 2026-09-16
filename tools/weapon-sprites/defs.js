const { AXIS, P, S, shaft, grip, pommel, collar, bevel } = require('./parts');

// Each def: { gripX, svg }  — gripX is where the hand closes on the weapon,
// in authored coordinates; the exporter converts it to the `anchor` fraction.
const DEFS = {

  sword: {
    gripX: 118,
    svg: `
      ${pommel(74, 16)}
      ${grip(88, 146, 20)}
      <!-- crossguard -->
      <path d="M 146 ${AXIS - 44} L 166 ${AXIS - 30} L 166 ${AXIS + 30} L 146 ${AXIS + 44} Z"
            fill="${P.steel}" ${S(4.5)}/>
      <circle cx="156" cy="${AXIS}" r="8" fill="${P.cyan}" ${S(3.5)}/>
      <!-- blade -->
      <path d="M 166 ${AXIS - 22} L 430 ${AXIS - 20} L 502 ${AXIS} L 430 ${AXIS + 20} L 166 ${AXIS + 22} Z"
            fill="${P.steel}" ${S(4.5)}/>
      <path d="M 176 ${AXIS} L 470 ${AXIS}" stroke="${P.steelLo}" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
      ${bevel(`M 180 ${AXIS - 13} L 428 ${AXIS - 12}`)}
      <path d="M 180 ${AXIS + 13} L 428 ${AXIS + 12}" stroke="${P.cyanLo}" stroke-width="4"
            stroke-linecap="round" opacity="0.5"/>`,
  },

  hammer: {
    gripX: 96,
    svg: `
      ${pommel(58, 15)}
      ${grip(70, 190, 21)}
      ${shaft(188, 360, 16)}
      ${collar(352, 22, 32)}
      <!-- head -->
      <path d="M 374 ${AXIS - 62} L 470 ${AXIS - 54} L 470 ${AXIS + 54} L 374 ${AXIS + 62} Z"
            fill="${P.steel}" ${S(5)}/>
      <path d="M 470 ${AXIS - 54} L 500 ${AXIS - 38} L 500 ${AXIS + 38} L 470 ${AXIS + 54} Z"
            fill="${P.steelLo}" ${S(5)}/>
      <rect x="386" y="${AXIS - 40}" width="26" height="80" rx="5" fill="${P.blue}" ${S(4)}/>
      <rect x="392" y="${AXIS - 32}" width="14" height="64" rx="4" fill="${P.cyan}" opacity="0.7"/>
      ${bevel(`M 424 ${AXIS - 44} L 462 ${AXIS - 38}`, 0.6)}`,
  },

  katana: {
    gripX: 112,
    svg: `
      <!-- kashira -->
      <path d="M 74 ${AXIS - 15} L 62 ${AXIS - 10} L 62 ${AXIS + 10} L 74 ${AXIS + 15} Z" fill="${P.dark}" ${S(4)}/>
      <!-- tsuka with diamond ito wrap -->
      <rect x="72" y="${AXIS - 11}" width="82" height="22" rx="4" fill="${P.dark}" ${S(4)}/>
      ${[0,1,2,3,4].map(i => `<path d="M ${80 + i*16} ${AXIS - 10} L ${92 + i*16} ${AXIS + 10} M ${92 + i*16} ${AXIS - 10} L ${80 + i*16} ${AXIS + 10}"
            stroke="#c9c9d8" stroke-width="3.5" fill="none" opacity="0.85"/>`).join('')}
      <!-- tsuba -->
      <ellipse cx="163" cy="${AXIS}" rx="9" ry="30" fill="${P.dark}" ${S(4.5)}/>
      <ellipse cx="163" cy="${AXIS}" rx="4" ry="20" fill="#888899" opacity="0.8"/>
      <!-- curved single-edged blade: spine arcs up, edge below it -->
      <path d="M 172 ${AXIS - 9}
               Q 330 ${AXIS - 26} 502 ${AXIS - 50}
               Q 478 ${AXIS - 20} 438 ${AXIS - 4}
               Q 320 ${AXIS + 8} 172 ${AXIS + 11} Z"
            fill="${P.steel}" ${S(4.5)}/>
      <path d="M 186 ${AXIS - 4} Q 330 ${AXIS - 16} 468 ${AXIS - 36}"
            stroke="#888899" stroke-width="4" fill="none" opacity="0.85"/>
      <path d="M 190 ${AXIS + 5} Q 320 ${AXIS + 2} 440 ${AXIS - 10}"
            stroke="${P.steelHi}" stroke-width="3.5" fill="none" opacity="0.9"/>`,
  },

  spear: {
    gripX: 150,
    svg: `
      ${pommel(56, 14)}
      ${shaft(66, 396, 12)}
      ${grip(120, 196, 18)}
      <!-- langets -->
      <path d="M 388 ${AXIS - 9} L 424 ${AXIS - 13} L 424 ${AXIS + 13} L 388 ${AXIS + 9} Z" fill="${P.blue}" ${S(4)}/>
      <!-- leaf head -->
      <path d="M 416 ${AXIS - 12}
               Q 450 ${AXIS - 52} 504 ${AXIS}
               Q 450 ${AXIS + 52} 416 ${AXIS + 12} Z"
            fill="#c6c6f5" ${S(4.5)}/>
      <path d="M 428 ${AXIS} L 492 ${AXIS}" stroke="#8888ff" stroke-width="4.5" stroke-linecap="round" opacity="0.9"/>
      ${bevel(`M 436 ${AXIS - 11} Q 462 ${AXIS - 18} 482 ${AXIS - 6}`, 0.7)}`,
  },

  gun: {
    gripX: 128,
    svg: `
      <!-- grip, hanging below the axis -->
      <path d="M 104 ${AXIS - 4} L 156 ${AXIS - 4} L 148 ${AXIS + 62} L 106 ${AXIS + 58} Z"
            fill="${P.dark}" ${S(4.5)}/>
      ${[0,1,2].map(i => `<rect x="112" y="${AXIS + 12 + i*15}" width="34" height="6" rx="3" fill="#5a5a6e"/>`).join('')}
      <!-- trigger guard -->
      <path d="M 156 ${AXIS + 6} Q 186 ${AXIS + 44} 216 ${AXIS + 6}"
            fill="none" stroke="${P.line}" stroke-width="8" stroke-linecap="round"/>
      <path d="M 170 ${AXIS + 8} L 176 ${AXIS + 28}" stroke="#8a8a9e" stroke-width="7" stroke-linecap="round"/>
      <!-- receiver + slide -->
      <rect x="100" y="${AXIS - 34}" width="150" height="34" rx="6" fill="#666672" ${S(4.5)}/>
      <rect x="112" y="${AXIS - 28}" width="120" height="7" rx="3" fill="#9b9bab" opacity="0.9"/>
      <!-- barrel shroud -->
      <rect x="244" y="${AXIS - 28}" width="200" height="26" rx="5" fill="#5a5a66" ${S(4.5)}/>
      ${[0,1,2,3].map(i => `<rect x="${264 + i*44}" y="${AXIS - 22}" width="10" height="14" rx="3" fill="${P.line}" opacity="0.55"/>`).join('')}
      <!-- muzzle -->
      <rect x="440" y="${AXIS - 24}" width="62" height="18" rx="4" fill="#3f3f4c" ${S(4.5)}/>
      <circle cx="486" cy="${AXIS - 15}" r="5" fill="${P.cyan}" opacity="0.8"/>
      <!-- front + rear sight -->
      <rect x="232" y="${AXIS - 44}" width="12" height="12" rx="2" fill="${P.dark}" ${S(3.5)}/>
      <rect x="424" y="${AXIS - 42}" width="10" height="12" rx="2" fill="${P.dark}" ${S(3.5)}/>`,
  },

  flail: {
    gripX: 92,
    svg: `
      ${pommel(58, 14)}
      ${grip(70, 186, 20)}
      <rect x="184" y="${AXIS - 9}" width="22" height="18" rx="4" fill="#aaaaaa" ${S(4)}/>
      <!-- chain -->
      ${[0,1,2,3].map(i => `<ellipse cx="${224 + i*32}" cy="${AXIS}" rx="19" ry="14"
            fill="none" stroke="${P.line}" stroke-width="13"/>
          <ellipse cx="${224 + i*32}" cy="${AXIS}" rx="19" ry="14"
            fill="none" stroke="#b8b8c4" stroke-width="6"/>`).join('')}
      <!-- spiked ball -->
      ${[0,1,2,3,4,5,6,7].map(i => {
        const a = i * Math.PI / 4, cx = 424, cy = AXIS;
        return `<path d="M ${cx + Math.cos(a - 0.35) * 40} ${cy + Math.sin(a - 0.35) * 40}
                       L ${cx + Math.cos(a) * 74} ${cy + Math.sin(a) * 74}
                       L ${cx + Math.cos(a + 0.35) * 40} ${cy + Math.sin(a + 0.35) * 40} Z"
                 fill="#9a9aa8" ${S(4)}/>`;
      }).join('')}
      <circle cx="424" cy="${AXIS}" r="46" fill="#8a8a99" ${S(5)}/>
      <circle cx="408" cy="${AXIS - 16}" r="14" fill="#c4c4d2" opacity="0.75"/>`,
  },

  lantern: {
    gripX: 96,
    svg: `
      ${grip(72, 156, 18)}
      <!-- suspension ring + hook -->
      <circle cx="182" cy="${AXIS}" r="20" fill="none" stroke="${P.line}" stroke-width="8"/>
      <circle cx="182" cy="${AXIS}" r="20" fill="none" stroke="${P.gold}" stroke-width="4"/>
      <rect x="198" y="${AXIS - 7}" width="34" height="14" rx="4" fill="${P.gold}" ${S(4)}/>
      <!-- cap -->
      <path d="M 300 ${AXIS - 74} L 436 ${AXIS - 74} L 418 ${AXIS - 50} L 318 ${AXIS - 50} Z"
            fill="${P.gold}" ${S(4.5)}/>
      <!-- glass housing -->
      <path d="M 318 ${AXIS - 50} L 418 ${AXIS - 50} L 428 ${AXIS + 46} L 308 ${AXIS + 46} Z"
            fill="#ffe6a8" ${S(4.5)}/>
      <path d="M 348 ${AXIS - 46} L 348 ${AXIS + 42} M 388 ${AXIS - 46} L 388 ${AXIS + 42}"
            stroke="${P.gold}" stroke-width="5" opacity="0.85"/>
      <!-- flame -->
      <path d="M 368 ${AXIS + 30} Q 332 ${AXIS + 2} 368 ${AXIS - 38}
               Q 404 ${AXIS + 2} 368 ${AXIS + 30} Z" fill="#ff9d3c" ${S(4)}/>
      <path d="M 368 ${AXIS + 20} Q 350 ${AXIS} 368 ${AXIS - 22}
               Q 386 ${AXIS} 368 ${AXIS + 20} Z" fill="#fff2c4"/>
      <!-- base -->
      <path d="M 300 ${AXIS + 46} L 436 ${AXIS + 46} L 424 ${AXIS + 70} L 312 ${AXIS + 70} Z"
            fill="${P.gold}" ${S(4.5)}/>`,
  },
};

module.exports = DEFS;
