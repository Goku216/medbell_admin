"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as api from "@/lib/api/callables";
import { queryKeys } from "@/lib/api/query-keys";
import { LIST_PAGE_SIZE } from "@/lib/constants";
import type { PartnerStatus } from "@/lib/constants";
import type { ListCommissionTransactionsRequest } from "@/lib/api/types";

/**
 * Only listAppUsers pages with a cursor. Every list here takes a `limit` and
 * returns a plain array, so these are ordinary queries and "load more" raises
 * the limit (see hooks/use-limit.ts).
 */

/* ------------------------------------------------------------- programme */

export function useReferralOverview() {
  return useQuery({
    queryKey: queryKeys.referral.overview,
    queryFn: () => api.getReferralOverview({}),
  });
}

export function useReferralConfig() {
  return useQuery({
    queryKey: queryKeys.referral.config,
    queryFn: () => api.getReferralConfig({}),
    staleTime: 5 * 60_000,
  });
}

export function useUpdateReferralConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateReferralConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.referral.all });
    },
  });
}

/* -------------------------------------------------------------- partners */

export function usePartners(filters: { status?: PartnerStatus | null; limit?: number } = {}) {
  const limit = filters.limit ?? LIST_PAGE_SIZE;
  const status = filters.status ?? null;

  return useQuery({
    queryKey: queryKeys.referral.partners({ status, limit }),
    queryFn: () => api.listPartners({ limit, ...(status ? { status } : {}) }),
  });
}

export function usePartner(partnerId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.referral.partner(partnerId ?? ""),
    queryFn: () => api.getPartner({ partnerId: partnerId as string }),
    enabled: Boolean(partnerId),
  });
}

export function usePartnerAnalytics(partnerId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.referral.partnerAnalytics(partnerId ?? ""),
    queryFn: () => api.getPartnerAnalytics({ partnerId: partnerId as string }),
    enabled: Boolean(partnerId),
  });
}

export function usePartnerSubscriptions(
  partnerId: string | null | undefined,
  limit = LIST_PAGE_SIZE,
) {
  return useQuery({
    queryKey: queryKeys.referral.partnerSubscriptions(partnerId ?? "", limit),
    queryFn: () => api.listPartnerSubscriptions({ partnerId: partnerId as string, limit }),
    enabled: Boolean(partnerId),
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createPartner,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.referral.all }),
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updatePartner,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.referral.all }),
  });
}

/* ----------------------------------------------------------------- codes */

export function useReferralCodes(
  filters: { partnerId?: string | null; status?: PartnerStatus | null; limit?: number } = {},
) {
  const limit = filters.limit ?? LIST_PAGE_SIZE;
  const partnerId = filters.partnerId ?? null;
  const status = filters.status ?? null;

  return useQuery({
    queryKey: queryKeys.referral.codes({ partnerId, status, limit }),
    queryFn: () =>
      api.listReferralCodes({
        limit,
        ...(partnerId ? { partnerId } : {}),
        ...(status ? { status } : {}),
      }),
  });
}

export function useCreateReferralCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createReferralCode,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.referral.all }),
  });
}

export function useUpdateReferralCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateReferralCode,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.referral.all }),
  });
}

/* ------------------------------------------------------ referred customers */

/** partnerId is required by the callable — there is no cross-partner listing. */
export function useReferredUsers(partnerId: string | null, limit = LIST_PAGE_SIZE) {
  return useQuery({
    queryKey: queryKeys.referral.referredUsers(partnerId ?? "", limit),
    queryFn: () => api.listReferredUsers({ partnerId: partnerId as string, limit }),
    enabled: Boolean(partnerId),
  });
}

/* ------------------------------------------------------ commission ledger */

export function useCommissions(filters: ListCommissionTransactionsRequest) {
  return useQuery({
    queryKey: queryKeys.referral.commissions(filters),
    queryFn: () => api.listCommissionTransactions(filters),
  });
}

export function useReviewCommissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.reviewCommissions,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.referral.all }),
  });
}

/**
 * Records a payout. Note the absence of an amount: the server sums the stored
 * commission rows and would ignore any figure the console sent.
 */
export function useMarkCommissionsPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.markCommissionsPaid,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.referral.all }),
  });
}

/* --------------------------------------------------------------- payouts */

/** partnerId is required by the callable. */
export function usePartnerPayouts(partnerId: string | null, limit = LIST_PAGE_SIZE) {
  return useQuery({
    queryKey: queryKeys.referral.payouts(partnerId ?? "", limit),
    queryFn: () => api.listPartnerPayouts({ partnerId: partnerId as string, limit }),
    enabled: Boolean(partnerId),
  });
}

export function useUpdatePartnerPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updatePartnerPayout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.referral.all }),
  });
}

export function useVoidPartnerPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.voidPartnerPayout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.referral.all }),
  });
}

/* ------------------------------------------------------------ audit trail */

/** The callable filters by partner only — anything finer is client-side. */
export function useReferralAudit(filters: { partnerId?: string | null; limit?: number } = {}) {
  const limit = filters.limit ?? LIST_PAGE_SIZE;
  const partnerId = filters.partnerId ?? null;

  return useQuery({
    queryKey: queryKeys.referral.audit({ partnerId, limit }),
    queryFn: () => api.listReferralAudit({ limit, ...(partnerId ? { partnerId } : {}) }),
  });
}

/* ------------------------------------------------------------ admin roles */

/** Reports on the signed-in admin, not on a looked-up account. */
export function useAdminStatus() {
  return useQuery({
    queryKey: queryKeys.adminStatus,
    queryFn: () => api.getAdminStatus({}),
  });
}

export function useSetAdminRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.setAdminRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStatus });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}
