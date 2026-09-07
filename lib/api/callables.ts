"use client";

import { httpsCallable } from "firebase/functions";

import { getFirebaseFunctions } from "@/lib/firebase/client";
import { toCallableError } from "@/lib/api/callable-error";
import type {
  CommissionBase,
  PartnerStatus,
  PlanKind,
  SettlementStatus,
} from "@/lib/constants";
import type {
  AdminStatus,
  AppUserDetail,
  CreatePartnerLoginResponse,
  GetPartnerLoginResponse,
  UpdatePartnerLoginResponse,
  GetPartnerResponse,
  GetReferralConfigResponse,
  ListAppUsersResponse,
  ListCommissionTransactionsRequest,
  ListCommissionTransactionsResponse,
  ListPartnerPayoutsResponse,
  ListPartnerSubscriptionsResponse,
  ListPartnersResponse,
  ListReferralAuditResponse,
  ListReferralCodesResponse,
  ListReferredUsersResponse,
  MarkCommissionsPaidResponse,
  PartnerAnalytics,
  PlanDiscount,
  ReferralConfigDoc,
  ReferralOverview,
  ReviewCommissionsResponse,
  SetAdminRoleResponse,
} from "@/lib/api/types";

/**
 * The complete admin surface — 27 callables in us-central1.
 *
 * Each begins with `requireAdmin`, which checks `medbellAdmin` on the
 * Firebase-verified ID token, then recomputes money from stored data and
 * appends an immutable audit entry. Nothing on this side of the wire is
 * authoritative: the console sends intent, the backend decides.
 *
 * `claimAdminRole` is deliberately absent. It is a one-shot bootstrap fuse for
 * the very first administrator and has no business in a console.
 */
function call<Request, Response>(name: string) {
  return async (payload: Request): Promise<Response> => {
    try {
      const callable = httpsCallable<Request, Response>(getFirebaseFunctions(), name);
      const result = await callable(payload);
      return result.data;
    } catch (error) {
      throw toCallableError(error, name);
    }
  };
}

/**
 * A field an update callable can clear. Omit the key to leave the stored value
 * untouched; pass null to clear it. See lib/api/patch.ts — `undefined` does NOT
 * omit a key over this transport, it arrives as null.
 */
type Clearable<T> = T | null;

/** Dates the backend accepts as epoch ms or a Date.parse-able string. */
type DateInput = number | string;

type PlanDiscountMap = Record<string, PlanDiscount>;

/* --------------------------------------------------------- user directory */

export const listAppUsers = call<
  {
    /** EXACT match — Firebase Auth has no substring search. Returns 0 or 1. */
    email?: string;
    /** 1–200, default 50. */
    limit?: number;
    pageToken?: string;
  },
  ListAppUsersResponse
>("listAppUsers");

export const getAppUser = call<{ uid: string }, AppUserDetail>("getAppUser");

export const createAppUser = call<
  {
    email: string;
    /** At least 6 characters. */
    password: string;
    displayName?: string;
    role?: "patient" | "caregiver";
  },
  { uid: string }
>("createAppUser");

/** Patch semantics per field. Refuses to disable your own account. */
export const updateAppUser = call<
  {
    uid: string;
    email?: string;
    displayName?: Clearable<string>;
    password?: string;
    disabled?: boolean;
    role?: "patient" | "caregiver";
  },
  { uid: string; updated: true }
>("updateAppUser");

/**
 * Refuses to delete your own account.
 *
 * Deletes the profile document first — which fires cleanupDeletedUser to clear
 * care relationships and connection requests — then the Auth account. If the
 * Auth deletion fails after the profile is gone it throws `internal` with a
 * message naming that half-failure; the recovery is a console deletion, not a
 * retry, so that message must reach the operator intact.
 *
 * Medications, dose logs, vitals, vital reminder plans and appointments are
 * deliberately kept: a medication log is a health record, and a caregiver may
 * still need the history.
 */
export const deleteAppUser = call<{ uid: string }, { uid: string; deleted: true }>(
  "deleteAppUser",
);

