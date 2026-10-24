import { useEffect, useState } from 'react'
import { useLoad } from '../../../core/hooks.js'
import { Avatar, Badge, Empty, ErrorNote, PageHeader, Pagination, SearchBox, Skeleton, Tabs, useDebounced } from '../../../core/ui.jsx'
import { Icon } from '../../../core/icons.jsx'
import { useConsole } from '../../../core/store.jsx'
import { date, money, relative } from '../../../core/format.js'
import { planTone } from './Users.jsx'

const PAGE = 20
const STATUS = {
  active: ['Active', 'green'], authenticated: ['Starting', 'green'], pending: ['Payment due', 'amber'], halted: ['Payment failed', 'red'],
  cancelled: ['Cancelled', 'gray'], completed: ['Completed', 'gray'], paused: ['Paused', 'amber'], created: ['Not paid', 'gray'],
}
const TABS = [{ id: 'current', label: 'Current plans' }, { id: 'active', label: 'Active' }, { id: 'cancelled', label: 'Cancelled' }, { id: 'halted', label: 'Payment failed' }, { id: '', label: 'All' }]

export default function Subscriptions({ api }) {
  const { toast } = useConsole()
  const [status, setStatus] = useState('current')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounced(q)
  useEffect(() => setPage(1), [search, status])
  const { data, loading, error, reload } = useLoad(() => api.get('/api/admin/subscriptions', { status, q: search, page, limit: PAGE }), [api, status, search, page])
  const copy = (text) => navigator.clipboard?.writeText(text).then(() => toast('Copied'), () => {})

  return (
    <>
      <PageHeader title="Subscriptions" subtitle="Who pays, for which plan, and until when.">
        <SearchBox value={q} onChange={setQ} placeholder="Search name or email" className="w-72 max-w-full" />
      </PageHeader>
      <div className="mb-4 animate-rise"><Tabs tabs={TABS} value={status} onChange={setStatus} /></div>
      <ErrorNote error={error} onRetry={reload} />
      <div className="card overflow-hidden animate-rise">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-line"><tr><th className="th">Subscriber</th><th className="th">Plan</th><th className="th">Status</th><th className="th">Payments</th><th className="th">Paid in total</th><th className="th">Started</th><th className="th">Renews / ends</th><th className="th">Reference</th></tr></thead>
            <tbody className="divide-y divide-line">
              {loading && !data ? Array.from({ length: 6 }, (_, i) => <tr key={i}><td className="td" colSpan={8}><Skeleton className="h-9 w-full" /></td></tr>)
                : (data?.subscriptions || []).map((s) => {
                  const [label, tone] = STATUS[s.status] || [s.status, 'gray']
                  return (
                    <tr key={s.id} className="transition hover:bg-white/[0.03]">
                      <td className="td"><div className="flex items-center gap-3"><Avatar name={s.name} email={s.email} /><div className="min-w-0"><p className="truncate font-medium text-white">{s.name || '—'}</p><p className="truncate text-xs text-white/45">{s.email}</p></div></div></td>
                      <td className="td"><Badge tone={planTone(s.plan)}>{s.plan}</Badge></td>
                      <td className="td"><Badge tone={tone}>{label}</Badge>{s.cancel_requested && s.status !== 'cancelled' && <p className="mt-1 text-[11px] text-amber-300/80">cancels at period end</p>}</td>
                      <td className="td tabular-nums text-white/80">{s.payments}</td>
                      <td className="td tabular-nums font-medium text-white">{s.currency ? money(s.paid_total, s.currency) : '—'}</td>
                      <td className="td"><p className="text-white/80">{date(s.started_at)}</p><p className="text-[11px] text-white/35">{relative(s.started_at)}</p></td>
                      <td className="td">{s.renews_at ? <><p className="text-white/80">{date(s.renews_at)}</p><p className="text-[11px] text-emerald-300/70">renews {relative(s.renews_at)}</p></> : s.ends_at ? <><p className="text-white/80">{date(s.ends_at)}</p><p className="text-[11px] text-white/35">{new Date(s.ends_at) > new Date() ? `ends ${relative(s.ends_at)}` : 'ended'}</p></> : <span className="text-white/30">—</span>}</td>
                      <td className="td"><button type="button" title="Copy" onClick={() => copy(s.id)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-white/50 transition hover:text-white"><Icon name="copy" className="size-3" />{s.id.slice(0, 14)}</button></td>
                    </tr>)
                })}
            </tbody>
          </table>
        </div>
        {!loading && data && data.subscriptions.length === 0 && <Empty icon="card" title="No subscriptions here" text={search ? 'Nothing matches this search.' : 'Try another tab, or wait for the first subscriber.'} />}
        {data && <Pagination page={page} pageSize={PAGE} total={data.total} onChange={setPage} />}
      </div>
    </>
  )
}
