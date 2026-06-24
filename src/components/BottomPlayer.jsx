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

export default function BottomPlayer({ track, tracks, onPlay }) {
	const { roomId, isHost, currentTrack, playTrack: syncTrack } = useSync()
	const [iframeKey, setIframeKey] = useState(0)
	const lastSyncedId = useRef(null)
	const prevTrackId = useRef(null)
	const playerRef = useRef(null)
	const deviceIdRef = useRef(null)
	const [sdkReady, setSdkReady] = useState(false)
	const [position, setPosition] = useState(0)
	const [duration, setDuration] = useState(0)
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
							setPosition(state.position)
							setDuration(state.duration)
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
	}, [goToNextTrack])

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
			nextingRef.current = false
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

	if (!track) return null

	const showControls = !roomId || isHost
	const useSDK = sdkReady && track.source === 'spotify'

	const formatTime = (ms) => {
		if (!ms || ms <= 0) return '0:00'
		const minutes = Math.floor(ms / 60000)
		const seconds = Math.floor((ms % 60000) / 1000)
		return `${minutes}:${seconds.toString().padStart(2, '0')}`
	}

	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-700">
			<div className="max-w-4xl mx-auto px-4">
				{useSDK && (
					<div className="h-1 bg-slate-700">
						<div
							className="h-full bg-green-500 transition-all"
							style={{ width: duration > 0 ? `${(position / duration) * 100}%` : '0%' }}
						/>
					</div>
				)}

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

					{useSDK && (
						<div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
							<span>{formatTime(position)}</span>
							<span>/</span>
							<span>{formatTime(duration)}</span>
						</div>
					)}

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

				{!useSDK && (
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
				)}
			</div>
		</div>
	)
}
