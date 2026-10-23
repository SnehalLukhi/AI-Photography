import { useEffect, useRef, useState } from 'react'

/**
 * An <img> that shows the Pixora "P" on a dark tile until the picture has loaded (a page reload, a slow connection, or an image scrolled into view),
 * then fades the picture in, sharpening from a soft blur. It takes the same props as <img>; its parent must be `relative` (the tile) so the placeholder can fill it.
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

export default function PImage({ src, alt, className = '', style, ...rest }) {
  const [loaded, setLoaded] = useState(false)
  const [waited, setWaited] = useState(false)
  const [show, setShow] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    setLoaded(!!ref.current?.complete && ref.current.naturalWidth > 0) // already in the cache: loaded at once, but the P still waits for its turn
    setWaited(false); setShow(false)
    const t = setTimeout(() => setWaited(true), MIN_MS)
    return () => clearTimeout(t)
  }, [src])
  useEffect(() => {
    if (!loaded || !waited) return
    let alive = true
    revealInTurn(() => { if (alive) setShow(true); return alive })
    return () => { alive = false }
  }, [loaded, waited, src])
  const t = `${FADE_MS}ms ${EASE}`
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center bg-[#0A0809]" style={{ opacity: show ? 0 : 1, transition: `opacity ${t}` }}>
        <img src="/images/features/logo-mark.svg" alt="" draggable="false" className="pimage-pulse w-[40%] max-w-[130px]" />
      </span>
      <img ref={ref} src={src} alt={alt} onLoad={() => setLoaded(true)} className={className} {...rest}
        style={{ ...style, opacity: show ? 1 : 0, filter: show ? 'blur(0)' : 'blur(8px)', transition: `opacity ${t}, filter ${t}` }} />
    </>
  )
}
  