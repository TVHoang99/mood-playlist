import { useCallback } from 'react'
import { usePlaylist } from '../context/PlaylistContext'
import { searchTracks } from '../api/spotify'
import { isLoggedIn } from '../api/spotifyAuth'
import { MOODS } from '../utils/moodConfig'

export function useMoodPlaylist() {
  const { dispatch } = usePlaylist()

  const fetchPlaylist = useCallback(
    async (mood) => {
      const query = MOODS[mood].query
      dispatch({ type: 'SET_MOOD', mood })

      if (!isLoggedIn()) {
        dispatch({ type: 'SET_ERROR', error: 'Please login with Spotify first' })
        return
      }

      try {
        const tracks = await searchTracks(query)
        if (tracks.length === 0) {
          dispatch({ type: 'SET_ERROR', error: 'No tracks found' })
          return
        }
        dispatch({ type: 'SET_PLAYLIST', tracks: tracks.slice(0, 20) })
      } catch (err) {
        console.error('Failed to fetch playlist:', err)
        dispatch({ type: 'SET_ERROR', error: err.message || 'Failed to fetch playlists' })
      }
    },
    [dispatch]
  )

  return { fetchPlaylist }
}
