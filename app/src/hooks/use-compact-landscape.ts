import { useEffect, useState } from 'react'
export const COMPACT_LANDSCAPE = '(orientation: landscape) and (max-height: 500px)'
export function useCompactLandscape(): boolean {
  const [compact,setCompact] = useState(() => window.matchMedia(COMPACT_LANDSCAPE).matches)
  useEffect(() => {
    const media = window.matchMedia(COMPACT_LANDSCAPE)
    const update = () => setCompact(media.matches)
    media.addEventListener('change',update)
    return () => media.removeEventListener('change',update)
  },[])
  return compact
}
