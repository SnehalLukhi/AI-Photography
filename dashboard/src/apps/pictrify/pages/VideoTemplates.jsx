import { useEffect, useState } from 'react'
import { useLoad } from '../../../core/hooks.js'
import { Badge, Confirm, Empty, ErrorNote, Field, Modal, PageHeader, Skeleton, Spinner, Toggle } from '../../../core/ui.jsx'
import { Icon } from '../../../core/icons.jsx'
import { useConsole } from '../../../core/store.jsx'

/**
 * Video templates: a reference video (the motion to copy) + prompt + the model's settings. In the app a user picks one and adds only a photo; the backend sends the
 * photo and this video to the model (default kling-motion-control: imageUrls = the person, videoUrl = the reference). Managed through /api/admin/video-templates.
 * A finished Video lab run can be turned into a template with its "Use as template" button (it leaves a draft here).
 */
export const DRAFT = 'console.videoTemplateDraft'
const BLANK = { title: '', description: '', videoUrl: '', previewUrl: '', model: 'kling-motion-control', videoKey: 'videoUrl', prompt: '', params: '{\n  "resolution": "720p"\n}', costCoins: '', active: true, sortOrder: 0 }

const toForm = (t) => ({ ...BLANK, ...t, previewUrl: t.previewUrl === t.videoUrl ? '' : t.previewUrl || '', params: JSON.stringify(t.params || {}, null, 2), costCoins: t.costCoins ?? '' })

