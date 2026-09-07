import type { Metadata } from "next";

import { PartnerAccountView } from "@/components/partner/partner-account-view";

export const metadata: Metadata = { title: "Account · MedBell Partners" };

export default function PartnerAccountPage() {
  return <PartnerAccountView />;
}
