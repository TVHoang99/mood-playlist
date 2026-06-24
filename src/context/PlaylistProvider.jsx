import { useReducer } from 'react'
import { PlaylistContext } from './PlaylistContext'

function loadSavedPlaylists() {
	try {
		return JSON.parse(localStorage.getItem('saved_playlists') || '[]')
	} catch {
		return []
	}
}

const initialState = {
	activeMood: null,
	tracks: [],
	loading: false,
	error: null,
	savedPlaylists: loadSavedPlaylists(),
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
			try {
				localStorage.setItem('saved_playlists', JSON.stringify(updated))
			} catch {
				// localStorage quota exceeded
			}
			return { ...state, savedPlaylists: updated }
		}
		case 'DELETE_PLAYLIST': {
			const updated = state.savedPlaylists.filter((p) => p.id !== action.id)
			try {
				localStorage.setItem('saved_playlists', JSON.stringify(updated))
			} catch {
				// localStorage quota exceeded
			}
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
