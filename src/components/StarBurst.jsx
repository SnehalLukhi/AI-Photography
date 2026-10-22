import { useEffect, useRef } from 'react'

const HOLD_MS = 550 // the big star stays this long, then bursts while the card flips in (matches `offer-card` delay in index.css)
const LIFE_MS = 2200
const COUNT = 46

const starPoints = (cx, cy, outer, inner) =>
  Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? inner : outer; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] })

const HERO = starPoints(50, 52, 34, 17).map((p) => p.join(',')).join(' ')

/** Special-offer entrance: a big glossy star pops in, holds, then bursts into small gold stars while a glowing ring expands behind the flipping card. Skipped for reduced motion. */
export default function StarBurst() {
  const ref = useRef(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = window.innerWidth, h = window.innerHeight
    canvas.width = w * dpr; canvas.height = h * dpr
    ctx.scale(dpr, dpr)
    const parts = Array.from({ length: COUNT }, () => {
      const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 9
      return { x: w / 2, y: h / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, r: 5 + Math.random() * 10, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.15, c: Math.random() < 0.8 ? '#FFD60A' : '#FFF08A' }
    })
    let raf, start
    const tick = (t) => {
      start ??= t
      const el = t - start - HOLD_MS
      ctx.clearRect(0, 0, w, h)
      if (el >= 0) {
        const k = el / LIFE_MS
        for (const p of parts) {
          p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.12
          p.x += p.vx; p.y += p.vy; p.rot += p.vr
          ctx.save()
          ctx.globalAlpha = Math.max(0, Math.min(1, (1 - k) * 1.6))
          ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c
          ctx.beginPath()
          starPoints(0, 0, p.r, p.r * 0.45).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
          ctx.closePath(); ctx.fill()
          ctx.restore()
        }
      }
      if (el < LIFE_MS) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, w, h)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[310] grid place-items-center">
      <canvas ref={ref} className="absolute inset-0 size-full" />
      <span className="star-ring" />
      <svg className="star-hero size-[150px]" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="star-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF59D" /><stop offset="1" stopColor="#F59E0B" /></linearGradient>
        </defs>
        <polygon points={HERO} fill="url(#star-fill)" stroke="url(#star-fill)" strokeWidth="9" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.6))' }} />
      </svg>
    </div>
  )
}
