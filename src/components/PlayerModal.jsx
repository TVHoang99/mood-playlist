import { useEffect, useRef, useCallback, useState } from 'react'
import { useSync } from '../hooks/useSync'

export default function PlayerModal({ track, tracks, onClose, onPlay }) {
	const overlayRef = useRef(null)
	const { roomId, isHost, currentTrack, playTrack: syncTrack } = useSync()
	const [iframeKey, setIframeKey] = useState(0)
	const lastSyncedId = useRef(null)
	const prevTrackId = useRef(null)
	const wasPlayingRef = useRef(false)
	const trackEndedRef = useRef(false)

	useEffect(() => {
		if (!track) return
		if (prevTrackId.current !== track.id) {
			prevTrackId.current = track.id
			trackEndedRef.current = false
			wasPlayingRef.current = false
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

	const handleTrackEnd = useCallback(() => {
		if (trackEndedRef.current) return
		trackEndedRef.current = true
		if (!track || !tracks.length) return
		const currentIndex = tracks.findIndex((t) => t.id === track.id && t.source === track.source)
		if (currentIndex < tracks.length - 1) {
			onPlay(tracks[currentIndex + 1])
		} else {
			onPlay(tracks[0])
		}
	}, [track, tracks, onPlay])

	useEffect(() => {
		if (!track) return

		const handleMessage = (event) => {
			if (event.origin !== 'https://open.spotify.com') return
			try {
				const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
				if (data.type === 'playback_update' && data.data) {
					const { is_playing, is_buffering } = data.data
					if (is_playing) {
						wasPlayingRef.current = true
						trackEndedRef.current = false
					}
					if (wasPlayingRef.current && !is_playing && !is_buffering) {
						handleTrackEnd()
					}
				}
			} catch {
				// ignore
			}
		}

		window.addEventListener('message', handleMessage)
		return () => window.removeEventListener('message', handleMessage)
	}, [track, handleTrackEnd])

	const handleKeyDown = useCallback((e) => {
		if (e.key === 'Escape') onClose()
	}, [onClose])

	useEffect(() => {
		if (!track) return
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [track, handleKeyDown])

	if (!track) return null

	const showControls = !roomId || isHost
	const currentIndex = tracks.findIndex((t) => t.id === track.id && t.source === track.source)
	const prevTrack = currentIndex > 0 ? tracks[currentIndex - 1] : null
	const nextTrack = currentIndex < tracks.length - 1 ? tracks[currentIndex + 1] : null

	return (
		<div
			ref={overlayRef}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
			onClick={(e) => {
				if (e.target === overlayRef.current) onClose()
			}}
		>
			<div className="relative w-full max-w-2xl mx-4">
				<button
					onClick={onClose}
					className="absolute -top-10 right-0 text-white/60 hover:text-white text-2xl cursor-pointer"
				>
					✕
				</button>

				<div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
					<div className="p-4">
						<iframe
							key={iframeKey}
							className="w-full rounded-lg"
							src={`https://open.spotify.com/embed/track/${encodeURIComponent(track.id)}?utm_source=generator&theme=0&autoplay=1`}
							height="352"
							frameBorder="0"
							allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
							loading="lazy"
						/>
					</div>

					<div className="p-4">
						<p className="text-white font-semibold truncate">{track.title}</p>
						<p className="text-slate-400 text-sm truncate">{track.artist}</p>

						{showControls ? (
							<div className="flex items-center justify-between mt-4">
								<button
									onClick={() => prevTrack && onPlay(prevTrack)}
									disabled={!prevTrack}
									className="px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
								>
									← Prev
								</button>
								<span className="text-slate-500 text-sm">
									{tracks.length > 0 ? `${currentIndex + 1} / ${tracks.length}` : '0 / 0'}
								</span>
								<button
									onClick={() => nextTrack && onPlay(nextTrack)}
									disabled={!nextTrack}
									className="px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
								>
									Next →
								</button>
							</div>
						) : (
							<div className="mt-4 text-center">
								<p className="text-slate-500 text-xs">
									🔒 Host controls playback
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
