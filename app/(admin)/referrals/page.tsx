import type { Metadata } from "next";

import { ProgrammeView } from "@/components/referrals/programme-view";

export const metadata: Metadata = { title: "Referral programme" };

export default function ReferralsPage() {
  return <ProgrammeView />;
}
