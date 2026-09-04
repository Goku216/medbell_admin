/** The custom claim the Firestore security rules themselves check. */
export const ADMIN_CLAIM = "medbellAdmin" as const;

/** Every callable in this project is deployed to us-central1. */
export const FUNCTIONS_REGION = "us-central1" as const;

/** Name of the HttpOnly Firebase session cookie minted by /api/session. */
export const SESSION_COOKIE_NAME = "medbell_admin_session" as const;

/** Firebase session cookies max out at 14 days. */
export const SESSION_COOKIE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export const LOGIN_PATH = "/login";
export const DEFAULT_ADMIN_PATH = "/dashboard";

/** Most list callables cap `limit` at 200; the ones that document it say 1–200. */
export const LIST_PAGE_SIZE = 50;
export const LIST_MAX_LIMIT = 200;

/** markCommissionsPaid accepts at most 400 transaction ids in one call. */
export const MAX_PAYOUT_TRANSACTIONS = 400;

export const PLAN_KINDS = ["monthly", "yearly", "lifetime", "weekly", "unknown"] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

/** The plans a discount is actually configured for. */
export const DISCOUNTABLE_PLANS = ["monthly", "yearly", "lifetime"] as const;

/**
 * Backend defaults, shown only until getReferralConfig answers with the real
 * `defaults.planDiscountPercents`. Never used to compute money.
 */
export const DEFAULT_PLAN_DISCOUNT_PERCENTS: Record<string, number> = {
  monthly: 50,
  yearly: 20,
  lifetime: 10,
};

export const PLAN_LABELS: Record<string, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
  lifetime: "Lifetime",
  weekly: "Weekly",
  unknown: "Unknown",
};

/** Commission applies to every successful transaction, renewals included. */
export const DEFAULT_COMMISSION_PERCENT = 10;

/**
 * pending -> approved -> paid, plus reversed (refund), cancelled (written off)
 * and void (sandbox, never payable).
 */
export const COMMISSION_STATUSES = [
  "pending",
  "approved",
  "paid",
  "reversed",
  "cancelled",
  "void",
] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

/** Only pending and approved rows are payable. */
export const PAYABLE_COMMISSION_STATUSES: CommissionStatus[] = ["pending", "approved"];

export const SETTLEMENT_STATUSES = ["pending", "partial", "settled", "failed"] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export const PARTNER_STATUSES = ["active", "inactive"] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export const COMMISSION_BASES = ["gross", "net"] as const;
export type CommissionBase = (typeof COMMISSION_BASES)[number];

export const PAYOUT_METHODS = ["bank_transfer", "upi", "paypal", "cheque", "other"] as const;

export const USER_ROLES = ["patient", "caregiver"] as const;

/**
 * Copy shown next to destructive or deliberately-limited actions. These mirror
 * backend behaviour; if they ever disagree, the backend is right.
 */
export const POLICY_NOTES = {
  readOnlyClinical:
    "Clinical records are read-only in the console by design. Medications, dose logs, vitals and appointments can be reviewed here but are only ever edited by the patient in the app.",
  deleteUser:
    "Deleting removes the Auth account and the profile document, which clears connection requests and care relationships. Medications, dose logs, vitals and appointments are deliberately kept — the clinical record is not collateral damage of closing an account.",
  partnerLock: "Attribution locks to one partner on first purchase and cannot be reassigned.",
  oneDiscount: "Each user redeems at most one discount, ever, across all plans.",
  serverComputedPayout:
    "Payout amounts are summed on the server from the stored commission rows. The console never sends an amount.",
  settlementOnly:
    "This edits the settlement record only. It never changes the payout amount or the underlying commission rows — voiding is the only thing that moves money back.",
  selfAction:
    "The backend refuses to let an admin disable, delete or de-admin their own account.",
} as const;
