'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';

const input =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none';
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400';
const btn = 'rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50';
const day = (s: string | null) => (s ? new Date(s).toLocaleString() : 'Never');

export default function AdminsPage() {
  const queryClient = useQueryClient();
  const { admin } = useAuth();
  const { data: admins = [], isLoading } = useQuery({ queryKey: ['admins'], queryFn: api.listAdmins });
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admins'] });

  const create = useMutation({
    mutationFn: () => api.createAdmin(form),
    onSuccess: () => {
      setForm({ name: '', email: '', password: '' });
      setMessage('Admin added. Share the password with them securely.');
      void refresh();
    },
    onError: (e: Error) => setError(e.message),
  });
  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string; isActive?: boolean; password?: string }) => api.updateAdmin(id, body),
    onSuccess: () => void refresh(),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admins</h1>
        <p className="text-sm text-slate-400">People who can sign in to this admin panel. Every admin has full access.</p>
      </div>

      <form
        className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setMessage(null);
          create.mutate();
        }}
      >
        <div><span className={label}>Name</span><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div><span className={label}>Email</span><input className={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
        <div><span className={label}>Password (10+ characters)</span><input className={input} type="password" minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
        <div className="sm:col-span-3"><button className={`${btn} bg-indigo-600 text-white`} disabled={create.isPending}>Add admin</button></div>
      </form>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase text-slate-400">
            <tr><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Last sign-in</th><th className="p-2">Status</th><th className="p-2" /></tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-t border-slate-800 text-slate-200">
                <td className="p-2">{a.name}</td>
                <td className="p-2">{a.email}</td>
                <td className="p-2">{day(a.lastLoginAt)}</td>
                <td className="p-2">{a.isActive ? 'Active' : 'Deactivated'}</td>
                <td className="flex gap-2 p-2">
                  <button
                    className={`${btn} bg-slate-800 text-slate-200`}
                    onClick={() => {
                      const password = prompt(`New password for ${a.email} (10+ characters)`);
                      if (password) update.mutate({ id: a.id, password });
                    }}
                  >
                    Reset password
                  </button>
                  {a.email.toLowerCase() === admin?.email.toLowerCase() ? null : (
                    <button className={`${btn} bg-slate-800 text-slate-200`} onClick={() => update.mutate({ id: a.id, isActive: !a.isActive })}>
                      {a.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && admins.length === 0 ? <tr><td className="p-3 text-slate-500" colSpan={5}>No admins.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
