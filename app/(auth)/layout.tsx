import type { ReactNode } from "react";

import { AdminAuthProvider } from "@/components/auth/admin-auth-provider";
import { LoginBackdrop } from "@/components/auth/login-backdrop";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthProvider>
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-12">
        <LoginBackdrop />
        <div className="relative w-full max-w-sm">{children}</div>
      </div>
    </AdminAuthProvider>
  );
}
