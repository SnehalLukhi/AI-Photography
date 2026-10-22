import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'
import { displayName } from '../components/Header.jsx'
import { brandImages } from '../data/images.js'
import { getPurchases } from '../lib/aiPhotography.js'
import { formatDate, formatMoney } from '../lib/format.js'

const Hero = ({ eyebrow, title, sub }) => (
  <header className="mx-auto max-w-3xl px-4 pt-10 text-center">
    <p className="text-xs font-semibold uppercase tracking-wide text-[#F066D8]">{eyebrow}</p>
    <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-[#ffffff] sm:text-5xl">{title}</h1>
    <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#C4B5FD]/80 sm:text-lg">{sub}</p>
  </header>
)
const field = 'w-full rounded-xl border border-white/10 bg-[#1b1b24] px-4 text-sm text-white outline-none transition placeholder:text-[#C4B5FD]/50 focus:border-[#B070FA]/60'
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
          <button key={t} type="button" onClick={() => setOpen(open === i ? -1 : i)} className={`cursor-pointer self-start rounded-[20px] border bg-[#121216] px-6 py-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#B070FA]/50 ${open === i ? 'border-[#B070FA]/50' : 'border-white/[0.06]'}`}>
            <span className="block text-[17px] font-semibold text-white">{t}</span>
            <span className="mt-1.5 block text-sm text-[#C4B5FD]/75">{d}</span>
            {open === i && <span className="mt-3 block border-t border-white/10 pt-3 text-sm text-[#C4B5FD]">{body}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

const Card = ({ children, w = 'max-w-[760px]' }) => <div className={`mx-auto mt-10 w-full ${w} rounded-[28px] border border-white/[0.06] bg-[#121216] p-6 sm:p-8`}>{children}</div>

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
                className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 px-4 py-8 text-center transition hover:border-[#B070FA]/60">
                <span className="inline-flex items-center gap-2 rounded-lg bg-white/[0.07] px-3.5 py-2 text-[13px] font-semibold text-white"><svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V5M7 9l5-5 5 5M5 19h14" /></svg>Upload Image</span>
                <span className="text-sm text-white/90">{file ? file.name : 'Click or drag image here (Max 5MB)'}</span>
                <span className="text-xs text-[#C4B5FD]/60">JPG, JPEG, PNG, and WEBP supported</span>
                <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
              </div>
              {file && <button type="button" onClick={() => setFile(null)} className="mt-2 cursor-pointer text-xs text-[#C4B5FD] underline underline-offset-2 hover:text-white">Remove image</button>}
              {err && <p role="alert" className="mt-2 text-xs text-red-400">{err}</p>}
            </div>
            <button className={submitBtn} disabled={!valid}>Submit Request</button>
          </form>
        )}
      </Card>
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

export function Profile() {
  const { signedIn, userEmail, coins } = useStudio()
  const purchases = usePurchases()
  const lastPlan = purchases?.find((p) => p.kind === 'plan') // plans are one-time coin purchases: the latest one is "your plan"
  const name = displayName(userEmail || '')
  const [first, ...rest] = name.split(' ')
  const last = rest.join(' ')
  const lbl = 'mb-2 block text-[13px] font-bold text-white'
  const box = 'h-12 w-full min-w-0 truncate rounded-2xl border border-white/[0.06] bg-[#15151d] px-[18px] text-[13px] outline-none'
  return (
    <div className="px-4 pb-24 pt-8 md:pb-16 md:pt-10">
      <div className="mx-auto w-full max-w-[750px]">
        <h1 className="text-[34px] font-bold leading-[1.05] tracking-tight text-white sm:text-[38px]">Profile Settings</h1>
        <p className="mt-2 text-[13px] text-[#9CA3C8]">Manage your personal information and account details.</p>
        <div className="mt-9 rounded-[32px] border border-white/[0.07] bg-[#0f1016] p-6 sm:p-[37px]">
          {signedIn ? (
            <>
              <div className="flex items-center gap-[22px] border-b border-white/[0.08] pb-7">
                <span className="grid size-[88px] shrink-0 place-items-center rounded-full border-[3px] border-[#1c1b22] bg-[#8d7468] text-[44px] font-light leading-none text-white">{(name[0] || 'P').toUpperCase()}</span>
                <div className="min-w-0"><p className="truncate text-xl font-bold text-white sm:text-[22px]">{name}</p><p className="mt-1.5 truncate text-[13px] text-[#9CA3C8]" title={userEmail}>{userEmail}</p></div>
              </div>
              <div className="mt-[38px] grid gap-[26px] sm:grid-cols-2 sm:gap-x-[18px]">
                <div><label htmlFor="pf-first" className={lbl}>First name</label><input id="pf-first" readOnly value={first || ''} placeholder="Not set" className={`${box} font-bold text-white`} /></div>
                <div><label htmlFor="pf-last" className={lbl}>Last name</label><input id="pf-last" readOnly value={last} placeholder="Not set" className={`${box} font-bold text-white`} /></div>
              </div>
              <div className="mt-[26px]"><label htmlFor="pf-email" className={lbl}>Email address</label><input id="pf-email" readOnly value={userEmail || ''} title={userEmail} className={`${box} text-[#9CA3C8]/70`} /></div>
              <div className="mt-[26px]"><label htmlFor="pf-country" className={lbl}>Country</label><input id="pf-country" readOnly disabled placeholder="Not set" className={`${box} text-[#9CA3C8]/70 placeholder:text-[#9CA3C8]/55`} /></div>
              <div className="mt-[26px]"><label htmlFor="pf-since" className={lbl}>Member since</label><input id="pf-since" readOnly disabled placeholder="Not available" className={`${box} text-[#9CA3C8]/70 placeholder:text-[#9CA3C8]/55`} /></div>
              <div className="mt-[34px] border-t border-white/[0.08] pt-7">
                <h2 className="text-[15px] font-bold text-white">Plan &amp; purchases</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.06] bg-[#15151d] px-[18px] py-4"><p className="text-xs text-[#9CA3C8]">Current plan</p><p className="mt-1 text-[15px] font-bold text-white">{purchases === null ? '…' : lastPlan ? lastPlan.name : 'No plan purchased'}</p>{lastPlan && <p className="mt-0.5 text-xs text-[#9CA3C8]">Bought {formatDate(lastPlan.paidAt)}</p>}</div>
                  <div className="rounded-2xl border border-white/[0.06] bg-[#15151d] px-[18px] py-4"><p className="text-xs text-[#9CA3C8]">Coin balance</p><p className="mt-1 text-[15px] font-bold text-white">{coins.toLocaleString('en-US')} coins</p><Link to="/coins" className="mt-0.5 inline-block text-xs font-semibold text-[#C4B5FD] underline">Get more coins</Link></div>
                </div>
                {purchases?.length > 0 && (
                  <ul className="mt-4 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-[#15151d]">
                    {purchases.slice(0, 3).map((p) => (
                      <li key={p.paymentId} className="flex items-center justify-between gap-3 px-[18px] py-3 text-[13px]"><span className="min-w-0"><span className="block truncate font-semibold text-white">{p.name} {p.kind === 'plan' ? 'plan' : 'coin pack'}</span><span className="text-xs text-[#9CA3C8]">{formatDate(p.paidAt)} · +{p.coins.toLocaleString('en-US')} coins</span></span><span className="shrink-0 font-semibold text-white">{formatMoney(p.amount, p.currency)}</span></li>
                    ))}
                  </ul>
                )}
                <Link to="/transactions" className="mt-4 inline-block text-[13px] font-semibold text-[#C4B5FD] underline">View all transactions</Link>
              </div>
              <button type="button" disabled title="Editing your profile is not available yet" className="mt-[37px] h-[47px] cursor-not-allowed rounded-2xl px-[25px] text-sm font-bold text-white opacity-60" style={{ background: 'linear-gradient(90deg, #9B30E8 0%, #F0389A 60%, #FF7A2F 100%)' }}>Save Changes</button>
            </>
          ) : (
            <div className="py-8 text-center"><p className="mb-5 text-lg font-medium text-white">Sign in to see your profile</p><Link to="/login" className="btn-grad">Sign in to Pixora</Link></div>
          )}
        </div>
      </div>
    </div>
  )
}

// Receipt-with-coin illustration for the empty Transactions state (existing coin.svg + a drawn receipt and sparkles).
const Sparkle = ({ className }) => <svg className={`absolute size-2.5 text-white/80 ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1l2.4 8.6L23 12l-8.6 2.4L12 23l-2.4-8.6L1 12l8.6-2.4z" /></svg>
const EmptyReceipt = () => (
  <div className="relative mx-auto h-[128px] w-[140px]" aria-hidden="true">
    <svg className="absolute left-[24px] top-[10px] h-[100px] w-[80px]" viewBox="0 0 80 100" fill="none">
      <defs><linearGradient id="rc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34334a" /><stop offset="1" stopColor="#23222f" /></linearGradient></defs>
      <path d="M8 2h64a6 6 0 016 6v70a10 10 0 01-10 10H18a10 10 0 01-10-10V8a6 6 0 016-6z" fill="url(#rc)" stroke="#3d3c55" strokeWidth="1.5" />
      <rect x="14" y="16" width="32" height="5" rx="2.5" fill="#55546f" /><rect x="14" y="31" width="52" height="5" rx="2.5" fill="#55546f" /><rect x="14" y="46" width="42" height="5" rx="2.5" fill="#55546f" />
      <path d="M8 74h40a10 10 0 000 .1" stroke="#3d3c55" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
    <img src={brandImages.coin} alt="" width="46" height="46" className="absolute bottom-[16px] right-[22px] size-[46px] object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]" />
    <Sparkle className="left-0 top-[44px]" /><Sparkle className="right-[2px] top-[4px]" /><Sparkle className="right-0 top-[44px]" /><Sparkle className="bottom-[22px] left-[12px]" /><Sparkle className="bottom-[6px] right-[8px]" />
  </div>
)

export function Transactions() {
  const { signedIn } = useStudio()
  const purchases = usePurchases()
  return (
    <div className="px-4 pb-24 pt-8 md:pb-16 md:pt-10">
      <div className="mx-auto w-full max-w-[1040px]">
        <p className="text-xs font-bold uppercase tracking-wide text-[#F066D8]">Payments and Coins</p>
        <h1 className="mt-3 text-[34px] font-bold leading-[1.05] tracking-tight text-white sm:text-[44px] lg:text-[48px]">Transaction History</h1>
        <p className="mt-4 text-base text-[#9CA3C8]">Track subscriptions, coin purchases and refunds.</p>
        <div className="mt-9 rounded-[24px] border border-white/[0.07] bg-[#121218] px-6 py-12 text-center">
          {signedIn ? (
            purchases?.length ? (
              <ul className="divide-y divide-white/[0.06] text-left">
                {purchases.map((p) => (
                  <li key={p.paymentId} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-4">
                    <span className="min-w-0"><span className="block text-[15px] font-bold text-white">{p.name} {p.kind === 'plan' ? 'plan' : 'coin pack'}</span><span className="text-xs text-[#9CA3C8]">{formatDate(p.paidAt, true)} · Payment ID {p.paymentId}</span></span>
                    <span className="text-right"><span className="block text-[15px] font-bold text-white">{formatMoney(p.amount, p.currency)}</span><span className="text-xs font-semibold text-emerald-300">+{p.coins.toLocaleString('en-US')} coins</span></span>
                  </li>
                ))}
              </ul>
            ) : purchases === null ? (
              <p className="py-8 text-sm text-[#9CA3C8]">Loading…</p>
            ) : (
              <>
                <EmptyReceipt />
                <p className="mt-5 text-[15px] font-bold text-white">No transactions yet</p>
                <p className="mt-2 text-[13px] text-[#9CA3C8]/80">Subscriptions and coin purchases will show up here.</p>
                <Link to="/coins" className="grad-bg mt-6 inline-flex h-10 items-center justify-center rounded-[10px] px-5 text-[13px] font-bold">Get coins</Link>
              </>
            )
          ) : (
            <><p className="mb-5 text-lg font-medium text-white">Sign in to see your transactions</p><Link to="/login" className="btn-grad">Sign in to Pixora</Link></>
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
    <div className="px-4 pb-24 md:pb-16">
      <Hero eyebrow="Product Feedback" title="Share Your Feedback" sub="Tell us about your experience and how we can make Pixora better for you." />
      <Card w="max-w-[640px]">
        {sent ? (
          <div className="py-10 text-center"><p className="mb-1 text-lg font-medium">✓ Thanks for your feedback</p><button className="btn-dark" onClick={() => { setSent(false); setStars(0); setText('') }}>Send more</button></div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
            <div className="flex justify-center gap-5 py-8" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setStars(n)} onMouseEnter={() => setHover(n)} className="cursor-pointer transition-transform hover:scale-110 active:scale-95">
                  <svg className={`size-11 transition-colors ${n <= (hover || stars) ? 'fill-[#fbbf24] text-[#fbbf24]' : 'fill-none text-[#3A3552]'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
                </button>
              ))}
            </div>
            <div className="mb-3 flex items-center justify-between text-sm"><label htmlFor="fb" className="font-semibold text-white">Description</label><span className="text-xs text-[#C4B5FD]/75">{text.length}/500</span></div>
            <textarea id="fb" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Tell us what you like or how we can improve..." className={`${field} h-[150px] resize-none py-3`} />
            <button className={`${submitBtn} mt-8`} disabled={!stars || !text.trim()}>Submit Feedback</button>
          </form>
        )}
      </Card>
    </div>
  )
}

