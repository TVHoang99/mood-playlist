import { useEffect, useRef } from 'react'

export default function PlayerModal({ track, tracks, onClose, onPlay }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  if (!track) return null

  const isYouTube = track.source === 'youtube'
  const isSpotify = track.source === 'spotify'

  const currentIndex = tracks.findIndex((t) => t.id === track.id && t.source === track.source)
  const prevTrack = currentIndex > 0 ? tracks[currentIndex - 1] : null
  const nextTrack = currentIndex < tracks.length - 1 ? tracks[currentIndex + 1] : null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="relative w-full max-w-2xl mx-4">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/60 hover:text-white text-2xl cursor-pointer"
        >
          ✕
        </button>

        <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
          {isYouTube && (
            <div className="relative pt-[56.25%]">
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${track.id}?autoplay=1&rel=0`}
                title={track.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {isSpotify && (
            <div className="p-4">
              <iframe
                className="w-full rounded-lg"
                src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
                height="352"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
          )}

          <div className="p-4">
            <p className="text-white font-semibold truncate">{track.title}</p>
            <p className="text-slate-400 text-sm truncate">{track.artist}</p>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => prevTrack && onPlay(prevTrack)}
                disabled={!prevTrack}
                className="px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← Prev
              </button>
              <span className="text-slate-500 text-sm">
                {currentIndex + 1} / {tracks.length}
              </span>
              <button
                onClick={() => nextTrack && onPlay(nextTrack)}
                disabled={!nextTrack}
                className="px-4 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
