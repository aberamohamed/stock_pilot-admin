'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const input =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none';

export default function PricingPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['billing-settings'], queryFn: api.getBillingSettings });
  const history = useQuery({ queryKey: ['billing-settings', 'history'], queryFn: api.billingSettingsHistory }).data ?? [];
  // Edits live in `draft`; until there are any the form shows what is saved.
  const [draft, setDraft] = useState<{ branchPrice: string; extraUserPrice: string; usersPerBranch: string; periodDays: string; firstPaymentBonusDays: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = draft ?? {
    branchPrice: data ? String(data.branchPrice) : '',
    extraUserPrice: data ? String(data.extraUserPrice) : '',
    usersPerBranch: data ? String(data.usersPerBranch) : '',
    periodDays: data ? String(data.periodDays) : '',
    firstPaymentBonusDays: data ? String(data.firstPaymentBonusDays) : '',
  };
  const edit = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false);
    setDraft({ ...form, [field]: e.target.value });
  };
  const { branchPrice, extraUserPrice, usersPerBranch, periodDays, firstPaymentBonusDays } = form;

  const save = useMutation({
    mutationFn: () =>
      api.updateBillingSettings({
        branchPrice: Number(branchPrice),
        extraUserPrice: Number(extraUserPrice),
        usersPerBranch: Number(usersPerBranch),
        periodDays: Number(periodDays),
        firstPaymentBonusDays: Number(firstPaymentBonusDays),
      }),
    onSuccess: () => {
      setDraft(null);
      setSaved(true);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['billing-settings'] });
    },
    onError: (e: Error) => {
      setSaved(false);
      setError(e.message);
    },
  });

  const valid = Number(branchPrice) > 0 && Number(extraUserPrice) > 0 && Number.isInteger(Number(usersPerBranch)) && Number(usersPerBranch) >= 1 &&
    Number.isInteger(Number(periodDays)) && Number(periodDays) >= 1 && Number.isInteger(Number(firstPaymentBonusDays)) && Number(firstPaymentBonusDays) >= 0;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pricing</h1>
        <p className="text-sm text-slate-400">
          Organizations pay per period for the seats they have. A change applies to payments made from now on; payments
          already submitted keep the price, users and days they were made at.
        </p>
      </div>

      <form
        className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          save.mutate();
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Branch price (ETB)</label>
          <input className={input} type="number" min={1} step="any" value={branchPrice} onChange={edit('branchPrice')} disabled={isLoading} required />
          <p className="mt-1 text-xs text-slate-500">The first payment that activates an organization, and each extra branch.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Users included per branch</label>
          <input className={input} type="number" min={1} max={100} step={1} value={usersPerBranch} onChange={edit('usersPerBranch')} disabled={isLoading} required />
          <p className="mt-1 text-xs text-slate-500">Staff accounts a branch comes with, not counting the owner. 1 means just its branch admin.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Extra user price (ETB)</label>
          <input className={input} type="number" min={1} step="any" value={extraUserPrice} onChange={edit('extraUserPrice')} disabled={isLoading} required />
          <p className="mt-1 text-xs text-slate-500">Each user beyond what the branches include (pharmacist, cashier, other).</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">Days per payment</label>
            <input className={input} type="number" min={1} max={366} step={1} value={periodDays} onChange={edit('periodDays')} disabled={isLoading} required />
            <p className="mt-1 text-xs text-slate-500">Access each payment buys, e.g. 30.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">First-payment bonus days</label>
            <input className={input} type="number" min={0} max={366} step={1} value={firstPaymentBonusDays} onChange={edit('firstPaymentBonusDays')} disabled={isLoading} required />
            <p className="mt-1 text-xs text-slate-500">Extra days on the first payment of an organization only, e.g. 14.</p>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          A new organization pays first and gets {Number(periodDays || 0) + Number(firstPaymentBonusDays || 0)} days. Renewals
          get {Number(periodDays || 0)} days and cover every branch and extra user it has.
        </p>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {saved && <p className="text-sm text-emerald-400">Saved. New payments use these prices.</p>}
        <button disabled={!valid || save.isPending} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {save.isPending ? 'Saving…' : 'Save pricing'}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Change history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">No changes yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 uppercase text-slate-500">
                <tr>
                  {['When', 'By', 'Branch', 'Users per branch', 'Extra user', 'Days / bonus'].map((h) => (
                    <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {history.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap">{new Date(c.changedAt).toLocaleString()}</td>
                    <td className="px-4 py-2.5">{c.changedBy}</td>
                    <td className="px-4 py-2.5">{c.previousBranchPrice.toLocaleString()} → {c.branchPrice.toLocaleString()}</td>
                    <td className="px-4 py-2.5">{c.previousUsersPerBranch} → {c.usersPerBranch}</td>
                    <td className="px-4 py-2.5">{c.previousExtraUserPrice.toLocaleString()} → {c.extraUserPrice.toLocaleString()}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {c.previousPeriodDays ?? '—'}/{c.previousFirstPaymentBonusDays ?? '—'} → {c.periodDays}/{c.firstPaymentBonusDays}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
