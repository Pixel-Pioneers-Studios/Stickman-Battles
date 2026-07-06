extends Camera3D
class_name ThirdPersonCamera

# Over-the-shoulder follow camera for the adventure mode.
# Free-look via mouse when unlocked; frames player + target when locked on.

var target      : Node3D = null   # the player we follow
var lock_target : Node3D = null   # enemy to frame when locked on

# Orbit state (radians)
var yaw   := 0.0
var pitch := -0.20

const MOUSE_SENS   := 0.005
const PITCH_MIN    := -1.10
const PITCH_MAX    := 0.55
const FOLLOW_DIST  := 5.2
const HEIGHT       := 1.9         # look-at height above target origin
const SHOULDER     := 0.6         # lateral offset (over-the-shoulder framing)
const SMOOTH       := 10.0        # position lerp responsiveness

func _ready() -> void:
	fov = 70.0

func get_yaw() -> float:
	return yaw

func _input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		# Only free-orbit when not locked on; lock-on drives yaw automatically.
		if lock_target == null:
			yaw   -= event.relative.x * MOUSE_SENS
			pitch = clampf(pitch - event.relative.y * MOUSE_SENS, PITCH_MIN, PITCH_MAX)
		else:
			pitch = clampf(pitch - event.relative.y * MOUSE_SENS, PITCH_MIN, PITCH_MAX)

func _process(delta: float) -> void:
	if target == null:
		return

	var focus := target.global_position + Vector3(0, HEIGHT, 0)

	# When locked on, orient yaw toward the enemy and pull the camera back a bit
	# so both combatants stay framed.
	var dist := FOLLOW_DIST
	if lock_target != null and is_instance_valid(lock_target):
		var to_enemy := lock_target.global_position - target.global_position
		to_enemy.y = 0.0
		if to_enemy.length_squared() > 0.01:
			# Camera sits behind the player relative to the enemy.
			yaw = atan2(-to_enemy.x, -to_enemy.z)
		var sep: float = target.global_position.distance_to(lock_target.global_position)
		dist = clampf(FOLLOW_DIST + sep * 0.25, FOLLOW_DIST, 9.0)
		focus = (target.global_position + lock_target.global_position) * 0.5 + Vector3(0, HEIGHT * 0.75, 0)

	# Spherical offset from focus
	var offset := Vector3(
		sin(yaw) * cos(pitch),
		-sin(pitch),
		cos(yaw) * cos(pitch)
	) * dist
	# Shoulder shift is perpendicular to view yaw (skip while locked for centering)
	if lock_target == null:
		offset += Vector3(cos(yaw), 0, -sin(yaw)) * SHOULDER

	var desired := focus + offset
	global_position = global_position.lerp(desired, 1.0 - exp(-delta * SMOOTH))
	look_at(focus)
