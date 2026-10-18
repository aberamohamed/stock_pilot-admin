'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { SupportedBank } from '@/lib/types';
import {
  Wallet,
  Building,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';

export default function BanksPage() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<'all' | 'bank' | 'wallet'>('all');
  const [editingBank, setEditingBank] = useState<SupportedBank | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: banks, isLoading } = useQuery({
    queryKey: ['banks'],
    queryFn: () => adminApi.listBanks(),
  });

  const createMutation = useMutation({
    mutationFn: (bank: Partial<SupportedBank>) => adminApi.createBank(bank),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      setIsCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, bank }: { id: string; bank: Partial<SupportedBank> }) =>
      adminApi.updateBank(id, bank),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      setEditingBank(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: { isActive?: boolean; supportsSubscription?: boolean; supportsPos?: boolean } }) =>
      adminApi.updateBankStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteBank(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banks'] });
      setDeletingId(null);
    },
  });

  const filtered = (banks || []).filter((b) => {
    if (typeFilter === 'all') return true;
    return b.type === typeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Supported Banks & Wallets</h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure platform subscription deposit accounts and tenant POS digital payment options
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Payment Method</span>
        </button>
      </div>

      {/* Type Filter Tabs */}
      <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 self-start">
        {(['all', 'bank', 'wallet'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
              typeFilter === t
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'all' ? 'All Providers' : t === 'bank' ? 'Commercial Banks' : 'Digital Wallets'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          <p className="text-xs">Loading payment methods…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
          <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">No payment methods found</p>
          <p className="text-xs text-slate-500 mt-1">Add a bank account or digital wallet to start collecting payments.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((bank) => {
            const isWallet = bank.type === 'wallet';
            return (
              <div
                key={bank.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div>
                  {/* Top Bar: Icon, Name & Code */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          isWallet
                            ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {isWallet ? <Wallet className="w-5 h-5" /> : <Building className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm leading-tight">{bank.name}</h3>
                        <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wide">
                          Code: {bank.code}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: bank.id,
                          status: { isActive: !bank.isActive },
                        })
                      }
                      title="Toggle active status"
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                        bank.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {bank.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>

                  {/* Account / Merchant details */}
                  <div className="my-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs">
                    {bank.accountName && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Account Name:</span>
                        <span className="text-slate-200 font-medium">{bank.accountName}</span>
                      </div>
                    )}
                    {bank.accountNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Account No:</span>
                        <span className="font-mono text-indigo-400 font-bold">{bank.accountNumber}</span>
                      </div>
                    )}
                    {bank.merchantCode && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Till / Merchant:</span>
                        <span className="font-mono text-violet-400 font-bold">{bank.merchantCode}</span>
                      </div>
                    )}
                  </div>

                  {/* Receipt verification URL pattern preview */}
                  {bank.receiptUrlPattern && (
                    <div className="mb-3 text-[11px] text-slate-400 truncate">
                      <span className="text-slate-500 block mb-0.5">Receipt Verification:</span>
                      <code className="text-[10px] text-emerald-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {bank.receiptUrlPattern}
                      </code>
                    </div>
                  )}

                  {/* Instructions */}
                  {bank.instructions && (
                    <p className="text-xs text-slate-400 italic line-clamp-2 mb-3">
                      &ldquo;{bank.instructions}&rdquo;
                    </p>
                  )}

                  {/* Capability Badges */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                        bank.supportsSubscription
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {bank.supportsSubscription ? '✓ Subscriptions' : '✕ No Subscriptions'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                        bank.supportsPos
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {bank.supportsPos ? '✓ POS Cashier' : '✕ No POS'}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Order: {bank.sortOrder}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingBank(bank)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(bank.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Bank Modal */}
      {(isCreating || editingBank) && (
        <BankFormModal
          bank={editingBank}
          onClose={() => {
            setIsCreating(false);
            setEditingBank(null);
          }}
          onSave={(data) => {
            if (editingBank) {
              updateMutation.mutate({ id: editingBank.id, bank: data });
            } else {
              createMutation.mutate(data);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">Delete Payment Method</h3>
            <p className="text-xs text-slate-400 mb-5">
              Are you sure you want to delete this payment provider? Tenants won&apos;t be able to pay with it.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-xl bg-red-600 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BankFormModal({
  bank,
  onClose,
  onSave,
  isLoading,
}: {
  bank: SupportedBank | null;
  onClose: () => void;
  onSave: (data: Partial<SupportedBank>) => void;
  isLoading: boolean;
}) {
  const [code, setCode] = useState(bank?.code || '');
  const [name, setName] = useState(bank?.name || '');
  const [type, setType] = useState<'bank' | 'wallet'>(bank?.type || 'bank');
  const [accountName, setAccountName] = useState(bank?.accountName || '');
  const [accountNumber, setAccountNumber] = useState(bank?.accountNumber || '');
  const [merchantCode, setMerchantCode] = useState(bank?.merchantCode || '');
  const [receiptUrlPattern, setReceiptUrlPattern] = useState(bank?.receiptUrlPattern || '');
  const [instructions, setInstructions] = useState(bank?.instructions || '');
  const [supportsSubscription, setSupportsSubscription] = useState(bank ? bank.supportsSubscription : true);
  const [supportsPos, setSupportsPos] = useState(bank ? bank.supportsPos : true);
  const [isActive, setIsActive] = useState(bank ? bank.isActive : true);
  const [sortOrder, setSortOrder] = useState(bank ? bank.sortOrder : 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      code: code.trim().toLowerCase(),
      name: name.trim(),
      type,
      accountName: accountName.trim() || null,
      accountNumber: accountNumber.trim() || null,
      merchantCode: merchantCode.trim() || null,
      receiptUrlPattern: receiptUrlPattern.trim() || null,
      instructions: instructions.trim() || null,
      supportsSubscription,
      supportsPos,
      isActive,
      sortOrder: Number(sortOrder),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-white">
            {bank ? `Edit ${bank.name}` : 'Add Supported Bank or Wallet'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Provider Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. cbe, telebirr"
                required
                disabled={!!bank}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Provider Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'bank' | 'wallet')}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="bank">Commercial Bank</option>
                <option value="wallet">Digital Wallet</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Commercial Bank of Ethiopia (CBE)"
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Account Holder Name</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Nexora Tech PLC"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="1000123456789"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Till / Shortcode / Merchant Code</label>
              <input
                type="text"
                value={merchantCode}
                onChange={(e) => setMerchantCode(e.target.value)}
                placeholder="982341"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Sort Display Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Receipt URL Verification Pattern <span className="text-slate-500">(use {'{id}'} for transaction ID)</span>
            </label>
            <input
              type="text"
              value={receiptUrlPattern}
              onChange={(e) => setReceiptUrlPattern(e.target.value)}
              placeholder="https://apps.cbe.com.et:100/BranchReceipt/{id}"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Deposit Instructions</label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Instructions displayed to users on the mobile deposit screen"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={supportsSubscription}
                onChange={(e) => setSupportsSubscription(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Supports Subscriptions</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={supportsPos}
                onChange={(e) => setSupportsPos(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Supports POS Checkout</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Active</span>
            </label>
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Save Provider</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
