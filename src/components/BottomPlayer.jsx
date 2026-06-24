import { useEffect, useRef, useState, useCallback } from 'react'
import { useSync } from '../hooks/useSync'

export default function BottomPlayer({ track, tracks, onPlay, onTimeUpdate }) {
	const { roomId, isHost, currentTrack, playTrack: syncTrack } = useSync()
	const lastSyncedId = useRef(null)
	const prevTrackId = useRef(null)
	const nextingRef = useRef(false)
	const timerRef = useRef(null)
	const [pos, setPos] = useState(0)
	const dur = track?.duration || 180000

	const trackRef = useRef(track)
	const tracksRef = useRef(tracks)
	const onPlayRef = useRef(onPlay)
	const onTimeUpdateRef = useRef(onTimeUpdate)

	useEffect(() => {
		trackRef.current = track
		tracksRef.current = tracks
		onPlayRef.current = onPlay
		onTimeUpdateRef.current = onTimeUpdate
	})

	const goToNextTrack = useCallback(() => {
		if (nextingRef.current) return
		nextingRef.current = true
		const t = trackRef.current
		const ts = tracksRef.current
		if (!t || !ts.length) return
		const currentIndex = ts.findIndex((x) => x.id === t.id && x.source === t.source)
		const nextIndex = currentIndex < ts.length - 1 ? currentIndex + 1 : 0
		onPlayRef.current(ts[nextIndex])
	}, [])

	useEffect(() => {
		if (timerRef.current) clearInterval(timerRef.current)

		if (!track) return

		if (prevTrackId.current !== track.id) {
			prevTrackId.current = track.id
			nextingRef.current = false
		}

		let position = 0

		timerRef.current = setInterval(() => {
			position += 250
			if (position >= dur) {
				clearInterval(timerRef.current)
				goToNextTrack()
				return
			}
			setPos(position)
			if (onTimeUpdateRef.current) {
				onTimeUpdateRef.current({
					position,
					duration: dur,
					remaining: dur - position,
				})
			}
		}, 250)

		return () => {
			if (timerRef.current) clearInterval(timerRef.current)
		}
	}, [track, dur, goToNextTrack])

	useEffect(() => {
		if (!track || !roomId) return
		if (lastSyncedId.current === track.id) return
		lastSyncedId.current = track.id
		syncTrack(track)
	}, [track, roomId, syncTrack])

	useEffect(() => {
		if (!roomId || !currentTrack || isHost) return
		if (lastSyncedId.current === currentTrack.id) return
		const exists = tracks.find((t) => t.id === currentTrack.id && t.source === currentTrack.source)
		if (exists && (!track || track.id !== currentTrack.id)) {
			lastSyncedId.current = currentTrack.id
			onPlay(currentTrack)
		}
	}, [currentTrack, roomId, isHost, tracks, track, onPlay])

	if (!track) return null

	const formatTime = (ms) => {
		if (!ms || ms <= 0) return '0:00'
		const minutes = Math.floor(ms / 60000)
		const seconds = Math.floor((ms % 60000) / 1000)
		return `${minutes}:${seconds.toString().padStart(2, '0')}`
	}

	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-slate-950 via-slate-950/98 to-transparent">
			<div className="max-w-4xl mx-auto px-4 pt-4 pb-2">
				<div className="bg-slate-900 rounded-xl shadow-2xl p-3">
					<div className="flex items-center gap-3">
						<img
							src={track.thumbnail}
							alt={track.title}
							className="w-12 h-12 rounded-lg object-cover"
						/>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium text-white truncate">{track.title}</p>
							<p className="text-xs text-slate-400 truncate">{track.artist}</p>
						</div>
					</div>
					<div className="mt-2 flex items-center gap-2">
						<span className="text-[10px] text-slate-500 w-10 text-right">{formatTime(pos)}</span>
						<div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
							<div
								className="h-full bg-green-500 rounded-full transition-none"
								style={{ width: dur > 0 ? `${(pos / dur) * 100}%` : '0%' }}
							/>
						</div>
						<span className="text-[10px] text-slate-500 w-10">-{formatTime(dur - pos)}</span>
					</div>
				</div>
			</div>
		</div>
	)
}
