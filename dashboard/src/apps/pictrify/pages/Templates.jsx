import { useMemo, useRef, useState } from 'react'
import { Badge, Confirm, Empty, ErrorNote, Field, Modal, PageHeader, SearchBox, Skeleton, Spinner, Tabs, Toggle, cx } from '../../../core/ui.jsx'
import { Icon } from '../../../core/icons.jsx'
import { useConsole } from '../../../core/store.jsx'
import { slug } from '../../../core/format.js'
import { FLOW_LABEL, FLOW_TONE, imageUrl, tid, useCatalogue } from '../catalogue.js'

const RATIOS = ['9:16', '3:4', '1:1', '4:3', '16:9']
const blank = { id: '', category_id: '', name: '', preview_url: '', style_title_prompt: '', style_desc_prompt: '', api_value: '', aspect_ratio: '9:16', cost_coins: '', gender: '', sort_order: 0, active: true, trending: false }

export default function Templates({ api }) {
  const { toast } = useConsole()
  const { data, loading, error, reload, setData } = useCatalogue(api)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [view, setView] = useState('all') // all | trending | hidden
  const [form, setForm] = useState(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [del, setDel] = useState(null)
  const [starring, setStarring] = useState('')
  const input = useRef(null)

  const cats = data?.categories || []
  const catById = useMemo(() => Object.fromEntries(cats.map((c) => [c.id, c])), [cats])
  const all = data?.templates || []
  const shown = all.filter((t) => (!cat || t.category_id === cat) && (view === 'all' || (view === 'trending' ? t.trending : !t.active)) && (!q || `${t.name} ${t.id}`.toLowerCase().includes(q.toLowerCase())))
  const counts = { all: all.length, trending: all.filter((t) => t.trending).length, hidden: all.filter((t) => !t.active).length }

  const star = async (t) => {
    setStarring(tid(t))
    try {
      if (t.trending) await api.del('/api/admin/trending', { templateId: tid(t) }); else await api.post('/api/admin/trending', { templateId: tid(t) })
      toast(t.trending ? `${t.name} removed from Trending` : `${t.name} is now Trending`)
      reload()
    } catch (e) { toast(e.message, 'error') }
    setStarring('')
  }

  const openForm = (t) => {
    setFormError(''); setFile(null); setPreview('')
    setForm(t ? { ...blank, ...Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v ?? ''])), isNew: false } : { ...blank, category_id: cat || cats[0]?.id || '', isNew: true })
  }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const pick = (f) => {
    if (!f) return
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setFormError('Choose a JPG, PNG or WebP picture.'); return }
    setFormError(''); setFile(f); setPreview(URL.createObjectURL(f))
  }
  const flow = catById[form?.category_id]?.flow
  const suggestId = (name, category) => (flow === 'cartoon' ? form.id : slug(`${category}-${name}`))

  const save = async () => {
    setBusy(true); setFormError('')
    const text = (v) => (v === '' || v == null ? null : v)
    const fields = {
      id: form.id, category_id: form.category_id, name: form.name, style_title_prompt: text(form.style_title_prompt), style_desc_prompt: text(form.style_desc_prompt), api_value: text(form.api_value),
      aspect_ratio: form.aspect_ratio, gender: text(form.gender), sort_order: Number(form.sort_order) || 0, active: !!form.active, ...(form.cost_coins !== '' ? { cost_coins: Number(form.cost_coins) } : {}),
    }
    try {
      let body
      if (file) {
        body = new FormData()
        Object.entries(fields).forEach(([k, v]) => { if (v !== null && v !== undefined) body.append(k, String(v)) })
        body.append('image', file)
      } else body = { ...fields, preview_url: form.preview_url }
      const wasTrending = !form.isNew && all.find((t) => t.id === form.id)?.trending
      if (form.isNew) await api.post('/api/admin/templates', body)
      else await api.put(`/api/admin/templates/${encodeURIComponent(form.id)}`, body)
      if (!!form.trending !== !!wasTrending) {
        const id = `${form.category_id}/${form.id}`
        if (form.trending) await api.post('/api/admin/trending', { templateId: id }); else await api.del('/api/admin/trending', { templateId: id })
      }
      toast(form.isNew ? 'Template added' : 'Template saved'); setForm(null); reload()
    } catch (e) { setFormError(e.message) }
    setBusy(false)
  }

  const remove = async () => {
    setBusy(true)
    try { await api.del(`/api/admin/templates/${encodeURIComponent(del.id)}`); toast(`${del.name} deleted`); setData({ ...data, templates: all.filter((t) => t.id !== del.id) }); setDel(null) } catch (e) { toast(e.message, 'error') }
    setBusy(false)
  }

  const showPrompts = flow === 'photography' // the prompt fields are shown for this flow but are optional
  const needHair = flow === 'hairstyle'
  const canSave = form && form.id && form.name && form.category_id && (file || form.preview_url) && (!needHair || form.api_value)

  return (
    <>
      <PageHeader title="Templates" subtitle="Add, change or remove the styles people can choose. The star puts a template in Trending too.">
        <button type="button" className="btn-primary" disabled={!cats.length} title={cats.length ? '' : 'Create a category first'} onClick={() => openForm(null)}><Icon name="plus" className="size-4" />Add template</button>
      </PageHeader>
      <ErrorNote error={error} onRetry={reload} />

      <div className="mb-5 flex flex-wrap items-center gap-3 animate-rise">
        <Tabs value={view} onChange={setView} tabs={[{ id: 'all', label: 'All', count: counts.all }, { id: 'trending', label: 'Trending', count: counts.trending }, { id: 'hidden', label: 'Hidden', count: counts.hidden }]} />
        <select className="input !w-auto" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category"><option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.templates})</option>)}</select>
        <SearchBox value={q} onChange={setQ} placeholder="Search templates" className="w-64 max-w-full flex-1 sm:flex-none" />
      </div>

      {loading && !data ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-[9/14] w-full !rounded-2xl" />)}</div>
        : shown.length === 0 ? <Empty icon="image" title={all.length ? 'No templates match' : 'No templates yet'} text={all.length ? 'Change the filters or the search.' : 'Add the first one — upload a picture, name it and pick a category.'}>{!all.length && cats.length > 0 && <button type="button" className="btn-primary" onClick={() => openForm(null)}>Add template</button>}</Empty>
        : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {shown.map((t) => (
              <div key={t.id} className={cx('group relative overflow-hidden rounded-2xl border bg-panel transition hover:-translate-y-1 hover:shadow-2xl animate-rise', t.active ? 'border-line hover:border-white/25' : 'border-dashed border-white/15 opacity-70')}>
                <div className="relative aspect-[9/13] overflow-hidden bg-ink">
                  <img src={imageUrl(api, t)} alt={t.name} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" onError={(e) => { e.currentTarget.style.opacity = 0.15 }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                  <button type="button" aria-label={t.trending ? 'Remove from Trending' : 'Add to Trending'} title={t.trending ? 'In Trending — click to remove' : 'Add to Trending'} disabled={starring === tid(t)} onClick={() => star(t)}
                    className={cx('absolute right-2 top-2 grid size-9 cursor-pointer place-items-center rounded-full backdrop-blur transition active:scale-90', t.trending ? 'bg-gradient-to-br from-amber-400 to-pink text-white shadow-lg' : 'bg-black/50 text-white/70 hover:bg-black/70 hover:text-white')}>
                    {starring === tid(t) ? <Spinner className="size-4" /> : <Icon name={t.trending ? 'star-fill' : 'star'} className="size-[18px]" />}
                  </button>
                  {!t.active && <span className="absolute left-2 top-2"><Badge tone="amber">Hidden</Badge></span>}
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="truncate text-sm font-semibold text-white">{t.name}</p>
                    <div className="mt-1 flex items-center gap-1.5"><Badge tone={FLOW_TONE[catById[t.category_id]?.flow]}>{catById[t.category_id]?.name || t.category_id}</Badge></div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1 px-3 py-2">
                  <p className="truncate font-mono text-[11px] text-white/35" title={t.id}>{t.id}</p>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" aria-label={`Edit ${t.name}`} onClick={() => openForm(t)} className="cursor-pointer rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"><Icon name="edit" className="size-4" /></button>
                    <button type="button" aria-label={`Delete ${t.name}`} onClick={() => setDel(t)} className="cursor-pointer rounded-lg p-1.5 text-white/50 transition hover:bg-red-500/15 hover:text-red-300"><Icon name="trash" className="size-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      <Modal side open={!!form} onClose={() => !busy && setForm(null)} title={form?.isNew ? 'Add template' : 'Edit template'} subtitle={form?.isNew ? 'It shows in the app as soon as you save.' : form?.id}
        footer={<><button type="button" className="btn-ghost" disabled={busy} onClick={() => setForm(null)}>Cancel</button><button type="button" className="btn-primary" disabled={busy || !canSave} onClick={save}>{busy && <Spinner className="size-4" />}{form?.isNew ? 'Add template' : 'Save changes'}</button></>}>
        {form && (
          <div className="space-y-5">
            <div>
              <span className="label">Picture</span>
              <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]) }} onClick={() => input.current?.click()}
                className="group relative grid cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-white/15 bg-ink/50 transition hover:border-brand/60" style={{ aspectRatio: '16/9' }}>
                {(preview || form.preview_url) ? <img src={preview || imageUrl(api, form)} alt="" className="absolute inset-0 size-full object-contain" /> : null}
                <div className={cx('relative text-center text-sm text-white/50', (preview || form.preview_url) && 'rounded-xl bg-black/60 px-4 py-2 opacity-0 transition group-hover:opacity-100')}><Icon name="upload" className="mx-auto mb-1 size-6" />Drop a picture or click to choose</div>
                <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files[0])} />
              </div>
              <input className="input mt-2" value={file ? '' : form.preview_url} disabled={!!file} onChange={(e) => set('preview_url', e.target.value)} placeholder={file ? file.name : 'or paste a picture link (https://… or /images/…)'} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Category"><select className="input" value={form.category_id} disabled={!form.isNew} onChange={(e) => { set('category_id', e.target.value); if (form.isNew && form.name) set('id', slug(`${e.target.value}-${form.name}`)) }}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              <Field label="Name"><input className="input" value={form.name} onChange={(e) => { set('name', e.target.value); if (form.isNew && flow !== 'cartoon') set('id', suggestId(e.target.value, form.category_id)) }} placeholder="Vintage Sari" /></Field>
            </div>
            <Field label="Id" hint={flow === 'cartoon' ? 'For Cartoon this must be a supported cartoon style.' : form.isNew ? 'Unique across all templates. Cannot be changed later.' : 'The id cannot be changed.'}><input className="input font-mono" value={form.id} disabled={!form.isNew} onChange={(e) => set('id', e.target.value.trim())} placeholder="old-money-vintage-sari" /></Field>

            {showPrompts && <>
              <Field label="Title prompt" hint="Sent to the AI as the style title."><input className="input" value={form.style_title_prompt} onChange={(e) => set('style_title_prompt', e.target.value)} placeholder="Golden hour portrait" /></Field>
              <Field label="Description prompt" hint="Describe the look, light and mood."><textarea className="input min-h-[96px] resize-y" value={form.style_desc_prompt} onChange={(e) => set('style_desc_prompt', e.target.value)} placeholder="Warm sunset light, soft film grain…" /></Field>
            </>}
            {(needHair || flow === 'cartoon' || flow === 'beard') && <Field label={needHair ? 'Hair style value' : 'Provider value (optional)'} hint={needHair ? 'The Hairstyle Changer hair_style, e.g. BuzzCut.' : 'Only when it differs from the id.'}><input className="input" value={form.api_value} onChange={(e) => set('api_value', e.target.value)} /></Field>}

            <div className="grid grid-cols-3 gap-4">
              <Field label="Shape"><select className="input" value={form.aspect_ratio} onChange={(e) => set('aspect_ratio', e.target.value)}>{RATIOS.map((r) => <option key={r}>{r}</option>)}</select></Field>
              <Field label="Coins" hint="Blank = default"><input className="input" type="number" min="0" value={form.cost_coins} onChange={(e) => set('cost_coins', e.target.value)} /></Field>
              <Field label="Order" hint="Smaller first"><input className="input" type="number" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} /></Field>
            </div>

            <div className="divide-y divide-line rounded-xl border border-line bg-white/[0.03]">
              <div className="flex items-center justify-between px-4 py-3"><div><p className="flex items-center gap-1.5 text-sm font-medium text-white"><Icon name="flame" className="size-4 text-amber-300" />Trending</p><p className="text-xs text-white/40">Also show it in Trending. It stays in its own category.</p></div><Toggle checked={!!form.trending} onChange={(v) => set('trending', v)} label="Trending" /></div>
              <div className="flex items-center justify-between px-4 py-3"><div><p className="text-sm font-medium text-white">Visible in the app</p><p className="text-xs text-white/40">Turn off to hide it without deleting.</p></div><Toggle checked={!!form.active} onChange={(v) => set('active', v)} label="Visible" /></div>
            </div>
            {formError && <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{formError}</p>}
          </div>
        )}
      </Modal>

      <Confirm open={!!del} busy={busy} onClose={() => setDel(null)} onConfirm={remove} title={`Delete "${del?.name}"?`} text="It is removed from the app and from Trending. This cannot be undone." confirmLabel="Delete template" />
    </>
  )
}
