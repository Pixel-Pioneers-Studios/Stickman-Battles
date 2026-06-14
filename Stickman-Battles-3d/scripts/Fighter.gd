extends CharacterBody3D
class_name Fighter

signal health_changed(fighter: Fighter)
signal died(fighter: Fighter)

# ── Config ────────────────────────────────────────────────────────────────────
var max_health   := 150
var health       := 150
var lives        := 3
var player_num   := 1
var fighter_color := Color(0.4, 0.6, 1.0)
var weapon_key   := "sword"
var is_ai        := false
var spawn_pos    := Vector3.ZERO

# ── Physics ───────────────────────────────────────────────────────────────────
const GRAVITY          := 40.0
const MOVE_SPEED       := 8.0
const JUMP_VELOCITY    := 16.0
const DOUBLE_JUMP_MULT := 0.80
const TURN_SPEED       := 14.0  # radians/sec for character rotation

# ── Shield (mirrors smb-input.js degradation rules) ───────────────────────────
const SHIELD_MAX_HOLD    := 140             # max frames shield stays up (~2.3 s)
const SHIELD_RECHARGE    := 180             # 3 s window before stacks reset
const SHIELD_HP_TABLE    := [0, 30, 15, 5]  # HP per consecutive deployment
const SHIELD_MAX_STACKS  := 6               # stacks 4-6 are percentage shields; 7+ fails

# ── Super meter (2D parity: passive trickle + gain on dealing/taking damage) ──
const SUPER_TRICKLE      := 0.04            # per physics frame (~42 s to fill from 0)
const SUPER_IFRAMES      := 90              # 1.5 s i-frames on activation

# ── Attack phases ─────────────────────────────────────────────────────────────
enum AtkPhase { NONE, WINDUP, ACTIVE }
const ACTIVE_FRAMES_LIGHT := 6
const ACTIVE_FRAMES_HEAVY := 8

# ── State ─────────────────────────────────────────────────────────────────────
var can_double_jump := false
var knockback      := Vector3.ZERO
var _dying         := false
var _facing_yaw    := 0.0   # current Y rotation (radians), smoothed toward movement

# Shield state
var is_shielding          := false
var shield_hp             := 0
var shield_stacks         := 0
var shield_hold_timer     := 0
var shield_broken         := false   # re-press required after break/timeout
var shield_recharge_timer := 0

# ── Combat timers (physics frames) ────────────────────────────────────────────
var cooldown        := 0
var cooldown_max    := 1       # what cooldown was set to — lets the HUD show recovery
var attack_endlag   := 0
var weapon_hit      := false
var invincible      := 0
var stun_timer      := 0
var hurt_timer      := 0
var parry_vuln_frames := 0     # exposed after being parried: takes 1.5× damage
var _heavy_active   := false   # true when current swing is a heavy attack
var _atk_phase      := AtkPhase.NONE
var _phase_timer    := 0
var _phase_total    := 1       # length of current phase, for animation progress

# Super meter: 0-100; ready at 100; spends all; carries over between lives
var super_meter  := 0.0
var super_ready  := false
var super_active := false      # true while the super itself deals damage (no self-charge)

# ── Combo bookkeeping (written by GameManager.deal_damage) ────────────────────
var combo_hit_count  := 0
var combo_last_frame := -999
var kb_applied_frame := -999

# ── Node refs ─────────────────────────────────────────────────────────────────
var _rig         : StickFigure
var _weapon_mesh : MeshInstance3D
var _label_3d    : Label3D
var _hitbox      : Area3D
var _hitbox_col  : CollisionShape3D
var _body_mat    : StandardMaterial3D
var _weapon_mat  : StandardMaterial3D
var _shield_mesh : MeshInstance3D
var _shield_mat  : StandardMaterial3D

var _weapon : Dictionary

# ── Ready ─────────────────────────────────────────────────────────────────────
func _ready() -> void:
	add_to_group("fighter")
	collision_layer = 2
	collision_mask  = 1   # land on platforms; fighters don't physically push each other
	_build_visuals()
	_build_hitbox()

