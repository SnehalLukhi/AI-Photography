import { Link } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'

export default function Creations() {
  const { creations, signedIn } = useStudio()
  const list = creations.filter((c) => c.type === 'image')
  return (
    <main className="relative z-10 mx-auto w-full max-w-none grow px-4 pb-24 pt-8 min-[375px]:px-5 sm:px-6 md:px-6 md:pb-16 lg:px-8 xl:pb-20 xl:pt-12">
      <div className="eyebrow"><span>Your AI Library</span></div>
      <h1 className="mt-4 text-[32px] font-extrabold leading-[0.98] tracking-tight text-[#ffffff] min-[375px]:text-[36px] min-[420px]:text-[42px] sm:text-[60px] lg:text-[76px]"><span>My </span><span className="grad-text">Creations</span></h1>
      <p className="mt-3 max-w-[620px] text-base font-normal leading-relaxed text-[#C4B5FD] sm:mt-4 sm:text-lg lg:text-xl">Your generated content, all in one place.</p>

      {!signedIn ? (
        <div className="mx-auto mt-8 flex w-full max-w-3xl flex-col items-center justify-center card-box !rounded-xl p-10 text-center sm:mt-12 sm:p-16">
          <div className="mb-6 flex size-20 items-center justify-center rounded-full border border-[#B070FA]/20 bg-gradient-to-br from-[#2A1B52] to-[#1A284F] shadow-inner sm:size-24">
            <svg className="size-8 text-[#C4B5FD] sm:size-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2 className="mb-2 text-2xl font-normal tracking-normal text-[#ffffff]/95 sm:text-3xl">Sign in to view your creations</h2>
          <p className="mb-8 max-w-md text-sm font-normal text-[#C4B5FD] sm:text-base">Join our community of creators to store and manage your AI generations permanently.</p>
          <Link to="/login" className="btn-grad">Sign in to Pixora</Link>
        </div>
      ) : (
        <>
          {list.length === 0 ? (
            <div className="mt-8 rounded-xl border border-[#3A3552] bg-gradient-to-br from-[#2A1B52] to-[#1A284F] px-6 py-16 text-center">
              <p className="mb-1 text-lg font-medium">No images yet</p>
              <p className="mb-5 text-sm text-[#C4B5FD]/75">Create something and it will show up here.</p>
              <Link to="/explore" className="btn-grad">Start Creating</Link>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {list.map((c) => (
                <div key={c.id} className="group relative aspect-[9/16] animate-fade-in overflow-hidden rounded-xl border border-[#3A3552] bg-[#000000]">
                  {/* every generated picture fills the whole 9:16 card (cropped evenly, never stretched): results from the AI Photography API are almost 9:16, Cartoon results keep the photo's own shape */}
                  <img src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover object-center" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute inset-x-2 bottom-2 flex items-end justify-between gap-1 text-xs">
                    <span className="min-w-0"><span className="block truncate font-semibold">{c.name}</span><span className="text-[#C4B5FD]/75">{c.date}</span></span>
                    <button onClick={() => alert('Demo only - download is not enabled.')} aria-label="Download" className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full bg-white/15 opacity-0 transition hover:bg-[#B070FA] group-hover:opacity-100 max-md:opacity-100">⬇</button>
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
