import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { findAsset, siblingsOf, generateUrl } from '../data/templates.js'

// Beard / Fun / Hairstyle photos fill the whole card (no empty bands above and below); every other category keeps showing the full image.
const fitOf = (t) => (t.categoryId === 'beard' || /^(fun|hairstyle)-/.test(t.categoryId) ? 'object-cover' : 'object-contain')
import { SparkIcon } from './../components/Header.jsx'
import { useStudio } from '../context/StudioContext.jsx'

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
  return { url, name: file.name }
}

function Slot({ kind, photo, onPick, onClear, error, sheet }) {
  const input = useRef()
  const [drag, setDrag] = useState(false)
  const choose = (f) => f && onPick(f)
  return (
    <div className={sheet ? 'relative h-[170px] w-full' : 'relative min-h-0 w-full flex-1'}>
      <input ref={input} type="file" hidden accept="image/*,.heic,.HEIC,.heif,.HEIF" onChange={(e) => { choose(e.target.files[0]); e.target.value = '' }} />
      {photo ? (
        <div className="absolute inset-0 overflow-hidden rounded-[10px] border border-[#8b5cf6]/45 bg-[#0b0a12] sm:rounded-xl">
          <img src={photo.url} alt={`${kind} upload`} className="size-full object-cover" />
          <button type="button" aria-label="Remove photo" onClick={onClear} className="absolute right-2.5 top-2.5 grid size-8 cursor-pointer place-items-center rounded-full bg-[#292536]/90 text-white backdrop-blur transition hover:bg-[#8b5cf6]">✕</button>
          <button type="button" onClick={() => input.current.click()} className="absolute bottom-3 right-3 cursor-pointer rounded-full bg-[#292536]/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-[#292536]">Change Photo</button>
        </div>
      ) : (
        <div role="button" tabIndex={0} onClick={() => input.current.click()} onKeyDown={(e) => e.key === 'Enter' && input.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files[0]) }}
          className={`absolute inset-0 flex min-h-[130px] w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[10px] border border-dashed bg-[#0b0a12] shadow-[inset_0_0_48px_rgb(139,92,246,0.08)] transition-colors sm:min-h-0 sm:rounded-xl ${drag ? 'border-[#8b5cf6]' : 'border-[#8b5cf6]/45 hover:border-[#8b5cf6]/55'}`}>
          <div className="flex flex-col items-center justify-center gap-1.5 px-1.5 py-3 text-center sm:gap-2.5 sm:px-2 sm:py-6">
            <span className="inline-flex size-[52px] items-center justify-center rounded-full bg-white/10 sm:size-[68px]"><SlotIcon kind={kind} className="h-8 w-[26px] text-white sm:h-9 sm:w-[29px]" /></span>
            <div>
              <p className="text-[12px] font-medium text-white sm:text-[16px]">{kind === 'Photo' ? 'Add Photo' : `Add ${kind}`}</p>
              <p className="mt-0.5 text-[9px] text-[#858094] sm:mt-1 sm:text-[12px]">Supports JPG, PNG, HEIC</p>
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); input.current.click() }} className="hidden h-7 cursor-pointer items-center justify-center rounded-full border border-[#292536] bg-[#14121d]/90 px-3 text-[10px] font-semibold text-white backdrop-blur-sm transition-colors hover:border-[#8b5cf6]/60 hover:bg-[#14121d] sm:inline-flex sm:h-9 sm:px-5 sm:text-[12px]">Browse Files</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="absolute inset-x-2 bottom-2 z-10 rounded-xl bg-black/70 px-2 py-1 text-center text-[11px] text-red-300">{error}</p>}
    </div>
  )
}

