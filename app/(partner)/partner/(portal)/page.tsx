import type { Metadata } from "next";

import { PartnerDashboard } from "@/components/partner/partner-dashboard";

export const metadata: Metadata = { title: "Dashboard · MedBell Partners" };

export default function PartnerDashboardPage() {
  return <PartnerDashboard />;
}
