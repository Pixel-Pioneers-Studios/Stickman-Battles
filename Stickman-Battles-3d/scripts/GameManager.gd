extends Node
# GameManager.gd — Autoload singleton.
# Owns the damage pipeline (mirrors dealDamage() from smb-combat.js),
# round/match state, hit-stop, the global frame counter, and fighter registry.

signal match_won(winner_num: int)
signal round_won(winner_num: int)
signal damage_dealt(attacker, target, dmg: int)
signal parried(defender, attacker)

var fighters: Array = []   # Array[Fighter] — untyped so autoload loads before Fighter class
var round_active := false
var match_over := false
# Horde/adventure mode: single deaths don't end the match — the scene owns
# win/lose (all enemies cleared, or the player is out of lives).
var horde_mode := false

# Global physics-frame counter (mirrors frameCount in the 2D game).
var frame_count := 0
# Frames remaining of hit-stop. While > 0 every Fighter freezes its physics.
var hit_stop_frames := 0

# ── Input bindings ────────────────────────────────────────────────────────────
# P1 mirrors the existing prototype scheme; P2 sits on arrows + right-side keys.
# Registered as InputMap actions ("p1_light", "p2_jump", ...) so they can be
# remapped later without touching Fighter code.
const PLAYER_KEYS := {
	1: {
		"up": KEY_W, "down": KEY_S, "left": KEY_A, "right": KEY_D,
		"jump": KEY_SPACE, "light": KEY_E, "heavy": KEY_Q,
		"shield": KEY_F, "super": KEY_R,
	},
	2: {
		"up": KEY_UP, "down": KEY_DOWN, "left": KEY_LEFT, "right": KEY_RIGHT,
		"jump": KEY_SHIFT, "light": KEY_COMMA, "heavy": KEY_PERIOD,
		"shield": KEY_SLASH, "super": KEY_N,
	},
}

func _ready() -> void:
	_setup_input()

func _setup_input() -> void:
	for p_num in PLAYER_KEYS:
		for action_name in PLAYER_KEYS[p_num]:
			var full := "p%d_%s" % [p_num, action_name]
			if InputMap.has_action(full): continue
			InputMap.add_action(full)
			var ev := InputEventKey.new()
			ev.physical_keycode = PLAYER_KEYS[p_num][action_name]
			InputMap.action_add_event(full, ev)

func _physics_process(_delta: float) -> void:
	frame_count += 1
	if hit_stop_frames > 0:
		hit_stop_frames -= 1

# ── Lifecycle ─────────────────────────────────────────────────────────────────

func reset() -> void:
	fighters.clear()
	round_active = false
	match_over = false
	horde_mode = false
	hit_stop_frames = 0

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
# All damage MUST go through here — mirrors the 2D dealDamage() contract:
# parry-vuln multiplier → KB-dmg scaling → parry roll → shield absorption →
# combo tracking → KB caps → take_damage → super gain → hit-stop.

# Percentage shields (stacks 4-6) pass this fraction of damage through
const SHIELD_PASS_FRAC := [0.20, 0.50, 0.80]

func deal_damage(attacker: Node, target: Node, dmg: int, kb_force: float, heavy := false) -> void:
	if not round_active: return
	if match_over: return
	if attacker == null or target == null: return
	if attacker == target: return
	if not target.has_method("take_damage"): return

	var actual_dmg := dmg
	var actual_kb  := kb_force

	# ── Parry vulnerability: an exposed attacker takes 1.5× damage ───────────
	if "parry_vuln_frames" in target and target.parry_vuln_frames > 0:
		actual_dmg = maxi(1, int(round(actual_dmg * 1.5)))

	# ── KB scales with damage — heavier hits launch further ──────────────────
	actual_kb *= (1.0 + actual_dmg * 0.028)

	# ── Shield handling (mirrors 2D: parry → HP drain w/ overflow → % stacks) ─
	if "is_shielding" in target and target.is_shielding and not target._dying:
		var stacks: int = maxi(1, target.shield_stacks)

		# Parry: only a fresh first-stack shield can parry, and only if raised
		# within the timing window (≤8 frames held: 65%, ≤15: 30%, else 0).
		if stacks == 1 and attacker.stun_timer <= 0:
			var held: int = target.shield_hold_timer
			var chance := 0.65 if held <= 8 else (0.30 if held <= 15 else 0.0)
			if chance > 0.0 and randf() < chance:
				attacker.stun_timer = maxi(attacker.stun_timer, 90)
				attacker.parry_vuln_frames = 90
				target.on_parry_success(attacker)
				hit_stop_frames = maxi(hit_stop_frames, 8)
				parried.emit(target, attacker)
				return

		if stacks <= 3:
			# HP shield: drains; overflow passes through and breaks the shield
			var sh: int = target.shield_hp
			if actual_dmg >= sh:
				target.break_shield()
				actual_dmg -= sh
				actual_kb = actual_kb * 0.6 if actual_dmg > 0 else 0.0
			else:
				target.shield_hp -= actual_dmg
				target.on_shield_block(attacker)
				return
		elif stacks <= 6:
			# Percentage shield: reduces damage, no shield HP to drain
			actual_dmg = maxi(1, int(actual_dmg * SHIELD_PASS_FRAC[stacks - 4]))

	if actual_dmg <= 0: return

	# ── Combo tracking (45-frame window, mirrors smb-combat.js) ──────────────
	# KB scaling per successive hit prevents re-hit loops; 7+ hits auto-launch.
	if "combo_hit_count" in attacker:
		if frame_count - attacker.combo_last_frame > 45:
			attacker.combo_hit_count = 0
		attacker.combo_hit_count += 1
		attacker.combo_last_frame = frame_count
		var cn: int = attacker.combo_hit_count
		if cn > 1:
			actual_kb = minf(actual_kb * minf(1.5, 1.0 + (cn - 1) * 0.08), 22.0)
		if cn >= 7 and actual_kb > 0.0:
			actual_kb = maxf(actual_kb, 17.0)

	# ── Per-frame impulse limit: second KB in the same frame is reduced ──────
	if "kb_applied_frame" in target:
		if target.kb_applied_frame == frame_count:
			actual_kb *= 0.45
		else:
			target.kb_applied_frame = frame_count

	# ── Hard KB cap ───────────────────────────────────────────────────────────
	actual_kb = minf(actual_kb, 20.0)

	target.take_damage(attacker, actual_dmg, actual_kb)

	# ── Super gain: attacker 70% of damage, victim 35% (2D parity) ────────────
	# A super's own damage charges nobody (super_active guard).
	if "super_active" in attacker and not attacker.super_active:
		attacker.gain_super(actual_dmg * 0.70)
	if "super_active" in target and not target.super_active:
		target.gain_super(actual_dmg * 0.35)

	# ── Hit-stop, scaled by damage (heavier hits freeze longer) ───────────────
	var hs: int
	if heavy:
		hs = mini(13, int(actual_dmg / 6.0) + 5)
	else:
		hs = mini(9, int(actual_dmg / 7.0) + 2)
	hit_stop_frames = maxi(hit_stop_frames, hs)

	damage_dealt.emit(attacker, target, actual_dmg)

# ── Death handling ────────────────────────────────────────────────────────────

func _on_fighter_died(fighter: Node) -> void:
	if match_over: return
	if horde_mode: return   # the adventure scene decides win/lose, not first-death

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
