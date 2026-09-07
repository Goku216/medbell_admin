/** The custom claim the Firestore security rules themselves check. */
export const ADMIN_CLAIM = "medbellAdmin" as const;

/** Every callable in this project is deployed to us-central1. */
export const FUNCTIONS_REGION = "us-central1" as const;

/** Name of the HttpOnly Firebase session cookie minted by /api/session. */
export const SESSION_COOKIE_NAME = "medbell_admin_session" as const;

/** Firebase session cookies max out at 14 days. */
export const SESSION_COOKIE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * The home page is the partner sign-in: partners are the public audience, and
 * they arrive from a referral link or a phone bookmark. The admin console is
 * deliberately one level in, reached from the marker in the corner.
 */
export const PARTNER_LOGIN_PATH = "/";
export const PARTNER_HOME_PATH = "/partner";

/** The partner portal, which uses a claim rather than the admin session cookie. */
export const PARTNER_PATH_PREFIX = "/partner";

export const LOGIN_PATH = "/admin/login";
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
export const DEFAULT_COMMISSION_BASE = "gross" as const;

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

/**
 * Server-side length caps, mirrored here so the operator is stopped by the form
 * rather than by a callable rejection.
 */
export const FIELD_LIMITS = {
  partnerName: 120,
  companyName: 160,
  contactEmail: 320,
  contactPhone: 40,
  notes: 2000,
  offeringId: 120,
  payoutMethod: 60,
  payoutDetails: 500,
  referralCode: 24,
  androidOfferId: 120,
  iosProductId: 200,
  iosOfferId: 200,
  discountedProductIds: 20,
  uid: 128,
} as const;

export const MAX_REDEMPTIONS_LIMIT = 10_000_000;

/** The programme default offering, used when a partner leaves offeringId blank. */
export const DEFAULT_OFFERING_ID = "referral_discount";

/** Applied server-side when a lifetime iosProductId is left blank. */
export const DEFAULT_LIFETIME_PRODUCT_ID = "medbell_lifetime_ref10";

/**
 * The plans the backend actually reads out of `planDiscounts`. Any other key is
 * silently ignored, so `weekly` must never be sent.
 */
export const DISCOUNT_PLAN_ORDER = ["monthly", "yearly", "lifetime"] as const;
export type DiscountPlan = (typeof DISCOUNT_PLAN_ORDER)[number];

/**
 * Lifetime is a non-consumable, and the App Store has no promotional offers for
 * non-consumables — its iOS discount is a separate product instead. Offering the
 * field would invite an operator to fill in something that can never work.
 */
export const PLANS_WITH_IOS_OFFER: DiscountPlan[] = ["monthly", "yearly"];

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
  planDiscountsFullSend:
    "Saved as a complete set. The backend merges per field, so a form that sent only what changed could never clear a value — this sends all three plans every time.",
  codeOverride:
    "An un-overridden plan inherits the partner's rate, so a later change to the partner follows through. Overriding pins it, even if the partner's rate moves.",
  deactivatePartner:
    "Deactivating a partner also deactivates every one of their referral codes. Existing attribution and commission history are untouched.",
} as const;
