import { useState } from 'react'
import { useSync } from '../hooks/useSync'

export default function RoomManager() {
	const { roomId, listeners, createNewRoom, joinExistingRoom, leaveCurrentRoom } = useSync()
	const [inputRoomId, setInputRoomId] = useState('')

	const handleCreate = () => {
		createNewRoom()
	}

	const handleJoin = () => {
		if (inputRoomId.trim()) {
			joinExistingRoom(inputRoomId.trim())
		}
	}

	const handleCopyRoomId = () => {
		navigator.clipboard.writeText(roomId)
	}

	if (roomId) {
		return (
			<div className="flex items-center gap-3">
				<div className="px-3 py-1.5 text-xs rounded-lg bg-purple-500/20 text-purple-400">
					🔗 Room: {roomId.slice(0, 8)}...
					<span className="ml-2 text-slate-400">({listeners} listening)</span>
				</div>
				<button
					onClick={handleCopyRoomId}
					className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
				>
					Copy Room ID
				</button>
				<button
					onClick={leaveCurrentRoom}
					className="px-3 py-1.5 text-xs rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
				>
					Leave
				</button>
			</div>
		)
	}

	return (
		<div className="flex items-center gap-2">
			<button
				onClick={handleCreate}
				className="px-3 py-1.5 text-xs rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors cursor-pointer"
			>
				🎵 Create Room
			</button>
			<div className="flex items-center gap-1">
				<input
					type="text"
					value={inputRoomId}
					onChange={(e) => setInputRoomId(e.target.value)}
					placeholder="Room ID"
					className="px-3 py-1.5 text-xs rounded-lg bg-white/10 text-white placeholder-slate-500 w-24"
				/>
				<button
					onClick={handleJoin}
					disabled={!inputRoomId.trim()}
					className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors cursor-pointer"
				>
					Join
				</button>
			</div>
		</div>
	)
}
