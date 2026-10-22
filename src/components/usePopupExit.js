import { useCallback, useEffect, useRef, useState } from 'react'

const EXIT_MS = 200

/**
 * Shared popup behaviour (same as the Welcome popup): play the short exit animation (`welcome-closing` class) and only then call `finish`,
 * close on Escape, and lock page scroll while open. No animation / no delay when the user prefers reduced motion.
 */
export default function usePopupExit(finish) {
  const [closing, setClosing] = useState(false)
  const timer = useRef()
  const close = useCallback((...args) => {
    if (timer.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(...args); return }
    setClosing(true)
    timer.current = setTimeout(() => finish(...args), EXIT_MS)
  }, [finish])
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [close])
  return [closing, close]
}
