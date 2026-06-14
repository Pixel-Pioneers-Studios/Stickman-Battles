class_name StickFigure
extends Node3D
# Procedural stick-figure rig — pure code, no imported assets.
# All poses are computed per physics frame in fighter-local space.
# Convention: local +Z is the fighter's facing direction (matches the
# movement yaw math in Fighter.gd, which uses atan2(move.x, move.z)).
#
# The weapon attaches to `weapon_socket` (right hand), oriented along the
# forearm — swing animation comes entirely from the arm pose, so per-weapon
# attack grammar later only needs new hand paths, not new weapon code.

# ── Proportions (collider capsule is 1.6 tall; rig matches) ───────────────────
const LIMB_R     := 0.05
const TORSO_R    := 0.065
const HEAD_R     := 0.16
const HIP_W      := 0.10
const SHOULDER_W := 0.22
const THIGH_L    := 0.42
const SHIN_L     := 0.42
const UARM_L     := 0.34
const FARM_L     := 0.34
const PELVIS_H   := 0.84   # standing hip height
const NECK_H     := 1.40

var weapon_socket : Node3D

var _mat   : StandardMaterial3D
var _head  : MeshInstance3D
var _segs  := {}   # name -> MeshInstance3D (unit-height cylinders, scaled each frame)
var _walk_phase := 0.0
var _idle_t     := 0.0

# ── Build ─────────────────────────────────────────────────────────────────────
func build(mat: StandardMaterial3D) -> void:
	_mat = mat
	for seg_name in ["torso", "hips", "shoulders",
			"l_thigh", "l_shin", "r_thigh", "r_shin",
			"l_uarm", "l_farm", "r_uarm", "r_farm"]:
		var m := MeshInstance3D.new()
		var cyl := CylinderMesh.new()
		cyl.height        = 1.0
		cyl.top_radius    = TORSO_R if seg_name == "torso" else LIMB_R
		cyl.bottom_radius = cyl.top_radius
		m.mesh = cyl
		m.material_override = _mat
		add_child(m)
		_segs[seg_name] = m

	_head = MeshInstance3D.new()
	var sph := SphereMesh.new()
	sph.radius = HEAD_R
	sph.height = HEAD_R * 2.0
	_head.mesh = sph
	_head.material_override = _mat
	add_child(_head)

	weapon_socket = Node3D.new()
	add_child(weapon_socket)

# ── Segment placement: unit cylinder stretched between two joints ─────────────
func _set_seg(seg_name: String, a: Vector3, b: Vector3) -> void:
	var seg: MeshInstance3D = _segs[seg_name]
	var d := b - a
	var l := d.length()
	if l < 0.001:
		seg.visible = false
		return
	seg.visible = true
	seg.transform = Transform3D(
		_basis_along(d / l) * Basis.from_scale(Vector3(1.0, l, 1.0)),
		(a + b) * 0.5)

# Basis whose local Y axis points along dir (unit)
func _basis_along(dir: Vector3) -> Basis:
	var dotv := Vector3.UP.dot(dir)
	if absf(dotv) > 0.9999:
		return Basis() if dotv > 0.0 else Basis(Vector3.RIGHT, PI)
	var axis := Vector3.UP.cross(dir).normalized()
	return Basis(axis, acos(clampf(dotv, -1.0, 1.0)))

# ── Two-bone analytic IK: returns the middle joint (knee / elbow) ─────────────
func _solve_ik(root: Vector3, target: Vector3, l1: float, l2: float,
		bend_hint: Vector3) -> Vector3:
	var d := target - root
	var dist := clampf(d.length(), 0.001, l1 + l2 - 0.001)
	var dir := d.normalized()
	# Law of cosines: along-axis offset of the joint, then perpendicular height
	var a := (l1 * l1 - l2 * l2 + dist * dist) / (2.0 * dist)
	var h := sqrt(maxf(l1 * l1 - a * a, 0.0))
	var perp := bend_hint - dir * bend_hint.dot(dir)
	if perp.length_squared() < 0.0001:
		perp = Vector3.FORWARD
	return root + dir * a + perp.normalized() * h

