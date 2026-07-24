--!strict
--[[
	Enemies
	-------
	Data-driven enemy archetypes. The server EnemyService/Enemy class reads these
	to build and drive an enemy. Keeping stats here (not hardcoded in the class)
	is how we'll scale to many enemy types without touching AI code.
]]

-- A single attack a boss can choose from. Simple enemies don't list these;
-- the Enemy class synthesises one default attack from the flat fields below so
-- both paths resolve through the same code.
export type AttackDef = {
	id: string,
	-- "melee" swings in an arc, "ranged" fires a projectile, "aoe" damages
	-- everything inside `radius` at the end of the windup (telegraphed ring).
	kind: string,
	range: number, -- max distance to *start* this attack
	windup: number,
	recovery: number,
	damage: number,
	knockback: number,
	cooldown: number?, -- min seconds between reuses of this specific attack
	radius: number?, -- aoe: blast radius; melee: forgiveness slack
	projectileSpeed: number?, -- ranged only
	projectileCount: number?, -- ranged only; >1 = spread volley
}

-- Health-fraction thresholds a boss crosses as it loses HP. Crossing one recolors
-- the boss and bumps `enrage` (a scalar the behaviour reads to attack faster).
export type PhaseDef = {
	healthFrac: number, -- enter this phase at/below this fraction of max HP
	color: Color3,
	enrage: number, -- multiplies attack cadence in the behaviour (1 = normal)
}

export type EnemyDef = {
	id: string,
	displayName: string,
	maxHealth: number,
	walkSpeed: number,
	-- AI ranges (studs)
	aggroRange: number,
	attackRange: number,
	-- Attack profile
	attackDamage: number,
	attackWindup: number,
	attackRecovery: number,
	attackKnockback: number,
	-- Ranged profile (nil for melee enemies). When set, the enemy fires a
	-- projectile at the end of its windup instead of swinging in melee range.
	ranged: boolean?,
	projectileSpeed: number?,
	-- Boss profile (nil for simple enemies). When `attacks` is present the enemy
	-- picks among them via the behaviour module named by `behaviourId`, and
	-- crosses `phases` as its health drops.
	attacks: { AttackDef }?,
	behaviourId: string?,
	phases: { PhaseDef }?,
	isBoss: boolean?,
	-- Economy: coins awarded to the player who lands the killing blow.
	coins: number?,
	-- Appearance
	color: Color3,
	height: number,
}

