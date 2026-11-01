'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SalesAgent, SalesAgentInput } from '@/lib/types';

const input =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none';
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400';
const btn = 'rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50';
const money = (n: number) => `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB`;
const day = (s: string | null) => (s ? new Date(s).toLocaleDateString() : '—');

const empty: SalesAgentInput = { name: '', phone: '', commissionPercent: 10, commissionMonths: 12, notes: '', isActive: true };

function AgentForm({ initial, onSaved, onCancel, agentId }: { initial: SalesAgentInput; agentId?: string; onSaved: () => void; onCancel: () => void }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () => (agentId ? api.updateSalesAgent(agentId, form) : api.createSalesAgent(form)),
    onSuccess: onSaved,
    onError: (e: Error) => setError(e.message),
  });
  const set = <K extends keyof SalesAgentInput>(k: K, v: SalesAgentInput[K]) => setForm({ ...form, [k]: v });
  return (
    <form
      className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        save.mutate();
      }}
    >
      <div><span className={label}>Name</span><input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
      <div><span className={label}>Phone</span><input className={input} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0911…" required /></div>
      <div><span className={label}>Commission %</span><input className={input} type="number" min={0} max={100} step="0.5" value={form.commissionPercent} onChange={(e) => set('commissionPercent', Number(e.target.value))} /></div>
      <div><span className={label}>Months after first payment</span><input className={input} type="number" min={0} max={120} value={form.commissionMonths} onChange={(e) => set('commissionMonths', Number(e.target.value))} /></div>
      <div className="sm:col-span-2"><span className={label}>Notes</span><input className={input} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
      <label className="flex items-center gap-2 text-sm text-slate-200 sm:col-span-2">
        <input type="checkbox" className="h-4 w-4 accent-indigo-500" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
        Active (inactive agents take no new referrals but keep what they earned)
      </label>
      {error ? <p className="text-sm text-red-400 sm:col-span-2">{error}</p> : null}
      <div className="flex gap-2 sm:col-span-2">
        <button className={`${btn} bg-indigo-600 text-white`} disabled={save.isPending}>{agentId ? 'Save' : 'Create agent'}</button>
        <button type="button" className={`${btn} bg-slate-800 text-slate-200`} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function AgentDetail({ agent, onBack }: { agent: SalesAgent; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { data } = useQuery({ queryKey: ['sales-agent', agent.id, from, to], queryFn: () => api.getSalesAgent(agent.id, from || undefined, to || undefined) });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['sales-agent', agent.id] });
    void queryClient.invalidateQueries({ queryKey: ['sales-agents'] });
  };
  const pay = useMutation({
    mutationFn: (body: { entryIds?: string[]; upTo?: string }) => api.payAgentCommission(agent.id, body),
    onSuccess: (r) => {
      setPicked([]);
      setMessage(`Marked ${r.count} entries paid (${money(r.total)}).`);
      refresh();
    },
  });
  const reissue = useMutation({
    mutationFn: () => api.reissueAgentCode(agent.id),
    onSuccess: (r) => {
      setMessage(`New code: ${r.referenceCode}. Pharmacies already referred keep this agent.`);
      refresh();
    },
  });

  const commissions = data?.commissions ?? [];
  const unpaid = commissions.filter((c) => c.status === 'earned');
  const current = data?.agent ?? agent;

  const exportCsv = () => {
    const rows = [['Date', 'Pharmacy', 'Kind', 'Paid amount', 'Rate %', 'Commission', 'Status']].concat(
      commissions.map((c) => [day(c.earnedAt), c.organizationName, c.kind, String(c.baseAmount), String(c.rate), String(c.amount), c.status]),
    );
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `commission-${current.referenceCode}.csv`;
    a.click();
  };

  if (editing) {
    return (
      <AgentForm
        agentId={agent.id}
        initial={{ name: current.name, phone: current.phone, commissionPercent: current.commissionPercent, commissionMonths: current.commissionMonths, notes: current.notes, isActive: current.isActive }}
        onSaved={() => { setEditing(false); refresh(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <button className="text-sm text-indigo-400" onClick={onBack}>← All agents</button>
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <h2 className="text-xl font-bold text-white">{current.name} {current.isActive ? null : <span className="text-xs text-slate-500">(inactive)</span>}</h2>
          <p className="text-sm text-slate-400">{current.phone} · {current.commissionPercent}% for {current.commissionMonths} months</p>
          <p className="mt-2 text-sm text-slate-300">Reference code <span className="rounded bg-slate-950 px-2 py-1 font-mono text-lg tracking-widest text-emerald-400">{current.referenceCode}</span></p>
        </div>
        <div className="flex gap-2">
          <button className={`${btn} bg-slate-800 text-slate-200`} onClick={() => setEditing(true)}>Edit</button>
          <button className={`${btn} bg-slate-800 text-slate-200`} disabled={reissue.isPending} onClick={() => confirm('Issue a new code? The old one stops working for new sign-ups.') && reissue.mutate()}>New code</button>
        </div>
      </div>
      {message ? <p className="text-sm text-emerald-400">{message}</p> : null}

      <section>
        <h3 className="mb-2 text-sm font-bold text-white">Pharmacies referred ({data?.organizations.length ?? 0})</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400"><tr><th className="p-2">Pharmacy</th><th className="p-2">Registered</th><th className="p-2">Status</th><th className="p-2">Paid</th><th className="p-2">Commission</th></tr></thead>
            <tbody>
              {(data?.organizations ?? []).map((o) => (
                <tr key={o.id} className="border-t border-slate-800 text-slate-200">
                  <td className="p-2">{o.name}<div className="text-xs text-slate-500">{o.phone}</div></td>
                  <td className="p-2">{day(o.registeredAt)}</td>
                  <td className="p-2">{o.activated ? 'Paying' : 'Not paid yet'}</td>
                  <td className="p-2">{money(o.paidTotal)}</td>
                  <td className="p-2">{money(o.commission)}</td>
                </tr>
              ))}
              {data && data.organizations.length === 0 ? <tr><td className="p-3 text-slate-500" colSpan={5}>No pharmacies yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-sm font-bold text-white">Commission</h3>
          <div className="flex flex-wrap items-end gap-2">
            <div><span className={label}>From</span><input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><span className={label}>To</span><input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <button className={`${btn} bg-slate-800 text-slate-200`} onClick={exportCsv} disabled={!commissions.length}>Export CSV</button>
          </div>
        </div>
        <div className="mb-2 flex flex-wrap gap-2 text-sm text-slate-300">
          <span>Unpaid in view: <strong>{money(unpaid.reduce((s, c) => s + c.amount, 0))}</strong></span>
          <button className={`${btn} bg-emerald-600 text-white`} disabled={!picked.length || pay.isPending} onClick={() => pay.mutate({ entryIds: picked })}>Mark selected paid ({picked.length})</button>
          <button className={`${btn} bg-slate-800 text-slate-200`} disabled={!unpaid.length || pay.isPending} onClick={() => setPicked(unpaid.map((c) => c.id))}>Select all unpaid</button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400"><tr><th className="p-2" /><th className="p-2">Date</th><th className="p-2">Pharmacy</th><th className="p-2">Kind</th><th className="p-2">Paid</th><th className="p-2">Commission</th><th className="p-2">Status</th></tr></thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} className="border-t border-slate-800 text-slate-200">
                  <td className="p-2">
                    {c.status === 'earned' ? (
                      <input type="checkbox" className="accent-indigo-500" checked={picked.includes(c.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, c.id] : picked.filter((id) => id !== c.id))} />
                    ) : null}
                  </td>
                  <td className="p-2">{day(c.earnedAt)}</td>
                  <td className="p-2">{c.organizationName}</td>
                  <td className="p-2 capitalize">{c.kind}</td>
                  <td className="p-2">{money(c.baseAmount)} × {c.rate}%</td>
                  <td className="p-2 font-semibold">{money(c.amount)}</td>
                  <td className="p-2">{c.status === 'paid' ? `Paid ${day(c.paidAt)}` : 'Unpaid'}</td>
                </tr>
              ))}
              {data && commissions.length === 0 ? <tr><td className="p-3 text-slate-500" colSpan={7}>No commission in this range.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function SalesAgentsPage() {
  const queryClient = useQueryClient();
  const { data: agents, isLoading, error } = useQuery({ queryKey: ['sales-agents'], queryFn: api.listSalesAgents });
  const [adding, setAdding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = agents?.find((a) => a.id === selectedId);

  if (selected) return <AgentDetail agent={selected} onBack={() => setSelectedId(null)} />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-400">
          Each agent gets a 6-digit code to give to pharmacies. A pharmacy that enters it when registering is linked to the agent for good (only you can change it).
          The agent earns a percent of every approved payment: the first payment always, later payments for the months you set.
        </p>
        <button className={`${btn} bg-indigo-600 text-white`} onClick={() => setAdding(true)}>Add agent</button>
      </div>

      {adding ? (
        <AgentForm initial={empty} onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); void queryClient.invalidateQueries({ queryKey: ['sales-agents'] }); }} />
      ) : null}

      {isLoading ? <p className="text-slate-400">Loading…</p> : null}
      {error ? <p className="text-red-400">{(error as Error).message}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-xs uppercase text-slate-400">
            <tr><th className="p-2">Agent</th><th className="p-2">Code</th><th className="p-2">Rate</th><th className="p-2">Referred</th><th className="p-2">Paying</th><th className="p-2">Unpaid</th><th className="p-2">Paid</th></tr>
          </thead>
          <tbody>
            {(agents ?? []).map((a) => (
              <tr key={a.id} className="cursor-pointer border-t border-slate-800 text-slate-200 hover:bg-slate-900" onClick={() => setSelectedId(a.id)}>
                <td className="p-2">{a.name} {a.isActive ? null : <span className="text-xs text-slate-500">(inactive)</span>}<div className="text-xs text-slate-500">{a.phone}</div></td>
                <td className="p-2 font-mono tracking-widest text-emerald-400">{a.referenceCode}</td>
                <td className="p-2">{a.commissionPercent}% / {a.commissionMonths}mo</td>
                <td className="p-2">{a.referred}</td>
                <td className="p-2">{a.paying}</td>
                <td className="p-2 font-semibold">{money(a.unpaid ?? 0)}</td>
                <td className="p-2">{money(a.paid ?? 0)}</td>
              </tr>
            ))}
            {agents && agents.length === 0 ? <tr><td className="p-3 text-slate-500" colSpan={7}>No agents yet. Add the first one.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
