'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import {
  Building2,
  Users,
  TrendingUp,
  FileCheck,
  Pill,
  ArrowRight,
  Loader2,
  DollarSign,
  Activity,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function OverviewPage() {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: adminApi.getAnalytics,
    refetchInterval: 30000, // refresh every 30s
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        <p className="text-xs">Compiling platform telemetry…</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm">
        Failed to load platform analytics. Please check that the backend is running.
      </div>
    );
  }

  const kpis = [
    {
      title: 'Active Organizations',
      value: analytics.organizations.active,
      subtitle: `${analytics.organizations.total} total registered (${analytics.organizations.trialing} in trial)`,
      icon: Building2,
      color: 'from-blue-600 to-indigo-600',
      href: '/organizations',
    },
    {
      title: 'Seat Revenue',
      value: `${analytics.subscriptions.revenue.toLocaleString()} ETB`,
      subtitle: 'Approved activation, branch and user payments',
      icon: DollarSign,
      color: 'from-emerald-600 to-teal-600',
      href: '/subscription-requests',
    },
    {
      title: 'Lifetime GMV',
      value: `${analytics.gmv.totalRevenue.toLocaleString()} ETB`,
      subtitle: `${analytics.gmv.totalSalesCount} completed transactions`,
      icon: TrendingUp,
      color: 'from-violet-600 to-purple-600',
      href: '/organizations',
    },
    {
      title: 'Platform Users',
      value: analytics.users.total,
      subtitle: `${analytics.users.active} active accounts across ${analytics.branches.total} branches`,
      icon: Users,
      color: 'from-amber-600 to-orange-600',
      href: '/users',
    },
    {
      title: 'Pending Upgrades',
      value: analytics.subscriptions.pendingRequests,
      subtitle: `${analytics.subscriptions.approvedRequests} approved to date`,
      icon: FileCheck,
      color: 'from-pink-600 to-rose-600',
      href: '/subscription-requests',
      highlight: analytics.subscriptions.pendingRequests > 0,
    },
    {
      title: 'Master Medicines',
      value: analytics.medicines.total,
      subtitle: `${analytics.medicines.registered} EFDA verified records`,
      icon: Pill,
      color: 'from-cyan-600 to-blue-600',
      href: '/medicines',
    },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={idx}
              href={kpi.href}
              className={`relative overflow-hidden rounded-2xl border p-5 transition-all group ${
                kpi.highlight
                  ? 'border-rose-500/50 bg-rose-950/20 hover:border-rose-400'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">{kpi.title}</p>
                  <p className="text-2xl font-bold text-white mt-1 tracking-tight">{kpi.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${kpi.color} text-white shadow-md`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-800/80">
                <span className="truncate">{kpi.subtitle}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Breakdowns Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Type Breakdown */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>Tenants by Industry Vertical</span>
            </h3>
            <span className="text-xs text-slate-400">{analytics.organizations.total} Total</span>
          </div>

          <div className="space-y-3">
            {analytics.breakdowns.byBusinessType.map((item) => {
              const total = analytics.organizations.total || 1;
              const percent = Math.round((item.count / total) * 100);
              const labelMap: Record<string, string> = {
                pharmacy: 'Pharmacy & Drug Stores',
                gym: 'Fitness Centers & Gyms',
                others: 'General Retail Outlets',
                restaurant: 'Restaurants & Hospitality',
              };

              return (
                <div key={item.type} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-300">{labelMap[item.type] || item.type}</span>
                    <span className="text-slate-400">
                      {item.count} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Signups */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Organization Signups</h3>
            <Link
              href="/organizations"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-800/80">
            {analytics.recentSignups.map((org) => (
              <div key={org.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                <div>
                  <p className="text-xs font-medium text-slate-200">{org.name}</p>
                  <p className="text-[11px] text-slate-500 capitalize">
                    {org.businessType}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                      org.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : org.status === 'trialing'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {org.status}
                  </span>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Upgrade Requests */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Recent Upgrade Requests</h3>
            <Link
              href="/subscription-requests"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
            >
              <span>Review Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {analytics.recentUpgrades.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No recent payments.</p>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {analytics.recentUpgrades.map((req) => (
                <div key={req.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                  <div>
                    <p className="text-xs font-medium text-slate-200">{req.organizationName}</p>
                    <p className="text-[11px] text-slate-500">
                      <span className="text-indigo-400 font-semibold">
                        {req.kind === 'activation' ? 'First payment' : req.kind === 'renewal' ? 'Renewal' : `${req.quantity} × ${req.kind}`}
                      </span>{' '}
                      · ETB {req.amount.toLocaleString()} via {req.paymentMethod.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                        req.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : req.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {req.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                      {req.status === 'pending' && <Clock className="w-3 h-3" />}
                      <span>{req.status}</span>
                    </span>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
