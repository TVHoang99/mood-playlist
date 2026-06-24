import { useEffect, useRef, useState, useCallback } from 'react'
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

export default function BottomPlayer({ track, tracks, onPlay, onTimeUpdate }) {
	const { roomId, isHost, currentTrack, playTrack: syncTrack } = useSync()
	const [iframeKey, setIframeKey] = useState(0)
	const lastSyncedId = useRef(null)
	const prevTrackId = useRef(null)
	const playerRef = useRef(null)
	const deviceIdRef = useRef(null)
	const [sdkReady, setSdkReady] = useState(false)
	const nextingRef = useRef(false)

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
							if (onTimeUpdateRef.current) {
								onTimeUpdateRef.current({
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

			if (sdkReady && track.source === 'spotify') {
				playOnSDK(track.id)
			}
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

	const useSDK = sdkReady && track.source === 'spotify'

	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-slate-950 via-slate-950/98 to-transparent">
			<div className="max-w-4xl mx-auto px-4 pt-4 pb-2">
				{useSDK ? (
					<div className="bg-slate-900 rounded-xl shadow-2xl p-3 flex items-center gap-3">
						<img
							src={track.thumbnail}
							alt={track.title}
							className="w-12 h-12 rounded-lg object-cover"
						/>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium text-white truncate">{track.title}</p>
							<p className="text-xs text-slate-400 truncate">{track.artist}</p>
						</div>
						<span className="text-xs text-green-400">Playing via Premium</span>
					</div>
				) : (
					<iframe
						key={iframeKey}
						className="w-full rounded-xl shadow-2xl"
						src={`https://open.spotify.com/embed/track/${encodeURIComponent(track.id)}?utm_source=generator&theme=0&autoplay=1`}
						height="80"
						frameBorder="0"
						allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
						loading="lazy"
					/>
				)}
			</div>
		</div>
	)
}
