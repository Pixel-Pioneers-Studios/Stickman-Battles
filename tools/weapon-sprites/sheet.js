// Tiles inhand.js crops into one labelled contact sheet. inhand.js already
// centres each crop on the fighter using the live draw transform.
const fs=require('fs'),path=require('path');
const pptr=require('/Users/aarushgupta/Developer/Personal/Stickman-Battles/node_modules/puppeteer');
const dir=process.argv[2], keys=process.argv.slice(3);
(async()=>{
  const b=await pptr.launch({headless:'new'});const p=await b.newPage();
  await p.setContent('<body style="margin:0">');
  const imgs=keys.map(k=>({k,d:fs.readFileSync(path.join(dir,k+'-crop.png')).toString('base64')}));
  const png=await p.evaluate(async(imgs)=>{
    const CW=460,CH=420,COLS=4;
    const rows=Math.ceil(imgs.length/COLS);
    const out=document.createElement('canvas');
    out.width=CW*Math.min(COLS,imgs.length); out.height=(CH+30)*rows;
    const o=out.getContext('2d');
    o.fillStyle='#1b1b1b';o.fillRect(0,0,out.width,out.height);
    for(let i=0;i<imgs.length;i++){
      const im=new Image();im.src='data:image/png;base64,'+imgs[i].d;await im.decode();
      const gx=(i%COLS)*CW, gy=Math.floor(i/COLS)*(CH+30);
      o.drawImage(im,0,0,im.width,im.height,gx,gy+30,CW,CH);
      o.fillStyle='#fff';o.font='bold 20px monospace';o.fillText(imgs[i].k,gx+10,gy+22);
    }
    return out.toDataURL('image/png').split(',')[1];
  },imgs);
  fs.writeFileSync(path.join(dir,'sheet.png'),Buffer.from(png,'base64'));
  await b.close();console.log('ok');
})();
