import { useState, useEffect, useRef, useCallback } from 'react'
import { getAccessToken, isLoggedIn, refreshToken } from '../api/spotifyAuth'

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

export function useSpotifyPlayer() {
	const [player, setPlayer] = useState(null)
	const [deviceId, setDeviceId] = useState(null)
	const [isPlaying, setIsPlaying] = useState(false)
	const [error, setError] = useState(null)
	const playerRef = useRef(null)
	const mountedRef = useRef(true)

	useEffect(() => {
		mountedRef.current = true

		if (!isLoggedIn()) return

		let cancelled = false

		loadSpotifySDK().then(() => {
			if (cancelled || playerRef.current || !mountedRef.current) return

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
				if (!cancelled && mountedRef.current) {
					setDeviceId(device_id)
					setPlayer(p)
				}
			})

			p.addListener('player_state_changed', (state) => {
				if (!state) return
				if (!cancelled && mountedRef.current) {
					setIsPlaying(!state.paused)
				}
			})

			p.addListener('initialization_error', ({ message }) => {
				if (!cancelled && mountedRef.current) {
					setError(message)
				}
			})

			p.addListener('authentication_error', ({ message }) => {
				if (!cancelled && mountedRef.current) {
					setError(message)
				}
			})

			p.addListener('account_error', ({ message }) => {
				if (!cancelled && mountedRef.current) {
					setError(message)
				}
			})

			p.addListener('playback_error', ({ message }) => {
				if (!cancelled && mountedRef.current) {
					setError(message)
				}
			})

			p.connect()
			playerRef.current = p
		}).catch((err) => {
			if (!cancelled && mountedRef.current) {
				setError(err.message)
			}
		})

		return () => {
			cancelled = true
			mountedRef.current = false
			if (playerRef.current) {
				playerRef.current.disconnect()
				playerRef.current = null
			}
		}
	}, [])

	const playTrack = useCallback(async (trackId) => {
		if (!deviceId) return false

		try {
			if (!isLoggedIn()) {
				await refreshToken()
			}
			const token = getAccessToken()
			if (!token) return false

			const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
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
	}, [deviceId])

	const togglePlay = useCallback(() => {
		if (player) player.togglePlay()
	}, [player])

	return { player, deviceId, isPlaying, playTrack, togglePlay, error }
}
