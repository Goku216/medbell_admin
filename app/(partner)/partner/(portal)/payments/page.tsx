import type { Metadata } from "next";

import { PartnerPaymentsView } from "@/components/partner/partner-payments-view";

export const metadata: Metadata = { title: "Payments · MedBell Partners" };

export default function PartnerPaymentsPage() {
  return <PartnerPaymentsView />;
}
