extends Node
# Weapons.gd — Autoload. Mirrors the 2D weapon roster, adapted for 3D.
# range is in world units (metres). cooldown/endlag are physics frames (60fps).

const WEAPONS: Dictionary = {
	"sword": {
		"name": "Sword",
		"damage": 16, "range": 1.45, "cooldown": 30, "endlag": 7,
		"kb": 10, "type": "melee", "color": Color(0.80, 0.80, 0.85),
		"ability_name": "Blade Storm", "ability_cooldown": 150,
		"mesh_size": Vector3(0.09, 1.05, 0.09),
	},
	"hammer": {
		"name": "Hammer",
		"damage": 20, "range": 1.20, "cooldown": 75, "endlag": 22,
		"kb": 16, "type": "melee", "color": Color(0.50, 0.50, 0.55),
		"ability_name": "Ground Shockwave", "ability_cooldown": 230,
		"mesh_size": Vector3(0.30, 0.60, 0.30),
	},
	"axe": {
		"name": "Axe",
		"damage": 13, "range": 1.30, "cooldown": 52, "endlag": 16,
		"kb": 10, "type": "melee", "color": Color(0.80, 0.27, 0.13),
		"ability_name": "Spin Attack", "ability_cooldown": 180,
		"mesh_size": Vector3(0.22, 0.75, 0.16),
	},
	"spear": {
		"name": "Spear",
		"damage": 15, "range": 2.10, "cooldown": 44, "endlag": 12,
		"kb": 7,  "type": "melee", "color": Color(0.53, 0.53, 1.00),
		"ability_name": "Ground Spike", "ability_cooldown": 165,
		"mesh_size": Vector3(0.07, 1.50, 0.07),
	},
	"fryingpan": {
		"name": "Frying Pan",
		"damage": 18, "range": 1.10, "cooldown": 48, "endlag": 14,
		"kb": 14, "type": "melee", "color": Color(0.30, 0.30, 0.32),
		"ability_name": "Pan Slam", "ability_cooldown": 200,
		"mesh_size": Vector3(0.40, 0.40, 0.12),
	},
	"scythe": {
		"name": "Scythe",
		"damage": 14, "range": 1.60, "cooldown": 40, "endlag": 10,
		"kb": 9,  "type": "melee", "color": Color(0.55, 0.00, 0.75),
		"ability_name": "Soul Reap", "ability_cooldown": 160,
		"mesh_size": Vector3(0.11, 1.10, 0.11),
	},
	"boxinggloves": {
		"name": "Boxing Gloves",
		"damage": 12, "range": 0.90, "cooldown": 20, "endlag": 4,
		"kb": 8,  "type": "melee", "color": Color(0.90, 0.10, 0.20),
		"ability_name": "Uppercut", "ability_cooldown": 120,
		"mesh_size": Vector3(0.32, 0.32, 0.32),
	},
	"shield": {
		"name": "Shield",
		"damage": 10, "range": 0.95, "cooldown": 35, "endlag": 9,
		"kb": 12, "type": "melee", "color": Color(0.27, 0.53, 0.80),
		"ability_name": "Shield Bash", "ability_cooldown": 140,
		"mesh_size": Vector3(0.50, 0.80, 0.14),
	},
	"broomstick": {
		"name": "Broomstick",
		"damage": 11, "range": 1.50, "cooldown": 35, "endlag": 8,
		"kb": 8,  "type": "melee", "color": Color(0.55, 0.27, 0.07),
		"ability_name": "Broom Ride", "ability_cooldown": 170,
		"mesh_size": Vector3(0.07, 1.30, 0.07),
	},
}

func get_weapon(key: String) -> Dictionary:
	return WEAPONS.get(key, WEAPONS["sword"])

func get_keys() -> Array:
	return WEAPONS.keys()
