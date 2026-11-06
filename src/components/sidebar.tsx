'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  FileCheck,
  FolderTree,
  Pill,
  Tag,
  FileSpreadsheet,
  Wallet,
  ShieldCheck,
  Sparkles,
  Handshake,
  KeyRound,
  Bell,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';

const navItems = [
  {
    name: 'Overview',
    href: '/',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
    badge: null,
  },
  {
    name: 'Organizations',
    href: '/organizations',
    icon: Building2,
    badge: null,
  },
  {
    name: 'Payments',
    href: '/subscription-requests',
    icon: FileCheck,
    badge: 'Review',
  },
  {
    name: 'Pricing',
    href: '/pricing',
    icon: Tag,
    badge: null,
  },
  {
    name: 'Medicine Categories',
    href: '/categories',
    icon: FolderTree,
    badge: null,
  },
  {
    name: 'Master Medicines',
    href: '/medicines',
    icon: Pill,
    badge: null,
  },
  {
    name: 'Item Templates',
    href: '/item-templates',
    icon: FileSpreadsheet,
    badge: null,
  },
  {
    name: 'Catalog Review',
    href: '/catalog-review',
    icon: FileCheck,
    badge: null,
  },
  {
    name: 'Banks & Wallets',
    href: '/banks',
    icon: Wallet,
    badge: null,
  },
  {
    name: 'Payment verification',
    href: '/payment-verification',
    icon: ShieldCheck,
    badge: null,
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: Bell,
    badge: null,
  },
  {
    name: 'Roles & permissions',
    href: '/permissions',
    icon: KeyRound,
    badge: null,
  },
  {
    name: 'Sales agents',
    href: '/sales-agents',
    icon: Handshake,
    badge: null,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { admin, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 border-r border-slate-800 bg-slate-900/90 backdrop-blur-xl flex flex-col z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20 text-white">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-sm text-white tracking-tight block leading-tight">
            Nexora Admin
          </span>
          <span className="text-[11px] text-indigo-400 font-medium tracking-wide uppercase">
            Platform Ops
          </span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Management Modules
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.name}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Admin User & Logout */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-medium text-slate-200 truncate">
              {admin?.email || 'Platform Admin'}
            </p>
            <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
              Super Admin
            </p>
          </div>

          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
