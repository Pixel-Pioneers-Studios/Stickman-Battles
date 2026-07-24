--!strict
--[[
	CombatService
	-------------
	Authoritative resolver for player-initiated combat. The client sends INTENT
	(RequestAttack / RequestDodge) — never damage. This service:
	  * validates state + cooldowns,
	  * advances the weapon combo,
	  * after the step's windup, queries EnemyService for a real hitbox overlap
	    and applies damage + knockback to the enemies that were actually in range,
	  * grants dodge i-frames authoritatively (movement itself stays client-side,
	    since the character assembly is network-owned by its player).

	Because damage numbers come from CombatConfig/Weapons here, a hacked client
	can at most spam requests (rejected by cooldown) — it can't inflate damage.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Net = require(Shared.Net.Net)
local Enums = require(Shared.Enums)
local GameConfig = require(Shared.Config.GameConfig)
local CombatConfig = require(Shared.Config.CombatConfig)
local Zones = require(Shared.Config.Zones)

local PlayerService = require(script.Parent.PlayerService)
local EnemyService = require(script.Parent.EnemyService)
local DataService = require(script.Parent.DataService)
local SkillService = require(script.Parent.SkillService)

-- Award the enemy's coin bounty if this hit was the killing blow. Safe to call
-- unconditionally after damage: `alive` flips exactly once, on the lethal hit.
local function awardIfKilled(player: Player, enemy)
	if not enemy.alive then
		DataService:AddCoins(player, enemy.def.coins or 0)
	end
end

local CombatService = {}
-- Studio-only escape hatch (DebugService "Lobby Combat" toggle) so enemies
-- spawned in the lobby by the test panel can still be fought while testing.
CombatService.AllowLobbyCombat = false

-- The lobby is a safe zone: attack/super intents are dropped there. Mirrors
-- the client-side check in CombatController (both call Zones.combatAllowed).
function CombatService:_combatAllowed(player: Player): boolean
	if self.AllowLobbyCombat then
		return true
	end
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	return root ~= nil and Zones.combatAllowed(root.Position)
end

function CombatService:_reject(player: Player, reason: string)
	if self._feedback then
		self._feedback:FireClient(player, { type = "reject", reason = reason })
	end
end

-- Apply one resolved attack step's hitbox after its windup (shared by light and
-- heavy). Armor-breaking steps additionally stagger every enemy they land on.
function CombatService:_resolveHit(player: Player, step)
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	local liveRt = PlayerService:GetRuntime(player)
	if not root or not liveRt or liveRt.state == Enums.CombatState.Dead then
		return
	end

	-- Skill modifiers: scale outgoing damage without mutating the shared step
	-- table (compute a local number every other hit still reads unchanged).
	local mods = SkillService:GetModifiers(player)
	local damage = step.damage * mods.damageMult

	local origin = root.CFrame
	local hits = EnemyService:QueryHitbox(origin, step)
	for _, enemy in hits do
		local dir = enemy.body.Position - origin.Position
		local flat = Vector3.new(dir.X, 0, dir.Z)
		local kbDir = flat.Magnitude > 0 and flat.Unit or origin.LookVector
		EnemyService:DamageEnemy(enemy, damage, kbDir, step.knockback)
		awardIfKilled(player, enemy)
		if step.armorBreak and enemy.alive then
			enemy:Stagger(CombatConfig.HeavyStaggerDuration)
		end
	end

	-- Dealing damage charges the super meter (more than taking damage does),
	-- scaled by the player's super-gain modifier.
	if #hits > 0 then
		PlayerService:AddSuperMeter(
			player,
			#hits * damage * CombatConfig.SuperGainDealtMultiplier * mods.superGainMult
		)
	end

	if #hits > 0 and self._feedback then
		self._feedback:FireClient(player, {
			type = "hit",
			count = #hits,
			hitStop = CombatConfig.HitStopSeconds,
		})
	end

	task.delay(step.active + step.recovery, function()
		local r = PlayerService:GetRuntime(player)
		if r and r.state == Enums.CombatState.Attacking and os.clock() >= r.nextAttackReadyAt then
			r.state = Enums.CombatState.Idle
		end
	end)
end

function CombatService:_onRequestAttack(player: Player, attackType: string?)
	local rt = PlayerService:GetRuntime(player)
	if not rt or rt.state == Enums.CombatState.Dead then
		return self:_reject(player, Enums.RejectReason.Dead)
	end
	if not self:_combatAllowed(player) then
		return self:_reject(player, "InSafeZone")
	end

	local weapon = PlayerService:GetWeaponDef(player)
	if not weapon then
		return self:_reject(player, Enums.RejectReason.NoWeapon)
	end

	local now = os.clock()
	local isHeavy = attackType == "heavy"
	local step, stepIndex

	if isHeavy then
		if now < rt.nextHeavyReadyAt or now < rt.nextAttackReadyAt then
			return self:_reject(player, Enums.RejectReason.OnCooldown)
		end
		step = weapon.heavy
		stepIndex = 0 -- 0 signals "heavy" to the client
		rt.comboIndex = 0 -- heavy breaks the light chain
		rt.comboResetAt = 0
		rt.nextHeavyReadyAt = now + step.windup + step.active + step.recovery
		rt.nextAttackReadyAt = now + step.windup + step.active
	else
		if now < rt.nextAttackReadyAt then
			return self:_reject(player, Enums.RejectReason.OnCooldown)
		end
		if now > rt.comboResetAt then
			rt.comboIndex = 0
		end
		rt.comboIndex += 1
		if rt.comboIndex > #weapon.combo then
			rt.comboIndex = 1
		end
		stepIndex = rt.comboIndex
		step = weapon.combo[stepIndex]
		rt.nextAttackReadyAt = now + step.windup + step.active
		rt.comboResetAt = step.comboWindow > 0 and (now + step.windup + step.comboWindow) or 0
	end

	rt.state = Enums.CombatState.Attacking

	if self._feedback then
		self._feedback:FireClient(player, {
			type = "attack",
			weaponId = weapon.id,
			stepIndex = stepIndex,
			heavy = isHeavy,
			windup = step.windup,
		})
	end

	task.delay(step.windup, function()
		self:_resolveHit(player, step)
	end)
end

-- Super: gated by a full meter (server-authoritative). Releases a radial burst
-- around the caster that damages + staggers every enemy in range and grants a
-- brief window of i-frames. Spends the whole meter.
function CombatService:_onRequestSuper(player: Player)
	local rt = PlayerService:GetRuntime(player)
	if not rt or rt.state == Enums.CombatState.Dead then
		return
	end
	if not self:_combatAllowed(player) then
		return self:_reject(player, "InSafeZone")
	end
	if not PlayerService:ConsumeSuper(player) then
		return self:_reject(player, Enums.RejectReason.OnCooldown)
	end

	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
	if not root then
		return
	end

	local step = CombatConfig.Super
	PlayerService:GrantIFrames(player, step.iFrames)

	-- Same skill-scaled damage treatment as _resolveHit (local, never mutate step).
	local mods = SkillService:GetModifiers(player)
	local damage = step.damage * mods.damageMult

	local origin = root.CFrame
	local hits = EnemyService:QueryHitbox(origin, step)
	for _, enemy in hits do
		local dir = enemy.body.Position - origin.Position
		local flat = Vector3.new(dir.X, 0, dir.Z)
		local kbDir = flat.Magnitude > 0 and flat.Unit or origin.LookVector
		EnemyService:DamageEnemy(enemy, damage, kbDir, step.knockback)
		awardIfKilled(player, enemy)
		if enemy.alive then
			enemy:Stagger(CombatConfig.HeavyStaggerDuration)
		end
	end

	if self._feedback then
		self._feedback:FireClient(player, {
			type = "super",
			count = #hits,
			radius = step.range + step.radius,
		})
	end
end

function CombatService:_onRequestDodge(player: Player)
	local rt = PlayerService:GetRuntime(player)
	if not rt or rt.state == Enums.CombatState.Dead then
		return
	end
	local now = os.clock()
	if now < rt.dodgeReadyAt then
		return self:_reject(player, Enums.RejectReason.OnCooldown)
	end

	-- Mobility skills shorten the dodge cooldown (floored server-side in SkillService).
	local mods = SkillService:GetModifiers(player)
	rt.dodgeReadyAt = now + GameConfig.Movement.DodgeCooldown * mods.dodgeCooldownMult
	PlayerService:GrantIFrames(player, GameConfig.Movement.DodgeIFrames)

	if self._feedback then
		self._feedback:FireClient(player, {
			type = "dodge",
			iFrames = GameConfig.Movement.DodgeIFrames,
		})
	end
end

function CombatService:Init()
	self._feedback = Net.event(Net.Events.CombatFeedback)
	self._requestAttack = Net.event(Net.Events.RequestAttack)
	self._requestDodge = Net.event(Net.Events.RequestDodge)
	self._requestSuper = Net.event(Net.Events.RequestSuper)
	self._setBlocking = Net.event(Net.Events.SetBlocking)
end

function CombatService:Start()
	self._requestAttack.OnServerEvent:Connect(function(player, attackType)
		-- Only trust the shape of the intent, never its damage.
		self:_onRequestAttack(player, attackType == "heavy" and "heavy" or "light")
	end)
	self._requestDodge.OnServerEvent:Connect(function(player)
		self:_onRequestDodge(player)
	end)
	self._requestSuper.OnServerEvent:Connect(function(player)
		self:_onRequestSuper(player)
	end)
	self._setBlocking.OnServerEvent:Connect(function(player, blocking)
		PlayerService:SetBlocking(player, blocking == true)
	end)
end

return CombatService
