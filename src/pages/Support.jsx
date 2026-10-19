import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'

const Hero = ({ eyebrow, title, sub }) => (
  <header className="mx-auto max-w-3xl px-4 pt-10 text-center">
    <p className="text-xs font-semibold uppercase tracking-wide text-[#8b5cf6]">{eyebrow}</p>
    <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-[#f8f5ff] sm:text-5xl">{title}</h1>
    <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#b8b4c7] sm:text-lg">{sub}</p>
  </header>
)
const field = 'w-full rounded-xl border border-[#292536] bg-[#14121d] px-4 text-sm text-white outline-none transition placeholder:text-[#858094] focus:border-[#8b5cf6]/60'
const submitBtn = 'grad-bg flex h-12 w-full cursor-pointer items-center justify-center rounded-xl text-sm font-semibold text-[#0b0a12] transition-all hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50'

const topics = [
  ['Getting Started', 'Learn the basic workflow.', 'Pick a template, upload a clear photo, and press Generate. Results land in My Creations.'],
  ['Photo Upload Guide', 'Choose the best source photo.', 'Use a clear, front-facing photo with good lighting. JPG, PNG and HEIC are supported.'],
  ['AI Generation', 'Understand image and video creation.', 'Images take seconds; videos take a little longer depending on duration (5-20 seconds).'],
  ['Coins & Billing', 'Payments, packs and balances.', 'Each generation uses coins. Plans include a coin balance.'],
  ['Subscriptions', 'Manage plans and renewals.', 'Plans auto-renew and can be cancelled anytime.'],
  ['Troubleshooting', 'Fix common generation issues.', 'Try a sharper photo or a different template, or contact support.'],
]

export function Help() {
  const [open, setOpen] = useState(-1)
  return (
    <div className="px-4 pb-24 md:pb-16">
      <Hero eyebrow="Support" title="How Can We Help?" sub="Find answers, tutorials and troubleshooting guides." />
      <div className="mx-auto mt-14 grid max-w-none gap-5 sm:grid-cols-2">
        {topics.map(([t, d, body], i) => (
          <button key={t} type="button" onClick={() => setOpen(open === i ? -1 : i)} className={`cursor-pointer rounded-xl border bg-[#14121d] px-5 py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#8b5cf6]/60 ${open === i ? 'border-[#8b5cf6]/60' : 'border-[#292536]'}`}>
            <span className="block text-[17px] font-semibold text-white">{t}</span>
            <span className="mt-1.5 block text-sm text-[#b8b4c7]">{d}</span>
            {open === i && <span className="mt-3 block border-t border-[#292536] pt-3 text-sm text-[#b8b4c7]">{body}</span>}
          </button>
        ))}
      </div>
      <p className="mt-10 text-center text-sm text-[#b8b4c7] md:hidden">Can't find what you're looking for? <Link to="/contact-us" className="font-medium text-white underline underline-offset-4 hover:text-[#8b5cf6]">Contact Support</Link></p>
    </div>
  )
}

const Card = ({ children, w = 'max-w-[760px]' }) => <div className={`mx-auto mt-10 w-full ${w} rounded-xl border border-[#292536] bg-[#14121d] p-6 shadow-2xl sm:p-8`}>{children}</div>

export function Contact() {
  const [sent, setSent] = useState(false)
  const [img, setImg] = useState(null)
  const [err, setErr] = useState('')
  const file = useRef()
  const pick = (f) => {
    if (!f) return
    if (!/^image\/(jpe?g|png|webp)$/.test(f.type)) return setErr('JPG, JPEG, PNG and WEBP only.')
    if (f.size > 5 * 1024 * 1024) return setErr('Max file size is 5MB.')
    setErr(''); setImg(f)
  }
  return (
    <div className="px-4 pb-24 md:pb-16">
      <Hero eyebrow="Support Request" title="Contact Support" sub="Tell us what happened and our team will review it." />
      <Card>
        {sent ? (
          <div className="py-10 text-center"><p className="mb-1 text-lg font-medium">✓ Request received</p><p className="mb-5 text-sm text-[#858094]">Demo only - nothing was sent anywhere.</p><button className="btn-dark" onClick={() => { setSent(false); setImg(null) }}>Send another</button></div>
        ) : (
          <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
            <label className="block text-sm font-semibold text-white">Title<input required placeholder="Enter Title" className={`${field} mt-2 h-12 font-normal`} /></label>
            <label className="block text-sm font-semibold text-white">Email<input required type="email" placeholder="Enter email" className={`${field} mt-2 h-12 font-normal`} /></label>
            <label className="block text-sm font-semibold text-white">Description<textarea required placeholder="Enter Description" className={`${field} mt-2 h-[152px] resize-none py-3 font-normal`} /></label>
            <div>
              <p className="mb-3 text-sm font-semibold text-white">Attachment (Optional)</p>
              <input ref={file} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => pick(e.target.files[0])} />
              <div onClick={() => file.current.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]) }}
                className="flex min-h-[134px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#292536] px-4 py-6 text-center transition hover:border-[#8b5cf6]/50">
                <span className="flex items-center gap-2 rounded-xl bg-[#14121d] px-4 py-2 text-sm font-medium text-white">⇪ Upload Image</span>
                <span className="text-sm text-white">{img ? img.name : 'Click or drag image here (Max 5MB)'}</span>
                <span className="text-[11px] text-[#b8b4c7]">JPG, JPEG, PNG, and WEBP supported</span>
              </div>
              {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
            </div>
            <button className={submitBtn}>Submit Request</button>
          </form>
        )}
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
          <div className="py-10 text-center"><p className="mb-1 text-lg font-medium">✓ Thanks for your feedback</p><p className="mb-5 text-sm text-[#858094]">Demo only - nothing was sent anywhere.</p><button className="btn-dark" onClick={() => { setSent(false); setStars(0); setText('') }}>Send more</button></div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
            <div className="flex justify-center gap-5 py-8" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setStars(n)} onMouseEnter={() => setHover(n)} className="cursor-pointer transition-transform hover:scale-110 active:scale-95">
                  <svg className={`size-11 transition-colors ${n <= (hover || stars) ? 'fill-[#fbbf24] text-[#fbbf24]' : 'fill-none text-[#292536]'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
                </button>
              ))}
            </div>
            <div className="mb-3 flex items-center justify-between text-sm"><label htmlFor="fb" className="font-semibold text-white">Description</label><span className="text-xs text-[#858094]">{text.length}/500</span></div>
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
          {!signedIn && <div className="rounded-xl border border-[#292536] bg-[#14121d] px-4 py-3 text-sm text-white">Log in to redeem your code. <Link to="/login" className="font-semibold underline">Login</Link></div>}
          <label className="block text-sm font-semibold text-white">Transfer code<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="GLY-XXXX-XXXX" className={`${field} mt-3 h-[52px] bg-[#14121d] font-normal`} /></label>
          <button className={`${submitBtn} h-[52px] rounded-full`}>Redeem code</button>
          {msg && <p role="status" className="text-center text-sm text-[#b8b4c7]">{msg}</p>}
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
      <div className="mx-auto max-w-4xl space-y-4 text-[#b8b4c7]">
        <h1 className="mb-6 text-3xl font-bold text-[#f8f5ff] sm:mb-8 sm:text-4xl">{title}</h1>
        <p className="mb-4 leading-relaxed"><strong className="font-semibold text-white">Effective Date:</strong> Placeholder</p>
        {sections.map(([h, ps]) => (
          <div key={h}><h2 className="mb-4 mt-8 text-xl font-semibold text-[#f8f5ff] sm:text-2xl">{h}</h2>{ps.map((p) => <p key={p} className="mb-4 leading-relaxed text-[#b8b4c7]">{p}</p>)}</div>
        ))}
      </div>
    </div>
  )
}
