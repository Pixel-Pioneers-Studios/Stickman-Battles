--!strict
--[[
	EnemyService
	------------
	Spawns and drives every enemy on the server. Runs one Heartbeat loop that,
	per enemy, picks the nearest valid player and ticks the enemy's AI. Also
	exposes the authoritative hit query CombatService uses to resolve player
	attacks against enemies.

	Owning the update loop centrally (rather than per-enemy connections) keeps
	ordering deterministic and makes it trivial to add spatial partitioning /
	budgeting when enemy counts grow.
]]

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local EnemyDefs = require(Shared.Definitions.Enemies)

local Enemy = require(script.Parent.Parent.Classes.Enemy)
local PlayerService = require(script.Parent.PlayerService)
local Behaviours = require(script.Parent.Parent.Behaviours)

local PROJECTILE_HIT_RADIUS = 2.5
local PROJECTILE_LIFETIME = 4

local EnemyService = {}
EnemyService._enemies = {} :: { any }
EnemyService._projectiles = {} :: { any }

function EnemyService:Spawn(defId: string, position: Vector3, healthScale: number?)
	local def = EnemyDefs[defId]
	assert(def, `unknown enemy def: {defId}`)
	local enemy = Enemy.new(def, position, healthScale)
	-- Inject the projectile spawner so ranged enemies stay decoupled from this
	-- service (no back-require from the Enemy class).
	enemy.spawnProjectile = function(fromPos: Vector3, targetPos: Vector3, params)
		self:_spawnProjectile(fromPos, targetPos, params)
	end
	-- Bosses delegate attack selection to a named behaviour module. Injected the
	-- same decoupled way — the Enemy class never requires a behaviour directly.
	if def.behaviourId then
		local behaviour = Behaviours[def.behaviourId]
		assert(behaviour, `unknown behaviour: {def.behaviourId}`)
		enemy.chooseAttack = behaviour.choose
	end
	table.insert(self._enemies, enemy)
	return enemy
end

-- Nearest alive player character root to a world position, within maxDist.
local function nearestPlayerTo(position: Vector3, maxDist: number)
	local best, bestDist
	for _, player in Players:GetPlayers() do
		local character = player.Character
		local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		if root and humanoid and humanoid.Health > 0 then
			local d = (root.Position - position).Magnitude
			if d <= maxDist and (not bestDist or d < bestDist) then
				best, bestDist = { player = player, position = root.Position }, d
			end
		end
	end
	return best
end

--[[
	QueryHitbox — authoritative player-attack resolution.
	Given the attacker's root CFrame and a weapon combo step, return the list of
	live enemies whose bodies fall inside the forward wedge (range * radius) and
	within the facing arc. Used by CombatService.
]]
function EnemyService:QueryHitbox(originCFrame: CFrame, step): { any }
	local hits = {}
	local origin = originCFrame.Position
	local forward = originCFrame.LookVector
	local halfArcCos = math.cos(math.rad(step.arc) * 0.5)

	for _, enemy in self._enemies do
		if enemy.alive then
			local to = enemy.body.Position - origin
			local flat = Vector3.new(to.X, 0, to.Z)
			local dist = flat.Magnitude
			if dist <= step.range + step.radius and dist > 0 then
				local dot = flat.Unit:Dot(Vector3.new(forward.X, 0, forward.Z).Unit)
				if dot >= halfArcCos then
					table.insert(hits, enemy)
				end
			end
		end
	end
	return hits
end

-- Number of enemies still alive (ActService polls this to detect a cleared Act).
function EnemyService:AliveCount(): number
	local n = 0
	for _, enemy in self._enemies do
		if enemy.alive then
			n += 1
		end
	end
	return n
end

-- Dev/test helper: kill every live enemy (used by DebugService in Studio).
function EnemyService:KillAll()
	for _, enemy in self._enemies do
		if enemy.alive then
			-- Non-zero unit dir with zero force = death without a NaN impulse.
			enemy:TakeDamage(1e9, Vector3.new(0, 0, 1), 0)
		end
	end
end

function EnemyService:DamageEnemy(enemy, amount: number, knockbackDir: Vector3, force: number)
	if enemy and enemy.alive then
		enemy:TakeDamage(amount, knockbackDir, force)
	end
end

-- Server-owned projectile: a kinematic part flown toward the target snapshot.
-- Damage is resolved through PlayerService so block/parry/dodge apply the same
-- as a melee hit (attacker is nil — a projectile can't be parry-staggered).
function EnemyService:_spawnProjectile(fromPos: Vector3, targetPos: Vector3, params)
	local dir = targetPos - fromPos
	if dir.Magnitude < 0.01 then
		return
	end
	dir = dir.Unit

	local part = Instance.new("Part")
	part.Name = "Projectile"
	part.Anchored = true
	part.CanCollide = false
	part.Size = Vector3.new(0.3, 0.3, 2)
	part.Color = Color3.fromRGB(255, 230, 120)
	part.Material = Enum.Material.Neon
	part.CFrame = CFrame.lookAt(fromPos, fromPos + dir)
	part.Parent = Workspace

	table.insert(self._projectiles, {
		part = part,
		vel = dir * (params.speed or 60),
		damage = params.damage,
		knockback = params.knockback,
		dieAt = os.clock() + PROJECTILE_LIFETIME,
	})
end

function EnemyService:_updateProjectiles(dt: number)
	for i = #self._projectiles, 1, -1 do
		local p = self._projectiles[i]
		local pos = p.part.Position + p.vel * dt

		local hitPlayer: Player? = nil
		for _, player in Players:GetPlayers() do
			local character = player.Character
			local root = character and character:FindFirstChild("HumanoidRootPart") :: BasePart?
			local humanoid = character and character:FindFirstChildOfClass("Humanoid")
			if root and humanoid and humanoid.Health > 0 then
				if (root.Position - pos).Magnitude <= PROJECTILE_HIT_RADIUS then
					hitPlayer = player
					break
				end
			end
		end

		if hitPlayer then
			local flat = Vector3.new(p.vel.X, 0, p.vel.Z)
			local kbDir = flat.Magnitude > 0 and flat.Unit or Vector3.new(0, 0, 1)
			local kb = kbDir * p.knockback + Vector3.new(0, p.knockback * 0.4, 0)
			PlayerService:ResolveIncomingHit(hitPlayer, p.damage, kb, nil)
			p.part:Destroy()
			table.remove(self._projectiles, i)
		elseif os.clock() >= p.dieAt then
			p.part:Destroy()
			table.remove(self._projectiles, i)
		else
			p.part.CFrame = CFrame.lookAt(pos, pos + p.vel)
		end
	end
end

function EnemyService:Start()
	-- Enemies are no longer spawned at boot: ActService populates Act I when a run
	-- begins, and the Studio test panel spawns them on demand. The lobby stays clear.
	RunService.Heartbeat:Connect(function(dt)
		for i = #self._enemies, 1, -1 do
			local enemy = self._enemies[i]
			if not enemy.alive and not enemy.model.Parent then
				table.remove(self._enemies, i)
			else
				local target = nearestPlayerTo(enemy.body.Position, enemy.def.aggroRange)
				enemy:Update(dt, target)
			end
		end
		self:_updateProjectiles(dt)
	end)
end

return EnemyService