local Enemies: { [string]: EnemyDef } = {
	Grunt = {
		id = "Grunt",
		displayName = "Husk",
		maxHealth = 60,
		walkSpeed = 10,
		aggroRange = 42,
		attackRange = 6.5,
		attackDamage = 10,
		attackWindup = 0.45, -- telegraph the player can dodge
		attackRecovery = 0.7,
		attackKnockback = 14,
		coins = 6,
		color = Color3.fromRGB(120, 60, 70),
		height = 5,
	},

	-- Fast melee flanker (this game is melee-only — no ranged enemies). Closes
	-- distance quickly and jabs with a short, less-telegraphed strike, pressuring
	-- the player between the slower Husk's swings.
	Reaver = {
		id = "Reaver",
		displayName = "Reaver",
		maxHealth = 45,
		walkSpeed = 15, -- faster than the Husk; harasses and flanks
		aggroRange = 60,
		attackRange = 6.5,
		attackDamage = 9,
		attackWindup = 0.32, -- quick jab, tighter dodge window than the Husk
		attackRecovery = 0.5,
		attackKnockback = 12,
		coins = 8,
		color = Color3.fromRGB(70, 100, 120),
		height = 5,
	},

	-- Act I stage-3 MINIBOSS. An elite, oversized Reaver: ~3x a Reaver's HP,
	-- faster, and hitting harder. Reads `attacks` via the "ReaverCaptain"
	-- behaviour and enrages at 50% HP (recolor + faster cadence). Melee-only:
	-- a quick slash, a lunging gap-closer, and a telegraphed spinning sweep.
	ReaverCaptain = {
		id = "ReaverCaptain",
		displayName = "Reaver Captain",
		maxHealth = 135, -- 3x Reaver (45)
		walkSpeed = 18, -- faster than a Reaver (15)
		aggroRange = 72,
		attackRange = 15, -- widest attack's start range; behaviour gates per-attack
		attackDamage = 16,
		attackWindup = 0.3,
		attackRecovery = 0.5,
		attackKnockback = 18,
		isBoss = true,
		coins = 28,
		behaviourId = "ReaverCaptain",
		attacks = {
			-- Fast, low-commit jab to keep the pressure on at point blank.
			{
				id = "Slash",
				kind = "melee",
				range = 8,
				windup = 0.28,
				recovery = 0.45,
				damage = 15,
				knockback = 16,
				radius = 2.5,
				cooldown = 0,
			},
			-- Lunging gap-closer: punishes edge-of-melee turtling.
			{
				id = "Lunge",
				kind = "melee",
				range = 15,
				windup = 0.4, -- readable wind-up you can dodge
				recovery = 0.7,
				damage = 20,
				knockback = 28,
				radius = 3,
				cooldown = 3,
			},
			-- Spinning sweep: a brief-telegraph AOE that forces you to give ground.
			{
				id = "Sweep",
				kind = "aoe",
				range = 11,
				windup = 0.55, -- short, obvious tell
				recovery = 0.9,
				damage = 22,
				knockback = 24,
				radius = 11,
				cooldown = 6,
			},
		},
		phases = {
			{ healthFrac = 1.0, color = Color3.fromRGB(70, 120, 150), enrage = 1.0 },
			{ healthFrac = 0.5, color = Color3.fromRGB(185, 60, 80), enrage = 1.5 },
		},
		color = Color3.fromRGB(70, 120, 150),
		height = 9,
	},

	-- First boss. Reads `attacks` via the "Warden" behaviour and hardens through
	-- two phases. The flat attack* fields stay as a safe fallback (unused while
	-- `attacks` is present, but keep the type total).
	Warden = {
		id = "Warden",
		displayName = "The Warden",
		maxHealth = 420,
		walkSpeed = 12,
		aggroRange = 90,
		attackRange = 9, -- widest attack's start range; behaviour gates per-attack
		attackDamage = 18,
		attackWindup = 0.5,
		attackRecovery = 0.8,
		attackKnockback = 20,
		isBoss = true,
		coins = 45,
		behaviourId = "Warden",
		attacks = {
			{
				id = "Cleave",
				kind = "melee",
				range = 9,
				windup = 0.5,
				recovery = 0.7,
				damage = 18,
				knockback = 22,
				radius = 2.5,
				cooldown = 0,
			},
			{
				id = "Slam",
				kind = "aoe",
				range = 16, -- leaps into range conceptually; here just a start gate
				windup = 0.9, -- long, obvious tell you dodge out of
				recovery = 1.1,
				damage = 26,
				knockback = 34,
				radius = 14,
				cooldown = 5,
			},
			-- Reaching thrust (melee, no projectile) used as a mid-range gap-closer
			-- so turtling at the edge of melee still gets punished.
			{
				id = "Lunge",
				kind = "melee",
				range = 13,
				windup = 0.55, -- obvious wind-up you can dodge
				recovery = 0.9,
				damage = 20,
				knockback = 30,
				radius = 3,
				cooldown = 4,
			},
		},
		phases = {
			{ healthFrac = 1.0, color = Color3.fromRGB(90, 40, 110), enrage = 1.0 },
			{ healthFrac = 0.5, color = Color3.fromRGB(150, 30, 60), enrage = 1.5 },
		},
		color = Color3.fromRGB(90, 40, 110),
		height = 8,
	},
}

return table.freeze(Enemies)
