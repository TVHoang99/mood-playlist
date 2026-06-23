import { useState } from 'react'
import { encodePlaylist } from '../utils/share'

export default function ShareButton({ playlist }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const encoded = encodePlaylist(playlist)
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      prompt('Copy this link:', url)
    }
  }

  return (
    <button
      onClick={handleShare}
      className={`px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
        copied
          ? 'bg-blue-500/20 text-blue-400'
          : 'bg-white/10 hover:bg-white/20'
      }`}
    >
      {copied ? '✓ Copied' : '🔗 Share'}
    </button>
  )
}
