import { useState, useEffect, useRef, useCallback } from 'react'
import { getAccessToken, isLoggedIn, refreshToken } from '../api/spotifyAuth'

let sdkLoaded = false
let sdkLoading = false

function loadSpotifySDK() {
  if (sdkLoaded) return Promise.resolve()
  if (sdkLoading) return new Promise((resolve) => {
    const check = setInterval(() => {
      if (sdkLoaded) { clearInterval(check); resolve() }
    }, 100)
  })

  sdkLoading = true
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    document.body.appendChild(script)

    window.onSpotifyWebPlaybackSDKReady = () => {
      sdkLoaded = true
      resolve()
    }
  })
}

export function useSpotifyPlayer() {
  const [player, setPlayer] = useState(null)
  const [deviceId, setDeviceId] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const playerRef = useRef(null)

  useEffect(() => {
    if (!isLoggedIn()) return

    loadSpotifySDK().then(() => {
      if (playerRef.current) return

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
        setDeviceId(device_id)
        setPlayer(p)
      })

      p.addListener('player_state_changed', (state) => {
        if (!state) return
        setIsPlaying(!state.paused)
      })

      p.connect()
      playerRef.current = p
    })

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect()
        playerRef.current = null
      }
    }
  }, [])

  const playTrack = useCallback(async (trackId) => {
    if (!deviceId || !isLoggedIn()) return false

    const token = getAccessToken()
    const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
    })

    return res.ok || res.status === 204
  }, [deviceId])

  const togglePlay = useCallback(() => {
    if (player) player.togglePlay()
  }, [player])

  return { player, deviceId, isPlaying, playTrack, togglePlay }
}
