import type { PayableBalance, PartnerTotals } from "@/lib/api/types";

/**
 * Partner portal wire shapes.
 *
 * Every endpoint here takes **no partner id**: the backend reads it out of the
 * signed token's `medbellPartnerId` claim. There is no parameter to tamper
 * with, and sending one would be ignored.
 *
 * Same conventions as the admin surface: timestamps are epoch milliseconds,
 * and every `Minor` field is an integer in minor units.
 */

export type MyPartnerProfile = {
  partnerId: string;
  /** False when the login outlived its partner record — a real state to render. */
  exists: boolean;
  name: string;
  companyName: string | null;
  status: "active" | "inactive" | string;
  commissionPercent: number;
  commissionBase: "gross" | "net" | string;
  primaryCurrency: string;
  totals: PartnerTotals;
  balances: Record<string, PayableBalance>;
  defaultCode: string | null;
  referralLink: string | null;
  payoutMethod: string | null;
  payoutDetails: string | null;
  username: string | null;
};

export type MyReferralCode = {
  code: string;
  referralLink: string;
  status: "active" | "inactive" | string;
  isDefault: boolean;
  redemptionCount: number;
  maxRedemptions: number | null;
  validFrom: number | null;
  validUntil: number | null;
  createdAt: number | null;
};

/** Already sorted: default first, then active before inactive, then newest. */
export type ListMyReferralCodesResponse = { codes: MyReferralCode[] };

/**
 * De-identified on purpose. There is no user id, no name and no full email —
 * the masked address exists only so a partner can match a row when someone
 * tells them "I used your code". It is not a contact address.
 */
export type MyReferredCustomer = {
  code: string | null;
  source: "signup" | "deeplink" | "manual" | string | null;
  converted: boolean;
  usedDiscount: boolean;
  plan: string | null;
  joinedAt: number | null;
  firstPurchaseAt: number | null;
  customer: string | null;
};

export type ListMyReferredUsersResponse = { customers: MyReferredCustomer[] };

export type MyCommissionStatus = "pending" | "approved" | "paid" | "reversed" | "cancelled";

export type MyCommission = {
  id: string;
  eventAt: number | null;
  plan: string | null;
  currency: string;
  /** What the customer paid. */
  amountMinor: number;
  /** What the partner earned. */
  commissionAmountMinor: number;
  commissionPercent: number | null;
  status: MyCommissionStatus | string;
  isFirstPayment: boolean;
  /** Refund claw-backs; these carry negative amounts. */
  isReversal: boolean;
  referralCode: string | null;
  paidAt: number | null;
};

export type ListMyCommissionsResponse = {
  transactions: MyCommission[];
  /** Covers the returned page only, never the partner's lifetime. */
  totals: { commissionMinor: number; grossMinor: number };
  hasMore: boolean;
};

export type MyPayout = {
  id: string;
  amountMinor: number;
  currency: string;
  status: "paid" | "void" | string;
  transactionCount: number;
  periodStart: number | null;
  periodEnd: number | null;
  method: string | null;
  reference: string | null;
  notes: string | null;
  paidOn: number | null;
  createdAt: number | null;
};

export type ListMyPayoutsResponse = { payouts: MyPayout[] };
