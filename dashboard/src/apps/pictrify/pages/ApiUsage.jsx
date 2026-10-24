import { useEffect, useState } from 'react'
import { useLoad } from '../../../core/hooks.js'
import { AreaChart, chartColor } from '../../../core/charts.jsx'
import { Avatar, Badge, Empty, ErrorNote, Modal, PageHeader, Pagination, Skeleton, Stat, Tabs } from '../../../core/ui.jsx'
import { Icon } from '../../../core/icons.jsx'
import { useConsole } from '../../../core/store.jsx'
import { date, relative } from '../../../core/format.js'

const PAGE = 15
const STATUS = { succeeded: ['Done', 'green'], failed: ['Failed', 'red'], processing: ['Processing', 'amber'] }
const secs = (ms) => (ms == null ? '—' : ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`)
const usd = (n) => `$${(Number(n) || 0).toFixed(n >= 1 ? 2 : 3)}`

export default function ApiUsage({ api }) {
  const { toast } = useConsole()
  const [days, setDays] = useState(30)
  const [which, setWhich] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [shot, setShot] = useState(null)
  useEffect(() => setPage(1), [days, which, status])
  const { data: d, loading, error, reload } = useLoad(() => api.get('/api/admin/api-usage', { days, api: which, status, page, limit: PAGE }), [api, days, which, status, page])
  const s = d?.summary
  const chart = (d?.daily || []).map((x) => ({ label: new Date(x.day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), full: `${new Date(x.day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${x.failed} failed`, value: x.calls }))
  const maxCalls = Math.max(1, ...(d?.by_api || []).map((a) => a.calls))
  const copy = (t) => navigator.clipboard?.writeText(t).then(() => toast('Copied'), () => {})

  return (
    <>
      <PageHeader title="API usage" subtitle="Every call made to the image provider (AILabTools): what ran, for whom, how it ended and what it produced.">
        <Tabs value={days} onChange={setDays} tabs={[{ id: 7, label: '7 days' }, { id: 30, label: '30 days' }, { id: 90, label: '90 days' }]} />
      </PageHeader>
      <ErrorNote error={error} onRetry={reload} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat loading={loading && !d} label="API calls" icon="bolt" tone="violet" value={s?.calls} hint={s && `${s.succeeded} done · ${s.failed} failed${s.processing ? ` · ${s.processing} processing` : ''}`} />
        <Stat loading={loading && !d} label="Success rate" icon="check" tone="green" value={s?.success_rate ?? 0} format={(n) => (s?.success_rate == null ? '—' : `${Math.round(n)}%`)} hint={s && (s.failed ? `${s.failed} refunded to users` : 'No failures')} />
        <Stat loading={loading && !d} label="Average time" icon="refresh" tone="blue" value={s?.avg_ms} format={(n) => (s?.avg_ms ? secs(Math.round(n)) : '—')} hint="For a finished image" />
        <Stat loading={loading && !d} label="Coins charged" icon="coin" tone="amber" value={s?.coins} hint={s && (s.cost_per_call_set ? `≈ ${usd(s.estimated_cost_usd)} provider cost (estimate)` : 'Set AILAB_COST_PER_CALL to see an estimated provider cost')} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2 animate-rise">
          <h2 className="text-lg font-bold text-white">Calls per day</h2><p className="mb-3 text-sm text-white/45">Last {days} days</p>
          {loading && !d ? <Skeleton className="h-[220px] w-full" /> : <AreaChart data={chart} />}
        </div>
        <div className="card p-5 animate-rise">
          <h2 className="text-lg font-bold text-white">By API</h2><p className="mb-4 text-sm text-white/45">Which tool people use</p>
          {loading && !d ? <Skeleton className="h-32 w-full" /> : d.by_api.length === 0 ? <p className="py-8 text-center text-sm text-white/40">No calls in this period.</p> : (
            <ul className="space-y-4">
              {d.by_api.map((a, i) => (
                <li key={a.api}>
                  <button type="button" onClick={() => setWhich(which === a.api ? '' : a.api)} className="w-full cursor-pointer text-left">
                    <div className="mb-1.5 flex items-baseline justify-between"><span className={`text-sm font-medium ${which === a.api ? 'text-white' : 'text-white/80'}`}>{a.name}</span><span className="text-sm font-semibold text-white">{a.calls}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]"><div className="h-full rounded-full transition-all" style={{ width: `${(a.calls / maxCalls) * 100}%`, background: chartColor(i) }} /></div>
                    <p className="mt-1 text-[11px] text-white/40">{a.succeeded} done · {a.failed} failed · avg {secs(a.avg_ms)} · {a.coins} coins</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {d?.errors.length > 0 && (
            <div className="mt-5 border-t border-line pt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/35">Top errors</p>
              <ul className="space-y-1.5">{d.errors.map((e) => <li key={e.error_code} className="flex items-center justify-between gap-2 text-xs"><span className="truncate font-mono text-red-300/80">{e.error_code}</span><span className="text-white/60">{e.count}</span></li>)}</ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3 animate-rise">
        <div><h2 className="text-lg font-bold text-white">Latest calls</h2><p className="text-sm text-white/45">{which ? `${d?.apis.find((a) => a.id === which)?.name} only · ` : ''}newest first</p></div>
        <div className="flex flex-wrap gap-2">
          <Tabs value={status} onChange={setStatus} tabs={[{ id: '', label: 'All' }, { id: 'succeeded', label: 'Done' }, { id: 'failed', label: 'Failed' }, { id: 'processing', label: 'Processing' }]} />
          {which && <button type="button" className="btn-ghost !py-1.5" onClick={() => setWhich('')}><Icon name="x" className="size-4" />Clear API filter</button>}
        </div>
      </div>
      <div className="card overflow-hidden animate-rise">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-line"><tr><th className="th">Result</th><th className="th">API / template</th><th className="th">User</th><th className="th">Status</th><th className="th">Time</th><th className="th">Coins</th><th className="th">When</th><th className="th">Provider task</th></tr></thead>
            <tbody className="divide-y divide-line">
              {loading && !d ? Array.from({ length: 5 }, (_, i) => <tr key={i}><td className="td" colSpan={8}><Skeleton className="h-12 w-full" /></td></tr>)
                : (d?.calls.items || []).map((c) => {
                  const [label, tone] = STATUS[c.status] || [c.status, 'gray']
                  return (
                    <tr key={c.id} className="transition hover:bg-white/[0.03]">
                      <td className="td">{c.result_url ? <button type="button" onClick={() => setShot(c)} className="block cursor-zoom-in overflow-hidden rounded-lg ring-1 ring-white/10 transition hover:ring-brand/70"><img src={c.result_url} alt="Result" loading="lazy" className="h-14 w-10 object-cover" /></button> : <span className="grid h-14 w-10 place-items-center rounded-lg bg-white/[0.04] text-white/20"><Icon name="image" className="size-4" /></span>}</td>
                      <td className="td"><p className="font-medium text-white">{c.api_name}</p><p className="max-w-[200px] truncate text-xs text-white/45">{c.template || '—'}</p></td>
                      <td className="td"><div className="flex items-center gap-2.5"><Avatar name={c.user} email={c.email} size={28} /><div className="min-w-0"><p className="max-w-[160px] truncate text-sm text-white/85">{c.user || '—'}</p><p className="max-w-[160px] truncate text-[11px] text-white/40">{c.email}</p></div></div></td>
                      <td className="td"><Badge tone={tone}>{label}</Badge>{c.error_code && <p className="mt-1 max-w-[170px] truncate font-mono text-[10px] text-red-300/70" title={c.error_code}>{c.error_code}</p>}</td>
                      <td className="td tabular-nums text-white/75">{secs(c.duration_ms)}</td>
                      <td className="td tabular-nums text-white/75">{c.coins || <span className="text-white/30">refunded</span>}</td>
                      <td className="td"><p className="text-white/80">{date(c.at)}</p><p className="text-[11px] text-white/35">{relative(c.at)}</p></td>
                      <td className="td">{c.task_id ? <button type="button" title="Copy" onClick={() => copy(c.task_id)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-white/50 hover:text-white"><Icon name="copy" className="size-3" />{c.task_id.slice(0, 16)}</button> : <span className="text-white/25">—</span>}</td>
                    </tr>)
                })}
            </tbody>
          </table>
        </div>
        {!loading && d && d.calls.items.length === 0 && <Empty icon="bolt" title="No calls yet" text="Calls appear here as soon as someone generates an image." />}
        {d && <Pagination page={page} pageSize={PAGE} total={d.calls.total} onChange={setPage} />}
      </div>
      <p className="mt-3 text-xs text-white/30">The provider does not report tokens or credits per call, so usage is shown as calls, outcomes, time and coins charged. Failed calls are refunded to the user and cost nothing.</p>

      <Modal open={!!shot} onClose={() => setShot(null)} title={shot?.template || 'Result'} subtitle={shot && `${shot.api_name} · ${shot.email || ''}`}
        footer={<>{shot && <a className="btn-ghost" href={shot.result_url} target="_blank" rel="noreferrer">Open full size</a>}<button type="button" className="btn-primary" onClick={() => setShot(null)}>Close</button></>}>
        {shot && <img src={shot.result_url} alt="Generated result" className="mx-auto max-h-[65vh] rounded-xl" />}
      </Modal>
    </>
  )
}
