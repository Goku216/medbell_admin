import type {
  CommissionBase,
  CommissionStatus,
  PartnerStatus,
  PlanKind,
  SettlementStatus,
} from "@/lib/constants";

/**
 * Wire shapes, taken from docs/ADMIN_API.md (which was written from the
 * deployed source). Three conventions hold everywhere:
 *
 *  - **Timestamps are epoch milliseconds.** `serialize()` walks every callable
 *    response recursively, including nested maps and arrays. Nothing returns an
 *    ISO string or a `{_seconds,_nanoseconds}` pair. Direct Firestore reads are
 *    the exception and are normalised to the same thing in lib/data/serialize.ts.
 *  - **Money is an integer of minor units**, field names ending in `Minor`.
 *    `payableMinor` is legitimately negative when a refund reverses commission
 *    already paid out — never clamp it.
 *  - **Documents come back as `{id, ...everyStoredField}`.** Fields below are
 *    the ones the console reads; a document may carry more.
 */

export type PlanDiscount = {
  percent: number;
  discountedProductIds: string[];
  /** Play offer id (hyphens). */
  androidOfferId: string | null;
  iosProductId: string | null;
  /** App Store promotional offer id (underscores). */
  iosOfferId: string | null;
};

/* ------------------------------------------------------------------ users */

export type AppUserProfile = {
  displayName: string | null;
  email: string | null;
  photoUrl: string | null;
  role: "patient" | "caregiver" | null;
  /** The only location-ish signal stored. */
  timezone: string | null;
  summaryNotificationEnabled: boolean;
  summaryTime: string | null;
  createdAt: number | null;
  updatedAt: number | null;
};

export type AppUser = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoUrl: string | null;
  disabled: boolean;
  isAdmin: boolean;
  /** Provider ids, e.g. ["google.com", "password"]. */
  providers: string[];
  createdAt: number | null;
  lastSignInAt: number | null;
  lastRefreshAt: number | null;
  profile: AppUserProfile | null;
};

export type ListAppUsersResponse = {
  users: AppUser[];
  nextPageToken: string | null;
};

export type Subscription = {
  id: string;
  productId: string | null;
  plan: PlanKind | null;
  /** active | cancelled | expired | refunded | billing_issue | paused */
  status: string | null;
  store: string | null;
  environment: string | null;
  isTrial: boolean;
  currency: string | null;
  /**
   * Lifetime revenue from this user. The RevenueCat webhook writes the mirror
   * before it checks attribution, so this is populated for EVERY purchaser.
   */
  totalGrossMinor: number;
  renewalCount: number;
  partnerId: string | null;
  referralCode: string | null;
  purchasedAt: number | null;
  expiresAt: number | null;
  cancelledAt: number | null;
  refundedAt: number | null;
  updatedAt: number | null;
};

export type Attribution = {
  code: string | null;
  partnerId: string | null;
  partnerName: string | null;
  source: "signup" | "deeplink" | "manual" | null;
  locked: boolean;
  discountRedeemed: boolean;
  discountPlan: string | null;
  attributedAt: number | null;
  firstPurchaseAt: number | null;
};

/** getAppUser: the listAppUsers shape plus revenue and attribution. */
export type AppUserDetail = AppUser & {
  subscriptions: Subscription[];
  /** Null for anyone who never used a referral code. */
  attribution: Attribution | null;
};

/* ------------------------------------------------------------ admin roles */

/** getAdminStatus reports on the CALLER, not on a looked-up account. */
export type AdminStatus = {
  signedIn: boolean;
  isAdmin: boolean;
  uid: string | null;
};

export type SetAdminRoleResponse = {
  uid: string;
  admin: boolean;
};

/* --------------------------------------------------- partner portal logins */

/**
 * A partner login is an optional Firebase Auth account attached to one partner,
 * created by an administrator. It carries `medbellPartner` and
 * `medbellPartnerId` claims, and those claims are the whole authorisation model
 * for the portal.
 *
 * Partners sign in with a username, not an email: the username is turned into
 * `<username>@<REFERRAL_PARTNER_LOGIN_DOMAIN>` internally. That address is not
 * a mailbox — no mail is ever sent to it and there is no self-service reset.
 */
export type PartnerLogin = {
  uid: string;
  username: string;
  loginEmail: string;
  disabled: boolean;
  createdAt: number | null;
  lastSignInAt: number | null;
};

export type GetPartnerLoginResponse = {
  partnerId: string;
  hasLogin: boolean;
  login: PartnerLogin | null;
  /** The partner points at an Auth account that no longer exists. */
  orphaned?: boolean;
};

export type CreatePartnerLoginResponse = {
  partnerId: string;
  uid: string;
  username: string;
  loginEmail: string;
};

export type UpdatePartnerLoginResponse = {
  partnerId: string;
  uid: string;
  username: string;
  loginEmail: string;
  disabled: boolean;
  passwordChanged: boolean;
};

/* --------------------------------------------------------------- partners */

