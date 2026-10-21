import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'
import { displayName } from '../components/Header.jsx'

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
          <div className="py-10 text-center"><p className="mb-1 text-lg font-medium">✓ Request noted</p><p className="mb-5 text-sm text-[#C4B5FD]/75">Demo only - nothing was sent anywhere yet, because support requests are not connected to a backend.</p><button type="button" onClick={() => { setSent(false); setTitle(''); setText(''); setFile(null) }} className="btn-grad">Write another</button></div>
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

export function Profile() {
  const { signedIn, userEmail } = useStudio()
  const name = displayName(userEmail || '')
  return (
    <div className="px-4 pb-24 md:pb-16">
      <Hero eyebrow="Account" title="My Profile" sub="Your Pixora account details." />
      <Card w="max-w-[640px]">
        {signedIn ? (
          <>
            <div className="flex items-center gap-4">
              <span className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#B070FA] to-[#F066D8] text-2xl font-bold text-white">{(name[0] || 'P').toUpperCase()}</span>
              <div className="min-w-0"><p className="truncate text-lg font-semibold text-white">{name}</p><p className="truncate text-sm text-[#C4B5FD]" title={userEmail}>{userEmail}</p></div>
            </div>
            <p className="mt-6 rounded-xl border border-[#3A3552] bg-black/30 px-4 py-3 text-sm text-[#C4B5FD]/85">This is a demo sign-in: it exists only in this browser. The name is taken from your email, and editing your profile is not available yet.</p>
          </>
        ) : (
          <div className="py-8 text-center"><p className="mb-5 text-lg font-medium">Sign in to see your profile</p><Link to="/login" className="btn-grad">Sign in to Pixora</Link></div>
        )}
      </Card>
    </div>
  )
}

export function Transactions() {
  const { signedIn } = useStudio()
  return (
    <div className="px-4 pb-24 md:pb-16">
      <Hero eyebrow="Billing" title="Transactions" sub="Your payment and coin history." />
      <Card w="max-w-[640px]">
        <div className="py-8 text-center">
          {signedIn ? (
            <>
              <p className="mb-1 text-lg font-medium">No transactions yet</p>
              <p className="mb-5 text-sm text-[#C4B5FD]/75">Payments are not connected yet, so there is nothing to show. Purchases will appear here once they are available.</p>
              <Link to="/pricing" className="btn-grad">View plans</Link>
            </>
          ) : (
            <><p className="mb-5 text-lg font-medium">Sign in to see your transactions</p><Link to="/login" className="btn-grad">Sign in to Pixora</Link></>
          )}
        </div>
      </Card>
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
          <div className="py-10 text-center"><p className="mb-1 text-lg font-medium">✓ Thanks for your feedback</p><p className="mb-5 text-sm text-[#C4B5FD]/75">Demo only - nothing was sent anywhere.</p><button className="btn-dark" onClick={() => { setSent(false); setStars(0); setText('') }}>Send more</button></div>
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

export function Transfer() {
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const { signedIn } = useStudio()
  return (
    <div className="px-4 pb-24 md:pb-16">
      <Hero eyebrow="Connect App Account" title="Move coins from your app" sub="Paste the one-time code from the Pixora app. Coins leave the app only when redeem succeeds on the website." />
      <Card w="max-w-[640px]">
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setMsg(signedIn ? 'Demo only - redeeming is not connected yet.' : 'Please log in first.') }}>
          {!signedIn && <div className="rounded-xl border border-[#3A3552] bg-gradient-to-br from-[#2A1B52] to-[#1A284F] px-4 py-3 text-sm text-white">Log in to redeem your code. <Link to="/login" className="font-semibold underline">Login</Link></div>}
          <label className="block text-sm font-semibold text-white">Transfer code<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="GLY-XXXX-XXXX" className={`${field} mt-3 h-[52px] bg-gradient-to-br from-[#2A1B52] to-[#1A284F] font-normal`} /></label>
          <button className={`${submitBtn} h-[52px] rounded-full`}>Redeem code</button>
          {msg && <p role="status" className="text-center text-sm text-[#C4B5FD]">{msg}</p>}
        </form>
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
