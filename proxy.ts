import { NextResponse, type NextRequest } from "next/server";

import { decodeJwtPayloadUnsafe, hasAdminClaim, isExpired } from "@/lib/auth/claims";
import {
  DEFAULT_ADMIN_PATH,
  LOGIN_PATH,
  PARTNER_LOGIN_PATH,
  PARTNER_PATH_PREFIX,
  SESSION_COOKIE_NAME,
} from "@/lib/constants";

/**
 * Routing gate only.
 *
 * This reads the `medbellAdmin` claim straight off the decoded session cookie
 * to decide whether a request goes to the console or to /login. It performs no
 * signature check and grants no access: every route handler and server action
 * re-verifies the same cookie with the Firebase Admin SDK and re-reads the
 * claim from the verified token before touching data. The worst a forged
 * cookie achieves here is being routed to a shell that then refuses to load.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  /*
   * Everything the public may reach without an admin session.
   *
   * "/" is the partner sign-in — the home page belongs to partners — and
   * /partner/* is their portal. Neither holds an admin session cookie: a
   * partner's authorisation is the `medbellPartner` claim on their Firebase ID
   * token, checked client-side on every protected route and again by every
   * callable they call. Applying the admin cookie test here would bounce every
   * partner to the administrator sign-in page.
   *
   * These pages are an empty shell until a token loads and read nothing from
   * the server, so serving them publicly gives nothing away.
   */
  if (
    pathname === PARTNER_LOGIN_PATH ||
    pathname === PARTNER_PATH_PREFIX ||
    pathname.startsWith(`${PARTNER_PATH_PREFIX}/`)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = token ? decodeJwtPayloadUnsafe(token) : null;
  const looksLikeAdmin = Boolean(payload) && !isExpired(payload) && hasAdminClaim(payload);

  const isLoginRoute = pathname === LOGIN_PATH;

  if (isLoginRoute) {
    if (looksLikeAdmin) {
      const next = request.nextUrl.searchParams.get("next");
      const destination =
        next?.startsWith("/") && next !== LOGIN_PATH ? next : DEFAULT_ADMIN_PATH;
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return NextResponse.next();
  }

  if (!looksLikeAdmin) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    if (pathname !== DEFAULT_ADMIN_PATH) {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }
    // Stale cookie: clear it so the client stops replaying a dead session.
    const response = NextResponse.redirect(loginUrl);
    if (token) response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Skip API routes (they guard themselves and must return JSON, not redirects),
  // Next internals, and static assets.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
