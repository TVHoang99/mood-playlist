import { useCallback } from 'react'
import { usePlaylist } from '../context/PlaylistContext'
import { searchTracks } from '../api/spotify'
import { searchVideos } from '../api/youtube'
import { MOODS } from '../utils/moodConfig'

export function useMoodPlaylist() {
  const { dispatch } = usePlaylist()

  const fetchPlaylist = useCallback(
    async (mood) => {
      const query = MOODS[mood].query
      dispatch({ type: 'SET_MOOD', mood })

      try {
        const [spotifyTracks, youtubeTracks] = await Promise.allSettled([
          searchTracks(query),
          searchVideos(query),
        ])

        const sTracks = spotifyTracks.status === 'fulfilled' ? spotifyTracks.value : []
        const yTracks = youtubeTracks.status === 'fulfilled' ? youtubeTracks.value : []

        const merged = []
        const maxLen = Math.max(sTracks.length, yTracks.length)
        for (let i = 0; i < maxLen; i++) {
          if (i < sTracks.length) merged.push(sTracks[i])
          if (i < yTracks.length) merged.push(yTracks[i])
        }

        dispatch({ type: 'SET_PLAYLIST', tracks: merged.slice(0, 20) })
      } catch {
        dispatch({ type: 'SET_ERROR', error: 'Failed to fetch playlists' })
      }
    },
    [dispatch]
  )

  return { fetchPlaylist }
}
