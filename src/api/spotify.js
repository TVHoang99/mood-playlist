import { refreshToken as refreshUserToken, getAccessToken as getUserToken } from './spotifyAuth'

const SPOTIFY_SEARCH_URL = 'https://api.spotify.com/v1/search'

async function getAccessToken() {
  const userToken = getUserToken()
  console.log('[Spotify] User token from localStorage:', userToken ? userToken.substring(0, 30) + '...' : 'null')
  if (userToken) return userToken

  console.log('[Spotify] No user token, trying refresh...')
  const refreshed = await refreshUserToken()
  if (refreshed) {
    const newToken = getUserToken()
    console.log('[Spotify] Refreshed token:', newToken ? newToken.substring(0, 30) + '...' : 'null')
    return newToken
  }

  console.log('[Spotify] No refresh available')
  throw new Error('No valid Spotify token. Please login first.')
}

export async function searchTracks(query) {
  const token = await getAccessToken()
  console.log('[Spotify] Searching with token:', token?.substring(0, 20) + '...')
  const res = await fetch(
    `${SPOTIFY_SEARCH_URL}?q=${encodeURIComponent(query)}&type=track&limit=10`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  console.log('[Spotify] Search response status:', res.status)
  if (!res.ok) {
    const text = await res.text()
    console.error('[Spotify] Search error:', res.status, text)
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
