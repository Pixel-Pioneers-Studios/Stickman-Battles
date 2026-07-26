# First Studio Playtest — checklist

The whole codebase is build-verified but has never executed. This is the pass
that converts it from theoretical to real. Work top to bottom; the order is
dependency-shaped, so a failure early makes everything below it meaningless.

## Setup

1. `cd stickman-roblox && aftman install && rojo serve`
2. Studio → open a **baseplate place** → Rojo plugin → Connect.
3. **Open the Output window before pressing Play.** Filter for `[Loader]`.
4. Optional, for persistence: publish the place, then Game Settings →
   Security → Enable Studio Access to API Services.

> The Loader pcalls every `require`/`Init`/`Start` and only warns. A dead
> service produces a warning, not a crash — Output is the only place a
> failure is visible.

## Gate 0 — boot

- [ ] Zero `[Loader]` warnings in Output.
- [ ] Zero "Infinite yield possible" warnings (these mean a `WaitForChild`
      never resolved — usually WorldService failed and ActService is stuck).
- [ ] `ReplicatedStorage/Remotes` contains 14 RemoteEvents.

If Gate 0 fails, stop. Nothing below will be trustworthy.

## Gate 1 — world + character

- [ ] Lobby geometry exists; no z-fighting on the floor (the Baseplate strip
      in `WorldService:Start` should have removed the template).
- [ ] You spawn in the lobby, not in the void.
- [ ] WASD moves camera-relative; Shift sprints; Space jumps.
- [ ] Mouse drives the over-the-shoulder rig; character facing follows it.
- [ ] Default Roblox controls are actually disabled (no double-drive, no
      auto-rotate fighting the manual facing).

## Gate 2 — combat feel

- [ ] E light attack — 3-hit combo chains, resets on pause.
- [ ] Q heavy attack — staggers, armor-break reads as distinct from light.
- [ ] Left Ctrl dodge — burst moves you, i-frames actually negate a hit.
- [ ] Hold F blocks (chip damage); tapping F on the hit parries (no damage,
      attacker stunned).
- [ ] R super only fires at a full meter; meter fills from dealing *and*
      taking damage and persists across death.
- [ ] HP bar tracks the server value; knockback replicates without rubber-band.

## Gate 3 — enemies

- [ ] Husk, Reaver, Reaver Captain, Warden all spawn with correct visuals.
- [ ] Kinematic enemies stay on the ground (no sinking, no floating —
      the ground raycast is the thing most likely to be wrong).
- [ ] Enemies telegraph before hitting; they path to you and don't jitter.
- [ ] The Warden's behaviour module runs its phases rather than idling.
- [ ] Killing an enemy pays coins to the killing-blow player only.

## Gate 4 — act loop

- [ ] Start Pad teleports the party to stage 1.
- [ ] All 8 stages advance in order; the ActProgress HUD text matches.
- [ ] Dying mid-run returns you to the current stage's arrival, not the lobby
      (escape stages should return you to the *next* stage's arrival).
- [ ] Clearing the act pays the bonus and returns everyone to the lobby.
- [ ] Run scaling: encounter size changes with party headcount.

## Gate 5 — economy + persistence

- [ ] Merchant opens the real shop UI.
- [ ] Buying with insufficient coins is rejected server-side.
- [ ] Equipping changes the held visual and the combo table (Worn Blade 3-hit
      vs Duskfang 4-cut vs Iron Hewer slow/heavy).
- [ ] Skill tree: spending a point validates prereqs and applies the stat.
- [ ] **With API access on:** rejoin and your coins/owned/equipped survive.
- [ ] **With API access off:** you still get a working in-memory profile and
      the shop still functions (it should warn, not break).

## Gate 6 — multiplayer

Studio → Test → Clients and Servers → 2 players.

- [ ] Both players see each other move and attack.
- [ ] Damage is server-resolved (no client can deal damage directly).
- [ ] Party act run works with 2; encounter scales.

## Notes

Record what fails with the exact Output text. Failures at Gate 0-1 are
structural; failures at Gate 2-3 are tuning and expected on a first run.
