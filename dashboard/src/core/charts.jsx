import { useState } from 'react'

/** Small dependency-free SVG charts. */

/** Area chart over time: data = [{ label, value }]. Hover shows the exact value. */
export function AreaChart({ data, height = 220 }) {
  const [hover, setHover] = useState(null)
  const W = 640, H = height, pad = { l: 34, r: 12, t: 12, b: 26 }
  const max = Math.max(1, ...data.map((d) => d.value))
  const nice = Math.max(1, Math.ceil(max / 4) * 4)
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, data.length - 1)
  const y = (v) => pad.t + (1 - v / nice) * (H - pad.t - pad.b)
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(data.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`
  const move = (e) => { const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1))))) }
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseMove={move} onMouseLeave={() => setHover(null)} role="img" aria-label="Chart">
        <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8B6CFF" stopOpacity=".5" /><stop offset="1" stopColor="#8B6CFF" stopOpacity="0" /></linearGradient>
          <linearGradient id="stroke" x1="0" x2="1"><stop offset="0" stopColor="#8B6CFF" /><stop offset="1" stopColor="#FF5CA8" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map((i) => { const v = (nice / 4) * i; return <g key={i}><line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,.07)" /><text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,.35)">{Math.round(v)}</text></g> })}
        {data.map((d, i) => (i % Math.ceil(data.length / 6) === 0 ? <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,.35)">{d.label}</text> : null))}
        <path d={area} fill="url(#area)" />
        <path d={line} fill="none" stroke="url(#stroke)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {hover != null && <g><line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="rgba(255,255,255,.2)" strokeDasharray="3 3" /><circle cx={x(hover)} cy={y(data[hover].value)} r="5" fill="#fff" stroke="#8B6CFF" strokeWidth="3" /></g>}
      </svg>
      {hover != null && (
        <div className="pointer-events-none absolute top-2 rounded-lg border border-line bg-raised px-3 py-1.5 text-xs shadow-xl" style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > data.length / 2 ? '-110%' : '10%'})` }}>
          <p className="text-white/50">{data[hover].full || data[hover].label}</p><p className="font-semibold text-white">{data[hover].value.toLocaleString()}</p>
        </div>
      )}
    </div>
  )
}

const COLORS = ['#8B6CFF', '#FF5CA8', '#34D399', '#FBBF24', '#38BDF8', '#F87171']
export const chartColor = (i) => COLORS[i % COLORS.length]

/** Donut: data = [{ label, value }]. */
export function Donut({ data, size = 170, center }) {
  const total = data.reduce((n, d) => n + d.value, 0)
  const r = 62, c = 2 * Math.PI * r
  let offset = 0
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} role="img" aria-label="Breakdown">
      <circle cx="80" cy="80" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="16" />
      {total > 0 && data.map((d, i) => { const len = (d.value / total) * c; const seg = <circle key={d.label} cx="80" cy="80" r={r} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="16" strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} transform="rotate(-90 80 80)" strokeLinecap="round" />; offset += len; return seg })}
      {center && <><text x="80" y="78" textAnchor="middle" fontSize="26" fontWeight="700" fill="#fff" fontFamily="Bricolage Grotesque, Inter">{center.value}</text><text x="80" y="96" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,.45)">{center.label}</text></>}
    </svg>
  )
}