export type PartnerTotals = {
  referredUsers: number;
  convertedSubscribers: number;
  activeSubscribers: number;
  initialPurchases: number;
  renewals: number;
  refunds: number;
  monthlySubscribers: number;
  yearlySubscribers: number;
  lifetimeCustomers: number;
};

export type PartnerBalance = {
  currency: string;
  grossRevenueMinor: number;
  customerDiscountMinor: number;
  commissionEarnedMinor: number;
  commissionPendingMinor: number;
  commissionApprovedMinor: number;
  commissionPaidMinor: number;
};

/**
 * `payableMinor` = pending + approved. It is the figure an operator acts on and
 * it can legitimately be negative when a refund reverses commission already
 * paid out. Balances are keyed by currency — a partner can hold more than one.
 */
export type PayableBalance = PartnerBalance & { payableMinor: number };

export type Partner = {
  id: string;
  name: string;
  companyName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  status: PartnerStatus | string;
  commissionPercent: number;
  commissionBase: CommissionBase;
  primaryCurrency: string;
  offeringId: string | null;
  payoutMethod: string | null;
  payoutDetails: string | null;
  planDiscounts: Record<string, PlanDiscount> | null;
  createdAt: number | null;
  updatedAt: number | null;
};

export type ListPartnersResponse = { partners: Partner[] };

export type GetPartnerResponse = {
  partner: Partner;
  codes: ReferralCode[];
};

export type PartnerAnalytics = {
  partnerId: string;
  name: string;
  status: PartnerStatus | string;
  commissionPercent: number;
  commissionBase: CommissionBase;
  /** Fully resolved, not the partner's raw overrides. */
  planDiscounts: Record<string, PlanDiscount>;
  primaryCurrency: string;
  defaultCode: string | null;
  referralLink: string | null;
  totals: PartnerTotals;
  balances: Record<string, PayableBalance>;
};

/* ------------------------------------------------------------------ codes */

export type ReferralCode = {
  code: string;
  partnerId: string;
  status: PartnerStatus | string;
  commissionPercent: number | null;
  planDiscounts: Record<string, PlanDiscount> | null;
  offeringId: string | null;
  maxRedemptions: number | null;
  redemptionCount: number | null;
  validFrom: number | null;
  validUntil: number | null;
  isDefault: boolean | null;
  createdAt: number | null;
  updatedAt: number | null;
  /** Built by the server; never construct this client-side. */
  referralLink: string;
};

export type ListReferralCodesResponse = { codes: ReferralCode[] };

/* --------------------------------------------------------- referred users */

export type ReferredUser = {
  userId: string | null;
  code: string | null;
  locked: boolean;
  discountRedeemed: boolean;
  discountApplied: boolean;
  discountPlan: string | null;
  source: Attribution["source"];
  attributedAt: number | null;
  firstPurchaseAt: number | null;
  displayName: string | null;
  email: string | null;
};

export type ListReferredUsersResponse = { users: ReferredUser[] };

export type ListPartnerSubscriptionsResponse = {
  subscriptions: Array<Subscription & { userId?: string | null; email?: string | null }>;
};

/* ------------------------------------------------------------ commissions */

export type ReferralTransaction = {
  id: string;
  partnerId: string;
  code: string | null;
  userId: string | null;
  plan: PlanKind | null;
  status: CommissionStatus | string;
  currency: string | null;
  grossMinor: number;
  discountMinor: number;
  commissionMinor: number;
  commissionPercent: number | null;
  commissionBase: CommissionBase | null;
  isFirstPayment: boolean | null;
  productId: string | null;
  store: string | null;
  eventAt: number | null;
  createdAt: number | null;
  updatedAt: number | null;
  reviewedAt: number | null;
  reviewedBy: string | null;
  payoutId: string | null;
  paidAt: number | null;
};

export type ListCommissionTransactionsRequest = {
  partnerId?: string;
  status?: CommissionStatus;
  plan?: PlanKind;
  code?: string;
  /** Epoch ms; filters on eventAt. */
  from?: number;
  to?: number;
  firstPaymentOnly?: boolean;
  limit?: number;
};

export type ListCommissionTransactionsResponse = {
  transactions: ReferralTransaction[];
  /** Over the returned page only, not the whole filtered set. */
  totals: { grossMinor: number; discountMinor: number; commissionMinor: number };
  hasMore: boolean;
};

export type ReviewCommissionsResponse = {
  count: number;
  transactionIds: string[];
};

/** markCommissionsPaid returns the authoritative, server-summed figure. */
export type MarkCommissionsPaidResponse = {
  payoutId: string;
  amountMinor: number;
  currency: string;
  count: number;
};

/* ---------------------------------------------------------------- payouts */

export type PartnerPayout = {
  id: string;
  partnerId: string;
  /** Server-summed from the commission rows. Never editable. */
  amountMinor: number;
  currency: string;
  count: number | null;
  transactionIds: string[] | null;
  method: string | null;
  reference: string | null;
  notes: string | null;
  paidOn: number | null;
  /** Settlement record only — independent of amountMinor. */
  settledAmountMinor: number | null;
  settlementStatus: SettlementStatus | string | null;
  voided: boolean | null;
  voidedAt: number | null;
  voidReason: string | null;
  createdAt: number | null;
  updatedAt: number | null;
  createdBy: string | null;
};

