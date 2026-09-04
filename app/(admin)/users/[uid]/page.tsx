import type { Metadata } from "next";

import { UserDetailView } from "@/components/users/user-detail-view";

export const metadata: Metadata = { title: "User" };

export default async function UserDetailPage({ params }: PageProps<"/users/[uid]">) {
  const { uid } = await params;
  return <UserDetailView uid={uid} />;
}
