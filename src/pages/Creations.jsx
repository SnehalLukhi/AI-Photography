import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'
import { listGenerations, getGeneration, deleteGeneration } from '../lib/aiPhotography.js'

const toCreation = (g) => ({
  id: g.id, generationId: g.id, type: 'image', name: g.template || 'AI photo', image: g.result?.url, original: g.original?.url,
  date: new Date(g.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
})

/** Original photo next to the AI-generated image. */
function Compare({ item, onClose, onDelete }) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-black/85 p-4 backdrop-blur" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-2xl border border-[#B070FA]/30 bg-gradient-to-br from-[#2A1B52] to-[#1A284F] p-4 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 font-semibold">{item.name}</p>
        <div className="grid grid-cols-2 gap-3">
          {[['Original', item.original], ['AI generated', item.image]].map(([label, src]) => (
            <figure key={label}>
              <div className="aspect-[9/16] overflow-hidden rounded-xl border border-[#B070FA]/40 bg-black">{src ? <img src={src} alt={label} className="size-full object-cover object-center" /> : <div className="grid size-full place-items-center text-xs text-[#C4B5FD]/75">Not available</div>}</div>
              <figcaption className="mt-1.5 text-xs text-[#C4B5FD]">{label}</figcaption>
            </figure>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {item.image && <a href={item.image} target="_blank" rel="noreferrer" className="btn-grad">Open / download</a>}
          {item.generationId && <button className="btn-dark" onClick={onDelete}>Delete</button>}
          <button className="btn-dark" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

export default function Creations() {
  const { creations, setCreations, signedIn, authReady, signOut } = useStudio()
  const [open, setOpen] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [nextToken, setNextToken] = useState() // set while the backend has more (older) creations
  const [loadingMore, setLoadingMore] = useState(false)
  const list = creations.filter((c) => c.type === 'image' && c.image)
  // stored generations (DigitalOcean Spaces) come back after a refresh; a failed load keeps what is already on screen
  useEffect(() => {
    if (!signedIn) return
    const ctrl = new AbortController()
    listGenerations({ signal: ctrl.signal })
      .then(({ generations: gs, nextToken: more }) => { setLoadError(''); setNextToken(more); if (gs.length) setCreations((cur) => [...gs.filter((g) => g.result).map(toCreation), ...cur.filter((c) => !c.generationId)]) })
      .catch((e) => { if (e.status === 401) signOut(); else if (e.name !== 'AbortError') setLoadError('Could not load your saved creations.') })
    return () => ctrl.abort()
  }, [signedIn, setCreations, signOut])
  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const { generations: gs, nextToken: more } = await listGenerations({ nextToken })
      setNextToken(more)
      setCreations((cur) => [...cur, ...gs.filter((g) => g.result && !cur.some((c) => c.id === g.id)).map(toCreation)])
    } catch (e) { if (e.status === 401) signOut(); else setLoadError('Could not load more creations.') }
    setLoadingMore(false)
  }
  // signed image links last an hour: opening a creation asks the backend for fresh ones, so an old page never shows broken images
  const openItem = (c) => {
    setOpen(c)
    if (!c.generationId) return
    getGeneration(c.generationId)
      .then((g) => { const fresh = toCreation(g); setOpen((o) => (o && o.id === c.id ? { ...o, image: fresh.image, original: fresh.original } : o)) })
      .catch(() => {})
  }
  const remove = async (c) => {
    try { await deleteGeneration(c.generationId); setCreations((cur) => cur.filter((x) => x.id !== c.id)); setOpen(null) } catch (e) { setLoadError(e.message) }
  }
  return (
    <main className="relative z-10 mx-auto w-full max-w-none grow px-4 pb-24 pt-8 min-[375px]:px-5 sm:px-6 md:px-6 md:pb-16 lg:px-8 xl:pb-20 xl:pt-12">
      <div className="eyebrow"><span>Your AI Library</span></div>
      <h1 className="mt-4 text-[32px] font-extrabold leading-[0.98] tracking-tight text-[#ffffff] min-[375px]:text-[36px] min-[420px]:text-[42px] sm:text-[60px] lg:text-[76px]"><span>My </span><span className="grad-text">Creations</span></h1>
      <p className="mt-3 max-w-[620px] text-base font-normal leading-relaxed text-[#C4B5FD] sm:mt-4 sm:text-lg lg:text-xl">Your generated content, all in one place.</p>

      {signedIn && <button type="button" onClick={signOut} className="btn-dark mt-4">Log out</button>}
      {loadError && <p role="alert" className="mt-4 text-sm text-red-300">{loadError}</p>}
      {!authReady ? null : !signedIn ? (
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
                <div key={c.id} onClick={() => c.original && openItem(c)} className={`group relative aspect-[9/16] animate-fade-in overflow-hidden rounded-xl border border-[#3A3552] bg-[#000000] ${c.original ? 'cursor-pointer' : ''}`}>
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
      {nextToken && signedIn && <div className="mt-6 text-center"><button type="button" disabled={loadingMore} onClick={loadMore} className="btn-dark disabled:opacity-60">{loadingMore ? 'Loading\u2026' : 'Load more'}</button></div>}
      {open && <Compare item={open} onClose={() => setOpen(null)} onDelete={() => remove(open)} />}
    </main>
  )
}
