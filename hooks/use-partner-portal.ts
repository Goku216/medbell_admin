"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as api from "@/lib/partner/callables";
import { LIST_PAGE_SIZE } from "@/lib/constants";
import type { MyCommissionStatus } from "@/lib/partner/types";

/**
 * Portal data hooks.
 *
 * Every key is scoped under ["partner"] and none of them carries a partner id —
 * the server derives it from the token, and a signed-out partner's cache is
 * cleared rather than keyed around.
 */
export const partnerKeys = {
  all: ["partner"] as const,
  profile: ["partner", "profile"] as const,
  codes: (limit: number) => ["partner", "codes", limit] as const,
  customers: (limit: number) => ["partner", "customers", limit] as const,
  commissions: (status: string | null, limit: number) =>
    ["partner", "commissions", status, limit] as const,
  payouts: (limit: number) => ["partner", "payouts", limit] as const,
} as const;

/** Everything the dashboard needs, in one call. */
export function useMyPartnerProfile() {
  return useQuery({
    queryKey: partnerKeys.profile,
    queryFn: () => api.getMyPartnerProfile({}),
  });
}

export function useMyReferralCodes(limit = LIST_PAGE_SIZE) {
  return useQuery({
    queryKey: partnerKeys.codes(limit),
    queryFn: () => api.listMyReferralCodes({ limit }),
  });
}

export function useMyReferredUsers(limit = LIST_PAGE_SIZE) {
  return useQuery({
    queryKey: partnerKeys.customers(limit),
    queryFn: () => api.listMyReferredUsers({ limit }),
  });
}

export function useMyCommissions(status: MyCommissionStatus | null, limit = LIST_PAGE_SIZE) {
  return useQuery({
    queryKey: partnerKeys.commissions(status, limit),
    queryFn: () => api.listMyCommissions({ limit, ...(status ? { status } : {}) }),
  });
}

export function useMyPayouts(limit = LIST_PAGE_SIZE) {
  return useQuery({
    queryKey: partnerKeys.payouts(limit),
    queryFn: () => api.listMyPayouts({ limit }),
  });
}

/** Drops every cached partner response, for sign-out. */
export function useClearPartnerCache() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => queryClient.removeQueries({ queryKey: partnerKeys.all }),
  });
}
