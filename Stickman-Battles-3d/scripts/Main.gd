extends Node3D

# ── HUD refs ──────────────────────────────────────────────────────────────────
var _panels     := {}   # player_num -> { name, hp, super, cd, lives, status }
var _center_lbl : Label
var _hud_t      := 0.0

var _fighters  : Array = []
var _camera    : Camera3D
var _game_over := false

# ─────────────────────────────────────────────────────────────────────────────
func _ready() -> void:
	GameManager.reset()
	_build_environment()
	_build_lighting()
	_build_arena()
	_build_camera()
	_build_hud()
	_spawn_fighters()
	GameManager.match_won.connect(_on_match_won)
	GameManager.parried.connect(_on_parried)
	GameManager.start_round()
	_show_center_text("FIGHT!", false)

# ── Environment ───────────────────────────────────────────────────────────────
func _build_environment() -> void:
	var we  := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode  = Environment.BG_COLOR
	env.background_color = Color(0.04, 0.04, 0.10)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color  = Color(0.30, 0.30, 0.45)
	env.ambient_light_energy = 0.60
	# Subtle glow
	env.glow_enabled        = true
	env.glow_intensity      = 0.55
	env.glow_bloom          = 0.12
	we.environment = env
	add_child(we)

# ── Lighting ──────────────────────────────────────────────────────────────────
func _build_lighting() -> void:
	var sun := DirectionalLight3D.new()
	sun.light_energy   = 1.2
	sun.shadow_enabled = true
	sun.rotation_degrees = Vector3(-50, 30, 0)
	add_child(sun)

	# Warm fill light from below-left
	var fill := OmniLight3D.new()
	fill.position      = Vector3(-6.0, 1.0, -6.0)
	fill.light_color   = Color(1.0, 0.6, 0.3)
	fill.light_energy  = 1.4
	fill.omni_range    = 18.0
	add_child(fill)

	# Cool rim light opposite side
	var rim := OmniLight3D.new()
	rim.position     = Vector3(6.0, 3.0, 6.0)
	rim.light_color  = Color(0.3, 0.5, 1.0)
	rim.light_energy = 1.0
	rim.omni_range   = 18.0
	add_child(rim)

# ── Arena: The Crucible ───────────────────────────────────────────────────────
# Large central stone floor with 4 raised corner platforms, a centre elevated
# platform, 4 pillars, and glowing edge trim. Fall off any side = death.
func _build_arena() -> void:
	# ── Main floor ────────────────────────────────────────────────────────────
	_make_platform(
		Vector3(0, 0, 0), Vector3(22.0, 0.50, 22.0),
		Color(0.18, 0.18, 0.25), false)

	# Darker inset cross pattern (purely visual, no collision)
	_make_deco_box(Vector3(0, 0.26, 0),   Vector3(22.0, 0.02, 2.0),  Color(0.12, 0.12, 0.20))
	_make_deco_box(Vector3(0, 0.26, 0),   Vector3(2.0,  0.02, 22.0), Color(0.12, 0.12, 0.20))

	# ── Corner raised platforms ───────────────────────────────────────────────
	var corners := [
		Vector3(-7.0, 2.0, -7.0),
		Vector3( 7.0, 2.0, -7.0),
		Vector3(-7.0, 2.0,  7.0),
		Vector3( 7.0, 2.0,  7.0),
	]
	for c in corners:
		_make_platform(c, Vector3(5.0, 0.40, 5.0), Color(0.22, 0.22, 0.32), false)
		# Glowing edge trim on each corner platform
		_make_emissive_trim(c + Vector3(0, 0.22, 0), Vector3(5.0, 0.06, 5.0), Color(0.3, 0.5, 1.0))

	# ── Centre elevated platform ──────────────────────────────────────────────
	_make_platform(Vector3(0, 3.5, 0), Vector3(5.5, 0.40, 5.5), Color(0.25, 0.22, 0.38), false)
	_make_emissive_trim(Vector3(0, 3.72, 0), Vector3(5.5, 0.06, 5.5), Color(0.7, 0.3, 1.0))

	# Pillars supporting the centre platform
	var pillar_pos := [
		Vector3(-1.8, 1.75, -1.8), Vector3( 1.8, 1.75, -1.8),
		Vector3(-1.8, 1.75,  1.8), Vector3( 1.8, 1.75,  1.8),
	]
	for pp in pillar_pos:
		_make_pillar(pp, 0.28, 3.5)

	# ── 4 decorative outer pillars ────────────────────────────────────────────
	var outer_pillars := [
		Vector3(-9.5, 1.5, 0), Vector3(9.5, 1.5, 0),
		Vector3(0, 1.5, -9.5), Vector3(0, 1.5,  9.5),
	]
	for op in outer_pillars:
		_make_pillar(op, 0.45, 3.0)

	# ── Glowing floor edge trim ───────────────────────────────────────────────
	_make_emissive_trim(Vector3(0, 0.26, 0),  Vector3(22.0, 0.04, 22.0), Color(0.2, 0.3, 0.8))

