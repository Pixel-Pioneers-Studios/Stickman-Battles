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

# ── State ─────────────────────────────────────────────────────────────────────
var can_double_jump := false
var is_shielding   := false
var knockback      := Vector3.ZERO
var _dying         := false
var _facing_yaw    := 0.0   # current Y rotation (radians), smoothed toward movement

# ── Combat timers (physics frames) ────────────────────────────────────────────
var cooldown        := 0
var attack_timer    := 0
var attack_endlag   := 0
var weapon_hit      := false
var invincible      := 0
var stun_timer      := 0
var hurt_timer      := 0
var _heavy_active   := false   # true when current swing is a heavy attack

# ── Input edge detection ──────────────────────────────────────────────────────
var _jump_was_pressed    := false
var _light_was_pressed   := false
var _heavy_was_pressed   := false
var _super_was_pressed   := false

# ── Node refs ─────────────────────────────────────────────────────────────────
var _body_mesh   : MeshInstance3D
var _weapon_mesh : MeshInstance3D
var _label_3d    : Label3D
var _hitbox      : Area3D
var _hitbox_col  : CollisionShape3D
var _body_mat    : StandardMaterial3D
var _weapon_mat  : StandardMaterial3D
var _shield_mesh : MeshInstance3D

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
	_facing_yaw   = 0.0
	rotation.y    = _facing_yaw
	_apply_weapon_visuals()
	_body_mat.albedo_color = fighter_color

# ── Build character visuals ───────────────────────────────────────────────────
func _build_visuals() -> void:
	# Body capsule
	_body_mesh = MeshInstance3D.new()
	var cap := CapsuleMesh.new()
	cap.radius = 0.30
	cap.height = 1.60
	_body_mesh.mesh = cap
	_body_mat = StandardMaterial3D.new()
	_body_mat.albedo_color = fighter_color
	_body_mesh.material_override = _body_mat
	_body_mesh.position.y = 0.80
	add_child(_body_mesh)

	# Capsule collider
	var col := CollisionShape3D.new()
	var cs  := CapsuleShape3D.new()
	cs.radius = 0.30
	cs.height = 1.60
	col.shape = cs
	col.position.y = 0.80
	add_child(col)

	# Weapon (box, resized in _apply_weapon_visuals)
	_weapon_mesh = MeshInstance3D.new()
	var wb := BoxMesh.new()
	wb.size = Vector3(0.10, 1.05, 0.10)
	_weapon_mesh.mesh = wb
	_weapon_mat = StandardMaterial3D.new()
	_weapon_mat.albedo_color = Color(0.8, 0.8, 0.8)
	_weapon_mesh.material_override = _weapon_mat
	# Held to the right side, in front
	_weapon_mesh.position = Vector3(0.35, 0.90, -0.25)
	add_child(_weapon_mesh)

	# Shield disc (visible only when shielding)
	_shield_mesh = MeshInstance3D.new()
	var sd := CylinderMesh.new()
	sd.top_radius    = 0.70
	sd.bottom_radius = 0.70
	sd.height        = 0.08
	_shield_mesh.mesh = sd
	var sm := StandardMaterial3D.new()
	sm.albedo_color   = Color(0.4, 0.7, 1.0, 0.55)
	sm.transparency   = BaseMaterial3D.TRANSPARENCY_ALPHA
	sm.emission_enabled = true
	sm.emission       = Color(0.3, 0.5, 1.0)
	sm.emission_energy_multiplier = 0.8
	_shield_mesh.material_override = sm
	_shield_mesh.position = Vector3(0.0, 0.80, -0.35)
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

# ── Build hitbox ──────────────────────────────────────────────────────────────
func _build_hitbox() -> void:
	_hitbox = Area3D.new()
	_hitbox.collision_layer = 0
	_hitbox.collision_mask  = 2
	_hitbox_col = CollisionShape3D.new()
	var hbs := BoxShape3D.new()
	hbs.size = Vector3(1.1, 1.1, 1.0)
	_hitbox_col.shape = hbs
	# Place directly in front (local -Z = forward)
	_hitbox_col.position = Vector3(0.0, 0.75, -0.85)
	_hitbox.add_child(_hitbox_col)
	add_child(_hitbox)
	_hitbox.monitoring = false
	_hitbox.body_entered.connect(_on_hitbox_body_entered)

