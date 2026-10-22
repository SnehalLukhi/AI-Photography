import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { findAsset, siblingsOf, generateUrl, plans } from '../data/templates.js'

// Beard / LinkedIn Headshot / Hairstyle photos fill the whole card (no empty bands above and below); every other category keeps showing the full image.
// Display-only coin pill beside the Generate button: coins needed for one image, read from the plans' "Cost per image" (same value the Pricing page shows). Not the user's balance; nothing is deducted here.
const IMAGE_COST = parseInt(plans[0].details.find(([label]) => label === 'Cost per image')?.[1], 10)
const CoinPill = ({ className = '', cost = IMAGE_COST }) => (
  <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#FF55AA]/40 bg-gradient-to-br bg-[#2B2B2B] from-[#FF55AA]/[0.07] to-[#FF55AA]/0 px-2.5 text-[12px] font-semibold text-white shadow-[0_0_18px_rgba(255,85,170,0.2)] ${className}`}>
    <img src={brandImages.coin} alt="" width="20" height="20" className="size-5 shrink-0 object-contain drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]" />{cost} Coins
  </span>
)
const fitOf = (t) => (t.categoryId === 'beard' || t.categoryId === 'linkedin-headshot' || /^hairstyle-/.test(t.categoryId) ? 'object-cover' : 'object-contain')
import { SparkIcon } from './../components/Header.jsx'
import { brandImages } from '../data/images.js'
import { useStudio } from '../context/StudioContext.jsx'
import { promptFor, inspectUpload, generatePhoto, getPlans } from '../lib/aiPhotography.js'

const ICON_PATHS = {
  Female: 'M12 12a4 4 0 100-8 4 4 0 000 8zM6 21c0-3.5 2.5-6 6-6s6 2.500 6 6M7.500 7C8 4.500 10 3 12 3s4 1.500 4.500 4',
  Male: 'M12 12a4 4 0 100-8 4 4 0 000 8zM5 21c0-4 3-6.500 7-6.500s7 2.500 7 6.500',
  Photo: 'M12 12a4 4 0 100-8 4 4 0 000 8zM5 21c0-4 3-6.500 7-6.500s7 2.500 7 6.500',
}
const SlotIcon = ({ kind, className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ICON_PATHS[kind] || ICON_PATHS.Photo} /></svg>
)

const BAD_FILE = 'The file is empty or corrupted. Please upload a valid image.'

/** Validates a chosen file (type, size, decodable) and returns { url, name } or throws a user-facing message. */
async function readPhoto(file) {
  const heic = /\.(heic|heif)$/i.test(file.name) || /heic|heif/.test(file.type)
  if (!file.size) throw new Error(BAD_FILE)
  if (!heic && !file.type.startsWith('image/')) throw new Error('Please choose a JPG, PNG or HEIC image.')
  if (file.size > 20 * 1024 * 1024) throw new Error('Image must be under 20 MB.')
  const url = URL.createObjectURL(file)
  if (!heic) {
    await new Promise((res, rej) => { const i = new Image(); i.onload = res; i.onerror = () => rej(new Error(BAD_FILE)); i.src = url }).catch((e) => { URL.revokeObjectURL(url); throw e })
  }
  return { url, name: file.name, file }
}

/** 80's & 90's, Old Money, LinkedIn Headshot, Top Carousel (AI Photography API) and Cartoon (Cartoon Yourself API) templates: checks the real image format (JPG / PNG / WebP) and the 10 MB limit before accepting the photo. */
async function readRealPhoto(file, kind) {
  const { file: checked, error } = await inspectUpload(file, kind)
  if (error) throw new Error(error)
  const url = URL.createObjectURL(checked)
  await new Promise((res, rej) => { const i = new Image(); i.onload = res; i.onerror = () => rej(new Error(BAD_FILE)); i.src = url }).catch((e) => { URL.revokeObjectURL(url); throw e })
  return { url, name: checked.name, file: checked }
}

