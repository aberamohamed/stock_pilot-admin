'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { SubscriptionPlan } from '@/lib/types';
import {
  Check,
  Edit2,
  Building2,
  Users,
  Clock,
  Loader2,
  X,
} from 'lucide-react';

const verticals = [
  { id: 'pharmacy', label: 'Pharmacy', desc: 'Digital sales, medicine inventory, prescriptions' },
  { id: 'gym', label: 'Gym & Fitness', desc: 'Membership passes, turnstile check-ins, shakes POS' },
  { id: 'others', label: 'General Retail', desc: 'Products, barcodes, sales & stock management' },
];

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [selectedVertical, setSelectedVertical] = useState('pharmacy');
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans', selectedVertical],
    queryFn: () => adminApi.listPlans(selectedVertical),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: Partial<SubscriptionPlan> }) =>
      adminApi.updatePlan(id, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setEditingPlan(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updatePlanStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });

  return (
    <div className="space-y-8">
      {/* Header controls & Vertical Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Subscription Plans Catalog</h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure pricing tiers, quota ceilings, and feature entitlements for each vertical
          </p>
        </div>

        {/* Vertical Selector */}
        <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 self-start">
          {verticals.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVertical(v.id)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedVertical === v.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          <p className="text-xs">Loading {selectedVertical} subscription tiers…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans?.map((plan) => {
            const isHighlight = plan.highlight;
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 transition-all ${
                  isHighlight
                    ? 'border-indigo-500/60 bg-gradient-to-b from-indigo-950/40 via-slate-900/80 to-slate-900 shadow-xl shadow-indigo-500/10'
                    : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                }`}
              >
                {/* Popular Highlight Tag */}
                {isHighlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-[10px] font-bold text-white uppercase tracking-wider shadow-md">
                    Recommended
                  </div>
                )}

                {/* Plan Title & Active Toggle */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-white capitalize">{plan.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 min-h-[32px]">
                      {plan.description}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      plan.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                    }`}
                  >
                    {plan.isActive ? 'Active' : 'Archived'}
                  </span>
                </div>

                {/* Price Display */}
                <div className="my-4 py-4 border-y border-slate-800/80">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">
                      {plan.monthlyPrice.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase">
                      {plan.currency} / mo
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Billed annually: {plan.yearlyPrice.toLocaleString()} {plan.currency}/yr
                  </p>
                </div>

                {/* Ceilings & Limits */}
                <div className="space-y-2 mb-6 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>
                      {plan.maxBranches === null ? 'Unlimited Branches' : `Up to ${plan.maxBranches} Branches`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {plan.maxUsers === null ? 'Unlimited Staff Accounts' : `Up to ${plan.maxUsers} Staff Accounts`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{plan.trialDays} Days Free Trial</span>
                  </div>
                </div>

                {/* Feature List */}
                <div className="flex-1 space-y-2.5 mb-6">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Included Features
                  </p>
                  {plan.features?.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2">
                  <button
                    onClick={() => setEditingPlan(plan)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Tier</span>
                  </button>

                  <button
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        id: plan.id,
                        isActive: !plan.isActive,
                      })
                    }
                    disabled={toggleActiveMutation.isPending}
                    title={plan.isActive ? 'Archive Plan' : 'Restore Plan'}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                      plan.isActive
                        ? 'border-slate-800 hover:border-red-500/50 hover:bg-red-500/10 text-slate-400 hover:text-red-400'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {plan.isActive ? 'Archive' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <EditPlanModal
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSave={(updated) =>
            updateMutation.mutate({
              id: editingPlan.id,
              plan: updated,
            })
          }
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function EditPlanModal({
  plan,
  onClose,
  onSave,
  isLoading,
}: {
  plan: SubscriptionPlan;
  onClose: () => void;
  onSave: (data: Partial<SubscriptionPlan>) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description);
  const [monthlyPrice, setMonthlyPrice] = useState(plan.monthlyPrice);
  const [yearlyPrice, setYearlyPrice] = useState(plan.yearlyPrice);
  const [maxBranches, setMaxBranches] = useState<string>(
    plan.maxBranches === null ? '' : String(plan.maxBranches),
  );
  const [maxUsers, setMaxUsers] = useState<string>(
    plan.maxUsers === null ? '' : String(plan.maxUsers),
  );
  const [trialDays, setTrialDays] = useState(plan.trialDays);
  const [highlight, setHighlight] = useState(plan.highlight);
  const [featuresText, setFeaturesText] = useState(plan.features.join('\n'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      monthlyPrice: Number(monthlyPrice),
      yearlyPrice: Number(yearlyPrice),
      maxBranches: maxBranches.trim() === '' ? null : Number(maxBranches),
      maxUsers: maxUsers.trim() === '' ? null : Number(maxUsers),
      trialDays: Number(trialDays),
      highlight,
      features: featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white capitalize">
              Edit {plan.name} Tier ({plan.businessType})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Adjust pricing ceilings and feature points</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Plan Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Monthly Price (ETB)</label>
              <input
                type="number"
                min="0"
                value={monthlyPrice}
                onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Yearly Price (ETB)</label>
              <input
                type="number"
                min="0"
                value={yearlyPrice}
                onChange={(e) => setYearlyPrice(Number(e.target.value))}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Max Branches <span className="text-slate-500">(blank=∞)</span>
              </label>
              <input
                type="number"
                min="1"
                placeholder="Unlimited"
                value={maxBranches}
                onChange={(e) => setMaxBranches(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Max Users <span className="text-slate-500">(blank=∞)</span>
              </label>
              <input
                type="number"
                min="1"
                placeholder="Unlimited"
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Trial Days</label>
              <input
                type="number"
                min="0"
                value={trialDays}
                onChange={(e) => setTrialDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Included Feature Bullet Points <span className="text-slate-500">(one per line)</span>
            </label>
            <textarea
              rows={4}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="highlight"
              checked={highlight}
              onChange={(e) => setHighlight(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="highlight" className="text-xs font-medium text-slate-300 cursor-pointer">
              Highlight as &quot;Recommended / Popular&quot; badge
            </label>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
