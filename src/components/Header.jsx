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
      <button type="button" onClick={() => setOpen(!open)} className="flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-[#3A3A3E] bg-[#1C1C1E] px-3.5 text-[13px] font-medium text-[#FFFFFF] transition-colors">
        <PhoneIcon /><span>Get app</span><Chevron open={open} />
      </button>
      <div className={`absolute right-0 top-full z-50 w-[200px] pt-2 transition-all duration-200 ${open ? 'visible translate-y-0 opacity-100' : 'pointer-events-none invisible -translate-y-1 opacity-0'}`}>
        <div className="flex flex-col items-center space-y-2.5 rounded-md border border-[#3A3A3E] bg-[#191919] p-3.5 text-center shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
          <div className="w-full rounded bg-[#2C2C2F] px-2 py-1 text-[11px] font-semibold text-[#FFFFFF]">Android app</div>
          <div className="rounded bg-[#1C1C1E] p-1.5"><img src={brandImages.qr} alt="QR code" className="size-24 rounded object-contain" /></div>
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

  const item = 'group flex items-center gap-3 rounded-xl px-2.5 py-2 text-[14px] font-medium text-[#FFFFFF] transition-colors hover:bg-[#1C1C1E] focus-visible:bg-[#1C1C1E]'
  return (
    <>
      <button ref={btn} type="button" onClick={toggle} aria-label="Open account menu" aria-haspopup="menu" aria-expanded={open}
        className={`grid ${compact ? 'size-8 text-[13px]' : 'size-10 text-[14px]'} shrink-0 cursor-pointer place-items-center rounded-full border border-[#3A3A3E] bg-[#FF3DF2] font-semibold text-white transition-colors`}>{initial}</button>
      {shown && createPortal(
        <div ref={panel} role="menu" aria-label="Account" data-closing={!open} style={{ top: pos.top, right: pos.right }}
          className="profile-menu fixed z-[400] w-[320px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-[#3A3A3E] bg-[#101011]/95 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.16)] backdrop-blur-2xl">
          <Link to="/profile" role="menuitem" onClick={() => close()} className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-[#3A3A3E] bg-[rgba(255,61,242,0.15)] p-3 transition-colors">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#FF3DF2] text-[18px] font-semibold text-white">{initial}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-[#FFFFFF]">{name}</span>
              <span className="block truncate text-xs text-[#A1A1AA]" title={userEmail}>{userEmail}</span>
              <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#2C2C2F] py-0.5 pl-1 pr-2.5 text-[11px] font-medium text-[#FFFFFF]"><img src="/images/features/coin.svg" alt="" className="size-4 object-contain" />{coins.toLocaleString()} coins</span>
            </span>
            <svg className="size-4 shrink-0 text-[#A1A1AA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </Link>
          <div className="mt-2 flex flex-col gap-0.5">
            {PROFILE_ITEMS.map(([to, label, d]) => (
              <Link key={to} to={to} role="menuitem" onClick={() => close()} className={item}>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#1C1C1E] text-[#A1A1AA] transition-colors group-hover:bg-[rgba(255,61,242,0.28)] group-hover:text-white"><svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg></span>
                <span className="flex-1">{label}</span>
              </Link>
            ))}
          </div>
          <div className="my-2 h-px bg-[#2C2C2F]" />
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
  const link = (on) => `rounded-full px-4 py-2 text-[15px] font-semibold leading-normal whitespace-nowrap transition-colors ${on ? 'bg-white text-[#000000]' : 'text-[#FFFFFF] hover:bg-[#1C1C1E]'}`
  const coinPill = (cls = '') => <Link to={walletTarget(coins)} aria-label={`${coins} coins - open wallet`} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[#3A3A3E] bg-[#1C1C1E] pl-2.5 pr-3.5 text-[13px] font-medium text-[#FFFFFF] transition-colors ${cls}`}><img src="/images/features/coin.svg" alt="" className="size-5 object-contain" />{coins.toLocaleString()}<span className="text-[#FF3DF2]">+</span></Link>
  const claim = (small) => <button type="button" onClick={openLogin} className={`btn-grad shrink-0 ${small ? '!h-9 !gap-1.5 !px-3.5 !py-0 !text-[12px]' : '!h-10 !gap-2 !px-5 !py-0 !text-[13px]'}`}><SparkIcon className="size-3.5 text-white" /><span className="whitespace-nowrap">Claim 100 Coins</span></button>
  return (
    <>
      {!signedIn && (
        <div className="hidden items-center justify-center gap-3 bg-[#FF3DF2] px-4 py-2 text-[13px] font-medium text-white md:flex">
          <span>New to Pictrify? Sign up and get 100 free coins to create your first photos.</span>
          <button type="button" onClick={openLogin} className="cursor-pointer rounded-full bg-[#1C1C1E] px-3 py-0.5 text-[12px] font-semibold text-[#FFFFFF] transition-opacity hover:opacity-90">Claim now</button>
        </div>
      )}
      <header className={`shine-line sticky top-0 z-50 hidden border-b border-[#3A3A3E] bg-[#101011]/90 backdrop-blur-xl md:block`} style={{ boxShadow: scrolled ? '0 10px 30px rgba(0,0,0,0.16)' : 'none', transition: `box-shadow 300ms ${EASE}` }}>
        <nav aria-label="Main" className="mx-auto w-full max-w-[96rem] px-4 sm:px-6 lg:px-8">
          <div className="grid h-[68px] grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4">
            <Logo />
            <div className="hidden min-w-0 items-center justify-start pl-4 lg:flex">
              <div className="flex items-center gap-0.5 xl:gap-1.5">
                {NAV.map((n) => <NavLink key={n.label} to={n.to} aria-current={n.match(pathname) ? 'page' : undefined} className={link(n.match(pathname))}>{n.label}</NavLink>)}
              </div>
            </div>
            <div className="hidden shrink-0 items-center justify-end gap-2 lg:flex xl:gap-3">
              <Link to="/explore?focus=search" aria-label="Search templates" className="grid size-10 place-items-center rounded-full border border-[#3A3A3E] bg-[#1C1C1E] text-[#A1A1AA] transition-colors hover:text-[#FFFFFF]"><Icon name="Explore" className="size-[18px]" /></Link>
              {signedIn ? <>{coinPill()}<ProfileMenu /></> : <button type="button" onClick={openLogin} className="chip !h-10 !px-5">Log in</button>}
              {!signedIn && claim(false)}
              <GetApp />
            </div>
            <div className="col-start-3 flex items-center justify-end gap-2 lg:hidden">
              {signedIn ? <>{coinPill('!h-9')}<ProfileMenu compact /></> : claim(true)}
              <button type="button" aria-label="Open main menu" aria-expanded={menu} onClick={() => setMenu(!menu)} className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-[#A1A1AA] transition-colors hover:bg-[#1C1C1E] hover:text-[#FFFFFF] focus:outline-none">
                <svg className="block size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d={menu ? 'M6 6l12 12M6 18L18 6' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
              </button>
            </div>
          </div>
          <div className={`overflow-hidden transition-all duration-300 ease-in-out lg:hidden ${menu ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="no-scrollbar max-h-[70vh] overflow-y-auto border-t border-[#3A3A3E]">
              <div className="space-y-0.5 px-1 pb-3 pt-2">
                {NAV.map((n) => <NavLink key={n.label} to={n.to} tabIndex={menu ? 0 : -1} className={`block rounded-xl px-3 py-2.5 text-base font-medium transition-colors ${n.match(pathname) ? 'bg-[#191919] text-[#FFFFFF] ring-1 ring-inset ring-[#3A3A3E]' : 'text-[#A1A1AA] hover:bg-[#1C1C1E] hover:text-[#FFFFFF]'}`}>{n.label}</NavLink>)}
                <div className="!mt-2 space-y-0.5 border-t border-[#3A3A3E] pt-2">
                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A1A1AA]">Account &amp; Support</div>
                  {ACCOUNT_LINKS.filter(([to]) => signedIn || to !== '/profile').map(([to, label]) => <Link key={to} to={to} tabIndex={menu ? 0 : -1} className="block rounded-xl px-3 py-2 text-sm font-medium text-[#A1A1AA] transition-colors hover:bg-[#1C1C1E] hover:text-[#FFFFFF]">{label}</Link>)}
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
  { to: '/', label: 'Home', match: (p) => p === '/', d: 'M3 11l9-8 9 8M5 9.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V9.5' },
  { to: '/explore', label: 'Explore', match: (p) => p === '/explore' || p === '/generate', d: 'M12 3a9 9 0 100 18 9 9 0 000-18zM15.5 8.5l-2 5-5 2 2-5z' },
  { to: '/creations', label: 'Creations', match: (p) => p === '/creations', d: 'M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z' },
  { to: '/profile', label: 'Profile', match: (p) => ['/profile', '/pricing', '/coins', '/transactions', '/payment-success', '/help', '/contact-support', '/contact-us', '/feedback', '/privacy-policy', '/terms-conditions'].includes(p), d: 'M12 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5' },
]

function MobileTabs({ pathname }) {
  const { signedIn, openLogin } = useStudio()
  const idx = tabs.findIndex((t) => t.match(pathname))
  return (
    <nav aria-label="Main" className="fixed inset-x-3 z-[99] flex h-[66px] select-none items-center gap-1 rounded-[28px] border border-white/10 bg-[#191919]/95 p-2 shadow-[0_10px_34px_rgba(0,0,0,0.55)] backdrop-blur-xl md:hidden" style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
      {tabs.map((t, i) => (
        <Link key={t.label} to={t.to} aria-label={t.label} aria-current={i === idx ? 'page' : undefined} onClick={t.to === '/profile' && !signedIn ? (e) => { e.preventDefault(); openLogin() } : undefined} className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[20px] outline-none transition-colors duration-200 active:scale-95 ${i === idx ? 'bg-[#2C2C2F]' : ''}`}>
          <svg className={`size-[22px] ${i === idx ? 'text-[#FF3DF2]' : 'text-[#A1A1AA]'}`} fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24"><path d={t.d} strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span className={`truncate text-[11px] ${i === idx ? 'font-semibold text-[#FFFFFF]' : 'font-medium text-[#A1A1AA]'}`}>{t.label}</span>
        </Link>
      ))}
    </nav>
  )
}

// phone header titles: the main pages get a big title with an accent underline; the rest get a back button and a smaller title
const MAIN_PAGES = ['/', '/explore', '/creations', '/profile'] // the bottom-bar pages get the logo header; every other page gets a back arrow and its title
const SUB_TITLES = { '/video': 'AI Video', '/coins': 'Coins', '/pricing': 'Plans', '/transactions': 'Transactions', '/profile': 'Profile', '/help': 'Help & Contact', '/contact-support': 'Contact', '/contact-us': 'Contact', '/feedback': 'Feedback', '/privacy-policy': 'Privacy Policy', '/terms-conditions': 'Terms', '/payment-success': 'Payment' }
const MORE_ICONS = { Profile: 'M12 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5', Transactions: 'M4 7h16M4 12h16M4 17h10', 'Help & Contact': 'M9.5 9a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17.2v.1M12 21a9 9 0 100-18 9 9 0 000 18z', Feedback: 'M4 5h16v11H9l-5 4z', 'Privacy Policy': 'M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z', Terms: 'M7 3h8l4 4v14H7zM14 3v5h5', 'Premium plans': 'M3 8l4 4 5-7 5 7 4-4-2 11H5z', 'AI Video': 'M4 6h11a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zM17 10l5-3v10l-5-3z' }
const MORE_LINKS = [['Transactions', '/transactions'], ['Help & Contact', '/help'], ['Feedback', '/feedback'], ['Privacy Policy', '/privacy-policy'], ['Terms', '/terms-conditions']]

/** The phone "More" bottom sheet: every secondary page, plus log in / log out. */
function MoreSheet({ onClose, onPlans }) {
  const nav = useNavigate()
  const { signedIn, openLogin, signOut } = useStudio()
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  const go = (to) => { onClose(); if (to === '/profile' && !signedIn) openLogin(); else nav(to) }
  const row = (label, onClick) => (
    <button key={label} type="button" onClick={onClick} className="flex w-full cursor-pointer items-center gap-4 border-b border-[#2C2C2F] py-3 text-left text-[16px] font-semibold text-white last:border-0">
      <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-[#2C2C2F] text-[#FF3DF2]"><svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={MORE_ICONS[label]} /></svg></span>{label}
    </button>
  )
  return createPortal(
    <div className="fixed inset-0 z-[400] md:hidden" role="dialog" aria-modal="true" aria-label="More">
      <div className="login-fade absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="login-rise absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[30px] bg-[#191919] px-5 pb-6 pt-3">
        <div className="mx-auto h-1 w-10 rounded-full bg-[#3A3A3E]" />
        <div className="mb-2 mt-3 flex items-center justify-between"><h2 className="text-[22px] font-bold text-white">More</h2><button type="button" aria-label="Close" onClick={onClose} className="grid size-10 cursor-pointer place-items-center rounded-[14px] bg-[#2C2C2F] text-white"><svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg></button></div>
        {row('Premium plans', () => { onClose(); onPlans() })}
        {MORE_LINKS.map(([label, to]) => row(label, () => go(to)))}
        <button type="button" onClick={() => { onClose(); if (signedIn) { signOut(); nav('/') } else openLogin() }} className="btn-primary mt-5 w-full !rounded-full !py-4 !text-[16px]">{signedIn ? 'Log out' : 'Log in'}</button>
      </div>
    </div>, document.body)
}

function MobileHeader({ generating }) {
  const { signedIn, openLogin, coins } = useStudio()
  const { pathname } = useLocation()
  const nav = useNavigate()
  const [lastMan, setLastMan] = useState(null)
  const [more, setMore] = useState(false)
  const main = MAIN_PAGES.includes(pathname)
  const title = SUB_TITLES[pathname] || ''
  const back = () => (window.history.length > 1 ? nav(-1) : nav('/'))
  const chip = signedIn
    ? <Link to={walletTarget(coins)} aria-label={`${coins} coins - open wallet`} className="flex h-11 items-center gap-2 rounded-full bg-[#191919] pl-2 pr-4 text-[15px] font-semibold text-[#FFFFFF]"><img src="/images/features/coin.svg" alt="" className="size-6 object-contain" />{coins.toLocaleString()}</Link>
    : <button type="button" onClick={openLogin} aria-label="Claim 100 coins" className="flex h-11 items-center gap-2 rounded-full bg-[#191919] pl-2 pr-4 text-[15px] font-semibold text-[#FFFFFF] active:scale-95"><img src="/images/features/coin.svg" alt="" className="size-6 object-contain" />100</button>
  return (
    <>
      <header className={`relative z-50 flex h-[68px] items-center justify-between gap-3 bg-[#000000]/90 px-4 backdrop-blur md:hidden ${generating ? 'max-sm:hidden' : ''}`}>
        {main ? (
          <div className="min-w-0"><Logo size="sm" /></div>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Back" onClick={back} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-[14px] bg-[#191919] text-white active:scale-95"><svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button>
            <span className="truncate text-[20px] font-bold text-white">{title}</span>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-2.5">
          {chip}
          {main && <button type="button" aria-label="More" onClick={() => setMore(true)} className="grid size-11 cursor-pointer place-items-center rounded-[14px] bg-[#191919] text-white active:scale-95"><svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg></button>}
        </div>
      </header>
      {more && <MoreSheet onClose={() => setMore(false)} onPlans={() => setLastMan('plans')} />}
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
