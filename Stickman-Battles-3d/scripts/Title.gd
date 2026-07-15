extends Node3D
# Title.gd — home screen: a slow-orbit 3D diorama of the hero behind the menu.
# Pure code like the rest of the project; the .tscn only binds this script.

const ADVENTURE_SCENE := "res://scenes/Adventure.tscn"
const VERSUS_SCENE    := "res://scenes/Main.tscn"

var _hero    : StickFigure
var _cam     : Camera3D
var _orbit_t := 0.0

func _ready() -> void:
	GameManager.reset()          # clear fighter registry left by a previous scene
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_build_environment()
	_build_lighting()
	_build_stage()
	_build_hero()
	_build_camera()
	_build_ui()

# ── Diorama ───────────────────────────────────────────────────────────────────
func _build_environment() -> void:
	var we  := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode  = Environment.BG_COLOR
	env.background_color = Color(0.04, 0.05, 0.10)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color  = Color(0.30, 0.30, 0.44)
	env.ambient_light_energy = 0.55
	env.fog_enabled     = true
	env.fog_light_color = Color(0.09, 0.11, 0.20)
	env.fog_density     = 0.02
	env.glow_enabled    = true
	env.glow_intensity  = 0.6
	we.environment = env
	add_child(we)

func _build_lighting() -> void:
	var sun := DirectionalLight3D.new()
	sun.light_energy     = 1.0
	sun.shadow_enabled   = true
	sun.rotation_degrees = Vector3(-55, 35, 0)
	add_child(sun)

	var rim := OmniLight3D.new()
	rim.position     = Vector3(0, 4, -6)
	rim.light_color  = Color(0.55, 0.35, 1.0)
	rim.light_energy = 1.6
	rim.omni_range   = 24.0
	add_child(rim)

func _build_stage() -> void:
	# Circular dais under the hero — display-only, nothing here needs collision.
	var dais := MeshInstance3D.new()
	var cyl  := CylinderMesh.new()
	cyl.top_radius = 3.2; cyl.bottom_radius = 3.6; cyl.height = 0.5
	dais.mesh = cyl
	dais.position = Vector3(0, -0.25, 0)
	var dmat := StandardMaterial3D.new()
	dmat.albedo_color = Color(0.17, 0.17, 0.26); dmat.roughness = 0.85
	dais.material_override = dmat
	add_child(dais)

	var ring := MeshInstance3D.new()
	var tor  := TorusMesh.new()
	tor.inner_radius = 2.55; tor.outer_radius = 2.7
	ring.mesh = tor
	ring.position = Vector3(0, 0.03, 0)
	var rmat := StandardMaterial3D.new()
	rmat.albedo_color = Color(0.6, 0.35, 1.0)
	rmat.emission_enabled = true
	rmat.emission = Color(0.6, 0.35, 1.0)
	rmat.emission_energy_multiplier = 2.2
	ring.material_override = rmat
	add_child(ring)

	# Distant pillars so the orbit has parallax
	for i in range(6):
		var ang := TAU * i / 6.0 + 0.4
		var pil := MeshInstance3D.new()
		var pc  := CylinderMesh.new()
		pc.top_radius = 0.5; pc.bottom_radius = 0.5; pc.height = 5.0
		pil.mesh = pc
		pil.position = Vector3(sin(ang) * 11.0, 2.0, cos(ang) * 11.0)
		var pmat := StandardMaterial3D.new()
		pmat.albedo_color = Color(0.14, 0.15, 0.23)
		pil.material_override = pmat
		add_child(pil)

func _build_hero() -> void:
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.35, 0.6, 1.0)
	_hero = StickFigure.new()
	add_child(_hero)
	_hero.build(mat)

	# Sword in hand, mirroring Fighter's weapon mounting
	var w: Dictionary = Weapons.get_weapon("sword")
	var wm  := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = w.get("mesh_size", Vector3(0.10, 1.05, 0.10))
	wm.mesh = box
	var wmat := StandardMaterial3D.new()
	wmat.albedo_color = w.get("color", Color(0.8, 0.8, 0.8))
	wm.material_override = wmat
	wm.position = Vector3(0, box.size.y * 0.30, 0)
	_hero.weapon_socket.add_child(wm)

