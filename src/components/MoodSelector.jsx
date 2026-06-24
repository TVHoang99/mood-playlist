import { MOODS } from '../utils/moodConfig'
import { usePlaylist } from '../hooks/usePlaylist'
import { useMoodPlaylist } from '../hooks/useMoodPlaylist'

export default function MoodSelector() {
	const { state } = usePlaylist()
	const { fetchPlaylist } = useMoodPlaylist()

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
			{Object.entries(MOODS).map(([key, mood]) => (
				<button
					key={key}
					onClick={() => fetchPlaylist(key)}
					disabled={state.loading}
					className={`
						relative p-4 rounded-2xl border-2 transition-all duration-300
						${mood.bg} ${mood.border}
						${state.activeMood === key ? `ring-2 ${mood.ring} scale-105` : ''}
						${state.loading ? 'opacity-50 cursor-wait' : 'hover:scale-105 cursor-pointer'}
						flex flex-col items-center gap-2
					`}
				>
					<span className="text-3xl">{mood.icon}</span>
					<span className={`text-sm font-semibold ${mood.accent}`}>{mood.label}</span>
				</button>
			))}
		</div>
	)
}