# ── Physics process ───────────────────────────────────────────────────────────
func _physics_process(delta: float) -> void:
	if _dying: return

	_tick_timers()
	if not is_ai:
		_process_input(delta)
	_apply_gravity(delta)
	_apply_knockback()
	_update_visuals()
	move_and_slide()

	if position.y < -10.0:
		_die()

# ── Input ─────────────────────────────────────────────────────────────────────
func _process_input(delta: float) -> void:
	var incap := stun_timer > 0

	# ── Movement (world-space WASD) ───────────────────────────────────────────
	var move := Vector3.ZERO
	if Input.is_key_pressed(KEY_W): move.z -= 1.0
	if Input.is_key_pressed(KEY_S): move.z += 1.0
	if Input.is_key_pressed(KEY_A): move.x -= 1.0
	if Input.is_key_pressed(KEY_D): move.x += 1.0

	if not incap:
		if move.length_squared() > 0.01:
			move = move.normalized()
			velocity.x = move.x * MOVE_SPEED
			velocity.z = move.z * MOVE_SPEED
			# Rotate character smoothly to face movement direction
			var target_yaw := atan2(move.x, move.z)
			_facing_yaw = lerp_angle(_facing_yaw, target_yaw, TURN_SPEED * delta)
			rotation.y  = _facing_yaw
		else:
			velocity.x *= 0.70
			velocity.z *= 0.70
			if absf(velocity.x) < 0.05: velocity.x = 0.0
			if absf(velocity.z) < 0.05: velocity.z = 0.0
	else:
		velocity.x *= 0.80
		velocity.z *= 0.80

	# ── Jump ──────────────────────────────────────────────────────────────────
	var jump_down := Input.is_key_pressed(KEY_SPACE)
	if jump_down and not _jump_was_pressed and not incap:
		if is_on_floor():
			velocity.y = JUMP_VELOCITY
			can_double_jump = true
		elif can_double_jump:
			velocity.y = JUMP_VELOCITY * DOUBLE_JUMP_MULT
			can_double_jump = false
	_jump_was_pressed = jump_down

	# ── Shield (F) ────────────────────────────────────────────────────────────
	is_shielding = Input.is_key_pressed(KEY_F) and not incap

	# ── Light attack (E) ──────────────────────────────────────────────────────
	var light_down := Input.is_key_pressed(KEY_E)
	if light_down and not _light_was_pressed:
		if not incap and cooldown <= 0 and attack_endlag <= 0 and attack_timer <= 0:
			_start_attack(false)
	_light_was_pressed = light_down

	# ── Heavy attack (Q) ──────────────────────────────────────────────────────
	var heavy_down := Input.is_key_pressed(KEY_Q)
	if heavy_down and not _heavy_was_pressed:
		if not incap and cooldown <= 0 and attack_endlag <= 0 and attack_timer <= 0:
			_start_attack(true)
	_heavy_was_pressed = heavy_down

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
	if cooldown    > 0: cooldown    -= 1
	if invincible  > 0: invincible  -= 1
	if stun_timer  > 0: stun_timer  -= 1
	if hurt_timer  > 0: hurt_timer  -= 1

	if attack_timer > 0:
		attack_timer -= 1
		if attack_timer == 0:
			_end_attack_window()
	if attack_endlag > 0:
		attack_endlag -= 1

