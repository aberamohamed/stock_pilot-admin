'use client';

import { Fragment, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Pagination } from '@/components/pagination';

const input = 'rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none';

/** Who did what in the admin panel: every change, every refused attempt and every sign-in. Super admin only. */
export default function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [admin, setAdmin] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const admins = useQuery({ queryKey: ['admins'], queryFn: api.listAdmins });
  // The server searches, filters and pages the log.
  const log = useQuery({
    queryKey: ['audit-log', debounced, admin, from, to, page, pageSize],
    queryFn: () => api.auditLog({ search: debounced, admin, from, to, limit: pageSize, offset: (page - 1) * pageSize }),
    placeholderData: (previous) => previous,
  });
  const items = log.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input className={`${input} w-full pl-9`} placeholder="Search what was done, who, or an id…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className={input} value={admin} onChange={(e) => { setAdmin(e.target.value); setPage(1); }} aria-label="Admin">
          <option value="">All admins</option>
          {(admins.data ?? []).map((a) => <option key={a.id} value={a.email}>{a.name} ({a.email})</option>)}
        </select>
        <label className="flex items-center gap-2 text-xs text-slate-400">From <input type="date" className={input} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
        <label className="flex items-center gap-2 text-xs text-slate-400">To <input type="date" className={input} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
      </div>

      {log.isError ? <p className="text-sm text-red-400">{(log.error as Error).message}</p> : null}

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase text-slate-400">
            <tr><th className="p-2">When</th><th className="p-2">Admin</th><th className="p-2">What</th><th className="p-2">Result</th><th className="p-2" /></tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <Fragment key={e.id}>
                <tr className="border-t border-slate-800 text-slate-200">
                  <td className="whitespace-nowrap p-2">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="p-2"><div>{e.adminName ?? e.adminEmail}</div><div className="text-xs text-slate-500">{e.adminEmail}</div></td>
                  <td className="p-2"><div className="font-medium">{e.summary}</div><div className="text-xs text-slate-500">{e.method} {e.path}</div></td>
                  <td className="p-2">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${e.status != null && e.status >= 400 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{e.status ?? '—'}</span>
                  </td>
                  <td className="p-2 text-right">
                    {e.details || e.ip ? <button className="text-xs text-indigo-400" onClick={() => setOpen(open === e.id ? null : e.id)}>{open === e.id ? 'Hide' : 'Details'}</button> : null}
                  </td>
                </tr>
                {open === e.id ? (
                  <tr className="border-t border-slate-800 bg-slate-950/60">
                    <td className="p-3 text-xs text-slate-300" colSpan={5}>
                      {e.entityId ? <div>Record: <span className="font-mono">{e.entityId}</span></div> : null}
                      {e.ip ? <div>From: {e.ip}</div> : null}
                      {e.details ? <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-slate-400">{JSON.stringify(e.details, null, 2)}</pre> : null}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
            {!log.isLoading && items.length === 0 ? <tr><td className="p-4 text-center text-slate-500" colSpan={5}>Nothing logged for these filters.</td></tr> : null}
          </tbody>
        </table>
        <Pagination total={log.data?.total ?? 0} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
      </div>
    </div>
  );
}
