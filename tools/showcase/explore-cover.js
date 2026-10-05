// Exploratory: stage the domain + clash and dump frames to see what reads.
const { launch } = require('./harness');
const OUT = process.argv[2], ARENA = process.argv[3] || 'void';
(async () => {
  const h = await launch({ width: 1920, height: 1080 });
  const info = await h.eval((arena) => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    selectMode('2p'); p1IsBot = false; p2IsBot = false; p2IsNone = false;
    set('p1Weapon', 'sword'); set('p1Class', 'none'); set('p2Weapon', 'nullblade'); set('p2Class', 'none');
    selectArena(arena); startGame();
    return { opts: [...document.getElementById('p2Weapon').options].map(o => o.value).join(',') };
  }, ARENA);
  console.log(info.opts);
  await new Promise(r => setTimeout(r, 2500));
  await h.manual();
  const st = await h.eval(() => {
    const [a, b] = players;
    a.x = 360; b.x = 500; a.facing = 1; b.facing = -1;
    b._domainKey = 'sovereign';
    DomainManager.triggerExpansion(b);
    return { a: [a.weapon.key || a.weapon.name, a.color], b: [b.weapon.key || b.weapon.name, b.color], arena: currentArenaKey };
  });
  console.log(JSON.stringify(st));
  let f = 0;
  for (const at of [40, 150, 290, 330, 420]) {
    await h.step(at - f); f = at;
    await h.shot(`${OUT}/f${at}.png`);
  }
  // clash: both swing on the same frame
  await h.eval(() => { const [a, b] = players; a.x = b.x - 70; a.facing = 1; b.facing = -1; a.cooldown = b.cooldown = 0; a.attack(b); b.attack(a); });
  for (let i = 1; i <= 12; i++) { await h.step(1); if (i % 2 === 0) await h.shot(`${OUT}/c${i}.png`); }
  console.log('errors', h.errors.slice(0, 5));
  await h.close();
})().catch(e => { console.error(e); process.exit(1); });
