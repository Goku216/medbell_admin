"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, Pill, X } from "lucide-react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  admin,
}: {
  children: React.ReactNode;
  admin: { email: string | null; name: string | null; picture: string | null };
}) {
  // The drawer closes from SidebarNav's onNavigate, so no route effect is needed.
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <div className="sticky top-0 flex h-dvh flex-col">
          <Brand />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex items-center justify-between pr-2">
              <Brand />
              <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
                <X />
                <span className="sr-only">Close navigation</span>
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-sm sm:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
            <span className="sr-only">Open navigation</span>
          </Button>

          <span className="text-sm font-medium lg:hidden">MedBell Admin</span>

          <div className="ml-auto flex items-center gap-2">
            <UserMenu email={admin.email} name={admin.name} picture={admin.picture} />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link
      href="/dashboard"
      className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4"
    >
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Pill className="size-4" />
      </span>
      <span className="text-sm font-semibold tracking-tight">MedBell Admin</span>
    </Link>
  );
}
