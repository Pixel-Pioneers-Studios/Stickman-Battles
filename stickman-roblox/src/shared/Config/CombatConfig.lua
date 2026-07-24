--!strict
--[[
	CombatConfig
	------------
	Combat tunables that BOTH sides must agree on. The client uses them to
	predict animation timing / cooldown UI; the server uses them as the
	authoritative source when validating and resolving hits. Never let the
	client send raw damage numbers — it sends intent (attack index), the server
	looks the numbers up here.
]]

local CombatConfig = {}

CombatConfig.PlayerMaxHealth = 100
CombatConfig.HitStopSeconds = 0.06 -- brief freeze on a landed hit (juice)

-- Blocking / parry (all server-enforced in PlayerService:ResolveIncomingHit).
CombatConfig.BlockDamageMultiplier = 0.35 -- chip damage taken while blocking
CombatConfig.BlockKnockbackMultiplier = 0.3
CombatConfig.ParryWindow = 0.25 -- block started within this before a hit = parry
CombatConfig.ParryIFrames = 0.3 -- brief invulnerability granted by a parry
CombatConfig.ParryStaggerDuration = 1.2 -- how long a parried enemy is stunned

-- Heavy attack: armor-break stagger applied to enemies it hits.
CombatConfig.HeavyStaggerDuration = 0.9

-- Super meter (mirrors the web game: charges by dealing AND taking damage,
-- dealing charges more). 0..100; carries across deaths.
CombatConfig.SuperMeterMax = 100
CombatConfig.SuperGainDealtMultiplier = 0.70 -- attacker gains dmg * this per hit
CombatConfig.SuperGainTakenMultiplier = 0.35 -- victim gains dmg * this when hit
-- The super release itself: a radial burst around the caster. arc 360 = omni.
CombatConfig.Super = {
	range = 15,
	radius = 4,
	arc = 360,
	damage = 42,
	knockback = 95,
	armorBreak = true,
	iFrames = 0.55, -- brief invulnerability while the burst plays
}

return table.freeze(CombatConfig)
