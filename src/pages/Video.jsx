import { useState } from 'react'
import { Link } from 'react-router-dom'
import PImage from '../components/PImage.jsx'
import { SeeAll } from '../components/homeParts.jsx'
import { exploreTabs, categoryItems } from '../data/templates.js'

// Video creation sits beside Photo creation. The backend has no video-generation integration yet (no endpoint, no provider key), so NOTHING on this page starts a job:
// the studio below shows the planned interface with its controls switched off, and sends people to the photo flow, which works today.
const IDEAS = [
  ['Photo to video', 'Bring a styled photo to life with gentle motion.', '#1B1530'],
  ['Template videos', 'Pick a look, add a photo, get a short clip back.', '#271425'],
  ['Dance and motion', 'Put yourself into trending moves and music-ready loops.', '#101D2C'],
  ['Story clips', 'Vertical clips sized for Reels, Shorts and Stories.', '#102419'],
]
const RATIOS = ['9:16', '16:9', '1:1']
const LENGTHS = ['5 s', '10 s']

export default function Video() {
  const samples = exploreTabs.flatMap((t) => categoryItems(t.id).slice(0, 1)).slice(0, 6)
  const [ratio, setRatio] = useState('9:16')
  const [len, setLen] = useState('5 s')
  return (
    <div className="w-full text-[#FFFFFF]">
      <section className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#0D0B14_0%,#08080D_100%)] px-4 pb-14 pt-12 text-center sm:px-6 lg:pt-16">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[380px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(252,72,231,0.16),transparent)]" aria-hidden="true" />
        <span className="badge">Coming soon</span>
        <h1 className="mx-auto mt-5 max-w-3xl text-[40px] sm:text-[58px] lg:text-[68px]">Create <span className="grad-text">videos</span> as easily as photos</h1>
        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-[#A1A1AA] sm:text-[18px]">Video creation is being built for Pictrify. Until it is ready, create styled photos from any template.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/explore" className="btn-primary !px-8 !py-3.5">Create a photo<span className="arrow" aria-hidden="true">→</span></Link>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1200px] px-4 pb-24 sm:px-6 lg:px-8">
        {/* The planned studio. Every control is switched off: video generation is not connected yet. */}
        <section aria-label="Video studio preview" className="-mt-2 overflow-hidden rounded-[32px] border border-[#272033] bg-[#12101B] shadow-[0_24px_60px_rgba(0,0,0,0.10)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#272033] bg-[#12101B] px-6 py-4">
            <h2 className="font-display text-[20px] font-bold">Video studio</h2>
            <span className="rounded-full bg-[#262310] px-3 py-1 text-[12px] font-semibold text-[#E9D56A]">Preview only: video generation is not available yet</span>
          </div>
          <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col gap-5 p-6 sm:p-8">
              <label className="block">
                <span className="mb-2 block text-[14px] font-semibold">Describe the video</span>
                <textarea disabled rows={4} placeholder="Describe the motion, mood and style you want..." className="input !cursor-not-allowed resize-none !bg-[#12101B]" />
              </label>
              <div>
                <span className="mb-2 block text-[14px] font-semibold">Start from a photo</span>
                <div className="grid h-28 cursor-not-allowed place-items-center rounded-2xl border-2 border-dashed border-[#3A2F52] bg-[#12101B] text-[14px] text-[#A1A1AA]">Upload a photo (not available yet)</div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <span className="mb-2 block text-[14px] font-semibold">Shape</span>
                  <div className="flex gap-2">{RATIOS.map((r) => <button key={r} type="button" onClick={() => setRatio(r)} aria-pressed={ratio === r} className={`chip ${ratio === r ? 'chip-on' : ''}`}>{r}</button>)}</div>
                </div>
                <div>
                  <span className="mb-2 block text-[14px] font-semibold">Length</span>
                  <div className="flex gap-2">{LENGTHS.map((l) => <button key={l} type="button" onClick={() => setLen(l)} aria-pressed={len === l} className={`chip ${len === l ? 'chip-on' : ''}`}>{l}</button>)}</div>
                </div>
              </div>
              <button type="button" disabled className="btn-primary !w-full !py-4 !text-[16px]" title="Video generation is not available yet">Generate video (not available yet)</button>
              <p className="text-[13px] text-[#A1A1AA]">Choices above are not saved or sent anywhere. Your photo creation and coins are not affected.</p>
            </div>
            <div className="grid place-items-center bg-[linear-gradient(135deg,#1B1530_0%,#271425_100%)] p-8">
              <div className={`grid w-full max-w-[300px] place-items-center rounded-[28px] border-4 border-[#1A1626] bg-[#12101B]/60 shadow-[0_24px_50px_rgba(0,0,0,0.14)] ${ratio === '16:9' ? 'aspect-video' : ratio === '1:1' ? 'aspect-square' : 'aspect-[9/16]'}`}>
                <div className="text-center">
                  <span className="mx-auto grid size-14 place-items-center rounded-full bg-white text-[#08080D]"><svg className="size-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
                  <p className="mt-3 text-[14px] font-semibold">Your video will appear here</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20" aria-label="What is planned">
          <div className="section-head"><h2 className="section-title">What video creation will do</h2></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {IDEAS.map(([t, d, bg]) => (
              <div key={t} className="rounded-[28px] p-7" style={{ background: bg }}>
                <span className="grid size-11 place-items-center rounded-full bg-white text-[#08080D]"><svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg></span>
                <h3 className="mt-5 text-[20px]">{t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#C4C4CC]">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {samples.length > 0 && (
          <section className="mt-20" aria-label="Start with a photo">
            <div className="section-head">
              <h2 className="section-title">Start with a photo today</h2>
              <SeeAll to="/explore" />
            </div>
            <div className="grid grid-cols-2 gap-4 min-[560px]:grid-cols-3 lg:grid-cols-6">
              {samples.map((t) => (
                <Link key={t.id} to={`/generate?categoryId=${t.categoryId}&assetId=${t.assetId}`} className="tile group aspect-[3/4] !rounded-[24px]">
                  <PImage src={t.image} alt={t.name} loading="lazy" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" draggable="false" />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#08080D]/70 via-transparent to-transparent" />
                  <span className="absolute inset-x-3 bottom-3 truncate text-[13px] font-semibold text-white">{t.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
