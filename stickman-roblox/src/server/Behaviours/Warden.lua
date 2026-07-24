--!strict
--[[
	Warden behaviour
	----------------
	Attack selector for the first boss. Reads the enemy's live cooldown/recovery
	state and range to the target, and returns which of the Warden's three attacks
	(Cleave / Slam / Lunge) to start — or nil to keep closing distance.

	Intent (melee-only boss — no ranged attacks):
	- Point blank: mostly Cleave, but mix in Slam (when off cooldown) to force the
	  player to give ground instead of face-tanking.
	- Mid range: Slam as zone-denial, or a Lunge thrust to punish edge-of-melee
	  turtling — whichever is ready.

	Cadence itself (windup/recovery/cooldown scaling by enrage) lives in the Enemy
	class; this module only decides *which* attack, never the timing numbers.
]]

local function ready(enemy, atk, now: number): boolean
	local availableAt = enemy._attackCooldowns[atk.id] or 0
	return now >= availableAt
end

local Warden = { id = "Warden" }

function Warden.choose(enemy, _target, ctx)
	local now, dist = ctx.now, ctx.dist

	-- Respect the shared recovery window between any two attacks.
	if now < enemy._attackReadyAt then
		return nil
	end

	local byId = {}
	for _, atk in enemy.def.attacks do
		byId[atk.id] = atk
	end
	local cleave, slam, lunge = byId.Cleave, byId.Slam, byId.Lunge

	if cleave and dist <= cleave.range then
		if slam and dist <= slam.range and ready(enemy, slam, now) and math.random() < 0.5 then
			return slam
		end
		if ready(enemy, cleave, now) then
			return cleave
		end
		return nil
	end

	if slam and dist <= slam.range and ready(enemy, slam, now) then
		return slam
	end

	if lunge and dist <= lunge.range and ready(enemy, lunge, now) then
		return lunge
	end

	return nil
end

return Warden
