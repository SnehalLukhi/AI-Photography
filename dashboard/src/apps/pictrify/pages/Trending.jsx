import { useEffect, useMemo, useState } from 'react'
import { Badge, Empty, ErrorNote, Modal, PageHeader, SearchBox, Skeleton, Spinner, cx } from '../../../core/ui.jsx'
import { Icon } from '../../../core/icons.jsx'
import { useConsole } from '../../../core/store.jsx'
import { useLoad } from '../../../core/hooks.js'
import { imageUrl, tid, useCatalogue } from '../catalogue.js'

/**
 * The Trending list in the order the app shows it. Drag a row (or use the arrows) to reorder; "Save order" sends the whole list.
 * Templates that only exist as bundled folders in the app (not in the database) can be in the list too: they are kept and shown by id.
 */
export default function Trending({ api }) {
  const { toast } = useConsole()
  const cat = useCatalogue(api)
  const live = useLoad(async () => (await api.get('/api/trending')).templateIds, [api])
  const [order, setOrder] = useState(null) // ids, edited locally until saved
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState(null)
  const [saving, setSaving] = useState(false)
  const [picker, setPicker] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => { if (live.data) setOrder(live.data) }, [live.data])
  const templates = cat.data?.templates || []
  const byId = useMemo(() => Object.fromEntries(templates.map((t) => [tid(t), t])), [templates])
  const categories = useMemo(() => Object.fromEntries((cat.data?.categories || []).map((c) => [c.id, c])), [cat.data])
  const dirty = order && live.data && order.join('|') !== live.data.join('|')
  const loading = (cat.loading || live.loading) && !order

  const move = (from, to) => { if (to < 0 || to >= order.length || from === to) return; const n = [...order]; n.splice(to, 0, n.splice(from, 1)[0]); setOrder(n) }
  const save = async () => {
    setSaving(true)
    try { const out = await api.put('/api/admin/trending', { templateIds: order }); live.setData(out.templateIds); setOrder(out.templateIds); toast('Trending saved'); cat.reload() } catch (e) { toast(e.message, 'error') }
    setSaving(false)
  }
  const available = templates.filter((t) => t.active && !order?.includes(tid(t)) && (!q || `${t.name} ${t.id}`.toLowerCase().includes(q.toLowerCase())))

  return (
    <>
      <PageHeader title="Trending" subtitle="What visitors see first. A trending template also stays in its own category.">
        <button type="button" className="btn-ghost" onClick={() => setPicker(true)}><Icon name="plus" className="size-4" />Add templates</button>
        <button type="button" className="btn-primary" disabled={!dirty || saving} onClick={save}>{saving && <Spinner className="size-4" />}{dirty ? 'Save order' : 'Saved'}</button>
      </PageHeader>
      <ErrorNote error={cat.error || live.error} onRetry={() => { cat.reload(); live.reload() }} />

      {loading ? <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[72px] w-full !rounded-2xl" />)}</div>
        : !order?.length ? <Empty icon="flame" title="Nothing is trending" text="The app shows its built-in picks until you add templates here."><button type="button" className="btn-primary" onClick={() => setPicker(true)}>Add templates</button></Empty>
        : (
          <>
            {dirty && <p className="mb-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 animate-pop">You changed the order. It goes live when you press “Save order”.</p>}
            <ol className="space-y-2">
              {order.map((id, i) => {
                const t = byId[id]
                return (
                  <li key={id} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => { e.preventDefault(); setOver(i) }} onDragEnd={() => { setDrag(null); setOver(null) }} onDrop={() => { if (drag != null) move(drag, i); setDrag(null); setOver(null) }}
                    className={cx('card flex items-center gap-3 p-2.5 pr-3 transition animate-rise', drag === i && 'opacity-40', over === i && drag !== i && 'border-brand/70 bg-brand/10')}>
                    <span className="cursor-grab px-1 text-white/30 active:cursor-grabbing"><Icon name="grip" /></span>
                    <span className="w-7 text-center font-display text-lg font-bold text-white/30">{i + 1}</span>
                    {t ? <img src={imageUrl(api, t)} alt="" className="h-14 w-10 shrink-0 rounded-lg object-cover" /> : <span className="grid h-14 w-10 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-white/25"><Icon name="image" className="size-5" /></span>}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{t ? t.name : id.split('/')[1]}</p>
                      <p className="flex items-center gap-2 truncate text-xs text-white/40"><span className="truncate font-mono">{id}</span>{t ? <Badge>{categories[t.category_id]?.name || t.category_id}</Badge> : <Badge tone="amber">built into the app</Badge>}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)} className="cursor-pointer rounded-lg p-2 text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-25"><Icon name="up" className="size-4" /></button>
                      <button type="button" aria-label="Move down" disabled={i === order.length - 1} onClick={() => move(i, i + 1)} className="cursor-pointer rounded-lg p-2 text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-25"><Icon name="down" className="size-4" /></button>
                      <button type="button" aria-label="Remove from Trending" onClick={() => setOrder(order.filter((x) => x !== id))} className="cursor-pointer rounded-lg p-2 text-white/50 transition hover:bg-red-500/15 hover:text-red-300"><Icon name="x" className="size-4" /></button>
                    </div>
                  </li>
                )
              })}
            </ol>
          </>
        )}

      <Modal wide open={picker} onClose={() => setPicker(false)} title="Add to Trending" subtitle="Pick templates from any category. They stay in their own category too."
        footer={<button type="button" className="btn-primary" onClick={() => setPicker(false)}>Done</button>}>
        <SearchBox value={q} onChange={setQ} placeholder="Search templates" className="mb-4" />
        {available.length === 0 ? <p className="py-10 text-center text-sm text-white/40">{templates.length ? 'No more templates to add.' : 'There are no templates yet.'}</p> : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {available.slice(0, 80).map((t) => (
              <button key={t.id} type="button" onClick={() => setOrder([...(order || []), tid(t)])} className="group relative cursor-pointer overflow-hidden rounded-xl border border-line text-left transition hover:border-brand/70">
                <img src={imageUrl(api, t)} alt={t.name} loading="lazy" className="aspect-[9/13] w-full object-cover transition group-hover:scale-105" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-6"><span className="block truncate text-xs font-medium text-white">{t.name}</span><span className="block truncate text-[10px] text-white/50">{categories[t.category_id]?.name}</span></span>
                <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-brand text-white opacity-0 transition group-hover:opacity-100"><Icon name="plus" className="size-3.5" /></span>
              </button>
            ))}
          </div>
        )}
        {available.length > 80 && <p className="mt-3 text-center text-xs text-white/35">Showing 80 of {available.length}. Search to narrow it down.</p>}
      </Modal>
    </>
  )
}
