import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { brandImages } from '../data/images.js'
import { SparkIcon } from '../components/Header.jsx'
import { useStudio } from '../context/StudioContext.jsx'
import { getCoinPacks, buyCoins } from '../lib/aiPhotography.js'

const usd = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

/** "Get Coins": one-time coin packs (no subscription). Opened by the coin badge in the header. */
export default function Coins() {
  const nav = useNavigate()
  const { signedIn, coins, user, refreshUser } = useStudio()
  const [data, setData] = useState(null) // { packs, costPerGeneration }
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  useEffect(() => { getCoinPacks().then(setData).catch(() => setFailed(true)) }, [])

  const buy = async (pack) => {
    if (!signedIn) { nav('/login'); return }
    setBusy(pack.id); setNote('')
    try {
      const out = await buyCoins(pack.id, { name: user?.name, email: user?.email })
      refreshUser()
      nav('/payment-success', { state: out })
      return
    } catch (e) { setNote(e.message) }
    setBusy('')
  }

  return (
    <div className="mx-auto w-full max-w-[1408px] px-4 pb-24 pt-6 sm:px-6 sm:pb-20 sm:pt-8 md:px-8 lg:px-12">
      <header>
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#B070FA]/50 bg-[#B070FA]/[0.06] px-4 py-1.5 text-[13px] font-semibold text-white"><SparkIcon className="size-3.5 text-[#B070FA]" /><span>Top up anytime</span></div>
          <h1 className="mt-6 text-[32px] font-bold leading-[1.05] tracking-tight sm:text-[44px] lg:text-[48px]"><span className="text-[#ffffff]">Get More </span><span className="grad-text">Coins</span></h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#C4B5FD]/85 sm:mt-4">Buy a coin pack once - no subscription. Coins never expire{signedIn ? <>, and you have <strong className="text-white">{coins.toLocaleString()}</strong> now.</> : '.'}</p>
        </div>
      </header>

      <section className="mt-8 sm:mt-10 lg:mt-12">
        <h2 className="sr-only">Coin packs</h2>
        {failed && <p role="alert" className="rounded-xl border border-red-500/40 bg-[#12121A] px-4 py-3 text-sm text-red-300">Could not load the coin packs. Please check your connection and refresh.</p>}
        <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2 sm:gap-5 sm:pt-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-5">
          {(data?.packs || []).map((p) => {
            const photos = Math.floor(p.coins / data.costPerGeneration)
            return (
              <article key={p.id} className={`relative flex flex-col overflow-visible rounded-[24px] border p-6 transition-transform duration-200 hover:-translate-y-1 sm:p-8 lg:p-6 xl:p-6 ${p.popular ? 'border-[#B070FA]/30 bg-[#170E21]' : 'border-white/[0.08] bg-[#12121A]'}`}>
                {p.popular && <span className="grad-bg absolute right-5 top-0 z-10 -translate-y-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white sm:text-[11px]">Most Popular</span>}
                <h3 className={`${p.popular ? 'pr-16 ' : ''}text-[18px] font-bold leading-tight text-white sm:text-[22px]`}>{p.name}</h3>
                <p className="mt-5 text-[34px] font-bold leading-none text-white sm:text-[40px]">{usd(typeof p.price === 'object' ? p.price.USD : p.price)}</p>
                <div className="mt-4 flex items-center gap-2.5">
                  <img src={brandImages.coin} alt="" width="44" height="44" className="size-9 shrink-0 object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]" />
                  <p className="text-[14px] font-semibold text-white">{p.coins.toLocaleString('en-US')} Coins</p>
                </div>
                <p className="mt-7 flex-1 text-[13px] text-[#C4B5FD] sm:text-[14px]"><span aria-hidden="true" className="mr-2 text-[#C4B5FD]/80">✓</span>About <strong className="text-white">{photos}</strong> {photos === 1 ? 'photo' : 'photos'}</p>
                <button type="button" disabled={busy === p.id} onClick={() => buy(p)}
                  className={`group relative mt-8 flex h-[52px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl text-[15px] font-semibold text-white transition-shadow duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B070FA] disabled:cursor-wait disabled:opacity-70 ${p.popular ? 'grad-bg shadow-[0_0_28px_rgba(176,112,250,0.35)] hover:shadow-[0_0_36px_rgba(176,112,250,0.45)]' : 'border border-white/[0.08] bg-[#1A1A24] hover:border-transparent hover:shadow-[0_0_28px_rgba(176,112,250,0.35)]'}`}>
                  {!p.popular && <span className="grad-bg pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}
                  <span className="relative z-10">{busy === p.id ? 'Please wait…' : `Buy ${p.name}`}</span>
                </button>
              </article>
            )
          })}
        </div>
        {note && <p role="status" className="mt-4 rounded-xl border border-[#B070FA]/40 bg-gradient-to-br from-[#2A1B52] to-[#1A284F] px-4 py-3 text-center text-sm text-[#C4B5FD]">{note}</p>}
        <p className="mt-6 text-center text-sm text-[#C4B5FD]/75">Prefer a subscription? <Link to="/pricing" className="font-semibold text-white underline">See the plans</Link></p>
      </section>
    </div>
  )
}