function Slot({ kind, photo, onPick, onClear, error, sheet }) {
  const input = useRef()
  const [drag, setDrag] = useState(false)
  const choose = (f) => f && onPick(f)
  return (
    <div className={sheet ? 'relative h-[132px] w-full max-[380px]:h-[116px]' : 'relative min-h-0 w-full flex-1'}>
      <input ref={input} type="file" hidden accept="image/*,.heic,.HEIC,.heif,.HEIF" onChange={(e) => { choose(e.target.files[0]); e.target.value = '' }} />
      {photo ? (
        <div className="absolute inset-0 overflow-hidden rounded-[10px] border border-[#FF55AA]/45 bg-[#0A0809] sm:rounded-xl">
          <img src={photo.url} alt={`${kind} upload`} className="size-full object-cover" />
          <button type="button" aria-label="Remove photo" onClick={onClear} className="absolute right-2.5 top-2.5 grid size-8 cursor-pointer place-items-center rounded-full bg-[#2B2B2B]/90 text-white backdrop-blur transition hover:bg-[#FF55AA]">✕</button>
          <button type="button" onClick={() => input.current.click()} className="absolute bottom-3 right-3 cursor-pointer rounded-full bg-[#2B2B2B]/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-[#2B2B2B]">Change Photo</button>
        </div>
      ) : (
        <div role="button" tabIndex={0} onClick={() => input.current.click()} onKeyDown={(e) => e.key === 'Enter' && input.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files[0]) }}
          className={`absolute inset-0 flex min-h-[130px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[10px] border border-dashed bg-[#0A0809] shadow-[inset_0_0_48px_rgba(255,85,170,0.08)] transition-colors sm:min-h-0 sm:rounded-xl ${drag ? 'border-[#FF55AA]' : 'border-[#FF55AA]/45 hover:border-[#FF55AA]/55'}`}>
          <div className="flex flex-col items-center justify-center gap-1.5 px-1.5 py-3 text-center sm:gap-2.5 sm:px-2 sm:py-6">
            <span className="inline-flex size-[52px] items-center justify-center rounded-full bg-white/10 sm:size-[68px]"><SlotIcon kind={kind} className="h-8 w-[26px] text-white sm:h-9 sm:w-[29px]" /></span>
            <div>
              <p className="text-[12px] font-medium text-white sm:text-[16px]">{kind === 'Photo' ? 'Add Photo' : `Add ${kind}`}</p>
              <p className="mt-0.5 text-[9px] text-[#A0A0A0] sm:mt-1 sm:text-[12px]">Supports JPG, PNG, HEIC</p>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); input.current.click() }} className="hidden h-7 cursor-pointer items-center justify-center rounded-full border border-[#2B2B2B] bg-gradient-to-br from-[#2B2B2B]/90 to-[#2B2B2B]/90 px-3 text-[10px] font-semibold text-white backdrop-blur-sm transition-colors hover:border-[#FF55AA]/60 hover:bg-gradient-to-br hover:from-[#2B2B2B] hover:to-[#2B2B2B] sm:inline-flex sm:h-9 sm:px-5 sm:text-[12px]">Browse Files</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="absolute inset-x-2 bottom-2 z-10 rounded-xl bg-[#0A0809]/70 px-2 py-1 text-center text-[11px] text-red-300">{error}</p>}
    </div>
  )
}

