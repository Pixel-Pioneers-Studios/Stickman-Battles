extends Node3D
# Adventure.gd — GoW-style vertical slice: one explorable space, a third-person
# follow camera with lock-on, and a single AI enemy to fight.
# Goal of this slice: answer "does stickman combat feel good in 3D?"

var _player  : Fighter
var _enemies : Array = []            # Array[Fighter]
var _camera  : ThirdPersonCamera
var _lock_tgt: Fighter = null        # currently locked enemy (null = free-look)
var _flick_cd := 0.0                 # debounce between mouse-flick target switches
var _outcome  := ""                  # "" | "cleared" | "dead"

# HUD
var _p_hp     : ProgressBar
var _e_panel  : Control
var _e_hp     : ProgressBar
var _e_name   : Label
var _lock_lbl : Label
var _count_lbl: Label
var _center   : Label
var _hud_t    := 0.0

func _ready() -> void:
	_setup_input()
	GameManager.reset()
	GameManager.horde_mode = true      # single deaths don't end the fight
	_build_environment()
	_build_lighting()
	_build_ground()
	_build_landmarks()
	_spawn_actors()
	_build_camera()
	_build_hud()
	GameManager.start_round()
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _setup_input() -> void:
	_add_action("lock_on", KEY_TAB)
	_add_action("dodge",   KEY_SHIFT)

func _add_action(name: String, key: Key) -> void:
	if InputMap.has_action(name): return
	InputMap.add_action(name)
	var ev := InputEventKey.new()
	ev.physical_keycode = key
	InputMap.action_add_event(name, ev)

# ── World ─────────────────────────────────────────────────────────────────────
func _build_environment() -> void:
	var we  := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode  = Environment.BG_COLOR
	env.background_color = Color(0.05, 0.06, 0.12)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color  = Color(0.32, 0.32, 0.46)
	env.ambient_light_energy = 0.55
	env.fog_enabled     = true
	env.fog_light_color = Color(0.10, 0.12, 0.22)
	env.fog_density     = 0.012
	env.glow_enabled    = true
	env.glow_intensity  = 0.5
	we.environment = env
	add_child(we)

func _build_lighting() -> void:
	var sun := DirectionalLight3D.new()
	sun.light_energy     = 1.15
	sun.shadow_enabled   = true
	sun.rotation_degrees = Vector3(-52, 40, 0)
	add_child(sun)

	var rim := OmniLight3D.new()
	rim.position     = Vector3(0, 6, -12)
	rim.light_color  = Color(0.4, 0.55, 1.0)
	rim.light_energy = 1.2
	rim.omni_range   = 40.0
	add_child(rim)

func _build_ground() -> void:
	# Large flat walkable ground — no death pits; exploration shouldn't punish walking.
	_make_box(Vector3(0, -0.5, 0), Vector3(60, 1.0, 60), Color(0.16, 0.17, 0.22), true)
	# Faint grid lines for a sense of motion/scale
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.22, 0.24, 0.34)
	for i in range(-5, 6):
		var lx := MeshInstance3D.new()
		var bx := BoxMesh.new(); bx.size = Vector3(60, 0.02, 0.08); lx.mesh = bx
		lx.position = Vector3(0, 0.01, i * 5.0); lx.material_override = mat
		add_child(lx)
		var lz := MeshInstance3D.new()
		var bz := BoxMesh.new(); bz.size = Vector3(0.08, 0.02, 60); lz.mesh = bz
		lz.position = Vector3(i * 5.0, 0.01, 0); lz.material_override = mat
		add_child(lz)

func _build_landmarks() -> void:
	# A few structures for spatial reference and to fight around.
	var pillars := [
		Vector3(-12, 2.0, -8), Vector3(12, 2.0, -8),
		Vector3(-8, 2.0, 12),  Vector3(9, 2.0, 10),
	]
	for p in pillars:
		_make_pillar(p, 0.6, 4.0)
	# Raised dais near the centre-back as a landmark
	_make_box(Vector3(0, 0.4, -16), Vector3(8, 0.8, 8), Color(0.24, 0.22, 0.34), true)
	_make_emissive_ring(Vector3(0, 0.82, -16), 3.4, Color(0.6, 0.35, 1.0))

