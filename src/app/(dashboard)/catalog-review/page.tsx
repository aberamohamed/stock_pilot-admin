'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, GitMerge, Pill, Search, Share2, Store, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { CatalogReviewItem } from '@/lib/types';

type Action = { action: 'approve' } | { action: 'promote' } | { action: 'retire' } | { action: 'merge'; intoId: string };

const label = (item: { strength: string | null; form: string | null }) => [item.strength, item.form].filter(Boolean).join(' ');

/** Search shared products to merge a duplicate into. */
function MergePicker({ item, onPick, onCancel }: { item: CatalogReviewItem; onPick: (id: string) => void; onCancel: () => void }) {
  const [search, setSearch] = useState(item.name);
  const { data, isFetching } = useQuery({
    queryKey: ['merge-targets', search],
    queryFn: () => api.listMedicines({ search, limit: 30 }),
    enabled: search.trim().length >= 2,
  });
  const products = (data?.data ?? []).filter((m) => m.catalogLevel === 'product' && m.id !== item.id);
  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 space-y-2">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shared products…"
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
        />
      </div>
      {isFetching ? <p className="text-xs text-zinc-500">Searching…</p> : null}
      {!isFetching && products.length === 0 ? <p className="text-xs text-zinc-500">No shared product matches.</p> : null}
      <div className="max-h-56 overflow-y-auto divide-y divide-zinc-800">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onPick(product.id)}
            className="w-full text-left px-2 py-2 text-sm text-zinc-200 hover:bg-zinc-800 rounded"
          >
            {product.genericName} <span className="text-zinc-400">{label({ strength: product.strength ?? null, form: product.dosageForm ?? null })}</span>
          </button>
        ))}
      </div>
      <button onClick={onCancel} className="text-xs text-zinc-400 hover:text-white">
        Cancel
      </button>
    </div>
  );
}

export default function CatalogReviewPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'pharmacy' | 'flagged'>('pharmacy');
  const [merging, setMerging] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: items = [], isLoading, error } = useQuery({ queryKey: ['catalog-review'], queryFn: () => api.catalogReviewQueue() });
  const review = useMutation({
    mutationFn: ({ id, action }: { id: string; action: Action }) => api.reviewProduct(id, action),
    onSuccess: () => {
      setMerging(null);
      setErrorMessage(null);
      void queryClient.invalidateQueries({ queryKey: ['catalog-review'] });
      void queryClient.invalidateQueries({ queryKey: ['medicines'] });
    },
    onError: (err: Error) => setErrorMessage(err.message || 'Action failed'),
  });
  const shown = items.filter((item) => item.kind === tab);
  const pharmacyCount = items.filter((i) => i.kind === 'pharmacy').length;

  const act = (id: string, action: Action) => review.mutate({ id, action });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Pill className="w-7 h-7 text-indigo-400" />
          Catalog Review
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Products pharmacies added themselves, and shared products the catalog split paired by a fallback rule. Promote
          good ones so every pharmacy finds them; merge duplicates into the shared product.
        </p>
      </div>

      <div className="flex gap-2">
        {(
          [
            ['pharmacy', `Added by pharmacies (${pharmacyCount})`],
            ['flagged', `Check pairing (${items.length - pharmacyCount})`],
          ] as const
        ).map(([value, text]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === value ? 'bg-indigo-600 text-white' : 'bg-zinc-900 text-zinc-300 border border-zinc-800'}`}
          >
            {text}
          </button>
        ))}
      </div>

      {errorMessage ? (
        <div className="flex items-center gap-2 text-sm text-rose-400">
          <AlertCircle className="w-4 h-4" />
          {errorMessage}
        </div>
      ) : null}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-400">Loading…</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400">Failed to load the review queue</div>
        ) : shown.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">Nothing to review.</div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {shown.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-medium">
                      {item.name} <span className="text-zinc-400">{label(item)}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                      {item.organizationName ? (
                        <span className="inline-flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          {item.organizationName}
                        </span>
                      ) : null}
                      <span>{item.adopters} pharmacies</span>
                      <span>{item.unitsInStock} units in stock</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.kind === 'pharmacy' ? (
                      <button
                        onClick={() => act(item.id, { action: 'promote' })}
                        className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Add to shared catalog
                      </button>
                    ) : (
                      <button
                        onClick={() => act(item.id, { action: 'approve' })}
                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Correct
                      </button>
                    )}
                    <button
                      onClick={() => setMerging(merging === item.id ? null : item.id)}
                      className="inline-flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-3 py-1.5 rounded-lg"
                    >
                      <GitMerge className="w-3.5 h-3.5" /> Merge into…
                    </button>
                    {item.kind === 'flagged' && item.adopters === 0 ? (
                      <button
                        onClick={() => act(item.id, { action: 'retire' })}
                        className="inline-flex items-center gap-1 bg-zinc-800 hover:bg-rose-600 text-zinc-200 text-xs font-medium px-3 py-1.5 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    ) : null}
                  </div>
                </div>
                {merging === item.id ? (
                  <MergePicker item={item} onPick={(intoId) => act(item.id, { action: 'merge', intoId })} onCancel={() => setMerging(null)} />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
