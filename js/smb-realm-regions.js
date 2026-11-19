'use strict';
// smb-realm-regions.js: realm side areas for story chapters 1-50 (registry ids 0-49), the God of War retrofit
// (docs/god-of-war-plan.md, "Retrofit: chapters 1-50"). Same data format as REALM_DEFS / REALM_STORY in
// smb-realm.js (read its header for every part); this file only adds entries.
//
// Three relics tie the chapters together. Each is found at the end of a dungeon and kept in the story save
// (_story2.relics). Seam doors (art 'seam') in other chapters only open for the relic they need, most of them in
// chapters you have already walked through, so the fragment's trail and the beacons have somewhere to take you:
//   seamkey   Veran's seam key       ch13 (id 12) workshop  opens seams in ch2, 4, 6, 8   (ids 1, 3, 5, 7)
//   coil      the collector coil     ch26 (id 25) node      opens seams in ch11, 18, 19, 22, 25 (ids 10, 17, 18, 21, 24)
//   resonator the core resonator     ch38 (id 37) chamber   opens seams in ch30, 32, 34, 39, 45 (ids 29, 31, 33, 38, 44)
// Seam canon: these are thin places in the fabric. The relics are tools that hold one open; Kael does not act on
// law here (docs/canon.md, three steps).
//
// Entrance x is in the chapter world's coordinates. Chapters 32-35 (ids) share one region world 24000 wide,
// so their entrances use region x (smb-realm.js picks the realm by the segment the player stands in).
//
// Depends on: smb-realm.js (REALM_DEFS, REALM_STORY).

