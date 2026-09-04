import { NextResponse, type NextRequest } from "next/server";

import { adminAuth } from "@/lib/firebase/admin";
import { ADMIN_CLAIM, SESSION_COOKIE_MAX_AGE_MS, SESSION_COOKIE_NAME } from "@/lib/constants";
import { verifyAdminSession, AdminAuthError } from "@/lib/auth/session";

/**
 * Exchanges a freshly minted Firebase ID token for an HttpOnly session cookie.
 *
 * The claim is read off the *verified* token here, exactly as it will be on
 * every subsequent request. A client that says it is an admin gets nothing —
 * only a token Google signed, carrying medbellAdmin, produces a cookie.
 */
export async function POST(request: NextRequest) {
  let idToken: string | undefined;

  try {
    const body = (await request.json()) as { idToken?: unknown };
    if (typeof body.idToken === "string") idToken = body.idToken;
  } catch {
    // fall through to the missing-token response below
  }

  if (!idToken) {
    return NextResponse.json(
      { error: { code: "invalid-argument", message: "An ID token is required." } },
      { status: 400 },
    );
  }

  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);

    if (decoded[ADMIN_CLAIM] !== true) {
      return NextResponse.json(
        {
          error: {
            code: "permission-denied",
            message:
              "This account does not carry the medbellAdmin claim. Ask an existing admin to grant access.",
          },
        },
        { status: 403 },
      );
    }

    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_COOKIE_MAX_AGE_MS,
    });

    const response = NextResponse.json({
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string | undefined) ?? null,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_COOKIE_MAX_AGE_MS / 1000,
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not establish an admin session.";
    return NextResponse.json({ error: { code: "unauthenticated", message } }, { status: 401 });
  }
}

/**
 * Signs out of the console by clearing the cookie.
 *
 * Deliberately does NOT call revokeRefreshTokens: an admin is usually also a
 * MedBell user, and revoking would sign them out of the mobile app too. The
 * cookie is the console's credential and dropping it is the whole sign-out.
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}

/** Who am I, according to the server. Used by the shell to render identity. */
export async function GET() {
  try {
    const session = await verifyAdminSession();
    return NextResponse.json({
      uid: session.uid,
      email: session.email,
      name: session.name,
      picture: session.picture,
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: { code: "internal", message: "Could not read the admin session." } },
      { status: 500 },
    );
  }
}
