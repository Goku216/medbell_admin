import type { Metadata } from "next";

import { CommissionsView } from "@/components/referrals/commissions-view";

export const metadata: Metadata = { title: "Commissions" };

export default function Page() {
  return <CommissionsView />;
}
