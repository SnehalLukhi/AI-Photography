import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'
import PImage from '../components/PImage.jsx'
import { listGenerations, deleteGeneration, downloadGeneration } from '../lib/aiPhotography.js'
import { getOriginal, deleteOriginal } from '../lib/localPhotos.js'
import { SparkIcon } from '../components/Header.jsx'

const toCreation = (g) => ({
  id: g.id, generationId: g.id, type: 'image', name: g.template || 'AI photo', image: g.result?.url,
  date: new Date(g.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
})

/** Original photo next to the AI-generated image. */
function Compare({ item, onClose, onDelete }) {
  const [original, setOriginal] = useState(item.original || '') // the original photo is kept in THIS browser only (null elsewhere)
  useEffect(() => {
    if (item.original || !item.generationId) return
    let url, alive = true
    getOriginal(item.generationId).then((blob) => { if (alive && blob) { url = URL.createObjectURL(blob); setOriginal(url) } })
    return () => { alive = false; if (url) URL.revokeObjectURL(url) }
  }, [item.generationId, item.original])
  const [busy, setBusy] = useState('') // '' | 'result' | 'original' | 'delete': what is running
  const [error, setError] = useState('')
  const save = async (which) => {
    setBusy(which); setError('')
    try {
      if (which === 'original') { const a = Object.assign(document.createElement('a'), { href: original, download: `pictrify-${item.generationId}-original.jpg` }); document.body.appendChild(a); a.click(); a.remove() } else await downloadGeneration(item.generationId)
    } catch (e) { setError(e.message || 'Could not download the image. Please try again.') }
    setBusy('')
  }
  const del = async () => {
    if (!window.confirm('Delete this creation? The AI image will be permanently removed.')) return
    setBusy('delete'); setError('')
    try { await onDelete() } catch (e) { setError(e.message || 'Could not delete this creation. Please try again.'); setBusy('') } // on success the popup closes
  }
  return (
    <div className="welcome-backdrop fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-[#0A0809]/85 px-4 pb-6 pt-24 backdrop-blur md:pt-28" onClick={onClose}>
      <div className={`welcome-card w-full ${original ? 'max-w-3xl' : 'max-w-xs'} rounded-2xl border border-white/15 bg-[#2B2B2B] p-4 text-center shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 font-semibold">{item.name}</p>
        <div className={original ? 'grid grid-cols-2 gap-3' : 'mx-auto max-w-[200px]'}>{/* no saved original (other browser / device): just the AI image */}
          {[...(original ? [['Original', original]] : []), ['AI generated', item.image]].map(([label, src]) => (
            <figure key={label}>
              <div className="aspect-[9/16] overflow-hidden rounded-xl border border-white/15 bg-[#0A0809]">{src ? <img src={src} alt={label} className="size-full object-cover object-center" /> : <div className="grid size-full place-items-center text-xs text-[#A0A0A0]">Not available</div>}</div>
              <figcaption className="mt-1.5 text-xs text-[#A0A0A0]">{label}</figcaption>
            </figure>
          ))}
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {item.image && item.generationId && <button type="button" disabled={!!busy} onClick={() => save('result')} className="btn-grad disabled:opacity-60">{busy === 'result' ? 'Downloading…' : 'Download'}</button>}
          {item.generationId && <button type="button" className="btn-dark disabled:opacity-60" disabled={!!busy} onClick={del}>{busy === 'delete' ? 'Deleting…' : 'Delete'}</button>}
          <button className="btn-dark" onClick={onClose}>Close</button>
        </div>
        {original && <button type="button" disabled={!!busy} onClick={() => save('original')} className="mt-3 cursor-pointer text-xs text-[#A0A0A0] underline hover:text-white disabled:opacity-60">{busy === 'original' ? 'Downloading…' : 'Download original photo'}</button>}
      </div>
    </div>
  )
}

/** A card that stands in for a creation that is still being loaded: the Pictrify "P" on a dark tile, breathing gently (the same loading look as the template tiles). */
const Skeleton = () => (
  <div aria-hidden="true" className="relative grid aspect-[9/16] place-items-center overflow-hidden rounded-[20px] border border-white/10 bg-[#0A0809]">
    <img src="/images/features/logo-mark.svg" alt="" draggable="false" className="pimage-pulse w-[40%] max-w-[130px]" />
  </div>
)

export default function Creations() {
  const { creations, setCreations, signedIn, authReady, signOut, openLogin, user } = useStudio()
  const [open, setOpen] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [nextToken, setNextToken] = useState() // set while the backend has more (older) creations
  const [loadingMore, setLoadingMore] = useState(false)
  const [listLoading, setListLoading] = useState(true) // the first page of saved creations is on its way
  const list = creations.filter((c) => c.type === 'image' && c.image)
  // How many loading cards to show: as many creations as this user had the last time (remembered in this browser); one card the very first time - so a user with a single creation sees one card, and a user with none sees none.
  const countKey = `pictrify-creations-count-${user?.id || 'guest'}`
  const expected = useMemo(() => { try { const v = localStorage.getItem(countKey); return v === null ? 1 : Math.min(12, Math.max(0, Number(v) || 0)) } catch { return 1 } }, [countKey]) // read before the count is saved below
  useEffect(() => { if (!listLoading && !loadingMore) { try { localStorage.setItem(countKey, String(list.length)) } catch { /* storage blocked */ } } }, [list.length, listLoading, loadingMore, countKey])
  const placeholders = listLoading ? Math.max(0, expected - list.length) : loadingMore ? Math.max(1, Math.min(6, expected - list.length)) : 0
  // stored generations (DigitalOcean Spaces) come back after a refresh; a failed load keeps what is already on screen
  useEffect(() => {
    if (!signedIn) return
    const ctrl = new AbortController()
    setListLoading(true)
    listGenerations({ signal: ctrl.signal })
      .then(({ generations: gs, nextToken: more }) => { setLoadError(''); setNextToken(more); if (gs.length) setCreations((cur) => [...gs.filter((g) => g.result).map(toCreation), ...cur.filter((c) => !c.generationId)]) })
      .catch((e) => { if (e.status === 401) signOut(); else if (e.name !== 'AbortError') setLoadError('Could not load your saved creations.') })
      .finally(() => { if (!ctrl.signal.aborted) setListLoading(false) })
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
  const remove = async (c) => {
    await deleteGeneration(c.generationId) // removes the AI image from storage and the record
    deleteOriginal(c.generationId) // and the original photo kept in this browser (it throws when that fails: the popup shows the message)
    setCreations((cur) => cur.filter((x) => x.id !== c.id)); setOpen(null)
  }
  return (
    <main className="relative z-10 mx-auto w-full max-w-none grow px-4 pb-24 pt-8 min-[375px]:px-5 sm:px-6 md:px-6 md:pb-16 lg:px-8 xl:pb-20 xl:pt-12">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-[13px] font-semibold text-white"><SparkIcon className="size-3.5 text-[#FF55AA]" /><span>Your AI Library</span></div>
      <h1 className="mt-6 text-[32px] font-bold leading-[1.05] tracking-tight text-[#ffffff] sm:text-[44px] lg:text-[48px]"><span>My </span><span className="grad-text">Creations</span></h1>
      <p className="mt-3 max-w-[620px] text-base font-normal leading-relaxed text-[#A0A0A0] sm:mt-4">Your generated content, all in one place.</p>

      {loadError && <p role="alert" className="mt-4 text-sm text-red-300">{loadError}</p>}
      {!authReady ? null : !signedIn ? (
        <div className="mx-auto mt-8 flex w-full max-w-3xl flex-col items-center justify-center rounded-[28px] border border-white/5 bg-[#2B2B2B] p-8 text-center sm:mt-12 sm:p-16">
          <div className="mb-6 flex size-20 items-center justify-center rounded-full border border-white/10 bg-[#2B2B2B] shadow-inner sm:size-24">
            <svg className="size-8 text-[#A0A0A0] sm:size-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2 className="mb-2 text-2xl font-normal tracking-normal text-[#ffffff]/95 sm:text-[30px]">Sign in to view your creations</h2>
          <p className="mb-8 max-w-md text-sm font-normal text-[#A0A0A0] sm:text-base">Join our community of creators to store and manage your AI generations permanently.</p>
          <button type="button" onClick={openLogin} className="btn-grad">Sign in to Pictrify</button>
        </div>
      ) : (
        <>
          {list.length === 0 && !listLoading ? (
            <div className="mx-auto mt-8 max-w-3xl rounded-[28px] border border-white/5 bg-[#2B2B2B] px-6 py-16 text-center sm:mt-12">
              <p className="mb-1 text-lg font-medium">No images yet</p>
              <p className="mb-6 text-sm text-[#A0A0A0]">Create something and it will show up here.</p>
              <Link to="/explore" className="btn-grad">Start Creating</Link>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {list.map((c) => (
                <div key={c.id} onClick={() => setOpen(c)} className="group relative aspect-[9/16] animate-fade-in cursor-pointer overflow-hidden rounded-[20px] border border-white/5 bg-[#2B2B2B] transition-transform duration-300 hover:-translate-y-1">
                  {/* every generated picture fills the whole 9:16 card (cropped evenly, never stretched): results from the AI Photography API are almost 9:16, Cartoon results keep the photo's own shape */}
                  <PImage src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0809]/70 via-transparent to-transparent" />
                  <div className="absolute inset-x-2 bottom-2 flex items-end justify-between gap-1 text-xs">
                    <span className="min-w-0"><span className="block truncate font-semibold">{c.name}</span><span className="text-[#A0A0A0]">{c.date}</span></span>
                    <button aria-label="Download" onClick={(e) => { e.stopPropagation(); if (c.generationId) downloadGeneration(c.generationId).catch(() => {}) }} className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full bg-white/15 opacity-0 transition hover:bg-[#FF55AA] group-hover:opacity-100 max-md:opacity-100">⬇</button>
                  </div>
                </div>
              ))}
              {Array.from({ length: placeholders }, (_, i) => <Skeleton key={`sk${i}`} />)}
            </div>
          )}
        </>
      )}
      {nextToken && signedIn && <div className="mt-6 text-center"><button type="button" disabled={loadingMore} onClick={loadMore} className="btn-dark disabled:opacity-60">{loadingMore ? 'Loading\u2026' : 'Load more'}</button></div>}
      {open && <Compare item={open} onClose={() => setOpen(null)} onDelete={() => remove(open)} />}
    </main>
  )
}
