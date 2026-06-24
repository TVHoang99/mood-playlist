import { useEffect, useRef, useCallback, useState } from 'react'
import { useSync } from '../hooks/useSync'

export default function BottomPlayer({ track, tracks, onPlay }) {
	const { roomId, isHost, currentTrack, playTrack: syncTrack } = useSync()
	const [iframeKey, setIframeKey] = useState(0)
	const lastSyncedId = useRef(null)
	const prevTrackId = useRef(null)
	const nextingRef = useRef(false)

	const trackRef = useRef(track)
	const tracksRef = useRef(tracks)
	const onPlayRef = useRef(onPlay)

	useEffect(() => {
		trackRef.current = track
		tracksRef.current = tracks
		onPlayRef.current = onPlay
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

	const goToPrevTrack = useCallback(() => {
		const t = trackRef.current
		const ts = tracksRef.current
		if (!t || !ts.length) return
		const currentIndex = ts.findIndex((x) => x.id === t.id && x.source === t.source)
		if (currentIndex > 0) {
			onPlayRef.current(ts[currentIndex - 1])
		}
	}, [])

	useEffect(() => {
		if (!track) return

		if (prevTrackId.current !== track.id) {
			prevTrackId.current = track.id
			nextingRef.current = false
			setIframeKey((k) => k + 1)
		}
	}, [track])

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

	const showControls = !roomId || isHost

	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700">
			<div className="max-w-4xl mx-auto px-4">
				<div className="flex items-center gap-4 py-3">
					<img
						src={track.thumbnail}
						alt={track.title}
						className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
					/>

					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium text-white truncate">{track.title}</p>
						<p className="text-xs text-slate-400 truncate">{track.artist}</p>
					</div>

					{showControls ? (
						<div className="flex items-center gap-2">
							<button
								onClick={goToPrevTrack}
								className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer text-white text-sm"
							>
								◀
							</button>
							<button
								onClick={goToNextTrack}
								className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer text-white text-sm"
							>
								▶▶
							</button>
						</div>
					) : (
						<span className="text-xs text-slate-500">🔒</span>
					)}
				</div>

				<div className="pb-3">
					<iframe
						key={iframeKey}
						className="w-full rounded-lg"
						src={`https://open.spotify.com/embed/track/${encodeURIComponent(track.id)}?utm_source=generator&theme=0`}
						height="80"
						frameBorder="0"
						allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
						loading="lazy"
					/>
				</div>
			</div>
		</div>
	)
}