func setup(p_num: int, color: Color, weapon: String,
		spawn: Vector3, ai: bool, lives_count: int = 3) -> void:
	player_num    = p_num
	fighter_color = color
	weapon_key    = weapon
	spawn_pos     = spawn
	is_ai         = ai
	lives         = lives_count
	health        = max_health
	position      = spawn_pos
	# Face the arena centre (i.e. the opponent at match start)
	if Vector2(spawn.x, spawn.z).length() > 0.1:
		_facing_yaw = atan2(-spawn.x, -spawn.z)
	else:
		_facing_yaw = 0.0
	rotation.y = _facing_yaw
	_apply_weapon_visuals()
	_body_mat.albedo_color = fighter_color

# ── Build character visuals ───────────────────────────────────────────────────
func _build_visuals() -> void:
	# Procedural stick-figure rig (shares one material so hurt-flash tints all of it)
	_body_mat = StandardMaterial3D.new()
	_body_mat.albedo_color = fighter_color
	_rig = StickFigure.new()
	add_child(_rig)
	_rig.build(_body_mat)

	# Capsule collider (collision shape unchanged by the visual rig)
	var col := CollisionShape3D.new()
	var cs  := CapsuleShape3D.new()
	cs.radius = 0.30
	cs.height = 1.60
	col.shape = cs
	col.position.y = 0.80
	add_child(col)

	# Weapon (box, resized in _apply_weapon_visuals) — rides the rig's hand
	# socket, so all swing motion comes from the arm pose
	_weapon_mesh = MeshInstance3D.new()
	var wb := BoxMesh.new()
	wb.size = Vector3(0.10, 1.05, 0.10)
	_weapon_mesh.mesh = wb
	_weapon_mat = StandardMaterial3D.new()
	_weapon_mat.albedo_color = Color(0.8, 0.8, 0.8)
	_weapon_mesh.material_override = _weapon_mat
	_rig.weapon_socket.add_child(_weapon_mesh)

	# Shield disc (visible only when shielding; tint reflects remaining HP)
	_shield_mesh = MeshInstance3D.new()
	var sd := CylinderMesh.new()
	sd.top_radius    = 0.70
	sd.bottom_radius = 0.70
	sd.height        = 0.08
	_shield_mesh.mesh = sd
	_shield_mat = StandardMaterial3D.new()
	_shield_mat.albedo_color   = Color(0.4, 0.7, 1.0, 0.55)
	_shield_mat.transparency   = BaseMaterial3D.TRANSPARENCY_ALPHA
	_shield_mat.emission_enabled = true
	_shield_mat.emission       = Color(0.3, 0.5, 1.0)
	_shield_mat.emission_energy_multiplier = 0.8
	_shield_mesh.material_override = _shield_mat
	# Local +Z = facing direction (see movement yaw math) — shield guards the front
	_shield_mesh.position = Vector3(0.0, 0.80, 0.45)
	_shield_mesh.rotation_degrees.x = 90.0
	_shield_mesh.visible = false
	add_child(_shield_mesh)

	# Billboard label
	_label_3d = Label3D.new()
	_label_3d.font_size   = 26
	_label_3d.outline_size = 5
	_label_3d.position.y  = 2.0
	_label_3d.billboard   = BaseMaterial3D.BILLBOARD_ENABLED
	_label_3d.no_depth_test = true
	add_child(_label_3d)

func _apply_weapon_visuals() -> void:
	_weapon = Weapons.get_weapon(weapon_key)
	if _weapon.is_empty(): return
	_weapon_mat.albedo_color = _weapon.get("color", Color.GRAY)
	var wb := _weapon_mesh.mesh as BoxMesh
	if wb:
		wb.size = _weapon.get("mesh_size", Vector3(0.10, 1.05, 0.10))
		# Grip at the bottom: blade extends past the hand along the socket's Y
		_weapon_mesh.position = Vector3(0.0, wb.size.y * 0.30, 0.0)

# ── Build hitbox ──────────────────────────────────────────────────────────────
func _build_hitbox() -> void:
	_hitbox = Area3D.new()
	_hitbox.collision_layer = 0
	_hitbox.collision_mask  = 2
	_hitbox_col = CollisionShape3D.new()
	var hbs := BoxShape3D.new()
	hbs.size = Vector3(1.1, 1.1, 1.0)
	_hitbox_col.shape = hbs
	# Directly in front: local +Z = facing direction (matches movement yaw math)
	_hitbox_col.position = Vector3(0.0, 0.75, 0.85)
	_hitbox.add_child(_hitbox_col)
	add_child(_hitbox)
	# Always monitoring; hits are polled only during ACTIVE frames.
	_hitbox.monitoring = true

