// Side-by-side sheet: current style (left) vs grounded style (right), at 4x,
// with a 1x strip underneath at the size the game actually draws.
const fs=require('fs'),path=require('path');
const puppeteer=require('/Users/aarushgupta/Documents/Stickman-Battles/node_modules/puppeteer');
const A=process.argv[2], B=process.argv[3], keys=process.argv.slice(4);
const rd=(d,k)=>fs.readFileSync(path.join(d,k+'.png')).toString('base64');
(async()=>{
  const b=await puppeteer.launch({headless:'new'});const p=await b.newPage();
  await p.setContent('<body style="margin:0">');
  const imgs=keys.map(k=>({k,a:rd(A,k),b:rd(B,k)}));
  const png=await p.evaluate(async(imgs)=>{
    const SC=4,COL=128*SC+40,ROW=210;
    const c=document.createElement('canvas');c.width=COL*2;c.height=ROW*imgs.length+40;
    const x=c.getContext('2d');x.imageSmoothingEnabled=false;
    x.fillStyle='#5b6470';x.fillRect(0,0,c.width,c.height);
    x.fillStyle='#fff';x.font='bold 20px monospace';
    x.fillText('CURRENT',20,28);x.fillText('GROUNDED',COL+20,28);
    for(let i=0;i<imgs.length;i++){
      const y0=40+i*ROW;
      x.fillStyle='rgba(255,255,255,.75)';x.font='15px monospace';x.fillText(imgs[i].k,8,y0+16);
      for(const[side,key]of[[0,'a'],[1,'b']]){
        const im=new Image();im.src='data:image/png;base64,'+imgs[i][key];await im.decode();
        const y=y0+24+(ROW-50-im.height*SC)/2;
        x.drawImage(im,side*COL+20,y,im.width*SC,im.height*SC);
        // 1x strip: what the player actually sees
        x.drawImage(im,side*COL+20,y0+ROW-30,im.width*0.45,im.height*0.45);
      }
    }
    return c.toDataURL('image/png').split(',')[1];
  },imgs);
  fs.writeFileSync(process.env.OUTP,Buffer.from(png,'base64'));
  await b.close();console.log('ok');
})();
