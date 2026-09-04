"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AdminAuthProvider } from "@/components/auth/admin-auth-provider";
import { CallableError } from "@/lib/api/callable-error";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Admin data changes on human timescales; 30s keeps navigation instant
        // without showing stale money for long.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry a refusal — the message is the answer.
          if (error instanceof CallableError) {
            const terminal = [
              "functions/permission-denied",
              "functions/unauthenticated",
              "functions/invalid-argument",
              "functions/not-found",
              "functions/failed-precondition",
              "functions/already-exists",
            ];
            if (terminal.includes(error.code)) return false;
          }
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AdminAuthProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          <Toaster />
        </AdminAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
