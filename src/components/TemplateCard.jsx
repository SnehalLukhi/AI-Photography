import { useStudio } from '../context/StudioContext.jsx'
import PImage from './PImage.jsx'

const HeartIcon = ({ on }) => (
  <svg viewBox="0 0 24 24" className={`size-4 ${on ? 'fill-[#C026D3] text-[#C026D3]' : 'fill-none text-[#FFFFFF]'}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z" />
  </svg>
)

function Fav({ on, toggle }) {
  return (
    <button type="button" aria-label={on ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={on} onClick={(e) => { e.stopPropagation(); toggle() }}
      className="absolute right-2.5 top-2.5 z-20 grid size-9 cursor-pointer place-items-center rounded-full bg-[#12101B]/90 shadow-[0_4px_12px_rgba(0,0,0,0.15)] backdrop-blur-sm transition-transform hover:scale-105 active:scale-90">
      <HeartIcon on={on} />
    </button>
  )
}

/**
 * A "look" card: a rounded picture, the name and its collection underneath. On hover / focus an action pill appears over the picture
 * (`action`, default "Use this look"). fav: show the favourite heart. selected: outline the card (the one open in the preview).
 */
export default function TemplateCard({ t, selected, onSelect, fav = false, fit = 'cover', ratio = '9 / 16', objectPos = 'center', action = 'Use this look', className = '' }) {
  const { signedIn, favorites, toggleFavorite, openLogin } = useStudio()
  const liked = favorites.has(t.id) // saved in the database, shared by every card of this template
  const img = `absolute inset-0 h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`
  return (
    <article tabIndex={0} aria-label={t.name} onClick={() => onSelect?.(t)} onKeyDown={(e) => e.key === 'Enter' && onSelect?.(t)}
      className={`group flex w-full animate-fade-in cursor-pointer flex-col gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] ${className}`}>
      <div style={{ aspectRatio: ratio }} className={`relative w-full overflow-hidden rounded-xl bg-[#12101B] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.14)] ${selected ? 'outline outline-2 outline-offset-2 outline-[#8B5CF6]' : ''}`}>
        <PImage src={t.image} alt={t.name} loading="lazy" draggable="false" className={`${img} transition-transform duration-500 group-hover:scale-[1.04]`} style={{ objectPosition: objectPos }} />
        {fav && <Fav on={liked} toggle={() => (signedIn ? toggleFavorite(t.id) : openLogin())} />}
        {/* the name: top-left inside the image, revealed on hover / keyboard focus (always shown on touch screens, which have no hover); no category name */}
        <span className={`pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 via-black/30 to-transparent pb-6 pl-3 pt-3 transition-opacity duration-300 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-visible:opacity-100 ${fav ? 'pr-12' : 'pr-3'}`}>
          <span className="block truncate text-[14px] font-semibold leading-snug text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">{t.name}</span>
        </span>
        <span className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex h-10 translate-y-1 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-[#08080D] opacity-0 shadow-[0_8px_20px_rgba(0,0,0,0.3)] transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">{action}</span>
      </div>
    </article>
  )
}
