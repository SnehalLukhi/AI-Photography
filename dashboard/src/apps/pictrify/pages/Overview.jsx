import { useLoad } from '../../../core/hooks.js'
import { AreaChart, Donut, chartColor } from '../../../core/charts.jsx'
import { ErrorNote, PageHeader, Stat, Skeleton } from '../../../core/ui.jsx'
import { money } from '../../../core/format.js'
import { useConsole } from '../../../core/store.jsx'

export default function Overview({ api }) {
  const { go } = useConsole()
  const { data: s, loading, error, reload } = useLoad(() => api.get('/api/admin/stats'), [api])
  const chart = (s?.signups || []).map((d) => ({ label: new Date(d.day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), full: new Date(d.day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }), value: d.count }))
  const plans = (s?.subscribers.byPlan || []).map((p) => ({ label: p.name, value: p.count }))
  const growth = s && s.users.month ? Math.round((s.users.week / s.users.month) * 100) : 0

  return (
    <>
      <PageHeader title="Overview" subtitle="Who is joining, who is paying, and what is in the catalogue." />
      <ErrorNote error={error} onRetry={reload} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat loading={loading} label="Total users" icon="users" tone="violet" value={s?.users.total} hint={s && `+${s.users.today} today · +${s.users.week} this week`} />
        <Stat loading={loading} label="Joined (30 days)" icon="flame" tone="pink" value={s?.users.month} hint={s && `${growth}% of them in the last 7 days`} />
        <Stat loading={loading} label="Active subscribers" icon="card" tone="green" value={s?.subscribers.total} hint={s && (s.subscribers.byPlan.map((p) => `${p.count} ${p.name.replace(' Premium', '')}`).join(' · ') || 'No paying subscribers yet')} />
        <Stat loading={loading} label="Images generated" icon="image" tone="amber" value={s?.generations.total} hint={s && `${s.generations.today} today`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2 animate-rise">
          <div className="mb-3 flex items-end justify-between"><div><h2 className="text-lg font-bold text-white">New users</h2><p className="text-sm text-white/45">Last 30 days</p></div>{s && <p className="font-display text-2xl font-bold text-white">{s.users.month.toLocaleString()}</p>}</div>
          {loading ? <Skeleton className="h-[220px] w-full" /> : <AreaChart data={chart} />}
        </div>
        <div className="card flex flex-col p-5 animate-rise">
          <h2 className="text-lg font-bold text-white">Subscribers by plan</h2><p className="mb-3 text-sm text-white/45">Plans running now</p>
          {loading ? <Skeleton className="mx-auto size-40 rounded-full" /> : plans.length === 0 ? <p className="my-auto py-10 text-center text-sm text-white/40">Nobody is subscribed yet.</p> : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              <Donut data={plans} center={{ value: s.subscribers.total, label: 'subscribers' }} />
              <ul className="w-full space-y-2 text-sm">{plans.map((p, i) => <li key={p.label} className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: chartColor(i) }} /><span className="flex-1 text-white/70">{p.label}</span><span className="font-semibold text-white">{p.value}</span></li>)}</ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="card p-5 animate-rise">
          <h2 className="text-lg font-bold text-white">Revenue</h2><p className="mb-4 text-sm text-white/45">Paid, last 30 days</p>
          {loading ? <Skeleton className="h-8 w-40" /> : s.revenue.length === 0 ? <p className="text-sm text-white/40">No payments yet.</p> : s.revenue.map((r) => <p key={r.currency} className="mb-1 flex items-baseline gap-2"><span className="font-display text-3xl font-bold text-white">{money(r.total, r.currency)}</span><span className="text-xs text-white/40">{r.payments} payment{r.payments === 1 ? '' : 's'}</span></p>)}
        </div>
        <div className="card p-5 animate-rise">
          <h2 className="text-lg font-bold text-white">Catalogue</h2><p className="mb-4 text-sm text-white/45">What visitors can pick</p>
          {loading ? <Skeleton className="h-8 w-40" /> : (
            <div className="grid grid-cols-3 gap-3 text-center">
              {[['Categories', s.catalogue.categories, 'categories'], ['Templates', s.catalogue.templates, 'templates'], ['Trending', s.catalogue.trending, 'trending']].map(([l, v, page]) => (
                <button key={l} type="button" onClick={() => go('pictrify', page)} className="cursor-pointer rounded-xl border border-line bg-white/[0.03] py-3 transition hover:bg-white/[0.08]"><p className="font-display text-2xl font-bold text-white">{v}</p><p className="text-xs text-white/45">{l}</p></button>
              ))}
            </div>
          )}
        </div>
        <div className="card p-5 animate-rise md:col-span-2 xl:col-span-1">
          <h2 className="text-lg font-bold text-white">Quick actions</h2><p className="mb-4 text-sm text-white/45">Jump straight in</p>
          <div className="grid gap-2">
            <button type="button" className="btn-primary" onClick={() => go('pictrify', 'templates')}>Add a template</button>
            <button type="button" className="btn-ghost" onClick={() => go('pictrify', 'trending')}>Arrange Trending</button>
            <button type="button" className="btn-ghost" onClick={() => go('pictrify', 'subscriptions')}>See subscribers</button>
          </div>
        </div>
      </div>
    </>
  )
}
