'use strict';
// Weapon names and backstories. Loaded right after smb-data-weapons.js.
// This table is the single place a weapon's player-facing name lives: edit a name here and
// WEAPONS, WEAPON_DESCS, and the picker dropdowns all follow. Internal keys ('hammer', ...) never change.
// Canon: docs/canon.md, THE MANIFESTED ARM and HOLLOW ARMS.
//
// Player-facing text stays spoiler-free: no First Laws, Void Mind, or Axiom's stash here.

const WEAPON_LORE = {
  sword:         { name: 'Answerer',        kind: 'Sword',          lore: 'The oldest shape the fragment knows, and the one that comes when a bearer has no time to choose. Its first owner never once remembered picking it up.' },
  hammer:        { name: 'Mountainfall',    kind: 'Hammer',         lore: 'Torren brought it down on a fracture gate and took the peak under the gate with it. The storm that followed never really left the handle.' },
  gun:           { name: 'Last Word',       kind: 'Gun',            lore: 'A gunslinger who lost every argument until the day this one arrived. Nobody has answered it back since.' },
  axe:           { name: 'Grudgebearer',    kind: 'Axe',            lore: 'Varek kept a count of every wound and paid each one back on this edge. The count did not stop when Varek did.' },
  spear:         { name: 'Meridian',        kind: 'Spear',          lore: 'A sentry who held one line for thirty years. It still draws that line, straight through whatever is standing on it.' },
  bow:           { name: 'Evenfall',        kind: 'Bow',            lore: 'A hunter who only ever worked at dusk, and never needed a second arrow for anything that ran. The arc always comes down as the light goes.' },
  shield:        { name: 'Dawnwall',        kind: 'Shield',         lore: 'One bearer held a city gate through a night nobody else lived to see. It holds its shape because it never learned that the night ended.' },
  scythe:        { name: 'Soultithe',       kind: 'Scythe',         lore: 'A gravekeeper who took a small share of everything buried. It still collects, and it still pays its bearer first.' },
  fryingpan:     { name: 'Hearthbreaker',   kind: 'Frying Pan',     lore: 'A cook who met a collector in their own kitchen and reached for what was closest. The fragment does not judge what your hands were shaped around.' },
  broomstick:    { name: 'Dustrider',       kind: 'Broomstick',     lore: 'A temple caretaker who swept the same steps for a lifetime and fought like it: patient, far-reaching, and always pushing things out the door.' },
  combat:        { name: 'The Empty Hand',  kind: 'Fists',          lore: 'A bearer with nothing in their hands is not unarmed. It means the fragment has decided you are not worth the trouble of a weapon.' },
  peashooter:    { name: 'Thousand Seeds',  kind: 'Pea Shooter',    lore: 'A grower who would not fight until the day the fields were taken, then planted the invaders one seed at a time.' },
  slingshot:     { name: "Goliath's Regret", kind: 'Slingshot',     lore: 'A shepherd, a titan, and one river stone. The titan is the only one who was surprised.' },
  paperairplane: { name: 'The Unsent',      kind: 'Paper Airplane', lore: 'A clerk who folded a letter home every night of the war and had nowhere left to send them. Every one still finds somebody.' },
  flail:         { name: 'Penance',         kind: 'Flail',          lore: 'A prisoner who walked out of the cells still wearing the chain, and then used it. The sentence was never lifted, only passed along.' },
  whip:          { name: 'Scarlet Verdict', kind: 'Whip',           lore: 'A magistrate who passed sentence from across the room. Up close it barely stings. The verdict is all at the tip.' },
  boomerang:     { name: 'Homecoming',      kind: 'Boomerang',      lore: 'A wanderer who died a very long way from home. It is the one thing they ever threw away that came back.' },
  katana:        { name: 'Stillwater',      kind: 'Katana',         lore: 'A duelist who never drew until the fight was already decided. Nothing moves on the surface, and then it is over.' },
  flamethrower:  { name: 'Cinderbreath',    kind: 'Flamethrower',   lore: 'A city furnace-keeper who breathed the fire for forty years before turning it outward. It runs out when they did.' },
  electricstaff: { name: 'Arcwright',       kind: 'Electric Staff', lore: 'An engineer who learned that lightning always finds the one rod on the plain, and chose to be holding it.' },
  bomb:          { name: 'Sunseed',         kind: 'Bomb',           lore: 'A miner who carried small suns underground for a living. The fragment kept the habit, and made the suns meaner.' },
  knives:        { name: 'The Six Sisters', kind: 'Throwing Knives', lore: 'Six knives, each named for a sister left at home. They do not stay away from each other for long.' },
  glassblade:    { name: 'Dying Star',      kind: 'Glass Blade',    lore: 'A bearer who knew exactly how long they had left and spent all of it at once. Nothing cuts faster, and nothing lasts less.' },
  anchor:        { name: 'Deepmoor',        kind: 'Anchor',         lore: 'A harbor warden who stood on the pier through the last storm and would not let go of the line. Whoever holds it now does not get moved.' },
  crossbow:      { name: 'Coffin Nail',     kind: 'Crossbow',       lore: 'A bounty hunter who liked a target to stay where it was put. The wall behind them is part of the shot.' },
  lantern:       { name: 'Vigil',           kind: 'Lantern',        lore: 'A lamplighter who walked one dark road every night, looking for someone who never came back. Nothing has hidden from it since.' },
  mkgauntlet:    { name: 'Oathbreakers',    kind: 'Gauntlets',      lore: 'A knight who broke every oath but the last one. These are what that last oath cost.' },
};

