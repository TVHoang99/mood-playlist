const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search'

export async function searchVideos(query) {
  const res = await fetch(
    `${YOUTUBE_SEARCH_URL}?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategory=10&maxResults=10&key=${import.meta.env.VITE_YOUTUBE_API_KEY}`
  )
  const data = await res.json()
  return (data.items || []).map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    artist: item.snippet.channelTitle,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    thumbnail: item.snippet.thumbnails?.medium?.url || '',
    source: 'youtube',
  }))
}
