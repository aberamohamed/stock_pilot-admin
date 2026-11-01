'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileSpreadsheet, Pencil, Plus, Search, Upload, X } from 'lucide-react';
import { Pagination } from '@/components/pagination';
import { api, ApiError } from '@/lib/api';
import type { MedicineSummary } from '@/lib/types';

const TYPES = [
  { value: 'MEDICINE', label: 'Medicine', sample: 'medicine' },
  { value: 'COSMETIC', label: 'Cosmetics', sample: 'cosmetics' },
  { value: 'MEDICAL_SUPPLY', label: 'Equipment', sample: 'equipment' },
];
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
  const [pageSize, setPageSize] = useState(10);
  const [dialog, setDialog] = useState<'add' | 'import' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const blankForm = { name: '', brand: '', strength: '', dosageForm: '', category: '', manufacturer: '', productType: 'MEDICINE' };
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importType, setImportType] = useState('MEDICINE');
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.importItemTemplates>> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['item-templates', search, type, page, pageSize],
    queryFn: () => api.listMedicines({ search: search || undefined, productType: type || undefined, limit: pageSize, offset: (page - 1) * pageSize }),
  });
  const items = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  // Ticked items stay ticked while paging, searching or filtering.
  const [picked, setPicked] = useState<Record<string, MedicineSummary>>({});
  const [selecting, setSelecting] = useState(false);
  const pickedList = Object.values(picked);
  const allShown = items.length > 0 && items.every((m) => picked[m.id]);
  const someShown = items.some((m) => picked[m.id]);
  const headerBox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerBox.current) headerBox.current.indeterminate = someShown && !allShown;
  }, [someShown, allShown]);
  const toggle = (m: MedicineSummary) =>
    setPicked((prev) => {
      const next = { ...prev };
      if (next[m.id]) delete next[m.id];
      else next[m.id] = m;
      return next;
    });
  const toggleShown = () =>
    setPicked((prev) => {
      const next = { ...prev };
      for (const m of items) {
        if (allShown) delete next[m.id];
        else next[m.id] = m;
      }
      return next;
    });
  // Every item matching the search and type, not only this page (500 at a time).
  const selectEveryMatch = async () => {
    setSelecting(true);
    try {
      const found: MedicineSummary[] = [];
      for (let offset = 0; offset < Math.min(total, 5000); offset += 500) {
        const r = await api.listMedicines({ search: search || undefined, productType: type || undefined, limit: 500, offset });
        found.push(...r.data);
      }
      setPicked((prev) => ({ ...prev, ...Object.fromEntries(found.map((m) => [m.id, m])) }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSelecting(false);
    }
  };
  const downloadCsv = () => {
    const cell = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const csv = ['Name,Strength,Form,Brand,Category,Type']
      .concat(
        pickedList.map((m) =>
          [m.genericName, m.strength, m.dosageForm, m.brandNames?.[0], m.therapeuticCategory, TYPES.find((t) => t.value === m.productType)?.label ?? m.productType].map(cell).join(','),
        ),
      )
      .join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `item-templates-${pickedList.length}-items.csv`;
    link.click();
  };
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['item-templates'] });

  const closeDialog = () => {
    setDialog(null);
    setEditingId(null);
    setError(null);
    setFile(null);
    setResult(null);
  };

  const openAdd = () => {
    setForm(blankForm);
    setDialog('add');
  };
  const openEdit = (m: MedicineSummary) => {
    setForm({
      name: m.genericName,
      brand: m.brandNames?.[0] ?? '',
      strength: m.strength ?? '',
      dosageForm: m.dosageForm ?? '',
      category: m.therapeuticCategory ?? '',
      manufacturer: m.manufacturer ?? '',
      productType: m.productType,
    });
    setEditingId(m.id);
    setDialog('add');
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        genericName: form.name.trim(),
        brandNames: form.brand.trim() ? [form.brand.trim()] : [],
        strengths: form.strength.trim() ? [form.strength.trim()] : [],
        dosageForms: form.dosageForm.trim() ? [form.dosageForm.trim()] : [],
        therapeuticCategory: form.category.trim() || null,
        manufacturer: form.manufacturer.trim() || null,
        productType: form.productType,
      } as never;
      return editingId ? api.updateMedicine(editingId, body) : api.createMedicine(body);
    },
    onSuccess: () => {
      refresh();
      closeDialog();
    },
    onError: (e: Error) => setError(e.message),
  });

  const upload = useMutation({
    mutationFn: async () => api.importItemTemplates({ fileName: file!.name, base64: await toBase64(file!), defaultType: importType }),
    onSuccess: (r) => {
      setResult(r);
      refresh();
    },
    // The exact error: what the server said, with its status and code.
    onError: (e: Error) => setError(e instanceof ApiError ? `Import failed (${e.status} ${e.code}): ${e.message}` : e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Item Templates</h1>
          <p className="text-sm text-slate-400">The shared catalog pharmacies pick items from. Add one by hand or import an Excel or CSV file.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadCsv} disabled={pickedList.length === 0} className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50">
            <Download className="h-4 w-4" /> Download selected ({pickedList.length})
          </button>
          <button onClick={() => setDialog('import')} className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800">
            <Upload className="h-4 w-4" /> Import Excel / CSV
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            <Plus className="h-4 w-4" /> Add item
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input className={`${input} pl-9`} placeholder="Search name or brand" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <button onClick={() => void selectEveryMatch()} disabled={selecting || total === 0} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50">
          {selecting ? 'Selecting…' : `Select all matching (${total})`}
        </button>
        {pickedList.length > 0 && (
          <button onClick={() => setPicked({})} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white">Clear selection</button>
        )}
        <select className={`${input} w-44`} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase text-slate-500">
            <tr>
              <th className="w-10 px-4 py-3">
                <input ref={headerBox} type="checkbox" aria-label="Select all shown" checked={allShown} disabled={items.length === 0} onChange={toggleShown} className="h-4 w-4 accent-indigo-500" />
              </th>
              {['Name', 'Strength', 'Form', 'Brand', 'Type', 'Category', ''].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-200">
            {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">Loading…</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">No items yet. Add one or import a file.</td></tr>}
            {items.map((m) => (
              <tr key={m.id} className={picked[m.id] ? 'bg-indigo-500/5' : ''}>
                <td className="px-4 py-2.5">
                  <input type="checkbox" aria-label={`Select ${m.genericName}`} checked={Boolean(picked[m.id])} onChange={() => toggle(m)} className="h-4 w-4 accent-indigo-500" />
                </td>
                <td className="px-4 py-2.5 font-medium">{m.genericName}</td>
                <td className="px-4 py-2.5">{m.strength ?? '—'}</td>
                <td className="px-4 py-2.5">{m.dosageForm ?? '—'}</td>
                <td className="px-4 py-2.5">{m.brandNames?.[0] ?? '—'}</td>
                <td className="px-4 py-2.5">{TYPES.find((t) => t.value === m.productType)?.label ?? m.productType}</td>
                <td className="px-4 py-2.5">{m.therapeuticCategory ?? '—'}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => openEdit(m)} aria-label={`Edit ${m.genericName}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"><Pencil className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={total} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
      </div>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeDialog}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{dialog === 'import' ? 'Import items' : editingId ? 'Edit item' : 'Add item'}</h2>
              <button onClick={closeDialog} aria-label="Close"><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            {dialog === 'add' ? (
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setError(null); save.mutate(); }}>
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
                <button disabled={save.isPending} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white disabled:opacity-50">{save.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Save item'}</button>
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
                  Columns read: Code, SCTID, Name, Brand, Description, Strength, Form, Category/Tags, Type, Country, Order Unit, Dispense Unit, Factor, Supplier/Manufacturer. Up to 2,000 rows are imported at a time; the rest come back as a file to import next. Items already in the catalog get the new brand, codes and units added. Samples:{' '}
                  {TYPES.map((t) => (
                    <span key={t.value} className="mr-2 inline-flex items-center gap-1">
                      <Download className="h-3 w-3" />{t.label}{' '}
                      <a className="text-indigo-400 underline" href={`/samples/${t.sample}_sample_50.xlsx`} download>xlsx</a>/
                      <a className="text-indigo-400 underline" href={`/samples/${t.sample}_sample_50.csv`} download>csv</a>
                    </span>
                  ))}
                </p>
                {error && <p className="text-sm text-red-400">{error}</p>}
                {result && (
                  <div className="space-y-2">
                    <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">
                      {result.imported} new item{result.imported === 1 ? '' : 's'} added from {result.total} rows; {result.skipped} were already in the catalog
                      {result.brandsAdded ? ` (${result.brandsAdded} new brands, codes and units were added to them)` : ''}.
                    </p>
                    {result.remaining && (
                      <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200">
                        <p>
                          Only the first 2,000 rows are imported at a time. The other {result.remaining.count} rows are in a file: download it and import it next.
                        </p>
                        <a
                          className="mt-2 inline-flex items-center gap-1 text-indigo-300 underline"
                          href={`data:${result.remaining.mimeType};base64,${result.remaining.base64}`}
                          download={result.remaining.fileName}
                        >
                          <Download className="h-3 w-3" /> Download the remaining {result.remaining.count} rows
                        </a>
                      </div>
                    )}
                  </div>
                )}
                <button disabled={!file || upload.isPending} onClick={() => { setError(null); upload.mutate(); }} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white disabled:opacity-50">{upload.isPending ? 'Importing…' : 'Import'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
