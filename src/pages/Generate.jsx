import { saveOriginal } from '../lib/localPhotos.js'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { findAsset } from '../data/templates.js'
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

const kb = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
const Svg = ({ d, className = 'size-4' }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>

/** One photo slot: a drop zone (drag a file, or browse / use the camera), then the chosen photo with Replace / Remove. */
function Slot({ kind, photo, onPick, onClear, error }) {
  const input = useRef()
  const cam = useRef()
  const [drag, setDrag] = useState(false)
  const choose = (f) => f && onPick(f)
  return (
    <div className="relative aspect-[9/16] w-full">
      <input ref={input} type="file" hidden accept="image/*,.heic,.HEIC,.heif,.HEIF" onChange={(e) => { choose(e.target.files[0]); e.target.value = '' }} />
      <input ref={cam} type="file" hidden accept="image/*" capture="user" onChange={(e) => { choose(e.target.files[0]); e.target.value = '' }} />
      {photo ? (
        <div className="absolute inset-0 overflow-hidden rounded-md border border-[#2C2529] bg-[#0A0809]">
          <img src={photo.url} alt={`Your ${kind === 'Photo' ? 'photo' : kind}`} className="size-full object-cover" />
          <button type="button" aria-label="Remove photo" onClick={onClear} className="absolute right-2.5 top-2.5 grid size-9 cursor-pointer place-items-center rounded-md bg-[#0A0809]/85 text-[#FAFAFA] backdrop-blur transition-colors hover:bg-[#0A0809]"><Svg d="M6 6l12 12M18 6L6 18" /></button>
          <button type="button" onClick={() => input.current.click()} className="absolute bottom-2.5 right-2.5 cursor-pointer rounded-md bg-[#0A0809]/85 px-3 py-2 text-[13px] font-medium text-[#FAFAFA] backdrop-blur transition-colors hover:bg-[#0A0809]">Replace</button>
        </div>
      ) : (
        <div role="button" tabIndex={0} onClick={() => input.current.click()} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files[0]) }}
          className={`absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-4 max-sm:gap-2.5 rounded-md border-[1.5px] border-dashed px-2 sm:px-4 text-center transition-colors ${drag ? 'border-[#B653F6] bg-[#1D181B]' : 'border-[#2C2529] bg-[#0A0809] hover:border-[#B4B0C0] hover:bg-[#120E10]'}`}>
          <span className="grid size-16 place-items-center rounded-full max-sm:size-10 border border-[#2C2529] bg-[#141011] text-[#B653F6]"><Svg d="M12 16V5M7 10l5-5 5 5M4 19h16" className="size-7" /></span>
          <span className="flex flex-col gap-1"><span className="text-[17px] font-semibold text-[#FAFAFA] max-sm:text-[14px]">{kind === 'Photo' ? 'Drop your photo here' : `Add ${kind}`}</span><span className="text-[13px] text-[#B4B0C0] max-sm:hidden">or choose one from your device</span></span>
          <span className="flex w-full flex-wrap justify-center gap-2 max-sm:flex-col max-sm:px-1">
            <button type="button" onClick={(e) => { e.stopPropagation(); input.current.click() }} className="btn-grad !px-5 !py-2.5 !text-[14px] max-sm:!w-full max-sm:!px-2 max-sm:!py-2 max-sm:!text-[13px] max-sm:!whitespace-nowrap">Browse files</button>
            <button type="button" onClick={(e) => { e.stopPropagation(); cam.current.click() }} className="btn-dark hidden !px-4 !py-2.5 !text-[14px] max-sm:!w-full max-sm:!px-2 max-sm:!py-2 max-sm:!text-[13px] [@media(pointer:coarse)]:inline-flex">Camera</button>
          </span>
          <span className="font-plexmono text-[10px] uppercase tracking-[0.12em] text-[#B4B0C0] max-sm:hidden">JPG · PNG · HEIC</span>
        </div>
      )}
      {error && <p role="alert" className="absolute inset-x-2 bottom-2 z-10 rounded border-l-[3px] border-[#D98282] bg-[#241518] px-2.5 py-2 text-[12px] leading-snug text-[#FAFAFA]">{error}</p>}
    </div>
  )
}

