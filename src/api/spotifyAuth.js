const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || 'https://tvhoang99.github.io/mood-playlist/'
const SCOPES = ['streaming', 'user-read-playback-state', 'user-modify-playback-state', 'user-library-read'].join(' ')

function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return values.reduce((acc, x) => acc + possible[x % possible.length], '')
}

async function sha256(plain) {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return window.crypto.subtle.digest('SHA-256', data)
}

function base64urlencode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function generateCodeChallenge(verifier) {
  const hashed = await sha256(verifier)
  return base64urlencode(hashed)
}

export function getAccessToken() {
  return localStorage.getItem('spotify_access_token')
}

export function isLoggedIn() {
  const token = getAccessToken()
  const expiry = localStorage.getItem('spotify_token_expiry')
  return token && expiry && Date.now() < parseInt(expiry)
}

function setTokens(accessToken, refreshToken, expiresIn) {
  localStorage.setItem('spotify_access_token', accessToken)
  localStorage.setItem('spotify_refresh_token', refreshToken)
  localStorage.setItem('spotify_token_expiry', Date.now() + expiresIn * 1000)
}

export function clearTokens() {
  localStorage.removeItem('spotify_access_token')
  localStorage.removeItem('spotify_refresh_token')
  localStorage.removeItem('spotify_token_expiry')
  localStorage.removeItem('spotify_code_verifier')
}

export function logout() {
  clearTokens()
  window.location.reload()
}

export async function login() {
  const verifier = generateRandomString(64)
  localStorage.setItem('spotify_code_verifier', verifier)

  const challenge = await generateCodeChallenge(verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`
}

export async function handleCallback() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const error = params.get('error')

  if (error) throw new Error(error)
  if (!code) return false

  const verifier = localStorage.getItem('spotify_code_verifier')

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  })

  const data = await res.json()
  if (data.access_token) {
    setTokens(data.access_token, data.refresh_token, data.expires_in)
    window.history.replaceState({}, document.title, window.location.pathname)
    return true
  }

  throw new Error(data.error_description || 'Token exchange failed')
}

export async function refreshToken() {
  const refresh = localStorage.getItem('spotify_refresh_token')
  if (!refresh) return false

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refresh,
    }),
  })

  const data = await res.json()
  if (data.access_token) {
    setTokens(data.access_token, data.refresh_token || refresh, data.expires_in)
    return true
  }

  clearTokens()
  return false
}
