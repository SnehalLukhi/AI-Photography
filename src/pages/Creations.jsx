import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'
import PImage from '../components/PImage.jsx'
import { listGenerations, deleteGeneration, downloadGeneration } from '../lib/aiPhotography.js'
import { getOriginal, deleteOriginal } from '../lib/localPhotos.js'

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
    <div className="welcome-backdrop fixed inset-0 z-[200] grid place-items-center overflow-y-auto bg-[#000000]/50 px-4 py-8 backdrop-blur-[2px]" onClick={onClose}>
      <div className={`welcome-card w-full ${original ? 'max-w-3xl' : 'max-w-xs'} rounded-3xl bg-[#191919] p-6 text-center shadow-[0_18px_40px_rgba(0,0,0,0.14)]`} onClick={(e) => e.stopPropagation()}>
        <p className="mb-4 text-[24px] font-bold leading-tight text-[#FFFFFF]">{item.name}</p>
        <div className={original ? 'grid grid-cols-2 gap-3' : 'mx-auto max-w-[200px]'}>{/* no saved original (other browser / device): just the AI image */}
          {[...(original ? [['Original', original]] : []), ['AI generated', item.image]].map(([label, src]) => (
            <figure key={label}>
              <div className="aspect-[9/16] overflow-hidden rounded-2xl bg-[#191919]">{src ? <img src={src} alt={label} className="size-full object-cover object-center" /> : <div className="grid size-full place-items-center text-xs text-[#A1A1AA]">Not available</div>}</div>
              <figcaption className="mt-2 font-plexmono text-[11px] uppercase tracking-[0.08em] text-[#A1A1AA]">{label}</figcaption>
            </figure>
          ))}
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-[#D14343]">{error}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {item.image && item.generationId && <button type="button" disabled={!!busy} onClick={() => save('result')} className="btn-primary disabled:opacity-60">{busy === 'result' ? 'Downloading…' : 'Download'}</button>}
          {item.generationId && <button type="button" className="btn-dark disabled:opacity-60" disabled={!!busy} onClick={del}>{busy === 'delete' ? 'Deleting…' : 'Delete'}</button>}
          <button className="btn-dark" onClick={onClose}>Close</button>
        </div>
        {original && <button type="button" disabled={!!busy} onClick={() => save('original')} className="mt-3 cursor-pointer text-xs text-[#A1A1AA] underline hover:text-[#FFFFFF] disabled:opacity-60">{busy === 'original' ? 'Downloading…' : 'Download original photo'}</button>}
      </div>
    </div>
  )
}

/** A card that stands in for a creation that is still being loaded: the Pictrify "P" on a dark tile, breathing gently (the same loading look as the template tiles). */
const Skeleton = () => (
  <div aria-hidden="true" className="relative grid aspect-[9/16] place-items-center overflow-hidden rounded-2xl bg-[#2C2C2F]">
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
    <main className="mx-auto w-full max-w-none grow px-5 pb-8 pt-8 text-[#FFFFFF] sm:px-8 sm:pt-10 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-[#191919] px-6 py-8 max-md:!bg-transparent max-md:!p-0 sm:px-8">
        <div className="flex flex-col gap-3">
          <p className="eyebrow max-md:hidden">Your library</p>
          <h1 className="max-md:hidden text-[40px] font-bold leading-[1.05] tracking-tight sm:text-[56px]">My <span className="grad-text">Creations</span></h1>
          <p className="text-[16px] text-[#A1A1AA]">{signedIn && list.length ? `${list.length}${nextToken ? '+' : ''} ${list.length === 1 ? 'creation' : 'creations'}. Tap one to compare, download or delete.` : 'Everything you create, saved in one place.'}</p>
        </div>
        {signedIn && <Link to="/explore" className="btn-primary !px-6 !py-3 !text-[14px]">New creation</Link>}
      </div>

      {loadError && <p role="alert" className="mt-6 text-sm text-[#D14343]">{loadError}</p>}
      {!authReady ? null : !signedIn ? (
        <div className="mt-10 rounded-3xl bg-[#191919] px-6 py-16 text-center sm:py-20">
          <h2 className="text-[30px] font-bold leading-tight text-[#FFFFFF]">Sign in to see your creations</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-[#A1A1AA]">Your creations are stored on your account, so they are here on every device.</p>
          <button type="button" onClick={openLogin} className="btn-primary mt-7 !px-6 !py-3 !text-[15px]">Login</button>
        </div>
      ) : (
        <>
          {list.length === 0 && !listLoading ? (
            <div className="mt-10 rounded-3xl bg-[#191919] px-6 py-16 text-center max-md:hidden sm:py-20">
              <h2 className="text-[30px] font-bold leading-tight text-[#FFFFFF]">Nothing here yet</h2>
              <p className="mt-3 text-[15px] text-[#A1A1AA]">Create something and it will show up here.</p>
              <Link to="/explore" className="btn-primary mt-7 !px-6 !py-3 !text-[15px]">Browse looks</Link>
            </div>
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:gap-6 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {list.map((c) => (
                <div key={c.id} onClick={() => setOpen(c)} className="card-orbit group relative aspect-[9/16] animate-fade-in cursor-pointer overflow-hidden rounded-2xl bg-[#191919] transition-all duration-300">
                  {/* every generated picture fills the whole 9:16 card (cropped evenly, never stretched): results from the AI Photography API are almost 9:16, Cartoon results keep the photo's own shape */}
                  <PImage src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#000000]/75 via-transparent to-transparent" />
                  <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-1 text-xs text-white">
                    <span className="min-w-0"><span className="block truncate text-[13px] font-semibold">{c.name}</span><span className="font-plexmono text-[10px] text-white/75">{c.date}</span></span>
                    <button aria-label="Download" onClick={(e) => { e.stopPropagation(); if (c.generationId) downloadGeneration(c.generationId).catch(() => {}) }} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-[#1C1C1E]/95 text-[#FFFFFF] opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition hover:bg-[#2C2C2F] group-hover:opacity-100 max-md:opacity-100"><svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" /></svg></button>
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
