import { useState } from 'react'
import { usePlaylist } from '../context/PlaylistContext'
import { MOODS } from '../utils/moodConfig'

export default function SavedPlaylists() {
  const { state, dispatch } = usePlaylist()
  const [open, setOpen] = useState(false)

  const loadPlaylist = (playlist) => {
    dispatch({ type: 'LOAD_PLAYLIST', tracks: playlist.tracks, mood: playlist.mood })
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
      >
        📁 Saved
        {state.savedPlaylists.length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-[10px] flex items-center justify-center">
            {state.savedPlaylists.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative w-80 bg-slate-900 border-l border-slate-700 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Saved Playlists</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            {state.savedPlaylists.length === 0 ? (
              <p className="text-slate-500 text-sm">No saved playlists yet.</p>
            ) : (
              <div className="space-y-3">
                {state.savedPlaylists.map((pl) => {
                  const mood = MOODS[pl.mood]
                  return (
                    <div
                      key={pl.id}
                      className="p-3 rounded-xl bg-white/5 border border-slate-700 hover:border-slate-500 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => loadPlaylist(pl)}
                          className="text-left flex-1 cursor-pointer"
                        >
                          <p className="text-sm font-medium text-white">
                            {mood?.icon} {pl.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {pl.tracks.length} tracks
                          </p>
                        </button>
                        <button
                          onClick={() =>
                            dispatch({ type: 'DELETE_PLAYLIST', id: pl.id })
                          }
                          className="text-slate-500 hover:text-red-400 ml-2 cursor-pointer"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
