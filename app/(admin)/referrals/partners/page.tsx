import type { Metadata } from "next";

import { PartnersView } from "@/components/referrals/partners-view";

export const metadata: Metadata = { title: "Partners" };

export default function Page() {
  return <PartnersView />;
}
