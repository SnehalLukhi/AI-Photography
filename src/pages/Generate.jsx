import { saveOriginal } from '../lib/localPhotos.js'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { findAsset, siblingsOf, generateUrl } from '../data/templates.js'
import PImage from '../components/PImage.jsx'
import { useStudio } from '../context/StudioContext.jsx'
import { promptFor, inspectUpload, generatePhoto, getPlans, downloadGeneration } from '../lib/aiPhotography.js'

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

/** Looks backed by the AI services: checks the real image format (JPG / PNG / WebP) and the size limit before accepting the photo. */
async function readRealPhoto(file, kind) {
  const { file: checked, error } = await inspectUpload(file, kind)
  if (error) throw new Error(error)
  const url = URL.createObjectURL(checked)
  await new Promise((res, rej) => { const i = new Image(); i.onload = res; i.onerror = () => rej(new Error(BAD_FILE)); i.src = url }).catch((e) => { URL.revokeObjectURL(url); throw e })
  return { url, name: checked.name, file: checked }
}

const Svg = ({ d, className = 'size-4' }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>

/** One photo slot: a tile the size of the look - drop / browse a file, then the chosen photo with Replace / Remove. Same validation as before (onPick). */
function PhotoTile({ kind, photo, onPick, onClear, error }) {
  const input = useRef()
  const [drag, setDrag] = useState(false)
  const choose = (f) => f && onPick(f)
  const what = kind === 'Photo' ? 'photo' : kind
  return (
    <figure className="flex min-w-0 flex-1 flex-col items-center gap-2.5 lg:flex-none">
      <input ref={input} type="file" hidden accept="image/*,.heic,.HEIC,.heif,.HEIF" onChange={(e) => { choose(e.target.files[0]); e.target.value = '' }} />
      <div className="relative aspect-[9/16] w-full sm:max-w-[240px] lg:h-[clamp(260px,calc(100dvh-340px),640px)] lg:w-auto lg:max-w-none">
        {photo ? (
          <div className="absolute inset-0 overflow-hidden rounded-2xl border border-[#272033] bg-[#12101B] shadow-[0_24px_60px_-28px_rgba(139,92,246,0.45)]">
            <img src={photo.url} alt={`Your ${what}`} className="size-full object-cover" />
            <button type="button" aria-label="Remove photo" onClick={onClear} className="absolute right-2.5 top-2.5 grid size-9 cursor-pointer place-items-center rounded-full bg-[#08080D]/80 text-white backdrop-blur transition-colors hover:bg-[#1A1626]"><Svg d="M6 6l12 12M18 6L6 18" /></button>
          </div>
        ) : (
          <div role="button" tabIndex={0} onClick={() => input.current.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files[0]) }}
            className={`absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-3 text-center transition-colors ${drag ? 'border-[#8B5CF6] bg-[#1B1530]' : 'border-[#3A2F52] bg-[#12101B] hover:border-[#8B5CF6] hover:bg-[#1B1530]'}`}>
            <span className="grid size-12 place-items-center rounded-full bg-[#1A1626] text-[#A78BFA] max-sm:size-10"><Svg d="M12 16V5M7 10l5-5 5 5M4 19h16" className="size-6" /></span>
            <span className="text-[15px] font-semibold max-sm:text-[13px]">{kind === 'Photo' ? 'Add your photo' : `Add ${kind}`}</span>
            <span className="text-[12px] text-[#A1A1AA] max-sm:hidden">Drop it here or click to browse</span>
            <span className="text-[10px] uppercase tracking-[0.12em] text-[#71717A] max-sm:hidden">JPG · PNG · HEIC</span>
          </div>
        )}
        {error && <p role="alert" className="absolute inset-x-2 bottom-2 z-10 rounded-lg border-l-[3px] border-[#E5484D] bg-[#2A1216] px-2.5 py-2 text-[12px] leading-snug text-[#FFD9DC]">{error}</p>}
      </div>
      <figcaption className="flex items-center gap-2 text-[14px] max-sm:flex-col max-sm:gap-0.5 max-sm:text-center">
        <span className="font-semibold text-white">{photo ? `Your ${what}` : kind === 'Photo' ? 'Your photo' : kind}</span>
        <span aria-hidden="true" className="text-[#52525B] max-sm:hidden">·</span>
        <button type="button" onClick={() => input.current.click()} className="cursor-pointer font-medium text-[#A78BFA] transition-colors hover:text-white">{photo ? 'Replace' : 'Browse'}</button>
      </figcaption>
    </figure>
  )
}

