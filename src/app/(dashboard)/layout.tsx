'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Sidebar, canOpenAdminPage } from '@/components/sidebar';
import { Navbar } from '@/components/navbar';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading, admin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // The first segment names the page (/organizations/123 is the organizations page).
  const pageRoot = '/' + (pathname.split('/')[1] ?? '');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs font-medium tracking-wide">Loading platform session…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {canOpenAdminPage(pageRoot, admin?.role) ? children : (
            <div className="mx-auto mt-24 max-w-md rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center">
              <h2 className="text-lg font-bold text-white">Not available for your role</h2>
              <p className="mt-1 text-sm text-slate-400">Ask a Super Admin if you need access to this page.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