/* ------------------------------------------------------------ admin roles */

/** Reports on the CALLER, not on a looked-up account. */
export const getAdminStatus = call<Record<string, never>, AdminStatus>("getAdminStatus");

/** Keyed by email. `grant` defaults to true; refuses to revoke your own access. */
export const setAdminRole = call<{ email: string; grant?: boolean }, SetAdminRoleResponse>(
  "setAdminRole",
);

/* --------------------------------------------------- programme configuration */

export const getReferralConfig = call<Record<string, never>, GetReferralConfigResponse>(
  "getReferralConfig",
);

export const updateReferralConfig = call<
  {
    offeringId?: string;
    productPlans?: Record<string, PlanKind>;
    listPrices?: Record<string, Record<string, number>>;
  },
  { config: ReferralConfigDoc }
>("updateReferralConfig");

/* ----------------------------------------------------- partner portal logins */

export const getPartnerLogin = call<{ partnerId: string }, GetPartnerLoginResponse>(
  "getPartnerLogin",
);

/**
 * One partner, one login: throws `failed-precondition` if one already exists.
 * To change it use update; to replace it, delete then create.
 *
 * The password minimum is 8 rather than the 6 app users get — this login reads
 * money. The server lowercases and trims the username before validating, so the
 * normalised value is what comes back.
 */
export const createPartnerLogin = call<
  { partnerId: string; username: string; password: string; displayName?: string },
  CreatePartnerLoginResponse
>("createPartnerLogin");

/**
 * Every field optional; only keys actually present are applied, so send just
 * what the operator changed. Throws `invalid-argument` "Nothing to update." if
 * none of the three is present.
 *
 * `disabled: true` blocks sign-in immediately and is fully reversible — the
 * right control for suspending access, rather than deleting.
 */
export const updatePartnerLogin = call<
  { partnerId: string; username?: string; password?: string; disabled?: boolean },
  UpdatePartnerLoginResponse
>("updatePartnerLogin");

/**
 * Removes only the ability to sign in. The partner, their codes, their
 * customers and every commission they have earned are untouched.
 */
export const deletePartnerLogin = call<
  { partnerId: string },
  { partnerId: string; deleted: true }
>("deletePartnerLogin");

/* ---------------------------------------------------------------- partners */

/** No search parameter exists — filter the returned list client-side. */
export const listPartners = call<
  { status?: PartnerStatus; limit?: number },
  ListPartnersResponse
>("listPartners");

export const getPartner = call<{ partnerId: string }, GetPartnerResponse>("getPartner");

export const getPartnerAnalytics = call<{ partnerId: string }, PartnerAnalytics>(
  "getPartnerAnalytics",
);

type PartnerFields = {
  companyName?: Clearable<string>;
  contactEmail?: Clearable<string>;
  contactPhone?: Clearable<string>;
  notes?: Clearable<string>;
  commissionPercent?: number;
  commissionBase?: CommissionBase;
  primaryCurrency?: string;
  offeringId?: Clearable<string>;
  payoutMethod?: Clearable<string>;
  payoutDetails?: Clearable<string>;
  planDiscounts?: PlanDiscountMap;
};

/**
 * Can create the partner's first code in the same call.
 *
 * `primaryCurrency` is fixed after creation — balances are keyed by it — so it
 * appears here and not on updatePartner.
 */
export const createPartner = call<
  PartnerFields & {
    name: string;
    code?: string;
    maxRedemptions?: number;
    validFrom?: DateInput;
    validUntil?: DateInput;
  },
  { partnerId: string; code: string | null; referralLink: string | null }
>("createPartner");

/** Setting status "inactive" also deactivates every code for that partner. */
export const updatePartner = call<
  PartnerFields & {
    partnerId: string;
    name?: string;
    status?: PartnerStatus;
  },
  { partnerId: string; updated: true }
>("updatePartner");

/* ------------------------------------------------------------------ codes */

