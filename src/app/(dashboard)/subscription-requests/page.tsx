'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { SubscriptionUpgradeRequest } from '@/lib/types';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
  Building2,
  Loader2,
  Search,
  Eye,
  X,
  CreditCard,
} from 'lucide-react';

export default function SubscriptionRequestsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<SubscriptionUpgradeRequest | null>(null);
  const [reviewingRequest, setReviewingRequest] = useState<{
    request: SubscriptionUpgradeRequest;
    action: 'approve' | 'reject';
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-requests', statusFilter],
    queryFn: () => adminApi.listUpgradeRequests(statusFilter),
    refetchInterval: 15000, // auto poll every 15s for pending requests
  });

  const reviewMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      note,
    }: {
      id: string;
      action: 'approve' | 'reject';
      note?: string;
    }) => {
      if (action === 'approve') {
        return adminApi.approveUpgradeRequest(id, note);
      } else {
        return adminApi.rejectUpgradeRequest(id, note);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-requests'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setReviewingRequest(null);
    },
  });

  const requests = data?.data || [];
  const filtered = requests.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.organizationName.toLowerCase().includes(term) ||
      r.requestedByName.toLowerCase().includes(term) ||
      r.transactionId.toLowerCase().includes(term) ||
      r.paymentReference.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Status Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Subscription Upgrade Requests</h2>
          <p className="text-xs text-slate-400 mt-1">
            Review customer deposit slips and provider receipts to approve plan tier upgrades
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 self-start">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by organization, reference, or transaction ID…"
          className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Requests Table / Card List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          <p className="text-xs">Loading upgrade queue…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <FileCheck className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No upgrade requests found</p>
          <p className="text-xs text-slate-500 mt-1">
            {statusFilter === 'pending'
              ? 'All incoming subscription requests have been reviewed.'
              : `No requests with status "${statusFilter}".`}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Organization</th>
                  <th className="px-5 py-3.5">Requested Tier</th>
                  <th className="px-5 py-3.5">Payment Details</th>
                  <th className="px-5 py-3.5">Reference</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Submitted</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Organization */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-xs">{req.organizationName}</p>
                          <p className="text-[11px] text-slate-400 capitalize">
                            By {req.requestedByName} {req.requestedByMobile ? `(${req.requestedByMobile})` : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Transition */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-400 uppercase text-[11px]">
                          {req.currentPlanId}
                        </span>
                        <span className="text-slate-600">&rarr;</span>
                        <span className="font-bold text-indigo-400 uppercase text-[11px]">
                          {req.targetPlanId}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 capitalize">{req.billingCycle} billing</span>
                    </td>

                    {/* Payment Info */}
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-200 capitalize flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req.paymentMethod}</span>
                      </p>
                      <button
                        onClick={() => setSelectedReceipt(req)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                      >
                        <span>TX: {req.transactionId}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>

                    {/* Payment Reference */}
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono font-bold text-xs border border-slate-700">
                        {req.paymentReference}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          req.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : req.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {req.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                        {req.status === 'pending' && <Clock className="w-3 h-3" />}
                        {req.status === 'rejected' && <XCircle className="w-3 h-3" />}
                        <span>{req.status}</span>
                      </span>
                      {req.reviewedBy && (
                        <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[120px]" title={req.reviewedBy}>
                          By {req.reviewedBy}
                        </p>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedReceipt(req)}
                            title="Verify Receipt"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setReviewingRequest({ request: req, action: 'approve' })}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setReviewingRequest({ request: req, action: 'reject' })}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 font-medium text-xs transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedReceipt(req)}
                          className="text-xs text-slate-400 hover:text-slate-200 underline"
                        >
                          View Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receipt Verification Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Payment Receipt Verification</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedReceipt.organizationName} &middot; {selectedReceipt.paymentMethod.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Reference:</span>
                <span className="font-mono font-bold text-indigo-400">{selectedReceipt.paymentReference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Provider Transaction ID:</span>
                <span className="font-mono text-white font-medium">{selectedReceipt.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Plan:</span>
                <span className="text-white font-semibold uppercase">{selectedReceipt.targetPlanId} ({selectedReceipt.billingCycle})</span>
              </div>
              {selectedReceipt.reviewNote && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400 block mb-0.5">Reviewer Note:</span>
                  <p className="text-slate-200 italic">{selectedReceipt.reviewNote}</p>
                </div>
              )}
            </div>

            {/* Direct Verification Link Button */}
            <div className="mb-6">
              <a
                href={selectedReceipt.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-lg shadow-indigo-600/25"
              >
                <span>Open Official Provider Receipt In New Window</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Close
              </button>
              {selectedReceipt.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      const req = selectedReceipt;
                      setSelectedReceipt(null);
                      setReviewingRequest({ request: req, action: 'reject' });
                    }}
                    className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-medium border border-red-500/30"
                  >
                    Reject Request
                  </button>
                  <button
                    onClick={() => {
                      const req = selectedReceipt;
                      setSelectedReceipt(null);
                      setReviewingRequest({ request: req, action: 'approve' });
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Approve Upgrade
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approval / Rejection Decision Modal */}
      {reviewingRequest && (
        <ReviewDecisionModal
          request={reviewingRequest.request}
          action={reviewingRequest.action}
          onClose={() => setReviewingRequest(null)}
          onConfirm={(note) =>
            reviewMutation.mutate({
              id: reviewingRequest.request.id,
              action: reviewingRequest.action,
              note,
            })
          }
          isLoading={reviewMutation.isPending}
        />
      )}
    </div>
  );
}

function ReviewDecisionModal({
  request,
  action,
  onClose,
  onConfirm,
  isLoading,
}: {
  request: SubscriptionUpgradeRequest;
  action: 'approve' | 'reject';
  onClose: () => void;
  onConfirm: (note?: string) => void;
  isLoading: boolean;
}) {
  const [note, setNote] = useState('');
  const isApprove = action === 'approve';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(note);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {isApprove ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Confirm Subscription Upgrade</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-400" />
                <span>Reject Upgrade Request</span>
              </>
            )}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-slate-300">
            {isApprove ? (
              <>
                Are you sure you want to approve{' '}
                <strong className="text-white">{request.organizationName}</strong> for the{' '}
                <strong className="text-indigo-400 uppercase">{request.targetPlanId}</strong> tier? This
                will atomically activate their plan and expand their branch/user quotas.
              </>
            ) : (
              <>
                Are you sure you want to reject the upgrade request for{' '}
                <strong className="text-white">{request.organizationName}</strong>? Please provide a
                clear reason.
              </>
            )}
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Admin Note {isApprove ? '(Optional)' : '(Required)'}
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              required={!isApprove}
              placeholder={
                isApprove
                  ? 'e.g. Verified deposit on Telebirr portal, approved.'
                  : 'e.g. Transaction ID was invalid or amount paid does not match plan price.'
              }
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-md ${
                isApprove
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
              } disabled:opacity-50`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{isApprove ? 'Approve & Activate' : 'Reject Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
