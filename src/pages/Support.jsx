import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'
import { displayName } from '../components/Header.jsx'
import PlansSheet from '../components/PlansSheet.jsx'
import { getPurchases, getSubscription, cancelSubscription } from '../lib/aiPhotography.js'
import { formatDate, formatMoney } from '../lib/format.js'
import { termsTitle, termsSections, termsDate } from '../data/termsContent.js'

const Hero = ({ eyebrow, title, sub, center = false }) => (
  <header className="mx-auto w-full max-w-[1100px] px-5 pt-8 max-md:hidden sm:px-8 sm:pt-12 lg:px-10">
    <div className={`relative overflow-hidden rounded-3xl bg-[#191919] px-6 py-12 sm:px-12 sm:py-16 ${center ? 'flex flex-col items-center text-center' : ''}`}>
      <p className="badge relative">{eyebrow}</p>
      <h1 className="relative mt-4 w-fit text-[40px] font-extrabold leading-[1.05] tracking-tight text-[#FFFFFF] sm:text-[60px]">{title}</h1>
      <p className="relative mt-4 max-w-2xl text-[16px] leading-relaxed text-[#A1A1AA] sm:text-[18px]">{sub}</p>
    </div>
  </header>
)
const field = 'w-full rounded-2xl border border-[#3A3A3E] bg-[#191919] px-4 text-[15px] text-[#FFFFFF] outline-none transition placeholder:text-[#A1A1AA] focus:border-[#FF3DF2] focus:ring-4 focus:ring-[#FF3DF2]/15'
const submitBtn = 'btn-primary !w-full !rounded-[14px] !py-3.5 !text-[15px] disabled:cursor-not-allowed disabled:opacity-50'

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

// one outline icon per help topic (same order as `topics`)
const TOPIC_ICONS = [
  'M12 3c3 2 5 5 5 9l-2 3H9l-2-3c0-4 2-7 5-9zM9 15l-2 4 3-1M15 15l2 4-3-1', // Getting Started: rocket
  'M4 8h3l1.5-2h7L17 8h3v11H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z', // Photo Upload Guide: camera
  'M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z', // AI Generation: sparkle
  'M12 21a9 9 0 100-18 9 9 0 000 18zM14.5 9.5a3 3 0 00-5 1.5c0 3 5 1.5 5 4.5a3 3 0 01-5 1.5M12 7v1.5M12 15.5V17', // Coins & Billing: coin
  'M3.5 18.5l-1-9 5 3.5L12 5l4.5 8 5-3.5-1 9zM3.8 21h16.4', // Plans & Pricing: crown
  'M12 20.5s-8-4.9-8-11A4.5 4.5 0 0112 7a4.5 4.5 0 018 2.5c0 6.1-8 11-8 11z', // Likes & My Creations: heart
  'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.5-6 8-6s8 2 8 6', // Account & Login: person
  'M14.7 6.3a4 4 0 00-5.4 5.1L3.5 17.2a1.5 1.5 0 002.1 2.1l5.8-5.8a4 4 0 005.1-5.4l-2.5 2.5-2-.5-.5-2z', // Troubleshooting: wrench
]
const HelpIcon = ({ d, className = 'size-5' }) => <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
// the charcoal glass card used across the site: thin light border, faint top sheen, soft shadow
const GLASS = 'border-[1.5px] border-white/[0.22] bg-[#191919] bg-[linear-gradient(165deg,rgba(255,255,255,0.07),rgba(255,255,255,0.01)_55%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_24px_-12px_rgba(0,0,0,0.85)]'