export const createReferralCode = call<
  {
    partnerId: string;
    /** Required. 3–24 alphanumerics, normalised to upper case. */
    code: string;
    commissionPercent?: number;
    planDiscounts?: PlanDiscountMap;
    offeringId?: string;
    maxRedemptions?: number;
    validFrom?: DateInput;
    validUntil?: DateInput;
    makeDefault?: boolean;
  },
  { code: string; referralLink: string }
>("createReferralCode");

/**
 * Keyed by `code`. The owning partner is deliberately not updatable — moving a
 * code between partners would silently re-point every future renewal commission.
 *
 * `commissionPercent: null` and `planDiscounts: null` clear the code's overrides
 * so it inherits the partner's values again; those are distinct operations from
 * sending a value.
 */
export const updateReferralCode = call<
  {
    code: string;
    status?: PartnerStatus;
    commissionPercent?: Clearable<number>;
    planDiscounts?: Clearable<PlanDiscountMap>;
    offeringId?: Clearable<string>;
    maxRedemptions?: Clearable<number>;
    validFrom?: Clearable<DateInput>;
    validUntil?: Clearable<DateInput>;
  },
  { code: string; updated: true; referralLink: string }
>("updateReferralCode");

export const listReferralCodes = call<
  { partnerId?: string; status?: PartnerStatus; limit?: number },
  ListReferralCodesResponse
>("listReferralCodes");

/* ------------------------------------------------- referred customers */

export const listReferredUsers = call<
  { partnerId: string; limit?: number },
  ListReferredUsersResponse
>("listReferredUsers");

export const listPartnerSubscriptions = call<
  { partnerId: string; limit?: number },
  ListPartnerSubscriptionsResponse
>("listPartnerSubscriptions");

/* ------------------------------------------------------- commission ledger */

export const listCommissionTransactions = call<
  ListCommissionTransactionsRequest,
  ListCommissionTransactionsResponse
>("listCommissionTransactions");

/**
 * Approve or cancel commission rows for one partner. The backend re-reads each
 * row and refuses transitions that are not legal for its current status.
 */
export const reviewCommissions = call<
  { partnerId: string; transactionIds: string[]; decision: "approve" | "cancel" },
  ReviewCommissionsResponse
>("reviewCommissions");

/**
 * Records a payout for the given rows. **No amount is sent** — the server sums
 * it from the stored rows inside the transaction, and an amount from the client
 * would be ignored. Only pending and approved rows are payable, a payout is
 * single-currency, and the net must be positive.
 */
export const markCommissionsPaid = call<
  {
    partnerId: string;
    /** At most 400. */
    transactionIds: string[];
    method?: string;
    reference?: string;
    notes?: string;
    paidOn?: DateInput;
  },
  MarkCommissionsPaidResponse
>("markCommissionsPaid");

/* ---------------------------------------------------------------- payouts */

/**
 * Corrects the *settlement* record only. It never touches `amountMinor` or the
 * commission rows — voidPartnerPayout is the only thing that moves money back.
 */
export const updatePartnerPayout = call<
  {
    payoutId: string;
    method?: Clearable<string>;
    reference?: Clearable<string>;
    notes?: Clearable<string>;
    paidOn?: Clearable<DateInput>;
    settledAmountMinor?: Clearable<number>;
    settlementStatus?: SettlementStatus;
  },
  { payoutId: string; updated: true }
>("updatePartnerPayout");

export const voidPartnerPayout = call<
  { payoutId: string; reason?: string },
  { payoutId: string; voided: true }
>("voidPartnerPayout");

export const listPartnerPayouts = call<
  { partnerId: string; limit?: number },
  ListPartnerPayoutsResponse
>("listPartnerPayouts");

/* ------------------------------------------------------------ audit trail */

export const listReferralAudit = call<
  { partnerId?: string; limit?: number },
  ListReferralAuditResponse
>("listReferralAudit");

/* --------------------------------------------------------------- overview */

export const getReferralOverview = call<Record<string, never>, ReferralOverview>(
  "getReferralOverview",
);
