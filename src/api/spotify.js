import { refreshToken as refreshUserToken, getAccessToken as getUserToken } from './spotifyAuth'

const SPOTIFY_SEARCH_URL = 'https://api.spotify.com/v1/search'

async function getAccessToken() {
  const userToken = getUserToken()
  if (userToken) return userToken

  const refreshed = await refreshUserToken()
  if (refreshed) return getUserToken()

  throw new Error('No valid Spotify token. Please login first.')
}

export async function searchTracks(query) {
  const token = await getAccessToken()
  const res = await fetch(
    `${SPOTIFY_SEARCH_URL}?q=${encodeURIComponent(query)}&type=track&limit=10`,
    { headers: { Authorization: `Bearer ${token}` } }
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
    source: 'spotify',
  }))
}
