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
      console.log('[MoodPlaylist] Fetching for mood:', mood, 'query:', query)
      dispatch({ type: 'SET_MOOD', mood })

      if (!isLoggedIn()) {
        console.log('[MoodPlaylist] Not logged in')
        dispatch({ type: 'SET_ERROR', error: 'Please login with Spotify first' })
        return
      }

      try {
        console.log('[MoodPlaylist] Calling searchTracks...')
        const tracks = await searchTracks(query)
        console.log('[MoodPlaylist] Got tracks:', tracks.length)
        if (tracks.length === 0) {
          dispatch({ type: 'SET_ERROR', error: 'No tracks found' })
          return
        }
        dispatch({ type: 'SET_PLAYLIST', tracks: tracks.slice(0, 20) })
      } catch (err) {
        console.error('[MoodPlaylist] Error:', err)
        dispatch({ type: 'SET_ERROR', error: err.message || 'Failed to fetch playlists' })
      }
    },
    [dispatch]
  )

  return { fetchPlaylist }
}
