import { useContext } from 'react'
import { PlaylistContext } from '../context/PlaylistContext.js'

export function usePlaylist() {
	const ctx = useContext(PlaylistContext)
	if (!ctx) throw new Error('usePlaylist must be used within PlaylistProvider')
	return ctx
}
