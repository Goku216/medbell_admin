import type { Metadata } from "next";

import { AuditView } from "@/components/referrals/audit-view";

export const metadata: Metadata = { title: "Audit trail" };

export default function Page() {
  return <AuditView />;
}
