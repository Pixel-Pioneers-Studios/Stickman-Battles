extends Node3D

# ── HUD refs ──────────────────────────────────────────────────────────────────
var _p1_hp_bar    : ProgressBar
var _p1_lives_lbl : Label
var _center_lbl   : Label

var _fighters  : Array = []
var _camera    : Camera3D
var _cam_yaw   := 0.0
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

func _make_emissive_trim(pos: Vector3, size: Vector3, color: Color) -> void:
	var mesh := MeshInstance3D.new()
	var box  := BoxMesh.new()
	box.size = size
	mesh.mesh = box
	mesh.position = pos
	var mat := StandardMaterial3D.new()
	mat.albedo_color           = color
	mat.emission_enabled       = true
	mat.emission               = color
	mat.emission_energy_multiplier = 1.8
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

# ── Camera (third-person, follows P1 from behind) ─────────────────────────────
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

	# P1 panel
	var p1_box := VBoxContainer.new()
	p1_box.position = Vector2(16, 14)
	root.add_child(p1_box)

	var p1_name := Label.new()
	p1_name.text = "P1"
	p1_name.add_theme_color_override("font_color", Color(0.5, 0.75, 1.0))
	p1_name.add_theme_font_size_override("font_size", 16)
	p1_box.add_child(p1_name)

	_p1_hp_bar = _make_hp_bar(Color(0.35, 0.6, 1.0))
	p1_box.add_child(_p1_hp_bar)

	_p1_lives_lbl = Label.new()
	_p1_lives_lbl.text = "♥♥♥"
	_p1_lives_lbl.add_theme_color_override("font_color", Color(1.0, 0.25, 0.25))
	_p1_lives_lbl.add_theme_font_size_override("font_size", 22)
	p1_box.add_child(_p1_lives_lbl)

	# Controls hint
	var hint := Label.new()
	hint.text = "WASD: Move   Space: Jump   E: Light   Q: Heavy   F: Shield   R: Super"
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

func _make_hp_bar(color: Color) -> ProgressBar:
	var bar := ProgressBar.new()
	bar.custom_minimum_size = Vector2(260, 24)
	bar.max_value     = 150
	bar.value         = 150
	bar.show_percentage = false
	var fill := StyleBoxFlat.new()
	fill.bg_color = color
	fill.corner_radius_top_left     = 4
	fill.corner_radius_top_right    = 4
	fill.corner_radius_bottom_left  = 4
	fill.corner_radius_bottom_right = 4
	bar.add_theme_stylebox_override("fill", fill)
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0.08, 0.08, 0.14)
	bg.corner_radius_top_left     = 4
	bg.corner_radius_top_right    = 4
	bg.corner_radius_bottom_left  = 4
	bg.corner_radius_bottom_right = 4
	bar.add_theme_stylebox_override("background", bg)
	return bar

# ── Spawn fighters ────────────────────────────────────────────────────────────
func _spawn_fighters() -> void:
	var f1 := Fighter.new()
	add_child(f1)
	f1.setup(1, Color(0.35, 0.55, 1.0), "sword", Vector3(-4.0, 0.8, 0.0), false, 3)
	f1.health_changed.connect(_on_health_changed)
	f1.died.connect(_on_fighter_died)
	GameManager.register_fighter(f1)
	_fighters.append(f1)

	# Dummy P2 (AI off for now, just stands there as a target)
	var f2 := Fighter.new()
	add_child(f2)
	f2.setup(2, Color(1.0, 0.45, 0.20), "hammer", Vector3(4.0, 0.8, 0.0), false, 3)
	f2.health_changed.connect(_on_health_changed)
	f2.died.connect(_on_fighter_died)
	GameManager.register_fighter(f2)
	_fighters.append(f2)

# ── Per-frame ─────────────────────────────────────────────────────────────────
func _process(delta: float) -> void:
	_update_camera(delta)

	if _fighters.size() >= 1:
		_p1_hp_bar.value = (_fighters[0] as Fighter).health

	if _game_over and Input.is_key_pressed(KEY_R):
		GameManager.reset()
		get_tree().reload_current_scene()

func _update_camera(delta: float) -> void:
	if _fighters.is_empty() or _camera == null: return
	var p1 := _fighters[0] as Fighter
	if p1 == null or p1._dying: return

	# Smoothly swing camera behind P1 as they turn
	_cam_yaw = lerp_angle(_cam_yaw, p1.rotation.y, delta * 5.0)

	var dist   := 9.5
	var height := 5.0
	var offset := Vector3(sin(_cam_yaw) * dist, height, cos(_cam_yaw) * dist)
	var target := p1.global_position + Vector3(0, 1.1, 0)

	_camera.global_position = _camera.global_position.lerp(target + offset, delta * 7.0)
	_camera.look_at(target)

# ── HUD callbacks ─────────────────────────────────────────────────────────────
func _on_health_changed(fighter: Fighter) -> void:
	if fighter.player_num == 1:
		_p1_hp_bar.value  = fighter.health
		_p1_lives_lbl.text = "♥".repeat(max(0, fighter.lives))

func _on_fighter_died(fighter: Fighter) -> void:
	_on_health_changed(fighter)

func _on_match_won(winner_num: int) -> void:
	if _game_over: return
	_game_over = true
	if winner_num == 0:
		_show_center_text("DRAW!\nPress R to restart", true)
	else:
		_show_center_text("P%d WINS!\nPress R to restart" % winner_num, true)

func _show_center_text(text: String, persistent: bool) -> void:
	_center_lbl.text    = text
	_center_lbl.visible = true
	if not persistent:
		await get_tree().create_timer(1.5).timeout
		_center_lbl.visible = false
