// Composites sprite PNGs onto a grey sheet at 4x so they can be eyeballed.
const fs=require('fs'),path=require('path'),puppeteer=require('/Users/aarushgupta/Developer/Personal/Stickman-Battles/node_modules/puppeteer');
const keys=process.argv.slice(2);
const dir='/Users/aarushgupta/Developer/Personal/Stickman-Battles/images/weapons';
(async()=>{
  const b=await puppeteer.launch({headless:'new'});const p=await b.newPage();
  await p.setContent('<body style="margin:0">');
  const imgs=keys.map(k=>({k,d:fs.readFileSync(path.join(dir,k+'.png')).toString('base64')}));
  const png=await p.evaluate(async(imgs)=>{
    const SC=4,PADX=20,ROW=200;
    const c=document.createElement('canvas');c.width=128*SC+PADX*2;c.height=ROW*imgs.length;
    const x=c.getContext('2d');x.imageSmoothingEnabled=false;
    x.fillStyle='#6b7280';x.fillRect(0,0,c.width,c.height);
    for(let i=0;i<imgs.length;i++){
      const im=new Image();im.src='data:image/png;base64,'+imgs[i].d;await im.decode();
      const y=i*ROW+(ROW-im.height*SC)/2;
      x.drawImage(im,PADX,y,im.width*SC,im.height*SC);
      x.fillStyle='#fff';x.font='16px monospace';x.fillText(imgs[i].k,6,i*ROW+18);
      x.strokeStyle='rgba(255,255,255,.3)';x.strokeRect(PADX,y,im.width*SC,im.height*SC);
    }
    return c.toDataURL('image/png').split(',')[1];
  },imgs);
  fs.writeFileSync(path.join(require('os').tmpdir(),'preview.png'),Buffer.from(png,'base64'));
  await b.close();console.log('ok');
})();
