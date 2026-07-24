--!strict
--[[
	PlayerService
	-------------
	Owns per-player authoritative runtime: current weapon, combo index/timers,
	combat state, and health. This is the single place that mutates player HP —
	both the player's own combat cooldowns and enemy-dealt damage flow through
	here, so i-frames and death are enforced consistently.

	Server authority notes:
	  * Health lives here and mirrors to a "Health" attribute + Humanoid.Health
	    for engine death handling. The client NEVER writes it.
	  * Knockback is sent to the owning client to apply to its own root part,
	    because the character's physics assembly is network-owned by that client.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Net.Net)
local Enums = require(Shared.Enums)
local CombatConfig = require(Shared.Config.CombatConfig)
local Weapons = require(Shared.Definitions.Weapons)

local DataService = require(script.Parent.DataService)
local SkillService = require(script.Parent.SkillService)

type Runtime = {
	weaponId: string,
	comboIndex: number,
	comboResetAt: number,
	nextAttackReadyAt: number,
	nextHeavyReadyAt: number,
	dodgeReadyAt: number,
	state: string,
	iFramesUntil: number,
	isBlocking: boolean,
	blockStartedAt: number,
	health: number,
	maxHealth: number,
}

local PlayerService = {}
PlayerService._runtimes = {} :: { [Player]: Runtime }
-- Super meter lives OUTSIDE the runtime so it survives respawns (the web game
-- carries super charge across lives). Keyed by player, 0..SuperMeterMax.
PlayerService._superMeter = {} :: { [Player]: number }
-- Studio-only invulnerability toggled by DebugService. Never set in production.
PlayerService._godMode = {} :: { [Player]: boolean }
PlayerService._healthChanged = nil :: RemoteEvent?
PlayerService._superChanged = nil :: RemoteEvent?
PlayerService._feedback = nil :: RemoteEvent?

function PlayerService:GetSuperMeter(player: Player): number
	return self._superMeter[player] or 0
end

-- Set the super meter to an absolute value (clamped) and mirror it to the HUD.
function PlayerService:SetSuperMeter(player: Player, value: number)
	local updated = math.clamp(value, 0, CombatConfig.SuperMeterMax)
	if updated ~= (self._superMeter[player] or 0) then
		self._superMeter[player] = updated
		if self._superChanged then
			self._superChanged:FireClient(player, { meter = updated, max = CombatConfig.SuperMeterMax })
		end
	end
end

-- Add to the super meter (clamped) and mirror to the owning client's HUD.
function PlayerService:AddSuperMeter(player: Player, amount: number)
	if amount <= 0 then
		return
	end
	self:SetSuperMeter(player, (self._superMeter[player] or 0) + amount)
end

-- Dev/test helpers (invoked by DebugService, which is Studio-gated).
function PlayerService:SetGodMode(player: Player, on: boolean)
	self._godMode[player] = on or nil
end

function PlayerService:HealFull(player: Player)
	local rt = self._runtimes[player]
	if not rt then
		return
	end
	rt.health = rt.maxHealth
	if rt.state == Enums.CombatState.Dead then
		rt.state = Enums.CombatState.Idle
	end
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		humanoid.Health = humanoid.MaxHealth
	end
	if character then
		character:SetAttribute("Health", rt.health)
	end
	if self._healthChanged then
		self._healthChanged:FireClient(player, { health = rt.health, maxHealth = rt.maxHealth })
	end
end

-- Spend a full meter. Returns true (and resets to 0) only if it was full.
function PlayerService:ConsumeSuper(player: Player): boolean
	if (self._superMeter[player] or 0) < CombatConfig.SuperMeterMax then
		return false
	end
	self:SetSuperMeter(player, 0)
	return true
end

function PlayerService:GetRuntime(player: Player): Runtime?
	return self._runtimes[player]
end

function PlayerService:IsIFraming(player: Player): boolean
	local rt = self._runtimes[player]
	return rt ~= nil and os.clock() < rt.iFramesUntil
end

function PlayerService:GrantIFrames(player: Player, duration: number)
	local rt = self._runtimes[player]
	if rt then
		rt.iFramesUntil = os.clock() + duration
	end
end

function PlayerService:GetWeaponDef(player: Player)
	local rt = self._runtimes[player]
	return rt and Weapons[rt.weaponId] or nil
end

-- Switch the live combat weapon (ShopService calls this after validating
-- ownership; persistence is DataService's side). Resets the combo chain and
-- mirrors to the "Weapon" attribute the client visuals key off.
function PlayerService:SetWeapon(player: Player, weaponId: string)
	if not Weapons[weaponId] then
		return
	end
	local rt = self._runtimes[player]
	if rt then
		rt.weaponId = weaponId
		rt.comboIndex = 0
		rt.comboResetAt = 0
	end
	local character = player.Character
	if character then
		character:SetAttribute("Weapon", weaponId)
	end
end

-- Authoritative damage entry point. `knockback` (optional) is a world-space
-- Vector3 impulse forwarded to the client to apply to its own root part.
function PlayerService:ApplyDamage(player: Player, amount: number, knockback: Vector3?)
	local rt = self._runtimes[player]
	if not rt or rt.state == Enums.CombatState.Dead then
		return
	end
	if os.clock() < rt.iFramesUntil then
		return -- dodged
	end
	if self._godMode[player] then
		return -- Studio-only invulnerability
	end

	rt.health = math.max(0, rt.health - amount)
	-- Taking damage charges the super meter (less than dealing does), scaled by
	-- the player's Vitality super-gain modifier.
	local superMods = SkillService:GetModifiers(player)
	self:AddSuperMeter(player, amount * CombatConfig.SuperGainTakenMultiplier * superMods.superGainMult)
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if humanoid then
		-- Keep the engine Humanoid in sync so death/respawn works for free.
		humanoid.Health = rt.health / rt.maxHealth * humanoid.MaxHealth
	end
	if character then
		character:SetAttribute("Health", rt.health)
	end

	if self._healthChanged then
		self._healthChanged:FireClient(player, {
			health = rt.health,
			maxHealth = rt.maxHealth,
			knockback = knockback,
			damage = amount,
		})
	end

	if rt.health <= 0 then
		rt.state = Enums.CombatState.Dead
	end
end

function PlayerService:SetBlocking(player: Player, blocking: boolean)
	local rt = self._runtimes[player]
	if not rt then
		return
	end
	if blocking and not rt.isBlocking then
		rt.blockStartedAt = os.clock() -- start of the parry window
	end
	rt.isBlocking = blocking
	local character = player.Character
	if character then
		character:SetAttribute("Blocking", blocking)
	end
end

--[[
	ResolveIncomingHit — the authoritative filter every enemy/projectile hit
	passes through before touching HP. Order: dodge i-frames > parry > block >
	full damage. `attacker` is the Enemy object that struck (or nil for a
	projectile); on a parry we stun it via duck-typed `attacker:Stagger(...)`
	so PlayerService needs no dependency on the enemy modules.
]]
function PlayerService:ResolveIncomingHit(player: Player, amount: number, knockback: Vector3?, attacker: any?)
	local rt = self._runtimes[player]
	if not rt or rt.state == Enums.CombatState.Dead then
		return
	end
	local now = os.clock()

	if now < rt.iFramesUntil then
		self:_fireFeedback(player, { type = "dodge_hit" })
		return
	end

	if rt.isBlocking then
		if now - rt.blockStartedAt <= CombatConfig.ParryWindow then
			-- Parry: no damage, brief i-frames, and the attacker is stunned.
			rt.iFramesUntil = now + CombatConfig.ParryIFrames
			if attacker and typeof(attacker.Stagger) == "function" then
				attacker:Stagger(CombatConfig.ParryStaggerDuration)
			end
			self:_fireFeedback(player, { type = "parry" })
			return
		end
		-- Block: chip damage and reduced knockback.
		local reducedKb = knockback and knockback * CombatConfig.BlockKnockbackMultiplier or nil
		self:_fireFeedback(player, { type = "blocked" })
		self:ApplyDamage(player, amount * CombatConfig.BlockDamageMultiplier, reducedKb)
		return
	end

	self:ApplyDamage(player, amount, knockback)
end

function PlayerService:_fireFeedback(player: Player, payload: any)
	if self._feedback then
		self._feedback:FireClient(player, payload)
	end
end

function PlayerService:_setupCharacter(player: Player, character: Model)
	local humanoid = character:WaitForChild("Humanoid") :: Humanoid
	humanoid.MaxHealth = 100
	humanoid.Health = 100

	local mods = SkillService:GetModifiers(player)
	local maxHealth = CombatConfig.PlayerMaxHealth + mods.maxHealthBonus

	local rt: Runtime = {
		-- Persisted equip if the profile is loaded; falls back to the starter
		-- (ProfileLoaded below corrects it if the load lands after this spawn).
		weaponId = DataService:GetEquipped(player),
		comboIndex = 0,
		comboResetAt = 0,
		nextAttackReadyAt = 0,
		nextHeavyReadyAt = 0,
		dodgeReadyAt = 0,
		state = Enums.CombatState.Idle,
		iFramesUntil = 0,
		isBlocking = false,
		blockStartedAt = 0,
		health = maxHealth,
		maxHealth = maxHealth,
	}
	self._runtimes[player] = rt

	character:SetAttribute("MaxHealth", rt.maxHealth)
	character:SetAttribute("Health", rt.health)
	character:SetAttribute("Weapon", rt.weaponId)
	character:SetAttribute("SpeedBonus", mods.moveSpeedBonus)

	humanoid.Died:Connect(function()
		rt.state = Enums.CombatState.Dead
	end)

	if self._healthChanged then
		self._healthChanged:FireClient(player, {
			health = rt.health,
			maxHealth = rt.maxHealth,
		})
	end
	-- Seed the super HUD with the carried-over meter for this new life.
	if self._superChanged then
		self._superChanged:FireClient(player, {
			meter = self._superMeter[player] or 0,
			max = CombatConfig.SuperMeterMax,
		})
	end
end

function PlayerService:Init()
	self._healthChanged = Net.event(Net.Events.HealthChanged)
	self._superChanged = Net.event(Net.Events.SuperChanged)
	self._feedback = Net.event(Net.Events.CombatFeedback)
end

function PlayerService:Start()
	-- If a character spawned before its profile finished loading, apply the
	-- persisted weapon now (signal-based so DataService never requires us).
	DataService.ProfileLoaded:Connect(function(player: Player, profile)
		self:SetWeapon(player, profile.equipped)
	end)

	-- A skill purchase re-derives live health/speed. Raising max health also ADDS
	-- the delta to current health so buying Vitality mid-run feels rewarding.
	SkillService.SkillsChanged:Connect(function(player: Player)
		local rt = self._runtimes[player]
		if not rt then
			return
		end
		local mods = SkillService:GetModifiers(player)
		local newMax = CombatConfig.PlayerMaxHealth + mods.maxHealthBonus
		local delta = newMax - rt.maxHealth
		rt.maxHealth = newMax
		rt.health = math.clamp(rt.health + math.max(0, delta), 0, rt.maxHealth)

		local character = player.Character
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if humanoid then
			-- Humanoid stays 100-based; mirror the ratio (same convention as ApplyDamage).
			humanoid.Health = rt.health / rt.maxHealth * humanoid.MaxHealth
		end
		if character then
			character:SetAttribute("MaxHealth", rt.maxHealth)
			character:SetAttribute("Health", rt.health)
			character:SetAttribute("SpeedBonus", mods.moveSpeedBonus)
		end
		if self._healthChanged then
			self._healthChanged:FireClient(player, { health = rt.health, maxHealth = rt.maxHealth })
		end
	end)

	local function onPlayer(player: Player)
		if player.Character then
			self:_setupCharacter(player, player.Character)
		end
		player.CharacterAdded:Connect(function(character)
			self:_setupCharacter(player, character)
		end)
		player.CharacterRemoving:Connect(function()
			self._runtimes[player] = nil
		end)
	end

	for _, player in Players:GetPlayers() do
		onPlayer(player)
	end
	Players.PlayerAdded:Connect(onPlayer)
	Players.PlayerRemoving:Connect(function(player)
		self._runtimes[player] = nil
		self._superMeter[player] = nil
		self._godMode[player] = nil
	end)
end

return PlayerService
