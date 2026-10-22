import { useEffect, useRef } from 'react'

const COLORS = ['#FBBF24', '#F0389A', '#8B1CFF', '#22D3EE', '#34D399', '#FF6A28', '#FFFFFF']
const COUNT = 110
const DURATION = 2800

/** Celebration burst played once when a popup opens: confetti pieces and streamers shoot out from the card centre, then fall and fade. Skipped for reduced motion. */
export default function Confetti() {
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
      const a = Math.random() * Math.PI * 2
      const v = 5 + Math.random() * 9
      return {
        x: w / 2, y: h / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4,
        s: 5 + Math.random() * 6, streamer: Math.random() < 0.2, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
        c: COLORS[(Math.random() * COLORS.length) | 0], wob: Math.random() * 6.28,
      }
    })
    let raf, start
    const tick = (t) => {
      start ??= t
      const k = (t - start) / DURATION
      ctx.clearRect(0, 0, w, h)
      for (const p of parts) {
        p.vx *= 0.985; p.vy = p.vy * 0.985 + 0.22
        p.x += p.vx + Math.sin((p.wob += 0.12)) * 0.6; p.y += p.vy; p.rot += p.vr
        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, (1 - k) * 2))
        ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c
        if (p.streamer) ctx.fillRect(-1.5, -p.s * 2, 3, p.s * 4)
        else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2)
        ctx.restore()
      }
      if (k < 1) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, w, h)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[310] size-full" />
}
