"use client";

import { httpsCallable } from "firebase/functions";

import { getFirebaseFunctions } from "@/lib/firebase/client";
import { toCallableError } from "@/lib/api/callable-error";
import type {
  ListMyCommissionsResponse,
  ListMyPayoutsResponse,
  ListMyReferralCodesResponse,
  ListMyReferredUsersResponse,
  MyCommissionStatus,
  MyPartnerProfile,
} from "@/lib/partner/types";

/**
 * The complete partner-facing surface: five callables in us-central1.
 *
 * None of them takes a partner id. The backend reads it from the signed
 * token's `medbellPartnerId` claim, so a partner cannot ask for someone else's
 * numbers — there is no parameter to tamper with. If a change here ever seems
 * to need one, something is wrong with the design.
 *
 * No admin callable is reachable with a partner token, and the portal never
 * reads Firestore directly: rules deny partners every referral collection, and
 * all data comes through these five.
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

/** Everything the dashboard needs, in one call. */
export const getMyPartnerProfile = call<Record<string, never>, MyPartnerProfile>(
  "getMyPartnerProfile",
);

export const listMyReferralCodes = call<{ limit?: number }, ListMyReferralCodesResponse>(
  "listMyReferralCodes",
);

export const listMyReferredUsers = call<{ limit?: number }, ListMyReferredUsersResponse>(
  "listMyReferredUsers",
);

/**
 * Sandbox (`void`) rows are filtered out server-side and never appear, so a
 * page can return slightly fewer rows than `limit`.
 */
export const listMyCommissions = call<
  { status?: MyCommissionStatus; limit?: number },
  ListMyCommissionsResponse
>("listMyCommissions");

export const listMyPayouts = call<{ limit?: number }, ListMyPayoutsResponse>("listMyPayouts");