(function () {
  // Palettes: [wall, stone base, stone top].
  var CITY = ['#1e2228', '#3a4048', '#5a626c'];
  var SEAM = ['#120c1e', '#2e2448', '#4a3a70'];
  var NET  = ['#100c1c', '#2a2240', '#40345e'];
  var CORE = ['#0c121c', '#24324a', '#3a5070'];
  var WOOD = ['#13200f', '#2e3a22', '#4a5a36'];
  var ICE  = ['#141e28', '#4a6070', '#8aa8bc'];
  function room(o, pal) {
    o.back = true;
    if (!o.wall) o.wall = pal[0];
    if (!o.stone) o.stone = [pal[1], pal[2]];
    return o;
  }
  function seamLocked(relic) {
    if (relic === 'seamkey') return 'A seam in the air, too thin to hold open by hand. Something of Veran\'s might do it.';
    if (relic === 'coil') return 'A seam, cold and dead. It needs power from somewhere.';
    return 'A seam ringing at a pitch you cannot match.';
  }
  // One realm per chapter area: def = REALM_DEFS entry, at = { ch, x, art, needs }.
  function area(key, def, at) {
    REALM_DEFS[key] = def;
    var e = { id: key, ch: at.ch, x: at.x, art: at.art || 'temple', room: def.start.room, door: def.start.door };
    if (at.needs) { e.needs = 'relic:' + at.needs; e.lockedText = seamLocked(at.needs); }
    REALM_STORY[key] = { chapters: [at.ch], entrances: [e], gates: [] };
    // A relic dungeon holds the chapter exit until its relic is found, so every player leaves with it.
    if (at.exitNeeds) {
      REALM_STORY[key].exitNeeds = {};
      REALM_STORY[key].exitNeeds[at.ch] = at.exitNeeds;
      REALM_STORY[key].exitReason = at.exitReason;
      def.route = Object.keys(def.rooms);
    }
  }

  // ── Act 0: the home city (ids 0-12) ─────────────────────────────────────────────────────────────────────────

  // ch1 (id 0): the tutorial chapter. One cellar that teaches F, chests and breakable walls.
  area('cellar0', {
    name: 'Yard Cellar', theme: 'city', start: { room: 'cellar', door: 'in' },
    rooms: {
      cellar: room({
        name: 'The Cellar', gx: 0, gy: 0, w: 1100, dark: 0.2,
        say: 'A cellar under the yard. Press F at a chest to open it. The cracked wall will break if you hit it.',
        chests: [{ id: 'jar', x: 420, gives: 'tokens:15' }, { id: 'tin', x: 960, gives: 'exp:25' }],
        cracks: [{ id: 'old', x: 760, hits: 3 }],
        ledges: [[300, 450, 120]],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'cellar', to: ['@main', 'cellar0'] }],
      }, CITY),
    },
  }, { ch: 0, x: 2250, art: 'cellar' });

  // ch2 (id 1): stealth alley. A seam pocket behind a sentry line (seam key).
  area('pocket1', {
    name: 'Alley Pocket', theme: 'homeAlley', start: { room: 'pocket', door: 'in' },
    rooms: {
      pocket: room({
        name: 'Pocket Under the Alley', gx: 0, gy: 0, w: 1300, dark: 0.3,
        say: 'A piece of the alley, folded away. The street ends in nothing and two slabs drift across it.',
        floor: [[0, 340], [1000, 1300]],
        movers: [
          { id: 'a', x0: 350, x1: 560, y: 520, w: 130, speed: 1.6, wait: 80 },
          { id: 'b', x0: 600, x1: 860, y: 480, w: 130, speed: 1.8, wait: 80, start: 'x1' },
        ],
        chests: [{ id: 'cache', x: 1150, gives: 'tokens:50' }, { id: 'notes', x: 1220, gives: 'exp:60' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'seam', to: ['@main', 'pocket1'] }],
      }, SEAM),
    },
  }, { ch: 1, x: 880, art: 'seam', needs: 'seamkey' });

  // ch3 (id 2): the suburb. A garage with one block, one plate.
  area('garage2', {
    name: 'The Garage', theme: 'city', start: { room: 'garage', door: 'in' },
    rooms: {
      garage: room({
        name: 'Neighbour\'s Garage', gx: 0, gy: 0, w: 1100, dark: 0.2,
        say: 'The door is jammed by a security bar. The bar runs off a pressure plate. There is a lot of heavy junk.',
        blocks: [{ id: 'box', x: 360 }],
        plates: [{ id: 'p', x: 600, latch: true }],
        bars: [{ id: 'bar', x: 800, when: 'plate:p' }],
        chests: [{ id: 'tools', x: 880, gives: 'tokens:25' }, { id: 'kit', x: 940, gives: 'health' }],
        npcs: [{ kind: 'shop', x: 1030 }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'cellar', to: ['@main', 'garage2'] }],
      }, CITY),
    },
  }, { ch: 2, x: 3950, art: 'cellar' });

  // ch4 (id 3): escape through the collapsing block. Only on a return trip: a seam pocket (seam key).
  area('pocket3', {
    name: 'The Folded Block', theme: 'city', start: { room: 'fold', door: 'in' },
    rooms: {
      fold: room({
        name: 'The Folded Block', gx: 0, gy: 0, w: 1400, dark: 0.3,
        say: 'The collapse folded this street over on itself. Pieces of it still swing.',
        swings: [
          { id: 'a', x: 480, y: 200, len: 310, amp: 0.85, period: 140, phase: 0 },
          { id: 'b', x: 820, y: 200, len: 310, amp: 0.85, period: 140, phase: 0.5 },
        ],
        ledges: [[1050, 440, 140]],
        chests: [{ id: 'safe', x: 1120, y: 440, gives: 'tokens:60' }, { id: 'pack', x: 1280, gives: 'exp:70' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'seam', to: ['@main', 'pocket3'] }],
      }, SEAM),
    },
  }, { ch: 3, x: 2900, art: 'seam', needs: 'seamkey' });

  // ch5 (id 4): rooftops. A water tower with a working lift.
  area('tower4', {
    name: 'Water Tower', theme: 'homeRooftop', start: { room: 'tower', door: 'in' },
    rooms: {
      tower: room({
        name: 'Inside the Water Tower', gx: 0, gy: 0, w: 1100, dark: 0.25,
        say: 'The maintenance lift still runs. Someone left something up top.',
        lifts: [{ id: 'up', x: 420, w: 120, y0: 520, y1: 280 }],
        ledges: [[540, 280, 320]],
        chests: [{ id: 'top', x: 780, y: 280, gives: 'exp:35' }, { id: 'floor', x: 980, gives: 'tokens:20' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'cellar', to: ['@main', 'tower4'] }],
        foes: [{ x: 860, name: 'Rooftop Scout', weaponKey: 'sword', classKey: 'none', aiDiff: 'easy', color: '#88aacc' }],
      }, CITY),
    },
  }, { ch: 4, x: 2250, art: 'cellar' });

  // ch6 (id 5): rooftop scavenge. Seam pocket with an updraft (seam key).
  area('pocket5', {
    name: 'Rooftop Pocket', theme: 'homeRooftop', start: { room: 'draft', door: 'in' },
    rooms: {
      draft: room({
        name: 'The Updraft', gx: 0, gy: 0, w: 1200, dark: 0.3,
        say: 'Wind pours up out of the fold, hard enough to stand on.',
        spikes: [[480, 680]],
        vents: [{ id: 'v', x: 560, w: 110, top: 170 }],
        ledges: [[700, 220, 380]],
        chests: [{ id: 'high', x: 900, y: 220, gives: 'exp:80' }, { id: 'stash', x: 1020, y: 220, gives: 'tokens:50' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'seam', to: ['@main', 'pocket5'] }],
      }, SEAM),
    },
  }, { ch: 5, x: 1850, art: 'seam', needs: 'seamkey' });

  // ch7 (id 6): ground zero. Down into a collapsed subway: crumbling platform, then a dark tunnel.
  area('subway6', {
    name: 'Collapsed Subway', theme: 'city', start: { room: 'platform', door: 'in' },
    rooms: {
      platform: room({
        name: 'Broken Platform', gx: 0, gy: 0, w: 1300, dark: 0.3,
        say: 'The platform edge fell onto the tracks. The live rail is still live.',
        spikes: [[340, 1000]],
        crumbles: [{ id: 'a', x: 360, y: 460, w: 120 }, { id: 'b', x: 560, y: 430, w: 120 }, { id: 'c', x: 780, y: 450, w: 120 }],
        chests: [{ id: 'ticket', x: 1150, gives: 'tokens:25' }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'hatch', to: ['@main', 'subway6'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['tunnel', 'in'] },
        ],
      }, CITY),
      tunnel: room({
        name: 'Dark Tunnel', gx: 1, gy: 0, w: 1200, lightless: 0.9,
        say: 'No power down here. There are old work lamps on the walls.',
        torches: [{ id: 't1', x: 330 }, { id: 't2', x: 760 }],
        chests: [{ id: 'crew', x: 1000, gives: 'exp:45' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['platform', 'next'] },
          { id: 'up', kind: 'arch', x: 1110, art: 'ladder', to: ['@main', 'subway6'] },
        ],
        foes: [
          { x: 640, name: 'Tunnel Scavenger', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'easy', color: '#7a6a5a' },
          { x: 880, name: 'Tunnel Scavenger', weaponKey: 'sword', classKey: 'none', aiDiff: 'medium', color: '#6a5a4a' },
        ],
      }, CITY),
    },
  }, { ch: 6, x: 5250, art: 'hatch' });

  // ch8 (id 7): the long walk. Seam pocket with ledges that give way and a guard (seam key).
  area('pocket7', {
    name: 'The Long Way Round', theme: 'city', start: { room: 'way', door: 'in' },
    rooms: {
      way: room({
        name: 'The Long Way Round', gx: 0, gy: 0, w: 1500, dark: 0.3,
        say: 'A street that keeps going after the city stops. Somebody waited here a long time.',
        spikes: [[300, 900]],
        crumbles: [{ id: 'a', x: 320, y: 450, w: 110 }, { id: 'b', x: 500, y: 410, w: 110 }, { id: 'c', x: 690, y: 440, w: 110 }],
        chests: [{ id: 'bench', x: 1360, gives: 'exp:90' }, { id: 'coat', x: 1280, gives: 'tokens:60' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'seam', to: ['@main', 'pocket7'] }],
        foes: [{ x: 1150, name: 'Fold Warden', weaponKey: 'hammer', classKey: 'warrior', aiDiff: 'medium', color: '#5a4a80', health: 150 }],
      }, SEAM),
    },
  }, { ch: 7, x: 3400, art: 'seam', needs: 'seamkey' });

  // ch10 (id 9): Veran's archive node. A timed plate run through the stacks.
  area('stacks9', {
    name: 'Archive Stacks', theme: 'city', start: { room: 'stacks', door: 'in' },
    rooms: {
      stacks: room({
        name: 'Veran\'s Stacks', gx: 0, gy: 0, w: 1300, dark: 0.25,
        say: 'The archive gate only stays up while the plate is weighed down. Then it starts to close.',
        plates: [{ id: 'run', x: 220, hold: 260 }],
        steps: [[520, 60, 60], [760, 80, 60]],
        bars: [{ id: 'gate', x: 1000, when: 'plate:run' }],
        chests: [{ id: 'files', x: 1140, gives: 'exp:45' }, { id: 'petty', x: 1210, gives: 'tokens:30' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'labdoor', to: ['@main', 'stacks9'] }],
      }, CITY),
    },
  }, { ch: 9, x: 2200, art: 'labdoor' });

  // ch11 (id 10): the lava crossing. A cooled seam pocket (coil).
  area('pocket10', {
    name: 'Cooled Pocket', theme: 'volcano', start: { room: 'cool', door: 'in' },
    rooms: {
      cool: room({
        name: 'Cooled Pocket', gx: 0, gy: 0, w: 1400, dark: 0.3, wall: '#1e0c0a', stone: ['#4a2a20', '#6a3a28'],
        say: 'Lava, frozen mid-flow the moment the seam closed on it. Slabs of crust still drift on the hot part.',
        spikes: [[300, 1080]],
        movers: [
          { id: 'a', x0: 300, x1: 600, y: 490, w: 130, speed: 1.9, wait: 50 },
          { id: 'b', x0: 680, x1: 940, y: 450, w: 130, speed: 2.1, wait: 50, start: 'x1' },
        ],
        chests: [{ id: 'glass', x: 1200, gives: 'tokens:70' }, { id: 'ember', x: 1290, gives: 'exp:90' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'seam', to: ['@main', 'pocket10'] }],
      }, SEAM),
    },
  }, { ch: 10, x: 4180, art: 'seam', needs: 'coil' });

  // ch12 (id 11): the relay station. A substation: restore power, ride the lift, deal with the guards.
  area('substation11', {
    name: 'Relay Substation', theme: 'storyRelay', start: { room: 'sub', door: 'in' },
    rooms: {
      sub: room({
        name: 'Substation', gx: 0, gy: 0, w: 1300, dark: 0.3, wall: '#1a2224',
        say: 'The service lift is dead. The breaker lever is behind the relay guards.',
        levers: [{ id: 'power', x: 1180, when: 'clear', line: 'The lift hums. Power is back.' }],
        lifts: [{ id: 'svc', x: 300, w: 120, y0: 520, y1: 250, when: 'lever:power', shuttle: true }],
        ledges: [[420, 250, 260]],
        chests: [{ id: 'spare', x: 600, y: 250, gives: 'exp:55' }, { id: 'locker', x: 1000, gives: 'tokens:35' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'labdoor', to: ['@main', 'substation11'] }],
        foes: [
          { x: 800, name: 'Relay Guard', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'medium', color: '#447788' },
          { x: 960, name: 'Relay Guard', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'medium', color: '#336677' },
        ],
      }, CITY),
    },
  }, { ch: 11, x: 1050, art: 'labdoor' });

  // ch13 (id 12): what Veran knew. Veran's workshop, three rooms, and the seam key.
  area('workshop12', {
    name: 'Veran\'s Workshop', theme: 'storyRelay', start: { room: 'stair', door: 'in' },
    rooms: {
      stair: room({
        name: 'Workshop Stairs', gx: 0, gy: 0, w: 1300, dark: 0.3, wall: '#1a2022',
        say: 'Under the relay, a door Veran never mentioned. The stairs are blocked by a wall that was not built to last.',
        steps: [[300, 50, 70], [460, 100, 70]],
        cracks: [{ id: 'wall', x: 760, hits: 4 }],
        blocks: [{ id: 'crate', x: 900 }],
        plates: [{ id: 'p', x: 1080, latch: true }],
        bars: [{ id: 'bar', x: 1220, when: 'plate:p' }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'labdoor', to: ['@main', 'workshop12'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['tuning', 'in'] },
        ],
      }, CITY),
      tuning: room({
        name: 'The Tuning Room', gx: 1, gy: 0, w: 1300, dark: 0.3, wall: '#1c1a26',
        say: 'Tuning forks the size of doors, all humming at slightly different pitches. Someone left guards here.',
        ledges: [[260, 430, 150], [820, 430, 150]],
        levers: [{ id: 'fork', x: 1120, when: 'clear', line: 'The forks fall silent. The bench door unlocks.' }],
        bars: [{ id: 'bench', x: 1220, when: 'lever:fork' }],
        chests: [{ id: 'reed', x: 895, y: 430, gives: 'tokens:40' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['stair', 'next'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['bench', 'in'] },
        ],
        foes: [
          { x: 700, name: 'Workshop Sentinel', weaponKey: 'hammer', classKey: 'warrior', aiDiff: 'medium', color: '#667788', health: 140 },
          { x: 900, name: 'Fracture Scout', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'medium', color: '#7799bb' },
        ],
      }, CITY),
      bench: room({
        name: 'Veran\'s Bench', gx: 2, gy: 0, w: 1000, dark: 0.2, wall: '#1e1c22',
        say: 'Veran\'s bench. Notes on every seam in the city, and the tool that opens them.',
        chests: [
          { id: 'key', x: 520, gives: 'relic:seamkey', label: 'VERAN\'S SEAM KEY',
            line: 'It holds a seam open long enough to step through. You passed seams like this: the alley, the folded block, the rooftop, the long walk.' },
          { id: 'notes', x: 700, gives: 'exp:70' },
        ],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['tuning', 'next'] },
          { id: 'up', kind: 'arch', x: 900, art: 'ladder', to: ['@main', 'workshop12'] },
        ],
      }, CITY),
    },
  }, { ch: 12, x: 3950, art: 'labdoor', exitNeeds: 'relic:seamkey', exitReason: 'Veran\'s workshop is still sealed below the relay' });

  // ── Act 1: the fracture network (ids 17-31) ─────────────────────────────────────────────────────────────────

  // ch18 (id 17): between worlds. A seam pocket of updrafts (coil).
  area('pocket17', {
    name: 'Edge Pocket', theme: 'portalEdge', start: { room: 'drafts', door: 'in' },
    rooms: {
      drafts: room({
        name: 'Edge Pocket', gx: 0, gy: 0, w: 1300, dark: 0.3,
        say: 'The edge of the network, folded in. One draft still blows. A switch up there wakes the other.',
        spikes: [[300, 1300]],
        vents: [{ id: 'a', x: 320, w: 110, top: 290 }, { id: 'b', x: 700, w: 110, top: 160, when: 'lever:b' }],
        ledges: [[440, 330, 200], [820, 200, 400]],
        levers: [{ id: 'b', x: 600, y: 330, line: 'The second draft roars up.' }],
        chests: [{ id: 'coil', x: 1020, y: 200, gives: 'exp:90' }, { id: 'drift', x: 1140, y: 200, gives: 'tokens:70' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'seam', to: ['@main', 'pocket17'] }],
      }, SEAM),
    },
  }, { ch: 17, x: 4800, art: 'seam', needs: 'coil' });

  // ch19 (id 18): escape from the collapsing pocket. Only on a return trip (coil).
  area('pocket18', {
    name: 'Collapse Pocket', theme: 'storyCore', start: { room: 'fall', door: 'in' },
    rooms: {
      fall: room({
        name: 'Pocket in the Collapse', gx: 0, gy: 0, w: 1500, dark: 0.35,
        say: 'A piece of the pocket that never finished falling. Nothing here holds you for long.',
        spikes: [[280, 1240]],
        crumbles: [
          { id: 'a', x: 290, y: 460, w: 100 }, { id: 'b', x: 450, y: 420, w: 100 }, { id: 'c', x: 620, y: 380, w: 100 },
          { id: 'd', x: 800, y: 420, w: 100 }, { id: 'e', x: 970, y: 450, w: 100 }, { id: 'f', x: 1120, y: 420, w: 100 },
        ],
        ledges: [[640, 250, 90]],
        chests: [{ id: 'held', x: 685, y: 250, gives: 'tokens:60' }, { id: 'last', x: 1380, gives: 'exp:100' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'seam', to: ['@main', 'pocket18'] }],
      }, SEAM),
    },
  }, { ch: 18, x: 4050, art: 'seam', needs: 'coil' });

  // ch20 (id 19): mirror fracture. Two rooms: blocks and bars, then whatever is behind the glass.
  area('gallery19', {
    name: 'Mirror Gallery', theme: 'mirror', start: { room: 'hall', door: 'in' },
    rooms: {
      hall: room({
        name: 'Hall of Mirrors', gx: 0, gy: 0, w: 1500, dark: 0.25, wall: '#0e1824', stone: ['#2a3c50', '#4a6480'],
        say: 'Every mirror shows the room a little wrong. Two plates, two bars, two stones to carry.',
        blocks: [{ id: 'a', x: 380 }, { id: 'b', x: 1000 }],
        plates: [{ id: 'p1', x: 620, latch: true }, { id: 'p2', x: 1220, latch: true }],
        bars: [{ id: 'inner', x: 820, when: 'plate:p1' }, { id: 'out', x: 1400, when: 'plate:p2' }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'temple', to: ['@main', 'gallery19'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['glass', 'in'] },
        ],
      }, NET),
      glass: room({
        name: 'Behind the Glass', gx: 1, gy: 0, w: 1100, dark: 0.3, wall: '#0c1420', stone: ['#2a3c50', '#4a6480'],
        say: 'Your reflection did not stay in the mirror.',
        ledges: [[240, 430, 150], [740, 430, 150]],
        chests: [{ id: 'shard', x: 815, y: 430, gives: 'tokens:55' }, { id: 'silver', x: 960, gives: 'exp:80' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['hall', 'next'] },
          { id: 'up', kind: 'arch', x: 1010, art: 'ladder', to: ['@main', 'gallery19'] },
        ],
        foes: [{ x: 700, name: 'Your Reflection', weaponKey: 'sword', classKey: 'ninja', aiDiff: 'hard', color: '#88ccff', health: 160 }],
      }, NET),
    },
  }, { ch: 19, x: 2330, art: 'temple' });

  // ch22 (id 21): stealth approach. A sentry cache in the dark (coil).
  area('pocket21', {
    name: 'Sentry Cache', theme: 'portalEdge', start: { room: 'cache', door: 'in' },
    rooms: {
      cache: room({
        name: 'Sentry Cache', gx: 0, gy: 0, w: 1300, lightless: 0.94,
        say: 'Where the outer patrols keep what they take. They keep it in the dark.',
        torches: [{ id: 'a', x: 360 }, { id: 'b', x: 820 }],
        ledges: [[560, 450, 120], [980, 430, 150]],
        chests: [{ id: 'take', x: 1055, y: 430, gives: 'tokens:75' }, { id: 'log', x: 1200, gives: 'exp:95' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'seam', to: ['@main', 'pocket21'] }],
        foes: [
          { x: 700, name: 'Patrol Unit', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'hard', color: '#667788' },
          { x: 900, name: 'Patrol Unit', weaponKey: 'hammer', classKey: 'warrior', aiDiff: 'medium', color: '#556677' },
        ],
      }, SEAM),
    },
  }, { ch: 21, x: 1000, art: 'seam', needs: 'coil' });

  // ch23 (id 22): the void arena. A shelf of the collapsed dimension: drifting slabs, then ledges that give.
  area('shelf22', {
    name: 'Void Shelf', theme: 'storyCore', start: { room: 'drift', door: 'in' },
    rooms: {
      drift: room({
        name: 'The Drift', gx: 0, gy: 0, w: 1500, dark: 0.35,
        say: 'What is left of the dimension, in pieces. Do not look down. There is no down.',
        floor: [[0, 320], [1160, 1500]],
        movers: [
          { id: 'a', x0: 330, x1: 620, y: 500, w: 130, speed: 2.0, wait: 60 },
          { id: 'b', x0: 690, x1: 1010, y: 450, w: 130, speed: 2.2, wait: 60, start: 'x1' },
        ],
        ledges: [[730, 280, 110]],
        chests: [{ id: 'float', x: 785, y: 280, gives: 'tokens:40' }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'temple', to: ['@main', 'shelf22'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['ledge', 'in'] },
        ],
      }, NET),
      ledge: room({
        name: 'The Last Ledge', gx: 1, gy: 0, w: 1200, dark: 0.35,
        say: 'A ledge of the old arena. Something still guards it.',
        steps: [[300, 70, 60]],
        crumbles: [{ id: 'a', x: 480, y: 430, w: 110 }, { id: 'b', x: 660, y: 390, w: 110 }],
        ledges: [[840, 360, 160]],
        chests: [{ id: 'gold', x: 920, y: 360, gives: 'exp:70' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['drift', 'next'] },
          { id: 'up', kind: 'arch', x: 1110, art: 'ladder', to: ['@main', 'shelf22'] },
        ],
        foes: [{ x: 1000, name: 'Void Sentinel', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', color: '#443366', health: 150 }],
      }, NET),
    },
  }, { ch: 22, x: 5300, art: 'temple' });

  // ch25 (id 24): army of echoes. A hollow full of swinging debris and the echoes it shook loose (coil).
  area('pocket24', {
    name: 'Echo Hollow', theme: 'haunted', start: { room: 'hollow', door: 'in' },
    rooms: {
      hollow: room({
        name: 'Echo Hollow', gx: 0, gy: 0, w: 1500, dark: 0.35,
        say: 'The echoes here repeat the last thing that happened. Over and over.',
        swings: [
          { id: 'a', x: 420, y: 200, len: 310, amp: 0.9, period: 120, phase: 0 },
          { id: 'b', x: 700, y: 200, len: 310, amp: 0.9, period: 120, phase: 0.33 },
          { id: 'c', x: 980, y: 200, len: 310, amp: 0.9, period: 120, phase: 0.66 },
        ],
        chests: [{ id: 'echo', x: 1300, gives: 'exp:100' }, { id: 'ring', x: 1380, gives: 'tokens:70' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'seam', to: ['@main', 'pocket24'] }],
        foes: [
          { x: 1200, name: 'Echo', weaponKey: 'sword', classKey: 'ninja', aiDiff: 'hard', color: '#8a7aa8' },
          { x: 1320, name: 'Echo', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'medium', color: '#7a6a98' },
        ],
      }, SEAM),
    },
  }, { ch: 24, x: 2250, art: 'seam', needs: 'coil' });

  // ch26 (id 25): the collector's network. A dead collector node, three rooms, and the coil.
  area('node25', {
    name: 'Collector Node', theme: 'realmEntry', start: { room: 'intake', door: 'in' },
    rooms: {
      intake: room({
        name: 'Intake', gx: 0, gy: 0, w: 1300, dark: 0.3, wall: '#0a1020', stone: ['#1e2c44', '#34486a'],
        say: 'A collector node: it catches what falls out of the network. This one is dead. The draft needs weight on its plate.',
        blocks: [{ id: 'w', x: 360 }],
        plates: [{ id: 'p', x: 600, latch: true }],
        spikes: [[700, 1300]],
        vents: [{ id: 'up', x: 760, w: 110, top: 170, when: 'plate:p' }],
        ledges: [[880, 220, 420]],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'labdoor', to: ['@main', 'node25'] },
          { id: 'next', kind: 'arch', x: 1200, y: 220, art: 'labdoor', to: ['chamber', 'in'] },
        ],
      }, NET),
      chamber: room({
        name: 'Coil Chamber', gx: 1, gy: 0, w: 1300, dark: 0.3, wall: '#0a1020', stone: ['#1e2c44', '#34486a'],
        say: 'Drones still guard the chamber. Their master switch is behind them.',
        levers: [{ id: 'master', x: 1100, when: 'clear', line: 'The drones are down. The coil door unseals.' }],
        bars: [{ id: 'coil', x: 1220, when: 'lever:master' }],
        ledges: [[300, 430, 150], [760, 430, 150]],
        chests: [{ id: 'spare', x: 375, y: 430, gives: 'tokens:50' }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'labdoor', to: ['intake', 'next'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['coil', 'in'] },
        ],
        foes: [
          { x: 700, name: 'Collector Drone', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', color: '#4466aa' },
          { x: 860, name: 'Collector Drone', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'medium', color: '#3a5a9a' },
          { x: 980, name: 'Node Keeper', weaponKey: 'hammer', classKey: 'thor', aiDiff: 'hard', color: '#2a4a8a', health: 180, armor: ['helmet'] },
        ],
      }, NET),
      coil: room({
        name: 'The Coil', gx: 2, gy: 0, w: 1000, dark: 0.2, wall: '#0c1428', stone: ['#1e2c44', '#34486a'],
        say: 'The node\'s coil, still warm. Everything the network caught ran through this.',
        chests: [
          { id: 'coil', x: 520, gives: 'relic:coil', label: 'COLLECTOR COIL',
            line: 'Dead seams take power from it. You passed some: the lava crossing, the edge of the network, the collapsing pocket, the approach, the echo corridor.' },
          { id: 'log', x: 360, gives: 'exp:90' },
        ],
        npcs: [{ kind: 'shop', x: 760 }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['chamber', 'next'] },
          { id: 'up', kind: 'arch', x: 900, art: 'ladder', to: ['@main', 'node25'] },
        ],
      }, NET),
    },
  }, { ch: 25, x: 4500, art: 'labdoor', exitNeeds: 'relic:coil', exitReason: 'the collector node is still dead' });

  // ch27 (id 26): the gate. Under the colosseum stands: holding cells, then the champion's cell.
  area('stands26', {
    name: 'Under the Stands', theme: 'colosseum', start: { room: 'cells', door: 'in' },
    rooms: {
      cells: room({
        name: 'Holding Cells', gx: 0, gy: 0, w: 1400, dark: 0.3, wall: '#22180e', stone: ['#5a4430', '#7a6044'],
        say: 'Where the gate kept its fighters between bouts. The keys are on the jailers.',
        levers: [{ id: 'cells', x: 1200, when: 'clear', line: 'The cell gate rattles up.' }],
        bars: [{ id: 'cell', x: 1310, when: 'lever:cells' }],
        ledges: [[400, 430, 150]],
        chests: [{ id: 'purse', x: 475, y: 430, gives: 'tokens:45' }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'temple', to: ['@main', 'stands26'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['champ', 'in'] },
        ],
        foes: [
          { x: 800, name: 'Jailer', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'medium', color: '#8a6a3a' },
          { x: 1000, name: 'Jailer', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'medium', color: '#7a5a2a' },
        ],
      }, NET),
      champ: room({
        name: 'The Champion\'s Cell', gx: 1, gy: 0, w: 1100, dark: 0.3, wall: '#24180e', stone: ['#5a4430', '#7a6044'],
        say: 'One cell was never opened. Its fighter is still waiting for the bout.',
        chests: [{ id: 'belt', x: 950, gives: 'exp:90' }, { id: 'prize', x: 1020, gives: 'tokens:60' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['cells', 'next'] },
          { id: 'up', kind: 'arch', x: 110, art: 'ladder', to: ['@main', 'stands26'] },
        ],
        foes: [{ x: 760, name: 'Unbouted Champion', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', color: '#aa7a2a', health: 200, armor: ['helmet', 'chestplate'] }],
      }, NET),
    },
  }, { ch: 26, x: 2200, art: 'temple' });

  // ch28 (id 27): creator's mark. A wall to break, ledges that give, and a gate on a timer.
  area('mark27', {
    name: 'Mark Chamber', theme: 'warpzone', start: { room: 'mark', door: 'in' },
    rooms: {
      mark: room({
        name: 'Mark Chamber', gx: 0, gy: 0, w: 1600, dark: 0.3,
        say: 'The Creator\'s mark is cut deep into every wall. One wall is only plaster over the mark.',
        cracks: [{ id: 'plaster', x: 380, hits: 5 }],
        spikes: [[520, 900]],
        crumbles: [{ id: 'a', x: 530, y: 450, w: 110 }, { id: 'b', x: 720, y: 420, w: 110 }],
        plates: [{ id: 'run', x: 1000, hold: 220 }],
        steps: [[1200, 70, 60]],
        bars: [{ id: 'mark', x: 1420, when: 'plate:run' }],
        chests: [{ id: 'cut', x: 1500, gives: 'exp:75' }, { id: 'ink', x: 1560, gives: 'tokens:50' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'temple', to: ['@main', 'mark27'] }],
      }, NET),
    },
  }, { ch: 27, x: 2700, art: 'temple' });

  // ch30 (id 29): deep fragment. A crucible pocket (resonator).
  area('pocket29', {
    name: 'Crucible Pocket', theme: 'volcano', start: { room: 'pit', door: 'in' },
    rooms: {
      pit: room({
        name: 'Crucible Pocket', gx: 0, gy: 0, w: 1500, dark: 0.35, wall: '#1e0810', stone: ['#4a2030', '#6a3048'],
        say: 'The crucible remembers everyone who came through it. Two of them never left.',
        spikes: [[300, 860]],
        crumbles: [{ id: 'a', x: 310, y: 450, w: 110 }, { id: 'b', x: 500, y: 410, w: 110 }, { id: 'c', x: 690, y: 440, w: 110 }],
        ledges: [[1180, 430, 150]],
        chests: [{ id: 'slag', x: 1255, y: 430, gives: 'tokens:80' }, { id: 'core', x: 1420, gives: 'exp:110' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'seam', to: ['@main', 'pocket29'] }],
        foes: [
          { x: 1050, name: 'Crucible Remnant', weaponKey: 'hammer', classKey: 'thor', aiDiff: 'hard', color: '#880044', health: 190 },
          { x: 1250, name: 'Crucible Remnant', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', color: '#660033' },
        ],
      }, SEAM),
    },
  }, { ch: 29, x: 4000, art: 'seam', needs: 'resonator' });

  // ── Act 2: the multiversal core (ids 31-38, 47-48) ──────────────────────────────────────────────────────────

  // ch32 (id 31): core entry. A dark pocket off the eye (resonator).
  area('pocket31', {
    name: 'Eye Pocket', theme: 'storyCore', start: { room: 'dark', door: 'in' },
    rooms: {
      dark: room({
        name: 'Eye Pocket', gx: 0, gy: 0, w: 1400, lightless: 0.95,
        say: 'The eye looked away from this place once. It has been dark ever since.',
        spikes: [[460, 640], [860, 1060]],
        ledges: [[540, 450, 110], [940, 450, 110]],
        torches: [{ id: 'a', x: 300 }, { id: 'b', x: 760 }, { id: 'c', x: 1200 }],
        chests: [{ id: 'lid', x: 995, y: 450, gives: 'tokens:80' }, { id: 'iris', x: 1300, gives: 'exp:110' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'seam', to: ['@main', 'pocket31'] }],
      }, SEAM),
    },
  }, { ch: 31, x: 4100, art: 'seam', needs: 'resonator' });

  // ch33 (id 32), region x: the flux zone. A vault where the gravity flux pools.
  area('flux32', {
    name: 'Flux Vault', theme: 'space', start: { room: 'well', door: 'in' },
    rooms: {
      well: room({
        name: 'The Flux Well', gx: 0, gy: 0, w: 1400, dark: 0.3,
        say: 'The flux pools here and pushes up. Ride it.',
        spikes: [[300, 1400]],
        vents: [{ id: 'a', x: 320, w: 110, top: 330 }, { id: 'b', x: 640, w: 110, top: 230 }, { id: 'c', x: 960, w: 110, top: 150 }],
        ledges: [[440, 370, 160], [760, 270, 160], [1080, 200, 320]],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'temple', to: ['@main', 'flux32'] },
          { id: 'next', kind: 'arch', x: 1300, y: 200, art: 'temple', to: ['vault', 'in'] },
        ],
      }, CORE),
      vault: room({
        name: 'Flux Vault', gx: 1, gy: 0, w: 1100, dark: 0.3,
        say: 'What the flux carried up, it left here. Something else came up with it.',
        ledges: [[250, 430, 150], [750, 430, 150]],
        chests: [{ id: 'mass', x: 825, y: 430, gives: 'tokens:60' }, { id: 'drift', x: 960, gives: 'exp:90' }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'temple', to: ['well', 'next'] },
          { id: 'up', kind: 'arch', x: 1010, art: 'ladder', to: ['@main', 'flux32'] },
        ],
        foes: [
          { x: 640, name: 'Flux Walker', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', color: '#4a6a9a' },
          { x: 860, name: 'Flux Walker', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', color: '#3a5a8a' },
        ],
      }, CORE),
    },
  }, { ch: 32, x: 2200, art: 'temple' });

  // ch34 (id 33), region x: the orbital ring. A pocket of drifting ring sections (resonator).
  area('pocket33', {
    name: 'Orbital Pocket', theme: 'space', start: { room: 'ring', door: 'in' },
    rooms: {
      ring: room({
        name: 'Orbital Pocket', gx: 0, gy: 0, w: 1600, dark: 0.35,
        say: 'Sections of the ring, still orbiting something that is not there any more.',
        floor: [[0, 300], [1300, 1600]],
        movers: [
          { id: 'a', x0: 310, x1: 560, y: 500, w: 120, speed: 2.2, wait: 40 },
          { id: 'b', x0: 620, x1: 860, y: 430, w: 120, speed: 2.4, wait: 40, start: 'x1' },
          { id: 'c', x0: 920, x1: 1160, y: 480, w: 120, speed: 2.6, wait: 40 },
        ],
        ledges: [[650, 250, 110]],
        chests: [{ id: 'hub', x: 705, y: 250, gives: 'tokens:70' }, { id: 'axle', x: 1480, gives: 'exp:120' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'seam', to: ['@main', 'pocket33'] }],
      }, SEAM),
    },
  }, { ch: 33, x: 9950, art: 'seam', needs: 'resonator' });

  // ch35 (id 34), region x: the storm eye. A storm cellar, dark, with the storm's debris still swinging.
  area('storm34', {
    name: 'Storm Cellar', theme: 'storyCore', start: { room: 'cellar', door: 'in' },
    rooms: {
      cellar: room({
        name: 'Storm Cellar', gx: 0, gy: 0, w: 1500, lightless: 0.9,
        say: 'The echo storm blew through here and left everything moving.',
        torches: [{ id: 'a', x: 280 }, { id: 'b', x: 1240 }],
        swings: [
          { id: 'a', x: 520, y: 200, len: 310, amp: 0.95, period: 110, phase: 0 },
          { id: 'b', x: 820, y: 200, len: 310, amp: 0.95, period: 110, phase: 0.5 },
          { id: 'c', x: 1080, y: 200, len: 310, amp: 0.95, period: 100, phase: 0.2 },
        ],
        chests: [{ id: 'still', x: 1380, gives: 'exp:90' }, { id: 'wreck', x: 1440, gives: 'tokens:60' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'hatch', to: ['@main', 'storm34'] }],
      }, CORE),
    },
  }, { ch: 34, x: 14100, art: 'hatch' });

  // ch36 (id 35), region x: the core's eye. An annex: two stones, two plates, and its keepers.
  area('annex35', {
    name: 'Eye Annex', theme: 'storyCore', start: { room: 'weights', door: 'in' },
    rooms: {
      weights: room({
        name: 'Annex of Weights', gx: 0, gy: 0, w: 1500, dark: 0.3,
        say: 'The annex door opens for weight on both plates at once. One stone is on the wrong side of the first bar.',
        blocks: [{ id: 'a', x: 360 }, { id: 'b', x: 1000 }],
        plates: [{ id: 'p1', x: 600, latch: true }, { id: 'p2', x: 1200, latch: true }],
        bars: [{ id: 'mid', x: 800, when: 'plate:p1' }, { id: 'out', x: 1400, when: ['plate:p1', 'plate:p2'] }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'temple', to: ['@main', 'annex35'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['keep', 'in'] },
        ],
      }, CORE),
      keep: room({
        name: 'The Keepers', gx: 1, gy: 0, w: 1100, dark: 0.3,
        say: 'The eye\'s keepers do not leave their post.',
        ledges: [[250, 430, 150], [750, 430, 150]],
        chests: [{ id: 'lens', x: 825, y: 430, gives: 'tokens:70' }, { id: 'focus', x: 960, gives: 'exp:100' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['weights', 'next'] },
          { id: 'up', kind: 'arch', x: 1010, art: 'ladder', to: ['@main', 'annex35'] },
        ],
        foes: [
          { x: 640, name: 'Eye Keeper', weaponKey: 'hammer', classKey: 'thor', aiDiff: 'hard', color: '#3a4a7a', health: 190, armor: ['helmet'] },
          { x: 880, name: 'Eye Keeper', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', color: '#2a3a6a' },
        ],
      }, CORE),
    },
  }, { ch: 35, x: 23250, art: 'temple' });

  // ch38 (id 37): the resonance spike. The resonance chamber, three rooms, and the resonator.
  area('chamber37', {
    name: 'Resonance Chamber', theme: 'space', start: { room: 'tuning', door: 'in' },
    rooms: {
      tuning: room({
        name: 'Tuning Floor', gx: 0, gy: 0, w: 1500, dark: 0.3,
        say: 'Two dampers hold the chamber door. One is up on the gallery. One is walled in.',
        lifts: [{ id: 'g', x: 300, w: 120, y0: 520, y1: 260 }],
        ledges: [[420, 260, 260]],
        levers: [
          { id: 'a', x: 620, y: 260, line: 'One damper drops.' },
          { id: 'b', x: 1160, line: 'The second damper drops.' },
        ],
        cracks: [{ id: 'wall', x: 960, hits: 5 }],
        bars: [{ id: 'door', x: 1400, when: ['lever:a', 'lever:b'] }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'temple', to: ['@main', 'chamber37'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['spike', 'in'] },
        ],
      }, CORE),
      spike: room({
        name: 'The Spike', gx: 1, gy: 0, w: 1500, dark: 0.35,
        say: 'The resonance spikes here. Everything shakes loose.',
        spikes: [[280, 1220]],
        crumbles: [{ id: 'a', x: 290, y: 460, w: 110 }, { id: 'b', x: 470, y: 420, w: 110 }, { id: 'c', x: 920, y: 420, w: 110 }, { id: 'd', x: 1100, y: 450, w: 110 }],
        ledges: [[650, 400, 140]],
        swings: [{ id: 's', x: 720, y: 60, len: 290, amp: 0.8, period: 120, phase: 0.25 }],
        chests: [{ id: 'hum', x: 720, y: 400, gives: 'tokens:60' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['tuning', 'next'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['heart', 'in'] },
        ],
      }, CORE),
      heart: room({
        name: 'The Resonator', gx: 2, gy: 0, w: 1100, dark: 0.25,
        say: 'The resonator, and the thing that grew around it to keep it.',
        chests: [
          { id: 'res', x: 560, gives: 'relic:resonator', label: 'CORE RESONATOR',
            line: 'Seams that ring too high go quiet for it. You passed some: the crucible, core entry, the orbital ring. There will be more.' },
          { id: 'hum', x: 760, gives: 'exp:130' },
        ],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['spike', 'next'] },
          { id: 'up', kind: 'arch', x: 1010, art: 'ladder', to: ['@main', 'chamber37'] },
        ],
        foes: [{ x: 760, name: 'Resonance Warden', weaponKey: 'hammer', classKey: 'thor', aiDiff: 'hard', color: '#4a5aa8', health: 240, armor: ['helmet', 'chestplate'] }],
      }, CORE),
    },
  }, { ch: 37, x: 3950, art: 'temple', exitNeeds: 'relic:resonator', exitReason: 'the resonance chamber still rings' });

  // ch39 (id 38): residue, an escape. Only on a return trip (resonator).
  area('pocket38', {
    name: 'Quiet Pocket', theme: 'storyCore', start: { room: 'quiet', door: 'in' },
    rooms: {
      quiet: room({
        name: 'Quiet Pocket', gx: 0, gy: 0, w: 1400, dark: 0.35,
        say: 'The quiet chamber left a residue. It still lifts whatever stands in it.',
        spikes: [[300, 1100]],
        vents: [{ id: 'a', x: 330, w: 110, top: 300 }],
        crumbles: [{ id: 'b', x: 460, y: 340, w: 110 }, { id: 'c', x: 640, y: 320, w: 110 }, { id: 'd', x: 820, y: 360, w: 110 }],
        ledges: [[1000, 400, 120]],
        chests: [{ id: 'dust', x: 1060, y: 400, gives: 'tokens:80' }, { id: 'still', x: 1300, gives: 'exp:120' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'seam', to: ['@main', 'pocket38'] }],
      }, SEAM),
    },
  }, { ch: 38, x: 3700, art: 'seam', needs: 'resonator' });

  // ch48 (id 47): the last army. The outer ring's armory, still guarded.
  area('armory47', {
    name: 'Outer Ring Armory', theme: 'storyCore', start: { room: 'racks', door: 'in' },
    rooms: {
      racks: room({
        name: 'The Racks', gx: 0, gy: 0, w: 1400, dark: 0.3,
        say: 'The last army armed itself here. Some of it never left.',
        levers: [{ id: 'vault', x: 1180, when: 'clear', line: 'The armory vault unlocks.' }],
        bars: [{ id: 'vault', x: 1290, when: 'lever:vault' }],
        ledges: [[300, 430, 150], [700, 430, 150]],
        chests: [{ id: 'kit', x: 375, y: 430, gives: 'health' }, { id: 'pay', x: 1350, gives: 'tokens:90' }, { id: 'drill', x: 775, y: 430, gives: 'exp:80' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'labdoor', to: ['@main', 'armory47'] }],
        foes: [
          { x: 760, name: 'Ring Soldier', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', color: '#5a6a8a' },
          { x: 920, name: 'Ring Soldier', weaponKey: 'sword', classKey: 'warrior', aiDiff: 'hard', color: '#4a5a7a' },
          { x: 1060, name: 'Quartermaster', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', color: '#3a4a6a', health: 200, armor: ['helmet'] },
        ],
      }, CORE),
    },
  }, { ch: 47, x: 3950, art: 'labdoor' });

  // ch49 (id 48): the herald of nothing. A vault at the threshold: weight, a lever, a timer, and the herald's shade.
  area('threshold48', {
    name: 'Threshold Vault', theme: 'storyCore', start: { room: 'seal', door: 'in' },
    rooms: {
      seal: room({
        name: 'The Threshold Seal', gx: 0, gy: 0, w: 1600, dark: 0.35,
        say: 'The seal wants three things: a stone on the plate, the lever thrown, and you through before it closes.',
        blocks: [{ id: 'a', x: 360 }],
        plates: [{ id: 'stone', x: 560, latch: true }, { id: 'run', x: 900, hold: 200 }],
        bars: [{ id: 'first', x: 720, when: 'plate:stone' }, { id: 'last', x: 1460, when: ['lever:seal', 'plate:run'] }],
        levers: [{ id: 'seal', x: 820, line: 'The lever locks down. Now the plate.' }],
        steps: [[1100, 60, 60], [1280, 80, 60]],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'temple', to: ['@main', 'threshold48'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['shade', 'in'] },
        ],
      }, CORE),
      shade: room({
        name: 'The Herald\'s Shade', gx: 1, gy: 0, w: 1100, lightless: 0.85,
        say: 'The herald was here before you. It left a shadow behind to finish the job.',
        torches: [{ id: 'a', x: 300 }, { id: 'b', x: 800 }],
        chests: [{ id: 'nothing', x: 960, gives: 'exp:140' }, { id: 'toll', x: 1020, gives: 'tokens:90' }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['seal', 'next'] },
          { id: 'up', kind: 'arch', x: 110, art: 'ladder', to: ['@main', 'threshold48'] },
        ],
        foes: [{ x: 700, name: 'Herald\'s Shade', weaponKey: 'scythe', classKey: 'ninja', aiDiff: 'hard', color: '#20202a', health: 230 }],
      }, CORE),
    },
  }, { ch: 48, x: 2150, art: 'temple' });

  // ── Act 2: forest, ice and the anchor (ids 40-45, 49) ───────────────────────────────────────────────────────

  // ch41 (id 40): the second architect. Undergrowth below the sanctum: swinging roots, a powered lift.
  area('roots40', {
    name: 'Sanctum Undergrowth', theme: 'forest', start: { room: 'under', door: 'in' },
    rooms: {
      under: room({
        name: 'Sanctum Undergrowth', gx: 0, gy: 0, w: 1500, dark: 0.35,
        say: 'The architect\'s roots grow down through everything here. Some of them still move.',
        swings: [{ id: 'a', x: 480, y: 200, len: 310, amp: 0.9, period: 130, phase: 0 }, { id: 'b', x: 760, y: 200, len: 310, amp: 0.9, period: 130, phase: 0.5 }],
        levers: [{ id: 'grow', x: 980, line: 'The roots heave. Something lifts.' }],
        lifts: [{ id: 'r', x: 1080, w: 120, y0: 520, y1: 250, when: 'lever:grow', shuttle: true }],
        ledges: [[1200, 250, 260]],
        chests: [{ id: 'seed', x: 1300, y: 250, gives: 'exp:90' }, { id: 'sap', x: 1400, y: 250, gives: 'tokens:60' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'cave', to: ['@main', 'roots40'] }],
        foes: [{ x: 1200, name: 'Root Guard', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', color: '#3a5a1a' }],
      }, WOOD),
    },
  }, { ch: 40, x: 2420, art: 'cave' });

  // ch43 (id 42): the ice dimension. A frozen cave: thin ice, then a geyser.
  area('cave42', {
    name: 'Frozen Cave', theme: 'ice', start: { room: 'thin', door: 'in' },
    rooms: {
      thin: room({
        name: 'Thin Ice', gx: 0, gy: 0, w: 1400, dark: 0.25,
        say: 'The ice over the cold water is thin. It holds for a moment.',
        spikes: [[300, 1100]],
        crumbles: [
          { id: 'a', x: 310, y: 470, w: 120 }, { id: 'b', x: 500, y: 450, w: 120 }, { id: 'c', x: 690, y: 470, w: 120 }, { id: 'd', x: 880, y: 450, w: 120 },
        ],
        chests: [{ id: 'fish', x: 1250, gives: 'tokens:50' }],
        doors: [
          { id: 'in', kind: 'arch', x: 110, art: 'cave', to: ['@main', 'cave42'] },
          { id: 'next', kind: 'edge', side: 'r', to: ['geyser', 'in'] },
        ],
      }, ICE),
      geyser: room({
        name: 'The Geyser', gx: 1, gy: 0, w: 1200, dark: 0.25,
        say: 'Warm water forces its way up from somewhere deep. Strong enough to carry you.',
        spikes: [[440, 680]],
        vents: [{ id: 'g', x: 500, w: 120, top: 160 }],
        ledges: [[640, 210, 360]],
        chests: [{ id: 'warm', x: 860, y: 210, gives: 'exp:100' }],
        npcs: [{ kind: 'shop', x: 960 }],
        doors: [
          { id: 'in', kind: 'edge', side: 'l', to: ['thin', 'next'] },
          { id: 'up', kind: 'arch', x: 1100, art: 'ladder', to: ['@main', 'cave42'] },
        ],
      }, ICE),
    },
  }, { ch: 42, x: 3950, art: 'cave' });

  // ch44 (id 43): the pessimist's summit. A hut, held.
  area('hut43', {
    name: 'Summit Hut', theme: 'ice', start: { room: 'hut', door: 'in' },
    rooms: {
      hut: room({
        name: 'Summit Hut', gx: 0, gy: 0, w: 1200, dark: 0.25, wall: '#2a2018', stone: ['#5a4632', '#7a6044'],
        say: 'Somebody waited out the storm here. They were not alone.',
        levers: [{ id: 'trap', x: 1000, when: 'clear', line: 'The trapdoor to the stores swings open.' }],
        bars: [{ id: 'stores', x: 1100, when: 'lever:trap' }],
        ledges: [[350, 430, 150]],
        chests: [{ id: 'fire', x: 425, y: 430, gives: 'health' }, { id: 'stores', x: 1150, gives: 'tokens:70' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'cellar', to: ['@main', 'hut43'] }],
        foes: [
          { x: 700, name: 'Frost Raider', weaponKey: 'axe', classKey: 'berserker', aiDiff: 'hard', color: '#8ab8d8' },
          { x: 880, name: 'Frost Raider', weaponKey: 'spear', classKey: 'warrior', aiDiff: 'hard', color: '#7aa8c8' },
        ],
      }, ICE),
    },
  }, { ch: 43, x: 2150, art: 'cellar' });

  // ch45 (id 44): the fragment breathes, an escape. Only with the resonator.
  area('pocket44', {
    name: 'Breathing Pocket', theme: 'ice', start: { room: 'breath', door: 'in' },
    rooms: {
      breath: room({
        name: 'Breathing Pocket', gx: 0, gy: 0, w: 1500, dark: 0.35,
        say: 'The fragment breathed out once, here, and the cold took the shape of it.',
        spikes: [[300, 1250]],
        movers: [
          { id: 'a', x0: 310, x1: 560, y: 480, w: 120, speed: 2.0, wait: 50 },
          { id: 'b', x0: 640, x1: 900, y: 430, w: 120, speed: 2.2, wait: 50, start: 'x1' },
        ],
        crumbles: [{ id: 'c', x: 1050, y: 450, w: 110 }],
        chests: [{ id: 'breath', x: 1350, gives: 'exp:130' }, { id: 'frost', x: 1420, gives: 'tokens:90' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'seam', to: ['@main', 'pocket44'] }],
      }, SEAM),
    },
  }, { ch: 44, x: 3700, art: 'seam', needs: 'resonator' });

  // ch46 (id 45): the third architect's doubt. Under the probability engine: every gate on a condition.
  area('engine45', {
    name: 'Engine Underside', theme: 'ice', start: { room: 'odds', door: 'in' },
    rooms: {
      odds: room({
        name: 'Under the Engine', gx: 0, gy: 0, w: 1600, dark: 0.3,
        say: 'The engine weighs every outcome. Its gates open when the odds are on your side: a stone here, a lever there.',
        blocks: [{ id: 'a', x: 420 }],
        plates: [{ id: 'odds', x: 700, latch: true }, { id: 'run', x: 1000, hold: 180 }],
        levers: [{ id: 'doubt', x: 260, y: 330, line: 'Somewhere a gate unlocks. The odds shift.' }],
        lifts: [{ id: 'l', x: 120, w: 100, y0: 520, y1: 330 }],
        ledges: [[220, 330, 120]],
        bars: [{ id: 'a', x: 860, when: ['plate:odds', 'lever:doubt'] }, { id: 'b', x: 1460, when: 'plate:run' }],
        steps: [[1180, 70, 60]],
        chests: [{ id: 'chance', x: 1530, gives: 'exp:110' }, { id: 'risk', x: 1570, gives: 'tokens:70' }],
        doors: [{ id: 'in', kind: 'arch', x: 340, art: 'temple', to: ['@main', 'engine45'] }],
      }, ICE),
    },
  }, { ch: 45, x: 2000, art: 'temple' });

  // ch50 (id 49): the assembly, stealth. A cellar under the anchor point, in the dark.
  area('cellar49', {
    name: 'Anchor Cellar', theme: 'storyAssembly', start: { room: 'under', door: 'in' },
    rooms: {
      under: room({
        name: 'Under the Anchor Point', gx: 0, gy: 0, w: 1400, lightless: 0.93,
        say: 'The assembly meets upstairs. Down here is where they keep what they do not discuss.',
        torches: [{ id: 'a', x: 360 }, { id: 'b', x: 900 }],
        steps: [[560, 70, 60], [760, 110, 60]],
        ledges: [[1000, 430, 150]],
        chests: [{ id: 'minutes', x: 1075, y: 430, gives: 'exp:110' }, { id: 'dues', x: 1300, gives: 'tokens:80' }],
        doors: [{ id: 'in', kind: 'arch', x: 110, art: 'cellar', to: ['@main', 'cellar49'] }],
        foes: [{ x: 1200, name: 'Assembly Warden', weaponKey: 'sword', classKey: 'ninja', aiDiff: 'hard', color: '#3a3b40', health: 170 }],
      }, CORE),
    },
  }, { ch: 49, x: 1500, art: 'cellar' });
})();
