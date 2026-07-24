--!strict
--[[
	Enemy (server class)
	--------------------
	A fully server-driven, kinematic enemy. Deliberately does NOT use a Humanoid:
	the body is a single anchored part moved by CFrame each tick, with a downward
	raycast for ground-snap and a decaying knockback velocity. This gives us
	total authority over position and state (no client physics ownership, no rig
	fragility) — the same "custom controller, not Humanoid gameplay" philosophy
	we use for the player.

	The AI is a small state machine: Idle -> Chasing -> Attacking -> Recovering.
	Attacks telegraph (a colored windup) long enough for the player to dodge.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")
local Players = game:GetService("Players")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local Enums = require(Shared.Enums)

-- Enemy needs to damage players; that path is authoritative in PlayerService.
local PlayerService = require(script.Parent.Parent.Services.PlayerService)

export type Target = { player: Player, position: Vector3 }

local Enemy = {}
Enemy.__index = Enemy

local RAYCAST_HEIGHT = 12
local TELEGRAPH_COLOR = Color3.fromRGB(255, 170, 40)
local STAGGER_COLOR = Color3.fromRGB(90, 120, 255)

local function buildModel(def, cframe: CFrame): (Model, BasePart)
	local model = Instance.new("Model")
	model.Name = def.displayName

	local body = Instance.new("Part")
	body.Name = "Body"
	body.Anchored = true
	body.CanCollide = false -- kinematic; we resolve ground ourselves
	body.Size = Vector3.new(2, def.height * 0.6, 1.5)
	body.Color = def.color
	body.Material = Enum.Material.SmoothPlastic
	body.CFrame = cframe
	body.Parent = model

	local head = Instance.new("Part")
	head.Name = "Head"
	head.Anchored = true
	head.CanCollide = false
	head.Shape = Enum.PartType.Ball
	head.Size = Vector3.new(1.4, 1.4, 1.4)
	head.Color = def.color:Lerp(Color3.new(1, 1, 1), 0.25)
	head.CFrame = cframe * CFrame.new(0, def.height * 0.35, 0)
	head.Parent = model

	local weld = Instance.new("WeldConstraint")
	weld.Part0 = body
	weld.Part1 = head
	weld.Parent = body

	model.PrimaryPart = body

	-- Floating health bar.
	local billboard = Instance.new("BillboardGui")
	billboard.Name = "HealthBar"
	billboard.Size = UDim2.fromOffset(80, 8)
	billboard.StudsOffsetWorldSpace = Vector3.new(0, def.height * 0.7, 0)
	billboard.AlwaysOnTop = true
	billboard.Parent = head

	local bg = Instance.new("Frame")
	bg.Size = UDim2.fromScale(1, 1)
	bg.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
	bg.BorderSizePixel = 0
	bg.Parent = billboard

	local fill = Instance.new("Frame")
	fill.Name = "Fill"
	fill.Size = UDim2.fromScale(1, 1)
	fill.BackgroundColor3 = Color3.fromRGB(200, 60, 60)
	fill.BorderSizePixel = 0
	fill.Parent = bg

	model.Parent = Workspace

	return model, body
end

function Enemy.new(def, spawnPosition: Vector3, healthScale: number?)
	local cframe = CFrame.new(spawnPosition)
	local model, body = buildModel(def, cframe)
	-- Per-instance max HP so party-size scaling doesn't mutate the shared def.
	local maxHealth = def.maxHealth * (healthScale or 1)

	-- Every enemy resolves through a chosen "attack" object. Simple enemies get a
	-- single default synthesised from their flat fields (behaviour identical to
	-- before); bosses list several in `def.attacks` and pick via a behaviour.
	local defaultAttack = {
		id = "Default",
		kind = def.ranged and "ranged" or "melee",
		range = def.attackRange,
		windup = def.attackWindup,
		recovery = def.attackRecovery,
		damage = def.attackDamage,
		knockback = def.attackKnockback,
		radius = 2,
		projectileSpeed = def.projectileSpeed,
		projectileCount = def.ranged and 1 or nil,
		cooldown = 0,
	}

	local phaseColor = def.color
	if def.phases and def.phases[1] then
		phaseColor = def.phases[1].color
	end

	local self = setmetatable({
		def = def,
		model = model,
		body = body,
		health = maxHealth,
		maxHealth = maxHealth,
		state = Enums.EnemyState.Idle,
		alive = true,
		_knockbackVel = Vector3.zero,
		_attackReadyAt = 0,
		_stateUntil = 0,
		_pendingHit = nil :: Target?,
		_defaultAttack = defaultAttack,
		_currentAttack = defaultAttack,
		_attackCooldowns = {} :: { [string]: number },
		_phaseIndex = 1,
		_phaseColor = phaseColor,
		_enrage = (def.phases and def.phases[1] and def.phases[1].enrage) or 1,
	}, Enemy)

	self.body.Color = phaseColor
	body:SetAttribute("Health", self.health)
	body:SetAttribute("State", self.state)

	return self
end

function Enemy:_setState(state: string, duration: number?)
	self.state = state
	self.body:SetAttribute("State", state)
	self._stateUntil = duration and (os.clock() + duration) or 0
end

function Enemy:_groundSnap(position: Vector3): Vector3
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = { self.model }
	local origin = position + Vector3.new(0, RAYCAST_HEIGHT, 0)
	local result = Workspace:Raycast(origin, Vector3.new(0, -RAYCAST_HEIGHT * 3, 0), params)
	if result then
		return Vector3.new(position.X, result.Position.Y + self.body.Size.Y * 0.5, position.Z)
	end
	return position
end

function Enemy:_updateHealthBar()
	local fill = self.model:FindFirstChild("Head")
		and self.model.Head:FindFirstChild("HealthBar")
		and self.model.Head.HealthBar:FindFirstChild("Frame")
		and self.model.Head.HealthBar.Frame:FindFirstChild("Fill")
	if fill then
		(fill :: Frame).Size = UDim2.fromScale(math.clamp(self.health / self.maxHealth, 0, 1), 1)
	end
end

function Enemy:TakeDamage(amount: number, knockbackDir: Vector3, force: number)
	if not self.alive then
		return
	end
	self.health = math.max(0, self.health - amount)
	self.body:SetAttribute("Health", self.health)
	self._knockbackVel += knockbackDir.Unit * force
	self:_updateHealthBar()
	self:_checkPhase()

	if self.health <= 0 then
		self:_die()
	end
end

-- Bosses harden as they lose HP: descend through `def.phases` (ordered by
-- decreasing healthFrac). Entering a deeper phase recolors and raises enrage.
function Enemy:_checkPhase()
	local phases = self.def.phases
	if not phases then
		return
	end
	local frac = self.health / self.maxHealth
	local newIndex = self._phaseIndex
	for i = self._phaseIndex + 1, #phases do
		if frac <= phases[i].healthFrac then
			newIndex = i
		end
	end
	if newIndex ~= self._phaseIndex then
		self._phaseIndex = newIndex
		local phase = phases[newIndex]
		self._phaseColor = phase.color
		self._enrage = phase.enrage
		-- Only recolor immediately if not mid-telegraph/stagger (those own the color).
		if self.state ~= Enums.EnemyState.Attacking and self.state ~= Enums.EnemyState.Staggered then
			self.body.Color = phase.color
		end
	end
end

-- A transient, flattened ring on the ground marking an incoming AOE. Purely
-- cosmetic (damage is resolved server-side by radius) but it's the fair tell.
function Enemy:_spawnTelegraph(radius: number, duration: number)
	local ring = Instance.new("Part")
	ring.Name = "Telegraph"
	ring.Anchored = true
	ring.CanCollide = false
	ring.CanQuery = false
	ring.Shape = Enum.PartType.Cylinder
	ring.Size = Vector3.new(0.2, radius * 2, radius * 2)
	ring.Color = TELEGRAPH_COLOR
	ring.Material = Enum.Material.Neon
	ring.Transparency = 0.5
	local pos = self.body.Position
	ring.CFrame = CFrame.new(pos.X, pos.Y - self.body.Size.Y * 0.5 + 0.1, pos.Z)
		* CFrame.Angles(0, 0, math.rad(90))
	ring.Parent = Workspace
	task.spawn(function()
		local elapsed = 0
		while elapsed < duration and ring.Parent do
			elapsed += task.wait()
			ring.Transparency = 0.5 + 0.4 * math.clamp(elapsed / duration, 0, 1)
		end
		ring:Destroy()
	end)
end

-- Stun the enemy: cancels any pending attack and suspends AI for `duration`.
-- Called on a parry (via PlayerService duck-typing) and by armor-break hits.
function Enemy:Stagger(duration: number)
	if not self.alive then
		return
	end
	self._pendingHit = nil
	self.body.Color = STAGGER_COLOR
	self:_setState(Enums.EnemyState.Staggered, duration)
	self._attackReadyAt = os.clock() + duration
end

function Enemy:_die()
	self.alive = false
	self:_setState(Enums.EnemyState.Dead)
	-- Simple dissolve: shrink + fade, then remove.
	local head = self.model:FindFirstChild("Head")
	task.spawn(function()
		for i = 1, 10 do
			if not self.body.Parent then
				break
			end
			self.body.Transparency = i / 10
			if head then
				head.Transparency = i / 10
			end
			task.wait(0.03)
		end
		self.model:Destroy()
	end)
end

-- Resolve the current attack's effect at the end of its windup. Melee swings an
-- arc-forgiving range check, aoe damages everyone inside its radius, ranged fires
-- (possibly a fan). All damage funnels through PlayerService so player-side
-- dodge/parry/block apply uniformly.
function Enemy:_resolveAttack(pos: Vector3)
	local atk = self._currentAttack
	local pending = self._pendingHit
	if not (pending and pending.player.Character) then
		return
	end

	if atk.kind == "ranged" then
		if not self.spawnProjectile then
			return
		end
		local firePos = pos + Vector3.new(0, self.def.height * 0.35, 0)
		local params = {
			speed = atk.projectileSpeed or 60,
			damage = atk.damage,
			knockback = atk.knockback,
		}
		local count = atk.projectileCount or 1
		if count <= 1 then
			self.spawnProjectile(firePos, pending.position, params)
		else
			-- Fan `count` shots evenly around the aim direction.
			local base = pending.position - firePos
			local spread = math.rad(14)
			for i = 1, count do
				local angle = (i - (count + 1) * 0.5) * spread
				local rotated = CFrame.Angles(0, angle, 0) * base
				self.spawnProjectile(firePos, firePos + rotated, params)
			end
		end
	elseif atk.kind == "aoe" then
		local radius = atk.radius or 8
		for _, player in Players:GetPlayers() do
			local character = player.Character
			local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
			local humanoid = character and character:FindFirstChildOfClass("Humanoid")
			if root and humanoid and humanoid.Health > 0 then
				local d = root.Position - pos
				local flat = Vector3.new(d.X, 0, d.Z)
				if flat.Magnitude <= radius then
					local kbDir = flat.Magnitude > 0 and flat.Unit or Vector3.new(0, 0, 1)
					local kb = kbDir * atk.knockback + Vector3.new(0, atk.knockback * 0.5, 0)
					PlayerService:ResolveIncomingHit(player, atk.damage, kb, self)
				end
			end
		end
	else
		local dist = (pending.position - pos).Magnitude
		if dist <= atk.range + (atk.radius or 2) then
			local dir = pending.position - pos
			local flat = Vector3.new(dir.X, 0, dir.Z)
			local kb = (flat.Magnitude > 0 and flat.Unit or Vector3.zero) * atk.knockback
				+ Vector3.new(0, atk.knockback * 0.4, 0)
			PlayerService:ResolveIncomingHit(pending.player, atk.damage, kb, self)
		end
	end
end

-- One AI tick. `target` is the nearest valid player (or nil).
function Enemy:Update(dt: number, target: Target?)
	if not self.alive then
		return
	end

	local pos = self.body.Position

	-- Integrate + decay knockback regardless of state.
	if self._knockbackVel.Magnitude > 0.1 then
		pos += self._knockbackVel * dt
		self._knockbackVel = self._knockbackVel:Lerp(Vector3.zero, math.clamp(dt * 6, 0, 1))
	end

	local now = os.clock()

	if self.state == Enums.EnemyState.Attacking then
		-- Windup finished? resolve the chosen attack by kind.
		if now >= self._stateUntil then
			self:_resolveAttack(pos)
			local atk = self._currentAttack
			if atk.cooldown and atk.cooldown > 0 then
				self._attackCooldowns[atk.id] = now + atk.cooldown / self._enrage
			end
			-- A parry may have already put us into Staggered mid-resolution; only
			-- fall through to Recovering if that didn't happen.
			if self.state ~= Enums.EnemyState.Staggered then
				self.body.Color = self._phaseColor
				self._pendingHit = nil
				local recovery = atk.recovery / self._enrage
				self:_setState(Enums.EnemyState.Recovering, recovery)
				self._attackReadyAt = now + recovery
			end
		end
	elseif self.state == Enums.EnemyState.Recovering then
		if now >= self._stateUntil then
			self:_setState(Enums.EnemyState.Idle)
		end
	elseif self.state == Enums.EnemyState.Staggered then
		-- Stunned (parried or armor-broken): no action until it lapses.
		if now >= self._stateUntil then
			self.body.Color = self._phaseColor
			self:_setState(Enums.EnemyState.Idle)
		end
	elseif target then
		local toTarget = target.position - pos
		local flat = Vector3.new(toTarget.X, 0, toTarget.Z)
		local dist = flat.Magnitude

		-- Pick an attack: bosses delegate to their injected behaviour; simple
		-- enemies use their single default gated by range + global recovery.
		local chosen
		if self.chooseAttack then
			chosen = self.chooseAttack(self, target, { dist = dist, now = now })
		elseif now >= self._attackReadyAt and dist <= self._defaultAttack.range then
			chosen = self._defaultAttack
		end

		if chosen then
			self._currentAttack = chosen
			self.body.Color = TELEGRAPH_COLOR
			self._pendingHit = target
			self:_setState(Enums.EnemyState.Attacking, chosen.windup)
			if chosen.kind == "aoe" then
				self:_spawnTelegraph(chosen.radius or 8, chosen.windup)
			end
		elseif dist <= self.def.aggroRange then
			self:_setState(Enums.EnemyState.Chasing)
			if dist > 0.5 then
				local step = flat.Unit * math.min(self.def.walkSpeed * dt, dist)
				pos += step
			end
		else
			self:_setState(Enums.EnemyState.Idle)
		end
	else
		self:_setState(Enums.EnemyState.Idle)
	end

	-- Face the target (yaw only) while grounded.
	local grounded = self:_groundSnap(pos)
	if target then
		local look = Vector3.new(target.position.X, grounded.Y, target.position.Z)
		if (look - grounded).Magnitude > 0.05 then
			self.body.CFrame = CFrame.lookAt(grounded, look)
		else
			self.body.CFrame = CFrame.new(grounded) * (self.body.CFrame - self.body.CFrame.Position)
		end
	else
		self.body.CFrame = CFrame.new(grounded) * (self.body.CFrame - self.body.CFrame.Position)
	end
end

function Enemy:Destroy()
	self.alive = false
	if self.model then
		self.model:Destroy()
	end
end

return Enemy
