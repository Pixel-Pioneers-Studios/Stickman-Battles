'use strict';
// Named poses for the film (degrees, facing right; r* = weapon arm, drawn in front; rLeg = back leg, lLeg = front leg).
// Limb angles are bone directions: 0 forward, 90 down, -90 up, 180 back. The weapon points along rFore.
// torso: lean in degrees (+ forward). hipDrop: px the hips sit lower. rot: whole-body roll about the hips.
function FILM_POSES_DEFINE(def) {
  // ── shared stances ──
  def('readyOpen', 'stand', { rArm: 96, rFore: 70, lArm: 98, lFore: 108, rLeg: 112, rShin: 104, lLeg: 68, lShin: 82, torso: 6, hipDrop: 4 });
  def('ready', 'stand', { rArm: 80, rFore: 40, lArm: 100, lFore: 112, rLeg: 112, rShin: 104, lLeg: 68, lShin: 82, torso: 6, hipDrop: 4 });
  def('guard', 'stand', { rArm: 62, rFore: -38, lArm: 70, lFore: -6, rLeg: 120, rShin: 108, lLeg: 60, lShin: 84, torso: 8, hipDrop: 8 });
  def('iaido', 'stand', { rArm: 118, rFore: 172, lArm: 96, lFore: 150, rLeg: 142, rShin: 118, lLeg: 38, lShin: 96, torso: 30, hipDrop: 20, headTilt: 6 });
  def('highGuard', 'stand', { rArm: -62, rFore: -150, lArm: -44, lFore: -122, rLeg: 116, rShin: 102, lLeg: 64, lShin: 86, torso: -6, hipDrop: 5 });
  def('cutDown', 'stand', { rArm: 38, rFore: 72, lArm: 46, lFore: 78, rLeg: 132, rShin: 116, lLeg: 44, lShin: 96, torso: 36, hipDrop: 18 });
  def('windBack', 'stand', { rArm: 168, rFore: 196, lArm: 36, lFore: 6, rLeg: 112, rShin: 102, lLeg: 64, lShin: 86, torso: -10, hipDrop: 7 });
  def('slashOut', 'stand', { rArm: -8, rFore: -4, rArmLen: 1.1, lArm: 150, lFore: 172, rLeg: 128, rShin: 112, lLeg: 48, lShin: 92, torso: 26, hipDrop: 13 });
  def('upperCut', 'stand', { rArm: -70, rFore: -95, rArmLen: 1.1, lArm: 140, lFore: 160, rLeg: 118, rShin: 108, lLeg: 70, lShin: 82, torso: -14, hipDrop: -4, headTilt: -12 });
  def('thrust', 'stand', { rArm: 0, rFore: 0, rArmLen: 1.22, lArm: 152, lFore: 166, rLeg: 142, rShin: 126, lLeg: 34, lShin: 92, torso: 30, hipDrop: 15 });
  def('lunge', 'stand', { rArm: 158, rFore: 176, lArm: 112, lFore: 132, rLeg: 152, rShin: 170, lLeg: 28, lShin: 102, torso: 46, hipDrop: 22 });
  def('runA', 'stand', { rArm: 150, rFore: 170, lArm: 60, lFore: 20, rLeg: 150, rShin: 165, lLeg: 40, lShin: 110, torso: 34, hipDrop: 6 });
  def('runB', 'stand', { rArm: 150, rFore: 172, lArm: 70, lFore: 30, rLeg: 60, rShin: 130, lLeg: 120, lShin: 160, torso: 34, hipDrop: 2 });
  def('crouchLand', 'stand', { rArm: 128, rFore: 160, lArm: 82, lFore: 96, rLeg: 122, rShin: 178, lLeg: 18, lShin: 96, torso: 40, hipDrop: 30, headTilt: 14 });
  def('crouch', 'stand', { rArm: 110, rFore: 150, lArm: 70, lFore: 60, rLeg: 140, rShin: 70, lLeg: 20, lShin: 110, torso: 30, hipDrop: 26, headTilt: 6 });
  def('tuck', 'stand', { rArm: 60, rFore: -20, lArm: 80, lFore: 20, rLeg: 10, rShin: 125, lLeg: -10, lShin: 110, torso: 22, hipDrop: -6 });
  def('airHigh', 'stand', { rArm: -62, rFore: -150, lArm: -40, lFore: -120, rLeg: 40, rShin: 130, lLeg: 10, lShin: 100, torso: -8, hipDrop: -6 });
  def('airCut', 'stand', { rArm: 40, rFore: 75, lArm: 46, lFore: 80, rLeg: 120, rShin: 150, lLeg: 30, lShin: 90, torso: 40, hipDrop: -6 });
  def('block', 'stand', { rArm: 42, rFore: -72, lArm: 52, lFore: -58, rLeg: 122, rShin: 108, lLeg: 60, lShin: 86, torso: -4, hipDrop: 9 });
  def('blockHigh', 'stand', { rArm: -66, rFore: -2, lArm: -48, lFore: -24, rLeg: 120, rShin: 110, lLeg: 64, lShin: 86, torso: -6, hipDrop: 12 });
  def('clash', 'stand', { rArm: 20, rFore: -30, lArm: 26, lFore: -24, rLeg: 140, rShin: 134, lLeg: 44, lShin: 92, torso: 26, hipDrop: 14 });
  def('hitBack', 'stand', { rArm: 150, rFore: 172, lArm: 122, lFore: 142, rLeg: 84, rShin: 96, lLeg: 58, lShin: 74, torso: -26, headTilt: -22, hipDrop: -2 });
  def('flyBack', 'stand', { rArm: 205, rFore: 222, lArm: 172, lFore: 200, rLeg: 38, rShin: 82, lLeg: 18, lShin: 62, torso: -46, headTilt: -30 });
  def('skid', 'stand', { rArm: 140, rFore: 120, lArm: 40, lFore: 10, rLeg: 30, rShin: 92, lLeg: 135, lShin: 150, torso: 28, hipDrop: 18 });
  def('kneel', 'stand', { rArm: 92, rFore: 88, lArm: 64, lFore: 82, rLeg: 96, rShin: 180, lLeg: 12, lShin: 90, torso: 30, hipDrop: 30, headTilt: 26 });
  def('kneelLook', 'kneel', { torso: 14, headTilt: -8 });
  def('fallen', 'stand', { rArm: 140, rFore: 120, lArm: 40, lFore: 70, rLeg: 70, rShin: 110, lLeg: 30, lShin: 80, torso: -10, headTilt: -10, rot: -88, hipDrop: 46 });
  def('push', 'stand', { rArm: 10, rFore: -10, lArm: 6, lFore: -16, rLeg: 140, rShin: 140, lLeg: 50, lShin: 90, torso: 32, hipDrop: 12 });
  def('sheathe', 'stand', { rArm: 84, rFore: 150, lArm: 96, lFore: 150, rLeg: 106, rShin: 96, lLeg: 74, lShin: 84, torso: 4, hipDrop: 2 });
  def('follow', 'stand', { rArm: 30, rFore: 10, lArm: 150, lFore: 170, rLeg: 160, rShin: 176, lLeg: 22, lShin: 98, torso: 50, hipDrop: 30 });

  def('sweepLow', 'stand', { rArm: 18, rFore: 8, rArmLen: 1.1, lArm: 160, lFore: 176, rLeg: 150, rShin: 92, lLeg: 28, lShin: 100, torso: 42, hipDrop: 28 });
  def('walkA', 'stand', { rLeg: 118, rShin: 108, lLeg: 66, lShin: 84, hipDrop: 2 });
  def('walkB', 'stand', { rLeg: 74, rShin: 96, lLeg: 108, lShin: 118, hipDrop: 0 });

  // Kael empty-handed: catching a descending blade in the off hand, the open-hand stance, strikes.
  def('catchHigh', 'stand', { lArm: -52, lFore: -78, lArmLen: 1.05, rArm: 120, rFore: 140, rLeg: 128, rShin: 112, lLeg: 56, lShin: 86, torso: 4, hipDrop: 14, headTilt: -10 });
  def('openHand', 'stand', { lArm: 30, lFore: -20, rArm: 110, rFore: 70, rLeg: 122, rShin: 108, lLeg: 58, lShin: 86, torso: 10, hipDrop: 9 });
  def('elbow', 'stand', { lArm: -10, lFore: 160, rArm: 120, rFore: 150, rLeg: 134, rShin: 118, lLeg: 44, lShin: 94, torso: 30, hipDrop: 12 });
  def('palmK', 'stand', { lArm: 0, lFore: 0, lArmLen: 1.15, rArm: 130, rFore: 150, rLeg: 140, rShin: 124, lLeg: 36, lShin: 92, torso: 26, hipDrop: 14 });
  def('heelKick', 'stand', { lLeg: -40, lShin: -20, lLegLen: 1.06, rLeg: 100, rShin: 96, rArm: 160, rFore: 190, lArm: 60, lFore: 30, torso: -34, headTilt: -10 });
  def('frontKick', 'stand', { lLeg: -4, lShin: -6, lLegLen: 1.06, rLeg: 100, rShin: 98, rArm: 150, rFore: 170, lArm: 50, lFore: 20, torso: -20 });
  def('rising', 'kneel', { torso: 4, headTilt: -14, rArm: 104, rFore: 100, lArm: 76, lFore: 80, hipDrop: 22 });

  // A downward cut stopped dead mid-arc (caught): the blade level and forward.
  def('cutStop', 'stand', { rArm: -14, rFore: -14, rArmLen: 1.05, lArm: -6, lFore: -10, rLeg: 132, rShin: 118, lLeg: 50, lShin: 90, torso: 18, hipDrop: 10 });

  // ── Sovereign ──
  // Composed: chin up, blade planted point-down in front of him, both hands on the pommel.
  // Arms straight down to the pommel and symmetric, so turning (a facing flip) leaves the hands, and the blade
  // sunk in the floor, exactly where they were.
  def('sovPlant', 'stand', { rArm: 90, rFore: 90, lArm: 90, lFore: 90, rLeg: 100, rShin: 98, lLeg: 80, lShin: 82, torso: 0, headTilt: -6 });
  def('sovPlantLook', 'sovPlant', { headTilt: 8 });
  def('sovReady', 'stand', { rArm: 112, rFore: 132, lArm: 82, lFore: 86, rLeg: 110, rShin: 102, lLeg: 72, lShin: 82, torso: 2, headTilt: -4 });
  def('sovLean', 'sovReady', { torso: -28, headTilt: -18, rLeg: 100, rShin: 92, lLeg: 60, lShin: 76, hipDrop: 2 });
  def('sovDuck', 'sovReady', { torso: 44, hipDrop: 22, rLeg: 130, rShin: 70, lLeg: 30, lShin: 110, headTilt: 10 });
  def('sovPalm', 'stand', { lArm: -4, lFore: -4, lArmLen: 1.12, rArm: 116, rFore: 140, rLeg: 128, rShin: 112, lLeg: 54, lShin: 88, torso: 14, hipDrop: 8 });
  def('sovCatch', 'stand', { lArm: 16, lFore: -30, rArm: 112, rFore: 134, rLeg: 112, rShin: 102, lLeg: 70, lShin: 82, torso: -4, headTilt: -6 });
  def('sovKick', 'stand', { lLeg: -6, lShin: -4, lLegLen: 1.08, rLeg: 98, rShin: 98, rArm: 140, rFore: 160, lArm: 60, lFore: 40, torso: -24, headTilt: -8 });
  def('sovSweep', 'stand', { rArm: 4, rFore: 30, rArmLen: 1.15, lArm: 150, lFore: 170, rLeg: 140, rShin: 120, lLeg: 30, lShin: 100, torso: 36, hipDrop: 22 });
  def('sovRaise', 'stand', { rArm: -86, rFore: -92, rArmLen: 1.1, lArm: 120, lFore: 130, rLeg: 106, rShin: 100, lLeg: 74, lShin: 82, torso: -6, headTilt: -10 });
  def('sovLook', 'sovReady', { headTilt: 14, torso: 10 });
  // Down on one knee, the blade planted point-first in the street, both hands on it.
  def('sovKneelPlant', 'kneel', { rArm: 70, rFore: 90, lArm: 74, lFore: 92, torso: 22, headTilt: 30 });
  // Walking with the blade dragging behind him, point on the floor.
  def('sovWalkA', 'sovReady', { rArm: 116, rFore: 150, rLeg: 116, rShin: 106, lLeg: 66, lShin: 82, lArm: 84, lFore: 92, hipDrop: 2 });
  def('sovWalkB', 'sovReady', { rArm: 116, rFore: 150, rLeg: 76, rShin: 96, lLeg: 106, lShin: 116, lArm: 92, lFore: 100, hipDrop: 0 });

  // ── the Creator (Kael vs The Creator) ──
  // Composed, arms a little away from the body, chin level: a builder looking over work.
  def('crStand', 'stand', { rArm: 98, rFore: 102, lArm: 82, lFore: 78, rLeg: 98, rShin: 96, lLeg: 82, lShin: 84, headTilt: -4 });
  // The front hand out, open, toward what it is looking at.
  def('crReach', 'crStand', { rArm: -8, rFore: -16, rArmLen: 1.08, torso: 4, headTilt: 2 });
  // The same hand drawn back to the chest: closing on what it held.
  def('crClose', 'crStand', { rArm: 40, rFore: -70, torso: -2, headTilt: 6 });
  // Building: the front arm raised, palm up, the world assembling under it.
  def('crRaise', 'crStand', { rArm: -40, rFore: -70, lArm: 120, lFore: 130, torso: -6, headTilt: -10 });
  // Stepping down its own stairs.
  def('crStepA', 'crStand', { rLeg: 70, rShin: 100, lLeg: 104, lShin: 96, hipDrop: 2 });
  def('crStepB', 'crStand', { rLeg: 110, rShin: 98, lLeg: 66, lShin: 96, hipDrop: 0 });
  // With a constructed blade: held low and back, raised, the cut down, the thrust.
  def('crLow', 'crStand', { rArm: 112, rFore: 140, lArm: 76, lFore: 84, rLeg: 112, rShin: 104, lLeg: 70, lShin: 84, torso: 4 });
  def('crHigh', 'crStand', { rArm: -76, rFore: -128, lArm: -50, lFore: -100, rLeg: 116, rShin: 104, lLeg: 66, lShin: 86, torso: -8, headTilt: -6 });
  def('crCut', 'crStand', { rArm: 30, rFore: 50, rArmLen: 1.08, lArm: 40, lFore: 60, rLeg: 128, rShin: 114, lLeg: 50, lShin: 94, torso: 28, hipDrop: 12 });
  def('crSweep', 'crStand', { rArm: -6, rFore: -2, rArmLen: 1.1, lArm: 150, lFore: 170, rLeg: 126, rShin: 112, lLeg: 52, lShin: 92, torso: 20, hipDrop: 10 });
  // Blade hanging point-down in front of the body, catching a level cut.
  def('crBlock', 'crStand', { rArm: 40, rFore: 84, lArm: 70, lFore: 40, rLeg: 118, rShin: 106, lLeg: 64, lShin: 86, torso: -4, hipDrop: 6 });
  // A downward cut stopped dead on a high block: the blade level and forward at shoulder height.
  def('crCutStop', 'crStand', { rArm: -14, rFore: -6, rArmLen: 1.05, lArm: -4, lFore: -8, rLeg: 126, rShin: 112, lLeg: 54, lShin: 90, torso: 14, hipDrop: 8 });
  // Kael on one knee looking at his empty weapon hand.
  def('lookHand', 'kneel', { rArm: 44, rFore: -58, lArm: 80, lFore: 90, torso: 22, headTilt: 30 });
  // Act 2. Kael on one knee holding a high block; driving the blade point-first into the floor; walking with it low.
  def('kneelBlock', 'kneel', { rArm: -66, rFore: -64, lArm: -48, lFore: -24, torso: 6, headTilt: -10, hipDrop: 26 });
  def('plant', 'stand', { rArm: 70, rFore: 92, lArm: 74, lFore: 90, rLeg: 140, rShin: 80, lLeg: 30, lShin: 104, torso: 34, hipDrop: 28, headTilt: 12 });
  def('walkLowA', 'walkA', { rArm: 104, rFore: 120, lArm: 80, lFore: 84, torso: 6 });
  def('walkLowB', 'walkB', { rArm: 104, rFore: 120, lArm: 80, lFore: 84, torso: 6 });
  // The Creator: blade low, the other hand open toward Kael (unmaking); both arms spread, rising.
  def('crUnmake', 'crLow', { lArm: -6, lFore: -12, lArmLen: 1.08, torso: 2, headTilt: 0 });
  def('crSpread', 'crStand', { rArm: -24, rFore: -30, lArm: -30, lFore: -40, rLeg: 96, rShin: 100, lLeg: 84, lShin: 80, torso: -8, headTilt: -14 });
  // The Creator's blade pressed down across a rising cut (thumbnail): hand at shoulder height, blade forward and down.
  def('crClash', 'crStand', { rArm: -6, rFore: 16, lArm: 30, lFore: 10, rLeg: 126, rShin: 112, lLeg: 54, lShin: 90, torso: 12, hipDrop: 8, headTilt: -4 });
  // Kael hanging from the hilt of a blade buried in something above the floor: arms as the thrust, legs dangling.
  def('hangThrust', 'thrust', { rLeg: 98, rShin: 104, lLeg: 82, lShin: 92, torso: 12, hipDrop: 0 });
  // Act 3. Run through: the Creator thrown back on Kael's blade; its free hand closing on the blade.
  def('crThrough', 'crSpread', { torso: -20, headTilt: -26 });
  def('crGrip', 'crThrough', { lArm: 34, lFore: -88, lArmLen: 1.06, headTilt: -2, torso: -12 });

  // ── Cosmic Axiom (Kael vs Cosmic Axiom) ──
  // Out of the husk: the same grip, the head coming up level.
  def('caLift', 'crGrip', { torso: -4, headTilt: -8 });
  // Pushing the blade out of his own chest: the grip hand driven forward along it.
  def('caPushOut', 'caLift', { lArm: 4, lFore: -30, lArmLen: 1.1, torso: -8 });
  // The other hand closed on Kael's collar, arm forward; swung up overhead; thrown back over the shoulder.
  def('caGrab', 'caLift', { rArm: -6, rFore: -22, rArmLen: 1.08, lArm: 110, lFore: 130, torso: 6, headTilt: 0 });
  def('caOver', 'caGrab', { rArm: -96, rFore: -104, torso: -14, headTilt: -16 });
  def('caHurl', 'caGrab', { rArm: 214, rFore: 206, torso: -30, headTilt: -20, lArm: 40, lFore: 20 });
  // Floating composed: legs together, toes down, arms a little open.
  def('caFloat', 'crStand', { rLeg: 94, rShin: 100, lLeg: 86, lShin: 96, rArm: 104, rFore: 110, lArm: 76, lFore: 70, headTilt: -2 });
  // Commands: the palm raised and turned (gravity), the hand closing above (a star collapsing), two fingers aimed (light).
  def('caPalmUp', 'caFloat', { rArm: -24, rFore: -62, torso: -4, headTilt: -6 });
  def('caPalmTurn', 'caFloat', { rArm: -8, rFore: 8, rArmLen: 1.06, torso: 4 });
  def('caClose', 'caFloat', { rArm: -58, rFore: -96, torso: -8, headTilt: -14 });
  def('caAim', 'caFloat', { rArm: -4, rFore: -4, rArmLen: 1.12, lArm: 100, lFore: 116, torso: 6, headTilt: 2 });
  // The palm pressed down: "down" put back where it was, hard.
  def('caPalmDown', 'caFloat', { rArm: 14, rFore: 64, rArmLen: 1.06, torso: 10, headTilt: 12 });
  // Kael braced against a pull toward the foe (leaning back, front foot dug in).
  def('braceBack', 'stand', { rArm: 110, rFore: 120, lArm: 150, lFore: 170, rLeg: 128, rShin: 112, lLeg: 52, lShin: 76, torso: -22, hipDrop: 14, headTilt: -6 });
  // Hanging from a grip above the head, legs down (rotated whole with rot when gravity turns sideways), two leg beats.
  def('hangUp', 'stand', { rArm: -90, rFore: -90, lArm: -86, lFore: -92, rLeg: 96, rShin: 100, lLeg: 84, lShin: 92, torso: 0, headTilt: -4 });
  def('hangUp2', 'hangUp', { rLeg: 80, rShin: 112, lLeg: 102, lShin: 86 });
  // The katana driven point-down into the floor in front, hands at hip height, legs braced back.
  def('plantHigh', 'stand', { rArm: 4, rFore: 88, lArm: 10, lFore: 88, rLeg: 128, rShin: 114, lLeg: 62, lShin: 84, torso: 6, hipDrop: 4, headTilt: 4 });
  // Diving blade-first (rot 90 lays it level: head and blade forward).
  def('dive', 'stand', { rArm: -84, rFore: -90, rArmLen: 1.1, lArm: -100, lFore: -112, rLeg: 98, rShin: 102, lLeg: 84, lShin: 88, torso: 0, headTilt: -10 });
  // The raised hand closing on what it holds (a star, collapsed).
  def('caFist', 'caClose', { rArm: -50, rFore: -64, torso: -2, headTilt: -10 });
  // Kael in the air with the blade up across his body, catching something level (the beam), knees drawn up.
  def('airBlock', 'block', { rLeg: 44, rShin: 122, lLeg: 22, lShin: 104, torso: -10, hipDrop: -6 });
  // Aiming down from a height (the giant at Kael's feet).
  def('caAimDown', 'caAim', { rArm: 38, rFore: 34, torso: 10, headTilt: 16 });
  // Kael standing, blade low, looking at his own open off hand.
  def('lookHandStand', 'readyOpen', { lArm: 40, lFore: -50, headTilt: 22, torso: 10 });
  // The off forearm raised across the face; thrown back by a hit, arms opening.
  def('caGuard', 'caFloat', { lArm: 30, lFore: -76, torso: -4, headTilt: 4 });
  def('caRecoil', 'caFloat', { rArm: 140, rFore: 160, lArm: 150, lFore: 176, torso: -20, headTilt: -16 });
  // Looking down at his own arm (the stars under where the crust was).
  def('caLookArm', 'caFloat', { lArm: 40, lFore: -30, torso: 12, headTilt: 26 });
  // Act 3. On one knee, a hand coming up to begin one more command.
  def('caKneelRaise', 'kneel', { rArm: -30, rFore: -70, torso: 10, headTilt: -6 });
  def('caKneelLook', 'kneel', { torso: 14, headTilt: -4, rArm: 96, rFore: 92 });
  // Kael's fragment going off through him (not chosen): thrown open, chest first.
  def('pulseOpen', 'stand', { rArm: 150, rFore: 176, lArm: 160, lFore: 190, rLeg: 110, rShin: 104, lLeg: 70, lShin: 82, torso: -20, headTilt: -22 });
  // Reaching an open hand forward to something at chest height in front of him, blade held low and back.
  def('reachHold', 'stand', { lArm: 4, lFore: -6, lArmLen: 1.12, rArm: 120, rFore: 150, rLeg: 124, rShin: 110, lLeg: 58, lShin: 86, torso: 14, hipDrop: 8 });
  def('kneelReach', 'kneel', { lArm: 0, lFore: -8, lArmLen: 1.12, rArm: 100, rFore: 120, torso: 10, headTilt: -4 });
  // Kael held up by the collar, limp, blade still in hand.
  def('heldUp', 'stand', { rArm: 120, rFore: 140, lArm: -40, lFore: -70, rLeg: 100, rShin: 106, lLeg: 84, lShin: 96, torso: -6, headTilt: -14 });
  // Bare hands (Axiom's are a street fighter's before they are anything else; Kael's once the katana is gone). Hands are
  // aimed per blow by CA.blows, so these set the body: stance, hips, lean.
  def('boxGuard', 'stand', { rArm: 54, rFore: -72, lArm: 66, lFore: -58, rLeg: 118, rShin: 106, lLeg: 62, lShin: 88, torso: 10, hipDrop: 9, headTilt: 5 });
  def('jab', 'boxGuard', { lArm: 0, lFore: -2, lArmLen: 1.14, torso: 16, hipDrop: 9, rLeg: 124, lLeg: 54 });
  def('cross', 'boxGuard', { rArm: -2, rFore: -4, rArmLen: 1.16, lArm: 76, lFore: -48, torso: 26, hipDrop: 13, rLeg: 138, rShin: 122, lLeg: 44, lShin: 94 });
  def('hook', 'boxGuard', { rArm: 14, rFore: -14, lArm: 78, lFore: -50, torso: 28, hipDrop: 14, rLeg: 134, rShin: 118, lLeg: 48, lShin: 92 });
  def('upperK', 'boxGuard', { rArm: 66, rFore: -72, rArmLen: 1.1, lArm: 76, lFore: -48, torso: -8, hipDrop: 4, headTilt: -8, rLeg: 122, lLeg: 64 });
  def('axeHand', 'boxGuard', { rArm: 30, rFore: 60, rArmLen: 1.1, lArm: 110, lFore: 150, torso: 34, hipDrop: 16 });
  def('elbowDown', 'boxGuard', { rArm: 40, rFore: 150, lArm: 80, lFore: 40, torso: 36, hipDrop: 14 });
  def('kneeUp', 'boxGuard', { lLeg: 2, lShin: 100, rLeg: 96, rShin: 98, lArm: 20, lFore: 30, rArm: 30, rFore: 40, torso: 6, hipDrop: 0 });
  def('parry', 'boxGuard', { lArm: 16, lFore: -30, lArmLen: 1.08, torso: 2 });
  def('slip', 'boxGuard', { torso: 36, hipDrop: 22, headTilt: 12, rLeg: 132, rShin: 80, lLeg: 34, lShin: 104 });
  def('slipBack', 'boxGuard', { torso: -26, headTilt: -16, rLeg: 106, rShin: 92, lLeg: 58, lShin: 76, hipDrop: 4 });
  def('sideKick', 'stand', { lLeg: -8, lShin: -6, lLegLen: 1.08, rLeg: 112, rShin: 104, rArm: 120, rFore: 80, lArm: 150, lFore: 110, torso: -22, headTilt: -6, hipDrop: 2 });
  // Taking it: the head snapped back; folded over a fist in the gut; flat on the floor (rot) getting up.
  def('headSnap', 'stand', { rArm: 124, rFore: 150, lArm: 112, lFore: 138, rLeg: 112, rShin: 100, lLeg: 68, lShin: 80, torso: -18, headTilt: -34, hipDrop: 6 });
  def('folded', 'stand', { rArm: 70, rFore: 110, lArm: 80, lFore: 118, rLeg: 112, rShin: 110, lLeg: 74, lShin: 94, torso: 46, headTilt: 26, hipDrop: 10 });
  def('knockedBack', 'flyBack', { rLeg: 60, rShin: 100, lLeg: 34, lShin: 80, torso: -30, headTilt: -20 });
  def('pushUp', 'kneel', { rArm: 80, rFore: 96, lArm: 62, lFore: 92, torso: 46, headTilt: -6, hipDrop: 34 });
  // Over a fallen enemy: leaning in, slam arm driven at the floor.
  def('slamDown', 'boxGuard', { rArm: 60, rFore: 70, rArmLen: 1.35, lArm: 130, lFore: 150, torso: 42, hipDrop: 24, rLeg: 134, rShin: 90, lLeg: 34, lShin: 100, headTilt: 14 });
  def('slamBack', 'slamDown', { torso: -40, hipDrop: 26, rLeg: 54, rShin: 96, lLeg: 136, lShin: 90 });
  def('swingOver', 'boxGuard', { rArm: -96, rFore: -100, rArmLen: 1.1, lArm: 130, lFore: 160, torso: -8, hipDrop: 2, headTilt: -10 });
  // Kael: a high cut stopped on its way down, the hand caught, the blade still pointing back over him; blocks with the off
  // forearm with the blade trailing; a reverse thrust past his own hip at something behind him.
  def('cutCaught', 'stand', { rArm: -56, rFore: -112, lArm: -30, lFore: -80, rLeg: 128, rShin: 112, lLeg: 56, lShin: 88, torso: 6, hipDrop: 8, headTilt: -8 });
  def('kOpen', 'openHand', { rArm: 130, rFore: 160 });
  def('kBlock', 'kOpen', { lArm: 24, lFore: -72, torso: -2 });
  def('kSlip', 'kOpen', { torso: 40, hipDrop: 24, headTilt: 12, rLeg: 132, rShin: 80, lLeg: 34, lShin: 104 });
  def('thrustBack', 'stand', { rArm: 168, rFore: 178, rArmLen: 1.15, lArm: 40, lFore: 10, rLeg: 112, rShin: 104, lLeg: 58, lShin: 88, torso: 14, hipDrop: 12, headTilt: 4 });
  def('catchWrist', 'kOpen', { lArm: -6, lFore: -10, lArmLen: 1.1, torso: 8 });
  def('yank', 'kOpen', { lArm: 160, lFore: 170, torso: -22, headTilt: -8, rLeg: 70, rShin: 90, lLeg: 130, lShin: 110, hipDrop: 12 });
  // Kael down low, reaching for the hilt of a blade standing in the floor (arm straight down onto it).
  def('reachHilt', 'plantHigh', { rArm: 86, rFore: 90, lArm: 120, lFore: 150, torso: 8, hipDrop: 6, rLeg: 122, rShin: 110, lLeg: 58, lShin: 86 });
  // Upside down under a rock (rot 180 on these): running on it, then the dive off it, blade first.
  def('thrustDown', 'dive', { rArm: 84, rFore: 90, lArm: 110, lFore: 120, rLeg: 100, rShin: 110, lLeg: 80, lShin: 96, torso: 8, headTilt: 10 });
  // ── Awakened Sovereign (the last film) ──
  // Hands open and away from the body, chin level: nothing raised against what is coming.
  def('sovOpen', 'stand', { rArm: 128, rFore: 150, lArm: 54, lFore: 32, rLeg: 104, rShin: 100, lLeg: 76, lShin: 80, torso: -2, headTilt: -6 });
  // Letting a cut in: rocked back, folded forward, or sunk over a leg, hands still open.
  def('sovTakeBack', 'sovOpen', { rArm: 146, rFore: 170, lArm: 38, lFore: 14, torso: -15, headTilt: -14, rLeg: 112, lLeg: 66, hipDrop: 3 });
  def('sovTakeFold', 'sovOpen', { rArm: 118, rFore: 136, lArm: 66, lFore: 48, torso: 20, headTilt: 20, hipDrop: 7 });
  def('sovTakeSink', 'sovOpen', { torso: 12, headTilt: 12, rLeg: 126, rShin: 112, lLeg: 54, lShin: 96, hipDrop: 16 });
  def('sovHeadDown', 'sovTakeFold', { torso: 12, headTilt: 30, hipDrop: 5 });
  // The back of the off hand moving a blade off his throat.
  def('sovMoveBlade', 'sovOpen', { lArm: 8, lFore: -46, lArmLen: 1.05, torso: -2, headTilt: 0 });
  // Reaching down and back to the hilt in the floor without looking at it.
  def('sovReachHilt', 'sovReady', { rArm: 88, rFore: 92, rArmLen: 1.05, lArm: 90, lFore: 96, torso: 8, headTilt: -8, hipDrop: 5 });
  // A level block held out in front at chest height; the same arm thrown behind him to take a cut he isn't looking at.
  def('sovBlock', 'sovReady', { rArm: 36, rFore: -66, lArm: 90, lFore: 110, torso: -3, headTilt: 2, rLeg: 112, lLeg: 62, hipDrop: 6 });
  // What a stored figure does on its loop: lying where it was put.
  def('miniDead', 'stand', { rArm: 140, rFore: 120, lArm: 40, lFore: 70, rLeg: 70, rShin: 110, lLeg: 30, lShin: 80, torso: -10, headTilt: -10, rot: -88, hipDrop: 46 });
}
