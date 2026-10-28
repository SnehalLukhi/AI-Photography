import { useStudio } from '../context/StudioContext.jsx'
import PImage from './PImage.jsx'

const HeartIcon = ({ on }) => (
  <svg viewBox="0 0 24 24" className={`size-4 ${on ? 'fill-[#FAFAFA] text-[#FAFAFA]' : 'fill-none text-[#FAFAFA]'}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z" />
  </svg>
)

function Fav({ on, toggle }) {
  return (
    <button type="button" aria-label={on ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={on} onClick={(e) => { e.stopPropagation(); toggle() }}
      className="absolute right-2 top-2 z-20 grid size-8 cursor-pointer place-items-center rounded-md bg-[#0A0809]/80 backdrop-blur-sm transition-transform hover:bg-[#0A0809] active:scale-90">
      <HeartIcon on={on} />
    </button>
  )
}

/**
 * A "look" card: a 9:16 picture with a hairline border, the name and its collection underneath. On hover / focus a bar appears over the picture
 * (`action`, default "Use this look"). fav: show the favourite heart. selected: outline the card (the one open in the preview).
 */
export default function TemplateCard({ t, selected, onSelect, fav = false, fit = 'cover', ratio = '9 / 16', objectPos = 'center', action = 'Use this look', className = '' }) {
  const { signedIn, favorites, toggleFavorite, openLogin } = useStudio()
  const liked = favorites.has(t.id) // saved in the database, shared by every card of this template
  const img = `absolute inset-0 h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`
  const group = t.category && t.category !== 'Templates' ? t.category : ''
  return (
    <article tabIndex={0} aria-label={t.name} onClick={() => onSelect?.(t)} onKeyDown={(e) => e.key === 'Enter' && onSelect?.(t)}
      className={`group flex w-full animate-fade-in cursor-pointer flex-col gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#B653F6] ${className}`}>
      <div style={{ aspectRatio: ratio }} className={`relative w-full overflow-hidden rounded-md bg-[#0A0809] ${selected ? 'outline outline-2 outline-offset-0 outline-[#B653F6]' : 'border border-[#2C2529] group-hover:border-[#B4B0C0]'}`}>
        <PImage src={t.image} alt={t.name} loading="lazy" draggable="false" className={img} style={{ objectPosition: objectPos }} />
        {fav && <Fav on={liked} toggle={() => (signedIn ? toggleFavorite(t.id) : openLogin())} />}
        <span className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex h-9 translate-y-1 items-center justify-center rounded bg-[#0A0809]/90 text-[13px] font-medium text-[#FAFAFA] opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">{action}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h3 className="truncate text-[14px] font-medium leading-snug text-[#FAFAFA]">{t.name}</h3>
        {group && <p className="truncate font-plexmono text-[11px] uppercase tracking-[0.06em] text-[#B4B0C0]">{group}</p>}
      </div>
    </article>
  )
}
