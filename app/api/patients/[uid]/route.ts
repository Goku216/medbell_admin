import { NextResponse, type NextRequest } from "next/server";

import { guardRoute, routeError } from "@/lib/auth/route-guard";
import { getPatientRecord } from "@/lib/data/patient";

/**
 * Read-only clinical and care-circle data for one user.
 *
 * The Admin SDK bypasses Firestore security rules, so the guard below is the
 * whole gate: it re-verifies the session cookie and re-reads medbellAdmin from
 * the verified token before a single document is fetched. There is deliberately
 * no POST/PATCH/DELETE here — clinical records are never editable from the
 * console.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/patients/[uid]">) {
  const guard = await guardRoute();
  if (!guard.ok) return guard.response;

  const { uid } = await ctx.params;
  if (!uid) return routeError("A user id is required.", 400, "invalid-argument");

  try {
    const record = await getPatientRecord(uid);
    return NextResponse.json(record);
  } catch (error) {
    console.error(`[patients] read failed for ${uid}:`, error);
    const message =
      error instanceof Error ? error.message : "Could not load this user's records.";
    return routeError(message, 500);
  }
}
