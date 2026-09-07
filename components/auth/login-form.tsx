"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, Pill, ShieldCheck } from "lucide-react";

import { useAdminAuth } from "@/components/auth/admin-auth-provider";
import SpotlightCard from "@/components/reactbits/spotlight-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/common/states";
import { DEFAULT_ADMIN_PATH } from "@/lib/constants";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, configError } = useAdminAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const next = searchParams.get("next");
  const destination = next?.startsWith("/") ? next : DEFAULT_ADMIN_PATH;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await signIn(email.trim(), password);
      router.replace(destination);
      router.refresh();
    } catch (caught) {
      // Firebase Auth and our own session route both write messages meant to
      // be read by a person; show them as-is.
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
      setPending(false);
    }
  }

  return (
    <SpotlightCard
      className="animate-rise w-full max-w-sm rounded-2xl p-0 shadow-lg backdrop-blur-sm"
      spotlightColor="rgba(45, 212, 224, 0.10)"
    >
      <div className="space-y-6 p-6">
        <header className="space-y-3">
          <div className="relative w-fit">
            {/* A slow ring behind the mark — the only looping motion in the
                form itself, and it stops under prefers-reduced-motion. */}
            <span
              aria-hidden
              className="animate-pulse-ring absolute inset-0 rounded-xl bg-primary/25"
            />
            <span className="relative flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Pill className="size-5" />
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold tracking-tight">MedBell Admin</h1>
            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>
                Restricted to accounts carrying the{" "}
                <code className="font-mono text-xs">medbellAdmin</code> claim.
              </span>
            </p>
          </div>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="animate-fade space-y-2 [animation-delay:120ms]">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@medbell.app"
            />
          </div>

          <div className="animate-fade space-y-2 [animation-delay:200ms]">
            <Label htmlFor="password">Password</Label>

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pr-10"
              />

              {/*
                A reveal toggle, not a "hold to peek": the operator may need to
                read a long generated password back. Kept out of the tab order
                is tempting but wrong — it is a real control, so it is focusable
                and announces its state.
              */}
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {configError ? <ErrorState message={configError} /> : null}
          {error ? <ErrorState message={error} /> : null}

          <Button
            type="submit"
            className="animate-fade w-full [animation-delay:280ms]"
            disabled={pending || Boolean(configError)}
          >
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            {pending ? "Signing in" : "Sign in"}
          </Button>
        </form>
      </div>
    </SpotlightCard>
  );
}
