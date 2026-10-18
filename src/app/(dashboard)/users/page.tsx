'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { UserDetail, UserSummary } from '@/lib/types';
import {
  Users,
  Search,
  KeyRound,
  Shield,
  Phone,
  Mail,
  Loader2,
  X,
  CheckCircle2,
  Copy,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
} from 'lucide-react';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [resettingUser, setResettingUser] = useState<UserSummary | null>(null);
  const [temporaryPasswordResult, setTemporaryPasswordResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users', searchTerm, roleFilter, statusFilter, page],
    queryFn: () =>
      adminApi.listUsers({
        search: searchTerm || undefined,
        role: roleFilter || undefined,
        status: statusFilter,
        limit: pageSize,
        offset: page * pageSize,
      }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updateUserStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, temporaryPassword }: { id: string; temporaryPassword?: string }) =>
      adminApi.resetUserPassword(id, temporaryPassword),
    onSuccess: (res) => {
      setTemporaryPasswordResult(res.temporaryPassword);
      setResettingUser(null);
    },
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: (id: string) => adminApi.revokeUserSessions(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, activeSessionsCount: 0 });
      }
    },
  });

  const handleViewUser = async (id: string) => {
    setLoadingUserId(id);
    try {
      const detail = await adminApi.getUser(id);
      setSelectedUser(detail);
    } catch {
      // Fallback
    } finally {
      setLoadingUserId(null);
    }
  };

  const usersList = data?.data || [];
  const totalCount = data?.meta?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Cross-Tenant User Directory</h2>
          <p className="text-xs text-slate-400 mt-1">
            Search, inspect memberships, toggle active status, and reset credentials for platform users
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            placeholder="Search by name, email, mobile, or reference…"
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(0);
          }}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Roles</option>
          <option value="org_admin">Organization Admin</option>
          <option value="branch_manager">Branch Manager</option>
          <option value="seller">Cashier / Seller</option>
          <option value="stock_runner">Stock Runner</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
            setPage(0);
          }}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          <p className="text-xs">Loading user directory…</p>
        </div>
      ) : usersList.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No users found</p>
          <p className="text-xs text-slate-500 mt-1">Try refining your search terms or role filters.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Organization</th>
                  <th className="px-5 py-3.5">Role / Memberships</th>
                  <th className="px-5 py-3.5">Reference</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Created</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {usersList.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* User Info */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-xs uppercase">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{user.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            {user.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-500" />
                                {user.email}
                              </span>
                            )}
                            {user.mobile && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-500" />
                                {user.mobile}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Organization */}
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-200">{user.organizationName}</p>
                      <span className="text-[10px] text-slate-500 capitalize">{user.businessType}</span>
                    </td>

                    {/* Memberships & Roles */}
                    <td className="px-5 py-3.5">
                      {user.isOrgAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <Shield className="w-3 h-3" />
                          <span>Org Admin</span>
                        </span>
                      ) : user.memberships && user.memberships.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.memberships.map((m, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700"
                            >
                              {m.branchName}: {m.role}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No assigned branches</span>
                      )}
                    </td>

                    {/* Reference */}
                    <td className="px-5 py-3.5">
                      {user.paymentReference ? (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[11px] font-bold border border-slate-700">
                          {user.paymentReference}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-600">&mdash;</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          user.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-5 py-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewUser(user.id)}
                          disabled={loadingUserId === user.id}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          {loadingUserId === user.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>Details</>
                          )}
                        </button>

                        <button
                          onClick={() => setResettingUser(user)}
                          title="Reset Password"
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() =>
                            toggleStatusMutation.mutate({
                              id: user.id,
                              isActive: !user.isActive,
                            })
                          }
                          title={user.isActive ? 'Deactivate User' : 'Activate User'}
                          className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                            user.isActive
                              ? 'border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                              : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-5 py-3 bg-slate-950/70 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>
                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalCount)} of{' '}
                {totalCount} users
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-medium text-slate-300">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-lg border border-slate-800 disabled:opacity-40 hover:bg-slate-800 text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-base uppercase">
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedUser.name}</h3>
                  <p className="text-xs text-slate-400">{selectedUser.organizationName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-500 block mb-0.5">Email</span>
                  <span className="text-slate-200 font-medium">{selectedUser.email || 'None'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Mobile Number</span>
                  <span className="text-slate-200 font-medium">{selectedUser.mobile || 'None'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Payment Reference</span>
                  <span className="font-mono font-bold text-indigo-400">
                    {selectedUser.paymentReference || 'Unassigned'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Active Sessions</span>
                  <span className="text-emerald-400 font-semibold">
                    {selectedUser.activeSessionsCount} Active
                  </span>
                </div>
              </div>

              {/* Memberships */}
              <div>
                <p className="font-semibold text-slate-300 mb-2">Branch Memberships</p>
                {selectedUser.memberships && selectedUser.memberships.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedUser.memberships.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800"
                      >
                        <span className="font-medium text-slate-200">{m.branchName}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[10px]">
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic p-3 rounded-xl bg-slate-950 border border-slate-800">
                    No branch-specific roles assigned.
                  </p>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => revokeSessionsMutation.mutate(selectedUser.id)}
                disabled={revokeSessionsMutation.isPending || selectedUser.activeSessionsCount === 0}
                className="px-3 py-1.5 rounded-xl bg-red-600/10 text-red-400 border border-red-500/20 hover:bg-red-600/20 text-xs font-medium disabled:opacity-40 transition-colors"
              >
                Revoke All Sessions
              </button>

              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>Reset User Password</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Reset the password for <strong className="text-white">{resettingUser.name}</strong>. A
              random secure temporary password will be generated and current sessions revoked.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setResettingUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => resetPasswordMutation.mutate({ id: resettingUser.id })}
                disabled={resetPasswordMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white shadow-md shadow-amber-600/30 disabled:opacity-50"
              >
                {resetPasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Generate Temporary Password</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Password Result Alert Modal */}
      {temporaryPasswordResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-emerald-500/40 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Password Reset Completed</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Provide this temporary password to the user. Existing login sessions have been invalidated.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between mb-5">
              <code className="text-sm font-mono font-bold text-emerald-400">
                {temporaryPasswordResult}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(temporaryPasswordResult);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setTemporaryPasswordResult(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
