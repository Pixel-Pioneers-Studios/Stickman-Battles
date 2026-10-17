// Weapon sprite atlas. Hand-drawn PNGs; weapons without one stay procedural.
// Sprites are pre-rotated so the shaft runs along +x with the blade at the right edge.
// len: display length in game units. anchor: grip position as a fraction of length (0 = butt).
// shaftY: shaft axis as a fraction of sprite height, so the pole lines up with the hand.
// Loading is async. `ready` stays false until decode; drawWeapon() uses the procedural art until then, or forever if the file is missing.

const WEAPON_SPRITE_DEFS = {
  // Axe and scythe keep their clipart. `len` is tuned so the reach in front of the hand matches the old hit points.
  // `combat` is absent on purpose: bare hands draw procedurally in this.color, since a bitmap has no tint.
  axe:    { src: 'images/weapons/axe.png',    len: 58, anchor: 0.20, shaftY: 21.5 / 55 },
  scythe: { src: 'images/weapons/scythe.png', len: 58, anchor: 0.19, shaftY: 41.4 / 99 },
  sword: { src: 'images/weapons/sword.png', len: 63, anchor: 0.18, shaftY: 20.5 / 41 },
  katana: { src: 'images/weapons/katana.png', len: 60.7, anchor: 0.15, shaftY: 16.8 / 39 },
  hammer: { src: 'images/weapons/hammer.png', len: 64.3, anchor: 0.17, shaftY: 27.5 / 55 },
  spear: { src: 'images/weapons/spear.png', len: 63.7, anchor: 0.29, shaftY: 11.7 / 28 },
  gun: { src: 'images/weapons/gun.png', len: 60.6, anchor: 0.11, shaftY: 17.6 / 47 },
  flail: { src: 'images/weapons/flail.png', len: 64.3, anchor: 0.17, shaftY: 19.5 / 39 },
  bow: { src: 'images/weapons/bow.png', len: 16.2, anchor: 0.44, shaftY: 263.0 / 526 },
  shield: { src: 'images/weapons/shield.png', len: 34, anchor: 0.12, shaftY: 94.0 / 188 },
  fryingpan: { src: 'images/weapons/fryingpan.png', len: 64.9, anchor: 0.16, shaftY: 26.5 / 53 },
  broomstick: { src: 'images/weapons/broomstick.png', len: 63.9, anchor: 0.21, shaftY: 13.6 / 33 },
  whip: { src: 'images/weapons/whip.png', len: 64.4, anchor: 0.18, shaftY: 14.5 / 25 },
  boomerang: { src: 'images/weapons/boomerang.png', len: 46, anchor: 0.01, shaftY: 37.5 / 75 },
  slingshot: { src: 'images/weapons/slingshot.png', len: 65.8, anchor: 0.18, shaftY: 27.0 / 54 },
  paperairplane: { src: 'images/weapons/paperairplane.png', len: 69, anchor: 0.21, shaftY: 12.2 / 29 },
  peashooter: { src: 'images/weapons/peashooter.png', len: 68.1, anchor: 0.20, shaftY: 26.9 / 37 },
  flamethrower: { src: 'images/weapons/flamethrower.png', len: 68.3, anchor: 0.21, shaftY: 8.2 / 26 },
  electricstaff: { src: 'images/weapons/electricstaff.png', len: 62.8, anchor: 0.27, shaftY: 25.0 / 50 },
  gauntlet: { src: 'images/weapons/gauntlet.png', len: 30, anchor: 0.48, shaftY: 48.5 / 97 },
  mkgauntlet: { src: 'images/weapons/mkgauntlet.png', len: 34, anchor: 0.46, shaftY: 45.5 / 91 },
  nullblade: { src: 'images/weapons/nullblade.png', len: 65.3, anchor: 0.21, shaftY: 20.0 / 40 },
  voidblade: { src: 'images/weapons/voidblade.png', len: 66.1, anchor: 0.21, shaftY: 18.5 / 37 },
  shockrifle: { src: 'images/weapons/shockrifle.png', len: 64.8, anchor: 0.23, shaftY: 13.9 / 37 },
  lantern: { src: 'images/weapons/lantern.png', len: 65.8, anchor: 0.18, shaftY: 25.7 / 48 },
};

// Opaque art extent per melee sprite: 8 segments from hand to tip, each [above, below] the shaft, in drawn units before weapScale.
// Re-measure after a re-render. Melee hit points sample these.
const WEAPON_EDGE_PROFILE = {
  sword:         [[-8.6,8.1],[-10.1,9.6],[-3.2,2.7],[-3.2,2.7],[-3.2,2.7],[-3.2,2.7],[-3.2,2.7],[-1.7,1.2]],
  katana:        [[-4.6,4.4],[-5.1,4.4],[-3.2,1.5],[-4.2,1],[-4.6,0.6],[-6.1,0.6],[-7,0.1],[-8,0]],
  hammer:        [[-1.8,1.3],[-1.8,1.3],[-1.8,1.3],[-1.3,0.8],[-2.8,2.3],[-8.8,8.3],[-13.8,13.3],[-8.8,8.3]],
  fryingpan:     [[-1.8,1.3],[-1.8,1.3],[-1.8,1.3],[-2.8,2.3],[-11.4,10.9],[-13.4,12.9],[-13.4,12.9],[-11.4,10.9]],
  axe:           [[-0.2,0.7],[-1.1,1.6],[-1.1,7.9],[-2,13.4],[-2.9,14.7],[-9.7,14.7],[-9.7,14.3],[-2,12]],
  scythe:        [[-0.6,0.7],[-0.6,0.3],[-0.6,0.7],[-1.5,25.6],[-6.5,25.2],[-18.8,21.1],[-18.8,6.6],[-0.6,1.6]],
  spear:         [[-1.3,0.6],[-1.3,1.1],[-0.8,0.6],[-0.8,0.6],[-0.8,0.6],[-5.8,7.6],[-3.8,3.1],[-2.8,2.1]],
  broomstick:    [[-1.3,1.2],[-0.8,0.7],[-0.8,0.7],[-0.8,0.7],[-2.3,2.2],[-3.3,9.2],[-5.3,4.7],[-6.8,6.7]],
  flail:         [[-1.8,1.3],[-2.3,1.8],[-1.8,2.3],[-2.3,1.8],[-2.8,1.3],[-8.3,5.3],[-9.8,9.3],[-5.8,7.8]],
  electricstaff: [[-1.5,1],[-2,1.5],[-1,0.5],[-1,0.5],[-2.5,2],[-4.4,3.9],[-10.3,9.8],[-12.3,11.8]],
};

// Bump when the PNGs are re-rendered, or browsers keep drawing the cached art.
const WEAPON_SPRITE_VER = 2;
const WEAPON_SPRITES = {};

(function loadWeaponSprites() {
  for (const key in WEAPON_SPRITE_DEFS) {
    const def  = WEAPON_SPRITE_DEFS[key];
    const slot = { ready: false, img: null, len: def.len, anchor: def.anchor, shaftY: def.shaftY };
    WEAPON_SPRITES[key] = slot;
    try {
      const img = new Image();
      img.onload  = () => { slot.img = img; slot.ready = true; };
      img.onerror = () => { slot.ready = false; };
      img.src = def.src + '?v=' + WEAPON_SPRITE_VER;
    } catch (e) {
      slot.ready = false;
    }
  }
})();

// drawWeapon() and wxDrawWeaponArt() draw via _weaponArtCtx() instead of `ctx`.
// null = main canvas; set only around a single call (menu preview).
let weaponArtCtx = null;
function _weaponArtCtx() { return weaponArtCtx || ctx; }