const legal = {
  privacy: ['Privacy Policy', [['Introduction', ['This is placeholder text. Replace it with your real privacy policy before launch.', 'It should explain how you collect, use, store and protect user information, uploaded media, and purchase data.']], ['Information We Collect', ['Account and profile information, uploaded photos and generated media, and purchase records. (Placeholder.)']], ['Your Choices', ['You can request deletion of your data at any time via Contact Support. (Placeholder.)']]]],
  terms: ['Terms of Use', [['Acceptance', ['Placeholder terms. Replace with your real terms of use before launch.']], ['Acceptable Use', ['Do not upload content you do not have the right to use. (Placeholder.)']], ['Coins & Subscriptions', ['Plans auto-renew until cancelled; coins are non-refundable. (Placeholder.)']]]],
}
export function Legal({ kind }) {
  const [title, sections] = legal[kind]
  return (
    <div className="relative z-10 px-4 pb-24 pt-6 sm:px-6 sm:pt-16 md:pb-16 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-4 text-[#C4B5FD]">
        <h1 className="mb-6 text-3xl font-bold text-[#ffffff] sm:mb-8 sm:text-4xl">{title}</h1>
        <p className="mb-4 leading-relaxed"><strong className="font-semibold text-white">Effective Date:</strong> Placeholder</p>
        {sections.map(([h, ps]) => (
          <div key={h}><h2 className="mb-4 mt-8 text-xl font-semibold text-[#ffffff] sm:text-2xl">{h}</h2>{ps.map((p) => <p key={p} className="mb-4 leading-relaxed text-[#C4B5FD]">{p}</p>)}</div>
        ))}
      </div>
    </div>
  )
}
