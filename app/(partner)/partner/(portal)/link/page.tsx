import type { Metadata } from "next";

import { PartnerLinkView } from "@/components/partner/partner-link-view";

export const metadata: Metadata = { title: "My link · MedBell Partners" };

export default function PartnerLinkPage() {
  return <PartnerLinkView />;
}
