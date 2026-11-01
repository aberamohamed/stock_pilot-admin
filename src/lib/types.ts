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
    /** Total ETB of approved payments. */
    revenue: number;
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
  };
  recentSignups: Array<{
    id: string;
    name: string;
    businessType: string;
    status: string;
    createdAt: string;
  }>;
  recentUpgrades: Array<{
    id: string;
    organizationName: string;
    kind: 'activation' | 'renewal' | 'branch' | 'user';
    quantity: number;
    amount: number;
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
  subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled';
  /** Branches paid for and not created yet. */
  branchCredits: number;
  /** The soonest end date among its branches. */
  nextExpiry: string | null;
  /** Has made the first payment. */
  activated: boolean;
  salesAgentId?: string | null;
  salesAgentName?: string | null;
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

export interface SubscriptionUpgradeRequest {
  id: string;
  organizationId: string;
  organizationName: string;
  businessType: string;
  requestedByUserId: string;
  requestedByName: string;
  requestedByEmail: string | null;
  requestedByMobile: string | null;
  /** activation: the first payment; renewal: every seat for another period; branch / user: more seats. */
  kind: 'activation' | 'renewal' | 'branch' | 'user';
  quantity: number;
  amount: number;
  /** The branch a renewal or an extra user is for. */
  branchId: string | null;
  branchName: string | null;
  /** The user an extra-user payment is for (created first, paid after). */
  userId?: string | null;
  userName?: string | null;
  userMobile?: string | null;
  /** What the server found when it checked the Telebirr receipt. */
  verificationStatus?: 'verified' | 'review' | 'unverified' | 'invalid' | null;
  verificationNote?: string | null;
  receiptAmount?: number | null;
  receiptPaidAt?: string | null;
  /** Users this payment adds, fixed when it was made. */
  usersGranted: number | null;
  /** Days of access it adds when approved. */
  daysGranted: number | null;
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

/** What seats cost; applies to payments made after it is changed. */
/** Who a Telebirr payment must go to, and how a verified receipt is handled. */
export interface PaymentVerificationSettings {
  enabled: boolean;
  recipientName: string;
  recipientNumber: string;
  autoApprove: boolean;
  maxAgeHours: number;
  requireReference: boolean;
}

export interface BillingSettings {
  /** ETB for the activation and for each extra branch. */
  branchPrice: number;
  /** ETB for each extra user. */
  extraUserPrice: number;
  /** Users a branch comes with. */
  usersPerBranch: number;
  /** Days of access one payment buys. */
  periodDays: number;
  /** Extra days on an organization's first payment only. */
  firstPaymentBonusDays: number;
}

export interface BillingSettingsChange extends BillingSettings {
  id: number;
  changedBy: string;
  changedAt: string;
  previousBranchPrice: number;
  previousExtraUserPrice: number;
  previousUsersPerBranch: number;
  previousPeriodDays: number | null;
  previousFirstPaymentBonusDays: number | null;
}

export interface SalesAgent {
  id: string;
  name: string;
  phone: string;
  referenceCode: string;
  commissionPercent: number;
  commissionMonths: number;
  isActive: boolean;
  notes: string;
  createdAt: string;
  referred?: number;
  paying?: number;
  unpaid?: number;
  paid?: number;
}

export interface SalesAgentInput {
  name: string;
  phone: string;
  commissionPercent: number;
  commissionMonths: number;
  notes: string;
  isActive: boolean;
}

export interface SalesAgentDetail {
  agent: SalesAgent;
  organizations: Array<{
    id: string;
    name: string;
    businessType: string;
    phone: string | null;
    subscriptionStatus: string;
    activated: boolean;
    firstPaidAt: string | null;
    registeredAt: string;
    codeEntered: string | null;
    paidTotal: number;
    commission: number;
  }>;
  commissions: Array<{
    id: string;
    kind: string;
    baseAmount: number;
    rate: number;
    amount: number;
    status: 'earned' | 'paid';
    earnedAt: string;
    paidAt: string | null;
    paidBy: string | null;
    organizationId: string;
    organizationName: string;
  }>;
}
