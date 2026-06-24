export function encodePlaylist(playlist) {
	const payload = JSON.stringify({ m: playlist.mood, t: playlist.tracks.slice(0, 10) })
	return btoa(unescape(encodeURIComponent(payload)))
}

export function decodePlaylist(encoded) {
	try {
		const payload = decodeURIComponent(escape(atob(encoded)))
		return JSON.parse(payload)
	} catch {
		return null
	}
}
