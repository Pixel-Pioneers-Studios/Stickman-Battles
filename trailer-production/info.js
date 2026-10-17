'use strict';
// Dumps the facts the trailer copy is allowed to state, read from the running game.
const path = require('path');
const { openSession } = require(path.resolve(__dirname, '..', 'tools', 'showcase', 'session.js'));
(async () => {
  const s = await openSession({ width: 1280, height: 720, port: 8181 });
  const info = await s.eval(() => {
    const o = {};
    o.weapons = typeof WEAPON_KEYS !== 'undefined' ? WEAPON_KEYS : Object.keys(WEAPONS);
    o.allWeapons = Object.keys(WEAPONS);
    o.classes = Object.keys(CLASSES);
    o.arenas = Object.keys(ARENAS);
    o.chapters = STORY_CHAPTER_REGISTRY.length;
    o.moveFinishers = typeof MOVE_FINISHERS !== 'undefined' ? Object.keys(MOVE_FINISHERS) : null;
    o.modes = [...document.querySelectorAll('[onclick*="selectMode"]')].map(e => e.getAttribute('onclick'));
    o.canvas = [canvas.width, canvas.height];
    o.sov = typeof SovereignControl !== 'undefined';
    o.domain = typeof DomainManager !== 'undefined';
    o.version = typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : document.title;
    return o;
  });
  console.log(JSON.stringify(info, null, 1));
  await s.close();
})().catch(e => { console.error(e); process.exit(1); });
