import { useState } from 'react'
import { useLoad } from '../../../core/hooks.js'
import { Avatar, Badge, Confirm, Empty, ErrorNote, Field, Modal, PageHeader, Skeleton, Spinner, Toggle } from '../../../core/ui.jsx'
import { Icon } from '../../../core/icons.jsx'
import { useConsole } from '../../../core/store.jsx'
import { date, relative } from '../../../core/format.js'

/** The people who can sign in to this dashboard. Created and managed through /api/admin/admins; passwords are never shown or stored in the browser. */
export default function Admins({ api }) {
  const { toast } = useConsole()
  const { data, loading, error, reload } = useLoad(() => api.get('/api/admin/admins'), [api])
  const [form, setForm] = useState(null) // { mode: 'new' | 'password', admin?, username, password }
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [show, setShow] = useState(false)

  const open = (f) => { setFormError(''); setShow(false); setForm(f) }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const generate = () => { const a = new Uint32Array(4); crypto.getRandomValues(a); set('password', [...a].map((n) => n.toString(36)).join('').slice(0, 16)); setShow(true) }
  const save = async () => {
    setBusy(true); setFormError('')
    try {
      if (form.mode === 'new') { await api.post('/api/admin/admins', { username: form.username, password: form.password }); toast(`Admin ${form.username.toLowerCase()} added`) }
      else { await api.put(`/api/admin/admins/${form.admin.id}`, { password: form.password }); toast(`New password set for ${form.admin.username}`) }
      setForm(null); reload()
    } catch (e) { setFormError(e.message) }
    setBusy(false)
  }
  const toggle = async (a, active) => {
    try { await api.put(`/api/admin/admins/${a.id}`, { active }); toast(active ? `${a.username} can sign in again` : `${a.username} is switched off`); reload() } catch (e) { toast(e.message, 'error') }
  }
  const remove = async () => {
    setBusy(true)
    try { await api.del(`/api/admin/admins/${del.id}`); toast(`${del.username} deleted`); setDel(null); reload() } catch (e) { toast(e.message, 'error') }
    setBusy(false)
  }
  const admins = data?.admins || []

  return (
    <>
      <PageHeader title="Admins" subtitle="People who can sign in to this dashboard.">
        <button type="button" className="btn-primary" onClick={() => open({ mode: 'new', username: '', password: '' })}><Icon name="plus" className="size-4" />Add admin</button>
      </PageHeader>
      <ErrorNote error={error} onRetry={reload} />
      <div className="card overflow-hidden animate-rise">
        {loading && !data ? <div className="space-y-2 p-4">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          : admins.length === 0 ? <Empty icon="users" title="No admins in the database" text="You are signed in with the server's own key or environment login. Add an admin to sign in with a user name and password." />
          : (
            <div className="overflow-x-auto"><table className="w-full min-w-[640px]">
              <thead className="border-b border-line"><tr><th className="th">Admin</th><th className="th">Status</th><th className="th">Added</th><th className="th">Last sign-in</th><th className="th text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-line">
                {admins.map((a) => {
                  const me = a.id === data.you
                  return (
                    <tr key={a.id} className="transition hover:bg-white/[0.03]">
                      <td className="td"><div className="flex items-center gap-3"><Avatar name={a.username} email={a.username} /><div><p className="font-medium text-white">{a.username}{me && <span className="ml-2 text-xs text-white/40">(you)</span>}</p></div></div></td>
                      <td className="td"><div className="flex items-center gap-2"><Toggle checked={a.active} disabled={me} onChange={(v) => toggle(a, v)} label={`${a.username} can sign in`} /><Badge tone={a.active ? 'green' : 'gray'}>{a.active ? 'Active' : 'Off'}</Badge></div></td>
                      <td className="td text-white/70">{date(a.created_at)}</td>
                      <td className="td text-white/70">{a.last_login_at ? relative(a.last_login_at) : <span className="text-white/30">never</span>}</td>
                      <td className="td"><div className="flex justify-end gap-1.5">
                        <button type="button" className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => open({ mode: 'password', admin: a, password: '' })}><Icon name="lock" className="size-3.5" />New password</button>
                        <button type="button" aria-label={`Delete ${a.username}`} disabled={me} title={me ? 'You cannot delete yourself' : ''} className="btn-danger !p-2" onClick={() => setDel(a)}><Icon name="trash" className="size-4" /></button>
                      </div></td>
                    </tr>)
                })}
              </tbody>
            </table></div>
          )}
      </div>

      <Modal open={!!form} onClose={() => !busy && setForm(null)} title={form?.mode === 'new' ? 'Add admin' : `New password for ${form?.admin?.username}`} subtitle={form?.mode === 'new' ? 'They sign in with this user name and password.' : 'Their current sessions end straight away.'}
        footer={<><button type="button" className="btn-ghost" disabled={busy} onClick={() => setForm(null)}>Cancel</button><button type="button" className="btn-primary" disabled={busy || (form?.mode === 'new' && form.username.trim().length < 3) || (form?.password || '').length < 10} onClick={save}>{busy && <Spinner className="size-4" />}{form?.mode === 'new' ? 'Add admin' : 'Set password'}</button></>}>
        {form && (
          <div className="space-y-4">
            {form.mode === 'new' && <Field label="User name" hint="3-40 characters: letters, digits, . _ -"><input className="input" autoFocus value={form.username} onChange={(e) => set('username', e.target.value)} autoComplete="off" placeholder="jane" /></Field>}
            <Field label="Password" hint="At least 10 characters. Share it with them safely; it cannot be shown again.">
              <div className="flex gap-2"><input className="input font-mono" type={show ? 'text' : 'password'} value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" autoFocus={form.mode === 'password'} />
                <button type="button" className="btn-ghost shrink-0" onClick={() => setShow((v) => !v)}>{show ? 'Hide' : 'Show'}</button>
                <button type="button" className="btn-ghost shrink-0" onClick={generate}>Generate</button></div>
            </Field>
            {formError && <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{formError}</p>}
          </div>
        )}
      </Modal>
      <Confirm open={!!del} busy={busy} onClose={() => setDel(null)} onConfirm={remove} title={`Delete ${del?.username}?`} text="They can no longer sign in, and their open sessions end now." confirmLabel="Delete admin" />
    </>
  )
}
