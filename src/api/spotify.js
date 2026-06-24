import { refreshToken as refreshUserToken, getAccessToken as getUserToken } from './spotifyAuth'

const SPOTIFY_API_URL = 'https://api.spotify.com/v1'

let refreshPromise = null

async function getAccessToken() {
	const userToken = getUserToken()
	if (userToken) return userToken

	if (!refreshPromise) {
		refreshPromise = refreshUserToken().finally(() => {
			refreshPromise = null
		})
	}
	const refreshed = await refreshPromise
	if (refreshed) {
		return getUserToken()
	}

	throw new Error('No valid Spotify token. Please login first.')
}

export async function searchTracks(query, signal) {
	const token = await getAccessToken()
	const res = await fetch(
		`${SPOTIFY_API_URL}/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
		{ headers: { Authorization: `Bearer ${token}` }, signal }
	)
	if (!res.ok) {
		const text = await res.text()
		throw new Error(text || `Spotify API error: ${res.status}`)
	}
	const data = await res.json()
	if (data.error) {
		throw new Error(data.error.message || 'Spotify API error')
	}
	return (data.tracks?.items || []).map((t) => ({
		id: t.id,
		title: t.name,
		artist: t.artists.map((a) => a.name).join(', '),
		url: t.external_urls.spotify,
		thumbnail: t.album.images[0]?.url || '',
		duration: t.duration_ms,
		source: 'spotify',
	}))
}

function buildRecommendationsParams(recommendations) {
	const params = new URLSearchParams()
	params.set('limit', '20')

	if (recommendations.seed_genres) {
		params.set('seed_genres', recommendations.seed_genres)
	}
	if (recommendations.target_valence !== undefined) {
		params.set('target_valence', recommendations.target_valence)
	}
	if (recommendations.target_energy !== undefined) {
		params.set('target_energy', recommendations.target_energy)
	}
	if (recommendations.target_acousticness !== undefined) {
		params.set('target_acousticness', recommendations.target_acousticness)
	}
	if (recommendations.target_instrumentalness !== undefined) {
		params.set('target_instrumentalness', recommendations.target_instrumentalness)
	}
	if (recommendations.target_tempo !== undefined) {
		params.set('target_tempo', recommendations.target_tempo)
	}

	return params.toString()
}

export async function getRecommendations(recommendations, signal) {
	const token = await getAccessToken()
	const params = buildRecommendationsParams(recommendations)
	const res = await fetch(
		`${SPOTIFY_API_URL}/recommendations?${params}`,
		{ headers: { Authorization: `Bearer ${token}` }, signal }
	)
	if (!res.ok) {
		const text = await res.text()
		throw new Error(text || `Spotify API error: ${res.status}`)
	}
	const data = await res.json()
	if (data.error) {
		throw new Error(data.error.message || 'Spotify API error')
	}
	return (data.tracks || []).map((t) => ({
		id: t.id,
		title: t.name,
		artist: t.artists.map((a) => a.name).join(', '),
		url: t.external_urls.spotify,
		thumbnail: t.album.images[0]?.url || '',
		duration: t.duration_ms,
		source: 'spotify',
	}))
}

export async function getUserProfile() {
	const token = await getAccessToken()
	const res = await fetch(`${SPOTIFY_API_URL}/me`, {
		headers: { Authorization: `Bearer ${token}` },
	})
	if (!res.ok) {
		const text = await res.text()
		throw new Error(text || `Spotify API error: ${res.status}`)
	}
	return res.json()
}

export async function createSpotifyPlaylist(userId, name, description) {
	const token = await getAccessToken()
	const res = await fetch(`${SPOTIFY_API_URL}/users/${userId}/playlists`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			name,
			description,
			public: false,
		}),
	})
	if (!res.ok) {
		const text = await res.text()
		throw new Error(text || `Spotify API error: ${res.status}`)
	}
	return res.json()
}

export async function addTracksToPlaylist(playlistId, trackUris) {
	const token = await getAccessToken()
	const res = await fetch(`${SPOTIFY_API_URL}/playlists/${playlistId}/tracks`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			uris: trackUris,
		}),
	})
	if (!res.ok) {
		const text = await res.text()
		throw new Error(text || `Spotify API error: ${res.status}`)
	}
	return res.json()
}

export async function exportPlaylistToSpotify(name, tracks) {
	const profile = await getUserProfile()
	const playlist = await createSpotifyPlaylist(
		profile.id,
		name,
		`Created with Mood Playlist - ${new Date().toLocaleDateString()}`
	)

	const trackUris = tracks
		.filter((t) => t.source === 'spotify' && t.id)
		.map((t) => `spotify:track:${t.id}`)

	if (trackUris.length > 0) {
		await addTracksToPlaylist(playlist.id, trackUris)
	}

	return playlist
}
