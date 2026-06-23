import { refreshToken as refreshUserToken } from './spotifyAuth'

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/api/token'
const SPOTIFY_SEARCH_URL = 'https://api.spotify.com/v1/search'

let cachedToken = null
let tokenExpiry = 0

async function getAccessToken() {
  const userToken = localStorage.getItem('spotify_access_token')
  const userExpiry = localStorage.getItem('spotify_token_expiry')
  if (userToken && userExpiry && Date.now() < parseInt(userExpiry)) {
    return userToken
  }

  const refreshed = await refreshUserToken()
  if (refreshed) {
    return localStorage.getItem('spotify_access_token')
  }

  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  const res = await fetch(SPOTIFY_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
      client_secret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Spotify auth failed')
  cachedToken = data.access_token
  tokenExpiry = Date.now() + data.expires_in * 1000 - 60000
  return cachedToken
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
