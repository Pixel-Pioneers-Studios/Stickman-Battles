--!strict
--[[
	ActService
	----------
	Runs the co-op "Act" loop on top of the zones WorldService builds. Players
	spawn in the Lobby; the Start Pad works like a grouping teleporter: stand on
	it to join the next run, a countdown starts as soon as anyone is on it, and
	when it hits zero everyone on the pad is teleported into the Act I approach
	together. Solo starts are fine — there is no minimum party size — and a full
	pad shortens the countdown. Only the party that launched is pulled forward on
	respawn, returned to the lobby, and paid the clear bonus; anyone who stayed
	off the pad keeps browsing the shop undisturbed.

	Act I "The Buried Approach" is a staged God-of-War-style march (see
	Config/Zones): the party is teleported into stage 1, then WALKS +X through
	four contiguous regions joined by gated corridors. Each stage is its own
	encounter — ambushes, a sigil puzzle, an arena+miniboss, and the boss finale —
	and its gate opens when it clears. Runs are fully REPEATABLE: on clear or
	abandon every gate re-closes, sigils reset, leftover enemies die, and the next
	party can run it again.

	Difficulty scales with party size (Zones.Scaling): more players = more (and
	tougher) enemies.
]]

local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local RunService = game:GetService("RunService")

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Shared = ReplicatedStorage:WaitForChild("Shared")
local Zones = require(Shared.Config.Zones)
local GameConfig = require(Shared.Config.GameConfig)
local Net = require(Shared.Net.Net)

local EnemyService = require(script.Parent.EnemyService)
local DataService = require(script.Parent.DataService)
-- PlayerService is required for the new hazard/escape/shrine mechanics (wall +
-- debris + boss-court damage, shrine full-heal). This creates NO require cycle:
-- PlayerService does not require ActService (verified by grep).
local PlayerService = require(script.Parent.PlayerService)

local ActService = {}
ActService._running = false
ActService._party = {} :: { Player }
ActService._countdownEnd = nil :: number?
ActService._padLabel = nil :: TextLabel?

-- Stage state machine (only meaningful while a run is active).
ActService._stages = Zones.Act1.stages
ActService._stageIndex = 1
ActService._sr = {} :: any -- per-stage runtime (enemies, ambush/sigil/wave progress)
ActService._act1Model = nil :: Instance?
ActService._actProgress = nil :: RemoteEvent?

local SIGIL_RADIUS = 6 -- stand within this many studs of a pedestal to channel it
local SIGIL_CHANNEL_TIME = 2 -- seconds of standing to light a sigil
local GATE_OPEN_COLOR = Color3.fromRGB(60, 220, 90)
local GATE_CLOSED_COLOR = Color3.fromRGB(220, 50, 50)
local SIGIL_LIT_COLOR = Color3.fromRGB(120, 255, 170)

-- New-mechanic tuning (stages 2/4/6/7/8).
local CHEST_OPEN_RADIUS = 5 -- get this close to a revealed chest to open it
local CHEST_GOLD = Color3.fromRGB(255, 205, 90)
local STEALTH_CONE_DEG = 18 -- half-cone: spotted if within this angle of the gaze
local WATCHER_JITTER = 0.15 -- ±15% period jitter per run for replay variety
local WALL_DAMAGE_INTERVAL = 0.5 -- escape wall bites this often while overlapping
local DEBRIS_LIFETIME = 4 -- escape rocks self-destruct after this long
local HAZARD_RED = Color3.fromRGB(230, 60, 60)

-- Move a player's character to a world position (small per-index spread so a
-- party doesn't stack on one point). Safe if the character isn't ready.
local function teleport(player: Player, base: Vector3, index: number)
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if root then
		local offset = Vector3.new((index - 1.5) * 6, 0, 0)
		root.CFrame = CFrame.new(base + offset)
	end
end

-- Same, but wait for the root to exist first (used for freshly-spawned characters).
local function teleportWhenReady(player: Player, base: Vector3)
	task.spawn(function()
		local character = player.Character or player.CharacterAdded:Wait()
		local root = character:WaitForChild("HumanoidRootPart", 5) :: BasePart?
		if root then
			root.CFrame = CFrame.new(base + Vector3.new(0, 0, 0))
		end
	end)
end

function ActService:_setPadText(text: string)
	if self._padLabel then
		self._padLabel.Text = text
	end
end

function ActService:_isInParty(player: Player): boolean
	return table.find(self._party, player) ~= nil
end

-- Everyone currently standing on the Start Pad (alive characters only).
function ActService:_playersOnPad(): { Player }
	local base = Zones.Lobby.startPad
	local radius = Zones.Party.padRadius
	local onPad = {} :: { Player }
	for _, player in Players:GetPlayers() do
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if root and humanoid and humanoid.Health > 0 then
			local delta = root.Position - base
			local flat = Vector3.new(delta.X, 0, delta.Z)
			if flat.Magnitude <= radius and math.abs(delta.Y) < 14 then
				table.insert(onPad, player)
			end
		end
	end
	return onPad
end

