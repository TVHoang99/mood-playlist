import { useEffect, useRef, useState, useCallback } from 'react'
import { useSync } from '../hooks/useSync'
import { isLoggedIn, getAccessToken, refreshToken } from '../api/spotifyAuth'

let sdkLoaded = false
let sdkPromise = null
let sdkFailed = false
let hasPremium = null

async function checkPremium() {
	if (hasPremium !== null) return hasPremium
	try {
		let token = getAccessToken()
		if (!isLoggedIn()) {
			await refreshToken()
			token = getAccessToken()
		}
		if (!token) {
			console.log('[Player] No token available')
			return false
		}

		const res = await fetch('https://api.spotify.com/v1/me', {
			headers: { Authorization: `Bearer ${token}` },
		})
		const data = await res.json()
		console.log('[Player] Premium check:', data.product)
		hasPremium = data.product === 'premium'
		return hasPremium
	} catch (err) {
		console.log('[Player] Premium check failed:', err)
		hasPremium = false
		return false
	}
}

function loadSpotifySDK() {
	if (sdkFailed) return Promise.reject(new Error('SDK failed'))
	if (sdkLoaded) return Promise.resolve()
	if (sdkPromise) return sdkPromise

	sdkPromise = new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			sdkPromise = null
			sdkFailed = true
			console.log('[Player] SDK load timeout')
			reject(new Error('timeout'))
		}, 8000)

		const script = document.createElement('script')
		script.src = 'https://sdk.scdn.co/spotify-player.js'
		script.async = true

		script.onerror = () => {
			clearTimeout(timeout)
			sdkPromise = null
			sdkFailed = true
			console.log('[Player] SDK script load error')
			reject(new Error('load'))
		}

		window.onSpotifyWebPlaybackSDKReady = () => {
			clearTimeout(timeout)
			sdkLoaded = true
			sdkPromise = null
			console.log('[Player] SDK loaded successfully')
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
	const [userPremium, setUserPremium] = useState(false)
	const [debugMsg, setDebugMsg] = useState('')

	const initSDK = useCallback(() => {
		if (sdkFailed) {
			setDebugMsg('SDK previously failed')
			return
		}

		setDebugMsg('Loading SDK...')
		loadSpotifySDK().then(() => {
			if (playerRef.current) return

			setDebugMsg('Creating player...')
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
				console.log('[Player] SDK ready, device:', device_id)
				deviceIdRef.current = device_id
				playerRef.current = p
				setSdkReady(true)
				setDebugMsg('SDK ready!')
			})

			p.addListener('authentication_error', (err) => {
				console.log('[Player] Auth error:', err.message)
				sdkFailed = true
				setDebugMsg('Auth error: ' + err.message)
			})

			p.addListener('account_error', (err) => {
				console.log('[Player] Account error:', err.message)
				sdkFailed = true
				setDebugMsg('Account error: ' + err.message)
			})

			p.addListener('playback_error', (err) => {
				console.log('[Player] Playback error:', err.message)
			})

			p.connect().then((connected) => {
				console.log('[Player] Connect result:', connected)
				if (!connected) {
					sdkFailed = true
					setDebugMsg('SDK connect returned false')
				}
			})
		}).catch((err) => {
			console.log('[Player] SDK load failed:', err)
			sdkFailed = true
			setDebugMsg('SDK load failed: ' + err.message)
		})
	}, [])

	useEffect(() => {
		if (!isLoggedIn()) return
		checkPremium().then((premium) => {
			setUserPremium(premium)
			if (premium) {
				initSDK()
			} else {
				setDebugMsg('No Premium - using iframe')
			}
		})
	}, [initSDK])

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
			console.log('[Player] Play result:', res.status)
			return res.ok || res.status === 204
		} catch (err) {
			console.log('[Player] Play error:', err)
			return false
		}
	}, [])

	useEffect(() => {
		if (!track) return

		if (prevTrackId.current !== track.id) {
			prevTrackId.current = track.id
			setIframeKey((k) => k + 1)

			if (sdkReady && track.source === 'spotify') {
				console.log('[Player] Playing track via SDK:', track.id)
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

	const canAutoPlay = userPremium && sdkReady

	return (
		<div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-slate-950 via-slate-950/98 to-transparent">
			<div className="max-w-4xl mx-auto px-4 pt-4 pb-2">
				{canAutoPlay ? (
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
							<span className="text-xs text-green-400">Auto-playing</span>
						</div>
					</div>
				) : (
					<iframe
						key={iframeKey}
						className="w-full rounded-xl shadow-2xl"
						src={`https://open.spotify.com/embed/track/${encodeURIComponent(track.id)}?utm_source=generator&theme=0`}
						height="80"
						frameBorder="0"
						allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
						loading="lazy"
					/>
				)}
				{debugMsg && (
					<p className="text-[10px] text-slate-600 mt-1 text-center">{debugMsg}</p>
				)}
			</div>
		</div>
	)
}