export type ListPartnerPayoutsResponse = { payouts: PartnerPayout[] };

/* ------------------------------------------------------------------ audit */

export type AuditEntry = {
  id: string;
  action: string;
  partnerId: string | null;
  actorUid: string | null;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  summary: string | null;
  amountMinor: number | null;
  currency: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: number | null;
};

export type ListReferralAuditResponse = { entries: AuditEntry[] };

/* ----------------------------------------------------------------- config */

export type ReferralConfigDoc = {
  offeringId: string;
  /** productId -> plan */
  productPlans: Record<string, PlanKind>;
  /** plan -> ISO 4217 -> minor units */
  listPrices: Record<string, Record<string, number>>;
};

export type ReferralDefaults = {
  planDiscountPercents: Record<string, number>;
  commissionPercent: number;
  commissionBase: CommissionBase;
  offeringId: string;
  currency: string;
};

export type GetReferralConfigResponse = {
  config: ReferralConfigDoc;
  defaults: ReferralDefaults;
};

/* --------------------------------------------------------------- overview */

export type ReferralOverview = {
  partnerCount: number;
  activePartners: number;
  /** The three counts below are Firestore aggregates: null, not 0, on failure. */
  codeCount: number | null;
  activeCodeCount: number | null;
  transactionCount: number | null;
  totals: PartnerTotals;
  balances: Record<string, PayableBalance>;
};

/* ------------------------------------------- patient data (direct reads) */

/**
 * Read straight from Firestore with the Admin SDK, then normalised to the same
 * epoch-millis convention as the callables by lib/data/serialize.ts.
 */

export type Medication = {
  id: string;
  patientId?: string | null;
  name?: string | null;
  dosage?: string | null;
  form?: string | null;
  frequency?: string | null;
  instructions?: string | null;
  times?: string[] | null;
  daysOfWeek?: number[] | null;
  active?: boolean;
  createdBy?: string | null;
  participantIds?: string[] | null;
  startDate?: number | null;
  endDate?: number | null;
  createdAt?: number | null;
  deletedAt?: number | null;
};

export type MedicationLog = {
  id: string;
  patientId?: string | null;
  medicationId?: string | null;
  medicationName?: string | null;
  doseKey?: string | null;
  status?: string | null;
  scheduledAt?: number | null;
  takenAt?: number | null;
  createdAt?: number | null;
  note?: string | null;
};

export type Appointment = {
  id: string;
  patientId?: string | null;
  title?: string | null;
  doctorName?: string | null;
  specialty?: string | null;
  location?: string | null;
  notes?: string | null;
  status?: string | null;
  appointmentDateTime?: number | null;
  createdAt?: number | null;
  deletedAt?: number | null;
};

export type VitalRecord = {
  id: string;
  patientId?: string | null;
  type?: string | null;
  value?: number | string | null;
  secondaryValue?: number | string | null;
  unit?: string | null;
  note?: string | null;
  recordedAt?: number | null;
  createdAt?: number | null;
};

export type VitalReminderPlan = {
  id: string;
  patientId?: string | null;
  type?: string | null;
  frequency?: string | null;
  times?: string[] | null;
  active?: boolean;
  createdAt?: number | null;
};

export type CareRelationship = {
  id: string;
  patientId?: string | null;
  caregiverId?: string | null;
  patientName?: string | null;
  caregiverName?: string | null;
  patientEmail?: string | null;
  caregiverEmail?: string | null;
  status?: string | null;
  permissions?: string[] | null;
  createdAt?: number | null;
  /** Which side of the relationship the viewed user sits on. */
  direction: "as-patient" | "as-caregiver";
};

export type ConnectionRequest = {
  id: string;
  createdBy?: string | null;
  patientId?: string | null;
  caregiverId?: string | null;
  targetEmailLower?: string | null;
  status?: string | null;
  createdAt?: number | null;
  respondedAt?: number | null;
  /** Whether the viewed user opened this request or is its target. */
  direction: "sent" | "received";
};

export type FcmToken = {
  id: string;
  platform?: string | null;
  deviceModel?: string | null;
  appVersion?: string | null;
  createdAt?: number | null;
  updatedAt?: number | null;
};

export type AdherenceSummary = {
  windowDays: number;
  total: number;
  taken: number;
  missed: number;
  skipped: number;
  pending: number;
  /** Percentage 0-100, or null when there is nothing to measure. */
  ratePercent: number | null;
};

export type PatientRecord = {
  uid: string;
  profile: Record<string, unknown> | null;
  medications: Medication[];
  medicationLogs: MedicationLog[];
  adherence: AdherenceSummary;
  appointments: Appointment[];
  vitals: VitalRecord[];
  vitalReminderPlans: VitalReminderPlan[];
  careRelationships: CareRelationship[];
  connectionRequests: ConnectionRequest[];
  fcmTokens: FcmToken[];
  /** Collections that could not be read this request, for honest partial UI. */
  partial: string[];
};
