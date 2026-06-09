extends Node
# GameManager.gd — Autoload singleton.
# Owns the damage pipeline (mirrors dealDamage() from smb-combat.js),
# round/match state, and fighter registry.

signal match_won(winner_num: int)
signal round_won(winner_num: int)
signal damage_dealt(attacker, target, dmg: int)

var fighters: Array = []   # Array[Fighter] — untyped so autoload loads before Fighter class
var round_active := false
var match_over := false

# ── Lifecycle ─────────────────────────────────────────────────────────────────

func reset() -> void:
	fighters.clear()
	round_active = false
	match_over = false

func register_fighter(f: Node) -> void:
	if f not in fighters:
		fighters.append(f)
		f.died.connect(_on_fighter_died.bind(f))

func start_round() -> void:
	round_active = true
	match_over = false

func end_round() -> void:
	round_active = false

# ── Damage pipeline ───────────────────────────────────────────────────────────
# All damage MUST go through here — mirrors the 2D dealDamage() contract.

func deal_damage(attacker: Node, target: Node, dmg: int, kb_force: float) -> void:
	if not round_active: return
	if match_over: return
	if attacker == null or target == null: return
	if attacker == target: return
	if not target.has_method("take_damage"): return

	target.take_damage(attacker, dmg, kb_force)
	damage_dealt.emit(attacker, target, dmg)

# ── Death handling ────────────────────────────────────────────────────────────

func _on_fighter_died(fighter: Node) -> void:
	if match_over: return

	if fighter.lives <= 0:
		# This fighter is eliminated — the other player wins
		match_over = true
		end_round()
		var survivors: Array = fighters.filter(func(f): return f != fighter and f.lives > 0)
		if survivors.size() > 0:
			match_won.emit(survivors[0].player_num)
		else:
			# Simultaneous last-life deaths — draw, restart
			match_won.emit(0)
