import SavedPlaylists from './SavedPlaylists'

export default function Header() {
  return (
    <header className="flex items-center justify-between py-6 px-4">
      <div>
        <h1 className="text-2xl font-bold text-white">
          🎵 Mood Playlist
        </h1>
        <p className="text-sm text-slate-400">Pick your mood, get your music</p>
      </div>
      <SavedPlaylists />
    </header>
  )
}
