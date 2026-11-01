'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PaymentVerificationSettings } from '@/lib/types';

const input =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none';
const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400';

function Toggle({ checked, onChange, title, hint }: { checked: boolean; onChange: (value: boolean) => void; title: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-indigo-500" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium text-slate-100">{title}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
    </label>
  );
}

export default function PaymentVerificationPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['payment-verification'], queryFn: api.getPaymentVerification });
  // Edits live in `draft`; until there are any the form shows what is saved.
  const [draft, setDraft] = useState<PaymentVerificationSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form: PaymentVerificationSettings = draft ?? data ?? {
    enabled: true,
    recipientName: '',
    recipientNumber: '',
    autoApprove: false,
    maxAgeHours: 72,
    requireReference: false,
  };
  const edit = <K extends keyof PaymentVerificationSettings>(key: K, value: PaymentVerificationSettings[K]) => {
    setSaved(false);
    setDraft({ ...form, [key]: value });
  };

  const save = useMutation({
    mutationFn: () => api.updatePaymentVerification(form),
    onSuccess: () => {
      setDraft(null);
      setSaved(true);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['payment-verification'] });
    },
    onError: (e: Error) => {
      setSaved(false);
      setError(e.message);
    },
  });

  const valid = !form.enabled || form.recipientNumber.replace(/\D/g, '').length >= 6;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payment verification</h1>
        <p className="text-sm text-slate-400">
          The server checks every Telebirr transaction ID against Ethio telecom&apos;s receipt. The receipt must be completed,
          paid to the account below, for the exact amount of what is being bought (for example 2 users = 2 × the user
          price), and recent. Anything else is refused with the reason; a receipt that cannot be read is left for you to check.
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
        <Toggle checked={form.enabled} onChange={(v) => edit('enabled', v)} title="Verify Telebirr receipts" hint="When off, every payment waits for you to check it by hand." />

        <div>
          <label className={label}>Receiver name</label>
          <input className={input} value={form.recipientName} onChange={(e) => edit('recipientName', e.target.value)} disabled={isLoading} placeholder="e.g. Nexora Tech PLC" />
          <p className="mt-1 text-xs text-slate-500">As it appears on the receipt under &quot;Credited Party name&quot;. Leave empty to check the number only.</p>
        </div>
        <div>
          <label className={label}>Receiver Telebirr number</label>
          <input className={input} value={form.recipientNumber} onChange={(e) => edit('recipientNumber', e.target.value)} disabled={isLoading} placeholder="e.g. 0944232306" inputMode="tel" />
          <p className="mt-1 text-xs text-slate-500">
            The only account payments may go to. Receipts show it partly hidden (2519****2306); the visible digits must fit this number.
          </p>
        </div>
        <div>
          <label className={label}>Oldest receipt accepted (hours)</label>
          <input className={input} type="number" min={1} max={720} step={1} value={form.maxAgeHours} onChange={(e) => edit('maxAgeHours', Number(e.target.value))} disabled={isLoading} />
          <p className="mt-1 text-xs text-slate-500">A receipt older than this is refused, so an old payment cannot be reused.</p>
        </div>

        <Toggle
          checked={form.requireReference}
          onChange={(v) => edit('requireReference', v)}
          title="Require the payment reference"
          hint="The receipt's payment reason must contain the 4-character reference the user was given."
        />
        <Toggle
          checked={form.autoApprove}
          onChange={(v) => edit('autoApprove', v)}
          title="Approve verified payments automatically"
          hint="An exact, fully checked payment is approved at once. A payment of more than the amount still waits for you."
        />

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {saved ? <p className="text-sm text-emerald-400">Saved.</p> : null}
        <button
          type="submit"
          disabled={!valid || save.isPending || isLoading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
        {!valid ? <p className="text-xs text-amber-400">Enter the receiver&apos;s Telebirr number, or turn verification off.</p> : null}
      </form>
    </div>
  );
}
