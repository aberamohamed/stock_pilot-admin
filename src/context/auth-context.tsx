'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, ApiError, getStoredToken, setStoredRefreshToken, setStoredToken } from '@/lib/api';
import { AdminUser } from '@/lib/types';

interface AuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const token = getStoredToken();
      if (!token) {
        setAdmin(null);
        setLoading(false);
        return;
      }

      try {
        const user = await adminApi.getMe();
        setAdmin(user);
      } catch (error) {
        // A rejected session was already cleared (and sent to sign-in); a network failure keeps the tokens for the next try.
        setAdmin(null);
        if (error instanceof ApiError && error.status === 401) setStoredToken(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await adminApi.login(email, password);
    setAdmin({ email: res.email, role: 'super_admin' });
    router.push('/');
  };

  const logout = () => {
    setStoredToken(null);
    setStoredRefreshToken(null);
    setAdmin(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        loading,
        isAuthenticated: !!admin,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
