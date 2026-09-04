import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getAdminSession } from "@/lib/auth/session";
import { LOGIN_PATH } from "@/lib/constants";

/**
 * Server-side gate for the whole console.
 *
 * The proxy already routed this request, but that decision was made from an
 * unverified cookie. Here the cookie is verified with the Admin SDK and the
 * medbellAdmin claim is read from the verified token before any admin UI is
 * rendered. Route handlers repeat the same check for their own data.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();

  if (!session) {
    redirect(LOGIN_PATH);
  }

  return (
    <AppShell admin={{ email: session.email, name: session.name, picture: session.picture }}>
      {children}
    </AppShell>
  );
}
