export interface AdminUser {
  email: string;
  role: 'super_admin';
}

export interface PlatformAnalytics {
  organizations: {
    total: number;
    active: number;
    trialing: number;
    pastDue: number;
    canceled: number;
  };
  users: {
    total: number;
    active: number;
    admins: number;
  };
  branches: {
    total: number;
  };
  subscriptions: {
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
    estimatedMrr: number;
  };
  medicines: {
    total: number;
    registered: number;
  };
  gmv: {
    totalRevenue: number;
    totalSalesCount: number;
  };
  breakdowns: {
    byBusinessType: Array<{ type: string; count: number }>;
    byPlan: Array<{ plan: string; count: number }>;
  };
  recentSignups: Array<{
    id: string;
    name: string;
    businessType: string;
    planId: string;
    status: string;
    createdAt: string;
  }>;
  recentUpgrades: Array<{
    id: string;
    organizationName: string;
    currentPlanId: string;
    targetPlanId: string;
    paymentMethod: string;
    status: string;
    createdAt: string;
  }>;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  isOrgAdmin: boolean;
  isActive: boolean;
  organizationId: string;
  organizationName: string;
  businessType: string;
  paymentReference: string | null;
  createdAt: string;
  updatedAt: string;
  memberships: Array<{
    branchId: string;
    branchName: string;
    role: string;
  }> | null;
}

export interface UserDetail extends UserSummary {
  planId: string;
  subscriptionStatus: string;
  activeSessionsCount: number;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  businessType: 'pharmacy' | 'gym' | 'others';
  phone: string | null;
  address: string | null;
  logoUri: string | null;
  planId: 'starter' | 'basic' | 'pro' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
  subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled';
  maxBranches: number | null;
  maxUsers: number | null;
  branchCount: number;
  userCount: number;
  salesCount: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationDetail extends OrganizationSummary {
  branches: Array<{
    id: string;
    name: string;
    address: string;
    phone: string;
    medicinesCount: number;
    retailProductsCount: number;
    createdAt: string;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string | null;
    mobile: string | null;
    isOrgAdmin: boolean;
    isActive: boolean;
    paymentReference: string | null;
    createdAt: string;
  }>;
  upgradeRequests: SubscriptionUpgradeRequest[];
  stats: {
    totalRevenue: number;
    salesCount: number;
  };
}

export interface SubscriptionPlan {
  id: string;
  planId: 'starter' | 'basic' | 'pro' | 'enterprise';
  businessType: 'pharmacy' | 'gym' | 'others';
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  maxBranches: number | null;
  maxUsers: number | null;
  trialDays: number;
  features: string[];
  featureAccess: Record<string, unknown> | null;
  highlight: boolean;
  isActive: boolean;
}

export interface SubscriptionUpgradeRequest {
  id: string;
  organizationId: string;
  organizationName: string;
  businessType: string;
  requestedByUserId: string;
  requestedByName: string;
  requestedByEmail: string | null;
  requestedByMobile: string | null;
  currentPlanId: string;
  targetPlanId: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethod: string;
  transactionId: string;
  paymentReference: string;
  receiptUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineCategory {
  value: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  medicinesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MedicinePackage {
  id: string;
  medicineId: string;
  brandName: string | null;
  manufacturer: string | null;
  strength: string | null;
  dosageForm: string | null;
  route: string | null;
  packSize: string | null;
  registrationNo: string | null;
  createdAt: string;
}

export interface MedicineSummary {
  id: string;
  genericName: string;
  normalizedName: string;
  brandNames: string[] | null;
  therapeuticCategory: string | null;
  productType: string;
  prescriptionRequired: boolean | null;
  manufacturer: string | null;
  registrationNumber: string | null;
  country: string;
  marketStatus: string;
  packagesCount: number;
  adoptedOrganizationsCount: number;
  createdAt: string;
  updatedAt: string;
  /** "product" is one strength and form; "generic" is the parent name. */
  catalogLevel?: 'generic' | 'product';
  strength?: string | null;
  dosageForm?: string | null;
}

/** A product waiting for the platform admin: created by a pharmacy, or paired by fallback in the split. */
export interface CatalogReviewItem {
  id: string;
  name: string;
  strength: string | null;
  form: string | null;
  kind: 'pharmacy' | 'flagged';
  organizationName: string | null;
  genericId: string | null;
  adopters: number;
  unitsInStock: number;
  createdAt: string;
}

export interface MedicineDetail extends MedicineSummary {
  activeIngredients: unknown[] | null;
  dosageForms: string[] | null;
  strengths: string[] | null;
  routes: string[] | null;
  regulatory: Record<string, unknown> | null;
  dataQuality: string | null;
  packages: MedicinePackage[];
  stats: {
    adoptedOrganizations: number;
    adoptedBranches: number;
  };
}

export interface SupportedBank {
  id: string;
  code: string;
  name: string;
  type: 'bank' | 'wallet';
  accountName: string | null;
  accountNumber: string | null;
  merchantCode: string | null;
  receiptUrlPattern: string | null;
  instructions: string | null;
  logoUrl: string | null;
  supportsSubscription: boolean;
  supportsPos: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
