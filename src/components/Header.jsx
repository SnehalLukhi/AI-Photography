import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { brandImages } from '../data/images.js'
import { useStudio } from '../context/StudioContext.jsx'

export const SparkIcon = ({ className = 'size-3.5 text-[#B070FA]' }) => (
  <svg className={`${className} shrink-0`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.2 6.3L21 10l-6.8 1.7L12 18l-2.2-6.3L3 10l6.8-1.7z" /></svg>
)
const Chevron = ({ open }) => (
  <svg className={`size-3 text-[#C4B5FD]/75 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const PhoneIcon = () => (
  <svg className="size-3.5 text-[#B070FA]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" strokeLinecap="round" /></svg>
)

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'
export const Logo = ({ size = 'md', imgHeight, fontSize }) => (
  <Link to="/" className="group inline-flex shrink-0 items-center gap-2.5">
    <img src={brandImages.logo} alt="Logo" style={imgHeight ? { height: imgHeight, transition: `height 420ms ${EASE}` } : undefined} className={`gold-img w-auto rounded-[10px] object-contain ${imgHeight ? '' : size === 'lg' ? 'h-10' : 'h-8'}`} />
    <span style={fontSize ? { fontSize, transition: `font-size 420ms ${EASE}` } : undefined} className={`whitespace-nowrap font-display font-bold tracking-tight text-white ${fontSize ? '' : size === 'lg' ? 'text-2xl' : 'text-xl'}`}>Pixora</span>
  </Link>
)

/** Glymo behaviour: header "floats" as a rounded pill once the page has scrolled more than 20px (no hide-on-scroll-up). */
function useScrolled(threshold = 20) {
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > threshold)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > threshold)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [threshold])
  return scrolled
}
function useXl() {
  const [xl, setXl] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches)
  useEffect(() => {
    const q = window.matchMedia('(min-width: 1280px)')
    const f = () => setXl(q.matches)
    q.addEventListener('change', f)
    return () => q.removeEventListener('change', f)
  }, [])
  return xl
}

const main = [
  { to: '/', label: 'Home' },
  { to: '/explore', label: 'Explore' },
]

function GetApp({ small }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative shrink-0" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" onClick={() => setOpen(!open)} className={`flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] font-medium text-white transition-colors hover:border-[#B070FA]/60 hover:bg-[#B070FA]/10 ${small ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-[13px]'}`}>
        <PhoneIcon /><span>Get App</span><Chevron open={open} />
      </button>
      <div className={`absolute right-0 top-full z-50 w-[200px] pt-2.5 transition-all duration-300 ${open ? 'visible translate-y-0 opacity-100' : 'pointer-events-none invisible -translate-y-2 opacity-0'}`}>
        <div className="relative flex flex-col items-center space-y-2.5 rounded-2xl border border-[#B070FA]/20 bg-gradient-to-br from-[#2A1B52]/95 to-[#1A284F]/95 p-3.5 text-center shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          <span aria-hidden="true" className="absolute -top-[6px] right-10 size-2.5 rotate-45 border-l border-t border-[#B070FA]/20 bg-gradient-to-br from-[#2A1B52] to-[#1A284F]" />
          <div className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#B070FA]/15 px-2 py-1 text-[11px] font-semibold text-white">Android App</div>
          <div className="my-0.5 rounded-xl bg-white p-1.5 shadow-inner transition-transform hover:scale-105"><img src={brandImages.qr} alt="QR code" className="size-24 rounded-md object-contain" /></div>
          <p className="text-[10px] font-medium leading-tight text-[#C4B5FD]">Scan for the app</p>
        </div>
      </div>
    </div>
  )
}

/** Compact coin badge (74 x 32, border-box) for signed-in users: the existing coin.svg + the welcome-coin amount. Display only - there is no coin balance in the app. The whole badge links to the Pricing page. */
const CoinBadge = ({ className = '' }) => {
  const { coins } = useStudio()
  return (
  <Link to="/coins" aria-label={`${coins} coins - get more coins`} className={`box-border inline-flex h-8 min-w-[74px] shrink-0 cursor-pointer select-none items-center justify-center gap-2 rounded-full border border-[#34343c] bg-[#17171c] px-[11px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-[border-color,background-color,box-shadow] duration-200 hover:border-[#B070FA]/60 hover:bg-[#1d1b26] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_14px_rgba(176,112,250,0.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B070FA] ${className}`}>
    <img src={brandImages.coin} alt="" width="22" height="22" className="size-[22px] shrink-0 object-contain" />
    <span className="text-[15px] font-bold leading-none tabular-nums text-white">{coins.toLocaleString()}</span>
  </Link>
  )
}

// Profile dropdown (signed-in users). Name / e-mail come from the saved demo session: there is no profile page and no stored display name, so the name is derived
// from the e-mail. Every item opens an existing route; Log out clears the saved demo session (there is no real auth provider).
const PROFILE_ITEMS = [
  ['/transactions', 'Transactions', 'M4 7h16M4 12h16M4 17h10'],
  ['/transfer', 'Connect App Account', 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1'],
  ['/help', 'Help', 'M9.5 9a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17.2v.1M12 21a9 9 0 100-18 9 9 0 000 18z'],
  ['/contact-us', 'Contact Support', 'M4 6h16v12H4zM4 7l8 6 8-6'],
  ['/feedback', 'Share Your Feedback', 'M4 5h16v11H9l-5 4z'],
  ['/privacy-policy', 'Privacy Policy', 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z'],
]
export const displayName = (email) => (email.split('@')[0] || '').split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') || 'Pixora user'

function ProfileMenu() {
  const { userEmail, signOut } = useStudio()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const btn = useRef(null)
  const panel = useRef(null)
  const timer = useRef(null)
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState(false) // mounted (stays mounted briefly while the close animation plays)
  const [pos, setPos] = useState({ top: 0, right: 12 })
  const name = displayName(userEmail || '')
  const initial = (name[0] || 'P').toUpperCase()

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect()
    if (r) setPos({ top: Math.round(r.bottom + 10), right: Math.max(12, Math.round(window.innerWidth - r.right)) })
  }, [])
  const close = useCallback((focus) => {
    clearTimeout(timer.current)
    setOpen(false)
    timer.current = setTimeout(() => setShown(false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 120)
    if (focus) btn.current?.focus()
  }, [])
  const toggle = () => { if (open) { close(); return } clearTimeout(timer.current); place(); setShown(true); setOpen(true) }

  useLayoutEffect(() => { if (open) place() }, [open, place])
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { if (open) close() }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return
    const down = (e) => { if (!panel.current?.contains(e.target) && !btn.current?.contains(e.target)) close() }
    const key = (e) => { if (e.key === 'Escape') close(true) }
    window.addEventListener('mousedown', down); window.addEventListener('touchstart', down); window.addEventListener('keydown', key)
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('mousedown', down); window.removeEventListener('touchstart', down); window.removeEventListener('keydown', key); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open, close, place])

  return (
    <>
      <button ref={btn} type="button" onClick={toggle} aria-label="Open profile menu" aria-haspopup="menu" aria-expanded={open}
        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full bg-gradient-to-br from-[#B070FA] to-[#F066D8] text-[14px] font-bold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)] transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B070FA] active:scale-95">{initial}</button>
      {shown && createPortal(
        <div ref={panel} role="menu" aria-label="Profile" data-closing={!open} style={{ top: pos.top, right: pos.right }}
          className="profile-menu fixed z-[400] w-[300px] max-w-[calc(100vw-24px)] rounded-2xl border border-white/10 bg-[#16161c] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.65)]">
          <Link to="/profile" role="menuitem" onClick={() => close()} className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/[0.07] focus-visible:bg-white/[0.07] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#B070FA]">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#B070FA] to-[#F066D8] text-[16px] font-bold text-white">{initial}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-white">{name}</span>
              <span className="block truncate text-xs text-[#C4B5FD]/75" title={userEmail}>{userEmail}</span>
            </span>
            <svg className="size-4 shrink-0 text-[#C4B5FD]/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </Link>
          <div className="my-1.5 h-px bg-white/10" />
          {PROFILE_ITEMS.map(([to, label, d]) => (
            <Link key={to} to={to} role="menuitem" onClick={() => close()}
              className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[14px] font-medium text-[#E4DDFB] transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:bg-white/[0.07] focus-visible:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#B070FA]">
              <svg className="size-[18px] shrink-0 text-[#B070FA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
              {label}
            </Link>
          ))}
          <div className="my-1.5 h-px bg-white/10" />
          <button type="button" role="menuitem" onClick={() => { close(); signOut(); nav('/login') }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-[14px] font-medium text-[#E4DDFB] transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:bg-white/[0.07] focus-visible:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#B070FA]">
            <svg className="size-[18px] shrink-0 text-[#B070FA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" /></svg>
            Log out
          </button>
        </div>, document.body)}
    </>
  )
}

const Claim = ({ small }) => {
  const { signedIn } = useStudio()
  if (signedIn) return <CoinBadge />
  return (
  <Link to="/login" className={`group btn-grad shrink-0 ${small ? '!h-8 !gap-1.5 !px-3 !py-0 !text-[11px]' : '!h-10 !gap-2 !px-5 !py-0 !text-[13px]'}`}>
    <SparkIcon className="size-3.5 text-white transition-transform group-hover:scale-110" />
    <span className="whitespace-nowrap">Claim 50 Coins</span>
  </Link>
  )
}

const navLink = ({ isActive }) => `relative rounded-full px-4 py-2 text-[14px] font-medium leading-normal whitespace-nowrap transition-colors cursor-pointer ${isActive ? 'bg-[#B070FA]/15 text-white ring-1 ring-inset ring-[#B070FA]/30' : 'text-[#C4B5FD] hover:bg-white/[0.06] hover:text-white'}`
const Underline = () => null
const DLink = ({ to, children }) => (
  <NavLink to={to} end={to === '/'} className={navLink}>
    {({ isActive }) => <>{children}{isActive && <Underline />}</>}
  </NavLink>
)

const accountLinks = [['/transactions', 'Transactions'], ['/transfer', 'Connect App Account'], ['/help', 'Help'], ['/feedback', 'Share Your Feedback'], ['/privacy-policy', 'Privacy Policy']]

export default function Header({ generating = false }) {
  const [menu, setMenu] = useState(false)
  const { pathname } = useLocation()
  const { signedIn } = useStudio()
  useEffect(() => { setMenu(false) }, [pathname])
  const scrolled = useScrolled()
  const xl = useXl()

  return (
    <>
      {/* Tablet / desktop nav */}
      <div className="pointer-events-none fixed left-0 right-0 z-50 hidden justify-center md:flex" style={{ top: scrolled ? 10 : 14, transition: `top 400ms ${EASE}` }}>
        <nav className={`pointer-events-auto relative mx-auto border border-solid bg-[rgba(0,0,0,0.78)] backdrop-blur-2xl ${menu ? 'max-lg:!rounded-[28px] max-lg:!bg-[rgba(0,0,0,0.97)]' : ''}`}
          style={{
            width: `calc(100% - ${xl ? 48 : 32}px)`,
            maxWidth: '96rem',
            borderRadius: 9999,
            borderColor: scrolled ? 'rgba(176,112,250, 0.22)' : 'rgba(176,112,250, 0.14)',
            boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.06), ${scrolled ? '0 14px 40px rgba(0, 0, 0, 0.45)' : '0 6px 24px rgba(0, 0, 0, 0.25)'}`,
            transition: ['border-color', 'box-shadow'].map((p) => `${p} 400ms ${EASE}`).join(', '),
          }}>
          <div className="mx-auto w-full px-3 sm:px-4 lg:pl-6 lg:pr-3">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4" style={{ height: scrolled ? 56 : 64, transition: `height 420ms ${EASE}` }}>
              <Logo imgHeight={scrolled ? 26 : 30} fontSize={scrolled ? 21 : 24} />
              <div className="hidden min-w-0 items-center justify-center lg:flex">
                <div className="flex items-center gap-0.5 xl:gap-2">
                  {main.map((l) => <DLink key={l.to} to={l.to}>{l.label}</DLink>)}
                  <DLink to="/creations">My Creations</DLink>
                  <DLink to="/pricing">Pricing</DLink>
                </div>
              </div>
              <div className="hidden shrink-0 items-center justify-end gap-2 lg:flex xl:gap-3">
                <Claim />
                {signedIn && <ProfileMenu />}
                <GetApp />
              </div>
              <div className="flex items-center justify-end gap-2 lg:hidden">
                <GetApp small />
                <Claim small />
                {signedIn && <ProfileMenu />}
                <button type="button" aria-label="Open main menu" aria-expanded={menu} onClick={() => setMenu(!menu)} className="inline-flex cursor-pointer items-center justify-center rounded-xl p-2 text-[#C4B5FD] transition-colors hover:text-white focus:outline-none">
                  <svg className="block size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d={menu ? 'M6 6l12 12M6 18L18 6' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
                </button>
              </div>
            </div>
          </div>
          <div className={`overflow-hidden transition-all duration-300 ease-in-out lg:hidden ${menu ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="no-scrollbar max-h-[70vh] overflow-y-auto border-t border-white/10">
              <div className="space-y-0.5 px-3 pb-3 pt-2">
                {[...main, { to: '/creations', label: 'My Creations' }, { to: '/pricing', label: 'Pricing' }].slice(0, main.length).map((l) => (
                  <NavLink key={l.to} to={l.to} end className={({ isActive }) => `block cursor-pointer rounded-xl px-3 py-2.5 text-base font-medium transition-colors ${isActive ? 'bg-[#B070FA]/15 text-white ring-1 ring-inset ring-[#B070FA]/30' : 'text-[#C4B5FD] hover:bg-white/[0.06] hover:text-white'}`}>{l.label}</NavLink>
                ))}
                {[['/creations', 'My Creations'], ['/pricing', 'Pricing']].map(([to, label]) => (
                  <NavLink key={to} to={to} className={({ isActive }) => `block cursor-pointer rounded-xl px-3 py-2.5 text-base font-medium transition-colors ${isActive ? 'bg-[#B070FA]/15 text-white ring-1 ring-inset ring-[#B070FA]/30' : 'text-[#C4B5FD] hover:bg-white/[0.06] hover:text-white'}`}>{label}</NavLink>
                ))}
                <div className="!mt-2 space-y-0.5 border-t border-white/10 pt-2">
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C4B5FD]/75">Account &amp; Support</div>
                  {accountLinks.map(([to, label]) => <Link key={to} to={to} className="block cursor-pointer rounded-xl px-3 py-2 text-sm font-medium text-[#C4B5FD] transition-colors hover:bg-white/[0.06] hover:text-white">{label}</Link>)}
                  {signedIn ? <CoinBadge className="!mt-2 w-full" /> : (
                  <Link to="/login" className="!mt-2 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-[#B070FA]/50 bg-[#B070FA]/10 px-4 text-sm font-medium tracking-wide text-white transition-colors hover:border-[#B070FA] hover:bg-[#B070FA]/20">
                    <SparkIcon className="size-3.5 text-[#B070FA]" /><span className="whitespace-nowrap">Claim 50 Coins</span>
                  </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>
      <div className="hidden h-[92px] md:block" />

      {/* Mobile header */}
      <header className={`sticky top-0 z-50 flex items-center justify-between border-b border-white/[0.08] bg-[#000000]/95 px-4 py-3 backdrop-blur-md md:hidden ${generating ? 'max-sm:hidden' : ''}`}>
        <Logo />
        {(
          <div className="flex items-center gap-2">
            {signedIn && <CoinBadge />}
            <GetApp small />
            {signedIn ? <ProfileMenu /> : <Link to="/pricing" aria-label="Upgrade to Pro" className="p-1 text-[#D8B4FE] transition-transform active:scale-95">
              <svg className="size-7" viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg>
            </Link>}
          </div>
        )}
      </header>
      {!generating && <MobileTabs pathname={pathname} />}
      {generating && <div className="hidden sm:block md:hidden"><MobileTabs pathname={pathname} /></div>}
    </>
  )
}

const tabs = [
  { to: '/', label: 'Home', match: (p) => p === '/', d: 'M3 11l9-8 9 8v10h-6v-6H9v6H3z' },
  { to: '/explore', label: 'Explore', match: (p) => p === '/explore', d: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z' },
  { to: '/creations', label: 'Me', match: (p) => ['/creations', '/pricing', '/login', '/help', '/contact-us', '/feedback', '/transactions', '/transfer', '/profile'].includes(p), d: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0' },
]

function MobileTabs({ pathname }) {
  const idx = Math.max(0, tabs.findIndex((t) => t.match(pathname)))
  return (
    <div className="fixed left-1/2 z-[99] flex h-[62px] w-[85%] max-w-[316px] -translate-x-1/2 select-none items-center justify-around rounded-[6px] bg-gradient-to-br from-[#2A1B52] to-[#1A284F] p-1 shadow-[0_10px_35px_rgba(0,0,0,0.9)] md:hidden" style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="pointer-events-none absolute top-1/2 z-[1] h-[54px] -translate-y-1/2 rounded-[4px] shadow-[0_4px_15px_rgba(176,112,250,0.25)] transition-all duration-300" style={{ width: 'calc((100% - 8px) / 3)', left: `calc(4px + ${idx} * (100% - 8px) / 3)`, background: 'linear-gradient(#2A1B52, #1A284F) padding-box, linear-gradient(135deg, #B070FA 0%, #F066D8 100%) border-box', border: '1.5px solid transparent' }} />
      {tabs.map((t, i) => (
        <Link key={t.label} to={t.to} className="relative z-[2] flex h-full flex-1 flex-col items-center justify-center gap-[2px] outline-none">
          <svg className={`size-5 transition-all duration-300 ${i === idx ? 'text-[#B070FA] opacity-100' : 'text-white opacity-60'}`} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d={t.d} strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className={`text-[11px] tracking-wider transition-all duration-300 ${i === idx ? 'font-medium text-[#B070FA]' : 'font-normal text-white/50'}`}>{t.label}</span>
        </Link>
      ))}
    </div>
  )
}
