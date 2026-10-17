'use strict';
// Boss backstory cinematic: 7 scenes, about 38 seconds. Runs once before the boss fight,
// from the smb-boss.js constructor hook. Depends on smb-cinematics-core.js (cinScript, CinFX, CinCam).

function startBossBackstoryCinematic() {
  const CX = GAME_W / 2;
  const CY = GAME_H / 2;

  // Scenes (seconds): 1 alley 0-5.5, 2 awakening 5.5-11, 3 sky 11-17, 4 space 17-21.5,
  // 5 reality punch 21.5-26.5, 6 corruption 26.5-31, 7 universe 31-38.

  startCinematic(cinScript({
    duration: 38.0,
    perf: (typeof CinPerf !== 'undefined') ? CinPerf.SCENES.backstory : null,

    // Normal entering most scenes; near-freeze on key impacts
    slowMo: [
      [0.0,  0.55],
      [2.0,  0.40],
      [4.5,  0.55],
      [5.5,  0.80],
      [6.8,  0.12],  // first hit freeze
      [7.2,  0.70],
      [8.0,  0.12],  // second hit freeze
      [8.4,  0.90],
      [9.4,  0.08],  // final hit near-stop
      [9.8,  1.10],  // overshoot speed surge
      [11.0, 0.55],
      [11.5, 0.10],
      [12.0, 0.80],
      [12.8, 0.08],
      [13.4, 0.90],
      [14.2, 0.06],
      [15.0, 1.0],
      [17.0, 0.50],
      [17.5, 0.08],
      [21.0, 0.08],
      [21.5, 0.50],
      [22.5, 1.0],
      [23.1, 0.04],  // reality punch freeze
      [24.5, 0.04],
      [24.8, 1.0],
      [26.5, 0.55],
      [27.5, 0.25],
      [30.5, 0.55],
      [31.0, 1.0],
      [38.0, 1.0],
    ],

    cam: [
      [0.0,  { zoomTo: 0.75, focusX: CX,         focusY: CY + 60  }],
      [1.5,  { zoomTo: 0.85, focusX: CX - 80,    focusY: CY + 30  }],
      [3.5,  { zoomTo: 1.10, focusX: CX - 30,    focusY: CY       }],
      [5.0,  { zoomTo: 1.30, focusX: CX,         focusY: CY - 10  }],

      [5.5,  { zoomTo: 1.50, focusX: CX,         focusY: CY       }],
      [6.8,  { zoomTo: 1.85, focusX: CX,         focusY: CY - 20  }],
      [8.0,  { zoomTo: 1.70, focusX: CX + 50,    focusY: CY - 10  }],
      [9.4,  { zoomTo: 2.00, focusX: CX,         focusY: CY - 40  }],
      [10.5, { zoomTo: 1.40, focusX: CX,         focusY: CY       }],

      [11.0, { zoomTo: 1.20, focusX: CX,         focusY: CY       }],
      [11.8, { zoomTo: 1.50, focusX: CX,         focusY: CY - 80  }],
      [13.0, { zoomTo: 1.40, focusX: CX,         focusY: CY - 160 }],
      [14.5, { zoomTo: 1.20, focusX: CX,         focusY: CY - 260 }],
      [16.0, { zoomTo: 0.90, focusX: CX,         focusY: CY - 380 }],
      [17.0, { zoomTo: 0.70, focusX: CX,         focusY: CY       }],

      [17.5, { zoomTo: 0.55, focusX: CX,         focusY: CY - 50  }],
      [20.0, { zoomTo: 0.55, focusX: CX,         focusY: CY - 50  }],
      [21.5, { zoomTo: 0.70, focusX: CX,         focusY: CY       }],

      [22.5, { zoomTo: 1.60, focusX: CX,         focusY: CY       }],
      [23.1, { zoomTo: 2.40, focusX: CX,         focusY: CY - 30  }],
      [24.0, { zoomTo: 1.80, focusX: CX,         focusY: CY       }],
      [25.5, { zoomTo: 0.80, focusX: CX,         focusY: CY       }],
      [26.5, { zoomTo: 1.00, focusX: CX,         focusY: CY       }],

      [27.0, { zoomTo: 1.60, focusX: CX,         focusY: CY - 60  }],
      [29.5, { zoomTo: 1.30, focusX: CX,         focusY: CY - 40  }],
      [31.0, { zoomTo: 0.65, focusX: CX,         focusY: CY       }],

      [32.0, { zoomTo: 0.45, focusX: CX,         focusY: CY + 40  }],
      [35.0, { zoomTo: 0.55, focusX: CX,         focusY: CY       }],
      [37.5, { zoomTo: 1.00, focusX: CX,         focusY: CY       }],
    ],

    steps: [


      { at: 0.05,
        fx: { flash: { color: '#000022', alpha: 0.80, dur: 30 } }
      },

      { at: 0.4,
        dialogue: 'Before the world was made…',
        dialogueDur: 200,
      },

      { at: 1.2,
        run({ CinFX }) {
          CinFX.particles(CX - 120, CY + 90, '#334455', 10);
          CinFX.particles(CX - 80,  CY + 90, '#334455',  8);
        }
      },

      { at: 2.2,
        fx: { flash: { color: '#002244', alpha: 0.30, dur: 18 } }
      },

      { at: 3.0,
        run({ CinFX }) {
          CinFX.particles(CX + 100, CY + 90, '#445566', 12);
          CinFX.groundCrack(CX + 100, CY + 95, { count: 2, color: '#333355' });
        }
      },

      { at: 3.8,
        dialogue: 'He was no one.',
        dialogueDur: 160,
      },

      { at: 5.0,
        run({ CinFX }) {
          CinFX.shake(6);
          CinFX.particles(CX, CY + 20, '#ffffff', 18);
          CinFX.particles(CX, CY + 20, '#99aacc', 10);
        }
      },


      { at: 6.8,
        run({ CinFX }) {
          CinFX.shake(14);
          CinFX.flash('#cc2200', 0.30, 8);
          CinFX.particles(CX - 40, CY, '#ff4422', 22);
          CinFX.groundCrack(CX - 40, CY + 90, { count: 3, color: '#cc3300' });
        }
      },
      { at: 7.0,
        dialogue: 'Then something answered.',
        dialogueDur: 180,
      },

      { at: 8.0,
        run({ CinFX }) {
          CinFX.shake(24);
          CinFX.flash('#ff6600', 0.35, 10);
          CinFX.shockwave(CX, CY + 10, '#ff8800', { count: 2, maxR: 180 });
          CinFX.particles(CX + 20, CY, '#ffaa44', 30);
          CinFX.groundCrack(CX + 20, CY + 90, { count: 5, color: '#ff5500' });
        }
      },

      { at: 9.4,
        run({ CinFX }) {
          CinFX.shake(44);
          CinFX.flash('#ffffff', 0.75, 14);
          CinFX.shockwave(CX, CY, '#cc44ff', { count: 4, maxR: 300, lw: 5 });
          CinFX.particles(CX, CY, '#ffffff', 55);
          CinFX.particles(CX, CY, '#cc44ff', 30);
          CinFX.groundCrack(CX, CY + 90, { count: 8, color: '#9900ff' });
        }
      },

      { at: 9.9,
        run({ CinFX }) {
          CinFX.particles(CX + 160, CY - 20, '#ff8800', 18);
          CinFX.particles(CX + 220, CY - 50, '#ff4400', 12);
        }
      },


      { at: 11.5,
        run({ CinFX }) {
          CinFX.shake(30);
          CinFX.flash('#ffeecc', 0.45, 10);
          CinFX.shockwave(CX, CY + 80, '#ffcc44', { count: 3, maxR: 220 });
          CinFX.particles(CX, CY + 80, '#ffcc00', 40);
          CinFX.groundCrack(CX, CY + 95, { count: 10, color: '#ffaa00' });
        }
      },
      { at: 11.7,
        dialogue: 'He struck the sky.',
        dialogueDur: 160,
      },

      { at: 12.8,
        run({ CinFX }) {
          CinFX.shake(38);
          CinFX.flash('#eeddff', 0.40, 10);
          CinFX.shockwave(CX, CY - 80, '#cc66ff', { count: 3, maxR: 260, lw: 4 });
          CinFX.particles(CX, CY - 80, '#cc88ff', 35);
          CinFX.particles(CX, CY - 80, '#ffffff', 20);
        }
      },

      { at: 13.8,
        run({ CinFX }) {
          for (let i = 0; i < 6; i++) {
            CinFX.particles(
              CX + (Math.random() - 0.5) * 420,
              CY - 200 + (Math.random() - 0.5) * 80,
              '#eeeeff', 6
            );
          }
          CinFX.flash('#ccccff', 0.20, 8);
        }
      },

      { at: 14.2,
        run({ CinFX }) {
          CinFX.shake(55);
          CinFX.flash('#ffffff', 0.90, 16);
          CinFX.shockwave(CX, CY - 220, '#ffffff', { count: 5, maxR: 380, lw: 6 });
          CinFX.particles(CX, CY - 220, '#ffffff', 60);
          CinFX.particles(CX, CY - 220, '#aaccff', 30);
        }
      },

      { at: 16.5,
        dialogue: '…and kept going.',
        dialogueDur: 180,
      },


      { at: 17.0,
        fx: { flash: { color: '#000000', alpha: 1.0, dur: 40 } }
      },

      { at: 17.8,
        run({ CinFX }) {
          for (let i = 0; i < 5; i++) {
            CinFX.particles(
              CX + (Math.random() - 0.5) * 700,
              CY + (Math.random() - 0.5) * 400,
              '#ffffff', 3
            );
          }
        }
      },

      { at: 18.5,
        run({ CinFX }) {
          CinFX.shake(8);
          CinFX.flash('#220022', 0.18, 5);
        }
      },

      { at: 19.2,
        run({ CinFX }) {
          for (let i = 0; i < 6; i++) {
            CinFX.particles(
              CX + (Math.random() - 0.5) * 700,
              CY + (Math.random() - 0.5) * 400,
              '#aaaaff', 3
            );
          }
        }
      },

      { at: 19.7,
        run({ CinFX }) {
          CinFX.shake(12);
          CinFX.flash('#330033', 0.22, 6);
        }
      },

      { at: 20.5,
        run({ CinFX }) {
          CinFX.shake(18);
          CinFX.flash('#440044', 0.28, 7);
          CinFX.particles(CX, CY, '#cc00ff', 8);
        }
      },

      { at: 20.9,
        dialogue: 'Nothing.',
        dialogueDur: 120,
      },


      { at: 21.8,
        run({ CinFX }) {
          CinFX.shake(10);
          CinFX.particles(CX, CY, '#9900ee', 30);
          CinFX.particles(CX, CY, '#ff44ff', 15);
          CinFX.shockwave(CX, CY, '#cc00ff', { count: 2, maxR: 140 });
        }
      },

      { at: 22.5,
        run({ CinFX }) {
          CinFX.shake(22);
          CinFX.flash('#440066', 0.40, 10);
          CinFX.particles(CX, CY - 20, '#cc44ff', 40);
          CinFX.particles(CX, CY - 20, '#ffffff', 20);
        }
      },

      { at: 22.8,
        dialogue: 'He punched through it.',
        dialogueDur: 200,
      },

      { at: 23.1,
        run({ CinFX }) {
          CinFX.shake(80);
          CinFX.flash('#ffffff', 1.0, 22);
          CinFX.shockwave(CX, CY, '#ffffff', { count: 6, maxR: 500, lw: 7 });
          CinFX.shockwave(CX, CY, '#cc00ff', { count: 4, maxR: 400, lw: 5 });
          CinFX.particles(CX, CY, '#ffffff', 80);
          CinFX.particles(CX, CY, '#ee44ff', 50);
          CinFX.particles(CX, CY, '#ff0077', 35);
          CinFX.groundCrack(CX, CY + 90, { count: 14, color: '#cc00ff' });
          CinFX.groundCrack(CX, CY + 90, { count: 10, color: '#ffffff' });
        }
      },

      { at: 23.6,
        run({ CinFX }) {
          CinFX.shake(45);
          CinFX.flash('#220033', 0.55, 14);
          CinFX.groundCrack(CX - 80, CY + 90, { count: 6, color: '#ff00ff' });
          CinFX.groundCrack(CX + 80, CY + 90, { count: 6, color: '#ff00ff' });
          CinFX.particles(CX, CY + 30, '#ff44ff', 30);
        }
      },

      { at: 24.5,
        run({ CinFX }) {
          CinFX.shake(25);
          CinFX.shockwave(CX, CY, '#000000', { count: 3, maxR: 320 });
          CinFX.particles(CX, CY, '#000000', 20);
          CinFX.particles(CX, CY, '#9900cc', 25);
        }
      },

      { at: 25.2,
        dialogue: 'And something looked back.',
        dialogueDur: 200,
      },


      { at: 26.5,
        run({ CinFX }) {
          CinFX.flash('#110011', 0.60, 20);
          CinFX.shake(18);
          CinFX.particles(CX, CY + 10, '#330033', 30);
          CinFX.particles(CX, CY + 10, '#6600aa', 20);
        }
      },

      { at: 27.2,
        run({ CinFX }) {
          CinFX.particles(CX, CY + 80, '#440044', 20);  // ground 'lift' dust
          CinFX.shockwave(CX, CY + 60, '#660066', { count: 2, maxR: 180 });
          CinFX.shake(14);
        }
      },

      { at: 27.8,
        run({ CinFX }) {
          CinFX.shockwave(CX, CY - 30, '#9900bb', { count: 3, maxR: 250, lw: 4 });
          CinFX.particles(CX, CY - 30, '#cc00ee', 35);
          CinFX.particles(CX, CY - 30, '#000000', 25);
          CinFX.flash('#110022', 0.35, 12);
        }
      },

      { at: 28.6,
        dialogue: 'It gave him everything.',
        dialogueDur: 200,
      },

      { at: 29.5,
        run({ CinFX }) {
          CinFX.shake(10);
          CinFX.flash('#ffffff', 0.20, 8);
          CinFX.particles(CX, CY - 40, '#ffffff', 12);
        }
      },

      { at: 30.2,
        run({ CinFX }) {
          CinFX.shockwave(CX, CY - 20, '#cc00ff', { count: 4, maxR: 340, lw: 5 });
          CinFX.particles(CX, CY - 20, '#cc00ff', 40);
          CinFX.particles(CX, CY - 20, '#ffffff', 20);
          CinFX.shake(20);
          CinFX.flash('#220033', 0.45, 14);
        }
      },


      { at: 31.2,
        run({ CinFX }) {
          CinFX.particles(CX - 200, CY + 80, '#665544', 25);
          CinFX.particles(CX - 200, CY + 80, '#888866', 15);
          CinFX.shake(16);
          CinFX.flash('#332211', 0.25, 8);
        }
      },

      { at: 32.0,
        run({ CinFX }) {
          CinFX.particles(CX + 220, CY + 60, '#445566', 25);
          CinFX.particles(CX + 220, CY + 60, '#667788', 15);
          CinFX.shake(14);
          CinFX.shockwave(CX + 220, CY + 60, '#aabbcc', { count: 2, maxR: 150 });
        }
      },

      { at: 32.6,
        run({ CinFX }) {
          for (let i = 0; i < 8; i++) {
            CinFX.particles(
              CX + (Math.random() - 0.5) * 700,
              CY + (Math.random() - 0.5) * 440,
              '#ffffff', 5
            );
          }
        }
      },

      { at: 33.0,
        dialogue: 'He built it all.',
        dialogueDur: 200,
      },

      { at: 33.4,
        run({ CinFX }) {
          CinFX.particles(CX, CY + 120, '#553322', 20);
          CinFX.shake(12);
          for (let i = 0; i < 6; i++) {
            CinFX.particles(
              CX + (Math.random() - 0.5) * 600,
              CY + (Math.random() - 0.5) * 380,
              '#ffeeaa', 4
            );
          }
        }
      },

      { at: 34.5,
        run({ CinFX }) {
          CinFX.shake(30);
          CinFX.flash('#221133', 0.50, 16);
          CinFX.shockwave(CX, CY, '#aa44ff', { count: 5, maxR: 480, lw: 6 });
          CinFX.shockwave(CX, CY, '#ffffff', { count: 3, maxR: 380, lw: 3 });
          CinFX.particles(CX, CY, '#ffffff', 45);
          CinFX.particles(CX, CY, '#cc88ff', 30);
        }
      },

      { at: 35.5,
        run({ CinFX }) {
          for (let i = 0; i < 10; i++) {
            CinFX.particles(
              CX + (Math.random() - 0.5) * 700,
              CY + (Math.random() - 0.5) * 440,
              '#aaaaff', 4
            );
          }
          CinFX.flash('#110022', 0.20, 10);
        }
      },

      { at: 36.5,
        dialogue: 'Every arena. Every rule. Every fighter.',
        dialogueDur: 260,
      },

      { at: 37.6,
        dialogue: 'All of it — his.',
        dialogueDur: 120,
      },

      { at: 37.9,
        fx: { flash: { color: '#000000', alpha: 1.0, dur: 45 } }
      },
    ],
  }));
}


