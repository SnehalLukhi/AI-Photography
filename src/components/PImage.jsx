import { useEffect, useRef, useState } from 'react'

/**
 * An <img> that shows the Pictrify "P" on a dark tile until the picture has loaded (a page reload, a slow connection, or an image scrolled into view),
 * then fades the picture in, sharpening from a soft blur. It takes the same props as <img>; its parent must be `relative` (the tile) so the placeholder can fill it.
 *
 * A picture that is already fetched (seen before in this visit, or sitting in the browser cache) appears at once: no P, no fade. The P is only shown while a picture is really being fetched: a tile that is still far off screen (its picture is not requested yet) and a picture that failed to load stay a plain dark tile.
 *
 * The pictures are revealed ONE BY ONE in RANDOM order: a loaded picture waits in a shared pool, and every STAGGER_MS (varied a little each time, and faster when the pool is big)
 * one picture is drawn at random and shown, so the tiles twinkle in here and there instead of all popping at once. The P also stays at least MIN_MS so it can be seen even when the picture is cached.
 */
const MIN_MS = 500 // the P is shown at least this long
const STAGGER_MS = 130 // gap between two pictures being revealed
const FADE_MS = 900 // fade of the picture (and of the P)
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const queue = []
let draining = false
function drain() {
  const reveal = queue.splice(Math.floor(Math.random() * queue.length), 1)[0] // a random one of the waiting pictures
  if (!reveal) { draining = false; return }
  draining = true
  const shown = reveal() // false when that tile is gone: no need to wait for it
  setTimeout(drain, shown ? Math.max(40, STAGGER_MS - queue.length * 3) * (0.5 + Math.random()) : 0) // 0.5x to 1.5x, so the rhythm is not regular
}
function revealInTurn(reveal) {
  if (reduced()) { reveal(); return }
  queue.push(reveal)
  if (!draining) drain()
}

const seen = new Set() // pictures that have loaded in this visit: they show instantly the next time (a page revisited, a list re-rendered)

export default function PImage({ src, alt, className = '', style, ...rest }) {
  const [loaded, setLoaded] = useState(false)
  const [waited, setWaited] = useState(false)
  const [show, setShow] = useState(() => seen.has(src))
  const [instant, setInstant] = useState(() => seen.has(src)) // shown without the P and the fade
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined') // close enough to the screen for the browser to be fetching the picture
  const [failed, setFailed] = useState(false)
  const ref = useRef(null)
  const tile = useRef(null)
  useEffect(() => {
    setFailed(false)
    if (seen.has(src) || (ref.current?.complete && ref.current.naturalWidth > 0)) { seen.add(src); setLoaded(true); setWaited(true); setShow(true); setInstant(true); return } // already fetched: show it straight away
    setInstant(false); setLoaded(false); setWaited(false); setShow(false)
    const t = setTimeout(() => setWaited(true), MIN_MS)
    return () => clearTimeout(t)
  }, [src])
  useEffect(() => {
    if (near || !tile.current) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect() } }, { rootMargin: '600px' })
    io.observe(tile.current)
    return () => io.disconnect()
  }, [near])
  useEffect(() => {
    if (!loaded || !waited) return
    let alive = true
    revealInTurn(() => { if (alive) setShow(true); return alive })
    return () => { alive = false }
  }, [loaded, waited, src])
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
  