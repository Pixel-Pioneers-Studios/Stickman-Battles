--!strict
--[[
	Zones
	-----
	Layout constants for the "zones in one place" structure. The lobby and each
	Act live as separate regions of the SAME Workspace; "teleporting" a party is
	just moving their characters between these coordinates. WorldService BUILDS
	each zone from this data; ActService READS it to place arrivals and spawns.
	One source of truth so the two can never disagree about where a zone is.
]]

local Zones = {}

-- The hub players spawn into. Contains the shop + the Start Pad that begins a run.
Zones.Lobby = {
	center = Vector3.new(0, 0, 0),
	size = 130, -- square floor, studs
	playerSpawn = Vector3.new(0, 4, -40),
	startPad = Vector3.new(0, 0, 34), -- where the "Begin Act I" pad sits
}

-- Act I "The Buried Approach" — a staged God-of-War-style march that heads +X
-- away from the lobby. Eight contiguous regions joined by short walled corridors
-- with GATES: the party is teleported into stage 1 once, then WALKS forward,
-- each gate opening as its stage clears. WorldService builds every region, gate,
-- sigil and corridor FROM this table; ActService reads the same table to drive
-- the stage state machine. One source of truth so the two can never disagree.
--
-- Per-stage accent/floor tints give each region a distinct identity. Gates are
-- named Gate1..Gate3 (built at each stage's +X exit); sigils Sigil1..Sigil3.
local ACCENT_1 = Color3.fromRGB(210, 140, 80) -- Causeway: warm dust
local ACCENT_CRYPT = Color3.fromRGB(90, 200, 140) -- Crypt: sickly tomb-green
local ACCENT_2 = Color3.fromRGB(120, 185, 225) -- Sigils: cold rune-blue
local ACCENT_WATCH = Color3.fromRGB(235, 200, 90) -- Watchers: lantern gold
local ACCENT_3 = Color3.fromRGB(210, 95, 95) -- Overlook: blood red
local ACCENT_ESC = Color3.fromRGB(255, 120, 40) -- Collapse: burning orange
local ACCENT_SHRINE = Color3.fromRGB(140, 235, 220) -- Shrine: healing teal
local ACCENT_4 = Color3.fromRGB(160, 70, 190) -- Warden's Court: royal purple

Zones.Act1 = {
	-- Initial teleport target = stage 1's arrival. Kept as `arrival` for anyone
	-- (ActService) that still reads the top-level field.
	arrival = Vector3.new(680, 4, 0),

	-- Four contiguous stages, marching +X. Each: a framed region (center + sizeX
	-- x sizeZ), a walk-in arrival point, its +X exit gate, and the encounter data
	-- ActService uses to populate/clear it. Stage 4 has no gate (its clear ends
	-- the act).
	stages = {
		-- 1) THE CAUSEWAY — a long ruined road. Two ambush packs spring when the
		-- party crosses hidden trigger points; clears when both are dead.
		{
			id = 1,
			kind = "road",
			name = "The Causeway",
			objectiveText = "Fight down the ruined road",
			center = Vector3.new(820, 0, 0),
			sizeX = 380,
			sizeZ = 100,
			accent = ACCENT_1,
			floorColor = Color3.fromRGB(58, 52, 44),
			arrival = Vector3.new(680, 4, 0),
			gate = { x = 1010, width = 46, height = 34 },
			ambushes = {
				{ trigger = Vector3.new(760, 0, 0), radius = 26, spawn = Vector3.new(835, 3, 0), pack = { Grunt = 2, Reaver = 1 } },
				{ trigger = Vector3.new(915, 0, 0), radius = 26, spawn = Vector3.new(975, 3, 0), pack = { Grunt = 3, Reaver = 1 } },
			},
		},

		-- 2) THE COLLAPSED CRYPT — a dark tomb interior: sparse torchlight, floor
		-- gaps to hop, and hidden treasure. ActService picks `chestCount` chests
		-- from `chestPool` each run (the rest stay hidden), so repeat runs differ.
		-- No required combat: the stage completes when the party reaches the exit.
		{
			id = 2,
			kind = "crypt",
			name = "The Collapsed Crypt",
			objectiveText = "Find a way through the crypt",
			center = Vector3.new(1150, 0, 0),
			sizeX = 240,
			sizeZ = 90,
			accent = ACCENT_CRYPT,
			floorColor = Color3.fromRGB(38, 42, 40),
			arrival = Vector3.new(1040, 4, 0),
			gate = { x = 1270, width = 46, height = 34 },
			enclosed = true, -- a real interior: walls + roof, lit by torches only
			-- Floor gaps the party hops across (fall = climb back up a ramp, not death).
			gaps = {
				{ x = 1100, width = 10 },
				{ x = 1170, width = 12 },
				{ x = 1225, width = 10 },
			},
			chestPool = {
				Vector3.new(1075, 0, -32),
				Vector3.new(1140, 0, 34),
				Vector3.new(1195, 0, -34),
				Vector3.new(1250, 0, 30),
			},
			chestCount = 2,
			chestCoins = 25,
			exitTrigger = { pos = Vector3.new(1262, 0, 0), radius = 14 },
		},

		-- 3) THE GATE OF SIGILS — a ruin plaza puzzle. Channel three sigil
		-- pedestals (each spawns a guardian wave); all lit + all enemies dead opens
		-- the gate. The third sigil hides down a southern side alcove (exploration).
		{
			id = 3,
			kind = "sigils",
			name = "The Gate of Sigils",
			objectiveText = "Channel the three sigils",
			center = Vector3.new(1430, 0, 0),
			sizeX = 220,
			sizeZ = 220,
			accent = ACCENT_2,
			floorColor = Color3.fromRGB(44, 52, 60),
			arrival = Vector3.new(1330, 4, 0),
			gate = { x = 1540, width = 46, height = 34 },
			sigils = {
				Vector3.new(1380, 0, -58),
				Vector3.new(1490, 0, -58),
				Vector3.new(1430, 0, 155), -- inside the hidden alcove
			},
			-- Side alcove room attached to the plaza's south edge (holds sigil 3).
			alcove = { center = Vector3.new(1430, 0, 150), sizeX = 64, sizeZ = 84 },
			-- Guardians summoned each time a sigil is channelled.
			guardianWave = { Grunt = 1, Reaver = 1 },
			guardianSpawn = Vector3.new(1430, 3, 0),
		},

		-- 4) THE WATCHERS' HALL — stealth: a lantern-lit hall patrolled by
		-- sweeping-gaze Watcher statues. Enter a gaze cone and a punishment wave
		-- spawns (capped at `maxPunishments`). Reach the exit with every spawned
		-- enemy dead to open the gate. Sneaking through clean spawns nothing.
		{
			id = 4,
			kind = "stealth",
			name = "The Watchers' Hall",
			objectiveText = "Slip past the Watchers",
			center = Vector3.new(1690, 0, 0),
			sizeX = 260,
			sizeZ = 110,
			accent = ACCENT_WATCH,
			floorColor = Color3.fromRGB(52, 48, 38),
			arrival = Vector3.new(1570, 4, 0),
			gate = { x = 1820, width = 46, height = 34 },
			enclosed = true,
			-- Each Watcher sweeps its gaze back and forth: `sweepDeg` total arc,
			-- one full back-and-forth every `period` seconds, seeing `range` studs.
			watchers = {
				{ pos = Vector3.new(1630, 0, -26), facingDeg = 90, sweepDeg = 110, period = 6, range = 34 },
				{ pos = Vector3.new(1690, 0, 26), facingDeg = 270, sweepDeg = 110, period = 7, range = 34 },
				{ pos = Vector3.new(1752, 0, -20), facingDeg = 90, sweepDeg = 120, period = 5.5, range = 34 },
			},
			punishmentWave = { Grunt = 2, Reaver = 1 },
			punishmentSpawn = Vector3.new(1690, 3, 0),
			maxPunishments = 3,
			detectionCooldown = 4, -- seconds between punishment spawns
			exitTrigger = { pos = Vector3.new(1808, 0, 0), radius = 14 },
		},

		-- 5) THE OVERLOOK — a combat arena: two party-scaled waves, then the
		-- Reaver Captain miniboss.
		{
			id = 5,
			kind = "arena",
			name = "The Overlook",
			objectiveText = "Survive the arena, then the Captain",
			center = Vector3.new(1950, 0, 0),
			sizeX = 220,
			sizeZ = 220,
			accent = ACCENT_3,
			floorColor = Color3.fromRGB(60, 46, 46),
			arrival = Vector3.new(1850, 4, 0),
			gate = { x = 2060, width = 46, height = 34 },
			waves = {
				{ Grunt = 3, Reaver = 1 },
				{ Grunt = 3, Reaver = 2 },
			},
			waveSpawn = Vector3.new(1950, 3, 0),
			waveRadius = 34,
			miniboss = { def = "ReaverCaptain", pos = Vector3.new(1950, 4, 22) },
		},

		-- 6) THE COLLAPSE — escape sequence. Killing the Captain destabilised the
		-- ruin: a destruction wall advances from behind (slightly slower than
		-- sprint speed) while debris rains ahead. Everyone alive past `finishX`
		-- completes the stage. Its gate stands OPEN for the whole escape.
		{
			id = 6,
			kind = "escape",
			name = "The Collapse",
			objectiveText = "RUN!",
			center = Vector3.new(2230, 0, 0),
			sizeX = 300,
			sizeZ = 60,
			accent = ACCENT_ESC,
			floorColor = Color3.fromRGB(56, 44, 36),
			arrival = Vector3.new(2090, 4, 0),
			gate = { x = 2380, width = 46, height = 34 },
			escape = {
				wallStartX = 2085,
				wallSpeed = 21, -- studs/sec; sprint is 24, so you outrun it — barely
				wallDamage = 25, -- per tick while touching the wall
				finishX = 2360,
				debrisInterval = 0.7, -- seconds between falling-debris spawns
				debrisDamage = 15,
			},
		},

		-- 7) THE SHRINE — the pacing beat before the finale: touching the shrine
		-- fully heals the party and (after a breath) opens the last gate. A secret
		-- chest hides behind it.
		{
			id = 7,
			kind = "shrine",
			name = "The Shrine",
			objectiveText = "Rest at the shrine",
			center = Vector3.new(2470, 0, 0),
			sizeX = 120,
			sizeZ = 120,
			accent = ACCENT_SHRINE,
			floorColor = Color3.fromRGB(42, 54, 52),
			arrival = Vector3.new(2415, 4, 0),
			gate = { x = 2530, width = 46, height = 34 },
			shrine = { pos = Vector3.new(2470, 0, 0), openDelay = 6 },
			secretChest = { pos = Vector3.new(2470, 0, 46), coins = 40 },
		},

		-- 8) THE WARDEN'S COURT — the boss finale: the Warden with a bumped HP
		-- scale on top of party scaling. Below half health the court itself turns
		-- hostile: telegraphed ruin-fall zones players must step out of.
		{
			id = 8,
			kind = "boss",
			name = "The Warden's Court",
			objectiveText = "Defeat the Warden",
			center = Vector3.new(2680, 0, 0),
			sizeX = 240,
			sizeZ = 240,
			accent = ACCENT_4,
			floorColor = Color3.fromRGB(50, 44, 58),
			arrival = Vector3.new(2570, 4, 0),
			-- No gate: clearing this ends the act.
			boss = { def = "Warden", pos = Vector3.new(2680, 4, 34), hpScale = 1.6 },
			hazard = {
				fromHealthFrac = 0.5, -- hazards begin below this boss health fraction
				interval = 4, -- seconds between ruin-fall zones
				telegraph = 1.2, -- warning-ring time before the hit lands
				radius = 9,
				damage = 18,
			},
		},
	},
}

