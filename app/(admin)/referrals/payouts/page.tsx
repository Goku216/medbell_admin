import type { Metadata } from "next";

import { PayoutsView } from "@/components/referrals/payouts-view";

export const metadata: Metadata = { title: "Payouts" };

export default function Page() {
  return <PayoutsView />;
}
