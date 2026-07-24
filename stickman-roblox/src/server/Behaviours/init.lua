--!strict
--[[
	Behaviours (registry)
	---------------------
	Boss/complex-enemy attack selectors, keyed by id. EnemyService injects the
	matching `choose` into an enemy when its def names a `behaviourId`, keeping the
	Enemy class free of any behaviour require. Add a boss brain by dropping a
	ModuleScript here that returns `{ id = "X", choose = function(enemy, target, ctx) }`.

	`choose(enemy, target, ctx) -> attackDef?` returns one of `enemy.def.attacks`
	to start now, or nil to keep chasing. `ctx = { dist, now }`.
]]

local Behaviours = {}

for _, module in script:GetChildren() do
	if module:IsA("ModuleScript") then
		local behaviour = require(module)
		Behaviours[behaviour.id] = behaviour
	end
end

return Behaviours
