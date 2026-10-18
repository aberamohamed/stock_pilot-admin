'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { RefreshCw, Server, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Executive Overview', subtitle: 'Platform-wide telemetry, KPIs & growth trends' },
  '/users': { title: 'User Management', subtitle: 'Global user directory, memberships & security controls' },
  '/organizations': { title: 'Organizations', subtitle: 'Multi-tenant businesses, branches & operational status' },
  '/plans': { title: 'Subscription Plans', subtitle: 'Catalog tiers, pricing models & feature access matrix' },
  '/subscription-requests': { title: 'Upgrade Queue', subtitle: 'Tenant payment receipts & instant subscription review' },
  '/categories': { title: 'Medicine Categories', subtitle: 'National therapeutic drug categories and sorting' },
  '/medicines': { title: 'Master Medicines', subtitle: 'EFDA regulatory catalog, dosage forms & packaging' },
  '/banks': { title: 'Banks & Digital Wallets', subtitle: 'Platform collection accounts & tenant POS payment methods' },
};

export function Navbar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const currentRoute = routeTitles[pathname] || {
    title: 'Platform Administration',
    subtitle: 'System management and oversight',
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.refetchQueries();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-base font-bold text-white tracking-tight leading-none">
          {currentRoute.title}
        </h1>
        <p className="text-xs text-slate-400 mt-1">{currentRoute.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* API connection indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Server className="w-3.5 h-3.5 text-slate-400" />
          <span>API Connected</span>
        </div>

        {/* Global Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-800/60 hover:bg-slate-800 text-xs text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        {/* Security badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span className="hidden sm:inline">SuperAdmin</span>
        </div>
      </div>
    </header>
  );
}