# ── Pose update (called from Fighter every physics frame) ─────────────────────
# p keys: speed (XZ m/s), on_floor, shielding, stunned, atk ("none"/"windup"/
# "active"), atk_t (0→1 phase progress), heavy
func update_pose(p: Dictionary, delta: float) -> void:
	var speed    : float = p.get("speed", 0.0)
	var on_floor : bool  = p.get("on_floor", true)
	var shielding: bool  = p.get("shielding", false)
	var stunned  : bool  = p.get("stunned", false)
	var atk      : String = p.get("atk", "none")
	var atk_t    : float = p.get("atk_t", 0.0)
	var heavy    : bool  = p.get("heavy", false)

	_idle_t += delta
	var amp := clampf(speed / 8.0, 0.0, 1.0)
	if not on_floor: amp = 0.0
	if amp > 0.05:
		_walk_phase += delta * speed * 1.9

	# ── Core line: pelvis → neck → head ───────────────────────────────────────
	var bob := sin(_walk_phase * 2.0) * 0.035 * amp + sin(_idle_t * 2.2) * 0.012
	var crouch := 0.0
	if shielding: crouch = 0.10
	if stunned:   crouch = 0.14
	# Forward lean: with run speed; back during windup, into the hit on active
	var lean := amp * 0.08
	match atk:
		"windup": lean -= 0.10 * atk_t * (1.5 if heavy else 1.0)
		"active": lean += lerpf(-0.10, 0.16, atk_t) * (1.5 if heavy else 1.0)
	if stunned: lean -= 0.12

	var pelvis := Vector3(0, PELVIS_H + bob - crouch, 0)
	var neck   := Vector3(lean * 0.3, NECK_H + bob - crouch * 1.25, lean)
	var head_c := neck + Vector3(lean * 0.2, HEAD_R + 0.05, lean * 0.45)

	_set_seg("torso", pelvis, neck)
	_head.position = head_c

	# ── Legs ──────────────────────────────────────────────────────────────────
	var hip_l := pelvis + Vector3(-HIP_W, -0.02, 0)
	var hip_r := pelvis + Vector3( HIP_W, -0.02, 0)
	_set_seg("hips", hip_l, hip_r)
	_pose_leg("l", hip_l, -1, amp, on_floor, shielding)
	_pose_leg("r", hip_r,  1, amp, on_floor, shielding)

	# ── Arms ──────────────────────────────────────────────────────────────────
	var sh_l := neck + Vector3(-SHOULDER_W, -0.05, 0)
	var sh_r := neck + Vector3( SHOULDER_W, -0.05, 0)
	_set_seg("shoulders", sh_l, sh_r)

	# Left arm: holds shield up when blocking, otherwise counterswings the walk
	var l_hand: Vector3
	if shielding:
		l_hand = Vector3(-0.06, 0.98, 0.42)
	elif stunned:
		l_hand = sh_l + Vector3(-0.10, -0.55, 0.08)
	else:
		l_hand = sh_l + Vector3(-0.05, -0.60, -sin(_walk_phase) * 0.22 * amp)
	var l_elbow := _solve_ik(sh_l, l_hand, UARM_L, FARM_L, Vector3(-0.7, 0.1, -0.7))
	_set_seg("l_uarm", sh_l, l_elbow)
	_set_seg("l_farm", l_elbow, l_hand)

	# Right arm: weapon arm, driven by the attack phase machine
	var r_hand := _weapon_hand(sh_r, atk, atk_t, heavy, amp, stunned)
	var r_elbow := _solve_ik(sh_r, r_hand, UARM_L, FARM_L, Vector3(0.85, 0.25, -0.35))
	_set_seg("r_uarm", sh_r, r_elbow)
	_set_seg("r_farm", r_elbow, r_hand)

	# Weapon socket: at the hand, Y axis continuing the forearm line
	var w_dir := (r_hand - r_elbow)
	if w_dir.length_squared() < 0.0001: w_dir = Vector3.UP
	weapon_socket.transform = Transform3D(_basis_along(w_dir.normalized()), r_hand)

func _pose_leg(side: String, hip: Vector3, sgn: float, amp: float,
		on_floor: bool, shielding: bool) -> void:
	var ph := _walk_phase + (PI if sgn > 0 else 0.0)
	var foot: Vector3
	if not on_floor:
		# Airborne tuck
		foot = hip + Vector3(0, -(THIGH_L + SHIN_L) * 0.62, 0.12 - sgn * 0.05)
	elif amp > 0.05:
		var fz := sin(ph) * 0.34 * amp
		var lift := maxf(0.0, sin(ph + PI * 0.5)) * 0.11 * amp
		foot = Vector3(sgn * HIP_W, 0.03 + lift, fz)
	else:
		# Idle stance; shielding staggers the feet into a guard stance
		var stance_z := (0.14 if sgn < 0 else -0.10) if shielding else sgn * 0.02
		foot = Vector3(sgn * (HIP_W + 0.02), 0.03, stance_z)
	var knee := _solve_ik(hip, foot, THIGH_L, SHIN_L, Vector3(sgn * 0.15, 0, 1.0))
	_set_seg(side + "_thigh", hip, knee)
	_set_seg(side + "_shin", knee, foot)

# Hand path for the weapon arm. Windup cocks back/up; active sweeps through
# to a forward strike point. Heavy raises overhead and lands lower/further.
func _weapon_hand(sh: Vector3, atk: String, t: float, heavy: bool,
		amp: float, stunned: bool) -> Vector3:
	var rest := sh + Vector3(0.06, -0.58, 0.10 + sin(_walk_phase) * 0.20 * amp)
	if stunned:
		return sh + Vector3(0.12, -0.55, -0.05)
	match atk:
		"windup":
			var cocked := sh + (Vector3(0.05, 0.46, -0.42) if heavy
					else Vector3(0.14, 0.30, -0.34))
			return rest.lerp(cocked, minf(t * 1.25, 1.0))
		"active":
			var cocked := sh + (Vector3(0.05, 0.46, -0.42) if heavy
					else Vector3(0.14, 0.30, -0.34))
			var strike := sh + (Vector3(0.02, -0.34, 0.62) if heavy
					else Vector3(0.12, -0.12, 0.58))
			# Ease-in: the swing accelerates through the arc
			var et := t * t
			var mid := sh + Vector3(0.10, 0.30, 0.25)   # arc apex, keeps it a sweep
			if et < 0.5:
				return cocked.lerp(mid, et * 2.0)
			return mid.lerp(strike, (et - 0.5) * 2.0)
		_:
			return rest