func _make_box(pos: Vector3, size: Vector3, color: Color, collide: bool) -> void:
	var body := StaticBody3D.new()
	body.position = pos
	body.collision_layer = 1 if collide else 0
	body.collision_mask  = 0
	var mesh := MeshInstance3D.new()
	var box  := BoxMesh.new(); box.size = size; mesh.mesh = box
	var mat  := StandardMaterial3D.new()
	mat.albedo_color = color; mat.roughness = 0.9; mat.metallic = 0.04
	mesh.material_override = mat
	body.add_child(mesh)
	if collide:
		var col := CollisionShape3D.new()
		var shp := BoxShape3D.new(); shp.size = size; col.shape = shp
		body.add_child(col)
	add_child(body)

func _make_pillar(pos: Vector3, radius: float, height: float) -> void:
	var body := StaticBody3D.new()
	body.position = pos
	body.collision_layer = 1
	body.collision_mask  = 0
	var mesh := MeshInstance3D.new()
	var cyl  := CylinderMesh.new()
	cyl.top_radius = radius; cyl.bottom_radius = radius; cyl.height = height
	mesh.mesh = cyl
	var mat := StandardMaterial3D.new(); mat.albedo_color = Color(0.20, 0.21, 0.30)
	mesh.material_override = mat
	body.add_child(mesh)
	var col := CollisionShape3D.new()
	var shp := CylinderShape3D.new(); shp.radius = radius; shp.height = height
	col.shape = shp
	body.add_child(col)
	add_child(body)

func _make_emissive_ring(pos: Vector3, radius: float, color: Color) -> void:
	var mesh := MeshInstance3D.new()
	var tor  := TorusMesh.new()
	tor.inner_radius = radius - 0.12; tor.outer_radius = radius
	mesh.mesh = tor
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.emission_enabled = true; mat.emission = color
	mat.emission_energy_multiplier = 2.0
	mesh.material_override = mat
	mesh.position = pos
	add_child(mesh)

# ── Actors ────────────────────────────────────────────────────────────────────
func _spawn_actors() -> void:
	_player = Fighter.new()
	add_child(_player)
	_player.setup(1, Color(0.35, 0.6, 1.0), "sword", Vector3(0, 0.8, 4), false, 5)
	_player._facing_yaw = PI     # face -Z toward the encounter
	_player.rotation.y  = PI
	GameManager.register_fighter(_player)

	# Two fast skirmishers + one slow, heavy brute to contrast.
	_spawn_enemy("sword",  Color(1.0, 0.5, 0.35), Vector3(-3.5, 0.8, -3.0), false)
	_spawn_enemy("sword",  Color(1.0, 0.6, 0.30), Vector3( 3.5, 0.8, -4.0), false)
	_spawn_enemy("hammer", Color(0.95, 0.35, 0.5), Vector3( 0.0, 0.8, -8.0), true)

func _spawn_enemy(weapon: String, color: Color, pos: Vector3, brute: bool) -> void:
	var e := Fighter.new()
	add_child(e)
	if brute:
		e.max_health = 260
	e.setup(_enemies.size() + 2, color, weapon, pos, true, 1)
	if brute:
		e.speed_scale = 0.55
		e.stun_scale  = 0.45
		if e._rig != null:
			e._rig.scale = Vector3.ONE * 1.45
		e._label_3d.position.y = 2.7
	GameManager.register_fighter(e)
	_enemies.append(e)

func _build_camera() -> void:
	_camera = ThirdPersonCamera.new()
	add_child(_camera)
	_camera.target = _player
	_camera.yaw    = _player._facing_yaw + PI   # start behind the player
	_camera.global_position = _player.global_position + Vector3(0, 2, 6)
	_player.control_camera = _camera

