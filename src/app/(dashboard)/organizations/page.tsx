'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pagination } from '@/components/pagination';
import { adminApi } from '@/lib/api';
import { OrganizationDetail, OrganizationSummary } from '@/lib/types';
import {
  Building2,
  Search,
  MapPin,
  Phone,
  Loader2,
  Edit2,
  X,
  Store,
  Layers,
  Calendar,
  Pill,
  ShoppingBag,
} from 'lucide-react';

export default function OrganizationsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Selected organization for right table
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [editingOrg, setEditingOrg] = useState<OrganizationSummary | null>(null);

  // Query: Organizations list
  const { data, isLoading } = useQuery({
    queryKey: ['organizations', searchTerm, businessTypeFilter, planFilter, statusFilter, page, pageSize],
    queryFn: () =>
      adminApi.listOrganizations({
        search: searchTerm || undefined,
        businessType: businessTypeFilter || undefined,
        planId: planFilter || undefined,
        status: statusFilter || undefined,
        limit: pageSize,
        offset: page * pageSize,
      }),
  });

  const orgsList = data?.data || [];
  const totalCount = data?.meta?.total || 0;

  // Active organization: either explicitly selected or first from current page
  const activeOrgId = selectedOrgId || orgsList[0]?.id || null;

  // Query: Selected Organization Detail (including branches)
  const { data: selectedOrgDetail, isLoading: isLoadingDetail } = useQuery<OrganizationDetail | null>({
    queryKey: ['organization-detail', activeOrgId],
    queryFn: () => (activeOrgId ? adminApi.getOrganization(activeOrgId) : null),
    enabled: !!activeOrgId,
  });

  // Status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateOrganizationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-detail', activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  // Edit limits mutation
  const updateOrgMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OrganizationSummary> }) =>
      adminApi.updateOrganization(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization-detail', activeOrgId] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setEditingOrg(null);
    },
  });

  const selectedSummary = orgsList.find((o) => o.id === activeOrgId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            Organization Tenants & Branches
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Click any organization on the left to inspect its branch network, physical locations, and inventory counts.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            placeholder="Search organization name, phone, address..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={businessTypeFilter}
          onChange={(e) => {
            setBusinessTypeFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Verticals</option>
          <option value="pharmacy">Pharmacy</option>
          <option value="gym">Gym & Fitness</option>
          <option value="others">Retail / Other</option>
        </select>

        <select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Plans</option>
          <option value="starter">Starter</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="trialing">Trialing</option>
          <option value="past_due">Past Due</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      {/* Two-Table Split Layout: Left Organizations Table, Right Branches Table */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Organization List (7 Cols) */}
        <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Organizations</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                {totalCount}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Click a row to load branches</span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
              <p className="text-xs">Loading organizations...</p>
            </div>
          ) : orgsList.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-300">No organizations found</p>
              <p className="text-xs text-slate-500 mt-1">Try relaxing your search or filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Organization</th>
                      <th className="px-3 py-3">Vertical & Plan</th>
                      <th className="px-3 py-3">Branches</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3 text-right">Edit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {orgsList.map((org) => {
                      const isSelected = org.id === activeOrgId;
                      return (
                        <tr
                          key={org.id}
                          onClick={() => setSelectedOrgId(org.id)}
                          className={`cursor-pointer transition-all duration-150 ${
                            isSelected
                              ? 'bg-indigo-600/15 border-l-4 border-indigo-500 text-white'
                              : 'hover:bg-slate-800/40 text-slate-300'
                          }`}
                        >
                          {/* Organization Name & Contact */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {org.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className={`font-semibold truncate max-w-[170px] ${isSelected ? 'text-indigo-200' : 'text-white'}`}>
                                  {org.name}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate max-w-[170px]">
                                  {org.phone ? (
                                    <>
                                      <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                      <span className="truncate">{org.phone}</span>
                                    </>
                                  ) : org.address ? (
                                    <>
                                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                      <span className="truncate">{org.address}</span>
                                    </>
                                  ) : (
                                    <span className="text-slate-600">No contact info</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Vertical & Plan */}
                          <td className="px-3 py-3">
                            <div className="capitalize text-slate-300 font-medium">{org.businessType}</div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-indigo-400 uppercase mt-0.5 inline-block">
                              {org.planId}
                            </span>
                          </td>

                          {/* Branches count */}
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-200">
                              <Store className="w-3 h-3 text-indigo-400" />
                              {org.branchCount}
                              <span className="text-slate-500 font-normal">
                                /{org.maxBranches ?? '∞'}
                              </span>
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={org.subscriptionStatus}
                              onChange={(e) =>
                                updateStatusMutation.mutate({
                                  id: org.id,
                                  status: e.target.value,
                                })
                              }
                              className={`text-[11px] px-2 py-0.5 rounded-md font-medium border focus:outline-none cursor-pointer ${
                                org.subscriptionStatus === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : org.subscriptionStatus === 'trialing'
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : org.subscriptionStatus === 'past_due'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}
                            >
                              <option value="active" className="bg-slate-900 text-slate-200">Active</option>
                              <option value="trialing" className="bg-slate-900 text-slate-200">Trialing</option>
                              <option value="past_due" className="bg-slate-900 text-slate-200">Past Due</option>
                              <option value="canceled" className="bg-slate-900 text-slate-200">Canceled</option>
                            </select>
                          </td>

                          {/* Edit Quotas Action */}
                          <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setEditingOrg(org)}
                              title="Edit Quotas & Subscription Limits"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination total={totalCount} page={page + 1} pageSize={pageSize} onPage={(p) => setPage(p - 1)} onPageSize={setPageSize} />
            </>
          )}
        </div>

        {/* Right Column: Selected Organization's Branches (5 Cols) */}
        <div className="xl:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl sticky top-24">
          {/* Header of Branches Panel */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/60">
            {selectedSummary ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">
                      Branches of {selectedSummary.name}
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {selectedOrgDetail?.branches?.length || 0} Registered
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-500" />
                    Quota: <strong className="text-slate-200">{selectedSummary.maxBranches ?? 'Unlimited'}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="capitalize">{selectedSummary.businessType}</span>
                  </span>
                  {selectedSummary.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500" />
                      {selectedSummary.phone}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Store className="w-4 h-4 text-slate-500" />
                <span>Select an organization to view branches</span>
              </div>
            )}
          </div>

          {/* Branches Table Content */}
          {!activeOrgId ? (
            <div className="py-24 text-center text-slate-500 px-6">
              <Store className="w-10 h-10 mx-auto text-slate-700 mb-2" />
              <p className="text-sm text-slate-400">No organization selected</p>
              <p className="text-xs text-slate-600 mt-1">
                Choose any organization on the left table to inspect its branches.
              </p>
            </div>
          ) : isLoadingDetail ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <p className="text-xs">Loading branches for {selectedSummary?.name}...</p>
            </div>
          ) : !selectedOrgDetail?.branches || selectedOrgDetail.branches.length === 0 ? (
            <div className="py-20 text-center text-slate-500 px-6">
              <Store className="w-10 h-10 mx-auto text-slate-700 mb-2" />
              <p className="text-sm font-medium text-slate-300">No branches registered yet</p>
              <p className="text-xs text-slate-500 mt-1">
                This organization has not established any branch locations yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Branch Name</th>
                    <th className="px-3 py-3">Address & Phone</th>
                    <th className="px-3 py-3">Catalog Size</th>
                    <th className="px-3 py-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {selectedOrgDetail.branches.map((branch) => (
                    <tr key={branch.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{branch.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          ID: {branch.id.slice(0, 8)}...
                        </div>
                      </td>

                      <td className="px-3 py-3.5">
                        <div className="text-slate-300 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[140px]">
                            {branch.address || 'No address specified'}
                          </span>
                        </div>
                        {branch.phone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{branch.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          {branch.medicinesCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400">
                              <Pill className="w-3 h-3" />
                              {branch.medicinesCount} medicines
                            </span>
                          ) : null}
                          {branch.retailProductsCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                              <ShoppingBag className="w-3 h-3" />
                              {branch.retailProductsCount} retail products
                            </span>
                          ) : null}
                          {branch.medicinesCount === 0 && branch.retailProductsCount === 0 ? (
                            <span className="text-[11px] text-slate-500">0 SKUs listed</span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-right whitespace-nowrap text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {new Date(branch.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Organization Quotas & Subscription Modal */}
      {editingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-white">
                  Edit Limits: {editingOrg.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingOrg(null)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const maxBranches = form.maxBranches.value ? parseInt(form.maxBranches.value) : null;
                const maxUsers = form.maxUsers.value ? parseInt(form.maxUsers.value) : null;
                const planId = form.planId.value as OrganizationSummary['planId'];
                const subscriptionStatus = form.subscriptionStatus.value as OrganizationSummary['subscriptionStatus'];

                updateOrgMutation.mutate({
                  id: editingOrg.id,
                  data: {
                    maxBranches,
                    maxUsers,
                    planId,
                    subscriptionStatus,
                  },
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Max Branches Quota
                  </label>
                  <input
                    name="maxBranches"
                    type="number"
                    defaultValue={editingOrg.maxBranches ?? ''}
                    placeholder="Empty for unlimited"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Currently used: {editingOrg.branchCount}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Max Users Quota
                  </label>
                  <input
                    name="maxUsers"
                    type="number"
                    defaultValue={editingOrg.maxUsers ?? ''}
                    placeholder="Empty for unlimited"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Currently used: {editingOrg.userCount}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Subscription Plan
                  </label>
                  <select
                    name="planId"
                    defaultValue={editingOrg.planId}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="starter">Starter</option>
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Subscription Status
                  </label>
                  <select
                    name="subscriptionStatus"
                    defaultValue={editingOrg.subscriptionStatus}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="trialing">Trialing</option>
                    <option value="past_due">Past Due</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingOrg(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateOrgMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {updateOrgMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
