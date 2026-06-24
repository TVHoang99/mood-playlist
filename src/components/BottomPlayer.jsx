import { useEffect, useRef, useState, useCallback } from 'react'
import { useSync } from '../hooks/useSync'
import { isLoggedIn, getAccessToken, refreshToken } from '../api/spotifyAuth'

let sdkLoaded = false
let sdkPromise = null
let sdkFailed = false

function loadSpotifySDK() {
	if (sdkFailed) return Promise.reject(new Error('SDK failed'))
	if (sdkLoaded) return Promise.resolve()
	if (sdkPromise) return sdkPromise

	sdkPromise = new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			sdkPromise = null
			sdkFailed = true
			reject(new Error('timeout'))
		}, 8000)

		const script = document.createElement('script')
		script.src = 'https://sdk.scdn.co/spotify-player.js'
		script.async = true

		script.onerror = () => {
			clearTimeout(timeout)
			sdkPromise = null
			sdkFailed = true
			reject(new Error('load'))
		}

		window.onSpotifyWebPlaybackSDKReady = () => {
			clearTimeout(timeout)
			sdkLoaded = true
			sdkPromise = null
			resolve()
		}

		document.body.appendChild(script)
	})

	return sdkPromise
}

export default function BottomPlayer({ track, onPlay }) {
	const { roomId, isHost, currentTrack, playTrack: syncTrack } = useSync()
	const [iframeKey, setIframeKey] = useState(0)
	const lastSyncedId = useRef(null)
	const prevTrackId = useRef(null)
	const playerRef = useRef(null)
	const deviceIdRef = useRef(null)
	const [sdkReady, setSdkReady] = useState(false)
	const pollRef = useRef(null)

	useEffect(() => {
		if (!isLoggedIn() || sdkFailed) return
		let cancelled = false

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
				}
			})

			p.addListener('authentication_error', () => {
				sdkFailed = true
			})

			p.addListener('account_error', () => {
				sdkFailed = true
			})

			p.connect()
		}).catch(() => {
			sdkFailed = true
		})

		return () => {
			cancelled = true
			if (pollRef.current) clearInterval(pollRef.current)
			if (playerRef.current) {
				playerRef.current.disconnect()
				playerRef.current = null
			}
		}
	}, [])

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
		if (track && track.id === currentTrack.id) return
		lastSyncedId.current = currentTrack.id
		onPlay(currentTrack)
		if (sdkReady && currentTrack.source === 'spotify') {
			playOnSDK(currentTrack.id)
		}
	}, [currentTrack, roomId, isHost, track, onPlay, sdkReady, playOnSDK])

	if (!track) return null

	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-slate-950 via-slate-950/98 to-transparent">
			<div className="max-w-4xl mx-auto px-4 pt-4 pb-2">
				<iframe
					key={iframeKey}
					className="w-full rounded-xl shadow-2xl"
					src={`https://open.spotify.com/embed/track/${encodeURIComponent(track.id)}?utm_source=generator&theme=0&autoplay=1`}
					height="80"
					frameBorder="0"
					allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
					loading="lazy"
				/>
			</div>
		</div>
	)
}
