"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, LoaderCircle } from "lucide-react";

import { useAdminAuth } from "@/components/auth/admin-auth-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="w-full max-w-sm">
      <CardHeader className="items-start gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <KeyRound className="size-4" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-base">MedBell Admin</CardTitle>
          <CardDescription>
            Restricted to accounts carrying the <code className="font-mono">medbellAdmin</code>{" "}
            claim.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
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

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {configError ? <ErrorState message={configError} /> : null}
          {error ? <ErrorState message={error} /> : null}

          <Button type="submit" className="w-full" disabled={pending || Boolean(configError)}>
            {pending ? <LoaderCircle className="animate-spin" /> : null}
            {pending ? "Signing in" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
