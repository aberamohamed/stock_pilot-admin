'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Send, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { UserSummary } from '@/lib/types';

const input =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none';
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'selected'>('all');
  const [picked, setPicked] = useState<Record<string, UserSummary>>({});
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const found = useQuery({
    queryKey: ['notification-users', search],
    queryFn: () => api.listUsers({ search: search || undefined, status: 'active', limit: 8 }),
    enabled: audience === 'selected' && search.trim().length >= 2,
  });
  const history = useQuery({ queryKey: ['broadcasts'], queryFn: api.listBroadcasts, refetchInterval: 15_000 });

  const chosen = Object.values(picked);
  const send = useMutation({
    mutationFn: () => api.sendBroadcast({ title: title.trim(), body: body.trim(), audience, userIds: chosen.map((u) => u.id) }),
    onSuccess: (r) => {
      setNotice({ ok: true, text: `Sent to ${r.recipients} user${r.recipients === 1 ? '' : 's'} (${r.devices} device${r.devices === 1 ? '' : 's'} get the push now).` });
      setTitle('');
      setBody('');
      setPicked({});
      void queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
    },
    onError: (e: Error) => setNotice({ ok: false, text: e.message }),
  });

  const ready = title.trim() && body.trim() && (audience === 'all' || chosen.length > 0);

  return (
    <div className="max-w-4xl space-y-8">
      <form
        className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (audience === 'all' && !confirm('Send this to every active user?')) return;
          setNotice(null);
          send.mutate();
        }}
      >
        <div>
          <label className={label} htmlFor="n-title">Title</label>
          <input id="n-title" className={input} maxLength={120} placeholder="e.g. New update available" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="n-body">Message</label>
          <textarea id="n-body" className={`${input} min-h-28`} maxLength={1000} placeholder="Update the app to get the latest features." value={body} onChange={(e) => setBody(e.target.value)} />
          <p className="mt-1 text-right text-xs text-slate-500">{body.length}/1000</p>
        </div>

        <div>
          <span className={label}>Send to</span>
          <div className="flex gap-2">
            {(['all', 'selected'] as const).map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => setAudience(a)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium ${audience === a ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200' : 'border-slate-700 text-slate-400 hover:text-white'}`}
              >
                {a === 'all' ? 'All users' : `Selected users${chosen.length ? ` (${chosen.length})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {audience === 'selected' && (
          <div className="space-y-3">
            {chosen.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chosen.map((u) => (
                  <span key={u.id} className="inline-flex items-center gap-1 rounded-full bg-slate-800 py-1 pl-3 pr-1 text-xs text-slate-200">
                    {u.name}
                    <button type="button" aria-label={`Remove ${u.name}`} className="rounded-full p-1 hover:bg-slate-700" onClick={() => setPicked((p) => Object.fromEntries(Object.entries(p).filter(([id]) => id !== u.id)))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input className={`${input} pl-9`} placeholder="Search users by name, phone or email (2+ letters)" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {search.trim().length >= 2 && (
              <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
                {found.isLoading && <li className="px-3 py-2 text-sm text-slate-500">Searching…</li>}
                {found.data?.data.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No active user found.</li>}
                {found.data?.data.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      disabled={Boolean(picked[u.id])}
                      onClick={() => setPicked((p) => ({ ...p, [u.id]: u }))}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                    >
                      <span>
                        {u.name} <span className="text-xs text-slate-500">{u.mobile ?? u.email ?? ''}</span>
                      </span>
                      <span className="text-xs text-slate-500">{picked[u.id] ? 'Added' : u.organizationName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {notice && <p className={`text-sm ${notice.ok ? 'text-emerald-400' : 'text-red-400'}`}>{notice.text}</p>}
        <button disabled={!ready || send.isPending} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
          <Send className="h-4 w-4" /> {send.isPending ? 'Sending…' : audience === 'all' ? 'Send to all users' : `Send to ${chosen.length || 'selected'} user${chosen.length === 1 ? '' : 's'}`}
        </button>
      </form>

      <section>
        <h2 className="mb-2 text-sm font-bold text-white">Sent notifications</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400">
              <tr><th className="p-2">When</th><th className="p-2">Message</th><th className="p-2">To</th><th className="p-2">Pushes</th></tr>
            </thead>
            <tbody>
              {(history.data ?? []).map((b) => (
                <tr key={b.id} className="border-t border-slate-800 align-top text-slate-200">
                  <td className="whitespace-nowrap p-2">{new Date(b.createdAt).toLocaleString()}<div className="text-xs text-slate-500">{b.createdBy}</div></td>
                  <td className="p-2"><div className="font-medium">{b.title}</div><div className="text-xs text-slate-400">{b.body}</div></td>
                  <td className="p-2">{b.audience === 'all' ? 'All users' : 'Selected'} · {b.recipientCount}</td>
                  <td className="p-2">
                    {b.status === 'sending' ? 'Sending…' : `${b.pushSent} of ${b.deviceCount} delivered`}
                    {b.status === 'sent' && b.pushFailed > 0 ? <div className="text-xs text-amber-400">{b.pushFailed} failed</div> : null}
                  </td>
                </tr>
              ))}
              {history.data && history.data.length === 0 && <tr><td className="p-3 text-slate-500" colSpan={4}>Nothing sent yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
