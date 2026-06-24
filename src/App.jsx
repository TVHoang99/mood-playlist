import { useEffect, useState } from 'react'
import { PlaylistProvider } from './context/PlaylistProvider'
import { SyncProvider } from './context/SyncContext'
import { useSync as useSyncHook } from './hooks/useSync'
import { usePlaylist } from './hooks/usePlaylist'
import { decodePlaylist } from './utils/share'
import { useMoodPlaylist } from './hooks/useMoodPlaylist'
import { handleCallback, isLoggedIn } from './api/spotifyAuth'
import Header from './components/Header'
import MoodSelector from './components/MoodSelector'
import PlaylistView from './components/PlaylistView'
import SpotifyLogin from './components/SpotifyLogin'

function HeroWelcome() {
	return (
		<div className="flex flex-col items-center justify-center py-20 text-center">
			<div className="mb-6">
				<span className="text-6xl">🎵</span>
			</div>
			<h1 className="text-4xl font-bold text-white mb-4">
				Mood Playlist
			</h1>
			<p className="text-lg text-slate-300 mb-2 max-w-md">
				Đồng bộ cảm xúc của bạn với âm nhạc
			</p>
			<p className="text-slate-400 mb-8 max-w-md">
				Tạo phòng nghe chung thời gian thực. Chọn mood, phát nhạc, chia sẻ cùng bạn bè.
			</p>
			<div className="animate-pulse">
				<SpotifyLogin />
			</div>
			<p className="text-xs text-slate-500 mt-4">
				Đăng nhập để bắt đầu trải nghiệm
			</p>
		</div>
	)
}

function AppContent() {
	const { dispatch, state } = usePlaylist()
	const { fetchPlaylist } = useMoodPlaylist()
	const { roomId, remoteTracks, remoteMood, joinExistingRoom } = useSyncHook()
	const [authReady, setAuthReady] = useState(false)

	useEffect(() => {
		handleCallback()
			.catch((err) => {
				console.error('[App] OAuth callback error:', err)
			})
			.finally(() => setAuthReady(true))
	}, [])

	useEffect(() => {
		if (!authReady) return

		const params = new URLSearchParams(window.location.search)
		const roomParam = params.get('room')
		if (roomParam) {
			joinExistingRoom(roomParam)
			return
		}

		const hash = window.location.hash.slice(1)
		if (hash) {
			const data = decodePlaylist(hash)
			if (data) {
				dispatch({ type: 'LOAD_PLAYLIST', tracks: data.t, mood: data.m })
				return
			}
		}

		if (isLoggedIn()) {
			fetchPlaylist('happy')
		}
	}, [authReady, dispatch, fetchPlaylist, joinExistingRoom])

	useEffect(() => {
		if (!roomId || !remoteTracks.length) return
		dispatch({ type: 'LOAD_PLAYLIST', tracks: remoteTracks, mood: remoteMood })
	}, [roomId, remoteTracks, remoteMood, dispatch])

	const activeMood = state.activeMood
	const showHero = authReady && !isLoggedIn() && !state.tracks.length && !state.loading

	return (
		<div className="min-h-screen">
			{activeMood && (
				<div className={`mood-gradient mood-gradient-${activeMood}`} />
			)}
			<div className="relative z-10 max-w-4xl mx-auto px-4 pb-12">
				<Header />
				<main className="mt-8 space-y-10">
					{showHero ? (
						<HeroWelcome />
					) : (
						<>
							<section className="text-center">
								<h2 className="text-3xl font-bold text-white mb-2">How are you feeling?</h2>
								<p className="text-slate-400 mb-8">Choose a mood and we'll find the perfect playlist</p>
								<MoodSelector />
							</section>
							<PlaylistView />
						</>
					)}
				</main>
			</div>
		</div>
	)
}

export default function App() {
	return (
		<PlaylistProvider>
			<SyncProvider>
				<AppContent />
			</SyncProvider>
		</PlaylistProvider>
	)
}
