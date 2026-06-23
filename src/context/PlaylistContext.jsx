import { createContext, useContext, useReducer } from 'react'

const PlaylistContext = createContext(null)

const initialState = {
  activeMood: null,
  tracks: [],
  loading: false,
  error: null,
  savedPlaylists: JSON.parse(localStorage.getItem('saved_playlists') || '[]'),
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_MOOD':
      return { ...state, activeMood: action.mood, loading: true, error: null }
    case 'SET_PLAYLIST':
      return { ...state, tracks: action.tracks, loading: false }
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false }
    case 'SAVE_PLAYLIST': {
      const updated = [action.playlist, ...state.savedPlaylists]
      localStorage.setItem('saved_playlists', JSON.stringify(updated))
      return { ...state, savedPlaylists: updated }
    }
    case 'DELETE_PLAYLIST': {
      const updated = state.savedPlaylists.filter((p) => p.id !== action.id)
      localStorage.setItem('saved_playlists', JSON.stringify(updated))
      return { ...state, savedPlaylists: updated }
    }
    case 'LOAD_PLAYLIST':
      return { ...state, tracks: action.tracks, activeMood: action.mood, loading: false, error: null }
    case 'SHUFFLE_PLAYLIST':
      return { ...state, tracks: action.tracks }
    default:
      return state
  }
}

export function PlaylistProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <PlaylistContext.Provider value={{ state, dispatch }}>
      {children}
    </PlaylistContext.Provider>
  )
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext)
  if (!ctx) throw new Error('usePlaylist must be used within PlaylistProvider')
  return ctx
}
