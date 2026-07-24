--!strict
--[[
	ReaverCaptain behaviour
	-----------------------
	Attack selector for the Act I stage-3 miniboss. Reads the enemy's live
	cooldown/recovery state and range to the target, and returns which of the
	Captain's three attacks (Slash / Lunge / Sweep) to start — or nil to keep
	closing distance.

	Intent (melee-only miniboss — no ranged attacks):
	- Point blank: mostly the quick Slash, but mix in the Sweep (when ready) to
	  force the player to give ground instead of face-tanking.
	- Mid range: a Lunge thrust to punish edge-of-melee turtling, or the Sweep as
	  zone-denial — whichever is off cooldown.

	Cadence (windup/recovery/cooldown scaling by enrage) lives in the Enemy class;
	this module only decides *which* attack, never the timing numbers.
]]

local function ready(enemy, atk, now: number): boolean
	local availableAt = enemy._attackCooldowns[atk.id] or 0
	return now >= availableAt
end

local ReaverCaptain = { id = "ReaverCaptain" }

function ReaverCaptain.choose(enemy, _target, ctx)
	local now, dist = ctx.now, ctx.dist

	-- Respect the shared recovery window between any two attacks.
	if now < enemy._attackReadyAt then
		return nil
	end

	local byId = {}
	for _, atk in enemy.def.attacks do
		byId[atk.id] = atk
	end
	local slash, lunge, sweep = byId.Slash, byId.Lunge, byId.Sweep

	if slash and dist <= slash.range then
		-- At point blank, sometimes open space with the sweep instead of jabbing.
		if sweep and dist <= sweep.range and ready(enemy, sweep, now) and math.random() < 0.4 then
			return sweep
		end
		if ready(enemy, slash, now) then
			return slash
		end
		return nil
	end

	-- Mid range: close the gap with a Lunge, or deny space with the Sweep.
	if lunge and dist <= lunge.range and ready(enemy, lunge, now) then
		return lunge
	end

	if sweep and dist <= sweep.range and ready(enemy, sweep, now) then
		return sweep
	end

	return nil
end

return ReaverCaptain
