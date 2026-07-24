--!strict
--[[
	Enums
	-----
	String-keyed enums shared by client and server. Strings (not integers) so
	they survive remote round-trips readably and show up legibly in attributes.
]]

local Enums = {}

Enums.CombatState = {
	Idle = "Idle",
	Attacking = "Attacking",
	Dodging = "Dodging",
	Staggered = "Staggered",
	Dead = "Dead",
}

Enums.EnemyState = {
	Idle = "Idle",
	Chasing = "Chasing",
	Attacking = "Attacking",
	Recovering = "Recovering",
	Staggered = "Staggered",
	Dead = "Dead",
}

-- Reason a server rejected a client combat request (for client-side feedback).
Enums.RejectReason = {
	OnCooldown = "OnCooldown",
	WrongState = "WrongState",
	NoWeapon = "NoWeapon",
	Dead = "Dead",
}

return table.freeze(Enums)
