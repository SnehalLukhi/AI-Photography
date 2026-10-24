import { useEffect, useState } from 'react'
import { getTrending, cachedTrending } from './aiPhotography.js'

/** The ids of the templates marked as Trending in the admin, in display order; null until known (or when none are set, the built-in picks are used instead). */
export function useTrending() {
  const [ids, setIds] = useState(cachedTrending)
  useEffect(() => { let alive = true; getTrending().then((l) => { if (alive) setIds(l) }).catch(() => {}); return () => { alive = false } }, [])
  return ids?.length ? ids : null
}
