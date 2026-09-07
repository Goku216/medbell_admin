import type { Metadata } from "next";

import { PartnerCustomersView } from "@/components/partner/partner-customers-view";

export const metadata: Metadata = { title: "Customers · MedBell Partners" };

export default function PartnerCustomersPage() {
  return <PartnerCustomersView />;
}
