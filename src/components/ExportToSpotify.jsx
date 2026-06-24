import { useState } from 'react'
import { exportPlaylistToSpotify } from '../api/spotify'

export default function ExportToSpotify({ name, tracks }) {
	const [exporting, setExporting] = useState(false)
	const [exported, setExported] = useState(false)
	const [error, setError] = useState(null)

	const handleExport = async () => {
		if (exporting || exported) return

		setExporting(true)
		setError(null)

		try {
			const playlist = await exportPlaylistToSpotify(name, tracks)
			setExported(true)
			console.log('[Export] Playlist created:', playlist.external_urls?.spotify)
		} catch (err) {
			console.error('[Export] Failed:', err)
			setError(err.message || 'Export failed')
		} finally {
			setExporting(false)
		}
	}

	if (exported) {
		return (
			<button
				disabled
				className="px-4 py-2 text-sm rounded-lg bg-green-500/20 text-green-400 cursor-default"
			>
				✓ Exported to Spotify
			</button>
		)
	}

	return (
		<div className="relative">
			<button
				onClick={handleExport}
				disabled={exporting}
				className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
					exporting
						? 'bg-[#1DB954]/20 text-[#1DB954]/50 cursor-not-allowed'
						: 'bg-[#1DB954]/20 text-[#1DB954] hover:bg-[#1DB954]/30'
				}`}
			>
				{exporting ? (
					<>
						<svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
							<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
						</svg>
						Exporting...
					</>
				) : (
					<>
						<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
						</svg>
						Export to Spotify
					</>
				)}
			</button>
			{error && (
				<p className="text-xs text-red-400 mt-1 absolute -bottom-6 left-0 whitespace-nowrap">
					{error}
				</p>
			)}
		</div>
	)
}
