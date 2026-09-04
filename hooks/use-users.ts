"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAppUser,
  deleteAppUser,
  getAppUser,
  listAppUsers,
  updateAppUser,
} from "@/lib/api/callables";
import { queryKeys } from "@/lib/api/query-keys";
import { LIST_PAGE_SIZE } from "@/lib/constants";
import type { AppUser, ListAppUsersResponse, PatientRecord } from "@/lib/api/types";

/**
 * The directory list — the one callable with a real cursor.
 *
 * `email` is an exact-match lookup: Firebase Auth has no substring search, so a
 * partial address returns nothing rather than a guess.
 */
export function useAppUsers(filters: { email?: string | null } = {}) {
  const email = filters.email?.trim() || null;

  return useInfiniteQuery({
    queryKey: queryKeys.users.list({ email, limit: LIST_PAGE_SIZE }),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      listAppUsers({
        limit: LIST_PAGE_SIZE,
        ...(pageParam ? { pageToken: pageParam } : {}),
        ...(email ? { email } : {}),
      }),
    getNextPageParam: (lastPage: ListAppUsersResponse) => lastPage.nextPageToken ?? undefined,
  });
}

export function useAppUser(uid: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.users.detail(uid ?? ""),
    queryFn: () => getAppUser({ uid: uid as string }),
    enabled: Boolean(uid),
  });
}

/**
 * Clinical, care-circle and device data, read server-side with the Admin SDK
 * through our own route handler. Read-only: there is no matching mutation.
 */
export function usePatientRecord(uid: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.users.patient(uid ?? ""),
    enabled: Boolean(uid),
    queryFn: async (): Promise<PatientRecord> => {
      const response = await fetch(`/api/patients/${encodeURIComponent(uid as string)}`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(payload?.error?.message ?? "Could not load this user's records.");
      }

      return (await response.json()) as PatientRecord;
    },
  });
}

export function useCreateAppUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAppUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useUpdateAppUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAppUser,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.uid) });
    },
  });
}

export function useDeleteAppUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) => deleteAppUser({ uid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

/** Flattens the paged directory for rendering. */
export function flattenUsers(pages: ListAppUsersResponse[] | undefined): AppUser[] {
  return pages?.flatMap((page) => page.users ?? []) ?? [];
}
