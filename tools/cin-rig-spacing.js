const fs = require('fs');
const src = ['js/smb-anim-core.js','js/smb-cin-figure.js']
  .map(f => fs.readFileSync(''+__dirname+'/../' + f, 'utf8')
             .replace(/^'use strict';/, ''))
  .join('\n');
eval(src + '\nglobalThis.CinRig=CinRig; globalThis.CinTrack=CinTrack; globalThis.cinPose=cinPose; globalThis.CIN_POSE=CIN_POSE;');

const P = Math.PI;
const base = { x: 200, y: 300, facing: 1 };

// A wind-up → strike → settle, authored the way an animator would:
// anticipate back, HOLD on the wound pose, snap through, HOLD on contact, settle.
const track = new CinTrack([
  { at: 0,  hold: 0,  ease: 'outQuad',  pose: { ...base, rArm: P*0.58, rFore: P*0.58 } },
  { at: 8,  hold: 4,  ease: 'inQuad',   pose: { ...base, rArm: P*1.10, rFore: P*1.25, torso: -0.22 } },  // wound, held
  { at: 16, hold: 3,  ease: 'outExpo',  pose: { ...base, rArm: -0.30, rFore: -0.05, torso: 0.30,
                                                rArmLen: 1.45, rArmW: 0.75 } },                          // contact, stretched
  { at: 30, hold: 0,  ease: 'outBack',  pose: { ...base, rArm: P*0.30, rFore: P*0.45, torso: 0.10 } },
]);

const sp = CinRig.spacing(track, 'rHand', 0, 30);
console.log('duration frames:', track.duration);
console.log('rHand spacing per frame:');
console.log('  ', sp.join(' '));
const nz = sp.filter(v => v > 0.01);
console.log('  frames held still (spacing 0):', sp.length - nz.length);
console.log('  min/max moving spacing:', Math.min(...nz), '/', Math.max(...nz));
console.log('  ratio max:min =', (Math.max(...nz)/Math.min(...nz)).toFixed(1),
            '  (1.0 = constant-velocity interpolation)');
console.log('rHand arc bow (px off the chord), strike segment:',
            CinRig.arc(track, 'rHand', 12, 20));

// Deformation actually reaching the drawing
const contact = track.sample(17);
const J0 = CinRig.joints(track.sample(0)), J1 = CinRig.joints(contact);
const armLen = (J) => Math.hypot(J.rHand.x - J.shoulder.x, J.rHand.y - J.shoulder.y);
console.log('arm length rest -> contact:', armLen(J0).toFixed(1), '->', armLen(J1).toFixed(1),
            `(${(armLen(J1)/armLen(J0)).toFixed(2)}x)`);
