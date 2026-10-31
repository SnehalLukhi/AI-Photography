import { useEffect, useMemo, useRef, useState } from 'react'
import { useLoad } from '../../../core/hooks.js'
import { Badge, ErrorNote, Field, PageHeader, Spinner, Toggle, cx } from '../../../core/ui.jsx'
import { Icon } from '../../../core/icons.jsx'
import { useConsole } from '../../../core/store.jsx'

/**
 * Video lab: try Picsart's video models with your own picture and text, one model or several side by side. Nothing here is saved in the app: it calls the
 * backend's /api/admin/video/* (which holds the PICSART_API_KEY) and polls each job until it is COMPLETED or FAILED. Input names differ per model, so the common
 * ones have fields, and "Extra inputs" / "Per-model overrides" take any other field from the model's page on picsart.com/api-platform/models.
 */
const PRESETS = ['kling-motion-control', 'pixverse-c1-image', 'kling-v3', 'kling-v4', 'seedance-2.5', 'minimax-h3', 'veo-3.1', 'hailuo-2.3-fast-pro', 'flux-3-max']
const DONE = ['COMPLETED', 'FAILED', 'ERROR']
const TONE = { SUBMITTING: 'gray', ACCEPTED: 'amber', IN_PROGRESS: 'amber', COMPLETED: 'green', FAILED: 'red', ERROR: 'red' }
const HISTORY = 'console.videoLab'
const readHistory = () => { try { return JSON.parse(localStorage.getItem(HISTORY) || '[]') } catch { return [] } }
const POLL_MS = 4000
const GIVE_UP_MS = 15 * 60 * 1000

const MODES = [
  { id: 'text', label: 'Text → video', hint: 'Only a prompt, e.g. veo-3.1 with duration and aspectRatio.' },
  { id: 'image', label: 'Image → video', hint: 'Animate a still or guide the subject with reference pictures (imageUrls).' },
  { id: 'frames', label: 'Start / end frame', hint: 'Animate between two keyframes (startFrame, endFrame), e.g. kling-v3.' },
  { id: 'video', label: 'Video + picture', hint: 'Copy the motion of a reference video onto your picture, using Viggle. Only the picture and the video are needed.' },
]
const VIDEO_KEYS = ['videoUrl', 'video', 'referenceVideo', 'inputVideo', 'videoUrls']
const RES_KEY = { 'seedance-2.5': 'resolution' } // models with a known resolution input name (from Picsart's docs); add more as you confirm them
const billing =(r) => (r.raw?.response?.usage?.details || []).map((d) => d.toolId).filter(Boolean)

function UploadButton({ busy, off, onFile }) {
  const ref = useRef(null)
  return (
    <>
      <button type="button" className="btn-ghost !px-3 !py-2 !text-xs" disabled={busy || off} title={off ? 'Needs DigitalOcean Spaces' : ''} onClick={() => ref.current?.click()}>{busy ? <Spinner className="size-3.5" /> : <Icon name="upload" className="size-3.5" />}Upload a picture</button>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { onFile(e.target.files[0]); e.target.value = '' }} />
    </>
  )
}

const parseJson =(text, label) => {
  if (!text.trim()) return { value: {} }
  try { const v = JSON.parse(text); if (!v || typeof v !== 'object' || Array.isArray(v)) return { error: `${label} must be a JSON object.` }; return { value: v } } catch (e) { return { error: `${label}: ${e.message}` } }
}

