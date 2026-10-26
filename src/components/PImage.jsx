import { useEffect, useRef, useState } from 'react'

/**
 * An <img> that shows the Pictrify "P" on a dark tile until the picture has loaded (a page reload, a slow connection, or an image scrolled into view),
 * then fades the picture in, sharpening from a soft blur. It takes the same props as <img>; its parent must be `relative` (the tile) so the placeholder can fill it.
 *
 * Each picture is shown as soon as IT has loaded (or is already in the cache): there is no minimum time for the P and no queue behind other pictures.
 */
const FADE_MS = 900 // fade of the picture (and of the P)
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'

export default function PImage({ src, alt, className = '', style, ...rest }) {
  const [loaded, setLoaded] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    setLoaded(!!ref.current?.complete && ref.current.naturalWidth > 0) // already in the cache: shown at once
  }, [src])
  const show = loaded
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
  