# ── Physics process ───────────────────────────────────────────────────────────
func _physics_process(delta: float) -> void:
	if _dying: return
	if GameManager.hit_stop_frames > 0:
		return   # global hit-stop: everyone freezes

	_tick_timers()
	if not is_ai:
		_process_input(delta)
	_apply_gravity(delta)
	_apply_knockback()
	_poll_attack_hits()
	_update_visuals()
	move_and_slide()

	if position.y < -10.0:
		_die()

# ── Input ─────────────────────────────────────────────────────────────────────
func _action(act: String) -> String:
	return "p%d_%s" % [player_num, act]

func _process_input(delta: float) -> void:
	var incap := stun_timer > 0

	# ── Movement (world-space, camera is fixed-yaw) ───────────────────────────
	var move := Vector3.ZERO
	move.x = Input.get_action_strength(_action("right")) - Input.get_action_strength(_action("left"))
	move.z = Input.get_action_strength(_action("down"))  - Input.get_action_strength(_action("up"))

	if not incap:
		var speed_mult := 1.0
		if _atk_phase != AtkPhase.NONE: speed_mult = 0.5   # slowed while swinging
		elif is_shielding:              speed_mult = 0.4   # slowed while shielding
		if move.length_squared() > 0.01:
			move = move.normalized()
			velocity.x = move.x * MOVE_SPEED * speed_mult
			velocity.z = move.z * MOVE_SPEED * speed_mult
			# Rotate character smoothly to face movement direction
			var target_yaw := atan2(move.x, move.z)
			_facing_yaw = lerp_angle(_facing_yaw, target_yaw, TURN_SPEED * delta)
			rotation.y  = _facing_yaw
		else:
			velocity.x *= 0.70
			velocity.z *= 0.70
			if absf(velocity.x) < 0.05: velocity.x = 0.0
			if absf(velocity.z) < 0.05: velocity.z = 0.0
	elif incap:
		velocity.x *= 0.80
		velocity.z *= 0.80

	# ── Jump ──────────────────────────────────────────────────────────────────
	if Input.is_action_just_pressed(_action("jump")) and not incap:
		if is_on_floor():
			velocity.y = JUMP_VELOCITY
			can_double_jump = true
		elif can_double_jump:
			velocity.y = JUMP_VELOCITY * DOUBLE_JUMP_MULT
			can_double_jump = false

	# ── Shield (degrades per consecutive deployment; re-press after break) ────
	_process_shield_input(incap)

	# ── Attacks ───────────────────────────────────────────────────────────────
	var can_act := not incap and cooldown <= 0 and attack_endlag <= 0 \
			and _atk_phase == AtkPhase.NONE and not is_shielding
	if Input.is_action_just_pressed(_action("light")) and can_act:
		_start_attack(false)
	elif Input.is_action_just_pressed(_action("heavy")) and can_act:
		_start_attack(true)
	elif Input.is_action_just_pressed(_action("super")) and can_act and super_ready:
		_use_super()

func _process_shield_input(incap: bool) -> void:
	var s_held := Input.is_action_pressed(_action("shield"))
	if not s_held:
		# Key released — clear state, allow fresh activation on next press
		is_shielding      = false
		shield_hold_timer = 0
		shield_broken     = false
		return
	if incap:
		is_shielding = false
		return
	if shield_hold_timer == 0 and not shield_broken and not is_shielding:
		# New deployment: stack tier up. Stacks 1-3 are HP shields (30/15/5);
		# 4-6 are percentage shields (pass 20/50/80% through); 7+ fails.
		shield_stacks += 1
		shield_recharge_timer = SHIELD_RECHARGE
		if shield_stacks < SHIELD_HP_TABLE.size():
			is_shielding      = true
			shield_hold_timer = 1
			shield_hp         = SHIELD_HP_TABLE[shield_stacks]
		elif shield_stacks <= SHIELD_MAX_STACKS:
			is_shielding      = true
			shield_hold_timer = 1
			shield_hp         = 0   # percentage mode — no HP pool
	elif is_shielding:
		shield_hold_timer += 1
		if shield_hold_timer >= SHIELD_MAX_HOLD:
			# Held too long — drops and must be re-pressed
			is_shielding      = false
			shield_hold_timer = 0
			shield_broken     = true