function Generator({ asset }) {
  const nav = useNavigate()
  const { signedIn, addCreation, signOut, coins, refreshUser, openLogin } = useStudio()
  const [cost, setCost] = useState(15) // coins per generation (from the backend)
  useEffect(() => { getPlans().then((r) => setCost(r.costPerGeneration)).catch(() => {}) }, [])
  const slots = asset.slots
  const [photos, setPhotos] = useState(() => slots.map(() => null))
  const [errors, setErrors] = useState(() => slots.map(() => ''))
  const [sheet, setSheet] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | loading | done | error
  const [result, setResult] = useState('') // real generated image URL (templates with a JSON catalogue only)
  const [resultOriginal, setResultOriginal] = useState('') // the stored copy of the uploaded photo (the local preview is used first)
  const [apiError, setApiError] = useState('')
  const [needCoins, setNeedCoins] = useState(false) // the last failure was 'not enough coins'
  const timer = useRef()
  const abort = useRef()
  const info = promptFor(asset)
  const real = !!info // templates with a JSON catalogue use the AILabTools API (AI Photography, or Cartoon Yourself for Cartoon); every other template keeps the demo flow
  const stripRef = useRef()
  useEffect(() => () => { clearTimeout(timer.current); abort.current?.abort() }, [])
  useEffect(() => { stripRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' }) }, [asset.id])

  const multi = slots.length > 1
  const camRef = useRef(), galRef = useRef(), target = useRef(null) // mobile upload page: hidden camera / gallery inputs and the slot they fill
  const nextSlot = () => Math.max(0, photos.findIndex((x) => !x))
  const ready = photos.every(Boolean)
  const pick = (i) => async (file) => {
    try {
      const p = await (real ? readRealPhoto(file, info.cartoonType ? 'cartoon' : info.hairTemplate ? 'hair' : undefined) : readPhoto(file))
      setPhotos((l) => l.map((x, k) => (k === i ? p : x)))
      setErrors((l) => l.map((x, k) => (k === i ? '' : x)))
    } catch (e) { setErrors((l) => l.map((x, k) => (k === i ? e.message : x))) }
  }
  const clear = (i) => () => setPhotos((l) => l.map((x, k) => (k === i ? null : x)))
  const generateReal = async (prompt) => {
    const { file, error } = await inspectUpload(photos[0]?.file, prompt.cartoonType ? 'cartoon' : prompt.hairTemplate ? 'hair' : undefined)
    if (error) { setApiError(error); setPhase('error'); return }
    // dev-only trace: which template was selected and exactly which JSON entry / values go out (visible in the browser console, never in production)
    if (import.meta.env.DEV) console.info('[generate]', { template: asset.name, templateId: asset.assetId, category: asset.categoryId, api: prompt.cartoonType ? 'cartoon-yourself' : 'ai-photography', jsonId: prompt.id, jsonName: prompt.name, type: prompt.cartoonType, style_title: prompt.title, style_desc: prompt.desc })
    if (coins < cost) { setApiError(`You need ${cost} coins to generate, and you have ${coins}. Get more coins to continue.`); setNeedCoins(true); setPhase('error'); return }
    setApiError(''); setNeedCoins(false); setResult(''); setPhase('loading')
    abort.current?.abort()
    const ctrl = new AbortController(); abort.current = ctrl
    try {
      const { url, original, generationId } = await generatePhoto({ file, title: prompt.title, desc: prompt.desc, cartoonType: prompt.cartoonType, beardTemplate: prompt.beardTemplate, hairTemplate: prompt.hairTemplate, hairColor: prompt.hairColor, name: asset.name, signal: ctrl.signal })
      addCreation({ type: asset.type, name: asset.name, image: url, original, generationId })
      refreshUser() // new coin balance
      setResult(url); setResultOriginal(original); setPhase('done')
    } catch (e) {
      if (e.name === 'AbortError') return
      if (e.status === 401) { signOut(); openLogin(); return } // login expired
      setNeedCoins(e.code === 'INSUFFICIENT_COINS'); refreshUser()
      setApiError(e.message || 'Generation failed. Please try again.'); setPhase('error')
    }
  }
  const next = () => {
    if (!ready) return
    if (!signedIn) { openLogin(); return }
    const prompt = promptFor(asset)
    if (prompt?.error) { setApiError(prompt.error); setPhase('error'); return } // category with JSON data but no entry for this template: stop, never fall back to the demo flow
    if (prompt) { generateReal(prompt); return }
    setPhase('loading')
    timer.current = setTimeout(() => { // demo only - no real generation, so nothing is added to My Creations
      setPhase('done')
    }, 2500)
  }
  const ctaLabel = signedIn ? 'Generate' : 'Continue to Generate'

  // Card width shared by the template card and each upload slot: min(half the row, height-limited 9:16)
  const W = 'min(calc(50% - 0.6rem), calc((100dvh - 12rem) * 9 / 16))'

  return (
    <>
      {/* ---------- Mobile: "Upload Photo" page (template card, big upload area, Camera / Gallery, Generate) ---------- */}
      <div className="fixed inset-0 z-[60] flex h-dvh flex-col overflow-y-auto overscroll-contain bg-[#0A0809] sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="relative flex shrink-0 items-center justify-center px-4 pb-4 pt-6">
          <button type="button" aria-label="Back" onClick={() => nav(-1)} className="absolute left-4 flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#2B2B2B] active:scale-90"><svg className="size-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          <h1 className="text-[18px] font-semibold text-white">Upload {multi ? 'Photos' : 'Photo'}</h1>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-5 px-4 pb-6">
          {/* selected template */}
          <div className="flex shrink-0 items-center gap-3.5 rounded-[22px] border border-white/[0.08] bg-[#121012] p-2.5 pr-3.5">
            <img src={asset.image} alt={asset.name} className="h-[68px] w-[52px] shrink-0 rounded-xl object-cover object-top" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0A0]">Template</p>
              <p className="truncate text-[17px] font-semibold text-white">{asset.name}</p>
              <p className="truncate text-[13px] text-[#A0A0A0]">{asset.category}</p>
            </div>
            <Link to={/^hairstyle-/.test(asset.categoryId) ? `/explore?category=hairstyle&sub=${asset.categoryId.replace('hairstyle-', '')}` : `/explore?category=${asset.categoryId}`} replace className="shrink-0 rounded-full bg-[#2B2B2B] px-4 py-2.5 text-[13px] font-semibold text-white active:scale-95">Change</Link>
          </div>
          {/* upload area(s): shows the chosen photo as is */}
          <div className={`grid min-h-[280px] flex-1 gap-3 ${multi ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {slots.map((k, i) => (
              <div key={k} className="relative min-h-[220px]">
                {photos[i] ? (
                  <div className="absolute inset-0 overflow-hidden rounded-[28px] border border-white/15 bg-[#121012]">
                    <img src={photos[i].url} alt={`Your ${k} upload`} className="size-full object-contain" />
                    <button type="button" aria-label="Remove photo" onClick={clear(i)} className="absolute right-3 top-3 grid size-9 cursor-pointer place-items-center rounded-full bg-[#2B2B2B]/90 text-white backdrop-blur">✕</button>
                    <button type="button" onClick={() => { target.current = i; galRef.current.click() }} className="absolute bottom-3 right-3 cursor-pointer rounded-full bg-[#2B2B2B]/85 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur">Change Photo</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => { target.current = i; galRef.current.click() }} className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[28px] border-[1.5px] border-dashed border-white/20 bg-[#0A0809] px-4 text-center">
                    <span className="grid size-[68px] place-items-center rounded-full bg-[#2B2B2B] text-white"><svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h5L15 8h1M4 8v11h14v-4M4 8M18 4v4M16 6h4M11 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" /></svg></span>
                    <span><span className="block text-[18px] font-semibold text-white">{multi ? `Add ${k === 'Photo' ? `photo ${i + 1}` : k}` : 'Add your photo'}</span><span className="mt-1 block text-[13px] text-[#A0A0A0]">Use a clear, front-facing selfie</span></span>
                  </button>
                )}
                {errors[i] && <p role="alert" className="absolute inset-x-3 bottom-3 z-10 rounded-xl bg-[#0A0809]/80 px-2 py-1 text-center text-[11px] text-red-300">{errors[i]}</p>}
              </div>
            ))}
          </div>
          <input ref={camRef} type="file" hidden accept="image/*" capture="user" onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) pick(nextSlot())(f) }} />
          <input ref={galRef} type="file" hidden accept="image/*,.heic,.HEIC,.heif,.HEIF" onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) pick(target.current ?? nextSlot())(f); target.current = null }} />
          <div className="grid shrink-0 grid-cols-2 gap-3">
            {[['Camera', 'Take a selfie', () => camRef.current.click(), 'M4 8h3l1.5-2h7L17 8h3v11H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z'], ['Gallery', 'Choose a photo', () => { target.current = null; galRef.current.click() }, 'M7 4h13v13H7zM4 7v13h13M10 14l3-3 3 3 2-2 2 2M11 8h.01']].map(([t, sub, fn, d]) => (
              <button key={t} type="button" onClick={fn} className="flex cursor-pointer items-center gap-3 rounded-[20px] border border-white/[0.08] bg-[#121012] p-2.5 text-left active:scale-[0.98]">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[#0A0809]"><svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg></span>
                <span className="min-w-0"><span className="block text-[15px] font-semibold text-white">{t}</span><span className="block truncate text-[12px] text-[#A0A0A0]">{sub}</span></span>
              </button>
            ))}
          </div>
          <div className="mt-1 flex shrink-0 items-center gap-2">
            <button type="button" disabled={!ready} onClick={next} className="flex h-[54px] min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full text-[16px] font-bold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#1C1A1C] disabled:text-white/35 disabled:shadow-none" style={ready ? { background: 'linear-gradient(90deg, #FF88C7 0%, #FF55AA 100%)' } : undefined}>
              <SparkIcon className="size-5" />{ctaLabel}
            </button>
            <CoinPill cost={cost} className="h-[54px] shrink-0 !border-white/15 !bg-white/[0.06] !bg-none !shadow-none" />
          </div>
          <p className="shrink-0 text-center text-xs text-[#A0A0A0]">{real ? `${cost} coins per generation · returned if it fails` : 'Demo preview · no coins are used'}</p>
        </div>
      </div>

      {/* ---------- Tablet / desktop ---------- */}
      <div className="relative hidden w-full overflow-hidden sm:block">
        <div className="relative z-[1] mx-auto flex h-[calc(100dvh-5rem)] max-h-[calc(100dvh-5rem)] w-full max-w-[1440px] flex-col overflow-hidden px-6 pb-2 pt-3 md:px-8 lg:px-12 xl:px-16">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="relative mx-auto mb-2 w-full max-w-[840px] shrink-0 px-2 sm:mb-3">
              <div className="relative flex items-center justify-between">
                <button type="button" onClick={() => nav(-1)} className="group inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#2B2B2B] bg-gradient-to-br bg-[#2B2B2B]/80 from-[#FF55AA]/[0.07] to-[#FF55AA]/0 px-3 py-1.5 text-xs font-medium text-[#A0A0A0] shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-gradient-to-br hover:from-[#2B2B2B] hover:to-[#2B2B2B] hover:text-white sm:text-sm">
                  <svg className="size-4 text-[#A0A0A0] transition group-hover:-translate-x-0.5 group-hover:text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 12H5m6-6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Back</span>
                </button>
                <div className="min-w-0 flex-1 px-2 text-center"><h1 className="truncate text-[20px] font-bold tracking-tight text-[#ffffff] sm:text-[26px] lg:text-[28px]">Upload <span className="bg-gradient-to-r from-[#FF88C7] to-[#FF55AA] bg-clip-text text-transparent">Your</span> {multi ? 'Photos' : 'Photo'}</h1></div>
                <div className="pointer-events-none hidden w-[88px] shrink-0 sm:block" />
              </div>
              <p className="mt-0.5 truncate text-center text-[11px] text-[#A0A0A0] sm:text-[12px] lg:text-[13px]">{multi ? `This template needs ${slots.length} clear photos — upload each slot below.` : 'Use a clear, well-lit photo for the best personalized result.'}</p>
            </div>
            <div className="relative mt-3 flex min-h-0 flex-1 items-center justify-center sm:mt-4">
              <div className="flex h-full max-h-full w-full flex-col items-center justify-center gap-4 sm:flex-row sm:items-start lg:gap-5 xl:gap-6">
                <article className="relative aspect-[9/16] h-auto shrink-0 overflow-hidden rounded-xl border border-[#FF55AA]/35 bg-gradient-to-br bg-[#2B2B2B] from-[#FF55AA]/[0.07] to-[#FF55AA]/0 shadow-[0_0_40px_rgba(255,85,170,0.16)]" style={{ width: W }}>
                  <img src={asset.image} alt="" className="pointer-events-none absolute inset-0 size-full scale-110 object-cover object-center blur-2xl brightness-75 saturate-125" />
                  <div className="pointer-events-none absolute inset-0 bg-[#0A0809]/35" />
                  <img src={asset.image} alt={asset.name} width="1080" height="1920" className={`absolute inset-0 z-[1] size-full ${fitOf(asset)} object-center`} />
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-20 bg-gradient-to-b from-[#0A0809]/55 to-transparent" />
                  <p className="absolute left-4 right-4 top-3.5 z-10 truncate text-[15px] font-semibold text-white">{asset.name}</p>
                </article>
                <article className="relative aspect-[9/16] h-auto shrink-0 overflow-hidden rounded-xl border border-[#FF55AA]/35 bg-gradient-to-br bg-[#2B2B2B] from-[#FF55AA]/[0.07] to-[#FF55AA]/0 shadow-[0_0_40px_rgba(255,85,170,0.12)]" style={{ width: `calc((${W}) * ${slots.length})`, aspectRatio: `${9 * slots.length} / 16` }}>
                  <div className="absolute inset-0 flex flex-col gap-3 p-2.5 lg:gap-4 lg:p-3">
                    <div className={`relative grid min-h-0 flex-1 gap-2.5 ${multi ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {slots.map((k, i) => <Slot key={k} kind={k} photo={photos[i]} error={errors[i]} onPick={pick(i)} onClear={clear(i)} />)}
                    </div>
                    <div className="relative flex w-full shrink-0 flex-col items-center gap-1">
                      <div className="flex w-full items-center gap-2">
                      <button type="button" disabled={!ready} onClick={next} className="grad-bg flex h-[48px] min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[14px] font-bold text-white shadow-[0_8px_28px_rgba(255,85,170,0.4)] transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                        <div className="flex items-center gap-1.5"><span className="text-base">✨</span><span>{ctaLabel}</span><span className="ml-0.5 text-base font-bold">→</span></div>
                      </button>
                      <CoinPill cost={cost} className="h-[48px]" />
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>

      {phase === 'loading' && (
        <div className="welcome-backdrop fixed inset-0 z-[120] grid place-items-center bg-[#0A0809]/85 backdrop-blur">
          <div className="welcome-card text-center"><div className="mx-auto mb-4 size-14 animate-spin rounded-full border-4 border-[#2B2B2B] border-t-[#FF55AA]" /><p className="font-medium">AI is creating magic ✦</p><p className="text-sm text-[#A0A0A0]">{real ? 'This can take a minute…' : ''}</p></div>
        </div>
      )}
      {phase === 'done' && real && result && (
        <div className="welcome-backdrop fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-[#0A0809]/80 p-4 backdrop-blur-sm" onClick={() => setPhase('idle')}>
          {/* The card is as wide as the largest 9:16 image that still lets the whole card fit the screen height (--chrome = everything that is not the image: card padding, text, buttons, outer margin), capped at 24 rem. Screens under 640 px tall use a compact version (--pad / --chrome / gaps). */}
          <div className="welcome-card mx-auto flex w-[min(100%,40rem,calc((100dvh-var(--chrome))*18/16+var(--pad)))] min-w-[18rem] flex-col rounded-2xl border border-[#FF55AA]/30 bg-gradient-to-br bg-[#2B2B2B] from-[#FF55AA]/[0.07] to-[#FF55AA]/0 p-[calc(var(--pad)/2)] text-center shadow-2xl [--chrome:17.75rem] [--pad:2.5rem] [&_button]:px-4 [@media(max-height:640px)]:[--chrome:13.75rem] [@media(max-height:640px)]:[--pad:1.5rem] [@media(max-height:640px)]:[&_.gap-3]:gap-2 [@media(max-height:640px)]:[&_button]:py-2" onClick={(e) => e.stopPropagation()}>
            {/* the uploaded photo next to the AI result. Results can have any shape (Cartoon and Beard keep the uploaded photo's own shape), so both fill a 9:16 card with object-cover: no bars, no stretching (the overflow is cropped) */}
            <div className="mb-5 grid grid-cols-2 gap-3 [@media(max-height:640px)]:mb-3">
              {[['Original', photos[0]?.url || resultOriginal], ['AI generated', result]].map(([label, src], i) => (
                <figure key={label}>
                  <div className={`relative aspect-[9/16] w-full overflow-hidden rounded-xl border bg-[#0A0809] ${i ? 'border-[#FF55AA] shadow-[0_0_40px_rgba(255,85,170,0.3)]' : 'border-[#FF55AA]/40'}`}>
                    {src && <img src={src} alt={i ? `${asset.name} result` : 'Your original photo'} className="absolute inset-0 size-full object-cover object-center" />}
                  </div>
                  <figcaption className="mt-1.5 text-xs text-[#A0A0A0]">{label}</figcaption>
                </figure>
              ))}
            </div>
            <p className="mb-1 font-medium">Your photo is ready</p>
            <p className="mb-5 text-xs text-[#A0A0A0] [@media(max-height:640px)]:mb-3">It was added to My Creations.</p>
            <div className="flex flex-col gap-3"><button className="btn-grad w-full" onClick={() => nav('/creations')}>View in My Creations</button><button className="btn-dark w-full" onClick={() => setPhase('idle')}>Try another photo</button></div>
          </div>
        </div>
      )}
      {phase === 'error' && (
        <div className="welcome-backdrop fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-[#0A0809]/85 p-4 backdrop-blur" onClick={() => setPhase('idle')}>
          <div role="alert" className="welcome-card w-full max-w-sm rounded-xl border border-red-500/40 bg-gradient-to-br bg-[#2B2B2B] from-[#FF55AA]/[0.07] to-[#FF55AA]/0 p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-1 font-medium">Generation failed</p>
            <p className="mb-4 text-sm text-[#A0A0A0]">{apiError || 'Something went wrong. Please try again.'}</p>
            <div className="flex flex-col gap-2">{needCoins && <button className="btn-grad" onClick={() => nav('/coins')}>Get coins</button>}<button className={needCoins ? 'btn-dark' : 'btn-grad'} onClick={() => setPhase('idle')}>{needCoins ? 'Close' : 'Try again'}</button></div>
          </div>
        </div>
      )}
      {phase === 'done' && !real && (
        <div className="welcome-backdrop fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-[#0A0809]/85 p-4 backdrop-blur" onClick={() => setPhase('idle')}>
          <div className="welcome-card w-full max-w-sm rounded-xl border border-[#FF55AA]/30 bg-gradient-to-br bg-[#2B2B2B] from-[#FF55AA]/[0.07] to-[#FF55AA]/0 p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative mb-4 aspect-[9/16] max-h-[60vh] overflow-hidden rounded-xl border border-[#FF55AA] shadow-[0_0_40px_rgba(255,85,170,0.3)]">
              <img src={asset.image} alt="" className={`absolute inset-0 size-full ${fitOf(asset)}`} />
              <img src={photos[0].url} alt="" className="absolute inset-0 size-full object-cover opacity-50 mix-blend-overlay" />
            </div>
            <div className="flex flex-col gap-2"><button className="btn-grad" onClick={() => nav('/creations')}>View in My Creations</button><button className="btn-dark" onClick={() => setPhase('idle')}>Try another photo</button></div>
          </div>
        </div>
      )}
    </>
  )
}

export default function Generate() {
  const [params] = useSearchParams()
  const categoryId = params.get('categoryId')
  const assetId = params.get('assetId')
  if (!categoryId || !assetId) return <Navigate to="/" replace /> // same as the reference
  const asset = findAsset(categoryId, assetId)
  if (!asset) {
    return (
      <div className="px-4 pt-24 text-center">
        <p className="text-lg text-[#A0A0A0]">Template not found. Please choose another from Explore.</p>
        <Link to="/explore" className="grad-bg mt-5 inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90">Browse Explore</Link>
      </div>
    )
  }
  return <Generator key={asset.id} asset={asset} />
}