// Class names. Canon: every class is one specific bearer the fragment killed before Kael
// (docs/canon.md, CLASSES — THE DEAD THE FRAGMENT CARRIES), so each one is a person, not a job title.
// Classes that suggest a weapon are named for that weapon's bearer. Internal keys never change.
const CLASS_LORE = {
  warrior:       { name: 'Aldric',   lore: 'Forty years in the line and never once the hero of it. No gift, no legend, and nothing ever moved him.' },
  thor:          { name: 'Torren',   lore: 'The bearer of Mountainfall. The storm answered him once he was already bleeding.' },
  kratos:        { name: 'Varek',    lore: 'The bearer of Grudgebearer. Every wound was a debt, and he collected all of them.' },
  ninja:         { name: 'Sable',    lore: 'The fastest hand Answerer ever came to. Gone before anyone saw the first step.' },
  gunner:        { name: 'Dray',     lore: 'The gunslinger who carried Last Word, and fired every shot twice to be sure.' },
  archer:        { name: 'Liss',     lore: 'The dusk hunter who drew Evenfall. When anything got close, she was already a step further back.' },
  paladin:       { name: 'Oswin',    lore: 'The bearer who held the gate with Dawnwall. Every hit since lands a little lighter on him.' },
  berserker:     { name: 'Hroth',    lore: 'Any weapon, it never mattered which. Hroth got faster as the blood ran out.' },
  megaknight:    { name: 'Corvane',  lore: 'The knight in Oathbreakers. He kept one oath, and it made him enormous.' },
  pugilist:      { name: 'Bram',     lore: 'The bearer of The Empty Hand, who never once needed anything in it.' },
  ronin:         { name: 'Seren',    lore: 'The duelist who wore Stillwater. One clean draw, and the next fight was already starting.' },
  reaper:        { name: 'Mordane',  lore: 'The gravekeeper who swung Soultithe. Death came for Mordane once and was turned away.' },
  summoner:      { name: 'Wren',     lore: 'A bearer who was never alone. Something small still answers when Wren calls.' },
  demolitionist: { name: 'Hask',     lore: 'The miner who carried Sunseed. Hask learned to ride a blast instead of running from it.' },
  warden:        { name: 'Maren',    lore: 'The harbor warden who held Deepmoor. Every third wave broke on Maren and went no further.' },
  adept:         { name: 'The 95th', lore: 'Not a dead bearer. This style is your own, the one Axiom taught you.' },
};

// Shown under every bearer weapon's backstory. Explains the dark copies story enemies carry.
const HOLLOW_ARM_NOTE = "Enemies carry Hollow copies, dark with stolen power: the same shape, without the hands that made it. Yours is the real one.";

// Named beings with their own history keep their weapons clean; everyone else in Story Mode is using a copy.
const _HOLLOW_EXEMPT_NAMES = /veran|calix|anders|seraph|vael|thresh|herald|^null\b|preserved|fragment bearer|street thug|sovereign|paradox|\bgod\b|axiom|creator/i;
const _VOID_MIND_ARC_FIRST_ID = 172; // nothing in the Void Mind arc answers to Axiom

// True when this fighter's weapon is a Hollow copy: a story enemy, not a boss, not on Kael's side.
// Result is cached per fighter, keyed on its name, since names are assigned after construction.
function isHollowArm(f) {
  if (!f || !f.isAI || typeof storyModeActive === 'undefined' || !storyModeActive) return false;
  if (f._hollowFor === f.name) return f._hollowArm;
  const ch = typeof _activeStory2Chapter !== 'undefined' ? _activeStory2Chapter : null;
  const hollow = !f.isBoss && !f.isTrueForm && !f.isStoryAlly && !f.isAlly && !f.isSovereignMK2
    && f.storyFaction !== 'player' && !(ch && ch.id >= _VOID_MIND_ARC_FIRST_ID)
    && !_HOLLOW_EXEMPT_NAMES.test(f.name || '');
  f._hollowFor = f.name;
  f._hollowArm = hollow;
  return hollow;
}

