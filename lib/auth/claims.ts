import { ADMIN_CLAIM } from "@/lib/constants";

/**
 * Decodes a JWT payload WITHOUT verifying its signature.
 *
 * This exists for one caller only: proxy.ts, which needs to decide where to
 * route a request before any rendering happens. A forged cookie can get a
 * request as far as a page shell and no further — every route handler and
 * server action re-verifies the same cookie with the Admin SDK and re-reads
 * the claim from the verified token. Never call this to authorise anything.
 */
export function decodeJwtPayloadUnsafe(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json) as unknown;
    return typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** True when a decoded token carries the medbellAdmin claim. Routing hint only. */
export function hasAdminClaim(payload: Record<string, unknown> | null | undefined): boolean {
  return payload?.[ADMIN_CLAIM] === true;
}

/** Expiry check against the `exp` claim, in seconds since epoch. */
export function isExpired(payload: Record<string, unknown> | null | undefined): boolean {
  const exp = payload?.exp;
  if (typeof exp !== "number") return true;
  return exp * 1000 <= Date.now();
}
