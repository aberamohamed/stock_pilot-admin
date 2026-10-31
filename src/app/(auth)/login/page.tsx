'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Lock, Mail, ShieldAlert, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [expired, setExpired] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setExpired(new URLSearchParams(window.location.search).get('expired') === '1');
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('admin@stockpilot.com');
    setPassword('adminpassword123');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-950">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-violet-600/10 rounded-full blur-[110px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/25 mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Nexora Stock Pilot</h1>
          <p className="text-sm text-slate-400 mt-1">Platform Management & Supervision Console</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/60">
          <h2 className="text-lg font-semibold text-white mb-1">Super Admin Authentication</h2>
          <p className="text-xs text-slate-400 mb-6">Enter platform credentials to access administrative systems</p>

          {expired && !error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Your session expired. Please sign in again.</span>
            </div>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@stockpilot.com"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Master Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials…</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Development Quick Fill button */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fill Development Credentials</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-600 mt-6">
          Nexora Technologies PLC &copy; 2026 &middot; Multi-Tenant Platform Operations
        </p>
      </div>
    </div>
  );
}
