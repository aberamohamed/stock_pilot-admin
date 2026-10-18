'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MedicineSummary, MedicineDetail } from '@/lib/types';
import {
  Pill,
  Search,
  Filter,
  Plus,
  Building2,
  AlertCircle,
  Eye,
  Trash2,
  Tag,
  FileText,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';

export default function MedicinesPage() {
  const queryClient = useQueryClient();

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [marketStatus, setMarketStatus] = useState<string>('all');
  const [productType, setProductType] = useState<string>('all');
  const [rxFilter, setRxFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Modals & Drawers
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineSummary | null>(null);
  const [isAddPackageModalOpen, setIsAddPackageModalOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    genericName: '',
    brandNames: '',
    therapeuticCategory: '',
    productType: 'pharmaceutical',
    prescriptionRequired: true,
    manufacturer: '',
    registrationNumber: '',
    country: 'ET',
    marketStatus: 'active',
    dosageForms: '',
    strengths: '',
    routes: '',
  });

  const [packageFormData, setPackageFormData] = useState({
    brandName: '',
    manufacturer: '',
    strength: '',
    dosageForm: '',
    route: '',
    packSize: '',
    registrationNo: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Query: Categories for filters & dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.listCategories(false),
  });

  // Query: Medicines List
  const { data: medicinesResult, isLoading } = useQuery({
    queryKey: ['medicines', search, selectedCategory, marketStatus, productType, rxFilter, page],
    queryFn: () =>
      api.listMedicines({
        search: search || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        marketStatus: marketStatus !== 'all' ? marketStatus : undefined,
        productType: productType !== 'all' ? productType : undefined,
        prescriptionRequired: rxFilter === 'all' ? undefined : rxFilter === 'true',
        limit,
        offset: (page - 1) * limit,
      }),
  });

  // Query: Medicine Detail Modal
  const { data: activeDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['medicine-detail', selectedMedicineId],
    queryFn: () => (selectedMedicineId ? api.getMedicine(selectedMedicineId) : null),
    enabled: !!selectedMedicineId,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<MedicineDetail>) => api.createMedicine(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: Error) => setFormError(err.message || 'Failed to create medicine'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MedicineDetail> }) =>
      api.updateMedicine(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['medicine-detail'] });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: (err: Error) => setFormError(err.message || 'Failed to update medicine'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateMedicineStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['medicine-detail'] });
    },
  });

  const addPackageMutation = useMutation({
    mutationFn: ({ medicineId, pkg }: { medicineId: string; pkg: Record<string, unknown> }) =>
      api.addMedicinePackage(medicineId, pkg),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicine-detail', selectedMedicineId] });
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setIsAddPackageModalOpen(false);
      setPackageFormData({
        brandName: '',
        manufacturer: '',
        strength: '',
        dosageForm: '',
        route: '',
        packSize: '',
        registrationNo: '',
      });
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: ({ medicineId, pkgId }: { medicineId: string; pkgId: string }) =>
      api.deleteMedicinePackage(medicineId, pkgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicine-detail', selectedMedicineId] });
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
    },
  });

  const resetForm = () => {
    setFormData({
      genericName: '',
      brandNames: '',
      therapeuticCategory: '',
      productType: 'pharmaceutical',
      prescriptionRequired: true,
      manufacturer: '',
      registrationNumber: '',
      country: 'ET',
      marketStatus: 'active',
      dosageForms: '',
      strengths: '',
      routes: '',
    });
    setEditingMedicine(null);
    setFormError(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (med: MedicineSummary) => {
    setEditingMedicine(med);
    setFormData({
      genericName: med.genericName,
      brandNames: Array.isArray(med.brandNames) ? med.brandNames.join(', ') : '',
      therapeuticCategory: med.therapeuticCategory || '',
      productType: med.productType || 'pharmaceutical',
      prescriptionRequired: med.prescriptionRequired ?? true,
      manufacturer: med.manufacturer || '',
      registrationNumber: med.registrationNumber || '',
      country: med.country || 'ET',
      marketStatus: med.marketStatus || 'active',
      dosageForms: '',
      strengths: '',
      routes: '',
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload: Partial<MedicineDetail> = {
      genericName: formData.genericName.trim(),
      brandNames: formData.brandNames
        ? formData.brandNames.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      therapeuticCategory: formData.therapeuticCategory || null,
      productType: formData.productType,
      prescriptionRequired: formData.prescriptionRequired,
      manufacturer: formData.manufacturer.trim() || null,
      registrationNumber: formData.registrationNumber.trim() || null,
      country: formData.country,
      marketStatus: formData.marketStatus,
      dosageForms: formData.dosageForms
        ? formData.dosageForms.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      strengths: formData.strengths
        ? formData.strengths.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      routes: formData.routes
        ? formData.routes.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
    };

    if (editingMedicine) {
      updateMutation.mutate({ id: editingMedicine.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const medicines = medicinesResult?.data || [];
  const meta = medicinesResult?.meta || { total: 0, limit: 20, offset: 0 };
  const totalPages = Math.ceil((meta.total || 0) / limit);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Pill className="w-7 h-7 text-indigo-400" />
            Master Medicine Catalog
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Global standardized pharmaceutical formulary, regulatory registrations, dosages, and pharmacy network adoption.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          Add Master Medicine
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search generic name, brand, reg #..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs text-zinc-400">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 max-w-[160px] truncate"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-400">Status:</span>
              <select
                value={marketStatus}
                onChange={(e) => {
                  setMarketStatus(e.target.value);
                  setPage(1);
                }}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-400">Type:</span>
              <select
                value={productType}
                onChange={(e) => {
                  setProductType(e.target.value);
                  setPage(1);
                }}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Types</option>
                <option value="pharmaceutical">Pharmaceutical</option>
                <option value="medical_supply">Medical Supply</option>
                <option value="vaccine">Vaccine</option>
                <option value="herbal">Herbal</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-400">Rx:</span>
              <select
                value={rxFilter}
                onChange={(e) => {
                  setRxFilter(e.target.value as 'all' | 'true' | 'false');
                  setPage(1);
                }}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Rx & OTC</option>
                <option value="true">Prescription Only (Rx)</option>
                <option value="false">Over the Counter (OTC)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Medicines Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-16 text-center text-zinc-400 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            Loading master drug catalog...
          </div>
        ) : medicines.length === 0 ? (
          <div className="p-16 text-center text-zinc-400">
            <Pill className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
            <p className="text-white font-medium text-base">No medicines found</p>
            <p className="text-xs text-zinc-500 mt-1">
              Adjust search keywords or filters to locate specific drugs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-3.5">Medicine & Brands</th>
                  <th className="px-6 py-3.5">Therapeutic Category</th>
                  <th className="px-6 py-3.5">Class & Regulatory</th>
                  <th className="px-6 py-3.5">Packages</th>
                  <th className="px-6 py-3.5">Network Adoption</th>
                  <th className="px-6 py-3.5">Market Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {medicines.map((med) => (
                  <tr key={med.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white text-base">
                        {med.genericName}
                      </div>
                      {med.brandNames && med.brandNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {med.brandNames.slice(0, 3).map((b, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700/50"
                            >
                              {b}
                            </span>
                          ))}
                          {med.brandNames.length > 3 && (
                            <span className="text-[10px] text-zinc-500 self-center">
                              +{med.brandNames.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500">No registered brands</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {med.therapeuticCategory ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <Tag className="w-3 h-3" />
                          {med.therapeuticCategory}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-2">
                        {med.prescriptionRequired ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Rx Only
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            OTC
                          </span>
                        )}
                        <span className="text-xs text-zinc-400 capitalize">
                          {med.productType}
                        </span>
                      </div>
                      {med.registrationNumber && (
                        <div className="text-[11px] text-zinc-500 font-mono">
                          Reg: {med.registrationNumber}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-zinc-950 text-zinc-300 border border-zinc-800">
                        <Boxes className="w-3.5 h-3.5 text-indigo-400" />
                        {med.packagesCount || 0} packages
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-300">
                        <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                        <strong className="text-white font-medium">
                          {med.adoptedOrganizationsCount || 0}
                        </strong>{' '}
                        pharmacies
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <select
                        value={med.marketStatus || 'active'}
                        onChange={(e) =>
                          updateStatusMutation.mutate({
                            id: med.id,
                            status: e.target.value,
                          })
                        }
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium border focus:outline-none transition ${
                          med.marketStatus === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : med.marketStatus === 'suspended'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        <option value="active" className="bg-zinc-900 text-white">Active</option>
                        <option value="suspended" className="bg-zinc-900 text-white">Suspended</option>
                        <option value="withdrawn" className="bg-zinc-900 text-white">Withdrawn</option>
                      </select>
                    </td>

                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedMedicineId(med.id)}
                        className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
                        title="View details & packages"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(med)}
                        className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition"
                        title="Edit medicine"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between text-xs text-zinc-400">
          <div>
            Showing <strong className="text-white">{meta.offset + 1}</strong> to{' '}
            <strong className="text-white">
              {Math.min(meta.offset + limit, meta.total)}
            </strong>{' '}
            of <strong className="text-white">{meta.total}</strong> master medicines
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail & Packages Drawer Modal */}
      {selectedMedicineId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in duration-150">
            {isLoadingDetail || !activeDetail ? (
              <div className="py-16 text-center text-zinc-400 flex flex-col items-center justify-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                Loading medicine specifications...
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white">
                        {activeDetail.genericName}
                      </h2>
                      {activeDetail.prescriptionRequired ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Rx
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          OTC
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 font-mono">
                      ID: {activeDetail.id} • Country: {activeDetail.country}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedMedicineId(null)}
                    className="text-zinc-400 hover:text-white text-lg p-1"
                  >
                    ✕
                  </button>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3">
                    <span className="text-[11px] text-zinc-400 uppercase font-semibold">Category</span>
                    <div className="text-sm font-semibold text-indigo-400 mt-1 truncate">
                      {activeDetail.therapeuticCategory || 'Uncategorized'}
                    </div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3">
                    <span className="text-[11px] text-zinc-400 uppercase font-semibold">Adopted Pharmacies</span>
                    <div className="text-sm font-semibold text-white mt-1">
                      {activeDetail.stats?.adoptedOrganizations || 0} organizations
                    </div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3">
                    <span className="text-[11px] text-zinc-400 uppercase font-semibold">Active Branches</span>
                    <div className="text-sm font-semibold text-emerald-400 mt-1">
                      {activeDetail.stats?.adoptedBranches || 0} dispensaries
                    </div>
                  </div>
                </div>

                {/* Formulations & Attributes */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    Formulations & Regulatory Info
                  </h3>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-zinc-500 block mb-1">Manufacturer</span>
                        <span className="text-white font-medium">{activeDetail.manufacturer || '—'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-1">Registration #</span>
                        <span className="text-white font-mono">{activeDetail.registrationNumber || '—'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-1">Dosage Forms</span>
                        <span className="text-white">
                          {activeDetail.dosageForms && activeDetail.dosageForms.length > 0
                            ? activeDetail.dosageForms.join(', ')
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block mb-1">Strengths</span>
                        <span className="text-white">
                          {activeDetail.strengths && activeDetail.strengths.length > 0
                            ? activeDetail.strengths.join(', ')
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Packages Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-indigo-400" />
                      Approved Packages & Variations ({activeDetail.packages?.length || 0})
                    </h3>
                    <button
                      onClick={() => setIsAddPackageModalOpen(true)}
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Package
                    </button>
                  </div>

                  {(!activeDetail.packages || activeDetail.packages.length === 0) ? (
                    <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl text-center text-xs text-zinc-500">
                      No package variations configured. Add specific pack sizes (e.g. 10x10 blister, 100ml bottle) for mobile inventory tracking.
                    </div>
                  ) : (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs text-zinc-300">
                        <thead className="bg-zinc-900/60 text-[11px] text-zinc-400 uppercase border-b border-zinc-800">
                          <tr>
                            <th className="px-4 py-2.5">Pack Size</th>
                            <th className="px-4 py-2.5">Brand / Strength</th>
                            <th className="px-4 py-2.5">Dosage Form</th>
                            <th className="px-4 py-2.5">Registration #</th>
                            <th className="px-4 py-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40">
                          {activeDetail.packages.map((pkg) => (
                            <tr key={pkg.id} className="hover:bg-zinc-900/40">
                              <td className="px-4 py-3 font-semibold text-white">
                                {pkg.packSize || 'Standard'}
                              </td>
                              <td className="px-4 py-3">
                                <div>{pkg.brandName || activeDetail.genericName}</div>
                                {pkg.strength && (
                                  <div className="text-[10px] text-zinc-400">{pkg.strength}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-zinc-400">
                                {pkg.dosageForm || '—'}
                              </td>
                              <td className="px-4 py-3 font-mono text-[10px] text-zinc-400">
                                {pkg.registrationNo || '—'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() =>
                                    deletePackageMutation.mutate({
                                      medicineId: activeDetail.id,
                                      pkgId: pkg.id,
                                    })
                                  }
                                  className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded"
                                  title="Remove package"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-zinc-800">
                  <button
                    onClick={() => setSelectedMedicineId(null)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-xl transition"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Package Modal */}
      {isAddPackageModalOpen && activeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-semibold text-white">Add Package Variation</h3>
              <button
                onClick={() => setIsAddPackageModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addPackageMutation.mutate({
                  medicineId: activeDetail.id,
                  pkg: packageFormData,
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                  Pack Size <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10 x 10 Blister, 100ml Bottle"
                  value={packageFormData.packSize}
                  onChange={(e) =>
                    setPackageFormData((p) => ({ ...p, packSize: e.target.value }))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    placeholder="Specific brand"
                    value={packageFormData.brandName}
                    onChange={(e) =>
                      setPackageFormData((p) => ({ ...p, brandName: e.target.value }))
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                    Strength
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg"
                    value={packageFormData.strength}
                    onChange={(e) =>
                      setPackageFormData((p) => ({ ...p, strength: e.target.value }))
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                    Dosage Form
                  </label>
                  <input
                    type="text"
                    placeholder="Tablet, Syrup"
                    value={packageFormData.dosageForm}
                    onChange={(e) =>
                      setPackageFormData((p) => ({ ...p, dosageForm: e.target.value }))
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase mb-1">
                    Registration No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 05-1234/ET"
                    value={packageFormData.registrationNo}
                    onChange={(e) =>
                      setPackageFormData((p) => ({ ...p, registrationNo: e.target.value }))
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddPackageModalOpen(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPackageMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded-xl transition"
                >
                  {addPackageMutation.isPending ? 'Adding...' : 'Save Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Master Medicine Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Pill className="w-5 h-5 text-indigo-400" />
                {editingMedicine ? 'Edit Master Medicine' : 'Add Master Medicine'}
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Generic / INN Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin Trihydrate, Paracetamol"
                  value={formData.genericName}
                  onChange={(e) => setFormData((p) => ({ ...p, genericName: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Brand Names (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Moxilen, Amoxil, Ospamox"
                  value={formData.brandNames}
                  onChange={(e) => setFormData((p) => ({ ...p, brandNames: e.target.value }))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Therapeutic Category
                  </label>
                  <select
                    value={formData.therapeuticCategory}
                    onChange={(e) => setFormData((p) => ({ ...p, therapeuticCategory: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Product Type
                  </label>
                  <select
                    value={formData.productType}
                    onChange={(e) => setFormData((p) => ({ ...p, productType: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="pharmaceutical">Pharmaceutical</option>
                    <option value="medical_supply">Medical Supply</option>
                    <option value="vaccine">Vaccine</option>
                    <option value="herbal">Herbal</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cadila, EPHARM, Julphar"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData((p) => ({ ...p, manufacturer: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Regulatory Registration #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 05-0143/ET"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData((p) => ({ ...p, registrationNumber: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Dosage Forms (Comma-sep)
                  </label>
                  <input
                    type="text"
                    placeholder="Tablet, Capsule, Suspension"
                    value={formData.dosageForms}
                    onChange={(e) => setFormData((p) => ({ ...p, dosageForms: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Strengths (Comma-sep)
                  </label>
                  <input
                    type="text"
                    placeholder="250mg, 500mg, 125mg/5ml"
                    value={formData.strengths}
                    onChange={(e) => setFormData((p) => ({ ...p, strengths: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Administration Routes
                  </label>
                  <input
                    type="text"
                    placeholder="Oral, IV, Topical"
                    value={formData.routes}
                    onChange={(e) => setFormData((p) => ({ ...p, routes: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.prescriptionRequired}
                    onChange={(e) => setFormData((p) => ({ ...p, prescriptionRequired: e.target.checked }))}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs font-medium text-white">Prescription Required (Rx)</span>
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400">Market Status:</span>
                  <select
                    value={formData.marketStatus}
                    onChange={(e) => setFormData((p) => ({ ...p, marketStatus: e.target.value }))}
                    className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
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
                    : editingMedicine
                    ? 'Update Medicine'
                    : 'Create Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
