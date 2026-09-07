import type { ReactNode } from "react";

import { PartnerAuthProvider } from "@/components/partner/partner-auth-provider";

/**
 * The partner portal.
 *
 * Its own auth provider, deliberately separate from the admin console's: a
 * partner's credential is the `medbellPartner` claim on their ID token, and
 * there is no session cookie and no server-rendered data anywhere below here.
 */
export default function PartnerRootLayout({ children }: { children: ReactNode }) {
  return <PartnerAuthProvider>{children}</PartnerAuthProvider>;
}
