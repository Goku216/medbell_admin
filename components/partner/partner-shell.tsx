"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChartColumn,
  Link2,
  LoaderCircle,
  LogOut,
  Receipt,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

import { PARTNER_LOGIN_PATH, usePartnerAuth } from "@/components/partner/partner-auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/partner", label: "Dashboard", icon: ChartColumn },
  { href: "/partner/link", label: "My link", icon: Link2 },
  { href: "/partner/customers", label: "Customers", icon: Users },
  { href: "/partner/earnings", label: "Earnings", icon: Receipt },
  { href: "/partner/payments", label: "Payments", icon: Wallet },
  { href: "/partner/account", label: "Account", icon: UserCog },
];

/**
 * Gate and chrome for every portal page.
 *
 * The claim is checked here on each render, not just at sign-in: the provider
 * re-reads it on every token change, so a revoked partner drops back to the
 * sign-in screen on their next token refresh rather than lingering on a page
 * whose data has started failing.
 */
export function PartnerShell({ children }: { children: React.ReactNode }) {
  const { status, signOut } = usePartnerAuth();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (status === "unauthenticated") router.replace(PARTNER_LOGIN_PATH);
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            {status === "loading" ? "Checking your access…" : "Taking you to sign in…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center gap-3 px-4">
          <Link href="/partner" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Wallet className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">MedBell Partners</span>
          </Link>

          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void signOut()}>
            <LogOut />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>

        {/* Horizontal nav rather than a sidebar: the portal is six short pages
            and most partners will open it on a phone. */}
        <nav
          aria-label="Portal sections"
          className="mx-auto flex w-full max-w-4xl gap-1 overflow-x-auto px-2 pb-2"
        >
          {NAV.map((item) => {
            const active =
              item.href === "/partner"
                ? pathname === "/partner"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-6">{children}</main>
    </div>
  );
}
