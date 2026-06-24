export default function TrackCard({ track, isActive, onPlay, remainingTime }) {
	const formatTime = (ms) => {
		if (!ms || ms <= 0) return null
		const minutes = Math.floor(ms / 60000)
		const seconds = Math.floor((ms % 60000) / 1000)
		return `${minutes}:${seconds.toString().padStart(2, '0')}`
	}

	const timeDisplay = formatTime(remainingTime)

	return (
		<button
			onClick={() => onPlay(track)}
			className={`
				w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left cursor-pointer
				${isActive
					? 'bg-white/15 ring-1 ring-white/20'
					: 'bg-white/5 hover:bg-white/10'
				}
			`}
		>
			<img
				src={track.thumbnail}
				alt={track.title}
				className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
			/>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium text-white truncate">
					{track.title}
				</p>
				<p className="text-xs text-slate-400 truncate">{track.artist}</p>
			</div>
			{isActive && timeDisplay ? (
				<span className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 text-green-400">
					{timeDisplay}
				</span>
			) : (
				<span className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 bg-green-500/20 text-green-400">
					Spotify
				</span>
			)}
		</button>
	)
}
