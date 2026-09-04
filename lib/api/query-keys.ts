import type { ListCommissionTransactionsRequest } from "@/lib/api/types";

/**
 * Central key registry so a mutation can invalidate precisely what it touched.
 * Keys are hierarchical: invalidating ["referral"] refreshes the whole
 * programme, ["referral","commissions"] only the ledger.
 */
export const queryKeys = {
  session: ["session"] as const,
  adminStatus: ["admin-status"] as const,

  users: {
    all: ["users"] as const,
    list: (filters: { email?: string | null; limit: number }) =>
      ["users", "list", filters] as const,
    detail: (uid: string) => ["users", "detail", uid] as const,
    patient: (uid: string) => ["users", "patient", uid] as const,
  },

  referral: {
    all: ["referral"] as const,
    overview: ["referral", "overview"] as const,
    config: ["referral", "config"] as const,

    partners: (filters: { status?: string | null; limit: number }) =>
      ["referral", "partners", filters] as const,
    partner: (partnerId: string) => ["referral", "partner", partnerId] as const,
    partnerAnalytics: (partnerId: string) =>
      ["referral", "partner", partnerId, "analytics"] as const,
    partnerSubscriptions: (partnerId: string, limit: number) =>
      ["referral", "partner", partnerId, "subscriptions", limit] as const,

    codes: (filters: { partnerId?: string | null; status?: string | null; limit: number }) =>
      ["referral", "codes", filters] as const,

    referredUsers: (partnerId: string, limit: number) =>
      ["referral", "referred-users", partnerId, limit] as const,

    commissions: (filters: ListCommissionTransactionsRequest) =>
      ["referral", "commissions", filters] as const,

    payouts: (partnerId: string, limit: number) =>
      ["referral", "payouts", partnerId, limit] as const,

    audit: (filters: { partnerId?: string | null; limit: number }) =>
      ["referral", "audit", filters] as const,
  },
} as const;
