import type { Metadata } from "next";

import { PartnerEarningsView } from "@/components/partner/partner-earnings-view";

export const metadata: Metadata = { title: "Earnings · MedBell Partners" };

export default function PartnerEarningsPage() {
  return <PartnerEarningsView />;
}