export default function VideoLab({ api }) {
  const { toast } = useConsole()
  const cfg = useLoad(() => api.get('/api/admin/video/config'), [api])
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState('image') // text | image | frames
  const [videoUrl, setVideoUrl] = useState('') // "Video + picture" (Viggle): the reference video, a public address
  const [subject, setSubject] = useState('') // ... and the picture of the character, a public address
  const [startFrame, setStartFrame] = useState('')
  const [endFrame, setEndFrame] = useState('')
  const [resKey, setResKey] = useState('resolution') // the input name the resolution is sent under (differs per model)
  const [images, setImages] = useState('') // one address per line
  const [models, setModels] = useState(['pixverse-c1-image'])
  const [custom, setCustom] = useState('')
  const [duration, setDuration] = useState('')
  const [quality, setQuality] = useState('')
  const [aspect, setAspect] = useState('')
  const [audio, setAudio] = useState('default') // default | on | off
  const [extra, setExtra] = useState('')
  const [overrides, setOverrides] = useState('')
  const [uploading, setUploading] = useState(false)
  const [runs, setRuns] = useState([])
  const [history, setHistory] = useState(readHistory)
  const [now, setNow] = useState(Date.now())
  const timers = useRef(new Map())

  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])
  useEffect(() => { if (!runs.some((r) => !DONE.includes(r.status))) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [runs])

  const imageUrls = images.split('\n').map((s) => s.trim()).filter(Boolean)
  const extraP = parseJson(extra, 'Extra inputs')
  const overP = parseJson(overrides, 'Per-model overrides')
  const baseParams = useMemo(() => ({
    ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
    ...(mode === 'image' && imageUrls.length ? { imageUrls } : {}),
    ...(mode === 'frames' ? { ...(startFrame.trim() ? { startFrame: startFrame.trim() } : {}), ...(endFrame.trim() ? { endFrame: endFrame.trim() } : {}) } : {}),
    ...(duration ? { duration: Number(duration) } : {}), ...(quality ? { [resKey]: quality } : {}), ...(aspect ? { aspectRatio: aspect } : {}),
    ...(audio !== 'default' ? { generateAudio: audio === 'on' } : {}), ...(extraP.value || {}),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [prompt, images, mode, startFrame, endFrame, resKey, duration, quality, aspect, audio, extra])
  const paramsFor = (m) => {
    const p = { ...baseParams }
    const key = RES_KEY[m]
    if (quality && key && key !== resKey) { delete p[resKey]; p[key] = quality } // models whose resolution input name is known get it under that name
    return { ...p, ...(overP.value?.[m] || {}) }
  }
  const toggleModel = (m) => setModels((l) => (l.includes(m) ? l.filter((x) => x !== m) : [...l, m]))
  const addCustom = () => { const m = custom.trim(); if (!m) return; if (!models.includes(m)) setModels((l) => [...l, m]); setCustom('') }
  const viggle = mode === 'video' // "Video + picture" runs on Viggle, which takes only the picture and the video
  const problem = viggle ? (!subject.trim() ? 'Add your picture.' : !videoUrl.trim() ? 'Add the reference video address.' : '')
    : extraP.error || overP.error || (!models.length ? 'Pick at least one model.' : mode === 'text' && !prompt.trim() ? 'Write a prompt.' : mode === 'image' && !imageUrls.length ? 'Add at least one picture.' : mode === 'frames' && !startFrame.trim() ? 'Add the start frame (the end frame is optional).' : '')

  const update = (key, patch) => setRuns((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  const remember = (r) => setHistory((h) => { const n = [{ id: r.id, model: r.model, prompt: r.params?.prompt || '', status: r.status, url: r.url, at: r.startedAt }, ...h.filter((x) => x.id !== r.id)].slice(0, 30); try { localStorage.setItem(HISTORY, JSON.stringify(n)) } catch { /* private window */ } return n })

  function poll(key, id, model, params, startedAt) {
    let fails = 0
    const tick = async () => {
      try {
        const r = await api.get(`/api/admin/video/${model === 'viggle' ? 'viggle/' : ''}${encodeURIComponent(id)}/result`)
        update(key, { status: r.status, url: r.url, credits: r.credits, error: r.error, raw: r.raw })
        if (DONE.includes(r.status)) { timers.current.delete(key); remember({ id, model, params, status: r.status, url: r.url, startedAt }); return }
      } catch (e) {
        if (++fails >= 3) { update(key, { status: 'ERROR', error: e.message }); timers.current.delete(key); return }
      }
      if (Date.now() - startedAt > GIVE_UP_MS) { update(key, { status: 'ERROR', error: 'Stopped waiting after 15 minutes. Check the task id again later.' }); timers.current.delete(key); return }
      timers.current.set(key, setTimeout(tick, POLL_MS))
    }
    timers.current.set(key, setTimeout(tick, 1500))
  }

  async function runOne(model) {
    const params = paramsFor(model)
    const key = `${model}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const startedAt = Date.now()
    setRuns((rs) => [{ key, model, params, status: 'SUBMITTING', startedAt }, ...rs])
    try {
      const { id } = await api.post('/api/admin/video/submit', { model, params })
      update(key, { id, status: 'ACCEPTED' })
      poll(key, id, model, params, startedAt)
    } catch (e) { update(key, { status: 'ERROR', error: e.message, raw: e.details }) }
  }
  async function runViggle() {
    const params = { imageUrl: subject.trim(), motionVideoUrl: videoUrl.trim() }
    const key = `viggle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const startedAt = Date.now()
    setRuns((rs) => [{ key, model: 'viggle', params, status: 'SUBMITTING', startedAt }, ...rs])
    try {
      const { id, raw } = await api.post('/api/admin/video/viggle/submit', params)
      update(key, { id, status: 'ACCEPTED', raw })
      poll(key, id, 'viggle', params, startedAt)
    } catch (e) { update(key, { status: 'ERROR', error: e.message, raw: e.details }) }
  }
  const runAll = () => { if (viggle) runViggle(); else models.forEach((m) => runOne(m)) }

  const resume = (id, model = '') => {
    const key = `resume-${id}-${Date.now()}`
    const startedAt = Date.now()
    setRuns((rs) => [{ key, model: model || 'task', params: {}, id, status: 'ACCEPTED', startedAt }, ...rs])
    poll(key, id, model || 'task', {}, startedAt)
  }
  const [taskId, setTaskId] = useState('')

  async function onFile(f, target = 'images') {
    if (!f) return
    setUploading(true)
    try {
      const body = new FormData(); body.append('image', f)
      const out = await api.post('/api/admin/video/upload', body)
      if (target === 'start') setStartFrame(out.url)
      else if (target === 'end') setEndFrame(out.url)
      else if (target === 'subject') setSubject(out.url)
      else setImages((v) => `${v.trim()}${v.trim() ? '\n' : ''}${out.url}`)
      toast('Picture uploaded')
    } catch (e) { toast(e.message, 'error') }
    setUploading(false)
  }

  const curl = (m) => `curl -X POST ${cfg.data?.apiUrl || 'https://api.picsart.com'}/workflows/v1/models/submit \\\n  -H "Authorization: Bearer $PICSART_API_KEY" -H "Content-Type: application/json" \\\n  -d '${JSON.stringify({ params: { model: m, params: paramsFor(m) } })}'`
  // hands a finished video to the Video templates page as a filled-in "new template" (the finished clip is the preview; the reference video is what you pasted in "Video + picture")
  const useAsTemplate = (r) => {
    const p = r.params || {}
    const key = VIDEO_KEYS.find((k) => p[k]) || 'videoUrl'
    const { prompt: pr, imageUrls: _i, ...rest } = p
    delete rest[key]
    const draft = { title: '', previewUrl: r.url, videoUrl: [].concat(p[key] || '')[0], videoKey: key, model: r.model, prompt: pr || '', params: JSON.stringify(rest, null, 2) }
    try { sessionStorage.setItem('console.videoTemplateDraft', JSON.stringify(draft)) } catch { /* private window */ }
    location.hash = '#/pictrify/video-templates'
  }
  const copy = (text) => navigator.clipboard?.writeText(text).then(() => toast('Copied'), () => {})
  const elapsed = (r) => { const s = Math.max(0, Math.round(((DONE.includes(r.status) ? r.endedAt || now : now) - r.startedAt) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
  useEffect(() => { runs.forEach((r) => { if (DONE.includes(r.status) && !r.endedAt) update(r.key, { endedAt: Date.now() }) }) }, [runs])

  return (
    <>
      <PageHeader title="Video lab" subtitle="Try Picsart's video models with your own picture and text. Run one model, or several at once to compare." />
      <ErrorNote error={cfg.error} onRetry={cfg.reload} />
      {viggle && cfg.data?.viggleConfigured === false && <p role="alert" className="mb-5 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 animate-rise">The server has no <span className="font-mono">VIGGLE_API_KEY</span> yet. Add it to <span className="font-mono">backend/.env</span> (and Vercel) and restart the backend.</p>}
      {!viggle && cfg.data && !cfg.data.configured && <p role="alert" className="mb-5 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 animate-rise">The server has no <span className="font-mono">PICSART_API_KEY</span> yet. Add it to <span className="font-mono">backend/.env</span> (and Vercel) and restart the backend.</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="card space-y-5 self-start p-5 animate-rise lg:sticky lg:top-20">
          {!viggle && <div>
            <span className="label">Models <span className="text-white/30">({models.length} selected)</span></span>
            <div className="flex flex-wrap gap-2">
              {[...PRESETS, ...models.filter((m) => !PRESETS.includes(m))].map((m) => (
                <button key={m} type="button" onClick={() => toggleModel(m)} className={cx('cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition', models.includes(m) ? 'border-brand/70 bg-brand/20 text-white' : 'border-line bg-white/[0.03] text-white/55 hover:text-white')}>{m}</button>
              ))}
            </div>
            <div className="mt-2 flex gap-2"><input className="input" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCustom()} placeholder="another model id…" /><button type="button" className="btn-ghost shrink-0" onClick={addCustom}>Add</button></div>
            <p className="mt-1.5 text-xs text-white/35">Ids are listed with their inputs on <a className="underline hover:text-white" href="https://picsart.com/api-platform/models" target="_blank" rel="noreferrer">picsart.com/api-platform/models</a>.</p>
          </div>}

          <div>
            <span className="label">What do you start from?</span>
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-line bg-white/[0.02] p-1">
              {MODES.map((m) => (
                <button key={m.id} type="button" onClick={() => setMode(m.id)} className={cx('cursor-pointer rounded-lg px-2 py-2 text-xs font-medium transition', mode === m.id ? 'bg-brand/25 text-white' : 'text-white/50 hover:text-white')}>{m.label}</button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-white/35">{MODES.find((m) => m.id === mode).hint}</p>
          </div>

          {!viggle && <Field label="Prompt"><textarea className="input min-h-[96px] resize-y" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={mode === 'text' ? 'A drone shot flying over a canyon at sunrise' : 'She smiles and turns her head slowly, soft golden light'} /></Field>}

          {viggle && (
            <>
              <Field label="Your picture (image_url)" hint="A public link to a clear picture of the person. Upload puts it in your Spaces bucket and fills the link.">
                <input className="input font-mono text-xs" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="https://…/photo.png" />
                <div className="mt-2"><UploadButton busy={uploading} off={cfg.data?.upload === false} onFile={(f) => onFile(f, 'subject')} /></div>
              </Field>
              <Field label="Reference video (motion_video_url)" hint="A public link to the video whose motion is copied (mp4).">
                <input className="input font-mono text-xs" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…/dance.mp4" />
              </Field>
            </>
          )}
          {mode === 'image' && (
            <Field label="Picture(s)" hint="One public address per line (imageUrls). Upload puts it in your Spaces bucket and adds the address.">
              <textarea className="input min-h-[64px] resize-y font-mono text-xs" value={images} onChange={(e) => setImages(e.target.value)} placeholder="https://…/photo.jpg" />
              <div className="mt-2"><UploadButton busy={uploading} off={cfg.data?.upload === false} onFile={(f) => onFile(f, 'images')} /></div>
            </Field>
          )}
          {mode === 'frames' && (
            <>
              <Field label="Start frame (startFrame)"><input className="input font-mono text-xs" value={startFrame} onChange={(e) => setStartFrame(e.target.value)} placeholder="https://…/first.jpg" /><div className="mt-2"><UploadButton busy={uploading} off={cfg.data?.upload === false} onFile={(f) => onFile(f, 'start')} /></div></Field>
              <Field label="End frame (endFrame)" hint="Optional: the video ends on this picture."><input className="input font-mono text-xs" value={endFrame} onChange={(e) => setEndFrame(e.target.value)} placeholder="https://…/last.jpg" /><div className="mt-2"><UploadButton busy={uploading} off={cfg.data?.upload === false} onFile={(f) => onFile(f, 'end')} /></div></Field>
            </>
          )}

          {!viggle && <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration (s)"><input className="input" type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="model default" /></Field>
            <Field label="Resolution" hint="Models ignore a name they don't have, so a wrong one falls back to the model's default."><div className="flex gap-1.5"><select className="input" value={quality} onChange={(e) => setQuality(e.target.value)}><option value="">model default</option>{['360p', '480p', '540p', '720p', '768p', '1080p'].map((q) => <option key={q}>{q}</option>)}</select><select className="input !w-auto" value={resKey} onChange={(e) => setResKey(e.target.value)} title="Input name it is sent under">{['resolution', 'quality', 'size'].map((k) => <option key={k}>{k}</option>)}</select></div></Field>
            <Field label="Aspect ratio"><select className="input" value={aspect} onChange={(e) => setAspect(e.target.value)}><option value="">model default</option>{['16:9', '9:16', '1:1', '4:3', '3:4'].map((q) => <option key={q}>{q}</option>)}</select></Field>
            <Field label="Audio"><select className="input" value={audio} onChange={(e) => setAudio(e.target.value)}><option value="default">model default</option><option value="on">with audio</option><option value="off">no audio</option></select></Field>
          </div>

          <details className="group rounded-xl border border-line bg-white/[0.02] p-3">
            <summary className="cursor-pointer text-sm font-medium text-white/70 group-open:text-white">Extra inputs &amp; per-model overrides</summary>
            <div className="mt-3 space-y-3">
              <Field label="Extra inputs (JSON, sent to every model)"><textarea className="input min-h-[64px] resize-y font-mono text-xs" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder='{"startFrame": "https://…", "resolution": "1080p"}' /></Field>
              <Field label="Per-model overrides (JSON)" hint="Only for that model; they win over the fields above."><textarea className="input min-h-[64px] resize-y font-mono text-xs" value={overrides} onChange={(e) => setOverrides(e.target.value)} placeholder='{"kling-v3": {"cfgScale": 0.5}}' /></Field>
            </div>
          </details>

          <details className="group rounded-xl border border-line bg-white/[0.02] p-3">
            <summary className="cursor-pointer text-sm font-medium text-white/70 group-open:text-white">What will be sent</summary>
            <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-ink/70 p-3 text-[11px] leading-relaxed text-white/70">{JSON.stringify(Object.fromEntries(models.map((m) => [m, paramsFor(m)])), null, 2)}</pre>
            {models[0] && <button type="button" className="btn-ghost mt-2 !px-3 !py-1.5 !text-xs" onClick={() => copy(curl(models[0]))}><Icon name="copy" className="size-3.5" />Copy as curl ({models[0]})</button>}
          </details>
          </>}

          {problem && <p className="text-xs text-amber-200/80">{problem}</p>}
          <button type="button" className="btn-primary w-full" disabled={!!problem || (viggle ? cfg.data?.viggleConfigured === false : cfg.data?.configured === false)} onClick={runAll}><Icon name="play" className="size-4" />{!viggle && models.length > 1 ? `Run on ${models.length} models` : 'Generate video'}</button>
          <p className="text-center text-[11px] text-white/30">Each run uses {viggle ? 'Viggle' : 'Picsart'} credits.</p>
        </div>

        <div className="min-w-0 space-y-4">
          {runs.length === 0 ? (
            <div className="card grid place-items-center px-6 py-20 text-center animate-rise"><Icon name="play" className="mb-3 size-9 text-white/25" /><p className="font-display text-lg font-bold text-white">Results show up here</p><p className="mt-1 max-w-sm text-sm text-white/45">Pick one or more models, add a picture and a prompt, and press Generate. Videos usually take 1–5 minutes.</p></div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {runs.map((r) => (
                <article key={r.key} className="card overflow-hidden animate-rise">
                  <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                    <p className="truncate font-mono text-sm font-semibold text-white">{r.model}</p>
                    <div className="flex shrink-0 items-center gap-2">{!DONE.includes(r.status) && <Spinner className="size-3.5 text-brand" />}<Badge tone={TONE[r.status] || 'gray'}>{r.status.replace('_', ' ').toLowerCase()}</Badge></div>
                  </div>
                  <div className="aspect-video bg-ink">
                    {r.url ? <video src={r.url} controls loop playsInline className="size-full object-contain" />
                      : <div className="grid size-full place-items-center px-6 text-center text-sm text-white/40">{r.error ? <span className="text-red-300">{r.error}</span> : DONE.includes(r.status) ? 'No video returned.' : 'Generating… keep this page open.'}</div>}
                  </div>
                  <div className="space-y-2 px-4 py-3 text-xs text-white/55">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1"><span>⏱ {elapsed(r)}</span>{r.credits != null && <span>◎ {r.credits} credits</span>}{r.id && <button type="button" onClick={() => copy(r.id)} className="inline-flex cursor-pointer items-center gap-1 font-mono hover:text-white"><Icon name="copy" className="size-3" />{r.id}</button>}</div>
                    {billing(r).length > 0 && <p className="font-mono text-[11px] text-white/40" title="Picsart's own billing label: shows the kind of job and the resolution it actually ran at">billed as {billing(r).join(', ')}</p>}
                    {r.params?.prompt && <p className="line-clamp-2 text-white/40">“{r.params.prompt}”</p>}
                    <div className="flex flex-wrap gap-3">{r.url && <a href={r.url} target="_blank" rel="noreferrer" className="underline hover:text-white">Open / download</a>}{r.url && r.model !== 'viggle' && <button type="button" onClick={() => useAsTemplate(r)} className="cursor-pointer underline hover:text-white">Use as template</button>}</div>
                    {(r.raw || r.error) && <details><summary className="cursor-pointer hover:text-white">Raw response</summary><pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-ink/70 p-3 text-[11px] text-white/60">{JSON.stringify(r.raw ?? { error: r.error }, null, 2)}</pre></details>}
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="card p-4 animate-rise">
            <p className="mb-2 text-sm font-semibold text-white">Check a task by id</p>
            <div className="flex gap-2"><input className="input font-mono text-xs" value={taskId} onChange={(e) => setTaskId(e.target.value)} placeholder="task id from an earlier run" /><button type="button" className="btn-ghost shrink-0" disabled={taskId.trim().length < 3} onClick={() => { resume(taskId.trim()); setTaskId('') }}>Check</button></div>
            {history.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/35">Recent runs</p>
                <ul className="divide-y divide-line">
                  {history.slice(0, 8).map((h) => (
                    <li key={h.id} className="flex items-center gap-3 py-2 text-xs">
                      <Badge tone={TONE[h.status] || 'gray'}>{String(h.status).toLowerCase()}</Badge>
                      <span className="font-mono text-white/80">{h.model}</span>
                      <span className="min-w-0 flex-1 truncate text-white/35">{h.prompt}</span>
                      <button type="button" onClick={() => resume(h.id, h.model)} className="cursor-pointer text-white/50 underline hover:text-white">open</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
