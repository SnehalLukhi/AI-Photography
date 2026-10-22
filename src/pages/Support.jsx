import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'
import { displayName } from '../components/Header.jsx'
import PlansSheet from '../components/PlansSheet.jsx'
import { brandImages } from '../data/images.js'
import { getPurchases, getSubscription, cancelSubscription } from '../lib/aiPhotography.js'
import { formatDate, formatMoney } from '../lib/format.js'
import { termsTitle, termsSections, termsDate } from '../data/termsContent.js'

const Hero = ({ eyebrow, title, sub }) => (
  <header className="mx-auto max-w-3xl px-4 pt-10 text-center">
    <p className="text-xs font-semibold uppercase tracking-wide text-[#FF55AA]">{eyebrow}</p>
    <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-[#ffffff] sm:text-5xl">{title}</h1>
    <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#A0A0A0] sm:text-lg">{sub}</p>
  </header>
)
const field = 'w-full rounded-xl border border-white/10 bg-[#2B2B2B] px-4 text-sm text-white outline-none transition placeholder:text-[#A0A0A0] focus:border-[#FF55AA]/60'
const submitBtn = 'grad-bg flex h-12 w-full cursor-pointer items-center justify-center rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50'

const topics = [
  ['Getting Started', 'Learn the basic workflow.', 'Pick a template, upload a clear photo, and press Generate. Results land in My Creations.'],
  ['Photo Upload Guide', 'Choose the best source photo.', 'Use a clear, front-facing photo with good lighting. JPG, PNG and HEIC are supported.'],
  ['AI Generation', 'Understand image and video creation.', 'Images take seconds; videos take a little longer depending on duration (5-20 seconds).'],
  ['Coins & Billing', 'Payments, packs and balances.', 'Each generation uses coins. Plans include a coin balance.'],
  ['Subscriptions', 'Manage plans and renewals.', 'Plans auto-renew and can be cancelled anytime.'],
  ['Troubleshooting', 'Fix common generation issues.', 'Try a sharper photo or a different template.'],
]

export function Help() {
  const [open, setOpen] = useState(-1)
  return (
    <div className="px-4 pb-24 md:pb-16">
      <Hero eyebrow="Support" title="How Can We Help?" sub="Find answers, tutorials and troubleshooting guides." />
      <div className="mx-auto mt-14 grid max-w-[1120px] gap-5 sm:grid-cols-2">
        {topics.map(([t, d, body], i) => (
          <button key={t} type="button" onClick={() => setOpen(open === i ? -1 : i)} className={`cursor-pointer self-start rounded-[20px] border bg-[#2B2B2B] px-6 py-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 ${open === i ? 'border-white/20' : 'border-white/[0.06]'}`}>
            <span className="block text-[17px] font-semibold text-white">{t}</span>
            <span className="mt-1.5 block text-sm text-[#A0A0A0]">{d}</span>
            {open === i && <span className="mt-3 block border-t border-white/10 pt-3 text-sm text-[#A0A0A0]">{body}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

const Card = ({ children, w = 'max-w-[760px]' }) => <div className={`mx-auto mt-10 w-full ${w} rounded-[28px] border border-white/[0.06] bg-[#2B2B2B] p-6 sm:p-8`}>{children}</div>

export function Contact() {
  const { userEmail } = useStudio()
  const [title, setTitle] = useState('')
  const [email, setEmail] = useState(userEmail || '')
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)
  const input = useRef(null)
  const pick = (f) => {
    setErr('')
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { setErr('Please choose a JPG, JPEG, PNG or WEBP image.'); return }
    if (f.size > 5 * 1024 * 1024) { setErr('This image is larger than 5 MB.'); return }
    setFile(f)
  }
  const valid = title.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && text.trim()
  return (
    <div className="px-4 pb-24 md:pb-16">
      <Hero eyebrow="Support Request" title="Contact Support" sub="Tell us what happened and our team will review it." />
      <Card w="max-w-[760px]">
        {sent ? (
          <div className="py-10 text-center"><p className="mb-1 text-lg font-medium">✓ Request noted</p><button type="button" onClick={() => { setSent(false); setTitle(''); setText(''); setFile(null) }} className="btn-grad">Write another</button></div>
        ) : (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (valid) setSent(true) }}>
            <label className="block text-sm font-semibold text-white">Title<input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter Title" className={`${field} mt-2 h-12`} /></label>
            <label className="block text-sm font-semibold text-white">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" className={`${field} mt-2 h-12`} /></label>
            <label className="block text-sm font-semibold text-white">Description<textarea required value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Enter Description" className={`${field} mt-2 h-[150px] resize-none py-3`} /></label>
            <div>
              <p className="text-sm font-semibold text-white">Attachment (Optional)</p>
              <div onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]) }}
                className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 px-4 py-8 text-center transition hover:border-[#FF55AA]/60">
                <span className="inline-flex items-center gap-2 rounded-lg bg-white/[0.07] px-3.5 py-2 text-[13px] font-semibold text-white"><svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V5M7 9l5-5 5 5M5 19h14" /></svg>Upload Image</span>
                <span className="text-sm text-white/90">{file ? file.name : 'Click or drag image here (Max 5MB)'}</span>
                <span className="text-xs text-[#A0A0A0]">JPG, JPEG, PNG, and WEBP supported</span>
                <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
              </div>
              {file && <button type="button" onClick={() => setFile(null)} className="mt-2 cursor-pointer text-xs text-[#A0A0A0] underline underline-offset-2 hover:text-white">Remove image</button>}
              {err && <p role="alert" className="mt-2 text-xs text-red-400">{err}</p>}
            </div>
            <button className={submitBtn} disabled={!valid}>Submit Request</button>
          </form>
        )}
      </Card>
    </div>
  )
}

/** The user's auto-renewing plan (null = none), with a cancel action. `loaded` is false until the first answer. */
function useSubscription() {
  const { signedIn } = useStudio()
  const [sub, setSub] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!signedIn) return
    let live = true
    getSubscription().then((s) => live && (setSub(s), setLoaded(true))).catch(() => live && setLoaded(true))
    return () => { live = false }
  }, [signedIn])
  const cancel = async () => {
    if (!window.confirm(`Cancel your ${sub.name} plan? It will not renew, and you keep it until ${formatDate(sub.renewsAt || sub.endsAt)}.`)) return
    setBusy(true); setError('')
    try { setSub(await cancelSubscription()) } catch (e) { setError(e.message) }
    setBusy(false)
  }
  return { sub, loaded, busy, error, cancel }
}

