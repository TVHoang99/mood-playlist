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
		<div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-slate-950 via-slate-950/98 to-transparent">
			<div className="max-w-4xl mx-auto px-4 pt-4 pb-2">
				{showControls && (
					<div className="flex items-center justify-center gap-3 mb-2">
						<button
							onClick={goToPrevTrack}
							className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer text-white"
						>
							<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
							</svg>
						</button>
						<button
							onClick={goToNextTrack}
							className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer text-white"
						>
							<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
							</svg>
						</button>
					</div>
				)}

				<iframe
					key={iframeKey}
					className="w-full rounded-xl shadow-2xl"
					src={`https://open.spotify.com/embed/track/${encodeURIComponent(track.id)}?utm_source=generator&theme=0`}
					height="152"
					frameBorder="0"
					allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
					loading="lazy"
				/>
			</div>
		</div>
	)
}
