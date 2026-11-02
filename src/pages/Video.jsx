import { useEffect, useState } from 'react'
import { VIDEO_TEMPLATES } from '../data/videoTemplates.js'
import { useSearchParams } from 'react-router-dom'
import PImage from '../components/PImage.jsx'
import { useStudio } from '../context/StudioContext.jsx'

// Video creation sits beside Photo creation. The backend has no video-generation integration yet (no endpoint, no provider key), so NOTHING on this page starts a job:
// the studio below has working controls (mode tabs, uploads shown locally, prompt, settings) but Generate stays off, and people are sent to the photo flow, which works today.
const IDEAS = [ // [title, text, the mode "Try it" opens]
  ['Photo to video', 'Bring a styled photo to life with gentle motion.', 'image'],
  ['Template videos', 'Pick a look, add a photo, get a short clip back.', 'template'],
  ['Dance and motion', 'Put yourself into trending moves and music-ready loops.', 'template'],
  ['Story clips', 'Vertical clips sized for Reels, Shorts and Stories.', 'text'],
]
const MODE_ICON = { text: 'M5 6h14M5 12h14M5 18h9', image: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4', frames: 'M4 6h6v12H4zM14 6h6v12h-6z', template: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' }
const RATIOS = ['9:16', '16:9', '1:1']
const LENGTHS = ['5 s', '10 s']
const MODES = [
  { id: 'text', label: 'Text to Video', short: 'Text', hint: 'Describe a scene and get a video from the words alone.' },
  { id: 'image', label: 'Image to Video', short: 'Image', hint: 'Upload a starting image and describe how it should move.' },
  { id: 'frames', label: 'First + Last Frame', short: 'Frames', hint: 'Set where the video starts and ends; the motion in between is generated.' },
  { id: 'template', label: 'Reference Templates', short: 'Templates', hint: 'Pick a video style made by Pictrify and add your own photo.' },
]
const PROMPT_PLACEHOLDER = {
  text: 'A slow cinematic drone shot over a misty mountain lake at sunrise...',
  image: 'Describe the motion or scene: the camera pushes in, hair moves in the wind...',
  frames: 'Describe how the scene changes from the first frame to the last...',
  template: 'Optional: add details to the template, e.g. mood or camera movement...',
}

const Icon = ({ d, className = 'size-5' }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
const UPLOAD = 'M12 16V4m0 0L7 9m5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3'

// One picture drop area. The file only stays in this browser tab (a local preview); nothing is uploaded or sent anywhere.
function FrameUpload({ label, hint, file, onFile }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!file) { setUrl(''); return undefined }
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return (
    <div className="min-w-0">
      <span className="mb-2 block text-[14px] font-semibold">{label}</span>
      <label className="group relative grid min-h-[168px] cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-[#4A4A4F] bg-[#191919] text-center transition-colors focus-within:border-[#FF3DF2]">
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0] || null); e.target.value = '' }} />
        {url ? <img src={url} alt={`${label} preview`} className="absolute inset-0 size-full object-cover" /> : (
          <span className="px-4 py-6">
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-[#2C2C2F] text-[#FF3DF2] transition-colors group-hover:bg-[#2F2F32]"><Icon d={UPLOAD} /></span>
            <span className="mt-3 block text-[14px] font-semibold">Click to upload</span>
            <span className="mt-1 block text-[12px] text-[#A1A1AA]">{hint}</span>
          </span>
        )}
      </label>
      {file && <button type="button" onClick={() => onFile(null)} className="mt-2 text-[13px] font-semibold text-[#FF3DF2] hover:text-white">Remove</button>}
    </div>
  )
}

