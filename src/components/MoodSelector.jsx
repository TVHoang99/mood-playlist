import { MOODS } from '../utils/moodConfig'
import { usePlaylist } from '../hooks/usePlaylist'
import { useMoodPlaylist } from '../hooks/useMoodPlaylist'

export default function MoodSelector() {
	const { state } = usePlaylist()
	const { fetchPlaylist } = useMoodPlaylist()

	return (
		<div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
			{Object.entries(MOODS).map(([key, mood]) => (
				<button
					key={key}
					onClick={() => fetchPlaylist(key)}
					disabled={state.loading}
					className={`
						relative p-6 rounded-2xl border-2 transition-all duration-300
						${mood.bg} ${mood.border}
						${state.activeMood === key ? `ring-2 ${mood.ring} scale-105` : ''}
						${state.loading ? 'opacity-50 cursor-wait' : 'hover:scale-105 cursor-pointer'}
						flex flex-col items-center gap-3
					`}
				>
					<span className="text-4xl">{mood.icon}</span>
					<span className={`text-lg font-semibold ${mood.accent}`}>{mood.label}</span>
				</button>
			))}
		</div>
	)
}
