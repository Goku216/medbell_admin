import type { ReactNode } from "react";

import { LoginBackdrop } from "@/components/auth/login-backdrop";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-12">
      <LoginBackdrop />
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  );
}
