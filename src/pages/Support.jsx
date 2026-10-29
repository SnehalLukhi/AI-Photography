import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'
import { displayName } from '../components/Header.jsx'
import PlansSheet from '../components/PlansSheet.jsx'
import { getPurchases, getSubscription, cancelSubscription } from '../lib/aiPhotography.js'
import { formatDate, formatMoney } from '../lib/format.js'
import { termsTitle, termsSections, termsDate } from '../data/termsContent.js'

const Hero = ({ eyebrow, title, sub, center = false }) => (
  <header className="mx-auto w-full max-w-[1100px] px-5 pt-8 sm:px-8 sm:pt-12 lg:px-10">
    <div className={`relative overflow-hidden rounded-3xl bg-[#1B1530] px-6 py-12 sm:px-12 sm:py-16 ${center ? 'flex flex-col items-center text-center' : ''}`}>
      <span className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-[#271425]" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-12 right-1/4 size-32 rounded-full bg-[#101D2C]" aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-8 left-[8%] size-6 rounded-full bg-[#262310]" aria-hidden="true" />
      <p className="badge relative">{eyebrow}</p>
      <h1 className="relative mt-4 w-fit text-[40px] font-extrabold leading-[1.05] tracking-tight text-[#FFFFFF] sm:text-[60px]">{title}</h1>
      <p className="relative mt-4 max-w-2xl text-[16px] leading-relaxed text-[#A1A1AA] sm:text-[18px]">{sub}</p>
    </div>
  </header>
)
const field = 'w-full rounded-2xl border border-[#272033] bg-[#12101B] px-4 text-[15px] text-[#FFFFFF] outline-none transition placeholder:text-[#9A94AB] focus:border-[#FF3DF2] focus:ring-4 focus:ring-[#FF3DF2]/15'
const TILES = ['bg-[#1B1530]', 'bg-[#271425]', 'bg-[#101D2C]', 'bg-[#102419]', 'bg-[#2A1C10]', 'bg-[#262310]']
const submitBtn = 'btn-primary !w-full !rounded-full !py-3.5 !text-[15px] disabled:cursor-not-allowed disabled:opacity-50'

const topics = [
  ['Getting Started', 'Learn the basic workflow.', [
    'Browse templates on Home or Explore and tap one to open it.',
    'Add a photo of yourself, then press Generate. If you are not signed in yet, you will be asked to sign in first.',
    'Your finished image is saved in My Creations.',
  ]],
  ['Photo Upload Guide', 'Choose the best source photo.', [
    'Use a clear, front-facing photo with good lighting and your face fully visible.',
    'Most templates accept JPG, PNG or WebP up to 10 MB. Cartoon and Hairstyle templates accept JPG or PNG up to 5 MB.',
    'HEIC photos cannot be used to generate. Save or export the photo as JPG or PNG first.',
    'Use the ✕ on your photo to remove it, or Change Photo to pick another one.',
  ]],
  ['AI Generation', 'How your image is created.', [
    'Pictrify turns your photo into the style of the template you picked. Each generation makes one image.',
    'It can take up to a minute. Keep the page open until your result appears.',
    'Templates are grouped into categories such as 80’s & 90’s, Cartoon, LinkedIn Headshot, Old Money, Beard and Hairstyle.',
  ]],
  ['Coins & Billing', 'Coins, packs and payments.', [
    'Every generation costs coins (150 coins at the moment). New accounts get free coins to start.',
    'If a generation fails, the coins are returned to your balance automatically.',
    'Need more? Open Get More Coins and buy a one-time coin pack. Coins do not expire.',
    'Payments are processed securely through Razorpay. Your purchases are listed on the Transactions page, which you can open from the profile menu.',
  ]],
  ['Plans & Pricing', 'See what each plan includes.', [
    'The Pricing page lists the Weekly, Monthly and Yearly plans with their price and the coins each one adds.',
    'After a payment succeeds, the plan’s coins are added to your balance. You use them for generations like any other coins.',
    'Any special offer or discount shown on the Pricing or Get More Coins page is applied to the price you pay at checkout.',
  ]],
  ['Likes & My Creations', 'Save favourites and find your images.', [
    'Tap the heart on a template in Explore to like it. Likes are saved to your account, so they stay after you refresh or log in again. Tap it again to unlike.',
    'My Creations shows every image you have generated. Open one to compare your original with the AI result, then open or download it, or delete it.',
  ]],
  ['Account & Login', 'Sign in and manage your account.', [
    'You sign in with your Google or Apple account. A new account is created the first time you sign in.',
    'Open the profile menu to see Profile Settings, Transactions, Help, Contact Support, Share Your Feedback, Privacy Policy, Terms & Conditions and Log out.',
    'Profile Settings shows your name and email from your sign-in account. These details are for viewing only.',
  ]],
  ['Troubleshooting', 'Fix common generation issues.', [
    'Photo rejected? Check that it is a JPG, PNG or WebP (JPG or PNG for Cartoon and Hairstyle) and within the size limit.',
    'Not enough coins? Open Get More Coins, then try again.',
    'Generation failed? Your coins are returned. Try a sharper, well-lit photo or a different template.',
    'Signed out unexpectedly? Sign in again and your coins, likes and creations will still be there.',
    'Still stuck? Use Contact Support from the profile menu.',
  ]],
]

export function Help() {
  const [open, setOpen] = useState(0)
  return (
    <div className="pb-8">
      <Hero eyebrow="Support" title="Help" sub="Answers, how-tos and troubleshooting for Pictrify." />
      <div className="mx-auto mt-8 w-full max-w-[1100px] px-5 sm:px-8 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {topics.map(([t], i) => (
            <button key={t} type="button" onClick={() => setOpen(open === i ? -1 : i)} className={`cursor-pointer rounded-2xl p-5 text-left text-[15px] font-bold text-[#FFFFFF] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.14)] ${TILES[i % TILES.length]} ${open === i ? 'ring-2 ring-[#FFFFFF]' : ''}`}>{t}</button>
          ))}
        </div>
        <div className="mt-8 space-y-3">
          {topics.map(([t, d, body], i) => (
            <div key={t} className={`overflow-hidden rounded-2xl border bg-[#12101B] transition-colors ${open === i ? 'border-[#FFFFFF] shadow-[0_18px_40px_rgba(0,0,0,0.08)]' : 'border-[#272033] hover:border-[#3A2F52]'}`}>
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full cursor-pointer items-center gap-4 px-5 py-5 text-left sm:px-6">
                <span className="min-w-0 flex-1"><span className="block text-[17px] font-bold text-[#FFFFFF]">{t}</span><span className="mt-0.5 block text-[14px] text-[#A1A1AA]">{d}</span></span>
                <svg className={`size-8 shrink-0 rounded-full bg-[#1A1626] p-2 text-[#A1A1AA] transition-transform ${open === i ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {open === i && <ul className="space-y-2.5 px-5 pb-6 text-[14px] leading-relaxed text-[#A1A1AA] sm:px-6">{body.map((line) => <li key={line} className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#FF3DF2]" />{line}</li>)}</ul>}
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#271425] p-6 sm:p-8"><p className="text-[22px] font-extrabold text-[#FFFFFF]">Still stuck?</p><Link to="/contact-support" className="btn-primary !rounded-full !px-6 !py-3 !text-[14px]">Contact support<span aria-hidden="true">→</span></Link></div>
      </div>
    </div>
  )
}

const Card = ({ children, w = 'max-w-[760px]' }) => <div className={`mx-auto mt-8 w-[calc(100%-40px)] sm:w-[calc(100%-64px)] ${w} rounded-3xl border border-[#272033] bg-[#12101B] p-6 sm:p-10`}>{children}</div>
const Label = ({ children }) => <span className="text-[13px] font-semibold text-[#FFFFFF]">{children}</span>

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
    <div className="mx-auto w-full max-w-none pb-8">
      <Hero center eyebrow="Support request" title="Contact support" sub="Tell us what happened and our team will review it." />
      <Card w="max-w-[760px]">
        {sent ? (
          <div className="py-10 text-center"><p className="mb-5 text-[28px] font-bold">Request noted</p><button type="button" onClick={() => { setSent(false); setTitle(''); setText(''); setFile(null) }} className="btn-dark !rounded-full !px-5 !py-2.5 !text-[14px]">Write another</button></div>
        ) : (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (valid) setSent(true) }}>
            <label className="block space-y-2"><Label>Title</Label><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter title" className={`${field} h-12`} /></label>
            <label className="block space-y-2"><Label>Email</Label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" className={`${field} h-12`} /></label>
            <label className="block space-y-2"><Label>Description</Label><textarea required value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Enter description" className={`${field} h-[150px] resize-none py-3`} /></label>
            <div className="space-y-2">
              <Label>Attachment (optional)</Label>
              <div onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]) }}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#3A2F52] bg-[#12101B] px-4 py-8 text-center transition hover:border-[#A1A1AA] hover:bg-[#1B1530]/40">
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#08080D]"><svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V5M7 9l5-5 5 5M5 19h14" /></svg>Upload image</span>
                <span className="text-[14px]">{file ? file.name : 'Click or drag an image here (max 5 MB)'}</span>
                <span className="text-[12px] text-[#A1A1AA]">JPG, JPEG, PNG and WEBP supported</span>
                <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
              </div>
              {file && <button type="button" onClick={() => setFile(null)} className="cursor-pointer text-[12px] text-[#A1A1AA] underline underline-offset-2 hover:text-[#FFFFFF]">Remove image</button>}
              {err && <p role="alert" className="text-[12px] text-[#C0392B]">{err}</p>}
            </div>
            <button className={submitBtn} disabled={!valid}>Submit request</button>
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
      <p className="eyebrow">Current plan</p>
      <p className="mt-2 text-[17px] font-semibold">{sub ? sub.name : purchases === null ? '…' : lastPlan ? lastPlan.name : 'No plan purchased'}</p>
      {sub
        ? <p className="mt-0.5 text-xs text-[#A1A1AA]">{sub.cancelRequested ? `Will not renew - ends ${formatDate(sub.endsAt)}` : sub.renewsAt ? `Renews automatically on ${formatDate(sub.renewsAt)}` : 'Renews automatically'}</p>
        : lastPlan && <p className="mt-0.5 text-xs text-[#A1A1AA]">Bought {formatDate(lastPlan.paidAt)}</p>}
      {sub && !sub.cancelRequested && <button type="button" tabIndex={tabIndex} disabled={busy} onClick={cancel} className="btn-dark mt-3 !px-4 !py-2 !text-[13px] disabled:opacity-60">{busy ? 'Cancelling…' : 'Cancel plan'}</button>}
      {error && <p role="alert" className="mt-1 text-xs text-[#C0392B]">{error}</p>}
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
const Chev = () => <svg className="size-4 shrink-0 text-[#A1A1AA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>

/** Phone-only "Me" menu, like the reference: Premium card, a Plan & purchases dropdown and a short list of pages. */
function MobileMe() {
  const { signedIn, userEmail, coins } = useStudio()
  const purchases = usePurchases()
  const plan = useSubscription()
  const lastPlan = purchases?.find((p) => p.kind === 'plan')
  const [plansOpen, setPlansOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const row = 'flex h-[54px] w-full items-center gap-3.5 border-b border-[#272033] px-4 text-left text-[14px] text-[#FFFFFF] last:border-b-0'
  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pb-32 pt-4 md:hidden">
      {signedIn && <p className="mb-3 truncate px-1 text-[13px] text-[#A1A1AA]">{userEmail}</p>}
      <div className="relative overflow-hidden rounded-[28px] bg-[#FF3DF2] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.14)]">
        <div className="absolute right-6 top-6 text-white"><svg className="size-11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6.5" /><path d="M8.2 14.2V21.5l3.8-2.4 3.8 2.4V14.2" /><path d="M12 5.6l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z" fill="currentColor" stroke="none" /></svg></div>
        <h2 className="w-fit text-[28px] font-extrabold text-white">Premium</h2>
        <p className="mt-2 text-[14px] text-white/90">Unlock ultimate creative power.</p>
        <ul className="mt-4 space-y-2.5 text-[14px] text-white">
          {['1000+ Templates', 'HD Quality Outputs'].map((t) => <li key={t} className="flex items-center gap-2.5"><span className="size-1.5 rounded-full bg-[#12101B]" />{t}</li>)}
        </ul>
        <button type="button" onClick={() => setPlansOpen(true)} className="btn-primary mt-6 !h-14 !w-full !text-[16px]">Upgrade to Pro</button>
      </div>
      <div className="mt-4 overflow-hidden rounded-[24px] border border-[#272033] bg-[#12101B]">
        <button type="button" onClick={() => setPlanOpen((o) => !o)} aria-expanded={planOpen} aria-controls="plan-purchases" className="flex h-[54px] w-full cursor-pointer items-center gap-3.5 px-4 text-left text-[14px] font-semibold text-[#FFFFFF]">
          {I('M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z')}<span className="flex-1">Plan &amp; purchases</span>
          <svg className={`size-4 shrink-0 text-[#A1A1AA] transition-transform duration-300 ${planOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <div id="plan-purchases" className={`grid transition-[grid-template-rows] duration-300 ease-out ${planOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} aria-hidden={!planOpen}>
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-2 border-t border-[#272033] p-3.5">
              <CurrentPlan className="rounded-2xl bg-[#12101B] px-3.5 py-2.5" purchases={purchases} lastPlan={lastPlan} plan={plan} tabIndex={planOpen ? 0 : -1} />
              <div className="rounded-2xl bg-[#12101B] px-3.5 py-2.5"><p className="eyebrow">Coin balance</p><p className="mt-2 text-[15px] font-bold text-[#FFFFFF]">{coins.toLocaleString('en-US')} coins</p><Link to="/coins" tabIndex={planOpen ? 0 : -1} className="mt-1 inline-block text-xs font-semibold text-[#A1A1AA] underline">Get more coins</Link></div>
              <Link to="/transactions" tabIndex={planOpen ? 0 : -1} className="inline-block pt-1 text-[13px] font-semibold text-[#A1A1AA] underline">View all transactions</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-[24px] border border-[#272033] bg-[#12101B]">
        {meItems.map(([label, to, d]) => <Link key={label} to={to} className={row}>{I(d)}<span className="flex-1">{label}</span><Chev /></Link>)}
      </div>
      {plansOpen && <PlansSheet onClose={() => setPlansOpen(false)} />}
    </div>
  )
}

export function Profile() {
  const { signedIn, userEmail, coins, openLogin, signOut } = useStudio()
  const settings = useSearchParams()[0].get('view') === 'settings' // phones: the Me menu is the default view, the details open from "Profile Settings"
  const purchases = usePurchases()
  const plan = useSubscription()
  const lastPlan = purchases?.find((p) => p.kind === 'plan') // plans are one-time coin purchases: the latest one is "your plan"
  const name = displayName(userEmail || '')
  const [first, ...rest] = name.split(' ')
  const last = rest.join(' ')
  const box = 'h-12 w-full min-w-0 truncate rounded-2xl border border-[#272033] bg-[#12101B] px-4 text-[14px] outline-none'
  const lbl = 'mb-1.5 block text-[13px] font-semibold text-[#FFFFFF]'
  return (
    <>
    {!settings && <MobileMe />}
    <div className={`mx-auto w-full max-w-[1100px] px-5 pb-32 pt-8 text-[#FFFFFF] sm:px-8 sm:pt-12 md:pb-12 lg:px-10 ${settings ? '' : 'max-md:hidden'}`}>
      {!signedIn ? (
        <div className="relative overflow-hidden rounded-3xl bg-[#1B1530] px-6 py-16 text-center sm:py-24">
          <div className="pointer-events-none absolute -left-10 -top-10 size-40 rounded-full bg-[#271425]" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-12 -right-8 size-48 rounded-full bg-[#101D2C]" aria-hidden="true" />
          <div className="relative">
            <h1 className="mx-auto w-fit text-[40px] font-extrabold leading-[1.05] tracking-tight sm:text-[56px]">Your account</h1>
            <p className="mx-auto mt-4 max-w-sm text-[15px] text-[#A1A1AA]">Sign in to see your coins, plan and creations in one place.</p>
            <button type="button" onClick={openLogin} className="btn-primary mt-8 !rounded-full !px-8 !py-3 !text-[15px]">Sign in</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <section aria-label="Profile" className="relative overflow-hidden rounded-3xl bg-[#1B1530]">
            <div className="pointer-events-none absolute -right-16 -top-20 size-[260px] rounded-full bg-[#271425]" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-20 left-1/3 size-[180px] rounded-full bg-[#101D2C]" aria-hidden="true" />
            <div className="relative flex flex-wrap items-center gap-5 p-6 sm:gap-6 sm:p-9">
              <span className="grid size-20 shrink-0 place-items-center rounded-full bg-[#FF3DF2] text-[34px] font-semibold text-white sm:size-24 sm:text-[40px]">{(name[0] || 'P').toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="badge">Account</p>
                <h1 className="mt-3 w-fit max-w-full truncate text-[32px] font-extrabold leading-[1.1] tracking-tight sm:text-[44px]">{name}</h1>
                <p className="mt-1 truncate text-[14px] text-[#A1A1AA] sm:text-[15px]" title={userEmail}>{userEmail}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/creations" className="btn-primary !rounded-full !px-5 !py-2.5 !text-[14px]">My Creations</Link>
                <button type="button" onClick={signOut} className="btn-dark !rounded-full !px-5 !py-2.5 !text-[14px] !text-[#D14343]">Log out</button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
            <section aria-label="Personal details" className="self-start rounded-3xl bg-[#12101B] p-6 sm:p-8">
              <h2 className="mb-6 text-[22px] font-extrabold">Personal details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="pf-first" className={lbl}>First name</label><input id="pf-first" readOnly value={first || ''} placeholder="Not set" className={box} /></div>
                <div><label htmlFor="pf-last" className={lbl}>Last name</label><input id="pf-last" readOnly value={last} placeholder="Not set" className={box} /></div>
              </div>
              <div className="mt-4"><label htmlFor="pf-email" className={lbl}>Email address</label><input id="pf-email" readOnly value={userEmail || ''} title={userEmail} className={`${box} text-[#A1A1AA]`} /></div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="pf-country" className={lbl}>Country</label><input id="pf-country" readOnly disabled placeholder="Not set" className={`${box} text-[#A1A1AA] placeholder:text-[#A1A1AA]`} /></div>
                <div><label htmlFor="pf-since" className={lbl}>Member since</label><input id="pf-since" readOnly disabled placeholder="Not available" className={`${box} text-[#A1A1AA] placeholder:text-[#A1A1AA]`} /></div>
              </div>
              <p className="mt-5 text-[13px] text-[#A1A1AA]">These details come from your sign-in account and are for viewing only.</p>
            </section>

            <div className="flex flex-col gap-6">
              <section aria-label="Coins" className="relative overflow-hidden rounded-3xl bg-[#262310] p-6 sm:p-8">
                <div className="pointer-events-none absolute -right-12 -top-12 size-[160px] rounded-full bg-[#2A1C10]" aria-hidden="true" />
                <div className="relative flex items-center gap-4">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#12101B]"><img src="/images/features/coin.svg" alt="" className="size-9 object-contain" /></span>
                  <div className="flex flex-col"><span className="text-[13px] text-[#A1A1AA]">Coin balance</span><span className="flex items-baseline gap-2"><span className="grad-text text-[44px] font-extrabold leading-none tabular-nums">{coins.toLocaleString('en-US')}</span><span className="text-[14px] text-[#A1A1AA]">coins</span></span></div>
                </div>
                <Link to="/coins" className="btn-primary relative mt-6 !w-full !rounded-full !py-3 !text-[14px]">Get more coins</Link>
              </section>

              <section aria-label="Plan" className="rounded-3xl bg-[#101D2C] p-6 sm:p-8">
                <CurrentPlan className="" purchases={purchases} lastPlan={lastPlan} plan={plan} />
                {purchases?.length > 0 && (
                  <ul className="mt-5 divide-y divide-[#FFFFFF]/10 border-t border-[#FFFFFF]/10">
                    {purchases.slice(0, 3).map((p) => (
                      <li key={p.paymentId} className="flex items-center justify-between gap-3 py-3 text-[13px]"><span className="min-w-0"><span className="block truncate font-semibold">{p.name} {p.kind === 'plan' ? 'plan' : 'coin pack'}</span><span className="text-[12px] text-[#A1A1AA]">{formatDate(p.paidAt)} · +{p.coins.toLocaleString('en-US')} coins</span></span><span className="shrink-0 font-semibold">{formatMoney(p.amount, p.currency)}</span></li>
                    ))}
                  </ul>
                )}
                <Link to="/transactions" className="btn-dark mt-5 !w-full !rounded-full !py-2.5 !text-[14px]">View all transactions<span aria-hidden="true">→</span></Link>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

export function Feedback() {
  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  return (
    <div className="mx-auto w-full max-w-none pb-8">
      <Hero center eyebrow="Product feedback" title="Feedback" sub="Tell us about your experience and how we can make Pictrify better." />
      <Card w="max-w-[640px]">
        {sent ? (
          <div className="py-10 text-center"><p className="mb-5 text-[28px] font-bold">Thanks for your feedback</p><button className="btn-dark !rounded-full !px-5 !py-2.5 !text-[14px]" onClick={() => { setSent(false); setStars(0); setText('') }}>Send more</button></div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
            <Label>How was it?</Label>
            <div className="flex gap-3 py-4" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setStars(n)} onMouseEnter={() => setHover(n)} className="cursor-pointer transition-transform hover:scale-110 active:scale-95">
                  <svg className={`size-10 transition-colors ${n <= (hover || stars) ? 'fill-[#FF3DF2] text-[#FF3DF2]' : 'fill-none text-[#3A2F52]'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
                </button>
              ))}
            </div>
            <div className="mb-2 mt-2 flex items-center justify-between"><label htmlFor="fb"><Label>Description</Label></label><span className="font-plexmono text-[11px] text-[#A1A1AA]">{text.length}/500</span></div>
            <textarea id="fb" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Tell us what you like or how we can improve..." className={`${field} h-[150px] resize-none py-3`} />
            <button className={`${submitBtn} mt-6`} disabled={!stars || !text.trim()}>Submit feedback</button>
          </form>
        )}
      </Card>
    </div>
  )
}

const legal = {
  privacy: ['Privacy Policy', [['Introduction', ['This is placeholder text. Replace it with your real privacy policy before launch.', 'It should explain how you collect, use, store and protect user information, uploaded media, and purchase data.']], ['Information We Collect', ['Account and profile information, uploaded photos and generated media, and purchase records. (Placeholder.)']], ['Your Choices', ['You can request deletion of your data at any time via Contact Support. (Placeholder.)']]]],
  terms: [termsTitle, termsSections, termsDate], // full text of "Terms and Conditions.pdf" (src/data/termsContent.js)
}
// One block of a legal page: a string = paragraph, { ul } = bullet list, { kv } = bold label + value (optionally a link)
const legalBlock = (b, i) => {
  if (typeof b === 'string') return <p key={i} className="mb-4 leading-[1.75] text-[#A1A1AA]">{b}</p>
  if (b.ul) return <ul key={i} className="mb-4 list-disc space-y-2 pl-6 leading-relaxed text-[#A1A1AA] marker:text-[#A1A1AA]">{b.ul.map((x, j) => <li key={j}>{typeof x === 'string' ? x : <><strong className="font-semibold text-[#FFFFFF]">{x.b}</strong>{x.t}</>}</li>)}</ul>
  return <p key={i} className="mb-4 leading-[1.75] text-[#A1A1AA]"><strong className="font-semibold text-[#FFFFFF]">{b.kv[0]}</strong> {b.kv[2] ? <a href={b.kv[2]} target="_blank" rel="noopener noreferrer" className="text-[#FF3DF2] underline underline-offset-2">{b.kv[1]}</a> : b.kv[1]}</p>
}
export function Legal({ kind }) {
  const [title, sections, date] = legal[kind]
  const nav = useNavigate()
  return (
    <div className="px-5 pb-16 pt-8 sm:px-8 sm:pt-14 lg:px-10">
      <div className="mx-auto max-w-[720px] break-words text-[16px] text-[#A1A1AA]">
        <button type="button" onClick={() => nav(-1)} className="mb-3 inline-flex cursor-pointer items-center gap-1.5 text-[13px] hover:text-[#FFFFFF] md:hidden"><svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>Back</button>
        <p className="badge">Legal</p>
        <h1 className="mb-6 mt-4 w-fit text-[38px] font-extrabold leading-[1.05] tracking-tight text-[#FFFFFF] sm:text-[56px]">{title}</h1>
        <p className="mb-4 leading-relaxed"><strong className="font-semibold text-[#FFFFFF]">Effective Date:</strong> {date || 'Placeholder'}</p>
        {sections.map(([h, blocks]) => (
          <div key={h}><h2 className="mb-3 mt-12 border-t border-[#272033] pt-8 text-[24px] font-extrabold leading-tight text-[#FFFFFF]">{h}</h2>{blocks.map(legalBlock)}</div>
        ))}
      </div>
    </div>
  )
}
