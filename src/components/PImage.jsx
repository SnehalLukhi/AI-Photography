import { useEffect, useRef, useState } from 'react'

/**
 * An <img> that shows the Pictrify "P" on a dark tile until the picture has loaded (a page reload, a slow connection, or an image scrolled into view),
 * then fades the picture in, sharpening from a soft blur. It takes the same props as <img>; its parent must be `relative` (the tile) so the placeholder can fill it.
 *
 * Each picture is shown as soon as IT has loaded: there is no minimum time for the P and no queue behind other pictures. A picture that is already fetched (seen before
 * in this visit, or sitting in the browser cache) appears at once, without the P and without the fade. The P is only shown while a picture is really being fetched:
 * a tile that is still far off screen (its picture is not requested yet) and a picture that failed to load stay a plain dark tile.
 */
const FADE_MS = 900 // fade of the picture (and of the P)
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'
const seen = new Set() // pictures that have loaded in this visit: they show instantly the next time (a page revisited, a list re-rendered)

export default function PImage({ src, alt, className = '', style, ...rest }) {
  const [loaded, setLoaded] = useState(() => seen.has(src))
  const [instant, setInstant] = useState(() => seen.has(src)) // shown without the P and the fade
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined') // close enough to the screen for the browser to be fetching the picture
  const [failed, setFailed] = useState(false)
  const ref = useRef(null)
  const tile = useRef(null)
  useEffect(() => {
    setFailed(false)
    if (seen.has(src) || (ref.current?.complete && ref.current.naturalWidth > 0)) { seen.add(src); setLoaded(true); setInstant(true); return } // already fetched: show it straight away
    setInstant(false); setLoaded(false)
  }, [src])
  useEffect(() => {
    if (near || !tile.current) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect() } }, { rootMargin: '600px' })
    io.observe(tile.current)
    return () => io.disconnect()
  }, [near])
  const show = loaded
  const t = `${FADE_MS}ms ${EASE}`
  return (
    <>
      <span ref={tile} aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center bg-[#0A0809]" style={{ opacity: show ? 0 : 1, transition: instant ? 'none' : `opacity ${t}` }}>
        {near && !failed && <img src="/images/features/logo-mark.svg" alt="" draggable="false" className="pimage-pulse w-[40%] max-w-[130px]" />}
      </span>
      <img ref={ref} src={src} alt={alt} onLoad={() => { seen.add(src); setLoaded(true) }} onError={() => setFailed(true)} className={className} {...rest}
        style={{ ...style, opacity: show ? 1 : 0, filter: show ? 'blur(0)' : 'blur(8px)', transition: instant ? 'none' : `opacity ${t}, filter ${t}` }} />
    </>
  )
}
