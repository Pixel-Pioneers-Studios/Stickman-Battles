--!strict
--[[
	Trove
	-----
	Small cleanup aggregator. Track connections, instances, threads and tables
	with a Clean method; destroy them all at once when a character/enemy/state
	tears down. Prevents the connection leaks that plague long-lived controllers.
]]

local Trove = {}
Trove.__index = Trove

function Trove.new()
	return setmetatable({ _objects = {} :: { any } }, Trove)
end

function Trove:Add<T>(object: T): T
	table.insert(self._objects, object)
	return object
end

local function cleanObject(object: any)
	local t = typeof(object)
	if t == "RBXScriptConnection" then
		object:Disconnect()
	elseif t == "Instance" then
		object:Destroy()
	elseif t == "thread" then
		task.cancel(object)
	elseif t == "function" then
		object()
	elseif t == "table" then
		if typeof(object.Destroy) == "function" then
			object:Destroy()
		elseif typeof(object.Disconnect) == "function" then
			object:Disconnect()
		end
	end
end

function Trove:Clean()
	for _, object in self._objects do
		cleanObject(object)
	end
	table.clear(self._objects)
end

-- Alias so a Trove is itself Trove:Add-able and Destroy-compatible.
Trove.Destroy = Trove.Clean

return Trove
