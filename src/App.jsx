import { useEffect, useState } from 'react'
import { PlaylistProvider } from './context/PlaylistProvider'
import { usePlaylist } from './hooks/usePlaylist'
import { decodePlaylist } from './utils/share'
import { useMoodPlaylist } from './hooks/useMoodPlaylist'
import { handleCallback, isLoggedIn } from './api/spotifyAuth'
import Header from './components/Header'
import MoodSelector from './components/MoodSelector'
import PlaylistView from './components/PlaylistView'

function AppContent() {
	const { dispatch } = usePlaylist()
	const { fetchPlaylist } = useMoodPlaylist()
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
	}, [authReady, dispatch, fetchPlaylist])

	return (
		<div className="min-h-screen">
			<div className="max-w-4xl mx-auto px-4 pb-12">
				<Header />
				<main className="mt-8 space-y-10">
					<section className="text-center">
						<h2 className="text-3xl font-bold text-white mb-2">How are you feeling?</h2>
						<p className="text-slate-400 mb-8">Choose a mood and we'll find the perfect playlist</p>
						<MoodSelector />
					</section>
					<PlaylistView />
				</main>
			</div>
		</div>
	)
}

export default function App() {
	return (
		<PlaylistProvider>
			<AppContent />
		</PlaylistProvider>
	)
}