export default function VideoTemplates({ api }) {
  const { toast } = useConsole()
  const { data, loading, error, reload } = useLoad(() => api.get('/api/admin/video-templates'), [api])
  const [form, setForm] = useState(null) // { id?, ...fields }
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const items = data?.templates || []

  const open = (f) => { setFormError(''); setForm(f) }
  const add = () => {
    let draft = null
    try { draft = JSON.parse(sessionStorage.getItem(DRAFT) || 'null') } catch { /* none */ }
    open(draft ? { ...BLANK, ...draft } : { ...BLANK })
  }
  useEffect(() => { try { if (sessionStorage.getItem(DRAFT)) { const d = JSON.parse(sessionStorage.getItem(DRAFT)); open({ ...BLANK, ...d }) } } catch { /* none */ } }, []) // arriving from the Video lab opens the form filled in

  const save = async () => {
    setBusy(true); setFormError('')
    try {
      let params
      try { params = form.params.trim() ? JSON.parse(form.params) : {} } catch (e) { throw new Error(`Settings JSON: ${e.message}`) }
      const body = { title: form.title, description: form.description, videoUrl: form.videoUrl.trim(), previewUrl: form.previewUrl.trim() || null, model: form.model.trim(), videoKey: form.videoKey.trim(), prompt: form.prompt, params, costCoins: form.costCoins === '' ? null : Number(form.costCoins), active: form.active, sortOrder: Number(form.sortOrder) || 0 }
      if (form.id) await api.put(`/api/admin/video-templates/${form.id}`, body); else await api.post('/api/admin/video-templates', body)
      try { sessionStorage.removeItem(DRAFT) } catch { /* private window */ }
      toast(form.id ? 'Template saved' : 'Template added'); setForm(null); reload()
    } catch (e) { setFormError(e.message) }
    setBusy(false)
  }
  const close = () => { if (busy) return; try { sessionStorage.removeItem(DRAFT) } catch { /* private window */ } setForm(null) }
  const toggle = async (t, active) => { try { await api.put(`/api/admin/video-templates/${t.id}`, { active }); reload() } catch (e) { toast(e.message, 'error') } }
  const remove = async () => {
    setBusy(true)
    try { await api.del(`/api/admin/video-templates/${del.id}`); toast('Template deleted'); setDel(null); reload() } catch (e) { toast(e.message, 'error') }
    setBusy(false)
  }

  return (
    <>
      <PageHeader title="Video templates" subtitle="A reference video with a prompt. In the app, users add only their photo and get a video that moves like the reference.">
        <button type="button" className="btn-primary" onClick={add}><Icon name="plus" className="size-4" />Add template</button>
      </PageHeader>
      <ErrorNote error={error} onRetry={reload} />
      {loading && !data ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-72 w-full" />)}</div>
        : items.length === 0 ? <div className="card animate-rise"><Empty icon="play" title="No video templates yet" text="Make a clip in the Video lab and press “Use as template”, or add one with a link to a short reference video." /></div>
        : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((t) => (
              <article key={t.id} className="card overflow-hidden animate-rise">
                <div className="aspect-[9/12] bg-ink"><video src={t.previewUrl} muted loop playsInline controls className="size-full object-contain" /></div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2"><p className="font-semibold text-white">{t.title}</p><Badge tone={t.active ? 'green' : 'gray'}>{t.active ? 'Live' : 'Hidden'}</Badge></div>
                  <p className="font-mono text-[11px] text-white/40">{t.model} · {t.cost} coins</p>
                  {t.prompt && <p className="line-clamp-2 text-xs text-white/45">“{t.prompt}”</p>}
                  <div className="flex items-center justify-between pt-1">
                    <Toggle checked={t.active} onChange={(v) => toggle(t, v)} label={`${t.title} is live`} />
                    <div className="flex gap-1.5"><button type="button" className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => open(toForm(t))}>Edit</button><button type="button" aria-label={`Delete ${t.title}`} className="btn-danger !p-2" onClick={() => setDel(t)}><Icon name="trash" className="size-4" /></button></div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

      <Modal open={!!form} onClose={close} title={form?.id ? 'Edit video template' : 'New video template'} subtitle="The reference video is copied into your storage, so its link keeps working."
        footer={<><button type="button" className="btn-ghost" disabled={busy} onClick={close}>Cancel</button><button type="button" className="btn-primary" disabled={busy || !form?.title?.trim() || !form?.videoUrl?.trim()} onClick={save}>{busy && <Spinner className="size-4" />}Save</button></>}>
        {form && (
          <div className="space-y-4">
            <Field label="Title"><input className="input" autoFocus value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Garba dance" /></Field>
            <Field label="Reference video" hint="A public link to a short clip with the motion to copy (a finished Video lab link works)."><input className="input font-mono text-xs" value={form.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://…/dance.mp4" /></Field>
            <Field label="Preview (optional)" hint="Shown to users instead of the reference video, e.g. a finished sample."><input className="input font-mono text-xs" value={form.previewUrl} onChange={(e) => set('previewUrl', e.target.value)} placeholder="https://…/sample.mp4" /></Field>
            <Field label="Prompt" hint="Sent with every photo."><textarea className="input min-h-[80px] resize-y" value={form.prompt} onChange={(e) => set('prompt', e.target.value)} placeholder="She dances with a warm festive glow" /></Field>
            <Field label="Description (shown in the app)"><input className="input" value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Model"><input className="input font-mono text-xs" value={form.model} onChange={(e) => set('model', e.target.value)} /></Field>
              <Field label="Video input name" hint="What the model calls the video input."><input className="input font-mono text-xs" value={form.videoKey} onChange={(e) => set('videoKey', e.target.value)} /></Field>
              <Field label="Price (coins)" hint="Empty = the default price."><input className="input" type="number" min="0" value={form.costCoins} onChange={(e) => set('costCoins', e.target.value)} /></Field>
              <Field label="Order"><input className="input" type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} /></Field>
            </div>
            <Field label="Model settings (JSON)" hint="Extra inputs such as resolution. Do not add prompt or imageUrls: they are filled in for you."><textarea className="input min-h-[80px] resize-y font-mono text-xs" value={form.params} onChange={(e) => set('params', e.target.value)} /></Field>
            <label className="flex items-center gap-3 text-sm text-white/70"><Toggle checked={form.active} onChange={(v) => set('active', v)} label="Live" />Live in the app</label>
            {formError && <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{formError}</p>}
          </div>
        )}
      </Modal>
      <Confirm open={!!del} busy={busy} onClose={() => setDel(null)} onConfirm={remove} title={`Delete “${del?.title}”?`} text="It disappears from the app. Videos users already made are kept." confirmLabel="Delete template" />
    </>
  )
}