# ── HUD ───────────────────────────────────────────────────────────────────────
func _build_hud() -> void:
	var layer := CanvasLayer.new(); add_child(layer)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE   # never eat mouse-look events
	layer.add_child(root)

	# Player HP (bottom-left)
	var pbox := VBoxContainer.new()
	pbox.position = Vector2(24, 620)
	root.add_child(pbox)
	var pl := Label.new(); pl.text = "YOU"
	pl.add_theme_color_override("font_color", Color(0.5, 0.75, 1.0))
	pl.add_theme_font_size_override("font_size", 16)
	pbox.add_child(pl)
	_p_hp = _make_bar(Vector2(300, 22), Color(0.4, 0.7, 1.0), 150.0)
	pbox.add_child(_p_hp)

	# Enemy HP (top-centre, shown when locked or in combat)
	_e_panel = VBoxContainer.new()
	_e_panel.position = Vector2(440, 28)
	root.add_child(_e_panel)
	_e_name = Label.new(); _e_name.text = "ENEMY"
	_e_name.add_theme_color_override("font_color", Color(1.0, 0.55, 0.4))
	_e_name.add_theme_font_size_override("font_size", 16)
	_e_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_e_panel.add_child(_e_name)
	_e_hp = _make_bar(Vector2(400, 16), Color(1.0, 0.45, 0.30), 150.0)
	_e_panel.add_child(_e_hp)

	# Lock-on indicator
	_lock_lbl = Label.new(); _lock_lbl.text = ""
	_lock_lbl.add_theme_color_override("font_color", Color(1.0, 0.9, 0.4))
	_lock_lbl.add_theme_font_size_override("font_size", 15)
	_lock_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_lock_lbl.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_lock_lbl.position = Vector2(500, 78)
	root.add_child(_lock_lbl)

	# Enemies-remaining counter (top-right)
	_count_lbl = Label.new(); _count_lbl.text = ""
	_count_lbl.add_theme_color_override("font_color", Color(0.9, 0.7, 0.55))
	_count_lbl.add_theme_font_size_override("font_size", 16)
	_count_lbl.position = Vector2(1140, 28)
	root.add_child(_count_lbl)

	# Controls hint
	var hint := Label.new()
	hint.text = "WASD move   Mouse look   Shift dodge   Space jump   E light   Q heavy   F shield   R super   Tab lock-on   Esc free mouse"
	hint.add_theme_font_size_override("font_size", 13)
	hint.add_theme_color_override("font_color", Color(0.55, 0.55, 0.66))
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	hint.position.y = -20
	root.add_child(hint)

	_center = Label.new()
	_center.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_center.add_theme_font_size_override("font_size", 54)
	_center.add_theme_color_override("font_color", Color.WHITE)
	_center.add_theme_color_override("font_outline_color", Color.BLACK)
	_center.add_theme_constant_override("outline_size", 10)
	_center.position = Vector2(340, 280)
	_center.custom_minimum_size = Vector2(600, 100)
	_center.visible = false
	root.add_child(_center)

func _make_bar(size: Vector2, color: Color, max_val: float) -> ProgressBar:
	var bar := ProgressBar.new()
	bar.custom_minimum_size = size
	bar.max_value = max_val
	bar.value     = max_val
	bar.show_percentage = false
	var fill := StyleBoxFlat.new(); fill.bg_color = color; fill.set_corner_radius_all(3)
	bar.add_theme_stylebox_override("fill", fill)
	var bg := StyleBoxFlat.new(); bg.bg_color = Color(0.08, 0.08, 0.14, 0.85); bg.set_corner_radius_all(3)
	bar.add_theme_stylebox_override("background", bg)
	return bar