/** Before / after: the original on the left half, the result on the right, one range input drags the divider (mouse, touch and keyboard). */
function Compare({ before, after, alt }) {
  const [pos, setPos] = useState(50)
  return (
    <div className="relative mx-auto aspect-[3/3.7] w-full max-w-[640px] touch-none select-none overflow-hidden rounded-md border border-[#2C2529] bg-[#141011]">
      <img src={after} alt={alt} className="absolute inset-0 size-full object-cover" draggable="false" />
      {before && <img src={before} alt="Your original photo" className="absolute inset-0 size-full object-cover" draggable="false" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />}
      {before && (
        <>
          <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[#FAFAFA]" style={{ left: `${pos}%` }} />
          <div className="pointer-events-none absolute top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#FAFAFA] text-[#0A0809]" style={{ left: `${pos}%` }}><Svg d="M9 7l-5 5 5 5M15 7l5 5-5 5" className="size-[22px]" /></div>
          <span className="absolute left-3.5 top-3.5 rounded bg-[#0A0809]/85 px-2.5 py-1.5 font-plexmono text-[11px] tracking-[0.1em]">ORIGINAL</span>
          <span className="absolute right-3.5 top-3.5 rounded bg-[#0A0809]/85 px-2.5 py-1.5 font-plexmono text-[11px] tracking-[0.1em]">RESULT</span>
          <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Compare your original with the result" className="absolute inset-0 size-full cursor-ew-resize opacity-0" />
        </>
      )}
    </div>
  )
}

const Step = ({ n, state, title, sub }) => (
  <li className={`flex items-center gap-3.5 px-4 py-3.5 sm:px-5 ${state === 'now' ? 'bg-[#1D181B]' : ''}`}>
    <span className={`grid size-7 shrink-0 place-items-center rounded-full font-plexmono text-[13px] ${state === 'done' ? 'bg-[#B653F6] text-white' : state === 'now' ? 'border-2 border-[#B653F6] text-[#B653F6]' : 'border border-[#2C2529] text-[#B4B0C0]'}`}>
      {state === 'done' ? <Svg d="M5 12l5 5 9-10" className="size-4" /> : n}
    </span>
    <span className="min-w-0"><span className="block text-[15px] font-semibold leading-tight">{title}</span><span className="block truncate text-[13px] text-[#B4B0C0]">{sub}</span></span>
  </li>
)

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
  const ctaLabel = signedIn ? `Generate${real ? ` · ${cost} coins` : ''}` : 'Continue to generate'
  const collectionLink = /^hairstyle-/.test(asset.categoryId) ? `/explore?category=${asset.categoryId}` : `/explore?category=${asset.categoryId}`
  const stepState = (n) => (n === 1 ? 'done' : n === 2 ? (ready ? 'done' : 'now') : ready ? 'now' : 'todo')

  // ---------- result ----------
  if (phase === 'done') {
    const after = real ? result : asset.image
    const before = photos[0]?.url || resultOriginal
    return (
      <div className="mx-auto w-full max-w-none px-5 pb-10 pt-6 text-[#FAFAFA] sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14">
          <section aria-label="Before and after" className="flex flex-col gap-3">
            <Compare before={before} after={after} alt={`${asset.name} result`} />
            {before && <p className="mx-auto text-[13px] text-[#B4B0C0]">Drag the handle to compare.</p>}
          </section>
          <aside aria-label="Your result" className="flex flex-col gap-6 lg:pt-2">
            <div role="status" className="flex items-center gap-2.5 rounded border-l-[3px] border-[#B653F6] bg-[#1A1520] px-3.5 py-3 text-[14px]"><Svg d="M5 12l5 5 9-10" className="size-[18px] text-[#B653F6]" />{real ? 'Saved to My Creations' : 'Demo preview · nothing was saved or charged'}</div>
            <div className="flex flex-col gap-2.5">
              <h1 className="text-[52px] leading-[0.98] sm:text-[60px]">Here it <span className="grad-text">is.</span></h1>
              <p className="text-[16px] leading-relaxed text-[#B4B0C0]">Your photo in the {asset.name} look.</p>
            </div>
            <div className="flex flex-col gap-2.5">
              {real && resultId && <button type="button" onClick={download} disabled={saving} className="btn-grad !py-3.5 !text-[16px]"><Svg d="M12 4v11M7 11l5 5 5-5M5 20h14" className="size-5" />{saving ? 'Downloading…' : 'Download'}</button>}
              {saveError && <p role="alert" className="rounded border-l-[3px] border-[#D98282] bg-[#241518] px-3 py-2.5 text-[13px]">{saveError}</p>}
              <button type="button" onClick={again} className="btn-dark !py-3">Make another with this look</button>
              <Link to="/explore" className="btn-dark !py-3">Try a different look</Link>
            </div>
            <dl className="rounded-md border border-[#2C2529] bg-[#141011] text-[14px]">
              <div className="flex justify-between border-b border-[#2C2529] px-4 py-3"><dt className="text-[#B4B0C0]">Look</dt><dd>{asset.name}</dd></div>
              {real && <div className="flex justify-between border-b border-[#2C2529] px-4 py-3"><dt className="text-[#B4B0C0]">Coins used</dt><dd className="font-plexmono">{cost}</dd></div>}
              {real && <div className="flex justify-between px-4 py-3"><dt className="text-[#B4B0C0]">Left in wallet</dt><dd className="font-plexmono">{coins.toLocaleString()} coins</dd></div>}
            </dl>
            <Link to="/creations" className="text-[14px] text-[#B653F6] underline underline-offset-4">Open in My Creations</Link>
          </aside>
        </div>
      </div>
    )
  }

  // ---------- workspace ----------
  return (
    <div className="mx-auto w-full max-w-none px-5 pb-10 pt-5 text-[#FAFAFA] sm:px-8 lg:px-10">
      <div className="mb-6 flex items-center gap-3.5">
        <button type="button" aria-label="Back" onClick={() => nav(-1)} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-md border border-[#2C2529] bg-[#1D181B] text-[#FAFAFA] transition-colors hover:border-[#B4B0C0]"><Svg d="M15 6l-6 6 6 6" className="size-[18px]" /></button>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2.5 text-[14px] text-[#B4B0C0]">
          <Link to="/explore" className="hover:text-[#FAFAFA]">Looks</Link><span aria-hidden="true">/</span>
          <Link to={collectionLink} className="truncate hover:text-[#FAFAFA] max-sm:hidden">{asset.category}</Link><span aria-hidden="true" className="max-sm:hidden">/</span>
          <span className="truncate text-[#FAFAFA]">{asset.name}</span>
        </nav>
      </div>

      <ol aria-label="Steps" className="mb-8 grid grid-cols-1 divide-y divide-[#2C2529] overflow-hidden rounded-md border border-[#2C2529] bg-[#141011] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Step n={1} state={stepState(1)} title="Look" sub={asset.name} />
        <Step n={2} state={stepState(2)} title={multi ? 'Your photos' : 'Your photo'} sub={ready ? photos.map((p) => p.name).join(', ') : 'Add a clear photo'} />
        <Step n={3} state={stepState(3)} title="Generate" sub={ready ? 'Review and create' : 'Finish step 2 first'} />
      </ol>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10">
        <section aria-label="Look and photo" style={{ '--tile': 'clamp(200px, calc((100dvh - 410px) * 0.5625), 460px)' }} className={`grid items-start gap-3 rounded-md border border-[#2C2529] bg-gradient-to-b from-[#141011] to-[#0A0809] p-4 sm:gap-4 sm:p-6 lg:p-8 ${multi ? 'grid-cols-1 sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,2fr)]' : 'grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] lg:grid-cols-[var(--tile)_56px_var(--tile)] lg:justify-center lg:gap-6'}`}>
          <figure className="flex flex-col gap-2.5">
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-md border border-[#2C2529] bg-[#0A0809]">
              <PImage src={asset.image} alt={`The look: ${asset.name}`} className="absolute inset-0 size-full object-cover" draggable="false" />
            </div>
            <figcaption className="flex items-center justify-between gap-2 max-sm:flex-col max-sm:items-center max-sm:gap-2.5"><span className="whitespace-nowrap font-plexmono text-[11px] tracking-[0.1em] text-[#B4B0C0]">THE LOOK</span><Link to={collectionLink} replace className="btn-dark !px-4 !py-1.5 !text-[13px] max-sm:!w-full max-sm:!px-2 max-sm:!whitespace-nowrap">Change look</Link></figcaption>
          </figure>
          <Svg d="M5 12h14M13 6l6 6-6 6" className={`mx-auto size-6 self-center text-[#B4B0C0] sm:size-7 ${multi ? 'max-sm:rotate-90' : 'lg:size-9'}`} />
          <figure className="flex flex-col gap-2.5">
            <div className={`grid gap-2.5 ${multi ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {slots.map((k, i) => <Slot key={k} kind={k} photo={photos[i]} error={errors[i]} onPick={pick(i)} onClear={clear(i)} />)}
            </div>
            <figcaption className="flex items-center justify-between gap-2 max-sm:flex-col max-sm:items-center max-sm:gap-2.5"><span className="whitespace-nowrap font-plexmono text-[11px] tracking-[0.1em] text-[#B4B0C0]">{multi ? 'YOUR PHOTOS' : 'YOUR PHOTO'}</span>{photos[0] && <span className="truncate text-[12px] text-[#B4B0C0]">{photos[0].name}{photos[0].file ? ` · ${kb(photos[0].file.size)}` : ''}</span>}</figcaption>
          </figure>
        </section>

        <aside aria-label="Review" className="flex flex-col gap-5 rounded-md border border-[#2C2529] bg-[#141011] p-6 sm:p-7 lg:sticky lg:top-24">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[36px] leading-[1.02] sm:text-[40px]">{ready ? 'Ready when you are' : 'Add your photo'}</h2>
            <p className="text-[14px] leading-relaxed text-[#B4B0C0]">{ready ? 'One image is created from your photo in this look. It usually takes under a minute.' : multi ? `This look needs ${slots.length} clear photos. Add each one to continue.` : 'Use a clear, well-lit, front-facing photo for the best result.'}</p>
          </div>
          {real ? (
            <dl className="rounded-md border border-[#2C2529] text-[14px]">
              <div className="flex justify-between border-b border-[#2C2529] px-4 py-3"><dt className="text-[#B4B0C0]">Cost</dt><dd className="font-plexmono">{cost} coins</dd></div>
              {signedIn && <div className="flex justify-between border-b border-[#2C2529] px-4 py-3"><dt className="text-[#B4B0C0]">Balance now</dt><dd className="font-plexmono">{coins.toLocaleString()} coins</dd></div>}
              {signedIn && <div className="flex justify-between px-4 py-3"><dt className="text-[#B4B0C0]">Balance after</dt><dd className={`font-plexmono ${coins < cost ? 'text-[#D98282]' : ''}`}>{Math.max(0, coins - cost).toLocaleString()} coins</dd></div>}
              {!signedIn && <div className="flex justify-between px-4 py-3"><dt className="text-[#B4B0C0]">Account</dt><dd>Sign in on generate</dd></div>}
            </dl>
          ) : <p className="rounded-md border border-[#2C2529] px-4 py-3 text-[14px] text-[#B4B0C0]">Demo preview · no coins are used.</p>}
          {signedIn && real && coins < cost && (
            <p role="alert" className="rounded border-l-[3px] border-[#D98282] bg-[#241518] px-3 py-2.5 text-[13px] leading-snug">You need {cost} coins and have {coins.toLocaleString()}. <Link to={coins < 150 ? '/pricing' : '/coins'} className="text-[#B653F6] underline underline-offset-2">Get coins</Link></p>
          )}
          <button type="button" disabled={!ready} onClick={next} className="btn-grad !py-4 !text-[17px]">{ctaLabel}</button>
          <ul className="flex flex-col gap-2.5 text-[13px] text-[#B4B0C0]">
            {(real ? ['Coins are returned automatically if it fails.', 'The result is saved to My Creations.', 'Most looks accept JPG, PNG or WebP up to 10 MB.'] : ['This look is a preview only.']).map((t) => (
              <li key={t} className="flex items-center gap-2.5"><span className="size-1.5 shrink-0 rounded-full bg-[#B653F6]" />{t}</li>
            ))}
          </ul>
        </aside>
      </div>

      {phase === 'loading' && (
        <div role="status" className="fixed inset-0 z-[300] grid place-items-center bg-[#0A0809]/92 p-6 backdrop-blur-sm">
          <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
            <p className="font-serif text-[40px] leading-none">Creating your look</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#2C2529]"><div className="h-full w-1/3 animate-shimmer rounded-full bg-[linear-gradient(90deg,#705CFF_0%,#FC48E7_100%)]" /></div>
            <p className="text-[14px] text-[#B4B0C0]">Keep this tab open. {real ? 'It can take up to a minute.' : ''}</p>
            {real && <p className="text-[13px] text-[#B4B0C0]">{cost} coins are returned if this fails.</p>}
          </div>
        </div>
      )}
      {phase === 'error' && (
        <div className="fixed inset-0 z-[300] grid place-items-center overflow-y-auto bg-[#0A0809]/85 p-4 backdrop-blur-sm" onClick={() => setPhase('idle')}>
          <div role="alert" className="flex w-full max-w-sm flex-col gap-4 rounded-md border border-[#2C2529] bg-[#141011] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="rounded border-l-[3px] border-[#D98282] bg-[#241518] px-4 py-3.5"><p className="text-[17px] font-semibold">Generation failed</p><p className="mt-1.5 text-[14px] leading-relaxed text-[#B4B0C0]">{apiError || 'Something went wrong. Please try again.'}</p></div>
            <div className="flex flex-col gap-2.5">
              {needCoins && <button type="button" className="btn-grad" onClick={() => nav(coins < 150 ? '/pricing' : '/coins')}>Get coins</button>}
              <button type="button" className={needCoins ? 'btn-dark' : 'btn-grad'} onClick={() => setPhase('idle')}>{needCoins ? 'Close' : 'Try again'}</button>
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
        <p className="font-serif text-[32px]">Look not found</p>
        <p className="mt-2 text-[15px] text-[#B4B0C0]">Please choose another from Looks.</p>
        <Link to="/explore" className="btn-grad mt-6 !px-6 !py-3">Browse looks</Link>
      </div>
    )
  }
  return <Generator key={asset.id} asset={asset} />
}
