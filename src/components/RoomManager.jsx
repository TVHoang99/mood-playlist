import { useState } from 'react'
import { useSync } from '../hooks/useSync'

function ListenerAvatar({ userId, index }) {
	const colors = [
		'bg-purple-500',
		'bg-blue-500',
		'bg-green-500',
		'bg-yellow-500',
		'bg-pink-500',
		'bg-indigo-500',
		'bg-teal-500',
		'bg-orange-500',
	]
	const color = colors[index % colors.length]
	const initial = userId.slice(-2).toUpperCase()

	return (
		<div
			className={`w-6 h-6 rounded-full ${color} flex items-center justify-center text-[10px] font-bold text-white -ml-2 first:ml-0 border-2 border-slate-900`}
			title={userId}
		>
			{initial}
		</div>
	)
}

export default function RoomManager() {
	const { roomId, isHost, listeners, listenerIds, createNewRoom, joinExistingRoom, leaveCurrentRoom, currentTrack, playTrack } = useSync()
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

	const handleSyncWithHost = () => {
		if (currentTrack) {
			playTrack(currentTrack)
		}
	}

	if (roomId) {
		return (
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-purple-500/20 text-purple-400">
					<span>🔗 Room: {roomId.slice(0, 8)}...</span>
					<div className="flex items-center">
						{listenerIds.slice(0, 5).map((id, i) => (
							<ListenerAvatar key={id} userId={id} index={i} />
						))}
						{listenerIds.length > 5 && (
							<div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-[10px] font-bold text-white -ml-2 border-2 border-slate-900">
								+{listenerIds.length - 5}
							</div>
						)}
					</div>
					<span className="text-slate-400">({listeners})</span>
				</div>
				{!isHost && currentTrack && (
					<button
						onClick={handleSyncWithHost}
						className="px-3 py-1.5 text-xs rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors cursor-pointer"
					>
						🔄 Sync with Host
					</button>
				)}
				<button
					onClick={handleCopyRoomId}
					className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
				>
					Copy ID
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
