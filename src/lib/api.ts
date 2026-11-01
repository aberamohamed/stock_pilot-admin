import {
  AdminUser,
  BillingSettings,
  PaymentVerificationSettings,
  AdminBroadcast,
  PermissionInfo,
  RoleDefinitionInfo,
  SalesAgent,
  SalesAgentDetail,
  SalesAgentInput,
  BillingSettingsChange,
  MedicineCategory,
  MedicineDetail,
  MedicineSummary,
  CatalogReviewItem,
  OrganizationDetail,
  OrganizationSummary,
  PlatformAnalytics,
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

const REFRESH_KEY = 'nexora_platform_admin_refresh_token';
const getRefreshToken = () => (typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY));
export function setStoredRefreshToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(REFRESH_KEY, token);
  else localStorage.removeItem(REFRESH_KEY);
}

export const SESSION_EXPIRED_MESSAGE = 'Your session expired. Please sign in again.';

/** Once the session is over, nothing is sent until the admin signs in again (stops polling from failing forever). */
let sessionEnded = false;
export function markSignedIn() {
  sessionEnded = false;
}

function endSession() {
  if (sessionEnded) return;
  sessionEnded = true;
  setStoredToken(null);
  setStoredRefreshToken(null);
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login?expired=1';
  }
}

let pendingRefresh: Promise<boolean> | null = null;

/** Swaps the refresh token for new tokens, once even when several requests fail together. A network failure keeps the session. */
function refreshSession(): Promise<boolean> {
  pendingRefresh ??= (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (res.status === 401 || res.status === 403) return false;
      if (!res.ok) throw new Error('refresh failed');
      const body = await res.json();
      setStoredToken(body.data.token);
      setStoredRefreshToken(body.data.refreshToken);
      return true;
    } catch {
      throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection.');
    }
  })().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

