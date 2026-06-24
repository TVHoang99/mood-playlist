import { useCallback, useRef } from 'react'
import { usePlaylist } from './usePlaylist'
import { getRecommendations, searchTracks } from '../api/spotify'
import { isLoggedIn } from '../api/spotifyAuth'
import { MOODS } from '../utils/moodConfig'
import { useSync } from './useSync'

export function useMoodPlaylist() {
	const { dispatch } = usePlaylist()
	const { roomId, syncPlaylist } = useSync()
	const abortRef = useRef(null)

	const fetchPlaylist = useCallback(
		async (mood) => {
			if (abortRef.current) {
				abortRef.current.abort()
			}

			const controller = new AbortController()
			abortRef.current = controller

			const moodConfig = MOODS[mood]
			dispatch({ type: 'SET_MOOD', mood })

			if (!isLoggedIn()) {
				dispatch({ type: 'SET_ERROR', error: 'Please login with Spotify first' })
				return
			}

		try {
			let tracks = []

			if (moodConfig.recommendations) {
				try {
					tracks = await getRecommendations(moodConfig.recommendations, controller.signal)
				} catch (recErr) {
					console.warn('[Playlist] Recommendations failed, falling back to search:', recErr)
				}
			}

			if (tracks.length === 0 && moodConfig.query) {
				tracks = await searchTracks(moodConfig.query, controller.signal)
			}

				if (controller.signal.aborted) return

				if (tracks.length === 0) {
					dispatch({ type: 'SET_ERROR', error: 'No tracks found' })
					return
				}
				const slicedTracks = tracks.slice(0, 20)
				dispatch({ type: 'SET_PLAYLIST', tracks: slicedTracks })

				if (roomId) {
					syncPlaylist(mood, slicedTracks)
				}
			} catch (err) {
				if (err.name === 'AbortError') return
				dispatch({ type: 'SET_ERROR', error: err.message || 'Failed to fetch playlists' })
			}
		},
		[dispatch, roomId, syncPlaylist]
	)

	return { fetchPlaylist }
}