export function Help() {
  const [open, setOpen] = useState(0)
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const shown = topics.map((t, i) => ({ t, i })).filter(({ t: [title, desc, body] }) => !needle || `${title} ${desc} ${body.join(' ')}`.toLowerCase().includes(needle))
  return (
    <div className="pb-10">
      <header className="mx-auto w-full max-w-[1100px] px-5 pt-8 sm:px-8 sm:pt-12 lg:px-10">
        <div className={`flex flex-col items-center rounded-[28px] px-6 py-12 text-center sm:px-12 sm:py-14 max-md:!border-0 max-md:!bg-transparent max-md:!bg-none max-md:!p-0 max-md:!shadow-none ${GLASS}`}>
          <p className="badge max-md:hidden">Support</p>
          <h1 className="mt-4 max-md:hidden text-[36px] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[52px]">How can we help?</h1>
          <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-[#A1A1AA] max-md:hidden sm:text-[17px]">Answers, how-tos and troubleshooting for Pictrify.</p>
          <label className="mt-7 flex h-14 max-md:mt-1 max-md:!rounded-[18px] max-md:!border-0 max-md:!bg-[#191919] w-full max-w-[560px] items-center gap-3 rounded-2xl border-[1.5px] border-white/[0.22] bg-[#1C1C1E] px-5 transition-colors focus-within:border-white/50">
            <HelpIcon d="M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4" className="size-5 text-[#A1A1AA]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search help" placeholder="Search help, e.g. coins, upload, refund" className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-[#8E8E93]" />
            {q && <button type="button" onClick={() => setQ('')} aria-label="Clear search" className="grid size-7 cursor-pointer place-items-center rounded-full bg-white/10 text-[#E8E8EA]"><svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>}
          </label>
        </div>
      </header>

      <div className="mx-auto mt-6 w-full max-w-[1100px] px-5 sm:px-8 lg:px-10">
        {shown.length === 0 ? (
          <div className={`rounded-[22px] px-6 py-12 text-center ${GLASS}`}>
            <p className="text-[20px] font-extrabold text-white">No answers found</p>
            <p className="mt-1.5 text-[14px] text-[#A1A1AA]">Try another word, or contact support from the box below.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {shown.map(({ t: [title, , body], i }) => (
                <button key={title} type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-pressed={open === i}
                  className={`flex cursor-pointer items-center gap-3 rounded-[20px] px-4 py-3.5 text-left ${GLASS} ${open === i ? '!border-white' : ''}`}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-[#E8E8EA] ring-1 ring-white/[0.14]"><HelpIcon d={TOPIC_ICONS[i]} /></span>
                  <span className="min-w-0"><span className="block text-[14px] font-bold leading-tight text-white">{title}</span><span className="mt-0.5 block text-[12px] text-[#A1A1AA]">{body.length} tips</span></span>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {shown.map(({ t: [title, desc, body], i }) => (
                <div key={title} className={`overflow-hidden rounded-[22px] ${GLASS} ${open === i ? '!border-white/60' : ''}`}>
                  <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left sm:px-6">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-[#E8E8EA] ring-1 ring-white/[0.14]"><HelpIcon d={TOPIC_ICONS[i]} className="size-[22px]" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-[17px] font-bold text-white">{title}</span><span className="mt-0.5 block text-[14px] text-[#A1A1AA]">{desc}</span></span>
                    <svg className={`size-8 shrink-0 rounded-full bg-white/[0.08] p-2 text-[#E8E8EA] transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <ul className="min-h-0 space-y-3 overflow-hidden px-5 text-[14px] leading-relaxed text-[#B4B4B8] sm:px-6" style={{ paddingBottom: open === i ? 24 : 0, transition: 'padding-bottom 300ms ease-out' }}>
                      {body.map((line) => <li key={line} className="flex gap-3"><HelpIcon d="M5 12l5 5 9-10" className="mt-0.5 size-4 text-white/70" />{line}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className={`mt-8 flex flex-wrap items-center justify-between gap-4 rounded-[28px] p-6 sm:p-8 ${GLASS}`}>
          <div><p className="text-[22px] font-extrabold text-white">Still stuck?</p><p className="mt-1 text-[14px] text-[#A1A1AA]">Our team will get back to you.</p></div>
          <Link to="/contact-support" className="btn-primary !px-6 !py-3 !text-[14px]">Contact support<span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </div>
  )
}

const Card = ({ children, w = 'max-w-[760px]' }) => <div className={`mx-auto mt-8 w-[calc(100%-40px)] sm:w-[calc(100%-64px)] ${w} rounded-3xl border border-[#3A3A3E] bg-[#191919] p-6 sm:p-10`}>{children}</div>
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
  const box = 'w-full rounded-2xl border-[1.5px] border-white/[0.18] bg-[#1C1C1E] px-4 text-[15px] text-white outline-none transition-colors placeholder:text-[#8E8E93] focus:border-white/50'
  const Ic = ({ d, className = 'size-5' }) => <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  const tips = [
    ['M4 6h16M4 12h16M4 18h10', 'Give your request a short, clear title.'],
    ['M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v5M12 16.5v.01', 'Say what happened and what you expected.'],
    ['M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4', 'Add a screenshot if it helps (optional).'],
  ]
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 pb-10 pt-8 sm:px-8 sm:pt-12 lg:px-10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* left: what this is and how to get the quickest review */}
        <aside className={`self-start rounded-[28px] p-7 sm:p-9 ${GLASS}`}>
          <p className="badge max-md:hidden">Support request</p>
          <h1 className="mt-4 max-md:hidden text-[36px] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[44px]">Contact support</h1>
          <p className="mt-3 max-md:hidden text-[16px] leading-relaxed text-[#A1A1AA]">Tell us what happened and our team will review it.</p>
          <ul className="mt-7 space-y-4">
            {tips.map(([d, t]) => (
              <li key={t} className="flex items-start gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-[#E8E8EA] ring-1 ring-white/[0.14]"><Ic d={d} /></span>
                <span className="pt-2 text-[14px] leading-snug text-[#D4D4D8]">{t}</span>
              </li>
            ))}
          </ul>
          <p className="mt-7 text-[13px] text-[#A1A1AA]">Looking for quick answers first? <Link to="/help" className="font-semibold text-white underline underline-offset-2">Open the Help page</Link>.</p>
        </aside>

        {/* right: the request form */}
        <section className={`rounded-[28px] p-6 sm:p-9 ${GLASS}`}>
          {sent ? (
            <div className="flex flex-col items-center py-14 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-white/[0.08] text-white ring-1 ring-white/[0.18]"><Ic d="M5 12l5 5 9-10" className="size-8" /></span>
              <p className="mt-5 text-[28px] font-bold text-white">Request noted</p>
              <p className="mt-1.5 max-w-sm text-[14px] text-[#A1A1AA]">Thank you. Our team will review what you sent.</p>
              <button type="button" onClick={() => { setSent(false); setTitle(''); setText(''); setFile(null) }} className="btn-dark mt-6 !px-5 !py-2.5 !text-[14px]">Write another</button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (valid) setSent(true) }}>
              <label className="block space-y-2"><Label>Title</Label><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter title" className={`${box} h-12`} /></label>
              <label className="block space-y-2"><Label>Email</Label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" className={`${box} h-12`} /></label>
              <label className="block space-y-2">
                <span className="flex items-center justify-between"><Label>Description</Label><span className="text-[12px] text-[#8E8E93]">{text.length}/1000</span></span>
                <textarea required value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Enter description" className={`${box} h-[150px] resize-none py-3`} />
              </label>
              <div className="space-y-2">
                <Label>Attachment (optional)</Label>
                <div onClick={() => input.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]) }}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-white/25 bg-[#1C1C1E] px-4 py-7 text-center transition-colors hover:border-white/45">
                  <span className="grid size-11 place-items-center rounded-xl bg-white/[0.08] text-[#E8E8EA] ring-1 ring-white/[0.14]"><Ic d="M12 16V4M7 9l5-5 5 5M5 20h14" /></span>
                  <span className="text-[14px] text-white">{file ? file.name : 'Click or drag an image here (max 5 MB)'}</span>
                  <span className="text-[12px] text-[#A1A1AA]">JPG, JPEG, PNG and WEBP supported</span>
                  <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
                </div>
                {file && <button type="button" onClick={() => setFile(null)} className="cursor-pointer text-[12px] text-[#A1A1AA] underline underline-offset-2 hover:text-[#FFFFFF]">Remove image</button>}
                {err && <p role="alert" className="text-[12px] text-[#C0392B]">{err}</p>}
              </div>
              <button className={submitBtn} disabled={!valid}>Submit request</button>
            </form>
          )}
        </section>
      </div>
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
  const nav = useNavigate()
  const { signedIn, userEmail, coins, signOut } = useStudio()
  const purchases = usePurchases()
  const plan = useSubscription()
  const lastPlan = purchases?.find((p) => p.kind === 'plan')
  const [plansOpen, setPlansOpen] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const row = 'flex h-[54px] w-full items-center gap-3.5 border-b border-[#3A3A3E] px-4 text-left text-[14px] text-[#FFFFFF] last:border-b-0'
  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pb-32 pt-4 md:hidden">
      {signedIn && (
        <div className="flex items-center gap-4 px-1 pb-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-[#FF3DF2] text-[28px] font-semibold text-white">{(userEmail[0] || 'P').toUpperCase()}</span>
          <div className="min-w-0"><p className="truncate text-[20px] font-bold text-white">{displayName(userEmail)}</p><p className="truncate text-[13px] text-[#A1A1AA]">{userEmail}</p></div>
        </div>
      )}
      <div className="flex items-center justify-between gap-3 rounded-[24px] bg-[#FF3DF2] p-5 shadow-[0_16px_34px_-16px_rgba(255,61,242,0.7)]">
        <div className="min-w-0"><p className="text-[13px] text-white/85">Total Coins</p><p className="text-[32px] font-extrabold leading-tight text-white">{signedIn ? coins.toLocaleString('en-US') : '-'}</p></div>
        <Link to="/coins" className="shrink-0 rounded-[16px] bg-white px-5 py-3 text-[15px] font-semibold text-[#000000]">Add coins</Link>
      </div>
      <button type="button" onClick={() => setPlansOpen(true)} className="btn-primary mt-3 !h-14 !w-full !text-[16px]">Upgrade to Pro</button>
      <div className="mt-4 overflow-hidden rounded-[24px] border border-[#3A3A3E] bg-[#191919]">
        <button type="button" onClick={() => setPlanOpen((o) => !o)} aria-expanded={planOpen} aria-controls="plan-purchases" className="flex h-[54px] w-full cursor-pointer items-center gap-3.5 px-4 text-left text-[14px] font-semibold text-[#FFFFFF]">
          {I('M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z')}<span className="flex-1">Plan &amp; purchases</span>
          <svg className={`size-4 shrink-0 text-[#A1A1AA] transition-transform duration-300 ${planOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <div id="plan-purchases" className={`grid transition-[grid-template-rows] duration-300 ease-out ${planOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} aria-hidden={!planOpen}>
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-2 border-t border-[#3A3A3E] p-3.5">
              <CurrentPlan className="rounded-2xl bg-[#191919] px-3.5 py-2.5" purchases={purchases} lastPlan={lastPlan} plan={plan} tabIndex={planOpen ? 0 : -1} />
              <div className="rounded-2xl bg-[#191919] px-3.5 py-2.5"><p className="eyebrow">Coin balance</p><p className="mt-2 text-[15px] font-bold text-[#FFFFFF]">{coins.toLocaleString('en-US')} coins</p><Link to="/coins" tabIndex={planOpen ? 0 : -1} className="mt-1 inline-block text-xs font-semibold text-[#A1A1AA] underline">Get more coins</Link></div>
              <Link to="/transactions" tabIndex={planOpen ? 0 : -1} className="inline-block pt-1 text-[13px] font-semibold text-[#A1A1AA] underline">View all transactions</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-[24px] border border-[#3A3A3E] bg-[#191919]">
        {meItems.map(([label, to, d]) => <Link key={label} to={to} className={row}>{I(d)}<span className="flex-1">{label}</span><Chev /></Link>)}
      </div>
      {signedIn && <button type="button" onClick={() => { signOut(); nav('/') }} className="mt-4 flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-[22px] bg-[#191919] text-[16px] font-semibold text-[#FF6B6B]">Log out</button>}
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
  const box = 'h-12 w-full min-w-0 truncate rounded-2xl border border-[#3A3A3E] bg-[#1C1C1E] px-4 text-[14px] outline-none'
  const lbl = 'mb-1.5 block text-[13px] font-semibold text-[#FFFFFF]'
  return (
    <>
    {!settings && <MobileMe />}
    <div className={`mx-auto w-full max-w-[1100px] px-5 pb-32 pt-8 text-[#FFFFFF] sm:px-8 sm:pt-12 md:pb-12 lg:px-10 ${settings ? '' : 'max-md:hidden'}`}>
      {!signedIn ? (
        <div className="relative overflow-hidden rounded-3xl bg-[#191919] px-6 py-16 text-center sm:py-24">
          <div className="relative">
            <h1 className="mx-auto w-fit text-[40px] font-extrabold leading-[1.05] tracking-tight sm:text-[56px]">Your account</h1>
            <p className="mx-auto mt-4 max-w-sm text-[15px] text-[#A1A1AA]">Sign in to see your coins, plan and creations in one place.</p>
            <button type="button" onClick={openLogin} className="btn-primary mt-8 !rounded-[14px] !px-8 !py-3 !text-[15px]">Login</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <section aria-label="Profile" className="relative overflow-hidden rounded-3xl bg-[#191919]">
            <div className="relative flex flex-wrap items-center gap-5 p-6 sm:gap-6 sm:p-9">
              <span className="grid size-20 shrink-0 place-items-center rounded-full bg-[#FF3DF2] text-[34px] font-semibold text-white sm:size-24 sm:text-[40px]">{(name[0] || 'P').toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="badge">Account</p>
                <h1 className="mt-3 w-fit max-w-full truncate text-[32px] font-extrabold leading-[1.1] tracking-tight sm:text-[44px]">{name}</h1>
                <p className="mt-1 truncate text-[14px] text-[#A1A1AA] sm:text-[15px]" title={userEmail}>{userEmail}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/creations" className="btn-primary !px-5 !py-2.5 !text-[14px]">My Creations</Link>
                <button type="button" onClick={signOut} className="btn-dark !rounded-[14px] !px-5 !py-2.5 !text-[14px] !text-[#D14343]">Log out</button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
            <section aria-label="Personal details" className="self-start rounded-3xl bg-[#191919] p-6 sm:p-8">
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
              <section aria-label="Coins" className="relative overflow-hidden rounded-3xl bg-[#191919] p-6 sm:p-8">
                <div className="relative flex items-center gap-4">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#1C1C1E]"><img src="/images/features/coin.svg" alt="" className="size-9 object-contain" /></span>
                  <div className="flex flex-col"><span className="text-[13px] text-[#A1A1AA]">Coin balance</span><span className="flex items-baseline gap-2"><span className="grad-text text-[44px] font-extrabold leading-none tabular-nums">{coins.toLocaleString('en-US')}</span><span className="text-[14px] text-[#A1A1AA]">coins</span></span></div>
                </div>
                <Link to="/coins" className="btn-primary relative mt-6 !w-full !py-3 !text-[14px]">Get more coins</Link>
              </section>

              <section aria-label="Plan" className="rounded-3xl bg-[#191919] p-6 sm:p-8">
                <CurrentPlan className="" purchases={purchases} lastPlan={lastPlan} plan={plan} />
                {purchases?.length > 0 && (
                  <ul className="mt-5 divide-y divide-[#FFFFFF]/10 border-t border-[#FFFFFF]/10">
                    {purchases.slice(0, 3).map((p) => (
                      <li key={p.paymentId} className="flex items-center justify-between gap-3 py-3 text-[13px]"><span className="min-w-0"><span className="block truncate font-semibold">{p.name} {p.kind === 'plan' ? 'plan' : 'coin pack'}</span><span className="text-[12px] text-[#A1A1AA]">{formatDate(p.paidAt)} · +{p.coins.toLocaleString('en-US')} coins</span></span><span className="shrink-0 font-semibold">{formatMoney(p.amount, p.currency)}</span></li>
                    ))}
                  </ul>
                )}
                <Link to="/transactions" className="btn-dark mt-5 !w-full !rounded-[14px] !py-2.5 !text-[14px]">View all transactions<span aria-hidden="true">→</span></Link>
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
  const box = 'w-full rounded-2xl border-[1.5px] border-white/[0.18] bg-[#1C1C1E] px-4 text-[15px] text-white outline-none transition-colors placeholder:text-[#8E8E93] focus:border-white/50'
  const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']
  const tips = [
    ['M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z', 'Pick a star rating for your experience.'],
    ['M4 6h16M4 12h16M4 18h10', 'Tell us what you like or how we can improve.'],
  ]
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 pb-10 pt-8 sm:px-8 sm:pt-12 lg:px-10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* left: what this is */}
        <aside className={`self-start rounded-[28px] p-7 sm:p-9 ${GLASS}`}>
          <p className="badge max-md:hidden">Product feedback</p>
          <h1 className="mt-4 max-md:hidden text-[36px] font-extrabold leading-[1.05] tracking-tight text-white sm:text-[44px]">Feedback</h1>
          <p className="mt-3 max-md:hidden text-[16px] leading-relaxed text-[#A1A1AA]">Tell us about your experience and how we can make Pictrify better.</p>
          <ul className="mt-7 space-y-4">
            {tips.map(([d, t]) => (
              <li key={t} className="flex items-start gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-[#E8E8EA] ring-1 ring-white/[0.14]"><HelpIcon d={d} /></span>
                <span className="pt-2 text-[14px] leading-snug text-[#D4D4D8]">{t}</span>
              </li>
            ))}
          </ul>
          <p className="mt-7 text-[13px] text-[#A1A1AA]">Having a problem instead? <Link to="/contact-support" className="font-semibold text-white underline underline-offset-2">Contact support</Link>.</p>
        </aside>

        {/* right: the form */}
        <section className={`rounded-[28px] p-6 sm:p-9 ${GLASS}`}>
          {sent ? (
            <div className="flex flex-col items-center py-14 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-white/[0.08] text-white ring-1 ring-white/[0.18]"><HelpIcon d="M5 12l5 5 9-10" className="size-8" /></span>
              <p className="mt-5 text-[28px] font-bold text-white">Thanks for your feedback</p>
              <button className="btn-dark mt-6 !px-5 !py-2.5 !text-[14px]" onClick={() => { setSent(false); setStars(0); setText('') }}>Send more</button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
              <div className="flex items-center justify-between"><Label>How was it?</Label><span className="text-[13px] font-semibold text-white" aria-live="polite">{WORDS[hover || stars]}</span></div>
              <div className="flex gap-2 py-4 sm:gap-2.5" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setStars(n)} onMouseEnter={() => setHover(n)}
                    className={`grid aspect-square min-w-0 max-w-14 flex-1 cursor-pointer place-items-center rounded-2xl border-[1.5px] transition-colors active:scale-95 ${n <= (hover || stars) ? 'border-white/60 bg-white/[0.12]' : 'border-white/[0.18] bg-[#1C1C1E]'}`}>
                    <svg className={`size-7 transition-colors ${n <= (hover || stars) ? 'fill-white text-white' : 'fill-none text-[#6B6B70]'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
                  </button>
                ))}
              </div>
              <div className="mb-2 mt-3 flex items-center justify-between"><label htmlFor="fb"><Label>Description</Label></label><span className="font-plexmono text-[11px] text-[#8E8E93]">{text.length}/500</span></div>
              <textarea id="fb" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Tell us what you like or how we can improve..." className={`${box} h-[170px] resize-none py-3`} />
              <button className={`${submitBtn} mt-6`} disabled={!stars || !text.trim()}>Submit feedback</button>
            </form>
          )}
        </section>
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
        <button type="button" onClick={() => nav(-1)} className="mb-3 hidden cursor-pointer items-center gap-1.5 text-[13px] hover:text-[#FFFFFF]"><svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>Back</button>
        <p className="badge max-md:hidden">Legal</p>
        <h1 className="mb-6 mt-4 w-fit max-md:hidden text-[38px] font-extrabold leading-[1.05] tracking-tight text-[#FFFFFF] sm:text-[56px]">{title}</h1>
        <p className="mb-4 leading-relaxed"><strong className="font-semibold text-[#FFFFFF]">Effective Date:</strong> {date || 'Placeholder'}</p>
        {sections.map(([h, blocks]) => (
          <div key={h}><h2 className="mb-3 mt-12 border-t border-[#3A3A3E] pt-8 text-[24px] font-extrabold leading-tight text-[#FFFFFF]">{h}</h2>{blocks.map(legalBlock)}</div>
        ))}
      </div>
    </div>
  )
}
