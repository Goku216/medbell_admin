import "server-only";

import { NextResponse } from "next/server";

import { AdminAuthError, verifyAdminSession, type AdminSession } from "@/lib/auth/session";

export type GuardResult =
  { ok: true; session: AdminSession } | { ok: false; response: NextResponse };

/**
 * Wraps verifyAdminSession() for route handlers. Every handler in app/api
 * begins with this — the proxy's routing decision is never treated as an
 * authorisation result.
 */
export async function guardRoute(): Promise<GuardResult> {
  try {
    const session = await verifyAdminSession();
    return { ok: true, session };
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: { code: error.code, message: error.message } },
          { status: error.status },
        ),
      };
    }

    const message =
      error instanceof Error ? error.message : "Could not verify the admin session.";
    return {
      ok: false,
      response: NextResponse.json({ error: { code: "internal", message } }, { status: 500 }),
    };
  }
}

export function routeError(message: string, status: number, code = "internal") {
  return NextResponse.json({ error: { code, message } }, { status });
}