# ── Gravity ───────────────────────────────────────────────────────────────────
func _apply_gravity(delta: float) -> void:
	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	else:
		if velocity.y < 0.0: velocity.y = 0.0

# ── Knockback ─────────────────────────────────────────────────────────────────
func _apply_knockback() -> void:
	if knockback.length_squared() < 0.01:
		knockback = Vector3.ZERO
		return
	velocity.x += knockback.x
	velocity.y += knockback.y
	velocity.z += knockback.z
	knockback  *= 0.60

# ── Timers ────────────────────────────────────────────────────────────────────
func _tick_timers() -> void:
	if cooldown      > 0: cooldown      -= 1
	if invincible    > 0: invincible    -= 1
	if stun_timer    > 0: stun_timer    -= 1
	if hurt_timer    > 0: hurt_timer    -= 1
	if attack_endlag > 0: attack_endlag -= 1
	if parry_vuln_frames > 0: parry_vuln_frames -= 1

	# Passive super trickle — the "slow charge"
	if not super_active:
		gain_super(SUPER_TRICKLE)

	if shield_recharge_timer > 0:
		shield_recharge_timer -= 1
		if shield_recharge_timer == 0:
			shield_stacks = 0   # rested — degradation tiers reset

	# Attack phase progression: WINDUP → ACTIVE → (cooldown + endlag)
	if _atk_phase != AtkPhase.NONE:
		_phase_timer -= 1
		if _phase_timer <= 0:
			if _atk_phase == AtkPhase.WINDUP:
				_atk_phase   = AtkPhase.ACTIVE
				_phase_total = ACTIVE_FRAMES_HEAVY if _heavy_active else ACTIVE_FRAMES_LIGHT
				_phase_timer = _phase_total
			else:
				_atk_phase    = AtkPhase.NONE
				weapon_hit    = false
				cooldown      = _weapon.get("cooldown", 30) + (30 if _heavy_active else 0)
				cooldown_max  = maxi(cooldown, 1)
				attack_endlag = _weapon.get("endlag", 8)    + (12 if _heavy_active else 0)

# ── Attack ────────────────────────────────────────────────────────────────────
func _start_attack(heavy: bool) -> void:
	_weapon = Weapons.get_weapon(weapon_key)
	if _weapon.is_empty(): return

	_heavy_active = heavy
	weapon_hit    = false

	var windup: int = _weapon.get("windup", 5)
	if heavy: windup = int(ceil(windup * 1.6))
	_atk_phase   = AtkPhase.WINDUP
	_phase_total = windup
	_phase_timer = windup

	# Soft lock-on: snap to face the opponent if they're close enough
	_face_opponent()

	var hb := _hitbox_col.shape as BoxShape3D
	if heavy: hb.size = Vector3(1.4, 1.2, 1.2)
	else:     hb.size = Vector3(1.1, 1.1, 1.0)

func _face_opponent() -> void:
	var best: Fighter = null
	var best_d := 6.0   # only snap within engagement range
	for f in GameManager.fighters:
		if f == self or not (f is Fighter) or f._dying: continue
		var d: float = global_position.distance_to(f.global_position)
		if d < best_d:
			best_d = d
			best   = f
	if best == null: return
	var dir := best.global_position - global_position
	if Vector2(dir.x, dir.z).length_squared() < 0.01: return
	_facing_yaw = atan2(dir.x, dir.z)
	rotation.y  = _facing_yaw

# Poll for hits every frame the swing is ACTIVE (robust against targets
# already overlapping when the window opens, unlike body_entered alone).
func _poll_attack_hits() -> void:
	if _atk_phase != AtkPhase.ACTIVE or weapon_hit: return
	for body in _hitbox.get_overlapping_bodies():
		if body == self: continue
		if not body.is_in_group("fighter"): continue
		var target := body as Fighter
		if target == null or target._dying: continue

		weapon_hit = true
		var base_dmg  : int   = _weapon.get("damage", 10)
		var base_kb   : float = float(_weapon.get("kb", 8))
		var dmg := int(base_dmg * (1.55 if _heavy_active else 0.75))
		var kb  := base_kb     * (1.70 if _heavy_active else 0.80)
		GameManager.deal_damage(self, target, dmg, kb, _heavy_active)
		break