export default function Video() {
  const [mode, setMode] = useState('text')
  const { signedIn, coins } = useStudio()
  const [params] = useSearchParams()
  const [prompt, setPrompt] = useState(() => (params.get('prompt') || '').slice(0, 500)) // an idea typed in the home page's Video search bar arrives here
  const [image, setImage] = useState(null)
  const [first, setFirst] = useState(null)
  const [last, setLast] = useState(null)
  const [tpl, setTpl] = useState(null)
  const [tplPhoto, setTplPhoto] = useState(null)
  const [ratio, setRatio] = useState('9:16')
  const [len, setLen] = useState('5 s')
  const cur = MODES.find((m) => m.id === mode)
  const frame = ratio === '16:9' ? 'aspect-video' : ratio === '1:1' ? 'aspect-square' : 'aspect-[9/16]'
  // what a future Generate call will need per mode (kept for the integration; Generate itself stays off for now)
  const ready = { text: !!prompt.trim(), image: !!image && !!prompt.trim(), frames: !!first && !!last && !!prompt.trim(), template: !!tpl && !!tplPhoto }[mode]
  const tryIdea = (m) => { setMode(m); document.getElementById('video-studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const step = (n, title, extra) => <p className="mb-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[#A1A1AA]"><span><span className="text-[#FF3DF2]">{n}</span> · {title}</span>{extra}</p>
  const secsOf = (l) => `0:${String(parseInt(l, 10) || 5).padStart(2, '0')}`
  const modeTag = mode === 'template' ? 'Template' : `${cur.short} to Video`
  return (
    <div className="w-full text-[#FFFFFF]">
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-6 sm:px-6 sm:pb-24 lg:px-8">
        {/* intro (the phone header already names the page) */}
        <header className="pb-8 pt-10 max-md:hidden lg:pt-14">
          <p className="text-[13px] text-[#A1A1AA]">Create <span className="mx-1 text-[#52525B]">/</span> <span className="text-white">AI Video</span></p>
          <h1 className="mt-4 max-w-3xl text-[44px] font-extrabold leading-[1.05] tracking-tight sm:text-[60px] lg:text-[76px]">Make a <span className="text-[#FF3DF2]">video</span> in a few lines.</h1>
          <p className="mt-4 text-[16px] text-[#A1A1AA]">Turn a prompt, a photo or a template into a short video.</p>
        </header>

        <section id="video-studio" aria-label="Video studio" className="grid scroll-mt-24 gap-5 max-md:mt-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
          {/* left: the steps */}
          <div className="flex min-w-0 flex-col gap-6 rounded-[28px] bg-[#191919] p-5 sm:p-7">
            <div>
              {step('1', 'Choose a mode')}
              <div role="tablist" aria-label="Video mode" className="grid grid-cols-2 gap-2.5">
                {MODES.map((m) => (
                  <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} onClick={() => setMode(m.id)}
                    className={`flex cursor-pointer items-center gap-3 rounded-full border-2 px-3 py-2.5 text-left text-[13px] font-semibold leading-tight transition-colors sm:text-[14px] ${mode === m.id ? 'border-[#ffffff]  text-white' : 'border-[#3A3A3E] bg-[#1C1C1E] text-[#C4C4C8]  hover:text-white'}`}>
                    <span className={`grid size-8 shrink-0 place-items-center rounded-full ${mode === m.id ? 'bg-[#FF3DF2] text-white' : 'bg-[#2C2C2F] text-[#A1A1AA]'}`}><Icon d={MODE_ICON[m.id]} className="size-4" /></span>
                    <span className="min-w-0">{m.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[13px] text-[#A1A1AA]">{cur.hint}</p>
            </div>

            {mode === 'image' && <FrameUpload label="Starting image" hint="PNG, JPG or WebP" file={image} onFile={setImage} />}
            {mode === 'frames' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FrameUpload label="Start frame" hint="How the video begins" file={first} onFile={setFirst} />
                <FrameUpload label="End frame" hint="How the video ends" file={last} onFile={setLast} />
              </div>
            )}
            {mode === 'template' && (
              <div>
                <span className="mb-2 block text-[14px] font-semibold">Choose a template</span>
                {VIDEO_TEMPLATES.length ? (
                  <div className="grid grid-cols-3 gap-3">
                    {VIDEO_TEMPLATES.map((t) => (
                      <button key={t.id} type="button" onClick={() => setTpl(t.id)} aria-pressed={tpl === t.id} className={`tile group relative aspect-[3/4] overflow-hidden !rounded-[18px] border-2 ${tpl === t.id ? 'border-[#FF3DF2]' : 'border-transparent'}`}>
                        <PImage src={t.image} alt={t.name} loading="lazy" className="absolute inset-0 size-full object-cover" draggable="false" />
                        <span className="absolute inset-0 bg-gradient-to-t from-[#000000]/80 via-transparent to-transparent" />
                        <span className="absolute inset-x-2 bottom-2 truncate text-[12px] font-semibold text-white">{t.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid min-h-[140px] place-items-center rounded-2xl border border-dashed border-[#4A4A4F] bg-[#191919] px-5 py-8 text-center">
                    <div>
                      <span className="mx-auto grid size-11 place-items-center rounded-full bg-[#2C2C2F] text-[#FF3DF2]"><Icon d="M4 5h16v14H4zM9 9l6 3-6 3z" /></span>
                      <p className="mt-3 text-[14px] font-semibold">No video templates yet</p>
                      <p className="mt-1 text-[12px] text-[#A1A1AA]">Templates added in the admin panel will appear here, each with its own style and reference image.</p>
                    </div>
                  </div>
                )}
                <div className="mt-5"><FrameUpload label="Your photo" hint="The photo the template is applied to" file={tplPhoto} onFile={setTplPhoto} /></div>
              </div>
            )}

            <label className="block">
              {step('2', mode === 'template' ? 'Extra details (optional)' : 'Describe the video', <span className="text-[11px] font-medium normal-case tracking-normal">{prompt.length}/500</span>)}
              <textarea rows={4} maxLength={500} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={PROMPT_PLACEHOLDER[mode]} className="input resize-none !bg-[#101011]" />
            </label>

            <div className={`grid gap-6 sm:grid-cols-2 ${mode === 'template' ? 'hidden' : ''}`}>
              <div>
                {step('3', 'Aspect ratio')}
                <div className="flex flex-wrap gap-1.5">{RATIOS.map((r) => <button key={r} type="button" onClick={() => setRatio(r)} aria-pressed={ratio === r} className={`chip !gap-1.5 !px-3 !py-2 ${ratio === r ? 'chip-on' : ''}`}><span className={`inline-block rounded-[3px] border-[1.5px] border-current ${r === '9:16' ? 'h-3.5 w-2' : r === '16:9' ? 'h-2 w-3.5' : 'size-3'}`} aria-hidden="true" />{r}</button>)}</div>
              </div>
              <div>
                {step('4', 'Duration')}
                <div className="flex flex-wrap gap-2">{LENGTHS.map((l) => <button key={l} type="button" onClick={() => setLen(l)} aria-pressed={len === l} className={`chip !px-4 !py-2 ${len === l ? 'chip-on' : ''}`}>{l}</button>)}</div>
              </div>
            </div>

            <div className="mt-auto">
              {signedIn && <p className="mb-3 flex items-center justify-between text-[13px] text-[#A1A1AA]"><span>Your balance</span><b className="font-semibold text-white">{coins.toLocaleString()} coins</b></p>}
              <button type="button" disabled className="btn-grad !w-full !flex-col !gap-0.5 !rounded-2xl !py-3.5 !text-[16px] disabled:!bg-[#2A2A2D] disabled:!bg-none disabled:text-[#A1A1AA] disabled:opacity-100 disabled:shadow-none" data-ready={ready ? 'true' : 'false'}>
                Generate video<span className="text-[12px] font-medium text-[#8E8E93]">{ready ? 'Coming soon' : mode === 'text' || mode === 'frames' ? 'Add a prompt first' : 'Add your inputs first'}</span>
              </button>
            </div>
          </div>

          {/* right: the preview stage */}
          <div className="flex min-w-0 flex-col rounded-[28px] bg-[#0B0B0C] p-5 ring-1 ring-white/10 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white">Preview stage</p>
              <div className="flex gap-1.5 text-[11px] font-semibold">
                <span className="rounded-full bg-[#2C2C2F] px-2.5 py-1 text-[#C4C4C8]">{ratio}</span>
                <span className="rounded-full bg-[#2C2C2F] px-2.5 py-1 text-[#C4C4C8]">{len}</span>
                <span className="rounded-full bg-[#FF3DF2] px-2.5 py-1 text-white">{modeTag}</span>
              </div>
            </div>
            <div className="my-5 grid flex-1 place-items-center rounded-[22px] bg-[#121214] p-4 sm:p-6">
              <div className={`grid w-full place-items-center rounded-[22px] border border-white/10 bg-[#1A1A1D] ${frame} ${ratio === '16:9' ? 'max-w-[440px]' : ratio === '1:1' ? 'max-w-[300px]' : 'max-w-[220px]'}`}>
                <div className="px-4 text-center">
                  <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#FF3DF2] text-white shadow-[0_10px_30px_-8px_rgba(255,61,242,0.7)]"><svg className="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
                  <p className="mt-3 text-[14px] font-bold">Your video will appear here</p>
                  <p className="mt-1 text-[12px] text-[#A1A1AA]">{mode === 'template' ? cur.label : `${cur.label} · ${ratio} · ${len}`}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[12px] text-[#8E8E93]" aria-hidden="true">
              <span className="grid size-8 place-items-center rounded-full bg-[#2C2C2F] text-white"><svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg></span>
              <span className="tabular-nums">0:00</span>
              <span className="relative h-1 flex-1 rounded-full bg-[#2C2C2F]"><span className="absolute left-0 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-[#FF3DF2]" /></span>
              <span className="tabular-nums">{secsOf(len)}</span>
            </div>
          </div>
        </section>

        <section className="mt-16 sm:mt-20" aria-label="What you can create">
          <div className="section-head"><h2 className="section-title">What you can create with video</h2></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {IDEAS.map(([t, d, m], k) => (
              <div key={t} className="flex flex-col rounded-[26px] bg-[#191919] p-6 ring-1 ring-white/[0.06] transition-colors hover:ring-[#FF3DF2]/40">
                <div className="flex items-center justify-between">
                  <span className="font-plexmono text-[12px] font-semibold text-[#FF3DF2]">{String(k + 1).padStart(2, '0')}</span>
                  <span className="grid size-10 place-items-center rounded-full bg-white text-[#000000]"><svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
                </div>
                <h3 className="mt-8 text-[19px]">{t}</h3>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[#A1A1AA]">{d}</p>
                <button type="button" onClick={() => tryIdea(m)} className="chip mt-5 w-fit !px-4 !py-1.5 !text-[12px]">Try it</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
