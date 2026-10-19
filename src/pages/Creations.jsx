import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'

export default function Creations() {
  const { creations, signedIn } = useStudio()
  const [tab, setTab] = useState('image')
  const list = creations.filter((c) => c.type === tab)
  return (
    <main className="relative z-10 mx-auto w-full max-w-none grow px-4 pb-24 pt-8 min-[375px]:px-5 sm:px-6 md:px-6 md:pb-16 lg:px-8 xl:pb-20 xl:pt-12">
      <div className="eyebrow"><span>Your AI Library</span></div>
      <h1 className="mt-4 text-[32px] font-extrabold leading-[0.98] tracking-tight text-[#f8f5ff] min-[375px]:text-[36px] min-[420px]:text-[42px] sm:text-[60px] lg:text-[76px]"><span>My </span><span className="grad-text">Creations</span></h1>
      <p className="mt-3 max-w-[620px] text-base font-normal leading-relaxed text-[#b8b4c7] sm:mt-4 sm:text-lg lg:text-xl">Your generated content, all in one place.</p>

      {!signedIn ? (
        <div className="mx-auto mt-8 flex w-full max-w-3xl flex-col items-center justify-center card-box !rounded-xl p-10 text-center sm:mt-12 sm:p-16">
          <div className="mb-6 flex size-20 items-center justify-center rounded-full border border-[#8b5cf6]/20 bg-[#14121d] shadow-inner sm:size-24">
            <svg className="size-8 text-[#b8b4c7] sm:size-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2 className="mb-2 text-2xl font-normal tracking-normal text-[#f8f5ff]/95 sm:text-3xl">Sign in to view your creations</h2>
          <p className="mb-8 max-w-md text-sm font-normal text-[#b8b4c7] sm:text-base">Join our community of creators to store and manage your AI generations permanently.</p>
          <Link to="/login" className="btn-grad">Sign in to Pixora</Link>
        </div>
      ) : (
        <>
          <div className="mb-6 mt-8 inline-flex rounded-full border border-[#292536] bg-[#14121d] p-1">
            {[['image', 'Images'], ['video', 'Videos']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`cursor-pointer rounded-full px-6 py-2 text-sm transition ${tab === id ? 'grad-bg font-medium' : 'text-[#b8b4c7] hover:text-white'}`}>{label}</button>
            ))}
          </div>
          {list.length === 0 ? (
            <div className="rounded-xl border border-[#292536] bg-[#14121d] px-6 py-16 text-center">
              <p className="mb-1 text-lg font-medium">No {tab}s yet</p>
              <p className="mb-5 text-sm text-[#858094]">Create something and it will show up here.</p>
              <Link to="/explore" className="btn-grad">Start Creating</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {list.map((c) => (
                <div key={c.id} className="group relative aspect-[9/16] animate-fade-in overflow-hidden rounded-xl border border-[#292536] bg-[#0b0a12]">
                  <img src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-contain" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  {c.type === 'video' && <span className="absolute left-1/2 top-1/2 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55 backdrop-blur">▶</span>}
                  <div className="absolute inset-x-2 bottom-2 flex items-end justify-between gap-1 text-xs">
                    <span className="min-w-0"><span className="block truncate font-semibold">{c.name}</span><span className="text-[#858094]">{c.date}</span></span>
                    <button onClick={() => alert('Demo only - download is not enabled.')} aria-label="Download" className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full bg-white/15 opacity-0 transition hover:bg-[#8b5cf6] group-hover:opacity-100 max-md:opacity-100">⬇</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}
