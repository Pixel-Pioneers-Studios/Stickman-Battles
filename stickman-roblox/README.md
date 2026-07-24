# The 95th (Roblox)

**The 95th** is the Roblox-native build of the action game — the title nods to
the player being the 95th bearer. This is a rebuild, not a port. The browser/Godot
projects in this repo are *design references* only; nothing here mechanically
translates them. Code is idiomatic Luau, server-authoritative, and structured
for Roblox from the first line.

## Requirements

- [aftman](https://github.com/LPGhatguy/aftman) (toolchain manager) — or install Rojo directly
- Roblox Studio with the **Rojo** plugin
- VS Code with the recommended extensions (see `.vscode/extensions.json`)

## Getting started

```bash
cd stickman-roblox
aftman install         # installs the pinned Rojo (see aftman.toml)
rojo serve             # then click "Connect" in the Rojo Studio plugin
```

In Studio: open a **baseplate** place (or empty place), connect the Rojo plugin,
and press Play. `WorldService` builds the arena + spawn at runtime, so an empty
place is fine. Build a standalone file instead with:

```bash
rojo build -o StickmanRoblox.rbxlx
```

## Project layout

Rojo maps folders to services via `default.project.json`:

| Source | Roblox location | Contents |
|--------|-----------------|----------|
| `src/shared` | `ReplicatedStorage/Shared` | Config, definitions, Net catalog, utils, Loader |
| `src/server` | `ServerScriptService/Server` | Bootstrap + `Services/` + `Classes/` |
| `src/client` | `StarterPlayer/StarterPlayerScripts/Client` | Bootstrap + `Controllers/` |
| `src/starterGui` | `StarterGui` | HUD |

`ReplicatedStorage/Remotes` is created empty in the tree and populated at boot by
`Net.provision()`.

## Architecture

**Two-pass module lifecycle** (`Shared/Framework/Loader`): every ModuleScript in
a services/controllers folder may expose `Init` (wire up) and `Start` (run). All
`Init`s run before any `Start`, so units can reference each other freely in
`Start`. Add a system by dropping a file into the folder — no bootstrap edits.

**Server authority.** The client sends *intent* (`RequestAttack`, `RequestDodge`)
and never damage numbers. `CombatService` validates cooldown/state, advances the
combo, and — after the step's windup — runs the real hitbox query
(`EnemyService:QueryHitbox`) to decide what was hit. All player HP mutation goes
through `PlayerService:ApplyDamage` (one place enforces i-frames + death).

**Custom controller, no Humanoid gameplay logic.**
- Player: default control scripts + auto-rotate are disabled; `CharacterController`
  drives camera-relative movement, sprint, a deterministic burst dodge, manual
  facing, and server-driven knockback every frame. The Humanoid is used for
  locomotion *physics* only — it decides nothing.
- Enemy: fully kinematic (anchored part moved by CFrame + ground raycast), no
  Humanoid at all. Server owns position and state completely.

**Camera** (`CameraController`) is a scriptable over-the-shoulder rig that owns
yaw/pitch; the character reads it so "forward" is always consistent.

### Client ⇄ server surface (`Shared/Net/Net`)

| Remote | Dir | Purpose |
|--------|-----|---------|
| `RequestAttack` | C→S | attack intent ("light"/"heavy") |
| `RequestDodge` | C→S | dodge intent (server grants i-frames) |
| `RequestSuper` | C→S | super intent (server validates the meter) |
| `SetBlocking` | C→S | block held/released (server owns parry timing) |
| `BuyWeapon` | C→S | shop purchase intent (server validates price/coins) |
| `EquipWeapon` | C→S | equip intent (server validates ownership) |
| `CombatFeedback` | S→C | accept / reject / hit juice |
| `HealthChanged` | S→C | authoritative HP + knockback |
| `SuperChanged` | S→C | authoritative super meter (0..100) |
| `ProfileChanged` | S→C | authoritative profile (coins / owned / equipped) |
| `OpenShop` | S→C | merchant interacted with → show the shop UI |
| `DebugCommand` | C→S | Studio-only test panel (double-gated) |

## Controls

| Input | Keyboard / Mouse | Gamepad |
|-------|------------------|---------|
| Move / Sprint | WASD / hold Shift | Left stick / L3 |
| Camera | Mouse | Right stick |
| Light attack | E (or left mouse) | X |
| Heavy attack (armor-break) | Q (or right mouse) | Y |
| Super (needs full meter) | R | — |
| Dodge (i-frames) | Left Ctrl | B |
| Block / Parry | hold F | hold L1 |
| Jump | Space | A |

Block chips incoming damage; tapping block *just* as a hit lands (within
`ParryWindow`) parries it — no damage, brief i-frames, and the attacker is
stunned. The heavy attack staggers whatever it lands on.

## Vertical slice (Phase 1) — done

Project structure · bootstrap · input · camera · custom controller · one enemy
(Grunt) · one weapon (Sword, 3-hit combo) · one full combat interaction (you hit
it, it telegraphs and hits back, dodge i-frames work, HP replicates).

## Phase 2 — combat depth (done, build-verified, not yet Studio-playtested)

Heavy attack (armor-break stagger) · block + timed parry (parry stuns the
enemy) · a second enemy, the ranged **Archer**, with server-owned dodgeable
projectiles. All resolved server-side: block/parry/dodge run in
`PlayerService:ResolveIncomingHit`, projectiles in `EnemyService`.

## Phase 6 — economy, persistence, real shop (done, build-verified, not yet Studio-playtested)

The reward loop. Kills pay coins (`coins` per `Definitions/Enemies` entry, paid
to whoever lands the killing blow), clearing an Act pays every party member
`GameConfig.Economy.ActClearBonus`. `DataService` persists each player's profile
(coins · owned weapons · equipped weapon) to DataStore — pcall-guarded, with a
save-lock when a LOAD failed so a real profile can never be clobbered by
defaults, plus autosave/leave/close saves. The merchant now opens a real shop
(`ShopService` server-validates every purchase/equip; `ShopController` renders
the catalog straight from `Definitions/Weapons`). Two new melee weapons join the
Worn Blade: the **Iron Hewer** (axe — slow, brutal, huge knockback) and
**Duskfang** (katana — fast four-cut chain). The equipped weapon replicates via
the character's `Weapon` attribute; `CombatController` rebuilds the held visual
(per-def `visual` spec) and predicts with the right combo table.

## Migrating the big systems (Phase 2+)

Bring systems over one at a time, each as a service (server) or controller
(client) + data in `Shared/Definitions`:

1. **Weapons/abilities** — extend `Definitions/Weapons` with more combos +
   ability steps; keep resolution in `CombatService`.
2. **More enemies / bosses** — new `Definitions/Enemies` entries; split AI into a
   behaviour module the `Enemy` class delegates to (state machine → behaviour
   tree) as it grows.
3. **Save data** — a `DataService` over `DataStoreService` (or ProfileStore),
   feeding `PlayerService`.
4. **Story / dialogue / cutscenes / timeline** — a shared, data-driven
   `Definitions/Story` + a client `SequenceController`; drive the camera rig and
   UI from timeline events. This is where the reference game's declarative
   cinematic scripting maps cleanly onto Roblox.
5. **Progression / UI** — `ProgressionService` (server) + StarterGui screens.

The rule: **preserve behaviour and architecture, rewrite the implementation.**