# ── Platform factory ──────────────────────────────────────────────────────────
func _make_platform(pos: Vector3, size: Vector3, color: Color, _unused: bool) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.position        = pos
	body.collision_layer = 1
	body.collision_mask  = 0

	var mesh := MeshInstance3D.new()
	var box  := BoxMesh.new()
	box.size = size
	mesh.mesh = box
	var mat  := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness    = 0.90
	mat.metallic     = 0.05
	mesh.material_override = mat
	body.add_child(mesh)

	var col   := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	col.shape  = shape
	body.add_child(col)

	add_child(body)
	return body

func _make_pillar(pos: Vector3, radius: float, height: float) -> void:
	var body := StaticBody3D.new()
	body.position        = pos
	body.collision_layer = 1
	body.collision_mask  = 0

	var mesh := MeshInstance3D.new()
	var cyl  := CylinderMesh.new()
	cyl.top_radius    = radius
	cyl.bottom_radius = radius
	cyl.height        = height
	mesh.mesh = cyl
	var mat  := StandardMaterial3D.new()
	mat.albedo_color = Color(0.20, 0.20, 0.30)
	mat.roughness    = 0.80
	mesh.material_override = mat
	body.add_child(mesh)

	var col   := CollisionShape3D.new()
	var shape := CylinderShape3D.new()
	shape.radius = radius
	shape.height = height
	col.shape = shape
	body.add_child(col)

	add_child(body)

# Hollow glowing frame around a platform's perimeter — NOT a solid sheet
# (a full-size emissive box would cover the whole platform surface).
func _make_emissive_trim(pos: Vector3, size: Vector3, color: Color) -> void:
	var t := 0.18   # strip thickness
	var strips := [
		# Front / back edges (run along X)
		[Vector3(pos.x, pos.y, pos.z - size.z * 0.5 + t * 0.5), Vector3(size.x, size.y, t)],
		[Vector3(pos.x, pos.y, pos.z + size.z * 0.5 - t * 0.5), Vector3(size.x, size.y, t)],
		# Left / right edges (run along Z, shortened to not overlap corners)
		[Vector3(pos.x - size.x * 0.5 + t * 0.5, pos.y, pos.z), Vector3(t, size.y, size.z - 2.0 * t)],
		[Vector3(pos.x + size.x * 0.5 - t * 0.5, pos.y, pos.z), Vector3(t, size.y, size.z - 2.0 * t)],
	]
	var mat := StandardMaterial3D.new()
	mat.albedo_color           = color
	mat.emission_enabled       = true
	mat.emission               = color
	mat.emission_energy_multiplier = 1.8
	for s in strips:
		var mesh := MeshInstance3D.new()
		var box  := BoxMesh.new()
		box.size  = s[1]
		mesh.mesh = box
		mesh.position = s[0]
		mesh.material_override = mat
		add_child(mesh)

func _make_deco_box(pos: Vector3, size: Vector3, color: Color) -> void:
	var mesh := MeshInstance3D.new()
	var box  := BoxMesh.new()
	box.size  = size
	mesh.mesh = box
	mesh.position = pos
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mesh.material_override = mat
	add_child(mesh)

# ── Camera (fighting-game framing cam: keeps both fighters in view) ───────────
func _build_camera() -> void:
	_camera = Camera3D.new()
	_camera.fov = 68.0
	add_child(_camera)

