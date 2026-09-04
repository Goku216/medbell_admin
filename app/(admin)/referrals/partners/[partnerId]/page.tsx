import type { Metadata } from "next";

import { PartnerDetailView } from "@/components/referrals/partner-detail-view";

export const metadata: Metadata = { title: "Partner" };

export default async function PartnerPage({
  params,
}: PageProps<"/referrals/partners/[partnerId]">) {
  const { partnerId } = await params;
  return <PartnerDetailView partnerId={partnerId} />;
}
