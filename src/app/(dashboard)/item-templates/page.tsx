'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Plus, Search, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';

const TYPES = [
  { value: 'MEDICINE', label: 'Medicine', sample: 'medicine' },
  { value: 'COSMETIC', label: 'Cosmetics', sample: 'cosmetics' },
  { value: 'MEDICAL_SUPPLY', label: 'Equipment', sample: 'equipment' },
];
const LIMIT = 20;
const input =
  'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none';

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });

export default function ItemTemplatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<'add' | 'import' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', brand: '', strength: '', dosageForm: '', category: '', manufacturer: '', productType: 'MEDICINE' });
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState('MEDICINE');
  const [result, setResult] = useState<{ total: number; imported: number; skipped: number } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['item-templates', search, type, page],
    queryFn: () => api.listMedicines({ search: search || undefined, productType: type || undefined, limit: LIMIT, offset: (page - 1) * LIMIT }),
  });
  const items = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['item-templates'] });

  const closeDialog = () => {
    setDialog(null);
    setError(null);
    setFile(null);
    setResult(null);
  };

  const add = useMutation({
    mutationFn: () =>
      api.createMedicine({
        genericName: form.name.trim(),
        brandNames: form.brand.trim() ? [form.brand.trim()] : [],
        strengths: form.strength.trim() ? [form.strength.trim()] : [],
        dosageForms: form.dosageForm.trim() ? [form.dosageForm.trim()] : [],
        therapeuticCategory: form.category.trim() || null,
        manufacturer: form.manufacturer.trim() || null,
        productType: form.productType,
      } as never),
    onSuccess: () => {
      refresh();
      closeDialog();
      setForm({ ...form, name: '', brand: '', strength: '', dosageForm: '' });
    },
    onError: (e: Error) => setError(e.message),
  });

  const upload = useMutation({
    mutationFn: async () => api.importItemTemplates({ fileName: file!.name, base64: await toBase64(file!), defaultType: importType }),
    onSuccess: (r) => {
      setResult(r);
      refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Item Templates</h1>
          <p className="text-sm text-slate-400">The shared catalog pharmacies pick items from. Add one by hand or import an Excel or CSV file.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setDialog('import')} className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
            <Upload className="h-4 w-4" /> Import Excel / CSV
          </button>
          <button onClick={() => setDialog('add')} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            <Plus className="h-4 w-4" /> Add item
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input className={`${input} pl-9`} placeholder="Search name or brand" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className={`${input} w-44`} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
            <tr>{['Name', 'Strength', 'Form', 'Brand', 'Type', 'Category'].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No items yet. Add one or import a file.</td></tr>}
            {items.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2.5 font-medium">{m.genericName}</td>
                <td className="px-4 py-2.5">{m.strength ?? '—'}</td>
                <td className="px-4 py-2.5">{m.dosageForm ?? '—'}</td>
                <td className="px-4 py-2.5">{m.brandNames?.[0] ?? '—'}</td>
                <td className="px-4 py-2.5">{TYPES.find((t) => t.value === m.productType)?.label ?? m.productType}</td>
                <td className="px-4 py-2.5">{m.therapeuticCategory ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{total} items</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40">Previous</button>
          <button disabled={page * LIMIT >= total} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40">Next</button>
        </div>
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeDialog}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{dialog === 'add' ? 'Add item' : 'Import items'}</h2>
              <button onClick={closeDialog} aria-label="Close"><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            {dialog === 'add' ? (
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setError(null); add.mutate(); }}>
                <input required className={input} placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input className={input} placeholder="Strength (500mg)" value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} />
                  <input className={input} placeholder="Form (Tablet)" value={form.dosageForm} onChange={(e) => setForm({ ...form, dosageForm: e.target.value })} />
                  <input className={input} placeholder="Brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                  <input className={input} placeholder="Manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
                  <input className={input} placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                  <select className={input} value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value })}>
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <button disabled={add.isPending} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white disabled:opacity-50">{add.isPending ? 'Saving…' : 'Save item'}</button>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Item type (used when the file has no Type column)</label>
                  <select className={input} value={importType} onChange={(e) => setImportType(e.target.value)}>
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-400 hover:border-indigo-500">
                  <FileSpreadsheet className="h-6 w-6" />
                  {file ? file.name : 'Choose an .xlsx or .csv file'}
                  <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setError(null); }} />
                </label>
                <p className="text-xs text-slate-500">
                  Columns read: Name, Brand, Description, Strength, Form, Category/Tags, Type, Country, Supplier/Manufacturer. Items already in the catalog are skipped. Samples:{' '}
                  {TYPES.map((t) => (
                    <span key={t.value} className="mr-2 inline-flex items-center gap-1">
                      <Download className="h-3 w-3" />{t.label}{' '}
                      <a className="text-indigo-400 underline" href={`/samples/${t.sample}_sample_50.xlsx`} download>xlsx</a>/
                      <a className="text-indigo-400 underline" href={`/samples/${t.sample}_sample_50.csv`} download>csv</a>
                    </span>
                  ))}
                </p>
                {error && <p className="text-sm text-red-400">{error}</p>}
                {result && <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">Imported {result.imported} of {result.total} rows; {result.skipped} already existed.</p>}
                <button disabled={!file || upload.isPending} onClick={() => { setError(null); upload.mutate(); }} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white disabled:opacity-50">{upload.isPending ? 'Importing…' : 'Import'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
