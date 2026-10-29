import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { brandImages } from '../data/images.js'
import { useStudio } from '../context/StudioContext.jsx'
import PlansSheet from './PlansSheet.jsx'
import LastManPopup, { LastManButton } from './LastMan.jsx'

export const SparkIcon = ({ className = 'size-3.5 text-[#FF3DF2]' }) => (
  <svg className={`${className} shrink-0`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.2 6.3L21 10l-6.8 1.7L12 18l-2.2-6.3L3 10l6.8-1.7z" /></svg>
)
const Chevron = ({ open }) => (
  <svg className={`size-3 text-[#A1A1AA] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const PhoneIcon = () => (
  <svg className="size-3.5 text-[#A1A1AA]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" strokeLinecap="round" /></svg>
)

/** Wordmark: a small ivory diamond mark and the spaced name. */
export const Logo = ({ size = 'md' }) => (
  <Link to="/" aria-label="Pictrify home" className="inline-flex shrink-0 items-center gap-2.5 text-[#FFFFFF]">
    <span className={`grid place-items-center rounded-[10px] bg-[#FF3DF2] text-white ${size === 'sm' ? 'size-8' : 'size-9'}`}>
      <svg className={size === 'sm' ? 'size-4' : 'size-[18px]'} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.6 6.9L22 12l-7.4 3.1L12 22l-2.6-6.9L2 12l7.4-3.1z" /></svg>
    </span>
    <span className={`whitespace-nowrap font-display font-semibold tracking-tight ${size === 'sm' ? 'text-[19px]' : 'text-[22px]'}`}>Pictrify</span>
  </Link>
)

// ---------- navigation model: one rail on desktop / tablet, a bottom bar on phones ----------
const ICONS = {
  Home: 'M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z',
  Discover: 'M12 3a9 9 0 100 18 9 9 0 000-18zM15.5 8.5l-2 5-5 2 2-5z',
  Explore: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  Looks: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  Create: 'M12 4v16M4 12h16',
  Creations: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4',
  Wallet: 'M3 7h15a3 3 0 013 3v8a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 7l11-3v3M16 14h3',
  Account: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.5-6 8-6s8 2 8 6',
}
const NAV = [
  { label: 'Home', to: '/', match: (p) => p === '/' },
  { label: 'Photo', to: '/explore', match: (p) => p === '/explore' || p === '/generate' },
  { label: 'AI Video', to: '/video', match: (p) => p === '/video' },
  { label: 'My Creations', to: '/creations', match: (p) => p === '/creations' },
  { label: 'Pricing', to: '/pricing', match: (p) => ['/pricing', '/coins', '/transactions', '/payment-success'].includes(p) },
]
const ACCOUNT_LINKS = [['/profile', 'Account'], ['/transactions', 'Transactions'], ['/help', 'Help'], ['/feedback', 'Share Your Feedback'], ['/privacy-policy', 'Privacy Policy'], ['/terms-conditions', 'Terms & Conditions']]
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'
const GRAD = 'bg-[#FF3DF2]'
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
const Icon = ({ name, className = 'size-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name]} /></svg>
)

// Below this balance the balance card opens the Plans tab of the Wallet; at or above it, the Coin packs tab. Follows the live balance.
const LOW_COINS = 150
export const walletTarget = (coins) => (coins >= LOW_COINS ? '/coins' : '/pricing')

// ---------- top bar (desktop / tablet): search, premium, app, account ----------
function GetApp() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative shrink-0" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" onClick={() => setOpen(!open)} className="flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-[#272033] bg-[#12101B] px-3.5 text-[13px] font-medium text-[#FFFFFF] transition-colors">
        <PhoneIcon /><span>Get app</span><Chevron open={open} />
      </button>
      <div className={`absolute right-0 top-full z-50 w-[200px] pt-2 transition-all duration-200 ${open ? 'visible translate-y-0 opacity-100' : 'pointer-events-none invisible -translate-y-1 opacity-0'}`}>
        <div className="flex flex-col items-center space-y-2.5 rounded-md border border-[#272033] bg-[#12101B] p-3.5 text-center shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
          <div className="w-full rounded bg-[#1A1626] px-2 py-1 text-[11px] font-semibold text-[#FFFFFF]">Android app</div>
          <div className="rounded bg-[#12101B] p-1.5"><img src={brandImages.qr} alt="QR code" className="size-24 rounded object-contain" /></div>
          <p className="text-[11px] font-medium leading-tight text-[#A1A1AA]">Scan for the app</p>
        </div>
      </div>
    </div>
  )
}

export const displayName = (email) => (email.split('@')[0] || '').split(/[._-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') || 'Pictrify user'
const PROFILE_ITEMS = [
  ['/profile', 'Profile', 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.5-6 8-6s8 2 8 6'],
  ['/creations', 'My Creations', 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4'],
  ['/transactions', 'Transactions', 'M4 7h16M4 12h16M4 17h10'],
  ['/help', 'Help', 'M9.5 9a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17.2v.1M12 21a9 9 0 100-18 9 9 0 000 18z'],
  ['/contact-us', 'Contact Us', 'M4 6h16v12H4zM4 7l8 6 8-6'],
  ['/feedback', 'Share Your Feedback', 'M4 5h16v11H9l-5 4z'],
  ['/privacy-policy', 'Privacy Policy', 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z'],
  ['/terms-conditions', 'Terms & Conditions', 'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6'],
]

export function ProfileMenu({ compact = false }) {
  const { userEmail, signOut, coins } = useStudio()
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

  const item = 'group flex items-center gap-3 rounded-xl px-2.5 py-2 text-[14px] font-medium text-[#FFFFFF] transition-colors hover:bg-[#12101B] focus-visible:bg-[#12101B]'
  return (
    <>
      <button ref={btn} type="button" onClick={toggle} aria-label="Open account menu" aria-haspopup="menu" aria-expanded={open}
        className={`grid ${compact ? 'size-8 text-[13px]' : 'size-10 text-[14px]'} shrink-0 cursor-pointer place-items-center rounded-full border border-[#272033] bg-[#FF3DF2] font-semibold text-white transition-colors`}>{initial}</button>
      {shown && createPortal(
        <div ref={panel} role="menu" aria-label="Account" data-closing={!open} style={{ top: pos.top, right: pos.right }}
          className="profile-menu fixed z-[400] w-[320px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-[#272033] bg-[#0D0B14]/95 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
          <Link to="/profile" role="menuitem" onClick={() => close()} className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-[#272033] bg-[rgba(255,61,242,0.15)] p-3 transition-colors">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#FF3DF2] text-[18px] font-semibold text-white">{initial}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-[#FFFFFF]">{name}</span>
              <span className="block truncate text-xs text-[#A1A1AA]" title={userEmail}>{userEmail}</span>
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#1A1626] py-0.5 pl-1 pr-2.5 text-[11px] font-medium text-[#FFFFFF]"><img src="/images/features/coin.svg" alt="" className="size-4 object-contain" />{coins.toLocaleString()} coins</span>
            </span>
            <svg className="size-4 shrink-0 text-[#A1A1AA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </Link>
          <div className="mt-2 flex flex-col gap-0.5">
            {PROFILE_ITEMS.map(([to, label, d]) => (
              <Link key={to} to={to} role="menuitem" onClick={() => close()} className={item}>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#12101B] text-[#A1A1AA] transition-colors group-hover:bg-[rgba(255,61,242,0.28)] group-hover:text-white"><svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg></span>
                <span className="flex-1">{label}</span>
              </Link>
            ))}
          </div>
          <div className="my-2 h-px bg-[#1A1626]" />
          <button type="button" role="menuitem" onClick={() => { close(); signOut(); nav('/') }} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#D98282]/30 bg-[#D98282]/10 px-3 py-2.5 text-[14px] font-medium text-[#F2A0A0] transition-colors hover:bg-[#D98282]/20">
            <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" /></svg>
            Log out
          </button>
        </div>, document.body)}
    </>
  )
}

/** Desktop / tablet top navigation (sticky): logo, main links, coin balance, Premium, Get app and the account. */
export function TopNav() {
  const { pathname } = useLocation()
  const { signedIn, coins, openLogin } = useStudio()
  const [menu, setMenu] = useState(false)
  const scrolled = useScrolled()
  useEffect(() => { setMenu(false) }, [pathname])
  const link = (on) => `rounded-full px-4 py-2 text-[15px] font-semibold leading-normal whitespace-nowrap transition-colors ${on ? 'bg-white text-[#08080D]' : 'text-[#FFFFFF] hover:bg-[#12101B]'}`
  const coinPill = (cls = '') => <Link to={walletTarget(coins)} aria-label={`${coins} coins - open wallet`} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[#272033] bg-[#12101B] pl-2.5 pr-3.5 text-[13px] font-medium text-[#FFFFFF] transition-colors ${cls}`}><img src="/images/features/coin.svg" alt="" className="size-5 object-contain" />{coins.toLocaleString()}<span className="text-[#FF3DF2]">+</span></Link>
  const claim = (small) => <button type="button" onClick={openLogin} className={`btn-grad shrink-0 ${small ? '!h-9 !gap-1.5 !px-3.5 !py-0 !text-[12px]' : '!h-10 !gap-2 !px-5 !py-0 !text-[13px]'}`}><SparkIcon className="size-3.5 text-white" /><span className="whitespace-nowrap">Claim 100 Coins</span></button>
  return (
    <>
      {!signedIn && (
        <div className="hidden items-center justify-center gap-3 bg-[#FF3DF2] px-4 py-2 text-[13px] font-medium text-white md:flex">
          <span>New to Pictrify? Sign up and get 100 free coins to create your first photos.</span>
          <button type="button" onClick={openLogin} className="cursor-pointer rounded-full bg-[#12101B] px-3 py-0.5 text-[12px] font-semibold text-[#FFFFFF] transition-opacity hover:opacity-90">Claim now</button>
        </div>
      )}
      <header className="shine-line sticky top-0 z-50 hidden border-b border-[#272033] bg-[#0D0B14]/90 backdrop-blur-xl md:block" style={{ boxShadow: scrolled ? '0 10px 30px rgba(0,0,0,0.16)' : 'none', transition: `box-shadow 300ms ${EASE}` }}>
        <nav aria-label="Main" className="mx-auto w-full max-w-[96rem] px-4 sm:px-6 lg:px-8">
          <div className="grid h-[68px] grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4">
            <Logo />
            <div className="hidden min-w-0 items-center justify-start pl-4 lg:flex">
              <div className="flex items-center gap-0.5 xl:gap-1.5">
                {NAV.map((n) => <NavLink key={n.label} to={n.to} aria-current={n.match(pathname) ? 'page' : undefined} className={link(n.match(pathname))}>{n.label}</NavLink>)}
              </div>
            </div>
            <div className="hidden shrink-0 items-center justify-end gap-2 lg:flex xl:gap-3">
              <Link to="/explore?focus=search" aria-label="Search templates" className="grid size-10 place-items-center rounded-full border border-[#272033] bg-[#12101B] text-[#A1A1AA] transition-colors hover:text-[#FFFFFF]"><Icon name="Explore" className="size-[18px]" /></Link>
              {signedIn ? <>{coinPill()}<ProfileMenu /></> : <button type="button" onClick={openLogin} className="chip !h-10 !px-5">Log in</button>}
              {!signedIn && claim(false)}
              <GetApp />
            </div>
            <div className="col-start-3 flex items-center justify-end gap-2 lg:hidden">
              {signedIn ? <>{coinPill('!h-9')}<ProfileMenu compact /></> : claim(true)}
              <button type="button" aria-label="Open main menu" aria-expanded={menu} onClick={() => setMenu(!menu)} className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-[#A1A1AA] transition-colors hover:bg-[#12101B] hover:text-[#FFFFFF] focus:outline-none">
                <svg className="block size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d={menu ? 'M6 6l12 12M6 18L18 6' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
              </button>
            </div>
          </div>
          <div className={`overflow-hidden transition-all duration-300 ease-in-out lg:hidden ${menu ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="no-scrollbar max-h-[70vh] overflow-y-auto border-t border-[#272033]">
              <div className="space-y-0.5 px-1 pb-3 pt-2">
                {NAV.map((n) => <NavLink key={n.label} to={n.to} tabIndex={menu ? 0 : -1} className={`block rounded-xl px-3 py-2.5 text-base font-medium transition-colors ${n.match(pathname) ? 'bg-[#12101B] text-[#FFFFFF] ring-1 ring-inset ring-[#272033]' : 'text-[#A1A1AA] hover:bg-[#12101B] hover:text-[#FFFFFF]'}`}>{n.label}</NavLink>)}
                <div className="!mt-2 space-y-0.5 border-t border-[#272033] pt-2">
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A1A1AA]">Account &amp; Support</div>
                  {ACCOUNT_LINKS.filter(([to]) => signedIn || to !== '/profile').map(([to, label]) => <Link key={to} to={to} tabIndex={menu ? 0 : -1} className="block rounded-xl px-3 py-2 text-sm font-medium text-[#A1A1AA] transition-colors hover:bg-[#12101B] hover:text-[#FFFFFF]">{label}</Link>)}
                </div>
              </div>
            </div>
          </div>
        </nav>
      </header>
    </>
  )
}

// ---------- phone chrome: top bar + a floating three-tab pill (Home, Diy, Me), like the reference ----------
const tabs = [
  { to: '/', label: 'Home', match: (p) => p === '/', d: 'M5 7v12a2 2 0 002 2h10M9 3h10a2 2 0 012 2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V5a2 2 0 012-2zM14 6.5l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9z' },
  { to: '/video', label: 'AI Video', match: (p) => p === '/video', d: 'M4 6h11a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zM17 10l5-3v10l-5-3z' },
  { to: '/explore', label: 'Photo', match: (p) => p === '/explore' || p === '/generate', d: 'M3 9h18v11a1 1 0 01-1 1H4a1 1 0 01-1-1zM3 9l2.5-5 3 1.5L6 10.5M9.5 5.5l3 1.5L10 10.5M16 5.5l3 1.5-2.5 3.5M16 13l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9z' },
  { to: '/profile', label: 'Me', match: (p) => ['/creations', '/pricing', '/coins', '/payment-success', '/help', '/contact-us', '/contact-support', '/feedback', '/transactions', '/profile', '/privacy-policy', '/terms-conditions'].includes(p), d: 'M12 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5' },
]

function MobileTabs({ pathname }) {
  const { signedIn, openLogin } = useStudio()
  const idx = Math.max(0, tabs.findIndex((t) => t.match(pathname)))
  return (
    <nav aria-label="Main" className="fixed left-1/2 z-[99] flex h-[62px] w-[86%] min-w-[290px] max-w-[400px] -translate-x-1/2 select-none items-center justify-around rounded-full border border-[#272033] bg-[#12101B]/95 p-[5px] shadow-[0_10px_35px_rgba(0,0,0,0.16)] backdrop-blur-xl md:hidden" style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
      <div className="pointer-events-none absolute top-1/2 z-[1] h-[50px] -translate-y-1/2 rounded-full bg-[#12101B] ring-1 ring-inset ring-[#272033] transition-all duration-300" style={{ width: 'calc((100% - 10px) / ' + tabs.length + ')', left: `calc(5px + ${idx} * (100% - 10px) / ${tabs.length})` }} />
      {tabs.map((t, i) => (
        <Link key={t.label} to={t.to} aria-label={t.label} aria-current={i === idx ? 'page' : undefined} onClick={t.to === '/profile' && !signedIn ? (e) => { e.preventDefault(); openLogin() } : undefined} className="relative z-[2] flex h-full flex-1 flex-col items-center justify-center gap-[2px] outline-none">
          <svg className={`size-6 transition-all duration-300 ${i === idx ? 'text-[#FFFFFF] opacity-100' : 'text-[#FFFFFF] opacity-60'}`} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d={t.d} strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className={`text-[11px] tracking-wide transition-all duration-300 ${i === idx ? 'font-semibold text-[#FFFFFF]' : 'font-semibold text-[#A1A1AA]'}`}>{t.label}</span>
        </Link>
      ))}
    </nav>
  )
}

function MobileHeader({ generating }) {
  const { signedIn, openLogin, coins } = useStudio()
  const [lastMan, setLastMan] = useState(null)
  return (
    <>
      <header className={`shine-line sticky top-0 z-50 flex h-[60px] items-center justify-between border-b border-[#272033] bg-[#0D0B14]/95 px-4 backdrop-blur md:hidden ${generating ? 'max-sm:hidden' : ''}`}>
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <LastManButton onClick={() => setLastMan('plans')} />
          {signedIn ? (
            <>
              <Link to={walletTarget(coins)} aria-label={`${coins} coins - open wallet`} className="flex h-8 items-center gap-1.5 rounded-full border border-[#272033] bg-[#12101B] pl-1.5 pr-3 text-[12px] font-medium text-[#FFFFFF]"><img src="/images/features/coin.svg" alt="" className="size-5 object-contain" />{coins.toLocaleString()}</Link>
              <ProfileMenu compact />
            </>
          ) : (
            <>
              <button type="button" onClick={openLogin} aria-label="Claim 100 coins" className="grid size-8 place-items-center rounded-full border border-[#272033] bg-[#12101B] transition-transform active:scale-95"><img src="/images/features/coin.svg" alt="" className="size-[22px] object-contain" /></button>
              <button type="button" onClick={openLogin} aria-label="Log in" className={`grid size-8 place-items-center rounded-full ${GRAD} text-[#FFFFFF] transition-transform active:scale-95`}><svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg></button>
            </>
          )}
        </div>
      </header>
      {lastMan === 'popup' && <LastManPopup onClose={() => setLastMan(null)} onUnlock={() => setLastMan('plans')} />}
      {lastMan === 'plans' && <PlansSheet onClose={() => setLastMan(null)} />}
    </>
  )
}

/** The navigation: the sticky top bar (md+) and the phone top bar + bottom bar. No sidebar. */
export default function Header({ generating = false }) {
  const { pathname } = useLocation()
  return (
    <>
      <TopNav />
      <MobileHeader generating={generating} />
      {!generating && <MobileTabs pathname={pathname} />}
      {generating && <div className="hidden sm:block md:hidden"><MobileTabs pathname={pathname} /></div>}
    </>
  )
}
