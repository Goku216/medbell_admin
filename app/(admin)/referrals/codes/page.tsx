import type { Metadata } from "next";

import { CodesView } from "@/components/referrals/codes-view";

export const metadata: Metadata = { title: "Referral codes" };

export default function Page() {
  return <CodesView />;
}
