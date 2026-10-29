// Two pale comets orbiting the border of the element it sits in (the parent needs class "glow-border" and its border-radius in --streak-r).
// Each comet is a stack of dashes of falling length behind a sharp head, drawn on a rounded-rect stroke so it bends round the corners.
const TAIL = ['gb-1', 'gb-2', 'gb-3', 'gb-4', 'gb-5', 'gb-6', 'gb-7', 'gb-head']

export default function GlowBorder() {
  return (
    <svg className="glow-border__svg" aria-hidden="true" focusable="false">
      {['gb-a', 'gb-b'].map((g) => (
        <g key={g} className={g}>
          {TAIL.map((c) => <rect key={c} className={`gb-path ${c}`} pathLength="100" />)}
        </g>
      ))}
    </svg>
  )
}
