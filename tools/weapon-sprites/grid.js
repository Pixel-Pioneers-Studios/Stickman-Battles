// Grid contact sheet of every rendered sprite, each cell scaled so the sprite
// fills it — so a tall sprite and a thin one are judged at comparable size.
const fs=require('fs'),path=require('path');
const pptr=require('/Users/aarushgupta/Documents/Stickman-Battles/node_modules/puppeteer');
const dir=process.argv[2];
const keys=process.argv.slice(3).length?process.argv.slice(3)
  :fs.readdirSync(dir).filter(f=>f.endsWith('.png')).map(f=>f.replace('.png',''));
(async()=>{
  const b=await pptr.launch({headless:'new'});const p=await b.newPage();
  await p.setContent('<body style="margin:0">');
  const imgs=keys.map(k=>({k,d:fs.readFileSync(path.join(dir,k+'.png')).toString('base64')}));
  const png=await p.evaluate(async(imgs)=>{
    const COLS=4,CW=440,CH=260;
    const rows=Math.ceil(imgs.length/COLS);
    const c=document.createElement('canvas');c.width=COLS*CW;c.height=rows*CH;
    const x=c.getContext('2d');x.imageSmoothingEnabled=false;
    x.fillStyle='#5b6470';x.fillRect(0,0,c.width,c.height);
    for(let i=0;i<imgs.length;i++){
      const im=new Image();im.src='data:image/png;base64,'+imgs[i].d;await im.decode();
      const cx=(i%COLS)*CW, cy=Math.floor(i/COLS)*CH;
      x.strokeStyle='rgba(0,0,0,.25)';x.strokeRect(cx+.5,cy+.5,CW-1,CH-1);
      const s=Math.min((CW-40)/im.width,(CH-60)/im.height);
      const w=im.width*s,h=im.height*s;
      x.drawImage(im,cx+(CW-w)/2,cy+30+(CH-40-h)/2,w,h);
      x.fillStyle='#fff';x.font='bold 19px monospace';x.fillText(imgs[i].k,cx+10,cy+22);
      x.fillStyle='rgba(255,255,255,.55)';x.font='13px monospace';
      x.fillText(im.width+'x'+im.height,cx+CW-90,cy+22);
    }
    return c.toDataURL('image/png').split(',')[1];
  },imgs);
  fs.writeFileSync(path.join(dir,'_grid.png'),Buffer.from(png,'base64'));
  await b.close();console.log('ok');
})();