/** "Current plan" card: the auto-renewing plan with its renewal date and a Cancel button, else the latest plan that was bought once. */
function CurrentPlan({ className, purchases, lastPlan, plan, tabIndex }) {
  const { sub, busy, error, cancel } = plan
  return (
    <div className={className}>
      <p className="text-xs text-[#A0A0A0]">Current plan</p>
      <p className="mt-1 text-[15px] font-bold text-white">{sub ? sub.name : purchases === null ? '…' : lastPlan ? lastPlan.name : 'No plan purchased'}</p>
      {sub
        ? <p className="mt-0.5 text-xs text-[#A0A0A0]">{sub.cancelRequested ? `Will not renew - ends ${formatDate(sub.endsAt)}` : sub.renewsAt ? `Renews automatically on ${formatDate(sub.renewsAt)}` : 'Renews automatically'}</p>
        : lastPlan && <p className="mt-0.5 text-xs text-[#A0A0A0]">Bought {formatDate(lastPlan.paidAt)}</p>}
      {sub && !sub.cancelRequested && <button type="button" tabIndex={tabIndex} disabled={busy} onClick={cancel} className="mt-2 cursor-pointer text-xs font-semibold text-[#FF88C7] underline disabled:opacity-60">{busy ? 'Cancelling…' : 'Cancel plan'}</button>}
      {error && <p role="alert" className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  )
}

/** The user's paid purchases (plans and coin packs), newest first; null while loading. */
function usePurchases() {
  const { signedIn } = useStudio()
  const [list, setList] = useState(null)
  useEffect(() => {
    if (!signedIn) return
    let live = true
    getPurchases().then((l) => live && setList(l)).catch(() => live && setList([]))
    return () => { live = false }
  }, [signedIn])
  return list
}

const I = (d) => <svg className="size-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
const meItems = [
  ['Profile Settings', '/profile?view=settings', 'M12 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM5 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5'],
  ['My Creations', '/creations', 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4'],
  ['Coin Details', '/coins', 'M12 21a9 9 0 100-18 9 9 0 000 18zM14.5 9.5a3 3 0 100 5M14.5 12H12'],
]
const Chev = () => <svg className="size-4 shrink-0 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>

/** Phone-only "Me" menu (Glymo layout): Premium card + list of existing pages. */
function MobileMe() {
  const { signedIn, userEmail, coins } = useStudio()
  const purchases = usePurchases()
  const plan = useSubscription()
  const lastPlan = purchases?.find((p) => p.kind === 'plan')
  const [plansOpen, setPlansOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false) // Plan & Purchases dropdown
  const row = 'flex h-[54px] w-full items-center gap-3.5 border-b border-white/[0.06] px-4 text-left text-[14px] text-white last:border-b-0'
  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pb-32 pt-4 md:hidden">
      {signedIn && <p className="mb-3 truncate px-1 text-[13px] text-[#A0A0A0]">{userEmail}</p>}
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#3a2c22] via-[#1d1815] to-[#141212] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        <div className="absolute right-6 top-6 text-[#F8A85B]"><svg className="size-11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6.5" /><path d="M8.2 14.2V21.5l3.8-2.4 3.8 2.4V14.2" /><path d="M12 5.6l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z" fill="currentColor" stroke="none" /></svg></div>
        <h2 className="text-[26px] font-semibold text-[#F8A85B]">Premium</h2>
        <p className="mt-2 text-[14px] text-white">Unlock ultimate creative power.</p>
        <ul className="mt-4 space-y-2.5 text-[14px] text-white">
          {['1000+ Templates', 'HD Quality Outputs'].map((t) => <li key={t} className="flex items-center gap-2.5"><span className="size-1.5 rounded-full bg-[#F8A85B]" />{t}</li>)}
        </ul>
        <button type="button" onClick={() => setPlansOpen(true)} className="mt-6 flex h-14 cursor-pointer w-full items-center justify-center rounded-full text-[16px] font-semibold text-[#1a1208] shadow-[0_6px_24px_rgba(240,140,40,0.35)]" style={{ background: 'linear-gradient(90deg, #FDB171 0%, #E07B0A 100%)' }}>Upgrade to Pro</button>
      </div>
      <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-[#1C1C1C]">
        <button type="button" onClick={() => setPlanOpen((o) => !o)} aria-expanded={planOpen} aria-controls="plan-purchases" className="flex h-[54px] w-full cursor-pointer items-center gap-3.5 px-4 text-left text-[14px] font-semibold text-white">
          {I('M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z')}<span className="flex-1">Plan &amp; purchases</span>
          <svg className={`size-4 shrink-0 text-white/50 transition-transform duration-300 ${planOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <div id="plan-purchases" className={`grid transition-[grid-template-rows] duration-300 ease-out ${planOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} aria-hidden={!planOpen}>
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-2 border-t border-white/[0.06] p-3.5">
              <CurrentPlan className="rounded-2xl border border-white/[0.06] bg-[#2B2B2B] px-3.5 py-2.5" purchases={purchases} lastPlan={lastPlan} plan={plan} />
              <div className="rounded-2xl border border-white/[0.06] bg-[#2B2B2B] px-3.5 py-2.5"><p className="text-xs text-[#A0A0A0]">Coin balance</p><p className="mt-1 text-[15px] font-bold text-white">{coins.toLocaleString('en-US')} coins</p><Link to="/coins" tabIndex={planOpen ? 0 : -1} className="mt-0.5 inline-block text-xs font-semibold text-[#A0A0A0] underline">Get more coins</Link></div>
              <Link to="/transactions" tabIndex={planOpen ? 0 : -1} className="inline-block pt-1 text-[13px] font-semibold text-[#A0A0A0] underline">View all transactions</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-[#1C1C1C]">
        {meItems.map(([label, to, d]) => <Link key={label} to={to} className={row}>{I(d)}<span className="flex-1">{label}</span><Chev /></Link>)}
      </div>
      {plansOpen && <PlansSheet onClose={() => setPlansOpen(false)} />}
    </div>
  )
}

export function Profile() {
  const { signedIn, userEmail, coins, openLogin } = useStudio()
  const purchases = usePurchases()
  const plan = useSubscription()
  const lastPlan = purchases?.find((p) => p.kind === 'plan') // plans are one-time coin purchases: the latest one is "your plan"
  const name = displayName(userEmail || '')
  const [first, ...rest] = name.split(' ')
  const last = rest.join(' ')
  const settings = useSearchParams()[0].get('view') === 'settings' // phones: the account menu is the default view, the form opens from "Profile Settings"
  const lbl = 'mb-1.5 max-md:mb-1 block text-[13px] font-bold text-white'
  const box = 'h-11 max-md:h-10 w-full min-w-0 truncate rounded-2xl max-md:rounded-xl max-md:px-3.5 border border-white/10 bg-[#1D1B1D] px-4 text-[13px] outline-none'
  return (
    <>
    {!settings && <MobileMe />}
    <div className={`px-4 pb-32 pt-8 max-md:h-auto max-md:overflow-visible max-md:pb-[calc(9rem+env(safe-area-inset-bottom,0px))] max-md:pt-4 md:pb-16 md:pt-10 ${settings ? '' : 'max-md:hidden'}`}>
      <div className="mx-auto w-full max-w-[640px]">
        <h1 className="text-[34px] font-bold leading-[1.05] tracking-tight text-white sm:text-[38px]">Profile Settings</h1>
        <p className="mt-2 text-[13px] text-[#A0A0A0]">Manage your personal information and account details.</p>
        <div className="mt-7 max-md:mt-5 rounded-[24px] max-md:rounded-[22px] border border-white/[0.07] bg-[#2B2B2B] p-6 max-md:p-4 sm:p-6">
          {signedIn ? (
            <>
              <div className="flex items-center gap-4 max-md:gap-3.5 border-b border-white/[0.08] pb-5 max-md:pb-4">
                <span className="grid size-[68px] max-md:size-14 shrink-0 place-items-center rounded-full border-[3px] border-[#2B2B2B] bg-[#8d7468] text-[32px] max-md:text-[26px] font-light leading-none text-white">{(name[0] || 'P').toUpperCase()}</span>
                <div className="min-w-0"><p className="truncate text-xl font-bold text-white sm:text-[22px]">{name}</p><p className="mt-1.5 truncate text-[13px] text-[#A0A0A0]" title={userEmail}>{userEmail}</p></div>
              </div>
              <div className="mt-6 max-md:mt-4 grid gap-4 max-md:gap-3.5 sm:grid-cols-2 sm:gap-x-4">
                <div><label htmlFor="pf-first" className={lbl}>First name</label><input id="pf-first" readOnly value={first || ''} placeholder="Not set" className={`${box} font-bold text-white`} /></div>
                <div><label htmlFor="pf-last" className={lbl}>Last name</label><input id="pf-last" readOnly value={last} placeholder="Not set" className={`${box} font-bold text-white`} /></div>
              </div>
              <div className="mt-4 max-md:mt-3.5"><label htmlFor="pf-email" className={lbl}>Email address</label><input id="pf-email" readOnly value={userEmail || ''} title={userEmail} className={`${box} text-[#A0A0A0]/70`} /></div>
              <div className="mt-4 max-md:mt-3.5"><label htmlFor="pf-country" className={lbl}>Country</label><input id="pf-country" readOnly disabled placeholder="Not set" className={`${box} text-[#A0A0A0]/70 placeholder:text-[#A0A0A0]/55`} /></div>
              <div className="mt-4 max-md:mt-3.5"><label htmlFor="pf-since" className={lbl}>Member since</label><input id="pf-since" readOnly disabled placeholder="Not available" className={`${box} text-[#A0A0A0]/70 placeholder:text-[#A0A0A0]/55`} /></div>
              <div className="mt-6 max-md:hidden border-t border-white/[0.08] pt-5 max-md:rounded-2xl max-md:border max-md:border-white/[0.1] max-md:bg-black/20 max-md:p-3.5">
                <h2 className="text-[15px] font-bold text-white">Plan &amp; purchases</h2>
                <div className="mt-4 max-md:mt-3 grid gap-3 max-md:gap-2 sm:grid-cols-2">
                  <CurrentPlan className="rounded-2xl border border-white/10 bg-[#1D1B1D] px-4 py-3 max-md:px-3.5 max-md:py-2.5" purchases={purchases} lastPlan={lastPlan} plan={plan} />
                  <div className="rounded-2xl border border-white/10 bg-[#1D1B1D] px-4 py-3 max-md:px-3.5 max-md:py-2.5"><p className="text-xs text-[#A0A0A0]">Coin balance</p><p className="mt-1 text-[15px] font-bold text-white">{coins.toLocaleString('en-US')} coins</p><Link to="/coins" className="mt-0.5 inline-block text-xs font-semibold text-[#A0A0A0] underline">Get more coins</Link></div>
                </div>
                {purchases?.length > 0 && (
                  <ul className="mt-4 divide-y divide-white/[0.06] rounded-2xl border border-white/10 bg-[#1D1B1D]">
                    {purchases.slice(0, 3).map((p) => (
                      <li key={p.paymentId} className="flex items-center justify-between gap-3 px-[18px] py-3 text-[13px]"><span className="min-w-0"><span className="block truncate font-semibold text-white">{p.name} {p.kind === 'plan' ? 'plan' : 'coin pack'}</span><span className="text-xs text-[#A0A0A0]">{formatDate(p.paidAt)} · +{p.coins.toLocaleString('en-US')} coins</span></span><span className="shrink-0 font-semibold text-white">{formatMoney(p.amount, p.currency)}</span></li>
                    ))}
                  </ul>
                )}
                <Link to="/transactions" className="mt-4 inline-block text-[13px] font-semibold text-[#A0A0A0] underline">View all transactions</Link>
              </div>
              <button type="button" disabled title="Editing your profile is not available yet" className="mt-6 max-md:mt-5 h-11 max-md:h-11 max-md:w-full cursor-not-allowed rounded-2xl px-[25px] text-sm font-bold text-white opacity-60" style={{ background: 'linear-gradient(90deg, #FF88C7 0%, #FF55AA 100%)' }}>Save Changes</button>
            </>
          ) : (
            <div className="py-8 text-center"><p className="mb-5 text-lg font-medium text-white">Sign in to see your profile</p><button type="button" onClick={openLogin} className="btn-grad">Sign in to Pictrify</button></div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}

// Receipt-with-coin illustration for the empty Transactions state (existing coin.svg + a drawn receipt and sparkles).
const Sparkle = ({ className }) => <svg className={`absolute size-2.5 text-white/80 ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1l2.4 8.6L23 12l-8.6 2.4L12 23l-2.4-8.6L1 12l8.6-2.4z" /></svg>
const EmptyReceipt = () => (
  <div className="relative mx-auto h-[128px] w-[140px]" aria-hidden="true">
    <svg className="absolute left-[24px] top-[10px] h-[100px] w-[80px]" viewBox="0 0 80 100" fill="none">
      <defs><linearGradient id="rc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2B2B2B" /><stop offset="1" stopColor="#23222f" /></linearGradient></defs>
      <path d="M8 2h64a6 6 0 016 6v70a10 10 0 01-10 10H18a10 10 0 01-10-10V8a6 6 0 016-6z" fill="url(#rc)" stroke="#2B2B2B" strokeWidth="1.5" />
      <rect x="14" y="16" width="32" height="5" rx="2.5" fill="#2B2B2B" /><rect x="14" y="31" width="52" height="5" rx="2.5" fill="#2B2B2B" /><rect x="14" y="46" width="42" height="5" rx="2.5" fill="#2B2B2B" />
      <path d="M8 74h40a10 10 0 000 .1" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
    <img src={brandImages.coin} alt="" width="46" height="46" className="absolute bottom-[16px] right-[22px] size-[46px] object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]" />
    <Sparkle className="left-0 top-[44px]" /><Sparkle className="right-[2px] top-[4px]" /><Sparkle className="right-0 top-[44px]" /><Sparkle className="bottom-[22px] left-[12px]" /><Sparkle className="bottom-[6px] right-[8px]" />
  </div>
)

export function Transactions() {
  const { signedIn, openLogin } = useStudio()
  const purchases = usePurchases()
  return (
    <div className="px-4 pb-24 pt-8 md:pb-16 md:pt-10">
      <div className="mx-auto w-full max-w-[1040px]">
        <p className="text-xs font-bold uppercase tracking-wide text-[#FF55AA]">Payments and Coins</p>
        <h1 className="mt-3 text-[34px] font-bold leading-[1.05] tracking-tight text-white sm:text-[44px] lg:text-[48px]">Transaction History</h1>
        <p className="mt-4 text-base text-[#A0A0A0]">Track subscriptions, coin purchases and refunds.</p>
        <div className="mt-9 rounded-[24px] border border-white/[0.07] bg-[#2B2B2B] px-6 py-12 text-center">
          {signedIn ? (
            purchases?.length ? (
              <ul className="divide-y divide-white/[0.06] text-left">
                {purchases.map((p) => (
                  <li key={p.paymentId} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-4">
                    <span className="min-w-0"><span className="block text-[15px] font-bold text-white">{p.name} {p.kind === 'plan' ? 'plan' : 'coin pack'}</span><span className="text-xs text-[#A0A0A0]">{formatDate(p.paidAt, true)} · Payment ID {p.paymentId}</span></span>
                    <span className="text-right"><span className="block text-[15px] font-bold text-white">{formatMoney(p.amount, p.currency)}{p.offerPercent > 0 && <span className="ml-2 text-xs font-semibold text-[#FF88C7]">{p.offerPercent}% off</span>}</span><span className="text-xs font-semibold text-emerald-300">+{p.coins.toLocaleString('en-US')} coins</span></span>
                  </li>
                ))}
              </ul>
            ) : purchases === null ? (
              <p className="py-8 text-sm text-[#A0A0A0]">Loading…</p>
            ) : (
              <>
                <EmptyReceipt />
                <p className="mt-5 text-[15px] font-bold text-white">No transactions yet</p>
                <p className="mt-2 text-[13px] text-[#A0A0A0]/80">Subscriptions and coin purchases will show up here.</p>
                <Link to="/coins" className="grad-bg mt-6 inline-flex h-10 items-center justify-center rounded-[10px] px-5 text-[13px] font-bold">Get coins</Link>
              </>
            )
          ) : (
            <><p className="mb-5 text-lg font-medium text-white">Sign in to see your transactions</p><button type="button" onClick={openLogin} className="btn-grad">Sign in to Pictrify</button></>
          )}
        </div>
      </div>
    </div>
  )
}

export function Feedback() {
  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <div className="px-4 pb-32 md:pb-16">
      <div className="mx-auto flex w-full max-w-[560px] items-center gap-4 pt-4 md:hidden">
        <Link to="/profile" aria-label="Back" className="grid size-10 cursor-pointer place-items-center rounded-full bg-[#2B2B2B] text-white"><svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></Link>
        <h1 className="text-xl font-bold text-white">Feedback</h1>
      </div>
      <div className="max-md:hidden"><Hero eyebrow="Product Feedback" title="Share Your Feedback" sub="Tell us about your experience and how we can make Pictrify better for you." /></div>
      <div className="mx-auto mt-6 w-full max-w-[560px] md:mt-10 md:max-w-[640px] md:rounded-[28px] md:border md:border-white/[0.06] md:bg-[#2B2B2B] md:p-8">
        {sent ? (
          <div className="py-10 text-center"><p className="mb-1 text-lg font-medium">✓ Thanks for your feedback</p><button className="btn-dark" onClick={() => { setSent(false); setStars(0); setText('') }}>Send more</button></div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
            <div className="flex justify-center gap-3 py-6 min-[400px]:gap-5 md:py-8" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setStars(n)} onMouseEnter={() => setHover(n)} className="cursor-pointer transition-transform hover:scale-110 active:scale-95">
                  <svg className={`size-10 min-[400px]:size-11 transition-colors ${n <= (hover || stars) ? 'fill-[#fbbf24] text-[#fbbf24] max-md:fill-[#FF55AA] max-md:text-[#FF55AA]' : 'fill-none text-white/25'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
                </button>
              ))}
            </div>
            <div className="mb-3 flex items-center justify-between text-sm max-md:mb-2"><label htmlFor="fb" className="font-semibold text-white">Description</label><span className="text-xs text-[#A0A0A0]">{text.length}/500</span></div>
            <textarea id="fb" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Tell us what you like or how we can improve..." className={`${field} h-[150px] resize-none py-3 max-md:rounded-2xl max-md:border-white/[0.08] max-md:bg-[#1A181A]`} />
            <button className={`${submitBtn} mt-6 max-md:h-[52px] max-md:rounded-full max-md:shadow-[0_6px_24px_rgba(255,85,170,0.35)] md:mt-8`} disabled={!stars || !text.trim()}>Submit Feedback</button>
          </form>
        )}
      </div>
    </div>
  )
}

const legal = {
  privacy: ['Privacy Policy', [['Introduction', ['This is placeholder text. Replace it with your real privacy policy before launch.', 'It should explain how you collect, use, store and protect user information, uploaded media, and purchase data.']], ['Information We Collect', ['Account and profile information, uploaded photos and generated media, and purchase records. (Placeholder.)']], ['Your Choices', ['You can request deletion of your data at any time via Contact Support. (Placeholder.)']]]],
  terms: [termsTitle, termsSections, termsDate], // full text of "Terms and Conditions.pdf" (src/data/termsContent.js)
}
// One block of a legal page: a string = paragraph, { ul } = bullet list, { kv } = bold label + value (optionally a link)
const legalBlock = (b, i) => {
  if (typeof b === 'string') return <p key={i} className="mb-4 leading-relaxed text-[#A0A0A0]">{b}</p>
  if (b.ul) return <ul key={i} className="mb-4 list-disc space-y-2 pl-6 leading-relaxed text-[#A0A0A0] marker:text-[#FF55AA]">{b.ul.map((x, j) => <li key={j}>{typeof x === 'string' ? x : <><strong className="font-semibold text-white">{x.b}</strong>{x.t}</>}</li>)}</ul>
  return <p key={i} className="mb-4 leading-relaxed text-[#A0A0A0]"><strong className="font-semibold text-white">{b.kv[0]}</strong> {b.kv[2] ? <a href={b.kv[2]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 transition-colors hover:text-white">{b.kv[1]}</a> : b.kv[1]}</p>
}
export function Legal({ kind }) {
  const [title, sections, date] = legal[kind]
  const nav = useNavigate()
  return (
    <div className="relative z-10 px-4 pb-32 pt-4 sm:px-6 sm:pt-16 md:pb-16 lg:px-8">
      <button type="button" aria-label="Back" onClick={() => nav(-1)} className="mb-3 grid size-10 cursor-pointer place-items-center rounded-full bg-[#2B2B2B] text-white md:hidden"><svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
      <div className="mx-auto max-w-4xl space-y-4 break-words text-[#A0A0A0]">
        <h1 className="mb-6 text-3xl font-bold text-[#ffffff] sm:mb-8 sm:text-4xl">{title}</h1>
        <p className="mb-4 leading-relaxed"><strong className="font-semibold text-white">Effective Date:</strong> {date || 'Placeholder'}</p>
        {sections.map(([h, blocks]) => (
          <div key={h}><h2 className="mb-4 mt-8 text-xl font-semibold text-[#ffffff] sm:text-2xl">{h}</h2>{blocks.map(legalBlock)}</div>
        ))}
      </div>
    </div>
  )
}