# ── Super (weapon ability placeholder: radial burst) ──────────────────────────
# Spends the full meter; per-weapon supers replace the burst later.
func _use_super() -> void:
	_weapon = Weapons.get_weapon(weapon_key)
	if _weapon.is_empty(): return
	super_ready = false
	super_meter = 0.0
	super_active = true   # the super's own damage charges nobody
	invincible = maxi(invincible, SUPER_IFRAMES)
	_face_opponent()
	_spawn_super_burst()
	for f in GameManager.fighters:
		if f == self or not (f is Fighter) or f._dying: continue
		if global_position.distance_to(f.global_position) <= 3.2:
			var dmg := int(_weapon.get("damage", 10) * 1.8)
			var kb  := float(_weapon.get("kb", 8)) * 1.5
			GameManager.deal_damage(self, f, dmg, kb, true)
	super_active = false

func gain_super(amount: float) -> void:
	if super_active or _dying: return
	super_meter = minf(100.0, super_meter + amount)
	if not super_ready and super_meter >= 100.0:
		super_ready = true

func _spawn_super_burst() -> void:
	var burst := MeshInstance3D.new()
	var sph := SphereMesh.new()
	sph.radius = 1.0
	sph.height = 2.0
	burst.mesh = sph
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(fighter_color.r, fighter_color.g, fighter_color.b, 0.45)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.emission_enabled = true
	mat.emission = fighter_color
	mat.emission_energy_multiplier = 2.5
	burst.material_override = mat
	get_parent().add_child(burst)
	burst.global_position = global_position + Vector3(0, 0.9, 0)
	burst.scale = Vector3.ONE * 0.4
	var tw := burst.create_tween()
	tw.set_parallel(true)
	tw.tween_property(burst, "scale", Vector3.ONE * 3.2, 0.28).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(mat, "albedo_color:a", 0.0, 0.28)
	tw.chain().tween_callback(burst.queue_free)

# ── Shield hooks (called by GameManager.deal_damage) ──────────────────────────
func on_shield_block(attacker: Fighter) -> void:
	hurt_timer = 4
	# Pushback only — no HP loss while the shield holds
	var push := global_position - attacker.global_position
	push.y = 0.0
	if push.length_squared() < 0.01:
		push = attacker.global_transform.basis.z   # attacker's facing (+Z forward)
	knockback = push.normalized() * 2.5 + Vector3(0, 0.5, 0)

func break_shield() -> void:
	# 2D parity: breaking does NOT stun the holder — overflow damage punishes
	is_shielding      = false
	shield_broken     = true
	shield_hp         = 0
	shield_hold_timer = 0
	shield_recharge_timer = SHIELD_RECHARGE
	hurt_timer = 6

func on_parry_success(attacker: Fighter) -> void:
	# Defender's reward flash; the attacker's 90f stun + vulnerability is set
	# by the pipeline. Quick gold ring burst at the shield.
	var ring := MeshInstance3D.new()
	var tor := TorusMesh.new()
	tor.inner_radius = 0.55
	tor.outer_radius = 0.70
	ring.mesh = tor
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.95, 0.3, 0.85)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.9, 0.2)
	mat.emission_energy_multiplier = 3.0
	ring.material_override = mat
	get_parent().add_child(ring)
	ring.global_position = global_position + Vector3(0, 0.9, 0)
	ring.scale = Vector3.ONE * 0.5
	var tw := ring.create_tween()
	tw.set_parallel(true)
	tw.tween_property(ring, "scale", Vector3.ONE * 2.4, 0.30).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_property(mat, "albedo_color:a", 0.0, 0.30)
	tw.chain().tween_callback(ring.queue_free)

