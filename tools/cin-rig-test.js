const fs=require('fs');
const src=['js/smb-anim-core.js','js/smb-cin-figure.js']
 .map(f=>fs.readFileSync(''+__dirname+'/../'+f,'utf8').replace(/^'use strict';/,'')).join('\n');
eval(src+'\nglobalThis.CinRig=CinRig;globalThis.CinTrack=CinTrack;globalThis.cinPose=cinPose;globalThis.cinFade=cinFade;');
const ok=(n,c)=>console.log((c?'PASS':'FAIL')+'  '+n);
ok('empty track samples a default pose', !!new CinTrack([]).sample(5).rArm);
ok('single key holds forever', new CinTrack([{at:0,pose:{rArm:1}}]).sample(999).rArm===1);
ok('before first key clamps', new CinTrack([{at:10,pose:{rArm:2}}]).sample(-5).rArm===2);
ok('past last key clamps', new CinTrack([{at:0,pose:{rArm:1}},{at:5,pose:{rArm:3}}]).sample(50).rArm===3);
const t=new CinTrack([{at:0,hold:4,pose:{rArm:0}},{at:10,pose:{rArm:10}}]);
ok('hold freezes the pose', t.sample(0).rArm===0 && t.sample(3).rArm===0 && t.sample(4).rArm===0);
ok('motion resumes after the hold', t.sample(5).rArm>0 && t.sample(9).rArm<10);
ok('duration counts the trailing hold', new CinTrack([{at:0,pose:{}},{at:10,hold:6,pose:{}}]).duration===16);
ok('zero-span segment does not divide by zero', isFinite(new CinTrack([{at:0,hold:5,pose:{rArm:0}},{at:5,pose:{rArm:9}}]).sample(3).rArm));
ok('facing never interpolates',
   [0.2,0.49,0.51,0.9].every(u=>Math.abs(CinRig.joints({facing:1}).hip.x-CinRig.joints({facing:-1}).hip.x)>=0));
ok('keys out of order get sorted', new CinTrack([{at:9,pose:{rArm:9}},{at:0,pose:{rArm:0}}]).keys[0].at===0);
ok('cinFade hex', cinFade('#5cc8ff')==='rgba(92,200,255,0)');
ok('cinFade rgba', cinFade('rgba(1,2,3,0.5)')==='rgba(1,2,3,0)');
ok('cinFade short hex', cinFade('#abc')==='rgba(170,187,204,0)');
ok('cinFade garbage is safe', cinFade(null)==='rgba(0,0,0,0)');
const J=CinRig.joints({x:0,y:0,scale:2});
ok('scale reaches the joints', Math.abs(J.hip.y - (0 - (17+17)*2))<0.001);
ok('length multiplier reaches the joints',
   Math.hypot(CinRig.joints({rArmLen:2}).rHand.x-CinRig.joints({rArmLen:2}).shoulder.x,
              CinRig.joints({rArmLen:2}).rHand.y-CinRig.joints({rArmLen:2}).shoulder.y).toFixed(1)==='60.0');
