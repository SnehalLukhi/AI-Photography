import { useState } from 'react'
import { useStudio } from '../context/StudioContext.jsx'
import PImage from './PImage.jsx'

const HeartIcon = ({ on }) => (
  <svg viewBox="0 0 24 24" className={`size-4 ${on ? 'fill-[#FF3DF2] text-[#FF3DF2]' : 'fill-none text-[#FFFFFF]'}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z" />
  </svg>
)

function Fav({ on, toggle }) {
  return (
    <button type="button" aria-label={on ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={on} onClick={(e) => { e.stopPropagation(); toggle() }}
      className="absolute right-2.5 top-2.5 z-20 grid size-9 cursor-pointer place-items-center rounded-full bg-[#1C1C1E]/90 shadow-[0_4px_12px_rgba(0,0,0,0.15)] backdrop-blur-sm transition-transform hover:scale-105 active:scale-90">
      <HeartIcon on={on} />
    </button>
  )
}

/**
 * A "look" card: a rounded picture. On hover / focus the same things appear everywhere: a dark edge vignette, the name at the top-left, and a
 * centred action pill (`action`, default "Use this look") that slides down from above. The picture itself never moves.
 * Touch screens have no hover, so there the FIRST tap "peeks" (shows the same overlay) and the SECOND tap opens the look; tapping elsewhere closes the peek.
 * fav: show the favourite heart. selected: outline the card (the one open in the preview).
 */
export default function TemplateCard({ t, selected, onSelect, fav = false, fit = 'cover', ratio = '9 / 16', objectPos = 'center', action = 'Use this look', className = '' }) {
  const { signedIn, favorites, toggleFavorite, openLogin } = useStudio()
  const [peek, setPeek] = useState(false)
  const liked = favorites.has(t.id) // saved in the database, shared by every card of this template
  const img = `absolute inset-0 h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`
  const touch = () => typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
  const open = () => {
    if (touch() && !peek) { setPeek(true); return } // first tap on a touch screen: show the overlay, do not open yet
    onSelect?.(t)
  }
  return (
    <article tabIndex={0} aria-label={t.name} data-peek={peek} onClick={open} onBlur={() => setPeek(false)} onKeyDown={(e) => e.key === 'Enter' && onSelect?.(t)}
      className={`group flex w-full animate-fade-in cursor-pointer flex-col gap-3 rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${className}`}>
      <div style={{ aspectRatio: ratio }} className={`card-orbit relative w-full overflow-hidden rounded-[6px] bg-[#191919] ${selected ? 'outline outline-2 outline-offset-2 outline-[#FF3DF2]' : ''}`}>
        <PImage src={t.image} alt={t.name} loading="lazy" draggable="false" className={`${img}`} style={{ objectPosition: objectPos }} />
        {/* dark vignette (darkest at the edges, light in the centre), inside the picture only */}
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_closest-side_at_center,rgba(0,0,0,0.03)_30%,rgba(0,0,0,0.5)_100%)] opacity-0 [transition:opacity_350ms_ease] group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[peek=true]:opacity-100" aria-hidden="true" />
        {fav && <Fav on={liked} toggle={() => (signedIn ? toggleFavorite(t.id) : openLogin())} />}
        {/* the name: plain text at the top-left of the picture (no bar behind it) */}
        <span className={`pointer-events-none absolute inset-x-0 top-0 z-10 pb-6 pl-3 pt-3.5 opacity-0 [transition:opacity_350ms_ease] group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[peek=true]:opacity-100 ${fav ? 'pr-12' : 'pr-3'}`}>
          <span className="block break-words text-[14px] font-semibold leading-snug text-white drop-shadow-[0_1px_5px_rgba(0,0,0,0.85)]">{t.name}</span>
        </span>
        {/* the action pill: centred (left/top 50% + translate -50%), slides down from above into the centre; hovering the pill itself turns it theme pink */}
        <span className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-11 min-w-[160px] items-center justify-center whitespace-nowrap rounded-[14px] bg-white px-7 text-[14px] max-md:h-10 max-md:min-w-0 max-md:px-5 max-md:text-[13px] [transform:translate(-50%,calc(-50%-64px))] font-semibold text-[#000000] opacity-0 shadow-[0_8px_20px_rgba(0,0,0,0.3)] [transition:opacity_450ms_ease,transform_520ms_cubic-bezier(0.22,1,0.36,1),background-color_250ms_ease,color_250ms_ease,box-shadow_250ms_ease] will-change-[opacity,transform] group-hover:pointer-events-auto group-hover:opacity-100 group-hover:[transform:translate(-50%,-50%)] group-focus-visible:opacity-100 group-focus-visible:[transform:translate(-50%,-50%)] group-data-[peek=true]:pointer-events-auto group-data-[peek=true]:opacity-100 group-data-[peek=true]:[transform:translate(-50%,-50%)] hover:!bg-[#FF3DF2] hover:!text-[#000000] hover:shadow-[0_10px_28px_-8px_rgba(255,61,242,0.65)]">{action}</span>
      </div>
    </article>
  )
}
