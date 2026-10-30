import {
  AdminUser,
  MedicineCategory,
  MedicineDetail,
  MedicineSummary,
  CatalogReviewItem,
  OrganizationDetail,
  OrganizationSummary,
  PlatformAnalytics,
  SubscriptionPlan,
  SubscriptionUpgradeRequest,
  SupportedBank,
  UserDetail,
  UserSummary,
} from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://api1.hibrethub.com/api/v1/platform-admin';

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('nexora_platform_admin_token');
}

export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('nexora_platform_admin_token', token);
  } else {
    localStorage.removeItem('nexora_platform_admin_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (
      response.status === 401 &&
      typeof window !== 'undefined' &&
      window.location.pathname !== '/login' &&
      !endpoint.includes('/login') &&
      !endpoint.includes('/me')
    ) {
      setStoredToken(null);
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/login';
    }
    throw new ApiError(
      response.status,
      body.error?.code || 'UNKNOWN_ERROR',
      body.error?.message || response.statusText || 'Request failed',
    );
  }

  return body.data as T;
}

export const adminApi = {
  // Auth
  login: async (email: string, password: string): Promise<{ token: string; email: string; role: string }> => {
    const data = await request<{ token: string; email: string; role: string }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    return data;
  },

  getMe: async (): Promise<AdminUser> => {
    return request<AdminUser>('/me');
  },

  // Analytics
  getAnalytics: async (): Promise<PlatformAnalytics> => {
    return request<PlatformAnalytics>('/analytics');
  },

  // Users
  listUsers: async (params?: {
    search?: string;
    role?: string;
    organizationId?: string;
    status?: 'active' | 'inactive' | 'all';
    limit?: number;
    offset?: number;
  }): Promise<{ data: UserSummary[]; meta: { total: number; limit: number; offset: number } }> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.role) q.set('role', params.role);
    if (params?.organizationId) q.set('organizationId', params.organizationId);
    if (params?.status) q.set('status', params.status);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));

    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/users?${q.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const body = await res.json();
    return body;
  },

  getUser: async (id: string): Promise<UserDetail> => {
    return request<UserDetail>(`/users/${id}`);
  },

  updateUserStatus: async (id: string, isActive: boolean): Promise<{ id: string; isActive: boolean }> => {
    return request<{ id: string; isActive: boolean }>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  resetUserPassword: async (id: string, temporaryPassword?: string): Promise<{ userId: string; temporaryPassword: string; message: string }> => {
    return request<{ userId: string; temporaryPassword: string; message: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ temporaryPassword }),
    });
  },

  revokeUserSessions: async (id: string): Promise<{ userId: string; revokedCount: number }> => {
    return request<{ userId: string; revokedCount: number }>(`/users/${id}/sessions`, {
      method: 'DELETE',
    });
  },

  // Organizations
  listOrganizations: async (params?: {
    search?: string;
    businessType?: string;
    planId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: OrganizationSummary[]; meta: { total: number; limit: number; offset: number } }> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.businessType) q.set('businessType', params.businessType);
    if (params?.planId) q.set('planId', params.planId);
    if (params?.status) q.set('status', params.status);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));

    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/organizations?${q.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const body = await res.json();
    return body;
  },

  getOrganization: async (id: string): Promise<OrganizationDetail> => {
    return request<OrganizationDetail>(`/organizations/${id}`);
  },

  updateOrganization: async (id: string, data: Partial<OrganizationSummary>): Promise<OrganizationSummary> => {
    return request<OrganizationSummary>(`/organizations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  updateOrganizationStatus: async (id: string, status: string): Promise<OrganizationSummary> => {
    return request<OrganizationSummary>(`/organizations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Subscription Plans
  listPlans: async (businessType?: string): Promise<SubscriptionPlan[]> => {
    const q = businessType ? `?businessType=${businessType}` : '';
    return request<SubscriptionPlan[]>(`/plans${q}`);
  },

  createPlan: async (plan: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
    return request<SubscriptionPlan>('/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  },

  updatePlan: async (id: string, plan: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> => {
    return request<SubscriptionPlan>(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(plan),
    });
  },

  updatePlanStatus: async (id: string, isActive: boolean): Promise<{ id: string; isActive: boolean }> => {
    return request<{ id: string; isActive: boolean }>(`/plans/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  // Subscription Upgrade Requests & Tenant Subscriptions
  listUpgradeRequests: async (status: 'pending' | 'approved' | 'rejected' | 'all' = 'all', limit = 50, offset = 0): Promise<{ data: SubscriptionUpgradeRequest[]; meta: { total: number; limit: number; offset: number } }> => {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/subscription-requests?status=${status}&limit=${limit}&offset=${offset}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.json();
  },

  getUpgradeRequest: async (id: string): Promise<SubscriptionUpgradeRequest> => {
    return request<SubscriptionUpgradeRequest>(`/subscription-requests/${id}`);
  },

  approveUpgradeRequest: async (requestId: string, note?: string): Promise<SubscriptionUpgradeRequest> => {
    return request<SubscriptionUpgradeRequest>(`/subscription-requests/${requestId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  rejectUpgradeRequest: async (requestId: string, note?: string): Promise<SubscriptionUpgradeRequest> => {
    return request<SubscriptionUpgradeRequest>(`/subscription-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  updateOrganizationSubscription: async (orgId: string, input: {
    planId: string;
    billingCycle?: string;
    status?: string;
    overrideLimits?: boolean;
    maxBranches?: number | null;
    maxUsers?: number | null;
  }): Promise<OrganizationSummary> => {
    return request<OrganizationSummary>(`/organizations/${orgId}/subscription`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  // Categories
  listCategories: async (activeOnly = false): Promise<MedicineCategory[]> => {
    return request<MedicineCategory[]>(`/categories${activeOnly ? '?activeOnly=true' : ''}`);
  },

  createCategory: async (category: { value: string; name: string; sortOrder?: number; isActive?: boolean }): Promise<MedicineCategory> => {
    return request<MedicineCategory>('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  },

  updateCategory: async (value: string, data: { name?: string; sortOrder?: number; isActive?: boolean }): Promise<MedicineCategory> => {
    return request<MedicineCategory>(`/categories/${encodeURIComponent(value)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteCategory: async (value: string): Promise<{ value: string; deleted: boolean }> => {
    return request<{ value: string; deleted: boolean }>(`/categories/${encodeURIComponent(value)}`, {
      method: 'DELETE',
    });
  },

  // Master Medicines
  listMedicines: async (params?: {
    search?: string;
    category?: string;
    marketStatus?: string;
    productType?: string;
    prescriptionRequired?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ data: MedicineSummary[]; meta: { total: number; limit: number; offset: number } }> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.category) q.set('category', params.category);
    if (params?.marketStatus) q.set('marketStatus', params.marketStatus);
    if (params?.productType) q.set('productType', params.productType);
    if (params?.prescriptionRequired !== undefined) q.set('prescriptionRequired', String(params.prescriptionRequired));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));

    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/medicines?${q.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.json();
  },

  /** Products pharmacies created, and shared products the catalog split paired by fallback. */
  catalogReviewQueue: (): Promise<CatalogReviewItem[]> => request<CatalogReviewItem[]>('/medicines/review'),

  reviewProduct: (
    id: string,
    action: { action: 'approve' } | { action: 'promote' } | { action: 'retire' } | { action: 'merge'; intoId: string },
  ): Promise<void> =>
    request<void>(`/medicines/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify(action) }),

  getMedicine: async (id: string): Promise<MedicineDetail> => {
    return request<MedicineDetail>(`/medicines/${id}`);
  },

  createMedicine: async (medicine: Partial<MedicineDetail>): Promise<{ id: string }> => {
    return request<{ id: string }>('/medicines', {
      method: 'POST',
      body: JSON.stringify(medicine),
    });
  },

  updateMedicine: async (id: string, medicine: Partial<MedicineDetail>): Promise<MedicineSummary> => {
    return request<MedicineSummary>(`/medicines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(medicine),
    });
  },

  updateMedicineStatus: async (id: string, marketStatus: string): Promise<{ id: string; marketStatus: string }> => {
    return request<{ id: string; marketStatus: string }>(`/medicines/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ marketStatus }),
    });
  },

  /** Bulk-adds catalog items from an .xlsx/.csv file; rows already in the catalog are skipped. */
  importItemTemplates: (input: { fileName: string; base64: string; defaultType: string }) =>
    request<{ total: number; imported: number; skipped: number }>('/medicines/import', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  addMedicinePackage: async (medicineId: string, pkg: Record<string, unknown>): Promise<unknown> => {
    return request(`/medicines/${medicineId}/packages`, {
      method: 'POST',
      body: JSON.stringify(pkg),
    });
  },

  deleteMedicinePackage: async (medicineId: string, packageId: string): Promise<{ id: string; deleted: boolean }> => {
    return request(`/medicines/${medicineId}/packages/${packageId}`, {
      method: 'DELETE',
    });
  },

  // Supported Banks & Wallets
  listBanks: async (params?: { activeOnly?: boolean; forSubscription?: boolean; forPos?: boolean }): Promise<SupportedBank[]> => {
    const q = new URLSearchParams();
    if (params?.activeOnly) q.set('activeOnly', 'true');
    if (params?.forSubscription) q.set('forSubscription', 'true');
    if (params?.forPos) q.set('forPos', 'true');
    return request<SupportedBank[]>(`/banks?${q.toString()}`);
  },

  getBank: async (id: string): Promise<SupportedBank> => {
    return request<SupportedBank>(`/banks/${id}`);
  },

  createBank: async (bank: Partial<SupportedBank>): Promise<SupportedBank> => {
    return request<SupportedBank>('/banks', {
      method: 'POST',
      body: JSON.stringify(bank),
    });
  },

  updateBank: async (id: string, bank: Partial<SupportedBank>): Promise<SupportedBank> => {
    return request<SupportedBank>(`/banks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bank),
    });
  },

  updateBankStatus: async (id: string, status: { isActive?: boolean; supportsSubscription?: boolean; supportsPos?: boolean }): Promise<SupportedBank> => {
    return request<SupportedBank>(`/banks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(status),
    });
  },

  deleteBank: async (id: string): Promise<{ id: string; deleted: boolean }> => {
    return request<{ id: string; deleted: boolean }>(`/banks/${id}`, {
      method: 'DELETE',
    });
  },
};

export const api = adminApi;