-- Grouping pad: players stand on the Start Pad to join the next run. The
-- countdown begins as soon as ONE player is on the pad (solo runs are fine)
-- and the run auto-starts when it hits zero — no minimum party size. Stepping
-- off before launch removes you; an empty pad cancels the countdown.
Zones.Party = {
	countdown = 10, -- seconds from the first player stepping on to auto-start
	fullCountdown = 3, -- countdown is cut to this when the pad is full
	padRadius = 8, -- stand within this many studs of the pad center to join
}

-- Run scaling: how the encounter grows with party size (difficulty by headcount).
Zones.Scaling = {
	maxParty = 4,
	baseGrunts = 2,
	baseReavers = 1,
	perExtraPlayerGrunts = 1, -- +this many Grunts per player beyond the first
	perExtraPlayerReavers = 1,
	healthPerExtraPlayer = 0.15, -- +15% enemy HP per extra player
}

-- The lobby is a safe zone: no attacking, no supers. Everything outside its
-- footprint (plus a small margin) is a combat area. Both the server gate
-- (CombatService) and the client's optimistic swing check call this, so the
-- two can never disagree. Keep this working if the layout changes.
local LOBBY_SAFE_MARGIN = 15
function Zones.combatAllowed(position: Vector3): boolean
	local c = Zones.Lobby.center
	local half = Zones.Lobby.size / 2 + LOBBY_SAFE_MARGIN
	local inLobby = math.abs(position.X - c.X) <= half and math.abs(position.Z - c.Z) <= half
	return not inLobby
end

return table.freeze(Zones)
