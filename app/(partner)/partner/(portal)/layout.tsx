import type { ReactNode } from "react";

import { PartnerShell } from "@/components/partner/partner-shell";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <PartnerShell>{children}</PartnerShell>;
}