# ── Loop ──────────────────────────────────────────────────────────────────────
func _process(delta: float) -> void:
	_hud_t += delta
	if _flick_cd > 0.0: _flick_cd -= delta

	if Input.is_action_just_pressed("lock_on"):
		_toggle_lock()

	# Auto-reacquire if the locked target died — keep the pressure on
	if _lock_tgt != null and (not is_instance_valid(_lock_tgt) or _lock_tgt._dying or _lock_tgt.health <= 0):
		_set_lock(_acquire_target())

	if is_instance_valid(_player):
		_p_hp.value = _player.health

	var alive := _alive_enemies()
	# Enemy bar tracks the locked target, else the nearest alive enemy
	var show_e: Fighter = _lock_tgt
	if show_e == null and alive.size() > 0:
		show_e = alive[0]
		var nd := INF
		for e in alive:
			var d: float = _player.global_position.distance_to(e.global_position)
			if d < nd:
				nd = d; show_e = e
	if show_e != null:
		_e_panel.visible = true
		_e_hp.max_value = show_e.max_health
		_e_hp.value     = show_e.health
		_e_name.text = ("BRUTE" if show_e.speed_scale < 0.8 else "ENEMY") \
				+ ("  🔒" if show_e == _lock_tgt else "")
	else:
		_e_panel.visible = false

	_count_lbl.text = "Enemies: %d" % alive.size()
	_lock_lbl.text  = "🔒 LOCKED — flick mouse to switch" if _lock_tgt != null else ""

	# Win / lose
	if _outcome == "":
		if _player.lives <= 0:
			_outcome = "dead";    _show_center("YOU DIED")
		elif alive.size() == 0:
			_outcome = "cleared"; _show_center("AREA CLEARED")

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED \
				else Input.MOUSE_MODE_CAPTURED
	elif event is InputEventMouseButton and event.pressed and Input.mouse_mode == Input.MOUSE_MODE_VISIBLE:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

# Mouse-flick target switching (while locked, horizontal mouse is free — the
# camera drives its own yaw from the target, so we repurpose the flick).
func _input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and _lock_tgt != null \
			and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED \
			and _flick_cd <= 0.0 and absf(event.relative.x) > 26.0:
		_switch_lock(1 if event.relative.x > 0.0 else -1)
		_flick_cd = 0.25

# ── Lock-on ────────────────────────────────────────────────────────────────────
func _alive_enemies() -> Array:
	return _enemies.filter(func(e): return is_instance_valid(e) and not e._dying and e.health > 0)

# Acquire "what you're looking at": the enemy nearest the centre of view,
# lightly biased toward closer ones — not simply the nearest in the world.
func _acquire_target() -> Fighter:
	var cam_fwd := -_camera.global_transform.basis.z
	cam_fwd.y = 0.0
	if cam_fwd.length_squared() < 0.01: return null
	cam_fwd = cam_fwd.normalized()
	var best: Fighter = null
	var best_score := -INF
	for e in _alive_enemies():
		var to: Vector3 = e.global_position - _player.global_position
		to.y = 0.0
		var d: float = to.length()
		if d > 24.0: continue
		var align: float = cam_fwd.dot(to.normalized()) if d > 0.01 else 1.0
		var score: float = align - d * 0.02
		if score > best_score:
			best_score = score; best = e
	return best

func _toggle_lock() -> void:
	if _lock_tgt != null:
		_set_lock(null)
	else:
		_set_lock(_acquire_target())

func _set_lock(t: Fighter) -> void:
	_lock_tgt = t
	_camera.lock_target = t
	_player.lock_target = t

func _screen_x(f: Fighter) -> float:
	return _camera.unproject_position(f.global_position + Vector3(0, 1.0, 0)).x

# Switch lock to the next enemy in the flick direction (by on-screen x),
# wrapping to the far side if there's none that way.
func _switch_lock(dir: int) -> void:
	var alive := _alive_enemies()
	if alive.size() <= 1 or _lock_tgt == null: return
	var cur_x := _screen_x(_lock_tgt)
	var best: Fighter = null
	var best_dx := INF
	for e in alive:
		if e == _lock_tgt: continue
		var dx := _screen_x(e) - cur_x
		if dir > 0 and dx > 0.0 and dx < best_dx:
			best_dx = dx;  best = e
		elif dir < 0 and dx < 0.0 and -dx < best_dx:
			best_dx = -dx; best = e
	if best == null:
		# wrap: pick the extreme on the opposite side
		var ext := INF if dir > 0 else -INF
		for e in alive:
			if e == _lock_tgt: continue
			var ex := _screen_x(e)
			if (dir > 0 and ex < ext) or (dir < 0 and ex > ext):
				ext = ex; best = e
	if best != null:
		_set_lock(best)

func _show_center(text: String) -> void:
	_center.text = text
	_center.visible = true
