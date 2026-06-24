import { useState, useEffect, useRef, useCallback } from 'react'
import { usePlaylist } from '../hooks/usePlaylist'
import { isLoggedIn } from '../api/spotifyAuth'
import { shuffle } from '../utils/shuffle'
import { MOODS } from '../utils/moodConfig'
import TrackCard from './TrackCard'
import ShareButton from './ShareButton'
import PlayerModal from './PlayerModal'

export default function PlaylistView() {
	const { state, dispatch } = usePlaylist()
	const [saved, setSaved] = useState(false)
	const [activeTrack, setActiveTrack] = useState(null)
	const [playbackInfo, setPlaybackInfo] = useState({ position: 0, duration: 0, remaining: 0 })
	const savedTimerRef = useRef(null)

	useEffect(() => {
		return () => {
			if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
		}
	}, [])

	const handleTimeUpdate = useCallback((info) => {
		setPlaybackInfo(info)
	}, [])

	if (state.loading) {
		return (
			<div className="flex flex-col items-center justify-center py-20 gap-4">
				<div className="w-10 h-10 border-4 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
				<p className="text-slate-400">Finding your vibe...</p>
			</div>
		)
	}

	if (state.error) {
		return (
			<div className="text-center py-20">
				<p className="text-red-400 text-lg">{state.error}</p>
				{!isLoggedIn() && (
					<p className="text-slate-400 mt-2">Please login with Spotify to access music</p>
				)}
			</div>
		)
	}

	if (!state.tracks.length) return null

	const mood = MOODS[state.activeMood]

	const handleShuffle = () => {
		dispatch({ type: 'SHUFFLE_PLAYLIST', tracks: shuffle(state.tracks) })
	}

	const handleSave = () => {
		const playlist = {
			id: `pl_${Date.now()}`,
			mood: state.activeMood,
			name: `${mood?.label || 'Unknown'} Vibes - ${new Date().toLocaleDateString()}`,
			createdAt: new Date().toISOString(),
			tracks: state.tracks,
		}
		dispatch({ type: 'SAVE_PLAYLIST', playlist })
		setSaved(true)
		if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
		savedTimerRef.current = setTimeout(() => setSaved(false), 2000)
	}

	return (
		<div className="max-w-2xl mx-auto">
			<div className="flex items-center justify-between mb-4">
				<h2 className={`text-xl font-bold ${mood?.accent || 'text-white'}`}>
					{mood?.icon} {mood?.label} Playlist
				</h2>
				<div className="flex gap-2">
					<button
						onClick={handleShuffle}
						className="px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
					>
						🔀 Shuffle
					</button>
					<button
						onClick={handleSave}
						className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
							saved
								? 'bg-green-500/20 text-green-400'
								: 'bg-white/10 hover:bg-white/20'
						}`}
					>
						{saved ? '✓ Saved' : '💾 Save'}
					</button>
					<ShareButton playlist={{ mood: state.activeMood, tracks: state.tracks }} />
				</div>
			</div>
			<div className="space-y-2">
				{state.tracks.map((track, i) => (
					<TrackCard
						key={`${track.source}-${track.id}-${i}`}
						track={track}
						isActive={activeTrack?.id === track.id && activeTrack?.source === track.source}
						onPlay={setActiveTrack}
						remainingTime={activeTrack?.id === track.id ? playbackInfo.remaining : null}
					/>
				))}
			</div>

			<PlayerModal
				track={activeTrack}
				tracks={state.tracks}
				onClose={() => { setActiveTrack(null); setPlaybackInfo({ position: 0, duration: 0, remaining: 0 }) }}
				onPlay={setActiveTrack}
				onTimeUpdate={handleTimeUpdate}
			/>
		</div>
	)
}
