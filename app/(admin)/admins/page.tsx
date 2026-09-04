import type { Metadata } from "next";

import { AdminsView } from "@/components/referrals/admins-view";

export const metadata: Metadata = { title: "Console admins" };

export default function AdminsPage() {
  return <AdminsView />;
}
