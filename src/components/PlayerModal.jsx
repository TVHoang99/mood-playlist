import { useEffect, useRef, useCallback, useState } from 'react'
import { useSync } from '../hooks/useSync'
import { isLoggedIn, getAccessToken, refreshToken } from '../api/spotifyAuth'

let sdkLoaded = false
let sdkPromise = null

function loadSpotifySDK() {
	if (sdkLoaded) return Promise.resolve()
	if (sdkPromise) return sdkPromise

	sdkPromise = new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			sdkPromise = null
			reject(new Error('Spotify SDK load timeout'))
		}, 10000)

		const script = document.createElement('script')
		script.src = 'https://sdk.scdn.co/spotify-player.js'
		script.async = true

		script.onerror = () => {
			clearTimeout(timeout)
			sdkPromise = null
			reject(new Error('Failed to load Spotify SDK'))
		}

		const prevHandler = window.onSpotifyWebPlaybackSDKReady
		window.onSpotifyWebPlaybackSDKReady = () => {
			clearTimeout(timeout)
			sdkLoaded = true
			sdkPromise = null
			window.onSpotifyWebPlaybackSDKReady = prevHandler
			resolve()
		}

		document.body.appendChild(script)
	})

	return sdkPromise
}

export default function PlayerModal({ track, tracks, onClose, onPlay, onTimeUpdate }) {
	const overlayRef = useRef(null)
	const { roomId, isHost, currentTrack, playTrack: syncTrack } = useSync()
	const [iframeKey, setIframeKey] = useState(0)
	const lastSyncedId = useRef(null)
	const prevTrackId = useRef(null)
	const playerRef = useRef(null)
	const deviceIdRef = useRef(null)
	const [sdkReady, setSdkReady] = useState(false)
	const [isPlaying, setIsPlaying] = useState(false)
	const [position, setPosition] = useState(0)
	const [duration, setDuration] = useState(0)

	const trackRef = useRef(track)
	const tracksRef = useRef(tracks)
	const onPlayRef = useRef(onPlay)

	useEffect(() => {
		trackRef.current = track
		tracksRef.current = tracks
		onPlayRef.current = onPlay
	})

	const goToNextTrack = useCallback(() => {
		const t = trackRef.current
		const ts = tracksRef.current
		if (!t || !ts.length) return
		const currentIndex = ts.findIndex((x) => x.id === t.id && x.source === t.source)
		const nextIndex = currentIndex < ts.length - 1 ? currentIndex + 1 : 0
		onPlayRef.current(ts[nextIndex])
	}, [])

	useEffect(() => {
		if (!isLoggedIn()) return
		let cancelled = false
		let pollInterval = null

		loadSpotifySDK().then(() => {
			if (cancelled || playerRef.current) return

			const p = new window.Spotify.Player({
				name: 'Mood Playlist',
				getOAuthToken: async (cb) => {
					let token = getAccessToken()
					if (!isLoggedIn()) {
						await refreshToken()
						token = getAccessToken()
					}
					cb(token || '')
				},
				volume: 0.8,
			})

			p.addListener('ready', ({ device_id }) => {
				if (!cancelled) {
					deviceIdRef.current = device_id
					playerRef.current = p
					setSdkReady(true)

					pollInterval = setInterval(() => {
						p.getCurrentState().then((state) => {
							if (!state || cancelled) return
							setIsPlaying(!state.paused)
							setPosition(state.position)
							setDuration(state.duration)
							if (onTimeUpdate) {
								onTimeUpdate({
									position: state.position,
									duration: state.duration,
									remaining: state.duration - state.position,
								})
							}
							if (!state.paused && state.position >= state.duration - 500) {
								goToNextTrack()
							}
						})
					}, 250)
				}
			})

			p.addListener('authentication_error', () => {
				if (!cancelled) setSdkReady(false)
			})

			p.addListener('account_error', () => {
				if (!cancelled) setSdkReady(false)
			})

			p.addListener('playback_error', () => {
				if (!cancelled) setSdkReady(false)
			})

			p.connect()
		}).catch(() => {})

		return () => {
			cancelled = true
			if (pollInterval) clearInterval(pollInterval)
			if (playerRef.current) {
				playerRef.current.disconnect()
				playerRef.current = null
			}
		}
	}, [goToNextTrack, onTimeUpdate])

	const playOnSDK = useCallback(async (trackId) => {
		if (!deviceIdRef.current || !playerRef.current) return false
		try {
			let token = getAccessToken()
			if (!isLoggedIn()) {
				await refreshToken()
				token = getAccessToken()
			}
			if (!token) return false

			const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceIdRef.current}`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
			})
			return res.ok || res.status === 204
		} catch {
			return false
		}
	}, [])

	useEffect(() => {
		if (!track) return

		if (prevTrackId.current !== track.id) {
			prevTrackId.current = track.id
			setIframeKey((k) => k + 1)
		}

		if (sdkReady && track.source === 'spotify') {
			playOnSDK(track.id)
		}
	}, [track, sdkReady, playOnSDK])

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
			if (sdkReady && currentTrack.source === 'spotify') {
				playOnSDK(currentTrack.id)
			}
		}
	}, [currentTrack, roomId, isHost, tracks, track, onPlay, sdkReady, playOnSDK])

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
	const useSDK = sdkReady && track.source === 'spotify'
	const currentIndex = tracks.findIndex((t) => t.id === track.id && t.source === track.source)
	const prevTrackItem = currentIndex > 0 ? tracks[currentIndex - 1] : null
	const nextTrackItem = currentIndex < tracks.length - 1 ? tracks[currentIndex + 1] : null

	const formatTime = (ms) => {
		const minutes = Math.floor(ms / 60000)
		const seconds = Math.floor((ms % 60000) / 1000)
		return `${minutes}:${seconds.toString().padStart(2, '0')}`
	}

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
					{useSDK ? (
						<div className="p-6 flex flex-col items-center gap-4">
							<img
								src={track.thumbnail}
								alt={track.title}
								className="w-48 h-48 rounded-xl object-cover shadow-lg"
							/>
							<div className="text-center">
								<p className="text-white font-semibold text-lg">{track.title}</p>
								<p className="text-slate-400 text-sm">{track.artist}</p>
							</div>
							<div className="w-full max-w-xs">
								<div className="flex justify-between text-xs text-slate-500 mb-1">
									<span>{formatTime(position)}</span>
									<span>{formatTime(duration)}</span>
								</div>
								<div className="w-full h-1 bg-slate-700 rounded-full">
									<div
										className="h-full bg-green-500 rounded-full transition-all"
										style={{ width: duration > 0 ? `${(position / duration) * 100}%` : '0%' }}
									/>
								</div>
							</div>
							<p className="text-green-400 text-xs">
								{isPlaying ? '▶ Playing' : '⏸ Paused'}
							</p>
						</div>
					) : (
						<div className="p-4">
							<iframe
								key={iframeKey}
								className="w-full rounded-lg"
								src={`https://open.spotify.com/embed/track/${encodeURIComponent(track.id)}?utm_source=generator&theme=0`}
								height="352"
								frameBorder="0"
								allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
								loading="lazy"
							/>
						</div>
					)}

					<div className="p-4">
						<p className="text-white font-semibold truncate">{track.title}</p>
						<p className="text-slate-400 text-sm truncate">{track.artist}</p>

						{showControls ? (
							<div className="flex items-center justify-between mt-4">
								<button
									onClick={() => prevTrackItem && onPlay(prevTrackItem)}
									disabled={!prevTrackItem}
									className="px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
								>
									← Prev
								</button>
								<span className="text-slate-500 text-sm">
									{tracks.length > 0 ? `${currentIndex + 1} / ${tracks.length}` : '0 / 0'}
								</span>
								<button
									onClick={() => nextTrackItem && onPlay(nextTrackItem)}
									disabled={!nextTrackItem}
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