# ── HUD ───────────────────────────────────────────────────────────────────────
func _build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)

	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	layer.add_child(root)

	_build_player_panel(root, 1, Color(0.5, 0.75, 1.0), Vector2(16, 14))
	_build_player_panel(root, 2, Color(1.0, 0.6, 0.35), Vector2(1280 - 296, 14))

	# Controls hint
	var hint := Label.new()
	hint.text = "P1 — WASD move  Space jump  E light  Q heavy  F shield  R super      " \
			+ "P2 — Arrows move  Shift jump  , light  . heavy  / shield  N super"
	hint.add_theme_font_size_override("font_size", 13)
	hint.add_theme_color_override("font_color", Color(0.55, 0.55, 0.65))
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	hint.position.y = -22
	root.add_child(hint)

	# Centre label
	_center_lbl = Label.new()
	_center_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_center_lbl.add_theme_font_size_override("font_size", 58)
	_center_lbl.add_theme_color_override("font_color", Color.WHITE)
	_center_lbl.add_theme_color_override("font_outline_color", Color.BLACK)
	_center_lbl.add_theme_constant_override("outline_size", 10)
	_center_lbl.position = Vector2(340, 270)
	_center_lbl.custom_minimum_size = Vector2(600, 100)
	_center_lbl.visible = false
	root.add_child(_center_lbl)

func _build_player_panel(root: Control, p_num: int, color: Color, pos: Vector2) -> void:
	var box := VBoxContainer.new()
	box.position = pos
	box.add_theme_constant_override("separation", 3)
	root.add_child(box)

	var name_lbl := Label.new()
	name_lbl.text = "P%d" % p_num
	name_lbl.add_theme_color_override("font_color", color)
	name_lbl.add_theme_font_size_override("font_size", 16)
	box.add_child(name_lbl)

	var hp := _make_bar(Vector2(280, 22), color, 150.0)

	# Damage ghost behind the HP fill would need layering — keep flat for now
	box.add_child(hp)

	# Super meter: gold, fills 0-100, pulses when ready
	var sup := _make_bar(Vector2(280, 10), Color(1.0, 0.84, 0.2), 100.0)
	sup.value = 0
	box.add_child(sup)

	# Attack cooldown recovery: full = ready to swing
	var cd := _make_bar(Vector2(280, 5), Color(0.75, 0.78, 0.85), 1.0)
	box.add_child(cd)

	var lives_lbl := Label.new()
	lives_lbl.text = "♥♥♥"
	lives_lbl.add_theme_color_override("font_color", Color(1.0, 0.25, 0.25))
	lives_lbl.add_theme_font_size_override("font_size", 22)
	box.add_child(lives_lbl)

	# Transient state line: STUNNED / EXPOSED! / SHIELD DOWN / SUPER READY ★
	var status := Label.new()
	status.text = ""
	status.add_theme_color_override("font_color", Color(1.0, 0.9, 0.3))
	status.add_theme_font_size_override("font_size", 15)
	box.add_child(status)

	_panels[p_num] = {
		"name": name_lbl, "hp": hp, "super": sup, "cd": cd,
		"lives": lives_lbl, "status": status,
	}

func _make_bar(size: Vector2, color: Color, max_val: float) -> ProgressBar:
	var bar := ProgressBar.new()
	bar.custom_minimum_size = size
	bar.max_value     = max_val
	bar.value         = max_val
	bar.show_percentage = false
	var fill := StyleBoxFlat.new()
	fill.bg_color = color
	fill.set_corner_radius_all(3)
	bar.add_theme_stylebox_override("fill", fill)
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0.08, 0.08, 0.14, 0.85)
	bg.set_corner_radius_all(3)
	bar.add_theme_stylebox_override("background", bg)
	return bar