// "Hollow Mountainfall". Drops a leading "The" so "The Six Sisters" reads as "Hollow Six Sisters".
function weaponDisplayName(f) {
  const n = f && f.weapon ? f.weapon.name : '';
  return n && isHollowArm(f) ? 'Hollow ' + n.replace(/^The /, '') : n;
}

(function applyWeaponLore() {
  for (const key in WEAPON_LORE) {
    const l = WEAPON_LORE[key];
    if (WEAPONS[key]) WEAPONS[key].name = l.name;
    if (WEAPON_DESCS[key]) {
      WEAPON_DESCS[key].title = l.name;
      WEAPON_DESCS[key].kind  = l.kind;
      WEAPON_DESCS[key].lore  = l.lore;
    }
  }
  // Class cards name their suggested weapon, so they follow the table too.
  for (const key in CLASS_DESCS) {
    const d = CLASS_DESCS[key];
    if (!d.what) continue;
    d.what = d.what.replace(/Suggested weapon: ([A-Za-z ]+)\./, (m, old) => {
      const hit = Object.values(WEAPON_LORE).find(l => l.kind === old || (old === 'Combat' && l.kind === 'Fists'));
      return hit ? 'Suggested weapon: ' + hit.name + '.' : m;
    });
  }
  for (const key in CLASS_LORE) {
    const l = CLASS_LORE[key];
    if (CLASSES[key]) CLASSES[key].name = l.name;
    if (CLASS_DESCS[key]) { CLASS_DESCS[key].title = l.name; CLASS_DESCS[key].lore = l.lore; }
  }
  // The pickers are written into index.html, before this script runs. Labels are the bare name;
  // the shape still shows in the description panel title and on the card icon.
  document.querySelectorAll('select option').forEach(opt => {
    const pid = opt.parentElement && opt.parentElement.id || '';
    const w = WEAPON_LORE[opt.value], c = CLASS_LORE[opt.value];
    if (w && /Weapon/i.test(pid)) opt.textContent = w.name;
    else if (c && /Class/i.test(pid)) opt.textContent = c.name;
  });
})();

// Hollow copy of a weapon sprite: same silhouette, near-black, cached once per sprite.
function hollowWeaponSprite(slot) {
  if (slot._hollow || !slot.img) return slot._hollow || null;
  const c = document.createElement('canvas');
  c.width = slot.img.width; c.height = slot.img.height;
  const g = c.getContext('2d');
  g.drawImage(slot.img, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(12,4,26,0.86)';
  g.fillRect(0, 0, c.width, c.height);
  slot._hollow = c;
  return c;
}

// Haze length for weapons drawn procedurally, which have no sprite length to read. Small ones need a small haze.
const HOLLOW_AURA_LEN = { combat: 12, fragment: 12, bomb: 14, knives: 22, glassblade: 50, anchor: 44, crossbow: 34 };

// One soft violet puff, cached. Gradient fills per frame are expensive; drawImage is not.
let _hollowPuff = null;
function _hollowPuffSprite() {
  if (_hollowPuff) return _hollowPuff;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(16, 16, 1, 16, 16, 16);
  rg.addColorStop(0, 'rgba(70,20,130,0.75)');
  rg.addColorStop(0.5, 'rgba(36,8,74,0.45)');
  rg.addColorStop(1, 'rgba(10,0,24,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 32, 32);
  _hollowPuff = c;
  return c;
}

// Dark aura along the weapon, in drawWeapon's local frame (+x runs from hand to tip).
function drawHollowAura(c, f, len, attacking) {
  const puff = _hollowPuffSprite();
  const seed = (f.playerNum || 0) * 1.7 + (f.x || 0) * 0.002;
  const count = attacking ? 7 : 5;
  c.save();
  c.shadowBlur = 0;
  for (let i = 0; i < count; i++) {
    const phase = frameCount * 0.05 + i * 1.9 + seed;
    const along = ((i + 0.5) / count) * len;
    const sz = (attacking ? 24 : 19) + Math.sin(phase * 1.3) * 5;
    c.globalAlpha = 0.72 + Math.sin(phase) * 0.22;
    c.drawImage(puff, along - sz / 2 + Math.cos(phase) * 3, -sz / 2 + Math.sin(phase * 0.8) * 5, sz, sz);
  }
  c.restore();
}
