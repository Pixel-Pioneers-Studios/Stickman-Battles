--!strict
--[[
	Weapons
	-------
	Data-driven weapon definitions. A weapon is a list of combo steps; each step
	describes its timing windows and hit shape. The combat engine (server) reads
	this to resolve hits; the client reads it to drive animation timing and to
	know when its input opens the combo window for the next step.

	This mirrors the reference game's "attack grammar" idea but is expressed as
	plain Luau data with Roblox units (studs, seconds, degrees).
]]

export type ComboStep = {
	damage: number,
	windup: number, -- time before the hitbox becomes active
	active: number, -- how long the hitbox stays live
	recovery: number, -- lockout after active before Idle returns
	comboWindow: number, -- window (after windup start) to buffer the next step
	range: number, -- forward reach of the hitbox (studs)
	radius: number, -- half-width of the hitbox (studs)
	arc: number, -- facing arc the target must fall within (degrees)
	knockback: number, -- horizontal impulse applied to the target
	armorBreak: boolean?, -- if true, staggers every enemy the step hits
}

-- How the client renders the held weapon (one stylised blade part on the hand).
export type WeaponVisual = {
	size: Vector3,
	color: Color3,
	material: Enum.Material,
}

export type WeaponDef = {
	id: string,
	displayName: string,
	desc: string, -- one-line shop blurb
	order: number, -- shop sort order
	price: number, -- coins; 0 = starter weapon (owned by default, not sold)
	visual: WeaponVisual,
	combo: { ComboStep }, -- the light-attack chain
	heavy: ComboStep, -- single armor-breaking heavy attack
}

local Weapons: { [string]: WeaponDef } = {
	Sword = {
		id = "Sword",
		displayName = "Worn Blade",
		desc = "The blade you woke with. Balanced, unremarkable, dependable.",
		order = 1,
		price = 0, -- starter: every profile owns it
		visual = {
			size = Vector3.new(0.2, 4, 0.5),
			color = Color3.fromRGB(210, 215, 230),
			material = Enum.Material.Metal,
		},
		combo = {
			-- Light 1: quick opener
			{
				damage = 8,
				windup = 0.10,
				active = 0.12,
				recovery = 0.24,
				comboWindow = 0.55,
				range = 6,
				radius = 3,
				arc = 120,
				knockback = 10,
			},
			-- Light 2: faster follow-up
			{
				damage = 9,
				windup = 0.08,
				active = 0.12,
				recovery = 0.24,
				comboWindow = 0.55,
				range = 6,
				radius = 3,
				arc = 120,
				knockback = 12,
			},
			-- Light 3: heavier finisher, more knockback, longer recovery
			{
				damage = 15,
				windup = 0.16,
				active = 0.16,
				recovery = 0.42,
				comboWindow = 0.0, -- resets combo
				range = 7,
				radius = 3.5,
				arc = 140,
				knockback = 34,
			},
		},
		-- Slow, high-commitment armor-breaker. Long windup you can be punished
		-- for, but it staggers whatever it lands on.
		heavy = {
			damage = 26,
			windup = 0.42,
			active = 0.18,
			recovery = 0.55,
			comboWindow = 0.0,
			range = 7.5,
			radius = 3.5,
			arc = 150,
			knockback = 46,
			armorBreak = true,
		},
	},

	-- Slow, brutal arcs. Highest per-hit damage and knockback in the shop tier;
	-- pays for it with long windups and recovery you can be punished through.
	Axe = {
		id = "Axe",
		displayName = "Iron Hewer",
		desc = "Slow, brutal arcs. Hits like a falling tree.",
		order = 2,
		price = 150,
		visual = {
			size = Vector3.new(0.35, 3.2, 1.1),
			color = Color3.fromRGB(140, 120, 100),
			material = Enum.Material.CorrodedMetal,
		},
		combo = {
			-- Heavy opener: wide and committed
			{
				damage = 14,
				windup = 0.18,
				active = 0.14,
				recovery = 0.36,
				comboWindow = 0.65,
				range = 6.5,
				radius = 3.5,
				arc = 140,
				knockback = 20,
			},
			-- Finishing overhead: big damage, big lockout
			{
				damage = 24,
				windup = 0.26,
				active = 0.16,
				recovery = 0.55,
				comboWindow = 0.0, -- resets combo
				range = 7,
				radius = 3.5,
				arc = 120,
				knockback = 44,
			},
		},
		-- The heavy is a ground-splitter: slowest windup in the game, but it
		-- staggers everything it touches and sends it flying.
		heavy = {
			damage = 36,
			windup = 0.55,
			active = 0.2,
			recovery = 0.7,
			comboWindow = 0.0,
			range = 8,
			radius = 4,
			arc = 160,
			knockback = 62,
			armorBreak = true,
		},
	},

	-- Fast, low-commitment cuts. Lowest per-hit numbers but the longest chain and
	-- the shortest lockouts — the dodge-weave weapon.
	Katana = {
		id = "Katana",
		displayName = "Duskfang",
		desc = "A whisper of steel. Four cuts before they see the first.",
		order = 3,
		price = 300,
		visual = {
			size = Vector3.new(0.15, 4.6, 0.4),
			color = Color3.fromRGB(190, 205, 235),
			material = Enum.Material.Metal,
		},
		combo = {
			{
				damage = 6,
				windup = 0.07,
				active = 0.1,
				recovery = 0.16,
				comboWindow = 0.5,
				range = 6.5,
				radius = 2.8,
				arc = 110,
				knockback = 6,
			},
			{
				damage = 6,
				windup = 0.06,
				active = 0.1,
				recovery = 0.16,
				comboWindow = 0.5,
				range = 6.5,
				radius = 2.8,
				arc = 110,
				knockback = 6,
			},
			{
				damage = 8,
				windup = 0.08,
				active = 0.1,
				recovery = 0.18,
				comboWindow = 0.5,
				range = 6.5,
				radius = 2.8,
				arc = 110,
				knockback = 8,
			},
			-- Chain finisher: a step-through slash with real knockback
			{
				damage = 14,
				windup = 0.12,
				active = 0.12,
				recovery = 0.34,
				comboWindow = 0.0, -- resets combo
				range = 7.5,
				radius = 3,
				arc = 120,
				knockback = 30,
			},
		},
		-- Iai draw: the fastest heavy — less damage than the others but hard to
		-- interrupt, and it still breaks armor.
		heavy = {
			damage = 20,
			windup = 0.32,
			active = 0.14,
			recovery = 0.45,
			comboWindow = 0.0,
			range = 8,
			radius = 3,
			arc = 130,
			knockback = 36,
			armorBreak = true,
		},
	},
}

return table.freeze(Weapons)