func _build_camera() -> void:
	_cam = Camera3D.new()
	_cam.fov = 55.0
	_cam.h_offset = -1.1   # hero sits right of centre; menu owns the left
	add_child(_cam)
	_cam.current = true

func _process(delta: float) -> void:
	_hero.update_pose({"speed": 0.0, "on_floor": true}, delta)
	_orbit_t += delta * 0.18
	_cam.global_position = Vector3(sin(_orbit_t) * 5.6, 2.0, cos(_orbit_t) * 5.6)
	_cam.look_at(Vector3(0, 1.05, 0))

# ── Menu UI ───────────────────────────────────────────────────────────────────
func _build_ui() -> void:
	var layer := CanvasLayer.new(); add_child(layer)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE   # buttons still receive input
	layer.add_child(root)

	var title := Label.new()
	title.text = "STICKMAN EVOLUTION"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 58)
	title.add_theme_color_override("font_color", Color.WHITE)
	title.add_theme_color_override("font_outline_color", Color(0.25, 0.1, 0.5))
	title.add_theme_constant_override("outline_size", 12)
	title.set_anchors_preset(Control.PRESET_TOP_WIDE)
	title.position.y = 96
	root.add_child(title)

	var sub := Label.new()
	sub.text = "—  3 D  —"
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub.add_theme_font_size_override("font_size", 22)
	sub.add_theme_color_override("font_color", Color(0.7, 0.5, 1.0))
	sub.set_anchors_preset(Control.PRESET_TOP_WIDE)
	sub.position.y = 168
	root.add_child(sub)

	var menu := VBoxContainer.new()
	menu.add_theme_constant_override("separation", 14)
	menu.set_anchors_preset(Control.PRESET_CENTER)
	menu.position = Vector2(-450, -10)   # left column, clear of the hero
	root.add_child(menu)

	var adv := _make_btn("ADVENTURE")
	adv.pressed.connect(func() -> void: _go(ADVENTURE_SCENE))
	menu.add_child(adv)

	var vs := _make_btn("VERSUS  (LOCAL PROTOTYPE)")
	vs.pressed.connect(func() -> void: _go(VERSUS_SCENE))
	menu.add_child(vs)

	var quit := _make_btn("QUIT")
	quit.pressed.connect(func() -> void: get_tree().quit())
	menu.add_child(quit)

	adv.grab_focus()   # arrow keys / Enter navigate from here

	var foot := Label.new()
	foot.text = "vertical slice — W A S D move · mouse look · Tab lock-on · Shift dodge"
	foot.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	foot.add_theme_font_size_override("font_size", 13)
	foot.add_theme_color_override("font_color", Color(0.5, 0.5, 0.62))
	foot.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	foot.position.y = -30
	root.add_child(foot)

func _make_btn(label_text: String) -> Button:
	var b := Button.new()
	b.text = label_text
	b.custom_minimum_size = Vector2(300, 48)
	b.add_theme_font_size_override("font_size", 20)
	b.add_theme_color_override("font_color", Color(0.85, 0.87, 1.0))
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.10, 0.11, 0.20, 0.92)
	sb.set_corner_radius_all(6)
	b.add_theme_stylebox_override("normal", sb)
	var sbh := StyleBoxFlat.new()
	sbh.bg_color = Color(0.19, 0.21, 0.38, 0.95)
	sbh.set_corner_radius_all(6)
	b.add_theme_stylebox_override("hover", sbh)
	var sbf := StyleBoxFlat.new()
	sbf.bg_color = Color(0.16, 0.14, 0.32, 0.95)
	sbf.set_corner_radius_all(6)
	sbf.border_color = Color(0.65, 0.45, 1.0)
	sbf.set_border_width_all(2)
	b.add_theme_stylebox_override("focus", sbf)
	var sbp := StyleBoxFlat.new()
	sbp.bg_color = Color(0.28, 0.22, 0.50, 0.95)
	sbp.set_corner_radius_all(6)
	b.add_theme_stylebox_override("pressed", sbp)
	return b

func _go(scene_path: String) -> void:
	get_tree().change_scene_to_file(scene_path)
