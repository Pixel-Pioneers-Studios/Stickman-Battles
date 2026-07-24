--!strict
--[[
	Skills
	------
	Data-only catalog for the skill tree. Three branches — Vitality (survive),
	Power (hit harder), Mobility (move + evade) — each a short prerequisite chain
	ending in a satisfying capstone. Points are earned elsewhere (act clears,
	bosses) and spent one rank at a time; SkillService owns ALL validation and
	turns purchased ranks into combat modifiers, so this module is pure data.

	A node's `effects` are PER-RANK deltas expressed only with these keys (any
	subset):
	  * maxHealthBonus         — flat bonus HP
	  * damageMult             — ADDITIVE multiplier bonus (0.06 = +6% damage)
	  * superGainMult          — ADDITIVE multiplier bonus to super charge
	  * moveSpeedBonus         — flat studs/sec
	  * dodgeCooldownReduction — fraction shorter (0.10 = 10% off the cooldown)

	`requires` is a map of nodeId -> minimum rank that must already be owned
	before this node can be purchased. Both client (locked-state UI) and server
	(authoritative gate) read the same map, so they can never disagree.
]]

export type SkillEffects = {
	maxHealthBonus: number?,
	damageMult: number?,
	superGainMult: number?,
	moveSpeedBonus: number?,
	dodgeCooldownReduction: number?,
}

export type SkillNode = {
	id: string,
	displayName: string,
	desc: string, -- short flavor + effect text for the card
	branch: string,
	maxRank: number,
	requires: { [string]: number }, -- nodeId -> minimum owned rank
	effects: SkillEffects, -- per-rank deltas
}

local Skills = {}

-- Ordered branch list drives the UI columns left -> right.
Skills.Branches = table.freeze({ "Vitality", "Power", "Mobility" })

Skills.Nodes = {
	-- ── Vitality ─────────────────────────────────────────────────────────
	vit_toughness = {
		id = "vit_toughness",
		displayName = "Toughness",
		desc = "Hard-won scar tissue. +18 max health per rank.",
		branch = "Vitality",
		maxRank = 3,
		requires = {},
		effects = { maxHealthBonus = 18 },
	},
	vit_resolve = {
		id = "vit_resolve",
		displayName = "Resolve",
		desc = "Pain fuels you. +10% super charge from taking hits per rank.",
		branch = "Vitality",
		maxRank = 2,
		requires = { vit_toughness = 2 },
		effects = { superGainMult = 0.10 },
	},
	vit_bulwark = {
		id = "vit_bulwark",
		displayName = "Bulwark",
		desc = "Capstone. An unbreakable frame: +45 max health and +5% damage.",
		branch = "Vitality",
		maxRank = 1,
		requires = { vit_resolve = 2 },
		effects = { maxHealthBonus = 45, damageMult = 0.05 },
	},

	-- ── Power ────────────────────────────────────────────────────────────
	pow_edge = {
		id = "pow_edge",
		displayName = "Honed Edge",
		desc = "Cleaner strikes. +6% damage per rank.",
		branch = "Power",
		maxRank = 3,
		requires = {},
		effects = { damageMult = 0.06 },
	},
	pow_momentum = {
		id = "pow_momentum",
		displayName = "Momentum",
		desc = "Every blow builds the storm. +8% super charge from dealing damage per rank.",
		branch = "Power",
		maxRank = 3,
		requires = { pow_edge = 2 },
		effects = { superGainMult = 0.08 },
	},
	pow_ferocity = {
		id = "pow_ferocity",
		displayName = "Ferocity",
		desc = "Relentless aggression. +8% damage per rank.",
		branch = "Power",
		maxRank = 2,
		requires = { pow_momentum = 2 },
		effects = { damageMult = 0.08 },
	},
	pow_annihilation = {
		id = "pow_annihilation",
		displayName = "Annihilation",
		desc = "Capstone. Overwhelming force: +15% damage.",
		branch = "Power",
		maxRank = 1,
		requires = { pow_ferocity = 2 },
		effects = { damageMult = 0.15 },
	},

	-- ── Mobility ─────────────────────────────────────────────────────────
	mob_swiftness = {
		id = "mob_swiftness",
		displayName = "Swiftness",
		desc = "Lighter on your feet. +2 move speed per rank.",
		branch = "Mobility",
		maxRank = 3,
		requires = {},
		effects = { moveSpeedBonus = 2 },
	},
	mob_reflexes = {
		id = "mob_reflexes",
		displayName = "Reflexes",
		desc = "Reset your guard faster. -10% dodge cooldown per rank.",
		branch = "Mobility",
		maxRank = 3,
		requires = { mob_swiftness = 2 },
		effects = { dodgeCooldownReduction = 0.10 },
	},
	mob_windwalk = {
		id = "mob_windwalk",
		displayName = "Windwalk",
		desc = "Capstone. Untouchable: +4 move speed and -15% dodge cooldown.",
		branch = "Mobility",
		maxRank = 1,
		requires = { mob_reflexes = 2 },
		effects = { moveSpeedBonus = 4, dodgeCooldownReduction = 0.15 },
	},
} :: { [string]: SkillNode }

return table.freeze(Skills)
