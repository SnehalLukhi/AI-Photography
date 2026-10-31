// Two comets orbiting the border of the element it sits in (the parent needs class "glow-border"; its border-radius goes in --streak-r and the lap time in --streak-lap).
// Each comet is a row of many tiny dash segments on a rounded-rect stroke (so it bends round the corners). Going back from the head, each segment is a little
// fainter and a little pinker than the one before, so the comet is one smooth blend: white head -> pink -> faded out, with no visible steps or separate colours.
const SEGMENTS = 90
const mix = (t) => `rgb(255, ${Math.round(255 - 194 * t)}, ${Math.round(255 - 13 * t)})` // 0 = white ... 1 = theme pink #FF3DF2

const cache = new Map()
// tail = length of the comet's tail in % of the border's perimeter (7.5 is about 120px on the hero bar; a small card needs a larger % for the same length)
function segments(tail) {
  if (!cache.has(tail)) {
    const seg = tail / SEGMENTS
    cache.set(tail, Array.from({ length: SEGMENTS }, (_, j) => {
      const d = j * seg // distance behind the head
      const u = d / tail // 0 at the head ... 1 at the end of the tail
      return { dash: `0 ${100 - seg * 1.3 - d} ${seg * 1.3} ${d}`, color: mix(Math.min(1, u / 0.55)), opacity: (0.95 * (1 - u) ** 1.7).toFixed(3) }
    }))
  }
  return cache.get(tail)
}

export default function GlowBorder({ tail = 7.5 }) {
  const parts = segments(tail)
  return (
    <svg className="glow-border__svg" aria-hidden="true" focusable="false">
      {['gb-a', 'gb-b'].map((g) => (
        <g key={g} className={g}>
          {parts.map((p, i) => <rect key={i} className="gb-path" pathLength="100" style={{ strokeDasharray: p.dash, stroke: p.color, strokeOpacity: p.opacity }} />)}
        </g>
      ))}
    </svg>
  )
}
