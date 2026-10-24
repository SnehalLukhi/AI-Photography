import { useState } from 'react'
import { Badge, Confirm, Empty, ErrorNote, Field, Modal, PageHeader, Skeleton, Spinner, Toggle } from '../../../core/ui.jsx'
import { Icon } from '../../../core/icons.jsx'
import { useConsole } from '../../../core/store.jsx'
import { slug } from '../../../core/format.js'
import { FLOW_LABEL, FLOW_TONE, useCatalogue } from '../catalogue.js'

const FLOW_HELP = {
  photography: 'AI Photography: every template needs a title and description prompt.',
  cartoon: 'Cartoon Yourself: the template id is the cartoon style.',
  beard: 'AI Beard Styling: uses the template picture as the reference.',
  hairstyle: 'Hairstyle Changer: every template needs its hair style value.',
}
const blank = { id: '', name: '', flow: 'photography', parent_id: '', sort_order: 0, hide_from_all: false }

export default function Categories({ api }) {
  const { toast, go } = useConsole()
  const { data, loading, error, reload } = useCatalogue(api)
  const [form, setForm] = useState(null) // null = closed; { ...fields, isNew }
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  const open = (c) => { setFormError(''); setForm(c ? { ...c, parent_id: c.parent_id || '', isNew: false } : { ...blank, isNew: true }) }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const save = async () => {
    setBusy(true); setFormError('')
    const body = { id: form.id, name: form.name, flow: form.flow, parent_id: form.parent_id || null, sort_order: Number(form.sort_order) || 0, hide_from_all: !!form.hide_from_all }
    try {
      if (form.isNew) await api.post('/api/admin/template-categories', body)
      else await api.put(`/api/admin/template-categories/${encodeURIComponent(form.id)}`, body)
      toast(form.isNew ? 'Category added' : 'Category saved'); setForm(null); reload()
    } catch (e) { setFormError(e.message) }
    setBusy(false)
  }
  const remove = async () => {
    setBusy(true)
    try { const out = await api.del(`/api/admin/template-categories/${encodeURIComponent(del.id)}`, { cascade: del.templates ? 'true' : undefined }); toast(`Deleted ${del.name}${out.deletedTemplates ? ` and ${out.deletedTemplates} template(s)` : ''}`); setDel(null); reload() } catch (e) { toast(e.message, 'error') }
    setBusy(false)
  }
  const cats = data?.categories || []

  return (
    <>
      <PageHeader title="Categories" subtitle="The groups templates live in. Each one runs on one generation flow.">
        <button type="button" className="btn-primary" onClick={() => open(null)}><Icon name="plus" className="size-4" />Add category</button>
      </PageHeader>
      <ErrorNote error={error} onRetry={reload} />
      {loading && !data ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-36 w-full !rounded-2xl" />)}</div>
        : cats.length === 0 ? <Empty icon="folder" title="No categories yet" text="Create a category first, then add templates to it."><button type="button" className="btn-primary" onClick={() => open(null)}>Add category</button></Empty>
        : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cats.map((c) => (
              <div key={c.id} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-white/20 animate-rise">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="truncate text-lg font-bold text-white">{c.name}</h3><p className="truncate font-mono text-xs text-white/35">{c.id}</p></div>
                  <Badge tone={FLOW_TONE[c.flow]}>{FLOW_LABEL[c.flow] || c.flow}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.parent_id && <Badge>in {c.parent_id}</Badge>}{c.hide_from_all && <Badge tone="amber">hidden from All</Badge>}<Badge>order {c.sort_order}</Badge>
                </div>
                <div className="mt-auto flex items-center justify-between pt-5">
                  <button type="button" onClick={() => go('pictrify', 'templates')} className="cursor-pointer text-sm text-white/55 hover:text-white"><span className="font-display text-xl font-bold text-white">{c.templates}</span> template{c.templates === 1 ? '' : 's'}</button>
                  <div className="flex gap-1.5">
                    <button type="button" aria-label={`Edit ${c.name}`} className="btn-ghost !p-2" onClick={() => open(c)}><Icon name="edit" className="size-4" /></button>
                    <button type="button" aria-label={`Delete ${c.name}`} className="btn-danger !p-2" onClick={() => setDel(c)}><Icon name="trash" className="size-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      <Modal open={!!form} onClose={() => !busy && setForm(null)} title={form?.isNew ? 'Add category' : 'Edit category'}
        footer={<><button type="button" className="btn-ghost" disabled={busy} onClick={() => setForm(null)}>Cancel</button><button type="button" className="btn-primary" disabled={busy || !form?.name || !form?.id} onClick={save}>{busy && <Spinner className="size-4" />}{form?.isNew ? 'Add category' : 'Save changes'}</button></>}>
        {form && (
          <div className="space-y-4">
            <Field label="Name"><input className="input" autoFocus value={form.name} onChange={(e) => { set('name', e.target.value); if (form.isNew && form.id === slug(form.name)) set('id', slug(e.target.value)); else if (form.isNew && !form.id) set('id', slug(e.target.value)) }} placeholder="Christmas" /></Field>
            <Field label="Id" hint={form.isNew ? 'Used in links and the API. Cannot be changed later.' : 'The id cannot be changed.'}><input className="input font-mono" value={form.id} disabled={!form.isNew} onChange={(e) => set('id', slug(e.target.value))} placeholder="christmas" /></Field>
            <Field label="Generation flow" hint={FLOW_HELP[form.flow]}>
              <select className="input" value={form.flow} onChange={(e) => set('flow', e.target.value)}>{(data?.flows || Object.keys(FLOW_LABEL)).map((f) => <option key={f} value={f}>{FLOW_LABEL[f] || f}</option>)}</select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Parent category" hint="Optional, to group sub-categories."><select className="input" value={form.parent_id} onChange={(e) => set('parent_id', e.target.value)}><option value="">None</option>{cats.filter((c) => c.id !== form.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              <Field label="Order" hint="Smaller shows first."><input className="input" type="number" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} /></Field>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-white/[0.03] px-4 py-3"><div><p className="text-sm font-medium text-white">Hide from "All"</p><p className="text-xs text-white/40">Only shows inside its own category.</p></div><Toggle checked={!!form.hide_from_all} onChange={(v) => set('hide_from_all', v)} label="Hide from All" /></div>
            {formError && <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{formError}</p>}
          </div>
        )}
      </Modal>

      <Confirm open={!!del} busy={busy} onClose={() => setDel(null)} onConfirm={remove} title={`Delete "${del?.name}"?`} confirmLabel={del?.templates ? `Delete with ${del.templates} template(s)` : 'Delete category'}
        text={del?.templates ? `This category has ${del.templates} template(s). Deleting it deletes them too, and they disappear from the app. This cannot be undone.` : 'This category is empty. It will be removed from the app.'} />
    </>
  )
}