function Generator({ asset }) {
  const nav = useNavigate()
  const { signedIn, addCreation } = useStudio()
  const slots = asset.slots
  const [photos, setPhotos] = useState(() => slots.map(() => null))
  const [errors, setErrors] = useState(() => slots.map(() => ''))
  const [sheet, setSheet] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | loading | done
  const timer = useRef()
  const stripRef = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { stripRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' }) }, [asset.id])

  const multi = slots.length > 1
  const ready = photos.every(Boolean)
  const pick = (i) => async (file) => {
    try {
      const p = await readPhoto(file)
      setPhotos((l) => l.map((x, k) => (k === i ? p : x)))
      setErrors((l) => l.map((x, k) => (k === i ? '' : x)))
    } catch (e) { setErrors((l) => l.map((x, k) => (k === i ? e.message : x))) }
  }
  const clear = (i) => () => setPhotos((l) => l.map((x, k) => (k === i ? null : x)))
  const next = () => {
    if (!ready) return
    if (!signedIn) { nav('/login'); return }
    setPhase('loading')
    timer.current = setTimeout(() => { // demo only - no real generation
      addCreation({ type: asset.type, name: asset.name, image: photos[0].url })
      setPhase('done')
    }, 2500)
  }
  const ctaLabel = signedIn ? 'Generate' : 'Continue to Generate'

  // Card width shared by the template card and each upload slot: min(half the row, height-limited 9:16)
  const W = 'min(calc(50% - 0.6rem), calc((100dvh - 12rem) * 9 / 16))'

  return (
    <>
      {/* ---------- Mobile: full-screen template + bottom sheet ---------- */}
      <div className="fixed inset-0 z-[60] flex h-dvh flex-col overflow-hidden bg-[#0b0a12] sm:hidden">
        <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-5 pb-6 pt-7" style={{ background: 'linear-gradient(rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
          <button type="button" aria-label="Back" onClick={() => nav(-1)} className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white/10 backdrop-blur-md active:scale-90"><svg className="size-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        </div>
        <div className="absolute inset-0 overflow-hidden">
          <img key={asset.id} src={asset.image} alt={asset.name} className={`absolute inset-0 size-full animate-fade-in ${fitOf(asset)} object-center`} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
        </div>
        <div className="relative z-10 mt-auto px-5 pb-8 pt-6" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)' }}>
          <h1 className="mb-4 text-center text-[20px] font-semibold text-[#f8f5ff]">{asset.name}</h1>
          <div ref={stripRef} className="no-scrollbar -mx-5 flex justify-start gap-2 overflow-x-auto px-5 pb-5">
            {siblingsOf(asset).map((t) => (
              <button key={t.id} data-active={t.id === asset.id} type="button" onClick={() => nav(generateUrl(t), { replace: true })}
                className={`h-[120px] w-[68px] shrink-0 cursor-pointer overflow-hidden rounded-[12px] border bg-[#14121d] transition-all ${t.id === asset.id ? 'z-10 border-2 border-white opacity-100' : 'border-transparent opacity-60 hover:opacity-90'}`}>
                <img src={t.image} alt={t.name} className={`size-full ${fitOf(t)} object-center`} />
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setSheet(true)} className="flex h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-[16px] font-semibold text-[#0b0a12] shadow-[0_8px_28px_rgb(139,92,246,0.5)] active:scale-[0.98]" style={{ background: 'linear-gradient(90deg, rgb(167,139,250) 0%, rgb(139,92,246) 55%, rgb(124,84,240) 100%)' }}>
            <SparkIcon className="size-5 text-white" />Create Now
          </button>
        </div>
        {sheet && (
          <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/60 backdrop-blur-md" onClick={() => setSheet(false)}>
            <div className="animate-fade-in rounded-t-[32px] border-t border-[#292536] bg-[#14121d] px-5 pb-8 pt-3" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/25" />
              <h2 className="mb-4 text-center text-base font-semibold text-[#f8f5ff]">{ready ? 'Ready to generate' : multi ? 'Please select photos' : 'Please select a photo'}</h2>
              <div className={`grid gap-3 ${multi ? 'grid-cols-2' : ''}`}>
                {slots.map((k, i) => <Slot key={k} sheet kind={k} photo={photos[i]} error={errors[i]} onPick={pick(i)} onClear={clear(i)} />)}
              </div>
              <button type="button" disabled={!ready} onClick={next} className="mt-5 flex h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-[#0b0a12] shadow-[0_8px_28px_rgb(139,92,246,0.4)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60" style={{ background: 'linear-gradient(90deg, rgb(167,139,250) 0%, rgb(139,92,246) 55%, rgb(124,84,240) 100%)' }}>
                <span>✨</span><span>{ctaLabel}</span><span>→</span>
              </button>
              <p className="mt-3 text-center text-xs text-[#858094]">Coins deducted only after generation complete</p>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Tablet / desktop ---------- */}
      <div className="relative hidden w-full overflow-hidden sm:block" style={{ background: 'radial-gradient(60% 50% at 0% 40%, rgba(139,92,246,0.35), transparent 70%), radial-gradient(50% 55% at 100% 70%, rgba(139,92,246,0.28), transparent 70%)' }}>
        <div className="relative z-[1] mx-auto flex h-[calc(100dvh-5rem)] max-h-[calc(100dvh-5rem)] w-full max-w-[1440px] flex-col overflow-hidden px-6 pb-2 pt-3 md:px-8 lg:px-12 xl:px-16">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="relative mx-auto mb-2 w-full max-w-[840px] shrink-0 px-2 sm:mb-3">
              <div className="relative flex items-center justify-between">
                <button type="button" onClick={() => nav(-1)} className="group inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-[#292536] bg-[#14121d]/80 px-3 py-1.5 text-xs font-medium text-[#b8b4c7] shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-[#14121d] hover:text-white sm:text-sm">
                  <svg className="size-4 text-[#858094] transition group-hover:-translate-x-0.5 group-hover:text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 12H5m6-6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Back</span>
                </button>
                <div className="min-w-0 flex-1 px-2 text-center"><h1 className="truncate text-[20px] font-bold tracking-tight text-[#f8f5ff] sm:text-[26px] lg:text-[28px]">Upload <span className="bg-gradient-to-r from-[#a78bfa] via-[#8b5cf6] to-[#7c54f0] bg-clip-text text-transparent">Your</span> {multi ? 'Photos' : 'Photo'}</h1></div>
                <div className="pointer-events-none hidden w-[88px] shrink-0 sm:block" />
              </div>
              <p className="mt-0.5 truncate text-center text-[11px] text-[#b8b4c7] sm:text-[12px] lg:text-[13px]">{multi ? `This template needs ${slots.length} clear photos — upload each slot below.` : 'Use a clear, well-lit photo for the best personalized result.'}</p>
            </div>
            <div className="relative mt-3 flex min-h-0 flex-1 items-center justify-center sm:mt-4">
              <div className="flex h-full max-h-full w-full flex-col items-center justify-center gap-4 sm:flex-row sm:items-start lg:gap-5 xl:gap-6">
                <article className="relative aspect-[9/16] h-auto shrink-0 overflow-hidden rounded-xl border border-[#8b5cf6]/35 bg-[#14121d] shadow-[0_0_40px_rgb(139,92,246,0.16)]" style={{ width: W }}>
                  <img src={asset.image} alt="" className="pointer-events-none absolute inset-0 size-full scale-110 object-cover object-center blur-2xl brightness-75 saturate-125" />
                  <div className="pointer-events-none absolute inset-0 bg-black/35" />
                  <img src={asset.image} alt={asset.name} width="1080" height="1920" className={`absolute inset-0 z-[1] size-full ${fitOf(asset)} object-center`} />
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-20 bg-gradient-to-b from-black/55 to-transparent" />
                  <p className="absolute left-4 right-4 top-3.5 z-10 truncate text-[15px] font-semibold text-white">{asset.name}</p>
                </article>
                <article className="relative aspect-[9/16] h-auto shrink-0 overflow-hidden rounded-xl border border-[#8b5cf6]/35 bg-[#14121d] shadow-[0_0_40px_rgb(139,92,246,0.12)]" style={{ width: `calc((${W}) * ${slots.length})`, aspectRatio: `${9 * slots.length} / 16` }}>
                  <div className="absolute inset-0 flex flex-col gap-3 p-2.5 lg:gap-4 lg:p-3">
                    <div className={`relative grid min-h-0 flex-1 gap-2.5 ${multi ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {slots.map((k, i) => <Slot key={k} kind={k} photo={photos[i]} error={errors[i]} onPick={pick(i)} onClear={clear(i)} />)}
                    </div>
                    <div className="relative flex w-full shrink-0 flex-col items-center gap-1">
                      <button type="button" disabled={!ready} onClick={next} className="grad-bg flex h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-[#0b0a12] shadow-[0_8px_28px_rgb(139,92,246,0.4)] transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
                        <div className="flex items-center gap-1.5"><span className="text-base">✨</span><span>{ctaLabel}</span><span className="ml-0.5 text-base font-bold">→</span></div>
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>

      {phase === 'loading' && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/85 backdrop-blur">
          <div className="text-center"><div className="mx-auto mb-4 size-14 animate-spin rounded-full border-4 border-[#292536] border-t-[#8b5cf6]" /><p className="font-medium">AI is creating magic ✦</p><p className="text-sm text-[#858094]">Demo preview</p></div>
        </div>
      )}
      {phase === 'done' && (
        <div className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-black/85 p-4 backdrop-blur" onClick={() => setPhase('idle')}>
          <div className="w-full max-w-sm rounded-xl border border-[#8b5cf6]/30 bg-[#14121d] p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative mb-4 aspect-[9/16] max-h-[60vh] overflow-hidden rounded-xl border border-[#8b5cf6] shadow-[0_0_40px_rgba(139,92,246,0.3)]">
              <img src={asset.image} alt="" className={`absolute inset-0 size-full ${fitOf(asset)}`} />
              <img src={photos[0].url} alt="Demo result" className="absolute inset-0 size-full object-cover opacity-50 mix-blend-overlay" />
              <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs">DEMO</span>
            </div>
            <p className="mb-1 font-medium">Demo result ready</p>
            <p className="mb-4 text-xs text-[#858094]">Real AI generation isn't connected yet. This was added to My Creations as a demo.</p>
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
        <p className="text-lg text-[#b8b4c7]">Template not found. Please choose another from Explore.</p>
        <Link to="/explore" className="grad-bg mt-5 inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-semibold text-[#0b0a12] transition-opacity hover:opacity-90">Browse Explore</Link>
      </div>
    )
  }
  return <Generator key={asset.id} asset={asset} />
}
