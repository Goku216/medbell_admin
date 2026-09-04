import type { Metadata } from "next";

import { ProgrammeSettingsView } from "@/components/referrals/programme-settings-view";

export const metadata: Metadata = { title: "Programme settings" };

export default function Page() {
  return <ProgrammeSettingsView />;
}
