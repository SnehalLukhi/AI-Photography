import { useEffect, useState } from 'react'
import { useLoad } from '../../../core/hooks.js'
import { Avatar, Badge, Empty, ErrorNote, PageHeader, Pagination, SearchBox, Skeleton, useDebounced } from '../../../core/ui.jsx'
import { date, relative } from '../../../core/format.js'

const PAGE = 20
export const planTone = (plan) => (!plan ? 'gray' : /year/i.test(plan) ? 'pink' : /month/i.test(plan) ? 'violet' : 'blue')
const via = { google: ['Google', 'blue'], apple: ['Apple', 'gray'], email: ['Email', 'gray'] }

export default function Users({ api }) {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const search = useDebounced(q)
  useEffect(() => setPage(1), [search])
  const { data, loading, error, reload } = useLoad(() => api.get('/api/admin/users', { q: search, page, limit: PAGE }), [api, search, page])

  return (
    <>
      <PageHeader title="Users" subtitle={data ? `${data.total.toLocaleString()} ${search ? 'found' : 'people have joined'}` : 'People who joined the app'}>
        <SearchBox value={q} onChange={setQ} placeholder="Search name or email" className="w-72 max-w-full" />
      </PageHeader>
      <ErrorNote error={error} onRetry={reload} />
      <div className="card overflow-hidden animate-rise">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-line"><tr><th className="th">User</th><th className="th">Plan</th><th className="th">Coins</th><th className="th">Images</th><th className="th">Sign-in</th><th className="th">Joined</th></tr></thead>
            <tbody className="divide-y divide-line">
              {loading && !data ? Array.from({ length: 6 }, (_, i) => <tr key={i}><td className="td" colSpan={6}><Skeleton className="h-9 w-full" /></td></tr>)
                : (data?.users || []).map((u) => (
                  <tr key={u.id} className="transition hover:bg-white/[0.03]">
                    <td className="td"><div className="flex items-center gap-3"><Avatar name={u.name} email={u.email} /><div className="min-w-0"><p className="truncate font-medium text-white">{u.name || '—'}</p><p className="truncate text-xs text-white/45">{u.email}</p></div></div></td>
                    <td className="td">{u.plan ? <div><Badge tone={planTone(u.plan)}>{u.plan}</Badge><p className="mt-1 text-[11px] text-white/35">{u.plan_status === 'cancelled' ? 'ends' : 'renews'} {date(u.plan_ends)}</p></div> : <span className="text-white/30">Free</span>}</td>
                    <td className="td tabular-nums text-white/80">{u.coins.toLocaleString()}</td>
                    <td className="td tabular-nums text-white/80">{u.generations}</td>
                    <td className="td"><Badge tone={via[u.sign_in][1]}>{via[u.sign_in][0]}</Badge></td>
                    <td className="td"><p className="text-white/80">{date(u.joined_at)}</p><p className="text-[11px] text-white/35">{relative(u.joined_at)}</p></td>
                  </tr>))}
            </tbody>
          </table>
        </div>
        {!loading && data && data.users.length === 0 && <Empty icon="users" title={search ? 'No one matches' : 'No users yet'} text={search ? 'Try another name or email.' : 'People appear here when they sign in.'} />}
        {data && <Pagination page={page} pageSize={PAGE} total={data.total} onChange={setPage} />}
      </div>
    </>
  )
}
