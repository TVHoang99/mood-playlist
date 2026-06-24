import { useCallback, useRef } from 'react'
import { usePlaylist } from './usePlaylist'
import { searchTracks } from '../api/spotify'
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

			const query = MOODS[mood].query
			dispatch({ type: 'SET_MOOD', mood })

			if (!isLoggedIn()) {
				dispatch({ type: 'SET_ERROR', error: 'Please login with Spotify first' })
				return
			}

			try {
				const tracks = await searchTracks(query, controller.signal)
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