# ── Take damage ───────────────────────────────────────────────────────────────
func take_damage(attacker: Fighter, dmg: int, kb_force: float) -> void:
	if invincible > 0 or health <= 0 or _dying: return

	health = max(0, health - dmg)
	invincible = 12
	hurt_timer = 12

	# Hitstun, decayed per successive combo hit so combos stay escapable
	var stun := int(kb_force * 0.40)
	if attacker and attacker.combo_hit_count > 1:
		stun = int(stun * maxf(0.28, 1.0 - (attacker.combo_hit_count - 1) * 0.08))
	stun_timer = maxi(stun_timer, stun)

	# 3D knockback: away from attacker in XZ, with upward pop
	var kb_dir := (global_position - attacker.global_position)
	kb_dir.y = 0.0
	if kb_dir.length_squared() < 0.01:
		kb_dir = attacker.global_transform.basis.z   # attacker's facing (+Z forward)
	kb_dir = kb_dir.normalized()
	# Auto-launch threshold (KB ≥ 17 from the combo limiter) pops harder upward
	var up_mult := 0.18 if kb_force >= 17.0 else 0.07
	knockback = Vector3(kb_dir.x * kb_force * 0.14,
						kb_force * up_mult,
						kb_dir.z * kb_force * 0.14)

	health_changed.emit(self)
	if health <= 0 and not _dying:
		_die()

# ── Death / Respawn ───────────────────────────────────────────────────────────
func _die() -> void:
	if _dying: return
	_dying   = true
	lives   -= 1
	health   = 0
	velocity = Vector3.ZERO
	knockback = Vector3.ZERO
	_atk_phase = AtkPhase.NONE
	is_shielding = false
	super_active = false
	died.emit(self)

	if lives > 0:
		position = Vector3(0.0, -40.0, 0.0)
		await get_tree().create_timer(1.8).timeout
		if is_inside_tree(): _respawn()

func _respawn() -> void:
	_dying        = false
	health        = max_health
	invincible    = 90
	stun_timer    = 0
	hurt_timer    = 0
	attack_endlag = 0
	cooldown      = 0
	parry_vuln_frames = 0
	# super_meter / super_ready intentionally NOT reset — supers carry over lives
	_atk_phase    = AtkPhase.NONE
	knockback     = Vector3.ZERO
	velocity      = Vector3.ZERO
	is_shielding  = false
	shield_stacks = 0
	shield_broken = false
	shield_hold_timer = 0
	position      = spawn_pos
	health_changed.emit(self)

# ── Visuals ───────────────────────────────────────────────────────────────────
func _update_visuals() -> void:
	var vis := not _dying
	_rig.visible      = vis
	_label_3d.visible = vis
	_shield_mesh.visible = false
	if not vis: return

	# Shield disc, tinted by remaining shield HP (blue → red as it weakens)
	if is_shielding:
		_shield_mesh.visible = true
		var frac := clampf(float(shield_hp) / 30.0, 0.0, 1.0)
		_shield_mat.albedo_color = Color(0.4 + (1.0 - frac) * 0.5, 0.3 + frac * 0.4, frac, 0.55)

	# Drive the rig: all body + weapon-arm animation lives in StickFigure
	var atk := "none"
	var atk_t := 0.0
	if _atk_phase != AtkPhase.NONE:
		atk   = "windup" if _atk_phase == AtkPhase.WINDUP else "active"
		atk_t = 1.0 - float(_phase_timer) / float(maxi(_phase_total, 1))
	_rig.update_pose({
		"speed": Vector2(velocity.x, velocity.z).length(),
		"on_floor": is_on_floor(),
		"shielding": is_shielding,
		"stunned": stun_timer > 0,
		"atk": atk,
		"atk_t": atk_t,
		"heavy": _heavy_active,
	}, get_physics_process_delta_time())

	# Colour states
	if hurt_timer > 0 and hurt_timer % 4 < 2:
		_body_mat.albedo_color = Color.WHITE
	elif stun_timer > 0:
		_body_mat.albedo_color = Color(0.9, 0.8, 0.2)
	elif parry_vuln_frames > 0 and parry_vuln_frames % 10 < 5:
		_body_mat.albedo_color = Color(1.0, 0.55, 0.1)   # exposed: orange pulse
	elif is_shielding:
		_body_mat.albedo_color = Color(0.5, 0.75, 1.0)
	elif invincible > 0 and invincible % 6 < 3:
		_body_mat.albedo_color = Color(fighter_color.r, fighter_color.g, fighter_color.b, 0.3)
	else:
		_body_mat.albedo_color = fighter_color

	var star := "★" if super_ready else ""
	_label_3d.text = "P%d %s %s" % [player_num, "♥".repeat(max(0, lives)), star]