async function send(endpoint: string, options: RequestInit): Promise<Response> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_BASE}${endpoint}`, { ...options, headers });
}

/** The JSON body of a call; a 401 renews the token and repeats once, and a rejected refresh ends the session. */
async function requestBody(endpoint: string, options: RequestInit = {}): Promise<any> {
  const isAuthCall = endpoint.includes('/login') || endpoint.includes('/refresh');
  if (sessionEnded && !isAuthCall) throw new ApiError(401, 'SESSION_EXPIRED', SESSION_EXPIRED_MESSAGE);

  let response = await send(endpoint, options);
  if (response.status === 401 && !isAuthCall) {
    if (await refreshSession()) response = await send(endpoint, options);
    if (response.status === 401) {
      endSession();
      throw new ApiError(401, 'SESSION_EXPIRED', SESSION_EXPIRED_MESSAGE);
    }
  }

  const raw = await response.text();
  let body: any = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }
  if (!response.ok) {
    // A proxy in front of the API (nginx) answers a too-large upload with a web page, not JSON: say what happened.
    const fallback =
      response.status === 413
        ? 'The server refused this upload because it is too large (413 Content Too Large). Ask support to raise the server\'s upload limit (nginx client_max_body_size), or split the file into smaller parts.'
        : response.statusText || (raw && !raw.trim().startsWith('<') ? raw.trim().slice(0, 300) : '') || `Request failed (${response.status})`;
    throw new ApiError(response.status, body.error?.code || (response.status === 413 ? 'PAYLOAD_TOO_LARGE' : 'UNKNOWN_ERROR'), body.error?.message || fallback);
  }
  return body;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return (await requestBody(endpoint, options)).data as T;
}

export const adminApi = {
  // Auth
  login: async (email: string, password: string): Promise<{ token: string; refreshToken: string; email: string; role: string }> => {
    const data = await request<{ token: string; refreshToken: string; email: string; role: string }>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    markSignedIn();
    setStoredToken(data.token);
    setStoredRefreshToken(data.refreshToken);
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

    return requestBody(`/users?${q.toString()}`);
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
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: OrganizationSummary[]; meta: { total: number; limit: number; offset: number } }> => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.businessType) q.set('businessType', params.businessType);
    if (params?.status) q.set('status', params.status);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.offset) q.set('offset', String(params.offset));

    return requestBody(`/organizations?${q.toString()}`);
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

  // Subscription Upgrade Requests & Tenant Subscriptions
  listUpgradeRequests: async (status: 'pending' | 'approved' | 'rejected' | 'all' = 'all', limit = 50, offset = 0): Promise<{ data: SubscriptionUpgradeRequest[]; meta: { total: number; limit: number; offset: number } }> => {
    return requestBody(`/subscription-requests?status=${status}&limit=${limit}&offset=${offset}`);
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

  /** Checks the Telebirr receipt again, now, and saves what was found. */
  verifyUpgradeRequest: async (requestId: string): Promise<{ request: SubscriptionUpgradeRequest; verification: { status: 'verified' | 'review' | 'unverified' | 'invalid'; note: string } }> => {
    return request(`/subscription-requests/${requestId}/verify`, { method: 'POST', body: '{}' });
  },

  rejectUpgradeRequest: async (requestId: string, note?: string): Promise<SubscriptionUpgradeRequest> => {
    return request<SubscriptionUpgradeRequest>(`/subscription-requests/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  // Pricing: what a branch and an extra user cost, and the users a branch includes
  billingSettingsHistory: () => request<BillingSettingsChange[]>('/billing-settings/history'),
  getPaymentVerification: () => request<PaymentVerificationSettings>('/payment-verification'),
  updatePaymentVerification: (settings: PaymentVerificationSettings) =>
    request<PaymentVerificationSettings>('/payment-verification', { method: 'PUT', body: JSON.stringify(settings) }),

  // Notifications sent to users from the admin panel
  listBroadcasts: () => request<AdminBroadcast[]>('/notifications'),
  sendBroadcast: (input: { title: string; body: string; audience: 'all' | 'selected'; userIds: string[] }) =>
    request<{ id: string; recipients: number; devices: number }>('/notifications', { method: 'POST', body: JSON.stringify(input) }),
  broadcastRecipients: (id: string) =>
    request<Array<{ id: string; name: string; mobile: string | null; organizationName: string }>>(`/notifications/${id}/recipients`),

  getPermissions: () => request<{ permissions: PermissionInfo[]; roles: RoleDefinitionInfo[] }>('/permissions'),

  // Sales agents (referral commission)
  listSalesAgents: () => request<SalesAgent[]>('/sales-agents'),
  createSalesAgent: (input: SalesAgentInput) =>
    request<SalesAgent>('/sales-agents', { method: 'POST', body: JSON.stringify(input) }),
  updateSalesAgent: (id: string, input: SalesAgentInput) =>
    request<SalesAgent>(`/sales-agents/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  getSalesAgent: (id: string, from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    return request<SalesAgentDetail>(`/sales-agents/${id}${qs.size ? `?${qs}` : ''}`);
  },
  reissueAgentCode: (id: string) =>
    request<{ referenceCode: string }>(`/sales-agents/${id}/reissue-code`, { method: 'POST', body: '{}' }),
  payAgentCommission: (id: string, body: { entryIds?: string[]; upTo?: string }) =>
    request<{ count: number; total: number }>(`/sales-agents/${id}/pay`, { method: 'POST', body: JSON.stringify(body) }),
  assignOrganizationAgent: (organizationId: string, agentId: string | null, note = '') =>
    request<{ organizationId: string; agentId: string | null }>(`/sales-agents/assign/${organizationId}`, {
      method: 'PUT',
      body: JSON.stringify({ agentId, note }),
    }),

  getBillingSettings: () => request<BillingSettings>('/billing-settings'),
  updateBillingSettings: (settings: BillingSettings) =>
    request<BillingSettings>('/billing-settings', { method: 'PUT', body: JSON.stringify(settings) }),

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

    return requestBody(`/medicines?${q.toString()}`);
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
    request<{ total: number; imported: number; skipped: number; brandsAdded?: number; remaining?: { count: number; fileName: string; mimeType: string; base64: string } }>('/medicines/import', {
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