# Per-frame HUD refresh from fighter state
func _update_hud() -> void:
	for f in _fighters:
		var fighter := f as Fighter
		if fighter == null or not _panels.has(fighter.player_num): continue
		var pn: Dictionary = _panels[fighter.player_num]

		pn.name.text = "P%d — %s" % [fighter.player_num,
				Weapons.get_weapon(fighter.weapon_key).get("name", "?")]
		pn.hp.value    = fighter.health
		pn.super.value = fighter.super_meter
		# Pulse the super bar while ready
		pn.super.modulate.a = (0.55 + 0.45 * absf(sin(_hud_t * 7.0))) \
				if fighter.super_ready else 1.0
		pn.cd.value = 1.0 if fighter.cooldown <= 0 \
				else 1.0 - float(fighter.cooldown) / float(fighter.cooldown_max)
		pn.lives.text = "♥".repeat(max(0, fighter.lives))

		if fighter.stun_timer > 0:
			pn.status.text = "STUNNED"
			pn.status.add_theme_color_override("font_color", Color(1.0, 0.8, 0.2))
		elif fighter.parry_vuln_frames > 0:
			pn.status.text = "EXPOSED!"
			pn.status.add_theme_color_override("font_color", Color(1.0, 0.45, 0.1))
		elif fighter.shield_broken:
			pn.status.text = "SHIELD DOWN"
			pn.status.add_theme_color_override("font_color", Color(0.5, 0.75, 1.0))
		elif fighter.super_ready:
			pn.status.text = "SUPER READY ★"
			pn.status.add_theme_color_override("font_color", Color(1.0, 0.84, 0.2))
		else:
			pn.status.text = ""

# ── Spawn fighters ────────────────────────────────────────────────────────────
func _spawn_fighters() -> void:
	var f1 := Fighter.new()
	add_child(f1)
	f1.setup(1, Color(0.35, 0.55, 1.0), "sword", Vector3(-4.0, 0.8, 0.0), false, 3)
	GameManager.register_fighter(f1)
	_fighters.append(f1)

	# P2 — second local human (arrows + right-side keys)
	var f2 := Fighter.new()
	add_child(f2)
	f2.setup(2, Color(1.0, 0.45, 0.20), "hammer", Vector3(4.0, 0.8, 0.0), false, 3)
	GameManager.register_fighter(f2)
	_fighters.append(f2)

# ── Per-frame ─────────────────────────────────────────────────────────────────
func _process(delta: float) -> void:
	_hud_t += delta
	_update_camera(delta)
	_update_hud()

	if _game_over and Input.is_key_pressed(KEY_T):
		GameManager.reset()
		get_tree().reload_current_scene()

	if Input.is_key_pressed(KEY_ESCAPE):
		GameManager.reset()
		get_tree().change_scene_to_file("res://scenes/Title.tscn")

# Framing camera: hovers at a fixed yaw over the midpoint of both fighters,
# pulling back as they separate so neither leaves the frame.
func _update_camera(delta: float) -> void:
	if _fighters.size() < 2 or _camera == null: return
	var a := _fighters[0] as Fighter
	var b := _fighters[1] as Fighter
	if a == null or b == null: return

	# A dead-and-respawning fighter sits at y=-40; frame the survivor alone
	var pa := a.global_position
	var pb := b.global_position
	if a._dying: pa = pb
	if b._dying: pb = pa

	var mid := (pa + pb) * 0.5 + Vector3(0, 1.2, 0)
	var sep := pa.distance_to(pb)
	var dist := clampf(sep * 0.85 + 5.0, 9.0, 20.0)
	var cam_pos := mid + Vector3(0, dist * 0.42, dist)

	_camera.global_position = _camera.global_position.lerp(cam_pos, 1.0 - exp(-delta * 6.0))
	_camera.look_at(mid)

# ── HUD callbacks ─────────────────────────────────────────────────────────────
func _on_parried(defender: Node, _attacker: Node) -> void:
	_show_center_text("P%d PARRY!" % defender.player_num, false)

func _on_match_won(winner_num: int) -> void:
	if _game_over: return
	_game_over = true
	if winner_num == 0:
		_show_center_text("DRAW!\nT — rematch   Esc — title", true)
	else:
		_show_center_text("P%d WINS!\nT — rematch   Esc — title" % winner_num, true)

func _show_center_text(text: String, persistent: bool) -> void:
	_center_lbl.text    = text
	_center_lbl.visible = true
	if not persistent:
		await get_tree().create_timer(1.5).timeout
		_center_lbl.visible = false
