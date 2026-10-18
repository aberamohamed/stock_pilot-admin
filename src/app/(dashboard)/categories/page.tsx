'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MedicineCategory } from '@/lib/types';
import {
  Tag,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  AlertCircle,
  Layers,
  ArrowUpDown,
  Pill,
} from 'lucide-react';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MedicineCategory | null>(null);
  const [deleteConfirmCat, setDeleteConfirmCat] = useState<MedicineCategory | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    value: '',
    name: '',
    sortOrder: 0,
    isActive: true,
  });

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.listCategories(false),
  });

  const createMutation = useMutation({
    mutationFn: (data: { value: string; name: string; sortOrder?: number; isActive?: boolean }) =>
      api.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || 'Failed to create category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ value, data }: { value: string; data: { name?: string; sortOrder?: number; isActive?: boolean } }) =>
      api.updateCategory(value, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || 'Failed to update category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (value: string) => api.deleteCategory(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteConfirmCat(null);
    },
    onError: (err: Error) => {
      setErrorMessage(err.message || 'Failed to delete category');
    },
  });

  const resetForm = () => {
    setFormData({ value: '', name: '', sortOrder: 0, isActive: true });
    setEditingCategory(null);
    setErrorMessage(null);
  };

  const openCreateModal = () => {
    resetForm();
    // Default sort order can be max existing + 1
    const maxSort = categories.reduce((max, c) => Math.max(max, c.sortOrder || 0), 0);
    setFormData((prev) => ({ ...prev, sortOrder: maxSort + 1 }));
    setIsModalOpen(true);
  };

  const openEditModal = (cat: MedicineCategory) => {
    setEditingCategory(cat);
    setFormData({
      value: cat.value,
      name: cat.name,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (editingCategory) {
      updateMutation.mutate({
        value: editingCategory.value,
        data: {
          name: formData.name,
          sortOrder: Number(formData.sortOrder),
          isActive: formData.isActive,
        },
      });
    } else {
      if (!formData.value.trim() || !formData.name.trim()) {
        setErrorMessage('Code/Value and Name are required');
        return;
      }
      createMutation.mutate({
        value: formData.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
        name: formData.name.trim(),
        sortOrder: Number(formData.sortOrder),
        isActive: formData.isActive,
      });
    }
  };

  // Filter categories
  const filteredCategories = categories.filter((cat) => {
    const matchesSearch =
      cat.name.toLowerCase().includes(search.toLowerCase()) ||
      cat.value.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? cat.isActive
        : !cat.isActive;

    return matchesSearch && matchesStatus;
  });

  // Calculate quick metrics
  const totalCategories = categories.length;
  const activeCount = categories.filter((c) => c.isActive).length;
  const inUseCount = categories.filter((c) => c.medicinesCount > 0).length;
  const totalMappedMeds = categories.reduce((acc, c) => acc + (c.medicinesCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-400" />
            Therapeutic Categories
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage standardized pharmaceutical categories, taxonomy codes, and catalog associations.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Total Categories</span>
            <Tag className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{totalCategories}</div>
          <div className="text-xs text-zinc-500 mt-1">Global catalog classification</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Active</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">{activeCount}</div>
          <div className="text-xs text-zinc-500 mt-1">Visible to mobile POS & lookup</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs uppercase font-semibold tracking-wider">In Use</span>
            <Pill className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-400 mt-2">{inUseCount}</div>
          <div className="text-xs text-zinc-500 mt-1">Categories with registered drugs</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs uppercase font-semibold tracking-wider">Mapped Medicines</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2">{totalMappedMeds}</div>
          <div className="text-xs text-zinc-500 mt-1">Total drug references tagged</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by category name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-zinc-400" />
          <span className="text-xs text-zinc-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Categories</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Category List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-zinc-400 flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            Loading therapeutic categories...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 flex flex-col items-center">
            <AlertCircle className="w-8 h-8 mb-2" />
            Failed to load categories
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <Layers className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
            <p className="text-white font-medium">No categories found</p>
            <p className="text-xs text-zinc-500 mt-1">
              {search ? 'Try clearing your search query' : 'Get started by creating your first category'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-3.5">Category Name</th>
                  <th className="px-6 py-3.5">Taxonomy Code</th>
                  <th className="px-6 py-3.5">Sort Order</th>
                  <th className="px-6 py-3.5">Mapped Drugs</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredCategories.map((cat) => (
                  <tr key={cat.value} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
                        {cat.name.slice(0, 2).toUpperCase()}
                      </div>
                      {cat.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-indigo-400 bg-zinc-950/40 rounded px-2 py-0.5 inline-block my-3">
                      {cat.value}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        <ArrowUpDown className="w-3 h-3 text-zinc-600" />
                        {cat.sortOrder ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300">
                        <Pill className="w-3 h-3 text-indigo-400" />
                        {cat.medicinesCount ?? 0} medicines
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {cat.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                          <XCircle className="w-3.5 h-3.5" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                        title="Edit category"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setErrorMessage(null);
                          setDeleteConfirmCat(cat);
                        }}
                        className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-400" />
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Category Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Antibiotics, Analgesics & Antipyretics"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      name,
                      // Auto-slugify code if creating new category and value not yet modified
                      value: !editingCategory && !prev.value
                        ? name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '')
                        : prev.value,
                    }));
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Taxonomy Value / Key <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingCategory}
                  placeholder="e.g. antibiotics"
                  value={formData.value}
                  onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_') }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Unique identifier used across mobile apps and regulatory syncing. Cannot be altered after creation.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-3 p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-xs font-medium text-white">Active</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition shadow-lg shadow-indigo-600/20"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingCategory
                    ? 'Update Category'
                    : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white">Delete Category</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Are you sure you want to delete category <strong className="text-white">{deleteConfirmCat.name}</strong> ({deleteConfirmCat.value})?
              </p>
            </div>

            {deleteConfirmCat.medicinesCount > 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
                ⚠️ This category currently has <strong>{deleteConfirmCat.medicinesCount}</strong> medicines mapped to it. You cannot delete an in-use category. Please reassign those medicines first, or set this category to Inactive instead.
              </div>
            ) : null}

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmCat(null)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending || deleteConfirmCat.medicinesCount > 0}
                onClick={() => deleteMutation.mutate(deleteConfirmCat.value)}
                className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition shadow-lg shadow-rose-600/20"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
