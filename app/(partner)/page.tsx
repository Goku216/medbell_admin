import type { Metadata } from "next";

import { AdminEntrance } from "@/components/auth/admin-entrance";
import { LoginBackdrop } from "@/components/auth/login-backdrop";
import { PartnerLoginForm } from "@/components/partner/partner-login-form";

export const metadata: Metadata = {
  title: "MedBell Partners",
  description: "Sign in to see your MedBell referrals and earnings.",
  robots: { index: false, follow: false },
};

/**
 * The home page is the partner sign-in.
 *
 * Partners are the public audience — they arrive from a referral link or a
 * phone bookmark — so they get the front door. Administrators reach their own
 * sign-in from the marker in the corner.
 */
export default function HomePage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-12">
      <LoginBackdrop />
      <div className="relative w-full max-w-sm">
        <PartnerLoginForm />
      </div>
      <AdminEntrance />
    </div>
  );
}
