import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PImage from '../components/PImage.jsx'

// Video creation sits beside Photo creation. The backend has no video-generation integration yet (no endpoint, no provider key), so NOTHING on this page starts a job:
// the studio below has working controls (mode tabs, uploads shown locally, prompt, settings) but Generate stays off, and people are sent to the photo flow, which works today.
const IDEAS = [
  ['Photo to video', 'Bring a styled photo to life with gentle motion.', '#2A2A2D'],
  ['Template videos', 'Pick a look, add a photo, get a short clip back.', '#271425'],
  ['Dance and motion', 'Put yourself into trending moves and music-ready loops.', '#2A2A2D'],
  ['Story clips', 'Vertical clips sized for Reels, Shorts and Stories.', '#102419'],
]
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
// Video templates will come from the Admin Panel (each with its own prompt and reference image) once the backend has a video-template endpoint. Until then the list is empty
// and the Reference Templates tab shows its empty state. Shape the grid below expects: { id, name, image }.
const VIDEO_TEMPLATES = []

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
  return (
    <div className="w-full text-[#FFFFFF]">
      <section className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#101011_0%,#000000_100%)] px-4 pb-12 pt-12 text-center sm:px-6 lg:pt-16">
        <h1 className="mx-auto max-w-3xl text-[40px] sm:text-[58px] lg:text-[68px]">Create <span className="grad-text">videos</span> as easily as photos</h1>
        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-[#A1A1AA] sm:text-[18px]">Turn a prompt, a photo or a template into a short video.</p>
      </section>

      <div className="mx-auto w-full max-w-[1200px] px-4 pb-24 sm:px-6 lg:px-8">
        <section aria-label="Video studio" className="overflow-hidden rounded-[32px] border border-[#3A3A3E] bg-[#191919] shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#3A3A3E] px-5 py-4 sm:px-8">
            <h2 className="font-display text-[20px] font-bold">Video studio</h2>
          </div>

          <div className="border-b border-[#3A3A3E] px-5 py-4 sm:px-8">
            <div role="tablist" aria-label="Video mode" className="grid grid-cols-2 gap-1.5 rounded-[22px] bg-[#191919] p-1.5 sm:grid-cols-4">
              {MODES.map((m) => (
                <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} onClick={() => setMode(m.id)}
                  className={`cursor-pointer rounded-full px-3 py-2.5 text-[13px] font-semibold transition-colors sm:text-[14px] ${mode === m.id ? 'bg-[#FF3DF2] text-white shadow-[0_8px_22px_-10px_rgba(255,61,242,0.8)]' : 'text-[#A1A1AA] hover:bg-[#2C2C2F] hover:text-white'}`}>
                  <span className="sm:hidden">{m.short}</span><span className="hidden sm:inline">{m.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[14px] text-[#A1A1AA]">{cur.hint}</p>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
            <div role="tabpanel" className="flex min-w-0 flex-col gap-6 p-5 sm:p-8">
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
                    <div className="grid min-h-[168px] place-items-center rounded-2xl border border-dashed border-[#4A4A4F] bg-[#191919] px-5 py-8 text-center">
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
                <span className="mb-2 flex items-center justify-between text-[14px] font-semibold">{mode === 'template' ? 'Extra details (optional)' : 'Describe the video'}<span className="text-[12px] font-normal text-[#A1A1AA]">{prompt.length}/500</span></span>
                <textarea rows={4} maxLength={500} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={PROMPT_PLACEHOLDER[mode]} className="input resize-none !bg-[#101011]" />
              </label>

              <div className={`grid gap-5 sm:grid-cols-2 ${mode === 'template' ? 'hidden' : ''}`}>
                <div>
                  <span className="mb-2 block text-[14px] font-semibold">Aspect ratio</span>
                  <div className="flex flex-wrap gap-2">{RATIOS.map((r) => <button key={r} type="button" onClick={() => setRatio(r)} aria-pressed={ratio === r} className={`chip ${ratio === r ? 'chip-on' : ''}`}>{r}</button>)}</div>
                </div>
                <div>
                  <span className="mb-2 block text-[14px] font-semibold">Duration</span>
                  <div className="flex flex-wrap gap-2">{LENGTHS.map((l) => <button key={l} type="button" onClick={() => setLen(l)} aria-pressed={len === l} className={`chip ${len === l ? 'chip-on' : ''}`}>{l}</button>)}</div>
                </div>
              </div>

              <div>
                <button type="button" disabled className="btn-grad !w-full !py-4 !text-[16px]" data-ready={ready ? 'true' : 'false'}>Generate video</button>
              </div>
            </div>

            <div className="grid place-items-center border-t border-[#3A3A3E] bg-[linear-gradient(135deg,#2A2A2D_0%,#271425_100%)] p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className={`grid w-full place-items-center rounded-[28px] border-4 border-[#2C2C2F] bg-[#1C1C1E]/60 shadow-[0_24px_50px_rgba(0,0,0,0.3)] ${frame} ${ratio === '16:9' ? 'max-w-[420px]' : 'max-w-[300px]'}`}>
                <div className="px-4 text-center">
                  <span className="mx-auto grid size-14 place-items-center rounded-full bg-white text-[#000000]"><svg className="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
                  <p className="mt-3 text-[14px] font-semibold">Your video will appear here</p>
                  <p className="mt-1 text-[12px] text-[#A1A1AA]">{mode === 'template' ? cur.label : `${cur.label} · ${ratio} · ${len}`}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20" aria-label="What you can create">
          <div className="section-head"><h2 className="section-title">What you can create with video</h2></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {IDEAS.map(([t, d, bg]) => (
              <div key={t} className="rounded-[28px] p-7" style={{ background: bg }}>
                <span className="grid size-11 place-items-center rounded-full bg-white text-[#000000]"><svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
                <h3 className="mt-5 text-[20px]">{t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#C4C4C8]">{d}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
