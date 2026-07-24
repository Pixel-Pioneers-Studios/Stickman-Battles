--!strict
--[[
	Signal
	------
	Minimal scriptable event. Roblox has BindableEvents but they marshal
	arguments (losing table identity) and cost instances; a pure-Luau signal is
	the idiomatic choice for internal, same-context messaging.
]]

local Signal = {}
Signal.__index = Signal

export type Connection = {
	Disconnect: (self: Connection) -> (),
	Connected: boolean,
}

type ConnectionInternal = {
	_signal: any,
	_fn: (...any) -> (),
	Connected: boolean,
	Disconnect: (self: any) -> (),
}

function Signal.new()
	return setmetatable({ _connections = {} :: { ConnectionInternal } }, Signal)
end

function Signal:Connect(fn: (...any) -> ()): Connection
	local connection: ConnectionInternal
	connection = {
		_signal = self,
		_fn = fn,
		Connected = true,
		Disconnect = function(conn)
			if not conn.Connected then
				return
			end
			conn.Connected = false
			local list = conn._signal._connections
			local index = table.find(list, conn)
			if index then
				table.remove(list, index)
			end
		end,
	}
	table.insert(self._connections, connection)
	return (connection :: any) :: Connection
end

function Signal:Fire(...: any)
	-- Snapshot so handlers may disconnect during dispatch safely.
	for _, connection in table.clone(self._connections) do
		if connection.Connected then
			task.spawn(connection._fn, ...)
		end
	end
end

function Signal:DisconnectAll()
	for _, connection in self._connections do
		connection.Connected = false
	end
	table.clear(self._connections)
end

return Signal
