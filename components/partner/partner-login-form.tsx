"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, Wallet } from "lucide-react";

import { PARTNER_HOME_PATH, usePartnerAuth } from "@/components/partner/partner-auth-provider";
import SpotlightCard from "@/components/reactbits/spotlight-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/common/states";
import { PolicyNote } from "@/components/common/policy-note";

export function PartnerLoginForm() {
  const router = useRouter();
  const { signIn, status, configError } = usePartnerAuth();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  // Already signed in — do not make them sign in twice.
  React.useEffect(() => {
    if (status === "authenticated") router.replace(PARTNER_HOME_PATH);
  }, [status, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await signIn(username, password);
      router.replace(PARTNER_HOME_PATH);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign-in failed.");
      setPending(false);
    }
  }

  return (
    <SpotlightCard
      className="animate-rise w-full max-w-sm rounded-2xl p-0 shadow-lg"
      spotlightColor="rgba(45, 212, 224, 0.10)"
    >
      <div className="space-y-6 p-6">
        <header className="space-y-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Wallet className="size-5" />
          </span>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight">MedBell Partners</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to see your referrals and earnings.
            </p>
          </div>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="animate-fade space-y-2 [animation-delay:120ms]">
            <Label htmlFor="partner-username">Username</Label>
            <Input
              id="partner-username"
              // A username, not an email — autoComplete="username" is still
              // right, but inputMode and spellcheck matter on phones.
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="priya.sharma"
              className="font-mono"
            />
          </div>

          <div className="animate-fade space-y-2 [animation-delay:200ms]">
            <Label htmlFor="partner-password">Password</Label>
            <div className="relative">
              <Input
                id="partner-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
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

        {/*
          Deliberately not a "Forgot password?" link. There is no mailbox behind
          a partner login, so sendPasswordResetEmail would silently do nothing —
          a dead link is worse than an honest sentence.
        */}
        <PolicyNote>
          Forgotten your password? Contact MedBell and we will set a new one — partner logins
          have no email attached, so there is no self-service reset.
        </PolicyNote>
      </div>
    </SpotlightCard>
  );
}
