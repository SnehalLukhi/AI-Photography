import { useState } from 'react'

const HeartIcon = ({ on }) => (
  <svg viewBox="0 0 24 24" className={`relative z-10 h-[18px] w-5 ${on ? 'fill-[#B070FA] text-[#B070FA]' : 'fill-none text-white'}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z" />
  </svg>
)

function Fav({ on, toggle }) {
  return (
    <div className="absolute right-2 top-2 z-40">
      <button type="button" aria-label={on ? 'Remove from favorites' : 'Add to favorites'} onClick={(e) => { e.stopPropagation(); toggle() }} className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center transition-transform active:scale-90">
        <span className="absolute inset-0 rounded-full bg-[rgba(0,0,0,0.7)] backdrop-blur-sm" />
        <HeartIcon on={on} />
      </button>
    </div>
  )
}

const pad = (n) => String(n).padStart(2, '0')

/**
 * Template tile: a clean image tile at the photo's own ratio (never cropped: object-contain), thin hairline border, no text on it.
 * On hover / keyboard focus a panel grows 92px below the tile with the same image, the template name and a "Use Template" button.
 * Touch screens (no hover) get a small name label on the tile instead. fav: show the favourite heart (Explore).
 */
export default function TemplateCard({ t, selected, onSelect, fav = false, fit = 'contain', ratio = '9 / 16', objectPos = 'center', className = '' }) {
  const [liked, setLiked] = useState(false)
  const img = `absolute inset-0 h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`
  const imgStyle = { objectPosition: objectPos }
  const use = (e) => { e.stopPropagation(); onSelect?.(t) }
  const cat = t.category && t.category !== 'Templates' ? t.category : ''
  const info = [t.index ? `FR ${pad(t.index)}` : '', cat].filter(Boolean).join(' · ')
  return (
    <article tabIndex={0} title={info ? `${t.name} - ${info}` : t.name} onClick={() => onSelect?.(t)} onKeyDown={(e) => e.key === 'Enter' && onSelect?.(t)}
      className={`group relative z-10 w-full animate-fade-in cursor-pointer overflow-visible rounded-[6px] outline-none hover:z-30 focus-within:z-30 focus-visible:ring-2 focus-visible:ring-[#B070FA]/60 ${className}`}>
      <div style={{ aspectRatio: ratio }} className={`relative w-full overflow-hidden rounded-[6px] border bg-[#000000] ${selected ? 'border-[#B070FA] ring-1 ring-[#B070FA]' : 'border-[#3A3552]'}`}>
        <img src={t.image} alt={t.name} loading="lazy" draggable="false" className={img} style={imgStyle} />
        {selected && <span className="grad-bg absolute left-2 top-2 z-10 grid size-6 place-items-center rounded-full text-xs">✓</span>}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-8 [@media(hover:none)]:block">
          <span className="block truncate text-[11px] font-medium text-white">{t.name}</span>
        </div>
      </div>
      {fav && <Fav on={liked} toggle={() => setLiked(!liked)} />}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-full flex-col overflow-hidden rounded-[6px] border border-[#3A3552] bg-gradient-to-br from-[#2A1B52] to-[#1A284F] opacity-0 shadow-[0_20px_35px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out group-hover:pointer-events-auto group-hover:h-[calc(100%+92px)] group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:h-[calc(100%+92px)] group-focus-within:opacity-100">
        <div style={{ aspectRatio: ratio }} className="relative w-full shrink-0 overflow-hidden rounded-t-[6px] bg-[#000000]">
          <img src={t.image} alt="" draggable="false" className={img} style={imgStyle} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[12%] bg-gradient-to-t from-[#1A284F] to-transparent" />
        </div>
        <div className="flex min-h-[92px] flex-1 flex-col justify-between bg-gradient-to-br from-[#2A1B52] to-[#1A284F] p-3">
          <h3 className="w-full truncate px-0.5 text-left font-sans text-[13px] font-medium leading-tight !text-[#ffffff] sm:text-[14px]">{t.name}</h3>
          <button type="button" onClick={use} tabIndex={-1} className="grad-bg mt-2 flex h-[38px] w-full cursor-pointer items-center justify-center rounded-[8px] text-[13px] font-semibold shadow-[0px_0px_15px_0px_rgba(176,112,250,0.2)]">
            {selected ? 'Selected ✓' : 'Use Template'}
          </button>
        </div>
      </div>
    </article>
  )
}