# ── Attack ────────────────────────────────────────────────────────────────────
func _start_attack(heavy: bool) -> void:
	_weapon = Weapons.get_weapon(weapon_key)
	if _weapon.is_empty(): return

	_heavy_active = heavy
	weapon_hit    = false

	if heavy:
		attack_timer  = 18
		cooldown      = _weapon.get("cooldown", 30) + 30
		attack_endlag = _weapon.get("endlag", 8) + 12
		# Larger hitbox for heavy
		(_hitbox_col.shape as BoxShape3D).size = Vector3(1.4, 1.2, 1.2)
	else:
		attack_timer  = 10
		cooldown      = _weapon.get("cooldown", 30)
		attack_endlag = _weapon.get("endlag", 8)
		(_hitbox_col.shape as BoxShape3D).size = Vector3(1.1, 1.1, 1.0)

	_hitbox.monitoring = true

func _end_attack_window() -> void:
	_hitbox.monitoring = false
	weapon_hit = false

func _on_hitbox_body_entered(body: Node3D) -> void:
	if weapon_hit: return
	if body == self: return
	if not body.is_in_group("fighter"): return
	var target := body as Fighter
	if target == null: return

	_weapon = Weapons.get_weapon(weapon_key)
	if _weapon.is_empty(): return

	weapon_hit = true
	var base_dmg  : int   = _weapon.get("damage", 10)
	var base_kb   : float = float(_weapon.get("kb", 8))
	var dmg := int(base_dmg * (1.55 if _heavy_active else 0.75))
	var kb  := base_kb     * (1.70 if _heavy_active else 0.80)
	GameManager.deal_damage(self, target, dmg, kb)

# ── Take damage ───────────────────────────────────────────────────────────────
func take_damage(attacker: Fighter, dmg: int, kb_force: float) -> void:
	if invincible > 0 or health <= 0 or _dying: return

	if is_shielding:
		# Push back but no HP loss
		var push := (global_position - attacker.global_position)
		push.y = 0.0
		if push.length_squared() < 0.01: push = -attacker.global_transform.basis.z
		knockback = push.normalized() * 2.5 + Vector3(0, 0.5, 0)
		hurt_timer = 4
		return

	health = max(0, health - dmg)
	invincible = 20
	hurt_timer = 12
	stun_timer = max(stun_timer, int(kb_force * 0.40))

	# 3D knockback: away from attacker in XZ, with upward pop
	var kb_dir := (global_position - attacker.global_position)
	kb_dir.y = 0.0
	if kb_dir.length_squared() < 0.01:
		kb_dir = -attacker.global_transform.basis.z
	kb_dir = kb_dir.normalized()
	knockback = Vector3(kb_dir.x * kb_force * 0.14,
						kb_force * 0.07,
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
	_hitbox.monitoring = false
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
	attack_timer  = 0
	attack_endlag = 0
	cooldown      = 0
	knockback     = Vector3.ZERO
	velocity      = Vector3.ZERO
	is_shielding  = false
	position      = spawn_pos
	health_changed.emit(self)

# ── Visuals ───────────────────────────────────────────────────────────────────
func _update_visuals() -> void:
	var vis := not _dying
	_body_mesh.visible   = vis
	_weapon_mesh.visible = vis
	_label_3d.visible    = vis
	_shield_mesh.visible = false
	if not vis: return

	# Shield disc
	_shield_mesh.visible = is_shielding

	# Weapon swing animation
	if attack_timer > 0:
		var t := float(attack_timer) / (18.0 if _heavy_active else 10.0)
		_weapon_mesh.rotation.x = -t * (1.4 if _heavy_active else 0.9)
		_weapon_mesh.position.z = -0.25 - t * 0.35
	else:
		_weapon_mesh.rotation.x = 0.0
		_weapon_mesh.position.z = -0.25

	# Colour states
	if hurt_timer > 0 and hurt_timer % 4 < 2:
		_body_mat.albedo_color = Color.WHITE
	elif is_shielding:
		_body_mat.albedo_color = Color(0.5, 0.75, 1.0)
	elif invincible > 0 and invincible % 6 < 3:
		_body_mat.albedo_color = Color(fighter_color.r, fighter_color.g, fighter_color.b, 0.3)
	else:
		_body_mat.albedo_color = fighter_color

	_label_3d.text = "P%d  %s" % [player_num, "♥".repeat(max(0, lives))]