/** Before / after: the original on the left half, the result on the right, one range input drags the divider (mouse, touch and keyboard). */
function Compare({ before, after, alt }) {
  const [pos, setPos] = useState(50)
  return (
    <div className="relative mx-auto aspect-[3/3.7] w-full max-w-[640px] touch-none select-none overflow-hidden rounded-3xl border border-[#272033] bg-[#12101B] shadow-[0_30px_70px_-30px_rgba(139,92,246,0.4)]">
      <img src={after} alt={alt} className="absolute inset-0 size-full object-cover" draggable="false" />
      {before && <img src={before} alt="Your original photo" className="absolute inset-0 size-full object-cover" draggable="false" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />}
      {before && (
        <>
          <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[#12101B]" style={{ left: `${pos}%` }} />
          <div className="pointer-events-none absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#12101B] text-[#FFFFFF] shadow-lg" style={{ left: `${pos}%` }}><Svg d="M9 7l-5 5 5 5M15 7l5 5-5 5" className="size-[22px]" /></div>
          <span className="absolute left-3.5 top-3.5 rounded-full bg-[#08080D]/80 px-2.5 py-1.5 font-plexmono text-[11px] tracking-[0.1em] text-white">ORIGINAL</span>
          <span className="absolute right-3.5 top-3.5 rounded-full bg-[#08080D]/80 px-2.5 py-1.5 font-plexmono text-[11px] tracking-[0.1em] text-white">RESULT</span>
          <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Compare your original with the result" className="absolute inset-0 size-full cursor-ew-resize opacity-0" />
        </>
      )}
    </div>
  )
}

function Generator({ asset }) {
  const nav = useNavigate()
  const { signedIn, addCreation, signOut, coins, refreshUser, openLogin } = useStudio()
  const [cost, setCost] = useState(150) // coins per generation (from the backend)
  useEffect(() => { getPlans().then((r) => setCost(r.costPerGeneration)).catch(() => {}) }, [])
  const slots = asset.slots
  const [photos, setPhotos] = useState(() => slots.map(() => null))
  const [errors, setErrors] = useState(() => slots.map(() => ''))
  const [phase, setPhase] = useState('idle') // idle | loading | done | error
  const [result, setResult] = useState('') // real generated image URL (templates with a JSON catalogue only)
  const [resultOriginal, setResultOriginal] = useState('') // the stored copy of the uploaded photo (the local preview is used first)
  const [resultId, setResultId] = useState('') // the stored generation (for the download)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [apiError, setApiError] = useState('')
  const [needCoins, setNeedCoins] = useState(false) // the last failure was 'not enough coins'
  const timer = useRef()
  const abort = useRef()
  const info = promptFor(asset)
  const real = !!info // templates backed by an AI service use the AILabTools API; every other template keeps the demo flow
  useEffect(() => () => { clearTimeout(timer.current); abort.current?.abort() }, [])

  const multi = slots.length > 1
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
    setApiError(''); setNeedCoins(false); setResult(''); setSaveError(''); setPhase('loading')
    abort.current?.abort()
    const ctrl = new AbortController(); abort.current = ctrl
    try {
      const { url, original, generationId } = await generatePhoto({ file, title: prompt.title, desc: prompt.desc, cartoonType: prompt.cartoonType, beardTemplate: prompt.beardTemplate, hairTemplate: prompt.hairTemplate, hairColor: prompt.hairColor, name: asset.name, signal: ctrl.signal })
      saveOriginal(generationId, file) // the original photo stays in this browser (the server keeps only the AI image)
      addCreation({ type: asset.type, name: asset.name, image: url, original, generationId })
      refreshUser() // new coin balance
      setResult(url); setResultOriginal(original); setResultId(generationId || ''); setPhase('done')
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
    if (prompt?.error) { setApiError(prompt.error); setPhase('error'); return } // a look with no usable data: stop, never fall back to the demo flow
    if (prompt) { generateReal(prompt); return }
    setPhase('loading')
    timer.current = setTimeout(() => { // demo only - no real generation, so nothing is added to My Creations
      setPhase('done')
    }, 2500)
  }
  const download = async () => {
    setSaving(true); setSaveError('')
    try { await downloadGeneration(resultId) } catch (e) { setSaveError(e.message || 'Could not download the image. Please try again.') }
    setSaving(false)
  }
  const again = () => { setPhotos(slots.map(() => null)); setErrors(slots.map(() => '')); setPhase('idle') }
  const collectionLink = /^hairstyle-/.test(asset.categoryId) ? `/explore?category=${asset.categoryId}` : `/explore?category=${asset.categoryId}`
  const looks = siblingsOf(asset).filter((t) => t.image).slice(0, 40) // the other looks of this collection (strip on the left; picking one opens that look's page)

  // ---------- result ----------
  if (phase === 'done') {
    const after = real ? result : asset.image
    const before = photos[0]?.url || resultOriginal
    return (
      <div className="mx-auto w-full max-w-none px-5 pb-10 pt-6 text-[#FFFFFF] sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14">
          <section aria-label="Before and after" className="flex flex-col gap-3 rounded-3xl bg-[#12101B] p-4 sm:p-8">
            <Compare before={before} after={after} alt={`${asset.name} result`} />
            {before && <p className="mx-auto text-[13px] text-[#A1A1AA]">Drag the handle to compare.</p>}
          </section>
          <aside aria-label="Your result" className="flex flex-col gap-6 lg:pt-2">
            <div role="status" className="flex items-center gap-2.5 rounded-full border border-[#3A2F52] bg-[#1B1530] px-4 py-3 text-[14px] font-medium"><Svg d="M5 12l5 5 9-10" className="size-[18px] text-[#8B5CF6]" />{real ? 'Saved to My Creations' : 'Demo preview · nothing was saved or charged'}</div>
            <div className="flex flex-col gap-2.5">
              <h1 className="text-[52px] leading-[0.98] sm:text-[60px]">Here it <span className="grad-text">is.</span></h1>
              <p className="text-[16px] leading-relaxed text-[#A1A1AA]">Your photo in the {asset.name} look.</p>
            </div>
            <div className="flex flex-col gap-2.5">
              {real && resultId && <button type="button" onClick={download} disabled={saving} className="btn-primary !py-3.5 !text-[16px]"><Svg d="M12 4v11M7 11l5 5 5-5M5 20h14" className="size-5" />{saving ? 'Downloading…' : 'Download'}</button>}
              {saveError && <p role="alert" className="rounded-lg border-l-[3px] border-[#E5484D] bg-[#2A1216] px-3 py-2.5 text-[13px] text-[#FFD9DC]">{saveError}</p>}
              <button type="button" onClick={again} className="btn-dark !py-3">Make another with this look</button>
              <Link to="/explore" className="btn-dark !py-3">Try a different look</Link>
            </div>
            <dl className="overflow-hidden rounded-2xl border border-[#272033] bg-[#12101B] text-[14px]">
              <div className="flex justify-between border-b border-[#272033] px-4 py-3"><dt className="text-[#A1A1AA]">Look</dt><dd>{asset.name}</dd></div>
              {real && <div className="flex justify-between border-b border-[#272033] px-4 py-3"><dt className="text-[#A1A1AA]">Coins used</dt><dd className="font-plexmono">{cost}</dd></div>}
              {real && <div className="flex justify-between px-4 py-3"><dt className="text-[#A1A1AA]">Left in wallet</dt><dd className="font-plexmono">{coins.toLocaleString()} coins</dd></div>}
            </dl>
            <Link to="/creations" className="text-[14px] font-medium text-[#8B5CF6] underline underline-offset-4">Open in My Creations</Link>
          </aside>
        </div>
      </div>
    )
  }

  // ---------- workspace: a studio view - other looks on the left, the look large in the middle, a prompt-style bar at the bottom ----------
  const blocked = signedIn && real && coins < cost
  return (
    <div className="relative isolate flex min-h-[calc(100dvh-60px)] flex-col overflow-hidden text-[#FFFFFF] md:min-h-[calc(100dvh-68px)]">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#08080D]" aria-hidden="true">
        <div className="absolute -left-[10%] top-[8%] h-[55%] w-[40%] rounded-full bg-[#2B2A6B]/45 blur-[110px]" />
        <div className="absolute -right-[8%] top-[4%] h-[50%] w-[38%] rounded-full bg-[#7C3AED]/30 blur-[120px]" />
        <div className="absolute bottom-[-12%] left-[28%] h-[45%] w-[45%] rounded-full bg-[#C026D3]/20 blur-[130px]" />
        <div className="absolute bottom-[10%] right-[8%] h-[35%] w-[28%] rounded-full bg-[#3F3A55]/40 blur-[110px]" />
        <div className="absolute left-[2%] bottom-[2%] h-[32%] w-[26%] rounded-full bg-[#1F3D4A]/35 blur-[110px]" />
      </div>

      <button type="button" aria-label="Close" onClick={() => nav(-1)} className="absolute right-3 top-3 z-20 grid size-10 cursor-pointer place-items-center rounded-lg bg-[#1A1626]/80 text-[#C4C4CC] backdrop-blur transition-colors hover:bg-[#272033] hover:text-white sm:right-5 sm:top-5"><Svg d="M6 6l12 12M18 6L6 18" className="size-[18px]" /></button>

      <div className="flex flex-1 flex-col lg:flex-row">
        <nav aria-label={`More ${asset.category} looks`} className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-4 pb-3 pt-2 max-lg:order-last lg:max-h-[calc(100dvh-68px)] lg:w-[88px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:px-3 lg:py-4">
          {looks.map((t) => (
            <Link key={t.id} to={generateUrl(t)} replace aria-label={t.name} aria-current={t.id === asset.id ? 'true' : undefined} title={t.name}
              className={`relative block h-[68px] w-[52px] shrink-0 overflow-hidden rounded-lg border-2 transition-all lg:h-[72px] lg:w-full ${t.id === asset.id ? 'border-[#8B5CF6] shadow-[0_0_0_2px_rgba(139,92,246,0.25)]' : 'border-transparent opacity-80 hover:opacity-100'}`}>
              <PImage src={t.image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" draggable="false" />
            </Link>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col items-center px-3 pb-3 pt-14 sm:px-8 sm:pb-4 lg:pb-6 lg:pt-6">
          <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 sm:gap-6">
            <div className="flex w-full items-start justify-center gap-2 sm:gap-4 lg:items-center lg:gap-6">
              <figure className="flex min-w-0 flex-1 flex-col items-center gap-2.5 lg:flex-none">
                <div className="relative aspect-[9/16] w-full sm:max-w-[240px] overflow-hidden rounded-2xl border border-[#272033] bg-[#12101B] lg:h-[clamp(260px,calc(100dvh-340px),640px)] lg:w-auto lg:max-w-none">
                  <PImage src={asset.image} alt={`The look: ${asset.name}`} className="absolute inset-0 size-full object-cover" draggable="false" />
                </div>
                <figcaption className="flex max-w-full items-center gap-2 text-[14px] max-sm:flex-col max-sm:gap-0.5 max-sm:text-center">
                  <span className="font-semibold text-white sm:truncate">{asset.name}</span>
                  <span aria-hidden="true" className="text-[#52525B] max-sm:hidden">·</span>
                  <Link to={collectionLink} replace className="shrink-0 font-medium text-[#A78BFA] transition-colors hover:text-white">Change look</Link>
                </figcaption>
              </figure>
              <Svg d="M5 12h14M13 6l6 6-6 6" className="size-6 shrink-0 self-center text-[#A1A1AA] max-sm:hidden lg:size-8" />
              <div className="flex min-w-0 flex-1 justify-center gap-2.5 lg:flex-none">
                {slots.map((k, i) => <PhotoTile key={k} kind={k} photo={photos[i]} error={errors[i]} onPick={pick(i)} onClear={clear(i)} />)}
              </div>
            </div>

            <button type="button" disabled={!ready} onClick={next} className="btn-grad w-full max-w-[360px] !gap-3 !py-3.5 !text-[16px] shadow-[0_12px_32px_-12px_rgba(252,72,231,0.6)] disabled:!bg-[#1D1830] disabled:!bg-none disabled:text-[#8B8B96] disabled:opacity-100 disabled:shadow-none">
              {signedIn ? 'Generate' : 'Continue to generate'}
              {real && <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 py-0.5 pl-1.5 pr-2.5 text-[13px] font-semibold"><img src="/images/features/coin.svg" alt="" className="size-4 object-contain" />{cost}</span>}
            </button>
          </div>
        </div>
      </div>

      {phase === 'loading' && (
        <div role="status" className="fixed inset-0 z-[300] grid place-items-center bg-[#12101B]/90 p-6 backdrop-blur-md">
          <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
            <p className="font-display text-[40px] font-bold leading-none text-[#FFFFFF]">Creating your look</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1A1626]"><div className="h-full w-1/3 animate-shimmer rounded-full bg-[linear-gradient(90deg,#7C3AED_0%,#C026D3_100%)]" /></div>
            <p className="text-[14px] text-[#A1A1AA]">Keep this tab open. {real ? 'It can take up to a minute.' : ''}</p>
            {real && <p className="text-[13px] text-[#A1A1AA]">{cost} coins are returned if this fails.</p>}
          </div>
        </div>
      )}
      {phase === 'error' && (
        <div className="fixed inset-0 z-[300] grid place-items-center overflow-y-auto bg-[#08080D]/40 p-4 backdrop-blur-sm" onClick={() => setPhase('idle')}>
          <div role="alert" className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-[#272033] bg-[#12101B] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl border border-[#E5484D]/40 bg-[#2A1216] px-4 py-3.5"><p className="text-[17px] font-semibold">Generation failed</p><p className="mt-1.5 text-[14px] leading-relaxed text-[#A1A1AA]">{apiError || 'Something went wrong. Please try again.'}</p></div>
            <div className="flex flex-col gap-2.5">
              {needCoins && <button type="button" className="btn-grad" onClick={() => nav(coins < 150 ? '/pricing' : '/coins')}>Get coins</button>}
              <button type="button" className={needCoins ? 'btn-dark' : 'btn-primary'} onClick={() => setPhase('idle')}>{needCoins ? 'Close' : 'Try again'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
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
      <div className="px-5 pt-24 text-center">
        <p className="font-display text-[32px] font-bold text-[#FFFFFF]">Look not found</p>
        <p className="mt-2 text-[15px] text-[#A1A1AA]">Please choose another from Looks.</p>
        <Link to="/explore" className="btn-primary mt-6 !px-6 !py-3">Browse looks</Link>
      </div>
    )
  }
  return <Generator key={asset.id} asset={asset} />
}