-- Lobby tick: run the join/countdown state machine and keep the pad text live.
function ActService:_updatePad()
	local onPad = self:_playersOnPad()
	local maxParty = Zones.Scaling.maxParty
	local count = math.min(#onPad, maxParty)

	if count == 0 then
		self._countdownEnd = nil
		self:_setPadText("ACT I\nStand here to group up — starts automatically")
		return
	end

	local now = os.clock()
	if not self._countdownEnd then
		self._countdownEnd = now + Zones.Party.countdown
	end
	-- A full pad doesn't have to wait out the whole timer.
	if count >= maxParty then
		self._countdownEnd = math.min(self._countdownEnd :: number, now + Zones.Party.fullCountdown)
	end

	local remaining = (self._countdownEnd :: number) - now
	if remaining <= 0 then
		self._countdownEnd = nil
		self:_beginRun(onPad)
	else
		self:_setPadText(`ACT I — {count}/{maxParty}\nStarting in {math.ceil(remaining)}…`)
	end
end

-- ==========================================================================
-- Party scaling + spawning helpers
-- ==========================================================================

function ActService:_partySize(): number
	return math.clamp(#self._party, 1, Zones.Scaling.maxParty)
end

-- Per-enemy HP multiplier for the current party size.
function ActService:_hpScale(): number
	local n = self:_partySize()
	return 1 + Zones.Scaling.healthPerExtraPlayer * (n - 1)
end

-- Count still-alive enemies in a spawned list.
local function aliveCount(list): number
	local n = 0
	for _, e in list do
		if e and e.alive then
			n += 1
		end
	end
	return n
end

-- Spawn a composition ({ Grunt = n, Reaver = m }) ringed around `center`, scaled
-- by party size. Returns the list of spawned enemy objects for bookkeeping.
function ActService:_spawnPack(comp, center: Vector3, radius: number)
	local n = self:_partySize()
	local s = Zones.Scaling
	local hp = self:_hpScale()

	local ring = {} :: { string }
	if comp.Grunt then
		for _ = 1, comp.Grunt + (n - 1) * s.perExtraPlayerGrunts do
			table.insert(ring, "Grunt")
		end
	end
	if comp.Reaver then
		for _ = 1, comp.Reaver + (n - 1) * s.perExtraPlayerReavers do
			table.insert(ring, "Reaver")
		end
	end

	local list = {}
	local total = math.max(#ring, 1)
	for i, defId in ring do
		local angle = (i / total) * math.pi * 2
		local pos = Vector3.new(center.X + math.cos(angle) * radius, center.Y, center.Z + math.sin(angle) * radius)
		table.insert(list, EnemyService:Spawn(defId, pos, hp))
	end
	return list
end

-- Any party member within `radius` (flat distance) of a world point.
function ActService:_anyPlayerNear(pos: Vector3, radius: number): boolean
	for _, player in self._party do
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if root and humanoid and humanoid.Health > 0 then
			local d = root.Position - pos
			if Vector3.new(d.X, 0, d.Z).Magnitude <= radius then
				return true
			end
		end
	end
	return false
end

-- Alive character root of a party member, or nil.
local function partyRoot(player: Player): BasePart?
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if root and humanoid and humanoid.Health > 0 then
		return root
	end
	return nil
end

-- The nearest alive party member within `radius` (flat) of a point, or nil.
function ActService:_nearestPartyPlayer(pos: Vector3, radius: number): Player?
	local best, bestDist
	for _, player in self._party do
		local root = partyRoot(player)
		if root then
			local d = root.Position - pos
			local flat = Vector3.new(d.X, 0, d.Z).Magnitude
			if flat <= radius and (not bestDist or flat < bestDist) then
				best, bestDist = player, flat
			end
		end
	end
	return best
end

-- A random alive party member, or nil (used to target boss-court hazards).
function ActService:_randomAliveParty(): (Player?, BasePart?)
	local alive = {}
	for _, player in self._party do
		local root = partyRoot(player)
		if root then
			table.insert(alive, { player = player, root = root })
		end
	end
	if #alive == 0 then
		return nil, nil
	end
	local pick = alive[math.random(1, #alive)]
	return pick.player, pick.root
end

-- True if any alive party member has walked past `x` on the +X axis.
function ActService:_anyPartyPastX(x: number): boolean
	for _, player in self._party do
		local root = partyRoot(player)
		if root and root.Position.X >= x then
			return true
		end
	end
	return false
end

-- Find a built instance anywhere under the Act1 model by name (nil-guarded — the
-- world agent may name something slightly differently; callers degrade gracefully).
function ActService:_findInAct1(name: string): Instance?
	local act1 = self._act1Model
	return act1 and act1:FindFirstChild(name, true)
end

-- ==========================================================================
-- Gates + sigils (the resettable world state)
-- ==========================================================================

function ActService:_gatePane(id: number): BasePart?
	local act1 = self._act1Model
	local gate = act1 and act1:FindFirstChild("Gate" .. id)
	return gate and gate:FindFirstChild("Pane") :: BasePart?
end

-- Open a gate: green flash, then fade the pane out and drop its collision.
function ActService:_openGate(id: number)
	local pane = self:_gatePane(id)
	if not pane then
		return
	end
	pane.CanCollide = false
	pane.Color = GATE_OPEN_COLOR
	local glow = pane:FindFirstChild("Glow")
	if glow then
		(glow :: PointLight).Color = GATE_OPEN_COLOR
	end
	task.spawn(function()
		for i = 1, 12 do
			if not pane.Parent then
				return
			end
			pane.Transparency = 0.35 + (1 - 0.35) * (i / 12)
			task.wait(0.03)
		end
		pane.Transparency = 1
	end)
end

-- Restore a gate to its closed state (red, collidable) — used on every run end.
function ActService:_closeGate(id: number)
	local pane = self:_gatePane(id)
	if not pane then
		return
	end
	pane.CanCollide = true
	pane.Transparency = 0.35
	pane.Color = GATE_CLOSED_COLOR
	local glow = pane:FindFirstChild("Glow")
	if glow then
		(glow :: PointLight).Color = GATE_CLOSED_COLOR
	end
end

function ActService:_resetGates()
	for _, stage in self._stages do
		if stage.gate then
			self:_closeGate(stage.id)
		end
	end
end

function ActService:_sigilModel(i: number): Instance?
	local act1 = self._act1Model
	return act1 and act1:FindFirstChild("Sigil" .. i)
end

-- Toggle a sigil pedestal's lit look: bright disc + beam when active, dim when reset.
function ActService:_setSigilLit(i: number, lit: boolean)
	local m = self:_sigilModel(i)
	if not m then
		return
	end
	local sigilStage
	for _, s in self._stages do
		if s.kind == "sigils" then
			sigilStage = s
			break
		end
	end
	local restColor = sigilStage and sigilStage.accent or Color3.fromRGB(120, 185, 225)
	local disc = m:FindFirstChild("Disc") :: BasePart?
	if disc then
		disc.Transparency = lit and 0 or 0.55
		disc.Color = lit and SIGIL_LIT_COLOR or restColor
		local glow = disc:FindFirstChild("Glow")
		if glow then
			(glow :: PointLight).Color = lit and SIGIL_LIT_COLOR or restColor
			;(glow :: PointLight).Brightness = lit and 2.4 or 0.6
		end
	end
	local beam = m:FindFirstChild("Beam") :: BasePart?
	if beam then
		beam.Transparency = lit and 0.5 or 1
		beam.Color = lit and SIGIL_LIT_COLOR or restColor
	end
end

function ActService:_resetSigils()
	for i = 1, 3 do
		self:_setSigilLit(i, false)
	end
end

-- ==========================================================================
-- Chests (crypt + shrine secret) — built FULLY HIDDEN by WorldService; we
-- reveal a subset per run, open them on proximity, then re-hide them.
-- ==========================================================================

-- Reveal a chest model: make its BaseParts visible (Glow parts stay hidden),
-- enable its gold PointLight, and make its Body solid again. Nil-guarded.
function ActService:_revealChest(model: Instance?)
	if not model then
		return
	end
	for _, d in (model :: Instance):GetDescendants() do
		if d:IsA("BasePart") then
			if not string.find(d.Name, "Glow") then
				d.Transparency = 0
			end
			if d.Name == "Body" then
				d.CanCollide = true
			end
		elseif d:IsA("PointLight") then
			d.Enabled = true
		end
	end
end

-- Return a chest to its built-hidden look (used on open-finish and on reset).
function ActService:_hideChest(model: Instance?)
	if not model then
		return
	end
	for _, d in (model :: Instance):GetDescendants() do
		if d:IsA("BasePart") then
			d.Transparency = 1
			d.CanCollide = false
		elseif d:IsA("PointLight") then
			d.Enabled = false
		end
	end
end

-- Brief Neon-gold flash, then re-hide after ~1s (the "open" animation).
function ActService:_flashChest(model: Instance?)
	if not model then
		return
	end
	local m = model :: Instance
	for _, d in m:GetDescendants() do
		if d:IsA("BasePart") and not string.find(d.Name, "Glow") then
			d.Material = Enum.Material.Neon
			d.Color = CHEST_GOLD
		end
	end
	task.delay(1, function()
		self:_hideChest(m)
	end)
end

-- Re-hide EVERY chest in the act (all crypt pool entries + the shrine secret).
function ActService:_resetChests()
	for _, stage in self._stages do
		if stage.kind == "crypt" and stage.chestPool then
			for i = 1, #stage.chestPool do
				self:_hideChest(self:_findInAct1("Chest" .. stage.id .. "_" .. i))
			end
		elseif stage.kind == "shrine" and stage.secretChest then
			self:_hideChest(self:_findInAct1("Chest" .. stage.id .. "_1"))
		end
	end
end

-- Poll a list of { model, pos, coins, opened } chest entries: open (award + flash
-- + re-hide + toast) the first one a party member steps within CHEST_OPEN_RADIUS of.
function ActService:_pollChests(entries)
	for _, c in entries do
		if not c.opened then
			local player = self:_nearestPartyPlayer(c.pos, CHEST_OPEN_RADIUS)
			if player then
				c.opened = true
				DataService:AddCoins(player, c.coins)
				self:_flashChest(c.model)
				self:_pushProgress(`{player.DisplayName} opened a chest — +{c.coins} coins`)
			end
		end
	end
end

-- ==========================================================================
-- Watchers (stealth) — statue models rotated via PivotTo; gaze-cone detection.
-- ==========================================================================

-- Flash a watcher's Eye red for ~1s, restoring its captured base color after.
function ActService:_flashWatcherEye(model: Instance?)
	if not model then
		return
	end
	local eye = (model :: Instance):FindFirstChild("Eye", true) :: BasePart?
	if not eye then
		return
	end
	if eye:GetAttribute("BaseColor") == nil then
		eye:SetAttribute("BaseColor", eye.Color)
	end
	eye.Color = HAZARD_RED
	task.delay(1, function()
		if eye.Parent then
			local base = eye:GetAttribute("BaseColor")
			if typeof(base) == "Color3" then
				eye.Color = base
			end
		end
	end)
end

-- Restore all watcher eyes + facing to their built rest state (reset only).
function ActService:_resetWatchers()
	for _, stage in self._stages do
		if stage.kind == "stealth" and stage.watchers then
			for i, w in stage.watchers do
				local model = self:_findInAct1("Watcher" .. i)
				if model then
					local eye = (model :: Instance):FindFirstChild("Eye", true) :: BasePart?
					if eye and typeof(eye:GetAttribute("BaseColor")) == "Color3" then
						eye.Color = eye:GetAttribute("BaseColor") :: Color3
					end
					if (model :: any).PivotTo then
						(model :: any):PivotTo(CFrame.new(w.pos) * CFrame.Angles(0, math.rad(w.facingDeg), 0))
					end
				end
			end
		end
	end
end

-- ==========================================================================
-- Escape wall + debris (stage 6). Wall/debris are physical objects that must
-- be reset between runs, so we track spawned rocks for teardown.
-- ==========================================================================

function ActService:_doomWall(): BasePart?
	return self:_findInAct1("DoomWall") :: BasePart?
end

-- Move the wall to X (keeps Y/Z + orientation; the part is Anchored, CanCollide false).
function ActService:_setWallX(x: number, transparency: number?)
	local wall = self:_doomWall()
	if not wall then
		return
	end
	wall.Position = Vector3.new(x, wall.Position.Y, wall.Position.Z)
	if transparency then
		wall.Transparency = transparency
	end
end

-- Reset the wall to its start and destroy any stray rocks. Safe to call anytime.
function ActService:_resetEscape()
	local escapeStage
	for _, s in self._stages do
		if s.kind == "escape" then
			escapeStage = s
			break
		end
	end
	if escapeStage then
		self:_setWallX(escapeStage.escape.wallStartX, 1)
	end
	local sr = self._sr
	if sr and sr.debris then
		for _, rock in sr.debris do
			if rock and rock.Parent then
				rock:Destroy()
			end
		end
		sr.debris = {}
	end
end

-- ==========================================================================
-- Boss-court hazards (stage 8) — telegraphed ruin-fall zones.
-- ==========================================================================

-- Destroy any pending telegraph visuals (reset / stage-leave).
function ActService:_clearTelegraphs()
	local sr = self._sr
	if sr and sr.telegraphs then
		for _, t in sr.telegraphs do
			if t and t.Parent then
				t:Destroy()
			end
		end
		sr.telegraphs = {}
	end
end

-- Drop a telegraphed ruin-fall zone at `pos`: a flat red Neon disc that, after
-- `hazard.telegraph` seconds, damages every party member inside `radius`.
function ActService:_spawnHazard(stage, pos: Vector3)
	local hz = stage.hazard
	local tel = Instance.new("Part")
	tel.Name = "RuinFall"
	tel.Shape = Enum.PartType.Cylinder
	tel.Anchored = true
	tel.CanCollide = false
	tel.Material = Enum.Material.Neon
	tel.Color = HAZARD_RED
	tel.Transparency = 0.5
	tel.Size = Vector3.new(0.4, hz.radius * 2, hz.radius * 2)
	-- Cylinder axis is local X; rotate so the disc lies flat on the floor.
	tel.CFrame = CFrame.new(pos.X, 0.2, pos.Z) * CFrame.Angles(0, 0, math.rad(90))
	tel.Parent = self._act1Model or Workspace
	local sr = self._sr
	if sr.telegraphs then
		table.insert(sr.telegraphs, tel)
	end

	task.delay(hz.telegraph, function()
		if not tel.Parent then
			return
		end
		-- Impact: brief bright flash + area damage.
		tel.Transparency = 0.05
		for _, player in self._party do
			local root = partyRoot(player)
			if root then
				local d = root.Position - pos
				if Vector3.new(d.X, 0, d.Z).Magnitude <= hz.radius then
					PlayerService:ApplyDamage(player, hz.damage)
				end
			end
		end
		task.delay(0.18, function()
			if tel.Parent then
				tel:Destroy()
			end
		end)
	end)
end

-- Disconnect any per-stage event connections held on the current runtime.
function ActService:_teardownStageConnections()
	local sr = self._sr
	if sr and sr.shrineConn then
		sr.shrineConn:Disconnect()
		sr.shrineConn = nil
	end
end

-- Full world-extras reset: re-hide chests, reset the wall + debris, clear
-- telegraphs, and restore watchers. Part of making every run repeatable.
function ActService:_resetWorldExtras()
	self:_teardownStageConnections()
	self:_resetChests()
	self:_resetEscape()
	self:_clearTelegraphs()
	self:_resetWatchers()
end

-- ==========================================================================
-- Objective HUD push
-- ==========================================================================

function ActService:_progressText(): string?
	local stage = self._stages[self._stageIndex]
	local sr = self._sr
	local k = stage.kind
	if k == "road" then
		local spawned = #sr.enemies
		if spawned == 0 then
			return "Advance the causeway"
		end
		return string.format("%d/%d foes", spawned - aliveCount(sr.enemies), spawned)
	elseif k == "crypt" then
		local opened = 0
		for _, c in sr.chests or {} do
			if c.opened then
				opened += 1
			end
		end
		return string.format("Chests found: %d/%d", opened, #(sr.chests or {}))
	elseif k == "sigils" then
		local active = 0
		for _, v in sr.sigilActive or {} do
			if v then
				active += 1
			end
		end
		return string.format("%d/%d sigils", active, #stage.sigils)
	elseif k == "stealth" then
		local spawned = #sr.enemies
		if spawned == 0 then
			return "Undetected"
		end
		return string.format("%d/%d foes", spawned - aliveCount(sr.enemies), spawned)
	elseif k == "arena" then
		if sr.bossSpawned then
			return "Reaver Captain"
		end
		return string.format("Wave %d/%d", math.max(sr.waveIndex or 1, 1), #stage.waves)
	elseif k == "escape" then
		return "Reach the exit — don't stop!"
	elseif k == "shrine" then
		return sr.shrineUsed and "The shrine is spent" or nil
	else
		return "The Warden"
	end
end

-- Build the ActProgress payload for the current stage. `toast` is an optional
-- transient event line; `urgent` styling is derived from the escape stage so the
-- banner turns hostile for the whole run and reverts on any other stage.
function ActService:_buildPayload(toast: string?)
	local stage = self._stages[self._stageIndex]
	local sr = self._sr
	return {
		active = true,
		act = 1,
		stage = self._stageIndex,
		total = #self._stages,
		name = stage.name,
		objective = (sr and sr.objectiveOverride) or stage.objectiveText,
		progress = self:_progressText(),
		toast = toast,
		urgent = stage.kind == "escape",
	}
end

-- Fire ActProgress to every party member (drives the objective banner + the
-- stage-title splash on the client). Pass `toast` to attach a one-off event line.
function ActService:_pushProgress(toast: string?)
	if not self._actProgress then
		return
	end
	local payload = self:_buildPayload(toast)
	for _, player in self._party do
		self._actProgress:FireClient(player, payload)
	end
end

function ActService:_pushProgressTo(player: Player)
	if not self._actProgress or not self._running then
		return
	end
	self._actProgress:FireClient(player, self:_buildPayload(nil))
end

function ActService:_hideProgress()
	if not self._actProgress then
		return
	end
	for _, player in self._party do
		if player.Parent then
			self._actProgress:FireClient(player, { active = false })
		end
	end
end

-- ==========================================================================
-- Stage state machine
-- ==========================================================================

-- Enter stage `n`: reset its runtime, spawn whatever should be present up front,
-- and push a fresh ActProgress (a stage-number change triggers the title splash).
function ActService:_enterStage(n: number)
	-- Tear down connections/state held by the stage we're leaving.
	self:_teardownStageConnections()

	self._stageIndex = n
	local stage = self._stages[n]
	local sr = { enemies = {}, stageStart = os.clock() }
	self._sr = sr
	local k = stage.kind

	if k == "road" then
		-- Randomize which ambush pack fires at which trigger (per-run variety).
		local packs = {}
		for _, amb in stage.ambushes do
			table.insert(packs, amb.pack)
		end
		for i = #packs, 2, -1 do
			local j = math.random(1, i)
			packs[i], packs[j] = packs[j], packs[i]
		end
		sr.ambushPacks = packs
		sr.ambushTriggered = {}
		for i = 1, #stage.ambushes do
			sr.ambushTriggered[i] = false
		end
	elseif k == "crypt" then
		-- Pick a fresh random subset of the chest pool, then reveal only those.
		local pool = {}
		for i = 1, #stage.chestPool do
			pool[i] = i
		end
		for i = #pool, 2, -1 do
			local j = math.random(1, i)
			pool[i], pool[j] = pool[j], pool[i]
		end
		sr.chests = {}
		local want = math.clamp(stage.chestCount or 1, 0, #pool)
		for i = 1, want do
			local idx = pool[i]
			local model = self:_findInAct1("Chest" .. stage.id .. "_" .. idx)
			if model then
				self:_revealChest(model)
			else
				warn(`[ActService] crypt chest Chest{stage.id}_{idx} not found`)
			end
			table.insert(sr.chests, {
				model = model,
				pos = stage.chestPool[idx],
				coins = stage.chestCoins,
				opened = false,
			})
		end
	elseif k == "sigils" then
		sr.sigilActive = {}
		sr.sigilProgress = {}
		for i = 1, #stage.sigils do
			sr.sigilActive[i] = false
			sr.sigilProgress[i] = 0
		end
	elseif k == "stealth" then
		sr.punishments = 0
		sr.lastPunish = -math.huge
		sr.watchers = {}
		for i, w in stage.watchers do
			-- Jitter the sweep period ±15% for run-to-run variety.
			local jitter = 1 + (math.random() * 2 - 1) * WATCHER_JITTER
			table.insert(sr.watchers, {
				pos = w.pos,
				facingDeg = w.facingDeg,
				sweepDeg = w.sweepDeg,
				range = w.range,
				period = math.max(0.5, w.period * jitter),
				model = self:_findInAct1("Watcher" .. i),
			})
		end
	elseif k == "arena" then
		sr.waveIndex = 0
		sr.bossSpawned = false
		self:_startNextWave(stage) -- spawns wave 1
	elseif k == "escape" then
		local esc = stage.escape
		sr.wallX = esc.wallStartX
		sr.wallDmgTimer = 0
		sr.debrisTimer = 0
		sr.debris = {}
		-- The escape gate stands OPEN for the whole sequence; reveal the wall.
		self:_openGate(stage.id)
		self:_setWallX(esc.wallStartX, 0.15)
	elseif k == "shrine" then
		sr.shrineUsed = false
		sr.gateOpened = false
		sr.chests = {}
		local focus = self:_findInAct1("Focus") :: BasePart?
		if focus then
			sr.shrineConn = focus.Touched:Connect(function(hit)
				self:_onFocusTouched(hit)
			end)
		else
			warn("[ActService] shrine Focus part not found")
		end
	elseif k == "boss" then
		local b = stage.boss
		sr.bossSpawned = true
		sr.hazardTimer = 0
		sr.telegraphs = {}
		sr.enemies = { EnemyService:Spawn(b.def, b.pos, self:_hpScale() * (b.hpScale or 1)) }
	end

	self:_pushProgress()
end

-- Shrine "Focus" touched by a party member (once per run): heal everyone, reveal
-- the secret chest, retint the objective, and open the last gate after a breath.
function ActService:_onFocusTouched(hit: BasePart)
	local sr = self._sr
	if not sr or sr.shrineUsed then
		return
	end
	local character = hit and hit:FindFirstAncestorOfClass("Model")
	local player = character and Players:GetPlayerFromCharacter(character)
	if not player or not self:_isInParty(player) then
		return
	end

	sr.shrineUsed = true
	local stage = self._stages[self._stageIndex]

	for _, member in self._party do
		PlayerService:HealFull(member)
	end

	-- Reveal + arm the secret chest (same proximity-open mechanic as the crypt).
	if stage.secretChest then
		local model = self:_findInAct1("Chest" .. stage.id .. "_1")
		if model then
			self:_revealChest(model)
		else
			warn(`[ActService] shrine secret chest Chest{stage.id}_1 not found`)
		end
		table.insert(sr.chests, {
			model = model,
			pos = stage.secretChest.pos,
			coins = stage.secretChest.coins,
			opened = false,
		})
	end

	sr.objectiveOverride = "Proceed when ready"
	self:_pushProgress("The shrine restores you.")

	local delay = (stage.shrine and stage.shrine.openDelay) or 4
	task.delay(delay, function()
		-- Guard: the run may have ended (or advanced) during the breath.
		if not self._running or self._stages[self._stageIndex] ~= stage then
			return
		end
		sr.gateOpened = true
		self:_openGate(stage.id)
	end)
end

function ActService:_startNextWave(stage)
	self._sr.waveIndex += 1
	local comp = stage.waves[self._sr.waveIndex]
	self._sr.enemies = self:_spawnPack(comp, stage.waveSpawn, stage.waveRadius)
end

-- Returns true when the current stage is cleared. Handles clear conditions +
-- coarse spawning; the finer per-frame gameplay (watcher gaze, escape wall +
-- debris, boss-court hazards) runs in `_animTick` on a Heartbeat.
function ActService:_updateStage(dt: number): boolean
	local stage = self._stages[self._stageIndex]
	local sr = self._sr
	local k = stage.kind

	if k == "road" then
		-- Trip each hidden ambush when the party crosses it, then clear on kills.
		for i, amb in stage.ambushes do
			if not sr.ambushTriggered[i] and self:_anyPlayerNear(amb.trigger, amb.radius) then
				sr.ambushTriggered[i] = true
				local pack = (sr.ambushPacks and sr.ambushPacks[i]) or amb.pack
				for _, e in self:_spawnPack(pack, amb.spawn, 10) do
					table.insert(sr.enemies, e)
				end
				self:_pushProgress()
			end
		end
		local allTriggered = true
		for i = 1, #stage.ambushes do
			if not sr.ambushTriggered[i] then
				allTriggered = false
			end
		end
		return allTriggered and aliveCount(sr.enemies) == 0
	elseif k == "crypt" then
		-- Loot is optional; open chests on approach, clear on reaching the exit.
		self:_pollChests(sr.chests or {})
		local et = stage.exitTrigger
		return et ~= nil and self:_anyPlayerNear(et.pos, et.radius)
	elseif k == "sigils" then
		-- Channel each sigil (stand near ~2s); each activation spawns a guardian wave.
		for i = 1, #stage.sigils do
			if not sr.sigilActive[i] then
				if self:_anyPlayerNear(stage.sigils[i], SIGIL_RADIUS) then
					sr.sigilProgress[i] += dt
					if sr.sigilProgress[i] >= SIGIL_CHANNEL_TIME then
						sr.sigilActive[i] = true
						self:_setSigilLit(i, true)
						for _, e in self:_spawnPack(stage.guardianWave, stage.guardianSpawn, 12) do
							table.insert(sr.enemies, e)
						end
						self:_pushProgress()
					end
				else
					sr.sigilProgress[i] = 0 -- forgiving-but-simple: reset on step-off
				end
			end
		end
		local allActive = true
		for i = 1, #stage.sigils do
			if not sr.sigilActive[i] then
				allActive = false
			end
		end
		return allActive and aliveCount(sr.enemies) == 0
	elseif k == "stealth" then
		-- Sneaking clean = instant on reach; otherwise every spawned enemy must die.
		local et = stage.exitTrigger
		local reached = et ~= nil and self:_anyPlayerNear(et.pos, et.radius)
		return reached and aliveCount(sr.enemies) == 0
	elseif k == "arena" then
		-- Two waves, then the miniboss. Advance only when the current group is dead.
		if aliveCount(sr.enemies) > 0 then
			return false
		end
		if sr.waveIndex < #stage.waves then
			self:_startNextWave(stage)
			self:_pushProgress()
			return false
		elseif not sr.bossSpawned then
			sr.bossSpawned = true
			local mb = stage.miniboss
			sr.enemies = { EnemyService:Spawn(mb.def, mb.pos, self:_hpScale()) }
			self:_pushProgress()
			return false
		end
		return true
	elseif k == "escape" then
		-- Everyone still ALIVE must be past finishX (the dead respawn ahead and count).
		local finishX = stage.escape.finishX
		for _, player in self._party do
			local root = partyRoot(player)
			if root and root.Position.X < finishX then
				return false
			end
		end
		return true
	elseif k == "shrine" then
		-- Optional secret chest; clear once the shrine has opened the gate and a
		-- party member steps through it.
		self:_pollChests(sr.chests or {})
		return sr.gateOpened == true and self:_anyPartyPastX(stage.gate.x)
	else
		-- Warden's Court: boss dead = act clear.
		return aliveCount(sr.enemies) == 0
	end
end

-- Per-Heartbeat animation + high-frequency gameplay for the current stage only.
function ActService:_animTick(dt: number)
	if not self._running then
		return
	end
	local stage = self._stages[self._stageIndex]
	if not stage then
		return
	end
	local k = stage.kind
	if k == "stealth" then
		self:_tickStealth(stage, dt)
	elseif k == "escape" then
		self:_tickEscape(stage, dt)
	elseif k == "boss" then
		self:_tickBossHazard(stage, dt)
	end
end

-- STEALTH: sweep each watcher's gaze and spawn a capped punishment wave on a
-- clean line-of-sight spot.
function ActService:_tickStealth(stage, _dt: number)
	local sr = self._sr
	if not sr.watchers then
		return
	end
	local elapsed = os.clock() - (sr.stageStart or os.clock())
	for _, w in sr.watchers do
		local model = w.model
		if model and (model :: any).PivotTo then
			local yaw = w.facingDeg + math.sin(elapsed * (2 * math.pi) / w.period) * (w.sweepDeg / 2)
			local cf = CFrame.new(w.pos) * CFrame.Angles(0, math.rad(yaw), 0)
			;(model :: any):PivotTo(cf)

			-- Detection: within range + inside the gaze half-cone + clear line of sight.
			local eye = (model :: Instance):FindFirstChild("Eye", true) :: BasePart?
			local eyePos = eye and eye.Position or (w.pos + Vector3.new(0, 4, 0))
			local facing = cf.LookVector
			local facingFlat = Vector3.new(facing.X, 0, facing.Z)
			if facingFlat.Magnitude > 0 then
				facingFlat = facingFlat.Unit
			end
			for _, player in self._party do
				local root = partyRoot(player)
				if root then
					local to = root.Position - w.pos
					local flat = Vector3.new(to.X, 0, to.Z)
					if flat.Magnitude <= w.range and flat.Magnitude > 0 then
						local dot = math.clamp(flat.Unit:Dot(facingFlat), -1, 1)
						if math.deg(math.acos(dot)) <= STEALTH_CONE_DEG and self:_hasLineOfSight(model, eyePos, root) then
							self:_onWatcherSpot(stage, model)
							break
						end
					end
				end
			end
		end
	end
end

-- True if nothing (other than the watcher itself) blocks Eye -> player root.
function ActService:_hasLineOfSight(watcherModel: Instance, eyePos: Vector3, root: BasePart): boolean
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { watcherModel }
	local dir = root.Position - eyePos
	local result = Workspace:Raycast(eyePos, dir, params)
	if not result then
		return true -- open line to the player's position
	end
	return result.Instance:IsDescendantOf(root.Parent :: Instance)
end

-- A watcher spotted someone: spawn a capped punishment wave on cooldown.
function ActService:_onWatcherSpot(stage, model: Instance)
	local sr = self._sr
	local now = os.clock()
	if sr.punishments >= stage.maxPunishments then
		return
	end
	if now - sr.lastPunish < stage.detectionCooldown then
		return
	end
	sr.punishments += 1
	sr.lastPunish = now
	for _, e in self:_spawnPack(stage.punishmentWave, stage.punishmentSpawn, 10) do
		table.insert(sr.enemies, e)
	end
	self:_flashWatcherEye(model)
	self:_pushProgress("The Watchers see you!")
end

-- ESCAPE: advance the wall, bite anyone it overtakes, and rain debris.
function ActService:_tickEscape(stage, dt: number)
	local sr = self._sr
	local esc = stage.escape
	sr.wallX = (sr.wallX or esc.wallStartX) + esc.wallSpeed * dt
	self:_setWallX(sr.wallX)

	-- Wall damage on a fixed half-second cadence to anyone it has caught.
	sr.wallDmgTimer = (sr.wallDmgTimer or 0) + dt
	if sr.wallDmgTimer >= WALL_DAMAGE_INTERVAL then
		sr.wallDmgTimer -= WALL_DAMAGE_INTERVAL
		local halfZ = stage.sizeZ / 2
		for _, player in self._party do
			local root = partyRoot(player)
			if root and root.Position.X < sr.wallX + 2 and math.abs(root.Position.Z - stage.center.Z) <= halfZ then
				PlayerService:ApplyDamage(player, esc.wallDamage)
			end
		end
	end

	-- Falling debris ahead of the party.
	sr.debrisTimer = (sr.debrisTimer or 0) + dt
	if sr.debrisTimer >= esc.debrisInterval then
		sr.debrisTimer -= esc.debrisInterval
		self:_spawnDebris(stage)
	end
end

-- One unanchored rock dropped ahead of the wall; damages a party member once.
function ActService:_spawnDebris(stage)
	local esc = stage.escape
	local sr = self._sr
	local loX = (sr.wallX or esc.wallStartX) + 25
	local hiX = esc.finishX
	if hiX <= loX then
		return
	end
	local halfZ = stage.sizeZ / 2 - 6
	local rock = Instance.new("Part")
	rock.Name = "Debris"
	rock.Material = Enum.Material.Slate
	rock.Color = Color3.fromRGB(92, 88, 82)
	local s = 3 + math.random() * 2
	rock.Size = Vector3.new(s, s, s)
	rock.Position = Vector3.new(loX + math.random() * (hiX - loX), 26, stage.center.Z + (math.random() * 2 - 1) * halfZ)
	rock.Anchored = false
	rock.CanCollide = true
	local hitDone = false
	rock.Touched:Connect(function(other)
		if hitDone then
			return
		end
		local character = other and other:FindFirstAncestorOfClass("Model")
		local player = character and Players:GetPlayerFromCharacter(character)
		if player and self:_isInParty(player) then
			hitDone = true
			PlayerService:ApplyDamage(player, esc.debrisDamage)
		end
	end)
	rock.Parent = self._act1Model or Workspace
	if sr.debris then
		table.insert(sr.debris, rock)
	end
	task.delay(DEBRIS_LIFETIME, function()
		if rock.Parent then
			rock:Destroy()
		end
	end)
end

-- BOSS HAZARD: below the health threshold, telegraph ruin-fall zones on the party.
function ActService:_tickBossHazard(stage, dt: number)
	local sr = self._sr
	local boss = sr.enemies and sr.enemies[1]
	if not boss or not boss.alive or not boss.maxHealth then
		return
	end
	if boss.health / boss.maxHealth >= stage.hazard.fromHealthFrac then
		return
	end
	sr.hazardTimer = (sr.hazardTimer or 0) + dt
	if sr.hazardTimer >= stage.hazard.interval then
		sr.hazardTimer = 0
		local _player, root = self:_randomAliveParty()
		if root then
			self:_spawnHazard(stage, root.Position)
		end
	end
end

-- Current stage cleared: open its gate and either advance (party walks forward)
-- or, if it was the finale, end the run with rewards.
function ActService:_completeStage()
	local n = self._stageIndex
	local stage = self._stages[n]
	if stage.gate then
		self:_openGate(n)
	end
	-- Leaving the escape: stop the wall and clear its debris before advancing.
	if stage.kind == "escape" then
		self:_resetEscape()
	end
	if n < #self._stages then
		self:_enterStage(n + 1)
	else
		self:_endRun(true)
	end
end

-- ==========================================================================
-- Run lifecycle
-- ==========================================================================

-- Launch a run with the players who were on the pad (capped at maxParty —
-- anyone beyond the cap simply stays in the lobby for the next one).
function ActService:_beginRun(onPad: { Player })
	if self._running then
		return
	end

	self._party = {}
	for i = 1, math.min(#onPad, Zones.Scaling.maxParty) do
		table.insert(self._party, onPad[i])
	end
	if #self._party == 0 then
		return
	end
	self._running = true

	-- Everyone starts fresh at stage 1: close all gates, dim all sigils.
	self:_resetGates()
	self:_resetSigils()

	for i, player in self._party do
		teleport(player, self._stages[1].arrival, i)
	end

	self:_enterStage(1)
	self:_setPadText("ACT I\nRun in progress…")
	print(`[ActService] Act I started (party {#self._party})`)
end

function ActService:_endRun(cleared: boolean)
	if not self._running then
		return
	end
	self._running = false

	-- Hide the objective HUD before we move/scatter the party.
	self:_hideProgress()

	local i = 0
	for _, player in self._party do
		if player.Parent then
			i += 1
			teleport(player, Zones.Lobby.playerSpawn, i)
			if cleared then
				-- Act clear: every surviving party member gets the shared bonus and
				-- skill points (kills already paid the killers individually).
				DataService:AddCoins(player, GameConfig.Economy.ActClearBonus)
				DataService:AddSkillPoints(player, 2)
			end
		end
	end

	-- Make the run REPEATABLE: kill any stragglers, re-close every gate, dim every
	-- sigil, and clear stage bookkeeping so the next party runs a fresh act.
	-- _resetWorldExtras runs BEFORE _sr is cleared (it reads live debris/telegraph
	-- lists + the shrine connection off the current runtime).
	EnemyService:KillAll()
	self:_resetGates()
	self:_resetSigils()
	self:_resetWorldExtras()
	self._party = {}
	self._countdownEnd = nil
	self._stageIndex = 1
	self._sr = { enemies = {} }

	print(cleared and "[ActService] Act I cleared — party returned to lobby" or "[ActService] Act I abandoned")
end

-- Run tick: drop players who left, abort if the whole party is gone, otherwise
-- advance the current stage's state machine.
function ActService:_updateRun(dt: number)
	for idx = #self._party, 1, -1 do
		if not self._party[idx].Parent then
			table.remove(self._party, idx)
		end
	end
	if #self._party == 0 then
		self:_endRun(false)
		return
	end

	if self:_updateStage(dt) then
		self:_completeStage()
	end
end

function ActService:Start()
	-- Find the world WorldService built (parallel Start passes; WaitForChild handles ordering).
	local zones = Workspace:WaitForChild("Zones")
	self._act1Model = zones:WaitForChild("Act1")

	local pad = zones:WaitForChild("Lobby"):WaitForChild("StartPad")
	local disc = pad:WaitForChild("Disc")
	local billboard = disc:WaitForChild("Label")
	self._padLabel = billboard:WaitForChild("Text") :: TextLabel

	self._actProgress = Net.event(Net.Events.ActProgress)

	-- If a party member respawns mid-run (died), pull them back to the CURRENT
	-- stage's arrival so death means "back into the fight from this region's
	-- entrance", not "stuck in lobby". Non-party players are never touched.
	local function watch(player: Player)
		player.CharacterAdded:Connect(function()
			if self._running and self:_isInParty(player) then
				-- Escape-stage exception: respawning behind the advancing wall is a
				-- death loop, so the dead rejoin at the NEXT stage's (shrine) arrival.
				local stage = self._stages[self._stageIndex]
				local arrival = stage.arrival
				if stage.kind == "escape" then
					local nextStage = self._stages[self._stageIndex + 1]
					if nextStage then
						arrival = nextStage.arrival
					end
				end
				teleportWhenReady(player, arrival)
				task.delay(0.4, function()
					self:_pushProgressTo(player)
				end)
			end
		end)
	end
	for _, player in Players:GetPlayers() do
		watch(player)
	end
	Players.PlayerAdded:Connect(watch)

	-- One heartbeat for both states: lobby = pad membership + countdown, running =
	-- stage state machine. Ticks faster during a run so sigil channelling feels
	-- responsive; 4 Hz is plenty for the lobby countdown.
	task.spawn(function()
		local last = os.clock()
		while true do
			task.wait(self._running and 0.12 or 0.25)
			local now = os.clock()
			local dt = now - last
			last = now
			if self._running then
				self:_updateRun(dt)
			else
				self:_updatePad()
			end
		end
	end)

	-- A separate fine-grained loop for smooth stealth/escape/hazard animation +
	-- high-frequency gameplay (gaze cones, the escape wall, ruin-fall zones). The
	-- coarse 8 Hz state loop above is too jerky for these. Guarded to do work only
	-- during the relevant stage; near-free otherwise.
	RunService.Heartbeat:Connect(function(dt)
		if self._running then
			self:_animTick(dt)
		end
	end)
end

return ActService
