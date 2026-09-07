import "server-only";

import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";

import { adminAuth } from "@/lib/firebase/admin";
import { ADMIN_CLAIM, SESSION_COOKIE_NAME } from "@/lib/constants";

export type AdminSession = {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
  claims: DecodedIdToken;
};

export class AdminAuthError extends Error {
  readonly status: 401 | 403;
  readonly code: "unauthenticated" | "permission-denied";

  constructor(
    message: string,
    status: 401 | 403,
    code: "unauthenticated" | "permission-denied",
  ) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
    this.code = code;
  }
}

/**
 * The single authorisation gate for everything that runs on the server.
 *
 * Verifies the Firebase session cookie with the Admin SDK — signature, expiry
 * and revocation — and then reads `medbellAdmin` off the *verified* token.
 * The claim is settable only by a Cloud Function and is what the Firestore
 * rules check, so it is the one source of truth; no database field is
 * consulted and nothing sent by the client is trusted.
 */
export async function verifyAdminSession(): Promise<AdminSession> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    throw new AdminAuthError("No admin session. Sign in to continue.", 401, "unauthenticated");
  }

  let decoded: DecodedIdToken;
  try {
    // checkRevoked: a disabled account or a revoked refresh token must lose
    // console access immediately, not at cookie expiry.
    decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
  } catch {
    throw new AdminAuthError(
      "Your admin session has expired or been revoked. Sign in again.",
      401,
      "unauthenticated",
    );
  }

  if (decoded[ADMIN_CLAIM] !== true) {
    throw new AdminAuthError(
      "This account does not carry the medbellAdmin claim.",
      403,
      "permission-denied",
    );
  }

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    name: (decoded.name as string | undefined) ?? null,
    picture: (decoded.picture as string | undefined) ?? null,
    claims: decoded,
  };
}

/** Non-throwing variant, for layouts that redirect rather than error. */
export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    return await verifyAdminSession();
  } catch {
    return null;
  }
}
