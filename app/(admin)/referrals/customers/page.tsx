import type { Metadata } from "next";

import { ReferredCustomersView } from "@/components/referrals/referred-customers-view";

export const metadata: Metadata = { title: "Referred customers" };

export default function Page() {
  return <ReferredCustomersView />;
}
